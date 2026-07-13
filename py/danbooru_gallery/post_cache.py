"""Persistent Gelbooru post metadata and local tag-category classification."""

from __future__ import annotations

import json
import sqlite3
import threading
import time
from contextlib import closing
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence


CATEGORY_NAMES = {
    0: "general",
    1: "artist",
    3: "copyright",
    4: "character",
    5: "meta",
}
TAG_CATEGORIES = ("artist", "copyright", "character", "general", "meta")
DETAIL_FIELDS = (
    "tag_string",
    "tag_string_artist",
    "tag_string_copyright",
    "tag_string_character",
    "tag_string_general",
    "tag_string_meta",
    "file_url",
    "large_file_url",
    "preview_file_url",
    "file_ext",
    "image_width",
    "image_height",
    "created_at",
    "rating",
    "source_site",
    "_gelbooru_preview_only",
)


def _chunks(values: Sequence[str], size: int = 400):
    for index in range(0, len(values), size):
        yield values[index:index + size]


class GalleryPostCache:
    """Small SQLite cache safe for use from the gallery executor threads."""

    def __init__(self, db_path: Optional[str] = None, fallback_tag_db_path: Optional[str] = None):
        module_dir = Path(__file__).resolve().parent
        self.db_path = Path(db_path) if db_path else module_dir / "cache" / "gallery_post_cache.db"
        self.fallback_tag_db_path = (
            Path(fallback_tag_db_path)
            if fallback_tag_db_path
            else module_dir.parent / "shared" / "data" / "tags_cache.db"
        )
        self._init_lock = threading.Lock()
        self._initialized = False

    def _connect(self):
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(str(self.db_path), timeout=5.0)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA busy_timeout=5000")
        return connection

    def _initialize(self):
        if self._initialized:
            return
        with self._init_lock:
            if self._initialized:
                return
            with closing(self._connect()) as connection, connection:
                connection.execute("PRAGMA journal_mode=WAL")
                connection.execute(
                    """
                    CREATE TABLE IF NOT EXISTS post_details (
                        source TEXT NOT NULL,
                        post_id TEXT NOT NULL,
                        payload_json TEXT NOT NULL,
                        fetched_at INTEGER NOT NULL,
                        PRIMARY KEY (source, post_id)
                    )
                    """
                )
                connection.execute(
                    """
                    CREATE TABLE IF NOT EXISTS tag_categories (
                        source TEXT NOT NULL,
                        tag TEXT NOT NULL,
                        category TEXT NOT NULL,
                        fetched_at INTEGER NOT NULL,
                        PRIMARY KEY (source, tag)
                    )
                    """
                )
                connection.execute(
                    "CREATE INDEX IF NOT EXISTS idx_post_details_fetched_at ON post_details(fetched_at)"
                )
            self._initialized = True

    def get_posts(self, source: str, post_ids: Iterable[object], max_age: int) -> Dict[str, Dict]:
        self._initialize()
        ids = list(dict.fromkeys(str(post_id) for post_id in post_ids if post_id is not None))
        if not ids:
            return {}
        cutoff = int(time.time()) - max(0, int(max_age))
        result = {}
        with closing(self._connect()) as connection:
            for chunk in _chunks(ids):
                placeholders = ",".join("?" for _ in chunk)
                rows = connection.execute(
                    f"SELECT post_id, payload_json FROM post_details "
                    f"WHERE source = ? AND fetched_at >= ? AND post_id IN ({placeholders})",
                    [source, cutoff, *chunk],
                ).fetchall()
                for row in rows:
                    try:
                        result[row["post_id"]] = json.loads(row["payload_json"])
                    except (TypeError, json.JSONDecodeError):
                        continue
        return result

    def put_post(self, source: str, post: Dict):
        post_id = post.get("id")
        if post_id is None:
            return
        self._initialize()
        payload = {key: post.get(key) for key in DETAIL_FIELDS if key in post}
        payload["id"] = str(post_id)
        payload["_gelbooru_hydrated"] = True
        categories_exact = bool(post.get("_tag_categories_exact"))
        payload["_tag_categories_complete"] = bool(post.get("_tag_categories_complete"))
        payload["_tag_categories_exact"] = categories_exact
        payload["_tag_categories_source"] = post.get("_tag_categories_source", "detail_fallback")
        now = int(time.time())
        learned_categories = []
        if categories_exact:
            for category in TAG_CATEGORIES:
                for tag in str(post.get(f"tag_string_{category}") or "").split():
                    learned_categories.append((source, tag, category, now))

        with closing(self._connect()) as connection, connection:
            connection.execute(
                """
                INSERT INTO post_details(source, post_id, payload_json, fetched_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(source, post_id) DO UPDATE SET
                    payload_json = excluded.payload_json,
                    fetched_at = excluded.fetched_at
                """,
                (source, str(post_id), json.dumps(payload, ensure_ascii=False), now),
            )
            if learned_categories:
                connection.executemany(
                    """
                    INSERT INTO tag_categories(source, tag, category, fetched_at)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(source, tag) DO UPDATE SET
                        category = excluded.category,
                        fetched_at = excluded.fetched_at
                    """,
                    learned_categories,
                )

    def merge_cached_posts(self, source: str, posts: List[Dict], max_age: int) -> List[Dict]:
        cached = self.get_posts(source, (post.get("id") for post in posts), max_age)
        if not cached:
            return posts
        return [{**post, **cached.get(str(post.get("id")), {})} for post in posts]

    def classify_posts(self, source: str, posts: List[Dict]) -> List[Dict]:
        """Classify list-page tags locally, preserving unknown tags as general."""
        self._initialize()
        tags = list(dict.fromkeys(
            tag
            for post in posts
            if not post.get("_tag_categories_exact")
            for tag in str(post.get("tag_string") or "").split()
            if tag
        ))
        if not tags:
            return posts

        exact = self._get_exact_categories(source, tags)
        fallback = self._get_fallback_categories([tag for tag in tags if tag not in exact])

        for post in posts:
            if post.get("_tag_categories_exact"):
                continue
            buckets = {category: [] for category in TAG_CATEGORIES}
            unknown = []
            used_fallback = False
            for tag in str(post.get("tag_string") or "").split():
                category = exact.get(tag)
                if category is None:
                    category = fallback.get(tag)
                    used_fallback = used_fallback or category is not None
                if category not in buckets:
                    category = "general"
                    unknown.append(tag)
                buckets[category].append(tag)
            for category, values in buckets.items():
                post[f"tag_string_{category}"] = " ".join(values)
            post["_uncategorized_tags"] = unknown
            post["_tag_categories_complete"] = not unknown
            post["_tag_categories_exact"] = not unknown and not used_fallback
            post["_tag_categories_source"] = (
                "gelbooru_local" if post["_tag_categories_exact"] else "local_fallback"
            )
        return posts

    def _get_exact_categories(self, source: str, tags: Sequence[str]) -> Dict[str, str]:
        result = {}
        with closing(self._connect()) as connection:
            for chunk in _chunks(list(tags)):
                placeholders = ",".join("?" for _ in chunk)
                rows = connection.execute(
                    f"SELECT tag, category FROM tag_categories "
                    f"WHERE source = ? AND tag IN ({placeholders})",
                    [source, *chunk],
                ).fetchall()
                result.update({row["tag"]: row["category"] for row in rows})
        return result

    def _get_fallback_categories(self, tags: Sequence[str]) -> Dict[str, str]:
        if not tags or not self.fallback_tag_db_path.exists():
            return {}
        result = {}
        try:
            connection = sqlite3.connect(f"file:{self.fallback_tag_db_path}?mode=ro", uri=True, timeout=2.0)
            connection.row_factory = sqlite3.Row
            with connection:
                for chunk in _chunks(list(tags)):
                    placeholders = ",".join("?" for _ in chunk)
                    rows = connection.execute(
                        f"SELECT tag, category FROM hot_tags WHERE tag IN ({placeholders})",
                        chunk,
                    ).fetchall()
                    for row in rows:
                        category = CATEGORY_NAMES.get(int(row["category"]))
                        if category:
                            result[row["tag"]] = category
        except (sqlite3.Error, OSError, ValueError):
            return {}
        finally:
            try:
                connection.close()
            except (NameError, sqlite3.Error):
                pass
        return result


_gallery_post_cache = GalleryPostCache()


def get_gallery_post_cache() -> GalleryPostCache:
    return _gallery_post_cache
