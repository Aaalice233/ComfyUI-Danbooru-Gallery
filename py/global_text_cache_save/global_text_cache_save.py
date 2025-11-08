"""
全局文本缓存保存节点 - Global Text Cache Save Node
将文本数据缓存到指定通道，支持监听其他节点的widget变化自动更新
"""

import time
import hashlib
from typing import List, Dict, Any, Optional
from ..text_cache_manager.text_cache_manager import text_cache_manager

# 导入日志系统
from ..utils.logger import get_logger

# 初始化logger
logger = get_logger(__name__)

CATEGORY_TYPE = "danbooru"


class GlobalTextCacheSave:
    """
    全局文本缓存保存节点 - 将文本缓存到指定通道供其他节点获取

    功能：
    - 保存文本到指定通道
    - 支持预览文本内容
    - 提供监听配置，供JavaScript使用
    - 执行时自动更新缓存
    """

    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "optional": {
                "channel_name": ("STRING", {
                    "default": "default",
                    "tooltip": "缓存通道名称，用于区分不同的缓存"
                }),
                "monitor_node_id": ("STRING", {
                    "default": "",
                    "tooltip": "要监听的节点ID（必须为整数，留空则不监听）"
                }),
                "monitor_widget_name": ("STRING", {
                    "default": "",
                    "tooltip": "要监听的widget名称（如positive，留空则不监听）"
                }),
                "text": ("STRING", {
                    "forceInput": True,
                    "multiline": True,
                    "tooltip": "要缓存的文本内容（必须连接输入）"
                }),
            },
            "hidden": {"prompt": "PROMPT", "extra_pnginfo": "EXTRA_PNGINFO"},
        }

    RETURN_TYPES = ()
    FUNCTION = "cache_text"
    CATEGORY = CATEGORY_TYPE
    INPUT_IS_LIST = True
    OUTPUT_NODE = True
    DESCRIPTION = "将文本缓存到指定通道，支持监听其他节点的widget变化自动更新"

    @classmethod
    def IS_CHANGED(cls, **kwargs) -> str:
        """
        基于缓存状态和输入内容生成变化检测哈希
        确保输入变化时节点重新执行
        """
        try:
            # 从kwargs中获取参数（所有参数都是optional）
            text = kwargs.get("text", None)
            channel_name = kwargs.get("channel_name", None)

            # 提取实际值
            if text is None or (isinstance(text, list) and len(text) == 0):
                actual_text = ""
            elif isinstance(text, list):
                actual_text = str(text[0]) if text[0] is not None else ""
            else:
                actual_text = str(text)

            if channel_name is None or (isinstance(channel_name, list) and len(channel_name) == 0):
                actual_channel = "default"
            elif isinstance(channel_name, list):
                actual_channel = str(channel_name[0]) if channel_name[0] is not None else "default"
            else:
                actual_channel = str(channel_name)

            # 包含文本内容、通道名称和时间戳
            cache_timestamp = text_cache_manager.last_save_timestamp
            hash_input = f"{actual_text}_{actual_channel}_{cache_timestamp}"
        except Exception:
            # 回退到基本检测
            hash_input = f"{time.time()}"

        return hashlib.md5(hash_input.encode()).hexdigest()

    def cache_text(self, **kwargs) -> Dict[str, Any]:
        """
        将文本缓存到全局缓存

        Args:
            **kwargs: 包含所有参数的字典
                text: 要缓存的文本内容列表
                channel_name: 缓存通道名称列表
                monitor_node_id: 要监听的节点ID列表
                monitor_widget_name: 要监听的widget名称列表
                prompt: 工作流数据
                extra_pnginfo: 额外信息

        Returns:
            包含UI预览数据的字典
        """
        try:
            timestamp = time.strftime("%H:%M:%S", time.localtime())
            logger.debug(f"\n{'='*60}")
            logger.debug(f"⏰ 执行时间: {timestamp}")
            logger.debug(f"┌─ 开始保存文本")
            logger.debug(f"{'='*60}\n")

            # 从kwargs中获取参数（所有参数都是optional，INPUT_IS_LIST=True）
            text = kwargs.get("text", None)
            channel_name = kwargs.get("channel_name", None)
            monitor_node_id = kwargs.get("monitor_node_id", None)
            monitor_widget_name = kwargs.get("monitor_widget_name", None)

            # 参数处理 - 处理None和列表（INPUT_IS_LIST=True）
            if text is None or (isinstance(text, list) and len(text) == 0):
                processed_text = ""
            elif isinstance(text, list):
                processed_text = str(text[0]) if text[0] is not None else ""
            else:
                processed_text = str(text)

            if channel_name is None or (isinstance(channel_name, list) and len(channel_name) == 0):
                processed_channel = "default"
            elif isinstance(channel_name, list):
                processed_channel = str(channel_name[0]) if channel_name[0] is not None else "default"
            else:
                processed_channel = str(channel_name)

            if monitor_node_id is None or (isinstance(monitor_node_id, list) and len(monitor_node_id) == 0):
                processed_monitor_node_id = ""
            elif isinstance(monitor_node_id, list):
                processed_monitor_node_id = str(monitor_node_id[0]) if monitor_node_id[0] is not None else ""
            else:
                processed_monitor_node_id = str(monitor_node_id)

            if monitor_widget_name is None or (isinstance(monitor_widget_name, list) and len(monitor_widget_name) == 0):
                processed_monitor_widget_name = ""
            elif isinstance(monitor_widget_name, list):
                processed_monitor_widget_name = str(monitor_widget_name[0]) if monitor_widget_name[0] is not None else ""
            else:
                processed_monitor_widget_name = str(monitor_widget_name)

            logger.debug(f"📁 通道: {processed_channel}")
            logger.debug(f"[GlobalTextCacheSave] 📝 文本长度: {len(processed_text)} 字符")

            if processed_monitor_node_id and processed_monitor_widget_name:
                logger.debug(f"👁 监听配置: 节点ID={processed_monitor_node_id}, Widget={processed_monitor_widget_name}")
            else:
                logger.debug(f"👁 监听配置: 未配置")

            # 准备元数据
            metadata = {
                "timestamp": time.time(),
                "monitor_node_id": processed_monitor_node_id,
                "monitor_widget_name": processed_monitor_widget_name,
                "text_length": len(processed_text)
            }

            # 保存到缓存管理器
            text_cache_manager.cache_text(
                text=processed_text,
                channel_name=processed_channel,
                metadata=metadata
            )

            logger.info(f"└─ 保存完成")

            # 固定返回预览数据（限制预览长度，避免UI卡顿）
            preview_text = processed_text[:500] + "..." if len(processed_text) > 500 else processed_text
            return {
                "ui": {
                    "text": [preview_text],
                    "channel": [processed_channel],
                    "length": [len(processed_text)]
                }
            }

        except Exception as e:
            logger.error(f"[GlobalTextCacheSave] └─ ✗ 保存失败: {str(e)}")
            import traceback
            logger.debug(traceback.format_exc())

            # 返回空结果但不抛出异常
            return {"ui": {}}


# 节点映射
def get_node_class_mappings():
    return {
        "GlobalTextCacheSave": GlobalTextCacheSave
    }


def get_node_display_name_mappings():
    return {
        "GlobalTextCacheSave": "全局文本缓存保存 (Global Text Cache Save)"
    }


NODE_CLASS_MAPPINGS = get_node_class_mappings()
NODE_DISPLAY_NAME_MAPPINGS = get_node_display_name_mappings()
