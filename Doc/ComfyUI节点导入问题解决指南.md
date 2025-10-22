# ComfyUI节点导入问题解决指南

基于ComfyUI官方文档的最佳实践

## 问题描述

在ComfyUI插件开发中，节点无法在搜索中找到，日志显示导入失败错误。

## 典型错误案例

### 错误现象
```
导入 ImageCacheGet 节点失败: No module named 'ImageCacheManager'
```

### 错误原因分析
1. **复杂的跨模块依赖**：节点依赖外部模块，导入链条过长
2. **单例模式实现错误**：试图跨模块共享单例实例
3. **过度设计的架构**：创建了不必要的复杂文件结构
4. **不符合官方规范**：没有遵循ComfyUI官方的节点开发标准

## ComfyUI官方规范要求

### 1. 标准__init__.py结构（官方推荐）

```python
# 最简单的主入口文件
from .your_node_file import YourCustomNode

NODE_CLASS_MAPPINGS = {
    "Your Custom Node" : YourCustomNode
}

__all__ = ["NODE_CLASS_MAPPINGS"]
```

### 2. 完整的节点实现模板

```python
"""
ComfyUI自定义节点标准模板
遵循官方文档规范
"""

import hashlib
from typing import List, Dict, Any, Optional, Tuple

class YourCustomNode:
    """
    自定义节点类
    必须包含以下标准方法
    """

    @classmethod
    def INPUT_TYPES(cls):
        """定义输入参数类型和约束"""
        return {
            "required": {
                "image": ("IMAGE", {}),
                "strength": ("FLOAT", {
                    "default": 1.0,
                    "min": 0.0,
                    "max": 1.0,
                    "step": 0.01,
                    "tooltip": "处理强度"
                }),
                "mode": (["normal", "advanced"], {
                    "default": "normal",
                    "tooltip": "处理模式"
                }),
            },
            "optional": {
                "mask": ("MASK", {
                    "tooltip": "可选的蒙版"
                }),
            },
            "hidden": {
                "prompt": "PROMPT",
                "extra_pnginfo": "EXTRA_PNGINFO",
                "node_id": "UNIQUE_ID"
            }
        }

    RETURN_TYPES = ("IMAGE", "STRING")
    RETURN_NAMES = ("processed_image", "status_message")
    FUNCTION = "process_image"
    CATEGORY = "image/processing"
    DESCRIPTION = "图像处理节点，支持多种处理模式"

    @classmethod
    def IS_CHANGED(cls, image, strength=1.0, mode="normal"):
        """优化执行性能：检测输入变化"""
        if isinstance(image, str):
            # 如果是文件路径，计算文件哈希
            try:
                import os
                m = hashlib.sha256()
                with open(image, 'rb') as f:
                    m.update(f.read())
                return m.digest().hex()
            except:
                pass
        # 返回哈希值用于变化检测
        return hashlib.sha256(f"{image}_{strength}_{mode}".encode()).hexdigest()

    def process_image(self, image, strength=1.0, mode="normal", mask=None, prompt=None, extra_pnginfo=None, node_id=None):
        """
        主要处理函数
        必须返回元组格式
        """
        try:
            # 获取节点ID用于通信
            if node_id:
                from server import PromptServer
                PromptServer.instance.send_sync("your.custom.message", {
                    "node": node_id,
                    "status": "processing"
                })

            # 核心处理逻辑
            processed_image = self._apply_processing(image, strength, mode, mask)

            return (processed_image, "处理完成")

        except Exception as e:
            print(f"[YourCustomNode] 处理失败: {str(e)}")
            return (image, f"处理失败: {str(e)}")

    def _apply_processing(self, image, strength, mode, mask):
        """实际处理逻辑"""
        # 在这里实现你的算法
        return image

# 标准导出格式
NODE_CLASS_MAPPINGS = {
    "Your Custom Node": YourCustomNode,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "Your Custom Node": "图像处理器",
}

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]
```

### 3. 模块__init__.py简化模板

```python
"""
模块入口 - 官方推荐的最简结构
"""

from .your_node_file import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]
```

### 4. 主__init__.py推荐结构

```python
"""
ComfyUI插件主入口
遵循官方推荐的简洁模式
"""

# 方法1：直接导入简单节点
from .simple_node import YourSimpleNode

# 方法2：导入复杂模块
from .complex_module import NODE_CLASS_MAPPINGS as complex_mappings
from .complex_module import NODE_DISPLAY_NAME_MAPPINGS as complex_display_mappings

# 合并所有节点
NODE_CLASS_MAPPINGS = {
    "Your Simple Node": YourSimpleNode,
    **complex_mappings
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "Your Simple Node": "简单节点",
    **complex_display_mappings
}

# 如果有前端JavaScript
WEB_DIRECTORY = "./web"

# 注册API路由（可选）
try:
    from server import PromptServer
    from aiohttp import web

    @PromptServer.instance.routes.post("/your-plugin/api")
    async def your_api(request):
        data = await request.json()
        return web.json_response({"success": True, "data": data})

except ImportError:
    pass

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS', 'WEB_DIRECTORY']
```

## pyproject.toml配置（官方规范）

