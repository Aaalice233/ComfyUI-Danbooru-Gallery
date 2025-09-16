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
import logging
from requests.auth import HTTPBasicAuth

# 设置日志记录
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("DanbooruGallery")

# Danbooru API文档链接 https://danbooru.donmai.us/wiki_pages/help:api

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
        "filter_enabled": True,
        "danbooru_username": "",
        "danbooru_api_key": "",
        "favorites": [],
        "debug_mode": False,
        "cache_enabled": True,
        "max_cache_age": 3600,
        "default_page_size": 20,
        "autocomplete_enabled": True,
        "tooltip_enabled": True,
        "autocomplete_max_results": 20
    }
    
    try:
        if os.path.exists(SETTINGS_FILE):
            with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for key, value in default_settings.items():
                    if key not in data:
                        data[key] = value
                return data
    except Exception as e:
        logger.error(f"加载设置失败: {e}")
    
    return default_settings

def save_settings(settings):
    """保存所有设置到本地文件"""
    try:
        with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
            json.dump(settings, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        logger.error(f"保存设置失败: {e}")
        return False

def load_user_auth():
    """从统一设置文件加载用户认证信息"""
    settings = load_settings()
    return settings.get("danbooru_username", ""), settings.get("danbooru_api_key", "")

def save_user_auth(username, api_key):
    """保存用户认证信息到统一设置文件"""
    settings = load_settings()
    settings["danbooru_username"] = username
    settings["danbooru_api_key"] = api_key
    return save_settings(settings)

def load_favorites():
    """从统一设置文件加载收藏列表"""
    settings = load_settings()
    return settings.get("favorites", [])

def save_favorites(favorites):
    """保存收藏列表到统一设置文件"""
    settings = load_settings()
    settings["favorites"] = favorites
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

def load_blacklist():
    """从统一设置文件加载黑名单"""
    settings = load_settings()
    return settings.get("blacklist", [])

def save_blacklist(blacklist_items):
    """保存黑名单到统一设置文件"""
    settings = load_settings()
    settings["blacklist"] = blacklist_items
    return save_settings(settings)

def load_filter_tags():
    """从统一设置文件加载提示词过滤设置"""
    settings = load_settings()
    return settings.get("filter_tags", []), settings.get("filter_enabled", True)

def save_filter_tags(filter_tags, enabled):
    """保存提示词过滤设置到统一设置文件"""
    settings = load_settings()
    settings["filter_tags"] = filter_tags
    settings["filter_enabled"] = enabled
    return save_settings(settings)

def load_ui_settings():
    """从统一设置文件加载UI设置"""
    settings = load_settings()
    return {
        "autocomplete_enabled": settings.get("autocomplete_enabled", True),
        "tooltip_enabled": settings.get("tooltip_enabled", True),
        "autocomplete_max_results": settings.get("autocomplete_max_suggestions", 20)
    }

def save_ui_settings(ui_settings):
    """保存UI设置到统一设置文件"""
    settings = load_settings()
    settings["autocomplete_enabled"] = ui_settings.get("autocomplete_enabled", True)
    settings["tooltip_enabled"] = ui_settings.get("tooltip_enabled", True)
    settings["autocomplete_max_suggestions"] = ui_settings.get("autocomplete_max_results", 20)
    return save_settings(settings)

def check_network_connection():
    """检测与Danbooru的网络连接状态"""
    try:
        # 使用一个简单的公开API端点来检测连接
        test_url = f"{BASE_URL}/posts.json?limit=1"
        response = requests.get(test_url, timeout=10)
        return response.status_code == 200, False
    except requests.exceptions.Timeout:
        logger.error("网络连接超时")
        return False, True
    except requests.exceptions.RequestException as e:
        logger.error(f"网络连接失败: {e}")
        return False, True
    except Exception as e:
        logger.error(f"网络检测发生未知错误: {e}")
        return False, True

def verify_danbooru_auth(username, api_key):
    """验证Danbooru用户认证"""
    if not username or not api_key:
        return False, False
    try:
        test_url = f"{BASE_URL}/profile.json"
        response = requests.get(test_url, auth=HTTPBasicAuth(username, api_key), timeout=15)
        is_valid = response.status_code == 200
        return is_valid, False
    except Exception as e:
        logger.error(f"验证用户认证失败: {e}")
        return False, True

def get_user_favorites(username, api_key):
    """获取用户的收藏列表"""
    try:
        favorites_url = f"{BASE_URL}/favorites.json"
        response = requests.get(favorites_url, auth=HTTPBasicAuth(username, api_key), timeout=15)
        if response.status_code == 200:
            return response.json()
        return []
    except Exception as e:
        logger.error(f"获取用户收藏列表失败: {e}")
        return []

# --- 省略其他不相关的路由和函数以保持简洁 ---

@PromptServer.instance.routes.post("/danbooru_gallery/favorites/add")
async def add_favorite(request):
    """添加收藏"""
    try:
        data = await request.json()
        post_id = data.get("post_id")

        if not post_id:
            return web.json_response({"success": False, "error": "缺少post_id"})

        username, api_key = load_user_auth()
        if not username or not api_key:
            return web.json_response({"success": False, "error": "请先在设置中配置用户名和API Key"})

        # 验证认证
        is_valid, is_network_error = verify_danbooru_auth(username, api_key)
        if is_network_error:
            return web.json_response({"success": False, "error": "网络错误，无法连接到Danbooru服务器"})
        if not is_valid:
            return web.json_response({"success": False, "error": "认证无效，请检查用户名和API Key"})

        try:
            favorite_url = f"{BASE_URL}/favorites.json"
            response = requests.post(
                favorite_url,
                auth=HTTPBasicAuth(username, api_key),
                data={"post_id": post_id},
                timeout=15
            )

            logger.info(f"添加收藏 API 状态码: {response.status_code}")
            logger.info(f"添加收藏 API 响应内容: {response.text[:500]}")

            if response.status_code in [200, 201]:
                favorites = load_favorites()
                if str(post_id) not in favorites:
                    favorites.append(str(post_id))
                    save_favorites(favorites)
                return web.json_response({"success": True, "message": "收藏成功"})
            
            try:
                error_data = response.json()
                reason = error_data.get("reason", "未知")
                message = error_data.get("message", "没有提供具体信息")
            except (json.JSONDecodeError, ValueError):
                error_data = {}
                reason = "无法解析响应"
                message = response.text

            if response.status_code == 422 and "You have already favorited this post" in message:
                favorites = load_favorites()
                if str(post_id) not in favorites:
                    favorites.append(str(post_id))
                    save_favorites(favorites)
                return web.json_response({"success": True, "message": "已收藏，无需重复操作"})
                
            error_map = {
                401: "认证失败，请检查用户名和API Key",
                403: "权限不足，可能需要Gold账户或更高权限",
                404: "图片不存在",
                429: "请求过于频繁，请稍后重试 (Rate Limited)",
            }
            
            error_message = error_map.get(response.status_code, f"收藏失败，状态码: {response.status_code}, 原因: {message}")
            logger.error(error_message)
            return web.json_response({"success": False, "error": error_message})

        except requests.exceptions.Timeout:
            logger.error("添加收藏时网络请求超时")
            return web.json_response({"success": False, "error": "网络请求超时"})
        except requests.exceptions.RequestException as e:
            logger.error(f"添加收藏时网络请求失败: {e}")
            return web.json_response({"success": False, "error": f"网络请求失败: {e}"})
        except Exception as e:
            import traceback
            logger.error(f"添加收藏时发生严重错误: {e}")
            logger.error(traceback.format_exc())
            return web.json_response({"success": False, "error": f"服务器内部错误: {e}"}, status=500)

    except Exception as e:
        logger.error(f"添加收藏接口错误: {e}")
        return web.json_response({"success": False, "error": str(e)}, status=500)

@PromptServer.instance.routes.post("/danbooru_gallery/favorites/remove")
async def remove_favorite(request):
    """移除收藏"""
    logger.info("收到取消收藏请求")
    try:
        data = await request.json()
        post_id = data.get("post_id")
        logger.info(f"post_id: {post_id}")

        if not post_id:
            return web.json_response({"success": False, "error": "缺少post_id"})
        
        username, api_key = load_user_auth()
        if not username or not api_key:
            return web.json_response({"success": False, "error": "请先在设置中配置用户名和API Key"})

        # 验证认证
        is_valid, is_network_error = verify_danbooru_auth(username, api_key)
        if is_network_error:
            return web.json_response({"success": False, "error": "网络错误，无法连接到Danbooru服务器"})
        if not is_valid:
            return web.json_response({"success": False, "error": "认证无效，请检查用户名和API Key"})
        
        try:
            # 直接使用帖子ID删除收藏
            delete_url = f"{BASE_URL}/favorites/{post_id}.json"
            delete_response = requests.delete(delete_url, auth=HTTPBasicAuth(username, api_key), timeout=15)

            logger.info(f"删除收藏 API 状态码: {delete_response.status_code}")
            logger.info(f"删除收藏 API 响应: {delete_response.text[:500]}")

            if delete_response.status_code in [200, 204]:
                favorites = load_favorites()
                if str(post_id) in favorites:
                    favorites.remove(str(post_id))
                    save_favorites(favorites)
                return web.json_response({"success": True, "message": "取消收藏成功"})
            elif delete_response.status_code == 404:
                # 如果收藏不存在，视为已删除
                favorites = load_favorites()
                if str(post_id) in favorites:
                    favorites.remove(str(post_id))
                    save_favorites(favorites)
                return web.json_response({"success": True, "message": "该图片未在云端收藏，本地已同步"})

            # 如果有收藏记录但删除失败，解析错误
            try:
                error_data = delete_response.json()
                reason = error_data.get("reason", "未知")
                message = error_data.get("message", "没有提供具体信息")
            except (json.JSONDecodeError, ValueError):
                error_data = {}
                reason = "无法解析响应"
                message = delete_response.text

            error_map = {
                401: "认证失败，请检查用户名和API Key",
                403: "权限不足，可能需要Gold账户",
                404: "收藏记录不存在",
                429: "请求过于频繁，请稍后重试 (Rate Limited)",
            }

            error_message = error_map.get(delete_response.status_code, f"取消收藏失败，状态码: {delete_response.status_code}, 原因: {message}")
            logger.error(error_message)
            return web.json_response({"success": False, "error": error_message})

        except requests.exceptions.Timeout:
            logger.error("移除收藏时网络请求超时")
            return web.json_response({"success": False, "error": "网络请求超时"})
        except requests.exceptions.RequestException as e:
            logger.error(f"移除收藏时网络请求失败: {e}")
            return web.json_response({"success": False, "error": f"网络请求失败: {e}"})
        except Exception as e:
            import traceback
            logger.error(f"移除收藏时发生严重错误: {e}")
            logger.error(traceback.format_exc())
            return web.json_response({"success": False, "error": f"服务器内部错误: {e}"}, status=500)

    except Exception as e:
        logger.error(f"移除收藏接口错误: {e}")
        return web.json_response({"success": False, "error": str(e)}, status=500)

@PromptServer.instance.routes.get("/danbooru_gallery/user_auth")
async def get_user_auth_route(request):
    """获取用户认证信息"""
    try:
        username, api_key = load_user_auth()
        has_auth = bool(username and api_key)
        return web.json_response({"success": True, "username": username, "api_key": api_key, "has_auth": has_auth})
    except Exception as e:
        logger.error(f"获取用户认证接口错误: {e}")
        return web.json_response({"success": False, "error": str(e)}, status=500)

@PromptServer.instance.routes.get("/danbooru_gallery/favorites")
async def get_favorites_route(request):
    """获取收藏列表"""
    try:
        favorites = load_favorites()
        return web.json_response({"success": True, "favorites": favorites})
    except Exception as e:
        logger.error(f"获取收藏列表接口错误: {e}")
        return web.json_response({"success": False, "error": str(e)}, status=500)

@PromptServer.instance.routes.post("/danbooru_gallery/user_auth")
async def save_user_auth_route(request):
    """保存用户认证信息"""
    try:
        data = await request.json()
        username = data.get("username", "")
        api_key = data.get("api_key", "")
        if save_user_auth(username, api_key):
            return web.json_response({"success": True})
        else:
            return web.json_response({"success": False, "error": "无法保存用户认证信息"}, status=500)
    except Exception as e:
        logger.error(f"保存用户认证接口错误: {e}")
        return web.json_response({"success": False, "error": str(e)}, status=500)

@PromptServer.instance.routes.get("/danbooru_gallery/check_network")
async def check_network(request):
    """检测网络连接状态"""
    try:
        is_connected, is_network_error = check_network_connection()
        return web.json_response({"success": True, "connected": is_connected, "network_error": is_network_error})
    except Exception as e:
        logger.error(f"网络检测接口错误: {e}")
        return web.json_response({"success": False, "error": "网络检测失败", "network_error": True}, status=500)

@PromptServer.instance.routes.post("/danbooru_gallery/verify_auth")
async def verify_auth(request):
    """验证用户认证"""
    try:
        data = await request.json()
        username = data.get("username", "")
        api_key = data.get("api_key", "")

        if not username or not api_key:
            return web.json_response({"success": False, "error": "缺少用户名或API Key"})

        is_valid, is_network_error = verify_danbooru_auth(username, api_key)
        return web.json_response({"success": True, "valid": is_valid, "network_error": is_network_error})
    except Exception as e:
        logger.error(f"验证认证接口错误: {e}")
        return web.json_response({"success": False, "error": "网络错误", "network_error": True}, status=500)

# --- 保留文件中剩余的其他部分 ---
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

@PromptServer.instance.routes.get("/danbooru_gallery/autocomplete")
async def get_autocomplete(request):
    """代理 Danbooru 的 autocomplete.json API"""
    try:
        query = request.query.get("query", "")
        limit = request.query.get("limit", "20")

        if not query:
            return web.json_response([], status=400)

        # 改用 /tags.json 以获得更好的模糊匹配
        tags_url = f"{BASE_URL}/tags.json"
        # 使用 name_matches 参数进行模糊匹配
        params = {
            "search[name_matches]": f"{query}*",
            "limit": limit
        }
        
        username, api_key = load_user_auth()
        auth = HTTPBasicAuth(username, api_key) if username and api_key else None
        
        response = requests.get(tags_url, params=params, auth=auth, timeout=10)
        response.raise_for_status()
        
        return web.json_response(response.json())

    except requests.exceptions.RequestException as e:
        logger.error(f"调用 Danbooru autocomplete API 失败: {e}")
        return web.json_response({"error": "Failed to fetch autocomplete data from Danbooru"}, status=502)
    except Exception as e:
        logger.error(f"处理 autocomplete 请求时发生错误: {e}")
        return web.json_response({"error": "Internal server error"}, status=500)

@PromptServer.instance.routes.get("/danbooru_gallery/blacklist")
async def get_blacklist(request):
    blacklist = load_blacklist()
    return web.json_response({"blacklist": blacklist})

@PromptServer.instance.routes.post("/danbooru_gallery/blacklist")
async def save_blacklist_route(request):
    try:
        data = await request.json()
        blacklist_items = data.get("blacklist", [])
        success = save_blacklist(blacklist_items)
        return web.json_response({"success": success})
    except Exception as e:
        logger.error(f"保存黑名单接口错误: {e}")
        return web.json_response({"success": False, "error": str(e)})

@PromptServer.instance.routes.get("/danbooru_gallery/language")
async def get_language(request):
    language = load_language()
    return web.json_response({"language": language})

@PromptServer.instance.routes.post("/danbooru_gallery/language")
async def save_language_route(request):
    try:
        data = await request.json()
        language = data.get("language", "zh")
        success = save_language(language)
        return web.json_response({"success": success})
    except Exception as e:
        logger.error(f"保存语言设置接口错误: {e}")
        return web.json_response({"success": False, "error": str(e)})

@PromptServer.instance.routes.get("/danbooru_gallery/filter_tags")
async def get_filter_tags(request):
    filter_tags, filter_enabled = load_filter_tags()
    return web.json_response({"filter_tags": filter_tags, "filter_enabled": filter_enabled})

@PromptServer.instance.routes.post("/danbooru_gallery/filter_tags")
async def save_filter_tags_route(request):
    try:
        data = await request.json()
        filter_tags = data.get("filter_tags", [])
        filter_enabled = data.get("filter_enabled", False)
        success = save_filter_tags(filter_tags, filter_enabled)
        return web.json_response({"success": success})
    except Exception as e:
        logger.error(f"保存提示词过滤设置接口错误: {e}")
        return web.json_response({"success": False, "error": str(e)})

@PromptServer.instance.routes.get("/danbooru_gallery/ui_settings")
async def get_ui_settings(request):
    try:
        ui_settings = load_ui_settings()
        return web.json_response({
            "success": True,
            "settings": ui_settings
        })
    except Exception as e:
        logger.error(f"获取UI设置接口错误: {e}")
        return web.json_response({"success": False, "error": str(e)})

@PromptServer.instance.routes.post("/danbooru_gallery/ui_settings")
async def save_ui_settings_route(request):
    try:
        data = await request.json()
        ui_settings = {
            "autocomplete_enabled": data.get("autocomplete_enabled", True),
            "tooltip_enabled": data.get("tooltip_enabled", True),
            "autocomplete_max_results": data.get("autocomplete_max_results", 20)
        }
        success = save_ui_settings(ui_settings)
        return web.json_response({"success": success})
    except Exception as e:
        logger.error(f"保存UI设置接口错误: {e}")
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
            logger.error(f"Error processing selection: {e}")

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
        
        username, api_key = load_user_auth()
        auth = HTTPBasicAuth(username, api_key) if username and api_key else None

        params = {
            "tags": tags.strip(),
            "limit": limit,
            "page": page,
        }
        
        try:
            response = requests.get(posts_url, params=params, auth=auth, timeout=15)
            response.raise_for_status()
            return (response.text,)
        except requests.exceptions.RequestException as e:
            logger.error(f"网络请求时发生错误: {e}")
            return ("[]",)
        except Exception as e:
            logger.error(f"发生未知错误: {e}")
            return ("[]",)

# ComfyUI 必须的字典
def get_node_class_mappings():
    return {
        "DanbooruGalleryNode": DanbooruGalleryNode
    }

def get_node_display_name_mappings():
    return {
        "DanbooruGalleryNode": "Danbooru Image Gallery"
    }

NODE_CLASS_MAPPINGS = get_node_class_mappings()
NODE_DISPLAY_NAME_MAPPINGS = get_node_display_name_mappings()

WEB_DIRECTORY = "./js"
