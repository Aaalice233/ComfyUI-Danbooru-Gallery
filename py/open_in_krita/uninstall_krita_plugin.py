"""
卸载Krita插件的简单脚本
用于测试自动安装功能
"""

import os
import sys
import shutil
from pathlib import Path

def get_krita_pykrita_dir():
    """获取Krita的pykrita目录"""
    if sys.platform == "win32":
        appdata = os.getenv('APPDATA')
        if appdata:
            return Path(appdata) / 'krita' / 'pykrita'
    elif sys.platform == "darwin":
        return Path.home() / 'Library' / 'Application Support' / 'krita' / 'pykrita'
    else:
        return Path.home() / '.local' / 'share' / 'krita' / 'pykrita'
    return None

def check_plugin_installed(pykrita_dir):
    """检查插件是否已安装"""
    if not pykrita_dir or not pykrita_dir.exists():
        return False
    desktop_file = pykrita_dir / "open_in_krita.desktop"
    plugin_dir = pykrita_dir / "open_in_krita"
    return desktop_file.exists() and plugin_dir.exists()

def get_installed_version(pykrita_dir):
    """获取已安装插件的版本号"""
    try:
        plugin_init = pykrita_dir / "open_in_krita" / "__init__.py"
        if plugin_init.exists():
            with open(plugin_init, 'r', encoding='utf-8') as f:
                content = f.read()
                import re
                match = re.search(r'__version__\s*=\s*["\']([^"\']+)["\']', content)
                if match:
                    return match.group(1)
    except Exception as e:
        print(f"读取版本号失败: {e}")
    return None

def uninstall_plugin(pykrita_dir):
    """卸载Krita插件"""
    try:
        # 删除.desktop文件
        desktop_file = pykrita_dir / "open_in_krita.desktop"
        if desktop_file.exists():
            desktop_file.unlink()
            print(f"✓ 已删除: {desktop_file.name}")
        
        # 删除插件目录
        plugin_dir = pykrita_dir / "open_in_krita"
        if plugin_dir.exists():
            shutil.rmtree(plugin_dir)
            print(f"✓ 已删除: {plugin_dir.name}/ 目录")
        
        return True
    except Exception as e:
        print(f"✗ 卸载失败: {e}")
        return False

def main():
    print("=" * 60)
    print("Krita插件卸载工具")
    print("=" * 60)
    
    pykrita_dir = get_krita_pykrita_dir()
    
    if not pykrita_dir:
        print("\n✗ 无法确定Krita pykrita目录")
        return 1
    
    print(f"\nKrita pykrita目录: {pykrita_dir}")
    print(f"插件已安装: {check_plugin_installed(pykrita_dir)}")
    
    if check_plugin_installed(pykrita_dir):
        installed_version = get_installed_version(pykrita_dir)
        if installed_version:
            print(f"已安装版本: {installed_version}")
        
        print("\n开始卸载插件...")
        success = uninstall_plugin(pykrita_dir)
        
        if success:
            print("\n✓ 插件卸载成功！")
            print("\n注意事项:")
            print("1. 如果Krita正在运行，请重启Krita")
            print("2. 下次执行Open In Krita节点时，会自动重新安装插件")
            print("3. 这样可以测试自动安装功能是否正常工作")
            print("\n卸载的文件位置:")
            print(f"  - {pykrita_dir / 'open_in_krita.desktop'}")
            print(f"  - {pykrita_dir / 'open_in_krita'}/")
        else:
            print("\n✗ 插件卸载失败")
            return 1
    else:
        print("\n插件未安装，无需卸载")
    
    print("\n" + "=" * 60)
    return 0

if __name__ == "__main__":
    sys.exit(main())
