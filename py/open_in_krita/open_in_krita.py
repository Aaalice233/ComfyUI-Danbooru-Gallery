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


# 存储节点等待接收的数据
_pending_data = {}

# 存储节点等待状态
_waiting_nodes = {}  # {node_id: {"waiting": True, "cancelled": False}}


class OpenInKrita:
    """
    Open In Krita节点
    将图像发送到Krita进行编辑，并通过按钮从Krita获取编辑后的结果
    """

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
            "hidden": {
                "unique_id": "UNIQUE_ID",
            },
        }

    RETURN_TYPES = ("IMAGE", "MASK")
    RETURN_NAMES = ("image", "mask")
    FUNCTION = "process"
    CATEGORY = "danbooru"
    OUTPUT_NODE = False

    def __init__(self):
        self.manager = get_manager()
        self.temp_dir = Path(tempfile.gettempdir()) / "open_in_krita"
        self.temp_dir.mkdir(exist_ok=True)

    def process(self, image: torch.Tensor, active: bool, max_wait_time: float, unique_id: str):
        """
        处理节点执行

        Args:
            image: 输入图像张量 [B, H, W, C]
            active: 是否启用（False时直接返回输入）
            max_wait_time: 最长等待时间（秒），范围60-86400
            unique_id: 节点唯一ID

        Returns:
            Tuple[torch.Tensor, torch.Tensor]: (编辑后的图像, 蒙版)
        """
        print(f"[OpenInKrita] Node {unique_id} processing (active={active})")

        # 如果未启用，直接返回输入图像和空蒙版
        if not active:
            print(f"[OpenInKrita] Node disabled, passing through")
            empty_mask = torch.zeros((image.shape[0], image.shape[1], image.shape[2]))
            return (image, empty_mask)

        # 优先检查是否有pending data（用户已编辑完成）
        if unique_id in _pending_data:
            print(f"[OpenInKrita] Found pending data for node {unique_id}, returning edited image")
            result_image, result_mask = _pending_data[unique_id]
            del _pending_data[unique_id]

            # 清除等待状态
            if unique_id in _waiting_nodes:
                del _waiting_nodes[unique_id]

            # 发送成功Toast
            PromptServer.instance.send_sync("open-in-krita-notification", {
                "node_id": unique_id,
                "message": "✓ 已获取Krita编辑结果",
                "type": "success"
            })

            return (result_image, result_mask)

        # 确保Krita插件已安装
        try:
            installer = KritaPluginInstaller()
            if not installer.check_plugin_installed():
                print("[OpenInKrita] Installing Krita plugin...")
                installer.install_plugin()
        except Exception as e:
            print(f"[OpenInKrita] Plugin installation error: {e}")
            # 发送警告Toast
            PromptServer.instance.send_sync("open-in-krita-notification", {
                "node_id": unique_id,
                "message": f"⚠️ Krita插件安装失败: {str(e)}\n部分功能可能不可用",
                "type": "warning"
            })

        # 获取Krita路径
        krita_path = self.manager.get_krita_path()

        if not krita_path:
            print("[OpenInKrita] ❌ Krita path not configured!")
            print("[OpenInKrita] Please set Krita path using the settings button")
            # 发送错误Toast
            PromptServer.instance.send_sync("open-in-krita-notification", {
                "node_id": unique_id,
                "message": "❌ 未设置Krita路径！\n请点击'设置Krita路径'按钮手动配置Krita可执行文件路径",
                "type": "error"
            })
            # 返回输入图像和空蒙版
            empty_mask = torch.zeros((image.shape[0], image.shape[1], image.shape[2]))
            return (image, empty_mask)

        # 保存图像到临时文件
        temp_image_path = self._save_image_to_temp(image, unique_id)

        if not temp_image_path:
            print("[OpenInKrita] Failed to save temp image")
            # 发送错误Toast
            PromptServer.instance.send_sync("open-in-krita-notification", {
                "node_id": unique_id,
                "message": "❌ 保存临时图像失败",
                "type": "error"
            })
            empty_mask = torch.zeros((image.shape[0], image.shape[1], image.shape[2]))
            return (image, empty_mask)

        # 启动Krita并打开图像
        success = self.manager.launch_krita(str(temp_image_path))

        if not success:
            print("[OpenInKrita] Failed to launch Krita")
            # 发送错误Toast
            PromptServer.instance.send_sync("open-in-krita-notification", {
                "node_id": unique_id,
                "message": "❌ 启动Krita失败\n请检查Krita路径是否正确",
                "type": "error"
            })
            empty_mask = torch.zeros((image.shape[0], image.shape[1], image.shape[2]))
            return (image, empty_mask)

        print(f"[OpenInKrita] ✓ Krita launched with image: {temp_image_path.name}")
        print(f"[OpenInKrita] Waiting for data from Krita...")

        # 设置等待状态
        _waiting_nodes[unique_id] = {"waiting": True, "cancelled": False}

        # 发送成功Toast
        PromptServer.instance.send_sync("open-in-krita-notification", {
            "node_id": unique_id,
            "message": "✓ Krita已启动\n等待用户编辑...",
            "type": "info"
        })

        # 参数验证和准备
        max_wait_time = max(60.0, min(86400.0, max_wait_time))  # 限制在60秒到24小时之间
        check_interval = 0.5  # 每0.5秒检查一次
        elapsed = 0

        print(f"[OpenInKrita] Max wait time: {max_wait_time}s ({max_wait_time/60:.1f} minutes)")

        # 获取初始文件修改时间
        time.sleep(0.25)  # 给文件系统一点时间
        initial_mtime = os.path.getmtime(temp_image_path)
        print(f"[OpenInKrita] Monitoring file: {temp_image_path.name}")
        print(f"[OpenInKrita] Initial mtime: {initial_mtime}")

        # 检测mask文件路径
        temp_mask_path = temp_image_path.parent / f"{temp_image_path.stem}_mask{temp_image_path.suffix}"

        while elapsed < max_wait_time:
            # 优先检查pending data（兼容旧的推送模式）
            if unique_id in _pending_data:
                print(f"[OpenInKrita] Data received via push mode")
                result_image, result_mask = _pending_data[unique_id]
                del _pending_data[unique_id]
                del _waiting_nodes[unique_id]

                # 清理临时文件
                try:
                    temp_image_path.unlink(missing_ok=True)
                    temp_mask_path.unlink(missing_ok=True)
                except:
                    pass

                PromptServer.instance.send_sync("open-in-krita-notification", {
                    "node_id": unique_id,
                    "message": "✓ 已获取Krita编辑结果（推送模式）",
                    "type": "success"
                })

                return (result_image, result_mask)

            # 检查文件是否被修改（文件监控模式）
            try:
                current_mtime = os.path.getmtime(temp_image_path)
                if current_mtime != initial_mtime:
                    print(f"[OpenInKrita] File modified detected! mtime changed from {initial_mtime} to {current_mtime}")
                    time.sleep(0.25)  # 给文件系统时间确保Krita完成保存

                    # 读取修改后的图像
                    result_image = self._load_image_from_file(temp_image_path)

                    # 尝试读取mask文件
                    if temp_mask_path.exists():
                        print(f"[OpenInKrita] Mask file found: {temp_mask_path.name}")
                        result_mask = self._load_mask_from_file(temp_mask_path)
                    else:
                        print(f"[OpenInKrita] No mask file found, using empty mask")
                        result_mask = torch.zeros((result_image.shape[1], result_image.shape[2]))

                    # 清理临时文件
                    try:
                        temp_image_path.unlink(missing_ok=True)
                        temp_mask_path.unlink(missing_ok=True)
                    except Exception as e:
                        print(f"[OpenInKrita] Warning: Failed to cleanup temp files: {e}")

                    # 清除等待状态
                    if unique_id in _waiting_nodes:
                        del _waiting_nodes[unique_id]

                    PromptServer.instance.send_sync("open-in-krita-notification", {
                        "node_id": unique_id,
                        "message": "✓ 已检测到Krita编辑完成",
                        "type": "success"
                    })

                    return (result_image, result_mask)

            except FileNotFoundError:
                print(f"[OpenInKrita] Warning: Image file not found (may have been deleted)")
                pass
            except Exception as e:
                print(f"[OpenInKrita] Error checking file mtime: {e}")

            # 检查是否取消
            if unique_id in _waiting_nodes and _waiting_nodes[unique_id].get("cancelled"):
                print(f"[OpenInKrita] Wait cancelled by user")
                del _waiting_nodes[unique_id]

                # 清理临时文件
                try:
                    temp_image_path.unlink(missing_ok=True)
                    temp_mask_path.unlink(missing_ok=True)
                except:
                    pass

                PromptServer.instance.send_sync("open-in-krita-notification", {
                    "node_id": unique_id,
                    "message": "⚠ 已取消等待",
                    "type": "warning"
                })

                empty_mask = torch.zeros((image.shape[0], image.shape[1], image.shape[2]))
                return (image, empty_mask)

            # 休眠后继续检查
            time.sleep(check_interval)
            elapsed += check_interval

        # 超时处理
        print(f"[OpenInKrita] Wait timeout after {max_wait_time}s")
        if unique_id in _waiting_nodes:
            del _waiting_nodes[unique_id]

        # 清理临时文件
        try:
            temp_image_path.unlink(missing_ok=True)
            temp_mask_path.unlink(missing_ok=True)
            print("[OpenInKrita] Cleaned up temp files after timeout")
        except Exception as e:
            print(f"[OpenInKrita] Warning: Failed to cleanup temp files: {e}")

        PromptServer.instance.send_sync("open-in-krita-notification", {
            "node_id": unique_id,
            "message": "⚠ 等待超时，返回原图",
            "type": "warning"
        })

        empty_mask = torch.zeros((image.shape[0], image.shape[1], image.shape[2]))
        return (image, empty_mask)

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

            print(f"[OpenInKrita] Saved temp image: {temp_file}")
            return temp_file

        except Exception as e:
            print(f"[OpenInKrita] Error saving temp image: {e}")
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
            print(f"[OpenInKrita] Loaded image: {file_path.name}, shape: {tensor.shape}")
            return tensor
        except Exception as e:
            print(f"[OpenInKrita] Error loading image from {file_path}: {e}")
            raise

    def _load_mask_from_file(self, file_path: Path) -> torch.Tensor:
        """
        从文件加载蒙版

        Args:
            file_path: 蒙版文件路径

        Returns:
            torch.Tensor: 蒙版张量 [H, W]
        """
        try:
            pil_mask = Image.open(file_path).convert('L')  # 转换为灰度
            np_mask = np.array(pil_mask).astype(np.float32) / 255.0
            tensor = torch.from_numpy(np_mask)  # [H, W]
            print(f"[OpenInKrita] Loaded mask: {file_path.name}, shape: {tensor.shape}")
            return tensor
        except Exception as e:
            print(f"[OpenInKrita] Error loading mask from {file_path}: {e}")
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
            torch.Tensor: 蒙版张量 [H, W]
        """
        import io
        pil_mask = Image.open(io.BytesIO(mask_bytes))
        pil_mask = pil_mask.convert('L')  # 转换为灰度

        np_mask = np.array(pil_mask).astype(np.float32) / 255.0
        tensor = torch.from_numpy(np_mask)  # [H, W]

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
        print(f"[OpenInKrita] Set pending data for node {node_id}")

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
            print(f"[OpenInKrita] Cancelled waiting for node {node_id}")


def get_node_class_mappings():
    """返回节点类映射"""
    return {
        "OpenInKrita": OpenInKrita
    }


def get_node_display_name_mappings():
    """返回节点显示名称映射"""
    return {
        "OpenInKrita": "在Krita中打开 (Open In Krita)"
    }


# 全局映射变量
NODE_CLASS_MAPPINGS = get_node_class_mappings()
NODE_DISPLAY_NAME_MAPPINGS = get_node_display_name_mappings()
