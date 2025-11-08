"""
通用配置管理模块
统一管理所有组件的配置项
"""

import json
import os
from typing import Any, List
from pathlib import Path

# 配置文件路径（指向项目根目录的config.json）
CONFIG_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "config.json")

# 全局配置缓存
_config_cache: dict[str, Any] = {}


def load_config() -> dict[str, Any]:
    """加载完整配置文件"""
    global _config_cache

    try:
        if os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                _config_cache = json.load(f)
                return _config_cache
        else:
            # 如果配置文件不存在，返回空字典
            _config_cache = {}
            return _config_cache
    except Exception as e:
        print(f"[Config] 加载配置文件失败: {str(e)}")
        _config_cache = {}
        return _config_cache


def get_config(key: str, default: Any = None) -> Any:
    """
    获取指定配置项

    Args:
        key: 配置项键名
        default: 默认值

    Returns:
        配置值，如果不存在则返回默认值
    """
    # 如果缓存为空，先加载配置
    if not _config_cache:
        load_config()

    return _config_cache.get(key, default)


def get_sampler_node_types() -> List[str]:
    """
    获取采样器节点类型列表

    Returns:
        采样器节点类型列表
    """
    # 默认的采样器节点类型
    default_types = [
        "KSampler",
        "KSamplerAdvanced",
        "PixelKSampleUpscalerProvider",
        "PixelKSampleUpscalerSharpening",
        "SamplerCustom",
        "SamplerCustomAdvanced"
    ]

    return get_config("sampler_node_types", default_types)


def is_sampler_node(class_type: str) -> bool:
    """
    判断节点类型是否是主采样器节点

    这个函数用于组执行管理器判断后续组是否有采样器，以决定是否需要激进模式清理。
    也用于元数据收集器标识采样器节点。

    Args:
        class_type: 节点的类名

    Returns:
        bool: 如果是主采样器返回True，否则返回False
    """
    sampler_types = get_sampler_node_types()
    return class_type in sampler_types


def save_config(config: dict[str, Any]) -> bool:
    """
    保存配置文件

    Args:
        config: 完整配置字典

    Returns:
        是否保存成功
    """
    global _config_cache

    try:
        # 写入文件
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)

        # 更新缓存
        _config_cache = config

        print(f"[Config] 配置已保存")
        return True
    except Exception as e:
        print(f"[Config] 保存配置文件失败: {str(e)}")
        return False


# 初始化时加载配置
load_config()
