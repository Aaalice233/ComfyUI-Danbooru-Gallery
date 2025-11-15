"""
简易值切换节点 (Simple Value Switch)
输出第一个非空值，支持动态数量的任意类型输入
"""

from ..utils import any_type, is_empty


class SimpleValueSwitch:
    """
    简易值切换节点

    接受任意数量、任意类型的输入，输出第一个非空（non-empty）的值
    这个节点可以用于值的优先级选择、默认值回退等场景

    特点：
    - 支持任意类型的输入和输出（图像、文本、模型等所有 ComfyUI 类型）
    - 支持动态数量的输入（通过前端 JavaScript 实现渐进式输入）
    - 智能空值判断（不仅判断 None，还能识别空字典、空 Context 等）
    """

    RETURN_TYPES = (any_type,)
    RETURN_NAMES = ("output",)
    FUNCTION = "switch"
    CATEGORY = "danbooru"
    OUTPUT_NODE = False

    DESCRIPTION = "输出第一个非空值，支持任意类型和动态数量的输入。遍历所有输入，返回第一个非 None 且非空的值。"

    @classmethod
    def INPUT_TYPES(cls):
        """
        定义输入类型

        前端 JavaScript 会动态管理输入引脚：
        - 初始显示一个输入引脚
        - 连接后自动显示下一个输入引脚
        - 所有输入都是可选的
        - 输入参数名以 value_ 开头（如 value_1, value_2, ...）

        Returns:
            包含输入定义的字典
        """
        return {
            "required": {},
            "optional": {},
        }

    def switch(self, **kwargs):
        """
        值切换函数

        遍历所有传入的参数，返回第一个非空的值
        参数通过 **kwargs 接收，支持任意数量的输入

        Args:
            **kwargs: 所有输入参数（参数名以 value_ 开头）

        Returns:
            包含第一个非空值的元组，如果所有值都为空则返回 (None,)

        示例:
            - 输入: value_1=None, value_2="hello", value_3=42
            - 输出: ("hello",)

            - 输入: value_1=None, value_2={}, value_3="world"
            - 输出: ("world",)  # 空字典被视为空值
        """
        # 遍历所有输入参数
        for key, value in kwargs.items():
            # 只处理以 value_ 开头的参数（这是我们的输入命名约定）
            if key.startswith('value_'):
                # 使用增强的 is_empty 函数判断值是否为空
                if not is_empty(value):
                    # 找到第一个非空值，立即返回
                    return (value,)

        # 所有值都为空，返回 None
        return (None,)


# 节点映射函数
def get_node_class_mappings():
    """返回节点类映射"""
    return {
        "SimpleValueSwitch": SimpleValueSwitch
    }


def get_node_display_name_mappings():
    """返回节点显示名称映射"""
    return {
        "SimpleValueSwitch": "简易值切换 (Simple Value Switch)"
    }


# 全局映射变量
NODE_CLASS_MAPPINGS = get_node_class_mappings()
NODE_DISPLAY_NAME_MAPPINGS = get_node_display_name_mappings()
