"""
图像缓存保存节点 - Image Cache Save Node
将图像数据缓存到指定通道，供获取节点主动读取
"""

import sys
import os
import time
import torch
import numpy as np
from PIL import Image
from typing import List, Dict, Any, Optional, Tuple
from ..image_cache_manager.image_cache_manager import cache_manager

CATEGORY_TYPE = "danbooru"


class AnyType(str):
    """用于表示任意类型的特殊类，在类型比较时总是返回相等"""
    def __eq__(self, _) -> bool:
        return True

    def __ne__(self, __value: object) -> bool:
        return False


any_typ = AnyType("*")


# 全局缓存管理器实例 - 从共享模块导入
# cache_manager = ImageCacheManager()


class ImageCache:
    """
    图像缓存保存节点 - 将图像缓存到指定通道供其他节点获取
    """

    # 类级别的缓存：存储检测结果，所有实例共享
    _has_manager_cache = None  # None表示未检测，True/False表示检测结果
    _warning_sent_cache = False  # 类级别的警告发送标志

    def __init__(self):
        pass

    @classmethod
    def _check_for_group_executor_manager(cls, prompt: Optional[Dict]) -> bool:
        """
        检测工作流中是否有GroupExecutorManager节点
        使用类级别缓存，只在第一次执行时检测

        Args:
            prompt: 工作流数据

        Returns:
            bool: 是否存在GroupExecutorManager节点
        """
        # 如果已经缓存了检测结果，直接返回
        if cls._has_manager_cache is not None:
            return cls._has_manager_cache

        # 第一次检测
        if not prompt:
            cls._has_manager_cache = False
            return False

        try:
            # prompt是一个列表，第一个元素是工作流数据字典
            workflow_data = prompt[0] if isinstance(prompt, list) and len(prompt) > 0 else prompt

            # 遍历工作流中的所有节点
            if isinstance(workflow_data, dict):
                for node_id, node_data in workflow_data.items():
                    if isinstance(node_data, dict) and node_data.get("class_type") == "GroupExecutorManager":
                        print(f"[ImageCacheSave] ✓ 检测到GroupExecutorManager节点（已缓存）")
                        cls._has_manager_cache = True
                        return True

            print(f"[ImageCacheSave] ⚠ 未检测到GroupExecutorManager节点（已缓存）")
            cls._has_manager_cache = False
            return False
        except Exception as e:
            print(f"[ImageCacheSave] 检测GroupExecutorManager失败: {str(e)}")
            cls._has_manager_cache = False
            return False

    @classmethod
    def _send_no_manager_warning(cls):
        """发送WebSocket警告到前端（类级别，只发送一次）"""
        if cls._warning_sent_cache:
            return  # 避免重复发送

        try:
            from server import PromptServer
            PromptServer.instance.send_sync("cache-node-no-manager-warning", {
                "node_type": "ImageCacheSave",
                "message": "图像缓存节点需要配合组执行管理器使用，请添加组执行管理器和触发器后刷新网页\nImage cache nodes require Group Executor Manager. Please add Manager and Trigger, then refresh."
            })
            cls._warning_sent_cache = True
            print(f"[ImageCacheSave] 已发送WebSocket警告")
        except ImportError:
            print("[ImageCacheSave] 警告: 不在ComfyUI环境中，跳过WebSocket通知")
        except Exception as e:
            print(f"[ImageCacheSave] WebSocket警告发送失败: {e}")

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "images": ("IMAGE", {"tooltip": "要缓存的图像"}),
            },
            "optional": {
                "enable_preview": ("BOOLEAN", {
                    "default": True,
                    "tooltip": "控制是否生成缓存图像的预览"
                })
            },
            "hidden": {"prompt": "PROMPT", "extra_pnginfo": "EXTRA_PNGINFO"},
        }

    RETURN_TYPES = ()
    FUNCTION = "cache_images"
    CATEGORY = CATEGORY_TYPE
    INPUT_IS_LIST = True
    OUTPUT_NODE = True

    def cache_images(self,
                    images: List,
                    prompt: Optional[Dict] = None,
                    extra_pnginfo: Optional[Dict] = None,
                    enable_preview: List[bool] = [True]) -> Dict[str, Any]:
        """
        将图像缓存到全局缓存（配合GroupExecutorManager使用）

        重要：此节点必须配合GroupExecutorManager使用
        - 保存前固定清空所有缓存
        - 保存到全局缓存（不使用通道隔离）
        - 执行顺序由GroupExecutorManager控制
        """
        try:
            timestamp = time.strftime("%H:%M:%S", time.localtime())
            print(f"\n{'='*60}")
            print(f"[ImageCacheSave] ⏰ 执行时间: {timestamp}")
            print(f"[ImageCacheSave] 🔍 当前组名: {cache_manager.current_group_name}")
            print(f"[ImageCacheSave] 📁 使用全局缓存（不隔离通道）")
            print(f"[ImageCacheSave] ┌─ 开始保存图像")
            print(f"{'='*60}\n")

            # ✅ 检测工作流中是否有GroupExecutorManager节点（使用缓存，只检测一次）
            has_manager = ImageCache._check_for_group_executor_manager(prompt)
            if not has_manager:
                # 发送WebSocket事件到前端显示toast（只发送一次）
                ImageCache._send_no_manager_warning()

            # 参数处理 - 确保正确提取参数值
            processed_enable_preview = enable_preview[0] if isinstance(enable_preview, list) else enable_preview

            # ✅ 保存前固定清空所有缓存
            # 因为此节点必须配合GroupExecutorManager使用，每个组保存时都应清空前一个组的缓存
            print(f"[ImageCacheSave] 🗑️ 清空所有缓存通道（强制执行）")
            cache_manager.clear_cache(channel_name=None)  # None表示清空所有通道

            # 将输入的批次列表展开为单个图像张量列表
            # ComfyUI's INPUT_IS_LIST=True wraps inputs in a list.
            # Each item in the list is a batch tensor (B, H, W, C).
            # We need to unpack all batches into a single flat list of images for the manager.
            unpacked_images = []
            for batch in images:
                unpacked_images.extend(list(batch))  # Iterating over a tensor unpacks the first dimension

            # ✅ 关键修复：保存到全局默认通道（channel_name="__global__"）而非组名通道
            # 这样所有组都从同一个缓存读写，由GroupExecutorManager控制执行顺序
            results = cache_manager.cache_images(
                images=unpacked_images,
                filename_prefix="cached_image",
                preview_rgba=True,
                clear_before_save=False,  # 已经在上面清空过了
                channel_name="__global__"  # 使用全局通道
            )

            print(f"[ImageCacheSave] └─ 保存完成: {len(results)} 张")

            if processed_enable_preview:
                return {"ui": {"images": results}}
            else:
                return {"ui": {"images": []}}

        except Exception as e:
            print(f"[ImageCacheSave] └─ ✗ 保存失败: {str(e)}")
            import traceback
            print(traceback.format_exc())

            # 返回空结果但不抛出异常
            return {"ui": {"images": []}}


# 节点映射
def get_node_class_mappings():
    return {
        "ImageCacheSave": ImageCache
    }

def get_node_display_name_mappings():
    return {
        "ImageCacheSave": "图像缓存保存 (Image Cache Save)"
    }

NODE_CLASS_MAPPINGS = get_node_class_mappings()
NODE_DISPLAY_NAME_MAPPINGS = get_node_display_name_mappings()