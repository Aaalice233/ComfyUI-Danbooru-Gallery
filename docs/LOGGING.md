# 日志系统使用指南

## 概述

本插件使用Python标准的 `logging` 模块来管理所有日志输出，提供专业、灵活、高效的日志功能。

## 主要特性

✅ **双输出机制**
- 控制台输出：彩色格式化日志（支持ANSI终端）
- 文件输出：完整日志记录到 `logs/danbooru_gallery.log`

✅ **自动文件轮转**
- 单个日志文件最大 10MB
- 保留最近 5 个备份文件
- 自动管理磁盘空间

✅ **灵活的日志级别控制**
- DEBUG：详细的调试信息
- INFO：一般性信息
- WARNING：警告信息
- ERROR：错误信息
- CRITICAL：严重错误

✅ **组件级日志配置**
- 可以为不同模块设置不同的日志级别
- 精确控制日志输出的详细程度

## 快速开始

### 1. 在代码中使用日志

```python
from ..utils.logger import get_logger

# 初始化logger（通常在模块顶部）
logger = get_logger(__name__)

# 使用logger记录日志
logger.debug("详细的调试信息")
logger.info("一般性操作信息")
logger.warning("警告：可能的问题")
logger.error("错误：操作失败")
logger.critical("严重错误：系统故障")
```

### 2. 使用参数化格式（推荐）

```python
# ✅ 推荐：使用参数化格式（性能更好）
logger.info("用户 %s 执行了 %s 操作", username, action)
logger.debug("处理了 %d 个项目，耗时 %.2f 秒", count, duration)

# ⚠️ 可用但不推荐：使用f-string
logger.info(f"用户 {username} 执行了 {action} 操作")
```

**为什么推荐参数化格式？**
- 只有在日志级别启用时才会格式化字符串
- 避免不必要的字符串拼接
- 性能更好，特别是在高频日志场景

### 3. 异常日志

```python
try:
    # 一些操作
    risky_operation()
except Exception as e:
    # 记录错误信息
    logger.error("操作失败: %s", str(e))

    # 记录完整的堆栈跟踪（使用DEBUG级别）
    import traceback
    logger.debug(traceback.format_exc())
```

## 配置日志级别

### 方法1: 使用环境变量（临时调试）

```bash
# Windows PowerShell
$env:COMFYUI_LOG_LEVEL="DEBUG"
python main.py

# Windows CMD
set COMFYUI_LOG_LEVEL=DEBUG
python main.py

# Linux/Mac
export COMFYUI_LOG_LEVEL=DEBUG
python main.py
```

### 方法2: 修改 config.json（永久配置）

在项目根目录的 `config.json` 中添加或修改：

```json
{
  "logging": {
    "level": "INFO",
    "console_output": true,
    "components": {
      "group_executor_manager": "DEBUG",
      "text_cache_manager": "WARNING"
    }
  },
  "debug": {
    // 已废弃的debug选项，保留用于兼容
  }
}
```

**配置选项说明：**
- `level`: 全局日志级别（DEBUG/INFO/WARNING/ERROR/CRITICAL）
- `console_output`: 是否输出到控制台（true/false，默认 true）
  - `true`: 日志同时输出到控制台和文件
  - `false`: 日志只输出到文件，不显示在控制台
- `components`: 组件级日志级别配置（可选）

**日志级别优先级：**
1. 环境变量 `COMFYUI_LOG_LEVEL`（最高优先级）
2. `config.json` 中的组件级配置
3. `config.json` 中的全局 `logging.level`
4. 默认级别：INFO

### 方法3: 在代码中动态修改（仅调试用）

```python
import logging
from ..utils.logger import get_logger

# 修改特定logger的级别
logger = get_logger("group_executor_manager")
logger.setLevel(logging.DEBUG)

# 修改根logger的级别（影响所有logger）
logging.getLogger("danbooru_gallery").setLevel(logging.DEBUG)
```

## 日志输出示例

### 控制台输出（带颜色）

```
[2025-11-09 14:30:15] [INFO] [danbooru_gallery.group_executor_manager] ✅ 配置已更新: 3 个组
[2025-11-09 14:30:16] [DEBUG] [danbooru_gallery.text_cache_manager] 创建新缓存通道: prompt
[2025-11-09 14:30:17] [WARNING] [danbooru_gallery.image_cache_save] ⚠️ CUDA 不可用
[2025-11-09 14:30:18] [ERROR] [danbooru_gallery.parameter_control_panel] ❌ 加载配置失败: file not found
```

### 文件输出（完整信息）

