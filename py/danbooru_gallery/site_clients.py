"""Independent HTTP clients for the supported gallery sites."""

from __future__ import annotations

import logging
import re
import threading
import time
import urllib.parse
from typing import Dict, Optional

import requests


logger = logging.getLogger(__name__)
SENSITIVE_QUERY_KEYS = {"api_key", "key", "login", "password", "token", "user_id"}


class RateLimiter:
    def __init__(self, min_interval_sec: float):
        self.min_interval = min_interval_sec
        self._last_ts = 0.0
        self._lock = threading.Lock()

    def wait(self) -> None:
        with self._lock:
            now = time.monotonic()
            elapsed = now - self._last_ts
            if elapsed < self.min_interval:
                time.sleep(self.min_interval - elapsed)
            self._last_ts = time.monotonic()


def _retry_delay(response, default: float = 2.0) -> float:
    retry_after = response.headers.get("Retry-After")
    try:
        if retry_after is not None:
            return min(max(float(retry_after), 0.5), 10.0)
    except (TypeError, ValueError):
        pass
    return default


def _validate_site_url(url: str, domain: str) -> None:
    parsed = urllib.parse.urlparse(url)
    host = (parsed.hostname or "").lower()
    if parsed.scheme not in ("http", "https") or not (
        host == domain or host.endswith(f".{domain}")
    ):
        raise ValueError(f"unsupported {domain} URL: {url}")


def _safe_url_for_log(url: str) -> str:
    parsed = urllib.parse.urlsplit(url)
    query = [
        (key, "***" if key.lower() in SENSITIVE_QUERY_KEYS else value)
        for key, value in urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)
    ]
    return urllib.parse.urlunsplit((
        parsed.scheme,
        parsed.netloc,
        parsed.path,
        urllib.parse.urlencode(query),
        parsed.fragment,
    ))


class DanbooruHttpClient:
    """HTTP transport isolated to donmai.us hosts."""

    DEFAULT_HEADERS = {"User-Agent": "Danbooru-Gallery/1.0"}

    def __init__(self, session: Optional[requests.Session] = None):
        self.session = session or requests.Session()
        self.rate_limiter = RateLimiter(0.2)

    def request(self, method: str, url: str, **kwargs):
        _validate_site_url(url, "donmai.us")
        headers = dict(kwargs.pop("headers", None) or {})
        for key, value in self.DEFAULT_HEADERS.items():
            headers.setdefault(key, value)

        response = None
        for attempt in range(2):
            self.rate_limiter.wait()
            response = self.session.request(method, url, headers=headers, **kwargs)
            if response.status_code not in (429, 503) or attempt == 1:
                return response
            delay = _retry_delay(response)
            logger.warning(
                "[Danbooru] %s limited; retrying in %.1fs: %s",
                response.status_code,
                delay,
                _safe_url_for_log(url),
            )
            time.sleep(delay)
        return response


class GelbooruHttpClient:
    """HTTP transport isolated to gelbooru.com hosts and session state."""

    def __init__(self):
        self._sessions: Dict[bool, requests.Session] = {}
        self._sessions_lock = threading.Lock()
        self._limiters = {
            "api": RateLimiter(0.2),
            "public": RateLimiter(0.75),
            "hydrate": RateLimiter(0.2),
            "image": RateLimiter(0.2),
        }

    @staticmethod
    def browser_headers(accept: str = "text/html,*/*") -> Dict[str, str]:
        return {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36"
            ),
            "Accept": accept,
            "Referer": "https://gelbooru.com/",
        }

    @staticmethod
    def _set_cookie(session: requests.Session, name: str, value: str) -> None:
        for domain in ("gelbooru.com", ".gelbooru.com"):
            session.cookies.set(name, value, domain=domain, path="/")

    def _configure_display_all(self, session: requests.Session) -> None:
        self._set_cookie(session, "fringeBenefits", "yup")
        self._set_cookie(session, "post_threshold", "0")
        self._set_cookie(session, "comment_threshold", "0")

        response = session.get(
            "https://gelbooru.com/index.php",
            params={"page": "account", "s": "options"},
            timeout=(8, 15),
        )
        response.raise_for_status()
        match = re.search(r'name=["\']csrf-token["\']\s+value=["\']([^"\']+)["\']', response.text, re.IGNORECASE)
        csrf_token = match.group(1) if match else ""
        if not csrf_token:
            logger.warning("[Gelbooru] options CSRF token was not found; display-all may not persist")

        response = session.post(
            "https://gelbooru.com/index.php?page=account&s=options",
            data={
                "tags": "",
                "fringeBenefits": "on",
                "cthreshold": "0",
                "pthreshold": "0",
                "my_tags": "",
                "ad_type[]": ["1", "2", "3"],
                "show_comments": "on",
                "searchPostView": "on",
                "csrf-token": csrf_token,
                "submit": "Save",
            },
            timeout=(8, 15),
        )
        response.raise_for_status()
        self._set_cookie(session, "fringeBenefits", "yup")
        self._set_cookie(session, "post_threshold", "0")
        self._set_cookie(session, "comment_threshold", "0")

    def get_session(self, display_all: bool = False, force_refresh: bool = False) -> requests.Session:
        key = bool(display_all)
        with self._sessions_lock:
            if force_refresh:
                # Do not close the replaced session here: image/hydration requests
                # may still hold it while the public-page session is refreshed.
                self._sessions.pop(key, None)
            if key in self._sessions:
                return self._sessions[key]

            session = requests.Session()
            session.headers.update(self.browser_headers())
            if key:
                try:
                    self._configure_display_all(session)
                except requests.exceptions.RequestException as exc:
                    logger.warning("[Gelbooru] failed to enable display-all; using normal session: %s", exc)
            self._sessions[key] = session
            return session

    def request(
        self,
        method: str,
        url: str,
        *,
        request_kind: str = "api",
        display_all: bool = False,
        force_refresh: bool = False,
        **kwargs,
    ):
        _validate_site_url(url, "gelbooru.com")
        if request_kind not in self._limiters:
            raise ValueError(f"unsupported Gelbooru request kind: {request_kind}")
        headers = dict(kwargs.pop("headers", None) or {})
        defaults = self.browser_headers(headers.get("Accept", "text/html,*/*"))
        for key, value in defaults.items():
            headers.setdefault(key, value)

        session = self.get_session(display_all, force_refresh)
        response = None
        for attempt in range(2):
            self._limiters[request_kind].wait()
            try:
                response = session.request(method, url, headers=headers, **kwargs)
            except requests.exceptions.RequestException as exc:
                if attempt == 1:
                    raise
                logger.warning(
                    "[Gelbooru] request failed; retrying in 3.0s: %s (%s)",
                    _safe_url_for_log(url),
                    type(exc).__name__,
                )
                time.sleep(3.0)
                continue
            if response.status_code not in (429, 503) or attempt == 1:
                return response
            delay = _retry_delay(response)
            logger.warning(
                "[Gelbooru] %s limited; retrying in %.1fs: %s",
                response.status_code,
                delay,
                _safe_url_for_log(url),
            )
            time.sleep(delay)
        return response
