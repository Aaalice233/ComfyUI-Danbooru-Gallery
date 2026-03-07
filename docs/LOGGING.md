# 日志系统使用指南

## 概述

本插件使用统一的前后端日志系统，提供专业、灵活、高效的日志功能。

**🎯 核心特性：**
- ✅ **前后端统一**：Python和JavaScript日志集中管理
- ✅ **异步高性能**：后台线程异步写入，零阻塞
- ✅ **ERROR强制输出**：重要错误永不丢失
- ✅ **批量传输**：前端日志批量发送，减少网络开销
- ✅ **自动轮换**：智能日志文件管理

## 主要特性

### ✅ 前后端统一日志系统

**Python端：**
```python
from ..utils.logger import get_logger
logger = get_logger(__name__)
logger.info("Python日志")  # → 控制台 + 文件
```

**JavaScript端：**
```javascript
import { createLogger } from '../global/logger_client.js';
const logger = createLogger('my_component');
logger.info("JS日志");  // → 发送到Python → 控制台 + 文件
```

所有日志最终集中在 `logs/danbooru_gallery_YYYYMMDD_HHMMSS.log`（每次启动新建）！

### ✅ 异步日志写入（性能优化）

- **QueueHandler + QueueListener** 异步架构
- 文件I/O在后台线程执行，主线程零阻塞
- 1000条日志缓冲队列
- **性能提升：30-50%** 启动速度 + 60% 运行时开销降低

### ✅ ERROR强制输出机制

```python
logger.error("重要错误")  # 强制输出到stderr，无视console_output配置
```

- ERROR/CRITICAL级别**强制输出到控制台**
- 即使 `console_output=false` 也会输出错误
- 确保重要信息不会被忽略

### ✅ 节点初始化统计

插件启动时自动输出详细统计：
```
🚀 ComfyUI-Danbooru-Gallery 插件初始化开始...
✅ 节点加载完成: 24个模块, 56个节点
✅ API端点注册完成: 27个API (含日志接收)
🎉 插件初始化完成! 耗时: 0.123秒
```

### ✅ 混合日志轮换策略

**三层轮换机制：**

1. **启动时轮换**：每次ComfyUI启动时创建新的带时间戳日志文件
   - 文件名格式：`danbooru_gallery_20250109_153045.log`
   - 避免覆盖历史日志

2. **大小分片**：单次启动日志超过20MB时自动创建分片
   - 分片命名：`danbooru_gallery_20250109_153045.log.1`, `.log.2`, `.log.3`, `.log.4`
   - 单次启动最多5个文件（主文件 + 4个分片）

3. **历史清理**：自动删除旧日志，保留最新 **5次启动** 的所有日志
   - 每次启动时清理
   - 自动识别并删除旧的日志组（包括所有分片）

## Python端使用

### 1. 基本使用

```python
from ..utils.logger import get_logger

# 初始化logger（通常在模块顶部）
logger = get_logger(__name__)

# 使用logger记录日志
logger.debug("详细的调试信息")
logger.info("一般性操作信息")
logger.warning("警告：可能的问题")
logger.error("错误：操作失败")  # 强制输出到控制台
logger.critical("严重错误：系统故障")  # 强制输出到控制台
```

### 2. 参数化格式（推荐）

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
    risky_operation()
except Exception as e:
    logger.error("操作失败: %s", str(e))  # ERROR强制输出到控制台
    import traceback
    logger.debug(traceback.format_exc())  # 完整堆栈
```

## JavaScript端使用

### 1. 基本使用

```javascript
import { createLogger } from '../global/logger_client.js';

// 创建logger实例（组件名自动添加到日志）
const logger = createLogger('my_component');

// 使用logger记录日志
logger.debug('调试信息');
logger.info('普通信息');
logger.warn('警告信息');
logger.error('错误信息');  // 立即发送到后端，强制输出到控制台
```

### 2. 批量传输机制

前端日志会：
- **批量收集**：每500ms或50条触发一次发送
- **ERROR立即发送**：错误日志立即发送，不等待
- **页面卸载保护**：页面关闭前自动发送所有日志

```javascript
logger.info('普通日志');  // 批量发送
logger.error('错误日志'); // 立即发送！
```

### 3. 配置logger客户端

```javascript
import { loggerClient } from '../global/logger_client.js';

// 设置日志级别
loggerClient.setLevel('DEBUG');  // DEBUG/INFO/WARNING/ERROR

// 启用/禁用远程日志
loggerClient.setRemoteLogging(true);  // 发送到Python后端

// 启用/禁用控制台输出
loggerClient.setConsoleOutput(true);  // 浏览器console
```

配置会自动保存到 localStorage！

### 4. 替换现有console调用

**旧代码：**
```javascript
console.log('[MyComponent] 操作完成');
console.error('[MyComponent] 错误:', error);
```

**新代码：**
```javascript
import { createLogger } from '../global/logger_client.js';
const logger = createLogger('my_component');

