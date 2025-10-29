# ComfyUI Danbooru Gallery 自定义节点集合

# 导入各个模块的节点映射
from .py.danbooru_gallery import NODE_CLASS_MAPPINGS as danbooru_mappings, NODE_DISPLAY_NAME_MAPPINGS as danbooru_display_mappings
from .py.character_feature_swap import NODE_CLASS_MAPPINGS as swap_mappings, NODE_DISPLAY_NAME_MAPPINGS as swap_display_mappings
from .py.prompt_selector import NODE_CLASS_MAPPINGS as ps_mappings, NODE_DISPLAY_NAME_MAPPINGS as ps_display_mappings
from .py.multi_character_editor import NODE_CLASS_MAPPINGS as mce_mappings, NODE_DISPLAY_NAME_MAPPINGS as mce_display_mappings
from .py.image_cache_save import NODE_CLASS_MAPPINGS as cache_save_mappings, NODE_DISPLAY_NAME_MAPPINGS as cache_save_display_mappings
from .py.image_cache_get import NODE_CLASS_MAPPINGS as cache_get_mappings, NODE_DISPLAY_NAME_MAPPINGS as cache_get_display_mappings
from .py.global_text_cache_save import NODE_CLASS_MAPPINGS as text_cache_save_mappings, NODE_DISPLAY_NAME_MAPPINGS as text_cache_save_display_mappings
from .py.global_text_cache_get import NODE_CLASS_MAPPINGS as text_cache_get_mappings, NODE_DISPLAY_NAME_MAPPINGS as text_cache_get_display_mappings
from .py.resolution_master_simplify import NODE_CLASS_MAPPINGS as rms_mappings, NODE_DISPLAY_NAME_MAPPINGS as rms_display_mappings
from .py.prompt_cleaning_maid import NODE_CLASS_MAPPINGS as pcm_mappings, NODE_DISPLAY_NAME_MAPPINGS as pcm_display_mappings
from .py.simple_image_compare import NODE_CLASS_MAPPINGS as sic_mappings, NODE_DISPLAY_NAME_MAPPINGS as sic_display_mappings
from .py.simple_checkpoint_loader_with_name import NODE_CLASS_MAPPINGS as scl_mappings, NODE_DISPLAY_NAME_MAPPINGS as scl_display_mappings
from .py.simple_notify import NODE_CLASS_MAPPINGS as sn_mappings, NODE_DISPLAY_NAME_MAPPINGS as sn_display_mappings
from .py.parameter_control_panel import NODE_CLASS_MAPPINGS as pcp_mappings, NODE_DISPLAY_NAME_MAPPINGS as pcp_display_mappings
from .py.parameter_break import NODE_CLASS_MAPPINGS as pb_mappings, NODE_DISPLAY_NAME_MAPPINGS as pb_display_mappings

# 导入优化执行系统
from .py.group_executor_manager import NODE_CLASS_MAPPINGS as group_manager_mappings
from .py.group_executor_manager import NODE_DISPLAY_NAME_MAPPINGS as group_manager_display_mappings
from .py.group_executor_trigger import GroupExecutorTrigger

# 导入组静音管理器
from .py.group_mute_manager import NODE_CLASS_MAPPINGS as group_mute_mappings
from .py.group_mute_manager import NODE_DISPLAY_NAME_MAPPINGS as group_mute_display_mappings

# 导入工作流说明节点
from .py.workflow_description import NODE_CLASS_MAPPINGS as workflow_description_mappings
from .py.workflow_description import NODE_DISPLAY_NAME_MAPPINGS as workflow_description_display_mappings

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
    **sn_mappings,
    **pcp_mappings,
    **pb_mappings,
    **opt_mappings,
    **workflow_description_mappings
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
    **sn_display_mappings,
    **pcp_display_mappings,
    **pb_display_mappings,
    **opt_display_mappings,
    **workflow_description_display_mappings
}

# 设置JavaScript文件目录
WEB_DIRECTORY = "./js"

