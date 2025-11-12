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

# Logger导入
from ..utils.logger import get_logger
logger = get_logger(__name__)

# 插件目录
PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
# The root directory of the custom node (需要向上两级: py/prompt_selector -> py -> ComfyUI-Danbooru-Gallery)
CUSTOM_NODE_DIR = os.path.abspath(os.path.join(PLUGIN_DIR, '..', '..'))
DATA_FILE = os.path.join(PLUGIN_DIR, "data.json")
DEFAULT_DATA_FILE = os.path.join(PLUGIN_DIR, "default.json")
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
    CATEGORY = "danbooru"

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
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        
        return web.json_response({"success": True})
    except Exception as e:
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

def _ensure_data_compatibility(data):
    """确保导入的数据与当前版本兼容"""
    if "version" not in data:
        data["version"] = "1.6" # 假设是旧版本

    if "settings" not in data:
        data["settings"] = {
            "language": "zh-CN",
            "separator": ", ",
            "save_selection": True
        }

    for category in data.get("categories", []):
        # 移除旧的 last_selected 字段
        if "last_selected" in category:
            del category["last_selected"]
            
        for prompt in category.get("prompts", []):
            if "id" not in prompt or not prompt["id"]:
                prompt["id"] = str(uuid.uuid4())
            if "description" not in prompt:
                prompt["description"] = ""
            if "tags" not in prompt:
                prompt["tags"] = []
            if "favorite" not in prompt:
                prompt["favorite"] = False
            if "image" not in prompt:
                prompt["image"] = ""
            if "created_at" not in prompt:
                prompt["created_at"] = datetime.now().isoformat()
            if "usage_count" not in prompt:
                prompt["usage_count"] = 0
            if "last_used" not in prompt:
                prompt["last_used"] = None
    return data

@PromptServer.instance.routes.post("/prompt_selector/pre_import")
async def pre_import_zip(request):
    post = await request.post()
    zip_file = post.get("zip_file")
    if not zip_file or not zip_file.file:
        return web.json_response({"error": "No file uploaded"}, status=400)

    try:
        with zipfile.ZipFile(zip_file.file, 'r') as zf:
            if 'data.json' not in zf.namelist():
                return web.json_response({"error": "ZIP file must contain data.json"}, status=400)
            
            with zf.open('data.json') as f:
                import_data = json.load(f)
            
            categories = [cat.get("name") for cat in import_data.get("categories", [])]
            return web.json_response({"categories": categories})
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)

