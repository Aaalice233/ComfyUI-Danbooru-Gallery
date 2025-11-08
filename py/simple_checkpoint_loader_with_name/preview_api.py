"""
模型预览图API模块
为SimpleCheckpointLoaderWithName节点提供独立的预览图功能
"""

import os
import folder_paths
from aiohttp import web
from pathlib import Path

# Logger导入
from ..utils.logger import get_logger
logger = get_logger(__name__)


def get_preview_path(model_name):
    """
    查找模型对应的预览图文件

    Args:
        model_name: 模型文件名（如 "model.safetensors"）

    Returns:
        预览图的完整路径，如果不存在则返回None
    """
    try:
        # 获取checkpoints目录的完整路径
        checkpoints_paths = folder_paths.get_folder_paths("checkpoints")

        # 遍历所有可能的checkpoints目录
        for checkpoints_dir in checkpoints_paths:
            # 获取模型文件的完整路径
            model_path = Path(checkpoints_dir) / model_name

            if not model_path.exists():
                continue

            # 获取模型文件的基础名称（不含扩展名）
            base_name = model_path.stem
            parent_dir = model_path.parent

            # 按优先级查找预览图
            # 支持的图片格式：png, jpg, jpeg, webp, gif
            # 支持的视频格式：mp4
            preview_extensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.mp4', '.preview.png']

            for ext in preview_extensions:
                preview_path = parent_dir / f"{base_name}{ext}"
                if preview_path.exists() and preview_path.is_file():
                    return str(preview_path)

        return None
    except Exception as e:
        logger.error(f"查找预览图失败: {model_name}, 错误: {e}")
        return None


async def get_preview_list(request):
    """
    API端点: 获取所有模型的预览图映射

    返回格式:
    {
        "success": true,
        "previews": {
            "model1.safetensors": "/checkpoint_preview/image?path=...",
            "model2.ckpt": "/checkpoint_preview/image?path=...",
            ...
        }
    }
    """
    try:
        # 获取所有checkpoint文件列表
        model_list = folder_paths.get_filename_list("checkpoints")

        previews = {}
        for model_name in model_list:
            preview_path = get_preview_path(model_name)
            if preview_path:
                # 使用URL编码避免路径中的特殊字符问题
                from urllib.parse import quote
                encoded_path = quote(preview_path, safe='')
                previews[model_name] = f"/checkpoint_preview/image?path={encoded_path}"

        return web.json_response({
            "success": True,
            "previews": previews
        })

    except Exception as e:
        logger.error(f"获取预览图列表失败: {e}")
        import traceback
        logger.debug(traceback.format_exc())
        return web.json_response({
            "success": False,
            "error": str(e)
        }, status=500)


async def get_preview_image(request):
    """
    API端点: 返回预览图文件内容

    参数:
        path: 预览图的完整路径（URL编码）

    返回:
        图片二进制流
    """
    try:
        # 获取并解码路径参数
        from urllib.parse import unquote
        encoded_path = request.query.get("path", "")
        if not encoded_path:
            return web.Response(status=400, text="Missing path parameter")

        image_path = unquote(encoded_path)
        image_file = Path(image_path)

        # 安全检查：确保文件存在且在允许的目录内
        if not image_file.exists() or not image_file.is_file():
            return web.Response(status=404, text="Image not found")

        # 验证文件路径在checkpoints目录内（安全性）
        checkpoints_paths = folder_paths.get_folder_paths("checkpoints")
        is_valid_path = False
        for checkpoints_dir in checkpoints_paths:
            try:
                image_file.relative_to(checkpoints_dir)
                is_valid_path = True
                break
            except ValueError:
                continue

        if not is_valid_path:
            return web.Response(status=403, text="Access denied")

        # 确定MIME类型
        ext = image_file.suffix.lower()
        mime_types = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.webp': 'image/webp',
            '.gif': 'image/gif',
            '.mp4': 'video/mp4'
        }
        content_type = mime_types.get(ext, 'application/octet-stream')

        # 读取并返回图片文件
        with open(image_file, 'rb') as f:
            image_data = f.read()

        return web.Response(
            body=image_data,
            content_type=content_type,
            headers={
                'Cache-Control': 'public, max-age=3600'  # 缓存1小时
            }
        )

    except Exception as e:
        logger.error(f"获取预览图失败: {e}")
        import traceback
        logger.debug(traceback.format_exc())
        return web.Response(status=500, text=str(e))


def register_preview_api(routes):
    """
    注册预览图API路由

    Args:
        routes: aiohttp路由表
    """
    routes.get("/checkpoint_preview/list")(get_preview_list)
    routes.get("/checkpoint_preview/image")(get_preview_image)
    logger.info("✓ 预览图API已注册")
