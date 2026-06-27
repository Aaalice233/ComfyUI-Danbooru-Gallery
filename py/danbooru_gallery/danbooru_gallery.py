import requests
import json
import folder_paths
from server import PromptServer
from aiohttp import web
import time
import threading
import asyncio
import torch
import io
import urllib.request
import urllib.parse
import numpy as np
from PIL import Image
import os
import csv
import re
from requests.auth import HTTPBasicAuth
import urllib3
from pathlib import Path
import sys
from ..utils.logger import get_logger
from .site_adapters import get_site_adapter
from collections import defaultdict, deque

logger = get_logger(__name__)

# FIFO 选择队列（按 nodeId 分桶）：每次 Queue 时前端快照推入对应节点的队列，
# 节点执行时只 pop 自己 nodeId 的条目，其他节点的条目不受影响。
# 支持同一工作流中多个画廊节点互不干扰、主子工作流各自取自己的数据。
_selection_queues = defaultdict(deque)
_selection_queues_lock = threading.Lock()
_selection_queue_gen = 0  # 每次 push 递增，IS_CHANGED 据此让所有节点都重新执行

# 导入数据库管理器
try:
    from ..shared.db.db_manager import get_db_manager
except ImportError as e:
    logger.warning(f"[Autocomplete] 无法导入数据库管理器，将仅使用远程API模式: {e}")
    get_db_manager = None

# 禁用 SSL 警告（如果需要禁用证书验证）
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Danbooru API文档链接 https://danbooru.donmai.us/wiki_pages/help:api

# Danbooru API的基础URL
BASE_URL = "https://danbooru.donmai.us"

# 需要一个非 python-requests 的描述性 UA 才能过 Cloudflare（从 2026-04-23 起开启拦截）。
# 实测 CF 对 UA 黑名单里包含 "ComfyUI" —— 推测 Danbooru 为抵制训练数据爬取主动加的规则。
# 本节点只是图片浏览器（单图挑选，无批量导出），不参与训练数据收集，按 e621 式约定
# 使用描述性项目 UA；避开 "ComfyUI" 字样以免被 CF 误伤。
DANBOORU_HEADERS = {
    "User-Agent": "Danbooru-Gallery/1.0"
}

# 官方文档限速为 10 req/s，保守取一半 = 5 req/s（200ms 间隔），避免触发 CF 或被站方拉黑。
# 参考 deepghs/waifuc#22：Danbooru 管理员明确要求 "proper waits or backoffs"，否则会封项目。
class _RateLimiter:
    def __init__(self, min_interval_sec):
        self.min_interval = min_interval_sec
        self._last_ts = 0.0
        self._lock = threading.Lock()

    def wait(self):
        with self._lock:
            now = time.monotonic()
            elapsed = now - self._last_ts
            if elapsed < self.min_interval:
                time.sleep(self.min_interval - elapsed)
            self._last_ts = time.monotonic()

_donmai_throttle = _RateLimiter(min_interval_sec=0.2)

# Gelbooru 公开 HTML 页列表固定每页 42 张，pid 为该页首张图片的偏移量
GELBOORU_PUBLIC_PAGE_SIZE = 42

# Gelbooru 公开页抓取限流器（0.75s = ~1.33 req/s，避开 429）
_gelbooru_public_throttle = _RateLimiter(min_interval_sec=0.75)

def _danbooru_request(method, url, **kwargs):
    """统一的 donmai.us 请求入口：限流 + 默认 UA + 429/503 带 Retry-After 退避重试一次。"""
    headers = dict(kwargs.pop("headers", None) or {})
    for k, v in DANBOORU_HEADERS.items():
        headers.setdefault(k, v)

    resp = None
    for attempt in range(2):
        _donmai_throttle.wait()
        resp = requests.request(method, url, headers=headers, **kwargs)
        if resp.status_code not in (429, 503) or attempt == 1:
            return resp
        retry_after = resp.headers.get("Retry-After")
        delay = 2.0
        try:
            if retry_after is not None:
                delay = min(max(float(retry_after), 0.5), 10.0)
        except ValueError:
            pass
        logger.warning(f"[Danbooru] {resp.status_code} 限流，{delay:.1f}s 后重试: {url}")
        time.sleep(delay)
    return resp

# 获取插件目录路径
# 获取当前文件所在目录
PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
SETTINGS_FILE = os.path.join(PLUGIN_DIR, "settings.json")

def load_settings():
    """从本地文件加载所有设置"""
    default_settings = {
        "language": "zh",
        "blacklist": [],
        "filter_tags": [
            "watermark", "sample_watermark", "weibo_username", "weibo", "weibo_logo",
            "weibo_watermark", "censored", "mosaic_censoring", "artist_name", "twitter_username"
        ],
        "filter_enabled": True,
        "danbooru_username": "",
        "danbooru_api_key": "",
        "gelbooru_user_id": "",
        "gelbooru_api_key": "",
        "gelbooru_display_all_site_content": False,
        "favorites": [],
        "debug_mode": False,
        "cache_enabled": True,
        "max_cache_age": 3600,
        "default_page_size": 20,
        "autocomplete_enabled": True,
        "tooltip_enabled": True,
        "autocomplete_max_results": 20,
        "selected_categories": ["copyright", "character", "general"],
        "source_site": "danbooru"
    }

    try:
        if os.path.exists(SETTINGS_FILE):
            with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for key, value in default_settings.items():
                    if key not in data:
                        data[key] = value
                return data
    except Exception as e:
        logger.error(f"加载设置失败: {e}")

    return default_settings

def load_autocomplete_config():
    """加载自动补全配置（用于数据库优先+API fallback机制）"""
    # 默认配置
    default_config = {
        "offline_mode": {
            "enabled": True,
            "fallback_to_remote": True,
            "remote_timeout_ms": 2000  # 2秒超时
        },
        "cache": {
            "use_database_query": True
        }
    }

    # 尝试从多个位置加载配置
    config_paths = [
        Path(PLUGIN_DIR) / "config.json",
        Path(PLUGIN_DIR).parent / "config.json",
    ]

    for config_path in config_paths:
        if config_path.exists():
            try:
                with open(config_path, 'r', encoding='utf-8') as f:
                    loaded = json.load(f)
                    # 深度合并配置
                    if "offline_mode" in loaded:
                        default_config["offline_mode"].update(loaded["offline_mode"])
                    if "cache" in loaded:
                        default_config["cache"].update(loaded["cache"])
                    logger.info(f"[Autocomplete] 加载配置: {config_path}")
                    return default_config
            except Exception as e:
                logger.warning(f"[Autocomplete] 配置文件加载失败 {config_path}: {e}")

    logger.info("[Autocomplete] 使用默认配置")
    return default_config