@PromptServer.instance.routes.post("/prompt_selector/import")
async def import_zip(request):
    post = await request.post()
    zip_file = post.get("zip_file")
    selected_categories_str = post.get("selected_categories", "[]")
    
    if not zip_file or not zip_file.file:
        return web.json_response({"error": "No file uploaded"}, status=400)

    try:
        selected_categories = json.loads(selected_categories_str)
        
        # 加载本地数据
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                local_data = json.load(f)
        else:
            # 如果本地文件不存在，则创建一个空的结构
            local_data = {
                "version": "1.6",
                "categories": [],
                "settings": { "language": "zh-CN", "separator": ", ", "save_selection": True }
            }

        with zipfile.ZipFile(zip_file.file, 'r') as zf:
            if 'data.json' not in zf.namelist():
                return web.json_response({"error": "ZIP file must contain data.json"}, status=400)
            
            with zf.open('data.json') as f:
                import_data = json.load(f)

            compatible_data = _ensure_data_compatibility(import_data)
            
            local_categories = {cat["name"]: cat for cat in local_data["categories"]}
            imported_images = set()

            for category in compatible_data.get("categories", []):
                cat_name = category.get("name")
                if cat_name not in selected_categories:
                    continue

                # 如果本地不存在该分类，则直接添加
                if cat_name not in local_categories:
                    local_data["categories"].append(category)
                    local_categories[cat_name] = category # 更新映射
                    # 记录所有该分类下的图片
                    for prompt in category.get("prompts", []):
                        if prompt.get("image"):
                            imported_images.add(prompt["image"])
                else:
                    # 如果本地存在该分类，则合并
                    local_category = local_categories[cat_name]
                    local_prompts = {p.get("alias", p.get("prompt")): p for p in local_category.get("prompts", [])}
                    
                    for prompt in category.get("prompts", []):
                        prompt_key = prompt.get("alias", prompt.get("prompt"))
                        
                        # 如果本地已存在同名提示词，则更新
                        if prompt_key in local_prompts:
                            # 更新除了 id 之外的所有字段
                            existing_prompt = local_prompts[prompt_key]
                            for key, value in prompt.items():
                                if key != "id":
                                    existing_prompt[key] = value
                        else:
                            # 如果不存在，则新增
                            local_category.get("prompts", []).append(prompt)
                        
                        # 记录图片
                        if prompt.get("image"):
                            imported_images.add(prompt["image"])

            # 提取并保存相关的图片
            if not os.path.exists(PREVIEW_DIR):
                os.makedirs(PREVIEW_DIR)
                
            for image_name in imported_images:
                zip_image_path = f'preview/{image_name}'
                if zip_image_path in zf.namelist():
                    target_path = os.path.join(PREVIEW_DIR, image_name)
                    # 只有当文件不存在时才写入，避免覆盖
                    if not os.path.exists(target_path):
                        with zf.open(zip_image_path) as source, open(target_path, 'wb') as target:
                            shutil.copyfileobj(source, target)

            # 保存合并后的数据
            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(local_data, f, ensure_ascii=False, indent=4)

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
    """删除分类及其子分类"""
    try:
        data = await request.json()
        category_name_to_delete = data.get("name")

        if not category_name_to_delete:
            return web.json_response({"error": "Missing category name"}, status=400)

        if not os.path.exists(DATA_FILE):
            return web.json_response({"success": True})

        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            file_data = json.load(f)

        prefix_to_delete = category_name_to_delete + '/'
        categories_to_keep = []
        for cat in file_data.get("categories", []):
            original_cat_name = cat.get("name", "")
            # Sanitize the name by removing any leading slashes before comparison
            sanitized_cat_name = original_cat_name.lstrip('/')
            
            keep = sanitized_cat_name != category_name_to_delete and not sanitized_cat_name.startswith(prefix_to_delete)
            if keep:
                categories_to_keep.append(cat)


        file_data["categories"] = categories_to_keep

        if "categories" not in file_data:
            file_data["categories"] = []

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

