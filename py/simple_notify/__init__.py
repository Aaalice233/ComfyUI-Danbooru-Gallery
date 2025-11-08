"""
简易通知节点模块 (Simple Notify Module)
结合系统通知和音效播放功能
"""

from ..utils.logger import get_logger
logger = get_logger(__name__)

from .simple_notify import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS']

logger.info("简易通知节点已加载")
