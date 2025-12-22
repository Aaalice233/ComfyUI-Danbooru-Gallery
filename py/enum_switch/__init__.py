"""
枚举切换节点模块 (Enum Switch Module)
"""

from .enum_switch import (
    NODE_CLASS_MAPPINGS,
    NODE_DISPLAY_NAME_MAPPINGS,
    EnumSwitch,
    get_enum_config,
    set_enum_config,
    clear_enum_config
)

__all__ = [
    'NODE_CLASS_MAPPINGS',
    'NODE_DISPLAY_NAME_MAPPINGS',
    'EnumSwitch',
    'get_enum_config',
    'set_enum_config',
    'clear_enum_config'
]
