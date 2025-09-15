import server
from aiohttp import web
import json
import torch
from pybooru import Danbooru

class DanbooruGalleryNode:
    """A node that displays an in-node Danbooru image gallery."""
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                # This custom widget is defined and handled entirely in JS.
                "danbooru_gallery_widget": ("DANBOORU_WIDGET",), 
            },
            "hidden": {
                # This receives the selected image data from the JS widget.
                "selected_post_json": ("STRING", {"default": "{}", "multiline": True}),
            },
        }

    RETURN_TYPES = ("STRING", "STRING", "IMAGE", "STRING")
    RETURN_NAMES = ("positive_prompt", "negative_prompt", "image", "info")
    FUNCTION = "execute"
    CATEGORY = "📜Asset Gallery/Danbooru"
    OUTPUT_NODE = True

    def execute(self, danbooru_gallery_widget, selected_post_json="{}"):
        try:
            post = json.loads(selected_post_json)
        except json.JSONDecodeError:
            post = {}

        if not post or 'tag_string' not in post:
            return ("", "", torch.zeros(1, 1, 1, 3), "{}")

        tags = post.get('tag_string', '').split()
        pos = ", ".join(t for t in tags if not t.startswith('-'))
        neg = ", ".join(t.lstrip('-') for t in tags if t.startswith('-'))
        
        # Image is selected on the client, this node only passes metadata.
        image_tensor = torch.zeros(1, 1, 1, 3) 
        info_string = json.dumps(post, indent=2, ensure_ascii=False)

        return (pos, neg, image_tensor, info_string)

prompt_server = server.PromptServer.instance

@prompt_server.routes.get("/danbooru_gallery/posts")
async def get_danbooru_posts(request):
    """API endpoint to fetch posts. This is called by the JS frontend."""
    try:
        tags = request.query.get('tags', '1girl')
        page = int(request.query.get('page', '1'))
        rating = request.query.get('rating', 'g')
        
        client = Danbooru('danbooru')
        # Use a more specific query to ensure results
        posts = client.post_list(limit=50, page=page, tags=f"rating:{rating} {tags} order:rank")
        return web.json_response(posts)
    except Exception as e:
        print(f"[Danbooru Gallery] API Error: {e}")
        return web.json_response({"error": str(e)}, status=500)

NODE_CLASS_MAPPINGS = {"DanbooruGalleryNode": DanbooruGalleryNode}
NODE_DISPLAY_NAME_MAPPINGS = {"DanbooruGalleryNode": "Danbooru Gallery"}
