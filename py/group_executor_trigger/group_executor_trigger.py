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

# 导入缓存管理器
try:
    from ..image_cache_manager.image_cache_manager import cache_manager
except ImportError:
    cache_manager = None

# 导入debug配置
from ..utils.debug_config import should_debug

COMPONENT_NAME = "group_executor_trigger"

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("OptimizedGET")


# ✅ 全局执行状态追踪 - 防止重复执行同一execution_id
_execution_status_tracker = {}
_status_lock = None

try:
    import threading
    _status_lock = threading.Lock()
except:
    pass


def get_execution_status(execution_id):
    """获取execution_id的状态"""
    if _status_lock:
        with _status_lock:
            return _execution_status_tracker.get(execution_id, {})
    return _execution_status_tracker.get(execution_id, {})


class AnyType(str):
    """用于表示任意类型的特殊类，在类型比较时总是返回False（不相等）"""
    def __ne__(self, __value: object) -> bool:
        return False


any_typ = AnyType("*")


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
                "execution_data": ("STRING", {
                    "forceInput": True,
                    "tooltip": "从GroupExecutorManager接收的执行数据（包含执行计划和缓存控制信号）"
                }),
            },
            "optional": {},
            "hidden": {
                "unique_id": "UNIQUE_ID",
                "client_id": "CLIENT_ID"
            }
        }

    RETURN_TYPES = ()  # ✅ 关键修复：空返回防止ComfyUI触发依赖执行（参考LG_GroupExecutor）
    RETURN_NAMES = ()
    FUNCTION = "trigger_optimized_execution"
    CATEGORY = "danbooru"
    OUTPUT_NODE = True  # 必须为True才能让ComfyUI执行此节点
    OUTPUT_IS_LIST = ()  # 空元组

    @classmethod
    def VALIDATE_INPUTS(cls, input_types):
        """跳过wildcard类型的后端验证"""
        return True

    def trigger_optimized_execution(self,
                                execution_data: str,
                                unique_id=None,
                                client_id=None):
        """
        触发优化组执行

        Args:
            execution_data: JSON字符串格式的执行数据（包含执行计划和缓存控制信号）
            unique_id: 节点唯一ID
            client_id: WebSocket客户端ID

        Returns:
            tuple: 空元组（防止ComfyUI触发依赖执行）
        """
        try:
            if should_debug(COMPONENT_NAME):
                print(f"\n{'='*80}")
                print(f"[GroupExecutorTrigger] 🎯 trigger_optimized_execution 被调用")
                print(f"{'='*80}")

            start_time = time.time()

            # ✅ 在工作流执行前清空所有缓存
            if cache_manager is not None:
                logger.info(f"[GroupExecutorTrigger] 🗑️ 清空所有缓存（工作流执行前）")
                cache_manager.clear_cache(channel_name=None)  # None表示清空所有通道
                logger.info(f"[GroupExecutorTrigger] ✅ 缓存已清空")
            else:
                logger.warning(f"[GroupExecutorTrigger] ⚠️ 缓存管理器不可用，跳过清空缓存")

            # 📥 输入日志：显示从GroupExecutorManager接收到的内容
            if should_debug(COMPONENT_NAME):
                logger.info(f"\n{'='*80}")
                logger.info(f"[GroupExecutorTrigger] 📥 接收到来自GroupExecutorManager的数据")
                logger.info(f"[GroupExecutorTrigger] 📍 输入内容:")
                logger.info(f"   └─ execution_data (STRING):")
                logger.info(f"      {execution_data[:200]}{'...' if len(execution_data) > 200 else ''}")
                logger.info(f"{'='*80}\n")

            # 处理可选参数
            unique_id = unique_id or "unknown"

            # ✅ 修复：直接从PromptServer.instance获取真实client_id
            # 不依赖hidden参数（CLIENT_ID可能不被支持）
            # 因为execute_async已经在execution.py中设置了client_id
            real_client_id = PromptServer.instance.client_id if PromptServer else None
            if not real_client_id:
                # 如果获取失败，尝试使用传入的参数
                real_client_id = client_id or "unknown"

            # 1. 解析execution_data
            execution_data_dict = json.loads(execution_data)
            execution_plan_dict = execution_data_dict.get("execution_plan", {})
            cache_control_signal_dict = execution_data_dict.get("cache_control_signal", {})

            execution_id = execution_plan_dict.get("execution_id", "unknown")

            # ✅ 新增：检测执行计划是否被禁用
            if execution_plan_dict.get("disabled", False):
                disabled_reason = execution_plan_dict.get("disabled_reason", "unknown")
                disabled_message = execution_plan_dict.get("message", "组执行功能已禁用")
                if should_debug(COMPONENT_NAME):
                    logger.warning(f"[GroupExecutorTrigger] 🚫 执行计划已禁用")
                    logger.warning(f"[GroupExecutorTrigger] 🚫 原因: {disabled_reason}")
                    logger.warning(f"[GroupExecutorTrigger] 🚫 信息: {disabled_message}")
                    logger.warning(f"[GroupExecutorTrigger] ✅ 跳过执行，返回空元组\n")
                return ()

            # ✅ 修复：覆盖execution_plan的client_id为真实值
            execution_plan_dict["client_id"] = real_client_id

            # ✅ 新增：检查是否是重复的execution_id
            # 防止同一个execution在短时间内被多次触发
            last_status = get_execution_status(execution_id)
            if last_status:
                elapsed = time.time() - last_status.get("trigger_time", 0)
                # 如果在30秒内重复触发同一个execution_id，说明是GroupExecutorTrigger被重复执行
                # 这通常发生在GroupExecutorManager输出频繁变化时
                if elapsed < 30:
                    if should_debug(COMPONENT_NAME):
                        logger.warning(f"[GroupExecutorTrigger] ⚠️ 检测到重复的execution_id: {execution_id} (距离上次触发{elapsed:.1f}秒)")
                        logger.warning(f"[GroupExecutorTrigger] ⚠️ 已存储状态: {last_status}")
                        logger.warning(f"[GroupExecutorTrigger] ⚠️ 跳过重复执行，返回之前的状态")
                    return ()
            
            # ✅ 记录execution开始时间
            if _status_lock:
                with _status_lock:
                    _execution_status_tracker[execution_id] = {
                        "trigger_time": time.time(),
                        "client_id": real_client_id,
                        "status": "triggered",
                        "groups_count": len(execution_plan_dict.get("groups", []))
                    }
            else:
                _execution_status_tracker[execution_id] = {
                    "trigger_time": time.time(),
                    "client_id": real_client_id,
                    "status": "triggered",
                    "groups_count": len(execution_plan_dict.get("groups", []))
                }

            # 使用默认值
            force_execution = False
            pause_on_error = True
            execution_priority = "normal"
            execution_timeout = 300

            if should_debug(COMPONENT_NAME):
                logger.info(f"[GroupExecutorTrigger] ⏰ 执行时间: {time.strftime('%H:%M:%S', time.localtime())}")
                logger.info(f"[GroupExecutorTrigger] 🚀 开始执行组计划")
                logger.info(f"[GroupExecutorTrigger] 🔧 执行ID: {execution_id}")
                logger.info(f"[GroupExecutorTrigger] 🖥️  客户端ID: {real_client_id}")
                logger.info(f"[GroupExecutorTrigger] 📋 节点ID: {unique_id}")
                logger.info(f"{'='*80}\n")

            # 2. 验证执行计划
            validation_result = self.validate_execution_plan(execution_plan_dict, cache_control_signal_dict, real_client_id)
            if not validation_result["valid"]:
                error_msg = f"执行计划验证失败: {validation_result['errors']}"
                logger.error(f"[GroupExecutorTrigger] ❌ {error_msg}")
                return self.create_error_status(execution_id, error_msg, start_time)

            # 3. 检查执行权限和强制执行标志
            if not force_execution and not self.check_execution_permission(cache_control_signal_dict, execution_id):
                warning_msg = "执行权限不足，需要强制执行或等待缓存控制信号"
                logger.warning(f"[GroupExecutorTrigger] ⚠️ {warning_msg}")
                return self.create_warning_status(execution_id, warning_msg, start_time)

            # 4. 发送WebSocket消息给JavaScript引擎
            message_data = {
                "type": "danbooru_optimized_execution",
                "execution_id": execution_id,
                "execution_plan": execution_plan_dict,
                "cache_control_signal": cache_control_signal_dict,
                "trigger_config": {
                    "force_execution": force_execution,
                    "pause_on_error": pause_on_error,
                    "execution_priority": execution_priority,
                    "execution_timeout": execution_timeout
                },
                "client_id": real_client_id,
                "node_id": unique_id,
                "timestamp": start_time
            }

            if should_debug(COMPONENT_NAME):
                logger.info(f"[GroupExecutorTrigger] 📡 发送WebSocket消息:")
                logger.info(f"   - 事件类型: {message_data['type']}")
                logger.info(f"   - 执行ID: {execution_id}")
                logger.info(f"   - 组数量: {len(execution_plan_dict.get('groups', []))}")
                logger.info(f"   - 客户端ID: {real_client_id}")
                logger.info(f"   - 强制执行: {force_execution}")

            # 5. 发送消息到前端JavaScript引擎
            PromptServer.instance.send_sync("danbooru_optimized_execution", message_data, PromptServer.instance.client_id)

            if should_debug(COMPONENT_NAME):
                logger.info(f"[GroupExecutorTrigger] ✅ WebSocket消息发送成功")
                logger.info(f"[GroupExecutorTrigger] ⏳ JavaScript引擎将异步执行组列表")
                logger.info(f"[GroupExecutorTrigger] ✅ 执行触发完成，返回空元组（防止ComfyUI触发依赖执行）\n")

            # ✅ 关键修复：返回空元组，参考LG_GroupExecutor模式
            # 这样ComfyUI不会因为返回值触发依赖链执行，避免提交所有24个节点
            return ()

        except json.JSONDecodeError as e:
            error_msg = f"JSON解析失败: {str(e)}"
            logger.error(f"[GroupExecutorTrigger] ❌ {error_msg}")
            return self.create_error_status("unknown", error_msg, time.time())

        except Exception as e:
            error_msg = f"触发执行失败: {str(e)}"
            logger.error(f"[GroupExecutorTrigger] ❌ {error_msg}")
            import traceback
            logger.error(f"[GroupExecutorTrigger] 错误堆栈:\n{traceback.format_exc()}")
            return self.create_error_status("unknown", error_msg, time.time())

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

        # 📋 输出执行计划和缓存信号内容
        if should_debug(COMPONENT_NAME):
            logger.info(f"[GroupExecutorTrigger] 📋 执行计划内容:")
            logger.info(f"   - 执行ID: {execution_plan.get('execution_id')}")
            logger.info(f"   - 组数量: {len(execution_plan.get('groups', []))}")
            logger.info(f"   - 执行模式: {execution_plan.get('execution_mode')}")
            logger.info(f"   - 缓存控制模式: {execution_plan.get('cache_control_mode')}")
            logger.info(f"   - 客户端ID: {execution_plan.get('client_id')}")

            # 显示具体的组信息
            groups = execution_plan.get("groups", [])
            for i, group in enumerate(groups):
                group_name = group.get("group_name", group.get("name", f"组{i+1}"))
                group_nodes = group.get("nodes", [])
                logger.info(f"   - 组{i+1}: {group_name} (包含{len(group_nodes)}个节点)")

            logger.info(f"[GroupExecutorTrigger] 📋 缓存信号内容:")
            logger.info(f"   - 执行ID: {cache_control_signal.get('execution_id')}")
            logger.info(f"   - 缓存控制模式: {cache_control_signal.get('cache_control_mode')}")
            logger.info(f"   - 启用缓存: {cache_control_signal.get('enable_cache')}")
            logger.info(f"   - 启用执行(enabled): {cache_control_signal.get('enabled')}")
            logger.info(f"   - 时间戳: {cache_control_signal.get('timestamp')}")
            logger.info(f"   - 所有字段: {list(cache_control_signal.keys())}")

        # 检查必需字段
        required_fields = ["execution_id", "groups", "execution_mode", "cache_control_mode"]
        for field in required_fields:
            if field not in execution_plan:
                errors.append(f"缺少必需字段: {field}")

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

        # ✅ 检查execution_id匹配（确保两个信号来自同一批操作）
        signal_execution_id = cache_control_signal.get("execution_id", "")
        if signal_execution_id != execution_plan.get("execution_id", ""):
            errors.append(f"执行ID不匹配: 计划={execution_plan.get('execution_id')}, 信号={signal_execution_id}")

        # ✅ 修复：恢复client_id的严格验证
        # 因为send_sync现在使用sid参数正确地隔离，前端只会接收到正确的client_id
        plan_client_id = execution_plan.get("client_id", "")
        if plan_client_id and plan_client_id != client_id:
            errors.append(f"客户端ID不匹配: 计划={plan_client_id}, 当前={client_id}")

        if errors:
            logger.error(f"[GroupExecutorTrigger] ❌ 验证失败，共{len(errors)}个错误:")
            for error in errors:
                logger.error(f"   - {error}")

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
        if should_debug(COMPONENT_NAME):
            logger.info(f"[GroupExecutorTrigger] 🔐 开始检查执行权限...")
            logger.info(f"   - 期望执行ID: {execution_id}")
            logger.info(f"   - 缓存信号内容: {cache_control_signal}")
        
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
        enabled = cache_control_signal.get("enabled", False)
        if should_debug(COMPONENT_NAME):
            logger.info(f"   - 启用状态(enabled): {enabled}")
        if not enabled:
            logger.warning(f"[GroupExecutorTrigger] ⚠️ 缓存控制信号禁用执行")
            return False

        # 检查时间戳（避免使用过期信号）
        signal_timestamp = cache_control_signal.get("timestamp", 0)
        current_time = time.time()
        time_diff = current_time - signal_timestamp
        if should_debug(COMPONENT_NAME):
            logger.info(f"   - 信号时间戳: {signal_timestamp}")
            logger.info(f"   - 当前时间: {current_time}")
            logger.info(f"   - 时间差: {time_diff:.1f}秒")
        
        if time_diff > 600:  # 10分钟超时
            logger.warning(f"[GroupExecutorTrigger] ⏰ 缓存控制信号过期: {time_diff:.1f}秒 > 600秒")
            return False
        
        if should_debug(COMPONENT_NAME):
            logger.info(f"[GroupExecutorTrigger] ✅ 所有权限检查通过！")
        return True

    def create_error_status(self, execution_id: str, error_message: str, timestamp: float) -> tuple:
        """
        创建错误状态返回值

        Args:
            execution_id: 执行ID
            error_message: 错误消息
            timestamp: 时间戳

        Returns:
            空元组（参考LG_GroupExecutor模式）
        """
        error_status = {
            "status": "error",
            "execution_id": execution_id,
            "error": error_message,
            "timestamp": timestamp,
            "error_type": "validation_error"
        }

        logger.error(f"[GroupExecutorTrigger] ❌ 错误状态: {json.dumps(error_status, ensure_ascii=False)}")
        # ✅ 关键修复：返回空元组，防止ComfyUI触发依赖执行
        return ()

    def create_warning_status(self, execution_id: str, warning_message: str, timestamp: float):
        """
        创建警告状态返回值

        Args:
            execution_id: 执行ID
            warning_message: 警告消息
            timestamp: 时间戳

        Returns:
            空元组（参考LG_GroupExecutor模式）
        """
        warning_status = {
            "status": "warning",
            "execution_id": execution_id,
            "message": warning_message,
            "timestamp": timestamp,
            "warning_type": "permission_denied"
        }

        logger.warning(f"[GroupExecutorTrigger] ⚠️ 警告状态: {json.dumps(warning_status, ensure_ascii=False)}")
        # ✅ 关键修复：返回空元组，防止ComfyUI触发依赖执行
        return ()

# 节点映射导出函数
def get_node_class_mappings():
    return {
        "GroupExecutorTrigger": GroupExecutorTrigger
    }

def get_node_display_name_mappings():
    return {
        "GroupExecutorTrigger": "组执行触发器 (Group Executor Trigger)"
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