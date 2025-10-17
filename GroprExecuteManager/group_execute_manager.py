"""
组执行管理器节点
用一个节点管理所有组的执行
支持自定义GUI、拖拽排序、多语言
"""

from server import PromptServer


class GroupExecuteManager:
    """
    组执行管理器节点
    在一个节点中管理多个组的执行配置
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {},
            "hidden": {
                "unique_id": "UNIQUE_ID",
                "extra_pnginfo": "EXTRA_PNGINFO",
            }
        }

    RETURN_TYPES = ()
    FUNCTION = "execute"
    CATEGORY = "utils/execution"
    OUTPUT_NODE = True

    def execute(self, unique_id, extra_pnginfo=None):
        """
        执行节点
        从节点的widget中获取组列表配置,并通过WebSocket发送到前端执行
        """
        # 组列表将通过前端GUI管理,存储在节点的widgets_values中
        # 这里主要作为OUTPUT_NODE,允许用户手动触发执行

        # 前端会监听节点执行事件,并处理实际的组执行逻辑
        print("[GroupExecuteManager] Python execute() called!")
        return {}


# 节点注册映射
NODE_CLASS_MAPPINGS = {
    "GroupExecuteManager": GroupExecuteManager,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "GroupExecuteManager": "Group Execute Manager",
}
