# Fast Groups Muter 源码分析文档

## 概述

Fast Groups Muter 是一个 ComfyUI 自定义节点，用于自动收集工作流中的所有组（Groups），并为每个组生成一个切换开关，允许用户快速启用或静音组内的所有节点。

## 架构设计

### 类层次结构

```
RgthreeBaseVirtualNode (基类)
    ↓
BaseFastGroupsModeChanger (抽象基类)
    ↓
FastGroupsMuter (具体实现)

RgthreeBaseWidget (基类)
    ↓
FastGroupsToggleRowWidget (自定义组件)
```

### 核心类

#### 1. BaseFastGroupsModeChanger

**职责**: 提供组模式切换的基础功能框架

**关键属性**:
- `modeOn`: 节点启用时的模式值 (LiteGraph.ALWAYS)
- `modeOff`: 节点禁用时的模式值 (LiteGraph.NEVER)
- `tempSize`: 临时大小存储，用于处理 LiteGraph 的大小计算问题
- `debouncerTempWidth`: 防抖定时器 ID
- `serialize_widgets`: 设为 false，不序列化 widgets（因为会从组数据重新生成）

**属性配置** (Properties):
- `matchColors`: 颜色过滤器，支持 ComfyUI 内置颜色名和十六进制值
- `matchTitle`: 标题过滤器，支持字符串匹配和正则表达式
- `showNav`: 是否显示导航箭头
- `showAllGraphs`: 是否显示所有子图中的组
- `sort`: 排序方式 (position/alphanumeric/custom alphabet)
- `customSortAlphabet`: 自定义排序字母表
- `toggleRestriction`: 切换限制 (default/max one/always one)

#### 2. FastGroupsMuter

**职责**: BaseFastGroupsModeChanger 的具体实现

**特点**:
- 继承了基类的所有功能
- 重写了 `exposedActions` 为 ["Bypass all", "Enable all", "Toggle all"]
- 设置 `modeOn` 为 LiteGraph.ALWAYS，`modeOff` 为 LiteGraph.NEVER

#### 3. FastGroupsToggleRowWidget

**职责**: 单个组切换开关的自定义 Widget

**关键属性**:
- `group`: 关联的 LGraphGroup 对象
- `node`: 所属的 FastGroupsMuter 节点
- `toggled`: 当前切换状态
- `label`: 显示标签

## 核心实现流程

### 1. 节点生命周期

#### 构造流程
```typescript
constructor()
  ↓
初始化属性默认值
  ↓
onConstructed()
  ↓
添加输出接口 "OPT_CONNECTION"
```

#### 添加到图表
```typescript
onAdded(graph)
  ↓
FAST_GROUPS_SERVICE.addFastGroupNode(this)
  ↓
注册到服务中，以便全局管理
```

#### 从图表移除
```typescript
onRemoved()
  ↓
FAST_GROUPS_SERVICE.removeFastGroupNode(this)
  ↓
从服务中注销
```

### 2. Widget 刷新机制 (refreshWidgets)

这是整个实现的核心方法，流程如下：

#### 步骤 1: 解析排序配置
```typescript
// 获取排序方式
let sort = this.properties?.[PROPERTY_SORT] || "position";
let customAlphabet: string[] | null = null;

// 如果是自定义字母表排序
if (sort === "custom alphabet") {
  // 解析自定义字母表字符串
  const customAlphaStr = this.properties?.[PROPERTY_SORT_CUSTOM_ALPHA]
    ?.replace(/\n/g, "");

  // 支持两种格式：
  // 1. 逗号分隔: "sdxl,pro,sd,n,p"
  // 2. 单字符序列: "zyxw..."
  if (customAlphaStr && customAlphaStr.trim()) {
    customAlphabet = customAlphaStr.includes(",")
      ? customAlphaStr.toLocaleLowerCase().split(",")
      : customAlphaStr.toLocaleLowerCase().trim().split("");
  }

  // 如果自定义字母表无效，回退到字母数字排序
  if (!customAlphabet?.length) {
    sort = "alphanumeric";
    customAlphabet = null;
  }
}
```

