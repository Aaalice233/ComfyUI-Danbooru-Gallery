# ComfyUI __init__.py 文件规范

基于ComfyUI官方文档的完整指南

## 概述

`__init__.py` 文件是ComfyUI自定义节点的核心入口文件，负责节点注册、映射配置和前端资源管理。本文档基于官方文档，提供完整的规范和最佳实践。

## 1. 基本结构要求

### 1.1 最简结构（官方推荐）

```python
# 单节点项目 - 最简结构
from .your_node_file import YourCustomNode

NODE_CLASS_MAPPINGS = {
    "Your Custom Node": YourCustomNode
}

__all__ = ["NODE_CLASS_MAPPINGS"]
```

### 1.2 标准结构（多节点项目）

```python
"""
ComfyUI插件标准入口文件
遵循官方文档规范
"""

# 导入各个模块
from .module1 import NODE_CLASS_MAPPINGS as module1_mappings
from .module1 import NODE_DISPLAY_NAME_MAPPINGS as module1_display_mappings
from .module2 import NODE_CLASS_MAPPINGS as module2_mappings
from .module2 import NODE_DISPLAY_NAME_MAPPINGS as module2_display_mappings
from .standalone_node import StandaloneNode

# 合并所有节点映射
NODE_CLASS_MAPPINGS = {
    "Standalone Node": StandaloneNode,
    **module1_mappings,
    **module2_mappings
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "Standalone Node": "独立节点",
    **module1_display_mappings,
    **module2_display_mappings
}

# 前端资源目录（可选）
WEB_DIRECTORY = "./web"

# 导出列表
__all__ = [
    'NODE_CLASS_MAPPINGS',
    'NODE_DISPLAY_NAME_MAPPINGS',
    'WEB_DIRECTORY'
]
```

## 2. 必需的全局变量

### 2.1 NODE_CLASS_MAPPINGS

**作用**：注册节点类到ComfyUI系统
**格式**：字典，键为节点名称，值为节点类

```python
NODE_CLASS_MAPPINGS = {
    "Node Display Name": NodeClassName,
    "Another Node": AnotherNodeClass
}
```

**要求**：
- 键名必须是字符串，在ComfyUI中显示
- 值必须是节点类对象
- 节点名称必须唯一
- 类名必须与实际定义的类一致

### 2.2 NODE_DISPLAY_NAME_MAPPINGS（可选但推荐）

**作用**：提供更友好的显示名称
**格式**：字典，键为映射键，值为显示名称

```python
NODE_DISPLAY_NAME_MAPPINGS = {
    "Node Display Name": "更友好的显示名称",
    "Another Node": "另一个节点"
}
```

### 2.3 WEB_DIRECTORY（可选）

**作用**：指定前端JavaScript文件目录
**格式**：相对路径字符串

```python
WEB_DIRECTORY = "./web"
# 或
WEB_DIRECTORY = "./js"
```

### 2.4 __all__（推荐）

**作用**：指定导出的变量
**格式**：字符串列表

```python
__all__ = [
    'NODE_CLASS_MAPPINGS',
    'NODE_DISPLAY_NAME_MAPPINGS',
    'WEB_DIRECTORY'
]
```

## 3. 导入规范

### 3.1 推荐的导入方式

```python
# 方式1：直接导入节点类
from .simple_node import SimpleNode

# 方式2：导入模块映射
from .complex_module import NODE_CLASS_MAPPINGS as complex_mappings
from .complex_module import NODE_DISPLAY_NAME_MAPPINGS as complex_display_mappings

# 方式3：带错误处理的导入
try:
    from .optional_module import OptionalNode
    optional_mappings = {"Optional Node": OptionalNode}
except ImportError as e:
    print(f"警告：无法导入可选模块: {e}")
    optional_mappings = {}
```

### 3.2 避免的导入方式

```python
# ❌ 避免复杂的相对导入
from ..parent_module import something

# ❌ 避免过度复杂的错误处理
try:
    # 过于复杂的导入逻辑
    pass
except:
    # 忽略所有错误
    pass

# ❌ 避免动态导入
import importlib
module = importlib.import_module('dynamic_module')
```

## 4. API路由注册（可选）

### 4.1 标准API注册

```python
# API路由注册
try:
    from server import PromptServer
    from aiohttp import web

    @PromptServer.instance.routes.post("/your-plugin/api")
    async def your_api_endpoint(request):
        """自定义API端点"""
        try:
            data = await request.json()
            # 处理数据
            result = process_data(data)
            return web.json_response({
                "success": True,
                "data": result
            })
        except Exception as e:
            return web.json_response({
                "success": False,
                "error": str(e)
            }, status=500)

    @PromptServer.instance.routes.get("/your-plugin/status")
    async def status_endpoint(request):
        """状态检查端点"""
        return web.json_response({
            "status": "running",
            "version": "1.0.0"
        })

except ImportError:
    # ComfyUI环境不可用时的静默处理
    pass
```

### 4.2 WebSocket事件处理

