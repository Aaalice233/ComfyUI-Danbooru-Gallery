# ComfyUI Danbooru Gallery 自定义节点集合

# 导入各个模块的节点映射
from .danbooru_gallery import NODE_CLASS_MAPPINGS as danbooru_mappings, NODE_DISPLAY_NAME_MAPPINGS as danbooru_display_mappings
from .character_feature_swap import NODE_CLASS_MAPPINGS as swap_mappings, NODE_DISPLAY_NAME_MAPPINGS as swap_display_mappings
from .prompt_selector import NODE_CLASS_MAPPINGS as ps_mappings, NODE_DISPLAY_NAME_MAPPINGS as ps_display_mappings
from .multi_character_editor import NODE_CLASS_MAPPINGS as mce_mappings, NODE_DISPLAY_NAME_MAPPINGS as mce_display_mappings
from .image_cache_save import NODE_CLASS_MAPPINGS as cache_save_mappings, NODE_DISPLAY_NAME_MAPPINGS as cache_save_display_mappings
from .image_cache_get import NODE_CLASS_MAPPINGS as cache_get_mappings, NODE_DISPLAY_NAME_MAPPINGS as cache_get_display_mappings
from .global_text_cache_save import NODE_CLASS_MAPPINGS as text_cache_save_mappings, NODE_DISPLAY_NAME_MAPPINGS as text_cache_save_display_mappings
from .global_text_cache_get import NODE_CLASS_MAPPINGS as text_cache_get_mappings, NODE_DISPLAY_NAME_MAPPINGS as text_cache_get_display_mappings
from .resolution_master_simplify import NODE_CLASS_MAPPINGS as rms_mappings, NODE_DISPLAY_NAME_MAPPINGS as rms_display_mappings
from .prompt_cleaning_maid import NODE_CLASS_MAPPINGS as pcm_mappings, NODE_DISPLAY_NAME_MAPPINGS as pcm_display_mappings
from .simple_image_compare import NODE_CLASS_MAPPINGS as sic_mappings, NODE_DISPLAY_NAME_MAPPINGS as sic_display_mappings
from .simple_checkpoint_loader_with_name import NODE_CLASS_MAPPINGS as scl_mappings, NODE_DISPLAY_NAME_MAPPINGS as scl_display_mappings

# 导入优化执行系统
from .group_executor_manager import NODE_CLASS_MAPPINGS as group_manager_mappings
from .group_executor_manager import NODE_DISPLAY_NAME_MAPPINGS as group_manager_display_mappings
from .group_executor_trigger import GroupExecutorTrigger

# 导入组静音管理器
from .group_mute_manager import NODE_CLASS_MAPPINGS as group_mute_mappings
from .group_mute_manager import NODE_DISPLAY_NAME_MAPPINGS as group_mute_display_mappings

# 优化执行系统映射
opt_mappings = {
    "GroupExecutorTrigger": GroupExecutorTrigger,
    **group_manager_mappings,
    **group_mute_mappings
}
opt_display_mappings = {
    "GroupExecutorTrigger": "组执行触发器 (Group Executor Trigger)",
    **group_manager_display_mappings,
    **group_mute_display_mappings
}

# 合并所有节点映射
NODE_CLASS_MAPPINGS = {
    **danbooru_mappings,
    **swap_mappings,
    **ps_mappings,
    **mce_mappings,
    **cache_save_mappings,
    **cache_get_mappings,
    **text_cache_save_mappings,
    **text_cache_get_mappings,
    **rms_mappings,
    **pcm_mappings,
    **sic_mappings,
    **scl_mappings,
    **opt_mappings
}

NODE_DISPLAY_NAME_MAPPINGS = {
    **danbooru_display_mappings,
    **swap_display_mappings,
    **ps_display_mappings,
    **mce_display_mappings,
    **cache_save_display_mappings,
    **cache_get_display_mappings,
    **text_cache_save_display_mappings,
    **text_cache_get_display_mappings,
    **rms_display_mappings,
    **pcm_display_mappings,
    **sic_display_mappings,
    **scl_display_mappings,
    **opt_display_mappings
}

# 设置JavaScript文件目录
WEB_DIRECTORY = "./js"

# 注册 WebSocket 事件监听器
try:
    from server import PromptServer
    from aiohttp import web
    from .image_cache_manager.image_cache_manager import cache_manager
    from .text_cache_manager.text_cache_manager import text_cache_manager
    from .utils import debug_config
    import time

    @PromptServer.instance.routes.post("/danbooru_gallery/clear_cache")
    async def clear_image_cache(request):
        """清空图像缓存的API端点"""
        try:
            cache_manager.clear_cache()
            return web.json_response({"success": True, "message": "缓存已清空"})
        except Exception as e:
            return web.json_response({"success": False, "error": str(e)}, status=500)

    @PromptServer.instance.routes.post("/danbooru_gallery/set_current_group")
    async def set_current_group(request):
        """设置当前执行组名的API端点"""
        try:
            data = await request.json()
            group_name = data.get("group_name")
            cache_manager.set_current_group(group_name)
            return web.json_response({"success": True, "group_name": group_name})
        except Exception as e:
            return web.json_response({"success": False, "error": str(e)}, status=500)

    @PromptServer.instance.routes.get("/danbooru_gallery/get_debug_config")
    async def get_debug_config(request):
        """获取debug配置的API端点"""
        try:
            config = debug_config.get_all_debug_config()
            return web.json_response({"status": "success", "debug": config})
        except Exception as e:
            return web.json_response({"status": "error", "error": str(e)}, status=500)

    @PromptServer.instance.routes.post("/danbooru_gallery/update_debug_config")
    async def update_debug_config(request):
        """更新debug配置的API端点"""
        try:
            data = await request.json()
            new_config = data.get("debug", {})
            success = debug_config.save_config(new_config)
            if success:
                return web.json_response({"status": "success", "message": "配置已更新"})
            else:
                return web.json_response({"status": "error", "message": "配置更新失败"}, status=500)
        except Exception as e:
            return web.json_response({"status": "error", "error": str(e)}, status=500)

    # 文本缓存相关API路由
    @PromptServer.instance.routes.post("/danbooru/text_cache/update")
    async def update_text_cache(request):
        """实时更新文本缓存的API端点（由JavaScript调用）"""
        try:
            data = await request.json()
            text = data.get("text", "")
            channel_name = data.get("channel_name", "default")
            triggered_by = data.get("triggered_by", "")

            # 更新缓存
            metadata = {
                "triggered_by": triggered_by,
                "timestamp": time.time(),
                "auto_update": True
            }
            text_cache_manager.cache_text(text, channel_name, metadata)

            # 发送WebSocket事件通知所有客户端
            PromptServer.instance.send_sync("text-cache-channel-updated", {
                "channel": channel_name,
                "timestamp": time.time(),
                "text_length": len(text),
                "triggered_by": triggered_by
            })

            return web.json_response({
                "status": "success",
                "channel": channel_name,
                "text_length": len(text)
            })
        except Exception as e:
            return web.json_response({"status": "error", "error": str(e)}, status=500)

    @PromptServer.instance.routes.get("/danbooru/text_cache/channels")
    async def get_text_cache_channels(request):
        """获取所有文本缓存通道列表的API端点"""
        try:
            channels = text_cache_manager.get_all_channels()
            return web.json_response({
                "status": "success",
                "channels": channels,
                "count": len(channels)
            })
        except Exception as e:
            return web.json_response({"status": "error", "error": str(e)}, status=500)

except ImportError:
    # ComfyUI 环境不可用时的静默处理
    pass

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS', 'WEB_DIRECTORY']