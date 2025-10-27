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
import os

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
        # 动态获取通道列表（INPUT_TYPES每次被调用时都会执行）
        channels = cache_manager.get_all_channels() if cache_manager else []
        channel_options = [""] + sorted(channels)

        return {
            "required": {
            },
            "optional": {
                "channel_name": (channel_options, {
                    "default": "",
                    "tooltip": "从下拉菜单选择已定义的通道，或手动输入新通道名（留空则使用'default'通道）"
                }),
                "default_image": ("IMAGE", {
                    "tooltip": "当缓存无效时使用的默认图像（可选）"
                }),
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

    @classmethod
    def VALIDATE_INPUTS(cls, channel_name=None, **kwargs):
        """
        验证输入参数
        允许任何通道名通过验证，即使不在当前的通道列表中
        这确保了工作流中保存的通道名在加载时不会被重置
        """
        # 始终返回True，允许任何通道名
        return True

    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("images",)
    FUNCTION = "get_cached_image"
    CATEGORY = CATEGORY_TYPE
    INPUT_IS_LIST = True
    OUTPUT_NODE = True

    @classmethod
    def IS_CHANGED(cls, channel_name=None, default_image=None, enable_preview: bool = True, **kwargs) -> str:
        """
        基于缓存状态生成变化检测哈希
        确保缓存更新时节点重新执行
        """
        try:
            # 提取实际通道名
            actual_channel = ""
            if channel_name and isinstance(channel_name, list) and len(channel_name) > 0:
                actual_channel = channel_name[0] if channel_name[0] else "default"
            else:
                actual_channel = "default"

            # ✅ 包含缓存管理器的状态和通道信息
            cache_timestamp = cache_manager.last_save_timestamp if cache_manager else 0

            # 获取指定通道的缓存信息
            if cache_manager:
                cache_channel = cache_manager.cache_channels.get(actual_channel, {})
                cache_count = len(cache_channel.get("images", []))
            else:
                cache_count = 0

            current_group = cache_manager.current_group_name if cache_manager else None
            hash_input = f"{actual_channel}_{enable_preview}_{cache_timestamp}_{cache_count}_{current_group}"
        except Exception:
            # 回退到基本检测
            hash_input = f"{enable_preview}_{hash(str(default_image))}"

        return hashlib.md5(hash_input.encode()).hexdigest()

    def get_cached_image(self,
                        channel_name: Optional[List[str]] = None,
                        default_image: Optional[List[torch.Tensor]] = None,
                        enable_preview: List[bool] = [True],
                        unique_id: str = "unknown",
                        prompt: Optional[Dict] = None,
                        extra_pnginfo: Optional[Dict] = None) -> Dict[str, Any]:
        """
        从指定通道获取缓存的图像（支持多通道隔离）

        功能：
        - 从指定通道获取缓存图像
        - 支持默认图像
        - 执行顺序由GroupExecutorManager控制

        Args:
            channel_name: 缓存通道名称列表
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
            # 参数提取（INPUT_IS_LIST=True）
            processed_channel = ""
            if channel_name and isinstance(channel_name, list) and len(channel_name) > 0:
                processed_channel = channel_name[0] if channel_name[0] else "default"
            else:
                processed_channel = "default"

            enable_preview = enable_preview[0] if enable_preview else True

            # ✅ 安全提取默认图像
            # 调试日志：查看传入的 default_image 参数
            logger.info(f"[ImageCacheGet] 🔍 DEBUG - default_image 参数类型: {type(default_image)}")
            logger.info(f"[ImageCacheGet] 🔍 DEBUG - default_image 是否为None: {default_image is None}")
            if default_image is not None:
                logger.info(f"[ImageCacheGet] 🔍 DEBUG - default_image 长度: {len(default_image)}")
                if len(default_image) > 0:
                    logger.info(f"[ImageCacheGet] 🔍 DEBUG - default_image[0] 类型: {type(default_image[0])}")
                    logger.info(f"[ImageCacheGet] 🔍 DEBUG - default_image[0] 是否为None: {default_image[0] is None}")
                    if default_image[0] is not None and hasattr(default_image[0], 'shape'):
                        logger.info(f"[ImageCacheGet] 🔍 DEBUG - default_image[0] shape: {default_image[0].shape}")

            # 检查列表非空 且 第一个元素有效
            safe_default_image = None
            has_user_default = False  # 标记是否有用户提供的默认图

            if default_image and len(default_image) > 0 and default_image[0] is not None:
                safe_default_image = default_image[0]
                has_user_default = True
                logger.info(f"[ImageCacheGet] ✅ DEBUG - 使用用户提供的默认图像，shape: {safe_default_image.shape}")
            else:
                # 只有在没有传入任何默认图像时，才使用黑色占位图
                safe_default_image = torch.zeros((1, 64, 64, 3))
                has_user_default = False
                logger.info(f"[ImageCacheGet] ⚠️ DEBUG - 未传入有效默认图像，使用黑色占位图 shape: {safe_default_image.shape}")

            if should_debug(COMPONENT_NAME):
                logger.info(f"\n{'='*60}")
                logger.info(f"[ImageCacheGet] ⏰ 执行时间: {time.strftime('%H:%M:%S', time.localtime())}")
                logger.info(f"[ImageCacheGet] 🎯 节点ID: {unique_id}")
                logger.info(f"[ImageCacheGet] 📁 通道: {processed_channel}")
                logger.info(f"[ImageCacheGet] 📷 显示预览: {enable_preview}")
                logger.info(f"[ImageCacheGet] 🔍 当前组名: {cache_manager.current_group_name if cache_manager else 'N/A'}")
                logger.info(f"{'='*60}\n")

            # ✅ 检测工作流中是否有GroupExecutorManager节点（使用缓存，只检测一次）
            has_manager = ImageCacheGet._check_for_group_executor_manager(prompt)
            if not has_manager:
                # 发送WebSocket事件到前端显示toast（只发送一次）
                ImageCacheGet._send_no_manager_warning()

            # 获取缓存的图像
            # ✅ 添加标志追踪是否使用了默认图像
            using_default_image = False

            if cache_manager is None:
                logger.warning("[ImageCacheGet] ⚠️ 缓存管理器不可用，使用默认图像")
                cached_image = safe_default_image
                using_default_image = True
                logger.info(f"[ImageCacheGet] 🔍 DEBUG - 缓存管理器不可用，使用 safe_default_image，shape: {cached_image.shape}")
            else:
                try:
                    # 从指定通道获取所有缓存图像
                    cached_images = cache_manager.get_cached_images(
                        get_latest=True,
                        channel_name=processed_channel
                    )
                    if cached_images and len(cached_images) > 0:
                        # ✅ 合并所有缓存图像为一个批次
                        # cached_images是列表，每个元素shape为(1, H, W, C)
                        # 需要合并成(N, H, W, C)的批次张量
                        cached_image = torch.cat(cached_images, dim=0)
                        using_default_image = False
                        if should_debug(COMPONENT_NAME):
                            logger.info(f"[ImageCacheGet] ✅ 成功获取通道'{processed_channel}'缓存图像 (共{len(cached_images)}张，批次shape: {cached_image.shape})")
                        logger.info(f"[ImageCacheGet] 🔍 DEBUG - 从缓存获取图像，shape: {cached_image.shape}")
                    else:
                        logger.info(f"[ImageCacheGet] 📌 通道'{processed_channel}'缓存为空，使用默认图像")
                        cached_image = safe_default_image
                        using_default_image = True
                        logger.info(f"[ImageCacheGet] 🔍 DEBUG - 通道缓存为空，使用 safe_default_image，shape: {cached_image.shape}")
                except Exception as e:
                    logger.warning(f"[ImageCacheGet] ⚠️ 缓存获取失败: {str(e)}")
                    import traceback
                    logger.warning(traceback.format_exc())
                    cached_image = safe_default_image
                    using_default_image = True
                    logger.info(f"[ImageCacheGet] 🔍 DEBUG - 缓存获取异常，使用 safe_default_image，shape: {cached_image.shape}")

            # 确保图像是正确的格式
            if isinstance(cached_image, torch.Tensor):
                result_image = cached_image
                logger.info(f"[ImageCacheGet] 🔍 DEBUG - cached_image 是 Tensor，result_image shape: {result_image.shape}")
            else:
                result_image = safe_default_image
                logger.info(f"[ImageCacheGet] 🔍 DEBUG - cached_image 不是 Tensor，使用 safe_default_image，shape: {result_image.shape}")

            execution_time = time.time() - start_time
            if should_debug(COMPONENT_NAME):
                logger.info(f"[ImageCacheGet] ⏱️ 执行耗时: {execution_time:.3f}秒\n")

            # 返回前最终确认
            logger.info(f"[ImageCacheGet] 🔍 DEBUG - 最终返回的 result_image shape: {result_image.shape}")
            logger.info(f"[ImageCacheGet] 🔍 DEBUG - result_image 最小值: {result_image.min():.4f}, 最大值: {result_image.max():.4f}")

            # 返回标准格式：(图像张量,) 和 ui 数据
            # 如果启用预览，从全局缓存通道获取图像文件信息
            ui_data = {}
            if enable_preview:
                try:
                    # ✅ 如果使用了默认图像，需要保存为临时文件以显示预览
                    if using_default_image:
                        # 区分是用户提供的默认图还是黑色占位图
                        if has_user_default:
                            logger.info(f"[ImageCacheGet] 📸 使用用户提供的默认图像，生成预览...")
                        else:
                            logger.info(f"[ImageCacheGet] 📸 使用黑色占位图，生成预览...")

                        # 将默认图像保存为临时文件
                        try:
                            import folder_paths
                            output_dir = folder_paths.get_temp_directory()
                        except:
                            import tempfile
                            output_dir = tempfile.gettempdir()

                        # 转换张量为PIL图像并保存
                        preview_images = []
                        for i in range(result_image.shape[0]):
                            # 将张量转换为numpy数组 (H, W, C)
                            img_array = (result_image[i].cpu().numpy() * 255).astype(np.uint8)
                            pil_img = Image.fromarray(img_array)

                            # 生成临时文件名（区分用户默认图和黑色占位图）
                            prefix = "user_default" if has_user_default else "black_placeholder"
                            filename = f"{prefix}_{int(time.time())}_{i}.png"
                            filepath = os.path.join(output_dir, filename)

                            # 保存图像
                            pil_img.save(filepath, compress_level=1)

                            preview_images.append({
                                "filename": filename,
                                "subfolder": "",
                                "type": "temp"
                            })

                        ui_data = {"images": preview_images}
                        if has_user_default:
                            logger.info(f"[ImageCacheGet] ✅ 用户默认图像预览已生成: {len(preview_images)}张图像")
                        else:
                            logger.info(f"[ImageCacheGet] ✅ 黑色占位图预览已生成: {len(preview_images)}张图像")

                    # ✅ 否则从缓存获取预览数据
                    elif cache_manager is not None:
                        cache_channel = cache_manager.get_cache_channel(channel_name=processed_channel)
                        if cache_channel and "images" in cache_channel and cache_channel["images"]:
                            # 返回缓存的图像文件信息用于预览
                            ui_data = {"images": cache_channel["images"]}
                            if should_debug(COMPONENT_NAME):
                                logger.info(f"[ImageCacheGet] ✅ 预览数据已准备: {len(cache_channel['images'])}张图像")
                        else:
                            if should_debug(COMPONENT_NAME):
                                logger.info(f"[ImageCacheGet] 📌 通道'{processed_channel}'无图像，不显示预览")
                            ui_data = {"images": []}
                    else:
                        ui_data = {"images": []}

                except Exception as e:
                    logger.warning(f"[ImageCacheGet] ⚠️ 获取预览数据失败: {str(e)}")
                    import traceback
                    logger.warning(traceback.format_exc())
                    ui_data = {"images": []}

            return {
                "result": (result_image,),
                "ui": ui_data
            }

        except Exception as e:
            logger.error(f"[ImageCacheGet] ❌ 执行异常: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())

            # 返回默认图像（如果有）或黑色占位图
            # 注意：这里需要重新安全提取，因为可能在参数提取阶段就出错了
            fallback_image = torch.zeros((1, 64, 64, 3))
            if default_image and len(default_image) > 0 and default_image[0] is not None:
                fallback_image = default_image[0]
            return {
                "result": (fallback_image,),
                "ui": {}
            }


# 节点映射
NODE_CLASS_MAPPINGS = {
    "ImageCacheGet": ImageCacheGet,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ImageCacheGet": "图像缓存获取 (Image Cache Get)",
}