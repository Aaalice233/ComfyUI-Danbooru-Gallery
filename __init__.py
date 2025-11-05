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
from .py.simple_load_image import NODE_CLASS_MAPPINGS as sli_mappings, NODE_DISPLAY_NAME_MAPPINGS as sli_display_mappings
from .py.simple_string_split import NODE_CLASS_MAPPINGS as sss_mappings, NODE_DISPLAY_NAME_MAPPINGS as sss_display_mappings
from .py.save_image_plus import NODE_CLASS_MAPPINGS as sip_mappings, NODE_DISPLAY_NAME_MAPPINGS as sip_display_mappings

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

# 导入文本缓存查看器节点
from .py.text_cache_viewer import NODE_CLASS_MAPPINGS as text_cache_viewer_mappings
from .py.text_cache_viewer import NODE_DISPLAY_NAME_MAPPINGS as text_cache_viewer_display_mappings

# 导入Open In Krita节点
from .py.open_in_krita import NODE_CLASS_MAPPINGS as open_in_krita_mappings
from .py.open_in_krita import NODE_DISPLAY_NAME_MAPPINGS as open_in_krita_display_mappings

# 导入下一执行组是否有效节点
from .py.has_next_executor_group import NODE_CLASS_MAPPINGS as has_next_executor_group_mappings
from .py.has_next_executor_group import NODE_DISPLAY_NAME_MAPPINGS as has_next_executor_group_display_mappings

