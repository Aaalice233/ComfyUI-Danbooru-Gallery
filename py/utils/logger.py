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
from pathlib import Path
from typing import Dict, Optional
from datetime import datetime
import glob
import shutil

# 全局配置
_LOG_LEVEL = None
_LOGGERS: Dict[str, logging.Logger] = {}
_INITIALIZED = False

# 插件根目录
PLUGIN_ROOT = Path(__file__).parent.parent.parent

# 日志目录
LOG_DIR = PLUGIN_ROOT / "logs"

# 日志文件
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
        """
        缩短日志名称，只保留最后一段模块名

        示例：
        - 输入: E:\...\ComfyUI-Danbooru-Gallery.py.group_executor_manager.group_executor_manager
        - 输出: group_executor_manager

        - 输入: py.utils.logger
        - 输出: logger
        """
        # 如果包含 ".py." 路径分隔符，提取最后一段
        if '.py.' in name:
            parts = name.split('.')
            return parts[-1] if parts else name

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
        """缩短日志名称，只保留最后一段模块名（与ColoredFormatter相同的逻辑）"""
        # 如果包含 ".py." 路径分隔符，提取最后一段
        if '.py.' in name:
            parts = name.split('.')
            return parts[-1] if parts else name

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


def _get_log_level() -> int:
    """
    获取日志级别（按优先级）

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

    # 2. 配置文件
    try:
        import json
        config_file = PLUGIN_ROOT / "config.json"
        if config_file.exists():
            with open(config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
                logging_config = config.get('logging', {})
                level_str = logging_config.get('level', '').upper()
                if level_str in ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']:
                    _LOG_LEVEL = getattr(logging, level_str)
                    return _LOG_LEVEL
    except Exception:
        pass

    # 3. 默认值
    _LOG_LEVEL = logging.INFO
    return _LOG_LEVEL


def _get_component_log_level(component_name: str) -> Optional[int]:
    """
    获取特定组件的日志级别

    Args:
        component_name: 组件名称（通常是模块路径）

    Returns:
        int or None: logging 级别常量，如果没有特定配置则返回 None
    """
    try:
        import json
        config_file = PLUGIN_ROOT / "config.json"
        if config_file.exists():
            with open(config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
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
    except Exception:
        pass

    return None


def _get_console_output_enabled() -> bool:
    """
    获取控制台输出配置

    Returns:
        bool: True 启用控制台输出，False 禁用（默认 True）
    """
    try:
        import json
        config_file = PLUGIN_ROOT / "config.json"
        if config_file.exists():
            with open(config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
                logging_config = config.get('logging', {})
                return logging_config.get('console_output', True)  # 默认启用
    except Exception:
        pass

    return True  # 默认启用控制台输出


def _rotate_log_files():
    """
    启动时轮换日志文件

    - 如果当前日志文件存在且有内容，将其复制为带时间戳的备份
    - 只保留最新的3个备份文件
    - 当前日志文件会被 FileHandler 以 'w' 模式覆写
    """
    try:
        # 确保日志目录存在
        LOG_DIR.mkdir(parents=True, exist_ok=True)

        # 如果当前日志文件存在且有内容，进行备份
        if LOG_FILE.exists() and LOG_FILE.stat().st_size > 0:
            # 生成备份文件名（使用时间戳）
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_file = LOG_DIR / f"danbooru_gallery_{timestamp}.log"

            # 复制当前日志为备份（而不是重命名，避免文件占用问题）
            shutil.copy2(LOG_FILE, backup_file)

            # 清理旧的备份文件，只保留最新的3个
            backup_pattern = str(LOG_DIR / "danbooru_gallery_*.log")
            backup_files = sorted(glob.glob(backup_pattern), reverse=True)

            # 删除超过3个的旧备份
            for old_backup in backup_files[3:]:
                try:
                    os.remove(old_backup)
                except Exception as e:
                    print(f"[Logger] 警告: 无法删除旧备份文件 {old_backup}: {e}", file=sys.stderr)

    except Exception as e:
        print(f"[Logger] 警告: 日志文件轮换失败: {e}", file=sys.stderr)


def _create_file_handler() -> Optional[logging.FileHandler]:
    """
    创建文件处理器

    Returns:
        FileHandler or None: 文件处理器，如果创建失败则返回 None
    """
    try:
        # 确保日志目录存在
        LOG_DIR.mkdir(parents=True, exist_ok=True)

        # 创建文件处理器（每次启动覆写）
        handler = logging.FileHandler(
            LOG_FILE,
            mode='w',  # 覆写模式
            encoding='utf-8'
        )

        return handler
    except Exception as e:
        # 如果创建文件处理器失败，输出警告但不中断
        print(f"[Logger] 警告: 无法创建日志文件处理器: {e}", file=sys.stderr)
        return None


def setup_logging():
    """
    初始化日志系统

    应该在插件加载时调用一次。
    设置根 logger 的处理器和格式化器。
    """
    global _INITIALIZED

    if _INITIALIZED:
        return

    _INITIALIZED = True

    # 启动时轮换日志文件（备份旧日志，创建新日志）
    _rotate_log_files()

    # 获取日志级别
    level = _get_log_level()

    # 配置根 logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG)  # 根 logger 接受所有级别，由 handler 控制

    # 清除现有的处理器（避免重复）
    root_logger.handlers.clear()

    # 检查是否启用控制台输出
    console_enabled = _get_console_output_enabled()

    # 1. 控制台处理器（可选）
    if console_enabled:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(level)
        console_handler.setFormatter(ColoredFormatter(use_colors=True))
        root_logger.addHandler(console_handler)

    # 2. 文件处理器（始终启用）
    file_handler = _create_file_handler()
    if file_handler:
        file_handler.setLevel(logging.DEBUG)  # 文件记录所有级别（包括 DEBUG）
        file_handler.setFormatter(FileFormatter())
        file_handler.addFilter(PluginLogFilter())  # 只记录插件日志，过滤 ComfyUI 核心日志
        root_logger.addHandler(file_handler)

    # 输出初始化信息（如果控制台禁用，则只输出到文件）
    logger = get_logger(__name__)
    logger.info("=" * 60)
    logger.info("ComfyUI-Danbooru-Gallery 日志系统已初始化")
    logger.info(f"日志级别: {logging.getLevelName(level)}")
    logger.info(f"控制台输出: {'启用' if console_enabled else '禁用'}")
    logger.info(f"日志文件: {LOG_FILE}")
    logger.info("=" * 60)


def get_logger(name: str) -> logging.Logger:
    """
    获取或创建 logger

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

    # 创建新的 logger
    logger = logging.getLogger(name)

    # 检查是否有组件级别配置
    component_level = _get_component_log_level(name)
    if component_level is not None:
        logger.setLevel(component_level)
    else:
        logger.setLevel(logging.DEBUG)  # logger 自身级别设为 DEBUG，由 handler 控制

    # 不传播到根 logger（避免重复输出）
    logger.propagate = True

    # 缓存
    _LOGGERS[name] = logger

    return logger


def set_log_level(level: str):
    """
    动态设置日志级别

    Args:
        level: 日志级别字符串 (DEBUG/INFO/WARNING/ERROR/CRITICAL)
    """
    global _LOG_LEVEL

    level_upper = level.upper()
    if level_upper not in ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']:
        raise ValueError(f"无效的日志级别: {level}")

    _LOG_LEVEL = getattr(logging, level_upper)

    # 更新所有处理器的级别
    root_logger = logging.getLogger()
    for handler in root_logger.handlers:
        if isinstance(handler, logging.StreamHandler) and not isinstance(handler, logging.FileHandler):
            # 只更新控制台处理器，文件处理器保持 DEBUG
            handler.setLevel(_LOG_LEVEL)

    logger = get_logger(__name__)
    logger.info(f"日志级别已更新为: {level_upper}")


# 自动初始化
setup_logging()
