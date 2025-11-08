"""
Debug配置管理模块
统一管理所有组件的debug模式开关
"""

import json
import os
from typing import Dict, Any

# 配置文件路径（指向项目根目录的config.json）
CONFIG_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "config.json")

# 全局配置缓存
_debug_config: Dict[str, Any] = {}


def load_config() -> Dict[str, Any]:
    """加载配置文件"""
    global _debug_config

    try:
        if os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                config = json.load(f)
                _debug_config = config.get('debug', {})
                return _debug_config
        else:
            # 如果配置文件不存在，使用默认配置（全部关闭）
            _debug_config = {
                "group_executor_manager": False,
                "group_executor_trigger": False,
                "image_cache_save": False,
                "image_cache_get": False,
                "execution_engine": False,
                "cache_control_events": False
            }
            return _debug_config
    except Exception as e:
        print(f"[DebugConfig] 加载配置文件失败: {str(e)}")
        # 发生错误时，默认关闭所有debug
        _debug_config = {}
        return _debug_config


def save_config(debug_config: Dict[str, Any]) -> bool:
    """保存配置文件"""
    global _debug_config

    try:
        # 读取现有配置
        existing_config = {}
        if os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                existing_config = json.load(f)

        # 更新debug配置
        existing_config['debug'] = debug_config

        # 写回文件
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(existing_config, f, indent=2, ensure_ascii=False)

        # 更新缓存
        _debug_config = debug_config

        print(f"[DebugConfig] 配置已保存")
        return True
    except Exception as e:
        print(f"[DebugConfig] 保存配置文件失败: {str(e)}")
        return False


def should_debug(component: str) -> bool:
    """
    检查指定组件是否应该打印debug日志

    Args:
        component: 组件名称，如 'group_executor_manager'

    Returns:
        bool: True表示应该打印日志，False表示不打印
    """
    # 如果配置未加载，先加载
    if not _debug_config:
        load_config()

    # 返回该组件的debug开关，默认为False
    return _debug_config.get(component, False)


def debug_print(component: str, *args, **kwargs):
    """
    条件打印日志，只有当组件的debug模式开启时才打印

    Args:
        component: 组件名称
        *args: 要打印的内容
        **kwargs: print函数的其他参数
    """
    if should_debug(component):
        # 强制刷新缓冲区，确保日志立即写入文件
        print(*args, **kwargs, flush=True)


def get_all_debug_config() -> Dict[str, Any]:
    """获取所有debug配置"""
    if not _debug_config:
        load_config()
    return _debug_config.copy()


# 初始化时加载配置
load_config()
