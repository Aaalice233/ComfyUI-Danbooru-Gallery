"""
Krita插件自动安装器
负责将插件文件复制到Krita的pykrita目录
"""

import os
import sys
import shutil
import time
from pathlib import Path
from typing import Optional
from ..utils.logger import get_logger

# 初始化logger
logger = get_logger(__name__)

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False
    logger.warning("psutil not available, Krita process management will be limited")


class KritaPluginInstaller:
    """Krita插件自动安装器"""

    def __init__(self):
        self.plugin_source_dir = self._get_plugin_source_dir()
        self.pykrita_dir = self._get_krita_pykrita_dir()
        self.source_version = self._get_source_version()

    def _get_source_version(self) -> str:
        """从源码中读取版本号"""
        try:
            plugin_init = self.plugin_source_dir / "open_in_krita" / "__init__.py"
            if plugin_init.exists():
                with open(plugin_init, 'r', encoding='utf-8') as f:
                    content = f.read()
                    import re
                    match = re.search(r'__version__\s*=\s*["\']([^"\']+)["\']', content)
                    if match:
                        return match.group(1)
        except Exception as e:
            logger.error(f"Error reading source version: {e}")
        return "unknown"

    def _get_source_mtime(self) -> float:
        """
        获取源插件目录的最新修改时间

        Returns:
            float: 最新文件的修改时间戳，如果目录不存在返回0.0
        """
        try:
            source_dir = self.plugin_source_dir / "open_in_krita"
            if not source_dir.exists():
                return 0.0

            latest_mtime = 0.0
            for file in source_dir.rglob("*"):
                if file.is_file():
                    mtime = file.stat().st_mtime
                    if mtime > latest_mtime:
                        latest_mtime = mtime
            return latest_mtime
        except Exception as e:
            logger.debug(f"Error getting source mtime: {e}")
            return 0.0

    def _get_installed_mtime(self) -> float:
        """
        获取已安装插件目录的最新修改时间

        Returns:
            float: 最新文件的修改时间戳，如果目录不存在返回0.0
        """
        try:
            if not self.pykrita_dir:
                return 0.0

            installed_dir = self.pykrita_dir / "open_in_krita"
            if not installed_dir.exists():
                return 0.0

            latest_mtime = 0.0
            for file in installed_dir.rglob("*"):
                if file.is_file():
                    mtime = file.stat().st_mtime
                    if mtime > latest_mtime:
                        latest_mtime = mtime
            return latest_mtime
        except Exception as e:
            logger.debug(f"Error getting installed mtime: {e}")
            return 0.0

    def _get_plugin_source_dir(self) -> Path:
        """获取插件源文件目录（krita_files）"""
        # 当前文件位于 py/open_in_krita/plugin_installer.py
        # krita_files 位于项目根目录
        current_file = Path(__file__).resolve()
        project_root = current_file.parent.parent.parent
        source_dir = project_root / "krita_files"

        if not source_dir.exists():
            raise FileNotFoundError(f"Plugin source directory not found: {source_dir}")

        return source_dir

    def _get_krita_pykrita_dir(self) -> Optional[Path]:
        """
        获取Krita的pykrita目录

        Windows: %APPDATA%\\krita\\pykrita
        Linux: ~/.local/share/krita/pykrita
        macOS: ~/Library/Application Support/krita/pykrita
        """
        if sys.platform == "win32":
            # Windows
            appdata = os.getenv('APPDATA')
            if appdata:
                pykrita = Path(appdata) / 'krita' / 'pykrita'
            else:
                logger.warning("Warning: APPDATA environment variable not found")
                return None

        elif sys.platform == "darwin":
            # macOS
            pykrita = Path.home() / 'Library' / 'Application Support' / 'krita' / 'pykrita'

        else:
            # Linux
            pykrita = Path.home() / '.local' / 'share' / 'krita' / 'pykrita'

        return pykrita

    def _get_kritarc_path(self) -> Optional[Path]:
        """
        获取Krita配置文件kritarc的路径

        Windows: %APPDATA%\\krita\\kritarc
        Linux: ~/.config/kritarc
        macOS: ~/Library/Preferences/kritarc
        """
        if sys.platform == "win32":
            appdata = os.getenv('APPDATA')
            if appdata:
                return Path(appdata) / 'krita' / 'kritarc'
            return None
        elif sys.platform == "darwin":
            return Path.home() / 'Library' / 'Preferences' / 'kritarc'
        else:
            return Path.home() / '.config' / 'kritarc'

    def _enable_plugin_in_kritarc(self) -> bool:
        """
        在kritarc配置文件中启用插件

        Returns:
            bool: 成功返回True
        """
        try:
            kritarc_path = self._get_kritarc_path()
            if not kritarc_path:
                logger.warning("Cannot determine kritarc path")
                return False

            # 读取现有配置（如果存在）
            lines = []
            if kritarc_path.exists():
                with open(kritarc_path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()

            # 查找 [python] 部分并设置 enable_open_in_krita=true
            python_section_found = False
            plugin_line_found = False
            new_lines = []
            in_python_section = False

            for line in lines:
                stripped = line.strip()

                # 检查是否进入新的section
                if stripped.startswith('[') and stripped.endswith(']'):
                    # 如果之前在python section但没找到插件配置，现在要离开了，先添加
                    if in_python_section and not plugin_line_found:
                        new_lines.append('enable_open_in_krita=true\n')
                        plugin_line_found = True

                    in_python_section = (stripped.lower() == '[python]')
                    if in_python_section:
                        python_section_found = True

                # 如果在python section中，检查是否有插件配置
                if in_python_section and stripped.lower().startswith('enable_open_in_krita'):
                    # 替换为启用状态
                    new_lines.append('enable_open_in_krita=true\n')
                    plugin_line_found = True
                    continue

                new_lines.append(line)

            # 如果文件末尾还在python section且没找到插件配置
            if in_python_section and not plugin_line_found:
                new_lines.append('enable_open_in_krita=true\n')
                plugin_line_found = True

            # 如果没有找到[python] section，添加一个
            if not python_section_found:
                new_lines.append('\n[python]\n')
                new_lines.append('enable_open_in_krita=true\n')

            # 写回文件
            kritarc_path.parent.mkdir(parents=True, exist_ok=True)
            with open(kritarc_path, 'w', encoding='utf-8') as f:
                f.writelines(new_lines)

            logger.info(f"Updated kritarc: {kritarc_path}")
            return True

        except Exception as e:
            logger.warning(f"Failed to update kritarc: {e}")
            import traceback
            logger.debug(traceback.format_exc())
            return False

    def check_plugin_installed(self) -> bool:
        """
        检查插件是否已安装

        Returns:
            bool: 如果插件已安装返回True
        """
        if not self.pykrita_dir:
            return False

        desktop_file = self.pykrita_dir / "open_in_krita.desktop"
        plugin_dir = self.pykrita_dir / "open_in_krita"

        return desktop_file.exists() and plugin_dir.exists()

    def needs_update(self) -> bool:
        """
        检查插件是否需要更新
        优先使用文件修改时间判断，其次使用版本号

        Returns:
            bool: 如果源码比已安装版本新，返回True
        """
        if not self.check_plugin_installed():
            return True  # 未安装，需要安装

        # 优先比较修改时间
        source_mtime = self._get_source_mtime()
        installed_mtime = self._get_installed_mtime()

        if source_mtime > 0 and installed_mtime > 0:
            if source_mtime > installed_mtime:
                logger.debug(f"Source files are newer (source: {source_mtime}, installed: {installed_mtime})")
                return True
            # 如果已安装版本更新或相同，不需要更新
            logger.debug(f"Installed files are up to date (source: {source_mtime}, installed: {installed_mtime})")
            return False

        # 如果无法获取修改时间，回退到版本号比较
        installed_version = self.get_installed_version()
        if installed_version is None:
            return True  # 无法获取版本，需要重新安装

        if installed_version != self.source_version:
            logger.debug(f"Version mismatch (source: {self.source_version}, installed: {installed_version})")
            return True

        return False

    def get_installed_version(self) -> Optional[str]:
        """
        获取已安装插件的版本号

        Returns:
            str: 版本号，未安装返回None
        """
        if not self.check_plugin_installed():
            return None

        try:
            plugin_init = self.pykrita_dir / "open_in_krita" / "__init__.py"
            if plugin_init.exists():
                with open(plugin_init, 'r', encoding='utf-8') as f:
                    content = f.read()
                    # 查找 __version__ = "x.x.x"
                    import re
                    match = re.search(r'__version__\s*=\s*["\']([^"\']+)["\']', content)
                    if match:
                        return match.group(1)
        except Exception as e:
            logger.error(f"Error reading installed version: {e}")

        return None

    def install_plugin(self, force: bool = False) -> bool:
        """
        安装Krita插件

        Args:
            force: 如果为True，强制覆盖已存在的插件

        Returns:
            bool: 安装成功返回True
        """
        try:
            # 检查pykrita目录
            if not self.pykrita_dir:
                logger.info("Could not determine Krita pykrita directory")
                return False

            # 创建pykrita目录（如果不存在）
            self.pykrita_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"Target directory: {self.pykrita_dir}")

            # 检查是否已安装
            if self.check_plugin_installed() and not force:
                installed_version = self.get_installed_version()
                if installed_version == self.source_version:
                    logger.info(f"Plugin v{self.source_version} already installed, skipping")
                    return True
                else:
                    logger.info(f"Updating plugin from v{installed_version} to v{self.source_version}")

            # 复制.desktop文件
            desktop_source = self.plugin_source_dir / "open_in_krita.desktop"
            desktop_dest = self.pykrita_dir / "open_in_krita.desktop"

            if desktop_source.exists():
                shutil.copy2(desktop_source, desktop_dest)
                logger.info(f"Copied: {desktop_source.name}")
            else:
                logger.info(f"Warning: {desktop_source.name} not found")

            # 复制插件目录
            plugin_source = self.plugin_source_dir / "open_in_krita"
            plugin_dest = self.pykrita_dir / "open_in_krita"

            if plugin_source.exists() and plugin_source.is_dir():
                # 如果目标已存在，先删除
                if plugin_dest.exists():
                    shutil.rmtree(plugin_dest)

                # 复制整个目录
                shutil.copytree(plugin_source, plugin_dest)
                logger.info(f"Copied: {plugin_source.name}/ directory")
            else:
                logger.error(f"Error: Plugin directory not found: {plugin_source}")
                return False

            logger.info(f"Plugin v{self.source_version} installed successfully")

            # 自动在 kritarc 中启用插件
            if self._enable_plugin_in_kritarc():
                logger.info("Plugin auto-enabled in kritarc")
            else:
                logger.info("Please restart Krita and enable the plugin in:")
                logger.info("  Settings → Configure Krita → Python Plugin Manager")

            return True

        except Exception as e:
            logger.error(f"Error installing plugin: {e}")
            import traceback
            logger.debug(traceback.format_exc())
            return False

    def uninstall_plugin(self) -> bool:
        """
        卸载Krita插件

        Returns:
            bool: 卸载成功返回True
        """
        try:
            if not self.check_plugin_installed():
                logger.info("Plugin not installed")
                return True

            # 删除.desktop文件
            desktop_file = self.pykrita_dir / "open_in_krita.desktop"
            if desktop_file.exists():
                desktop_file.unlink()
                logger.info(f"Removed: {desktop_file.name}")

            # 删除插件目录
            plugin_dir = self.pykrita_dir / "open_in_krita"
            if plugin_dir.exists():
                shutil.rmtree(plugin_dir)
                logger.info(f"Removed: {plugin_dir.name}/ directory")

            logger.info("Plugin uninstalled successfully")
            return True

        except Exception as e:
            logger.error(f"Error uninstalling plugin: {e}")
            return False

    def kill_krita_process(self) -> bool:
        """
        杀掉所有Krita进程

        Returns:
            bool: 成功杀掉至少一个进程返回True
        """
        if not HAS_PSUTIL:
            logger.info("psutil not available, cannot kill Krita process")
            return False

        try:
            killed_count = 0
            for proc in psutil.process_iter(['name', 'pid']):
                try:
                    if proc.info['name'] and 'krita' in proc.info['name'].lower():
                        logger.info(f"Killing Krita process: PID={proc.info['pid']}")
                        proc.kill()
                        killed_count += 1
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass

            if killed_count > 0:
                logger.info(f"Killed {killed_count} Krita process(es)")
                # 等待进程真正结束
                time.sleep(1)
                return True
            else:
                logger.info("No Krita process found")
                return False

        except Exception as e:
            logger.error(f"Error killing Krita process: {e}")
            return False

    @staticmethod
    def ensure_plugin_installed() -> bool:
        """
        确保插件已安装（便捷静态方法）

        Returns:
            bool: 成功返回True
        """
        installer = KritaPluginInstaller()
        return installer.install_plugin()


# 测试代码
if __name__ == "__main__":
    installer = KritaPluginInstaller()
    logger.info(f"Plugin source: {installer.plugin_source_dir}")
    logger.info(f"Pykrita directory: {installer.pykrita_dir}")
    logger.info(f"Plugin installed: {installer.check_plugin_installed()}")

    if installer.check_plugin_installed():
        version = installer.get_installed_version()
        logger.info(f"Installed version: {version}")
