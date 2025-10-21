"""
组执行管理器模块
Group Executor Manager Module
包含配置节点和触发器节点
"""

from .group_executor_manager import NODE_CLASS_MAPPINGS as manager_mappings, NODE_DISPLAY_NAME_MAPPINGS as manager_display_mappings
from .group_executor_trigger import NODE_CLASS_MAPPINGS as trigger_mappings, NODE_DISPLAY_NAME_MAPPINGS as trigger_display_mappings

# 合并两个节点的映射
NODE_CLASS_MAPPINGS = {**manager_mappings, **trigger_mappings}
NODE_DISPLAY_NAME_MAPPINGS = {**manager_display_mappings, **trigger_display_mappings}

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS']
