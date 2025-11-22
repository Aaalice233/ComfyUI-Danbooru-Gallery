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
import tempfile
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

# === 数据安全工具函数 ===

def _validate_data(data):
    """
    验证数据结构的完整性

    Args:
        data: 待验证的数据字典

    Raises:
        ValueError: 数据结构不完整时抛出异常
    """
    if not isinstance(data, dict):
        raise ValueError("数据必须是字典类型")

    if "version" not in data:
        raise ValueError("缺少 version 字段")

    if "categories" not in data:
        raise ValueError("缺少 categories 字段")

    if not isinstance(data["categories"], list):
        raise ValueError("categories 必须是列表类型")

    if "settings" not in data:
        raise ValueError("缺少 settings 字段")

    return True

def _create_backup(file_path, max_backups=3):
    """
    创建文件备份，保留最近 N 个版本

    Args:
        file_path: 要备份的文件路径
        max_backups: 最多保留的备份数量
    """
    if not os.path.exists(file_path):
        return

    try:
        # 生成备份文件名（带时间戳）
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = f"{file_path}.backup_{timestamp}"

        # 创建备份
        shutil.copy2(file_path, backup_file)
        logger.info(f"✓ 已创建备份: {os.path.basename(backup_file)}")

        # 清理旧备份（保留最新的 max_backups 个）
        backup_dir = os.path.dirname(file_path)
        backup_pattern = f"{os.path.basename(file_path)}.backup_"

        backups = []
        for filename in os.listdir(backup_dir):
            if filename.startswith(backup_pattern):
                full_path = os.path.join(backup_dir, filename)
                backups.append((os.path.getmtime(full_path), full_path))

        # 按修改时间排序（最新的在前）
        backups.sort(reverse=True)

        # 删除多余的备份
        for _, old_backup in backups[max_backups:]:
            try:
                os.remove(old_backup)
                logger.info(f"✓ 已清理旧备份: {os.path.basename(old_backup)}")
            except Exception as e:
                logger.warning(f"⚠ 清理备份失败 {os.path.basename(old_backup)}: {e}")

    except Exception as e:
        logger.warning(f"⚠ 创建备份失败: {e}")

def _atomic_save_json(file_path, data, create_backup=True):
    """
    原子性保存 JSON 数据到文件

    使用临时文件 + 原子重命名机制，确保数据写入的原子性：
    1. 先写入到临时文件
    2. 强制刷新到磁盘（fsync）
    3. 原子重命名覆盖目标文件
    4. 异常时自动清理临时文件

    Args:
        file_path: 目标文件路径
        data: 要保存的数据（字典）
        create_backup: 是否创建备份

    Raises:
        ValueError: 数据验证失败
        IOError: 文件写入失败
    """
    # 1. 验证数据结构
    _validate_data(data)

    # 2. 创建备份
    if create_backup:
        _create_backup(file_path)

    # 3. 写入临时文件
    temp_fd = None
    temp_path = None

    try:
        # 在同一目录下创建临时文件（确保在同一文件系统上，os.replace 才能原子操作）
        temp_fd, temp_path = tempfile.mkstemp(
            dir=os.path.dirname(file_path),
            prefix='.tmp_',
            suffix='.json'
        )

        # 使用文件描述符写入数据
        with os.fdopen(temp_fd, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
            f.flush()
            os.fsync(f.fileno())  # 强制刷新到磁盘

        temp_fd = None  # 文件已关闭，避免重复关闭

        # 4. 原子重命名（覆盖旧文件）
        # os.replace 在 Windows 和 Unix 上都是原子操作
        os.replace(temp_path, file_path)

        logger.info(f"✓ 数据已安全保存: {os.path.basename(file_path)}")

    except Exception as e:
        logger.error(f"✗ 保存数据失败: {e}")
        # 清理临时文件
        if temp_fd is not None:
            try:
                os.close(temp_fd)
            except:
                pass
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except:
                pass
        raise

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

@PromptServer.instance.routes.get("/prompt_selector/metadata")
async def get_metadata(request):
    """
    获取数据元信息（不返回完整数据，仅用于检查是否有更新）

    返回格式:
    {
        "last_modified": "2025-01-22T10:30:45.123Z",
        "version": "1.6",
        "categories_count": 5,
        "total_prompts": 120
    }
    """
    if not os.path.exists(DATA_FILE):
        return web.json_response({"error": "Data file not found"}, status=404)
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)

        total_prompts = sum(len(cat.get("prompts", [])) for cat in data.get("categories", []))

        metadata = {
            "last_modified": data.get("last_modified"),
            "version": data.get("version"),
            "categories_count": len(data.get("categories", [])),
            "total_prompts": total_prompts
        }

        return web.json_response(metadata)
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)

