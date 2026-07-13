"""Offline benchmark for Gelbooru list/tag loading.

Run with the Python environment used by ComfyUI:
    python tools/benchmark_gallery_fast_paths.py

The fake session makes the benchmark deterministic and avoids contacting either
booru.  The baseline explicitly enables eager detail hydration, reproducing the
old request shape; the optimized variant uses the normal fast list path.
"""

from __future__ import annotations

import importlib.util
import logging
from pathlib import Path
import sqlite3
import sys
import tempfile
import time
from contextlib import closing
from types import ModuleType, SimpleNamespace


ROOT = Path(__file__).resolve().parents[1]


def _package(name: str, path: Path) -> ModuleType:
    module = ModuleType(name)
    module.__path__ = [str(path)]
    sys.modules[name] = module
    return module


def _load(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


class _Routes:
    def get(self, *_args, **_kwargs):
        return lambda function: function

    post = get


class _Response:
    status_code = 200
    headers = {}

    def __init__(self, text: str):
        self.text = text

    def raise_for_status(self):
        return None


class _Session:
    def __init__(self, list_html: str, detail_html: str):
        self.list_html = list_html
        self.detail_html = detail_html
        self.calls = 0

    def get(self, _url, params=None, timeout=None):
        del timeout
        self.calls += 1
        is_detail = (params or {}).get("s") == "view"
        return _Response(self.detail_html if is_detail else self.list_html)


def _load_gallery_module():
    _package("gallery_benchmark", ROOT / "py")
    _package("gallery_benchmark.danbooru_gallery", ROOT / "py" / "danbooru_gallery")
    _package("gallery_benchmark.utils", ROOT / "py" / "utils")

    logger_module = ModuleType("gallery_benchmark.utils.logger")
    logger_module.get_logger = logging.getLogger
    sys.modules[logger_module.__name__] = logger_module

    folder_paths = ModuleType("folder_paths")
    sys.modules["folder_paths"] = folder_paths
    server = ModuleType("server")
    server.PromptServer = SimpleNamespace(instance=SimpleNamespace(routes=_Routes()))
    sys.modules["server"] = server

    adapters = _load(
        "gallery_benchmark.danbooru_gallery.site_adapters",
        ROOT / "py" / "danbooru_gallery" / "site_adapters.py",
    )
    gallery = _load(
        "gallery_benchmark.danbooru_gallery.danbooru_gallery",
        ROOT / "py" / "danbooru_gallery" / "danbooru_gallery.py",
    )
    return gallery, adapters.GelbooruAdapter()


def main():
    gallery, adapter = _load_gallery_module()
    count = gallery.GELBOORU_PUBLIC_PAGE_SIZE
    list_html = "".join(
        f'<a href="index.php?page=post&s=view&id={post_id}">'
        f'<img src="//img.example/{post_id}.jpg" title="tag_{post_id} common_tag"></a>'
        for post_id in range(1, count + 1)
    )
    detail_html = '<img id="image" src="//img.example/full.jpg" width="1024" height="768">'
    expected_tags = [f"tag_{post_id} common_tag" for post_id in range(1, count + 1)]

    results = []
    for name, hydrate_details in (("baseline-eager-detail", True), ("fast-list-tags", False)):
        session = _Session(list_html, detail_html)
        gallery._get_gelbooru_session = lambda *_args, **_kwargs: session
        gallery._gelbooru_public_throttle._last_ts = 0.0
        gallery._gelbooru_hydrate_throttle._last_ts = 0.0
        started = time.perf_counter()
        posts = gallery._fetch_gelbooru_public_posts(
            adapter,
            tags="",
            limit=count,
            page=1,
            rating_query="",
            hydrate_details=hydrate_details,
        )
        elapsed = time.perf_counter() - started
        assert len(posts) == count
        assert [post["tag_string"] for post in posts] == expected_tags
        results.append((name, elapsed, session.calls))

    baseline, optimized = results
    speedup = baseline[1] / max(optimized[1], 1e-9)
    print("Variant | Time | HTTP calls | Correct?")
    for name, elapsed, calls in results:
        print(f"{name} | {elapsed:.4f}s | {calls} | yes")
    print(f"speedup | {speedup:.1f}x | first-list response | yes")

    assert baseline[2] == count + 1
    assert optimized[2] == 1
    assert optimized[1] < baseline[1]

    cache_module = sys.modules["gallery_benchmark.danbooru_gallery.post_cache"]
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        fallback_db = temp_path / "tags.db"
        with closing(sqlite3.connect(fallback_db)) as connection, connection:
            connection.execute("CREATE TABLE hot_tags(tag TEXT PRIMARY KEY, category INTEGER NOT NULL)")
            connection.executemany(
                "INSERT INTO hot_tags(tag, category) VALUES (?, ?)",
                [("common_tag", 0), *((f"tag_{post_id}", 0) for post_id in range(1, count + 1))],
            )
        cache = cache_module.GalleryPostCache(str(temp_path / "posts.db"), str(fallback_db))
        local_posts = [dict(post) for post in posts]
        started = time.perf_counter()
        classified = cache.classify_posts("gelbooru:default", local_posts)
        classify_elapsed = time.perf_counter() - started
        assert all(post["_tag_categories_complete"] for post in classified)
        assert [post["tag_string"] for post in classified] == expected_tags
        print(f"local-category-index | {classify_elapsed:.4f}s | 0 upstream calls | yes")

        for post in classified:
            cache.put_post("gelbooru:default", {
                **post,
                "file_url": f"https://img.example/{post['id']}.jpg",
                "_gelbooru_preview_only": False,
                "_tag_categories_complete": True,
                "_tag_categories_exact": True,
                "_tag_categories_source": "gelbooru_detail",
            })
        started = time.perf_counter()
        warm_posts = cache.merge_cached_posts("gelbooru:default", posts, 3600)
        warm_elapsed = time.perf_counter() - started
        assert all(post.get("_gelbooru_hydrated") for post in warm_posts)
        assert [post["tag_string"] for post in warm_posts] == expected_tags
        print(f"persistent-cache-warm | {warm_elapsed:.4f}s | 0 upstream calls | yes")


if __name__ == "__main__":
    main()
