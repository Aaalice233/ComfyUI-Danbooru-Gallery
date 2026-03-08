# ComfyUI Danbooru Gallery 自定义节点集合

# 导入logger
from .py.utils.logger import get_logger
logger = get_logger(__name__)

# 初始化统计
import time
import sys
_init_start_time = time.time()
_node_load_stats = {
    "total_modules": 0,
    "loaded_modules": 0,
    "failed_modules": 0,
    "total_nodes": 0,
    "errors": []
}

# 控制台输出（确保始终显示在ComfyUI控制台）
print("=" * 70, file=sys.stderr)
print("🚀 ComfyUI-Danbooru-Gallery 插件初始化开始...", file=sys.stderr)
print("=" * 70, file=sys.stderr)

# 同时记录到日志文件
logger.info("=" * 70)
logger.info("🚀 ComfyUI-Danbooru-Gallery 插件初始化开始...")
logger.info("=" * 70)

# 导入各个模块的节点映射
from .py.danbooru_gallery import NODE_CLASS_MAPPINGS as danbooru_mappings, NODE_DISPLAY_NAME_MAPPINGS as danbooru_display_mappings
from .py.character_feature_swap import NODE_CLASS_MAPPINGS as swap_mappings, NODE_DISPLAY_NAME_MAPPINGS as swap_display_mappings
from .py.prompt_selector import NODE_CLASS_MAPPINGS as ps_mappings, NODE_DISPLAY_NAME_MAPPINGS as ps_display_mappings
from .py.multi_character_editor import NODE_CLASS_MAPPINGS as mce_mappings, NODE_DISPLAY_NAME_MAPPINGS as mce_display_mappings
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
from .py.simple_value_switch import NODE_CLASS_MAPPINGS as svs_mappings, NODE_DISPLAY_NAME_MAPPINGS as svs_display_mappings
from .py.model_name_extractor import NODE_CLASS_MAPPINGS as mne_mappings, NODE_DISPLAY_NAME_MAPPINGS as mne_display_mappings

# 导入枚举切换节点
from .py.enum_switch import NODE_CLASS_MAPPINGS as enum_switch_mappings, NODE_DISPLAY_NAME_MAPPINGS as enum_switch_display_mappings

# 导入组静音管理器
from .py.group_mute_manager import NODE_CLASS_MAPPINGS as group_mute_mappings
from .py.group_mute_manager import NODE_DISPLAY_NAME_MAPPINGS as group_mute_display_mappings
# 导入组忽略管理器
from .py.group_ignore_manager import NODE_CLASS_MAPPINGS as group_ignore_mappings
from .py.group_ignore_manager import NODE_DISPLAY_NAME_MAPPINGS as group_ignore_display_mappings

# 导入工作流说明节点
from .py.workflow_description import NODE_CLASS_MAPPINGS as workflow_description_mappings
from .py.workflow_description import NODE_DISPLAY_NAME_MAPPINGS as workflow_description_display_mappings

# 导入Open In Krita节点
from .py.open_in_krita import NODE_CLASS_MAPPINGS as open_in_krita_mappings
from .py.open_in_krita import NODE_DISPLAY_NAME_MAPPINGS as open_in_krita_display_mappings

# 导入快速组导航器（纯JavaScript扩展）
from .py.quick_group_navigation import NODE_CLASS_MAPPINGS as quick_group_navigation_mappings
from .py.quick_group_navigation import NODE_DISPLAY_NAME_MAPPINGS as quick_group_navigation_display_mappings

# 导入组是否启用节点
from .py.group_is_enabled import NODE_CLASS_MAPPINGS as gie_mappings
from .py.group_is_enabled import NODE_DISPLAY_NAME_MAPPINGS as gie_display_mappings
from .py.group_is_enabled.group_is_enabled import update_all_group_states as gie_update_states

# 优化执行系统映射
opt_mappings = {
    **group_mute_mappings,
    **group_ignore_mappings
}
opt_display_mappings = {
    **group_mute_display_mappings,
    **group_ignore_display_mappings
}