#### 步骤 2: 获取并排序组
```typescript
// 从服务获取组（已预排序用于 position 和 alphanumeric）
const groups = [...FAST_GROUPS_SERVICE.getGroups(sort)];

// 自定义字母表排序
if (customAlphabet?.length) {
  groups.sort((a, b) => {
    let aIndex = -1;
    let bIndex = -1;

    // 查找每个组标题匹配的自定义字母表索引
    for (const [index, alpha] of customAlphabet!.entries()) {
      if (aIndex < 0 && a.title.toLocaleLowerCase().startsWith(alpha)) {
        aIndex = index;
      }
      if (bIndex < 0 && b.title.toLocaleLowerCase().startsWith(alpha)) {
        bIndex = index;
      }
      if (aIndex > -1 && bIndex > -1) break;
    }

    // 排序逻辑：
    // 1. 都匹配：按索引排序，索引相同则字母排序
    // 2. 只有 a 匹配：a 在前
    // 3. 只有 b 匹配：b 在前
    // 4. 都不匹配：字母排序
    if (aIndex > -1 && bIndex > -1) {
      const ret = aIndex - bIndex;
      return ret === 0 ? a.title.localeCompare(b.title) : ret;
    } else if (aIndex > -1) {
      return -1;
    } else if (bIndex > -1) {
      return 1;
    }
    return a.title.localeCompare(b.title);
  });
}
```

#### 步骤 3: 颜色过滤
```typescript
// 解析颜色过滤器
let filterColors = (
  (this.properties?.[PROPERTY_MATCH_COLORS] as string)?.split(",") || []
).filter((c) => c.trim());

if (filterColors.length) {
  filterColors = filterColors.map((color) => {
    color = color.trim().toLocaleLowerCase();

    // 转换 ComfyUI 内置颜色名称为十六进制值
    if (LGraphCanvas.node_colors[color]) {
      color = LGraphCanvas.node_colors[color]!.groupcolor;
    }

    // 标准化十六进制格式
    color = color.replace("#", "").toLocaleLowerCase();

    // 将 3 位十六进制转换为 6 位 (#RGB -> #RRGGBB)
    if (color.length === 3) {
      color = color.replace(/(.)(.)(.)/, "$1$1$2$2$3$3");
    }

    return `#${color}`;
  });
}
```

#### 步骤 4: 遍历组并创建/更新 Widgets
```typescript
let index = 0;
for (const group of groups) {
  // 颜色过滤
  if (filterColors.length) {
    let groupColor = group.color?.replace("#", "").trim().toLocaleLowerCase();
    if (!groupColor) continue;

    // 标准化组颜色
    if (groupColor.length === 3) {
      groupColor = groupColor.replace(/(.)(.)(.)/, "$1$1$2$2$3$3");
    }
    groupColor = `#${groupColor}`;

    if (!filterColors.includes(groupColor)) continue;
  }

  // 标题过滤（支持正则表达式）
  if (this.properties?.[PROPERTY_MATCH_TITLE]?.trim()) {
    try {
      if (!new RegExp(this.properties[PROPERTY_MATCH_TITLE], "i").exec(group.title)) {
        continue;
      }
    } catch (e) {
      console.error(e);
      continue;
    }
  }

  // 图表过滤
  const showAllGraphs = this.properties?.[PROPERTY_SHOW_ALL_GRAPHS];
  if (!showAllGraphs && group.graph !== app.canvas.getCurrentGraph()) {
    continue;
  }

  // 创建或更新 Widget
  let isDirty = false;
  const widgetLabel = `Enable ${group.title}`;
  let widget = this.widgets.find((w) => w.label === widgetLabel) as FastGroupsToggleRowWidget;

  if (!widget) {
    // 新建 Widget
    // 保存当前大小，因为 LiteGraph 会在添加 Widget 时修改大小
    this.tempSize = [...this.size] as Size;
    widget = this.addCustomWidget(
      new FastGroupsToggleRowWidget(group, this),
    ) as FastGroupsToggleRowWidget;
    this.setSize(this.computeSize());
    isDirty = true;
  }

  // 更新标签
  if (widget.label != widgetLabel) {
    widget.label = widgetLabel;
    isDirty = true;
  }

  // 更新切换状态
  if (group.rgthree_hasAnyActiveNode != null &&
      widget.toggled != group.rgthree_hasAnyActiveNode) {
    widget.toggled = group.rgthree_hasAnyActiveNode;
    isDirty = true;
  }

  // 确保 Widget 顺序正确
  if (this.widgets[index] !== widget) {
    const oldIndex = this.widgets.findIndex((w) => w === widget);
    this.widgets.splice(index, 0, this.widgets.splice(oldIndex, 1)[0]!);
    isDirty = true;
  }

  if (isDirty) {
    this.setDirtyCanvas(true, false);
  }
  index++;
}

