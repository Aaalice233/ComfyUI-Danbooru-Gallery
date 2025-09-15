"""
ComfyUI Danbooru Gallery Plugin
基于 Danbooru API 的图像搜索和画廊插件
"""

from .danbooru_gallery import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS

WEB_DIRECTORY = "./js"

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS', 'WEB_DIRECTORY']