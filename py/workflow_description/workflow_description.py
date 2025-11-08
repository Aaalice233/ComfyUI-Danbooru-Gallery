"""
工作流说明 - ComfyUI 节点
提供Markdown渲染、基于版本号的首次打开提示弹窗等功能
"""

from ..utils.logger import get_logger

# 初始化logger
logger = get_logger(__name__)


class WorkflowDescription:
    """工作流说明节点"""

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
    DESCRIPTION = "工作流说明节点，支持Markdown渲染、基于版本号的首次打开提示等功能"
    OUTPUT_NODE = True  # 标记为输出节点，确保数据持久化

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
        logger.debug(f"\n节点ID: {unique_id}")
        logger.debug(f"工作流说明节点已加载（虚拟节点）\n")

        # 节点数据会通过 onSerialize/onConfigure 保存到工作流
        # 这里只需要简单的日志输出

        return ()


# 节点映射函数
def get_node_class_mappings():
    """返回节点类映射"""
    return {
        "WorkflowDescription": WorkflowDescription
    }


def get_node_display_name_mappings():
    """返回节点显示名称映射"""
    return {
        "WorkflowDescription": "工作流说明 (Workflow Description)"
    }


# 全局映射变量
NODE_CLASS_MAPPINGS = get_node_class_mappings()
NODE_DISPLAY_NAME_MAPPINGS = get_node_display_name_mappings()
