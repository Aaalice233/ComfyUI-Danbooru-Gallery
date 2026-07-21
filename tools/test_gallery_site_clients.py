"""Behavior tests for isolated Danbooru and Gelbooru HTTP transports."""

from __future__ import annotations

import importlib.util
from pathlib import Path
import unittest
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "py" / "danbooru_gallery" / "site_clients.py"
SPEC = importlib.util.spec_from_file_location("gallery_site_clients_test_module", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(MODULE)


class FakeCookies:
    def __init__(self):
        self.values = []

    def set(self, name, value, **kwargs):
        self.values.append((name, value, kwargs))


class FakeResponse:
    def __init__(self, status_code=200, headers=None, text=""):
        self.status_code = status_code
        self.headers = headers or {}
        self.text = text

    def raise_for_status(self):
        if self.status_code >= 400:
            raise MODULE.requests.exceptions.HTTPError(response=self)


class FakeSession:
    def __init__(self, responses=None):
        self.headers = {}
        self.cookies = FakeCookies()
        self.responses = list(responses or [FakeResponse()])
        self.calls = []
        self.closed = False

    def request(self, method, url, **kwargs):
        self.calls.append((method, url, kwargs))
        result = self.responses.pop(0)
        if isinstance(result, BaseException):
            raise result
        return result

    def get(self, url, **kwargs):
        return self.request("GET", url, **kwargs)

    def post(self, url, **kwargs):
        return self.request("POST", url, **kwargs)

    def close(self):
        self.closed = True


class GallerySiteClientTests(unittest.TestCase):
    def test_sensitive_query_values_are_redacted_from_logs(self):
        safe_url = MODULE._safe_url_for_log(
            "https://danbooru.donmai.us/posts.json?login=alice&api_key=secret&tags=1girl"
        )
        self.assertNotIn("alice", safe_url)
        self.assertNotIn("secret", safe_url)
        self.assertIn("tags=1girl", safe_url)

    def test_transports_reject_cross_site_urls(self):
        danbooru = MODULE.DanbooruHttpClient(FakeSession())
        gelbooru = MODULE.GelbooruHttpClient()
        with self.assertRaises(ValueError):
            danbooru.request("GET", "https://gelbooru.com/index.php")
        with self.assertRaises(ValueError):
            gelbooru.request("GET", "https://danbooru.donmai.us/posts.json")

    def test_site_headers_and_sessions_are_independent(self):
        danbooru_session = FakeSession()
        gelbooru_session = FakeSession()
        danbooru = MODULE.DanbooruHttpClient(danbooru_session)
        gelbooru = MODULE.GelbooruHttpClient()
        gelbooru._sessions[False] = gelbooru_session
        danbooru.rate_limiter.min_interval = 0
        gelbooru._limiters["api"].min_interval = 0

        danbooru.request("GET", "https://danbooru.donmai.us/posts.json")
        gelbooru.request("GET", "https://gelbooru.com/index.php", request_kind="api")

        d_headers = danbooru_session.calls[0][2]["headers"]
        g_headers = gelbooru_session.calls[0][2]["headers"]
        self.assertEqual(d_headers["User-Agent"], "Danbooru-Gallery/1.0")
        self.assertNotIn("Referer", d_headers)
        self.assertEqual(g_headers["Referer"], "https://gelbooru.com/")
        self.assertIn("Mozilla/5.0", g_headers["User-Agent"])

    def test_display_all_sessions_are_kept_separate(self):
        normal_session = FakeSession()
        display_all_session = FakeSession()
        client = MODULE.GelbooruHttpClient()
        with mock.patch.object(MODULE.requests, "Session", side_effect=[normal_session, display_all_session]), \
             mock.patch.object(client, "_configure_display_all") as configure:
            self.assertIs(client.get_session(False), normal_session)
            self.assertIs(client.get_session(True), display_all_session)
            self.assertIs(client.get_session(False), normal_session)
            configure.assert_called_once_with(display_all_session)

    def test_danbooru_retry_does_not_touch_gelbooru_transport(self):
        danbooru_session = FakeSession([
            FakeResponse(429, {"Retry-After": "0.5"}),
            FakeResponse(200),
        ])
        gelbooru_session = FakeSession([FakeResponse(200)])
        danbooru = MODULE.DanbooruHttpClient(danbooru_session)
        gelbooru = MODULE.GelbooruHttpClient()
        gelbooru._sessions[False] = gelbooru_session
        danbooru.rate_limiter.min_interval = 0
        gelbooru._limiters["api"].min_interval = 0

        with mock.patch.object(MODULE.time, "sleep") as sleep:
            response = danbooru.request("GET", "https://danbooru.donmai.us/posts.json")
        self.assertEqual(response.status_code, 200)
        sleep.assert_called_once_with(0.5)
        self.assertEqual(len(gelbooru_session.calls), 0)

    def test_gelbooru_retries_network_failure_inside_its_transport(self):
        session = FakeSession([
            MODULE.requests.exceptions.ConnectionError("offline"),
            FakeResponse(200),
        ])
        client = MODULE.GelbooruHttpClient()
        client._sessions[False] = session
        client._limiters["public"].min_interval = 0
        with mock.patch.object(MODULE.time, "sleep") as sleep:
            response = client.request(
                "GET",
                "https://gelbooru.com/index.php",
                request_kind="public",
            )
        self.assertEqual(response.status_code, 200)
        sleep.assert_called_once_with(3.0)


if __name__ == "__main__":
    unittest.main()
