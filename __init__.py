import logging

# 设置日志
logger = logging.getLogger("ComfyUI-Danbooru-Gallery")
logger.setLevel(logging.INFO)

# 从各个子模块导入节点映射
try:
    from .danbooru_gallery import NODE_CLASS_MAPPINGS as danbooru_mappings, NODE_DISPLAY_NAME_MAPPINGS as danbooru_display_mappings
except Exception as e:
    logger.error(f"导入 danbooru_gallery 节点失败: {e}")
    danbooru_mappings, danbooru_display_mappings = {}, {}

try:
    from .character_feature_swap import NODE_CLASS_MAPPINGS as swap_mappings, NODE_DISPLAY_NAME_MAPPINGS as swap_display_mappings
except Exception as e:
    logger.error(f"导入 character_feature_swap 节点失败: {e}")
    swap_mappings, swap_display_mappings = {}, {}

try:
    from .prompt_selector import NODE_CLASS_MAPPINGS as ps_mappings, NODE_DISPLAY_NAME_MAPPINGS as ps_display_mappings
except Exception as e:
    logger.error(f"导入 prompt_selector 节点失败: {e}")
    ps_mappings, ps_display_mappings = {}, {}

try:
    from .multi_character_editor import NODE_CLASS_MAPPINGS as mce_mappings, NODE_DISPLAY_NAME_MAPPINGS as mce_display_mappings
except Exception as e:
    logger.error(f"导入 multi_character_editor 节点失败: {e}")
    mce_mappings, mce_display_mappings = {}, {}

try:
    from .GroprExecuteManager import NODE_CLASS_MAPPINGS as gem_mappings, NODE_DISPLAY_NAME_MAPPINGS as gem_display_mappings
except Exception as e:
    logger.error(f"导入 GroprExecuteManager 节点失败: {e}")
    gem_mappings, gem_display_mappings = {}, {}


# 合并所有节点的映射
NODE_CLASS_MAPPINGS = {**danbooru_mappings, **swap_mappings, **ps_mappings, **mce_mappings, **gem_mappings}
NODE_DISPLAY_NAME_MAPPINGS = {**danbooru_display_mappings, **swap_display_mappings, **ps_display_mappings, **mce_display_mappings, **gem_display_mappings}

# 设置JavaScript文件目录
WEB_DIRECTORY = "./js"

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS', 'WEB_DIRECTORY']