"""
Hot tags memory cache module

Provides optional in-memory caching for tag autocomplete.
Supports two modes:
1. Database query mode (default): Transparent pass-through to database
2. Memory cache mode (optional): Preload tags into memory for extreme performance
"""

from .memory_cache import HotTagsCache, get_hot_tags_cache

__all__ = ['HotTagsCache', 'get_hot_tags_cache']