# 确保在启动时 data.json 文件存在，如果不存在则创建一个空的结构
def initialize_data_file():
    # === 词库自动迁移逻辑 ===
    # 检测旧版本词库路径并自动迁移到新位置
    OLD_BASE_DIR = os.path.join(CUSTOM_NODE_DIR, "prompt_selector")
    OLD_DATA_FILE = os.path.join(OLD_BASE_DIR, "data.json")
    OLD_PREVIEW_DIR = os.path.join(OLD_BASE_DIR, "preview")
    MIGRATION_MARKER = os.path.join(OLD_BASE_DIR, "MIGRATED.txt")

    # 迁移条件：旧数据存在 + 未标记已迁移
    if os.path.exists(OLD_DATA_FILE) and not os.path.exists(MIGRATION_MARKER):
        try:
            logger.error("🔍 检测到旧版本词库数据，开始自动迁移...")

            # 1. 备份旧数据
            backup_file = OLD_DATA_FILE + ".backup"
            shutil.copy2(OLD_DATA_FILE, backup_file)
            logger.error(f"📦 备份已创建: {backup_file}")

            # 2. 创建新目录结构
            os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
            os.makedirs(PREVIEW_DIR, exist_ok=True)

            # 3. 加载旧数据
            with open(OLD_DATA_FILE, 'r', encoding='utf-8') as f:
                old_data = json.load(f)
            old_data = _ensure_data_compatibility(old_data)

            # 4. 合并策略：相同的覆盖，没有的新增
            if os.path.exists(DATA_FILE):
                # 新数据存在，进行合并
                logger.error("📝 检测到新数据，执行合并策略（相同覆盖，没有新增）")
                with open(DATA_FILE, 'r', encoding='utf-8') as f:
                    new_data = json.load(f)
                new_data = _ensure_data_compatibility(new_data)

                # 合并分类和提示词
                new_categories_map = {cat["name"]: cat for cat in new_data.get("categories", [])}

                for old_category in old_data.get("categories", []):
                    cat_name = old_category.get("name")

                    if cat_name not in new_categories_map:
                        # 分类不存在，直接添加
                        new_data["categories"].append(old_category)
                        logger.error(f"  ✓ 新增分类: {cat_name}")
                    else:
                        # 分类存在，合并提示词
                        new_category = new_categories_map[cat_name]
                        new_prompts_map = {
                            p.get("alias") or p.get("prompt"): p
                            for p in new_category.get("prompts", [])
                        }

                        for old_prompt in old_category.get("prompts", []):
                            prompt_key = old_prompt.get("alias") or old_prompt.get("prompt")

                            if prompt_key not in new_prompts_map:
                                # 提示词不存在，添加
                                new_category["prompts"].append(old_prompt)
                            else:
                                # 提示词存在，覆盖（保留id）
                                existing_prompt = new_prompts_map[prompt_key]
                                old_id = existing_prompt.get("id")
                                for key, value in old_prompt.items():
                                    existing_prompt[key] = value
                                if old_id:
                                    existing_prompt["id"] = old_id

                # 合并设置（旧数据优先）
                new_data["settings"].update(old_data.get("settings", {}))
                merged_data = new_data
                logger.error("✓ 数据合并完成")
            else:
                # 新数据不存在，直接使用旧数据
                merged_data = old_data
                logger.error("✓ 新数据不存在，直接迁移旧数据")

            # 5. 保存合并后的数据
            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(merged_data, f, ensure_ascii=False, indent=4)
            logger.error("✓ 词库数据已保存")

            # 6. 迁移 preview 目录
            preview_count = 0
            if os.path.exists(OLD_PREVIEW_DIR):
                for filename in os.listdir(OLD_PREVIEW_DIR):
                    src = os.path.join(OLD_PREVIEW_DIR, filename)
                    dst = os.path.join(PREVIEW_DIR, filename)
                    if os.path.isfile(src):
                        # 只有当目标文件不存在时才复制（避免覆盖新图片）
                        if not os.path.exists(dst):
                            shutil.copy2(src, dst)
                            preview_count += 1
                logger.error(f"✓ 预览图迁移完成 ({preview_count} 个新文件)")

            # 7. 创建迁移标记文件
            with open(MIGRATION_MARKER, 'w', encoding='utf-8') as f:
                f.write(f"迁移完成时间: {datetime.now().isoformat()}\n")
                f.write(f"新数据位置: {DATA_FILE}\n")
                f.write("注意: 此目录下的文件已迁移到新位置，可以手动删除\n")

            logger.error(f"📍 旧位置: {OLD_DATA_FILE}")
            logger.error(f"📍 新位置: {DATA_FILE}")
            logger.error("✅ 词库迁移完成！旧数据保留在原位置，可手动删除")

        except Exception as e:
            logger.error(f"❌ 词库迁移失败: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            # 继续执行下面的默认初始化逻辑

    # === 原有逻辑：创建默认数据 ===
    if not os.path.exists(DATA_FILE):
        if os.path.exists(DEFAULT_DATA_FILE):
            # 如果 default.json 存在，直接复制作为初始词库
            try:
                logger.error("📦 检测到默认词库文件，正在初始化...")
                shutil.copy2(DEFAULT_DATA_FILE, DATA_FILE)
                logger.error(f"✅ 默认词库已从 {DEFAULT_DATA_FILE} 初始化到 {DATA_FILE}")
            except Exception as e:
                logger.error(f"❌ 复制默认词库失败: {str(e)}")
                # 如果复制失败，创建一个基本的空结构
                fallback_data = {
                    "version": "1.6",
                    "categories": [],
                    "settings": {
                        "language": "zh-CN",
                        "separator": ", ",
                        "save_selection": True
                    }
                }
                with open(DATA_FILE, 'w', encoding='utf-8') as f:
                    json.dump(fallback_data, f, ensure_ascii=False, indent=4)
                logger.info("📝 已创建空词库结构作为备用方案")
        else:
            # 如果 default.json 也不存在，创建一个基本的空结构
            fallback_data = {
                "version": "1.6",
                "categories": [],
                "settings": {
                    "language": "zh-CN",
                    "separator": ", ",
                    "save_selection": True
                }
            }
            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(fallback_data, f, ensure_ascii=False, indent=4)
            logger.error("⚠️ 默认词库文件不存在，已创建空词库结构")

# 在插件加载时调用初始化
initialize_data_file()
