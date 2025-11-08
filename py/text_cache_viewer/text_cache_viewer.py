"""
文本缓存查看器 - Text Cache Viewer
实时显示所有文本缓存通道的更新情况和内容
"""

import time
from typing import Dict, Any
from ..text_cache_manager.text_cache_manager import text_cache_manager
from ..utils.logger import get_logger

# 初始化logger
logger = get_logger(__name__)

CATEGORY_TYPE = "danbooru"


class TextCacheViewer:
    """
    文本缓存查看器节点 - 实时显示所有文本缓存通道的更新情况和内容

    功能：
    - 显示所有缓存通道的信息
    - 显示通道名称、文本长度、更新时间
    - 提供内容预览
    - 通过WebSocket实时更新
    """

    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {},
            "optional": {},
            "hidden": {"unique_id": "UNIQUE_ID"}
        }

    RETURN_TYPES = ()
    RETURN_NAMES = ()
    FUNCTION = "view_cache"
    CATEGORY = CATEGORY_TYPE
    OUTPUT_NODE = True
    DESCRIPTION = "实时查看和监控所有文本缓存通道的更新情况和内容"

    @classmethod
    def VALIDATE_INPUTS(cls, input_types):
        """跳过类型验证"""
        return True

    def view_cache(self, unique_id=None) -> Dict[str, Any]:
        """
        获取并返回所有文本缓存通道的信息

        Args:
            unique_id: 节点唯一ID

        Returns:
            包含UI显示数据的字典
        """
        try:
            logger.debug(f"节点ID: {unique_id}")

            # 获取所有通道信息
            all_channels = text_cache_manager.get_all_channels()
            channel_data = []

            current_time = time.time()

            for channel_name in all_channels:
                if text_cache_manager.channel_exists(channel_name):
                    # 获取通道数据
                    channel_info = text_cache_manager.get_cache_channel(channel_name)
                    text = channel_info.get("text", "")
                    timestamp = channel_info.get("timestamp", 0)

                    # 计算更新时间差
                    time_diff = current_time - timestamp
                    if time_diff < 60:
                        time_str = "刚刚"
                    elif time_diff < 3600:
                        time_str = f"{int(time_diff / 60)}分钟前"
                    elif time_diff < 86400:
                        time_str = f"{int(time_diff / 3600)}小时前"
                    else:
                        time_str = f"{int(time_diff / 86400)}天前"

                    # 内容预览（完整内容，由CSS控制显示行数）
                    preview = text

                    channel_data.append({
                        "name": channel_name,
                        "length": len(text),
                        "time": time_str,
                        "preview": preview,
                        "timestamp": timestamp
                    })

            # 按时间戳排序（最新的在前）
            channel_data.sort(key=lambda x: x.get("timestamp", 0), reverse=True)

            logger.debug(f"[TextCacheViewer] 共 {len(channel_data)} 个通道")

            # 返回UI数据
            return {
                "ui": {
                    "channel_count": [len(channel_data)],
                    "channels": [channel_data]
                }
            }

        except Exception as e:
            logger.error(f"[TextCacheViewer] 错误: {str(e)}")
            import traceback
            logger.debug(traceback.format_exc())

            return {
                "ui": {
                    "channel_count": [0],
                    "channels": [[]]
                }
            }


# 节点映射
def get_node_class_mappings():
    return {
        "TextCacheViewer": TextCacheViewer
    }


def get_node_display_name_mappings():
    return {
        "TextCacheViewer": "文本缓存查看器 (Text Cache Viewer)"
    }


NODE_CLASS_MAPPINGS = get_node_class_mappings()
NODE_DISPLAY_NAME_MAPPINGS = get_node_display_name_mappings()
