import logging

# 设置日志
logger = logging.getLogger("ComfyUI-Danbooru-Gallery")
logger.setLevel(logging.INFO)

try:
    from .danbooru_gallery.danbooru_gallery import NODE_CLASS_MAPPINGS as danbooru_mappings, NODE_DISPLAY_NAME_MAPPINGS as danbooru_display_mappings
    logger.info("成功导入 danbooru_gallery 节点")
except Exception as e:
    logger.error(f"导入 danbooru_gallery 节点失败: {e}")
    danbooru_mappings, danbooru_display_mappings = {}, {}

try:
    from .character_feature_swap.character_feature_swap import NODE_CLASS_MAPPINGS as swap_mappings, NODE_DISPLAY_NAME_MAPPINGS as swap_display_mappings
    logger.info("成功导入 character_feature_swap 节点")
except Exception as e:
    logger.error(f"导入 character_feature_swap 节点失败: {e}")
    swap_mappings, swap_display_mappings = {}, {}

try:
    from .prompt_selector import NODE_CLASS_MAPPINGS as ps_mappings, NODE_DISPLAY_NAME_MAPPINGS as ps_display_mappings
    logger.info("成功导入 prompt_selector 节点")
except Exception as e:
    logger.error(f"导入 prompt_selector 节点失败: {e}")
    ps_mappings, ps_display_mappings = {}, {}

try:
    from .multi_character_editor.multi_character_editor import NODE_CLASS_MAPPINGS as mce_mappings, NODE_DISPLAY_NAME_MAPPINGS as mce_display_mappings
    logger.info("成功导入 multi_character_editor 节点")
    logger.info(f"MultiCharacterEditor 节点映射: {mce_mappings}")
    logger.info(f"MultiCharacterEditor 显示名称映射: {mce_display_mappings}")
except Exception as e:
    logger.error(f"导入 multi_character_editor 节点失败: {e}")
    mce_mappings, mce_display_mappings = {}, {}

# 合并所有节点的映射
NODE_CLASS_MAPPINGS = {**danbooru_mappings, **swap_mappings, **ps_mappings, **mce_mappings}
NODE_DISPLAY_NAME_MAPPINGS = {**danbooru_display_mappings, **swap_display_mappings, **ps_display_mappings, **mce_display_mappings}

logger.info(f"最终节点映射: {NODE_CLASS_MAPPINGS}")
logger.info(f"最终显示名称映射: {NODE_DISPLAY_NAME_MAPPINGS}")

WEB_DIRECTORY = "./js"

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS']