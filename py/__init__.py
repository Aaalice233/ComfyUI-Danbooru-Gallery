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
