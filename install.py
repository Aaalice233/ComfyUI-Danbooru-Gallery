import subprocess
import sys
import os

def install():
    """安装 ComfyUI-Danbooru-Gallery 依赖"""
    
    # 获取当前脚本目录
    script_dir = os.path.dirname(os.path.realpath(__file__))
    requirements_file = os.path.join(script_dir, "requirements.txt")
    
    print("Installing ComfyUI-Danbooru-Gallery dependencies...")
    
    try:
        # 尝试使用 ComfyUI 的 launch 模块
        try:
            import launch
            if hasattr(launch, 'run_pip'):
                print("Using ComfyUI launch module...")
                launch.run_pip(f"install -r {requirements_file}", "ComfyUI-Danbooru-Gallery requirements")
                print("Dependencies installed successfully!")
                return
        except ImportError:
            pass
        
        # 回退到标准 pip 安装
        print("Using standard pip installation...")
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", "-r", requirements_file
        ])
        print("Dependencies installed successfully!")
        
    except Exception as e:
        print(f"Installation failed: {e}")
        print("Please try manual installation:")
        print(f"pip install -r {requirements_file}")
        return False
    
    return True

if __name__ == "__main__":
    install()