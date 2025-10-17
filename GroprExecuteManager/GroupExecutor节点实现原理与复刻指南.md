# GroupExecutor 节点实现原理与复刻指南

## 目录
1. [整体架构设计](#整体架构设计)
2. [核心概念](#核心概念)
3. [技术实现原理](#技术实现原理)
4. [关键代码详解](#关键代码详解)
5. [复刻步骤指南](#复刻步骤指南)
6. [难点与注意事项](#难点与注意事项)

---

## 整体架构设计

### 系统组件图

```
┌─────────────────────────────────────────────────────────────┐
│                    ComfyUI Workflow 工作流                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────┐      ┌────────────────┐      ┌────────┐ │
│  │ GroupExecutor  │─────▶│ GroupExecutor  │─────▶│ Group  │ │
│  │    Single      │      │    Single      │      │Executor│ │
│  │   (Group A)    │      │   (Group B)    │      │ Sender │ │
│  └────────────────┘      └────────────────┘      └────────┘ │
│         │                        │                     │     │
│         └────────SIGNAL 信号链────┴─────────────────────┘     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Python Backend 后端                        │
├─────────────────────────────────────────────────────────────┤
│  GroupExecutorSender.execute()                               │
│    ├─ 收集 SIGNAL 信号                                        │
│    ├─ 转换为 execution_list                                  │
│    └─ PromptServer.send_sync("execute_group_list", {...})   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ WebSocket
┌─────────────────────────────────────────────────────────────┐
│                 JavaScript Frontend 前端                      │
├─────────────────────────────────────────────────────────────┤
│  api.addEventListener("execute_group_list", async ({ detail })│
│    ├─ 解析 execution_list                                    │
│    ├─ 遍历每个执行项                                         │
│    │   ├─ 查找 Group 内的 Output Nodes                       │
│    │   ├─ 使用 QueueManager 过滤并提交任务                   │
│    │   ├─ 等待队列执行完成                                   │
│    │   └─ 执行延迟（如果有）                                 │
│    └─ 更新 UI 状态                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    ComfyUI Queue 队列系统                     │
├─────────────────────────────────────────────────────────────┤
│  QueueManager.queueOutputNodes(nodeIds)                      │
│    ├─ Hook app.queuePrompt()                                │
│    ├─ Hook api.queuePrompt()                                │
│    ├─ 过滤 prompt.output，只保留目标节点及其依赖            │
│    └─ 提交到 ComfyUI 原生队列                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 核心概念

### 1. SIGNAL 信号类型

**定义**: SIGNAL 是一种自定义数据类型，用于在节点间传递执行指令。

**数据结构**:
```python
# 单个执行指令
{
    "group_name": "MyGroup",      # 组名称
    "repeat_count": 3,            # 重复次数
    "delay_seconds": 0.5          # 每次执行间延迟（秒）
}

# 信号链（多个指令）
[
    {"group_name": "GroupA", "repeat_count": 1, "delay_seconds": 0.0},
    {"group_name": "GroupB", "repeat_count": 2, "delay_seconds": 1.0},
    {"group_name": "__delay__", "repeat_count": 1, "delay_seconds": 3.0}  # 特殊延迟标记
]
```

**特殊标记**:
- `__delay__`: 特殊的组名，表示这是一个纯延迟指令，不执行任何节点

### 2. 节点角色

| 节点名称 | 类型 | 作用 |
|---------|------|------|
| **GroupExecutorSingle** | 信号生成器 | 创建单个执行指令并追加到信号链 |
| **GroupExecutorRepeater** | 信号处理器 | 复制整个信号链并插入延迟标记 |
| **GroupExecutorSender** | 终端节点 | 接收信号链并触发实际执行 |

### 3. 执行流程

```
Step 1: 构建信号链
  GroupExecutorSingle (GroupA) → 生成 execution_A
  GroupExecutorSingle (GroupB) → 接收 execution_A，追加 execution_B
  信号链: [execution_A, execution_B]

Step 2: (可选) 信号增强
  GroupExecutorRepeater → 复制信号链 3 次，插入延迟
  信号链: [execution_A, execution_B, __delay__, execution_A, execution_B, __delay__, ...]

Step 3: 触发执行
  GroupExecutorSender → 接收最终信号链
  PromptServer.send_sync() → 通过 WebSocket 发送到前端

Step 4: 前端异步执行
  JavaScript 监听器 → 接收 execute_group_list 事件
  For each execution in execution_list:
    If group_name == "__delay__":
      等待 delay_seconds
    Else:
      查找组内 Output Nodes → 过滤依赖 → 提交队列 → 等待完成 → 延迟
```

---

## 技术实现原理

### 1. Python 后端实现

#### 1.1 GroupExecutorSingle 节点

**文件**: `py/lgutils.py` (Lines 7-51)

**核心逻辑**:
```python
def execute_group(self, group_name, repeat_count, delay_seconds, unique_id, signal=None):
    # 构建当前执行指令
    current_execution = {
        "group_name": group_name,
        "repeat_count": repeat_count,
        "delay_seconds": delay_seconds
    }

    # 信号链接逻辑
    if signal is not None:
        if isinstance(signal, list):
            # 如果输入是列表，追加到末尾
            signal.append(current_execution)
            return (signal,)
        else:
            # 如果输入是单个对象，转换为列表
            return ([signal, current_execution],)

    # 没有输入信号，返回单个执行指令
    return (current_execution,)
```

**关键设计点**:
1. **可选输入**: `signal` 参数为可选，支持独立使用或链式连接
2. **自动列表化**: 自动将单个信号转换为列表，简化后续处理
3. **原地修改**: 对列表类型的 signal 直接追加，避免复制开销

#### 1.2 GroupExecutorSender 节点

**文件**: `py/lgutils.py` (Lines 53-90)

**核心逻辑**:
```python
def execute(self, signal, unique_id):
    if not signal:
        raise ValueError("没有收到执行信号")

    # 统一转换为列表格式
    execution_list = signal if isinstance(signal, list) else [signal]

    # 通过 WebSocket 发送到前端
    PromptServer.instance.send_sync(
        "execute_group_list", {
            "node_id": unique_id,        # 发送节点的 ID
            "execution_list": execution_list  # 执行指令列表
        }
    )

    return ()
```

**关键设计点**:
1. **OUTPUT_NODE = True**: 标记为输出节点，允许用户手动触发
2. **send_sync()**: 同步发送消息，确保消息立即发送
3. **unique_id**: 用于前端定位节点，更新状态显示

#### 1.3 GroupExecutorRepeater 节点

**文件**: `py/lgutils.py` (Lines 92-143)

**核心逻辑**:
```python
def repeat(self, signal, repeat_count, group_delay):
    execution_list = signal if isinstance(signal, list) else [signal]

    repeated_list = []
    for i in range(repeat_count):
        # 复制整个执行列表
        repeated_list.extend(execution_list)

        # 在每组之间插入延迟标记（最后一组除外）
        if i < repeat_count - 1:
            repeated_list.append({
                "group_name": "__delay__",
                "repeat_count": 1,
                "delay_seconds": group_delay
            })

    return (repeated_list,)
```

**关键设计点**:
1. **整体复制**: 复制整个信号链而不是单个指令
2. **延迟插入**: 在组间插入 `__delay__` 标记，控制批次间间隔
3. **灵活组合**: 可以嵌套使用，实现复杂的执行模式

---

### 2. JavaScript 前端实现

#### 2.1 节点 UI 扩展

**文件**: `web/groupexecutorsender.js` (Lines 7-62)

**状态管理**:
```javascript
nodeType.prototype.onNodeCreated = function() {
    this.properties = {
        isExecuting: false,      // 是否正在执行
        isCancelling: false,     // 是否正在取消
        statusText: "",          // 状态文本
        showStatus: false        // 是否显示状态
    };
};
```

**状态显示**:
```javascript
nodeType.prototype.onDrawForeground = function(ctx) {
    if (!this.flags.collapsed && this.properties.showStatus) {
        ctx.save();
        ctx.font = "bold 30px sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = this.properties.isExecuting ? "dodgerblue" : "limegreen";

        const centerX = this.size[0] / 2;
        const centerY = this.size[1] / 2 + 10;
        ctx.fillText(this.properties.statusText, centerX, centerY);
        ctx.restore();
    }
};
```

**关键设计点**:
1. **Canvas 绘制**: 使用 LiteGraph 的 onDrawForeground hook 绘制状态
2. **动态颜色**: 执行中显示蓝色，完成显示绿色
3. **居中显示**: 计算节点中心位置，确保文本居中

#### 2.2 查找组内输出节点

**文件**: `web/groupexecutorsender.js` (Lines 64-89)

```javascript
nodeType.prototype.getGroupOutputNodes = function(groupName) {
    // 1. 根据名称查找组
    const group = app.graph._groups.find(g => g.title === groupName);
    if (!group) {
        console.warn(`未找到名为 "${groupName}" 的组`);
        return [];
    }

    // 2. 查找组边界内的所有节点
    const groupNodes = [];
    for (const node of app.graph._nodes) {
        if (!node || !node.pos) continue;
        // 使用 LiteGraph 的边界重叠检测
        if (LiteGraph.overlapBounding(group._bounding, node.getBounding())) {
            groupNodes.push(node);
        }
    }
    group._nodes = groupNodes;

    // 3. 过滤出输出节点
    return this.getOutputNodes(group._nodes);
};

nodeType.prototype.getOutputNodes = function(nodes) {
    return nodes.filter((n) => {
        return n.mode !== LiteGraph.NEVER &&           // 节点未禁用
               n.constructor.nodeData?.output_node === true;  // 是输出节点
    });
};
```

**关键设计点**:
1. **边界检测**: 使用 `LiteGraph.overlapBounding()` 判断节点是否在组内
2. **动态计算**: 每次执行时重新计算组内节点，支持动态修改
3. **双重过滤**: 先过滤组内节点，再过滤输出节点

#### 2.3 队列状态监控

**文件**: `web/groupexecutorsender.js` (Lines 91-122)

```javascript
nodeType.prototype.getQueueStatus = async function() {
    try {
        const response = await api.fetchApi('/queue');
        const data = await response.json();

        const queueRunning = data.queue_running || [];
        const queuePending = data.queue_pending || [];

        return {
            isRunning: queueRunning.length > 0,
            isPending: queuePending.length > 0,
            runningCount: queueRunning.length,
            pendingCount: queuePending.length
        };
    } catch (error) {
        console.error('获取队列状态失败:', error);
        return { isRunning: false, isPending: false };
    }
};
```

**等待队列完成**:
```javascript
nodeType.prototype.waitForQueue = async function() {
    return new Promise((resolve) => {
        const checkQueue = async () => {
            // 检查是否被取消
            if (this.properties.isCancelling) {
                resolve();
                return;
            }

            const status = await this.getQueueStatus();

            // 队列为空，执行完成
            if (!status.isRunning && !status.isPending) {
                setTimeout(resolve, 100);  // 额外延迟 100ms 确保完成
                return;
            }

            // 继续检查
            setTimeout(checkQueue, 500);  // 每 500ms 检查一次
        };

        checkQueue();
    });
};
```

**关键设计点**:
1. **轮询机制**: 每 500ms 检查一次队列状态
2. **取消支持**: 检测 `isCancelling` 标志，立即返回
3. **额外延迟**: 队列空后再等待 100ms，确保所有操作完成

#### 2.4 主执行循环

**文件**: `web/groupexecutorsender.js` (Lines 196-338)

```javascript
api.addEventListener("execute_group_list", async ({ detail }) => {
    const node = app.graph._nodes_by_id[detail.node_id];
    const executionList = detail.execution_list;

    // 防止重复执行
    if (node.properties.isExecuting) {
        console.warn('已有执行任务在进行中');
        return;
    }

    node.properties.isExecuting = true;
    node.properties.isCancelling = false;

    // 计算总任务数（用于进度显示）
    let totalTasks = executionList.reduce((total, item) => {
        if (item.group_name !== "__delay__") {
            return total + (parseInt(item.repeat_count) || 1);
        }
        return total;
    }, 0);
    let currentTask = 0;

    try {
        for (const execution of executionList) {
            // 检查取消标志
            if (node.properties.isCancelling) break;

            const group_name = execution.group_name;
            const repeat_count = parseInt(execution.repeat_count) || 1;
            const delay_seconds = parseFloat(execution.delay_seconds) || 0;

            // 处理延迟标记
            if (group_name === "__delay__") {
                if (delay_seconds > 0) {
                    node.updateStatus(`等待下一组 ${delay_seconds}s...`);
                    await new Promise(resolve =>
                        setTimeout(resolve, delay_seconds * 1000)
                    );
                }
                continue;
            }

            // 执行重复次数
            for (let i = 0; i < repeat_count; i++) {
                if (node.properties.isCancelling) break;

                currentTask++;
                const progress = (currentTask / totalTasks) * 100;
                node.updateStatus(
                    `执行组: ${group_name} (${currentTask}/${totalTasks}) - 第${i + 1}/${repeat_count}次`
                );

                // 查找并执行输出节点
                const outputNodes = node.getGroupOutputNodes(group_name);
                if (!outputNodes || !outputNodes.length) {
                    throw new Error(`组 "${group_name}" 中没有找到输出节点`);
                }

                const nodeIds = outputNodes.map(n => n.id);
                await queueManager.queueOutputNodes(nodeIds);
                await node.waitForQueue();

                // 执行间延迟
                if (delay_seconds > 0 && i < repeat_count - 1) {
                    node.updateStatus(`等待 ${delay_seconds}s...`);
                    await new Promise(resolve =>
                        setTimeout(resolve, delay_seconds * 1000)
                    );
                }
            }
        }

        // 完成或取消
        if (node.properties.isCancelling) {
            node.updateStatus("已取消");
        } else {
            node.updateStatus(`执行完成 (${totalTasks}/${totalTasks})`);
        }
        setTimeout(() => node.resetStatus(), 2000);

    } catch (error) {
        console.error('执行错误:', error);
        node.updateStatus(`错误: ${error.message}`);
    } finally {
        node.properties.isExecuting = false;
        node.properties.isCancelling = false;
    }
});
```

**关键设计点**:
1. **异步执行**: 使用 async/await 处理所有异步操作
2. **进度追踪**: 实时计算并显示执行进度
3. **错误处理**: try-catch-finally 确保状态正确恢复
4. **取消检查**: 在每个关键点检查取消标志

---

### 3. QueueManager 队列管理器

**文件**: `web/queue_utils.js`

#### 3.1 核心机制：Hook 机制

QueueManager 通过劫持 ComfyUI 的原生方法来实现节点过滤功能：

```javascript
class QueueManager {
    constructor() {
        this.queueNodeIds = null;  // 存储要执行的节点 ID 列表
        this.initializeHooks();
    }

    initializeHooks() {
        const originalApiQueuePrompt = api.queuePrompt;

        // 劫持 api.queuePrompt 方法
        api.queuePrompt = async function(index, prompt) {
            // 如果设置了目标节点列表
            if (this.queueNodeIds && this.queueNodeIds.length && prompt.output) {
                const oldOutput = prompt.output;
                let newOutput = {};

                // 递归添加目标节点及其所有依赖
                for (const queueNodeId of this.queueNodeIds) {
                    this.recursiveAddNodes(String(queueNodeId), oldOutput, newOutput);
                }

                // 替换 prompt.output，只保留过滤后的节点
                prompt.output = newOutput;
            }

            // 调用原始方法
            return originalApiQueuePrompt.apply(api, [index, prompt]);
        }.bind(this);
    }
}
```

#### 3.2 递归依赖收集

```javascript
recursiveAddNodes(nodeId, oldOutput, newOutput) {
    let currentNode = oldOutput[nodeId];

    // 如果节点已经添加，跳过
    if (newOutput[nodeId] != null) return;

    // 添加当前节点
    newOutput[nodeId] = currentNode;

    // 递归添加所有输入节点
    for (const inputValue of Object.values(currentNode.inputs || [])) {
        if (Array.isArray(inputValue)) {
            // inputValue 格式: [nodeId, slotIndex]
            this.recursiveAddNodes(inputValue[0], oldOutput, newOutput);
        }
    }

    return newOutput;
}
```

**工作原理示例**:

假设工作流有以下节点：
```
A (LoadImage) → B (ImageScale) → C (SaveImage)  ← 我们要执行这个
                ↓
                D (PreviewImage)
```

原始 `prompt.output`:
```json
{
    "A": { "class_type": "LoadImage", "inputs": {...} },
    "B": { "class_type": "ImageScale", "inputs": { "image": ["A", 0] } },
    "C": { "class_type": "SaveImage", "inputs": { "images": ["B", 0] } },
    "D": { "class_type": "PreviewImage", "inputs": { "images": ["B", 0] } }
}
```

调用 `queueOutputNodes(["C"])` 后，过滤后的 `prompt.output`:
```json
{
    "C": { "class_type": "SaveImage", "inputs": { "images": ["B", 0] } },
    "B": { "class_type": "ImageScale", "inputs": { "image": ["A", 0] } },
    "A": { "class_type": "LoadImage", "inputs": {...} }
}
```

节点 D 被过滤掉，因为它不是 C 的依赖。

#### 3.3 使用方式

```javascript
async queueOutputNodes(nodeIds) {
    try {
        // 设置目标节点 ID
        this.queueNodeIds = nodeIds;

        // 调用 app.queuePrompt()，会触发劫持的方法
        await app.queuePrompt();
    } finally {
        // 清除目标节点 ID，恢复正常行为
        this.queueNodeIds = null;
    }
}
```

---

## 关键代码详解

### 1. 信号链构建过程

**场景**: 用户连接了 3 个 GroupExecutorSingle 节点

```
[GroupA] → [GroupB] → [GroupC] → [Sender]
```

**执行过程**:

```python
# Step 1: GroupA 执行
signal_a = execute_group("GroupA", 1, 0.5, signal=None)
# 返回: {"group_name": "GroupA", "repeat_count": 1, "delay_seconds": 0.5}

# Step 2: GroupB 执行
signal_b = execute_group("GroupB", 2, 1.0, signal=signal_a)
# signal_a 是字典，不是列表
# 返回: [
#   {"group_name": "GroupA", "repeat_count": 1, "delay_seconds": 0.5},
#   {"group_name": "GroupB", "repeat_count": 2, "delay_seconds": 1.0}
# ]

# Step 3: GroupC 执行
signal_c = execute_group("GroupC", 1, 0.0, signal=signal_b)
# signal_b 是列表，直接追加
# signal_b.append({"group_name": "GroupC", "repeat_count": 1, "delay_seconds": 0.0})
# 返回: [
#   {"group_name": "GroupA", "repeat_count": 1, "delay_seconds": 0.5},
#   {"group_name": "GroupB", "repeat_count": 2, "delay_seconds": 1.0},
#   {"group_name": "GroupC", "repeat_count": 1, "delay_seconds": 0.0}
# ]
```

### 2. Repeater 节点的作用

**场景**: 对上述信号链重复 2 次，间隔 3 秒

```python
repeated_signal = repeat(signal_c, repeat_count=2, group_delay=3.0)
# 返回: [
#   # 第一轮
#   {"group_name": "GroupA", "repeat_count": 1, "delay_seconds": 0.5},
#   {"group_name": "GroupB", "repeat_count": 2, "delay_seconds": 1.0},
#   {"group_name": "GroupC", "repeat_count": 1, "delay_seconds": 0.0},
#   # 延迟标记
#   {"group_name": "__delay__", "repeat_count": 1, "delay_seconds": 3.0},
#   # 第二轮
#   {"group_name": "GroupA", "repeat_count": 1, "delay_seconds": 0.5},
#   {"group_name": "GroupB", "repeat_count": 2, "delay_seconds": 1.0},
#   {"group_name": "GroupC", "repeat_count": 1, "delay_seconds": 0.0}
# ]
```

### 3. 前端执行时序

```javascript
// 假设 execution_list 如上所示
for (const execution of execution_list) {
    if (execution.group_name === "__delay__") {
        // 等待 3 秒
        await sleep(3000);
        continue;
    }

    // 执行 GroupA，重复 1 次
    // → 提交队列 → 等待完成 → 延迟 0.5 秒

    // 执行 GroupB，重复 2 次
    // → 第 1 次：提交队列 → 等待完成 → 延迟 1 秒
    // → 第 2 次：提交队列 → 等待完成 → 延迟 1 秒

    // 执行 GroupC，重复 1 次
    // → 提交队列 → 等待完成 → 无延迟
}
```

**总执行时间**:
```
第一轮:
  GroupA: 1次 * (执行时间 + 0.5s)
  GroupB: 2次 * (执行时间 + 1s)
  GroupC: 1次 * (执行时间 + 0s)

延迟: 3s

第二轮:
  GroupA: 1次 * (执行时间 + 0.5s)
  GroupB: 2次 * (执行时间 + 1s)
  GroupC: 1次 * (执行时间 + 0s)
```

---

## 复刻步骤指南

### 步骤 1: 创建基础文件结构

```
your-custom-nodes/
├── __init__.py
├── py/
│   └── group_executor_nodes.py
└── web/
    ├── group_executor_sender.js
    └── queue_manager.js
```

### 步骤 2: 实现 Python 节点

#### 2.1 创建 `py/group_executor_nodes.py`

```python
from server import PromptServer

class GroupExecutorSingle:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "group_name": ("STRING", {"default": ""}),
                "repeat_count": ("INT", {"default": 1, "min": 1, "max": 100}),
                "delay_seconds": ("FLOAT", {"default": 0.0, "min": 0.0, "max": 60.0}),
            },
            "optional": {
                "signal": ("SIGNAL",),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID"
            }
        }

    RETURN_TYPES = ("SIGNAL",)
    FUNCTION = "execute_group"
    CATEGORY = "custom/group_executor"

    def execute_group(self, group_name, repeat_count, delay_seconds, unique_id, signal=None):
        current_execution = {
            "group_name": group_name,
            "repeat_count": repeat_count,
            "delay_seconds": delay_seconds
        }

        if signal is not None:
            if isinstance(signal, list):
                signal.append(current_execution)
                return (signal,)
            else:
                return ([signal, current_execution],)

        return (current_execution,)


class GroupExecutorSender:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "signal": ("SIGNAL",),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID"
            }
        }

    RETURN_TYPES = ()
    FUNCTION = "execute"
    CATEGORY = "custom/group_executor"
    OUTPUT_NODE = True

    def execute(self, signal, unique_id):
        execution_list = signal if isinstance(signal, list) else [signal]

        PromptServer.instance.send_sync(
            "execute_group_list", {
                "node_id": unique_id,
                "execution_list": execution_list
            }
        )

        return ()
```

#### 2.2 创建 `__init__.py`

```python
from .py.group_executor_nodes import GroupExecutorSingle, GroupExecutorSender

NODE_CLASS_MAPPINGS = {
    "GroupExecutorSingle": GroupExecutorSingle,
    "GroupExecutorSender": GroupExecutorSender,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "GroupExecutorSingle": "Group Executor Single",
    "GroupExecutorSender": "Group Executor Sender",
}

WEB_DIRECTORY = "./web"

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS', 'WEB_DIRECTORY']
```

### 步骤 3: 实现 JavaScript QueueManager

#### 3.1 创建 `web/queue_manager.js`

```javascript
import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

class QueueManager {
    constructor() {
        this.queueNodeIds = null;
        this.initializeHooks();
    }

    initializeHooks() {
        const originalApiQueuePrompt = api.queuePrompt;

        api.queuePrompt = async function(index, prompt) {
            if (this.queueNodeIds && this.queueNodeIds.length && prompt.output) {
                const oldOutput = prompt.output;
                let newOutput = {};

                for (const queueNodeId of this.queueNodeIds) {
                    this.recursiveAddNodes(String(queueNodeId), oldOutput, newOutput);
                }

                prompt.output = newOutput;
            }

            return originalApiQueuePrompt.apply(api, [index, prompt]);
        }.bind(this);
    }

    recursiveAddNodes(nodeId, oldOutput, newOutput) {
        let currentNode = oldOutput[nodeId];

        if (newOutput[nodeId] != null) return;

        newOutput[nodeId] = currentNode;

        for (const inputValue of Object.values(currentNode.inputs || [])) {
            if (Array.isArray(inputValue)) {
                this.recursiveAddNodes(inputValue[0], oldOutput, newOutput);
            }
        }
    }

    async queueOutputNodes(nodeIds) {
        try {
            this.queueNodeIds = nodeIds;
            await app.queuePrompt();
        } finally {
            this.queueNodeIds = null;
        }
    }
}

export const queueManager = new QueueManager();
```

### 步骤 4: 实现 JavaScript 前端逻辑

#### 4.1 创建 `web/group_executor_sender.js`

```javascript
import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { queueManager } from "./queue_manager.js";

app.registerExtension({
    name: "GroupExecutorSender",

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== "GroupExecutorSender") return;

        // 初始化节点属性
        nodeType.prototype.onNodeCreated = function() {
            this.properties = {
                isExecuting: false,
                isCancelling: false,
                statusText: "",
                showStatus: false
            };
        };

        // 绘制状态文本
        const onDrawForeground = nodeType.prototype.onDrawForeground;
        nodeType.prototype.onDrawForeground = function(ctx) {
            const r = onDrawForeground?.apply?.(this, arguments);

            if (!this.flags.collapsed && this.properties.showStatus) {
                ctx.save();
                ctx.font = "bold 30px sans-serif";
                ctx.textAlign = "center";
                ctx.fillStyle = this.properties.isExecuting ? "dodgerblue" : "limegreen";

                const centerX = this.size[0] / 2;
                const centerY = this.size[1] / 2 + 10;
                ctx.fillText(this.properties.statusText, centerX, centerY);
                ctx.restore();
            }

            return r;
        };

        // 更新状态方法
        nodeType.prototype.updateStatus = function(text) {
            this.properties.statusText = text;
            this.properties.showStatus = true;
            this.setDirtyCanvas(true, true);
        };

        nodeType.prototype.resetStatus = function() {
            this.properties.statusText = "";
            this.properties.showStatus = false;
            this.setDirtyCanvas(true, true);
        };

        // 查找组内输出节点
        nodeType.prototype.getGroupOutputNodes = function(groupName) {
            const group = app.graph._groups.find(g => g.title === groupName);
            if (!group) return [];

            const groupNodes = [];
            for (const node of app.graph._nodes) {
                if (!node || !node.pos) continue;
                if (LiteGraph.overlapBounding(group._bounding, node.getBounding())) {
                    groupNodes.push(node);
                }
            }

            return groupNodes.filter((n) => {
                return n.mode !== LiteGraph.NEVER &&
                       n.constructor.nodeData?.output_node === true;
            });
        };

        // 获取队列状态
        nodeType.prototype.getQueueStatus = async function() {
            try {
                const response = await api.fetchApi('/queue');
                const data = await response.json();

                return {
                    isRunning: (data.queue_running || []).length > 0,
                    isPending: (data.queue_pending || []).length > 0
                };
            } catch (error) {
                return { isRunning: false, isPending: false };
            }
        };

        // 等待队列完成
        nodeType.prototype.waitForQueue = async function() {
            return new Promise((resolve) => {
                const checkQueue = async () => {
                    if (this.properties.isCancelling) {
                        resolve();
                        return;
                    }

                    const status = await this.getQueueStatus();

                    if (!status.isRunning && !status.isPending) {
                        setTimeout(resolve, 100);
                        return;
                    }

                    setTimeout(checkQueue, 500);
                };

                checkQueue();
            });
        };

        // 监听执行事件
        api.addEventListener("execute_group_list", async ({ detail }) => {
            const node = app.graph._nodes_by_id[detail.node_id];
            if (!node || node.properties.isExecuting) return;

            const executionList = detail.execution_list;

            node.properties.isExecuting = true;
            node.properties.isCancelling = false;

            try {
                for (const execution of executionList) {
                    if (node.properties.isCancelling) break;

                    const { group_name, repeat_count, delay_seconds } = execution;

                    // 处理延迟
                    if (group_name === "__delay__") {
                        if (delay_seconds > 0) {
                            node.updateStatus(`等待 ${delay_seconds}s...`);
                            await new Promise(resolve =>
                                setTimeout(resolve, delay_seconds * 1000)
                            );
                        }
                        continue;
                    }

                    // 执行组
                    for (let i = 0; i < repeat_count; i++) {
                        if (node.properties.isCancelling) break;

                        node.updateStatus(`执行: ${group_name} (${i + 1}/${repeat_count})`);

                        const outputNodes = node.getGroupOutputNodes(group_name);
                        if (!outputNodes.length) {
                            throw new Error(`组 "${group_name}" 无输出节点`);
                        }

                        const nodeIds = outputNodes.map(n => n.id);
                        await queueManager.queueOutputNodes(nodeIds);
                        await node.waitForQueue();

                        if (delay_seconds > 0 && i < repeat_count - 1) {
                            await new Promise(resolve =>
                                setTimeout(resolve, delay_seconds * 1000)
                            );
                        }
                    }
                }

                node.updateStatus("完成");
                setTimeout(() => node.resetStatus(), 2000);

            } catch (error) {
                console.error('执行错误:', error);
                node.updateStatus(`错误: ${error.message}`);
            } finally {
                node.properties.isExecuting = false;
                node.properties.isCancelling = false;
            }
        });
    }
});
```

### 步骤 5: 测试

1. **重启 ComfyUI**
2. **创建测试工作流**:
   ```
   - 创建 2 个 Group (在画布上右键 → Add Group)
   - 命名为 "GroupA" 和 "GroupB"
   - 在每个 Group 内放置至少一个输出节点 (如 SaveImage)
   - 添加 GroupExecutorSingle 节点，设置 group_name 为 "GroupA"
   - 添加第二个 GroupExecutorSingle，连接第一个的 signal 输出，设置 group_name 为 "GroupB"
   - 添加 GroupExecutorSender，连接最后一个 signal 输出
   - 点击 Queue Prompt
   ```

3. **验证功能**:
   - 应该依次执行 GroupA 和 GroupB
   - Sender 节点应显示执行状态
   - 检查控制台无错误

---

## 难点与注意事项

### 1. ComfyUI 类型系统

**难点**: ComfyUI 的自定义类型 (如 `SIGNAL`) 不是真正的 Python 类型，只是字符串标识。

**解决方案**:
- 在 `INPUT_TYPES` 中使用字符串 `("SIGNAL",)` 声明类型
- 实际传递的数据可以是任何 Python 对象 (字典、列表等)
- ComfyUI 只检查类型名称匹配，不检查数据结构

**注意事项**:
```python
# 正确
RETURN_TYPES = ("SIGNAL",)

