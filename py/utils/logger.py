"""
统一日志管理模块

使用 Python 标准 logging 库提供可靠的日志输出功能。

使用方法：
    from ..utils.logger import get_logger
    logger = get_logger(__name__)
    logger.info("消息")
    logger.debug("调试信息")
    logger.warning("警告")
    logger.error("错误")

日志级别控制（优先级从高到低）：
    1. 环境变量 COMFYUI_LOG_LEVEL (DEBUG/INFO/WARNING/ERROR/CRITICAL)
    2. config.json 中的 logging.level 配置
    3. 代码默认值（INFO）

组件级别控制：
    在 config.json 中配置：
    {
        "logging": {
            "level": "INFO",
            "components": {
                "group_executor_manager": "DEBUG"
            }
        }
    }
"""

import logging
import os
import sys
import re
from pathlib import Path
from typing import Dict, Optional
from datetime import datetime
import glob
import shutil
import queue
import threading
import atexit
from logging.handlers import QueueHandler, QueueListener

# 全局配置
_LOG_LEVEL = None
_LOGGERS: Dict[str, logging.Logger] = {}
_INITIALIZED = False
_QUEUE_LISTENER: Optional[QueueListener] = None
_CONFIG_CACHE: Optional[Dict] = None  # 配置文件缓存（性能优化：避免重复读取）

# 插件根目录
PLUGIN_ROOT = Path(__file__).parent.parent.parent

# 日志目录
LOG_DIR = PLUGIN_ROOT / "logs"

# 日志文件（当前启动使用固定文件名，启动时归档旧日志）
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

# 性能优化：缓存颜色支持检测结果（避免重复的ctypes系统调用）
_COLOR_SUPPORT_CACHE: Optional[bool] = None


class ColoredFormatter(logging.Formatter):
    """彩色日志格式化器（仅在支持的终端生效）

    性能优化：颜色支持检测结果会被缓存，只在首次创建时检测一次
    """

    def __init__(self, use_colors=True):
        super().__init__(LOG_FORMAT, LOG_DATE_FORMAT)
        global _COLOR_SUPPORT_CACHE

        # 使用缓存的颜色支持检测结果
        if _COLOR_SUPPORT_CACHE is None:
            _COLOR_SUPPORT_CACHE = self._supports_color()

        self.use_colors = use_colors and _COLOR_SUPPORT_CACHE

    def _supports_color(self) -> bool:
        """检查终端是否支持彩色输出"""
        # Windows 10+ 支持 ANSI 颜色
        # Linux/Mac 通常支持
        if os.name == 'nt':
            # Windows: 检查是否启用了虚拟终端
            try:
                import ctypes
                kernel32 = ctypes.windll.kernel32
                # 尝试启用虚拟终端处理
                kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
                return True
            except:
                return False
        return hasattr(sys.stderr, 'isatty') and sys.stderr.isatty()

    def _shorten_name(self, name: str) -> str:
        r"""
        缩短日志名称，只保留最后一段模块名

        示例：
        - 输入: E:\...\ComfyUI-Danbooru-Gallery.py.group_executor_manager.group_executor_manager
        - 输出: group_executor_manager

        - 输入: py.utils.logger
        - 输出: logger

        - 输入: danbooru_gallery.group_executor_manager
        - 输出: group_executor_manager
        """
        # 如果包含插件根目录路径，先去掉
        plugin_root_str = str(PLUGIN_ROOT)
        if plugin_root_str in name:
            name = name.replace(plugin_root_str, '').lstrip('\\/')

        # 如果包含 ".py." 路径分隔符，提取最后一段
        if '.py.' in name:
            parts = name.split('.')
            return parts[-1] if parts else name

        # 如果以 "danbooru_gallery." 开头，去掉前缀
        if name.startswith('danbooru_gallery.'):
            name = name[len('danbooru_gallery.'):]

        # 如果包含点号（模块路径），提取最后一段
        if '.' in name:
            parts = name.split('.')
            return parts[-1] if parts else name

        # 如果包含路径分隔符，提取文件名（不含扩展名）
        if '\\' in name or '/' in name:
            # 提取最后一段路径
            name = name.replace('\\', '/').split('/')[-1]
            # 去掉 .py 扩展名（如果有）
            if name.endswith('.py'):
                name = name[:-3]
            return name

        return name

    def format(self, record):
        # 缩短logger名称
        original_name = record.name
        record.name = self._shorten_name(original_name)

        # 应用颜色
        if self.use_colors:
            levelname = record.levelname
            if levelname in COLOR_CODES:
                record.levelname = f"{COLOR_CODES[levelname]}{levelname}{COLOR_CODES['RESET']}"

        result = super().format(record)

        # 恢复原始名称（避免影响其他handler）
        record.name = original_name

        return result