def save_settings(settings):
    """保存所有设置到本地文件"""
    try:
        with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
            json.dump(settings, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        logger.error(f"保存设置失败: {e}")
        return False

def load_user_auth():
    """从统一设置文件加载用户认证信息"""
    settings = load_settings()
    return settings.get("danbooru_username", ""), settings.get("danbooru_api_key", "")

def save_user_auth(username, api_key):
    """保存用户认证信息到统一设置文件"""
    settings = load_settings()
    settings["danbooru_username"] = username
    settings["danbooru_api_key"] = api_key
    return save_settings(settings)

def load_gelbooru_auth():
    """从统一设置文件加载Gelbooru API认证信息"""
    settings = load_settings()
    return settings.get("gelbooru_user_id", ""), settings.get("gelbooru_api_key", "")

def save_gelbooru_auth(user_id, api_key):
    """保存Gelbooru API认证信息到统一设置文件"""
    settings = load_settings()
    settings["gelbooru_user_id"] = user_id
    settings["gelbooru_api_key"] = api_key
    return save_settings(settings)

def get_site_credentials(adapter):
    """返回站点适配器需要的认证参数。Danbooru 使用 HTTP Basic Auth，Gelbooru 使用 query 参数。"""
    if adapter.key == "gelbooru":
        user_id, api_key = load_gelbooru_auth()
        return {"user_id": user_id, "api_key": api_key}
    return {}

def has_required_site_credentials(adapter, credentials):
    """检查当前站点适配器的必要凭据是否已配置。"""
    if adapter.key == "gelbooru":
        return bool(credentials.get("user_id") and credentials.get("api_key"))
    return True

def load_favorites():
    """从统一设置文件加载收藏列表"""
    settings = load_settings()
    return settings.get("favorites", [])

def save_favorites(favorites):
    """保存收藏列表到统一设置文件"""
    settings = load_settings()
    settings["favorites"] = favorites
    return save_settings(settings)

def load_language():
    """从统一设置文件加载语言设置"""
    settings = load_settings()
    return settings.get("language", "zh")

def save_language(language):
    """保存语言设置到统一设置文件"""
    settings = load_settings()
    settings["language"] = language
    return save_settings(settings)

def load_blacklist():
    """从统一设置文件加载黑名单"""
    settings = load_settings()
    return settings.get("blacklist", [])

def save_blacklist(blacklist_items):
    """保存黑名单到统一设置文件"""
    settings = load_settings()
    settings["blacklist"] = blacklist_items
    return save_settings(settings)

def load_filter_tags():
    """从统一设置文件加载提示词过滤设置"""
    settings = load_settings()
    return settings.get("filter_tags", []), settings.get("filter_enabled", True)

def save_filter_tags(filter_tags, enabled):
    """保存提示词过滤设置到统一设置文件"""
    settings = load_settings()
    settings["filter_tags"] = filter_tags
    settings["filter_enabled"] = enabled
    return save_settings(settings)

def load_ui_settings():
    """从统一设置文件加载UI设置"""
    settings = load_settings()
    return {
        "autocomplete_enabled": settings.get("autocomplete_enabled", True),
        "tooltip_enabled": settings.get("tooltip_enabled", True),
        "autocomplete_max_results": settings.get("autocomplete_max_results", 20),
        "selected_categories": settings.get("selected_categories", ["copyright", "character", "general"]),
        "multi_select_enabled": settings.get("multi_select_enabled", False),
        "source_site": settings.get("source_site", "danbooru"),
        "gelbooru_display_all_site_content": settings.get("gelbooru_display_all_site_content", False)
    }

def save_ui_settings(ui_settings):
    """保存UI设置到统一设置文件"""
    settings = load_settings()
    settings["autocomplete_enabled"] = ui_settings.get("autocomplete_enabled", True)
    settings["tooltip_enabled"] = ui_settings.get("tooltip_enabled", True)
    settings["autocomplete_max_results"] = ui_settings.get("autocomplete_max_results", 20)
    settings["selected_categories"] = ui_settings.get("selected_categories", ["copyright", "character", "general"])
    settings["multi_select_enabled"] = ui_settings.get("multi_select_enabled", False)
    settings["source_site"] = ui_settings.get("source_site", "danbooru")
    settings["gelbooru_display_all_site_content"] = ui_settings.get("gelbooru_display_all_site_content", False)
    return save_settings(settings)

# ================================
# Tag翻译系统
# ================================

class TagTranslationSystem:
    """Tag翻译系统，负责加载、处理和查询汉化数据"""
    
    def __init__(self):
        self.en_to_cn = {}  # 英文->中文映射
        self.cn_to_en = {}  # 中文->英文映射
        self.cn_search_index = {}  # 中文搜索索引
        self.loaded = False
        self._translation_cache = {}  # 翻译缓存
        self._search_cache = {}  # 搜索缓存
        self.max_cache_size = 1000  # 最大缓存条目数
        
    def load_translation_data(self):
        """加载所有汉化数据文件"""
        if self.loaded:
            return True
            
        try:
            zh_cn_dir = os.path.join(PLUGIN_DIR, "zh_cn")
            
            # 加载JSON格式数据
            self._load_json_data(zh_cn_dir)
            # 加载CSV格式数据
            self._load_csv_data(zh_cn_dir)
            # 加载角色CSV数据
            self._load_character_csv_data(zh_cn_dir)
            
            # 构建下划线匹配映射
            self._build_underscore_variants()
            # 构建中文搜索索引
            self._build_chinese_search_index()
            
            self.loaded = True
            return True
            
        except Exception as e:
            logger.error(f"[翻译系统] 加载失败: {e}")
            return False
    
    def _load_json_data(self, zh_cn_dir):
        """加载JSON格式的翻译数据"""
        json_file = os.path.join(zh_cn_dir, "all_tags_cn.json")
        if os.path.exists(json_file):
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for en_tag, cn_tag in data.items():
                        if en_tag and cn_tag:
                            self.en_to_cn[en_tag.strip()] = cn_tag.strip()
                            self.cn_to_en[cn_tag.strip()] = en_tag.strip()
            except Exception as e:
                logger.error(f"[翻译系统] JSON加载失败: {e}")
    
    def _load_csv_data(self, zh_cn_dir):
        """加载CSV格式的翻译数据"""
        csv_file = os.path.join(zh_cn_dir, "danbooru.csv")
        if os.path.exists(csv_file):
            try:
                with open(csv_file, 'r', encoding='utf-8') as f:
                    reader = csv.reader(f)
                    count = 0
                    for row in reader:
                        if len(row) >= 2 and row[0] and row[1]:
                            en_tag = row[0].strip()
                            cn_tag = row[1].strip()
                            # 如果已存在翻译，跳过（保持第一个找到的）
                            if en_tag not in self.en_to_cn:
                                self.en_to_cn[en_tag] = cn_tag
                            if cn_tag not in self.cn_to_en:
                                self.cn_to_en[cn_tag] = en_tag
                            count += 1
            except Exception as e:
                logger.error(f"[翻译系统] CSV加载失败: {e}")
    
    def _load_character_csv_data(self, zh_cn_dir):
        """加载角色CSV格式的翻译数据（格式：中文名称,英文tag）"""
        csv_file = os.path.join(zh_cn_dir, "wai_characters.csv")
        if os.path.exists(csv_file):
            try:
                with open(csv_file, 'r', encoding='utf-8') as f:
                    reader = csv.reader(f)
                    count = 0
                    for row in reader:
                        if len(row) >= 2 and row[0] and row[1]:
                            cn_tag = row[0].strip()
                            en_tag = row[1].strip()
                            # 如果已存在翻译，跳过（保持第一个找到的）
                            if en_tag not in self.en_to_cn:
                                self.en_to_cn[en_tag] = cn_tag
                            if cn_tag not in self.cn_to_en:
                                self.cn_to_en[cn_tag] = en_tag
                            count += 1
            except Exception as e:
                logger.error(f"[翻译系统] 角色CSV加载失败: {e}")
    
    def _build_underscore_variants(self):
        """构建下划线变体映射，处理有无下划线的匹配问题"""
        variants_to_add = {}
        
        for en_tag, cn_tag in list(self.en_to_cn.items()):
            # 为有下划线的tag生成无下划线版本
            if '_' in en_tag:
                no_underscore = en_tag.replace('_', '')
                if no_underscore not in self.en_to_cn:
                    variants_to_add[no_underscore] = cn_tag
            
            # 为无下划线的tag生成可能的下划线版本（基于常见模式）
            else:
                # 在数字和字母之间添加下划线 (如: 1girl -> 1_girl)
                with_underscore = re.sub(r'(\d)([a-zA-Z])', r'\1_\2', en_tag)
                if with_underscore != en_tag and with_underscore not in self.en_to_cn:
                    variants_to_add[with_underscore] = cn_tag
        
        # 添加变体到主字典
        self.en_to_cn.update(variants_to_add)
    
    def _build_chinese_search_index(self):
        """构建中文搜索索引，支持部分匹配"""
        for cn_tag in self.cn_to_en.keys():
            # 为中文tag的每个字符建立索引
            for i, char in enumerate(cn_tag):
                if char not in self.cn_search_index:
                    self.cn_search_index[char] = set()
                self.cn_search_index[char].add(cn_tag)
                
                # 也为子字符串建立索引（2-3字符的组合）
                for length in [2, 3]:
                    if i + length <= len(cn_tag):
                        substring = cn_tag[i:i + length]
                        if substring not in self.cn_search_index:
                            self.cn_search_index[substring] = set()
                        self.cn_search_index[substring].add(cn_tag)
        
        # 转换set为list以便JSON序列化
        for key in self.cn_search_index:
            self.cn_search_index[key] = list(self.cn_search_index[key])
            
    
    def translate_tag(self, en_tag):
        """翻译单个英文tag到中文"""
        if not self.loaded:
            self.load_translation_data()
        
        tag_key = en_tag.strip()
        
        # 检查缓存
        if tag_key in self._translation_cache:
            return self._translation_cache[tag_key]
        
        # 查找翻译
        translation = self.en_to_cn.get(tag_key)
        
        # 添加到缓存
        if len(self._translation_cache) < self.max_cache_size:
            self._translation_cache[tag_key] = translation
        
        return translation
    
    def translate_tags_batch(self, en_tags):
        """批量翻译英文tags"""
        if not self.loaded:
            self.load_translation_data()
        
        result = {}
        for tag in en_tags:
            translation = self.en_to_cn.get(tag.strip())
            if translation:
                result[tag] = translation
        return result
    
    def search_chinese_tags(self, query, limit=10):
        """搜索中文tag，返回匹配的中文tag及对应英文tag，支持模糊搜索"""
        if not self.loaded:
            self.load_translation_data()
        
        query = query.strip()
        if not query:
            return []
        
        # 检查搜索缓存
        cache_key = f"{query}:{limit}"
        if cache_key in self._search_cache:
            return self._search_cache[cache_key]
        
        matches = {}  # 使用字典存储匹配结果和权重
        
        # 1. 精确匹配（权重10）
        if query in self.cn_to_en:
            matches[query] = 10
        
        # 2. 前缀匹配（权重8）
        for cn_tag in self.cn_to_en.keys():
            if cn_tag.startswith(query) and cn_tag not in matches:
                matches[cn_tag] = 8
        
        # 3. 索引匹配（权重6）
        if query in self.cn_search_index:
            for cn_tag in self.cn_search_index[query]:
                if cn_tag not in matches:
                    matches[cn_tag] = 6
        
        # 4. 包含匹配（权重4）
        for cn_tag in self.cn_to_en.keys():
            if query in cn_tag and cn_tag not in matches:
                matches[cn_tag] = 4
        
        # 5. 模糊匹配（权重2）- 支持字符顺序模糊匹配
        if len(query) >= 2:
            query_chars = set(query)
            for cn_tag in self.cn_to_en.keys():
                if cn_tag not in matches:
                    tag_chars = set(cn_tag)
                    # 如果查询字符的50%以上都在tag中，认为是模糊匹配
                    if len(query_chars & tag_chars) / len(query_chars) >= 0.5:
                        matches[cn_tag] = 2
        
        # 6. 部分字符匹配（权重1）
        for char in query:
            if char in self.cn_search_index:
                for cn_tag in self.cn_search_index[char]:
                    if cn_tag not in matches:
                        matches[cn_tag] = 1
        
        # 按权重和长度排序
        sorted_matches = sorted(matches.items(), key=lambda x: (-x[1], len(x[0])))
        
        # 转换为结果格式并限制数量
        results = []
        for cn_tag, weight in sorted_matches[:limit]:
            en_tag = self.cn_to_en.get(cn_tag)
            if en_tag:
                results.append({
                    'chinese': cn_tag,
                    'english': en_tag,
                    'weight': weight
                })
        
        # 添加到缓存
        if len(self._search_cache) < self.max_cache_size:
            self._search_cache[cache_key] = results
        
        return results

# 全局翻译系统实例
translation_system = TagTranslationSystem()

# 预加载翻译数据
def preload_translation_data():
    """预加载翻译数据，在服务器启动时调用"""
    try:
        success = translation_system.load_translation_data()
        if not success:
            logger.warning("[翻译系统] 预加载失败")
    except Exception as e:
        logger.error(f"[翻译系统] 预加载异常: {e}")

# 在模块加载时预加载翻译数据
preload_translation_data()

def check_network_connection(source="danbooru"):
    """Check network connectivity for the selected gallery source."""
    adapter = get_site_adapter(source)
    try:
        # 使用一个简单的公开API端点来检测连接
        if adapter.key == "gelbooru":
            ui_settings = load_ui_settings()
            session = _get_gelbooru_session(ui_settings.get("gelbooru_display_all_site_content", False))
            response = session.get(
                adapter.posts_url,
                params=adapter.build_public_posts_params("", 1, 1, None),
                timeout=(8, 10),
            )
            return response.status_code == 200, False

        test_url = f"{BASE_URL}/posts.json?limit=1"
        response = _danbooru_request("GET", test_url, timeout=10)
        return response.status_code == 200, False
    except requests.exceptions.Timeout:
        logger.error("网络连接超时")
        return False, True
    except requests.exceptions.RequestException as e:
        logger.error(f"网络连接失败: {e}")
        return False, True
    except Exception as e:
        logger.error(f"网络检测发生未知错误: {e}")
        return False, True

def verify_danbooru_auth(username, api_key):
    """验证Danbooru用户认证"""
    if not username or not api_key:
        return False, False
    try:
        test_url = f"{BASE_URL}/profile.json?login={username}&api_key={api_key}"
        response = _danbooru_request("GET", test_url, auth=HTTPBasicAuth(username, api_key), timeout=15)
        is_valid = response.status_code == 200
        return is_valid, False
    except Exception as e:
        logger.error(f"验证用户认证失败: {e}")
        return False, True

def get_user_favorites(username, api_key):
    """获取用户的收藏列表"""
    try:
        favorites_url = f"{BASE_URL}/favorites.json?login={username}&api_key={api_key}"
        response = _danbooru_request("GET", favorites_url, auth=HTTPBasicAuth(username, api_key), timeout=15)
        if response.status_code == 200:
            return response.json()
        return []
    except Exception as e:
        logger.error(f"获取用户收藏列表失败: {e}")
        return []

# --- 省略其他不相关的路由和函数以保持简洁 ---

def get_gelbooru_favorites(user_id, api_key, limit=1000):
    """Fetch Gelbooru favorite post IDs for the configured user."""
    if not user_id or not api_key:
        return []
    if not str(user_id).isdigit():
        raise ValueError("Gelbooru User ID must be numeric")

    adapter = get_site_adapter("gelbooru")
    credentials = {"user_id": user_id, "api_key": api_key}

    # Gelbooru's documented favorite DAPI may return an empty list for valid API
    # credentials, while the site's own favorites link uses the fav:<user_id> tag.
    favorite_posts = []
    page = 1
    per_page = min(max(int(limit), 1), 100)
    while len(favorite_posts) < limit:
        params = adapter.build_posts_params(f"fav:{user_id}", per_page, page, None)
        params = adapter.apply_auth_params(params, credentials)
        response = _danbooru_request("GET", adapter.posts_url, params=params, timeout=15)
        response.raise_for_status()
        posts = adapter.normalize_posts_response(response.json())
        if not posts:
            break
        favorite_posts.extend(str(post.get("id")) for post in posts if post.get("id"))
        if len(posts) < per_page:
            break
        page += 1

    if favorite_posts:
        return favorite_posts[:limit]

    all_ids = []
    page = 1

    while len(all_ids) < limit:
        params = adapter.build_favorites_params(user_id, per_page, page)
        params = adapter.apply_auth_params(params, credentials)
        response = _danbooru_request("GET", adapter.posts_url, params=params, timeout=15)
        if response.status_code == 401:
            raise requests.exceptions.HTTPError("Gelbooru favorite API authentication failed", response=response)
        response.raise_for_status()
        page_ids = adapter.normalize_favorites_response(response.json())
        if not page_ids:
            break
        all_ids.extend(page_ids)
        if len(page_ids) < per_page:
            break
        page += 1

    return all_ids[:limit]

def add_gelbooru_favorite(post_id, user_id, api_key):
    """Add a Gelbooru favorite via the site's favorite endpoint."""
    if not user_id or not api_key:
        return False, "请先在设置中配置 Gelbooru User ID 和 API Key"

    session = _get_gelbooru_session(load_ui_settings().get("gelbooru_display_all_site_content", False))
    response = session.get(
        "https://gelbooru.com/public/addfav.php",
        params={"id": str(post_id), "user_id": user_id, "api_key": api_key},
        headers=_gelbooru_browser_headers("*/*"),
        timeout=(8, 15),
    )
    response.raise_for_status()
    body = (response.text or "").strip()
    if body == "1":
        return True, "已收藏，无需重复操作"
    if body == "2":
        return False, "Gelbooru 返回未登录；该站点的添加收藏接口可能不接受 API-only 认证"
    return True, "收藏成功"

def remove_gelbooru_favorite(post_id, user_id, api_key):
    """Remove a Gelbooru favorite via the site's favorite page endpoint."""
    if not user_id or not api_key:
        return False, "请先在设置中配置 Gelbooru User ID 和 API Key"

    session = _get_gelbooru_session(load_ui_settings().get("gelbooru_display_all_site_content", False))
    response = session.get(
        "https://gelbooru.com/index.php",
        params={
            "page": "favorites",
            "s": "delete",
            "id": str(post_id),
            "user_id": user_id,
            "api_key": api_key,
        },
        headers=_gelbooru_browser_headers("text/html,*/*"),
        allow_redirects=False,
        timeout=(8, 15),
    )
    if response.status_code in (200, 302, 303):
        location = response.headers.get("Location", "")
        if "account" in location and "login" in location:
            return False, "Gelbooru 返回登录页；该站点的取消收藏接口可能不接受 API-only 认证"
        return True, "取消收藏成功"
    response.raise_for_status()
    return True, "取消收藏成功"

@PromptServer.instance.routes.post("/danbooru_gallery/favorites/add")
async def add_favorite(request):
    """添加收藏"""
    try:
        data = await request.json()
        post_id = data.get("post_id")
        source = data.get("source", "danbooru")
        adapter = get_site_adapter(source)

        if not post_id:
            return web.json_response({"success": False, "error": "缺少post_id"})

        if adapter.key == "gelbooru":
            user_id, gelbooru_api_key = load_gelbooru_auth()
            try:
                ok, message = add_gelbooru_favorite(post_id, user_id, gelbooru_api_key)
                return web.json_response({"success": ok, "message": message, "error": None if ok else message})
            except requests.exceptions.Timeout:
                logger.error("[Gelbooru] 添加收藏请求超时")
                return web.json_response({"success": False, "error": "Gelbooru 收藏请求超时，请稍后重试"})
            except requests.exceptions.RequestException as e:
                logger.error(f"[Gelbooru] 添加收藏请求失败: {type(e).__name__}")
                return web.json_response({"success": False, "error": "Gelbooru 收藏请求失败，请检查网络或稍后重试"})

        username, api_key = load_user_auth()
        if not username or not api_key:
            return web.json_response({"success": False, "error": "请先在设置中配置用户名和API Key"})

        # 验证认证
        is_valid, is_network_error = verify_danbooru_auth(username, api_key)
        if is_network_error:
            return web.json_response({"success": False, "error": "网络错误，无法连接到Danbooru服务器"})
        if not is_valid:
            return web.json_response({"success": False, "error": "认证无效，请检查用户名和API Key"})

        try:
            favorite_url = f"{BASE_URL}/favorites.json?login={username}&api_key={api_key}"
            response = _danbooru_request(
                "POST",
                favorite_url,
                auth=HTTPBasicAuth(username, api_key),
                data={"post_id": post_id},
                timeout=15,
            )


            if response.status_code in [200, 201]:
                favorites = load_favorites()
                if str(post_id) not in favorites:
                    favorites.append(str(post_id))
                    save_favorites(favorites)
                return web.json_response({"success": True, "message": "收藏成功"})
            
            try:
                error_data = response.json()
                reason = error_data.get("reason", "未知")
                message = error_data.get("message", "没有提供具体信息")
            except (json.JSONDecodeError, ValueError):
                error_data = {}
                reason = "无法解析响应"
                message = response.text

            if response.status_code == 422 and "You have already favorited this post" in message:
                favorites = load_favorites()
                if str(post_id) not in favorites:
                    favorites.append(str(post_id))
                    save_favorites(favorites)
                return web.json_response({"success": True, "message": "已收藏，无需重复操作"})
                
            error_map = {
                401: "认证失败，请检查用户名和API Key",
                403: "权限不足，可能需要Gold账户或更高权限",
                404: "图片不存在",
                429: "请求过于频繁，请稍后重试 (Rate Limited)",
            }
            
            error_message = error_map.get(response.status_code, f"收藏失败，状态码: {response.status_code}, 原因: {message}")
            logger.error(error_message)
            return web.json_response({"success": False, "error": error_message})

        except requests.exceptions.Timeout:
            logger.error("添加收藏时网络请求超时")
            return web.json_response({"success": False, "error": "网络请求超时"})
        except requests.exceptions.RequestException as e:
            logger.error(f"添加收藏时网络请求失败: {e}")
            return web.json_response({"success": False, "error": f"网络请求失败: {e}"})
        except Exception as e:
            import traceback
            logger.error(f"添加收藏时发生严重错误: {e}")
            logger.error(traceback.format_exc())
            return web.json_response({"success": False, "error": f"服务器内部错误: {e}"}, status=500)

    except Exception as e:
        logger.error(f"添加收藏接口错误: {e}")
        return web.json_response({"success": False, "error": str(e)}, status=500)

@PromptServer.instance.routes.post("/danbooru_gallery/favorites/remove")
async def remove_favorite(request):
    """移除收藏"""
    try:
        data = await request.json()
        post_id = data.get("post_id")
        source = data.get("source", "danbooru")
        adapter = get_site_adapter(source)

        if not post_id:
            return web.json_response({"success": False, "error": "缺少post_id"})

        if adapter.key == "gelbooru":
            user_id, gelbooru_api_key = load_gelbooru_auth()
            try:
                ok, message = remove_gelbooru_favorite(post_id, user_id, gelbooru_api_key)
                return web.json_response({"success": ok, "message": message, "error": None if ok else message})
            except requests.exceptions.Timeout:
                logger.error("[Gelbooru] 取消收藏请求超时")
                return web.json_response({"success": False, "error": "Gelbooru 取消收藏请求超时，请稍后重试"})
            except requests.exceptions.RequestException as e:
                logger.error(f"[Gelbooru] 取消收藏请求失败: {type(e).__name__}")
                return web.json_response({"success": False, "error": "Gelbooru 取消收藏请求失败，请检查网络或稍后重试"})
        
        username, api_key = load_user_auth()
        if not username or not api_key:
            return web.json_response({"success": False, "error": "请先在设置中配置用户名和API Key"})

        # 验证认证
        is_valid, is_network_error = verify_danbooru_auth(username, api_key)
        if is_network_error:
            return web.json_response({"success": False, "error": "网络错误，无法连接到Danbooru服务器"})
        if not is_valid:
            return web.json_response({"success": False, "error": "认证无效，请检查用户名和API Key"})
        
        try:
            # 直接使用帖子ID删除收藏
            delete_url = f"{BASE_URL}/favorites/{post_id}.json?login={username}&api_key={api_key}"
            delete_response = _danbooru_request("DELETE", delete_url, auth=HTTPBasicAuth(username, api_key), timeout=15)


            if delete_response.status_code in [200, 204]:
                favorites = load_favorites()
                if str(post_id) in favorites:
                    favorites.remove(str(post_id))
                    save_favorites(favorites)
                return web.json_response({"success": True, "message": "取消收藏成功"})
            elif delete_response.status_code == 404:
                # 如果收藏不存在，视为已删除
                favorites = load_favorites()
                if str(post_id) in favorites:
                    favorites.remove(str(post_id))
                    save_favorites(favorites)
                return web.json_response({"success": True, "message": "该图片未在云端收藏，本地已同步"})

            # 如果有收藏记录但删除失败，解析错误
            try:
                error_data = delete_response.json()
                reason = error_data.get("reason", "未知")
                message = error_data.get("message", "没有提供具体信息")
            except (json.JSONDecodeError, ValueError):
                error_data = {}
                reason = "无法解析响应"
                message = delete_response.text

            error_map = {
                401: "认证失败，请检查用户名和API Key",
                403: "权限不足，可能需要Gold账户",
                404: "收藏记录不存在",
                429: "请求过于频繁，请稍后重试 (Rate Limited)",
            }

            error_message = error_map.get(delete_response.status_code, f"取消收藏失败，状态码: {delete_response.status_code}, 原因: {message}")
            logger.error(error_message)
            return web.json_response({"success": False, "error": error_message})

        except requests.exceptions.Timeout:
            logger.error("移除收藏时网络请求超时")
            return web.json_response({"success": False, "error": "网络请求超时"})
        except requests.exceptions.RequestException as e:
            logger.error(f"移除收藏时网络请求失败: {e}")
            return web.json_response({"success": False, "error": f"网络请求失败: {e}"})
        except Exception as e:
            import traceback
            logger.error(f"移除收藏时发生严重错误: {e}")
            logger.error(traceback.format_exc())
            return web.json_response({"success": False, "error": f"服务器内部错误: {e}"}, status=500)

    except Exception as e:
        logger.error(f"移除收藏接口错误: {e}")
        return web.json_response({"success": False, "error": str(e)}, status=500)

@PromptServer.instance.routes.get("/danbooru_gallery/user_auth")
async def get_user_auth_route(request):
    """获取用户认证信息"""
    try:
        username, api_key = load_user_auth()
        gelbooru_user_id, gelbooru_api_key = load_gelbooru_auth()
        has_auth = bool(username and api_key)
        return web.json_response({
            "success": True,
            "username": username,
            "api_key": api_key,
            "has_auth": has_auth,
            "gelbooru_user_id": gelbooru_user_id,
            "gelbooru_api_key": gelbooru_api_key,
            "gelbooru_has_auth": bool(gelbooru_user_id and gelbooru_api_key)
        })
    except Exception as e:
        logger.error(f"获取用户认证接口错误: {e}")
        return web.json_response({"success": False, "error": str(e)}, status=500)

@PromptServer.instance.routes.get("/danbooru_gallery/favorites")
async def get_favorites_route(request):
    """获取收藏列表"""
    try:
        source = request.query.get("source") or load_ui_settings().get("source_site", "danbooru")
        adapter = get_site_adapter(source)
        if adapter.key == "gelbooru":
            user_id, gelbooru_api_key = load_gelbooru_auth()
            if not user_id or not gelbooru_api_key:
                return web.json_response({
                    "success": False,
                    "favorites": [],
                    "source": adapter.key,
                    "error": "请先在设置中配置 Gelbooru User ID 和 API Key"
                })
            try:
                favorites = get_gelbooru_favorites(user_id, gelbooru_api_key)
                return web.json_response({"success": True, "favorites": favorites, "source": adapter.key})
            except requests.exceptions.Timeout:
                logger.error("[Gelbooru] 获取收藏列表超时")
                return web.json_response({
                    "success": False,
                    "favorites": [],
                    "source": adapter.key,
                    "error": "Gelbooru 收藏列表读取超时，请稍后重试"
                })
            except requests.exceptions.HTTPError as e:
                status_code = e.response.status_code if e.response is not None else "unknown"
                logger.error(f"[Gelbooru] 获取收藏列表失败: HTTP {status_code}")
                return web.json_response({
                    "success": False,
                    "favorites": [],
                    "source": adapter.key,
                    "error": "Gelbooru 收藏列表读取失败，请检查 User ID/API Key 是否有效"
                })
            except ValueError as e:
                logger.error(f"[Gelbooru] 收藏列表配置无效: {e}")
                return web.json_response({
                    "success": False,
                    "favorites": [],
                    "source": adapter.key,
                    "error": "Gelbooru User ID 必须是数字 ID，不是用户名"
                })
            except requests.exceptions.RequestException as e:
                logger.error(f"[Gelbooru] 获取收藏列表请求失败: {type(e).__name__}")
                return web.json_response({
                    "success": False,
                    "favorites": [],
                    "source": adapter.key,
                    "error": "Gelbooru 收藏列表请求失败，请检查网络或稍后重试"
                })

        favorites = load_favorites()
        return web.json_response({"success": True, "favorites": favorites, "source": adapter.key})
    except Exception as e:
        logger.error(f"获取收藏列表接口错误: {e}")
        return web.json_response({"success": False, "error": str(e)}, status=500)

@PromptServer.instance.routes.post("/danbooru_gallery/user_auth")
async def save_user_auth_route(request):
    """保存用户认证信息"""
    try:
        data = await request.json()
        username = data.get("username", "")
        api_key = data.get("api_key", "")
        gelbooru_user_id = data.get("gelbooru_user_id", "")
        gelbooru_api_key = data.get("gelbooru_api_key", "")
        if save_user_auth(username, api_key) and save_gelbooru_auth(gelbooru_user_id, gelbooru_api_key):
            return web.json_response({"success": True})
        else:
            return web.json_response({"success": False, "error": "无法保存用户认证信息"}, status=500)
    except Exception as e:
        logger.error(f"保存用户认证接口错误: {e}")
        return web.json_response({"success": False, "error": str(e)}, status=500)

@PromptServer.instance.routes.get("/danbooru_gallery/check_network")
async def check_network(request):
    """检测网络连接状态"""
    try:
        source = request.query.get("source") or load_ui_settings().get("source_site", "danbooru")
        adapter = get_site_adapter(source)
        is_connected, is_network_error = check_network_connection(adapter.key)
        return web.json_response({
            "success": True,
            "connected": is_connected,
            "network_error": is_network_error,
            "source": adapter.key
        })
    except Exception as e:
        logger.error(f"网络检测接口错误: {e}")
        return web.json_response({"success": False, "error": "网络检测失败", "network_error": True}, status=500)

@PromptServer.instance.routes.post("/danbooru_gallery/verify_auth")
async def verify_auth(request):
    """验证用户认证"""
    try:
        data = await request.json()
        username = data.get("username", "")
        api_key = data.get("api_key", "")

        if not username or not api_key:
            return web.json_response({"success": False, "error": "缺少用户名或API Key"})

        is_valid, is_network_error = verify_danbooru_auth(username, api_key)
        return web.json_response({"success": True, "valid": is_valid, "network_error": is_network_error})
    except Exception as e:
        logger.error(f"验证认证接口错误: {e}")
        return web.json_response({"success": False, "error": "网络错误", "network_error": True}, status=500)

# 图片代理并发上限：浏览器一次打开一页会 lazy-load 多张缩略图，没有上限会导致
# 后端同时发出十几个 CDN 请求，配合全局限流会形成长队列；限到 3 并发即可让缩略图
# 平滑流入，又避免瞬时流量把 CF 的 rate rule 触发。
_image_proxy_semaphore = None
_gelbooru_session = None
_gelbooru_session_display_all = None
_gelbooru_session_lock = threading.Lock()

def _get_image_proxy_semaphore():
    global _image_proxy_semaphore
    if _image_proxy_semaphore is None:
        _image_proxy_semaphore = asyncio.Semaphore(1)
    return _image_proxy_semaphore

def _gelbooru_browser_headers(accept="text/html,*/*"):
    return {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
        "Accept": accept,
        "Referer": "https://gelbooru.com/",
    }

def _gelbooru_set_cookie(session, name, value):
    for domain in ("gelbooru.com", ".gelbooru.com"):
        session.cookies.set(name, value, domain=domain, path="/")

def _gelbooru_public_page_requires_options(html_text):
    """Detect Gelbooru's anonymous page that says results are hidden by site options."""
    if not html_text:
        return False
    return (
        "Check your blacklist" in html_text
        and "Nobody here but us" in html_text
    )

def _configure_gelbooru_display_all_session(session):
    """Apply Gelbooru anonymous options for fringe/gore searches."""
    _gelbooru_set_cookie(session, "fringeBenefits", "yup")
    _gelbooru_set_cookie(session, "post_threshold", "0")
    _gelbooru_set_cookie(session, "comment_threshold", "0")

    options_response = session.get(
        "https://gelbooru.com/index.php",
        params={"page": "account", "s": "options"},
        timeout=(8, 15),
    )
    options_response.raise_for_status()

    csrf_match = re.search(r'name=["\']csrf-token["\']\s+value=["\']([^"\']+)["\']', options_response.text, re.IGNORECASE)
    csrf_token = csrf_match.group(1) if csrf_match else ""
    if not csrf_token:
        logger.warning("[Gelbooru] options CSRF token was not found; Display all site content may not persist")

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

    _gelbooru_set_cookie(session, "fringeBenefits", "yup")
    _gelbooru_set_cookie(session, "post_threshold", "0")
    _gelbooru_set_cookie(session, "comment_threshold", "0")

    fringe_enabled = bool(re.search(r'name=["\']fringeBenefits["\'][^>]*checked', response.text, re.IGNORECASE))
    blacklist_empty = bool(re.search(r'<textarea\b[^>]*\bid=["\']tags["\'][^>]*>\s*</textarea>', response.text, re.IGNORECASE))
    if fringe_enabled:
        logger.info("[Gelbooru] Display all site content enabled for anonymous session")
    else:
        logger.warning("[Gelbooru] Display all site content submitted, but options page did not show it as checked")
    if not blacklist_empty:
        logger.warning("[Gelbooru] Tag blacklist may not be empty after options submit")

def _get_gelbooru_session(display_all_site_content=False, force_refresh=False):
    """Return a Gelbooru session, optionally enabling the public fringe content option."""
    global _gelbooru_session, _gelbooru_session_display_all

    display_all_site_content = bool(display_all_site_content)
    with _gelbooru_session_lock:
        if not force_refresh and _gelbooru_session is not None and _gelbooru_session_display_all == display_all_site_content:
            return _gelbooru_session

        session = requests.Session()
        session.headers.update(_gelbooru_browser_headers())

        if display_all_site_content:
            try:
                _configure_gelbooru_display_all_session(session)
            except requests.exceptions.RequestException as e:
                logger.warning(f"[Gelbooru] Failed to enable Display all site content; continuing with normal session: {e}")
        if False and display_all_site_content:
            session.cookies.set("fringeBenefits", "yup", domain="gelbooru.com", path="/")
            try:
                options_response = session.get(
                    "https://gelbooru.com/index.php",
                    params={"page": "account", "s": "options"},
                    timeout=(8, 15),
                )
                csrf_match = re.search(r'name=["\']csrf-token["\']\s+value=["\']([^"\']+)["\']', options_response.text, re.IGNORECASE)
                csrf_token = csrf_match.group(1) if csrf_match else ""
                if not csrf_token:
                    logger.warning("[Gelbooru] 未找到 options CSRF token，Display all site content 可能无法保存")

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
                fringe_enabled = bool(re.search(r'name=["\']fringeBenefits["\'][^>]*checked', response.text, re.IGNORECASE))
                if fringe_enabled:
                    logger.info("[Gelbooru] 已启用 Display all site content 匿名会话")
                else:
                    logger.warning("[Gelbooru] 已提交 Display all site content，但返回页未显示 checked")
            except requests.exceptions.RequestException as e:
                logger.warning(f"[Gelbooru] 启用 Display all site content 失败，将继续普通会话: {e}")

        _gelbooru_session = session
        _gelbooru_session_display_all = display_all_site_content
        return _gelbooru_session

def _image_proxy_headers_for_host(host):
    """Return browser-like headers for image CDNs that are sensitive to generic requests."""
    if host == "gelbooru.com" or host.endswith(".gelbooru.com"):
        return _gelbooru_browser_headers("image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8")
    return {}

def _fetch_supported_media(url):
    """Fetch image/video bytes using the same site-aware request path as the preview proxy."""
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError("invalid media url scheme")

    host = (parsed.hostname or "").lower()
    allowed_suffixes = ("donmai.us", "gelbooru.com")
    if not any(host == suffix or host.endswith(f".{suffix}") for suffix in allowed_suffixes):
        raise ValueError(f"unsupported media host: {host}")

    if host == "gelbooru.com" or host.endswith(".gelbooru.com"):
        display_all_site_content = load_ui_settings().get("gelbooru_display_all_site_content", False)
        session = _get_gelbooru_session(display_all_site_content)
        response = session.get(
            url,
            headers=_image_proxy_headers_for_host(host),
            timeout=(8, 30),
        )
    else:
        response = _danbooru_request(
            "GET",
            url,
            headers=_image_proxy_headers_for_host(host),
            timeout=30,
        )

    response.raise_for_status()
    content_type = response.headers.get("Content-Type", "application/octet-stream").lower()
    if content_type and not content_type.startswith(("image/", "application/octet-stream")):
        raise ValueError(f"upstream returned non-image content: {content_type}")
    return response.content

def _fetch_gelbooru_public_posts(adapter, tags, limit, page, rating_query, display_all_site_content=False):
    """Fetch Gelbooru posts from public HTML pages when DAPI credentials are unavailable.

    Uses fixed page size GELBOORU_PUBLIC_PAGE_SIZE (42) so pid is decoupled from
    the frontend's requested limit; the frontend chains multiple page fetches via
    maybeLoadMore to reach the user's preload_count.

    On transient failure (429/503) it retries once with Retry-After back-off.
    If retry also fails or the response is non-recoverable, returns an error
    placeholder object so the frontend can display a per-cell error rather than
    crashing the whole gallery.
    """
    id_match = re.search(r"(?:^|\s)id:(\d+)(?:\s|$)", tags or "")
    if id_match:
        refs = [{"id": id_match.group(1)}]
    else:
        # 固定页大小，pid 与 frontend 的 limit 解耦
        pid_value = max(page - 1, 0) * GELBOORU_PUBLIC_PAGE_SIZE
        params = adapter.build_public_posts_params(tags, limit, page, rating_query)
        # override pid with fixed page size
        params["pid"] = pid_value

        session = _get_gelbooru_session(display_all_site_content)

        def _get_list_page(sess):
            """Inner closure: fetch list page with rate limiting + retry."""
            for attempt in range(2):
                _gelbooru_public_throttle.wait()
                try:
                    resp = sess.get(adapter.posts_url, params=params, timeout=(8, 15))
                except requests.exceptions.RequestException as e:
                    if attempt == 0:
                        _log_gelbooru_retry_warning(f"网络异常: {e}", pid_value=pid_value)
                        time.sleep(3)
                    continue

                if resp.status_code not in (429, 503):
                    return resp  # 正常（含 200/500/403），交调用方判断

                # 429/503 限流: 读 Retry-After 退避一次
                retry_after = resp.headers.get("Retry-After")
                delay = 2.0
                try:
                    if retry_after is not None:
                        delay = min(max(float(retry_after), 0.5), 10.0)
                except ValueError:
                    pass
                if attempt == 0:
                    _log_gelbooru_retry_warning(f"HTTP {resp.status_code} 限流，{delay:.1f}s 后重试", pid_value=pid_value)
                    time.sleep(delay)
                else:
                    _log_gelbooru_retry_warning(f"重试仍限流({resp.status_code})，跳过本页", pid_value=pid_value)
                    return None  # 重试仍限流 → 跳过本页

            return None

        list_response = _get_list_page(session)
        if list_response is None:
            # 返回 error 占位格（不含 list_response.text 细节）
            driver_pid = params.get("pid", pid_value)
            return [{"error": "Gelbooru 服务暂不可用", "pid": driver_pid, "page": page}]

        if display_all_site_content and _gelbooru_public_page_requires_options(list_response.text):
            logger.warning("[GelbooruPublic] Result page still requested Display all site content; rebuilding session and retrying")
            session = _get_gelbooru_session(display_all_site_content, force_refresh=True)
            list_response = _get_list_page(session)
            if list_response is None:
                driver_pid = params.get("pid", pid_value)
                return [{"error": "Gelbooru 服务暂不可用", "pid": driver_pid, "page": page}]

        refs = adapter.extract_public_post_refs(list_response.text, limit)
        logger.info(f"[GelbooruPublic] tags='{tags}' display_all={display_all_site_content} refs={len(refs)}")

    if not id_match:
        return refs

    posts = []
    for ref in refs:
        post_id = ref.get("id")
        if not post_id:
            continue

        # 0 引用重试：HTML 结构有可能解析失败
        for attempt in range(2):
            try:
                post_response = _get_gelbooru_session(display_all_site_content).get(
                    adapter.posts_url,
                    params=adapter.build_public_post_params(post_id),
                    timeout=(8, 15),
                )
                post_response.raise_for_status()
                post = adapter.normalize_public_post_page(post_id, post_response.text, ref)
                if post.get("preview_file_url") or post.get("file_url"):
                    posts.append(post)
                    break
            except requests.exceptions.RequestException as e:
                if attempt == 0:
                    logger.warning(f"[GelbooruPublic] 帖子页面解析失败/id={post_id} 尝试重试: {e}")
                    time.sleep(1)
                else:
                    logger.warning(f"[GelbooruPublic] 帖子页面解析失败/id={post_id} 放弃: {e}")

    return posts


def _log_gelbooru_retry_warning(message, pid_value=None):
    """Short helper for logging gelbooru public fetch retry messages."""
    if pid_value is not None:
        logger.warning(f"[GelbooruPublic] {message} (pid={pid_value})")
    else:
        logger.warning(f"[GelbooruPublic] {message}")

@PromptServer.instance.routes.get("/danbooru_gallery/image_proxy")
async def image_proxy(request):
    # 浏览器直连 cdn.donmai.us 会被 Cloudflare 按 cross-site <img> 请求挑战并返回 403，
    # 而后端用描述性 UA (DANBOORU_HEADERS) 能过 CF。转发一次即可让前端拿到缩略图。
    url = request.query.get("url", "")
    if not url:
        return web.Response(status=400, text="missing url")

    try:
        parsed = urllib.parse.urlparse(url)
    except Exception:
        return web.Response(status=400, text="invalid url")

    if parsed.scheme not in ("http", "https"):
        return web.Response(status=400, text="invalid scheme")

    # SSRF 防护：只允许当前支持图站的图片域名
    host = (parsed.hostname or "").lower()
    allowed_suffixes = ("donmai.us", "gelbooru.com")
    if not any(host == suffix or host.endswith(f".{suffix}") for suffix in allowed_suffixes):
        return web.Response(status=403, text="host not allowed")

    async with _get_image_proxy_semaphore():
        try:
            if host == "gelbooru.com" or host.endswith(".gelbooru.com"):
                display_all_site_content = load_ui_settings().get("gelbooru_display_all_site_content", False)
                session = _get_gelbooru_session(display_all_site_content)
                resp = await asyncio.to_thread(
                    session.get,
                    url,
                    headers=_image_proxy_headers_for_host(host),
                    timeout=(8, 15),
                )
            else:
                resp = await asyncio.to_thread(
                    _danbooru_request,
                    "GET",
                    url,
                    headers=_image_proxy_headers_for_host(host),
                    timeout=15,
                )
        except requests.exceptions.RequestException as e:
            logger.warning(f"[ImageProxy] 上游请求失败 {url}: {e}")
            return web.Response(status=502, text="upstream error")

    if resp.status_code != 200:
        logger.debug(f"[ImageProxy] 上游返回 {resp.status_code}: {url}")
        return web.Response(status=resp.status_code)

    content_type = resp.headers.get("Content-Type", "application/octet-stream")
    if not content_type.lower().startswith(("image/", "video/")):
        logger.warning(f"[ImageProxy] 上游返回非媒体内容 {content_type}: {url}")
        return web.Response(status=502, text="upstream returned non-media content")

    return web.Response(
        body=resp.content,
        headers={
            "Content-Type": content_type,
            "Cache-Control": "public, max-age=86400",
        },
    )

# --- 保留文件中剩余的其他部分 ---
@PromptServer.instance.routes.get("/danbooru_gallery/posts")
async def get_posts_for_front(request):
    query = request.query
    tags = query.get("search[tags]", "")
    page = query.get("page", "1")
    limit = query.get("limit", "100")
    rating = query.get("search[rating]", "")
    source = query.get("source", "danbooru")
    gelbooru_display_all_site_content = query.get("gelbooru_display_all_site_content", "").lower() in ("1", "true", "yes", "on")
    force_public_detail = query.get("force_public_detail", "").lower() in ("1", "true", "yes", "on")
    before_id_raw = query.get("before_id", "")
    gelbooru_dedup_mode = query.get("gelbooru_dedup_mode", "off").strip().lower()
    if gelbooru_dedup_mode not in ("off", "on", "on_auth"):
        gelbooru_dedup_mode = "off"

    posts_json_str, = DanbooruGalleryNode.get_posts_internal(
        tags=tags,
        limit=int(limit),
        page=int(page),
        rating=rating,
        source=source,
        gelbooru_display_all_site_content=gelbooru_display_all_site_content,
        force_public_detail=force_public_detail,
        before_id=before_id_raw,
        gelbooru_dedup_mode=gelbooru_dedup_mode,
    )
    
    try:
        posts_list = json.loads(posts_json_str)
    except json.JSONDecodeError:
        posts_list = []

    return web.json_response(posts_list, headers={
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
    })

@PromptServer.instance.routes.get("/danbooru_gallery/autocomplete")
async def get_autocomplete(request):
    """三层查询机制：数据库 → API → 空结果"""
    try:
        query = request.query.get("query", "")
        limit = int(request.query.get("limit", "20"))
        source = request.query.get("source", "danbooru")
        adapter = get_site_adapter(source)

        if not query:
            return web.json_response([])

        # 加载配置
        config = load_autocomplete_config()

        # ✅ 第1层：查询本地SQLite数据库
        if adapter.key == "danbooru" and get_db_manager and config['cache'].get('use_database_query', True):
            try:
                db = get_db_manager()
                db_results = await db.search_tags_by_prefix(query, limit)

                if db_results:
                    # 数据库有结果，转换格式并返回
                    formatted_results = [
                        {
                            'name': tag['tag'],
                            'category': tag['category'],
                            'post_count': tag['post_count'],
                            'translation': tag.get('translation_cn'),
                            'aliases': tag.get('aliases', [])
                        }
                        for tag in db_results
                    ]
                    logger.debug(f"[Autocomplete] 数据库查询成功: '{query}' -> {len(formatted_results)}条结果")
                    return web.json_response(formatted_results)
                else:
                    logger.debug(f"[Autocomplete] 数据库无结果: '{query}'")
            except Exception as e:
                logger.warning(f"[Autocomplete] 数据库查询失败: {e}，尝试API fallback")

        # ✅ 第2层：Fallback到Danbooru API
        if config['offline_mode'].get('fallback_to_remote', True):
            try:
                timeout = config['offline_mode'].get('remote_timeout_ms', 2000) / 1000.0

                tags_url = adapter.tags_url
                params = adapter.build_autocomplete_params(query, limit)
                credentials = get_site_credentials(adapter)
                if not has_required_site_credentials(adapter, credentials):
                    if adapter.key == "gelbooru":
                        logger.info("[Gelbooru] 未配置 User ID/API Key，改用公开 autocomplete2")
                        params = adapter.build_public_autocomplete_params(query, limit)
                        response = _danbooru_request("GET", tags_url, params=params, timeout=timeout)
                        response.raise_for_status()
                        return web.json_response(adapter.normalize_public_autocomplete_response(response.json()))
                    logger.warning(f"[{adapter.key}] 缺少必要认证信息，已跳过自动补全请求")
                    return web.json_response([])
                params = adapter.apply_auth_params(params, credentials)

                username, api_key = load_user_auth()
                auth = HTTPBasicAuth(username, api_key) if adapter.requires_auth and username and api_key else None

                logger.debug(f"[Autocomplete] 调用远程API({adapter.key}): '{query}' (超时: {timeout}s)")
                response = _danbooru_request("GET", tags_url, params=params, auth=auth, timeout=timeout)
                response.raise_for_status()

                result = adapter.normalize_autocomplete_response(response.json())

                # 排序确保按热度排列
                if isinstance(result, list):
                    result.sort(key=lambda x: x.get('post_count', 0), reverse=True)
                    logger.info(f"[Autocomplete] API查询成功({adapter.key}): '{query}' -> {len(result)}条结果")

                return web.json_response(result)

            except requests.Timeout:
                logger.warning(f"[Autocomplete] 远程API超时 (>{timeout}s): '{query}'")
            except requests.exceptions.RequestException as e:
                logger.warning(f"[Autocomplete] 远程API失败: {e}")
            except Exception as e:
                logger.error(f"[Autocomplete] API调用错误: {e}")

        # ✅ 第3层：返回空结果
        logger.debug(f"[Autocomplete] 所有查询方式均无结果: '{query}'")
        return web.json_response([])

    except Exception as e:
        logger.error(f"[Autocomplete] 处理请求时发生错误: {e}")
        return web.json_response([])

@PromptServer.instance.routes.get("/danbooru_gallery/blacklist")
async def get_blacklist(request):
    blacklist = load_blacklist()
    return web.json_response({"blacklist": blacklist})

@PromptServer.instance.routes.post("/danbooru_gallery/blacklist")
async def save_blacklist_route(request):
    try:
        data = await request.json()
        blacklist_items = data.get("blacklist", [])
        success = save_blacklist(blacklist_items)
        return web.json_response({"success": success})
    except Exception as e:
        logger.error(f"保存黑名单接口错误: {e}")
        return web.json_response({"success": False, "error": str(e)})

@PromptServer.instance.routes.get("/danbooru_gallery/language")
async def get_language(request):
    language = load_language()
    return web.json_response({"language": language})

@PromptServer.instance.routes.post("/danbooru_gallery/language")
async def save_language_route(request):
    try:
        data = await request.json()
        language = data.get("language", "zh")
        success = save_language(language)
        return web.json_response({"success": success})
    except Exception as e:
        logger.error(f"保存语言设置接口错误: {e}")
        return web.json_response({"success": False, "error": str(e)})

@PromptServer.instance.routes.get("/danbooru_gallery/filter_tags")
async def get_filter_tags(request):
    filter_tags, filter_enabled = load_filter_tags()
    return web.json_response({"filter_tags": filter_tags, "filter_enabled": filter_enabled})

@PromptServer.instance.routes.post("/danbooru_gallery/filter_tags")
async def save_filter_tags_route(request):
    try:
        data = await request.json()
        filter_tags = data.get("filter_tags", [])
        filter_enabled = data.get("filter_enabled", False)
        success = save_filter_tags(filter_tags, filter_enabled)
        return web.json_response({"success": success})
    except Exception as e:
        logger.error(f"保存提示词过滤设置接口错误: {e}")
        return web.json_response({"success": False, "error": str(e)})

@PromptServer.instance.routes.get("/danbooru_gallery/ui_settings")
async def get_ui_settings(request):
    try:
        ui_settings = load_ui_settings()
        return web.json_response({
            "success": True,
            "settings": ui_settings
        })
    except Exception as e:
        logger.error(f"[UI_SETTINGS] 获取UI设置接口错误: {e}")
        return web.json_response({"success": False, "error": str(e)})

@PromptServer.instance.routes.post("/danbooru_gallery/ui_settings")
async def save_ui_settings_route(request):
    try:
        data = await request.json()
        ui_settings = {
            "autocomplete_enabled": data.get("autocomplete_enabled", True),
            "tooltip_enabled": data.get("tooltip_enabled", True),
            "autocomplete_max_results": data.get("autocomplete_max_results", 20),
            "selected_categories": data.get("selected_categories", ["copyright", "character", "general"]),
            "multi_select_enabled": data.get("multi_select_enabled", False),
            "source_site": data.get("source_site", "danbooru"),
            "gelbooru_display_all_site_content": data.get("gelbooru_display_all_site_content", False)
        }
        success = save_ui_settings(ui_settings)
        return web.json_response({"success": success})
    except Exception as e:
        logger.error(f"保存UI设置接口错误: {e}")
        return web.json_response({"success": False, "error": str(e)})

@PromptServer.instance.routes.post("/danbooru_gallery/selection_queue_push")
async def selection_queue_push(request):
    """前端在每次 Queue 前把当前选中的条目推入对应 nodeId 的 FIFO 桶"""
    try:
        data = await request.json()
        item = data.get("item")
        node_id = data.get("nodeId", "")
        if item:
            global _selection_queue_gen
            with _selection_queues_lock:
                _selection_queues[node_id].append(item)
                _selection_queue_gen += 1
            logger.debug(f"[SelectionQueue] push node={node_id} → 队列长度 {len(_selection_queues[node_id])}")
        return web.json_response({"success": True})
    except Exception as e:
        logger.error(f"[SelectionQueue] push error: {e}")
        return web.json_response({"success": False, "error": str(e)})

@PromptServer.instance.routes.post("/danbooru_gallery/selection_queue_pop")
async def selection_queue_pop(request):
    """节点执行时从队列头部 pop 一个条目（不移除则 peek）"""
    try:
        data = await request.json() if request.can_read_body else {}
        remove = data.get("remove", True)
        with _selection_queues_lock:
            q = _selection_queues.get(data.get("nodeId", ""))
            if q and len(q) > 0:
                item = q.popleft() if remove else q[0]
                logger.debug(f"[SelectionQueue] pop → 剩余 {len(q)}")
                return web.json_response({"success": True, "item": item})
        return web.json_response({"success": True, "item": None})
    except Exception as e:
        logger.error(f"[SelectionQueue] pop error: {e}")
        return web.json_response({"success": False, "error": str(e)})

# ================================
# JS 日志转发：前端 logger_client 通过 POST /danbooru/logs/batch
# 将浏览器日志发到后端，用 Python logger 打印出来，这样用户在
# ComfyUI 控制台（终端）也能看到画廊的日志。
# ================================

@PromptServer.instance.routes.post("/danbooru/logs/batch")
async def js_log_batch(request):
    """接收前端 JS 日志，用 Python logger 转发到后端终端"""
    try:
        data = await request.json()
        logs = data.get("logs", [])
        for log_entry in logs:
            level = (log_entry.get("level") or "INFO").upper()
            component = log_entry.get("component", "danbooru_gallery")
            message = log_entry.get("message", "")
            # 映射级别
            if level in ("ERROR", "CRITICAL"):
                logger.error(f"[JS/{component}] {message}")
            elif level in ("WARN", "WARNING"):
                logger.warning(f"[JS/{component}] {message}")
            elif level == "DEBUG":
                logger.debug(f"[JS/{component}] {message}")
            else:
                logger.info(f"[JS/{component}] {message}")
    except Exception as e:
        logger.warning(f"[JSEndpoint] 日志转发错误: {e}")
    return web.json_response({"success": True})

# ================================
# Tag翻译API接口
# ================================

@PromptServer.instance.routes.get("/danbooru_gallery/translate_tag")
async def translate_tag_route(request):
    """翻译单个tag"""
    try:
        tag = request.query.get("tag", "").strip()
        if not tag:
            return web.json_response({"success": False, "error": "缺少tag参数"})
        
        translation = translation_system.translate_tag(tag)
        return web.json_response({
            "success": True,
            "tag": tag,
            "translation": translation
        })
    except Exception as e:
        logger.error(f"翻译tag接口错误: {e}")
        return web.json_response({"success": False, "error": str(e)})

@PromptServer.instance.routes.post("/danbooru_gallery/translate_tags_batch")
async def translate_tags_batch_route(request):
    """批量翻译tags"""
    try:
        data = await request.json()
        tags = data.get("tags", [])
        
        if not isinstance(tags, list):
            return web.json_response({"success": False, "error": "tags必须是数组"})
        
        translations = translation_system.translate_tags_batch(tags)
        return web.json_response({
            "success": True,
            "translations": translations
        })
    except Exception as e:
        logger.error(f"批量翻译tags接口错误: {e}")
        return web.json_response({"success": False, "error": str(e)})

@PromptServer.instance.routes.get("/danbooru_gallery/search_chinese")
async def search_chinese_route(request):
    """中文搜索匹配 - 优先使用FTS5数据库搜索"""
    try:
        query = request.query.get("query", "").strip()
        limit = int(request.query.get("limit", "10"))
        source = request.query.get("source", "danbooru")
        adapter = get_site_adapter(source)

        if not query:
            return web.json_response({"success": True, "results": []})

        # 加载配置
        config = load_autocomplete_config()

        # ✅ 优先使用FTS5数据库搜索（速度更快，10-50ms → 2-5ms）
        if adapter.key == "danbooru" and get_db_manager and config['cache'].get('use_database_query', True):
            try:
                db = get_db_manager()
                db_results = await db.search_tags_optimized(query, limit, search_type="chinese")

                if db_results:
                    # 转换为前端期望的格式
                    formatted_results = [
                        {
                            'tag': tag['tag'],
                            'translation_cn': tag.get('translation_cn'),
                            'category': tag['category'],
                            'post_count': tag['post_count'],
                            'match_score': tag.get('match_score', 5)
                        }
                        for tag in db_results
                    ]
                    logger.debug(f"[SearchChinese] FTS5数据库查询: '{query}' -> {len(formatted_results)}条结果")
                    return web.json_response({
                        "success": True,
                        "query": query,
                        "results": formatted_results
                    })
            except Exception as e:
                logger.warning(f"[SearchChinese] FTS5查询失败: {e}，回退到translation_system")

        # ⚠️ Fallback: 使用旧的translation_system（线性搜索，较慢）
        try:
            results = translation_system.search_chinese_tags(query, limit)
            logger.debug(f"[SearchChinese] translation_system查询: '{query}' -> {len(results)}条结果")
            return web.json_response({
                "success": True,
                "query": query,
                "results": results
            })
        except Exception as e:
            logger.error(f"[SearchChinese] translation_system查询失败: {e}")
            return web.json_response({
                "success": False,
                "error": str(e)
            })

    except Exception as e:
        logger.error(f"中文搜索接口错误: {e}")
        return web.json_response({"success": False, "error": str(e)})

@PromptServer.instance.routes.get("/danbooru_gallery/autocomplete_with_translation")
async def get_autocomplete_with_translation(request):
    """带翻译的自动补全API - 三层查询机制：数据库 → API → 空结果"""
    try:
        query = request.query.get("query", "")
        limit = int(request.query.get("limit", "20"))
        source = request.query.get("source", "danbooru")
        adapter = get_site_adapter(source)

        if not query:
            return web.json_response([])

        # 加载配置
        config = load_autocomplete_config()

        # ✅ 第1层：查询本地SQLite数据库（已包含翻译）
        if adapter.key == "danbooru" and get_db_manager and config['cache'].get('use_database_query', True):
            try:
                db = get_db_manager()
                db_results = await db.search_tags_by_prefix(query, limit)

                if db_results:
                    # 数据库有结果，转换格式（已包含translation_cn）
                    formatted_results = [
                        {
                            'name': tag['tag'],
                            'category': tag['category'],
                            'post_count': tag['post_count'],
                            'translation': tag.get('translation_cn'),
                            'aliases': tag.get('aliases', [])
                        }
                        for tag in db_results
                    ]
                    logger.debug(f"[AutocompleteTranslation] 数据库查询成功: '{query}' -> {len(formatted_results)}条结果")
                    return web.json_response(formatted_results)
                else:
                    logger.debug(f"[AutocompleteTranslation] 数据库无结果: '{query}'")
            except Exception as e:
                logger.warning(f"[AutocompleteTranslation] 数据库查询失败: {e}，尝试API fallback")

        # ✅ 第2层：Fallback到Danbooru API（需要手动添加翻译）
        if config['offline_mode'].get('fallback_to_remote', True):
            try:
                timeout = config['offline_mode'].get('remote_timeout_ms', 2000) / 1000.0

                tags_url = adapter.tags_url
                params = adapter.build_autocomplete_params(query, limit)
                credentials = get_site_credentials(adapter)
                if not has_required_site_credentials(adapter, credentials):
                    if adapter.key == "gelbooru":
                        logger.info("[Gelbooru] 未配置 User ID/API Key，改用公开 autocomplete2")
                        params = adapter.build_public_autocomplete_params(query, limit)
                        response = _danbooru_request("GET", tags_url, params=params, timeout=timeout)
                        response.raise_for_status()
                        result = adapter.normalize_public_autocomplete_response(response.json())
                        for tag_data in result:
                            tag_name = tag_data.get('name', '')
                            tag_data['translation'] = translation_system.translate_tag(tag_name)
                        return web.json_response(result)
                    logger.warning(f"[{adapter.key}] 缺少必要认证信息，已跳过带翻译自动补全请求")
                    return web.json_response([])
                params = adapter.apply_auth_params(params, credentials)

                username, api_key = load_user_auth()
                auth = HTTPBasicAuth(username, api_key) if adapter.requires_auth and username and api_key else None

                logger.debug(f"[AutocompleteTranslation] 调用远程API({adapter.key}): '{query}' (超时: {timeout}s)")
                response = _danbooru_request("GET", tags_url, params=params, auth=auth, timeout=timeout)
                response.raise_for_status()

                result = adapter.normalize_autocomplete_response(response.json())

                # 为每个tag添加翻译
                if isinstance(result, list):
                    for tag_data in result:
                        tag_name = tag_data.get('name', '')
                        translation = translation_system.translate_tag(tag_name)
                        tag_data['translation'] = translation

                    logger.info(f"[AutocompleteTranslation] API查询成功: '{query}' -> {len(result)}条结果")

                return web.json_response(result)

            except requests.Timeout:
                logger.warning(f"[AutocompleteTranslation] 远程API超时 (>{timeout}s): '{query}'")
            except requests.exceptions.RequestException as e:
                logger.warning(f"[AutocompleteTranslation] 远程API失败: {e}")
            except Exception as e:
                logger.error(f"[AutocompleteTranslation] API调用错误: {e}")

        # ✅ 第3层：返回空结果
        logger.debug(f"[AutocompleteTranslation] 所有查询方式均无结果: '{query}'")
        return web.json_response([])

    except Exception as e:
        logger.error(f"[AutocompleteTranslation] 处理请求时发生错误: {e}")
        return web.json_response([])

class DanbooruGalleryNode:
    _post_cache = {}

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {},
            "optional": {
                # 兼容前端 bypass 解析：
                # 该节点原本只有 hidden 输入，某些前端 bypass 路径会在无可见输入时抛出
                # "No input found for flattened id ... slot [0]"。
                # 增加可选透传槽位后，bypass 时不会因缺少输入槽而直接报错。
                "bypass_image": ("IMAGE", {"forceInput": True}),
                "bypass_prompts": ("STRING", {"forceInput": True}),
            },
            "hidden": {
                "selection_data": ("STRING", {"default": "{}", "multiline": True, "forceInput": True}),
            },
        }

    RETURN_TYPES = ("IMAGE", "STRING")
    RETURN_NAMES = ("images", "prompts")
    OUTPUT_IS_LIST = (True, True)
    FUNCTION = "get_selected_data"
    CATEGORY = "danbooru"
    OUTPUT_NODE = True

    @classmethod
    def IS_CHANGED(cls, selection_data="{}", **kwargs):
        """返回队首条目的 _queue_id（唯一），队列空时返回 ""（缓存命中不再重复执行）。
        彻底解决快速选图 1→Queue→2→Queue→... 导致的提示词覆盖竞态。
        兼容旧版无 nodeId 的 selection_data（回退到全量字符串做键）。"""
        if not selection_data or selection_data == "{}":
            return ""
        try:
            data = json.loads(selection_data)
            node_id = data.get("nodeId")
            if node_id:
                with _selection_queues_lock:
                    q = _selection_queues.get(node_id)
                    if q and len(q) > 0:
                        return str(q[0].get("_queue_id", ""))
        except (json.JSONDecodeError, TypeError):
            pass
        return selection_data

    def get_selected_data(self, selection_data="{}", **kwargs):
        """处理选中的图片数据，从 FIFO 队列（按 nodeId 分桶）中 pop，否则回退。"""
        images = []
        prompts = []
        my_node_id = ""

        try:
            # 解析自己的 selection_data 获取 nodeId
            if selection_data and selection_data != "{}":
                data = json.loads(selection_data)
                my_node_id = data.get("nodeId", "")

            # 从 FIFO 按 nodeId 分桶 pop
            item = None
            if my_node_id:
                with _selection_queues_lock:
                    q = _selection_queues.get(my_node_id)
                    if q and len(q) > 0:
                        item = q.popleft()
                        logger.debug(f"[SelectionQueue] get_selected_data pop node={my_node_id} → 剩余 {len(q)}")

            if item:
                selections = item.get("selections", [])
            else:
                # 回退：从自己的 widget 读取
                if not selection_data or selection_data == "{}":
                    return ([torch.zeros(1, 1, 1, 3)], [""])
                data = json.loads(selection_data)
                selections = data.get("selections", [])

            if not selections:
                return ([torch.zeros(1, 1, 1, 3)], [""])

            for sel in selections:
                prompt = sel.get("prompt", "")
                image_url = sel.get("image_url")
                prompts.append(prompt)
                if image_url:
                    try:
                        img_data = _fetch_supported_media(image_url)
                        img = Image.open(io.BytesIO(img_data)).convert("RGB")
                        img_array = np.array(img).astype(np.float32) / 255.0
                        tensor = torch.from_numpy(img_array)[None,]
                        images.append(tensor)
                    except Exception as e:
                        logger.error(f"加载图片失败 {image_url}: {e}")
                        images.append(torch.zeros(1, 1, 1, 3))
                else:
                    images.append(torch.zeros(1, 1, 1, 3))

            if not images:
                return ([torch.zeros(1, 1, 1, 3)], [""])

        except Exception as e:
            logger.error(f"Error processing selection in DanbooruGalleryNode: {e}")
            return ([torch.zeros(1, 1, 1, 3)], [""])

        return (images, prompts)
    
    @staticmethod
    def get_posts_internal(tags: str, limit: int = 100, page: int = 1, rating: str = None, source: str = "danbooru", gelbooru_display_all_site_content: bool = None, force_public_detail: bool = False, before_id=None, gelbooru_dedup_mode: str = "off"):
        settings = load_settings()
        cache_enabled = settings.get("cache_enabled", True)
        max_cache_age = settings.get("max_cache_age", 3600)
        adapter = get_site_adapter(source)
        if gelbooru_display_all_site_content is None:
            gelbooru_display_all_site_content = settings.get("gelbooru_display_all_site_content", False)

        if gelbooru_dedup_mode not in ("off", "on", "on_auth"):
            gelbooru_dedup_mode = "off"

        # before_id分页：化 + 数字校验，防止 page=b; DROP TABLE 类拼接注入
        before_id = str(before_id).strip() if before_id else ""
        if before_id and not before_id.isdigit():
            before_id = ""
        # order/ordfav/sort变结果顺序，游标会漏图，禁用
        if before_id and re.search(r'(?:^|\s)(?:order|ordfav|sort):', tags or ''):
            before_id = ""
        #仅在 Danbooru（官方 page=b<id>）或 Gelbooru + dedup 开启时生效
        if before_id and not (
            adapter.key == "danbooru"
            or (adapter.key == "gelbooru" and gelbooru_dedup_mode in ("on", "on_auth"))
        ):
            before_id = ""

        credentials = get_site_credentials(adapter)
        has_gelbooru_creds = has_required_site_credentials(adapter, credentials)

        # 创建缓存键（rating 归一化排序，避免 "e,q" 与 "q,e" 命中两条缓存）
        rating_key = ','.join(sorted(r.strip().lower() for r in (rating or '').split(',') if r.strip()))
        site_options_key = ""
        if adapter.key == "gelbooru":
            site_options_key = "display_all" if gelbooru_display_all_site_content else "default"
            # dedup位影响 tag断数量，须区分，否则 on/off/on_auth 在 before_id 同为空时互相污染
            site_options_key += f"_dedup_{gelbooru_dedup_mode}"
        # before_id 入键避免不同游标页相互污染
        cache_key = f"{adapter.key}:{site_options_key}:{tags}:{limit}:{page}:{rating_key}:{before_id}"

        # 判断是否获取收藏列表，如果是清除缓存以避免相同的请求前端列表不更新
        match = re.search(r'\bordfav:([^\s]+)', tags)

        # 如果启用了缓存，则检查缓存
        if cache_enabled and not match:
            if cache_key in DanbooruGalleryNode._post_cache:
                cached_data, timestamp = DanbooruGalleryNode._post_cache[cache_key]
                if time.time() - timestamp < max_cache_age:
                    return (cached_data,)

        # 分离 date: 标签和其他标签
        date_tag = ''
        other_tags = []
        for tag in tags.split(' '):
            if tag.strip().startswith('date:'):
                date_tag = tag.strip()
            elif tag.strip():
                other_tags.append(tag.strip())

        # 限制其他标签的数量。Gelbooru标模式下 id:<X 占用一个 tag 名额（公开页/2-tag 限制），
        # on_auth + 已配密钥走 DAPI 时可放宽到更多 tag。
        if adapter.key == "gelbooru" and gelbooru_dedup_mode in ("on", "on_auth"):
            if gelbooru_dedup_mode == "on_auth" and has_gelbooru_creds:
                max_tags = 10
            else:
                max_tags = 1
        else:
            max_tags = 2
        if len(other_tags) > max_tags:
            other_tags = other_tags[:max_tags]
        
        # 重新组合标签
        final_tags = ' '.join(other_tags)
        if date_tag:
            final_tags = f"{final_tags} {date_tag}".strip()

        rating_query = ""
        if adapter.key == "danbooru" and rating and rating.lower() != 'all':
            allowed = {'general', 'sensitive', 'questionable', 'explicit', 'g', 's', 'q', 'e'}
            rating_values = [r.strip().lower() for r in rating.split(',') if r.strip()]
            rating_values = [r for r in rating_values if r in allowed]
            if len(rating_values) == 1:
                rating_query = f"rating:{rating_values[0]}"
            elif len(rating_values) > 1:
                rating_query = ' '.join(f"~rating:{r}" for r in rating_values)
        elif adapter.key != "danbooru":
            rating_query = rating
        
        tags = final_tags
        # Gelbooru：拼进 tags（公开页 / DAPI用 tags 参数，见 build_public_posts_params / build_posts_params）
        if before_id and adapter.key == "gelbooru":
            tags = f"{tags} id:<{before_id}".strip()

        username, api_key = load_user_auth()
        auth = HTTPBasicAuth(username, api_key) if adapter.requires_auth and username and api_key else None
        credentials = get_site_credentials(adapter)
        if adapter.key == "gelbooru" and force_public_detail:
            posts = _fetch_gelbooru_public_posts(adapter, tags, limit, page, rating_query, gelbooru_display_all_site_content)
            result_text = json.dumps(posts, ensure_ascii=False)
            return (result_text,)

        if not has_required_site_credentials(adapter, credentials):
            if adapter.key == "gelbooru":
                logger.info("[Gelbooru] 未配置 User ID/API Key，改用公开网页解析模式")
                posts = _fetch_gelbooru_public_posts(adapter, tags, limit, page, rating_query, gelbooru_display_all_site_content)
                result_text = json.dumps(posts, ensure_ascii=False)

                if cache_enabled and not (adapter.key == "gelbooru" and gelbooru_display_all_site_content and not posts):
                    # 跳过 error 占位格缓存（否则一次限流会让接下来 TTL 内都看不到新图）
                    has_error_placeholder = posts and any(isinstance(p, dict) and p.get("error") for p in posts)
                    if not has_error_placeholder:
                        DanbooruGalleryNode._post_cache[cache_key] = (result_text, time.time())

                return (result_text,)
            logger.warning(f"[{adapter.key}] 缺少必要认证信息，已跳过帖子请求")
            return ("[]",)
            
        params = adapter.build_posts_params(tags, limit, page, rating_query)
        params = adapter.apply_auth_params(params, credentials)
        # Danbooru：走官方 page=b<id>
        if before_id and adapter.key == "danbooru":
            params["page"] = f"b{before_id}"

        try:
            response = _danbooru_request("GET", adapter.posts_url, params=params, auth=auth, timeout=15)
            if response.status_code == 401 and adapter.key == "gelbooru":
                logger.warning("[Gelbooru] DAPI 返回 401，改用公开网页解析模式")
                posts = _fetch_gelbooru_public_posts(adapter, tags, limit, page, rating_query, gelbooru_display_all_site_content)
            else:
                response.raise_for_status()
                posts = adapter.normalize_posts_response(response.json())

            result_text = json.dumps(posts, ensure_ascii=False)
            
            # 如果启用了缓存，则存储结果（跳过 error 占位格）
            if cache_enabled and not (adapter.key == "gelbooru" and gelbooru_display_all_site_content and not posts):
                has_error_placeholder = posts and any(isinstance(p, dict) and p.get("error") for p in posts)
                if not has_error_placeholder:
                    DanbooruGalleryNode._post_cache[cache_key] = (result_text, time.time())
                # 清理旧缓存（可选，防止内存无限增长）
                if len(DanbooruGalleryNode._post_cache) > 200: # 假设最多缓存200个请求
                    oldest_key = min(DanbooruGalleryNode._post_cache.keys(), key=lambda k: DanbooruGalleryNode._post_cache[k][1])
                    del DanbooruGalleryNode._post_cache[oldest_key]
            
            return (result_text,)
        except requests.exceptions.RequestException as e:
            logger.error(f"网络请求时发生错误: {e}")
            return ("[]",)
        except Exception as e:
            logger.error(f"发生未知错误: {e}")
            return ("[]",)

# ComfyUI 必须的字典
def get_node_class_mappings():
    return {
        "DanbooruGalleryNode": DanbooruGalleryNode
    }

def get_node_display_name_mappings():
    return {
        "DanbooruGalleryNode": "D站画廊 (Danbooru Gallery)"
    }

NODE_CLASS_MAPPINGS = get_node_class_mappings()
NODE_DISPLAY_NAME_MAPPINGS = get_node_display_name_mappings()

