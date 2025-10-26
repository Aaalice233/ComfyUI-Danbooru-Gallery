# 全局文本缓存节点使用指南
Global Text Cache Nodes Usage Guide

## 概述

全局文本缓存系统由两个节点组成，用于在ComfyUI工作流中缓存和共享文本数据：

- **全局文本缓存保存 (Global Text Cache Save)**: 保存文本到指定通道
- **全局文本缓存获取 (Global Text Cache Get)**: 从指定通道获取文本

## 核心特性

### 1. 多通道隔离
- 使用通道名称区分不同的缓存数据
- 每个通道独立存储，互不干扰
- 适合在复杂工作流中管理多个文本缓存

### 2. 自动监听更新 ⭐
- **不执行就更新**: 当监听的节点widget值改变时，自动更新缓存
- **执行时更新**: 工作流执行时，根据输入文本更新缓存
- 两种更新时机完美结合

### 3. 动态通道选择
- 保存节点：手动输入通道名称
- 获取节点：从下拉菜单选择已有通道，或手动输入新通道
- 支持实时刷新通道列表

## 使用步骤

### 步骤1：创建简易Checkpoint加载器节点

1. 在ComfyUI工作流中添加"简易Checkpoint加载器"节点
2. 右键点击该节点
3. 选择"📋 复制节点ID（用于监听）"
4. 节点ID会被复制到剪贴板（例如：`123`）

### 步骤2：创建文本缓存保存节点

1. 添加"全局文本缓存保存 (Global Text Cache Save)"节点
2. 配置参数：
   ```
   text: 连接要缓存的文本输入（如提示词）
   channel_name: 输入通道名称（如"my_prompt"）
   enable_preview: 是否预览文本（默认True）
   monitor_node_id: 粘贴步骤1复制的节点ID（如"123"）
   monitor_widget_name: 输入要监听的widget名称（如"ckpt_name"）
   ```

### 步骤3：开始监听

方式1：自动监听
- 如果配置了`monitor_node_id`和`monitor_widget_name`，节点会在加载时自动开始监听

方式2：手动启动监听
- 右键点击"全局文本缓存保存"节点
- 选择"👁 开始监听"

### 步骤4：创建文本缓存获取节点

1. 添加"全局文本缓存获取 (Global Text Cache Get)"节点
2. 配置参数：
   ```
   channel_name: 从下拉菜单选择通道名称（如"my_prompt"）
   enable_preview: 是否预览文本（默认True）
   default_text: 当缓存为空时使用的默认文本
   ```

### 步骤5：使用缓存

- 当你在UI上切换简易Checkpoint加载器的底模时，文本缓存会自动更新
- 获取节点会立即获得最新的缓存文本
- 无需手动执行工作流即可更新缓存

## 使用场景示例

### 场景1：底模切换时自动更新提示词

```
[简易Checkpoint加载器]
         ↓ (model_name输出)
[提示词处理节点]
         ↓ (处理后的文本)
[全局文本缓存保存]
  - channel_name: "processed_prompt"
  - monitor_node_id: "123" (Checkpoint加载器的ID)
  - monitor_widget_name: "ckpt_name"

[全局文本缓存获取]
  - channel_name: "processed_prompt"
         ↓
[其他节点使用该提示词]
```

**工作流程：**
1. 用户在UI上选择不同的底模
2. 文本缓存保存节点检测到底模切换
3. 自动通过API更新缓存
4. 获取节点立即获得最新的缓存文本
5. 无需手动执行即可保持同步

### 场景2：多通道缓存管理

```
[正向提示词] → [文本缓存保存 (channel: "positive")]
[负向提示词] → [文本缓存保存 (channel: "negative")]
[样式提示词] → [文本缓存保存 (channel: "style")]

[文本缓存获取 (channel: "positive")] → [使用正向提示词的节点]
[文本缓存获取 (channel: "negative")] → [使用负向提示词的节点]
[文本缓存获取 (channel: "style")] → [使用样式提示词的节点]
```

## 右键菜单功能

### 保存节点右键菜单：
- **📋 复制节点ID**: 复制当前节点ID到剪贴板
- **👁 开始监听**: 手动启动widget监听
- **⏸ 停止监听**: 停止widget监听

### 获取节点右键菜单：
- **🔄 刷新通道列表**: 手动刷新可用通道列表

## 技术说明

### 监听机制
文本缓存保存节点使用JavaScript监听目标节点的widget变化：
1. 替换目标widget的callback函数
2. 保留原始callback的功能
3. 在callback中添加缓存更新逻辑
4. 通过WebSocket API调用Python后端更新缓存

### 通道同步
- 当缓存更新时，会发送WebSocket事件`text-cache-channel-updated`
- 所有获取节点监听该事件并自动刷新通道列表
- 确保前后端数据一致性

### 缓存存储
- 所有缓存数据存储在内存中（text_cache_manager）
- 支持多通道隔离存储
- 重启ComfyUI后缓存会丢失（设计如此，避免过期数据）

## 注意事项

1. **节点ID必须正确**: 监听功能依赖正确的节点ID，确保使用"复制节点ID"功能
2. **Widget名称必须匹配**: `monitor_widget_name`必须与目标节点的实际widget名称一致
3. **通道名称**: 保存和获取节点必须使用相同的通道名称才能共享数据
4. **性能考虑**: 监听会在每次widget变化时调用API，频繁变化可能影响性能
5. **缓存生命周期**: 缓存仅在当前ComfyUI会话中有效，重启后会清空

## 调试技巧

### 检查监听是否生效
1. 打开浏览器控制台（F12）
2. 切换被监听的widget值
3. 查看是否有`[GlobalTextCacheSave] Widget变化检测`日志

### 检查缓存是否更新
1. 在控制台查看`✅ 缓存已更新`日志
2. 检查获取节点的预览是否显示最新文本

### 检查通道列表
1. 右键点击获取节点
2. 选择"刷新通道列表"
3. 查看下拉菜单是否包含你的通道

## API端点

如果需要通过其他方式访问缓存，可以使用以下API：

### 更新缓存
```
POST /danbooru/text_cache/update
Content-Type: application/json

{
  "text": "要缓存的文本",
  "channel_name": "通道名称",
  "triggered_by": "触发来源"
}
```

### 获取通道列表
```
GET /danbooru/text_cache/channels

Response:
{
  "status": "success",
  "channels": ["channel1", "channel2", ...],
  "count": 2
}
```

## 常见问题

**Q: 为什么监听没有生效？**
A: 检查节点ID和widget名称是否正确，确保右键选择了"开始监听"。

**Q: 通道列表为什么是空的？**
A: 只有在保存节点至少执行一次或通过API创建通道后，通道才会出现在列表中。

**Q: 可以跨工作流共享缓存吗？**
A: 可以，只要在同一个ComfyUI实例中，不同工作流可以通过相同的通道名称共享缓存。

**Q: 缓存会持久化保存吗？**
A: 不会，缓存仅存在于内存中，重启ComfyUI后会丢失。

## 更新日志

### v1.0.0 (2025-01)
- ✨ 初始版本发布
- ✅ 实现多通道文本缓存
- ✅ 实现自动widget监听
- ✅ 实现动态通道列表
- ✅ 实现WebSocket事件同步

---

**提示**: 如果遇到问题，请查看ComfyUI控制台和浏览器控制台的日志输出，大多数问题都会有详细的错误信息。