class FileFormatter(logging.Formatter):
    """文件日志格式化器（带名称缩短功能）"""

    def __init__(self):
        super().__init__(LOG_FORMAT, LOG_DATE_FORMAT)

    def _shorten_name(self, name: str) -> str:
        r"""缩短日志名称，只保留最后一段模块名（与ColoredFormatter相同的逻辑）"""
        # 如果包含插件根目录路径，先去掉
        plugin_root_str = str(PLUGIN_ROOT)
        if plugin_root_str in name:
            name = name.replace(plugin_root_str, '').lstrip('\\/')

        # 如果包含 ".py." 路径分隔符，提取最后一段
        if '.py.' in name:
            parts = name.split('.')
            return parts[-1] if parts else name

        # 如果以 "danbooru_gallery." 开头，去掉前缀
        if name.startswith('danbooru_gallery.'):
            name = name[len('danbooru_gallery.'):]

        # 如果包含点号（模块路径），提取最后一段
        if '.' in name:
            parts = name.split('.')
            return parts[-1] if parts else name

        # 如果包含路径分隔符，提取文件名（不含扩展名）
        if '\\' in name or '/' in name:
            # 提取最后一段路径
            name = name.replace('\\', '/').split('/')[-1]
            # 去掉 .py 扩展名（如果有）
            if name.endswith('.py'):
                name = name[:-3]
            return name

        return name

    def format(self, record):
        # 缩短logger名称
        original_name = record.name
        record.name = self._shorten_name(original_name)

        result = super().format(record)

        # 恢复原始名称（避免影响其他handler）
        record.name = original_name

        return result


class ErrorConsoleFormatter(logging.Formatter):
    """
    ERROR级别控制台格式化器

    专门用于ERROR级别的控制台输出，使用简洁的插件前缀
    格式: [Danbooru-Gallery] 消息内容
    避免用户误会这是真正的错误（实际上可能只是重要信息）
    """

    def __init__(self, use_colors=True):
        # 不调用父类__init__，因为我们要自定义格式
        super().__init__()
        global _COLOR_SUPPORT_CACHE

        # 使用缓存的颜色支持检测结果
        if _COLOR_SUPPORT_CACHE is None:
            _COLOR_SUPPORT_CACHE = self._supports_color()

        self.use_colors = use_colors and _COLOR_SUPPORT_CACHE

    def _supports_color(self) -> bool:
        """检查终端是否支持彩色输出"""
        # Windows 10+ 支持 ANSI 颜色
        # Linux/Mac 通常支持
        if os.name == 'nt':
            # Windows: 检查是否启用了虚拟终端
            try:
                import ctypes
                kernel32 = ctypes.windll.kernel32
                # 尝试启用虚拟终端处理
                kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
                return True
            except:
                return False
        return hasattr(sys.stderr, 'isatty') and sys.stderr.isatty()

    def format(self, record):
        """
        格式化日志记录

        格式: [Danbooru-Gallery] 消息内容
        """
        # 获取消息内容
        message = record.getMessage()

        # 应用颜色（绿色，使其看起来不像错误）
        if self.use_colors:
            prefix = f"{COLOR_CODES['INFO']}[Danbooru-Gallery]{COLOR_CODES['RESET']}"
        else:
            prefix = "[Danbooru-Gallery]"

        # 返回格式化后的消息
        return f"{prefix} {message}"


