"""
组执行管理器节点 - Group Executor Manager Node
单节点管理多个组的执行顺序
"""

import hashlib
import json
import logging
import time
import sys
import os
from server import PromptServer

# 日志记录
logger = logging.getLogger("GroupExecutorManager")

# 全局执行计数器（用于调试）
_global_execute_counter = 0


class GroupExecutorManager:
    """组执行管理器节点 - 使用单个节点管理多个组的执行顺序"""

    @classmethod
    def IS_CHANGED(cls, group_config, unique_id):
        """通过哈希输入配置来检查节点是否已更改"""
        # 使用 group_config 的内容计算哈希值
        # unique_id 在每次队列执行时都会变化，不应包含在哈希计算中
        m = hashlib.sha256()
        m.update(group_config.encode('utf-8'))
        return m.digest().hex()

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

            # 新增：阻止初始队列执行机制
            # 发送"准备执行"信号到前端，让前端阻止ComfyUI的默认执行流程
            try:
                logger.info(f"[GEM-PY] #{exec_id} 发送'准备执行'信号到前端，阻止初始队列...")
                preparation_data = {
                    "node_id": unique_id,
                    "exec_id": exec_id,
                    "timestamp": time.time(),
                    "action": "prepare_execution"
                }
                PromptServer.instance.send_sync("group_executor_prepare", preparation_data)
                logger.info(f"[GEM-PY] #{exec_id} ✓ '准备执行'信号已发送")

                # 等待前端确认（短暂等待，避免阻塞）
                time.sleep(0.1)  # 100ms等待前端处理

            except Exception as e:
                logger.error(f"[GEM-PY] #{exec_id} ✗ 发送'准备执行'信号失败: {str(e)}")
                # 即使信号发送失败，也继续执行，因为这可能只是前端连接问题

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
                error_message_data = {
                    "node_id": unique_id,
                    "errors": validation_errors,
                    "python_exec_id": exec_id,
                    "timestamp": time.time()
                }

                error_send_success = False
                try:
                    logger.info(f"[GEM-PY] #{exec_id} 发送错误消息到前端...")
                    PromptServer.instance.send_sync("group_executor_error", error_message_data)
                    error_send_success = True
                    logger.info(f"[GEM-PY] #{exec_id} ✓ 已发送错误信息到前端")
                except Exception as e:
                    logger.error(f"[GEM-PY] #{exec_id} ✗ 发送错误消息失败: {str(e)}")

                if not error_send_success:
                    logger.error(f"[GEM-PY] #{exec_id} ✗ 无法发送错误信息到前端，请检查WebSocket连接")
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

            # ========== 改进的WebSocket发送确认机制 ==========
            message_data = {
                "node_id": unique_id,
                "execution_list": validated_list,
                "python_exec_id": exec_id,  # 添加 Python 执行ID用于追踪
                "timestamp": time.time(),
                "message_id": f"gem_{exec_id}_{int(time.time() * 1000)}",  # 添加消息ID用于确认
                "total_groups": len(validated_list)  # 添加总组数信息
            }

            websocket_send_success = False
            max_retries = 5  # 增加重试次数
            retry_delay = 0.3  # 秒，减少初始延迟

            for attempt in range(max_retries):
                try:
                    logger.info(f"[GEM-PY] #{exec_id} WebSocket 发送尝试 #{attempt + 1}/{max_retries}")
                    logger.info(f"[GEM-PY] #{exec_id} 消息ID: {message_data['message_id']}")

                    # 检查PromptServer实例状态
                    if not PromptServer.instance:
                        logger.error(f"[GEM-PY] #{exec_id} ✗ PromptServer.instance 不存在")
                        break

                    # 检查WebSocket连接状态
                    if hasattr(PromptServer.instance, 'socket_clients'):
                        client_count = len(PromptServer.instance.socket_clients)
                        logger.info(f"[GEM-PY] #{exec_id} 当前连接的WebSocket客户端数量: {client_count}")

                        if client_count == 0:
                            logger.warning(f"[GEM-PY] #{exec_id} ⚠️ 没有WebSocket客户端连接，等待连接...")
                            # 等待一段时间让客户端有机会连接
                            if attempt < max_retries - 1:
                                time.sleep(1.0)
                                continue
                    else:
                        logger.warning(f"[GEM-PY] #{exec_id} ⚠️ 无法检查WebSocket客户端状态")

                    # 发送执行消息
                    PromptServer.instance.send_sync("group_executor_execute", message_data)

                    # 立即发送状态同步消息
                    sync_data = {
                        "node_id": unique_id,
                        "message_id": message_data["message_id"],
                        "status": "message_sent",
                        "python_exec_id": exec_id,
                        "timestamp": time.time()
                    }
                    PromptServer.instance.send_sync("group_executor_status", sync_data)

                    websocket_send_success = True
                    logger.info(f"[GEM-PY] #{exec_id} ✓ WebSocket 消息发送成功")
                    logger.info(f"[GEM-PY] #{exec_id} 状态同步消息也已发送")
                    break

                except Exception as e:
                    logger.error(f"[GEM-PY] #{exec_id} ✗ WebSocket 发送失败 (尝试 {attempt + 1}/{max_retries}): {str(e)}")
                    logger.error(f"[GEM-PY] #{exec_id} 错误类型: {type(e).__name__}")

                    if attempt < max_retries - 1:
                        logger.info(f"[GEM-PY] #{exec_id} 等待 {retry_delay}秒后重试...")
                        time.sleep(retry_delay)
                        retry_delay = min(retry_delay * 1.5, 3.0)  # 指数退避，最大3秒

            if not websocket_send_success:
                logger.error(f"[GEM-PY] #{exec_id} ✗ 所有WebSocket发送尝试都失败了")
                # 尝试发送错误事件到前端
                try:
                    error_data = {
                        "node_id": unique_id,
                        "message_id": message_data.get("message_id", "unknown"),
                        "errors": [f"WebSocket通信失败: 无法发送执行指令到前端 (重试{max_retries}次均失败)"],
                        "python_exec_id": exec_id,
                        "timestamp": time.time(),
                        "error_type": "websocket_failed"
                    }
                    PromptServer.instance.send_sync("group_executor_error", error_data)
                    logger.info(f"[GEM-PY] #{exec_id} ✓ 已发送错误通知到前端")
                except Exception as error_send_e:
                    logger.error(f"[GEM-PY] #{exec_id} ✗ 发送错误通知也失败了: {error_send_e}")
            else:
                logger.info(f"[GEM-PY] #{exec_id} ✓ 已发送 WebSocket 消息到前端")
                logger.info(f"[GEM-PY] #{exec_id} 消息内容验证:")
                logger.info(f"[GEM-PY] #{exec_id}   - message_id: {message_data['message_id']}")
                logger.info(f"[GEM-PY] #{exec_id}   - node_id: {message_data['node_id']}")
                logger.info(f"[GEM-PY] #{exec_id}   - execution_list 长度: {len(message_data['execution_list'])}")
                logger.info(f"[GEM-PY] #{exec_id}   - total_groups: {message_data['total_groups']}")
                logger.info(f"[GEM-PY] #{exec_id}   - python_exec_id: {message_data['python_exec_id']}")

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