# 合并所有节点映射
NODE_CLASS_MAPPINGS = {
    **danbooru_mappings,
    **swap_mappings,
    **ps_mappings,
    **mce_mappings,
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
    **svs_mappings,
    **mne_mappings,
    **enum_switch_mappings,
    **opt_mappings,
    **workflow_description_mappings,
    **open_in_krita_mappings,
    **quick_group_navigation_mappings,
    **gie_mappings
}

NODE_DISPLAY_NAME_MAPPINGS = {
    **danbooru_display_mappings,
    **swap_display_mappings,
    **ps_display_mappings,
    **mce_display_mappings,
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
    **svs_display_mappings,
    **mne_display_mappings,
    **enum_switch_display_mappings,
    **opt_display_mappings,
    **workflow_description_display_mappings,
    **open_in_krita_display_mappings,
    **quick_group_navigation_display_mappings,
    **gie_display_mappings
}

# 统计节点加载情况
_node_load_stats["total_nodes"] = len(NODE_CLASS_MAPPINGS)
_node_load_stats["loaded_modules"] = 20  # 成功导入的模块数(根据上面的import语句统计)

# 控制台输出
print("=" * 70, file=sys.stderr)
print("✅ 节点加载完成:", file=sys.stderr)
print(f"   📦 成功加载模块: {_node_load_stats['loaded_modules']} 个", file=sys.stderr)
print(f"   🎯 成功注册节点: {_node_load_stats['total_nodes']} 个", file=sys.stderr)
if _node_load_stats["failed_modules"] > 0:
    print(f"   ❌ 失败模块: {_node_load_stats['failed_modules']} 个", file=sys.stderr)
    for error_info in _node_load_stats["errors"]:
        print(f"      - {error_info['module']}: {error_info['error']}", file=sys.stderr)
print("=" * 70, file=sys.stderr)

# 同时记录到日志文件
logger.info("=" * 70)
logger.info("✅ 节点加载完成:")
logger.info(f"   📦 成功加载模块: {_node_load_stats['loaded_modules']} 个")
logger.info(f"   🎯 成功注册节点: {_node_load_stats['total_nodes']} 个")
if _node_load_stats["failed_modules"] > 0:
    logger.error(f"   ❌ 失败模块: {_node_load_stats['failed_modules']} 个")
    for error_info in _node_load_stats["errors"]:
        logger.error(f"      - {error_info['module']}: {error_info['error']}")
logger.info("=" * 70)

# 设置JavaScript文件目录
WEB_DIRECTORY = "./js"

