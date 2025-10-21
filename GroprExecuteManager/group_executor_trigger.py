"""
组执行触发器节点 - Group Executor Trigger Node
接收execution_list并通过WebSocket触发前端执行
"""

import logging
import time
from server import PromptServer

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("GET")

class GroupExecutorTrigger:
    """组执行触发器节点 - 接收execution_list并触发前端执行"""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "execution_list": ("EXECUTION_LIST",),  # 接收上游的execution_list
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
                "prompt": "PROMPT"
            }
        }

    RETURN_TYPES = ()
    FUNCTION = "execute"
    CATEGORY = "Danbooru/Execution"
    OUTPUT_NODE = True  # ✅ 这是OUTPUT_NODE，用户可以手动Queue触发

    def execute(self, execution_list, unique_id, prompt=None):
        """
        触发组执行 - 发送WebSocket消息到前端

        ⚠️ 关键设计：
        1. 本节点是OUTPUT_NODE，会在ComfyUI初始队列中执行
        2. 立即发送WebSocket消息给前端（仅发送给当前client_id）
        3. 立即返回，不阻塞
        4. 前端收到消息时，初始队列已经完成，可以直接开始组执行
        """
        logger.info(f"[GET] ==================== 触发器开始执行 ====================")
        logger.info(f"[GET] 节点ID: {unique_id}")
        logger.info(f"[GET] 当前线程: {__import__('threading').current_thread().name}")

        # 从prompt中提取client_id（用于多窗口隔离）
        client_id = None
        if prompt:
            client_id = prompt.get('client_id')
            logger.info(f"[GET] 客户端ID: {client_id}")

        # 验证execution_list
        if not execution_list:
            logger.error("[GET] ✗ 错误: execution_list为空")
            return ()

        if not isinstance(execution_list, list):
            logger.error(f"[GET] ✗ 错误: execution_list不是列表类型: {type(execution_list)}")
            return ()

        logger.info(f"[GET] ===== 执行列表信息 =====")
        logger.info(f"[GET] 执行项数量: {len(execution_list)}")

        # 显示执行顺序
        execution_order = []
        for item in execution_list:
            if isinstance(item, dict):
                group_name = item.get('group_name', '')
                if group_name == '__delay__':
                    delay = item.get('delay_seconds', 0)
                    execution_order.append(f"延迟{delay}秒")
                else:
                    execution_order.append(group_name)
            else:
                execution_order.append(str(item))

        logger.info(f"[GET] 执行顺序: {' → '.join(execution_order)}")

        # 构建WebSocket消息（包含client_id用于多窗口隔离）
        message_data = {
            "node_id": unique_id,
            "execution_list": execution_list,
            "timestamp": time.time(),
            "client_id": client_id  # ✅ 关键：只有匹配的窗口才会执行
        }

        logger.info(f"[GET] ===== 发送WebSocket消息 =====")
        logger.info(f"[GET] 目标事件: danbooru_gem_trigger_execute")
        logger.info(f"[GET] 节点ID: {unique_id}")
        logger.info(f"[GET] 客户端ID: {client_id}")
        logger.info(f"[GET] 时间戳: {message_data['timestamp']}")

        try:
            # 使用send_sync确保消息立即发送，使用独特的事件名避免与其他插件冲突
            PromptServer.instance.send_sync("danbooru_gem_trigger_execute", message_data)
            logger.info(f"[GET] ✓ WebSocket消息发送成功")
            logger.info(f"[GET] 前端将异步执行组列表")
        except Exception as e:
            logger.error(f"[GET] ✗ WebSocket发送失败: {str(e)}")
            import traceback
            logger.error(f"[GET] 错误堆栈:\n{traceback.format_exc()}")
            return ()

        logger.info(f"[GET] ==================== 触发器执行完成 ====================")
        # 立即返回，不阻塞ComfyUI主线程
        # 实际的组执行由前端JavaScript异步完成
        return ()


# 节点映射
NODE_CLASS_MAPPINGS = {
    "GroupExecutorTrigger": GroupExecutorTrigger
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "GroupExecutorTrigger": "Group Executor Trigger"
}