class SizeCheckFileHandler(logging.FileHandler):
    """
    自定义文件处理器 - 超过大小限制时自动重建文件

    特点：
    - 写入前检查文件大小
    - 超过限制时：关闭文件 → 删除 → 重新创建
    - 避免单个日志文件过大（默认20MB限制）
    """

    def __init__(self, filename, max_bytes=20*1024*1024, mode='a', encoding='utf-8'):
        """
        初始化文件处理器

        Args:
            filename: 日志文件路径
            max_bytes: 文件大小限制（字节），默认20MB
            mode: 文件打开模式，默认'a'（追加）
            encoding: 文件编码，默认'utf-8'
        """
        self.max_bytes = max_bytes
        self._check_counter = 0  # 性能优化：不是每次都检查大小
        super().__init__(filename, mode=mode, encoding=encoding)

    def emit(self, record):
        """
        写入日志记录（带大小检查）

        Args:
            record: 日志记录对象
        """
        try:
            # 性能优化：每100条日志检查一次文件大小（而不是每次都检查）
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

                        # 超过限制，重建文件
                        if file_size >= self.max_bytes:
                            print(f"[Logger] ⚠️ 日志文件超过 {self.max_bytes/1024/1024:.1f}MB，正在重建...", file=sys.stderr)

                            # 关闭当前文件流
                            self.close()

                            # 删除文件
                            try:
                                Path(self.baseFilename).unlink(missing_ok=True)
                            except Exception as e:
                                print(f"[Logger] ⚠️ 删除旧日志文件失败: {e}", file=sys.stderr)

                            # 重新打开文件（会创建新文件）
                            self.stream = self._open()

                            print(f"[Logger] ✅ 日志文件已重建", file=sys.stderr)
                    except Exception as e:
                        # 大小检查失败，忽略（继续写入）
                        pass

            # 写入日志
            super().emit(record)

        except Exception:
            self.handleError(record)


class PluginLogFilter(logging.Filter):
    """
    插件日志过滤器 - 只允许本插件的日志通过

    过滤掉来自 ComfyUI 核心和其他插件的日志，保持日志文件干净整洁
    """

    def filter(self, record):
        """
        判断是否允许日志记录通过

        Returns:
            bool: True 表示允许，False 表示过滤掉
        """
        logger_name = record.name

        # 过滤掉 root logger 的日志（ComfyUI 核心日志）
        if logger_name == 'root':
            return False

        # 只允许以下类型的日志：
        # 1. 包含 "Danbooru" 的日志（本插件的主要日志）
        if 'Danbooru' in logger_name:
            return True

        # 2. 包含插件特定模块名的日志
        plugin_keywords = [
            'MultiCharacter',
            'CharacterFeatureSwap',
            'GlobalTextCache',
            'ComfyUI-Danbooru-Gallery',  # 完整插件名
            '.py.',  # 插件模块路径标记
        ]

        for keyword in plugin_keywords:
            if keyword in logger_name:
                return True

        # 3. 以 'py.' 开头的日志（插件模块）
        if logger_name.startswith('py.'):
            return True

        # 过滤掉其他所有日志
        return False


def _load_config() -> Dict:
    """
    加载并缓存配置文件（性能优化：仅读取一次）

    Returns:
        Dict: 配置字典，如果读取失败则返回空字典
    """
    global _CONFIG_CACHE

    if _CONFIG_CACHE is not None:
        return _CONFIG_CACHE

    try:
        import json
        config_file = PLUGIN_ROOT / "config.json"
        if config_file.exists():
            with open(config_file, 'r', encoding='utf-8') as f:
                _CONFIG_CACHE = json.load(f)
        else:
            _CONFIG_CACHE = {}
    except Exception:
        _CONFIG_CACHE = {}

    return _CONFIG_CACHE


def _get_log_level() -> int:
    """
    获取日志级别（按优先级）

    优化：使用配置缓存，避免重复读取文件

    Returns:
        int: logging 模块的级别常量
    """
    global _LOG_LEVEL

    if _LOG_LEVEL is not None:
        return _LOG_LEVEL

    # 1. 环境变量
    env_level = os.environ.get('COMFYUI_LOG_LEVEL', '').upper()
    if env_level in ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']:
        _LOG_LEVEL = getattr(logging, env_level)
        return _LOG_LEVEL

    # 2. 配置文件（使用缓存）
    config = _load_config()
    logging_config = config.get('logging', {})
    level_str = logging_config.get('level', '').upper()
    if level_str in ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']:
        _LOG_LEVEL = getattr(logging, level_str)
        return _LOG_LEVEL

    # 3. 默认值
    _LOG_LEVEL = logging.INFO
    return _LOG_LEVEL