# 注册 WebSocket 事件监听器
try:
    from server import PromptServer
    from aiohttp import web
    from .py.utils import debug_config
    from .py.utils import config
    import time

    # 导入 tag sync API 以注册API端点（可选功能）
    try:
        from .py.shared.sync import tag_sync_api
        logger.info("✓ Tag sync API 已加载")
    except (ImportError, ModuleNotFoundError):
        # Tag sync API 依赖 cache 模块，如果 cache 不可用则此功能不可用
        # 这不影响其他核心功能（如 SaveImagePlus）
        tag_sync_api = None

    # 导入并注册 checkpoint 预览图 API
    try:
        from .py.simple_checkpoint_loader_with_name import register_preview_api
        register_preview_api(PromptServer.instance.routes)
        logger.info("✓ Checkpoint预览图API已注册")
    except Exception as e:
        logger.warning(f" Checkpoint预览图API注册失败: {e}")

    @PromptServer.instance.routes.post("/danbooru/logs/batch")
    async def receive_js_logs(request):
        """
        接收前端JavaScript日志的API端点

        批量接收前端日志，写入到统一的logger系统中。
        """
        try:
            data = await request.json()
            logs = data.get("logs", [])

            # 逐条处理日志
            for log_entry in logs:
                level_str = log_entry.get("level", "INFO").upper()
                component = log_entry.get("component", "JS")
                message = log_entry.get("message", "")
                timestamp = log_entry.get("timestamp", "")
                browser = log_entry.get("browser", "Unknown")

                # 使用 JS/浏览器 作为 logger 名称，避免重复的方括号
                js_logger = get_logger(f"JS/{browser}")

                # 构建消息：[组件名] 实际消息内容（如果有）
                if message:
                    full_message = f"[{component}] {message}"
                else:
                    full_message = f"[{component}]"

                # 根据级别写入日志
                if level_str == "DEBUG":
                    js_logger.debug(full_message)
                elif level_str == "INFO":
                    js_logger.info(full_message)
                elif level_str == "WARNING":
                    js_logger.warning(full_message)
                elif level_str == "ERROR":
                    js_logger.error(full_message)
                elif level_str == "CRITICAL":
                    js_logger.critical(full_message)
                else:
                    js_logger.info(full_message)

            return web.json_response({
                "success": True,
                "received": len(logs)
            })
        except Exception as e:
            logger.error(f"接收JS日志失败: {e}")
            return web.json_response({
                "success": False,
                "error": str(e)
            }, status=500)

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

    @PromptServer.instance.routes.get("/danbooru_gallery/get_sampler_node_types")
    async def get_sampler_node_types(request):
        """获取采样器节点类型列表的API端点"""
        try:
            sampler_types = config.get_sampler_node_types()
            return web.json_response({"status": "success", "sampler_node_types": sampler_types})
        except Exception as e:
            return web.json_response({"status": "error", "error": str(e)}, status=500)

    # 组是否启用节点 - 状态同步API
    @PromptServer.instance.routes.post("/danbooru_gallery/group_is_enabled/sync_states")
    async def sync_group_states(request):
        """同步组状态到后端缓存"""
        try:
            data = await request.json()
            states = data.get("states", {})

            # 输入验证
            if not isinstance(states, dict):
                return web.json_response({
                    "status": "error",
                    "message": "states 必须是字典类型"
                }, status=400)

            # 验证值类型
            for key, value in states.items():
                if not isinstance(key, str) or not isinstance(value, bool):
                    return web.json_response({
                        "status": "error",
                        "message": "states 格式无效: 键必须是字符串, 值必须是布尔值"
                    }, status=400)

            gie_update_states(states)

            logger.debug(f"[GroupIsEnabled] 已同步 {len(states)} 个组状态")

            return web.json_response({
                "status": "success",
                "count": len(states)
            })
        except Exception as e:
            logger.error(f"[GroupIsEnabled] 同步状态失败: {e}")
            return web.json_response({
                "status": "error",
                "message": str(e)
            }, status=500)

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
            logger.error(f"[WorkflowDescription] 加载设置失败: {e}")
            return {"opened_versions": {}}

    def save_workflow_description_settings(settings):
        """保存工作流说明节点的设置文件"""
        try:
            os.makedirs(os.path.dirname(WORKFLOW_DESCRIPTION_SETTINGS_FILE), exist_ok=True)
            with open(WORKFLOW_DESCRIPTION_SETTINGS_FILE, 'w', encoding='utf-8') as f:
                json.dump(settings, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            logger.error(f"[WorkflowDescription] 保存设置失败: {e}")
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

    # Open In Krita / Fetch From Krita 相关API路由
    import base64
    from .py.open_in_krita.open_in_krita import FetchFromKrita
    from .py.open_in_krita.krita_manager import get_manager as get_krita_manager
    from .py.open_in_krita.plugin_installer import KritaPluginInstaller

    # 在启动时自动检查并安装Krita插件
    try:
        installer = KritaPluginInstaller()
        if not installer.check_plugin_installed():
            logger.info("[OpenInKrita] 检测到Krita插件未安装，正在自动安装...")
            installer.install_plugin()
            logger.info("[OpenInKrita] Krita插件安装完成")
        else:
            logger.info("[OpenInKrita] Krita插件已安装")
    except Exception as e:
        logger.error(f"[OpenInKrita] 插件安装检查失败: {e}")

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
            pending_data = FetchFromKrita.get_pending_data(node_id)

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
            logger.error(f"[OpenInKrita] 获取数据失败: {e}")
            logger.debug(traceback.format_exc())
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
                image_tensor = FetchFromKrita.load_image_from_bytes(image_bytes)
            else:
                return web.json_response({
                    "status": "error",
                    "message": "缺少图像数据"
                }, status=400)

            # 解码蒙版数据（可选）
            if mask_base64:
                mask_bytes = base64.b64decode(mask_base64)
                mask_tensor = FetchFromKrita.load_mask_from_bytes(mask_bytes)
            else:
                # 创建空蒙版
                import torch
                mask_tensor = torch.zeros((image_tensor.shape[1], image_tensor.shape[2]))

            # 存储待处理数据
            FetchFromKrita.set_pending_data(node_id, image_tensor, mask_tensor)

            logger.error(f"[OpenInKrita] 接收到Krita数据: node_id={node_id}, image_shape={image_tensor.shape}, mask_shape={mask_tensor.shape}")

            return web.json_response({
                "status": "success",
                "message": "数据已接收，请在ComfyUI中点击'从Krita获取数据'按钮"
            })

        except Exception as e:
            import traceback
            logger.error(f"[OpenInKrita] 接收数据失败: {e}")
            logger.debug(traceback.format_exc())
            return web.json_response({
                "status": "error",
                "message": str(e)
            }, status=500)

    @PromptServer.instance.routes.get("/open_in_krita/browse_path")
    async def browse_krita_path(request):
        """打开文件选择对话框，让用户选择Krita可执行文件"""
        import subprocess
        import shutil
        import sys

        def _browse_with_tkinter():
            import tkinter as tk
            from tkinter import filedialog

            root = tk.Tk()
            root.withdraw()
            root.attributes('-topmost', True)

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
            else:
                filetypes = [
                    ("所有文件", "*.*")
                ]
                title = "选择Krita可执行文件"

            try:
                return filedialog.askopenfilename(
                    title=title,
                    filetypes=filetypes
                )
            finally:
                root.destroy()

        def _run_dialog_command(cmd):
            try:
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=60
                )
                output = (result.stdout or "").strip()
                if output:
                    return output, None
                if result.returncode in (0, 1):
                    return "", None  # 0/1都可能是用户取消
                error = (result.stderr or "").strip() or f"exit code {result.returncode}"
                return None, error
            except Exception as e:
                return None, str(e)

        def _browse_with_system_dialog():
            if sys.platform == "win32":
                ps_script = (
                    "Add-Type -AssemblyName System.Windows.Forms; "
                    "$dialog = New-Object System.Windows.Forms.OpenFileDialog; "
                    "$dialog.Filter = 'Executable (*.exe)|*.exe|All files (*.*)|*.*'; "
                    "$dialog.Title = '选择Krita可执行文件 (krita.exe)'; "
                    "if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) "
                    "{ Write-Output $dialog.FileName }"
                )
                last_error = "未找到可用的PowerShell可执行文件"
                for ps_cmd in ("powershell", "powershell.exe", "pwsh", "pwsh.exe"):
                    if shutil.which(ps_cmd):
                        path, err = _run_dialog_command(
                            [ps_cmd, "-NoProfile", "-Command", ps_script]
                        )
                        if path is not None:
                            return path, None
                        last_error = err
                return None, f"系统对话框不可用: {last_error}"

            if sys.platform == "darwin":
                script = (
                    "set selectedFile to choose file with prompt \"选择Krita应用程序\" "
                    "of type {\"app\"}\n"
                    "POSIX path of selectedFile"
                )
                path, err = _run_dialog_command(["osascript", "-e", script])
                return path, err

            if shutil.which("zenity"):
                path, err = _run_dialog_command(
                    ["zenity", "--file-selection", "--title=选择Krita可执行文件"]
                )
                return path, err

            if shutil.which("kdialog"):
                path, err = _run_dialog_command(
                    ["kdialog", "--getopenfilename", "", "All files (*)", "选择Krita可执行文件"]
                )
                return path, err

            return None, "找不到系统文件对话框程序（zenity/kdialog）"

        try:
            file_path = _browse_with_tkinter()
        except Exception as tk_error:
            logger.warning(f"[OpenInKrita] Tkinter对话框不可用，尝试系统对话框: {tk_error}")
            file_path, fallback_error = _browse_with_system_dialog()
            if file_path is None:
                return web.json_response({
                    "status": "error",
                    "message": f"文件选择不可用。tkinter错误: {tk_error}; 系统对话框错误: {fallback_error}"
                }, status=500)

        if file_path:
            return web.json_response({
                "status": "success",
                "path": file_path
            })

        return web.json_response({
            "status": "cancelled",
            "message": "用户取消选择"
        })

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

            logger.error(f"[OpenInKrita] Krita路径已设置: {krita_path}")

            # 路径设置成功后，自动检查并安装插件
            from .py.open_in_krita.plugin_installer import KritaPluginInstaller
            installer = KritaPluginInstaller()

            plugin_status = {
                "installed": False,
                "version": None,
                "auto_installed": False
            }

            # 检查是否需要安装/更新插件
            if installer.needs_update():
                installed_version = installer.get_installed_version()
                source_version = installer.source_version

                # 发送Toast：开始检查插件
                PromptServer.instance.send_sync("open-in-krita-notification", {
                    "node_id": "",
                    "message": "🔍 检查Krita插件状态...",
                    "type": "info"
                })

                if installed_version:
                    logger.info(f"[OpenInKrita] 发现插件版本更新: {installed_version} -> {source_version}")
                    # 发送Toast：需要更新
                    PromptServer.instance.send_sync("open-in-krita-notification", {
                        "node_id": "",
                        "message": f"📦 更新Krita插件\n{installed_version} → {source_version}",
                        "type": "info"
                    })
                else:
                    logger.info(f"[OpenInKrita] 插件未安装，准备安装 v{source_version}")
                    # 发送Toast：首次安装
                    PromptServer.instance.send_sync("open-in-krita-notification", {
                        "node_id": "",
                        "message": f"📦 安装Krita插件 v{source_version}...",
                        "type": "info"
                    })

                # 执行安装
                install_success = installer.install_plugin(force=True)

                if install_success:
                    plugin_status["installed"] = True
                    plugin_status["version"] = source_version
                    plugin_status["auto_installed"] = True

                    logger.info(f"[OpenInKrita] 插件安装成功: v{source_version}")
                    # 发送Toast：安装成功
                    PromptServer.instance.send_sync("open-in-krita-notification", {
                        "node_id": "",
                        "message": f"✓ Krita插件已安装 v{source_version}\n插件已自动启用，重启Krita生效",
                        "type": "success"
                    })
                else:
                    logger.warning(f"[OpenInKrita] 插件安装失败")
                    # 发送Toast：安装失败
                    PromptServer.instance.send_sync("open-in-krita-notification", {
                        "node_id": "",
                        "message": "⚠️ 插件安装失败，请查看日志",
                        "type": "warning"
                    })
            else:
                # 插件已是最新版本
                current_version = installer.get_installed_version()
                plugin_status["installed"] = True
                plugin_status["version"] = current_version
                plugin_status["auto_installed"] = False
                logger.info(f"[OpenInKrita] 插件已是最新版本: v{current_version}")

            return web.json_response({
                "status": "success",
                "path": str(krita_path),
                "message": "Krita路径已设置",
                "plugin": plugin_status
            })

        except Exception as e:
            import traceback
            logger.error(f"[OpenInKrita] 设置路径失败: {e}")
            logger.debug(traceback.format_exc())
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
            logger.error(f"[OpenInKrita] 检查插件状态失败: {e}")
            logger.debug(traceback.format_exc())
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
            logger.error(f"[OpenInKrita] 重新安装插件失败: {e}")
            logger.debug(traceback.format_exc())
            return web.json_response({
                "status": "error",
                "message": str(e)
            }, status=500)

    @PromptServer.instance.routes.get("/open_in_krita/check_krita_status")
    async def check_krita_status(request):
        """检查Krita进程是否正在运行"""
        try:
            # 创建临时的FetchFromKrita实例来调用_is_krita_running方法
            temp_node = FetchFromKrita()
            is_running = temp_node._is_krita_running()

            return web.json_response({
                "status": "running" if is_running else "stopped",
                "is_running": is_running
            })
        except Exception as e:
            import traceback
            logger.error(f"[OpenInKrita] 检查Krita状态失败: {e}")
            logger.debug(traceback.format_exc())
            return web.json_response({
                "status": "error",
                "message": str(e),
                "is_running": False
            }, status=500)

    @PromptServer.instance.routes.post("/simple_load_image/open_in_krita")
    async def simple_load_image_open_in_krita(request):
        """简易图像加载器：在Krita中打开指定图像"""
        try:
            data = await request.json()
            node_id = data.get("node_id", "")
            image_path = data.get("image_path", "")

            if not image_path:
                return web.json_response({
                    "status": "error",
                    "message": "缺少image_path参数"
                }, status=400)

            # 检查Krita路径是否已设置
            manager = get_krita_manager()
            krita_path = manager.get_krita_path()

            if not krita_path:
                logger.warning(f"[SimpleLoadImage] Krita路径未设置")
                # 发送Toast通知
                PromptServer.instance.send_sync("simple-load-image-notification", {
                    "node_id": node_id,
                    "message": "⚠️ 请先设置Krita路径\n右键节点 → 设置Krita路径",
                    "type": "warning"
                })
                return web.json_response({
                    "status": "error",
                    "message": "未设置Krita路径",
                    "show_setup": True
                })

            # 获取图像的完整路径
            try:
                import folder_paths
                full_image_path = folder_paths.get_annotated_filepath(image_path)
            except Exception as e:
                logger.error(f"[SimpleLoadImage] 获取图像路径失败: {e}")
                return web.json_response({
                    "status": "error",
                    "message": f"图像路径获取失败: {str(e)}"
                }, status=400)

            from pathlib import Path
            image_file = Path(full_image_path)

            if not image_file.exists():
                return web.json_response({
                    "status": "error",
                    "message": f"图像文件不存在: {full_image_path}"
                }, status=400)

            # 🔥 在启动Krita之前，强制重装插件确保使用最新版本
            from .py.open_in_krita.plugin_installer import KritaPluginInstaller
            installer = KritaPluginInstaller()

            installed_version = installer.get_installed_version()
            source_version = installer.source_version

            # 发送Toast：准备重装插件
            logger.info(f"[SimpleLoadImage] 强制重装Krita插件: v{source_version}")
            PromptServer.instance.send_sync("simple-load-image-notification", {
                "node_id": node_id,
                "message": f"🔄 正在更新Krita插件至 v{source_version}...",
                "type": "info"
            })

            # 如果Krita正在运行，需要先关闭它以完成更新
            if manager.is_krita_running():
                logger.info(f"[SimpleLoadImage] Krita正在运行，准备关闭以完成插件更新")
                PromptServer.instance.send_sync("simple-load-image-notification", {
                    "node_id": node_id,
                    "message": "⏸️ 正在关闭Krita以完成插件更新...",
                    "type": "info"
                })

                # 关闭Krita进程
                if not installer.kill_krita_process():
                    logger.warning(f"[SimpleLoadImage] 关闭Krita进程失败，将尝试继续安装")

                # 等待进程完全关闭
                import time
                time.sleep(2)

            # 🔥 强制执行插件安装（无论版本是否相同）
            install_success = installer.install_plugin(force=True)

            if install_success:
                logger.info(f"[SimpleLoadImage] 插件安装成功: v{source_version}")
                PromptServer.instance.send_sync("simple-load-image-notification", {
                    "node_id": node_id,
                    "message": f"✓ Krita插件已更新至 v{source_version}\n正在启动Krita...",
                    "type": "success"
                })

                # 🔥 等待1秒，确保插件文件完全写入磁盘
                import time
                time.sleep(1)
            else:
                logger.warning(f"[SimpleLoadImage] 插件安装失败，将使用现有版本继续")
                PromptServer.instance.send_sync("simple-load-image-notification", {
                    "node_id": node_id,
                    "message": "⚠️ 插件安装失败\n将使用现有版本启动Krita",
                    "type": "warning"
                })

            # 使用KritaManager启动Krita并打开图像
            try:
                success = manager.launch_krita(str(image_file))
                if success:
                    logger.info(f"[SimpleLoadImage] Krita已启动，正在打开图像: {image_file.name}")
                    # 发送成功Toast通知
                    PromptServer.instance.send_sync("simple-load-image-notification", {
                        "node_id": node_id,
                        "message": f"✓ Krita已启动\n正在打开图像: {image_file.name}",
                        "type": "success"
                    })
                    return web.json_response({
                        "status": "success",
                        "message": f"Krita已启动，正在打开图像: {image_file.name}"
                    })
                else:
                    logger.error(f"[SimpleLoadImage] 启动Krita失败")
                    return web.json_response({
                        "status": "error",
                        "message": "启动Krita失败，请检查Krita路径设置"
                    }, status=500)
            except Exception as e:
                import traceback
                logger.error(f"[SimpleLoadImage] 启动Krita时出错: {e}")
                logger.debug(traceback.format_exc())
                return web.json_response({
                    "status": "error",
                    "message": f"启动Krita失败: {str(e)}"
                }, status=500)

        except Exception as e:
            import traceback
            logger.error(f"[SimpleLoadImage] 处理请求失败: {e}")
            logger.debug(traceback.format_exc())
            return web.json_response({
                "status": "error",
                "message": str(e)
            }, status=500)

    # API注册成功统计
    _api_count = 24  # 根据上面注册的API端点数量统计（已移除fetch模式相关的4个API）

    # 控制台输出
    print("=" * 70, file=sys.stderr)
    print("✅ API端点注册完成:", file=sys.stderr)
    print(f"   🌐 成功注册API: {_api_count} 个 (含日志接收)", file=sys.stderr)
    print("=" * 70, file=sys.stderr)

    # 同时记录到日志文件
    logger.info("=" * 70)
    logger.info("✅ API端点注册完成:")
    logger.info(f"   🌐 成功注册API: {_api_count} 个 (含日志接收)")
    logger.info("=" * 70)

