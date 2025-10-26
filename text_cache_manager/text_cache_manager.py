"""
文本缓存管理器 - 单例模式管理全局文本缓存
Text Cache Manager - Singleton pattern for global text caching
"""

import time
from typing import Dict, List, Optional, Any


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
            print(f"[TextCacheManager DEBUG] New instance created with ID: {self.instance_id}")

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

            # 状态同步字段
            self._pending_operations = set()          # 进行中的操作集合
            self._operation_lock = False              # 操作锁，防止并发问题
            self._last_operation: Optional[Dict] = None  # 最后一次操作信息

            self._initialized = True
            print(f"[TextCacheManager] Initialized global text cache manager (Session ID: {self.session_id})")

    def set_current_group(self, group_name: Optional[str]) -> None:
        """设置当前执行的组名（由组执行管理器调用）"""
        self.current_group_name = group_name
        if group_name:
            print(f"[TextCacheManager] >>> 设置当前执行组: {group_name}")
        else:
            print(f"[TextCacheManager] >>> 清除当前执行组")

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
            print(f"[TextCacheManager] 创建新缓存通道: {channel_name}")

        return self.cache_channels[channel_name]

    def cache_text(self, text: str, channel_name: str = "default", metadata: Optional[Dict] = None) -> None:
        """
        缓存文本数据

        Args:
            text: 要缓存的文本内容
            channel_name: 缓存通道名称
            metadata: 可选的元数据
        """
        operation_id = f"cache_{int(time.time() * 1000)}"

        # 检查操作锁，防止并发写入
        if self._operation_lock:
            print(f"[TextCacheManager] ⚠ 操作被锁定，等待前一个操作完成...")
            wait_count = 0
            while self._operation_lock and wait_count < 50:
                time.sleep(0.1)
                wait_count += 1
            if self._operation_lock:
                print(f"[TextCacheManager] ✗ 操作锁超时，强制继续")

        self._operation_lock = True
        self._start_operation(operation_id, "cache_text")

        try:
            # 获取目标缓存通道
            cache_channel = self.get_cache_channel(channel_name)

            # 简化日志
            print(f"[TextCacheManager] ┌─ 通道: '{channel_name}'")
            print(f"[TextCacheManager] │  文本长度: {len(text)} 字符")

            timestamp = time.time()

            # 更新缓存通道
            cache_channel["text"] = text
            cache_channel["timestamp"] = timestamp
            cache_channel["metadata"] = metadata or {}

            # 更新会话追踪信息
            self.session_execution_count += 1
            self.last_save_timestamp = timestamp
            self.has_saved_this_session = True

            print(f"[TextCacheManager] └─ 完成: 文本已缓存到通道 '{channel_name}'")

            # 发送WebSocket事件通知缓存更新
            try:
                from server import PromptServer
                PromptServer.instance.send_sync("text-cache-channel-updated", {
                    "channel": channel_name,
                    "timestamp": timestamp,
                    "text_length": len(text)
                })
            except ImportError:
                print("[TextCacheManager] 警告: 不在ComfyUI环境中，跳过WebSocket通知")
            except Exception as e:
                print(f"[TextCacheManager] WebSocket通知失败: {e}")

        finally:
            self._end_operation(operation_id)
            self._operation_lock = False

    def get_cached_text(self, channel_name: str = "default") -> str:
        """
        从缓存中获取文本数据

        Args:
            channel_name: 缓存通道名称

        Returns:
            缓存的文本内容，如果不存在返回空字符串
        """
        operation_id = f"get_{int(time.time() * 1000)}"
        self._start_operation(operation_id, "get_cached_text")

        try:
            # 增加获取计数
            self.increment_get_count()

            # 获取目标缓存通道
            if channel_name not in self.cache_channels:
                print(f"[TextCacheManager] ⚠ 通道 '{channel_name}' 不存在，返回空字符串")
                return ""

            cache_channel = self.cache_channels[channel_name]

            # 简化日志
            print(f"[TextCacheManager] ┌─ 从通道 '{channel_name}' 获取")
            print(f"[TextCacheManager] │  文本长度: {len(cache_channel['text'])} 字符")
            print(f"[TextCacheManager] └─ 完成")

            return cache_channel["text"]

        finally:
            self._end_operation(operation_id)

    def clear_cache(self, channel_name: Optional[str] = None) -> None:
        """
        清空缓存

        Args:
            channel_name: 要清空的通道名称，None表示清空所有通道
        """
        operation_id = f"clear_{int(time.time() * 1000)}"
        self._start_operation(operation_id, "clear_cache")

        try:
            if channel_name is None:
                # 清空所有通道
                print(f"[TextCacheManager] 清空所有缓存通道 (操作ID: {operation_id})")
                self.cache_channels.clear()
                print(f"[TextCacheManager] ✓ 已清空所有缓存通道")
            else:
                # 清空指定通道
                print(f"[TextCacheManager] 清空缓存通道: {channel_name} (操作ID: {operation_id})")

                if channel_name in self.cache_channels:
                    self.cache_channels[channel_name] = {
                        "text": "",
                        "timestamp": 0.0,
                        "metadata": {}
                    }
                    print(f"[TextCacheManager] ✓ 已清空缓存通道: {channel_name}")
                else:
                    print(f"[TextCacheManager] 缓存通道不存在，无需清空: {channel_name}")

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

        finally:
            self._end_operation(operation_id)

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

    def _start_operation(self, operation_id: str, operation_type: str) -> None:
        """开始操作，添加到操作集合"""
        if self._operation_lock:
            print(f"[TextCacheManager] ⚠ 操作被锁定: {operation_id}")
        self._pending_operations.add(operation_id)

    def _end_operation(self, operation_id: str) -> None:
        """结束操作，从操作集合中移除"""
        if operation_id in self._pending_operations:
            self._pending_operations.remove(operation_id)

    def get_session_info(self) -> Dict[str, Any]:
        """获取会话信息"""
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
            "pending_operations": list(self._pending_operations),
            "operation_lock": self._operation_lock,
            "last_operation": self._last_operation,
            "total_channels": len(self.cache_channels)
        }

    def increment_get_count(self) -> None:
        """增加获取计数"""
        self.get_count_this_session += 1
        self.last_get_timestamp = time.time()


# 全局缓存管理器实例
text_cache_manager = TextCacheManager()