```toml
[project]
name = "your-custom-node"
version = "1.0.0"
description = "你的自定义节点描述"
license = { file = "LICENSE" }
requires-python = ">=3.8"
dependencies = [
    # 你的依赖包
]
classifiers = [
    "Operating System :: OS Independent",
    "Environment :: GPU :: NVIDIA CUDA",
]

[project.urls]
Repository = "https://github.com/username/your-custom-node"
Documentation = "https://github.com/username/your-custom-node/wiki"
"Bug Tracker" = "https://github.com/username/your-custom-node/issues"

[tool.comfy]
PublisherId = "your-github-username"
DisplayName = "你的节点显示名称"
Icon = "https://raw.githubusercontent.com/username/repo/main/icon.png"
Banner = "https://raw.githubusercontent.com/username/repo/main/banner.png"
requires-comfyui = ">=1.0.0"
```

## 国际化支持（可选）

### 文件结构
```
your_custom_node/
├── __init__.py
├── your_node.py
└── locales/
    ├── en/
    │   ├── nodeDefs.json
    │   └── main.json
    └── zh/
        ├── nodeDefs.json
        └── main.json
```

### nodeDefs.json示例
```json
{
  "YourCustomNode": {
    "display_name": "图像处理器",
    "description": "支持多种模式的图像处理节点",
    "inputs": {
      "image": {
        "name": "输入图像",
        "tooltip": "需要处理的原始图像"
      },
      "strength": {
        "name": "处理强度",
        "tooltip": "控制处理效果的强度"
      }
    },
    "outputs": {
      "0": {
        "name": "处理结果",
        "tooltip": "处理后的图像"
      }
    }
  }
}
```

## 关键原则（基于官方文档）

### 1. 简单性优先（官方推荐）
- ❌ 避免复杂的跨模块依赖
- ✅ 每个节点文件应该是自包含的
- ✅ 使用最简单的导入结构
- ✅ 遵循官方提供的标准模板

### 2. 标准化命名
- ✅ 使用小写字母和下划线的文件命名：`your_node.py`
- ✅ 使用驼峰命名的类名：`YourCustomNode`
- ✅ 在映射中使用清晰的显示名称

### 3. 完整的节点接口
- ✅ 必须实现`INPUT_TYPES`类方法
- ✅ 必须定义`RETURN_TYPES`和`RETURN_NAMES`
- ✅ 必须指定`FUNCTION`和`CATEGORY`
- ✅ 推荐实现`IS_CHANGED`以优化性能

### 4. 错误处理和调试
- ✅ 在主函数中使用try/except
- ✅ 提供有意义的错误消息
- ✅ 使用print进行调试（避免复杂日志系统）

## 常见错误及解决方案

### 错误1：节点不显示在搜索中
**检查清单**：
1. `NODE_CLASS_MAPPINGS`是否正确定义
2. 主`__init__.py`是否正确导入
3. 节点类名是否与映射键名一致
4. 文件命名是否符合规范

### 错误2：导入失败
```
ModuleNotFoundError: No module named 'SomeModule'
```
**解决方案**：
- 将依赖代码直接包含在节点文件中
- 避免使用复杂的相对导入
- 确保所有依赖都在requirements.txt中

### 错误3：节点执行无响应
**检查清单**：
1. `FUNCTION`指定的方法是否存在
2. 返回值是否为元组格式
3. 输入参数类型是否匹配
4. 是否有未捕获的异常

### 错误4：性能问题
**优化方案**：
- 实现`IS_CHANGED`方法
- 避免重复计算
- 使用缓存机制
- 优化内存使用

## 调试技巧

### 1. 检查节点注册
```python
# 在ComfyUI控制台中执行
import your_plugin
print("节点映射:", your_plugin.NODE_CLASS_MAPPINGS)
print("显示名称映射:", your_plugin.NODE_DISPLAY_NAME_MAPPINGS)
```

### 2. 验证导入
```python
# 测试单个节点导入
from your_plugin.your_node import YourCustomNode
print("节点类:", YourCustomNode)
print("输入类型:", YourCustomNode.INPUT_TYPES())
```

### 3. 检查前端集成
- 确认`WEB_DIRECTORY`正确设置
- 验证JavaScript文件路径
- 检查API路由注册

## 安装和部署

### 1. 标准安装
```bash
# 克隆到custom_nodes目录
cd ComfyUI/custom_nodes
git clone https://github.com/username/your-custom-node

# 安装依赖
pip install -r your-custom-node/requirements.txt
```

### 2. 使用ComfyUI-Manager
```bash
# 通过CLI安装
comfy node install your-custom-node

# 或通过界面搜索安装
```

## 最佳实践总结

1. **遵循官方模板**：使用文档中提供的标准结构
2. **保持简单**：避免过度设计和复杂的依赖关系
3. **完整实现**：确保所有必需的方法和属性都已定义
4. **性能优化**：实现`IS_CHANGED`和合理的缓存策略
5. **错误处理**：提供清晰的错误信息和平滑的降级
6. **文档完整**：提供清晰的tooltip和描述
7. **测试验证**：在各种场景下测试节点的稳定性

---

**核心原则：遵循ComfyUI官方文档的规范，使用标准的模板和最佳实践，确保节点的可靠性和兼容性。**

**参考资料：**
- [ComfyUI官方文档 - 自定义节点开发](https://docs.comfy.org/)
- [ComfyUI节点注册规范](https://github.com/comfy-org/docs)