```python
# WebSocket事件处理
try:
    from server import PromptServer

    def send_node_update(node_id, data):
        """发送节点更新消息"""
        PromptServer.instance.send_sync("your.node.update", {
            "node_id": node_id,
            "data": data
        })

except ImportError:
    def send_node_update(node_id, data):
        """空实现，避免错误"""
        pass
```

## 5. 错误处理最佳实践

### 5.1 简单的错误处理

```python
# 推荐的简单错误处理
try:
    from .module import NODE_CLASS_MAPPINGS as mappings
except ImportError as e:
    print(f"警告：模块导入失败: {e}")
    mappings = {}

NODE_CLASS_MAPPINGS = {**mappings}
```

### 5.2 避免的复杂处理

```python
# ❌ 避免过度复杂的错误处理
import logging
import traceback

try:
    from .module import SomeClass
except Exception as e:
    logging.error(f"详细的错误日志: {traceback.format_exc()}")
    # 复杂的恢复逻辑
    # ...
```

## 6. 模块组织模式

### 6.1 单文件模式

```
your_plugin/
├── __init__.py          # 主入口文件
└── your_node.py         # 节点实现
```

**__init__.py**：
```python
from .your_node import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS
__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]
```

### 6.2 多模块模式

```
your_plugin/
├── __init__.py              # 主入口
├── nodes/
│   ├── __init__.py          # 节点模块入口
│   ├── basic_node.py        # 基础节点
│   └── advanced_node.py     # 高级节点
├── utils/
│   ├── __init__.py          # 工具模块
│   └── helper.py            # 辅助函数
└── web/
    └── your_script.js       # 前端脚本
```

**主__init__.py**：
```python
from .nodes.basic_node import BasicNode
from .nodes.advanced_node import AdvancedNode

NODE_CLASS_MAPPINGS = {
    "Basic Node": BasicNode,
    "Advanced Node": AdvancedNode
}

WEB_DIRECTORY = "./web"
__all__ = ["NODE_CLASS_MAPPINGS", "WEB_DIRECTORY"]
```

### 6.3 混合模式

```
your_plugin/
├── __init__.py              # 主入口
├── simple_nodes.py          # 简单节点
├── complex_module/          # 复杂模块
│   ├── __init__.py
│   ├── node1.py
│   └── node2.py
└── api.py                   # API定义
```

**主__init__.py**：
```python
from .simple_nodes import SimpleNode1, SimpleNode2
from .complex_module import (
    NODE_CLASS_MAPPINGS as complex_mappings,
    NODE_DISPLAY_NAME_MAPPINGS as complex_display_mappings
)

NODE_CLASS_MAPPINGS = {
    "Simple Node 1": SimpleNode1,
    "Simple Node 2": SimpleNode2,
    **complex_mappings
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "Simple Node 1": "简单节点1",
    "Simple Node 2": "简单节点2",
    **complex_display_mappings
}
```

## 7. 性能优化

### 7.1 延迟导入

```python
# 对于重型依赖，可以使用延迟导入
def get_heavy_node():
    """延迟导入重型节点"""
    try:
        from .heavy_module import HeavyNode
        return HeavyNode
    except ImportError:
        return None

# 在映射中使用函数
NODE_CLASS_MAPPINGS = {
    "Light Node": LightNode,
    # 重型节点在需要时才导入
}

# 动态添加重型节点
heavy_node = get_heavy_node()
if heavy_node:
    NODE_CLASS_MAPPINGS["Heavy Node"] = heavy_node
```

### 7.2 避免循环导入

```python
# ❌ 避免循环导入
# module1/__init__.py
from .module2 import something  # 如果module2也导入module1，会循环

# ✅ 使用函数或类内部导入
class Node1:
    def process(self):
        from .module2 import something  # 在使用时导入
        return something()
```

## 8. 版本兼容性

### 8.1 ComfyUI版本检查

```python
# 检查ComfyUI版本兼容性
import sys
import os

def check_comfyui_version():
    """检查ComfyUI版本"""
    try:
        # 尝试导入ComfyUI特定模块
        import folder_paths
        return True
    except ImportError:
        print("警告：ComfyUI环境不可用")
        return False

if check_comfyui_version():
    # 正常导入节点
    from .your_nodes import NODE_CLASS_MAPPINGS
else:
    # 提供空映射
    NODE_CLASS_MAPPINGS = {}
```

### 8.2 Python版本兼容

```python
# Python版本兼容性检查
import sys

if sys.version_info < (3, 8):
    print("错误：需要Python 3.8或更高版本")
    NODE_CLASS_MAPPINGS = {}
else:
    # 正常导入
    from .your_nodes import NODE_CLASS_MAPPINGS
```

## 9. 调试和测试

### 9.1 调试模式

```python
# 调试模式开关
DEBUG = os.environ.get("COMFYUI_DEBUG", "false").lower() == "true"

if DEBUG:
    print("调试模式：启用详细日志")
    # 额外的调试代码

# 导入时的调试信息
if DEBUG:
    print(f"导入模块: {__name__}")
    print(f"节点映射: {NODE_CLASS_MAPPINGS}")
```

### 9.2 测试验证

