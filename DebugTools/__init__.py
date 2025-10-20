"""
DebugTools模块 - 调试和监控工具
"""

try:
    from .debug_monitor import NODE_CLASS_MAPPINGS as debug_mappings, NODE_DISPLAY_NAME_MAPPINGS as debug_display_mappings
except Exception as e:
    print(f"[DebugTools] 导入调试监控节点失败: {e}")
    debug_mappings, debug_display_mappings = {}, {}

try:
    from .memory_monitor import NODE_CLASS_MAPPINGS as memory_mappings, NODE_DISPLAY_NAME_MAPPINGS as memory_display_mappings
except Exception as e:
    print(f"[DebugTools] 导入内存监控节点失败: {e}")
    memory_mappings, memory_display_mappings = {}, {}

# 合并所有DebugTools节点的映射
NODE_CLASS_MAPPINGS = {**debug_mappings, **memory_mappings}
NODE_DISPLAY_NAME_MAPPINGS = {**debug_display_mappings, **memory_display_mappings}

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS']