"""
图像缓存保存节点 - Image Cache Save Node
将图像和遮罩数据缓存到固定单通道，供获取节点主动读取
"""

import sys
import os
import time
import torch
import numpy as np
from PIL import Image
from typing import List, Dict, Any, Optional, Tuple
from ..image_cache_manager import cache_manager

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
    图像缓存保存节点 - 将图像缓存到固定单通道供其他节点获取
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
        将图像缓存到全局单通道
        """
        try:
            # 参数处理
            processed_enable_preview = enable_preview[0] if isinstance(enable_preview, list) else enable_preview

            # 使用缓存管理器缓存图像（固定使用默认前缀，不清除之前缓存以支持组执行管理器）
            results = cache_manager.cache_images(
                images=images,
                filename_prefix="cached_image",  # 固定使用默认前缀
                masks=None,  # 不再处理masks
                clear_cache=False,  # 不清除之前的缓存，支持组执行管理器中的多次获取
                preview_rgba=True  # 固定使用RGBA预览以保留透明度
            )

            # 发送成功toast通知
            try:
                from server import PromptServer
                PromptServer.instance.send_sync("image-cache-toast", {
                    "message": f"成功缓存 {len(results)} 张图像",
                    "type": "success",
                    "duration": 3000
                })
            except ImportError:
                print("[ImageCacheSave] 警告: 不在ComfyUI环境中，跳过toast通知")
            except Exception as e:
                print(f"[ImageCacheSave] Toast通知失败: {e}")

            if processed_enable_preview:
                return {"ui": {"images": results}}
            else:
                return {"ui": {"images": []}}

        except Exception as e:
            error_msg = f"缓存图像失败: {str(e)}"
            print(f"[ImageCacheSave] ✗ {error_msg}")

            # 发送错误toast通知
            try:
                from server import PromptServer
                PromptServer.instance.send_sync("image-cache-toast", {
                    "message": error_msg,
                    "type": "error",
                    "duration": 5000
                })
            except ImportError:
                print("[ImageCacheSave] 警告: 不在ComfyUI环境中，跳过toast通知")
            except Exception as toast_e:
                print(f"[ImageCacheSave] Toast通知失败: {toast_e}")

            # 返回空结果但不要抛出异常，避免中断工作流
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