@PromptServer.instance.routes.post("/prompt_selector/data")
async def save_data(request):
    try:
        new_data = await request.json()

        # 读取旧数据用于智能时间戳更新
        old_data = None
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, 'r', encoding='utf-8') as f:
                    old_data = json.load(f)
            except Exception as e:
                logger.warning(f"读取旧数据失败，将跳过时间戳比较: {e}")

        # 智能更新时间戳（检测变更并只更新修改的项）
        updated_data = _update_timestamps(new_data, old_data)

        # 使用原子保存机制，确保数据安全
        _atomic_save_json(DATA_FILE, updated_data, create_backup=True)

        # 返回完整的最新数据（包含所有更新后的时间戳）
        return web.json_response({
            "success": True,
            "data": updated_data
        })
    except ValueError as e:
        # 数据验证失败
        logger.error(f"数据验证失败: {e}")
        return web.json_response({"error": f"数据验证失败: {str(e)}"}, status=400)
    except Exception as e:
        logger.error(f"保存数据失败: {e}")
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
    """确保导入的数据与当前版本兼容，自动添加时间戳字段"""
    if "version" not in data:
        data["version"] = "1.6" # 假设是旧版本

    if "settings" not in data:
        data["settings"] = {
            "language": "zh-CN",
            "separator": ", ",
            "save_selection": True
        }

    # 添加全局 last_modified 时间戳
    if "last_modified" not in data:
        data["last_modified"] = datetime.now().isoformat()

    for category in data.get("categories", []):
        # 移除旧的 last_selected 字段
        if "last_selected" in category:
            del category["last_selected"]

        # 为分类添加 updated_at 时间戳
        if "updated_at" not in category:
            category["updated_at"] = datetime.now().isoformat()

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
            # 为提示词添加 updated_at 时间戳
            if "updated_at" not in prompt:
                prompt["updated_at"] = prompt.get("created_at", datetime.now().isoformat())
            if "usage_count" not in prompt:
                prompt["usage_count"] = 0
            if "last_used" not in prompt:
                prompt["last_used"] = None
    return data

