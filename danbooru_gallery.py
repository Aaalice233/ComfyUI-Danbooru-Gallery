"""
ComfyUI Danbooru Gallery Node
基于 Danbooru API 的图像搜索和画廊插件
"""

import server
from aiohttp import web
import aiohttp
import os
import json
import torch
import numpy as np
from PIL import Image
import io
import urllib.request
import time
import folder_paths
import asyncio
from pybooru import Danbooru
import hashlib
from typing import Dict, List, Optional, Any

# 全局变量
download_tasks = {}

# 插件目录和配置文件
NODE_DIR = os.path.dirname(os.path.abspath(__file__))
UI_STATE_FILE = os.path.join(NODE_DIR, "danbooru_ui_state.json")
FAVORITES_FILE = os.path.join(NODE_DIR, "danbooru_favorites.json")
CONFIG_FILE = os.path.join(NODE_DIR, "danbooru_config.json")
CACHE_DIR = os.path.join(NODE_DIR, "cache")
IMAGE_CACHE_DIR = os.path.join(CACHE_DIR, "images")

# 确保缓存目录存在
os.makedirs(CACHE_DIR, exist_ok=True)
os.makedirs(IMAGE_CACHE_DIR, exist_ok=True)

def load_config() -> Dict[str, Any]:
    """加载配置文件"""
    if not os.path.exists(CONFIG_FILE):
        return {}
    try:
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"DanbooruGallery: Error loading config: {e}")
        return {}

def save_config(data: Dict[str, Any]) -> None:
    """保存配置文件"""
    try:
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
    except Exception as e:
        print(f"DanbooruGallery: Error saving config: {e}")

def load_ui_state() -> Dict[str, Any]:
    """加载UI状态"""
    if not os.path.exists(UI_STATE_FILE):
        return {}
    try:
        with open(UI_STATE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"DanbooruGallery: Error loading UI state: {e}")
        return {}

