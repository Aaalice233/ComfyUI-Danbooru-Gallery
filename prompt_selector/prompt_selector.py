# -*- coding: utf-8 -*-

import os
import json
import folder_paths
from server import PromptServer
from aiohttp import web
import zipfile
import shutil
import io

# 插件目录
PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(PLUGIN_DIR, "data.json")
IMAGE_DIR = os.path.join(PLUGIN_DIR, "images")

class PromptSelector:
    """
    提示词选择器节点，用于管理和选择提示词。
    """
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                # 这个隐藏字段用于从前端接收最终的提示词字符串
                "selected_prompts": ("STRING", {"default": "", "widget": "hidden"}),
            },
            "optional": {
                "prefix_prompt": ("STRING", {"forceInput": True}),
            }
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("prompt",)
    FUNCTION = "execute"
    CATEGORY = "Danbooru" # 暂定，可以根据需要修改

    def __init__(self):
        # 确保图片目录存在
        if not os.path.exists(IMAGE_DIR):
            os.makedirs(IMAGE_DIR)

    def execute(self, **kwargs):
        prefix = kwargs.get("prefix_prompt", "")
        # 从前端获取选择的提示词
        selected_prompts_string = kwargs.get("selected_prompts", "")

        # 从 data.json 加载设置以获取分隔符
        separator = ", "
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                separator = data.get("settings", {}).get("separator", ", ")

        if prefix and selected_prompts_string:
            final_prompt = f"{prefix}{separator}{selected_prompts_string}"
        elif prefix:
            final_prompt = prefix
        else:
            final_prompt = selected_prompts_string

        return (final_prompt,)

# --- API 路由 ---

@PromptServer.instance.routes.get("/prompt_selector/data")
async def get_data(request):
    if not os.path.exists(DATA_FILE):
        return web.json_response({"error": "Data file not found"}, status=404)
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return web.json_response(data)
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)

@PromptServer.instance.routes.post("/prompt_selector/data")
async def save_data(request):
    try:
        data = await request.json()
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        return web.json_response({"success": True})
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)

@PromptServer.instance.routes.get("/prompt_selector/images/{filename}")
async def get_image(request):
    filename = request.match_info['filename']
    image_path = os.path.join(IMAGE_DIR, filename)
    
    # 安全检查，防止路径遍历
    if not os.path.abspath(image_path).startswith(os.path.abspath(IMAGE_DIR)):
        return web.Response(status=403)
        
    if os.path.exists(image_path):
        return web.FileResponse(image_path)
    return web.Response(status=404)

@PromptServer.instance.routes.post("/prompt_selector/import")
async def import_zip(request):
    post = await request.post()
    zip_file = post.get("zip_file")
    if not zip_file or not zip_file.file:
        return web.json_response({"error": "No file uploaded"}, status=400)

    try:
        with zipfile.ZipFile(zip_file.file, 'r') as zf:
            # 检查必要文件
            if 'data.json' not in zf.namelist():
                return web.json_response({"error": "ZIP file must contain data.json"}, status=400)
            
            # 提取 data.json
            with zf.open('data.json') as f:
                new_data = json.load(f)
            
            # 提取图片
            for member in zf.infolist():
                if member.filename.startswith('images/') and not member.is_dir():
                    target_path = os.path.join(IMAGE_DIR, os.path.basename(member.filename))
                    with zf.open(member) as source, open(target_path, 'wb') as target:
                        shutil.copyfileobj(source, target)
            
            # 覆盖 data.json
            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(new_data, f, ensure_ascii=False, indent=4)

        return web.json_response({"success": True})
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)

@PromptServer.instance.routes.get("/prompt_selector/export")
async def export_zip(request):
    try:
        memory_file = io.BytesIO()
        with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
            # 添加 data.json
            zf.write(DATA_FILE, arcname='data.json')
            # 添加图片
            if os.path.exists(IMAGE_DIR):
                for root, _, files in os.walk(IMAGE_DIR):
                    for file in files:
                        zf.write(os.path.join(root, file), arcname=os.path.join('images', file))
        
        memory_file.seek(0)
        return web.Response(
            body=memory_file.read(),
            content_type='application/zip',
            headers={'Content-Disposition': 'attachment; filename="prompt_library.zip"'}
        )
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)

# 确保在启动时 data.json 文件存在
if not os.path.exists(DATA_FILE):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump({
            "version": "1.0",
            "categories": [
                {
                    "name": "default",
                    "prompts": []
                }
            ],
            "settings": {
                "language": "zh-CN",
                "separator": ", "
            }
        }, f, ensure_ascii=False, indent=4)