def _get_component_log_level(component_name: str) -> Optional[int]:
    """
    获取特定组件的日志级别

    优化：使用配置缓存，避免重复读取文件

    Args:
        component_name: 组件名称（通常是模块路径）

    Returns:
        int or None: logging 级别常量，如果没有特定配置则返回 None
    """
    config = _load_config()
    logging_config = config.get('logging', {})
    components = logging_config.get('components', {})

    # 尝试精确匹配
    if component_name in components:
        level_str = components[component_name].upper()
        if level_str in ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']:
            return getattr(logging, level_str)

    # 尝试模块匹配（如 py.group_executor_manager.xxx -> group_executor_manager）
    for key in components:
        if key in component_name:
            level_str = components[key].upper()
            if level_str in ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']:
                return getattr(logging, level_str)

    return None


def _get_console_output_enabled() -> bool:
    """
    获取控制台输出配置

    优化：使用配置缓存，避免重复读取文件

    Returns:
        bool: True 启用控制台输出，False 禁用（默认 True）
    """
    config = _load_config()
    logging_config = config.get('logging', {})
    return logging_config.get('console_output', True)  # 默认启用控制台输出


def _archive_current_log():
    """
    归档当前日志文件（启动时调用）

    如果 danbooru_gallery.log 存在，将其重命名为带时间戳的归档文件
    时间戳使用文件的创建时间

    归档文件命名：danbooru_gallery_YYYYMMDD_HHMMSS.log
    如果同名文件已存在，添加后缀 _1, _2, _3 等避免冲突
    """
    try:
        # 确保日志目录存在
        if not LOG_DIR.exists():
            LOG_DIR.mkdir(parents=True, exist_ok=True)
            return

        # 检查当前日志文件是否存在
        if not LOG_FILE.exists():
            return

        # 获取文件创建时间
        try:
            file_stat = LOG_FILE.stat()
            # Windows: st_ctime 是创建时间
            # Linux: st_ctime 是最后元数据变更时间，但这里用作替代
            file_ctime = file_stat.st_ctime
            file_datetime = datetime.fromtimestamp(file_ctime)
            timestamp = file_datetime.strftime("%Y%m%d_%H%M%S")
        except Exception as e:
            # 如果获取时间失败，使用当前时间
            print(f"[Logger] ⚠️ 无法获取日志文件创建时间，使用当前时间: {e}", file=sys.stderr)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        # 生成归档文件名
        base_archive_name = f"danbooru_gallery_{timestamp}.log"
        archive_path = LOG_DIR / base_archive_name

        # 处理文件名冲突（添加后缀 _1, _2, _3...）
        counter = 1
        while archive_path.exists():
            base_archive_name = f"danbooru_gallery_{timestamp}_{counter}.log"
            archive_path = LOG_DIR / base_archive_name
            counter += 1

        # 重命名文件
        try:
            LOG_FILE.rename(archive_path)
            print(f"[Logger] 📦 归档旧日志: {LOG_FILE.name} → {archive_path.name}", file=sys.stderr)
        except PermissionError as e:
            # Windows特定：文件被锁定时，尝试复制后删除
            if "另一个程序正在使用此文件" in str(e) or "being used by another process" in str(e).lower():
                print(f"[Logger] ⚠️ 日志文件被占用，尝试复制后删除: {e}", file=sys.stderr)
                try:
                    import shutil
                    # 复制到归档路径
                    shutil.copy2(LOG_FILE, archive_path)
                    print(f"[Logger] 📋 日志已复制到归档文件: {archive_path.name}", file=sys.stderr)

                    # 尝试删除原文件（可能仍然失败，这是可接受的）
                    try:
                        LOG_FILE.unlink()
                        print(f"[Logger] 🗑️ 原日志文件已删除", file=sys.stderr)
                    except PermissionError:
                        print(f"[Logger] ⚠️ 原日志文件仍在使用中，将保留", file=sys.stderr)
                except Exception as copy_error:
                    print(f"[Logger] ❌ 复制归档失败: {copy_error}", file=sys.stderr)
                    raise  # 重新抛出原始异常
            else:
                raise  # 重新抛出非文件占用异常

    except Exception as e:
        print(f"[Logger] ⚠️ 归档日志文件失败: {e}", file=sys.stderr)


