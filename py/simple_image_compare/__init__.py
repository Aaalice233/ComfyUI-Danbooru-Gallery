# Simple Image Compare - 简易图像对比
# 节点注册

from ..utils.logger import get_logger
logger = get_logger(__name__)

from .simple_image_compare import SimpleImageCompare

# 节点注册
NODE_CLASS_MAPPINGS = {
    "SimpleImageCompare": SimpleImageCompare
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "SimpleImageCompare": "简易图像对比 (Simple Image Compare)"
}

logger.info("节点已加载")

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS']
