# 组执行管理器 (Group Execute Manager)

一个强大的ComfyUI节点,用于管理和执行多个组的工作流。

## 功能特性

### 1. 统一管理
- **单节点管理**: 用一个节点管理所有组的执行，无需多个节点链接
- **可视化界面**: 简洁的红白配色GUI，直观显示所有组列表
- **智能组选择**: 自动获取工作流中的所有组，下拉菜单快速选择

### 2. 顺序执行
- **按序执行**: 按照添加顺序依次执行各个组
- **实时反馈**: 显示当前执行进度（执行 1/3: 组名）
- **状态提示**: 执行中显示覆盖层状态

### 3. 多语言支持
- **中英双语**: 支持中文和英文界面
- **全局集成**: 使用全局多语言管理器
- **自动翻译**: 所有UI文本自动翻译

### 4. Toast提示系统
- **操作反馈**: 所有操作都有Toast提示
- **错误提示**: 执行出错时会显示详细错误信息
- **类型区分**: 成功/错误/警告/信息四种类型

## 使用方法

### 1. 添加节点
在ComfyUI中搜索 `Group Execute Manager` 或在菜单中找到 `utils/execution/Group Execute Manager`

### 2. 创建组
1. 在ComfyUI画布上右键 → `Add Group` 创建组
2. 命名组 (例如: "组1", "角色A", "Background" 等)
3. 将需要一起执行的节点放入组内
4. **重要**: 组内必须包含至少一个输出节点（如 SaveImage、PreviewImage 等）

### 3. 添加组到执行列表
1. 点击节点底部的 `+ 添加组` 按钮
2. 从下拉菜单中选择要添加的组
3. 重复操作添加所有需要执行的组

**提示**:
- 自动从工作流中获取所有组
- 已添加的组会显示为灰色并划线
- 无需手动输入组名

### 4. 删除组
- 点击组项右侧的 `✕ 删除` 按钮
- 确认删除

### 5. 执行
1. 点击 ComfyUI 的 `Queue Prompt` 按钮
2. 节点会按照列表顺序（从上到下）依次执行每个组
3. 执行过程中会显示进度状态：
   - "执行 1/3: 组1"
   - "执行 2/3: 组2"
   - "执行完成"
4. 每个组完成后立即执行下一个组（无延迟）

## GUI界面说明 (v2.0)

```
┌─────────────────────────────────┐
│  Group Execute Manager          │  ← 红色边框，白色背景
├─────────────────────────────────┤
│  ┌──────────────────────────┐   │
│  │ 1. 组1         [✕ 删除]  │   │  ← 组列表项
│  ├──────────────────────────┤   │
│  │ 2. 组2         [✕ 删除]  │   │
│  ├──────────────────────────┤   │
│  │ 3. 组3         [✕ 删除]  │   │
│  └──────────────────────────┘   │
├─────────────────────────────────┤
│       [+ 添加组]                │  ← 底部按钮
└─────────────────────────────────┘
```

**特点**:
- 简洁的红白配色
- 清晰的序号显示
- 悬停高亮效果

## 工作原理

1. **组发现**: 节点会在画布上查找指定名称的组
2. **节点收集**: 自动收集组内所有输出节点 (OUTPUT_NODE)
3. **依赖分析**: 通过QueueManager分析并收集所有依赖节点
4. **顺序执行**: 按列表顺序依次执行每个组
5. **等待完成**: 每个组执行完成后才开始下一个组

## 技术特性

### 前端
- **自定义GUI**: 使用LiteGraph的Canvas API绘制界面
- **事件处理**: 完整的鼠标交互支持 (点击、拖拽、悬停)
- **状态管理**: 实时更新执行状态
- **数据持久化**: 组列表自动保存到工作流

### 后端
- **OUTPUT_NODE**: 支持手动触发执行
- **轻量级**: 纯前端逻辑,后端仅作为节点占位

### 集成
- **多语言系统**: 使用全局多语言管理器
- **Toast系统**: 使用全局Toast管理器
- **队列系统**: 使用QueueManager过滤节点