def _cleanup_old_logs():
    """
    清理旧日志文件，只保留最新4个归档文件

    文件结构：
    - 当前文件：danbooru_gallery.log（不计入清理范围）
    - 归档文件：danbooru_gallery_20250109_153045.log
    - 旧版分片：danbooru_gallery_*.log.1, .log.2（需要清理）

    清理策略：
    - 识别所有带时间戳的归档文件
    - 按时间戳排序，保留最新4个归档
    - 删除多余的归档文件
    - 清理所有遗留的分片文件（旧版本产生的 .log.1, .log.2 等）

    性能优化：
    - 目录不存在或为空时快速返回，避免不必要的文件系统扫描
    """
    try:
        # 性能优化：目录不存在时直接返回
        if not LOG_DIR.exists():
            LOG_DIR.mkdir(parents=True, exist_ok=True)
            return

        # 性能优化：快速检查目录是否为空或仅有.gitkeep
        # 避免不必要的glob扫描
        files = list(LOG_DIR.iterdir())
        if len(files) <= 1:  # 只有.gitkeep或空目录
            return

        # 找到所有归档日志文件（带时间戳，不含 .1, .2 后缀）
        log_pattern = str(LOG_DIR / "danbooru_gallery_*.log")
        all_files = glob.glob(log_pattern)

        # 使用正则表达式过滤归档文件
        # 匹配格式：danbooru_gallery_YYYYMMDD_HHMMSS.log 或 danbooru_gallery_YYYYMMDD_HHMMSS_N.log
        # 不匹配：danbooru_gallery.log（当前文件）和 .log.1, .log.2（分片文件）
        archive_pattern_re = re.compile(r'danbooru_gallery_\d{8}_\d{6}(_\d+)?\.log$')
        archive_logs = [f for f in all_files if archive_pattern_re.search(os.path.basename(f))]

        # 按文件名排序（时间戳在文件名中，自然排序即可）
        archive_logs.sort(reverse=True)

        # 保留最新4个归档，删除其他的
        logs_to_delete = archive_logs[4:]

        for archive_log in logs_to_delete:
            try:
                archive_log_path = Path(archive_log)
                archive_log_path.unlink(missing_ok=True)
                print(f"[Logger] 🗑️ 清理旧归档: {archive_log_path.name}", file=sys.stderr)
            except Exception as e:
                print(f"[Logger] ⚠️ 无法删除旧归档 {archive_log}: {e}", file=sys.stderr)

        # 额外：清理所有遗留的分片文件（旧版本产生的 .log.1, .log.2 等）
        split_pattern = str(LOG_DIR / "danbooru_gallery*.log.*")
        split_files = glob.glob(split_pattern)
        for split_file in split_files:
            try:
                split_file_path = Path(split_file)
                split_file_path.unlink(missing_ok=True)
                print(f"[Logger] 🗑️ 清理旧分片: {split_file_path.name}", file=sys.stderr)
            except Exception as e:
                print(f"[Logger] ⚠️ 无法删除旧分片 {split_file}: {e}", file=sys.stderr)

    except Exception as e:
        print(f"[Logger] ⚠️ 日志清理失败: {e}", file=sys.stderr)


def _create_file_handler() -> Optional[SizeCheckFileHandler]:
    """
    创建文件处理器（基于大小自动重建）

    大小限制策略：
    - 单个日志文件最大 20MB
    - 超过20MB时自动删除并重建文件
    - 每100条日志检查一次大小（性能优化）

    Returns:
        SizeCheckFileHandler or None: 文件处理器，如果创建失败则返回 None
    """
    try:
        # 确保日志目录存在
        LOG_DIR.mkdir(parents=True, exist_ok=True)

        # 创建自定义文件处理器（带大小检查）
        handler = SizeCheckFileHandler(
            LOG_FILE,
            max_bytes=20 * 1024 * 1024,  # 20MB
            mode='a',  # 追加模式
            encoding='utf-8'
        )

        return handler
    except Exception as e:
        # 如果创建文件处理器失败，输出警告但不中断
        print(f"[Logger] 警告: 无法创建日志文件处理器: {e}", file=sys.stderr)
        return None


