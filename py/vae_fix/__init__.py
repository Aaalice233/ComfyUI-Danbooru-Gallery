"""
VAE 图像批次修复模块 (VAE Image Batch Fix Module)
"""

from ..utils.logger import get_logger
logger = get_logger(__name__)

from .vae_fix import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS']

logger.info("VAE 图像批次修复节点已加载")
