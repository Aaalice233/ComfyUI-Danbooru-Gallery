import requests
import json
import folder_paths
from server import PromptServer
from aiohttp import web
import time
import torch
import io
import urllib.request
import urllib.parse
import numpy as np
from PIL import Image
import os

# Danbooru API的基础URL
BASE_URL = "https://danbooru.donmai.us"

# 获取插件目录路径
PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
SETTINGS_FILE = os.path.join(PLUGIN_DIR, "settings.json")

def load_settings():
    """从本地文件加载所有设置"""
    default_settings = {
        "language": "zh",
        "blacklist": [],
        "filter_tags": [
            "watermark", "sample_watermark", "weibo_username", "weibo", "weibo_logo",
            "weibo_watermark", "censored", "mosaic_censoring", "artist_name", "twitter_username"
        ],
        "filter_enabled": True  # 默认开启过滤
    }
    
    try:
        if os.path.exists(SETTINGS_FILE):
            with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                # 合并默认设置，确保新增的设置项有默认值
                for key, value in default_settings.items():
                    if key not in data:
                        data[key] = value
                return data
    except Exception as e:
        print(f"[*] Danbooru Gallery: 加载设置失败: {e}")
    
    return default_settings

def save_settings(settings):
    """保存所有设置到本地文件"""
    try:
        with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
            json.dump(settings, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"[*] Danbooru Gallery: 保存设置失败: {e}")
        return False

def load_blacklist():
    """从统一设置文件加载黑名单"""
    settings = load_settings()
    return settings.get("blacklist", [])

def save_blacklist(blacklist_items):
    """保存黑名单到统一设置文件"""
    settings = load_settings()
    settings["blacklist"] = blacklist_items
    return save_settings(settings)

def load_language():
    """从统一设置文件加载语言设置"""
    settings = load_settings()
    return settings.get("language", "zh")

def save_language(language):
    """保存语言设置到统一设置文件"""
    settings = load_settings()
    settings["language"] = language
    return save_settings(settings)

def load_filter_tags():
    """从统一设置文件加载提示词过滤标签"""
    settings = load_settings()
    filter_tags = settings.get("filter_tags", [])
    filter_enabled = settings.get("filter_enabled", True)
    return filter_tags, filter_enabled

def save_filter_tags(filter_tags, filter_enabled):
    """保存提示词过滤标签到统一设置文件"""
    settings = load_settings()
    settings["filter_tags"] = filter_tags
    settings["filter_enabled"] = filter_enabled
    return save_settings(settings)

@PromptServer.instance.routes.get("/danbooru_gallery/posts")
async def get_posts_for_front(request):
    query = request.query
    tags = query.get("search[tags]", "")
    page = query.get("page", "1")
    limit = query.get("limit", "100")
    rating = query.get("search[rating]", "")

    posts_json_str, = DanbooruGalleryNode.get_posts_internal(tags=tags, limit=int(limit), page=int(page), rating=rating)
    
    try:
        posts_list = json.loads(posts_json_str)
    except json.JSONDecodeError:
        posts_list = []

    return web.json_response(posts_list, headers={
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
    })

@PromptServer.instance.routes.get("/danbooru_gallery/blacklist")
async def get_blacklist(request):
    """获取黑名单"""
    blacklist = load_blacklist()
    return web.json_response({"blacklist": blacklist})

@PromptServer.instance.routes.post("/danbooru_gallery/blacklist")
async def save_blacklist_route(request):
    """保存黑名单"""
    try:
        data = await request.json()
        blacklist_items = data.get("blacklist", [])
        success = save_blacklist(blacklist_items)
        return web.json_response({"success": success})
    except Exception as e:
        print(f"[*] Danbooru Gallery: 保存黑名单接口错误: {e}")
        return web.json_response({"success": False, "error": str(e)})