# 错误 - 不能使用 Python 类
class Signal:
    pass
RETURN_TYPES = (Signal,)  # ComfyUI 不认识
```

### 2. 信号链的可变性

**难点**: Python 的列表是可变对象，直接修改会影响原始数据。

**当前实现**:
```python
if isinstance(signal, list):
    signal.append(current_execution)  # 原地修改
    return (signal,)
```

**潜在问题**: 如果信号链被多个节点引用，会产生意外结果。

**改进方案**:
```python
if isinstance(signal, list):
    new_signal = signal.copy()  # 浅拷贝
    new_signal.append(current_execution)
    return (new_signal,)
```

**权衡**: 原地修改性能更好，浅拷贝更安全。当前实现选择性能，因为 ComfyUI 的执行模型通常不会重用信号。

### 3. 异步执行与取消

**难点**: JavaScript 的 async/await 不能被外部中断，需要手动检查取消标志。

**实现策略**:
```javascript
// 在每个 await 点之后检查取消标志
for (const execution of executionList) {
    if (node.properties.isCancelling) break;  // ← 检查点 1

    for (let i = 0; i < repeat_count; i++) {
        if (node.properties.isCancelling) break;  // ← 检查点 2

        await queueManager.queueOutputNodes(nodeIds);

        if (node.properties.isCancelling) break;  // ← 检查点 3

        await node.waitForQueue();
    }
}
```

**注意事项**:
- 必须在所有 `await` 后检查取消标志
- 不能在 Promise 内部检查 (已经提交的任务无法取消)
- 使用 `finally` 块确保状态恢复

### 4. 队列过滤的时机

**难点**: 必须在 ComfyUI 生成 prompt 后、发送到后端前进行过滤。

**Hook 时机**:
```javascript
app.queuePrompt()  // 用户触发
  └→ app.graphToPrompt()  // 生成 prompt
      └→ api.queuePrompt(index, prompt)  // ← 在这里 Hook
          └→ fetch('/prompt', ...)  // 发送到后端
