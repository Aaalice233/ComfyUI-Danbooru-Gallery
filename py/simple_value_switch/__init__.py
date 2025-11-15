"""
简易值切换节点模块 (Simple Value Switch Module)
输出第一个非空值，支持动态数量的任意类型输入
"""

from ..utils.logger import get_logger
logger = get_logger(__name__)

from .simple_value_switch import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS']

logger.info("简易值切换节点已加载")