## 注意事项

1. **组名匹配**: 节点中的组名必须与画布上的组名完全一致
2. **输出节点**: 组内必须包含至少一个输出节点 (如SaveImage、PreviewImage等)
3. **依赖关系**: 节点会自动处理组内节点的依赖关系
4. **执行顺序**: 按列表从上到下的顺序执行

## 示例工作流

```
场景: 批量生成多个角色的图片

组1: "角色A" - 包含角色A的提示词和生成节点
组2: "角色B" - 包含角色B的提示词和生成节点
组3: "背景" - 包含背景生成节点

配置:
1. 添加组 "角色A"
2. 添加组 "角色B"
3. 添加组 "背景"

执行流程:
点击Queue Prompt
→ 执行角色A → 完成
→ 执行角色B → 完成
→ 执行背景 → 完成
```

## 高级用法

### 重复执行
```
场景: 同一个组需要执行多次

配置:
- 添加组 "组1"
- 再次添加组 "组1"
- 添加组 "组2"

效果: 组1会执行两次，然后执行组2
```

### 混合执行
```
场景: 灵活控制执行顺序

配置:
- 组1
- 组2
- 组1（再次执行）
- 组3

效果: 按顺序执行，组1会执行两次
```

## 故障排查

### 问题: 组未找到
- **原因**: 组名不匹配或组不存在
- **解决**:
  1. 确保在画布上创建了组（右键 → Add Group）
  2. 检查组是否有标题（title）
  3. 点击"添加组"查看下拉菜单中是否显示该组

### 问题: 没有输出节点
- **原因**: 组内没有输出节点
- **解决**:
  1. 确保组内至少有一个输出节点（SaveImage、PreviewImage等）
  2. 检查节点是否在组的边界框内

### 问题: 界面显示空白
- **原因**: DOM初始化失败
- **解决**:
  1. 刷新页面（Ctrl+F5 或 Cmd+Shift+R）
  2. 查看浏览器控制台日志
  3. 检查是否有JavaScript错误

### 问题: 执行不起作用
- **原因**: 节点状态错误或工作流配置问题
- **解决**:
  1. 确保节点已添加到工作流
  2. 检查控制台日志查看详细错误
  3. 确认组内有可执行的输出节点

## 详细技术文档

### 核心架构

```
┌─────────────────────────────────────┐
│   Group Execute Manager Node        │
│  (OUTPUT_NODE)                      │
└────────────┬────────────────────────┘
             │
             │ Python execute() 触发
             │
             ▼
┌─────────────────────────────────────┐
│   JavaScript onExecuted Hook        │
│  监听节点执行事件                      │
└────────────┬────────────────────────┘
             │
             │ 调用 executeAllGroups()
             │
             ▼
┌─────────────────────────────────────┐
│   遍历 groups 数组                    │
│  for each group:                    │
│    1. 获取组内的输出节点              │
│    2. 将节点 ID 加入执行队列          │
│    3. 等待队列完成                   │
└─────────────────────────────────────┘
```

### QueueManager (队列管理器)

```javascript
class QueueManager {
    // Hook ComfyUI 的 queuePrompt 方法
    // 只执行指定的节点 ID，过滤掉其他节点
    async queueOutputNodes(nodeIds) {
        this.queueNodeIds = nodeIds;
        await app.queuePrompt();  // 只会执行这些节点
    }
}
```

**工作原理**:
- 拦截 `api.queuePrompt` 方法
- 根据 `queueNodeIds` 过滤 `prompt.output`
- 递归添加依赖的输入节点
- 只执行指定的节点子图

### 数据持久化

```javascript
// 数据结构
this.groups = [
    { name: "组1" },
    { name: "组2" },
    ...
]

// 使用隐藏 widget 存储
this.addWidget("text", "groups_data", JSON.stringify(this.groups), ...)

// 序列化到工作流
onSerialize(o) {
    o.groups = this.groups;
}

// 从工作流加载
onConfigure(o) {
    if (o.groups) {
        this.groups = o.groups;
        this.renderGroups();
    }
}
```