// 移除多余的 Widgets
while ((this.widgets || [])[index]) {
  this.removeWidget(index++);
}
```

### 3. 大小计算优化 (computeSize)

```typescript
override computeSize(out?: Vector2) {
  let size = super.computeSize(out);

  // 如果有临时大小（在添加 Widget 时设置）
  if (this.tempSize) {
    // 确保大小不会缩小
    size[0] = Math.max(this.tempSize[0], size[0]);
    size[1] = Math.max(this.tempSize[1], size[1]);

    // 使用防抖清除临时大小（因为可能被多次调用）
    this.debouncerTempWidth && clearTimeout(this.debouncerTempWidth);
    this.debouncerTempWidth = setTimeout(() => {
      this.tempSize = null;
    }, 32);
  }

  // 异步触发画布重绘
  setTimeout(() => {
    this.graph?.setDirtyCanvas(true, true);
  }, 16);

  return size;
}
```

**为什么需要 tempSize?**
- LiteGraph 在添加 Widget 时会自动调整节点大小
- 但这个自动调整可能不符合预期，导致节点闪烁或大小不稳定
- 通过在添加前保存大小，在计算时取最大值，保证节点不会意外缩小

### 4. 批量操作 (handleAction)

#### Mute all / Bypass all
```typescript
if (action === "Mute all" || action === "Bypass all") {
  const alwaysOne = this.properties?.[PROPERTY_RESTRICTION] === "always one";
  for (const [index, widget] of this.widgets.entries()) {
    // 如果是 "always one" 模式，保持第一个为 true
    (widget as any)?.doModeChange(alwaysOne && !index ? true : false, true);
  }
}
```

#### Enable all
```typescript
else if (action === "Enable all") {
  const onlyOne = this.properties?.[PROPERTY_RESTRICTION].includes(" one");
  for (const [index, widget] of this.widgets.entries()) {
    // 如果是 "only one" 模式，只启用第一个
    (widget as any)?.doModeChange(onlyOne && index > 0 ? false : true, true);
  }
}
```

#### Toggle all
```typescript
else if (action === "Toggle all") {
  const onlyOne = this.properties?.[PROPERTY_RESTRICTION].includes(" one");
  let foundOne = false;

  for (const [index, widget] of this.widgets.entries()) {
    // 如果是 "only one"，找到第一个 true 后其余都设为 false
    let newValue: boolean = onlyOne && foundOne ? false : !widget.value;
    foundOne = foundOne || newValue;
    (widget as any)?.doModeChange(newValue, true);
  }

  // 如果是 "always one" 且没有找到 true，将最后一个设为 true
  if (!foundOne && this.properties?.[PROPERTY_RESTRICTION] === "always one") {
    (this.widgets[this.widgets.length - 1] as any)?.doModeChange(true, true);
  }
}
```

### 5. Widget 实现 (FastGroupsToggleRowWidget)

#### 模式切换逻辑 (doModeChange)
```typescript
doModeChange(force?: boolean, skipOtherNodeCheck?: boolean) {
  // 重新计算组内节点
  this.group.recomputeInsideNodes();

  // 检查组内是否有活动节点
  const hasAnyActiveNodes = getGroupNodes(this.group).some(
    (n) => n.mode === LiteGraph.ALWAYS
  );

  // 确定新值
  let newValue = force != null ? force : !hasAnyActiveNodes;

  // 处理限制模式
  if (skipOtherNodeCheck !== true) {
    // "max one" 或 "always one": 启用当前时禁用其他
    if (newValue && this.node.properties?.[PROPERTY_RESTRICTION]?.includes(" one")) {
      for (const widget of this.node.widgets) {
        if (widget instanceof FastGroupsToggleRowWidget) {
          widget.doModeChange(false, true);
        }
      }
    }
    // "always one": 禁用当前时，如果是最后一个则阻止
    else if (!newValue && this.node.properties?.[PROPERTY_RESTRICTION] === "always one") {
      newValue = this.node.widgets.every((w) => !w.value || w === this);
    }
  }

  // 应用模式变更到组内所有节点
  changeModeOfNodes(
    getGroupNodes(this.group),
    (newValue ? this.node.modeOn : this.node.modeOff)
  );

  // 更新状态
  this.group.rgthree_hasAnyActiveNode = newValue;
  this.toggled = newValue;
  this.group.graph?.setDirtyCanvas(true, false);
}
```

#### 绘制逻辑 (draw)

绘制顺序：从右到左

```typescript
draw(ctx, node, width, posY, height) {
  // 1. 获取绘制上下文数据
  const widgetData = drawNodeWidget(ctx, {
    size: [width, height],
    pos: [15, posY]
  });

  const showNav = node.properties?.[PROPERTY_SHOW_NAV] !== false;
  let currentX = widgetData.width - widgetData.margin;

  // 2. 绘制导航箭头（最右侧）
  if (!widgetData.lowQuality && showNav) {
    currentX -= 7; // 箭头间距
    const midY = widgetData.posY + widgetData.height * 0.5;

    // 绘制箭头路径
    ctx.fillStyle = ctx.strokeStyle = "#89A";
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    const arrow = new Path2D(
      `M${currentX} ${midY} l -7 6 v -3 h -7 v -6 h 7 v -3 z`
    );
    ctx.fill(arrow);
    ctx.stroke(arrow);
    currentX -= 14;

    // 绘制分隔线
    currentX -= 7;
    ctx.strokeStyle = widgetData.colorOutline;
    ctx.stroke(new Path2D(
      `M ${currentX} ${widgetData.posY} v ${widgetData.height}`
    ));
  } else if (widgetData.lowQuality && showNav) {
    // 低质量模式：预留空间但不绘制
    currentX -= 28;
  }

  // 3. 绘制切换圆点
  currentX -= 7;
  ctx.fillStyle = this.toggled ? "#89A" : "#333";
  ctx.beginPath();
  const toggleRadius = height * 0.36;
  ctx.arc(
    currentX - toggleRadius,
    posY + height * 0.5,
    toggleRadius,
    0,
    Math.PI * 2
  );
  ctx.fill();
  currentX -= toggleRadius * 2;

  // 4. 绘制状态文本 (yes/no)
  if (!widgetData.lowQuality) {
    currentX -= 4;
    ctx.textAlign = "right";
    ctx.fillStyle = this.toggled
      ? widgetData.colorText
      : widgetData.colorTextSecondary;

    const toggleLabelOn = this.options.on || "true";
    const toggleLabelOff = this.options.off || "false";
    ctx.fillText(
      this.toggled ? toggleLabelOn : toggleLabelOff,
      currentX,
      posY + height * 0.7
    );

    // 预留两个文本中较宽的空间
    currentX -= Math.max(
      ctx.measureText(toggleLabelOn).width,
      ctx.measureText(toggleLabelOff).width,
    );

    // 5. 绘制标签文本（左侧）
    currentX -= 7;
    ctx.textAlign = "left";
    let maxLabelWidth = widgetData.width - widgetData.margin - 10
      - (widgetData.width - currentX);

    if (this.label != null) {
      ctx.fillText(
        fitString(ctx, this.label, maxLabelWidth),
        widgetData.margin + 10,
        posY + height * 0.7,
      );
    }
  }
}
```

**绘制布局**:
```
┌─────────────────────────────────────────┐
│ [Label Text]     [yes/no]  [●]  │ [→] │
└─────────────────────────────────────────┘
 ↑                ↑         ↑     ↑  ↑
 左对齐标签        状态文本  切换点  分隔线 箭头
