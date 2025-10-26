"""
全局文本缓存获取节点 - Global Text Cache Get Node
从指定通道获取缓存的文本数据
"""

import time
import hashlib
import logging
from typing import List, Dict, Any, Optional
from ..text_cache_manager.text_cache_manager import text_cache_manager

# 导入debug配置
from ..utils.debug_config import should_debug

CATEGORY_TYPE = "danbooru"
COMPONENT_NAME = "global_text_cache_get"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("GlobalTextCacheGet")


class GlobalTextCacheGet:
    """
    全局文本缓存获取节点 - 从指定通道获取缓存的文本

    功能：
    - 从缓存管理器获取缓存的文本
    - 支持动态通道选择（下拉菜单）
    - 支持手动输入通道名称
    - 提供预览开关
    - 支持默认文本
    """

    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(cls):
        # 动态获取通道列表
        def get_channel_options():
            channels = text_cache_manager.get_all_channels()
            # 添加空选项和已有通道
            return [""] + channels

        return {
            "required": {},
            "optional": {
                "channel_name": (get_channel_options(), {
                    "default": "",
                    "tooltip": "从下拉菜单选择已定义的通道，或手动输入新通道名（留空则使用'default'通道）"
                }),
                "enable_preview": ("BOOLEAN", {
                    "default": True,
                    "label_on": "true",
                    "label_off": "false",
                    "tooltip": "切换文本预览显示/隐藏"
                }),
                "default_text": ("STRING", {
                    "default": "",
                    "multiline": True,
                    "tooltip": "当缓存为空或不存在时使用的默认文本"
                }),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
                "prompt": "PROMPT",
                "extra_pnginfo": "EXTRA_PNGINFO"
            }
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("text",)
    FUNCTION = "get_cached_text"
    CATEGORY = CATEGORY_TYPE
    INPUT_IS_LIST = True
    OUTPUT_NODE = True
    DESCRIPTION = "从指定通道获取缓存的文本，支持动态通道选择和默认文本"

    @classmethod
    def IS_CHANGED(cls, channel_name=None, enable_preview: bool = True, default_text=None, **kwargs) -> str:
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

            # 包含缓存管理器的状态
            cache_timestamp = text_cache_manager.last_save_timestamp
            channel_exists = text_cache_manager.channel_exists(actual_channel)
            hash_input = f"{enable_preview}_{cache_timestamp}_{actual_channel}_{channel_exists}"
        except Exception:
            # 回退到基本检测
            hash_input = f"{time.time()}"

        return hashlib.md5(hash_input.encode()).hexdigest()

    def get_cached_text(self,
                        channel_name: Optional[List[str]] = None,
                        enable_preview: List[bool] = [True],
                        default_text: Optional[List[str]] = None,
                        unique_id: str = "unknown",
                        prompt: Optional[Dict] = None,
                        extra_pnginfo: Optional[Dict] = None) -> Dict[str, Any]:
        """
        获取指定通道的缓存文本

        Args:
            channel_name: 缓存通道名称列表
            enable_preview: 是否显示预览列表
            default_text: 默认文本列表
            unique_id: 节点ID
            prompt: 工作流数据
            extra_pnginfo: 额外信息

        Returns:
            包含文本和预览的字典
        """
        start_time = time.time()

        try:
            # 参数提取
            processed_channel = ""
            if channel_name and isinstance(channel_name, list) and len(channel_name) > 0:
                processed_channel = channel_name[0] if channel_name[0] else "default"
            else:
                processed_channel = "default"

            processed_enable_preview = enable_preview[0] if isinstance(enable_preview, list) and len(enable_preview) > 0 else True

            # 安全提取默认文本
            processed_default_text = ""
            if default_text and isinstance(default_text, list) and len(default_text) > 0:
                processed_default_text = default_text[0] if default_text[0] else ""

            if should_debug(COMPONENT_NAME):
                logger.info(f"\n{'='*60}")
                logger.info(f"[GlobalTextCacheGet] ⏰ 执行时间: {time.strftime('%H:%M:%S', time.localtime())}")
                logger.info(f"[GlobalTextCacheGet] 🎯 节点ID: {unique_id}")
                logger.info(f"[GlobalTextCacheGet] 📁 通道: {processed_channel}")
                logger.info(f"[GlobalTextCacheGet] 📷 显示预览: {processed_enable_preview}")
                logger.info(f"{'='*60}\n")

            # 获取缓存的文本
            cached_text = ""
            using_default_text = False

            try:
                # 从指定通道获取缓存文本
                cached_text = text_cache_manager.get_cached_text(channel_name=processed_channel)

                if not cached_text:
                    logger.info(f"[GlobalTextCacheGet] 📌 通道 '{processed_channel}' 缓存为空，使用默认文本")
                    cached_text = processed_default_text
                    using_default_text = True
                else:
                    if should_debug(COMPONENT_NAME):
                        logger.info(f"[GlobalTextCacheGet] ✅ 成功获取缓存文本 (长度: {len(cached_text)} 字符)")

            except Exception as e:
                logger.warning(f"[GlobalTextCacheGet] ⚠️ 缓存获取失败: {str(e)}")
                import traceback
                logger.warning(traceback.format_exc())
                cached_text = processed_default_text
                using_default_text = True

            execution_time = time.time() - start_time
            if should_debug(COMPONENT_NAME):
                logger.info(f"[GlobalTextCacheGet] ⏱️ 执行耗时: {execution_time:.3f}秒\n")

            # 返回标准格式：(文本,) 和 ui 数据
            ui_data = {}
            if processed_enable_preview:
                try:
                    # 限制预览长度
                    preview_text = cached_text[:500] + "..." if len(cached_text) > 500 else cached_text
                    ui_data = {
                        "text": [preview_text],
                        "channel": [processed_channel],
                        "length": [len(cached_text)],
                        "using_default": [using_default_text]
                    }
                except Exception as e:
                    logger.warning(f"[GlobalTextCacheGet] ⚠️ 生成预览数据失败: {str(e)}")
                    ui_data = {}

            return {
                "result": (cached_text,),
                "ui": ui_data
            }

        except Exception as e:
            logger.error(f"[GlobalTextCacheGet] ❌ 执行异常: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())

            # 返回默认文本或空字符串
            fallback_text = ""
            if default_text and isinstance(default_text, list) and len(default_text) > 0:
                fallback_text = default_text[0] if default_text[0] else ""

            return {
                "result": (fallback_text,),
                "ui": {}
            }


# 节点映射
NODE_CLASS_MAPPINGS = {
    "GlobalTextCacheGet": GlobalTextCacheGet,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "GlobalTextCacheGet": "全局文本缓存获取 (Global Text Cache Get)",
}
