import requests
import json
import folder_paths
from server import PromptServer
from aiohttp import web
import time
import torch
import io
import urllib.request
import numpy as np
from PIL import Image

# Danbooru API的基础URL
BASE_URL = "https://danbooru.donmai.us"

@PromptServer.instance.routes.get("/danbooru_gallery/posts")
async def get_posts_for_front(request):
    query = request.query
    tags = query.get("search[tags]", "")
    page = query.get("page", "1")
    limit = query.get("limit", "100")
    rating = query.get("search[rating]", "")
    blacklisted_tags_str = query.get("blacklisted_tags", "")

    posts_json_str, = DanbooruGalleryNode.get_posts_internal(tags=tags, limit=int(limit), page=int(page), rating=rating, blacklisted_tags_str=blacklisted_tags_str)
    
    try:
        posts_list = json.loads(posts_json_str)
    except json.JSONDecodeError:
        posts_list = []

    return web.json_response(posts_list, headers={
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
    })


class DanbooruGalleryNode:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {},
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
    def get_posts_internal(tags: str, limit: int = 100, page: int = 1, rating: str = None, blacklisted_tags_str: str = ""):
        posts_url = f"{BASE_URL}/posts.json"
        
        tag_list = [tag for tag in tags.split(' ') if tag.strip()]
        if len(tag_list) > 2:
            tag_list = tag_list[:2]
        tags = ' '.join(tag_list)

        if blacklisted_tags_str:
            blacklisted_tags = {f"-{tag.strip()}" for tag in blacklisted_tags_str.split(',') if tag.strip()}
            tags = f"{tags} {' '.join(blacklisted_tags)}".strip()

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
