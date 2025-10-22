"""
优化组执行触发器 - Optimized Group Executor Trigger
基于ComfyUI原生机制完全重写，使用STRING类型接收JSON执行计划

⚠️ 关键修正：
1. 使用STRING类型接收JSON序列化的执行计划和控制信号
2. 专注于WebSocket消息触发和客户端隔离
3. 增强错误处理和状态报告
4. 保持与现有工作流的完全兼容性
"""

import json
import time
import logging
from typing import Dict, Any
try:
    from server import PromptServer
except ImportError:
    PromptServer = None

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("OptimizedGET")

class GroupExecutorTrigger:
    """
    基于ComfyUI原生机制的组执行触发器

    ⚠️ 关键修正：
    1. 使用STRING类型接收JSON序列化的执行计划和控制信号
    2. 专注于WebSocket消息触发和客户端隔离
    3. 增强错误处理和状态报告
    4. 保持与现有工作流的完全兼容性
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "execution_plan_json": ("STRING", {
                    "multiline": True,
                    "tooltip": "从GroupExecutorManager接收的JSON格式执行计划"
                }),
                "cache_control_signal_json": ("STRING", {
                    "multiline": True,
                    "tooltip": "从GroupExecutorManager接收的JSON格式缓存控制信号"
                }),
            },
            "optional": {
                "force_execution": ("BOOLEAN", {
                    "default": False,
                    "tooltip": "强制执行，忽略之前的执行状态"
                }),
                "pause_on_error": ("BOOLEAN", {
                    "default": True,
                    "tooltip": "遇到错误时暂停执行"
                }),
                "execution_priority": (["normal", "high", "low"], {
                    "default": "normal",
                    "tooltip": "执行优先级：normal=正常，high=高优先级，low=低优先级"
                }),
                "execution_timeout": ("INT", {
                    "default": 300,
                    "min": 30,
                    "max": 1800,
                    "tooltip": "单个组执行的超时时间（秒）"
                })
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
                "client_id": "CLIENT_ID"
            }
        }

    RETURN_TYPES = ("STRING",)  # 返回执行状态JSON
    RETURN_NAMES = ("execution_status_json",)
    FUNCTION = "trigger_optimized_execution"
    CATEGORY = "danbooru"
    OUTPUT_NODE = True  # 这是输出节点，会触发WebSocket消息

    def trigger_optimized_execution(self,
                                execution_plan_json: str,
                                cache_control_signal_json: str,
                                force_execution: bool,
                                pause_on_error: bool,
                                execution_priority: str,
                                execution_timeout: int,
                                unique_id: str,
                                client_id: str) -> tuple:
        """
        触发优化组执行 - 发送WebSocket消息到JavaScript引擎

        Returns:
            tuple: (execution_status_json,)
        """

        start_time = time.time()

        try:
            # 1. 解析执行计划和控制信号
            execution_plan = json.loads(execution_plan_json)
            cache_control_signal = json.loads(cache_control_signal_json)

            execution_id = execution_plan.get("execution_id", "unknown")

            logger.info(f"\n{'='*80}")
            logger.info(f"[GroupExecutorTrigger] ⏰ 执行时间: {time.strftime('%H:%M:%S', time.localtime())}")
            logger.info(f"[GroupExecutorTrigger] 🚀 开始执行组计划")
            logger.info(f"[GroupExecutorTrigger] 🔧 执行ID: {execution_id}")
            logger.info(f"[GroupExecutorTrigger] 🖥️  客户端ID: {client_id}")
            logger.info(f"[GroupExecutorTrigger] 📋 节点ID: {unique_id}")
            logger.info(f"[GroupExecutorTrigger] 📊 执行模式: {execution_plan.get('execution_mode', 'unknown')}")
            logger.info(f"[GroupExecutorTrigger] 🎛️ 缓存控制: {execution_plan.get('cache_control_mode', 'unknown')}")
            logger.info(f"[GroupExecutorTrigger] 🔁 优先级: {execution_priority}")
            logger.info(f"[GroupExecutorTrigger] ⏱️ 超时: {execution_timeout}秒")
            logger.info(f"{'='*80}\n")

            # 2. 验证执行计划
            validation_result = self.validate_execution_plan(execution_plan, cache_control_signal, client_id)
            if not validation_result["valid"]:
                error_msg = f"执行计划验证失败: {validation_result['errors']}"
                logger.error(f"[GroupExecutorTrigger] ❌ {error_msg}")
                return self.create_error_status(execution_id, error_msg, start_time)

            # 3. 检查执行权限和强制执行标志
            if not force_execution and not self.check_execution_permission(cache_control_signal, execution_id):
                warning_msg = "执行权限不足，需要强制执行或等待缓存控制信号"
                logger.warning(f"[GroupExecutorTrigger] ⚠️ {warning_msg}")
                return self.create_warning_status(execution_id, warning_msg, start_time)

            # 4. 发送WebSocket消息给JavaScript引擎
            message_data = {
                "type": "danbooru_optimized_execution",
                "execution_id": execution_id,
                "execution_plan": execution_plan,
                "cache_control_signal": cache_control_signal,
                "trigger_config": {
                    "force_execution": force_execution,
                    "pause_on_error": pause_on_error,
                    "execution_priority": execution_priority,
                    "execution_timeout": execution_timeout
                },
                "client_id": client_id,
                "node_id": unique_id,
                "timestamp": start_time
            }

            logger.info(f"[GroupExecutorTrigger] 📡 发送WebSocket消息:")
            logger.info(f"   - 事件类型: {message_data['type']}")
            logger.info(f"   - 执行ID: {execution_id}")
            logger.info(f"   - 组数量: {len(execution_plan.get('groups', []))}")
            logger.info(f"   - 客户端ID: {client_id}")
            logger.info(f"   - 强制执行: {force_execution}")

            # 5. 发送消息到前端JavaScript引擎
            PromptServer.instance.send_sync("danbooru_optimized_execution", message_data)

            logger.info(f"[GroupExecutorTrigger] ✅ WebSocket消息发送成功")
            logger.info(f"[GroupExecutorTrigger] ⏳ JavaScript引擎将异步执行组列表\n")

            # 6. 返回执行状态
            execution_status = {
                "status": "triggered",
                "execution_id": execution_id,
                "message": "执行已触发，等待JavaScript引擎处理",
                "timestamp": start_time,
                "client_id": client_id,
                "node_id": unique_id,
                "execution_priority": execution_priority,
                "execution_timeout": execution_timeout
            }

            return (json.dumps(execution_status, ensure_ascii=False, indent=2),)

        except json.JSONDecodeError as e:
            error_msg = f"JSON解析失败: {str(e)}"
            logger.error(f"[GroupExecutorTrigger] ❌ {error_msg}")
            return self.create_error_status("unknown", error_msg, start_time)

        except Exception as e:
            error_msg = f"触发执行失败: {str(e)}"
            logger.error(f"[GroupExecutorTrigger] ❌ {error_msg}")
            import traceback
            logger.error(f"[GroupExecutorTrigger] 错误堆栈:\n{traceback.format_exc()}")
            return self.create_error_status("unknown", error_msg, start_time)

    def validate_execution_plan(self, execution_plan: Dict, cache_control_signal: Dict, client_id: str) -> Dict[str, Any]:
        """
        验证执行计划的有效性

        Args:
            execution_plan: 执行计划字典
            cache_control_signal: 缓存控制信号字典
            client_id: 客户端ID

        Returns:
            验证结果字典
        """
        errors = []

        # 检查必需字段
        required_fields = ["execution_id", "groups", "execution_mode", "cache_control_mode"]
        for field in required_fields:
            if field not in execution_plan:
                errors.append(f"缺少必需字段: {field}")

        # 检查客户端ID匹配
        plan_client_id = execution_plan.get("client_id", "")
        if plan_client_id != client_id:
            errors.append(f"客户端ID不匹配: 计划={plan_client_id}, 当前={client_id}")

        # 检查组配置
        groups = execution_plan.get("groups", [])
        if not isinstance(groups, list):
            errors.append("groups字段必须是数组")
        elif len(groups) == 0:
            errors.append("groups数组不能为空")

        # 检查执行模式
        execution_mode = execution_plan.get("execution_mode", "")
        if execution_mode not in ["sequential", "parallel"]:
            errors.append(f"无效的执行模式: {execution_mode}")

        # 检查缓存控制模式
        cache_control_mode = execution_plan.get("cache_control_mode", "")
        if cache_control_mode not in ["block_until_allowed", "always_allow", "conditional"]:
            errors.append(f"无效的缓存控制模式: {cache_control_mode}")

        # 检查缓存控制信号
        signal_execution_id = cache_control_signal.get("execution_id", "")
        if signal_execution_id != execution_plan.get("execution_id", ""):
            errors.append(f"执行ID不匹配: 计划={execution_plan.get('execution_id')}, 信号={signal_execution_id}")

        return {"valid": len(errors) == 0, "errors": errors}

    def check_execution_permission(self, cache_control_signal: Dict, execution_id: str) -> bool:
        """
        检查执行权限

        Args:
            cache_control_signal: 缓存控制信号
            execution_id: 执行ID

        Returns:
            是否允许执行
        """
        # 检查控制信号有效性
        if not cache_control_signal.get("valid", True):
            logger.warning(f"[GroupExecutorTrigger] ⚠️ 缓存控制信号无效: {cache_control_signal.get('error', '未知错误')}")
            return False

        # 检查执行ID匹配
        signal_execution_id = cache_control_signal.get("execution_id", "")
        if signal_execution_id != execution_id:
            logger.warning(f"[GroupExecutorTrigger] ⚠️ 执行ID不匹配: 信号={signal_execution_id}, 计划={execution_id}")
            return False

        # 检查启用状态
        if not cache_control_signal.get("enabled", False):
            logger.warning(f"[GroupExecutorTrigger] ⚠️ 缓存控制信号禁用执行")
            return False

        # 检查时间戳（避免使用过期信号）
        signal_timestamp = cache_control_signal.get("timestamp", 0)
        current_time = time.time()
        if current_time - signal_timestamp > 600:  # 10分钟超时
            logger.warning(f"[GroupExecutorTrigger] ⏰ 缓存控制信号过期: {current_time - signal_timestamp:.1f}秒")
            return False

        return True

    def create_error_status(self, execution_id: str, error_message: str, timestamp: float) -> tuple:
        """
        创建错误状态返回值

        Args:
            execution_id: 执行ID
            error_message: 错误消息
            timestamp: 时间戳

        Returns:
            包含错误状态的元组
        """
        error_status = {
            "status": "error",
            "execution_id": execution_id,
            "error": error_message,
            "timestamp": timestamp,
            "error_type": "validation_error"
        }

        return (json.dumps(error_status, ensure_ascii=False, indent=2),)

    def create_warning_status(self, execution_id: str, warning_message: str, timestamp: float) -> tuple:
        """
        创建警告状态返回值

        Args:
            execution_id: 执行ID
            warning_message: 警告消息
            timestamp: 时间戳

        Returns:
            包含警告状态的元组
        """
        warning_status = {
            "status": "warning",
            "execution_id": execution_id,
            "message": warning_message,
            "timestamp": timestamp,
            "warning_type": "permission_denied"
        }

        return (json.dumps(warning_status, ensure_ascii=False, indent=2),)

# 节点映射导出函数
def get_node_class_mappings():
    return {
        "GroupExecutorTrigger": GroupExecutorTrigger
    }

def get_node_display_name_mappings():
    return {
        "GroupExecutorTrigger": "优化组执行触发器 v2.0 (Optimized Group Executor Trigger)"
    }

# 标准导出变量
NODE_CLASS_MAPPINGS = get_node_class_mappings()
NODE_DISPLAY_NAME_MAPPINGS = get_node_display_name_mappings()

if __name__ == "__main__":
    print("[GroupExecutorTrigger] ✅ 优化组执行触发器模块测试加载完成")
    print("[GroupExecutorTrigger] 📋 节点类: GroupExecutorTrigger")
    print("[GroupExecutorTrigger] 🏷️ 显示名称: 优化组执行触发器 v2.0")
    print("[GroupExecutorTrigger] 🔧 基于ComfyUI原生机制")
    print("[GroupExecutorTrigger] ✅ 技术错误已修正")