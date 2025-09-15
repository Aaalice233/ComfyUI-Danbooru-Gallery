#!/usr/bin/env python3
"""
ComfyUI-Danbooru-Gallery 安装脚本
自动安装所需的 Python 依赖包
支持多种安装选项和错误恢复
"""

import os
import sys
import subprocess
import platform
import json
from pathlib import Path

class DanbooruGalleryInstaller:
    def __init__(self):
        self.project_root = Path(__file__).parent
        self.requirements_file = self.project_root / "requirements.txt"
        self.pyproject_file = self.project_root / "pyproject.toml"

    def check_python_version(self):
        """检查Python版本"""
        print(f"Python版本: {sys.version}")
        if sys.version_info < (3, 8):
            print("⚠️  警告: 推荐使用Python 3.8或更高版本")
            return False
        return True

    def check_system_info(self):
        """显示系统信息"""
        print("\n📊 系统信息:")
        print(f"   操作系统: {platform.system()} {platform.release()}")
        print(f"   架构: {platform.machine()}")
        print(f"   Python路径: {sys.executable}")
        print()

    def check_existing_installation(self):
        """检查是否已经安装了相关包"""
        print("🔍 检查现有安装...")

        try:
            import pybooru
            print(f"   ✅ pybooru 已安装 (版本: {pybooru.__version__})")
        except ImportError:
            print("   ❌ pybooru 未安装")

        try:
            import aiohttp
            print(f"   ✅ aiohttp 已安装 (版本: {aiohttp.__version__})")
        except ImportError:
            print("   ❌ aiohttp 未安装")

        try:
            import PIL
            print(f"   ✅ Pillow 已安装 (版本: {PIL.__version__})")
        except ImportError:
            print("   ❌ Pillow 未安装")

        try:
            import torch
            print(f"   ✅ PyTorch 已安装 (版本: {torch.__version__})")
        except ImportError:
            print("   ❌ PyTorch 未安装")

        print()

    def install_dependencies(self, upgrade=False, user_install=False):
        """安装依赖包"""
        print("📦 正在安装 ComfyUI-Danbooru-Gallery 的依赖包...")

        if not self.requirements_file.exists():
            print("❌ 错误：找不到 requirements.txt 文件")
            return False

        try:
            # 构建pip命令
            cmd = [sys.executable, "-m", "pip", "install"]

            if upgrade:
                cmd.append("--upgrade")
            if user_install:
                cmd.append("--user")

            cmd.extend(["-r", str(self.requirements_file)])

            print(f"执行命令: {' '.join(cmd)}")

            # 使用pip安装依赖
            result = subprocess.run(cmd, capture_output=True, text=True, cwd=self.project_root)

            if result.returncode == 0:
                print("✅ 依赖包安装成功！")
                self.verify_installation()
                print("\n🎉 安装完成！现在可以重启 ComfyUI 来加载插件。")
                return True
            else:
                print("❌ 安装失败：")
                print(result.stderr)
                self.troubleshoot_installation(result.stderr)
                return False

        except Exception as e:
            print(f"❌ 安装过程中出现错误：{e}")
            return False

    def verify_installation(self):
        """验证安装"""
        print("\n🔍 验证安装...")

        success_count = 0
        total_count = 0

        # 检查核心依赖
        core_deps = ['pybooru', 'aiohttp', 'PIL', 'torch', 'numpy']
        for dep in core_deps:
            total_count += 1
            try:
                if dep == 'PIL':
                    import PIL
                    version = PIL.__version__
                else:
                    module = __import__(dep)
                    version = getattr(module, '__version__', 'unknown')
                print(f"   ✅ {dep} (v{version})")
                success_count += 1
            except ImportError:
                print(f"   ❌ {dep} 导入失败")

        print(f"\n验证结果: {success_count}/{total_count} 个核心依赖安装成功")

        if success_count < total_count:
            print("⚠️  部分依赖可能有问题，建议检查pip安装日志")
        else:
            print("✅ 所有核心依赖验证通过")

    def troubleshoot_installation(self, error_output):
        """提供安装故障排除建议"""
        print("\n🔧 故障排除建议:")

        if "No module named" in error_output:
            print("   • 尝试使用 --user 标志安装: python install.py --user")
        elif "Permission denied" in error_output or "Access denied" in error_output:
            print("   • 使用管理员权限运行或使用 --user 标志")
            print("   • 在虚拟环境中安装")
        elif "pip" in error_output.lower():
            print("   • 升级pip: python -m pip install --upgrade pip")
        elif "torch" in error_output.lower():
            print("   • PyTorch安装失败，尝试手动安装:")
            print("     pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118")
        else:
            print("   • 检查网络连接")
            print("   • 尝试使用国内镜像源:")
            print("     pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple")

    def create_config_files(self):
        """创建配置文件"""
        config_dir = self.project_root / "config"
        config_dir.mkdir(exist_ok=True)

        # 创建默认配置文件
        default_config = {
            "danbooru_username": "",
            "danbooru_api_key": "",
            "debug_mode": False,
            "cache_enabled": True,
            "max_cache_age": 3600,
            "default_page_size": 20
        }

        config_file = self.project_root / "danbooru_config.json"
        if not config_file.exists():
            with open(config_file, 'w', encoding='utf-8') as f:
                json.dump(default_config, f, indent=4, ensure_ascii=False)
            print("📝 已创建默认配置文件: danbooru_config.json")

    def show_usage_info(self):
        """显示使用说明"""
        print("\n📖 使用说明:")
        print("   1. 确保ComfyUI正在运行")
        print("   2. 在ComfyUI界面中找到 Danbooru Gallery 节点")
        print("   3. 双击节点打开画廊界面")
        print("   4. 在设置中配置Danbooru API密钥（可选）")
        print("\n🔧 调试功能:")
        print("   • 打开画廊后点击右上角的 'Debug OFF' 按钮启用调试模式")
        print("   • 查看浏览器控制台和调试面板获取详细日志")

def main():
    installer = DanbooruGalleryInstaller()

    print("🚀 ComfyUI-Danbooru-Gallery 安装程序")
    print("=" * 50)

    # 检查Python版本
    installer.check_python_version()

    # 显示系统信息
    installer.check_system_info()

    # 检查现有安装
    installer.check_existing_installation()

    # 解析命令行参数
    upgrade = "--upgrade" in sys.argv
    user_install = "--user" in sys.argv

    if upgrade:
        print("🔄 升级模式: 将升级所有已安装的包")

    if user_install:
        print("👤 用户安装模式: 将安装到用户目录")

    # 安装依赖
    success = installer.install_dependencies(upgrade=upgrade, user_install=user_install)

    if success:
        # 创建配置文件
        installer.create_config_files()

        # 显示使用说明
        installer.show_usage_info()

    return success

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  安装被用户中断")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ 安装程序出现意外错误: {e}")
        sys.exit(1)