# ComfyUI节点导入问题解决指南

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

## 正确的解决方案

### 1. 文件结构设计

```
ComfyUI-Danbooru-Gallery/
├── __init__.py                    # 主入口，合并所有节点映射
├── NodeName1/
│   ├── __init__.py               # 简单导入映射
│   └── node_implementation.py    # 完整节点实现
└── NodeName2/
    ├── __init__.py               # 简单导入映射
    └── node_implementation.py    # 完整节点实现
```

### 2. 节点实现文件模板

```python
"""
节点描述文档
节点功能说明、使用方法等
"""

# 1. 标准导入
import sys
import os
import time
import torch
import numpy as np
from PIL import Image
from typing import List, Dict, Any, Optional, Tuple

# 2. 常量定义
CATEGORY_TYPE = "Your/Category"

# 3. 工具类（如果需要）
class AnyType(str):
    """用于表示任意类型的特殊类，在类型比较时总是返回相等"""
    def __eq__(self, _) -> bool:
        return True

    def __ne__(self, __value: object) -> bool:
        return False

any_typ = AnyType("*")

# 4. 核心管理器类（如果有共享状态，内置在文件中）
class YourManager:
    """
    管理器类 - 单例模式
    """
    _instance = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not self._initialized:
            # 初始化逻辑
            self.data = {}
            self._initialized = True
            print(f"[{self.__class__.__name__}] 初始化管理器")

    # 管理器方法
    def clear_data(self):
        """清空数据"""
        self.data.clear()
        print(f"[{self.__class__.__name__}] 数据已清空")

# 5. 全局实例（模块级单例）
manager = YourManager()

# 6. 节点类实现
class YourNode:
    """
    节点类描述
    """

    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "param1": ("TYPE", {"default": "value", "tooltip": "参数说明"}),
                "param2": ("BOOLEAN", {"default": True, "tooltip": "布尔参数"}),
                "param3": ("INT", {"default": 0, "min": 0, "max": 100, "step": 1, "tooltip": "整数参数"})
            },
            "optional": {
                "optional_param": ("TYPE", {"tooltip": "可选参数说明"})
            },
            "hidden": {"prompt": "PROMPT", "extra_pnginfo": "EXTRA_PNGINFO"}
        }

    RETURN_TYPES = ("TYPE1", "TYPE2")
    RETURN_NAMES = ("output1", "output2")
    FUNCTION = "process"
    CATEGORY = CATEGORY_TYPE
    INPUT_IS_LIST = True  # 如果需要列表输入
    OUTPUT_IS_LIST = (True, False)  # 如果需要列表输出
    OUTPUT_NODE = True  # 如果是输出节点

    def process(self, param1, param2, param3, optional_param=None, prompt=None, extra_pnginfo=None):
        """
        节点处理函数
        """
        # 参数处理
        processed_param1 = param1[0] if isinstance(param1, list) else param1
        processed_param2 = param2[0] if isinstance(param2, list) else param2
        processed_param3 = param3[0] if isinstance(param3, list) else param3

        # 核心处理逻辑
        try:
            # 使用管理器
            result = manager.some_method(processed_param1, processed_param2)

            print(f"[{self.__class__.__name__}] 处理成功")
            return {"result": "ui_data"}

        except Exception as e:
            print(f"[{self.__class__.__name__}] 处理失败: {str(e)}")
            return {"result": "error_data"}

# 7. 节点映射函数（关键！）
def get_node_class_mappings():
    """返回节点类映射"""
    return {
        "NodeClassName": YourNode
    }

def get_node_display_name_mappings():
    """返回节点显示名称映射"""
    return {
        "NodeClassName": "节点显示名称 (Node Display Name)"
    }

# 8. 全局映射变量
NODE_CLASS_MAPPINGS = get_node_class_mappings()
NODE_DISPLAY_NAME_MAPPINGS = get_node_display_name_mappings()
```

### 3. 模块__init__.py模板

```python
"""
模块描述
Module Description
"""

from .node_implementation import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS']
```

### 4. 主__init__.py导入模板

```python
import logging

# 设置日志
logger = logging.getLogger("Your-Plugin-Name")
logger.setLevel(logging.INFO)

# 分别导入各个模块，使用try/except处理错误
try:
    from .NodeName1 import NODE_CLASS_MAPPINGS as node1_mappings, NODE_DISPLAY_NAME_MAPPINGS as node1_display_mappings
except Exception as e:
    logger.error(f"导入 NodeName1 节点失败: {e}")
    node1_mappings, node1_display_mappings = {}, {}

try:
    from .NodeName2 import NODE_CLASS_MAPPINGS as node2_mappings, NODE_DISPLAY_NAME_MAPPINGS as node2_display_mappings
except Exception as e:
    logger.error(f"导入 NodeName2 节点失败: {e}")
    node2_mappings, node2_display_mappings = {}, {}

# 合并所有节点的映射
NODE_CLASS_MAPPINGS = {**node1_mappings, **node2_mappings}
NODE_DISPLAY_NAME_MAPPINGS = {**node1_display_mappings, **node2_display_mappings}

# 设置JavaScript文件目录（如果有）
WEB_DIRECTORY = "./js"

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS', 'WEB_DIRECTORY']
```

## 关键原则

### 1. 简单性优先
- ❌ 避免复杂的跨模块依赖
- ✅ 每个节点文件应该是自包含的
- ✅ 导入链条越短越可靠

### 2. 参考现有模式
- ✅ 学习插件中其他成功节点的结构
- ✅ 使用相同的命名约定和文件组织方式
- ✅ 遵循ComfyUI的节点注册标准

### 3. 错误处理
- ✅ 在主__init__.py中使用try/except包装每个模块导入
- ✅ 提供有意义的错误日志
- ✅ 确保单个模块失败不影响整个插件

### 4. 单例模式正确实现
- ❌ 避免跨模块的单例共享
- ✅ 使用模块级变量实现单例
- ✅ 让Python的模块系统管理单例生命周期

## 常见错误及解决方案

### 错误1：跨模块导入失败
```
ModuleNotFoundError: No module named 'SomeModule'
```

**解决方案**：
- 将依赖的模块代码直接复制到节点文件中
- 避免使用复杂的导入路径

### 错误2：节点不在搜索结果中
**解决方案**：
- 检查NODE_CLASS_MAPPINGS是否正确设置
- 确认主__init__.py正确导入了模块映射
- 验证节点类名和映射键名一致

### 错误3：单例状态不共享
**解决方案**：
- 在每个需要共享状态的节点文件中包含相同的管理器类
- 使用模块级变量创建单例实例
- 依赖Python的模块机制实现状态共享

## 调试技巧

### 1. 检查导入日志
在ComfyUI启动日志中查看：
```
[Your-Plugin-Name] 导入 YourNode 节点失败: 具体错误信息
```

### 2. 验证节点注册
在Python控制台中：
```python
import your_plugin
print(your_plugin.NODE_CLASS_MAPPINGS)
print(your_plugin.NODE_DISPLAY_NAME_MAPPINGS)
```

### 3. 检查文件结构
确保所有必要的文件都存在：
- 节点实现文件
- 模块__init__.py文件
- 主__init__.py文件

## 最佳实践总结

1. **每个节点自包含**：避免复杂的依赖关系
2. **代码重复优于复杂架构**：可靠性比优雅更重要
3. **遵循现有模式**：参考插件中成功实现
4. **完善的错误处理**：使用try/except包装导入
5. **清晰的日志输出**：便于调试问题
6. **简单的单例实现**：利用Python模块系统

---

**核心教训：在ComfyUI插件开发中，"别搞那么复杂"是最重要的原则。简单可靠的实现远比复杂的架构设计更有效。**