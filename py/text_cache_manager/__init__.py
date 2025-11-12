"""
文本缓存管理器模块
Text Cache Manager Module
"""

from .text_cache_manager import text_cache_manager, TextCacheManager
from .api import setup_text_cache_api

__all__ = ['text_cache_manager', 'TextCacheManager', 'setup_text_cache_api']