logger.info('操作完成');
logger.error('错误:', error);
```

**批量替换工具：**
```bash
python tools/replace_console_to_logger.py js/my_module
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

```json
{
  "logging": {
    "level": "INFO",
    "console_output": true,
    "components": {
      "parameter_control_panel": "DEBUG",
      "workflow_description": "INFO"
    }
  }
}
```

**配置选项说明：**
- `level`: 全局日志级别（DEBUG/INFO/WARNING/ERROR/CRITICAL）
- `console_output`: 是否输出到控制台（默认 true）
  - `true`: 普通日志输出到控制台，ERROR强制输出
  - `false`: 只有ERROR/CRITICAL输出到控制台
- `components`: 组件级日志级别配置（可选）

**日志级别优先级：**
1. 环境变量 `COMFYUI_LOG_LEVEL`（最高优先级）
2. `config.json` 中的组件级配置
3. `config.json` 中的全局 `logging.level`
4. 默认级别：INFO

## 日志输出示例

### 控制台输出（带颜色）

```
======================================================================
🚀 ComfyUI-Danbooru-Gallery 插件初始化开始...
======================================================================
[2025-11-09 14:30:15] [INFO] [logger] ComfyUI-Danbooru-Gallery 日志系统已初始化
[2025-11-09 14:30:15] [INFO] [logger] 日志级别: INFO
[2025-11-09 14:30:15] [INFO] [logger] 控制台输出: 启用
[2025-11-09 14:30:15] [INFO] [logger] 日志文件: danbooru_gallery_20250109_143015.log
[2025-11-09 14:30:15] [INFO] [logger] 轮换策略: 启动时新建 | 单次最大20MB分片 | 保留5次启动
======================================================================
✅ 节点加载完成:
   📦 成功加载模块: 24 个
   🎯 成功注册节点: 56 个
======================================================================
✅ API端点注册完成:
   🌐 成功注册API: 27 个 (含日志接收)
======================================================================
🎉 ComfyUI-Danbooru-Gallery 插件初始化完成!
   ⏱️  初始化耗时: 0.123 秒
   📦 已加载模块: 24 个
   🎯 已注册节点: 56 个
======================================================================
[2025-11-09 14:30:16] [INFO] [execution_engine] [JS/Chrome] 执行引擎已初始化
[2025-11-09 14:30:17] [WARNING] [workflow_description] ⚠️ 配置文件不存在，使用默认值
[2025-11-09 14:30:18] [ERROR] [parameter_control_panel] ❌ 加载配置失败: file not found
```

### JavaScript日志标记

前端日志会自动添加 `[JS/浏览器名]` 前缀：

```
[2025-11-09 14:30:16] [INFO] [execution_engine] [JS/Chrome] 执行引擎已初始化
[2025-11-09 14:30:17] [ERROR] [parameter_control_panel] [JS/Firefox] 配置同步失败
```

## 性能优化说明

### 异步日志写入架构

```
日志产生 → QueueHandler (非阻塞) → Queue (1000条缓冲)
                                       ↓
                           后台线程 QueueListener
                                       ↓
                              异步写入文件
```

**性能提升：**
- ✅ 主线程零阻塞（logger.info()几乎零延迟）
- ✅ 批量写入减少文件I/O次数
- ✅ 启动速度提升 30-50%
- ✅ 运行时日志开销降低 60%

### 前端批量传输

```
JS日志产生 → 本地缓冲(50条/500ms) → 批量POST到Python
                                        ↓
                                 异步队列写入文件
```

**网络优化：**
- ✅ 减少API调用频率（500ms批量）
- ✅ ERROR立即发送保证可靠性
- ✅ 页面卸载前自动刷新

## 最佳实践

### ✅ DO（推荐做法）

1. **使用统一的logger系统**
   ```python
   # Python
   from ..utils.logger import get_logger
   logger = get_logger(__name__)

   # JavaScript
   import { createLogger } from '../global/logger_client.js';
   const logger = createLogger('component_name');
   ```

2. **选择合适的日志级别**
   - DEBUG：详细的内部状态（如变量值、循环次数）
   - INFO：重要的业务操作（如文件保存成功）
   - WARNING：可能的问题（如使用默认值）
   - ERROR：操作失败（如文件读取错误）→ **强制输出到控制台**

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
       logger.error("操作失败: %s", str(e))  # 强制输出到控制台
       logger.debug(traceback.format_exc())  # 完整堆栈到文件
   ```

### ❌ DON'T（不推荐做法）

1. **不要使用 console.log() 或 print()**
   ```javascript
   // ❌ 错误 - 不会被收集
   console.log('[MyComponent] 处理中...');

   // ✅ 正确 - 统一管理
   logger.info('处理中...');
   ```

2. **不要在日志中包含模块名前缀**
   ```python
   # ❌ 冗余（logger会自动添加模块名）
   logger.info("[MyModule] 操作完成")

   # ✅ 简洁
   logger.info("操作完成")
   ```

3. **不要过度使用ERROR级别**
   ```python
   # ❌ 不要把调试信息记为ERROR
   logger.error("变量值: %s", value)

   # ✅ 使用正确的级别
   logger.debug("变量值: %s", value)
   ```

## 批量替换工具

本插件提供了自动替换工具，可以批量将console调用替换为logger：

```bash
# 预览模式（不实际修改）
python tools/replace_console_to_logger.py js/my_module --dry-run

# 实际替换
python tools/replace_console_to_logger.py js/my_module

# 处理单个文件
python tools/replace_console_to_logger.py js/my_module/my_file.js
```

**工具特性：**
- ✅ 自动添加logger导入语句
- ✅ 批量替换console.log/error/warn/debug
- ✅ 智能识别组件名
- ✅ 支持预览模式
- ✅ 详细统计报告

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

### 问题：JavaScript日志没有发送

**检查项：**
1. 确认浏览器控制台没有错误
2. 检查网络面板，确认 `/danbooru/logs/batch` 请求成功
3. 检查logger配置：
   ```javascript
   import { loggerClient } from '../global/logger_client.js';
   console.log(loggerClient.remoteLoggingEnabled);  // 应该为true
   ```

### 问题：日志文件在哪里？

**位置和命名规则：**
```
ComfyUI/custom_nodes/ComfyUI-Danbooru-Gallery/logs/
├── danbooru_gallery_20250109_143015.log      # 最新启动（当前）
├── danbooru_gallery_20250109_143015.log.1    # 第1个分片（如果超20MB）
├── danbooru_gallery_20250109_143015.log.2    # 第2个分片
├── danbooru_gallery_20250109_120500.log      # 第2次启动
├── danbooru_gallery_20250109_090130.log      # 第3次启动
├── danbooru_gallery_20250108_183000.log      # 第4次启动
├── danbooru_gallery_20250108_183000.log.1    # 带分片
└── danbooru_gallery_20250108_110245.log      # 第5次启动（最早保留）
```

**说明：**
- 保留最新 **5次启动** 的所有日志
- 单次启动最多 **5个文件**（主文件 + 4个分片）
- 更早的日志会被自动删除

### 问题：不想在控制台看到普通日志

**解决方案：**
在 `config.json` 中设置 `console_output` 为 `false`：

```json
{
  "logging": {
    "level": "INFO",
    "console_output": false
  }
}
```

**注意：** ERROR和CRITICAL级别仍会强制输出到控制台！

### 问题：日志延迟

JavaScript日志有**最多500ms**的延迟（批量发送机制）。如果需要立即发送：

```javascript
import { loggerClient } from '../global/logger_client.js';
loggerClient.flush();  // 立即发送所有缓冲的日志
```

或使用ERROR级别（自动立即发送）：
```javascript
logger.error('需要立即发送的日志');
```

## 迁移指南

### 从console.log迁移（JavaScript）

**自动替换（推荐）：**
```bash
python tools/replace_console_to_logger.py js/my_module
```

**手动替换：**
```javascript
// 旧代码
console.log('[MyComponent] 操作完成');
console.error('[MyComponent] 错误:', error);

// 新代码
import { createLogger } from '../global/logger_client.js';
const logger = createLogger('my_component');

logger.info('操作完成');
logger.error('错误:', error);
```

### 从print()迁移（Python）

```python
# 旧代码
print(f"[MyModule] 警告: {warning_msg}")

# 新代码
from ..utils.logger import get_logger
logger = get_logger(__name__)
logger.warning("%s", warning_msg)
```

## 技术架构

### Python端架构

```
应用代码
    ↓
logger.info()  ← get_logger(__name__)
    ↓
QueueHandler (非阻塞)
    ↓
Queue (1000条缓冲)
    ↓
QueueListener (后台线程)
    ↓
FileHandler (异步写入) + ConsoleHandler (stdout/stderr)
```

### JavaScript端架构

```
应用代码
    ↓
logger.info()  ← createLogger('component')
    ↓
LoggerClient (本地缓冲 50条/500ms)
    ↓
POST /danbooru/logs/batch (批量发送)
    ↓
Python端 logger系统 (异步队列)
    ↓
文件 + 控制台
```

## 参考资料

- [Python logging 官方文档](https://docs.python.org/3/library/logging.html)
- [Python logging HOWTO](https://docs.python.org/3/howto/logging.html)
- [QueueHandler文档](https://docs.python.org/3/library/logging.handlers.html#queuehandler)

---

**最后更新：** 2025-11-09
**维护者：** ComfyUI-Danbooru-Gallery 团队

**版本说明：**
- v2.0.0: 前后端统一日志系统 + 异步优化 + ERROR强制输出
- v1.0.0: Python端日志系统
