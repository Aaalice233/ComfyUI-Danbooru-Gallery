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


# 存储节点等待接收的数据
_pending_data = {}

# 存储节点等待状态
_waiting_nodes = {}  # {node_id: {"waiting": True, "cancelled": False}}


class OpenInKrita:
    """
    Open In Krita节点
    将图像发送到Krita进行编辑，并通过按钮从Krita获取编辑后的结果
    """

    # 类变量：跟踪当前在Krita中的图像
    _current_image_hash = None
    _current_temp_file = None

    # 类变量：跟踪fetch模式的节点
    _fetch_mode_nodes = set()

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
            image_shape: 图像形状，可以是 (H, W) 或 (B, H, W)，用于创建空蒙版

        Returns:
            torch.Tensor: 最终的蒙版张量，shape与image_shape一致
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
            print("[OpenInKrita] Warning: psutil not available, cannot check Krita process")
            return False
        return False

    def _wait_for_krita_start(self, max_wait: float = 30.0) -> bool:
        """等待Krita进程启动"""
        print(f"[OpenInKrita] Waiting for Krita to start (max {max_wait}s)...")
        elapsed = 0
        check_interval = 0.5

        while elapsed < max_wait:
            if self._is_krita_running():
                print(f"[OpenInKrita] ✓ Krita process detected (after {elapsed:.1f}s)")
                return True
            time.sleep(check_interval)
            elapsed += check_interval

        print(f"[OpenInKrita] ✗ Krita startup timeout after {max_wait}s")
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
            print(f"[OpenInKrita] ✓ Check document request created: {request_file.name}")

            # 等待响应文件
            max_wait = 3.0  # 最多等待3秒
            check_interval = 0.1
            elapsed = 0

            while elapsed < max_wait:
                if response_file.exists():
                    print(f"[OpenInKrita] ✓ Check document response detected")
                    time.sleep(0.05)  # 短暂等待确保文件写入完成
                    break
                time.sleep(check_interval)
                elapsed += check_interval

            if not response_file.exists():
                print(f"[OpenInKrita] ✗ Check document response timeout")
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
            print(f"[OpenInKrita] Krita document check result: {'有文档' if has_document else '无文档'}")

            # 清理文件
            try:
                request_file.unlink(missing_ok=True)
                response_file.unlink(missing_ok=True)
            except:
                pass

            return has_document

        except Exception as e:
            print(f"[OpenInKrita] Check document error: {e}")
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
        print(f"[OpenInKrita] Node {unique_id} processing (active={active})")

        # 如果未启用，直接返回输入图像和蒙版（使用输入mask或空mask）
        if not active:
            print(f"[OpenInKrita] Node disabled, passing through")
            final_mask = self._get_final_mask(None, mask, (image.shape[0], image.shape[1], image.shape[2]))
            return (image, final_mask)

        # ===== 第一步：版本检查和自动更新 =====
        try:
            installer = KritaPluginInstaller()

            if installer.needs_update():
                source_version = installer.source_version
                installed_version = installer.get_installed_version()

                print(f"[OpenInKrita] ⚠️ Plugin update needed!")
                print(f"[OpenInKrita]   Source version: {source_version}")
                print(f"[OpenInKrita]   Installed version: {installed_version}")

                # Toast提示：检测到更新（无论Krita是否运行都显示）
                PromptServer.instance.send_sync("open-in-krita-notification", {
                    "node_id": unique_id,
                    "message": f"🔄 检测到插件更新 ({installed_version} → {source_version})\n正在更新插件...",
                    "type": "info"
                })

                # 检查Krita是否正在运行
                krita_running = self._is_krita_running()

                if krita_running:
                    print(f"[OpenInKrita] Krita is running, killing process for plugin update...")
                    # 杀掉Krita进程
                    installer.kill_krita_process()
                    time.sleep(1.5)  # 等待进程完全结束

                # 重新安装插件
                print(f"[OpenInKrita] Installing updated plugin...")
                success = installer.install_plugin(force=True)

                if success:
                    print(f"[OpenInKrita] ✓ Plugin updated to v{source_version}")

                    # Toast提示：更新成功，请再次执行
                    PromptServer.instance.send_sync("open-in-krita-notification", {
                        "node_id": unique_id,
                        "message": f"✓ 插件已更新到 v{source_version}\n请再次执行节点以使用新版本",
                        "type": "success"
                    })

                    print(f"[OpenInKrita] Plugin updated, execution stopped. User must execute again.")

                    # 🔥 直接返回空结果，中断执行
                    final_mask = self._get_final_mask(None, mask, (image.shape[0], image.shape[1], image.shape[2]))
                    return (image, final_mask)
                else:
                    print(f"[OpenInKrita] ✗ Plugin update failed")
                    PromptServer.instance.send_sync("open-in-krita-notification", {
                        "node_id": unique_id,
                        "message": f"⚠️ 插件更新失败\n请检查日志",
                        "type": "error"
                    })

                    # 更新失败也返回空结果，中断执行
                    final_mask = self._get_final_mask(None, mask, (image.shape[0], image.shape[1], image.shape[2]))
                    return (image, final_mask)
            else:
                print(f"[OpenInKrita] Plugin version check OK: v{installer.source_version}")

        except Exception as e:
            print(f"[OpenInKrita] Version check error: {e}")
            import traceback
            traceback.print_exc()

        # ===== 第二步：检查是否是fetch模式（按钮触发） =====
        if self.is_fetch_mode(unique_id):
            print(f"[OpenInKrita] Fetch mode detected for node {unique_id}")
            self.clear_fetch_mode(unique_id)

            # 检查Krita是否运行
            if not self._is_krita_running():
                print(f"[OpenInKrita] ✗ Krita not running in fetch mode")
                PromptServer.instance.send_sync("open-in-krita-notification", {
                    "node_id": unique_id,
                    "message": "⚠ Krita未运行\n请先点击'执行'按钮启动Krita并打开图像",
                    "type": "warning"
                })
                final_mask = self._get_final_mask(None, mask, (image.shape[0], image.shape[1], image.shape[2]))
                return (image, final_mask)

            # 创建fetch请求并等待响应（通过response超时来判断Krita是否有文档打开）
            print(f"[OpenInKrita] Creating fetch request...")

            timestamp = int(time.time() * 1000)
            request_file = self.temp_dir / f"fetch_{unique_id}_{timestamp}.request"
            response_file = self.temp_dir / f"fetch_{unique_id}_{timestamp}.response"

            # 创建请求文件
            try:
                with open(request_file, 'w', encoding='utf-8') as f:
                    f.write(f"{unique_id}\n{timestamp}\n")
                print(f"[OpenInKrita] ✓ Request file created: {request_file.name}")
            except Exception as e:
                print(f"[OpenInKrita] ✗ Error creating request file: {e}")
                PromptServer.instance.send_sync("open-in-krita-notification", {
                    "node_id": unique_id,
                    "message": f"❌ 创建请求文件失败: {str(e)}",
                    "type": "error"
                })
                final_mask = self._get_final_mask(None, mask, (image.shape[0], image.shape[1], image.shape[2]))
                return (image, final_mask)

            # 等待响应文件
            print(f"[OpenInKrita] Waiting for response...")
            max_wait = 10.0  # 最多等待10秒
            check_interval = 0.1
            elapsed = 0

            while elapsed < max_wait:
                if response_file.exists():
                    print(f"[OpenInKrita] ✓ Response file detected")
                    time.sleep(0.1)  # 短暂等待确保文件写入完成
                    break
                time.sleep(check_interval)
                elapsed += check_interval

            if not response_file.exists():
                print(f"[OpenInKrita] ✗ Response timeout")
                # 清理请求文件
                try:
                    request_file.unlink(missing_ok=True)
                except:
                    pass
                PromptServer.instance.send_sync("open-in-krita-notification", {
                    "node_id": unique_id,
                    "message": "⏳ 请等待Krita启动完毕并打开图像\n然后再次点击'从Krita获取数据'",
                    "type": "info"
                })
                final_mask = self._get_final_mask(None, mask, (image.shape[0], image.shape[1], image.shape[2]))
                return (image, final_mask)

            # 读取响应
            try:
                import json
                with open(response_file, 'r', encoding='utf-8') as f:
                    response_data = json.load(f)

                print(f"[OpenInKrita] Response data: {response_data}")

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
                    # 没有蒙版，创建空蒙版
                    result_mask = torch.zeros((result_image.shape[1], result_image.shape[2]))

                # 清理文件
                try:
                    request_file.unlink(missing_ok=True)
                    response_file.unlink(missing_ok=True)
                except Exception as e:
                    print(f"[OpenInKrita] Warning: cleanup failed: {e}")

                print(f"[OpenInKrita] ✓✓✓ Fetch mode completed successfully")
                PromptServer.instance.send_sync("open-in-krita-notification", {
                    "node_id": unique_id,
                    "message": "✓ 已从Krita获取数据",
                    "type": "success"
                })

                final_mask = self._get_final_mask(result_mask, mask, (result_image.shape[1], result_image.shape[2]))
                return (result_image, final_mask)

            except Exception as e:
                print(f"[OpenInKrita] ✗ Error processing response: {e}")
                import traceback
                traceback.print_exc()

                # 清理文件
                try:
                    request_file.unlink(missing_ok=True)
                    response_file.unlink(missing_ok=True)
                except:
                    pass

                PromptServer.instance.send_sync("open-in-krita-notification", {
                    "node_id": unique_id,
                    "message": f"❌ 处理Krita数据失败: {str(e)}",
                    "type": "error"
                })
                final_mask = self._get_final_mask(None, mask, (image.shape[0], image.shape[1], image.shape[2]))
                return (image, final_mask)

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

            final_mask = self._get_final_mask(result_mask, mask, (result_image.shape[1], result_image.shape[2]))
            return (result_image, final_mask)

        # 确保Krita插件已安装（兼容性检查，正常情况下版本检查已处理）
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
            print("[OpenInKrita] Sending setup dialog request to frontend...")

            # 🔥 发送特殊消息，触发前端显示友好的引导对话框
            PromptServer.instance.send_sync("open-in-krita-setup-dialog", {
                "node_id": unique_id,
                "message": "检测到您还未设置Krita执行路径，您是否已经安装了Krita？"
            })

            print("[OpenInKrita] Setup dialog sent, cancelling execution")
            # 🚫 直接抛出异常，中断执行流程
            raise RuntimeError("⚠️ Krita路径未配置，请按照引导完成设置后重新执行")

        # ===== 智能Krita会话管理 =====

        # 1. 计算当前图像的hash
        current_hash = self._get_image_hash(image)
        print(f"[OpenInKrita] Current image hash: {current_hash[:8]}...")

        # 2. 检查Krita是否正在运行
        krita_running = self._is_krita_running()

        if not krita_running:
            # Krita未运行，需要启动
            print(f"[OpenInKrita] Krita not running, launching...")

            # 保存图像到临时文件
            temp_image_path = self._save_image_to_temp(image, unique_id)

            if not temp_image_path:
                print("[OpenInKrita] Failed to save temp image")
                PromptServer.instance.send_sync("open-in-krita-notification", {
                    "node_id": unique_id,
                    "message": "❌ 保存临时图像失败",
                    "type": "error"
                })
                final_mask = self._get_final_mask(None, mask, (image.shape[0], image.shape[1], image.shape[2]))
                return (image, final_mask)

            # 启动Krita
            success = self.manager.launch_krita(str(temp_image_path))

            if not success:
                print("[OpenInKrita] Failed to launch Krita")
                PromptServer.instance.send_sync("open-in-krita-notification", {
                    "node_id": unique_id,
                    "message": "❌ 启动Krita失败\n请检查Krita路径是否正确",
                    "type": "error"
                })
                final_mask = self._get_final_mask(None, mask, (image.shape[0], image.shape[1], image.shape[2]))
                return (image, final_mask)

            # 等待Krita启动
            if not self._wait_for_krita_start():
                print("[OpenInKrita] Krita startup timeout")
                PromptServer.instance.send_sync("open-in-krita-notification", {
                    "node_id": unique_id,
                    "message": "⚠️ Krita启动超时",
                    "type": "warning"
                })

            # 记录当前图像
            OpenInKrita._current_image_hash = current_hash
            OpenInKrita._current_temp_file = temp_image_path

            print(f"[OpenInKrita] ✓ Krita launched and image opened: {temp_image_path.name}")

        else:
            # Krita已运行，检查是否是同一图像
            print(f"[OpenInKrita] Krita already running")

            # 检查是否是同一图像且临时文件存在
            if OpenInKrita._current_image_hash == current_hash and \
               OpenInKrita._current_temp_file and \
               OpenInKrita._current_temp_file.exists():
                # hash相同且文件存在，但需要进一步检查Krita是否真的有文档
                print(f"[OpenInKrita] Same image hash and temp file exists, checking if Krita has document...")

                # 通过文件通信检查Krita是否有活动文档
                has_document = self._check_krita_has_document(unique_id)

                if has_document:
                    # Krita确实有文档，跳过打开
                    print(f"[OpenInKrita] ✓ Krita has active document, skipping open")
                    PromptServer.instance.send_sync("open-in-krita-notification", {
                        "node_id": unique_id,
                        "message": "✓ Krita已打开此图像\n等待编辑...",
                        "type": "info"
                    })
                else:
                    # Krita没有文档(用户可能关闭了所有标签页)，需要重新发送
                    print(f"[OpenInKrita] ✗ Krita has no active document, re-sending image...")

                    # 保存图像到临时文件
                    temp_image_path = self._save_image_to_temp(image, unique_id)

                    if not temp_image_path:
                        print("[OpenInKrita] Failed to save temp image")
                        PromptServer.instance.send_sync("open-in-krita-notification", {
                            "node_id": unique_id,
                            "message": "❌ 保存临时图像失败",
                            "type": "error"
                        })
                        final_mask = self._get_final_mask(None, mask, (image.shape[0], image.shape[1], image.shape[2]))
                        return (image, final_mask)

                    # 记录新图像
                    OpenInKrita._current_image_hash = current_hash
                    OpenInKrita._current_temp_file = temp_image_path

                    print(f"[OpenInKrita] ✓ Image saved: {temp_image_path.name}")

                    # 🔥 创建open请求，确保Krita能够可靠地检测并打开文件
                    if self._create_open_request(temp_image_path, unique_id):
                        print(f"[OpenInKrita] ✓ Open request created, Krita will open the image")
                    else:
                        print(f"[OpenInKrita] ⚠ Open request failed, relying on file watcher")

                    PromptServer.instance.send_sync("open-in-krita-notification", {
                        "node_id": unique_id,
                        "message": "✓ 图像已保存\nKrita将自动打开",
                        "type": "info"
                    })
            else:
                # 不同图像，或相同图像但文件不存在，需要在Krita中打开
                if OpenInKrita._current_image_hash == current_hash:
                    print(f"[OpenInKrita] Same image hash but temp file missing, re-sending to Krita...")
                else:
                    print(f"[OpenInKrita] Different image detected, opening in Krita...")

                # 保存新图像到临时文件
                temp_image_path = self._save_image_to_temp(image, unique_id)

                if not temp_image_path:
                    print("[OpenInKrita] Failed to save temp image")
                    PromptServer.instance.send_sync("open-in-krita-notification", {
                        "node_id": unique_id,
                        "message": "❌ 保存临时图像失败",
                        "type": "error"
                    })
                    final_mask = self._get_final_mask(None, mask, (image.shape[0], image.shape[1], image.shape[2]))
                    return (image, final_mask)

                # 记录新图像
                OpenInKrita._current_image_hash = current_hash
                OpenInKrita._current_temp_file = temp_image_path

                print(f"[OpenInKrita] ✓ Image saved: {temp_image_path.name}")

                # 🔥 创建open请求，确保Krita能够可靠地检测并打开文件
                if self._create_open_request(temp_image_path, unique_id):
                    print(f"[OpenInKrita] ✓ Open request created, Krita will open the image")
                else:
                    print(f"[OpenInKrita] ⚠ Open request failed, relying on file watcher")

                PromptServer.instance.send_sync("open-in-krita-notification", {
                    "node_id": unique_id,
                    "message": "✓ 图像已保存\nKrita将自动打开",
                    "type": "info"
                })

        # 设置等待状态
        _waiting_nodes[unique_id] = {"waiting": True, "cancelled": False}

        print(f"[OpenInKrita] Waiting for user to click 'Fetch from Krita' button...")

        # 参数验证和准备
        max_wait_time = max(60.0, min(86400.0, max_wait_time))  # 限制在60秒到24小时之间
        check_interval = 0.5  # 每0.5秒检查一次
        elapsed = 0

        print(f"[OpenInKrita] Max wait time: {max_wait_time}s ({max_wait_time/60:.1f} minutes)")

        # 使用try-finally确保无论如何都清理等待状态
        try:
            # 异步等待循环：检查pending data、cancelled状态和ComfyUI中断
            while elapsed < max_wait_time:
                # 🔥 检查ComfyUI取消执行（用户点击了"取消执行"按钮）
                comfy.model_management.throw_exception_if_processing_interrupted()

                # 检查是否有pending data（用户点击了"从Krita获取数据"按钮）
                if unique_id in _pending_data:
                    print(f"[OpenInKrita] Data received from button click")
                    result_image, result_mask = _pending_data[unique_id]
                    del _pending_data[unique_id]
                    # _waiting_nodes的清理由finally块统一处理

                    PromptServer.instance.send_sync("open-in-krita-notification", {
                        "node_id": unique_id,
                        "message": "✓ 已获取Krita编辑结果",
                        "type": "success"
                    })

                    final_mask = self._get_final_mask(result_mask, mask, (result_image.shape[1], result_image.shape[2]))
                    return (result_image, final_mask)

                # 检查是否取消
                if unique_id in _waiting_nodes and _waiting_nodes[unique_id].get("cancelled"):
                    print(f"[OpenInKrita] Wait cancelled by user")
                    # _waiting_nodes的清理由finally块统一处理

                    PromptServer.instance.send_sync("open-in-krita-notification", {
                        "node_id": unique_id,
                        "message": "⚠ 已取消等待",
                        "type": "warning"
                    })

                    # 🚫 抛出异常，中断执行流程
                    raise RuntimeError("⚠️ 用户已取消等待Krita数据")

                # 休眠后继续检查
                time.sleep(check_interval)
                elapsed += check_interval

            # 超时处理
            print(f"[OpenInKrita] Wait timeout after {max_wait_time}s")

            PromptServer.instance.send_sync("open-in-krita-notification", {
                "node_id": unique_id,
                "message": f"⚠ 等待超时（{max_wait_time/60:.1f}分钟）",
                "type": "warning"
            })

            # 🚫 抛出异常，中断执行流程
            raise RuntimeError(f"⚠️ 等待Krita数据超时（{max_wait_time}秒）")
        finally:
            # 无论如何都清理等待状态（正常返回、取消或异常）
            if unique_id in _waiting_nodes:
                del _waiting_nodes[unique_id]
                print(f"[OpenInKrita] Cleaned up waiting state for node {unique_id}")

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
                    print(f"[OpenInKrita] Cleaned old temp file: {old_file.name}")
                except Exception as e:
                    print(f"[OpenInKrita] Warning: Failed to delete old temp file {old_file.name}: {e}")

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

    @staticmethod
    def set_fetch_mode(node_id: str):
        """设置节点为fetch模式"""
        OpenInKrita._fetch_mode_nodes.add(node_id)
        print(f"[OpenInKrita] Set fetch mode for node {node_id}")

    @staticmethod
    def clear_fetch_mode(node_id: str):
        """清除节点的fetch模式"""
        OpenInKrita._fetch_mode_nodes.discard(node_id)
        print(f"[OpenInKrita] Cleared fetch mode for node {node_id}")

    @staticmethod
    def is_fetch_mode(node_id: str) -> bool:
        """检查节点是否处于fetch模式"""
        return node_id in OpenInKrita._fetch_mode_nodes

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

            print(f"[OpenInKrita] ===== Open Request Created =====")
            print(f"[OpenInKrita] Request file: {request_file}")
            print(f"[OpenInKrita] Node ID: {unique_id}")
            print(f"[OpenInKrita] Image path: {image_path}")
            print(f"[OpenInKrita] Timestamp: {timestamp}")
            print(f"[OpenInKrita] ⚠ 请注意：图像只会通过open请求打开，不会自动监控PNG文件")
            print(f"[OpenInKrita] ✓ Open request ready for Krita to process")
            return True

        except Exception as e:
            print(f"[OpenInKrita] ✗ Failed to create open request: {e}")
            import traceback
            traceback.print_exc()
            return False


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
