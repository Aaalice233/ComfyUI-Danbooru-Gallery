"""
快速组导航器 - Python节点注册
Quick Group Navigation - Python Node Registration

@author 哈雷酱 (大小姐工程师)
@version 1.0.0

说明：
    本模块主要功能由前端JavaScript实现。
    Python端仅提供基础的节点注册，确保ComfyUI能够正确加载扩展。
"""

# 节点类映射（当前为空，因为主要功能在JS端）
NODE_CLASS_MAPPINGS = {}

# 节点显示名称映射
NODE_DISPLAY_NAME_MAPPINGS = {}

# 扩展元数据
__version__ = "1.0.0"
__author__ = "哈雷酱"
__description__ = "快速组导航器 - 通过悬浮球和快捷键快速跳转到工作流中的组"

print(f"[QGN] 快速组导航器 v{__version__} 已加载（JavaScript扩展）")
