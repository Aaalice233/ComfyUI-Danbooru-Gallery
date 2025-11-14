"""
ComfyUI-Danbooru-Gallery Python modules
Contains all node implementations and utility functions
"""

__version__ = "1.0.0"

# Compatibility shim for pytest and other tools that may try to import py.path.local
# This prevents conflicts with the historical 'py' package
try:
    from pathlib import Path
    from types import SimpleNamespace
    path = SimpleNamespace(local=Path)
    __all__ = ["path"]
except ImportError:
    pass

# Initialize metadata collector（独立初始化，支持链式调用）
try:
    from .metadata_collector import MetadataHook

    print("[Danbooru Gallery] Initializing metadata collector...")
    MetadataHook.install()

except Exception as e:
    print(f"[Danbooru Gallery] Warning: Metadata collector initialization failed: {e}")
    import traceback
    traceback.print_exc()

# 注册配置管理API
try:
    from .utils.config_api import setup_config_api
    
    print("[Danbooru Gallery] Registering config management API...")
    setup_config_api()
    
except Exception as e:
    print(f"[Danbooru Gallery] Warning: Config API registration failed: {e}")
    import traceback
    traceback.print_exc()
