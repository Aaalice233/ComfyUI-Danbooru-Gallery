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

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False
    print("[OpenInKrita] Warning: psutil not available, Krita process management will be limited")


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
            print(f"[OpenInKrita] Error reading source version: {e}")
        return "unknown"

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
                print("[OpenInKrita] Warning: APPDATA environment variable not found")
                return None

        elif sys.platform == "darwin":
            # macOS
            pykrita = Path.home() / 'Library' / 'Application Support' / 'krita' / 'pykrita'

        else:
            # Linux
            pykrita = Path.home() / '.local' / 'share' / 'krita' / 'pykrita'

        return pykrita

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

        Returns:
            bool: 如果源码版本比已安装版本新，返回True
        """
        if not self.check_plugin_installed():
            return True  # 未安装，需要安装

        installed_version = self.get_installed_version()
        if installed_version is None:
            return True  # 无法获取版本，需要重新安装

        return installed_version != self.source_version

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
            print(f"[OpenInKrita] Error reading installed version: {e}")

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
                print("[OpenInKrita] Could not determine Krita pykrita directory")
                return False

            # 创建pykrita目录（如果不存在）
            self.pykrita_dir.mkdir(parents=True, exist_ok=True)
            print(f"[OpenInKrita] Target directory: {self.pykrita_dir}")

            # 检查是否已安装
            if self.check_plugin_installed() and not force:
                installed_version = self.get_installed_version()
                if installed_version == self.source_version:
                    print(f"[OpenInKrita] Plugin v{self.source_version} already installed, skipping")
                    return True
                else:
                    print(f"[OpenInKrita] Updating plugin from v{installed_version} to v{self.source_version}")

            # 复制.desktop文件
            desktop_source = self.plugin_source_dir / "open_in_krita.desktop"
            desktop_dest = self.pykrita_dir / "open_in_krita.desktop"

            if desktop_source.exists():
                shutil.copy2(desktop_source, desktop_dest)
                print(f"[OpenInKrita] Copied: {desktop_source.name}")
            else:
                print(f"[OpenInKrita] Warning: {desktop_source.name} not found")

            # 复制插件目录
            plugin_source = self.plugin_source_dir / "open_in_krita"
            plugin_dest = self.pykrita_dir / "open_in_krita"

            if plugin_source.exists() and plugin_source.is_dir():
                # 如果目标已存在，先删除
                if plugin_dest.exists():
                    shutil.rmtree(plugin_dest)

                # 复制整个目录
                shutil.copytree(plugin_source, plugin_dest)
                print(f"[OpenInKrita] Copied: {plugin_source.name}/ directory")
            else:
                print(f"[OpenInKrita] Error: Plugin directory not found: {plugin_source}")
                return False

            print(f"[OpenInKrita] Plugin v{self.source_version} installed successfully")
            print("[OpenInKrita] Please restart Krita and enable the plugin in:")
            print("[OpenInKrita]   Settings → Configure Krita → Python Plugin Manager")

            return True

        except Exception as e:
            print(f"[OpenInKrita] Error installing plugin: {e}")
            import traceback
            traceback.print_exc()
            return False

    def uninstall_plugin(self) -> bool:
        """
        卸载Krita插件

        Returns:
            bool: 卸载成功返回True
        """
        try:
            if not self.check_plugin_installed():
                print("[OpenInKrita] Plugin not installed")
                return True

            # 删除.desktop文件
            desktop_file = self.pykrita_dir / "open_in_krita.desktop"
            if desktop_file.exists():
                desktop_file.unlink()
                print(f"[OpenInKrita] Removed: {desktop_file.name}")

            # 删除插件目录
            plugin_dir = self.pykrita_dir / "open_in_krita"
            if plugin_dir.exists():
                shutil.rmtree(plugin_dir)
                print(f"[OpenInKrita] Removed: {plugin_dir.name}/ directory")

            print("[OpenInKrita] Plugin uninstalled successfully")
            return True

        except Exception as e:
            print(f"[OpenInKrita] Error uninstalling plugin: {e}")
            return False

    def kill_krita_process(self) -> bool:
        """
        杀掉所有Krita进程

        Returns:
            bool: 成功杀掉至少一个进程返回True
        """
        if not HAS_PSUTIL:
            print("[OpenInKrita] psutil not available, cannot kill Krita process")
            return False

        try:
            killed_count = 0
            for proc in psutil.process_iter(['name', 'pid']):
                try:
                    if proc.info['name'] and 'krita' in proc.info['name'].lower():
                        print(f"[OpenInKrita] Killing Krita process: PID={proc.info['pid']}")
                        proc.kill()
                        killed_count += 1
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass

            if killed_count > 0:
                print(f"[OpenInKrita] Killed {killed_count} Krita process(es)")
                # 等待进程真正结束
                time.sleep(1)
                return True
            else:
                print("[OpenInKrita] No Krita process found")
                return False

        except Exception as e:
            print(f"[OpenInKrita] Error killing Krita process: {e}")
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
    print(f"Plugin source: {installer.plugin_source_dir}")
    print(f"Pykrita directory: {installer.pykrita_dir}")
    print(f"Plugin installed: {installer.check_plugin_installed()}")

    if installer.check_plugin_installed():
        version = installer.get_installed_version()
        print(f"Installed version: {version}")
