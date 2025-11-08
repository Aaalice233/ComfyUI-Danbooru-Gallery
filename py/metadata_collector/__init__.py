import os
from ..utils.logger import get_logger

# 初始化logger
logger = get_logger(__name__)

# Check if running in standalone mode
standalone_mode = os.environ.get("LORA_MANAGER_STANDALONE", "0") == "1" or os.environ.get("HF_HUB_DISABLE_TELEMETRY", "0") == "0"

if not standalone_mode:
    from .metadata_hook import MetadataHook
    from .metadata_registry import MetadataRegistry
    from ..utils.config import is_sampler_node

    def init():
        # Install hooks to collect metadata during execution
        MetadataHook.install()

        # Initialize registry
        registry = MetadataRegistry()

        logger.info("ComfyUI Metadata Collector initialized")

    def get_metadata(prompt_id=None):
        """Helper function to get metadata from the registry"""
        registry = MetadataRegistry()
        return registry.get_metadata(prompt_id)

    # 导出 MetadataHook 以便 py/__init__.py 可以导入
    __all__ = ['MetadataHook', 'MetadataRegistry', 'init', 'get_metadata', 'is_sampler_node']
else:
    # Standalone mode - provide dummy implementations
    class MetadataHook:
        """Dummy MetadataHook for standalone mode"""
        @staticmethod
        def install():
            pass

    def init():
        logger.info("ComfyUI Metadata Collector disabled in standalone mode")

    def get_metadata(prompt_id=None):
        """Dummy implementation for standalone mode"""
        return {}

    def is_sampler_node(class_type):
        """Dummy implementation for standalone mode"""
        return False

    __all__ = ['MetadataHook', 'init', 'get_metadata', 'is_sampler_node']