def _stop_queue_listener():
    """
    停止队列监听器（在程序退出时调用）

    确保所有缓冲的日志都被写入文件，防止日志丢失。
    """
    global _QUEUE_LISTENER

    if _QUEUE_LISTENER is not None:
        try:
            _QUEUE_LISTENER.stop()  # 等待队列清空并停止
            _QUEUE_LISTENER = None
        except Exception as e:
            print(f"[Logger] 警告: 停止日志队列监听器失败: {e}", file=sys.stderr)


def setup_logging():
    """
    初始化日志系统（异步文件写入 + 归档策略）

    ⚠️ 重要：不修改根logger，只为本插件的logger添加handlers

    应该在插件加载时调用一次。
    只配置本插件专属的 logger，不影响 ComfyUI 核心和其他插件。

    性能优化：
    - 使用 QueueHandler + QueueListener 实现异步文件写入
    - 文件 I/O 在后台线程执行，不阻塞主线程
    - 提升启动速度和运行时性能

    日志管理策略：
    1. 启动时归档：将旧的 danbooru_gallery.log 重命名为带时间戳的归档文件
       例如：danbooru_gallery_20250109_153045.log
    2. 当前日志：始终使用固定文件名 danbooru_gallery.log
    3. 大小限制：单个日志超过20MB时自动删除并重建
    4. 历史清理：保留最新4个归档文件，自动删除更早的日志

    注意：ERROR 和 CRITICAL 级别的日志会强制输出到控制台（stderr），
         无视 console_output 配置，确保重要错误信息不会被忽略。
    """
    global _INITIALIZED, _QUEUE_LISTENER

    if _INITIALIZED:
        return

    _INITIALIZED = True

    # 归档旧日志（如果存在）
    _archive_current_log()

    # 性能优化：异步清理旧归档文件（不阻塞启动）
    # 使用daemon=True确保主程序退出时线程也会终止
    cleanup_thread = threading.Thread(target=_cleanup_old_logs, daemon=True, name='LogCleanup')
    cleanup_thread.start()

    # 获取日志级别
    level = _get_log_level()

    # ⚠️ 关键修改：不修改根logger！创建插件专属的logger
    # 使用固定的logger名称作为父logger
    plugin_logger = logging.getLogger('danbooru_gallery')
    plugin_logger.setLevel(logging.DEBUG)  # 接受所有级别，由 handler 控制
    plugin_logger.propagate = False  # 不传播到根logger，避免影响其他插件

    # 清除现有的处理器（避免重复）
    plugin_logger.handlers.clear()

    # 检查是否启用控制台输出
    console_enabled = _get_console_output_enabled()

    # 1. 普通控制台处理器（可选，处理 DEBUG/INFO/WARNING，输出到 stdout）
    if console_enabled:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(level)
        console_handler.setFormatter(ColoredFormatter(use_colors=True))
        # 只处理非ERROR级别的日志（ERROR由专用handler处理）
        console_handler.addFilter(lambda record: record.levelno < logging.ERROR)
        plugin_logger.addHandler(console_handler)

    # 2. 错误控制台处理器（强制启用，处理 ERROR/CRITICAL，输出到 stderr）
    error_console_handler = logging.StreamHandler(sys.stderr)
    error_console_handler.setLevel(logging.ERROR)  # 只处理ERROR和CRITICAL
    error_console_handler.setFormatter(ErrorConsoleFormatter(use_colors=True))  # 使用简洁的插件前缀格式
    plugin_logger.addHandler(error_console_handler)

    # 3. 异步文件处理器（性能优化：使用 Queue 在后台线程写入）
    file_handler = _create_file_handler()
    if file_handler:
        file_handler.setLevel(logging.DEBUG)  # 文件记录所有级别（包括 DEBUG）
        file_handler.setFormatter(FileFormatter())
        # 不需要 PluginLogFilter，因为只有本插件的logger会使用这个handler

        # 创建日志队列（异步写入）
        log_queue = queue.Queue(maxsize=1000)  # 最大1000条日志缓存

        # 创建 QueueHandler 添加到插件logger（非阻塞）
        queue_handler = QueueHandler(log_queue)
        queue_handler.setLevel(logging.DEBUG)
        plugin_logger.addHandler(queue_handler)

        # 创建 QueueListener 在后台线程处理文件写入（异步）
        _QUEUE_LISTENER = QueueListener(
            log_queue,
            file_handler,
            respect_handler_level=True
        )

        # 启动后台监听线程
        _QUEUE_LISTENER.start()

        # 注册退出时停止 listener（确保日志完整写入）
        atexit.register(_stop_queue_listener)

    # 输出初始化信息（如果控制台禁用，则只输出到文件）
    logger = get_logger(__name__)
    logger.info("=" * 60)
    logger.info("ComfyUI-Danbooru-Gallery 日志系统已初始化")
    logger.info(f"日志级别: {logging.getLevelName(level)}")
    logger.info(f"控制台输出: {'启用' if console_enabled else '禁用（ERROR仍会输出）'}")
    logger.info(f"日志文件: {LOG_FILE.name}")
    logger.info(f"日志策略: 当前文件无后缀 | 启动时归档旧日志 | 保留4个归档 | 超20MB自动重建")
    logger.info("=" * 60)


