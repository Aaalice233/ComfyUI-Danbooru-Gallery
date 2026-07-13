"""Behavior tests for persistent post caching and local tag classification."""

from __future__ import annotations

import importlib.util
from contextlib import closing
from pathlib import Path
import sqlite3
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "py" / "danbooru_gallery" / "post_cache.py"
SPEC = importlib.util.spec_from_file_location("gallery_post_cache_test_module", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(MODULE)
GalleryPostCache = MODULE.GalleryPostCache
ADAPTER_SPEC = importlib.util.spec_from_file_location(
    "gallery_site_adapters_test_module",
    ROOT / "py" / "danbooru_gallery" / "site_adapters.py",
)
ADAPTER_MODULE = importlib.util.module_from_spec(ADAPTER_SPEC)
assert ADAPTER_SPEC.loader is not None
ADAPTER_SPEC.loader.exec_module(ADAPTER_MODULE)


class GalleryPostCacheTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        base = Path(self.temp_dir.name)
        self.cache_db = base / "post_cache.db"
        self.tags_db = base / "tags.db"
        with closing(sqlite3.connect(self.tags_db)) as connection, connection:
            connection.execute("CREATE TABLE hot_tags(tag TEXT PRIMARY KEY, category INTEGER NOT NULL)")
            connection.executemany(
                "INSERT INTO hot_tags(tag, category) VALUES (?, ?)",
                [("known_artist", 1), ("known_character", 4), ("known_meta", 5)],
            )
        self.cache = GalleryPostCache(str(self.cache_db), str(self.tags_db))

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_local_fallback_preserves_unknown_tags(self):
        post = {
            "id": "1",
            "tag_string": "known_artist known_character unknown_tag",
            "source_site": "gelbooru",
        }
        [classified] = self.cache.classify_posts("gelbooru:default", [post])
        self.assertEqual(classified["tag_string_artist"], "known_artist")
        self.assertEqual(classified["tag_string_character"], "known_character")
        self.assertEqual(classified["tag_string_general"], "unknown_tag")
        self.assertEqual(classified["_uncategorized_tags"], ["unknown_tag"])
        self.assertFalse(classified["_tag_categories_complete"])
        self.assertFalse(classified["_tag_categories_exact"])

    def test_public_detail_marks_only_parsed_categories_as_exact(self):
        adapter = ADAPTER_MODULE.GelbooruAdapter()
        html = (
            '<ul id="tag-list">'
            '<li class="tag-type-artist"><a href="index.php?page=post&s=list&tags=exact_artist">x</a></li>'
            '<li class="tag-type-general"><a href="index.php?page=post&s=list&tags=exact_general">x</a></li>'
            '</ul>'
        )
        exact = adapter.normalize_public_post_page("7", html, {"tag_string": "fallback"})
        fallback = adapter.normalize_public_post_page("8", "<html></html>", {"tag_string": "fallback"})
        self.assertTrue(exact["_tag_categories_exact"])
        self.assertEqual(exact["tag_string_artist"], "exact_artist")
        self.assertFalse(fallback["_tag_categories_exact"])

    def test_exact_detail_survives_restart_and_teaches_categories(self):
        detail = {
            "id": "2",
            "source_site": "gelbooru",
            "tag_string": "new_artist new_general",
            "tag_string_artist": "new_artist",
            "tag_string_copyright": "",
            "tag_string_character": "",
            "tag_string_general": "new_general",
            "tag_string_meta": "",
            "file_url": "https://img.example/full.jpg",
            "_gelbooru_preview_only": False,
            "_tag_categories_complete": True,
            "_tag_categories_exact": True,
            "_tag_categories_source": "gelbooru_detail",
        }
        self.cache.put_post("gelbooru:default", detail)

        restarted = GalleryPostCache(str(self.cache_db), str(self.tags_db))
        cached = restarted.get_posts("gelbooru:default", ["2"], 3600)["2"]
        self.assertEqual(cached["tag_string_artist"], "new_artist")
        self.assertTrue(cached["_gelbooru_hydrated"])

        [classified] = restarted.classify_posts(
            "gelbooru:default",
            [{"id": "3", "tag_string": "new_artist new_general"}],
        )
        self.assertEqual(classified["tag_string_artist"], "new_artist")
        self.assertEqual(classified["tag_string_general"], "new_general")
        self.assertTrue(classified["_tag_categories_complete"])
        self.assertTrue(classified["_tag_categories_exact"])

    def test_expired_post_is_not_returned(self):
        self.cache.put_post("gelbooru:default", {
            "id": "4",
            "tag_string": "known_meta",
            "_tag_categories_complete": True,
            "_tag_categories_exact": True,
        })
        with closing(sqlite3.connect(self.cache_db)) as connection, connection:
            connection.execute("UPDATE post_details SET fetched_at = 1")
        self.assertEqual(self.cache.get_posts("gelbooru:default", ["4"], 1), {})

    def test_inexact_detail_does_not_poison_category_index(self):
        self.cache.put_post("gelbooru:default", {
            "id": "5",
            "tag_string": "unverified_tag",
            "tag_string_general": "unverified_tag",
            "_tag_categories_complete": False,
            "_tag_categories_exact": False,
            "_tag_categories_source": "detail_fallback",
        })
        [classified] = self.cache.classify_posts(
            "gelbooru:default",
            [{"id": "6", "tag_string": "unverified_tag"}],
        )
        self.assertEqual(classified["_uncategorized_tags"], ["unverified_tag"])
        self.assertFalse(classified["_tag_categories_exact"])


if __name__ == "__main__":
    unittest.main()
