"""
Krita进程管理器
负责检测Krita路径、启动Krita进程、管理设置
"""

import os
import sys
import json
import subprocess
from pathlib import Path
from typing import Optional
from ..utils.logger import get_logger

# 初始化logger
logger = get_logger(__name__)


class KritaManager:
    """Krita进程管理器"""

    def __init__(self):
        self.settings_file = self._get_settings_file()
        self.settings = self._load_settings()

    def _get_settings_file(self) -> Path:
        """获取设置文件路径"""
        # 设置文件保存在节点目录下
        current_dir = Path(__file__).parent
        return current_dir / "settings.json"

    def _load_settings(self) -> dict:
        """加载设置"""
        try:
            if self.settings_file.exists():
                with open(self.settings_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"Error loading settings: {e}")

        return {}

    def _save_settings(self):
        """保存设置"""
        try:
            with open(self.settings_file, 'w', encoding='utf-8') as f:
                json.dump(self.settings, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"Error saving settings: {e}")

    def get_krita_path(self) -> Optional[str]:
        """
        获取Krita路径（从设置）

        Returns:
            str: Krita可执行文件路径，未设置返回None
        """
        return self.settings.get('krita_path')

    def set_krita_path(self, path: str) -> bool:
        """
        设置Krita路径

        Args:
            path: Krita可执行文件路径

        Returns:
            bool: 设置成功返回True
        """
        path = str(Path(path).resolve())

        # 验证路径
        if not os.path.exists(path):
            logger.warning(f"Path does not exist: {path}")
            return False

        if not path.lower().endswith('.exe') and sys.platform == 'win32':
            logger.warning(f"Invalid executable: {path}")
            return False

        self.settings['krita_path'] = path
        self._save_settings()
        logger.info(f"Krita path set to: {path}")
        return True


    def launch_krita(self, image_path: Optional[str] = None) -> bool:
        """
        启动Krita（可选打开图像）

        Args:
            image_path: 要打开的图像路径（可选）

        Returns:
            bool: 启动成功返回True
        """
        krita_path = self.get_krita_path()

        if not krita_path:
            logger.info("Krita path not configured. Please set Krita path manually.")
            return False

        try:
            # 构建命令
            if image_path:
                # 打开图像
                cmd = [krita_path, str(image_path)]
                logger.warning(f"Launching Krita with image: {image_path}")
            else:
                # 只启动Krita
                cmd = [krita_path]
                logger.warning(f"Launching Krita")

            # 启动进程（不等待）
            subprocess.Popen(
                cmd,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )

            logger.info("Krita launched successfully")
            return True

        except Exception as e:
            logger.error(f"Error launching Krita: {e}")
            return False

    def is_krita_running(self) -> bool:
        """
        检查Krita是否正在运行

        Returns:
            bool: 运行中返回True
        """
        try:
            if sys.platform == "win32":
                result = subprocess.run(
                    ['tasklist'],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                return 'krita.exe' in result.stdout.lower()
            else:
                result = subprocess.run(
                    ['pgrep', '-x', 'krita'],
                    capture_output=True,
                    timeout=5
                )
                return result.returncode == 0
        except Exception as e:
            logger.error(f"Error checking if Krita is running: {e}")
            return False


# 全局单例
_manager = None

def get_manager() -> KritaManager:
    """获取全局Krita管理器实例"""
    global _manager
    if _manager is None:
        _manager = KritaManager()
    return _manager
