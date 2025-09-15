#!/usr/bin/env python3
"""
ComfyUI-Danbooru-Gallery 安装脚本
自动安装所需的 Python 依赖包
"""

import os
import sys
import subprocess

def install_dependencies():
    """安装依赖包"""
    print("正在安装 ComfyUI-Danbooru-Gallery 的依赖包...")

    # 检查是否存在 requirements.txt
    requirements_file = os.path.join(os.path.dirname(__file__), "requirements.txt")
    if not os.path.exists(requirements_file):
        print("错误：找不到 requirements.txt 文件")
        return False

    try:
        # 使用 pip 安装依赖
        result = subprocess.run([
            sys.executable, "-m", "pip", "install", "-r", requirements_file
        ], capture_output=True, text=True)

        if result.returncode == 0:
            print("依赖包安装成功！")
            print("现在可以重启 ComfyUI 来加载插件。")
            return True
        else:
            print("安装失败：")
            print(result.stderr)
            return False

    except Exception as e:
        print(f"安装过程中出现错误：{e}")
        return False

if __name__ == "__main__":
    success = install_dependencies()
    sys.exit(0 if success else 1)