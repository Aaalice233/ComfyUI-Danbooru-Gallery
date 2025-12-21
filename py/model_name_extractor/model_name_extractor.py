"""
模型名称提取器 (Model Name Extractor)
从 metadata_collector 获取当前工作流使用的底模名称
配合 Save Image Plus 节点使用，用于保存元数据
"""

import os
import sys

# 添加项目根目录到Python路径，以便导入自定义logger
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, '..', '..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)
from py.utils.logger import get_logger

# 设置日志
logger = get_logger(__name__)

CATEGORY_TYPE = "danbooru"


class ModelNameExtractor:
    """
    从 MODEL 对象关联的元数据中提取模型名称
    配合 metadata_collector 工作，获取当前工作流使用的底模名称
    """

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "model": ("MODEL", {
                    "tooltip": "输入模型（用于保持工作流连接性）"
                }),
            },
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("model_name",)
    OUTPUT_TOOLTIPS = (
        "模型名称（例如：myModel.safetensors），可传递给 Save Image Plus 的 checkpoint_name 输入",
    )

    FUNCTION = "extract_model_name"
    CATEGORY = CATEGORY_TYPE
    DESCRIPTION = "从工作流中提取底模名称，配合 Save Image Plus 使用保存元数据"

    def extract_model_name(self, model):
        """
        从元数据注册表中提取模型名称

        实现策略:
        1. 首先尝试从 metadata_collector 获取 checkpoint 信息
        2. 如果有多个模型，优先返回 checkpoint 类型的模型
        3. 如果无法获取，返回空字符串

        Args:
            model: MODEL 对象（直通传递）

        Returns:
            tuple: (model, model_name)
        """
        model_name = ""

        try:
            from ..metadata_collector import get_metadata
            from ..metadata_collector.constants import MODELS

            metadata = get_metadata()

            if metadata and MODELS in metadata:
                models_dict = metadata[MODELS]
                # 遍历所有模型记录，查找 checkpoint 类型
                for node_id, model_info in models_dict.items():
                    if isinstance(model_info, dict):
                        if model_info.get("type") == "checkpoint":
                            name = model_info.get("name", "")
                            if name:
                                model_name = name
                                logger.info(f"成功从元数据获取模型名称: {model_name}")
                                break

            if model_name == "":
                logger.warning("未能从元数据获取模型名称")

        except ImportError as e:
            logger.warning(f"metadata_collector 模块不可用: {e}")
        except Exception as e:
            logger.warning(f"获取模型名称失败: {e}")

        # 返回模型名称
        return (model_name,)


def get_node_class_mappings():
    """返回节点类映射"""
    return {
        "ModelNameExtractor": ModelNameExtractor
    }


def get_node_display_name_mappings():
    """返回节点显示名称映射"""
    return {
        "ModelNameExtractor": "模型名称提取器 (Model Name Extractor)"
    }


# 全局映射变量
NODE_CLASS_MAPPINGS = get_node_class_mappings()
NODE_DISPLAY_NAME_MAPPINGS = get_node_display_name_mappings()
