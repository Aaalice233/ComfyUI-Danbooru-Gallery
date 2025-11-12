"""
统一日志管理模块 - 极简版本

特点：
- 每次启动覆写 danbooru_gallery.log
- 超过20MB时自动清空文件
- 无归档、无清理、无复杂性
- 专注于稳定可靠的日志记录

使用方法：
    from ..utils.logger import get_logger
    logger = get_logger(__name__)
    logger.info("消息")
    logger.debug("调试信息")
    logger.warning("警告")
    logger.error("错误")

日志级别控制（优先级从高到低）：
    1. 环境变量 COMFYUI_LOG_LEVEL (DEBUG/INFO/WARNING/ERROR/CRITICAL)
    2. 代码默认值（INFO）
"""

import logging
import os
import sys
import re
from pathlib import Path
from typing import Dict, Optional
from datetime import datetime

# 全局配置
_LOG_LEVEL = None
_LOGGERS: Dict[str, logging.Logger] = {}
_INITIALIZED = False

# 插件根目录
PLUGIN_ROOT = Path(__file__).parent.parent.parent

# 日志目录
LOG_DIR = PLUGIN_ROOT / "logs"

# 日志文件（每次启动覆写）
LOG_FILE = LOG_DIR / "danbooru_gallery.log"

# 日志格式（包含日期时间）
LOG_FORMAT = "[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s"
LOG_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

# 控制台彩色输出（仅在支持的终端）
COLOR_CODES = {
    'DEBUG': '\033[36m',      # 青色
    'INFO': '\033[32m',       # 绿色
    'WARNING': '\033[33m',    # 黄色
    'ERROR': '\033[31m',      # 红色
    'CRITICAL': '\033[35m',   # 紫色
    'RESET': '\033[0m'        # 重置
}


class ColoredFormatter(logging.Formatter):
    """彩色日志格式化器（仅在支持的终端生效）"""

    def __init__(self, use_colors=True):
        super().__init__(LOG_FORMAT, LOG_DATE_FORMAT)
        self.use_colors = use_colors and self._supports_color()

    def _supports_color(self) -> bool:
        """检查终端是否支持彩色输出"""
        if os.name == 'nt':
            try:
                import ctypes
                kernel32 = ctypes.windll.kernel32
                kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
                return True
            except:
                return False
        return hasattr(sys.stderr, 'isatty') and sys.stderr.isatty()

    def _shorten_name(self, name: str) -> str:
        """缩短日志名称，只保留最后一段模块名"""
        # 如果包含插件根目录路径，先去掉
        plugin_root_str = str(PLUGIN_ROOT)
        if plugin_root_str in name:
            name = name.replace(plugin_root_str, '').lstrip('\\/')

        # 如果以 "danbooru_gallery." 开头，去掉前缀
        if name.startswith('danbooru_gallery.'):
            name = name[len('danbooru_gallery.'):]

        # 如果包含点号（模块路径），提取最后一段
        if '.' in name:
            parts = name.split('.')
            return parts[-1] if parts else name

        return name

    def format(self, record):
        # 缩短logger名称
        original_name = record.name
        record.name = self._shorten_name(original_name)

        # 应用颜色
        if self.use_colors and hasattr(record, 'levelname'):
            color_code = COLOR_CODES.get(record.levelname, '')
            reset_code = COLOR_CODES['RESET']
            # 为整条记录添加颜色
            formatted = super().format(record)
            return f"{color_code}{formatted}{reset_code}"

        # 恢复原始名称（避免影响其他handler）
        result = super().format(record)
        record.name = original_name

        return result


class SimpleFileHandler(logging.FileHandler):
    """
    简化文件处理器 - 超过大小限制时自动清空文件

    特点：
    - 每次启动覆写文件（不保留历史）
    - 超过20MB时清空文件内容
    - 无归档、无清理、无复杂性
    - 专注于单文件稳定写入
    """

    def __init__(self, filename, max_bytes=20*1024*1024, mode='w', encoding='utf-8'):
        """
        初始化文件处理器

        Args:
            filename: 日志文件路径
            max_bytes: 文件大小限制（字节），默认20MB
            mode: 文件打开模式，默认'w'（覆写）
            encoding: 文件编码，默认'utf-8'
        """
        self.max_bytes = max_bytes
        self._check_counter = 0  # 性能优化：不是每次都检查大小
        self.last_clear_time = 0  # 清空冷却机制
        self.clear_cooldown_seconds = 5  # 清空冷却时间：5秒内只允许清空一次
        super().__init__(filename, mode=mode, encoding=encoding)

    def emit(self, record):
        """
        写入日志记录（带大小检查和自动清空）

        Args:
            record: 日志记录对象
        """
        try:
            # 性能优化：每100条日志检查一次文件大小
            self._check_counter += 1
            if self._check_counter >= 100:
                self._check_counter = 0

                # 检查文件大小
                if self.stream and hasattr(self.stream, 'tell'):
                    try:
                        # 移动到文件末尾并获取位置（文件大小）
                        current_pos = self.stream.tell()
                        self.stream.seek(0, 2)  # SEEK_END
                        file_size = self.stream.tell()
                        self.stream.seek(current_pos)  # 恢复原位置

                        # 超过限制，清空文件
                        if file_size >= self.max_bytes:
                            import time
                            current_time = time.time()

                            # 检查清空冷却机制
                            if current_time - self.last_clear_time < self.clear_cooldown_seconds:
                                # 在冷却期内，跳过此次清空
                                return

                            # 更新清空时间戳
                            self.last_clear_time = current_time

                            # 直接输出清空信息到stderr
                            print(f"[Logger] 📄 日志文件超过 {self.max_bytes/1024/1024:.1f}MB，已清空", file=sys.stderr)

                            # 清空文件内容
                            self.stream.seek(0)  # 移动到开头
                            self.stream.truncate(0)  # 截断为空文件
                            self.stream.write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [INFO] [Logger] 日志文件已清空，开始新的记录\n")
                            self.stream.flush()

                    except Exception as e:
                        # 文件操作失败，忽略（继续写入）
                        pass

            # 只有在文件流正常时才写入日志
            if self.stream is not None:
                super().emit(record)

        except Exception:
            self.handleError(record)


