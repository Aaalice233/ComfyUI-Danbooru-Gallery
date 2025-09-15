import requests
import json
import folder_paths
from server import PromptServer
from aiohttp import web

# Danbooru API的基础URL
BASE_URL = "https://danbooru.donmai.us"

WEB_DIRECTORY = "./js"

@PromptServer.instance.routes.get("/danbooru_gallery/posts")
async def get_posts_for_front(request):
    """
    一个专门为前端图库服务的API端点。
    """
    query = request.query
    tags = query.get("search[tags]", "")
    page = query.get("page", "1")
    limit = query.get("limit", "100")
    rating = query.get("search[rating]", "")
    blacklisted_tags_str = query.get("blacklisted_tags", "")

    # 构建一个更精确的标签查询，包括评分
    # 前端现在直接发送 search[tags] 和 search[rating]，后端不需要再手动拼接
    # Danbooru API v1 通过独立的参数处理 tags 和 rating
    # 直接调用 get_posts_internal，认证逻辑已移入该函数
    posts_json_str, = DanbooruGalleryNode.get_posts_internal(tags=tags, limit=int(limit), page=int(page), rating=rating)
    
    # get_posts_internal 返回的是包含帖子的'JSON字符串'
    # 我们需要将其解析为Python列表，然后再将其作为JSON响应发送
    try:
        posts_list = json.loads(posts_json_str)
    except json.JSONDecodeError:
        posts_list = []

    if blacklisted_tags_str:
        blacklisted_tags = {tag.strip() for tag in blacklisted_tags_str.split(',') if tag.strip()}
        if blacklisted_tags:
            posts_list = [
                post for post in posts_list
                if not any(blacklisted_tag in post.get('tag_string', '').split() for blacklisted_tag in blacklisted_tags)
            ]

    return web.json_response(posts_list, headers={
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
    })


class DanbooruGalleryNode:
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {},
            "optional": {
                "blacklisted_tags": ("STRING", {"forceInput": True, "multiline": True, "default": ""}),
            }
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("image_urls",)
    FUNCTION = "get_posts"
    CATEGORY = "Danbooru"
    OUTPUT_NODE = True

    def get_posts(self, blacklisted_tags=""):
        # 黑名单输入不应该产生任何输出，它的作用是过滤图库中的内容。
        # 因此，我们返回空字符串。
        return ("",)

    @staticmethod
    def get_posts_internal(tags: str, limit: int = 100, page: int = 1, rating: str = None):
        """
        从 Danbooru API 获取帖子。
        这个方法是静态的，因为它不依赖于节点实例。
        """
        posts_url = f"{BASE_URL}/posts.json"
        # Since the rating is now passed directly, we can add it to the tags query
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
            
            # 直接返回原始JSON字符串，而不是解析它
            # 前端路由和节点输出可以按需解析
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

# (This space intentionally left blank to remove the problematic block)