### 组检测逻辑

```javascript
// 1. 获取所有组名
getAllGroupNames() {
    return app.graph._groups
        .filter(g => g && g.title)
        .map(g => g.title)
        .sort();
}

// 2. 获取组内输出节点
getGroupOutputNodes(groupName) {
    const group = app.graph._groups.find(g => g.title === groupName);

    // 获取边界框内的所有节点
    const groupNodes = app.graph._nodes.filter(node =>
        LiteGraph.overlapBounding(group._bounding, node.getBounding())
    );

    // 只返回输出节点
    return groupNodes.filter(n =>
        n.mode !== LiteGraph.NEVER &&
        n.constructor.nodeData?.output_node === true
    );
}
```

### 执行流程

```
用户点击 Queue Prompt
       ↓
Python: execute() 被调用
       ↓
JavaScript: onExecuted() Hook 触发
       ↓
executeAllGroups() 开始
       ↓
for each group in groups:
    ├─ 显示状态: "执行 1/3: 组名"
    ├─ 获取组内输出节点
    ├─ queueManager.queueOutputNodes(nodeIds)
    │   └─ 只执行这些节点及其依赖
    ├─ waitForQueue() 等待完成
    └─ 继续下一个组
       ↓
显示完成状态
       ↓
重置 isExecuting 标志
```

### 多语言集成

```javascript
// 创建命名空间绑定的翻译函数
const t = (key) => globalMultiLanguageManager.t(`group_manager.${key}`);

// 使用
addButton.innerHTML = `+ ${t('addGroup') || '添加组'}`;
deleteButton.innerHTML = `✕ ${t('deleteGroup') || '删除'}`;
```

**翻译键**:
- `addGroup`: 添加组按钮
- `deleteGroup`: 删除按钮
- `messages.*`: 各种消息提示
- `status.*`: 执行状态文本
- `dialogs.*`: 对话框文本

### Toast 通知

```javascript
// 成功
globalToastManager.showToast('添加成功: 组1', 'success', 2000);

// 错误
globalToastManager.showToast('组中没有输出节点', 'error', 3000);

// 警告
globalToastManager.showToast('正在执行中', 'warning', 2000);

// 信息
globalToastManager.showToast('🚀 开始执行', 'info', 4000);
```

## 更新日志

### v2.0.0 (2025-10-17)
- 🎨 **重大UI改版**: 简化设计，红色边框白色背景
- ❌ **移除延迟功能**: 简化逻辑，聚焦核心功能
- ❌ **移除拖拽排序**: 简化交互，提高稳定性
- ✅ **修复DOM初始化**: 添加隐藏widget存储数据
- ✅ **修复Python节点**: 移除无效参数
- ✅ **完善多语言**: 所有UI文本支持翻译
- ✅ **优化Toast**: 集成全局Toast系统
- 📝 **完善文档**: 添加详细技术说明

### v1.1.0 (2025-10)
- ✨ **新增下拉菜单选择组功能**
  - 自动获取工作流中所有组名称
  - 添加组时通过下拉菜单选择，无需手动输入
  - 点击组名可打开下拉菜单更换组
  - 精美的下拉菜单UI，支持hover高亮
  - 自动标记当前选中的组
  - 支持滚动显示大量组
- 🎨 在组名旁添加下拉箭头视觉提示
- ⚡ 优化UI渲染性能（渐变缓存、纯色替代）

### v1.0.0 (2025-10)
- ✨ 初始版本发布
- ✨ 支持组列表管理
- ✨ 支持拖拽排序（已在v2.0移除）
- ✨ 支持延迟设置（已在v2.0移除）
- ✨ 集成多语言系统
- ✨ 集成Toast提示系统
- ✨ 自定义GUI界面
- ✨ 点击延迟输入框快速编辑（已在v2.0移除）

## 贡献

欢迎提交Issue和Pull Request!

## 许可

与ComfyUI-Danbooru-Gallery项目保持一致