class ErrorConsoleFormatter(logging.Formatter):
    """
    ERROR级别控制台格式化器

    专门用于ERROR级别的控制台输出，使用简洁的插件前缀
    格式: [Danbooru-Gallery] 消息内容
    无时间戳，保持简洁
    """

    def __init__(self, use_colors=True):
        super().__init__()
        self.use_colors = use_colors and self._supports_color()

    def _supports_color(self) -> bool:
        """检查终端是否支持彩色输出"""
        if os.name == 'nt':
            try:
                import ctypes
                kernel32 = ctypes.windll.kernel32
                kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
                return True
            except:
                return False
        return hasattr(sys.stderr, 'isatty') and sys.stderr.isatty()

    def format(self, record):
        """
        格式化日志记录

        格式: [Danbooru-Gallery] 消息内容
        无时间戳，保持简洁，全部无色
        """
        # 获取消息内容
        message = record.getMessage()

        # 返回格式化后的消息（无时间戳，无颜色）
        return f"[Danbooru-Gallery] {message}"


def _get_log_level() -> int:
    """
    获取日志级别

    优先级：
    1. 环境变量 COMFYUI_LOG_LEVEL
    2. 默认值（INFO）

    Returns:
        int: logging 模块的日志级别常量
    """
    global _LOG_LEVEL

    if _LOG_LEVEL is not None:
        return _LOG_LEVEL

    # 1. 检查环境变量
    env_level = os.environ.get('COMFYUI_LOG_LEVEL', '').upper()
    if hasattr(logging, env_level):
        _LOG_LEVEL = getattr(logging, env_level)
        print(f"[Logger] 🔧 使用环境变量日志级别: {env_level}", file=sys.stderr)
        return _LOG_LEVEL

    # 2. 使用默认值
    _LOG_LEVEL = logging.INFO
    return _LOG_LEVEL


def setup_logging():
    """
    初始化简化日志系统（单文件覆写模式）

    特点：
    - 每次启动覆写日志文件，不保留历史记录
    - 文件超过20MB时自动清空内容
    - 无复杂的归档和清理逻辑
    - 专注于稳定可靠的日志记录
    """
    global _INITIALIZED

    if _INITIALIZED:
        return

    _INITIALIZED = True

    # 确保日志目录存在
    LOG_DIR.mkdir(parents=True, exist_ok=True)

    # 获取日志级别
    level = _get_log_level()

    # 创建插件专属的logger
    plugin_logger = logging.getLogger('danbooru_gallery')
    plugin_logger.setLevel(logging.DEBUG)  # 接受所有级别，由 handler 控制
    plugin_logger.propagate = False  # 不传播到根logger，避免影响其他插件

    # 清除现有的处理器（避免重复）
    plugin_logger.handlers.clear()

    # 只保留ERROR级别的控制台处理器（输出到 stderr）
    # 文件已写入所有日志，控制台只显示ERROR级别的重要信息
    error_console_handler = logging.StreamHandler(sys.stderr)
    error_console_handler.setLevel(logging.ERROR)  # 只处理ERROR和CRITICAL
    error_console_handler.setFormatter(ErrorConsoleFormatter(use_colors=True))
    plugin_logger.addHandler(error_console_handler)

    # 3. 简化文件处理器（每次启动覆写，超过大小自动清空）
    try:
        file_handler = SimpleFileHandler(
            LOG_FILE,
            max_bytes=20 * 1024 * 1024,  # 20MB
            mode='w',  # 覆写模式
            encoding='utf-8'
        )
        file_handler.setLevel(logging.DEBUG)  # 文件记录所有级别（包括 DEBUG）
        file_handler.setFormatter(ColoredFormatter(use_colors=False))
        plugin_logger.addHandler(file_handler)
        print(f"[Logger] ✅ 日志系统已初始化，文件: {LOG_FILE.name}", file=sys.stderr)
    except Exception as e:
        print(f"[Logger] ⚠️ 无法创建日志文件处理器: {e}", file=sys.stderr)

    # 输出简洁的初始化信息（写入文件，不显示在控制台）
    logger = get_logger(__name__)
    logger.info("=" * 60)
    logger.info("ComfyUI-Danbooru-Gallery 简化日志系统已初始化")
    logger.info(f"日志级别: {logging.getLevelName(level)}")
    logger.info(f"日志文件: {LOG_FILE.name}")
    logger.info("日志策略: 单文件覆写 | 超过20MB自动清空 | 仅ERROR输出到控制台")
    logger.info("=" * 60)


def get_logger(name: str) -> logging.Logger:
    """
    获取或创建 logger

    ⚠️ 重要：所有logger都在'danbooru_gallery'层级下，不影响其他插件

    Args:
        name: logger 名称（通常使用 __name__）

    Returns:
        logging.Logger: logger 实例
    """
    # 确保日志系统已初始化
    if not _INITIALIZED:
        setup_logging()

    # 创建子logger名称
    full_name = f'danbooru_gallery.{name}'

    # 获取或创建logger
    logger = logging.getLogger(full_name)

    # 缓存logger（避免重复创建）
    if full_name not in _LOGGERS:
        _LOGGERS[full_name] = logger

    return logger