```
[2025-11-09 14:30:15] [INFO] [danbooru_gallery.group_executor_manager] ✅ 配置已更新: 3 个组
[2025-11-09 14:30:16] [DEBUG] [danbooru_gallery.text_cache_manager] 创建新缓存通道: prompt
[2025-11-09 14:30:17] [WARNING] [danbooru_gallery.image_cache_save] ⚠️ CUDA 不可用
[2025-11-09 14:30:18] [ERROR] [danbooru_gallery.parameter_control_panel] ❌ 加载配置失败: file not found
```

## 最佳实践

### ✅ DO（推荐做法）

1. **使用参数化格式**
   ```python
   logger.info("处理了 %d 个文件", file_count)
   ```

2. **选择合适的日志级别**
   - DEBUG：详细的内部状态（如变量值、循环次数）
   - INFO：重要的业务操作（如文件保存成功）
   - WARNING：可能的问题（如使用默认值）
   - ERROR：操作失败（如文件读取错误）

3. **保持日志简洁明了**
   ```python
   # ✅ 好
   logger.info("缓存已保存到通道 '%s'", channel_name)

   # ❌ 太啰嗦
   logger.info("[TextCacheManager] Cache save operation completed successfully for channel '%s'", channel_name)
   ```

4. **异常处理中记录堆栈**
   ```python
   except Exception as e:
       logger.error("操作失败: %s", str(e))
       logger.debug(traceback.format_exc())  # 完整堆栈
   ```

### ❌ DON'T（不推荐做法）

1. **不要使用 print()**
   ```python
   # ❌ 错误
   print(f"[MyModule] Processing {count} items")

   # ✅ 正确
   logger.info("Processing %d items", count)
   ```

2. **不要在日志中包含模块名前缀**
   ```python
   # ❌ 冗余（logger会自动添加模块名）
   logger.info("[MyModule] 操作完成")

   # ✅ 简洁
   logger.info("操作完成")
   ```

3. **不要过度使用高级别日志**
   ```python
   # ❌ 不要把调试信息记为ERROR
   logger.error("变量值: %s", value)

   # ✅ 使用正确的级别
   logger.debug("变量值: %s", value)
   ```

## 故障排除

### 问题：看不到DEBUG级别的日志

**解决方案：**
1. 检查日志级别配置（环境变量 > config.json > 默认）
2. 确认 config.json 中的配置：
   ```json
   {
     "logging": {
       "level": "DEBUG"
     }
   }
   ```
3. 或设置环境变量：`COMFYUI_LOG_LEVEL=DEBUG`

### 问题：日志文件太大

**解决方案：**
1. 日志系统会自动轮转（超过10MB会创建新文件）
2. 最多保留5个备份文件
3. 可以安全删除 `logs/danbooru_gallery.log.*` 备份文件
4. 调高日志级别以减少输出（DEBUG → INFO → WARNING）

### 问题：日志文件在哪里？

**位置：**
```
ComfyUI/custom_nodes/ComfyUI-Danbooru-Gallery/logs/
├── danbooru_gallery.log        # 当前日志
├── danbooru_gallery.log.1      # 备份1（最新）
├── danbooru_gallery.log.2      # 备份2
├── danbooru_gallery.log.3      # 备份3
├── danbooru_gallery.log.4      # 备份4
└── danbooru_gallery.log.5      # 备份5（最旧）
```

### 问题：不想在控制台看到日志输出

**解决方案：**
在 `config.json` 中设置 `console_output` 为 `false`：

```json
{
  "logging": {
    "level": "INFO",
    "console_output": false,
    "components": { ... }
  }
}
```

这样日志只会输出到文件，不会显示在 ComfyUI 控制台中。文件日志不受影响，仍然会完整记录。

## 迁移指南

### 从旧的 debug_print 迁移

旧代码（已废弃）：
```python
from ..utils.debug_config import debug_print

COMPONENT_NAME = "my_module"

debug_print(COMPONENT_NAME, f"[MyModule] ✅ 操作完成")
```

新代码：
```python
from ..utils.logger import get_logger

logger = get_logger(__name__)

logger.info("✅ 操作完成")
```

### 从 print() 迁移

旧代码：
```python
print(f"[MyModule] 警告: {warning_msg}")
```

新代码：
```python
logger.warning("%s", warning_msg)
```

## 参考资料

- [Python logging 官方文档](https://docs.python.org/3/library/logging.html)
- [Python logging HOWTO](https://docs.python.org/3/howto/logging.html)

---

**最后更新：** 2025-11-08
**维护者：** ComfyUI-Danbooru-Gallery 团队
