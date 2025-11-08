# Resolution Master Simplify - 分辨率大师简化版
# 节点注册

from ..utils.logger import get_logger
logger = get_logger(__name__)

from .resolution_master_simplify import ResolutionMasterSimplify

# 节点注册
NODE_CLASS_MAPPINGS = {
    "ResolutionMasterSimplify": ResolutionMasterSimplify
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ResolutionMasterSimplify": "分辨率大师简化版 (Resolution Master Simplify)"
}

logger.info("节点已加载")

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS']
