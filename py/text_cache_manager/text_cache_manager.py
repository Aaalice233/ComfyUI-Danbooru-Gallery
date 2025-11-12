"""
文本缓存管理器 - 单例模式管理全局文本缓存
Text Cache Manager - Singleton pattern for global text caching
"""

import time
import threading
from typing import Dict, List, Optional, Any
from ..utils.logger import get_logger

# 初始化logger
logger = get_logger(__name__)


class TextCacheManager:
    """
    文本缓存管理器 - 单例模式管理全局文本缓存

    功能：
    - 多通道文本缓存存储（基于通道名称隔离）
    - 提供保存、获取、清空、列出通道等API
    - 单例模式，全局共享状态
    - 与组执行管理器集成
    """
    _instance = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not self._initialized:
            # 实例ID，用于追踪是否为同一个对象
            self.instance_id = id(self)
            logger.debug(f"New instance created with ID: {self.instance_id}")

            # 线程锁，确保线程安全
            self._lock = threading.RLock()  # 使用RLock支持递归锁定

            # 多通道缓存数据（基于通道名）
            # 结构: {channel_name: {"text": str, "timestamp": float, "metadata": {}}}
            self.cache_channels: Dict[str, Dict[str, Any]] = {}

            # 当前执行的组名（由组执行管理器设置）
            self.current_group_name: Optional[str] = None

            # 会话追踪字段
            self.session_execution_count = 0          # 当前会话中保存缓存的次数
            self.last_save_timestamp = 0.0            # 最后一次保存缓存的时间戳
            self.has_saved_this_session = False       # 当次会话是否已保存过缓存
            self.session_start_time = time.time()     # 当前会话开始时间
            self.session_id = int(time.time())        # 会话唯一ID
            self.last_get_timestamp = 0.0             # 最后一次获取缓存的时间戳
            self.get_count_this_session = 0           # 当前会话中获取缓存的次数

            # 最后一次操作信息
            self._last_operation: Optional[Dict] = None

            self._initialized = True
            logger.debug(f"[TextCacheManager] Initialized global text cache manager (Session ID: {self.session_id})")

    def set_current_group(self, group_name: Optional[str]) -> None:
        """设置当前执行的组名（由组执行管理器调用）"""
        self.current_group_name = group_name
        if group_name:
            logger.debug(f">>> 设置当前执行组: {group_name}")
        else:
            logger.debug(f">>> 清除当前执行组")

    def get_cache_channel(self, channel_name: str) -> Dict[str, Any]:
        """
        获取缓存通道，如果不存在则创建

        Args:
            channel_name: 通道名称

        Returns:
            缓存通道字典
        """
        # 如果通道不存在，创建新通道
        if channel_name not in self.cache_channels:
            self.cache_channels[channel_name] = {
                "text": "",
                "timestamp": 0.0,
                "metadata": {}
            }
            logger.debug(f"创建新缓存通道: {channel_name}")

        return self.cache_channels[channel_name]

    def ensure_channel_exists(self, channel_name: str, max_retries: int = 5) -> bool:
        """
        确保通道存在，如果不存在则创建空通道
        用于前端预注册通道，确保下拉列表中显示该通道
        增强版：支持重试机制，提高初始化成功率

        Args:
            channel_name: 通道名称
            max_retries: 最大重试次数（默认5次）

        Returns:
            True表示通道已存在或创建成功，False表示失败
        """
        import random

        for attempt in range(max_retries):
            try:
                with self._lock:  # 确保线程安全
                    if channel_name not in self.cache_channels:
                        self.cache_channels[channel_name] = {
                            "text": "",
                            "timestamp": time.time(),
                            "metadata": {"created_by": "ensure_channel_exists", "attempt": attempt + 1}
                        }
                        if attempt == 0:
                            logger.info(f"✅ 预注册空通道: {channel_name}")
                        else:
                            logger.info(f"✅ 重试{attempt + 1}次成功预注册通道: {channel_name}")
                        return True
                    else:
                        logger.debug(f"通道已存在: {channel_name}")
                        return True

            except Exception as e:
                logger.warning(f"⚠️ 创建通道失败 (尝试 {attempt + 1}/{max_retries}): {channel_name}, 错误: {e}")

                # 如果不是最后一次尝试，等待后重试
                if attempt < max_retries - 1:
                    # 指数退避 + 随机抖动：500ms, 1s, 2s, 3s, 5s
                    base_delay = [0.5, 1.0, 2.0, 3.0, 5.0][min(attempt, 4)]
                    jitter = random.uniform(0.1, 0.3)  # 添加随机抖动避免同时重试
                    delay = base_delay + jitter
                    time.sleep(delay)

        # 所有重试都失败了
        logger.error(f"❌ 通道创建最终失败，已重试{max_retries}次: {channel_name}")
        return False

    def cache_text(self, text: str, channel_name: str = "default", metadata: Optional[Dict] = None, skip_websocket: bool = False) -> bool:
        """
        缓存文本数据（线程安全）

        Args:
            text: 要缓存的文本内容
            channel_name: 缓存通道名称
            metadata: 可选的元数据
            skip_websocket: 是否跳过WebSocket通知（避免重复发送）

        Returns:
            True表示内容已更新，False表示内容未变化
        """
        with self._lock:
            try:
                # 验证文本类型和长度
                if not isinstance(text, str):
                    logger.error(f"⚠ 文本类型错误: {type(text)}，转换为字符串")
                    text = str(text)

                # 限制文本长度（防止内存问题）
                MAX_TEXT_LENGTH = 500000  # 500KB字符
                if len(text) > MAX_TEXT_LENGTH:
                    logger.warning(f"⚠ 文本过长({len(text)}字符)，截断到{MAX_TEXT_LENGTH}字符")
                    text = text[:MAX_TEXT_LENGTH]

                # 获取目标缓存通道
                cache_channel = self.get_cache_channel(channel_name)

                # ✅ 内容变化检测：比较新旧内容
                old_text = cache_channel.get("text", "")
                content_changed = (old_text != text)

                # 简化日志（debug模式）
                logger.debug(f"┌─ 通道: '{channel_name}'")
                logger.debug(f"[TextCacheManager] │  文本长度: {len(text)} 字符")
                logger.debug(f"│  内容变化: {'是' if content_changed else '否'}")

                timestamp = time.time()

                # 只有内容变化时才更新主要字段
                if content_changed:
                    # 更新缓存通道
                    cache_channel["text"] = text
                    cache_channel["timestamp"] = timestamp
                    cache_channel["metadata"] = metadata or {}

                    # 更新会话追踪信息
                    self.session_execution_count += 1
                    self.last_save_timestamp = timestamp
                    self.has_saved_this_session = True

                    logger.info(f"└─ 完成: 文本已缓存到通道 '{channel_name}'")
                else:
                    # 内容未变化，只更新metadata中的检查时间
                    if metadata:
                        cache_channel["metadata"]["last_check_timestamp"] = timestamp
                    logger.debug(f"└─ 跳过: 内容未变化，通道 '{channel_name}'")

                # ✅ 只有内容变化时才发送WebSocket事件通知（除非被禁用）
                if not skip_websocket and content_changed:
                    try:
                        from server import PromptServer
                        # 包含所有通道列表，供前端动态更新下拉菜单
                        all_channels = self.get_all_channels()
                        PromptServer.instance.send_sync("text-cache-channel-updated", {
                            "channel": channel_name,
                            "timestamp": timestamp,
                            "text_length": len(text),
                            "all_channels": all_channels  # 新增：所有通道列表
                        })
                    except ImportError:
                        logger.warning("警告: 不在ComfyUI环境中，跳过WebSocket通知")
                    except Exception as e:
                        logger.error(f"WebSocket通知失败: {e}")

                # ✅ 返回内容是否变化
                return content_changed

            except Exception as e:
                logger.error(f"✗ 缓存失败: {str(e)}")
                import traceback
                logger.debug(traceback.format_exc())
                return False  # ✅ 异常时返回False

    def get_cached_text(self, channel_name: str = "default") -> str:
        """
        从缓存中获取文本数据（线程安全）

        Args:
            channel_name: 缓存通道名称

        Returns:
            缓存的文本内容，如果不存在返回空字符串
        """
        with self._lock:
            try:
                # 增加获取计数
                self.increment_get_count()

                # 获取目标缓存通道
                if channel_name not in self.cache_channels:
                    logger.warning(f"⚠ 通道 '{channel_name}' 不存在，返回空字符串")
                    return ""

                cache_channel = self.cache_channels[channel_name]

                # 简化日志（debug模式）
                logger.debug(f"┌─ 从通道 '{channel_name}' 获取")
                logger.debug(f"[TextCacheManager] │  文本长度: {len(cache_channel['text'])} 字符")
                logger.info(f"└─ 完成")

                return cache_channel["text"]

            except Exception as e:
                logger.error(f"✗ 获取缓存失败: {str(e)}")
                return ""

    def clear_cache(self, channel_name: Optional[str] = None) -> None:
        """
        清空缓存（线程安全）

        Args:
            channel_name: 要清空的通道名称，None表示清空所有通道
        """
        with self._lock:
            try:
                if channel_name is None:
                    # 清空所有通道
                    logger.debug(f"清空所有缓存通道")
                    self.cache_channels.clear()
                    logger.info(f"✓ 已清空所有缓存通道")
                else:
                    # 清空指定通道
                    logger.debug(f"清空缓存通道: {channel_name}")

                    if channel_name in self.cache_channels:
                        self.cache_channels[channel_name] = {
                            "text": "",
                            "timestamp": 0.0,
                            "metadata": {}
                        }
                        logger.info(f"✓ 已清空缓存通道: {channel_name}")
                    else:
                        logger.debug(f"缓存通道不存在，无需清空: {channel_name}")

                # 重置会话追踪信息
                self.has_saved_this_session = False
                self.session_execution_count = 0
                self.last_save_timestamp = 0.0
                self.get_count_this_session = 0
                self.last_get_timestamp = 0.0

                # 记录操作
                self._last_operation = {
                    "type": "clear_cache",
                    "timestamp": time.time(),
                    "session_id": self.session_id,
                    "channel": channel_name
                }

                # 发送WebSocket事件通知通道清空
                try:
                    from server import PromptServer
                    all_channels = self.get_all_channels()
                    PromptServer.instance.send_sync("text-cache-channel-cleared", {
                        "channel": channel_name,
                        "all_channels": all_channels
                    })
                except ImportError:
                    logger.warning("警告: 不在ComfyUI环境中，跳过WebSocket通知")
                except Exception as e:
                    logger.error(f"WebSocket通知失败: {e}")

            except Exception as e:
                logger.error(f"✗ 清空缓存失败: {str(e)}")
                import traceback
                logger.debug(traceback.format_exc())

    def rename_channel(self, old_name: str, new_name: str) -> bool:
        """
        重命名通道（将旧通道的数据移到新通道，然后删除旧通道）（线程安全）

        Args:
            old_name: 旧通道名称
            new_name: 新通道名称

        Returns:
            是否成功重命名
        """
        with self._lock:
            try:
                # 检查旧通道是否存在
                if old_name not in self.cache_channels:
                    logger.warning(f"⚠️ 旧通道 '{old_name}' 不存在，无法重命名")
                    return False

                # 检查新通道名是否与旧通道名相同
                if old_name == new_name:
                    logger.warning(f"⚠️ 新旧通道名相同，无需重命名")
                    return True

                # 检查新通道是否已存在
                if new_name in self.cache_channels:
                    logger.warning(f"⚠️ 新通道 '{new_name}' 已存在，将覆盖")

                # 复制旧通道数据到新通道
                self.cache_channels[new_name] = self.cache_channels[old_name].copy()

                # 删除旧通道
                del self.cache_channels[old_name]

                logger.info(f"✅ 通道已重命名: '{old_name}' -> '{new_name}'")

                # 记录操作
                self._last_operation = {
                    "type": "rename_channel",
                    "timestamp": time.time(),
                    "session_id": self.session_id,
                    "old_name": old_name,
                    "new_name": new_name
                }

                # 发送WebSocket事件通知通道重命名
                try:
                    from server import PromptServer
                    all_channels = self.get_all_channels()
                    PromptServer.instance.send_sync("text-cache-channel-renamed", {
                        "old_name": old_name,
                        "new_name": new_name,
                        "all_channels": all_channels
                    })
                except ImportError:
                    logger.warning("警告: 不在ComfyUI环境中，跳过WebSocket通知")
                except Exception as e:
                    logger.error(f"WebSocket通知失败: {e}")

                return True

            except Exception as e:
                logger.error(f"❌ 重命名通道失败: {str(e)}")
                import traceback
                logger.debug(traceback.format_exc())
                return False

    def get_all_channels(self) -> List[str]:
        """
        获取所有已定义的通道列表

        Returns:
            通道名称列表
        """
        return list(self.cache_channels.keys())

    def channel_exists(self, channel_name: str) -> bool:
        """
        检查通道是否存在

        Args:
            channel_name: 通道名称

        Returns:
            通道是否存在
        """
        return channel_name in self.cache_channels

    def is_cache_empty(self, channel_name: str = "default") -> bool:
        """
        检查指定通道的缓存是否为空

        Args:
            channel_name: 通道名称

        Returns:
            缓存是否为空
        """
        if channel_name not in self.cache_channels:
            return True
        return len(self.cache_channels[channel_name]["text"]) == 0

    def is_cache_valid(self, channel_name: str = "default", max_age_minutes: int = 30) -> bool:
        """
        检查缓存是否有效（有缓存数据且未过期）

        Args:
            channel_name: 通道名称
            max_age_minutes: 缓存最大有效时间（分钟），默认30分钟

        Returns:
            缓存是否有效
        """
        # 检查是否有缓存数据
        if self.is_cache_empty(channel_name):
            return False

        # 检查缓存时间戳是否过期
        cache_channel = self.cache_channels[channel_name]
        current_time = time.time()
        age_seconds = current_time - cache_channel["timestamp"]
        age_minutes = age_seconds / 60

        if age_minutes > max_age_minutes:
            return False

        return True

    def get_session_info(self) -> Dict[str, Any]:
        """获取会话信息（线程安全）"""
        with self._lock:
            current_time = time.time()
            session_duration = current_time - self.session_start_time

            return {
                "session_id": self.session_id,
                "session_start_time": self.session_start_time,
                "session_duration_seconds": round(session_duration, 2),
                "execution_count": self.session_execution_count,
                "get_count": self.get_count_this_session,
                "has_saved_this_session": self.has_saved_this_session,
                "last_save_timestamp": self.last_save_timestamp,
                "last_get_timestamp": self.last_get_timestamp,
                "last_operation": self._last_operation,
                "total_channels": len(self.cache_channels)
            }

    def increment_get_count(self) -> None:
        """增加获取计数"""
        self.get_count_this_session += 1
        self.last_get_timestamp = time.time()


# 全局缓存管理器实例
text_cache_manager = TextCacheManager()
