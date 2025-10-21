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
    """组执行管理器节点 - 负责配置和构建execution_list"""

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

    RETURN_TYPES = ("EXECUTION_LIST",)  # 返回execution_list给下游的触发器节点
    FUNCTION = "build_execution_list"
    CATEGORY = "Danbooru/Execution"
    # ❌ 移除 OUTPUT_NODE - 本节点只负责配置，不触发执行

    def build_execution_list(self, group_config, unique_id):
        """
        构建执行列表 - 验证配置并构建execution_list

        ⚠️ 关键设计：
        1. 本节点只负责配置管理，不触发执行
        2. 验证group_config并构建validated_list
        3. 返回execution_list给下游的触发器节点
        4. 触发器节点负责发送WebSocket消息触发前端执行
        """
        logger.info(f"[GEM] ==================== 开始构建执行列表 ====================")
        logger.info(f"[GEM] 节点ID: {unique_id}")
        logger.info(f"[GEM] 当前线程: {__import__('threading').current_thread().name}")

        # 简化配置验证
        logger.info(f"[GEM] ===== 阶段1: 配置验证 =====")
        if not group_config or not group_config.strip():
            logger.error("[GEM] ✗ 错误: 组配置为空")
            return ()

        logger.info(f"[GEM] ✓ 配置非空，长度: {len(group_config)} 字符")

        try:
            logger.info(f"[GEM] 开始解析JSON配置...")
            execution_list = json.loads(group_config)
            if not isinstance(execution_list, list) or len(execution_list) == 0:
                logger.error("[GEM] ✗ 错误: 配置格式错误或为空")
                return ()

            logger.info(f"[GEM] ✓ JSON解析成功，共 {len(execution_list)} 项")

        except json.JSONDecodeError as e:
            logger.error(f"[GEM] ✗ JSON解析失败: {str(e)}")
            return ()
        
        # 简化验证逻辑，只保留必要检查
        logger.info(f"[GEM] ===== 阶段2: 验证和构建执行列表 =====")
        validated_list = []
        execution_order = []

        for i, item in enumerate(execution_list):
            logger.info(f"[GEM] 处理项 [{i+1}/{len(execution_list)}]: {item}")

            if not isinstance(item, dict):
                logger.warning(f"[GEM] ✗ 跳过无效项 [{i}]: 不是字典类型")
                continue

            group_name = item.get('group_name', '')
            if not group_name:
                logger.warning(f"[GEM] ✗ 跳过空组名项 [{i}]")
                continue

            # 处理延迟标记
            if group_name == '__delay__':
                delay_seconds = float(item.get('delay_seconds', 0))
                validated_item = {
                    'group_name': '__delay__',
                    'delay_seconds': delay_seconds
                }
                validated_list.append(validated_item)
                execution_order.append(f"延迟{delay_seconds}秒")
                logger.info(f"[GEM] ✓ [{i+1}/{len(execution_list)}] 添加延迟: {delay_seconds}秒")
            else:
                delay_seconds = max(0, float(item.get('delay_seconds', 0)))
                validated_item = {
                    'group_name': group_name.strip(),
                    'delay_seconds': delay_seconds
                }
                validated_list.append(validated_item)
                execution_order.append(group_name.strip())
                logger.info(f"[GEM] ✓ [{i+1}/{len(execution_list)}] 添加组: '{group_name}', 延迟: {delay_seconds}秒")

        if not validated_list:
            logger.error("[GEM] ✗ 错误: 验证后执行列表为空")
            return ()

        # 记录执行顺序
        logger.info(f"[GEM] ===== 阶段3: 最终执行顺序 =====")
        logger.info(f"[GEM] 执行顺序: {' → '.join(execution_order)}")
        logger.info(f"[GEM] 总共 {len(validated_list)} 个执行项")
        
        # 返回execution_list给下游的触发器节点
        logger.info(f"[GEM] ===== 阶段4: 返回execution_list =====")
        logger.info(f"[GEM] 返回给下游节点:")
        logger.info(f"[GEM]   - 类型: EXECUTION_LIST")
        logger.info(f"[GEM]   - 执行项数量: {len(validated_list)}")
        logger.info(f"[GEM]   - 数据将传递给下游的触发器节点")

        logger.info(f"[GEM] ==================== 执行列表构建完成 ====================")
        # 返回execution_list，由下游的触发器节点负责发送WebSocket消息
        return (validated_list,)


# 节点映射
NODE_CLASS_MAPPINGS = {
    "GroupExecutorManager": GroupExecutorManager
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "GroupExecutorManager": "Group Executor Manager"
}
