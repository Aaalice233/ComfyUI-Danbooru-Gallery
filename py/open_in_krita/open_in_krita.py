"""
Open In Krita节点 - 将图像发送到Krita进行编辑，并接收编辑后的图像和蒙版
"""

import torch
import numpy as np
from PIL import Image
import tempfile
import time
import os
from pathlib import Path
from typing import Tuple, Optional

from server import PromptServer
from .krita_manager import get_manager
from .plugin_installer import KritaPluginInstaller
import comfy.model_management  # 用于检测ComfyUI取消执行
from ..utils.logger import get_logger

# 初始化logger
logger = get_logger(__name__)

# 插件启用提示信息
PLUGIN_ENABLE_HINT = """如果插件未生效，请检查：
1. 打开 Krita → Settings → Configure Krita
2. 进入 Python Plugin Manager
3. 勾选启用 "Open In Krita" 插件
4. 重启 Krita"""

# 存储节点等待接收的数据
_pending_data = {}

# 存储节点等待状态
_waiting_nodes = {}  # {node_id: {"waiting": True, "cancelled": False}}


class FetchFromKrita:
    """
    从Krita获取数据节点
    从Krita获取当前编辑的图像和蒙版数据
    """

    # 类变量：跟踪当前在Krita中的图像
    _current_image_hash = None
    _current_temp_file = None

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE",),
                "active": ("BOOLEAN", {
                    "default": True,
                    "label_on": "启用",
                    "label_off": "禁用"
                }),
                "max_wait_time": ("FLOAT", {
                    "default": 3600.0,
                    "min": 60.0,
                    "max": 86400.0,
                    "step": 60.0,
                    "tooltip": "最长等待时间（秒）：60秒-24小时，默认1小时"
                }),
            },
            "optional": {
                "mask": ("MASK",),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
            },
        }

    RETURN_TYPES = ("IMAGE", "MASK")
    RETURN_NAMES = ("image", "mask")
    FUNCTION = "process"
    CATEGORY = "danbooru"
    OUTPUT_NODE = False

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        """
        强制节点每次都重新执行，避免ComfyUI缓存
        返回当前时间戳，确保每次执行都被视为"改变"
        """
        import time
        return time.time()

    def __init__(self):
        self.manager = get_manager()
        self.temp_dir = Path(tempfile.gettempdir()) / "open_in_krita"
        self.temp_dir.mkdir(exist_ok=True)

    def _get_final_mask(self, krita_mask: Optional[torch.Tensor], input_mask: Optional[torch.Tensor],
                        image_shape: Tuple[int, ...]) -> torch.Tensor:
        """
        决定最终返回的mask，遵循优先级规则

        优先级：krita_mask > input_mask > empty_mask

        Args:
            krita_mask: 从Krita返回的蒙版
            input_mask: 节点的蒙版输入
            image_shape: 图像形状 (B, H, W)，用于创建空蒙版

        Returns:
            torch.Tensor: 最终的蒙版张量 [B, H, W]
        """
        # 优先使用Krita返回的mask（如果有效）
        if krita_mask is not None and not torch.all(krita_mask == 0):
            return krita_mask

        # 其次使用输入的mask
        if input_mask is not None:
            return input_mask

        # 最后返回空mask
        return torch.zeros(image_shape)

    def _is_krita_running(self) -> bool:
        """检查Krita进程是否正在运行"""
        try:
            import psutil
            for proc in psutil.process_iter(['name']):
                try:
                    proc_name = proc.info['name']
                    if proc_name and 'krita' in proc_name.lower():
                        return True
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
        except ImportError:
            logger.warning("psutil not available, cannot check Krita process")
            return False
        return False

    def _wait_for_krita_start(self, max_wait: float = 30.0) -> bool:
        """等待Krita进程启动"""
        logger.info(f"Waiting for Krita to start (max {max_wait}s)...")
        elapsed = 0
        check_interval = 0.5

        while elapsed < max_wait:
            if self._is_krita_running():
                logger.info(f"✓ Krita process detected (after {elapsed:.1f}s)")
                return True
            time.sleep(check_interval)
            elapsed += check_interval

        logger.warning(f"✗ Krita startup timeout after {max_wait}s")
        return False

    def _wait_for_plugin_load(self, max_wait: float = 15.0) -> bool:
        """等待Krita插件加载完成（通过检查_plugin_loaded.txt标志文件）"""
        logger.debug(f"Waiting for plugin to load (max {max_wait}s)...")
        elapsed = 0
        check_interval = 0.5
        plugin_loaded_flag = self.temp_dir / "_plugin_loaded.txt"

        while elapsed < max_wait:
            if plugin_loaded_flag.exists():
                logger.info(f"✓ Plugin loaded flag detected (after {elapsed:.1f}s)")
                return True
            time.sleep(check_interval)
            elapsed += check_interval

        logger.warning(f"✗ Plugin load timeout after {max_wait}s")
        return False

    def _get_image_hash(self, image: torch.Tensor) -> str:
        """计算图像内容的hash值"""
        import hashlib
        return hashlib.md5(image.cpu().numpy().tobytes()).hexdigest()

    def _check_krita_has_document(self, unique_id: str) -> bool:
        """
        通过文件通信检查Krita是否有活动文档

        Args:
            unique_id: 节点ID

        Returns:
            bool: True表示有活动文档, False表示无活动文档或检查失败
        """
        try:
            timestamp = int(time.time() * 1000)
            request_file = self.temp_dir / f"check_document_{unique_id}_{timestamp}.request"
            response_file = self.temp_dir / f"check_document_{unique_id}_{timestamp}.response"

            # 创建请求文件
            with open(request_file, 'w', encoding='utf-8') as f:
                f.write(f"{unique_id}\n{timestamp}\n")
            logger.info(f"✓ Check document request created: {request_file.name}")

            # 等待响应文件
            max_wait = 3.0  # 最多等待3秒
            check_interval = 0.1
            elapsed = 0

            while elapsed < max_wait:
                if response_file.exists():
                    logger.info(f"✓ Check document response detected")
                    time.sleep(0.05)  # 短暂等待确保文件写入完成
                    break
                time.sleep(check_interval)
                elapsed += check_interval

            if not response_file.exists():
                logger.warning(f"✗ Check document response timeout")
                # 清理请求文件
                try:
                    request_file.unlink(missing_ok=True)
                except:
                    pass
                return False

            # 读取响应
            import json
            with open(response_file, 'r', encoding='utf-8') as f:
                response_data = json.load(f)

            has_document = response_data.get("has_active_document", False)
            logger.debug(f"Krita document check result: {'有文档' if has_document else '无文档'}")

            # 清理文件
            try:
                request_file.unlink(missing_ok=True)
                response_file.unlink(missing_ok=True)
            except:
                pass

            return has_document

        except Exception as e:
            logger.debug(f"Check document error: {e}")
            return False

    def process(self, image: torch.Tensor, active: bool, max_wait_time: float, unique_id: str, mask: Optional[torch.Tensor] = None):
        """
        处理节点执行

        Args:
            image: 输入图像张量 [B, H, W, C]
            active: 是否启用（False时直接返回输入）
            max_wait_time: 最长等待时间（秒），范围60-86400
            unique_id: 节点唯一ID
            mask: 可选的蒙版输入 [B, H, W]，作为后备蒙版使用

        Returns:
            Tuple[torch.Tensor, torch.Tensor]: (编辑后的图像, 蒙版)
        """
        logger.debug(f"Node {unique_id} processing (active={active})")

        # 如果未启用，直接返回输入图像和蒙版（使用输入mask或空mask）
        if not active:
            logger.debug(f"Node disabled, passing through")
            final_mask = self._get_final_mask(None, mask, (image.shape[0], image.shape[1], image.shape[2]))
            return (image, final_mask)

        # ===== 第一步：版本检查和自动更新 =====
        try:
            installer = KritaPluginInstaller()

            if installer.needs_update():
                source_version = installer.source_version
                installed_version = installer.get_installed_version()

                logger.warning(f"⚠️ Plugin update needed!")
                logger.debug(f"  Source version: {source_version}")
                logger.debug(f"  Installed version: {installed_version}")

                # Toast提示：检测到更新（无论Krita是否运行都显示）
                PromptServer.instance.send_sync("open-in-krita-notification", {
                    "node_id": unique_id,
                    "message": f"🔄 检测到插件更新 ({installed_version} → {source_version})\n正在更新插件...",
                    "type": "info"
                })

                # 检查Krita是否正在运行
                krita_running = self._is_krita_running()

                if krita_running:
                    logger.debug(f"Krita is running, killing process for plugin update...")
                    # 杀掉Krita进程
                    installer.kill_krita_process()
                    time.sleep(1.5)  # 等待进程完全结束

                # 重新安装插件
                logger.debug(f"Installing updated plugin...")
                success = installer.install_plugin(force=True)

                if success:
                    logger.info(f"✓ Plugin updated to v{source_version}")

                    # Toast提示：更新成功（包含启用说明）
                    PromptServer.instance.send_sync("open-in-krita-notification", {
                        "node_id": unique_id,
                        "message": f"✓ Krita插件已更新到 v{source_version}\n请重启 Krita 后再次执行工作流\n\n{PLUGIN_ENABLE_HINT}",
                        "type": "success"
                    })

                    logger.debug(f"Plugin updated, execution stopped. User must execute again.")

                    # 🔥 抛出异常，中断执行流程
                    raise RuntimeError(f"✓ Krita插件已更新到 v{source_version}，请重新执行工作流")
                else:
                    logger.warning(f"✗ Plugin update failed")
                    PromptServer.instance.send_sync("open-in-krita-notification", {
                        "node_id": unique_id,
                        "message": f"⚠️ Krita插件更新失败\n请检查日志",
                        "type": "error"
                    })

                    # 🔥 抛出异常，中断执行流程
                    raise RuntimeError("⚠️ Krita插件更新失败，请检查日志")
            else:
                logger.debug(f"Plugin version check OK: v{installer.source_version}")

        except Exception as e:
            logger.debug(f"Version check error: {e}")
            import traceback
            logger.debug(traceback.format_exc())

        # ===== 第二步：确保Krita插件已安装（兼容性检查，正常情况下版本检查已处理） =====
        try:
            installer = KritaPluginInstaller()
            if not installer.check_plugin_installed():
                logger.info("Installing Krita plugin...")
                
                # Toast提示：开始安装插件
                PromptServer.instance.send_sync("open-in-krita-notification", {
                    "node_id": unique_id,
                    "message": f"📦 正在安装Krita插件 v{installer.source_version}...",
                    "type": "info"
                })
                
                success = installer.install_plugin()
                
                if success:
                    logger.info(f"✓ Plugin installed successfully: v{installer.source_version}")
                    # Toast提示：安装成功（包含启用说明）
                    PromptServer.instance.send_sync("open-in-krita-notification", {
                        "node_id": unique_id,
                        "message": f"✓ Krita插件已安装 v{installer.source_version}\n\n{PLUGIN_ENABLE_HINT}",
                        "type": "success"
                    })
                else:
                    logger.warning(f"✗ Plugin installation failed")
                    # Toast提示：安装失败
                    PromptServer.instance.send_sync("open-in-krita-notification", {
                        "node_id": unique_id,
                        "message": "⚠️ Krita插件安装失败\n请检查日志",
                        "type": "warning"
                    })
        except Exception as e:
            logger.debug(f"Plugin installation error: {e}")
            # 发送警告Toast
            PromptServer.instance.send_sync("open-in-krita-notification", {
                "node_id": unique_id,
                "message": f"⚠️ Krita插件安装失败: {str(e)}\n部分功能可能不可用",
                "type": "warning"
            })

        # ===== 第三步：检查Krita是否运行 =====
        logger.debug(f"Checking if Krita is running...")

        if not self._is_krita_running():
            # Krita未运行，使用默认图像和蒙版（静默处理）
            logger.info(f"Krita not running, using default image and mask")
            PromptServer.instance.send_sync("open-in-krita-notification", {
                "node_id": unique_id,
                "message": "ℹ️ Krita未运行，使用默认图像",
                "type": "info"
            })
            final_mask = self._get_final_mask(None, mask, (image.shape[0], image.shape[1], image.shape[2]))
            return (image, final_mask)

        # ===== 第四步：直接从Krita获取数据 =====
        logger.debug(f"Krita is running, fetching data...")

        # 创建fetch请求并等待响应
        timestamp = int(time.time() * 1000)
        request_file = self.temp_dir / f"fetch_{unique_id}_{timestamp}.request"
        response_file = self.temp_dir / f"fetch_{unique_id}_{timestamp}.response"

        # 创建请求文件
        try:
            with open(request_file, 'w', encoding='utf-8') as f:
                f.write(f"{unique_id}\n{timestamp}\n")
            logger.info(f"✓ Fetch request created: {request_file.name}")
        except Exception as e:
            logger.info(f"Error creating request file: {e}, using default image and mask")
            PromptServer.instance.send_sync("open-in-krita-notification", {
                "node_id": unique_id,
                "message": "ℹ️ 创建请求文件失败，使用默认图像",
                "type": "info"
            })
            final_mask = self._get_final_mask(None, mask, (image.shape[0], image.shape[1], image.shape[2]))
            return (image, final_mask)

        # 等待响应文件
        logger.debug(f"Waiting for Krita response...")
        max_wait = 10.0  # 最多等待10秒
        check_interval = 0.1
        elapsed = 0

        while elapsed < max_wait:
            if response_file.exists():
                logger.info(f"✓ Response file detected")
                time.sleep(0.1)  # 短暂等待确保文件写入完成
                break
            time.sleep(check_interval)
            elapsed += check_interval

        if not response_file.exists():
            logger.info(f"Krita response timeout, using default image and mask")
            # 清理请求文件
            try:
                request_file.unlink(missing_ok=True)
            except:
                pass
            PromptServer.instance.send_sync("open-in-krita-notification", {
                "node_id": unique_id,
                "message": f"⚠️ Krita响应超时，使用默认图像\n\n{PLUGIN_ENABLE_HINT}",
                "type": "warning"
            })
            final_mask = self._get_final_mask(None, mask, (image.shape[0], image.shape[1], image.shape[2]))
            return (image, final_mask)

        # 读取响应
        try:
            import json
            with open(response_file, 'r', encoding='utf-8') as f:
                response_data = json.load(f)

            logger.debug(f"Response data: {response_data}")

            if response_data.get("status") != "success":
                raise Exception("Response status is not success")

            image_path_str = response_data.get("image_path")
            mask_path_str = response_data.get("mask_path")

            if not image_path_str:
                raise Exception("No image_path in response")

            # 加载图像
            image_path = Path(image_path_str)
            result_image = self._load_image_from_file(image_path)

            # 加载蒙版（如果有）
            if mask_path_str:
                mask_path = Path(mask_path_str)
                result_mask = self._load_mask_from_file(mask_path)
            else:
                # 没有蒙版，创建空蒙版 [B, H, W]
                result_mask = torch.zeros((1, result_image.shape[1], result_image.shape[2]))

            # 清理文件
            try:
                request_file.unlink(missing_ok=True)
                response_file.unlink(missing_ok=True)
            except Exception as e:
                logger.debug(f"Warning: cleanup failed: {e}")

            logger.info(f"✓ Successfully fetched data from Krita")
            PromptServer.instance.send_sync("open-in-krita-notification", {
                "node_id": unique_id,
                "message": "✓ 已从Krita获取数据",
                "type": "success"
            })

            final_mask = self._get_final_mask(result_mask, mask, (1, result_image.shape[1], result_image.shape[2]))
            return (result_image, final_mask)

        except Exception as e:
            logger.info(f"Error processing Krita response: {e}, using default image and mask")
            import traceback
            logger.debug(traceback.format_exc())

            # 清理文件
            try:
                request_file.unlink(missing_ok=True)
                response_file.unlink(missing_ok=True)
            except:
                pass

            PromptServer.instance.send_sync("open-in-krita-notification", {
                "node_id": unique_id,
                "message": "ℹ️ 获取Krita数据失败，使用默认图像",
                "type": "info"
            })
            final_mask = self._get_final_mask(None, mask, (image.shape[0], image.shape[1], image.shape[2]))
            return (image, final_mask)

    def _save_image_to_temp(self, image: torch.Tensor, unique_id: str) -> Optional[Path]:
        """
        保存图像到临时文件

        Args:
            image: 图像张量 [B, H, W, C]
            unique_id: 节点ID

        Returns:
            Path: 临时文件路径
        """
        try:
            # 🔥 新增：清理该节点的旧临时文件（防止Krita打开多个旧标签页）
            old_files = list(self.temp_dir.glob(f"comfyui_{unique_id}_*.png"))
            for old_file in old_files:
                try:
                    old_file.unlink()
                    logger.debug(f"Cleaned old temp file: {old_file.name}")
                except Exception as e:
                    logger.debug(f"Warning: Failed to delete old temp file {old_file.name}: {e}")

            # 取第一张图像（如果是batch）
            if image.dim() == 4:
                image = image[0]

            # 转换为numpy数组 [H, W, C]
            np_image = (image.cpu().numpy() * 255).astype(np.uint8)

            # 转换为PIL Image
            pil_image = Image.fromarray(np_image)

            # 保存到临时文件
            temp_file = self.temp_dir / f"comfyui_{unique_id}_{int(time.time())}.png"
            pil_image.save(str(temp_file), format='PNG')

            logger.debug(f"Saved temp image: {temp_file}")
            return temp_file

        except Exception as e:
            logger.debug(f"Error saving temp image: {e}")
            return None

    def _load_image_from_file(self, file_path: Path) -> torch.Tensor:
        """
        从文件加载图像

        Args:
            file_path: 图像文件路径

        Returns:
            torch.Tensor: 图像张量 [1, H, W, C]
        """
        try:
            pil_image = Image.open(file_path).convert('RGB')
            np_image = np.array(pil_image).astype(np.float32) / 255.0
            tensor = torch.from_numpy(np_image).unsqueeze(0)  # [1, H, W, C]
            logger.debug(f"Loaded image: {file_path.name}, shape: {tensor.shape}")
            return tensor
        except Exception as e:
            logger.debug(f"Error loading image from {file_path}: {e}")
            raise

    def _load_mask_from_file(self, file_path: Path) -> torch.Tensor:
        """
        从文件加载蒙版

        Args:
            file_path: 蒙版文件路径

        Returns:
            torch.Tensor: 蒙版张量 [B, H, W]
        """
        try:
            pil_mask = Image.open(file_path).convert('L')  # 转换为灰度
            np_mask = np.array(pil_mask).astype(np.float32) / 255.0
            tensor = torch.from_numpy(np_mask).unsqueeze(0)  # [B, H, W]
            logger.debug(f"Loaded mask: {file_path.name}, shape: {tensor.shape}")
            return tensor
        except Exception as e:
            logger.debug(f"Error loading mask from {file_path}: {e}")
            raise

    @staticmethod
    def load_image_from_bytes(image_bytes: bytes) -> torch.Tensor:
        """
        从字节数据加载图像

        Args:
            image_bytes: PNG图像字节数据

        Returns:
            torch.Tensor: 图像张量 [1, H, W, C]
        """
        import io
        pil_image = Image.open(io.BytesIO(image_bytes))
        pil_image = pil_image.convert('RGB')

        np_image = np.array(pil_image).astype(np.float32) / 255.0
        tensor = torch.from_numpy(np_image).unsqueeze(0)  # [1, H, W, C]

        return tensor

    @staticmethod
    def load_mask_from_bytes(mask_bytes: bytes) -> torch.Tensor:
        """
        从字节数据加载蒙版

        Args:
            mask_bytes: PNG蒙版字节数据

        Returns:
            torch.Tensor: 蒙版张量 [B, H, W]
        """
        import io
        pil_mask = Image.open(io.BytesIO(mask_bytes))
        pil_mask = pil_mask.convert('L')  # 转换为灰度

        np_mask = np.array(pil_mask).astype(np.float32) / 255.0
        tensor = torch.from_numpy(np_mask).unsqueeze(0)  # [B, H, W]

        return tensor

    @staticmethod
    def set_pending_data(node_id: str, image: torch.Tensor, mask: torch.Tensor):
        """
        设置待处理数据（由API调用）

        Args:
            node_id: 节点ID
            image: 图像张量
            mask: 蒙版张量
        """
        _pending_data[node_id] = (image, mask)
        logger.debug(f"Set pending data for node {node_id}")

    @staticmethod
    def get_pending_data(node_id: str) -> Optional[Tuple[torch.Tensor, torch.Tensor]]:
        """获取待处理数据"""
        return _pending_data.get(node_id)

    @staticmethod
    def clear_pending_data(node_id: str):
        """清除待处理数据"""
        if node_id in _pending_data:
            del _pending_data[node_id]

    @staticmethod
    def cancel_waiting(node_id: str):
        """
        取消节点等待

        Args:
            node_id: 节点ID
        """
        if node_id in _waiting_nodes:
            _waiting_nodes[node_id]["cancelled"] = True
            logger.debug(f"Cancelled waiting for node {node_id}")

    def _create_open_request(self, image_path: Path, unique_id: str) -> bool:
        """
        创建open请求文件，通知Krita插件打开指定图像

        Args:
            image_path: 要打开的图像文件路径
            unique_id: 节点ID

        Returns:
            bool: 是否成功创建请求
        """
        try:
            # 检查是否在短时间内为同一图像创建过请求（避免重复打开）
            current_time = time.time()
            image_key = str(image_path.resolve())  # 使用绝对路径作为key

            if unique_id in self._last_open_request:
                last_image, last_time = self._last_open_request[unique_id]
                # 如果在5秒内为同一图像创建过请求，跳过
                if last_image == image_key and (current_time - last_time) < 5.0:
                    logger.warning(f"⚠ Skip duplicate open request (same image within 5s)")
                    logger.debug(f"Image: {image_path.name}")
                    logger.debug(f"Last request: {current_time - last_time:.1f}s ago")
                    return True  # 返回成功，避免重复创建

            # 记录本次请求
            self._last_open_request[unique_id] = (image_key, current_time)

            timestamp = int(time.time() * 1000)
            request_file = self.temp_dir / f"open_{unique_id}_{timestamp}.request"

            # 创建请求文件，包含图像路径
            import json
            request_data = {
                "image_path": str(image_path),
                "node_id": unique_id,
                "timestamp": timestamp
            }

            with open(request_file, 'w', encoding='utf-8') as f:
                json.dump(request_data, f, ensure_ascii=False, indent=2)

            logger.debug(f"===== Open Request Created =====")
            logger.debug(f"Request file: {request_file}")
            logger.debug(f"Node ID: {unique_id}")
            logger.debug(f"Image path: {image_path}")
            logger.debug(f"Timestamp: {timestamp}")
            logger.warning(f"⚠ 请注意：图像只会通过open请求打开，不会自动监控PNG文件")
            logger.info(f"✓ Open request ready for Krita to process")
            return True

        except Exception as e:
            logger.warning(f"✗ Failed to create open request: {e}")
            import traceback
            logger.debug(traceback.format_exc())
            return False


def get_node_class_mappings():
    """返回节点类映射"""
    return {
        "FetchFromKrita": FetchFromKrita,
        "OpenInKrita": FetchFromKrita  # 向后兼容的别名
    }


def get_node_display_name_mappings():
    """返回节点显示名称映射"""
    return {
        "FetchFromKrita": "从Krita获取数据 (Fetch From Krita)",
        "OpenInKrita": "从Krita获取数据 (Fetch From Krita)"  # 向后兼容
    }


# 全局映射变量
NODE_CLASS_MAPPINGS = get_node_class_mappings()
NODE_DISPLAY_NAME_MAPPINGS = get_node_display_name_mappings()
