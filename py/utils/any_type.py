"""
任意类型工具类 (Any Type Utilities)
提供动态输入和任意类型支持的工具类
"""


class AnyType(str):
    """
    特殊的类型类，在 ComfyUI 类型检查时总是匹配

    这个类继承自 str，但重写了 __ne__ 方法，使其在类型比较时总是返回 False（即总是相等）
    这样就可以让 ComfyUI 接受任意类型的输入
    """

    def __ne__(self, __value: object) -> bool:
        """重写不等于运算符，始终返回 False（即总是相等）"""
        return False


class FlexibleOptionalInputType(dict):
    """
    支持动态数量输入的特殊字典类

    这个类允许节点接受任意数量的可选输入参数
    通过重写 __getitem__ 和 __contains__ 方法，使得任何键都被视为有效的输入参数

    Args:
        type_name: 输入参数的类型（如 any_type 或其他 ComfyUI 类型）
        data: 可选的初始数据字典
    """

    def __init__(self, type_name, data=None):
        """
        初始化 FlexibleOptionalInputType

        Args:
            type_name: 接受的输入类型
            data: 可选的初始数据
        """
        super().__init__(data or {})
        self.type = type_name

    def __getitem__(self, key):
        """
        获取键对应的类型
        无论键是什么，都返回指定的类型

        Args:
            key: 任意键名

        Returns:
            包含类型的元组 (type,)
        """
        return (self.type,)

    def __contains__(self, key):
        """
        检查键是否存在
        始终返回 True，表示接受任何键

        Args:
            key: 任意键名

        Returns:
            始终返回 True
        """
        return True


def is_empty(value):
    """
    增强的空值判断函数

    不仅检查 None，还检查空字典和空 Context 对象
    这样可以更智能地判断一个值是否真正"为空"

    Args:
        value: 要检查的值

    Returns:
        bool: 如果值为空则返回 True，否则返回 False
    """
    # 首先检查是否为 None
    if value is None:
        return True

    # 检查是否为空字典
    if isinstance(value, dict):
        # 如果是空字典，认为是空
        if len(value) == 0:
            return True

        # 如果是字典但所有值都是 None（常见于 Context 对象），也认为是空
        if all(v is None for v in value.values()):
            return True

    # 其他情况认为不为空
    return False


# 创建全局的 any_type 实例供其他模块使用
any_type = AnyType("*")


# 导出公共接口
__all__ = [
    'AnyType',
    'FlexibleOptionalInputType',
    'is_empty',
    'any_type',
]
