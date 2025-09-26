from .danbooru_gallery.danbooru_gallery import NODE_CLASS_MAPPINGS as danbooru_mappings, NODE_DISPLAY_NAME_MAPPINGS as danbooru_display_mappings
from .character_feature_swap.character_feature_swap import NODE_CLASS_MAPPINGS as swap_mappings, NODE_DISPLAY_NAME_MAPPINGS as swap_display_mappings

# 合并所有节点的映射
NODE_CLASS_MAPPINGS = {**danbooru_mappings, **swap_mappings}
NODE_DISPLAY_NAME_MAPPINGS = {**danbooru_display_mappings, **swap_display_mappings}

WEB_DIRECTORY = "./js"

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS']