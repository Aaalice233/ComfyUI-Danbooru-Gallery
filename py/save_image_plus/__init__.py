"""
保存图像增强版节点模块 (Save Image Plus Module)
支持直接传入提示词和 LoRA 语法的图像保存节点
可选依赖 LoRA Manager 插件
"""

from ..utils.logger import get_logger
logger = get_logger(__name__)

from .save_image_plus import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS']

logger.info("保存图像增强版节点已加载")