```

**错误 Hook 点**:
```javascript
// 错误: Hook graphToPrompt 太早，prompt 还未生成
app.graphToPrompt = ...

// 正确: Hook api.queuePrompt，prompt 已生成
api.queuePrompt = async function(index, prompt) {
    // 修改 prompt.output
}
```

### 5. 组边界检测的精度

**难点**: LiteGraph 的组边界是动态计算的，节点移动后可能超出边界。

**当前实现**:
```javascript
if (LiteGraph.overlapBounding(group._bounding, node.getBounding())) {
    groupNodes.push(node);
}
```

**注意事项**:
- `group._bounding` 格式: `[x, y, width, height]`
- 节点即使部分重叠也会被包含
- 节点必须有有效的 `pos` 属性

**改进建议**:
```javascript
// 检查节点中心点是否在组内
const nodeBounding = node.getBounding();
const nodeCenter = [
    nodeBounding[0] + nodeBounding[2] / 2,
    nodeBounding[1] + nodeBounding[3] / 2
];

if (isPointInBounding(nodeCenter, group._bounding)) {
    groupNodes.push(node);
}
```

### 6. WebSocket 消息同步

**难点**: `PromptServer.send_sync()` 是同步发送，但前端处理是异步的。

**时序图**:
```
Python Backend                  JavaScript Frontend
     |                                |
     | send_sync("execute_group_list")|
     |------------------------------->|
     | 立即返回                        |
     |                                | addEventListener 触发
     |                                | async 执行开始
     |                                | ... 异步执行中 ...
     |                                | 执行完成
