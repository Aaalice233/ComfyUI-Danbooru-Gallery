"""
简化版组执行管理器节点 - Simplified Group Executor Manager Node
单节点管理多个组的执行顺序，简化架构，专注核心功能
"""

import json
import logging
import time
from server import PromptServer

# 设置简单日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("GEM")

class GroupExecutorManager:
    """组执行管理器节点 - 专注核心功能，简化执行逻辑"""

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

    def execute(self, group_config, unique_id):
        """执行组列表 - 简化版实现"""
        logger.info(f"[GEM] 开始执行，节点ID: {unique_id}")
        
        # 简化配置验证
        if not group_config or not group_config.strip():
            logger.error("[GEM] 错误: 组配置为空")
            return ()
        
        try:
            execution_list = json.loads(group_config)
            if not isinstance(execution_list, list) or len(execution_list) == 0:
                logger.error("[GEM] 错误: 配置格式错误或为空")
                return ()
            
            logger.info(f"[GEM] 解析成功，共 {len(execution_list)} 项")
            
        except json.JSONDecodeError as e:
            logger.error(f"[GEM] JSON解析失败: {str(e)}")
            return ()
        
        # 简化验证逻辑，只保留必要检查
        validated_list = []
        execution_order = []
        
        for i, item in enumerate(execution_list):
            if not isinstance(item, dict):
                logger.warning(f"[GEM] 跳过无效项 [{i}]: {item}")
                continue
            
            group_name = item.get('group_name', '')
            if not group_name:
                logger.warning(f"[GEM] 跳过空组名项 [{i}]")
                continue
            
            # 处理延迟标记
            if group_name == '__delay__':
                delay_seconds = float(item.get('delay_seconds', 0))
                validated_item = {
                    'group_name': '__delay__',
                    'delay_seconds': delay_seconds
                }
                validated_list.append(validated_item)
                execution_order.append(f"延迟 {delay_seconds}秒")
                logger.info(f"[GEM] [{i+1}/{len(execution_list)}] 添加延迟: {delay_seconds}秒")
            else:
                delay_seconds = max(0, float(item.get('delay_seconds', 0)))
                validated_item = {
                    'group_name': group_name.strip(),
                    'delay_seconds': delay_seconds
                }
                validated_list.append(validated_item)
                execution_order.append(group_name.strip())
                logger.info(f"[GEM] [{i+1}/{len(execution_list)}] 添加组: {group_name}, 延迟: {delay_seconds}秒")
        
        if not validated_list:
            logger.error("[GEM] 错误: 验证后执行列表为空")
            return ()
        
        # 记录执行顺序
        logger.info(f"[GEM] 执行顺序: {' → '.join(execution_order)}")
        
        # 简化WebSocket消息发送
        message_data = {
            "node_id": unique_id,
            "execution_list": validated_list,
            "timestamp": time.time()
        }
        
        try:
            PromptServer.instance.send_sync("simplified_gem_execute", message_data)
            logger.info(f"[GEM] ✓ 执行指令已发送到前端，消息ID: {unique_id}")
        except Exception as e:
            logger.error(f"[GEM] ✗ WebSocket发送失败: {str(e)}")
            return ()
        
        logger.info(f"[GEM] 执行完成，共处理 {len(validated_list)} 项")
        return ()


# 节点映射
NODE_CLASS_MAPPINGS = {
    "GroupExecutorManager": GroupExecutorManager
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "GroupExecutorManager": "Group Executor Manager"
}
