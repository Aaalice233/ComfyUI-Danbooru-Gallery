"""
组执行管理器节点 - Group Executor Manager Node
单节点管理多个组的执行顺序
"""

import json
import logging
import time
from server import PromptServer

# 日志记录
logger = logging.getLogger("GroupExecutorManager")

# 全局执行计数器（用于调试）
_global_execute_counter = 0


class GroupExecutorManager:
    """组执行管理器节点 - 使用单个节点管理多个组的执行顺序"""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "group_config": ("STRING", {
                    "multiline": True,
                    "default": "[]",
                    "dynamicPrompts": False
                }),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID"
            }
        }

    RETURN_TYPES = ()
    FUNCTION = "execute"
    CATEGORY = "Danbooru/Execution"
    OUTPUT_NODE = True

    def __init__(self):
        pass

    def execute(self, group_config, unique_id):
        """执行组列表"""
        global _global_execute_counter
        _global_execute_counter += 1
        exec_id = _global_execute_counter

        try:
            logger.info(f"[GEM-PY] ==================== Python Execute 被调用 #{exec_id} ====================")
            logger.info(f"[GEM-PY] #{exec_id} 时间戳: {time.time()}")
            logger.info(f"[GEM-PY] #{exec_id} 节点ID: {unique_id}")
            logger.info(f"[GEM-PY] #{exec_id} 原始配置类型: {type(group_config)}")
            logger.info(f"[GEM-PY] #{exec_id} 原始配置长度: {len(group_config) if group_config else 0}")
            logger.info(f"[GEM-PY] #{exec_id} 原始配置（前500字符）: {group_config[:500] if group_config else 'None'}")

            # 如果配置很长，打印完整内容
            if group_config and len(group_config) > 500:
                logger.info(f"[GEM-PY] #{exec_id} 原始配置（完整）: {group_config}")

            # 解析配置
            execution_list = []
            validation_errors = []

            if not group_config or not group_config.strip():
                error_msg = "组配置为空，请至少添加一个组"
                logger.error(f"[GEM-PY] #{exec_id} ✗ {error_msg}")
                validation_errors.append(error_msg)
            else:
                try:
                    config_data = json.loads(group_config)
                    logger.info(f"[GEM-PY] #{exec_id} JSON 解析成功")
                    logger.info(f"[GEM-PY] #{exec_id} 解析后类型: {type(config_data)}")

                    if isinstance(config_data, list):
                        if len(config_data) == 0:
                            error_msg = "组配置列表为空，请至少添加一个组"
                            logger.error(f"[GEM-PY] #{exec_id} ✗ {error_msg}")
                            validation_errors.append(error_msg)
                        else:
                            execution_list = config_data
                            logger.info(f"[GEM-PY] #{exec_id} ✓ 解析配置成功，共 {len(execution_list)} 项")
                            logger.info(f"[GEM-PY] #{exec_id} 解析后的组顺序: {[item.get('group_name', '?') for item in execution_list]}")
                    else:
                        error_msg = f"配置格式错误：期望 JSON 数组，实际是 {type(config_data).__name__}"
                        logger.error(f"[GEM-PY] #{exec_id} ✗ {error_msg}")
                        validation_errors.append(error_msg)
                except json.JSONDecodeError as e:
                    error_msg = f"JSON 解析失败: {str(e)}"
                    logger.error(f"[GEM-PY] #{exec_id} ✗ {error_msg}")
                    validation_errors.append(error_msg)

            if not execution_list:
                logger.warning(f"[GEM-PY] #{exec_id} 执行列表为空，退出")
                return ()

            # 验证执行列表
            logger.info(f"[GEM-PY] #{exec_id} 开始验证执行列表...")
            validated_list = []
            seen_group_names = set()

            for idx, item in enumerate(execution_list):
                if not isinstance(item, dict):
                    error_msg = f"第 {idx + 1} 项不是有效的配置对象"
                    logger.warning(f"[GEM-PY] #{exec_id} ✗ {error_msg}: {item}")
                    validation_errors.append(error_msg)
                    continue

                group_name = item.get('group_name', '')

                # 检查延迟标记
                if group_name == '__delay__':
                    try:
                        delay_seconds = float(item.get('delay_seconds', 0))
                        validated_list.append({
                            'group_name': '__delay__',
                            'delay_seconds': delay_seconds
                        })
                        logger.info(f"[GEM-PY] #{exec_id} 添加延迟标记 #{idx}: {delay_seconds}秒")
                    except (ValueError, TypeError) as e:
                        error_msg = f"第 {idx + 1} 项延迟时间无效: {item.get('delay_seconds')}"
                        logger.error(f"[GEM-PY] #{exec_id} ✗ {error_msg}")
                        validation_errors.append(error_msg)
                    continue

                # 验证组名称
                if not group_name or not group_name.strip():
                    error_msg = f"第 {idx + 1} 项的组名称为空"
                    logger.warning(f"[GEM-PY] #{exec_id} ✗ {error_msg}")
                    validation_errors.append(error_msg)
                    continue

                # 检查重复的组名称（警告但不阻止）
                if group_name in seen_group_names:
                    warning_msg = f"组名称 '{group_name}' 重复出现"
                    logger.warning(f"[GEM-PY] #{exec_id} ⚠️ {warning_msg}")
                seen_group_names.add(group_name)

                # 验证延迟时间
                try:
                    delay_seconds = max(0, float(item.get('delay_seconds', 0)))
                except (ValueError, TypeError):
                    logger.warning(f"[GEM-PY] #{exec_id} 第 {idx + 1} 项延迟时间无效，使用默认值 0")
                    delay_seconds = 0

                validated_item = {
                    'group_name': group_name.strip(),
                    'delay_seconds': delay_seconds
                }
                validated_list.append(validated_item)
                logger.info(f"[GEM-PY] #{exec_id} 添加组 #{idx}: {group_name}, 延迟={delay_seconds}秒")

            # 检查是否有验证错误
            if validation_errors:
                logger.error(f"[GEM-PY] #{exec_id} 发现 {len(validation_errors)} 个验证错误")

                # 发送错误信息到前端
                PromptServer.instance.send_sync(
                    "group_executor_error", {
                        "node_id": unique_id,
                        "errors": validation_errors,
                        "python_exec_id": exec_id,
                        "timestamp": time.time()
                    }
                )
                logger.info(f"[GEM-PY] #{exec_id} ✓ 已发送错误信息到前端")
                return ()

            if not validated_list:
                error_msg = "验证后执行列表为空，没有可执行的组"
                logger.error(f"[GEM-PY] #{exec_id} ✗ {error_msg}")

                # 发送错误信息到前端
                PromptServer.instance.send_sync(
                    "group_executor_error", {
                        "node_id": unique_id,
                        "errors": [error_msg],
                        "python_exec_id": exec_id,
                        "timestamp": time.time()
                    }
                )
                return ()

            # 打印最终的执行列表
            logger.info(f"[GEM-PY] #{exec_id} ========== 最终执行列表 (共{len(validated_list)}项) ==========")
            for idx, item in enumerate(validated_list):
                logger.info(f"[GEM-PY] #{exec_id}   [{idx}] {item}")
            logger.info(f"[GEM-PY] #{exec_id} 最终组顺序: {[item['group_name'] for item in validated_list]}")

            # 通过 WebSocket 发送执行指令到前端
            logger.info(f"[GEM-PY] #{exec_id} 准备发送 WebSocket 消息...")
            logger.info(f"[GEM-PY] #{exec_id} 事件名称: group_executor_execute")
            logger.info(f"[GEM-PY] #{exec_id} 目标节点ID: {unique_id}")

            PromptServer.instance.send_sync(
                "group_executor_execute", {
                    "node_id": unique_id,
                    "execution_list": validated_list,
                    "python_exec_id": exec_id,  # 添加 Python 执行ID用于追踪
                    "timestamp": time.time()
                }
            )

            logger.info(f"[GEM-PY] #{exec_id} ✓ 已发送 WebSocket 消息到前端")
            logger.info(f"[GEM-PY] #{exec_id} ==================== Python Execute 完成 ====================")

        except Exception as e:
            logger.error(f"[GEM-PY] #{exec_id} ✗ 执行失败: {e}")
            import traceback
            logger.error(f"[GEM-PY] #{exec_id} 堆栈追踪:\n{traceback.format_exc()}")

        return ()


# 节点映射
NODE_CLASS_MAPPINGS = {
    "GroupExecutorManager": GroupExecutorManager
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "GroupExecutorManager": "组执行管理器 (Group Executor Manager)"
}