def save_ui_state(data: Dict[str, Any]) -> None:
    """保存UI状态"""
    try:
        with open(UI_STATE_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
    except Exception as e:
        print(f"DanbooruGallery: Error saving UI state: {e}")

def load_favorites() -> Dict[str, Any]:
    """加载收藏夹"""
    if not os.path.exists(FAVORITES_FILE):
        return {}
    try:
        with open(FAVORITES_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"DanbooruGallery: Error loading favorites: {e}")
        return {}

def save_favorites(data: Dict[str, Any]) -> None:
    """保存收藏夹"""
    try:
        with open(FAVORITES_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
    except Exception as e:
        print(f"DanbooruGallery: Error saving favorites: {e}")

def get_cache_key(tags: str, page: int = 1, limit: int = 20) -> str:
    """生成缓存键"""
    content = f"{tags}_{page}_{limit}"
    return hashlib.md5(content.encode()).hexdigest()

def get_cached_result(cache_key: str) -> Optional[Dict[str, Any]]:
    """获取缓存结果"""
    cache_file = os.path.join(CACHE_DIR, f"{cache_key}.json")
    if not os.path.exists(cache_file):
        return None

    # 检查缓存是否过期（1小时）
    if time.time() - os.path.getmtime(cache_file) > 3600:
        os.remove(cache_file)
        return None

    try:
        with open(cache_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return None

def save_cache_result(cache_key: str, data: Dict[str, Any]) -> None:
    """保存缓存结果"""
    cache_file = os.path.join(CACHE_DIR, f"{cache_key}.json")
    try:
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
    except Exception as e:
        print(f"DanbooruGallery: Error saving cache: {e}")

def get_image_cache_path(image_url: str) -> str:
    """获取图像缓存路径"""
    url_hash = hashlib.md5(image_url.encode()).hexdigest()
    return os.path.join(IMAGE_CACHE_DIR, f"{url_hash}.jpg")

class DanbooruGalleryNode:
    """Danbooru 画廊节点"""

    @classmethod
    def IS_CHANGED(cls, selection_data, **kwargs):
        return selection_data

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {},
            "hidden": {
                "unique_id": "UNIQUE_ID",
                "selection_data": ("STRING", {"default": "{}", "multiline": True, "forceInput": True}),
                "danbooru_gallery_unique_id_widget": ("STRING", {"default": "", "multiline": False}),
            },
        }

    RETURN_TYPES = ("STRING", "STRING", "IMAGE", "STRING")
    RETURN_NAMES = ("positive_prompt", "negative_prompt", "image", "info")
    FUNCTION = "get_selected_data"
    CATEGORY = "📜Asset Gallery/Danbooru"

    def get_selected_data(self, unique_id, danbooru_gallery_unique_id_widget="", selection_data="{}"):
        """获取选中的数据"""
        try:
            node_selection = json.loads(selection_data)
        except:
            node_selection = {}

        item_data = node_selection.get("item", {})
        should_download = node_selection.get("download_image", False)

        # 解析图像数据
        image_url = item_data.get("file_url", "")
        tags = item_data.get("tag_string", "")
        info_dict = {
            "id": item_data.get("id", ""),
            "tags": tags,
            "source": item_data.get("source", ""),
            "rating": item_data.get("rating", ""),
            "score": item_data.get("score", 0),
            "created_at": item_data.get("created_at", "")
        }

        # 提取正向和负向提示词
        positive_tags = []
        negative_tags = []

        for tag in tags.split():
            if tag.startswith("-"):
                negative_tags.append(tag[1:])  # 移除负号
            else:
                positive_tags.append(tag)

        pos_prompt = ", ".join(positive_tags)
        neg_prompt = ", ".join(negative_tags)
        info_string = json.dumps(info_dict, indent=4, ensure_ascii=False)

        # 处理图像下载
        tensor = torch.zeros(1, 1, 1, 3)
        if should_download and image_url:
            print("DanbooruGallery: Downloading image...")
            try:
                # 检查缓存
                cache_path = get_image_cache_path(image_url)
                if os.path.exists(cache_path):
                    img = Image.open(cache_path).convert("RGB")
                else:
                    req = urllib.request.Request(image_url, headers={'User-Agent': 'Mozilla/5.0'})
                    with urllib.request.urlopen(req, timeout=30) as response:
                        img_data = response.read()
                    img = Image.open(io.BytesIO(img_data)).convert("RGB")

                    # 保存到缓存
                    img.save(cache_path, "JPEG", quality=95)

                img_array = np.array(img).astype(np.float32) / 255.0
                tensor = torch.from_numpy(img_array)[None,]

            except Exception as e:
                print(f"DanbooruGallery: Failed to download/process image: {e}")

        return (pos_prompt, neg_prompt, tensor, info_string)

# API 路由设置
prompt_server = server.PromptServer.instance

@prompt_server.routes.get("/danbooru_gallery/posts")
async def get_danbooru_posts(request):
    """获取 Danbooru 图像列表"""
    try:
        # 获取查询参数
        tags = request.query.get('tags', '').strip()
        page = int(request.query.get('page', '1'))
        limit = int(request.query.get('limit', '20'))
        rating = request.query.get('rating', 'all')  # safe, questionable, explicit, all

        print(f"DanbooruGallery: API called with params - tags: '{tags}', page: {page}, limit: {limit}, rating: {rating}")

        # 检查缓存
        cache_key = get_cache_key(tags, page, limit)
        cached_result = get_cached_result(cache_key)
        if cached_result:
            print(f"DanbooruGallery: Returning cached result for key: {cache_key}")
            return web.json_response(cached_result)

        # 初始化 Danbooru 客户端
        config = load_config()
        username = config.get("danbooru_username")
        api_key = config.get("danbooru_api_key")

        if username and api_key:
            client = Danbooru('danbooru', username=username, api_key=api_key)
        else:
            client = Danbooru('danbooru')

        # 构建查询参数
        params = {
            'limit': limit,
            'page': page
        }

        if tags:
            params['tags'] = tags

        if rating != 'all':
            params['rating'] = rating

        # 获取数据
        print(f"DanbooruGallery: Making API request to Danbooru with params: {params}")
        posts = client.post_list(**params)
        print(f"DanbooruGallery: Received {len(posts)} posts from API")

        # 处理响应数据
        processed_posts = []
        for i, post in enumerate(posts):
            processed_post = {
                'id': post.get('id'),
                'file_url': post.get('file_url'),
                'preview_file_url': post.get('preview_file_url'),
                'tag_string': post.get('tag_string', ''),
                'rating': post.get('rating'),
                'score': post.get('score', 0),
                'created_at': post.get('created_at'),
                'source': post.get('source', ''),
                'width': post.get('width', 0),
                'height': post.get('height', 0)
            }
            processed_posts.append(processed_post)

            if i < 3:  # 只打印前3个帖子的详细信息
                print(f"DanbooruGallery: Post {i+1} - ID: {processed_post['id']}, Rating: {processed_post['rating']}, Has Image: {bool(processed_post['file_url'])}")

        result = {
            'posts': processed_posts,
            'pagination': {
                'page': page,
                'limit': limit,
                'has_more': len(posts) == limit
            }
        }

        print(f"DanbooruGallery: Processed {len(processed_posts)} posts, has_more: {result['pagination']['has_more']}")

        # 保存缓存
        save_cache_result(cache_key, result)
        print(f"DanbooruGallery: Saved result to cache with key: {cache_key}")

        return web.json_response(result)

    except Exception as e:
        print(f"DanbooruGallery: Error fetching posts: {e}")
        return web.json_response({"error": str(e)}, status=500)

@prompt_server.routes.get("/danbooru_gallery/tags")
async def get_danbooru_tags(request):
    """获取标签建议"""
    try:
        query = request.query.get('q', '').strip()
        limit = int(request.query.get('limit', '10'))

        if not query:
            return web.json_response({"tags": []})

        # 初始化客户端
        config = load_config()
        username = config.get("danbooru_username")
        api_key = config.get("danbooru_api_key")

        if username and api_key:
            client = Danbooru('danbooru', username=username, api_key=api_key)
        else:
            client = Danbooru('danbooru')

        # 获取标签
        tags = client.tag_list(name=query, limit=limit)

        processed_tags = []
        for tag in tags:
            processed_tag = {
                'name': tag.get('name'),
                'category': tag.get('category'),
                'post_count': tag.get('post_count', 0)
            }
            processed_tags.append(processed_tag)

        return web.json_response({"tags": processed_tags})

    except Exception as e:
        print(f"DanbooruGallery: Error fetching tags: {e}")
        return web.json_response({"error": str(e)}, status=500)

@prompt_server.routes.post("/danbooru_gallery/set_ui_state")
async def set_danbooru_ui_state(request):
    """设置UI状态"""
    try:
        data = await request.json()
        node_id = str(data.get("node_id"))
        gallery_id = data.get("gallery_id")
        state = data.get("state")

        if not node_id or not gallery_id or state is None:
            return web.json_response({"status": "error", "message": "Missing required data"}, status=400)

        node_key = f"{gallery_id}_{node_id}"
        ui_states = load_ui_state()
        ui_states[node_key] = state
        save_ui_state(ui_states)

        return web.json_response({"status": "ok"})

    except Exception as e:
        return web.json_response({"status": "error", "message": str(e)}, status=500)

@prompt_server.routes.get("/danbooru_gallery/get_ui_state")
async def get_danbooru_ui_state(request):
    """获取UI状态"""
    try:
        node_id = request.query.get('node_id')
        gallery_id = request.query.get('gallery_id')

        if not node_id or not gallery_id:
            return web.json_response({})

        node_key = f"{gallery_id}_{node_id}"
        ui_states = load_ui_state()
        return web.json_response(ui_states.get(node_key, {}))

    except Exception as e:
        return web.json_response({"status": "error", "message": str(e)}, status=500)

@prompt_server.routes.post("/danbooru_gallery/toggle_favorite")
async def toggle_danbooru_favorite(request):
    """切换收藏状态"""
    try:
        data = await request.json()
        item = data.get("item")

        if not item or 'id' not in item:
            return web.json_response({"status": "error", "message": "Invalid item data"}, status=400)

        item_id = str(item['id'])
        favorites = load_favorites()

        if item_id in favorites:
            del favorites[item_id]
            status = "removed"
        else:
            favorites[item_id] = item
            status = "added"

        save_favorites(favorites)
        return web.json_response({"status": status})

    except Exception as e:
        return web.json_response({"status": "error", "message": str(e)}, status=500)

@prompt_server.routes.get("/danbooru_gallery/get_favorites")
async def get_danbooru_favorites(request):
    """获取收藏夹"""
    try:
        page = int(request.query.get('page', '1'))
        limit = int(request.query.get('limit', '20'))

        favorites = load_favorites()
        items = list(favorites.values())

        total_items = len(items)
        start_index = (page - 1) * limit
        end_index = start_index + limit

        paginated_items = items[start_index:end_index]

        response_data = {
            "items": paginated_items,
            "pagination": {
                "totalItems": total_items,
                "currentPage": page,
                "pageSize": limit,
                "totalPages": (total_items + limit - 1) // limit
            }
        }

        return web.json_response(response_data)

    except Exception as e:
        print(f"DanbooruGallery: get_favorites error: {e}")
        return web.json_response({"error": str(e)}, status=500)

@prompt_server.routes.post("/danbooru_gallery/save_credentials")
async def save_danbooru_credentials(request):
    """保存 Danbooru 凭据"""
    try:
        data = await request.json()
        username = data.get("username", "").strip()
        api_key = data.get("api_key", "").strip()

        config = load_config()
        config["danbooru_username"] = username
        config["danbooru_api_key"] = api_key
        save_config(config)

        return web.json_response({"status": "success"})

    except Exception as e:
        return web.json_response({"status": "error", "message": str(e)}, status=500)

@prompt_server.routes.get("/danbooru_gallery/test_connection")
async def test_danbooru_connection(request):
    """测试 Danbooru 连接"""
    try:
        config = load_config()
        username = config.get("danbooru_username")
        api_key = config.get("danbooru_api_key")

        if username and api_key:
            client = Danbooru('danbooru', username=username, api_key=api_key)
        else:
            client = Danbooru('danbooru')

        # 测试连接 - 获取少量数据
        test_posts = client.post_list(limit=1)

        return web.json_response({
            "status": "success",
            "message": "Connection successful",
            "has_credentials": bool(username and api_key)
        })

    except Exception as e:
        return web.json_response({
            "status": "error",
            "message": str(e),
            "has_credentials": bool(config.get("danbooru_username") and config.get("danbooru_api_key"))
        }, status=500)

# 节点映射
NODE_CLASS_MAPPINGS = {
    "DanbooruGalleryNode": DanbooruGalleryNode
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "DanbooruGalleryNode": "Danbooru Images Gallery"
}