```python
# 自测试功能
def self_test():
    """执行自检"""
    try:
        # 检查必需变量
        assert 'NODE_CLASS_MAPPINGS' in globals()
        assert isinstance(NODE_CLASS_MAPPINGS, dict)

        # 检查节点类
        for name, node_class in NODE_CLASS_MAPPINGS.items():
            assert hasattr(node_class, 'INPUT_TYPES')
            assert hasattr(node_class, 'FUNCTION')

        print("✅ 自检通过")
        return True
    except Exception as e:
        print(f"❌ 自检失败: {e}")
        return False

# 可选的自检执行
if os.environ.get("COMFYUI_SELF_TEST", "false").lower() == "true":
    self_test()
```

## 10. 完整模板

### 10.1 生产环境模板

```python
"""
ComfyUI插件主入口文件
版本：1.0.0
遵循官方文档规范
"""

import os
from typing import Dict, Any

# === 配置部分 ===
PLUGIN_NAME = "Your Plugin Name"
VERSION = "1.0.0"
DEBUG = os.environ.get("COMFYUI_DEBUG", "false").lower() == "true"

# === 导入部分 ===

# 核心节点导入
from .core_nodes import CoreNode1, CoreNode2

# 扩展节点导入（带错误处理）
try:
    from .extension_nodes import NODE_CLASS_MAPPINGS as ext_mappings
    from .extension_nodes import NODE_DISPLAY_NAME_MAPPINGS as ext_display_mappings
    if DEBUG:
        print(f"✅ 扩展节点导入成功: {len(ext_mappings)}个节点")
except ImportError as e:
    if DEBUG:
        print(f"⚠️ 扩展节点导入失败: {e}")
    ext_mappings = {}
    ext_display_mappings = {}

# 可选节点导入
try:
    from .optional_nodes import OptionalNode
    optional_mappings = {"Optional Node": OptionalNode}
    if DEBUG:
        print("✅ 可选节点导入成功")
except ImportError as e:
    if DEBUG:
        print(f"⚠️ 可选节点导入失败: {e}")
    optional_mappings = {}

# === 映射定义 ===

NODE_CLASS_MAPPINGS: Dict[str, Any] = {
    "Core Node 1": CoreNode1,
    "Core Node 2": CoreNode2,
    **ext_mappings,
    **optional_mappings
}

NODE_DISPLAY_NAME_MAPPINGS: Dict[str, str] = {
    "Core Node 1": "核心节点1",
    "Core Node 2": "核心节点2",
    **ext_display_mappings,
    "Optional Node": "可选节点"
}

# === 前端资源 ===

WEB_DIRECTORY = "./web"

# === API注册 ===

try:
    from server import PromptServer
    from aiohttp import web

    @PromptServer.instance.routes.get(f"/{PLUGIN_NAME.lower().replace(' ', '_')}/status")
    async def status_api(request):
        """插件状态API"""
        return web.json_response({
            "plugin": PLUGIN_NAME,
            "version": VERSION,
            "nodes_count": len(NODE_CLASS_MAPPINGS),
            "status": "running"
        })

    if DEBUG:
        print(f"✅ API端点注册成功: /{PLUGIN_NAME.lower().replace(' ', '_')}/status")

except ImportError:
    if DEBUG:
        print("⚠️ ComfyUI服务器不可用，跳过API注册")

# === 导出定义 ===

__all__ = [
    'NODE_CLASS_MAPPINGS',
    'NODE_DISPLAY_NAME_MAPPINGS',
    'WEB_DIRECTORY'
]

# === 初始化日志 ===

if DEBUG:
    print(f"🚀 {PLUGIN_NAME} v{VERSION} 初始化完成")
    print(f"📦 节点数量: {len(NODE_CLASS_MAPPINGS)}")
    print(f"🌐 Web目录: {WEB_DIRECTORY}")
```

## 11. 常见问题和解决方案

### 11.1 节点不显示

**可能原因**：
- `NODE_CLASS_MAPPINGS`未正确定义
- 导入失败但没有错误处理
- 节点类缺少必需方法

**解决方案**：
```python
# 添加调试信息
print("节点映射:", NODE_CLASS_MAPPINGS)
print("节点类检查:")
for name, cls in NODE_CLASS_MAPPINGS.items():
    print(f"  {name}: {hasattr(cls, 'INPUT_TYPES')}")
```

### 11.2 导入错误

**可能原因**：
- 相对导入路径错误
- 模块文件缺失
- Python路径问题

**解决方案**：
```python
# 使用绝对导入
try:
    from your_plugin.nodes import YourNode
except ImportError:
    # 降级到相对导入
    from .nodes import YourNode
```

### 11.3 性能问题

**可能原因**：
- 导入时执行重型操作
- 循环导入
- 过多的动态导入

**解决方案**：
- 延迟导入重型模块
- 避免在导入时执行复杂逻辑
- 使用缓存机制

---

## 总结

遵循这些规范可以确保你的ComfyUI插件：

1. **可靠性**：正确的错误处理和兼容性检查
2. **性能**：优化的导入和加载机制
3. **可维护性**：清晰的代码结构和文档
4. **标准化**：符合官方文档要求的格式

**核心原则**：保持简单、遵循标准、完善测试、提供清晰的错误信息。