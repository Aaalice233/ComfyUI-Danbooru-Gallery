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

try:
    from .ImageCacheSave import NODE_CLASS_MAPPINGS as cache_save_mappings, NODE_DISPLAY_NAME_MAPPINGS as cache_save_display_mappings
except Exception as e:
    logger.error(f"导入 ImageCacheSave 节点失败: {e}")
    cache_save_mappings, cache_save_display_mappings = {}, {}

try:
    from .ImageCacheGet import NODE_CLASS_MAPPINGS as cache_get_mappings, NODE_DISPLAY_NAME_MAPPINGS as cache_get_display_mappings
except Exception as e:
    logger.error(f"导入 ImageCacheGet 节点失败: {e}")
    cache_get_mappings, cache_get_display_mappings = {}, {}

# 合并所有节点的映射
NODE_CLASS_MAPPINGS = {**danbooru_mappings, **swap_mappings, **ps_mappings, **mce_mappings, **gem_mappings, **cache_save_mappings, **cache_get_mappings}
NODE_DISPLAY_NAME_MAPPINGS = {**danbooru_display_mappings, **swap_display_mappings, **ps_display_mappings, **mce_display_mappings, **gem_display_mappings, **cache_save_display_mappings, **cache_get_display_mappings}

# 设置JavaScript文件目录
WEB_DIRECTORY = "./js"

# 注册 WebSocket 事件监听器
try:
    from server import PromptServer
    from aiohttp import web
    from .ImageCacheManager.image_cache_manager import cache_manager

    @PromptServer.instance.routes.post("/danbooru_gallery/clear_cache")
    async def clear_image_cache(request):
        """清空图像缓存的API端点"""
        try:
            logger.info("[API] 收到清空缓存请求")
            cache_manager.clear_cache()
            logger.info("[API] ✓ 缓存已清空")
            return web.json_response({"success": True, "message": "缓存已清空"})
        except Exception as e:
            logger.error(f"[API] ✗ 清空缓存失败: {e}")
            return web.json_response({"success": False, "error": str(e)}, status=500)

    @PromptServer.instance.routes.post("/danbooru_gallery/set_current_group")
    async def set_current_group(request):
        """设置当前执行组名的API端点（由组执行管理器调用）"""
        try:
            data = await request.json()
            group_name = data.get("group_name")  # 可以是字符串或None

            cache_manager.set_current_group(group_name)
            return web.json_response({"success": True, "group_name": group_name})
        except Exception as e:
            logger.error(f"[API] ✗ 设置当前组失败: {e}")
            return web.json_response({"success": False, "error": str(e)}, status=500)

    logger.info("✓ 已注册图像缓存清空 API: /danbooru_gallery/clear_cache")
    logger.info("✓ 已注册设置当前组 API: /danbooru_gallery/set_current_group")
except Exception as e:
    logger.error(f"注册缓存清空 API 失败: {e}")

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS', 'WEB_DIRECTORY']