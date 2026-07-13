"""Site adapters for Danbooru-compatible gallery sources."""

from __future__ import annotations

import html
import re
import urllib.parse
from typing import Any, Dict, List, Optional


class GallerySiteAdapter:
    """Base adapter that normalizes source-specific API details."""

    key = ""
    base_url = ""
    requires_auth = False
    supports_favorites = False

    def build_posts_params(self, tags: str, limit: int, page: int, rating: Optional[str]) -> Dict[str, Any]:
        raise NotImplementedError

    def build_autocomplete_params(self, query: str, limit: int) -> Dict[str, Any]:
        raise NotImplementedError

    def apply_auth_params(self, params: Dict[str, Any], credentials: Dict[str, str]) -> Dict[str, Any]:
        return params

    def normalize_posts_response(self, payload: Any) -> List[Dict[str, Any]]:
        if isinstance(payload, list):
            return payload
        return []

    def normalize_autocomplete_response(self, payload: Any) -> List[Dict[str, Any]]:
        if isinstance(payload, list):
            return payload
        return []

    @property
    def posts_url(self) -> str:
        raise NotImplementedError

    @property
    def tags_url(self) -> str:
        raise NotImplementedError


class DanbooruAdapter(GallerySiteAdapter):
    key = "danbooru"
    base_url = "https://danbooru.donmai.us"
    requires_auth = False
    supports_favorites = True

    @property
    def posts_url(self) -> str:
        return f"{self.base_url}/posts.json"

    @property
    def tags_url(self) -> str:
        return f"{self.base_url}/tags.json"

    def build_posts_params(self, tags: str, limit: int, page: int, rating: Optional[str]) -> Dict[str, Any]:
        params = {
            "tags": tags.strip(),
            "limit": limit,
            "page": page,
        }

        if rating:
            # Danbooru accepts rating tags in the tag query itself.
            params["tags"] = f"{params['tags']} {rating}".strip()

        return params

    def build_autocomplete_params(self, query: str, limit: int) -> Dict[str, Any]:
        return {
            "search[name_or_alias_matches]": f"{query}*",
            "search[order]": "count",
            "limit": limit,
        }


