"""
Global shared modules for ComfyUI-Danbooru-Gallery
Provides database, cache, fetcher, translation and sync functionality
"""

__version__ = "1.0.0"

# Export main interfaces
from .db.db_manager import TagDatabaseManager, get_db_manager
from .cache.memory_cache import HotTagsCache, get_hot_tags_cache
from .fetcher.tag_fetcher import DanbooruTagFetcher
from .translation.translation_loader import TranslationLoader, get_translation_loader
from .sync.tag_sync_manager import TagSyncManager, get_sync_manager, initialize_tag_system
from .sync.async_tag_sync import BackgroundSyncManager, get_background_sync_manager, SyncStatus

# Note: tag_sync_api is imported separately in main __init__.py
# to ensure PromptServer is ready before importing

__all__ = [
    # Database
    'TagDatabaseManager',
    'get_db_manager',

    # Cache
    'HotTagsCache',
    'get_hot_tags_cache',

    # Fetcher
    'DanbooruTagFetcher',

    # Translation
    'TranslationLoader',
    'get_translation_loader',

    # Sync
    'TagSyncManager',
    'get_sync_manager',
    'initialize_tag_system',
    'BackgroundSyncManager',
    'get_background_sync_manager',
    'SyncStatus',
]