```

**注意事项**:
- Python 的 `execute()` 方法会立即返回，不会等待 JS 执行完成
- 如果需要等待，需要实现反向通信 (JS 通知 Python 完成)
- 当前实现不需要等待，因为 Sender 是终端节点

### 7. 节点 ID 的持久性

**难点**: `unique_id` 在工作流保存/加载后会改变。

**影响**:
- `detail.node_id` 是节点的唯一标识
- 重新加载工作流后，`unique_id` 会重新分配
- 不能用 `unique_id` 作为持久化存储的键

**解决方案**:
- 使用 `unique_id` 查找当前会话的节点实例
- 如果需要持久化，使用节点的 `title` 或自定义属性

### 8. 错误处理策略

**难点**: 执行过程中的错误不应中断整个流程。

**当前实现**:
```javascript
try {
    for (const execution of executionList) {
        // 执行逻辑
    }
} catch (error) {
    // 捕获所有错误
    node.updateStatus(`错误: ${error.message}`);
}
```

**改进建议**:
```javascript
for (const execution of executionList) {
    try {
        // 执行单个组
    } catch (error) {
        // 记录错误但继续执行
        console.error(`执行 ${execution.group_name} 失败:`, error);

        // 询问用户是否继续
        const shouldContinue = await confirmDialog(
            `执行 ${execution.group_name} 失败，是否继续?`
        );

        if (!shouldContinue) break;
    }
}
```

---

## 高级扩展建议

### 1. 条件执行

添加条件判断，根据前一组的输出决定是否执行下一组：

```python
class GroupExecutorConditional:
    def execute_group(self, group_name, condition_type, signal=None):
        current_execution = {
            "group_name": group_name,
            "condition": condition_type,  # "on_success", "on_error", "always"
        }
        # ...
