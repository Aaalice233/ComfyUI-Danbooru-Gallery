"""
Asynchronous tag sync manager
Runs tag synchronization in background thread without blocking ComfyUI startup
"""

import asyncio
import threading
import time
import logging
from typing import Optional, Dict, Callable
from enum import Enum

logger = logging.getLogger("DanbooruGallery.AsyncSync")


class SyncStatus(Enum):
    """Sync status enumeration"""
    IDLE = "idle"
    INITIALIZING = "initializing"
    FETCHING = "fetching"
    TRANSLATING = "translating"
    SAVING = "saving"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class BackgroundSyncManager:
    """
    Manages background tag synchronization
    Runs in separate thread with its own event loop
    """

    def __init__(self):
        self.status = SyncStatus.IDLE
        self.progress = 0.0  # 0.0 - 1.0
        self.current_task = ""
        self.error_message = ""

        # Statistics
        self.total_tags = 0
        self.fetched_tags = 0
        self.current_page = 0
        self.estimated_pages = 0

        # Control flags
        self._thread: Optional[threading.Thread] = None
        self._running = False
        self._cancel_requested = False

        # Callback for progress updates
        self._progress_callback: Optional[Callable[[Dict], None]] = None

        # Lock for thread-safe access
        self._lock = threading.Lock()

    def set_progress_callback(self, callback: Callable[[Dict], None]):
        """
        Set callback for progress updates

        Args:
            callback: Function to call with progress dict
        """
        self._progress_callback = callback

    def _update_progress(self, status: SyncStatus = None,
                        progress: float = None,
                        current_task: str = None,
                        **kwargs):
        """
        Update progress and notify callback

        Args:
            status: New status
            progress: Progress value (0.0 - 1.0)
            current_task: Current task description
            **kwargs: Additional data to include in progress dict
        """
        with self._lock:
            if status is not None:
                self.status = status
            if progress is not None:
                self.progress = progress
            if current_task is not None:
                self.current_task = current_task

            # Update additional fields
            for key, value in kwargs.items():
                if hasattr(self, key):
                    setattr(self, key, value)

            # Build progress dict
            progress_dict = {
                'status': self.status.value,
                'progress': self.progress,
                'current_task': self.current_task,
                'total_tags': self.total_tags,
                'fetched_tags': self.fetched_tags,
                'current_page': self.current_page,
                'estimated_pages': self.estimated_pages,
                'error_message': self.error_message,
            }

        # Call callback outside of lock
        if self._progress_callback:
            try:
                self._progress_callback(progress_dict)
            except Exception as e:
                logger.error(f"[AsyncSync] Error in progress callback: {e}")

    def get_status(self) -> Dict:
        """Get current status (thread-safe)"""
        with self._lock:
            return {
                'status': self.status.value,
                'progress': self.progress,
                'current_task': self.current_task,
                'total_tags': self.total_tags,
                'fetched_tags': self.fetched_tags,
                'current_page': self.current_page,
                'estimated_pages': self.estimated_pages,
                'error_message': self.error_message,
                'running': self._running,
            }

    async def _run_sync_task(self, sync_mode: str = "auto"):
        """
        Run synchronization task asynchronously

        Args:
            sync_mode: "auto", "full", or "incremental"
        """
        from .tag_sync_manager import get_sync_manager
        from ..db.db_manager import get_db_manager

        manager = get_sync_manager()

        try:
            self._update_progress(
                status=SyncStatus.INITIALIZING,
                progress=0.0,
                current_task="初始化同步系统..."
            )

            # Check if database exists
            from pathlib import Path
            db_path = Path(get_db_manager().db_path)
            needs_full_sync = not db_path.exists()

            # Determine sync mode
            if sync_mode == "auto":
                if needs_full_sync:
                    sync_mode = "full"
                else:
                    # Check if update needed
                    last_sync = await get_db_manager().get_last_sync_time()
                    days_since_sync = (time.time() - last_sync) / 86400
                    sync_interval = manager.config['tag_sync']['sync_interval_days']

                    if last_sync == 0 or days_since_sync >= sync_interval:
                        sync_mode = "incremental"
                    else:
                        # Already up to date
                        self._update_progress(
                            status=SyncStatus.COMPLETED,
                            progress=1.0,
                            current_task="标签数据库已是最新"
                        )
                        return True

            # Define progress callback
            def fetch_progress(current_page, estimated_pages, fetched_count):
                if self._cancel_requested:
                    raise asyncio.CancelledError("User cancelled")

                self._update_progress(
                    status=SyncStatus.FETCHING,
                    progress=0.1 + (current_page / max(estimated_pages, 1)) * 0.7,
                    current_task=f"抓取标签数据 (第 {current_page}/{estimated_pages} 页)",
                    current_page=current_page,
                    estimated_pages=estimated_pages,
                    fetched_tags=fetched_count
                )

            # Run sync based on mode
            if sync_mode == "full":
                logger.info("[AsyncSync] Starting full synchronization...")

                # Initialize database (includes FTS5 virtual table)
                await get_db_manager().initialize_database()

                # Check if database has data but FTS index is empty (migration case)
                db = get_db_manager()
                tag_count = await db.get_tags_count()
                if tag_count > 0:
                    # Rebuild FTS5 index for existing data
                    self._update_progress(
                        status=SyncStatus.SAVING,
                        progress=0.05,
                        current_task="重建全文搜索索引..."
                    )
                    await db.rebuild_fts_index()
                    logger.info(f"[AsyncSync] Rebuilt FTS5 index for {tag_count} existing tags")

                # Fetch tags
                self._update_progress(
                    status=SyncStatus.FETCHING,
                    progress=0.1,
                    current_task="开始抓取热门标签..."
                )

                max_tags = manager.config['tag_sync']['max_tags']
                min_post_count = manager.config['tag_sync']['min_post_count']

                fetched_tags = await manager.fetcher.fetch_hot_tags(
                    max_tags=max_tags,
                    min_post_count=min_post_count,
                    progress_callback=fetch_progress
                )

                if not fetched_tags:
                    raise Exception("无法抓取标签数据")

                self._update_progress(
                    status=SyncStatus.TRANSLATING,
                    progress=0.8,
                    current_task="加载翻译数据...",
                    total_tags=len(fetched_tags)
                )

                # Add translations
                manager.translation_loader.load_all()
                manager.translation_loader.add_translations_to_tags(fetched_tags)

                # Save to database
                self._update_progress(
                    status=SyncStatus.SAVING,
                    progress=0.85,
                    current_task="保存到数据库..."
                )

                batch_size = 1000
                for i in range(0, len(fetched_tags), batch_size):
                    if self._cancel_requested:
                        raise asyncio.CancelledError("User cancelled")

                    batch = fetched_tags[i:i + batch_size]
                    await get_db_manager().insert_tags_batch(batch)

                    progress = 0.85 + (i / len(fetched_tags)) * 0.1
                    self._update_progress(
                        progress=progress,
                        current_task=f"保存标签 ({i + len(batch)}/{len(fetched_tags)})"
                    )

                # Update metadata
                await get_db_manager().set_last_sync_time()
                await get_db_manager().set_metadata('initial_sync_version', '1.0')

            elif sync_mode == "incremental":
                logger.info("[AsyncSync] Starting incremental update...")

                self._update_progress(
                    status=SyncStatus.FETCHING,
                    progress=0.2,
                    current_task="增量更新标签数据..."
                )

                await manager._incremental_update()

            # Load to memory cache
            self._update_progress(
                status=SyncStatus.SAVING,
                progress=0.95,
                current_task="加载到内存缓存..."
            )

            await manager._load_to_memory()

            # Complete
            self._update_progress(
                status=SyncStatus.COMPLETED,
                progress=1.0,
                current_task="同步完成!"
            )

            logger.info(f"[AsyncSync] Synchronization completed successfully!")
            return True

        except asyncio.CancelledError:
            logger.info("[AsyncSync] Synchronization cancelled by user")
            self._update_progress(
                status=SyncStatus.CANCELLED,
                current_task="同步已取消",
                error_message="用户取消了同步操作"
            )
            return False

        except Exception as e:
            logger.error(f"[AsyncSync] Synchronization failed: {e}")
            import traceback
            traceback.print_exc()

            # Check if it's a network error
            error_msg = str(e)
            if "ConnectionError" in str(type(e)) or "TimeoutError" in str(type(e)):
                error_msg = "网络连接失败，请检查网络连接。如果使用代理，请确保开启了 TUN 模式。"

            self._update_progress(
                status=SyncStatus.FAILED,
                current_task="同步失败",
                error_message=error_msg
            )
            return False

        finally:
            await manager.fetcher.close()

    def _thread_worker(self, sync_mode: str):
        """Worker function that runs in background thread"""
        try:
            # Create new event loop for this thread
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

            # Run sync task
            loop.run_until_complete(self._run_sync_task(sync_mode))

        except Exception as e:
            logger.error(f"[AsyncSync] Thread worker error: {e}")
            import traceback
            traceback.print_exc()
        finally:
            loop.close()
            with self._lock:
                self._running = False

    def start_sync(self, sync_mode: str = "auto") -> bool:
        """
        Start background synchronization

        Args:
            sync_mode: "auto", "full", or "incremental"

        Returns:
            True if started, False if already running
        """
        with self._lock:
            if self._running:
                logger.warning("[AsyncSync] Sync already running")
                return False

            self._running = True
            self._cancel_requested = False

        # Start background thread
        self._thread = threading.Thread(
            target=self._thread_worker,
            args=(sync_mode,),
            daemon=True,
            name="DanbooruTagSync"
        )
        self._thread.start()

        logger.info(f"[AsyncSync] Background sync started (mode: {sync_mode})")
        return True

    def cancel_sync(self):
        """Request cancellation of running sync"""
        with self._lock:
            if not self._running:
                return
            self._cancel_requested = True

        logger.info("[AsyncSync] Sync cancellation requested")

    def is_running(self) -> bool:
        """Check if sync is currently running"""
        with self._lock:
            return self._running


# Global background sync manager instance
_background_sync_manager = None


def get_background_sync_manager() -> BackgroundSyncManager:
    """Get global background sync manager instance"""
    global _background_sync_manager
    if _background_sync_manager is None:
        _background_sync_manager = BackgroundSyncManager()
    return _background_sync_manager
