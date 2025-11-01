"""
日志工具 - 同时输出到控制台和文件
"""

import os
import sys
import tempfile
from pathlib import Path
from datetime import datetime


class KritaLogger:
    """Krita插件日志记录器 - 具有fallback机制"""

    def __init__(self, name="OpenInKrita"):
        self.name = name
        self.log_file = None
        self.file_logging_enabled = False
        self._setup_log_file()

    def _setup_log_file(self):
        """设置日志文件 - 增强错误处理"""
        try:
            # 🔥 动态获取用户目录，确保跨用户兼容性
            # Windows: C:\Users\<用户名>\AppData\Local\Temp\open_in_krita
            # Linux/Mac: /tmp/open_in_krita 或 ~/tmp/open_in_krita
            log_dir = Path(tempfile.gettempdir()) / "open_in_krita"

            # 确保目录存在
            try:
                log_dir.mkdir(parents=True, exist_ok=True)
                print(f"[{self.name}] 日志目录: {log_dir}")
            except Exception as e:
                print(f"[{self.name}] ✗ 创建日志目录失败: {e}")
                return

            self.log_file = log_dir / "krita_plugin.log"

            # 测试文件是否可写（使用'w'模式，每次启动清空旧日志）
            try:
                with open(self.log_file, 'w', encoding='utf-8') as f:
                    f.write(f"{'='*60}\n")
                    f.write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Krita插件启动\n")
                    f.write(f"Python版本: {sys.version}\n")
                    f.write(f"日志文件: {self.log_file}\n")
                    f.write(f"{'='*60}\n")
                    f.flush()

                self.file_logging_enabled = True
                print(f"[{self.name}] ✓ 日志文件创建成功: {self.log_file}")

            except Exception as e:
                print(f"[{self.name}] ✗ 写入日志文件失败: {e}")
                print(f"[{self.name}] 日志将只输出到控制台")
                self.log_file = None

        except Exception as e:
            print(f"[{self.name}] ✗ 日志系统初始化失败: {e}")
            print(f"[{self.name}] 将使用纯控制台日志模式")
            self.log_file = None

    def log(self, message, level="INFO"):
        """
        记录日志 - 安全的fallback机制

        Args:
            message: 日志消息
            level: 日志级别 (INFO, WARNING, ERROR)
        """
        timestamp = datetime.now().strftime('%H:%M:%S')
        formatted_msg = f"[{self.name}] {message}"

        # 总是输出到控制台（最可靠）
        try:
            print(formatted_msg)
        except:
            pass  # 即使print失败也不崩溃

        # 尝试输出到文件
        if self.file_logging_enabled and self.log_file:
            try:
                with open(self.log_file, 'a', encoding='utf-8') as f:
                    f.write(f"[{timestamp}] [{level}] {message}\n")
                    f.flush()  # 立即写入
            except Exception as e:
                # 文件写入失败，禁用文件日志
                self.file_logging_enabled = False
                try:
                    print(f"[{self.name}] 警告: 写入日志文件失败，已禁用文件日志: {e}")
                except:
                    pass

    def info(self, message):
        """记录INFO级别日志"""
        try:
            self.log(message, "INFO")
        except:
            pass

    def warning(self, message):
        """记录WARNING级别日志"""
        try:
            self.log(message, "WARNING")
        except:
            pass

    def error(self, message):
        """记录ERROR级别日志"""
        try:
            self.log(message, "ERROR")
        except:
            pass

    def get_log_path(self):
        """获取日志文件路径"""
        return str(self.log_file) if self.log_file else "无（仅控制台模式）"


# 全局日志记录器实例
_logger = None

def get_logger():
    """获取全局日志记录器 - 保证永不失败"""
    global _logger
    if _logger is None:
        try:
            _logger = KritaLogger()
        except Exception as e:
            print(f"[OpenInKrita] 严重错误：无法创建日志记录器: {e}")
            # 返回一个简化的fallback logger
            _logger = _create_fallback_logger()
    return _logger


def _create_fallback_logger():
    """创建一个只使用print的极简logger"""
    class FallbackLogger:
        def __init__(self):
            self.name = "OpenInKrita"
            print(f"[{self.name}] 警告：使用fallback日志模式")

        def info(self, msg):
            try:
                print(f"[{self.name}] {msg}")
            except:
                pass

        def warning(self, msg):
            try:
                print(f"[{self.name}] WARNING: {msg}")
            except:
                pass

        def error(self, msg):
            try:
                print(f"[{self.name}] ERROR: {msg}")
            except:
                pass

        def get_log_path(self):
            return "无（fallback模式）"

    return FallbackLogger()