def get_logger(name: str) -> logging.Logger:
    """
    获取或创建 logger

    ⚠️ 重要：所有logger都在'danbooru_gallery'层级下，不影响其他插件

    Args:
        name: logger 名称（通常使用 __name__）

    Returns:
        logging.Logger: logger 实例

    Example:
        logger = get_logger(__name__)
        logger.info("消息")
        logger.debug("调试信息")
    """
    # 如果还没有初始化，先初始化
    if not _INITIALIZED:
        setup_logging()

    # 如果已经创建过，直接返回
    if name in _LOGGERS:
        return _LOGGERS[name]

    # ⚠️ 关键修改：创建插件专属层级的logger
    # 确保logger名称在'danbooru_gallery'层级下
    if not name.startswith('danbooru_gallery'):
        # 提取最后一段作为子logger名称
        if '.' in name:
            short_name = name.split('.')[-1]
        else:
            short_name = name
        logger_name = f'danbooru_gallery.{short_name}'
    else:
        logger_name = name

    # 创建新的 logger（会自动继承父logger 'danbooru_gallery' 的配置）
    logger = logging.getLogger(logger_name)

    # 检查是否有组件级别配置
    component_level = _get_component_log_level(name)
    if component_level is not None:
        logger.setLevel(component_level)
    else:
        logger.setLevel(logging.DEBUG)  # logger 自身级别设为 DEBUG，由 handler 控制

    # ⚠️ 关键：propagate = True 让日志传播到父logger 'danbooru_gallery'
    # 但不会传播到根logger，因为父logger的propagate = False
    logger.propagate = True

    # 缓存
    _LOGGERS[name] = logger

    return logger


def set_log_level(level: str):
    """
    动态设置日志级别

    ⚠️ 重要：只修改本插件logger的级别，不影响其他插件

    Args:
        level: 日志级别字符串 (DEBUG/INFO/WARNING/ERROR/CRITICAL)
    """
    global _LOG_LEVEL

    level_upper = level.upper()
    if level_upper not in ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']:
        raise ValueError(f"无效的日志级别: {level}")

    _LOG_LEVEL = getattr(logging, level_upper)

    # ⚠️ 关键修改：只更新插件专属logger的handlers，不影响根logger
    plugin_logger = logging.getLogger('danbooru_gallery')
    for handler in plugin_logger.handlers:
        if isinstance(handler, logging.StreamHandler) and not isinstance(handler, logging.FileHandler):
            # 只更新控制台处理器，文件处理器保持 DEBUG
            handler.setLevel(_LOG_LEVEL)

    logger = get_logger(__name__)
    logger.info(f"日志级别已更新为: {level_upper}")


# 自动初始化
setup_logging()
