"""
组执行管理器模块
"""

from ..utils.logger import get_logger
logger = get_logger(__name__)

from .group_executor_manager import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS

logger.info('✅ GroupExecutorManager模块导入成功')

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS']