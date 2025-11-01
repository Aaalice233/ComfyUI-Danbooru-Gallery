"""
Open In Krita - ComfyUI Bridge Plugin
与ComfyUI进行图像和选区交互的Krita插件
"""

__version__ = "1.0.13"  # 新增：Krita路径未配置时显示友好的设置引导对话框，提供安装引导和路径设置选项

import sys
import tempfile
from pathlib import Path
from datetime import datetime

# 创建启动标记文件（无论如何都要创建）
def _create_startup_marker():
    """创建启动标记文件 - 用于诊断"""
    try:
        marker_dir = Path(tempfile.gettempdir()) / "open_in_krita"
        marker_dir.mkdir(parents=True, exist_ok=True)
        marker_file = marker_dir / "_plugin_loaded.txt"

        with open(marker_file, 'w', encoding='utf-8') as f:
            f.write(f"插件版本: {__version__}\n")
            f.write(f"加载时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"Python版本: {sys.version}\n")
            f.write(f"Python路径: {sys.executable}\n")
            f.write(f"标记文件路径: {marker_file}\n")
            f.write("="*60 + "\n")

        print(f"[OpenInKrita] ✓ 启动标记文件已创建: {marker_file}")
        return True
    except Exception as e:
        print(f"[OpenInKrita] ✗ 创建启动标记失败: {e}")
        return False

# 首先创建标记文件
_create_startup_marker()

try:
    print(f"[OpenInKrita] 开始加载插件 v{__version__}...")

    from krita import Krita
    print("[OpenInKrita] ✓ Krita模块导入成功")

    from .extension import OpenInKritaExtension
    print("[OpenInKrita] ✓ Extension模块导入成功")

    from .logger import get_logger
    print("[OpenInKrita] ✓ Logger模块导入成功")

    # 获取日志记录器
    logger = get_logger()
    logger.info(f"开始加载插件 v{__version__}...")

    # 注册扩展到Krita
    try:
        krita_instance = Krita.instance()
        if krita_instance:
            extension = OpenInKritaExtension(krita_instance)
            krita_instance.addExtension(extension)
            logger.info(f"✓✓✓ 插件 v{__version__} 加载成功！")
            logger.info(f"✓ 日志文件位置: {logger.get_log_path()}")
            print(f"[OpenInKrita] ✓✓✓ 插件加载成功！日志: {logger.get_log_path()}")
        else:
            logger.error("✗ 无法获取Krita实例")
            print("[OpenInKrita] ✗ 无法获取Krita实例")
    except Exception as e:
        logger.error(f"✗✗✗ 注册扩展失败: {e}")
        print(f"[OpenInKrita] ✗✗✗ 注册扩展失败: {e}")
        import traceback
        traceback.print_exc()
        raise

except Exception as e:
    # 如果logger未初始化，使用print
    print(f"[OpenInKrita] ✗✗✗ 插件加载失败: {e}")
    import traceback
    traceback.print_exc()

    # 尝试将错误写入标记文件
    try:
        marker_dir = Path(tempfile.gettempdir()) / "open_in_krita"
        error_file = marker_dir / "_plugin_error.txt"
        with open(error_file, 'w', encoding='utf-8') as f:
            f.write(f"插件加载失败\n")
            f.write(f"时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"错误: {str(e)}\n")
            f.write("="*60 + "\n")
            traceback.print_exc(file=f)
        print(f"[OpenInKrita] 错误详情已写入: {error_file}")
    except:
        pass

    raise