```

#### 鼠标交互 (mouse)
```typescript
override mouse(event, pos, node): boolean {
  if (event.type == "pointerdown") {
    // 点击右侧导航区域
    if (node.properties?.[PROPERTY_SHOW_NAV] !== false
        && pos[0] >= node.size[0] - 15 - 28 - 1) {
      const canvas = app.canvas as TLGraphCanvas;
      const lowQuality = (canvas.ds?.scale || 1) <= 0.5;

      if (!lowQuality) {
        // 导航到组
        canvas.centerOnNode(this.group);

        // 计算合适的缩放级别
        const zoomCurrent = canvas.ds?.scale || 1;
        const zoomX = canvas.canvas.width / this.group._size[0] - 0.02;
        const zoomY = canvas.canvas.height / this.group._size[1] - 0.02;

        // 设置缩放（取最小值以确保组完全可见）
        canvas.setZoom(Math.min(zoomCurrent, zoomX, zoomY), [
          canvas.canvas.width / 2,
          canvas.canvas.height / 2,
        ]);
        canvas.setDirty(true, true);
      }
    }
    // 点击左侧切换区域
    else {
      this.toggle();
    }
  }
  return true;
}
```

## 关键技术点

### 1. 服务集成
使用 `FAST_GROUPS_SERVICE` 统一管理所有 FastGroup 节点和组数据，实现：
- 集中式组数据管理
- 跨节点状态同步
- 预排序优化

### 2. 动态 Widget 管理
- **增量更新**: 不是每次都重建所有 Widgets，而是复用现有的
- **顺序保持**: 使用 splice 调整 Widget 顺序而不是删除重建
- **脏标记优化**: 只在实际变化时标记为脏

### 3. 大小计算的 Hack
- LiteGraph 会在添加 Widget 时自动调整节点大小
- 使用 `tempSize` 保存期望大小，在 `computeSize` 中取最大值
- 使用防抖避免频繁更新

### 4. 颜色处理
- 支持 ComfyUI 内置颜色名称
- 支持十六进制颜色代码
- 自动标准化 3 位和 6 位十六进制格式
- 不区分大小写

### 5. 自定义字母表排序
- 支持单字符序列和逗号分隔字符串
- 优先匹配自定义字母表，未匹配的按字母顺序排在后面
- 相同字母表索引的按字母顺序排序

### 6. 切换限制模式
- **default**: 无限制
- **max one**: 最多一个启用（启用新的会自动禁用其他）
- **always one**: 始终保持一个启用（无法全部禁用）

### 7. Canvas 绘制优化
- **lowQuality 检测**: 缩放小于 0.5 时跳过细节绘制
- **从右到左布局**: 便于处理不定长的左侧标签
- **文本适配**: 使用 `fitString` 截断过长文本

## 复刻要点

### 必需的外部依赖
1. **基类**:
   - `RgthreeBaseVirtualNode`: 虚拟节点基类
   - `RgthreeBaseWidget`: Widget 基类

2. **服务**:
   - `FAST_GROUPS_SERVICE`: 组数据管理服务
   - 需要实现 `addFastGroupNode`、`removeFastGroupNode`、`getGroups` 方法

3. **工具函数**:
   - `drawNodeWidget`: Canvas 绘制辅助
   - `fitString`: 文本截断
   - `changeModeOfNodes`: 批量修改节点模式
   - `getGroupNodes`: 获取组内节点

### 核心实现步骤
1. 创建继承自虚拟节点基类的主节点类
2. 实现属性配置系统（Properties）
3. 实现 `refreshWidgets` 方法（核心逻辑）
4. 创建自定义 Widget 类并实现绘制和交互
5. 实现大小计算优化
6. 集成到服务系统
7. 注册节点扩展

### 性能优化建议
1. **Widget 复用**: 避免频繁创建销毁
2. **防抖处理**: 大小计算和画布刷新使用防抖
3. **脏标记**: 仅在实际变化时触发重绘
4. **lowQuality 模式**: 在缩放较小时跳过细节绘制
5. **服务缓存**: 在服务层缓存排序结果

### 扩展性设计
1. **抽象基类**: `BaseFastGroupsModeChanger` 可扩展为其他模式切换器
2. **属性驱动**: 所有行为通过属性配置，易于扩展
3. **Widget 解耦**: Widget 独立实现，便于替换或扩展
4. **服务分离**: 组管理逻辑独立于节点实现

## 注意事项

### 1. 状态同步
- Widget 状态需要与组内节点状态保持同步
- 使用 `group.rgthree_hasAnyActiveNode` 自定义属性存储状态

### 2. 图表切换
- 支持多个子图（subgraph）
- 需要根据 `showAllGraphs` 属性过滤组

### 3. 正则表达式安全
- 标题过滤支持正则，需要 try-catch 处理无效正则

### 4. 序列化
- `serialize_widgets = false`: Widgets 不序列化
- 加载时从组数据重新生成

### 5. LiteGraph 兼容性
- 需要处理 LiteGraph 的自动大小调整
- 需要正确处理画布缩放和坐标转换

## 总结

Fast Groups Muter 是一个设计精巧的 ComfyUI 节点，其核心价值在于：

1. **自动化**: 自动发现和管理组
2. **灵活性**: 丰富的过滤和排序选项
3. **用户体验**: 直观的可视化界面和导航功能
4. **性能**: 增量更新和绘制优化
5. **可扩展**: 清晰的架构和抽象设计

复刻时需要特别注意 Widget 生命周期管理、Canvas 绘制优化和与 LiteGraph 的交互细节。