@PromptServer.instance.routes.get("/danbooru_gallery/language")
async def get_language(request):
    """获取语言设置"""
    language = load_language()
    return web.json_response({"language": language})

@PromptServer.instance.routes.post("/danbooru_gallery/language")
async def save_language_route(request):
    """保存语言设置"""
    try:
        data = await request.json()
        language = data.get("language", "zh")
        success = save_language(language)
        return web.json_response({"success": success})
    except Exception as e:
        print(f"[*] Danbooru Gallery: 保存语言设置接口错误: {e}")
        return web.json_response({"success": False, "error": str(e)})

@PromptServer.instance.routes.get("/danbooru_gallery/filter_tags")
async def get_filter_tags(request):
    """获取提示词过滤设置"""
    filter_tags, filter_enabled = load_filter_tags()
    return web.json_response({"filter_tags": filter_tags, "filter_enabled": filter_enabled})

@PromptServer.instance.routes.post("/danbooru_gallery/filter_tags")
async def save_filter_tags_route(request):
    """保存提示词过滤设置"""
    try:
        data = await request.json()
        filter_tags = data.get("filter_tags", [])
        filter_enabled = data.get("filter_enabled", False)
        success = save_filter_tags(filter_tags, filter_enabled)
        return web.json_response({"success": success})
    except Exception as e:
        print(f"[*] Danbooru Gallery: 保存提示词过滤设置接口错误: {e}")
        return web.json_response({"success": False, "error": str(e)})


class DanbooruGalleryNode:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {},
            "optional": {},
            "hidden": {
                "selection_data": ("STRING", {"default": "{}", "multiline": True, "forceInput": True}),
            },
        }

    RETURN_TYPES = ("IMAGE", "STRING")
    RETURN_NAMES = ("image", "prompt")
    FUNCTION = "get_selected_data"
    CATEGORY = "Danbooru"
    OUTPUT_NODE = True

    @classmethod
    def IS_CHANGED(cls, selection_data="{}", **kwargs):
        return selection_data

    def get_selected_data(self, selection_data="{}", **kwargs):
        if not selection_data or selection_data == "{}":
            return (torch.zeros(1, 1, 1, 3), "")

        try:
            data = json.loads(selection_data)
            prompt = data.get("prompt", "")
            image_url = data.get("image_url")

            if image_url:
                with urllib.request.urlopen(image_url) as response:
                    img_data = response.read()
                
                img = Image.open(io.BytesIO(img_data)).convert("RGB")
                img_array = np.array(img).astype(np.float32) / 255.0
                tensor = torch.from_numpy(img_array)[None,]
                return (tensor, prompt)

        except Exception as e:
            print(f"DanbooruGallery: Error processing selection: {e}")

        return (torch.zeros(1, 1, 1, 3), "")
    
    @staticmethod
    def get_posts_internal(tags: str, limit: int = 100, page: int = 1, rating: str = None):
        posts_url = f"{BASE_URL}/posts.json"
        
        tag_list = [tag for tag in tags.split(' ') if tag.strip()]
        if len(tag_list) > 2:
            tag_list = tag_list[:2]
        tags = ' '.join(tag_list)

        if rating and rating.lower() != 'all':
            tags = f"{tags} rating:{rating}".strip()

        params = {
            "tags": tags.strip(),
            "limit": limit,
            "page": page,
        }
        
        try:
            response = requests.get(posts_url, params=params, timeout=10)
            response.raise_for_status()
            return (response.text,)
        except requests.exceptions.RequestException as e:
            print(f"[*] Danbooru Gallery: 网络请求时发生错误: {e}")
            return ("[]",)
        except Exception as e:
            print(f"[*] Danbooru Gallery: 发生未知错误: {e}")
            return ("[]",)

# ComfyUI 必须的字典
NODE_CLASS_MAPPINGS = {
    "DanbooruGalleryNode": DanbooruGalleryNode
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "DanbooruGalleryNode": "Danbooru Image Gallery"
}
