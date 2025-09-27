# -*- coding: utf-8 -*-

import os
import json
import folder_paths
from server import PromptServer
from aiohttp import web
import zipfile
import shutil
import io
import time
import uuid
from datetime import datetime

# 插件目录
# 插件目录
PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
# The root directory of the custom node
CUSTOM_NODE_DIR = os.path.abspath(os.path.join(PLUGIN_DIR, '..'))
DATA_FILE = os.path.join(PLUGIN_DIR, "data.json")
PREVIEW_DIR = os.path.join(PLUGIN_DIR, "preview")

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
        # 确保预览图片目录存在
        if not os.path.exists(PREVIEW_DIR):
            os.makedirs(PREVIEW_DIR)

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
        print(f"[PromptSelector] Attempting to save data: {json.dumps(data, indent=2)}") # 添加日志
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        
        print("[PromptSelector] Data saved successfully.") # 添加日志
        return web.json_response({"success": True})
    except Exception as e:
        print(f"[PromptSelector] Error saving data: {e}") # 添加日志
        return web.json_response({"error": str(e)}, status=500)

@PromptServer.instance.routes.get("/prompt_selector/preview/{filename}")
async def get_preview_image(request):
    filename = request.match_info['filename']
    image_path = os.path.join(PREVIEW_DIR, filename)
    
    # 安全检查，防止路径遍历
    if not os.path.abspath(image_path).startswith(os.path.abspath(PREVIEW_DIR)):
        return web.Response(status=403)
        
    if os.path.exists(image_path):
        return web.FileResponse(image_path)
    return web.Response(status=404)

@PromptServer.instance.routes.post("/prompt_selector/upload_image")
async def upload_image(request):
    post = await request.post()
    image_file = post.get("image")
    alias = post.get("alias", "")

    if not image_file or not image_file.file:
        return web.json_response({"error": "No image file uploaded"}, status=400)

    if not os.path.exists(PREVIEW_DIR):
        os.makedirs(PREVIEW_DIR)

    _, file_extension = os.path.splitext(image_file.filename)
    if not file_extension:
        file_extension = '.png'

    # Sanitize the alias to create a valid filename
    sanitized_alias = "".join(c for c in alias if c.isalnum() or c in (' ', '_')).rstrip()
    if not sanitized_alias:
        sanitized_alias = "untitled"

    # Create a unique filename based on alias and timestamp
    timestamp = int(time.time())
    unique_filename = f"{sanitized_alias}_{timestamp}{file_extension}"
    image_path = os.path.join(PREVIEW_DIR, unique_filename)

    # Ensure the filename is unique
    count = 1
    while os.path.exists(image_path):
        unique_filename = f"{sanitized_alias}_{timestamp}_{count}{file_extension}"
        image_path = os.path.join(PREVIEW_DIR, unique_filename)
        count += 1

    try:
        with open(image_path, 'wb') as f:
            shutil.copyfileobj(image_file.file, f)
        
        return web.json_response({"filename": unique_filename})
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)

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
                if member.filename.startswith('preview/') and not member.is_dir():
                    if not os.path.exists(PREVIEW_DIR):
                        os.makedirs(PREVIEW_DIR)
                    target_path = os.path.join(PREVIEW_DIR, os.path.basename(member.filename))
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
            if os.path.exists(PREVIEW_DIR):
                for root, _, files in os.walk(PREVIEW_DIR):
                    for file in files:
                        zf.write(os.path.join(root, file), arcname=os.path.join('preview', file))
        
        memory_file.seek(0)
        return web.Response(
            body=memory_file.read(),
            content_type='application/zip',
            headers={'Content-Disposition': 'attachment; filename="prompt_library.zip"'}
        )
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)

# --- 新增的管理功能API ---

@PromptServer.instance.routes.post("/prompt_selector/category/rename")
async def rename_category(request):
    """重命名分类"""
    try:
        data = await request.json()
        old_name = data.get("old_name")
        new_name = data.get("new_name")
        
        if not old_name or not new_name:
            return web.json_response({"error": "Missing category names"}, status=400)
            
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            file_data = json.load(f)
            
        # 检查新名称是否已存在
        if any(cat["name"] == new_name for cat in file_data["categories"]):
            return web.json_response({"error": "Category name already exists"}, status=400)
            
        # 查找并重命名分类
        for category in file_data["categories"]:
            if category["name"] == old_name:
                category["name"] = new_name
                break
        else:
            return web.json_response({"error": "Category not found"}, status=404)
            
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(file_data, f, ensure_ascii=False, indent=4)
            
        return web.json_response({"success": True})
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)

@PromptServer.instance.routes.post("/prompt_selector/category/delete")
async def delete_category(request):
    """删除分类"""
    try:
        data = await request.json()
        category_name = data.get("name")
        
        if not category_name:
            return web.json_response({"error": "Missing category name"}, status=400)
            
        if category_name == "default":
            return web.json_response({"error": "Cannot delete default category"}, status=400)
            
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            file_data = json.load(f)
            
        # 删除分类
        file_data["categories"] = [cat for cat in file_data["categories"] if cat["name"] != category_name]
        
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(file_data, f, ensure_ascii=False, indent=4)
            
        return web.json_response({"success": True})
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)

