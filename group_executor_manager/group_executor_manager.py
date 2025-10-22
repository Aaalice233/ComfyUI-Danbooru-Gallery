"""
组执行管理器 - ComfyUI节点
基于官方文档的标准格式实现
"""

import json
from typing import Dict, Any

class GroupExecutorManager:
    """Basic Group Executor Manager"""

    @classmethod
    def INPUT_TYPES(cls):
        """定义输入参数类型 - 遵循ComfyUI官方规范"""
        return {
            "required": {
                "group_config": ("STRING", {
                    "multiline": True,
                    "default": "[]",
                    "tooltip": "组执行配置的JSON字符串"
                }),
                "execution_mode": (["sequential", "parallel"], {
                    "default": "sequential",
                    "tooltip": "执行模式：顺序执行或并行执行"
                })
            },
            "optional": {
                "enable_cache": ("BOOLEAN", {
                    "default": True,
                    "tooltip": "是否启用缓存机制"
                }),
                "debug_mode": ("BOOLEAN", {
                    "default": False,
                    "tooltip": "是否启用调试模式"
                })
            },
            "hidden": {
                "prompt": "PROMPT",
                "extra_pnginfo": "EXTRA_PNGINFO",
                "unique_id": "UNIQUE_ID"
            }
        }

    RETURN_TYPES = ("STRING", "STRING")
RETURN_NAMES = ("execution_plan", "cache_control_signal")
FUNCTION = "create_execution_plan"
CATEGORY = "utils"
DESCRIPTION = "组执行管理器，用于管理和控制节点组的执行顺序和缓存策略"

    def create_execution_plan(self, group_config, execution_mode, enable_cache=True, debug_mode=False, prompt=None, extra_pnginfo=None, unique_id=None):
        """
        创建执行计划

        Args:
            group_config: 组配置JSON字符串
            execution_mode: 执行模式
            enable_cache: 是否启用缓存
            debug_mode: 是否启用调试
            prompt: 完整的提示信息（隐藏输入）
            extra_pnginfo: 额外的PNG信息（隐藏输入）
            unique_id: 节点唯一ID（隐藏输入）

        Returns:
            tuple: (执行计划, 缓存控制信号)
        """
        try:
            # 解析组配置
            if isinstance(group_config, str):
                try:
                    config_data = json.loads(group_config)
                except json.JSONDecodeError:
                    config_data = {"groups": [], "error": "Invalid JSON"}
            else:
                config_data = group_config

            # 创建执行计划
            execution_plan = {
                "groups": config_data.get("groups", []),
                "mode": execution_mode,
                "cache_enabled": enable_cache,
                "debug_mode": debug_mode,
                "execution_id": unique_id if unique_id else "auto-generated"
            }

            # 创建缓存控制信号
            cache_signal = {
                "enable_cache": enable_cache,
                "cache_key": f"group_executor_{execution_mode}_{hash(str(config_data))}",
                "clear_cache": not enable_cache
            }

            # 调试输出
            if debug_mode:
                print(f"[GroupExecutorManager] 创建执行计划:")
                print(f"  模式: {execution_mode}")
                print(f"  缓存: {enable_cache}")
                print(f"  组数: {len(execution_plan['groups'])}")
                if unique_id:
                    print(f"  节点ID: {unique_id}")

            return (json.dumps(execution_plan, ensure_ascii=False),
                   json.dumps(cache_signal, ensure_ascii=False))

        except Exception as e:
            error_msg = f"GroupExecutorManager 执行错误: {str(e)}"
            print(error_msg)

            # 返回错误信息
            error_plan = {"error": error_msg, "execution_id": unique_id}
            error_signal = {"clear_cache": True, "error": True}

            return (json.dumps(error_plan, ensure_ascii=False),
                   json.dumps(error_signal, ensure_ascii=False))

# 节点映射 - 用于ComfyUI注册
NODE_CLASS_MAPPINGS = {
    "GroupExecutorManager": GroupExecutorManager,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "GroupExecutorManager": "组执行管理器 v2.0",
}