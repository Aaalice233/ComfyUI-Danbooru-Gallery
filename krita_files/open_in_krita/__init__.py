"""
Open In Krita - ComfyUI Bridge Plugin
与ComfyUI进行图像和选区交互的Krita插件
"""

__version__ = "1.0.0"

from krita import Krita
from .extension import OpenInKritaExtension

# 注册扩展到Krita
Krita.instance().addExtension(OpenInKritaExtension(Krita.instance()))

print(f"[OpenInKrita] Plugin v{__version__} loaded successfully")