@PromptServer.instance.routes.post("/prompt_selector/prompts/batch_delete")
async def batch_delete_prompts(request):
    """批量删除提示词"""
    try:
        data = await request.json()
        category_name = data.get("category")
        prompt_ids = data.get("prompt_ids", [])
        
        if not category_name or not prompt_ids:
            return web.json_response({"error": "Missing parameters"}, status=400)
            
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            file_data = json.load(f)
            
        # 查找分类并删除指定的提示词
        for category in file_data["categories"]:
            if category["name"] == category_name:
                # 为提示词添加临时ID以便删除
                for i, prompt in enumerate(category["prompts"]):
                    if not prompt.get("id"):
                        prompt["id"] = str(uuid.uuid4())
                        
                category["prompts"] = [p for p in category["prompts"] if p.get("id") not in prompt_ids]
                break
                
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(file_data, f, ensure_ascii=False, indent=4)
            
        return web.json_response({"success": True})
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)

@PromptServer.instance.routes.post("/prompt_selector/prompts/batch_move")
async def batch_move_prompts(request):
    """批量移动提示词到其他分类"""
    try:
        data = await request.json()
        source_category = data.get("source_category")
        target_category = data.get("target_category")
        prompt_ids = data.get("prompt_ids", [])
        
        if not source_category or not target_category or not prompt_ids:
            return web.json_response({"error": "Missing parameters"}, status=400)
            
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            file_data = json.load(f)
            
        # 查找源分类和目标分类
        source_cat = None
        target_cat = None
        for category in file_data["categories"]:
            if category["name"] == source_category:
                source_cat = category
            elif category["name"] == target_category:
                target_cat = category
                
        if not source_cat or not target_cat:
            return web.json_response({"error": "Category not found"}, status=404)
            
        # 移动提示词
        prompts_to_move = []
        for prompt in source_cat["prompts"][:]:
            if prompt.get("id") in prompt_ids:
                prompts_to_move.append(prompt)
                source_cat["prompts"].remove(prompt)
                
        target_cat["prompts"].extend(prompts_to_move)
        
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(file_data, f, ensure_ascii=False, indent=4)
            
        return web.json_response({"success": True})
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)

@PromptServer.instance.routes.post("/prompt_selector/prompts/update_order")
async def update_prompt_order(request):
    """更新提示词排序"""
    try:
        data = await request.json()
        category_name = data.get("category")
        ordered_ids = data.get("ordered_ids", [])
        
        if not category_name or not ordered_ids:
            return web.json_response({"error": "Missing parameters"}, status=400)
            
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            file_data = json.load(f)
            
        # 查找分类并重新排序
        for category in file_data["categories"]:
            if category["name"] == category_name:
                # 创建ID到提示词的映射
                prompt_map = {p.get("id"): p for p in category["prompts"]}
                # 按新顺序重新排列
                category["prompts"] = [prompt_map[pid] for pid in ordered_ids if pid in prompt_map]
                break
                
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(file_data, f, ensure_ascii=False, indent=4)
            
        return web.json_response({"success": True})
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)

@PromptServer.instance.routes.post("/prompt_selector/prompts/toggle_favorite")
async def toggle_favorite(request):
    """切换提示词收藏状态"""
    try:
        data = await request.json()
        category_name = data.get("category")
        prompt_id = data.get("prompt_id")
        
        if not category_name or not prompt_id:
            return web.json_response({"error": "Missing parameters"}, status=400)
            
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            file_data = json.load(f)
            
        # 查找提示词并切换收藏状态
        for category in file_data["categories"]:
            if category["name"] == category_name:
                for prompt in category["prompts"]:
                    if prompt.get("id") == prompt_id:
                        prompt["favorite"] = not prompt.get("favorite", False)
                        break
                break
                
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(file_data, f, ensure_ascii=False, indent=4)
            
        return web.json_response({"success": True})
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)

@PromptServer.instance.routes.post("/prompt_selector/selection")
async def save_selection(request):
   """保存当前选择的提示词"""
   try:
       data = await request.json()
       category_name = data.get("category")
       selected_prompts = data.get("selected_prompts", [])

       if not category_name:
           return web.json_response({"error": "Missing category name"}, status=400)

       with open(DATA_FILE, 'r', encoding='utf-8') as f:
           file_data = json.load(f)

       # 检查是否启用保存
       if not file_data.get("settings", {}).get("save_selection", False):
           return web.json_response({"success": True, "message": "Save selection is disabled."})

       # 查找分类并更新 last_selected
       for category in file_data["categories"]:
           if category["name"] == category_name:
               category["last_selected"] = selected_prompts
               break
       
       with open(DATA_FILE, 'w', encoding='utf-8') as f:
           json.dump(file_data, f, ensure_ascii=False, indent=4)

       return web.json_response({"success": True})
   except Exception as e:
       return web.json_response({"error": str(e)}, status=500)

@PromptServer.instance.routes.post("/prompt_selector/last_category")
async def save_last_category(request):
   """保存最后选择的分类"""
   try:
       data = await request.json()
       category_name = data.get("category")

       if not category_name:
           return web.json_response({"error": "Missing category name"}, status=400)

       with open(DATA_FILE, 'r', encoding='utf-8') as f:
           file_data = json.load(f)

       if "settings" not in file_data:
           file_data["settings"] = {}
       
       file_data["settings"]["last_selected_category"] = category_name
       
       with open(DATA_FILE, 'w', encoding='utf-8') as f:
           json.dump(file_data, f, ensure_ascii=False, indent=4)

       return web.json_response({"success": True})
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
                    "prompts": [],
                    "last_selected": []
                }
            ],
            "settings": {
                "language": "zh-CN",
                "separator": ", ",
                "save_selection": True,
                "last_selected_category": "default"
            }
        }, f, ensure_ascii=False, indent=4)
