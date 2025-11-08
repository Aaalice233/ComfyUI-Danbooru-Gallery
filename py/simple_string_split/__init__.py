"""
简易字符串分隔节点模块 (Simple String Split Module)
按分隔符分割字符串并返回字符串数组
"""

from ..utils.logger import get_logger
logger = get_logger(__name__)

from .simple_string_split import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS']

logger.info("简易字符串分隔节点已加载")