# 注册 WebSocket 事件监听器
try:
    from server import PromptServer
    from aiohttp import web
    from .py.image_cache_manager.image_cache_manager import cache_manager
    from .py.text_cache_manager.text_cache_manager import text_cache_manager
    from .py.utils import debug_config
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

            # 确保text是字符串
            if not isinstance(text, str):
                text = str(text)

            # 限制triggered_by长度，防止过大日志
            if len(triggered_by) > 200:
                triggered_by = triggered_by[:200] + "..."

            # ✅ 内容变化检测：获取旧内容进行比较
            old_text = ""
            if text_cache_manager.channel_exists(channel_name):
                old_text = text_cache_manager.get_cached_text(channel_name)

            content_changed = (old_text != text)

            # 只有内容变化时才更新缓存
            if content_changed:
                # 更新缓存（使用skip_websocket=True，由API端点统一发送WebSocket）
                metadata = {
                    "triggered_by": triggered_by,
                    "timestamp": time.time(),
                    "auto_update": True
                }
                text_cache_manager.cache_text(text, channel_name, metadata, skip_websocket=True)

                # 统一在API端点发送WebSocket事件（错误不应阻塞响应）
                try:
                    PromptServer.instance.send_sync("text-cache-channel-updated", {
                        "channel": channel_name,
                        "timestamp": time.time(),
                        "text_length": len(text),
                        "triggered_by": triggered_by[:50] if triggered_by else ""  # 限制长度
                    })
                except Exception as ws_error:
                    print(f"[TextCache] WebSocket发送失败: {ws_error}")
                    # 不阻塞API响应
            else:
                print(f"[TextCache] ⏭️ 内容未变化，跳过缓存更新: 通道={channel_name}, 长度={len(text)}")

            return web.json_response({
                "status": "success",
                "channel": channel_name,
                "text_length": len(text),
                "content_changed": content_changed  # ✅ 返回内容是否变化的标志
            })
        except Exception as e:
            import traceback
            print(f"[TextCache] API异常: {e}")
            print(traceback.format_exc())
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

    @PromptServer.instance.routes.post("/danbooru/text_cache/ensure_channel")
    async def ensure_text_cache_channel(request):
        """确保文本缓存通道存在的API端点（用于前端预注册通道）"""
        try:
            data = await request.json()
            channel_name = data.get("channel_name", "default")

            # 调用TextCacheManager的ensure_channel_exists方法
            success = text_cache_manager.ensure_channel_exists(channel_name)

            if success:
                # 发送WebSocket事件通知所有客户端通道列表已更新
                PromptServer.instance.send_sync("text-cache-channel-updated", {
                    "channel": channel_name,
                    "timestamp": time.time(),
                    "text_length": 0,
                    "triggered_by": "ensure_channel"
                })

                return web.json_response({
                    "status": "success",
                    "channel": channel_name,
                    "message": "通道已确保存在"
                })
            else:
                return web.json_response({
                    "status": "error",
                    "error": "创建通道失败"
                }, status=500)
        except Exception as e:
            return web.json_response({"status": "error", "error": str(e)}, status=500)

    @PromptServer.instance.routes.post("/danbooru/text_cache/rename_channel")
    async def rename_text_cache_channel(request):
        """重命名文本缓存通道的API端点"""
        try:
            data = await request.json()
            old_name = data.get("old_name", "")
            new_name = data.get("new_name", "")

            if not old_name or not new_name:
                return web.json_response({
                    "status": "error",
                    "error": "缺少old_name或new_name参数"
                }, status=400)

            # 调用TextCacheManager的rename_channel方法
            success = text_cache_manager.rename_channel(old_name, new_name)

            if success:
                # 发送WebSocket事件通知所有客户端通道已重命名
                PromptServer.instance.send_sync("text-cache-channel-renamed", {
                    "old_name": old_name,
                    "new_name": new_name,
                    "timestamp": time.time()
                })

                return web.json_response({
                    "status": "success",
                    "old_name": old_name,
                    "new_name": new_name,
                    "message": f"通道已重命名: '{old_name}' -> '{new_name}'"
                })
            else:
                return web.json_response({
                    "status": "error",
                    "error": f"重命名通道失败: '{old_name}' -> '{new_name}'"
                }, status=500)
        except Exception as e:
            return web.json_response({"status": "error", "error": str(e)}, status=500)

    # 图像缓存相关API路由
    @PromptServer.instance.routes.get("/danbooru/image_cache/channels")
    async def get_image_cache_channels(request):
        """获取所有图像缓存通道列表的API端点"""
        try:
            channels = cache_manager.get_all_channels()
            return web.json_response({
                "status": "success",
                "channels": channels,
                "count": len(channels)
            })
        except Exception as e:
            return web.json_response({"status": "error", "error": str(e)}, status=500)

    @PromptServer.instance.routes.post("/danbooru/image_cache/ensure_channel")
    async def ensure_image_cache_channel(request):
        """确保图像缓存通道存在的API端点（用于前端预注册通道）"""
        try:
            data = await request.json()
            channel_name = data.get("channel_name", "default")

            # 调用ImageCacheManager的ensure_channel_exists方法
            success = cache_manager.ensure_channel_exists(channel_name)

            if success:
                # 发送WebSocket事件通知所有客户端通道列表已更新
                PromptServer.instance.send_sync("image-cache-channel-updated", {
                    "channel": channel_name,
                    "timestamp": time.time(),
                    "image_count": 0,
                    "triggered_by": "ensure_channel"
                })

                return web.json_response({
                    "status": "success",
                    "channel": channel_name,
                    "message": "通道已确保存在"
                })
            else:
                return web.json_response({
                    "status": "error",
                    "error": "创建通道失败"
                }, status=500)
        except Exception as e:
            return web.json_response({"status": "error", "error": str(e)}, status=500)

    @PromptServer.instance.routes.post("/danbooru/image_cache/rename_channel")
    async def rename_image_cache_channel(request):
        """重命名图像缓存通道的API端点"""
        try:
            data = await request.json()
            old_name = data.get("old_name", "")
            new_name = data.get("new_name", "")

            if not old_name or not new_name:
                return web.json_response({
                    "status": "error",
                    "error": "缺少old_name或new_name参数"
                }, status=400)

            # 调用ImageCacheManager的rename_channel方法
            success = cache_manager.rename_channel(old_name, new_name)

            if success:
                # 发送WebSocket事件通知所有客户端通道已重命名
                PromptServer.instance.send_sync("image-cache-channel-renamed", {
                    "old_name": old_name,
                    "new_name": new_name,
                    "timestamp": time.time()
                })

                return web.json_response({
                    "status": "success",
                    "old_name": old_name,
                    "new_name": new_name,
                    "message": f"通道已重命名: '{old_name}' -> '{new_name}'"
                })
            else:
                return web.json_response({
                    "status": "error",
                    "error": f"重命名通道失败: '{old_name}' -> '{new_name}'"
                }, status=500)
        except Exception as e:
            return web.json_response({"status": "error", "error": str(e)}, status=500)

    # 工作流说明节点相关API路由
    import os
    import json

    # 设置文件路径
    WORKFLOW_DESCRIPTION_SETTINGS_FILE = os.path.join(
        os.path.dirname(__file__),
        "py",
        "workflow_description",
        "settings.json"
    )

    def load_workflow_description_settings():
        """加载工作流说明节点的设置文件"""
        try:
            if os.path.exists(WORKFLOW_DESCRIPTION_SETTINGS_FILE):
                with open(WORKFLOW_DESCRIPTION_SETTINGS_FILE, 'r', encoding='utf-8') as f:
                    return json.load(f)
            return {"opened_versions": {}}
        except Exception as e:
            print(f"[WorkflowDescription] 加载设置失败: {e}")
            return {"opened_versions": {}}

    def save_workflow_description_settings(settings):
        """保存工作流说明节点的设置文件"""
        try:
            os.makedirs(os.path.dirname(WORKFLOW_DESCRIPTION_SETTINGS_FILE), exist_ok=True)
            with open(WORKFLOW_DESCRIPTION_SETTINGS_FILE, 'w', encoding='utf-8') as f:
                json.dump(settings, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            print(f"[WorkflowDescription] 保存设置失败: {e}")
            return False

    @PromptServer.instance.routes.get("/workflow_description/get_settings")
    async def get_workflow_description_settings(request):
        """获取工作流说明节点的设置（已打开的版本记录）"""
        try:
            settings = load_workflow_description_settings()
            return web.json_response({
                "success": True,
                "opened_versions": settings.get("opened_versions", {})
            })
        except Exception as e:
            return web.json_response({
                "success": False,
                "error": str(e)
            }, status=500)

    @PromptServer.instance.routes.post("/workflow_description/save_settings")
    async def save_workflow_description_version(request):
        """保存已打开的版本到设置文件"""
        try:
            data = await request.json()
            node_id = data.get("node_id", "")
            version = data.get("version", "")

            if not node_id or not version:
                return web.json_response({
                    "success": False,
                    "error": "缺少node_id或version参数"
                }, status=400)

            # 加载现有设置
            settings = load_workflow_description_settings()
            opened_versions = settings.get("opened_versions", {})

            # 更新版本记录
            opened_versions[str(node_id)] = version
            settings["opened_versions"] = opened_versions

            # 保存设置
            success = save_workflow_description_settings(settings)

            if success:
                return web.json_response({
                    "success": True,
                    "node_id": node_id,
                    "version": version,
                    "message": "版本已记录"
                })
            else:
                return web.json_response({
                    "success": False,
                    "error": "保存设置失败"
                }, status=500)

        except Exception as e:
            return web.json_response({
                "success": False,
                "error": str(e)
            }, status=500)

except ImportError:
    # ComfyUI 环境不可用时的静默处理
    pass

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS', 'WEB_DIRECTORY']