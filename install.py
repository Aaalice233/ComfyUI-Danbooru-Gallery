#!/usr/bin/env python3
"""
ComfyUI-Danbooru-Gallery 安装脚本
Installation script for ComfyUI-Danbooru-Gallery
"""

import os
import sys
import subprocess
import importlib.util

# 获取当前脚本目录
SCRIPT_DIR = os.path.dirname(os.path.realpath(__file__))
REQUIREMENTS_FILE = os.path.join(SCRIPT_DIR, "requirements.txt")

# 依赖列表 - 与requirements.txt保持同步
DEPENDENCIES = [
    "requests>=2.28.0",
    "aiohttp>=3.8.0", 
    "Pillow>=9.0.0",
    "torch>=1.12.0",
    "numpy>=1.21.0"
]

def check_python_version():
    """检查Python版本"""
    if sys.version_info < (3, 8):
        print("❌ Python 3.8+ 是必需的")
        print("❌ Python 3.8+ is required")
        sys.exit(1)
    print(f"✅ Python版本: {sys.version}")

def is_package_installed(package_name):
    """检查包是否已安装"""
    # 处理版本号
    if ">=" in package_name:
        package_name = package_name.split(">=")[0]
    
    spec = importlib.util.find_spec(package_name)
    return spec is not None

def install_package(package):
    """安装单个包"""
    try:
        # 尝试使用ComfyUI的launch模块
        try:
            import launch
            if hasattr(launch, 'run_pip'):
                print(f"📦 使用ComfyUI launch安装: {package}")
                launch.run_pip(f"install {package}", f"{package} for ComfyUI-Danbooru-Gallery")
                return True
        except ImportError:
            pass
        
        # 回退到标准pip安装
        print(f"📦 使用pip安装: {package}")
        result = subprocess.run([
            sys.executable, "-m", "pip", "install", package
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"✅ 成功安装: {package}")
            return True
        else:
            print(f"❌ 安装失败: {package}")
            print(f"错误信息: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ 安装 {package} 时发生异常: {e}")
        return False

def install_from_requirements():
    """从requirements.txt安装依赖"""
    if not os.path.exists(REQUIREMENTS_FILE):
        print(f"⚠️  requirements.txt 文件不存在: {REQUIREMENTS_FILE}")
        return False
    
    print(f"📄 从 requirements.txt 安装依赖...")
    
    try:
        with open(REQUIREMENTS_FILE, 'r', encoding='utf-8') as f:
            packages = [line.strip() for line in f if line.strip() and not line.startswith('#')]
        
        failed_packages = []
        for package in packages:
            if not install_package(package):
                failed_packages.append(package)
        
        if failed_packages:
            print(f"❌ 以下包安装失败: {', '.join(failed_packages)}")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ 读取 requirements.txt 时发生错误: {e}")
        return False

def install_dependencies():
    """安装所有依赖"""
    print("🔍 检查并安装依赖...")
    
    missing_packages = []
    for dep in DEPENDENCIES:
        package_name = dep.split(">=")[0]
        if not is_package_installed(package_name):
            missing_packages.append(dep)
        else:
            print(f"✅ 已安装: {package_name}")
    
    if not missing_packages:
        print("🎉 所有依赖都已安装!")
        return True
    
    print(f"📥 需要安装 {len(missing_packages)} 个依赖包...")
    
    failed_packages = []
    for package in missing_packages:
        if not install_package(package):
            failed_packages.append(package)
    
    if failed_packages:
        print(f"❌ 以下包安装失败: {', '.join(failed_packages)}")
        print("💡 请尝试手动安装:")
        for package in failed_packages:
            print(f"   pip install {package}")
        return False
    
    print("🎉 所有依赖安装完成!")
    return True

def verify_installation():
    """验证安装"""
    print("🔍 验证安装...")
    
    missing = []
    for dep in DEPENDENCIES:
        package_name = dep.split(">=")[0]
        if not is_package_installed(package_name):
            missing.append(package_name)
    
    if missing:
        print(f"❌ 以下包未正确安装: {', '.join(missing)}")
        return False
    
    print("✅ 安装验证成功!")
    return True

def main():
    """主函数"""
    print("=" * 60)
    print("🚀 ComfyUI-Danbooru-Gallery 安装脚本")
    print("🚀 ComfyUI-Danbooru-Gallery Installation Script")
    print("=" * 60)
    
    # 检查Python版本
    check_python_version()
    
    # 安装依赖
    success = install_dependencies()
    
    if success:
        # 验证安装
        success = verify_installation()
    
    print("=" * 60)
    if success:
        print("🎉 安装完成!")
        print("🎉 Installation completed successfully!")
        print("请重启ComfyUI以使用插件")
        print("Please restart ComfyUI to use the plugin")
    else:
        print("❌ 安装过程中出现错误")
        print("❌ Errors occurred during installation")
        print("请检查上面的错误信息并手动安装缺失的依赖")
        print("Please check the error messages above and manually install missing dependencies")
        sys.exit(1)
    
    print("=" * 60)

if __name__ == "__main__":
    main()