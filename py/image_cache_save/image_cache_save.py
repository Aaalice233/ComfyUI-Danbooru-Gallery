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

# 导入debug配置
from ..utils.debug_config import debug_print

CATEGORY_TYPE = "danbooru"
COMPONENT_NAME = "image_cache_save"


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
                "channel_name": ("STRING", {
                    "default": "default",
                    "tooltip": "缓存通道名称，用于区分不同的图像缓存"
                }),
                "enable_preview": ("BOOLEAN", {
                    "default": True,
                    "tooltip": "控制是否生成缓存图像的预览"
                })
            },
            "hidden": {"prompt": "PROMPT", "extra_pnginfo": "EXTRA_PNGINFO"},
        }

    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("pass_through",)
    FUNCTION = "cache_images"
    CATEGORY = CATEGORY_TYPE
    INPUT_IS_LIST = True
    OUTPUT_NODE = True
    DESCRIPTION = "将图像缓存到指定通道，并输出原始图像供下游节点使用（控制执行顺序）"

    def cache_images(self,
                    images: List,
                    prompt: Optional[Dict] = None,
                    extra_pnginfo: Optional[Dict] = None,
                    channel_name: List[str] = ["default"],
                    enable_preview: List[bool] = [True]) -> Dict[str, Any]:
        """
        将图像缓存到指定通道（支持多通道隔离）

        功能：
        - 支持自定义通道名称
        - 保存前清空指定通道的缓存
        - 执行顺序由GroupExecutorManager控制
        """
        try:
            timestamp = time.strftime("%H:%M:%S", time.localtime())
            debug_print(COMPONENT_NAME, f"\n{'='*60}")
            debug_print(COMPONENT_NAME, f"[ImageCacheSave] ⏰ 执行时间: {timestamp}")
            debug_print(COMPONENT_NAME, f"[ImageCacheSave] 🔍 当前组名: {cache_manager.current_group_name}")
            debug_print(COMPONENT_NAME, f"[ImageCacheSave] ┌─ 开始保存图像")
            debug_print(COMPONENT_NAME, f"{'='*60}\n")

            # ✅ 检测工作流中是否有GroupExecutorManager节点（使用缓存，只检测一次）
            has_manager = ImageCache._check_for_group_executor_manager(prompt)
            if not has_manager:
                # 发送WebSocket事件到前端显示toast（只发送一次）
                ImageCache._send_no_manager_warning()

            # 参数处理 - 确保正确提取参数值（INPUT_IS_LIST=True）
            processed_channel_name = channel_name[0] if isinstance(channel_name, list) and len(channel_name) > 0 else "default"
            if not processed_channel_name or processed_channel_name.strip() == "":
                processed_channel_name = "default"

            processed_enable_preview = enable_preview[0] if isinstance(enable_preview, list) else enable_preview

            debug_print(COMPONENT_NAME, f"[ImageCacheSave] 📁 通道: {processed_channel_name}")

            # ✅ 保存前清空指定通道的缓存
            debug_print(COMPONENT_NAME, f"[ImageCacheSave] 🗑️ 清空通道 '{processed_channel_name}' 的缓存")
            cache_manager.clear_cache(channel_name=processed_channel_name)

            # 将输入的批次列表展开为单个图像张量列表
            # ComfyUI's INPUT_IS_LIST=True wraps inputs in a list.
            # Each item in the list is a batch tensor (B, H, W, C).
            # We need to unpack all batches into a single flat list of images for the manager.
            unpacked_images = []
            for batch in images:
                unpacked_images.extend(list(batch))  # Iterating over a tensor unpacks the first dimension

            # 保存到指定通道
            results = cache_manager.cache_images(
                images=unpacked_images,
                filename_prefix="cached_image",
                preview_rgba=True,
                clear_before_save=False,  # 已经在上面清空过了
                channel_name=processed_channel_name
            )

            debug_print(COMPONENT_NAME, f"[ImageCacheSave] └─ 保存完成: {len(results)} 张")

            # 返回原始图像供下游节点使用（强制执行顺序）
            if unpacked_images:
                # 将所有图像tensor堆叠成一个批次
                if len(unpacked_images) > 1:
                    output_batch = torch.stack(unpacked_images)
                else:
                    # 单张图像，确保是4D tensor (1, H, W, C)
                    output_batch = unpacked_images[0].unsqueeze(0) if unpacked_images[0].dim() == 3 else unpacked_images[0]
            else:
                # 如果没有图像，返回黑色占位图
                output_batch = torch.zeros((1, 64, 64, 3), dtype=torch.float32)

            if processed_enable_preview:
                return {"ui": {"images": results}, "result": (output_batch,)}
            else:
                return {"ui": {"images": []}, "result": (output_batch,)}

        except Exception as e:
            debug_print(COMPONENT_NAME, f"[ImageCacheSave] └─ ✗ 保存失败: {str(e)}")
            import traceback
            debug_print(COMPONENT_NAME, traceback.format_exc())

            # 异常时返回黑色占位图
            empty_batch = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
            return {"ui": {"images": []}, "result": (empty_batch,)}


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