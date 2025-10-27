# Resolution Master Simplify - 分辨率大师简化版
# 节点逻辑和 API 路由

import os
import json
from server import PromptServer
from aiohttp import web


# ==================== 节点类 ====================

class ResolutionMasterSimplify:
    """分辨率大师简化版节点"""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "width": ("INT", {
                    "default": 1024,
                    "min": 64,
                    "max": 8192,
                    "step": 64
                }),
                "height": ("INT", {
                    "default": 1024,
                    "min": 64,
                    "max": 8192,
                    "step": 64
                }),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
            },
        }

    RETURN_TYPES = ("INT", "INT")
    RETURN_NAMES = ("width", "height")
    FUNCTION = "execute"
    CATEGORY = "utils/Resolution Master"

    def execute(self, width, height, unique_id=None):
        """执行节点"""
        return (width, height)


# ==================== 设置管理 ====================

# 获取设置文件路径
SETTINGS_DIR = os.path.dirname(os.path.abspath(__file__))
SETTINGS_FILE = os.path.join(SETTINGS_DIR, "settings.json")

# 默认设置
DEFAULT_SETTINGS = {
    "language": "zh",
    "custom_presets": {}
}


def load_settings():
    """加载设置"""
    try:
        if os.path.exists(SETTINGS_FILE):
            with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        else:
            return DEFAULT_SETTINGS.copy()
    except Exception as e:
        print(f"[ResolutionMasterSimplify] 加载设置失败: {e}")
        return DEFAULT_SETTINGS.copy()


def save_settings(settings):
    """保存设置"""
    try:
        with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
            json.dump(settings, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"[ResolutionMasterSimplify] 保存设置失败: {e}")
        return False


# ==================== API 路由 ====================

@PromptServer.instance.routes.get("/danbooru_gallery/resolution_simplify/load_settings")
async def load_settings_api(request):
    """加载设置 API"""
    try:
        settings = load_settings()
        return web.json_response({
            "status": "success",
            "settings": settings
        })
    except Exception as e:
        return web.json_response({
            "status": "error",
            "message": str(e)
        }, status=500)


@PromptServer.instance.routes.post("/danbooru_gallery/resolution_simplify/save_settings")
async def save_settings_api(request):
    """保存设置 API"""
    try:
        data = await request.json()
        settings = data.get('settings', {})

        if save_settings(settings):
            return web.json_response({
                "status": "success",
                "message": "Settings saved"
            })
        else:
            return web.json_response({
                "status": "error",
                "message": "Failed to save settings"
            }, status=500)
    except Exception as e:
        return web.json_response({
            "status": "error",
            "message": str(e)
        }, status=500)


@PromptServer.instance.routes.post("/danbooru_gallery/resolution_simplify/add_preset")
async def add_preset_api(request):
    """添加预设 API"""
    try:
        data = await request.json()
        name = data.get('name', '').strip()
        width = data.get('width', 1024)
        height = data.get('height', 1024)

        if not name:
            return web.json_response({
                "status": "error",
                "message": "Preset name cannot be empty"
            }, status=400)

        settings = load_settings()

        # 检查预设是否已存在
        if name in settings.get('custom_presets', {}):
            return web.json_response({
                "status": "error",
                "message": "Preset already exists"
            }, status=400)

        # 添加预设
        if 'custom_presets' not in settings:
            settings['custom_presets'] = {}

        settings['custom_presets'][name] = {
            'width': width,
            'height': height
        }

        if save_settings(settings):
            return web.json_response({
                "status": "success",
                "message": "Preset added",
                "preset": {
                    "name": name,
                    "width": width,
                    "height": height
                }
            })
        else:
            return web.json_response({
                "status": "error",
                "message": "Failed to save preset"
            }, status=500)

    except Exception as e:
        return web.json_response({
            "status": "error",
            "message": str(e)
        }, status=500)


@PromptServer.instance.routes.post("/danbooru_gallery/resolution_simplify/delete_preset")
async def delete_preset_api(request):
    """删除预设 API"""
    try:
        data = await request.json()
        name = data.get('name', '').strip()

        if not name:
            return web.json_response({
                "status": "error",
                "message": "Preset name cannot be empty"
            }, status=400)

        settings = load_settings()

        # 检查预设是否存在
        if name not in settings.get('custom_presets', {}):
            return web.json_response({
                "status": "error",
                "message": "Preset not found"
            }, status=404)

        # 删除预设
        del settings['custom_presets'][name]

        if save_settings(settings):
            return web.json_response({
                "status": "success",
                "message": "Preset deleted"
            })
        else:
            return web.json_response({
                "status": "error",
                "message": "Failed to delete preset"
            }, status=500)

    except Exception as e:
        return web.json_response({
            "status": "error",
            "message": str(e)
        }, status=500)


print("[ResolutionMasterSimplify] API 路由已注册")
