"""
简化的图像缓存获取节点 - Image Cache Get
只负责获取缓存图像并提供预览开关，缓存控制由 GroupExecutorManager 处理
"""

import json
import time
import hashlib
import torch
import numpy as np
from PIL import Image
from typing import Dict, Any, List, Optional

try:
    from image_cache_manager.image_cache_manager import cache_manager
except ImportError:
    cache_manager = None

import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ImageCacheGet")

CATEGORY_TYPE = "danbooru"


class ImageCacheGet:
    """
    简化的图像缓存获取节点
    
    功能：
    - 从缓存管理器获取缓存的图像
    - 提供预览开关（show_preview）
    - 缓存控制由 GroupExecutorManager 处理
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "default_image": ("IMAGE", {
                    "tooltip": "当缓存无效时使用的默认图像"
                }),
            },
            "optional": {
                "show_preview": ("BOOLEAN", {
                    "default": True,
                    "label_on": "📷 显示预览",
                    "label_off": "🚫 隐藏预览",
                    "tooltip": "切换图像预览显示/隐藏"
                }),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID"
            }
        }

    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("images",)
    FUNCTION = "get_cached_image"
    CATEGORY = CATEGORY_TYPE
    INPUT_IS_LIST = True
    OUTPUT_NODE = True

    @classmethod
    def IS_CHANGED(cls, default_image=None, show_preview: bool = True, **kwargs) -> str:
        """
        基于缓存状态生成变化检测哈希
        确保缓存更新时节点重新执行
        """
        try:
            from image_cache_manager.image_cache_manager import cache_manager
            # ✅ 修复：包含缓存管理器的状态
            cache_timestamp = cache_manager.last_save_timestamp if cache_manager else 0
            cache_count = len(cache_manager.cache_data.get("images", [])) if cache_manager else 0
            current_group = cache_manager.current_group_name if cache_manager else None
            hash_input = f"{show_preview}_{cache_timestamp}_{cache_count}_{current_group}"
        except Exception:
            # 回退到基本检测
            hash_input = f"{show_preview}_{hash(str(default_image))}"
        
        return hashlib.md5(hash_input.encode()).hexdigest()

    def get_cached_image(self,
                        default_image: List[torch.Tensor],
                        show_preview: List[bool] = [True],
                        unique_id: str = "unknown") -> Dict[str, Any]:
        """
        获取缓存的图像
        
        Args:
            default_image: 默认图像列表
            show_preview: 是否显示预览列表
            unique_id: 节点ID
            
        Returns:
            包含图像和预览的字典
        """
        start_time = time.time()
        
        try:
            # 参数提取
            show_preview = show_preview[0] if show_preview else True
            
            logger.info(f"\n{'='*60}")
            logger.info(f"[ImageCacheGet] ⏰ 执行时间: {time.strftime('%H:%M:%S', time.localtime())}")
            logger.info(f"[ImageCacheGet] 🎯 节点ID: {unique_id}")
            logger.info(f"[ImageCacheGet] 📷 显示预览: {show_preview}")
            logger.info(f"{'='*60}\n")
            
            # 获取缓存的图像
            if cache_manager is None:
                logger.warning("[ImageCacheGet] ⚠️ 缓存管理器不可用，使用默认图像")
                cached_image = default_image[0] if default_image else torch.zeros((1, 64, 64, 3))
            else:
                try:
                    # 从缓存管理器获取最新的缓存图像
                    cached_images = cache_manager.get_all_cached_images()
                    if cached_images and len(cached_images) > 0:
                        # 获取最后一个缓存的图像
                        cached_image = cached_images[-1]
                        logger.info(f"[ImageCacheGet] ✅ 成功获取缓存图像")
                    else:
                        logger.info(f"[ImageCacheGet] 📌 缓存为空，使用默认图像")
                        cached_image = default_image[0] if default_image else torch.zeros((1, 64, 64, 3))
                except Exception as e:
                    logger.warning(f"[ImageCacheGet] ⚠️ 缓存获取失败: {str(e)}")
                    cached_image = default_image[0] if default_image else torch.zeros((1, 64, 64, 3))
            
            # 确保图像是正确的格式
            if isinstance(cached_image, torch.Tensor):
                result_image = cached_image
            else:
                result_image = default_image[0] if default_image else torch.zeros((1, 64, 64, 3))
            
            execution_time = time.time() - start_time
            logger.info(f"[ImageCacheGet] ⏱️ 执行耗时: {execution_time:.3f}秒\n")
            
            # 返回标准格式：(图像张量,) 和 ui 数据
            # 如果启用预览，返回预览数据；否则返回空
            ui_data = {}
            if show_preview:
                ui_data = {"images": []}
            
            return {
                "result": (result_image,),
                "ui": ui_data
            }
            
        except Exception as e:
            logger.error(f"[ImageCacheGet] ❌ 执行异常: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            
            # 返回默认图像
            default_img = default_image[0] if default_image else torch.zeros((1, 64, 64, 3))
            return {
                "result": (default_img,),
                "ui": {}
            }


# 节点映射
NODE_CLASS_MAPPINGS = {
    "ImageCacheGet": ImageCacheGet,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ImageCacheGet": "📦 获取缓存图像 (Image Cache Get)",
}