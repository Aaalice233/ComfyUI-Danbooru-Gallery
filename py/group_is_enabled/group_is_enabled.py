"""
组是否启用节点 (Group Is Enabled)
检测组静音管理器中被管理组的启用状态
"""

import threading
from ..utils.logger import get_logger

logger = get_logger(__name__)


# 全局状态缓存（由前端在执行前通过API同步）
_group_states_cache = {}
_cache_lock = threading.Lock()


def update_all_group_states(states: dict):
    """批量更新所有组状态"""
    global _group_states_cache
    with _cache_lock:
        _group_states_cache = states.copy()
    logger.debug(f"[GroupIsEnabled] 已更新 {len(states)} 个组状态")


def get_group_state(group_name: str) -> bool:
    """获取组状态"""
    with _cache_lock:
        return _group_states_cache.get(group_name, True)


class GroupIsEnabled:
    """
    组是否启用节点

    检测被组静音管理器管理的组的启用状态，输出布尔值。
    - True: 组已启用（非静音且非bypass状态）
    - False: 组已禁用（静音或bypass状态）
    """

    @classmethod
    def INPUT_TYPES(cls):
        """定义输入参数类型"""
        return {
            "required": {
                # 组名通过前端动态填充选项
                "group_name": ("STRING", {
                    "default": "",
                    "multiline": False,
                    "tooltip": "选择被组静音管理器管理的组"
                }),
            }
        }

    RETURN_TYPES = ("BOOLEAN",)
    RETURN_NAMES = ("is_enabled",)
    FUNCTION = "check_group_status"
    CATEGORY = "danbooru"
    DESCRIPTION = "检测组静音管理器中被管理组的启用状态，输出布尔值"

    @classmethod
    def IS_CHANGED(cls, group_name=""):
        """强制每次执行时重新检查状态"""
        # 返回当前状态，确保状态变化时重新执行
        return get_group_state(group_name)

    def check_group_status(self, group_name):
        """
        检查组的启用状态

        Args:
            group_name: 组名称

        Returns:
            tuple: (is_enabled,) 布尔值元组
        """
        # 处理空组名或无效组名
        if not group_name or group_name == "(无被管理的组)":
            logger.warning("[GroupIsEnabled] 未选择有效组名，默认返回True")
            return (True,)

        is_enabled = get_group_state(group_name)

        logger.debug(f"[GroupIsEnabled] 检查组状态: {group_name} = {is_enabled}")

        return (is_enabled,)


# 节点映射
NODE_CLASS_MAPPINGS = {
    "GroupIsEnabled": GroupIsEnabled,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "GroupIsEnabled": "组是否启用 (Group Is Enabled)",
}
