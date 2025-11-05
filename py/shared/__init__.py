"""
Global shared modules for ComfyUI-Danbooru-Gallery
Provides database, cache, fetcher, translation and sync functionality
"""

__version__ = "1.0.0"

# Export main interfaces
try:
    from .db.db_manager import TagDatabaseManager, get_db_manager
except ImportError as e:
    print(f"[DanbooruGallery.shared] Warning: db_manager import failed: {e}")
    TagDatabaseManager = None
    get_db_manager = None

try:
    from .cache.memory_cache import HotTagsCache, get_hot_tags_cache
except (ImportError, ModuleNotFoundError):
    # cache 模块是可选的（用于智能补全缓存）
    HotTagsCache = None
    get_hot_tags_cache = None

try:
    from .fetcher.tag_fetcher import DanbooruTagFetcher
except ImportError as e:
    print(f"[DanbooruGallery.shared] Warning: tag_fetcher import failed: {e}")
    DanbooruTagFetcher = None

try:
    from .translation.translation_loader import TranslationLoader, get_translation_loader
except ImportError as e:
    print(f"[DanbooruGallery.shared] Warning: translation_loader import failed: {e}")
    TranslationLoader = None
    get_translation_loader = None

try:
    from .sync.tag_sync_manager import TagSyncManager, get_sync_manager, initialize_tag_system
except (ImportError, ModuleNotFoundError):
    # sync 模块依赖 cache 模块，如果 cache 不可用则 sync 也不可用
    TagSyncManager = None
    get_sync_manager = None
    initialize_tag_system = None

try:
    from .sync.async_tag_sync import BackgroundSyncManager, get_background_sync_manager, SyncStatus
except (ImportError, ModuleNotFoundError):
    # async_tag_sync 依赖其他模块，可能不可用
    BackgroundSyncManager = None
    get_background_sync_manager = None
    SyncStatus = None

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
