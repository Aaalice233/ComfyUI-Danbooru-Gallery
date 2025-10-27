"""
组静音管理器 - ComfyUI 节点
提供可视化的组 mute 控制和联动配置功能
"""


class GroupMuteManager:
    """组静音管理器节点"""

    @classmethod
    def INPUT_TYPES(cls):
        """定义输入参数类型 - 纯自定义UI版本"""
        return {
            "required": {},
            "optional": {},
            "hidden": {
                "unique_id": "UNIQUE_ID"
            }
        }

    RETURN_TYPES = ()
    RETURN_NAMES = ()
    FUNCTION = "execute"
    CATEGORY = "danbooru"
    DESCRIPTION = "组静音管理器，用于可视化管理组的 mute 状态和配置组间联动规则"
    OUTPUT_NODE = True  # 改为输出节点，防止ComfyUI触发依赖执行

    @classmethod
    def VALIDATE_INPUTS(cls, input_types):
        """跳过类型验证"""
        return True

    def execute(self, unique_id=None):
        """
        执行函数 - 虚拟节点，不实际执行任何操作

        Args:
            unique_id: 节点的唯一ID

        Returns:
            tuple: 空元组 - 无输出
        """
        # 虚拟节点，仅用于UI控制，不执行任何操作
        print(f"\n[GroupMuteManager] 节点ID: {unique_id}")
        print(f"[GroupMuteManager] 组静音管理器已加载（虚拟节点）\n")

        return ()


# 节点映射 - 用于ComfyUI注册
NODE_CLASS_MAPPINGS = {
    "GroupMuteManager": GroupMuteManager,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "GroupMuteManager": "组静音管理器 (Group Mute Manager)",
}