```

### 2. 并行执行

允许多个组同时执行：

```python
current_execution = {
    "group_name": ["GroupA", "GroupB"],  # 并行执行多个组
    "mode": "parallel"
}
```

### 3. 执行历史记录

保存执行历史，支持重放：

```javascript
class ExecutionHistory {
    constructor() {
        this.history = [];
    }

    record(execution_list, result) {
        this.history.push({
            timestamp: Date.now(),
            execution_list,
            result
        });
    }

    async replay(index) {
        const record = this.history[index];
        // 重新执行
    }
}
```

### 4. 可视化编辑器

创建图形化界面编辑执行序列：

```javascript
class ExecutionSequenceEditor {
    constructor() {
        this.sequences = [];
    }

    addGroup(groupName, options) {
        this.sequences.push({ groupName, ...options });
    }

    exportToSignal() {
        return this.sequences.map(seq => ({
            group_name: seq.groupName,
            repeat_count: seq.repeat || 1,
            delay_seconds: seq.delay || 0
        }));
    }
}
```

---

## 总结

### 核心设计亮点

1. **信号链模式**: 简洁优雅的链式 API，易于理解和使用
2. **Hook 机制**: 无侵入式的队列过滤，不修改 ComfyUI 核心代码
3. **异步协调**: 完美处理 Python 同步 + JavaScript 异步的混合模型
4. **渐进增强**: 基础功能简单，高级功能可选

### 技术要点总结

| 技术点 | 实现方式 | 关键难点 |
|--------|---------|---------|
| 信号传递 | Python 字典/列表 + ComfyUI 类型系统 | 类型声明 vs 实际数据结构 |
| 队列过滤 | Hook `api.queuePrompt()` | Hook 时机和依赖递归 |
| 异步执行 | async/await + 轮询 | 取消控制和错误处理 |
| 状态显示 | Canvas 绘制 + 属性绑定 | 重绘触发和性能优化 |
| 组节点查找 | 边界检测 + 输出节点过滤 | 动态边界和节点类型判断 |

### 复刻检查清单

- [ ] Python 节点类定义正确
- [ ] `INPUT_TYPES` 包含所有必需参数
- [ ] `RETURN_TYPES` 正确声明
- [ ] `OUTPUT_NODE = True` 用于 Sender 节点
- [ ] JavaScript 扩展正确注册
- [ ] WebSocket 事件监听器已添加
- [ ] QueueManager Hook 正确初始化
- [ ] 状态显示逻辑已实现
- [ ] 错误处理覆盖所有关键路径
- [ ] 取消功能正常工作

---

## 参考资源

- [ComfyUI 官方文档](https://github.com/comfyanonymous/ComfyUI)
- [LiteGraph 文档](https://github.com/jagenjo/litegraph.js)
- [PromptServer API](https://github.com/comfyanonymous/ComfyUI/blob/master/server.py)

---

**文档版本**: 1.0
**最后更新**: 2025-01-XX
**作者**: 基于 Comfyui-LG_GroupExecutor 项目分析