# 导入快速组导航器（纯JavaScript扩展）
from .py.quick_group_navigation import NODE_CLASS_MAPPINGS as quick_group_navigation_mappings
from .py.quick_group_navigation import NODE_DISPLAY_NAME_MAPPINGS as quick_group_navigation_display_mappings

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
    **sli_mappings,
    **sss_mappings,
    **sip_mappings,
    **opt_mappings,
    **workflow_description_mappings,
    **text_cache_viewer_mappings,
    **open_in_krita_mappings,
    **has_next_executor_group_mappings,
    **quick_group_navigation_mappings
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
    **sli_display_mappings,
    **sss_display_mappings,
    **sip_display_mappings,
    **opt_display_mappings,
    **workflow_description_display_mappings,
    **text_cache_viewer_display_mappings,
    **open_in_krita_display_mappings,
    **has_next_executor_group_display_mappings,
    **quick_group_navigation_display_mappings
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

    # 导入 tag sync API 以注册API端点（可选功能）
    try:
        from .py.shared.sync import tag_sync_api
        print("[DanbooruGallery] ✓ Tag sync API 已加载")
    except (ImportError, ModuleNotFoundError):
        # Tag sync API 依赖 cache 模块，如果 cache 不可用则此功能不可用
        # 这不影响其他核心功能（如 SaveImagePlus）
        tag_sync_api = None

    # 导入并注册 checkpoint 预览图 API
    try:
        from .py.simple_checkpoint_loader_with_name import register_preview_api
        register_preview_api(PromptServer.instance.routes)
        print("[DanbooruGallery] ✓ Checkpoint预览图API已注册")
    except Exception as e:
        print(f"[DanbooruGallery] Warning: Checkpoint预览图API注册失败: {e}")

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

    @PromptServer.instance.routes.get("/danbooru/text_cache/get_all_details")
    async def get_all_text_cache_details(request):
        """获取所有文本缓存通道的详细信息（包括内容、长度、时间戳等）"""
        try:
            all_channels = text_cache_manager.get_all_channels()
            channel_details = []

            current_time = time.time()

            for channel_name in all_channels:
                if text_cache_manager.channel_exists(channel_name):
                    # 获取通道数据
                    channel_info = text_cache_manager.get_cache_channel(channel_name)
                    text = channel_info.get("text", "")
                    timestamp = channel_info.get("timestamp", 0)

                    # 计算更新时间差
                    time_diff = current_time - timestamp
                    if time_diff < 60:
                        time_str = "刚刚"
                    elif time_diff < 3600:
                        time_str = f"{int(time_diff / 60)}分钟前"
                    elif time_diff < 86400:
                        time_str = f"{int(time_diff / 3600)}小时前"
                    else:
                        time_str = f"{int(time_diff / 86400)}天前"

                    # 内容预览（完整内容，由CSS控制显示行数）
                    preview = text

                    channel_details.append({
                        "name": channel_name,
                        "length": len(text),
                        "time": time_str,
                        "preview": preview,
                        "timestamp": timestamp
                    })

            # 按时间戳排序（最新的在前）
            channel_details.sort(key=lambda x: x.get("timestamp", 0), reverse=True)

            return web.json_response({
                "status": "success",
                "channels": channel_details,
                "count": len(channel_details)
            })
        except Exception as e:
            import traceback
            print(f"[TextCache] 获取所有通道详情失败: {e}")
            print(traceback.format_exc())
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

    # Open In Krita 相关API路由
    import base64
    from .py.open_in_krita.open_in_krita import OpenInKrita
    from .py.open_in_krita.krita_manager import get_manager as get_krita_manager
    from .py.open_in_krita.plugin_installer import KritaPluginInstaller

    # 在启动时自动检查并安装Krita插件
    try:
        installer = KritaPluginInstaller()
        if not installer.check_plugin_installed():
            print("[OpenInKrita] 检测到Krita插件未安装，正在自动安装...")
            installer.install_plugin()
            print("[OpenInKrita] Krita插件安装完成")
        else:
            print("[OpenInKrita] Krita插件已安装")
    except Exception as e:
        print(f"[OpenInKrita] 插件安装检查失败: {e}")

    @PromptServer.instance.routes.post("/open_in_krita/get_data")
    async def get_data_from_krita(request):
        """从Krita获取编辑后的数据（前端按钮调用，触发节点重新执行）"""
        try:
            data = await request.json()
            node_id = data.get("node_id", "")

            if not node_id:
                return web.json_response({
                    "status": "error",
                    "message": "缺少node_id参数"
                }, status=400)

            # 检查是否有待处理的数据
            pending_data = OpenInKrita.get_pending_data(node_id)

            if pending_data:
                return web.json_response({
                    "status": "success",
                    "message": "已获取Krita数据，请等待节点执行"
                })
            else:
                return web.json_response({
                    "status": "no_data",
                    "message": "暂无Krita数据，请先在Krita中使用: Tools → Scripts → Send to ComfyUI"
                })

        except Exception as e:
            import traceback
            print(f"[OpenInKrita] 获取数据失败: {e}")
            print(traceback.format_exc())
            return web.json_response({
                "status": "error",
                "message": str(e)
            }, status=500)

    @PromptServer.instance.routes.post("/open_in_krita/receive_data")
    async def receive_data_from_krita(request):
        """接收来自Krita插件的数据（由Krita插件调用）"""
        try:
            data = await request.json()
            node_id = data.get("node_id", "")
            image_base64 = data.get("image", "")
            mask_base64 = data.get("mask", "")

            if not node_id:
                return web.json_response({
                    "status": "error",
                    "message": "缺少node_id参数"
                }, status=400)

            # 解码图像数据
            if image_base64:
                image_bytes = base64.b64decode(image_base64)
                image_tensor = OpenInKrita.load_image_from_bytes(image_bytes)
            else:
                return web.json_response({
                    "status": "error",
                    "message": "缺少图像数据"
                }, status=400)

            # 解码蒙版数据（可选）
            if mask_base64:
                mask_bytes = base64.b64decode(mask_base64)
                mask_tensor = OpenInKrita.load_mask_from_bytes(mask_bytes)
            else:
                # 创建空蒙版
                import torch
                mask_tensor = torch.zeros((image_tensor.shape[1], image_tensor.shape[2]))

            # 存储待处理数据
            OpenInKrita.set_pending_data(node_id, image_tensor, mask_tensor)

            print(f"[OpenInKrita] 接收到Krita数据: node_id={node_id}, image_shape={image_tensor.shape}, mask_shape={mask_tensor.shape}")

            return web.json_response({
                "status": "success",
                "message": "数据已接收，请在ComfyUI中点击'从Krita获取数据'按钮"
            })

        except Exception as e:
            import traceback
            print(f"[OpenInKrita] 接收数据失败: {e}")
            print(traceback.format_exc())
            return web.json_response({
                "status": "error",
                "message": str(e)
            }, status=500)

    @PromptServer.instance.routes.get("/open_in_krita/browse_path")
    async def browse_krita_path(request):
        """打开文件选择对话框，让用户选择Krita可执行文件"""
        try:
            import tkinter as tk
            from tkinter import filedialog
            import sys

            # 创建隐藏的Tkinter根窗口
            root = tk.Tk()
            root.withdraw()  # 隐藏主窗口
            root.attributes('-topmost', True)  # 文件对话框置顶

            # 根据平台设置文件类型过滤器
            if sys.platform == "win32":
                filetypes = [
                    ("可执行文件", "*.exe"),
                    ("所有文件", "*.*")
                ]
                title = "选择Krita可执行文件 (krita.exe)"
            elif sys.platform == "darwin":
                filetypes = [
                    ("应用程序", "*.app"),
                    ("所有文件", "*.*")
                ]
                title = "选择Krita应用程序"
            else:  # Linux
                filetypes = [
                    ("所有文件", "*.*")
                ]
                title = "选择Krita可执行文件"

            # 打开文件选择对话框
            file_path = filedialog.askopenfilename(
                title=title,
                filetypes=filetypes
            )

            # 销毁Tkinter窗口
            root.destroy()

            if file_path:
                return web.json_response({
                    "status": "success",
                    "path": file_path
                })
            else:
                # 用户取消选择
                return web.json_response({
                    "status": "cancelled",
                    "message": "用户取消选择"
                })

        except ImportError:
            return web.json_response({
                "status": "error",
                "message": "tkinter不可用，请手动输入路径"
            }, status=500)
        except Exception as e:
            import traceback
            print(f"[OpenInKrita] 文件选择对话框失败: {e}")
            print(traceback.format_exc())
            return web.json_response({
                "status": "error",
                "message": str(e)
            }, status=500)

    @PromptServer.instance.routes.post("/open_in_krita/set_path")
    async def set_krita_path(request):
        """设置Krita可执行文件路径"""
        try:
            data = await request.json()
            path = data.get("path", "")

            if not path:
                return web.json_response({
                    "status": "error",
                    "message": "缺少path参数"
                }, status=400)

            # 验证路径是否存在
            from pathlib import Path
            krita_path = Path(path)

            if not krita_path.exists():
                return web.json_response({
                    "status": "error",
                    "message": f"文件不存在: {path}"
                }, status=400)

            if not krita_path.is_file():
                return web.json_response({
                    "status": "error",
                    "message": f"路径不是文件: {path}"
                }, status=400)

            # 保存路径到设置
            manager = get_krita_manager()
            success = manager.set_krita_path(str(krita_path))

            if not success:
                return web.json_response({
                    "status": "error",
                    "message": f"路径验证失败: {path}"
                }, status=400)

            print(f"[OpenInKrita] Krita路径已设置: {krita_path}")

            return web.json_response({
                "status": "success",
                "path": str(krita_path),
                "message": "Krita路径已设置"
            })

        except Exception as e:
            import traceback
            print(f"[OpenInKrita] 设置路径失败: {e}")
            print(traceback.format_exc())
            return web.json_response({
                "status": "error",
                "message": str(e)
            }, status=500)

    @PromptServer.instance.routes.get("/open_in_krita/check_plugin")
    async def check_krita_plugin_status(request):
        """检查Krita插件安装状态"""
        try:
            installer = KritaPluginInstaller()
            installed = installer.check_plugin_installed()
            version = installer.get_installed_version() if installed else None
            pykrita_dir = str(installer.pykrita_dir)

            # 检查Krita路径
            manager = get_krita_manager()
            krita_path = manager.get_krita_path()

            return web.json_response({
                "installed": installed,
                "version": version,
                "pykrita_dir": pykrita_dir,
                "krita_path": str(krita_path) if krita_path else None
            })

        except Exception as e:
            import traceback
            print(f"[OpenInKrita] 检查插件状态失败: {e}")
            print(traceback.format_exc())
            return web.json_response({
                "status": "error",
                "message": str(e)
            }, status=500)

    @PromptServer.instance.routes.post("/open_in_krita/reinstall_plugin")
    async def reinstall_krita_plugin(request):
        """重新安装Krita插件（强制覆盖）"""
        try:
            installer = KritaPluginInstaller()
            success = installer.install_plugin(force=True)

            if success:
                return web.json_response({
                    "status": "success",
                    "message": "插件已重新安装",
                    "pykrita_dir": str(installer.pykrita_dir),
                    "version": installer.source_version
                })
            else:
                return web.json_response({
                    "status": "error",
                    "message": "插件安装失败"
                }, status=500)

        except Exception as e:
            import traceback
            print(f"[OpenInKrita] 重新安装插件失败: {e}")
            print(traceback.format_exc())
            return web.json_response({
                "status": "error",
                "message": str(e)
            }, status=500)

    @PromptServer.instance.routes.post("/open_in_krita/cancel_wait")
    async def cancel_wait(request):
        """取消节点等待"""
        try:
            data = await request.json()
            node_id = data.get("node_id", "")

            if not node_id:
                return web.json_response({
                    "status": "error",
                    "message": "缺少node_id参数"
                }, status=400)

            # 调用节点的取消方法
            OpenInKrita.cancel_waiting(node_id)

            return web.json_response({
                "status": "success",
                "message": "已取消等待"
            })

        except Exception as e:
            import traceback
            print(f"[OpenInKrita] 取消等待失败: {e}")
            print(traceback.format_exc())
            return web.json_response({
                "status": "error",
                "message": str(e)
            }, status=500)

    @PromptServer.instance.routes.get("/open_in_krita/check_krita_status")
    async def check_krita_status(request):
        """检查Krita进程是否正在运行"""
        try:
            # 创建临时的OpenInKrita实例来调用_is_krita_running方法
            temp_node = OpenInKrita()
            is_running = temp_node._is_krita_running()

            return web.json_response({
                "status": "running" if is_running else "stopped",
                "is_running": is_running
            })
        except Exception as e:
            import traceback
            print(f"[OpenInKrita] 检查Krita状态失败: {e}")
            print(traceback.format_exc())
            return web.json_response({
                "status": "error",
                "message": str(e),
                "is_running": False
            }, status=500)

    @PromptServer.instance.routes.get("/open_in_krita/check_waiting_status")
    async def check_waiting_status(request):
        """检查节点是否处于等待状态"""
        try:
            from .py.open_in_krita.open_in_krita import _waiting_nodes

            node_id = request.query.get("node_id", "")

            if not node_id:
                return web.json_response({
                    "status": "error",
                    "message": "缺少node_id参数",
                    "is_waiting": False
                }, status=400)

            # 检查节点是否在等待字典中且waiting=True
            is_waiting = node_id in _waiting_nodes and _waiting_nodes[node_id].get("waiting", False)

            return web.json_response({
                "is_waiting": is_waiting
            })

        except Exception as e:
            import traceback
            print(f"[OpenInKrita] 检查等待状态失败: {e}")
            print(traceback.format_exc())
            return web.json_response({
                "status": "error",
                "message": str(e),
                "is_waiting": False
            }, status=500)

    @PromptServer.instance.routes.post("/open_in_krita/set_fetch_mode")
    async def set_fetch_mode(request):
        """设置节点为'从Krita获取数据'模式"""
        try:
            data = await request.json()
            node_id = data.get("node_id", "")

            if not node_id:
                return web.json_response({
                    "status": "error",
                    "message": "缺少node_id参数"
                }, status=400)

            # 设置fetch模式标志
            OpenInKrita.set_fetch_mode(node_id)

            print(f"[OpenInKrita] Set fetch mode for node {node_id}")

            return web.json_response({
                "status": "success",
                "message": "已设置获取模式"
            })

        except Exception as e:
            import traceback
            print(f"[OpenInKrita] 设置fetch模式失败: {e}")
            print(traceback.format_exc())
            return web.json_response({
                "status": "error",
                "message": str(e)
            }, status=500)

    @PromptServer.instance.routes.post("/open_in_krita/fetch_from_krita")
    async def fetch_from_krita(request):
        """从Krita获取当前数据（按钮触发）"""
        try:
            data = await request.json()
            node_id = data.get("node_id", "")

            if not node_id:
                return web.json_response({
                    "status": "error",
                    "message": "缺少node_id参数"
                }, status=400)

            # 创建临时节点实例用于检查Krita状态
            temp_node = OpenInKrita()

            # 检查1: Krita进程是否存在
            if not temp_node._is_krita_running():
                print(f"[OpenInKrita] Krita进程未运行，无法获取数据")
                # 发送Toast通知
                PromptServer.instance.send_sync("open-in-krita-notification", {
                    "node_id": node_id,
                    "message": "⚠ Krita未运行\n请先启动Krita",
                    "type": "warning"
                })
                return web.json_response({
                    "status": "error",
                    "message": "⚠ Krita未运行，请先启动Krita"
                }, status=400)

            # 检查2: Krita中是否打开了图像
            has_document = temp_node._check_krita_has_document(node_id)
            if not has_document:
                print(f"[OpenInKrita] Krita中未打开图像")
                # 发送Toast通知
                PromptServer.instance.send_sync("open-in-krita-notification", {
                    "node_id": node_id,
                    "message": "⚠ Krita中未打开图像\n请先在Krita中打开或创建图像",
                    "type": "warning"
                })
                return web.json_response({
                    "status": "error",
                    "message": "⚠ Krita中未打开图像"
                }, status=400)

            import tempfile
            from pathlib import Path
            import asyncio

            # 临时文件目录
            temp_dir = Path(tempfile.gettempdir()) / "open_in_krita"
            temp_dir.mkdir(exist_ok=True)

            # 创建请求文件
            timestamp = int(time.time() * 1000)
            request_file = temp_dir / f"fetch_{node_id}_{timestamp}.request"
            response_file = temp_dir / f"fetch_{node_id}_{timestamp}.response"

            # 写入请求文件（空文件作为信号）
            request_file.write_text("", encoding='utf-8')
            print(f"[OpenInKrita] 已创建fetch请求: {request_file.name}")

            # 等待响应文件出现（超时10秒）
            max_wait = 10.0
            check_interval = 0.1
            elapsed = 0

            while elapsed < max_wait:
                if response_file.exists():
                    print(f"[OpenInKrita] 检测到响应文件: {response_file.name}")
                    break
                await asyncio.sleep(check_interval)
                elapsed += check_interval

            if not response_file.exists():
                print(f"[OpenInKrita] 等待响应超时 ({max_wait}s)")
                # 清理请求文件
                request_file.unlink(missing_ok=True)
                return web.json_response({
                    "status": "timeout",
                    "message": "等待Krita响应超时，请确保Krita正在运行"
                }, status=408)

            # 读取响应数据
            import json
            response_data = json.loads(response_file.read_text(encoding='utf-8'))

            image_path = response_data.get("image_path")
            mask_path = response_data.get("mask_path")

            if not image_path:
                # 清理文件
                response_file.unlink(missing_ok=True)
                return web.json_response({
                    "status": "error",
                    "message": "Krita未返回图像数据"
                }, status=500)

            # 加载图像和蒙版
            image_file = Path(image_path)
            image_tensor = OpenInKrita._load_image_from_file(OpenInKrita(), image_file)

            if mask_path:
                mask_file = Path(mask_path)
                mask_tensor = OpenInKrita._load_mask_from_file(OpenInKrita(), mask_file)
            else:
                # 创建空蒙版
                import torch
                mask_tensor = torch.zeros((image_tensor.shape[1], image_tensor.shape[2]))

            # 存储到pending data
            OpenInKrita.set_pending_data(node_id, image_tensor, mask_tensor)

            print(f"[OpenInKrita] ✓ 数据已获取: node_id={node_id}, image={image_tensor.shape}, mask={mask_tensor.shape}")

            # 发送成功Toast到ComfyUI前端
            PromptServer.instance.send_sync("open-in-krita-notification", {
                "node_id": node_id,
                "message": "✓ 已从Krita获取数据\n图像和蒙版已准备就绪",
                "type": "success"
            })

            # 清理临时文件
            response_file.unlink(missing_ok=True)
            if mask_path:
                Path(mask_path).unlink(missing_ok=True)
            image_file.unlink(missing_ok=True)

            return web.json_response({
                "status": "success",
                "message": "✓ 已从Krita获取数据，可以执行工作流了"
            })

        except Exception as e:
            import traceback
            print(f"[OpenInKrita] 从Krita获取数据失败: {e}")
            print(traceback.format_exc())
            return web.json_response({
                "status": "error",
                "message": str(e)
            }, status=500)

except ImportError as e:
    # ComfyUI 环境不可用时的静默处理
    print(f"[DanbooruGallery] Warning: Could not initialize API routes: {e}")
    import traceback
    traceback.print_exc()
except Exception as e:
    # 捕获其他异常并输出
    print(f"[DanbooruGallery] Error during API initialization: {e}")
    import traceback
    traceback.print_exc()

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS', 'WEB_DIRECTORY']