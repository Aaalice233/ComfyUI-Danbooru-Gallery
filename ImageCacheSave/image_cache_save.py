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
from ..ImageCacheManager.image_cache_manager import cache_manager

CATEGORY_TYPE = "Danbooru/Image"


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

    def __init__(self):
        pass

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
                }),
                "clear_before_save": ("BOOLEAN", {
                    "default": True,
                    "tooltip": "是否在保存前清空旧缓存（覆盖模式）"
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
                    enable_preview: List[bool] = [True],
                    clear_before_save: List[bool] = [True]) -> Dict[str, Any]:
        """
        将图像缓存到指定通道
        """
        try:
            print(f"[ImageCacheSave] ┌─ 开始保存图像")

            # 参数处理 - 确保正确提取参数值
            processed_enable_preview = enable_preview[0] if isinstance(enable_preview, list) else enable_preview
            # 修复：正确处理clear_before_save参数，确保默认值True生效
            processed_clear_before_save = (
                clear_before_save[0] if isinstance(clear_before_save, list) and len(clear_before_save) > 0
                else clear_before_save if clear_before_save is not None
                else True  # 默认使用覆盖模式
            )

            # 将输入的批次列表展开为单个图像张量列表
            # ComfyUI's INPUT_IS_LIST=True wraps inputs in a list.
            # Each item in the list is a batch tensor (B, H, W, C).
            # We need to unpack all batches into a single flat list of images for the manager.
            unpacked_images = []
            for batch in images:
                unpacked_images.extend(list(batch))  # Iterating over a tensor unpacks the first dimension

            # 使用缓存管理器缓存图像
            results = cache_manager.cache_images(
                images=unpacked_images,
                filename_prefix="cached_image",
                preview_rgba=True,
                clear_before_save=processed_clear_before_save
            )

            print(f"[ImageCacheSave] └─ 保存完成: {len(results)} 张")

            if processed_enable_preview:
                return {"ui": {"images": results}}
            else:
                return {"ui": {"images": []}}

        except Exception as e:
            print(f"[ImageCacheSave] └─ ✗ 保存失败: {str(e)}")

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