def _update_timestamps(new_data, old_data=None):
    """
    智能更新时间戳：
    1. 比较新旧数据，检测哪些提示词被修改
    2. 为新增的提示词添加 created_at 和 updated_at
    3. 为修改的提示词更新 updated_at
    4. 更新全局 last_modified

    Args:
        new_data: 新的数据（从客户端接收）
        old_data: 旧的数据（从文件读取），如果为 None 则跳过比较

    Returns:
        更新时间戳后的 new_data
    """
    now = datetime.now().isoformat()

    # 更新全局 last_modified
    new_data["last_modified"] = now

    # 如果没有旧数据，直接确保所有字段存在
    if old_data is None:
        return _ensure_data_compatibility(new_data)

    # 创建旧数据的快速查找映射
    old_categories_map = {cat["name"]: cat for cat in old_data.get("categories", [])}

    for new_category in new_data.get("categories", []):
        cat_name = new_category.get("name")
        old_category = old_categories_map.get(cat_name)

        # 如果是新分类
        if not old_category:
            new_category["updated_at"] = now
            # 新分类中的所有提示词也是新的
            for prompt in new_category.get("prompts", []):
                if "created_at" not in prompt:
                    prompt["created_at"] = now
                prompt["updated_at"] = now
            continue

        # 比较分类级别的变更（如分类名称、设置等）
        category_modified = False
        for key in new_category:
            if key in ("prompts", "updated_at"):
                continue
            if new_category.get(key) != old_category.get(key):
                category_modified = True
                break

        # 创建旧提示词的快速查找映射（使用 ID）
        old_prompts_map = {p.get("id"): p for p in old_category.get("prompts", []) if p.get("id")}

        # 检查提示词变更
        for new_prompt in new_category.get("prompts", []):
            prompt_id = new_prompt.get("id")

            # 如果提示词没有 ID，是新提示词
            if not prompt_id:
                new_prompt["id"] = str(uuid.uuid4())
                new_prompt["created_at"] = now
                new_prompt["updated_at"] = now
                category_modified = True
                continue

            old_prompt = old_prompts_map.get(prompt_id)

            # 如果是新提示词（ID 不在旧数据中）
            if not old_prompt:
                if "created_at" not in new_prompt:
                    new_prompt["created_at"] = now
                new_prompt["updated_at"] = now
                category_modified = True
                continue

            # 比较提示词内容是否变更
            prompt_modified = False
            for key in new_prompt:
                if key in ("updated_at", "last_used", "usage_count"):
                    continue
                if new_prompt.get(key) != old_prompt.get(key):
                    prompt_modified = True
                    category_modified = True
                    break

            # 如果提示词被修改，更新 updated_at
            if prompt_modified:
                new_prompt["updated_at"] = now
            else:
                # 保持旧的时间戳
                new_prompt["updated_at"] = old_prompt.get("updated_at", old_prompt.get("created_at", now))

            # 确保 created_at 存在
            if "created_at" not in new_prompt:
                new_prompt["created_at"] = old_prompt.get("created_at", now)

        # 更新分类的 updated_at
        if category_modified:
            new_category["updated_at"] = now
        else:
            new_category["updated_at"] = old_category.get("updated_at", now)

    # 确保所有必需字段存在
    return _ensure_data_compatibility(new_data)

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

            # 保存合并后的数据（使用原子保存机制）
            _atomic_save_json(DATA_FILE, local_data, create_backup=True)

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
        renamed_category = None
        for category in file_data["categories"]:
            if category["name"] == old_name:
                category["name"] = new_name
                renamed_category = category
                break
        else:
            return web.json_response({"error": "Category not found"}, status=404)

        # 更新分类和全局时间戳
        now = datetime.now().isoformat()
        renamed_category["updated_at"] = now
        file_data["last_modified"] = now

        # 使用原子保存机制
        _atomic_save_json(DATA_FILE, file_data, create_backup=True)

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

        # 使用原子保存机制
        _atomic_save_json(DATA_FILE, file_data, create_backup=True)

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

                # 更新分类和全局时间戳（删除操作）
                now = datetime.now().isoformat()
                category["updated_at"] = now
                file_data["last_modified"] = now
                break

        # 使用原子保存机制
        _atomic_save_json(DATA_FILE, file_data, create_backup=True)

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

        # 更新源分类和目标分类的时间戳
        now = datetime.now().isoformat()
        source_cat["updated_at"] = now
        target_cat["updated_at"] = now
        file_data["last_modified"] = now

        # 使用原子保存机制
        _atomic_save_json(DATA_FILE, file_data, create_backup=True)

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

                # 更新分类和全局时间戳（排序操作）
                now = datetime.now().isoformat()
                category["updated_at"] = now
                file_data["last_modified"] = now
                break

        # 使用原子保存机制
        _atomic_save_json(DATA_FILE, file_data, create_backup=True)

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

                        # 更新提示词、分类和全局时间戳
                        now = datetime.now().isoformat()
                        prompt["updated_at"] = now
                        category["updated_at"] = now
                        file_data["last_modified"] = now
                        break
                break

        # 使用原子保存机制
        _atomic_save_json(DATA_FILE, file_data, create_backup=True)

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

            # 5. 保存合并后的数据（使用原子保存机制）
            _atomic_save_json(DATA_FILE, merged_data, create_backup=False)
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
                    "last_modified": datetime.now().isoformat(),
                    "categories": [],
                    "settings": {
                        "language": "zh-CN",
                        "separator": ", ",
                        "save_selection": True
                    }
                }
                _atomic_save_json(DATA_FILE, fallback_data, create_backup=False)
                logger.info("📝 已创建空词库结构作为备用方案")
        else:
            # 如果 default.json 也不存在，创建一个基本的空结构
            fallback_data = {
                "version": "1.6",
                "last_modified": datetime.now().isoformat(),
                "categories": [],
                "settings": {
                    "language": "zh-CN",
                    "separator": ", ",
                    "save_selection": True
                }
            }
            _atomic_save_json(DATA_FILE, fallback_data, create_backup=False)
            logger.error("⚠️ 默认词库文件不存在，已创建空词库结构")

    # === 新增：升级现有数据文件，添加时间戳字段 ===
    # 如果 data.json 已存在，检查并添加缺失的时间戳字段
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)

            # 检查是否缺少 last_modified 字段
            needs_upgrade = "last_modified" not in existing_data

            # 检查分类和提示词是否缺少时间戳
            for category in existing_data.get("categories", []):
                if "updated_at" not in category:
                    needs_upgrade = True
                    break
                for prompt in category.get("prompts", []):
                    if "updated_at" not in prompt:
                        needs_upgrade = True
                        break
                if needs_upgrade:
                    break

            # 如果需要升级，使用 _ensure_data_compatibility 添加时间戳
            if needs_upgrade:
                logger.info("📝 检测到数据文件缺少时间戳字段，正在升级...")
                upgraded_data = _ensure_data_compatibility(existing_data)
                _atomic_save_json(DATA_FILE, upgraded_data, create_backup=True)
                logger.info("✅ 数据文件已升级，添加了时间戳字段")

        except Exception as e:
            logger.error(f"⚠️ 升级数据文件失败: {e}")
            # 不影响启动，继续运行

# 在插件加载时调用初始化
initialize_data_file()
