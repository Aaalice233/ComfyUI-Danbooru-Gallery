"""
Tag sync manager
Manages automatic tag synchronization on startup
"""

import asyncio
import time
import os
from pathlib import Path
from typing import Optional, Dict
import json

from ..db.db_manager import get_db_manager
from ..fetcher.tag_fetcher import DanbooruTagFetcher
from ..translation.translation_loader import get_translation_loader
from ..cache.memory_cache import get_hot_tags_cache


class TagSyncManager:
    """Manage tag synchronization and caching"""

    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize sync manager

        Args:
            config_path: Path to config file (auto-detect if None)
        """
        if config_path is None:
            current_dir = Path(__file__).parent  # py/global/sync
            py_dir = current_dir.parent.parent   # py/
            config_path = py_dir / "danbooru_gallery" / "config.json"

        self.config_path = Path(config_path)
        self.config = self._load_config()

        self.db_manager = get_db_manager()
        self.fetcher = DanbooruTagFetcher(
            rate_limit=self.config['tag_sync']['api_rate_limit']
        )
        self.translation_loader = get_translation_loader()

        # Initialize cache with database query mode by default
        use_database_query = self.config['cache'].get('use_database_query', True)
        self.cache = get_hot_tags_cache(use_database_query=use_database_query)

        self._initialized = False

    def _load_config(self) -> Dict:
        """Load configuration from file"""
        default_config = {
            "tag_sync": {
                "min_post_count": 100,
                "max_tags": 100000,
                "sync_interval_days": 7,
                "incremental_update_count": 10000,
                "api_rate_limit": 2
            },
            "offline_mode": {
                "enabled": True,
                "fallback_to_remote": True,
                "remote_timeout_ms": 2000
            },
            "cache": {
                "memory_cache_enabled": False,           # ✅ 优化: 禁用内存缓存
                "preload_on_startup": False,             # ✅ 优化: 禁用启动预加载
                "use_database_query": True,              # ✅ 优化: 启用数据库查询模式
                "query_result_cache_size": 500           # 查询结果缓存大小
            }
        }

        if self.config_path.exists():
            try:
                with open(self.config_path, 'r', encoding='utf-8') as f:
                    loaded_config = json.load(f)
                # Merge with defaults
                for key in default_config:
                    if key in loaded_config:
                        default_config[key].update(loaded_config[key])
                return default_config
            except Exception as e:
                print(f"[TagSync] ⚠️ Error loading config: {e}, using defaults")

        return default_config

    def _save_config(self):
        """Save configuration to file"""
        try:
            self.config_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.config_path, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[TagSync] ⚠️ Error saving config: {e}")

    async def _first_time_init(self):
        """First time initialization - fetch and build database"""
        print("\n" + "=" * 60)
        print("[TagSync] 🔄 First startup detected, initializing tag database...")
        print("[TagSync] ⏱️  This will take 5-10 minutes, please wait...")
        print("=" * 60 + "\n")

        # Initialize database
        await self.db_manager.initialize_database()

        # Fetch hot tags from Danbooru
        max_tags = self.config['tag_sync']['max_tags']
        min_post_count = self.config['tag_sync']['min_post_count']

        print(f"[TagSync] 📥 Fetching top {max_tags} hot tags (min_count={min_post_count})...")

        fetched_tags = await self.fetcher.fetch_hot_tags(
            max_tags=max_tags,
            min_post_count=min_post_count
        )

        if not fetched_tags:
            print("[TagSync] ❌ Failed to fetch tags!")
            return False

        # Load translations
        print("[TagSync] 📚 Loading translation data...")
        self.translation_loader.load_all()

        # Add translations to tags
        print("[TagSync] 🔧 Adding translations...")
        self.translation_loader.add_translations_to_tags(fetched_tags)

        # Save to database in batches
        print("[TagSync] 💾 Saving to database...")
        batch_size = 1000
        for i in range(0, len(fetched_tags), batch_size):
            batch = fetched_tags[i:i + batch_size]
            await self.db_manager.insert_tags_batch(batch)
            print(f"[TagSync] 💾 Saved {min(i + batch_size, len(fetched_tags))}/{len(fetched_tags)} tags")

        # Update sync metadata
        await self.db_manager.set_last_sync_time()
        await self.db_manager.set_metadata('initial_sync_version', '1.0')

        print("\n" + "=" * 60)
        print(f"[TagSync] ✅ Initial sync complete! {len(fetched_tags)} tags added.")
        print("=" * 60 + "\n")

        return True

    async def _incremental_update(self):
        """Incremental update - refresh top N tags"""
        print("[TagSync] 🔄 Performing incremental update...")

        update_count = self.config['tag_sync']['incremental_update_count']

        # Get existing tags
        existing_tags = await self.db_manager.get_all_tags()
        existing_tag_names = [t['tag'] for t in existing_tags]

        # Fetch updates
        updated_tags = await self.fetcher.incremental_update(
            existing_tag_names,
            update_count=update_count
        )

        if not updated_tags:
            print("[TagSync] ⚠️ Incremental update failed, skipping...")
            return

        # Add translations
        self.translation_loader.load_all()
        self.translation_loader.add_translations_to_tags(updated_tags)

        # Update database
        await self.db_manager.insert_tags_batch(updated_tags)
        await self.db_manager.set_last_sync_time()

        print(f"[TagSync] ✅ Incremental update complete!")

    async def _load_to_memory(self):
        """Load tags from database to memory cache"""
        # Skip if using database query mode
        if self.config['cache'].get('use_database_query', True):
            print("[TagSync] ℹ️ Using database query mode, skipping memory preload")
            return

        if not self.config['cache']['preload_on_startup']:
            print("[TagSync] ℹ️ Preload disabled, skipping memory cache")
            return

        print("[TagSync] 🔧 Loading tags to memory cache...")

        # Get all tags from database
        tags = await self.db_manager.get_all_tags(order_by_hot=True)

        if not tags:
            print("[TagSync] ⚠️ No tags found in database")
            return

        # Load into cache
        self.cache.load_tags(tags)

        print(f"[TagSync] ✅ Memory cache loaded with {len(tags)} tags")

    async def initialize(self):
        """Initialize tag system on startup"""
        if self._initialized:
            return True

        try:
            # Check if database exists
            db_path = Path(self.db_manager.db_path)

            if not db_path.exists():
                # First time setup
                success = await self._first_time_init()
                if not success:
                    return False
            else:
                # Database exists, perform health check first
                print("[TagSync] Checking database health...")
                is_healthy, error_msg = await self.db_manager.check_database_health()

                if not is_healthy:
                    # Database is corrupted
                    print(f"[TagSync] ⚠️ Database corruption detected: {error_msg}")
                    print("[TagSync] 🔧 Attempting automatic recovery...")

                    # Try to recover by removing corrupted database
                    recovery_success = await self.db_manager.recover_from_corruption()

                    if recovery_success:
                        print("[TagSync] ✓ Database recovery successful")
                        print("[TagSync] 🔄 Performing first-time initialization...")

                        # Perform first-time init with fresh database
                        success = await self._first_time_init()
                        if not success:
                            print("[TagSync] ❌ First-time initialization failed after recovery")
                            return False
                    else:
                        print("[TagSync] ❌ Database recovery failed")
                        print("[TagSync] 💡 Please manually delete the database file and restart ComfyUI")
                        print(f"[TagSync] Database path: {db_path}")
                        return False
                else:
                    # Database is healthy, proceed with normal initialization
                    print("[TagSync] ✓ Database health check passed")

                    await self.db_manager.initialize_database()  # Ensure schema is up to date (includes FTS5)

                    # Check if FTS5 index needs rebuilding (for database migration)
                    tag_count = await self.db_manager.get_tags_count()
                    if tag_count > 0:
                        # Check if FTS5 index exists and has data
                        conn = await self.db_manager.get_connection()
                        cursor = await conn.execute("SELECT COUNT(*) FROM hot_tags_fts")
                        row = await cursor.fetchone()
                        fts_count = row[0] if row else 0

                        if fts_count == 0:
                            # FTS5 index is empty, rebuild it
                            print(f"[TagSync] 🔧 Detected empty FTS5 index, rebuilding for {tag_count} tags...")
                            await self.db_manager.rebuild_fts_index()

                    last_sync = await self.db_manager.get_last_sync_time()
                    days_since_sync = (time.time() - last_sync) / 86400

                    sync_interval = self.config['tag_sync']['sync_interval_days']

                    if last_sync == 0:
                        # Database exists but no sync record, probably from old version
                        print("[TagSync] ⚠️ No sync metadata found, marking as synced")
                        await self.db_manager.set_last_sync_time()
                    elif days_since_sync >= sync_interval:
                        # Need update
                        print(f"[TagSync] 🔄 Tag database is {days_since_sync:.1f} days old")
                        await self._incremental_update()
                    else:
                        # Up to date
                        tag_count = await self.db_manager.get_tags_count()
                        print(f"[TagSync] ✓ Tag database up to date ({tag_count} tags, "
                              f"last sync: {days_since_sync:.1f} days ago)")

            # Load to memory cache
            await self._load_to_memory()

            self._initialized = True
            return True

        except Exception as e:
            print(f"[TagSync] ❌ Initialization error: {e}")
            import traceback
            traceback.print_exc()
            return False

        finally:
            await self.fetcher.close()

    async def force_full_sync(self):
        """Force a full synchronization"""
        print("[TagSync] 🔄 Force full synchronization...")

        # Clear existing data
        await self.db_manager.close()
        db_path = Path(self.db_manager.db_path)
        if db_path.exists():
            os.remove(db_path)
            print("[TagSync] 🗑️ Removed old database")

        # Perform first time init
        success = await self._first_time_init()

        if success:
            # Reload to memory
            await self._load_to_memory()

        await self.fetcher.close()
        return success

    def get_status(self) -> Dict:
        """Get current sync status"""
        return {
            'initialized': self._initialized,
            'cache_loaded': self.cache.is_loaded(),
            'cache_stats': self.cache.get_stats() if self.cache.is_loaded() else {},
            'config': self.config
        }


# Global sync manager instance
_sync_manager = None


def get_sync_manager() -> TagSyncManager:
    """Get global sync manager instance"""
    global _sync_manager
    if _sync_manager is None:
        _sync_manager = TagSyncManager()
    return _sync_manager


async def initialize_tag_system():
    """Initialize tag system - call this on ComfyUI startup"""
    manager = get_sync_manager()
    return await manager.initialize()


async def force_sync():
    """Force full synchronization"""
    manager = get_sync_manager()
    return await manager.force_full_sync()


# For testing
async def test_sync_manager():
    """Test sync manager"""
    manager = TagSyncManager()

    print("Testing initialization...")
    success = await manager.initialize()

    if success:
        print("\nStatus:")
        status = manager.get_status()
        print(json.dumps(status, indent=2, ensure_ascii=False))

        # Test cache
        cache = manager.cache
        if cache.is_loaded():
            print("\nTesting cache search:")
            results = cache.search_by_prefix("1girl", limit=5)
            for r in results:
                print(f"  {r['tag']} - {r['translation_cn']} (count: {r['post_count']})")

    await manager.db_manager.close()


if __name__ == "__main__":
    asyncio.run(test_sync_manager())