class GelbooruAdapter(GallerySiteAdapter):
    key = "gelbooru"
    base_url = "https://gelbooru.com"
    supports_favorites = True

    @property
    def posts_url(self) -> str:
        return f"{self.base_url}/index.php"

    @property
    def tags_url(self) -> str:
        return f"{self.base_url}/index.php"

    def build_posts_params(self, tags: str, limit: int, page: int, rating: Optional[str]) -> Dict[str, Any]:
        params = {
            "page": "dapi",
            "s": "post",
            "q": "index",
            "json": "1",
            "tags": tags.strip(),
            "limit": limit,
            # Gelbooru uses a zero-based pid for pagination.
            "pid": max(page - 1, 0),
        }

        if rating:
            params["tags"] = f"{params['tags']} {self._rating_query(rating)}".strip()

        return params

    def build_public_posts_params(self, tags: str, limit: int, page: int, rating: Optional[str]) -> Dict[str, Any]:
        public_tags = tags.strip()
        if rating:
            public_tags = f"{public_tags} {self._rating_query(rating)}".strip()

        return {
            "page": "post",
            "s": "list",
            "tags": public_tags,
            # Gelbooru's public list page uses a fixed page size of 42.
            # pid = (page-1) * 42, decoupled from the frontend's limit param.
            "pid": max(page - 1, 0) * 42,
        }

    def build_public_post_params(self, post_id: Any) -> Dict[str, Any]:
        return {
            "page": "post",
            "s": "view",
            "id": str(post_id),
        }

    def build_favorites_params(self, user_id: str, limit: int, page: int) -> Dict[str, Any]:
        return {
            "page": "dapi",
            "s": "favorite",
            "q": "index",
            "json": "1",
            "id": str(user_id),
            "limit": limit,
            "pid": max(page - 1, 0),
        }

    def normalize_favorites_response(self, payload: Any) -> List[str]:
        favorites = self._extract_list(payload)
        ids = []
        for item in favorites:
            if not isinstance(item, dict):
                continue
            post_id = item.get("favorite") or item.get("post_id") or item.get("id")
            if post_id:
                ids.append(str(post_id))
        return ids

    def build_autocomplete_params(self, query: str, limit: int) -> Dict[str, Any]:
        return {
            "page": "dapi",
            "s": "tag",
            "q": "index",
            "json": "1",
            "name_pattern": f"{query}%",
            "orderby": "count",
            "order": "DESC",
            "limit": limit,
        }

    def build_public_autocomplete_params(self, query: str, limit: int) -> Dict[str, Any]:
        return {
            "page": "autocomplete2",
            "type": "tag_query",
            "term": query,
            "limit": limit,
        }

    def apply_auth_params(self, params: Dict[str, Any], credentials: Dict[str, str]) -> Dict[str, Any]:
        user_id = (credentials.get("user_id") or "").strip()
        api_key = (credentials.get("api_key") or "").strip()
        if user_id and api_key:
            params = dict(params)
            params["user_id"] = user_id
            params["api_key"] = api_key
        return params

    def normalize_posts_response(self, payload: Any) -> List[Dict[str, Any]]:
        posts = self._extract_list(payload)
        return [self._normalize_post(post) for post in posts if isinstance(post, dict)]

    def normalize_autocomplete_response(self, payload: Any) -> List[Dict[str, Any]]:
        tags = self._extract_list(payload)
        normalized = []
        for tag in tags:
            if not isinstance(tag, dict):
                continue
            name = tag.get("name") or tag.get("tag")
            if not name:
                continue
            normalized.append({
                "name": name,
                "category": tag.get("type") or tag.get("category", 0),
                "post_count": int(tag.get("count") or tag.get("post_count") or 0),
            })
        normalized.sort(key=lambda item: item.get("post_count", 0), reverse=True)
        return normalized

    def normalize_public_autocomplete_response(self, payload: Any) -> List[Dict[str, Any]]:
        if not isinstance(payload, list):
            return []

        normalized = []
        for item in payload:
            if not isinstance(item, dict):
                continue

            name = item.get("value") or item.get("label")
            if not name:
                continue

            normalized.append({
                "name": name,
                "category": item.get("category", "tag"),
                "post_count": int(item.get("post_count") or 0),
            })

        normalized.sort(key=lambda item: item.get("post_count", 0), reverse=True)
        return normalized

    def extract_public_post_refs(self, html_text: str, limit: int) -> List[Dict[str, Any]]:
        """Extract post IDs and thumbnail URLs from Gelbooru's public list page."""
        refs = []
        seen = set()
        anchor_re = re.compile(
            r"<a\b[^>]*href=(?P<quote>['\"])(?P<href>[^'\"]*page=post[^'\"]*s=view[^'\"]*)"
            r"(?P=quote)[^>]*>(?P<body>[\s\S]*?)</a>",
            re.IGNORECASE,
        )

        for match in anchor_re.finditer(html_text or ""):
            href = self._decode_html(match.group("href"))
            post_id = self._query_param(href, "id")
            if not post_id or post_id in seen:
                continue

            body = match.group("body")
            preview_url = (
                self._extract_attr(body, "data-src")
                or self._extract_attr(body, "src")
            )
            title = self._extract_attr(body, "title") or self._extract_attr(body, "alt")
            tag_string = self._tags_from_title(title)

            refs.append({
                "id": post_id,
                "preview_file_url": self._absolute_url(preview_url),
                "tag_string": tag_string,
                "tag_string_artist": "",
                "tag_string_copyright": "",
                "tag_string_character": "",
                "tag_string_general": tag_string,
                "tag_string_meta": "",
                "image_width": 0,
                "image_height": 0,
                "md5": post_id,
                "rating": self._rating_from_tags(tag_string.split()),
                "source_site": self.key,
                "_gelbooru_preview_only": True,
            })
            seen.add(post_id)
            if len(refs) >= limit:
                break

        return refs

    def normalize_public_post_page(self, post_id: Any, html_text: str, fallback: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Normalize a Gelbooru public post page into the Danbooru-like shape used by the UI."""
        fallback = fallback or {}
        tag_groups = self._extract_tag_groups(html_text)
        all_tags = []
        for category in ("artist", "copyright", "character", "general", "meta"):
            all_tags.extend(tag_groups.get(category, []))

        tag_string = " ".join(all_tags) or fallback.get("tag_string", "")
        has_exact_categories = any(tag_groups.get(category) for category in ("artist", "copyright", "character", "general", "meta"))
        file_url = self._extract_public_file_url(html_text)
        preview_url = fallback.get("preview_file_url") or file_url
        image_width, image_height = self._extract_image_dimensions(html_text)

        normalized = {
            "id": str(post_id),
            "file_url": file_url,
            "large_file_url": file_url,
            "preview_file_url": preview_url,
            "tag_string": tag_string,
            "tag_string_artist": " ".join(tag_groups.get("artist", [])),
            "tag_string_copyright": " ".join(tag_groups.get("copyright", [])),
            "tag_string_character": " ".join(tag_groups.get("character", [])),
            "tag_string_general": " ".join(tag_groups.get("general", [])) or tag_string,
            "tag_string_meta": " ".join(tag_groups.get("meta", [])),
            "image_width": image_width,
            "image_height": image_height,
            "md5": fallback.get("md5") or str(post_id),
            "created_at": fallback.get("created_at") or self._extract_created_at(html_text),
            "rating": self._rating_from_tags(all_tags),
            "source_site": self.key,
            "_tag_categories_complete": has_exact_categories,
            "_tag_categories_exact": has_exact_categories,
            "_tag_categories_source": "gelbooru_detail" if has_exact_categories else "detail_fallback",
        }

        if normalized["file_url"]:
            normalized["file_ext"] = normalized["file_url"].rsplit(".", 1)[-1].split("?", 1)[0].lower()
            normalized["_gelbooru_preview_only"] = False
        else:
            normalized["_gelbooru_preview_only"] = True

        return normalized

    def _normalize_post(self, post: Dict[str, Any]) -> Dict[str, Any]:
        tags = (post.get("tags") or post.get("tag_string") or "").strip()
        file_url = post.get("file_url")
        preview_url = post.get("preview_url") or post.get("preview_file_url") or post.get("sample_url") or file_url
        sample_url = post.get("sample_url") or post.get("large_file_url") or file_url

        normalized = {
            **post,
            "id": post.get("id"),
            "file_url": file_url,
            "large_file_url": sample_url,
            "preview_file_url": preview_url,
            "tag_string": tags,
            # Gelbooru DAPI does not split tags into Danbooru categories.
            # The frontend hydrates public detail pages when categorized output is needed.
            "tag_string_artist": post.get("tag_string_artist", ""),
            "tag_string_copyright": post.get("tag_string_copyright", ""),
            "tag_string_character": post.get("tag_string_character", ""),
            "tag_string_general": post.get("tag_string_general", ""),
            "tag_string_meta": post.get("tag_string_meta", ""),
            "image_width": int(post.get("width") or post.get("image_width") or 0),
            "image_height": int(post.get("height") or post.get("image_height") or 0),
            "created_at": post.get("created_at") or post.get("created"),
            "md5": post.get("md5") or str(post.get("id", "")),
            "rating": self._normalize_rating(post.get("rating")),
            "source_site": self.key,
        }

        if not normalized.get("file_ext") and file_url:
            normalized["file_ext"] = file_url.rsplit(".", 1)[-1].split("?", 1)[0].lower()

        return normalized

    def _rating_query(self, rating: str) -> str:
        gelbooru_map = {
            "general": "general",
            "g": "general",
            "sensitive": "sensitive",
            "s": "sensitive",
            "questionable": "questionable",
            "q": "questionable",
            "explicit": "explicit",
            "e": "explicit",
        }
        values = [gelbooru_map.get(r.strip().lower()) for r in rating.split(",") if r.strip()]
        values = [value for value in values if value]
        if not values:
            return ""
        if len(values) == 1:
            return f"rating:{values[0]}"
        return " ".join(f"~rating:{value}" for value in values)

    def _normalize_rating(self, rating: Any) -> Any:
        rating_map = {
            "general": "general",
            "safe": "general",
            "sensitive": "sensitive",
            "questionable": "questionable",
            "explicit": "explicit",
        }
        if isinstance(rating, str):
            return rating_map.get(rating.lower(), rating)
        return rating

    def _extract_list(self, payload: Any) -> List[Any]:
        if isinstance(payload, list):
            return payload
        if isinstance(payload, dict):
            for key in ("post", "posts", "tag", "tags"):
                value = payload.get(key)
                if isinstance(value, list):
                    return value
                if isinstance(value, dict):
                    return [value]
        return []

    def _extract_tag_groups(self, html_text: str) -> Dict[str, List[str]]:
        tag_groups = {
            "artist": [],
            "copyright": [],
            "character": [],
            "general": [],
            "meta": [],
        }
        tag_list = re.search(
            r"<ul\b[^>]*id=(?P<quote>['\"])tag-list(?P=quote)[^>]*>(?P<body>[\s\S]*?)</ul>",
            html_text or "",
            re.IGNORECASE,
        )
        if not tag_list:
            return tag_groups

        li_re = re.compile(r"<li\b(?P<attrs>[^>]*)>(?P<body>[\s\S]*?)</li>", re.IGNORECASE)
        for match in li_re.finditer(tag_list.group("body")):
            classes = self._extract_attr(match.group("attrs"), "class")
            if "tag-type-" not in classes:
                continue
            body = match.group("body")
            type_match = re.search(r"\btag-type-([a-z_-]+)\b", classes, re.IGNORECASE)
            category = self._map_public_tag_type(type_match.group(1) if type_match else "general")
            tag = self._extract_tag_from_item(body)
            if tag and tag not in tag_groups[category]:
                tag_groups[category].append(tag)

        return tag_groups

    def _extract_tag_from_item(self, item_html: str) -> str:
        href_re = re.compile(
            r"href=(?P<quote>['\"])(?P<href>[^'\"]*page=post[^'\"]*tags=[^'\"]+)"
            r"(?P=quote)",
            re.IGNORECASE,
        )
        for match in href_re.finditer(item_html or ""):
            tag = self._query_param(self._decode_html(match.group("href")), "tags")
            if tag and " " not in tag and not tag.startswith("-"):
                return tag
        for match in re.finditer(r"<a\b[^>]*>(?P<body>[\s\S]*?)</a>", item_html or "", re.IGNORECASE):
            tag = self._strip_html(match.group("body"))
            if tag and tag not in {"?", "+", "-", "edit"} and " " not in tag:
                return tag
        return ""

    def _strip_html(self, value: str) -> str:
        text = re.sub(r"<[^>]+>", " ", value or "")
        text = self._decode_html(text)
        return re.sub(r"\s+", " ", text).strip()

    def _is_public_preview_url(self, value: str) -> bool:
        value = (value or "").lower()
        return "/thumbnails/" in value or "/thumbnail/" in value

    def _extract_public_file_url(self, html_text: str) -> str:
        image_tag = re.search(
            r"<img\b(?=[^>]*id=(?P<quote>['\"])image(?P=quote))[^>]*>",
            html_text or "",
            re.IGNORECASE,
        )
        if image_tag:
            for attr in ("data-full-url", "data-original", "data-src", "src"):
                src = self._extract_attr(image_tag.group(0), attr)
                url = self._absolute_url(src)
                if url and not self._is_public_preview_url(url):
                    return url

        source_tag = re.search(r"<source\b[^>]*src=(?P<quote>['\"])(?P<src>[^'\"]+)(?P=quote)", html_text or "", re.IGNORECASE)
        if source_tag:
            url = self._absolute_url(self._decode_html(source_tag.group("src")))
            if url and not self._is_public_preview_url(url):
                return url

        url_match = re.search(
            r"(?P<url>(?:https?:)?//[^'\"\s<>]*gelbooru\.com/(?:images|samples)/[^'\"\s<>]+"
            r"\.(?:jpg|jpeg|png|gif|webp|webm|mp4)(?:\?[^'\"\s<>]*)?)",
            html_text or "",
            re.IGNORECASE,
        )
        if url_match:
            url = self._absolute_url(self._decode_html(url_match.group("url")))
            if url and not self._is_public_preview_url(url):
                return url

        og_match = re.search(
            r"<meta\b[^>]*(?:property|name)=(?P<quote>['\"])og:image(?P=quote)[^>]*>",
            html_text or "",
            re.IGNORECASE,
        )
        if og_match:
            url = self._absolute_url(self._extract_attr(og_match.group(0), "content"))
            if url and not self._is_public_preview_url(url):
                return url

        return ""

    def _extract_image_dimensions(self, html_text: str) -> tuple[int, int]:
        image_tag = re.search(
            r"<img\b(?=[^>]*id=(?P<quote>['\"])image(?P=quote))[^>]*>",
            html_text or "",
            re.IGNORECASE,
        )
        if not image_tag:
            return 0, 0
        width = self._to_int(self._extract_attr(image_tag.group(0), "width"))
        height = self._to_int(self._extract_attr(image_tag.group(0), "height"))
        return width, height

    def _map_public_tag_type(self, tag_type: str) -> str:
        type_map = {
            "artist": "artist",
            "copyright": "copyright",
            "character": "character",
            "metadata": "meta",
            "meta": "meta",
            "general": "general",
        }
        return type_map.get((tag_type or "").lower(), "general")

    def _rating_from_tags(self, tags: List[str]) -> str:
        for tag in tags:
            if tag.startswith("rating:"):
                return self._normalize_rating(tag.split(":", 1)[1])
        return ""

    def _extract_created_at(self, html_text: str) -> str:
        """Extract post creation time from Gelbooru public post page."""
        # Gelbooru's sidebar: "Posted: 2007-07-16 00:19:58" plain text
        match = re.search(
            r'Posted:\s*(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2})',
            html_text or "", re.IGNORECASE,
        )
        if match:
            return match.group(1).strip().replace(" ", "T")
        # fallback: try time tag
        match = re.search(r'<time\b[^>]*datetime="([^"]+)"', html_text or "", re.IGNORECASE)
        if match:
            return match.group(1).strip()
        # last resort: bare date
        match = re.search(
            r'Posted:\s*(\d{4}-\d{2}-\d{2})',
            html_text or "", re.IGNORECASE,
        )
        if match:
            return match.group(1).strip()
        return ""

    def _tags_from_title(self, value: Optional[str]) -> str:
        if not value:
            return ""
        value = self._decode_html(value)
        value = re.sub(r"\b(?:score|rating|size|user):[^\s]+", "", value)
        return " ".join(tag for tag in value.split() if tag and not tag.startswith("-"))

    def _query_param(self, value: str, key: str) -> str:
        value = self._decode_html(value or "")
        try:
            parsed = urllib.parse.urlparse(value)
            params = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)
            result = params.get(key, [""])[0]
            return self._decode_html(result).strip()
        except Exception:
            match = re.search(rf"(?:\?|&){re.escape(key)}=([^&]+)", value)
            return self._decode_html(urllib.parse.unquote_plus(match.group(1))).strip() if match else ""

    def _extract_attr(self, html_text: str, name: str) -> str:
        match = re.search(
            rf"\b{re.escape(name)}=(?P<quote>['\"])(?P<value>.*?)(?P=quote)",
            html_text or "",
            re.IGNORECASE,
        )
        return self._decode_html(match.group("value")).strip() if match else ""

    def _absolute_url(self, value: Optional[str]) -> str:
        if not value:
            return ""
        value = self._decode_html(value).strip()
        if value.startswith("//"):
            return f"https:{value}"
        if value.startswith("/"):
            return urllib.parse.urljoin(self.base_url, value)
        return value

    def _decode_html(self, value: str) -> str:
        return html.unescape(value or "")

    def _to_int(self, value: Any) -> int:
        try:
            return int(value)
        except (TypeError, ValueError):
            return 0


ADAPTERS = {
    DanbooruAdapter.key: DanbooruAdapter(),
    GelbooruAdapter.key: GelbooruAdapter(),
}


def get_site_adapter(source: Optional[str]) -> GallerySiteAdapter:
    source_key = (source or DanbooruAdapter.key).strip().lower()
    return ADAPTERS.get(source_key, ADAPTERS[DanbooruAdapter.key])
