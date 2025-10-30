"""
简易字符串分隔节点 (Simple String Split)
基于cg-image-filter的Split String by Commas节点简化而来
按指定分隔符分割字符串并返回字符串数组
"""


class SimpleStringSplit:
    """
    简易字符串分隔节点
    按分隔符分割字符串，自动去除前后空白，返回字符串数组
    """

    RETURN_TYPES = ("STRING",)
    FUNCTION = "split_string"
    CATEGORY = "danbooru"
    OUTPUT_NODE = False
    OUTPUT_IS_LIST = (True,)

    DESCRIPTION = "按指定分隔符分割字符串，自动去除每个元素前后的空白字符，返回字符串数组。"

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "string": ("STRING", {
                    "default": "",
                    "tooltip": "要分割的字符串"
                }),
            },
            "optional": {
                "split": ([",", "|"], {
                    "tooltip": "分隔符类型"
                }),
            },
        }

    def split_string(self, string: str, split: str = ",") -> tuple[list[str]]:
        """
        分割字符串函数

        Args:
            string: 要分割的字符串
            split: 分隔符（逗号或竖线）

        Returns:
            返回分割后的字符串数组（已去除前后空白）
        """
        # 分割字符串并去除每个元素前后的空白
        result: list[str] = [r.strip() for r in string.split(split)]

        # 过滤掉空字符串（如果用户输入了连续的分隔符或首尾是分隔符）
        result = [s for s in result if s]

        return (result,)


# 节点映射函数
def get_node_class_mappings():
    """返回节点类映射"""
    return {
        "SimpleStringSplit": SimpleStringSplit
    }


def get_node_display_name_mappings():
    """返回节点显示名称映射"""
    return {
        "SimpleStringSplit": "简易字符串分隔 (Simple String Split)"
    }


# 全局映射变量
NODE_CLASS_MAPPINGS = get_node_class_mappings()
NODE_DISPLAY_NAME_MAPPINGS = get_node_display_name_mappings()
