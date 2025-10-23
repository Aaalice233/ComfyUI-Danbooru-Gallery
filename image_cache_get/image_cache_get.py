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
    from ..image_cache_manager.image_cache_manager import cache_manager
except ImportError:
    cache_manager = None

import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ImageCacheGet")

# 导入debug配置
from ..utils.debug_config import should_debug

CATEGORY_TYPE = "danbooru"
COMPONENT_NAME = "image_cache_get"


class ImageCacheGet:
    """
    简化的图像缓存获取节点

    功能：
    - 从缓存管理器获取缓存的图像
    - 提供预览开关（show_preview）
    - 缓存控制由 GroupExecutorManager 处理
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
                        logger.info(f"[ImageCacheGet] ✓ 检测到GroupExecutorManager节点（已缓存）")
                        cls._has_manager_cache = True
                        return True

            logger.warning(f"[ImageCacheGet] ⚠ 未检测到GroupExecutorManager节点（已缓存）")
            cls._has_manager_cache = False
            return False
        except Exception as e:
            logger.warning(f"[ImageCacheGet] 检测GroupExecutorManager失败: {str(e)}")
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
                "node_type": "ImageCacheGet",
                "message": "图像缓存节点需要配合组执行管理器使用，请添加组执行管理器和触发器后刷新网页\nImage cache nodes require Group Executor Manager. Please add Manager and Trigger, then refresh."
            })
            cls._warning_sent_cache = True
            logger.info(f"[ImageCacheGet] 已发送WebSocket警告")
        except ImportError:
            logger.warning("[ImageCacheGet] 警告: 不在ComfyUI环境中，跳过WebSocket通知")
        except Exception as e:
            logger.warning(f"[ImageCacheGet] WebSocket警告发送失败: {e}")

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "default_image": ("IMAGE", {
                    "tooltip": "当缓存无效时使用的默认图像"
                }),
            },
            "optional": {
                "enable_preview": ("BOOLEAN", {
                    "default": True,
                    "label_on": "true",
                    "label_off": "false",
                    "tooltip": "切换图像预览显示/隐藏"
                }),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
                "prompt": "PROMPT",
                "extra_pnginfo": "EXTRA_PNGINFO"
            }
        }

    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("images",)
    FUNCTION = "get_cached_image"
    CATEGORY = CATEGORY_TYPE
    INPUT_IS_LIST = True
    OUTPUT_NODE = True

    @classmethod
    def IS_CHANGED(cls, default_image=None, enable_preview: bool = True, **kwargs) -> str:
        """
        基于缓存状态生成变化检测哈希
        确保缓存更新时节点重新执行
        """
        try:
            # ✅ 修复：包含缓存管理器的状态
            cache_timestamp = cache_manager.last_save_timestamp if cache_manager else 0
            cache_count = len(cache_manager.cache_data.get("images", [])) if cache_manager else 0
            current_group = cache_manager.current_group_name if cache_manager else None
            hash_input = f"{enable_preview}_{cache_timestamp}_{cache_count}_{current_group}"
        except Exception:
            # 回退到基本检测
            hash_input = f"{enable_preview}_{hash(str(default_image))}"

        return hashlib.md5(hash_input.encode()).hexdigest()

    def get_cached_image(self,
                        default_image: List[torch.Tensor],
                        enable_preview: List[bool] = [True],
                        unique_id: str = "unknown",
                        prompt: Optional[Dict] = None,
                        extra_pnginfo: Optional[Dict] = None) -> Dict[str, Any]:
        """
        获取全局缓存的图像（配合GroupExecutorManager使用）

        重要：此节点必须配合GroupExecutorManager使用
        - 从全局缓存获取所有图像（不使用通道隔离）
        - 执行顺序由GroupExecutorManager控制

        Args:
            default_image: 默认图像列表
            enable_preview: 是否显示预览列表
            unique_id: 节点ID
            prompt: 工作流数据
            extra_pnginfo: 额外信息

        Returns:
            包含图像和预览的字典
        """
        start_time = time.time()

        try:
            # 参数提取
            enable_preview = enable_preview[0] if enable_preview else True

            if should_debug(COMPONENT_NAME):
                logger.info(f"\n{'='*60}")
                logger.info(f"[ImageCacheGet] ⏰ 执行时间: {time.strftime('%H:%M:%S', time.localtime())}")
                logger.info(f"[ImageCacheGet] 🎯 节点ID: {unique_id}")
                logger.info(f"[ImageCacheGet] 📷 显示预览: {enable_preview}")
                logger.info(f"[ImageCacheGet] 🔍 当前组名: {cache_manager.current_group_name if cache_manager else 'N/A'}")
                logger.info(f"[ImageCacheGet] 📁 使用全局缓存（不隔离通道）")
                logger.info(f"{'='*60}\n")

            # ✅ 检测工作流中是否有GroupExecutorManager节点（使用缓存，只检测一次）
            has_manager = ImageCacheGet._check_for_group_executor_manager(prompt)
            if not has_manager:
                # 发送WebSocket事件到前端显示toast（只发送一次）
                ImageCacheGet._send_no_manager_warning()

            # 获取缓存的图像
            if cache_manager is None:
                logger.warning("[ImageCacheGet] ⚠️ 缓存管理器不可用，使用默认图像")
                cached_image = default_image[0] if default_image else torch.zeros((1, 64, 64, 3))
            else:
                try:
                    # ✅ 关键修复：从全局通道获取所有缓存图像
                    # 使用channel_name="__global__"确保从ImageCacheSave保存的全局通道读取
                    cached_images = cache_manager.get_cached_images(
                        get_latest=True,
                        channel_name="__global__"
                    )
                    if cached_images and len(cached_images) > 0:
                        # ✅ 合并所有缓存图像为一个批次
                        # cached_images是列表，每个元素shape为(1, H, W, C)
                        # 需要合并成(N, H, W, C)的批次张量
                        cached_image = torch.cat(cached_images, dim=0)
                        if should_debug(COMPONENT_NAME):
                            logger.info(f"[ImageCacheGet] ✅ 成功获取全局缓存图像 (共{len(cached_images)}张，批次shape: {cached_image.shape})")
                    else:
                        if should_debug(COMPONENT_NAME):
                            logger.info(f"[ImageCacheGet] 📌 全局缓存为空，使用默认图像")
                        cached_image = default_image[0] if default_image else torch.zeros((1, 64, 64, 3))
                except Exception as e:
                    logger.warning(f"[ImageCacheGet] ⚠️ 缓存获取失败: {str(e)}")
                    import traceback
                    logger.warning(traceback.format_exc())
                    cached_image = default_image[0] if default_image else torch.zeros((1, 64, 64, 3))

            # 确保图像是正确的格式
            if isinstance(cached_image, torch.Tensor):
                result_image = cached_image
            else:
                result_image = default_image[0] if default_image else torch.zeros((1, 64, 64, 3))

            execution_time = time.time() - start_time
            if should_debug(COMPONENT_NAME):
                logger.info(f"[ImageCacheGet] ⏱️ 执行耗时: {execution_time:.3f}秒\n")

            # 返回标准格式：(图像张量,) 和 ui 数据
            # 如果启用预览，从全局缓存通道获取图像文件信息
            ui_data = {}
            if enable_preview and cache_manager is not None:
                try:
                    # ✅ 关键修复：从全局通道获取预览数据
                    cache_channel = cache_manager.get_cache_channel(channel_name="__global__")
                    if cache_channel and "images" in cache_channel and cache_channel["images"]:
                        # 返回缓存的图像文件信息用于预览
                        ui_data = {"images": cache_channel["images"]}
                        if should_debug(COMPONENT_NAME):
                            logger.info(f"[ImageCacheGet] ✅ 预览数据已准备: {len(cache_channel['images'])}张图像")
                    else:
                        if should_debug(COMPONENT_NAME):
                            logger.info(f"[ImageCacheGet] 📌 全局缓存无图像，不显示预览")
                        ui_data = {"images": []}
                except Exception as e:
                    logger.warning(f"[ImageCacheGet] ⚠️ 获取预览数据失败: {str(e)}")
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
    "ImageCacheGet": "图像缓存获取 (Image Cache Get)",
}