"""
Database manager for hot tags cache
Manages SQLite database for offline tag autocomplete
"""

import aiosqlite
import os
import time
import json
from typing import List, Dict, Optional, Tuple
from pathlib import Path


class TagDatabaseManager:
    """Manage hot tags database for offline autocomplete"""

    def __init__(self, db_path: Optional[str] = None):
        if db_path is None:
            # Default to py/shared/data/tags_cache.db
            # Current file: py/shared/db/db_manager.py
            current_dir = Path(__file__).parent  # py/shared/db
            shared_dir = current_dir.parent      # py/shared
            data_dir = shared_dir / "data"
            data_dir.mkdir(parents=True, exist_ok=True)
            db_path = str(data_dir / "tags_cache.db")

        self.db_path = db_path
        self._connection = None

    async def get_connection(self) -> aiosqlite.Connection:
        """Get or create database connection"""
        if self._connection is None:
            self._connection = await aiosqlite.connect(self.db_path)
            self._connection.row_factory = aiosqlite.Row
        return self._connection

    async def close(self):
        """Close database connection"""
        if self._connection:
            await self._connection.close()
            self._connection = None

    async def initialize_database(self):
        """Create database tables if they don't exist"""
        conn = await self.get_connection()

        # Create hot_tags table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS hot_tags (
                tag TEXT PRIMARY KEY,
                category INTEGER NOT NULL,
                post_count INTEGER NOT NULL,
                translation_cn TEXT,
                last_updated INTEGER NOT NULL,
                aliases TEXT
            )
        """)

        # Create indexes for performance
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_post_count
            ON hot_tags(post_count DESC)
        """)

        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_category
            ON hot_tags(category)
        """)

        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_translation
            ON hot_tags(translation_cn)
        """)

        # Create FTS5 virtual table for full-text search (优化中文搜索性能)
        await conn.execute("""
            CREATE VIRTUAL TABLE IF NOT EXISTS hot_tags_fts USING fts5(
                tag,
                translation_cn,
                content='hot_tags',
                content_rowid='rowid',
                tokenize='unicode61'
            )
        """)

        # Create triggers to keep FTS index in sync
        # Trigger for INSERT
        await conn.execute("""
            CREATE TRIGGER IF NOT EXISTS hot_tags_ai
            AFTER INSERT ON hot_tags BEGIN
                INSERT INTO hot_tags_fts(rowid, tag, translation_cn)
                VALUES (NEW.rowid, NEW.tag, NEW.translation_cn);
            END
        """)

        # Trigger for UPDATE
        await conn.execute("""
            CREATE TRIGGER IF NOT EXISTS hot_tags_au
            AFTER UPDATE ON hot_tags BEGIN
                UPDATE hot_tags_fts
                SET tag = NEW.tag, translation_cn = NEW.translation_cn
                WHERE rowid = NEW.rowid;
            END
        """)

        # Trigger for DELETE
        await conn.execute("""
            CREATE TRIGGER IF NOT EXISTS hot_tags_ad
            AFTER DELETE ON hot_tags BEGIN
                DELETE FROM hot_tags_fts WHERE rowid = OLD.rowid;
            END
        """)

        # Create sync_metadata table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS sync_metadata (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at INTEGER
            )
        """)

        await conn.commit()
        print(f"[TagDB] ✓ Database initialized at {self.db_path}")
        print(f"[TagDB] ✓ FTS5 full-text search enabled")

    async def insert_tag(self, tag: str, category: int, post_count: int,
                        translation_cn: Optional[str] = None,
                        aliases: Optional[List[str]] = None):
        """Insert or update a tag"""
        conn = await self.get_connection()

        aliases_json = json.dumps(aliases) if aliases else None
        current_time = int(time.time())

        await conn.execute("""
            INSERT OR REPLACE INTO hot_tags
            (tag, category, post_count, translation_cn, last_updated, aliases)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (tag, category, post_count, translation_cn, current_time, aliases_json))

    async def insert_tags_batch(self, tags: List[Dict]):
        """Insert multiple tags in batch"""
        conn = await self.get_connection()
        current_time = int(time.time())

        data = []
        for tag_info in tags:
            aliases_json = json.dumps(tag_info.get('aliases')) if tag_info.get('aliases') else None
            data.append((
                tag_info['tag'],
                tag_info['category'],
                tag_info['post_count'],
                tag_info.get('translation_cn'),
                current_time,
                aliases_json
            ))

        await conn.executemany("""
            INSERT OR REPLACE INTO hot_tags
            (tag, category, post_count, translation_cn, last_updated, aliases)
            VALUES (?, ?, ?, ?, ?, ?)
        """, data)

        await conn.commit()

    async def search_tags_by_prefix(self, prefix: str, limit: int = 10) -> List[Dict]:
        """Search tags by prefix"""
        conn = await self.get_connection()

        cursor = await conn.execute("""
            SELECT tag, category, post_count, translation_cn, aliases
            FROM hot_tags
            WHERE tag LIKE ? || '%'
            ORDER BY post_count DESC
            LIMIT ?
        """, (prefix.lower(), limit))

        rows = await cursor.fetchall()

        results = []
        for row in rows:
            results.append({
                'tag': row['tag'],
                'category': row['category'],
                'post_count': row['post_count'],
                'translation_cn': row['translation_cn'],
                'aliases': json.loads(row['aliases']) if row['aliases'] else []
            })

        return results

    async def search_tags_by_translation(self, query: str, limit: int = 10) -> List[Dict]:
        """Search tags by Chinese translation (legacy method, use search_tags_optimized for better performance)"""
        conn = await self.get_connection()

        # Search with different matching strategies
        cursor = await conn.execute("""
            SELECT tag, category, post_count, translation_cn, aliases,
                CASE
                    WHEN translation_cn = ? THEN 10
                    WHEN translation_cn LIKE ? || '%' THEN 8
                    WHEN translation_cn LIKE '%' || ? || '%' THEN 4
                    ELSE 2
                END as match_score
            FROM hot_tags
            WHERE translation_cn LIKE '%' || ? || '%'
            ORDER BY match_score DESC, post_count DESC
            LIMIT ?
        """, (query, query, query, query, limit))

        rows = await cursor.fetchall()

        results = []
        for row in rows:
            results.append({
                'tag': row['tag'],
                'category': row['category'],
                'post_count': row['post_count'],
                'translation_cn': row['translation_cn'],
                'aliases': json.loads(row['aliases']) if row['aliases'] else [],
                'match_score': row['match_score']
            })

        return results

    async def search_tags_optimized(self, query: str, limit: int = 10,
                                   search_type: str = "auto") -> List[Dict]:
        """
        Optimized tag search using FTS5 for fast queries

        Args:
            query: Search query (English prefix or Chinese text)
            limit: Maximum number of results
            search_type: "english", "chinese", or "auto" (auto-detect)

        Returns:
            List of matching tags with scores
        """
        conn = await self.get_connection()

        # Auto-detect search type
        if search_type == "auto":
            # Check if query contains Chinese characters
            has_chinese = any('\u4e00' <= char <= '\u9fff' for char in query)
            search_type = "chinese" if has_chinese else "english"

        if search_type == "english":
            # English prefix search (fast with index)
            cursor = await conn.execute("""
                SELECT tag, category, post_count, translation_cn, aliases
                FROM hot_tags
                WHERE tag LIKE ? || '%'
                ORDER BY post_count DESC
                LIMIT ?
            """, (query.lower(), limit))

            rows = await cursor.fetchall()
            results = []
            for row in rows:
                results.append({
                    'tag': row['tag'],
                    'category': row['category'],
                    'post_count': row['post_count'],
                    'translation_cn': row['translation_cn'],
                    'aliases': json.loads(row['aliases']) if row['aliases'] else [],
                    'match_score': 10
                })
            return results

        else:  # Chinese search using FTS5
            # Step 1: Try exact match first (highest priority)
            cursor = await conn.execute("""
                SELECT tag, category, post_count, translation_cn, aliases
                FROM hot_tags
                WHERE translation_cn = ?
                ORDER BY post_count DESC
                LIMIT ?
            """, (query, limit))

            exact_matches = await cursor.fetchall()

            # Step 2: If not enough results, use FTS5 for fuzzy matching
            fts_results = []
            if len(exact_matches) < limit:
                remaining = limit - len(exact_matches)

                # Escape special FTS5 characters
                fts_query = query.replace('"', '""')

                cursor = await conn.execute("""
                    SELECT h.tag, h.category, h.post_count, h.translation_cn, h.aliases,
                           f.rank as fts_rank
                    FROM hot_tags_fts f
                    JOIN hot_tags h ON f.rowid = h.rowid
                    WHERE hot_tags_fts MATCH ?
                    ORDER BY f.rank, h.post_count DESC
                    LIMIT ?
                """, (fts_query, remaining))

                fts_results = await cursor.fetchall()

            # Merge results
            results = []
            seen_tags = set()

            # Add exact matches with highest score
            for row in exact_matches:
                tag = row['tag']
                if tag not in seen_tags:
                    results.append({
                        'tag': tag,
                        'category': row['category'],
                        'post_count': row['post_count'],
                        'translation_cn': row['translation_cn'],
                        'aliases': json.loads(row['aliases']) if row['aliases'] else [],
                        'match_score': 10
                    })
                    seen_tags.add(tag)

            # Add FTS matches
            for row in fts_results:
                tag = row['tag']
                if tag not in seen_tags:
                    results.append({
                        'tag': tag,
                        'category': row['category'],
                        'post_count': row['post_count'],
                        'translation_cn': row['translation_cn'],
                        'aliases': json.loads(row['aliases']) if row['aliases'] else [],
                        'match_score': 5  # Lower score for fuzzy matches
                    })
                    seen_tags.add(tag)

            return results[:limit]

    async def get_tag(self, tag: str) -> Optional[Dict]:
        """Get a specific tag"""
        conn = await self.get_connection()

        cursor = await conn.execute("""
            SELECT tag, category, post_count, translation_cn, aliases, last_updated
            FROM hot_tags
            WHERE tag = ?
        """, (tag,))

        row = await cursor.fetchone()
        if row:
            return {
                'tag': row['tag'],
                'category': row['category'],
                'post_count': row['post_count'],
                'translation_cn': row['translation_cn'],
                'aliases': json.loads(row['aliases']) if row['aliases'] else [],
                'last_updated': row['last_updated']
            }
        return None

    async def get_tags_count(self) -> int:
        """Get total number of tags in database"""
        conn = await self.get_connection()
        cursor = await conn.execute("SELECT COUNT(*) FROM hot_tags")
        row = await cursor.fetchone()
        return row[0] if row else 0

    async def get_all_tags(self, order_by_hot: bool = True) -> List[Dict]:
        """Get all tags from database"""
        conn = await self.get_connection()

        order_clause = "ORDER BY post_count DESC" if order_by_hot else ""
        cursor = await conn.execute(f"""
            SELECT tag, category, post_count, translation_cn, aliases
            FROM hot_tags
            {order_clause}
        """)

        rows = await cursor.fetchall()

        results = []
        for row in rows:
            results.append({
                'tag': row['tag'],
                'category': row['category'],
                'post_count': row['post_count'],
                'translation_cn': row['translation_cn'],
                'aliases': json.loads(row['aliases']) if row['aliases'] else []
            })

        return results

    async def delete_old_tags(self, older_than_days: int = 90):
        """Delete tags that haven't been updated in X days"""
        conn = await self.get_connection()
        cutoff_time = int(time.time()) - (older_than_days * 86400)

        cursor = await conn.execute("""
            DELETE FROM hot_tags
            WHERE last_updated < ?
        """, (cutoff_time,))

        await conn.commit()
        return cursor.rowcount

    async def set_metadata(self, key: str, value: str):
        """Set metadata value"""
        conn = await self.get_connection()
        current_time = int(time.time())

        await conn.execute("""
            INSERT OR REPLACE INTO sync_metadata (key, value, updated_at)
            VALUES (?, ?, ?)
        """, (key, value, current_time))

        await conn.commit()

    async def get_metadata(self, key: str) -> Optional[str]:
        """Get metadata value"""
        conn = await self.get_connection()

        cursor = await conn.execute("""
            SELECT value FROM sync_metadata WHERE key = ?
        """, (key,))

        row = await cursor.fetchone()
        return row['value'] if row else None

    async def get_last_sync_time(self) -> int:
        """Get last sync timestamp"""
        value = await self.get_metadata('last_sync_time')
        return int(value) if value else 0

    async def set_last_sync_time(self, timestamp: Optional[int] = None):
        """Set last sync timestamp"""
        if timestamp is None:
            timestamp = int(time.time())
        await self.set_metadata('last_sync_time', str(timestamp))

    async def get_sync_progress(self) -> Dict:
        """Get current sync progress"""
        value = await self.get_metadata('sync_progress')
        return json.loads(value) if value else {}

    async def set_sync_progress(self, progress: Dict):
        """Set sync progress"""
        await self.set_metadata('sync_progress', json.dumps(progress))

    async def clear_sync_progress(self):
        """Clear sync progress"""
        conn = await self.get_connection()
        await conn.execute("DELETE FROM sync_metadata WHERE key = 'sync_progress'")
        await conn.commit()

    async def rebuild_fts_index(self):
        """
        Rebuild FTS5 index from existing data
        Useful for migrating existing databases to FTS5
        """
        conn = await self.get_connection()

        print("[TagDB] Rebuilding FTS5 index...")

        # Clear existing FTS data
        await conn.execute("DELETE FROM hot_tags_fts")

        # Rebuild from hot_tags table
        await conn.execute("""
            INSERT INTO hot_tags_fts(rowid, tag, translation_cn)
            SELECT rowid, tag, translation_cn FROM hot_tags
        """)

        await conn.commit()

        # Get count
        cursor = await conn.execute("SELECT COUNT(*) FROM hot_tags_fts")
        row = await cursor.fetchone()
        count = row[0] if row else 0

        print(f"[TagDB] ✓ FTS5 index rebuilt with {count} entries")
        return count

    async def check_database_health(self) -> Tuple[bool, Optional[str]]:
        """
        Check database integrity and health

        Returns:
            Tuple[bool, Optional[str]]: (is_healthy, error_message)
        """
        try:
            conn = await self.get_connection()

            # Test 1: PRAGMA integrity_check
            cursor = await conn.execute("PRAGMA integrity_check")
            row = await cursor.fetchone()
            integrity_result = row[0] if row else None

            if integrity_result != "ok":
                return False, f"Database integrity check failed: {integrity_result}"

            # Test 2: Check if tables exist
            cursor = await conn.execute("""
                SELECT name FROM sqlite_master
                WHERE type='table' AND name IN ('hot_tags', 'hot_tags_fts', 'sync_metadata')
            """)
            tables = [row[0] for row in await cursor.fetchall()]

            required_tables = ['hot_tags', 'hot_tags_fts', 'sync_metadata']
            missing_tables = [t for t in required_tables if t not in tables]

            if missing_tables:
                return False, f"Missing required tables: {', '.join(missing_tables)}"

            # Test 3: Try a simple query on each table
            try:
                await conn.execute("SELECT COUNT(*) FROM hot_tags")
                await conn.execute("SELECT COUNT(*) FROM hot_tags_fts")
                await conn.execute("SELECT COUNT(*) FROM sync_metadata")
            except Exception as e:
                return False, f"Query test failed: {str(e)}"

            # All tests passed
            return True, None

        except Exception as e:
            return False, f"Health check error: {str(e)}"

    async def recover_from_corruption(self) -> bool:
        """
        Attempt to recover from database corruption by removing the corrupted file

        Returns:
            bool: True if recovery was successful (file removed), False otherwise
        """
        try:
            # Close existing connection
            await self.close()

            # Check if database file exists
            db_file = Path(self.db_path)
            if not db_file.exists():
                print("[TagDB] Database file does not exist, no recovery needed")
                return True

            # Try to remove the corrupted database file
            print(f"[TagDB] Attempting to remove corrupted database: {self.db_path}")

            import time
            max_attempts = 3
            for attempt in range(max_attempts):
                try:
                    os.remove(self.db_path)
                    print("[TagDB] ✓ Corrupted database file removed successfully")
                    return True
                except PermissionError:
                    if attempt < max_attempts - 1:
                        print(f"[TagDB] File is busy, retrying... ({attempt + 1}/{max_attempts})")
                        time.sleep(1)
                    else:
                        print("[TagDB] ✗ Failed to remove database file (still in use)")
                        return False
                except Exception as e:
                    print(f"[TagDB] ✗ Failed to remove database file: {e}")
                    return False

            return False

        except Exception as e:
            print(f"[TagDB] ✗ Recovery failed: {e}")
            return False


# Global database manager instance
_db_manager = None


def get_db_manager() -> TagDatabaseManager:
    """Get global database manager instance"""
    global _db_manager
    if _db_manager is None:
        _db_manager = TagDatabaseManager()
    return _db_manager