except ImportError as e:
    # ComfyUI 环境不可用时的静默处理
    print(f"⚠️ 无法初始化API路由 (ComfyUI环境不可用): {e}", file=sys.stderr)
    logger.warning(f"⚠️ 无法初始化API路由 (ComfyUI环境不可用): {e}")
    import traceback
    logger.debug(traceback.format_exc())
except Exception as e:
    # 捕获其他异常并输出到控制台和日志
    print(f"❌ API初始化失败: {e}", file=sys.stderr)
    logger.error(f"❌ API初始化失败: {e}")
    import traceback
    error_trace = traceback.format_exc()
    print(error_trace, file=sys.stderr)
    logger.error(error_trace)

# 输出最终初始化报告
_init_duration = time.time() - _init_start_time

# 控制台输出（确保在ComfyUI控制台可见）
print("=" * 70, file=sys.stderr)
print("🎉 ComfyUI-Danbooru-Gallery 插件初始化完成!", file=sys.stderr)
print(f"   ⏱️  初始化耗时: {_init_duration:.3f} 秒", file=sys.stderr)
print(f"   📦 已加载模块: {_node_load_stats['loaded_modules']} 个", file=sys.stderr)
print(f"   🎯 已注册节点: {_node_load_stats['total_nodes']} 个", file=sys.stderr)
if _node_load_stats["failed_modules"] > 0:
    print(f"   ❌ 失败模块: {_node_load_stats['failed_modules']} 个", file=sys.stderr)
print("=" * 70, file=sys.stderr)

# 同时记录到日志文件
logger.info("=" * 70)
logger.info("🎉 ComfyUI-Danbooru-Gallery 插件初始化完成!")
logger.info(f"   ⏱️  初始化耗时: {_init_duration:.3f} 秒")
logger.info(f"   📦 已加载模块: {_node_load_stats['loaded_modules']} 个")
logger.info(f"   🎯 已注册节点: {_node_load_stats['total_nodes']} 个")
if _node_load_stats["failed_modules"] > 0:
    logger.error(f"   ❌ 失败模块: {_node_load_stats['failed_modules']} 个")
logger.info("=" * 70)

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS', 'WEB_DIRECTORY']
