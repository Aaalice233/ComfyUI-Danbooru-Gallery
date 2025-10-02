# 多人角色提示词可视化编辑器 - 架构设计

## 1. 整体架构

### 1.1 组件结构
```
MultiCharacterEditorNode
├── 顶部工具栏 (Toolbar)
│   ├── 语法模式选择器
│   ├── 画布尺寸设置
│   └── 预览开关
├── 主编辑区 (Main Editor)
│   ├── 左侧角色编辑区 (Character Editor)
│   │   ├── 角色列表
│   │   ├── 添加/删除角色按钮
│   │   └── 角色属性编辑器
│   └── 右侧蒙版编辑区 (Mask Editor)
│       ├── Canvas画布
│       ├── 蒙版控制工具
│       └── 网格对齐辅助
└── 底部输出区 (Output Area)
    ├── 实时提示词显示
    ├── 复制按钮
    └── 字符统计
```

### 1.2 数据流架构
```
用户输入 → 角色数据模型 → 蒙版数据模型 → 提示词生成器 → 输出
    ↓              ↓              ↓              ↓
UI更新 ← 数据同步 ← Canvas渲染 ← 语法应用 ← 实时预览
```

## 2. 数据结构设计

### 2.1 角色数据结构
```javascript
Character {
    id: string,                    // 唯一标识符
    name: string,                  // 角色名称
    prompt: string,                // 角色提示词
    enabled: boolean,              // 激活状态
    weight: number,                // 权重 (0.1-2.0)
    color: string,                 // 颜色标识 (HEX)
    mask: MaskData,                // 关联的蒙版数据
    position: number,              // 在列表中的位置
    template?: string              // 预设模板名称
}
```

### 2.2 蒙版数据结构
```javascript
MaskData {
    id: string,                    // 唯一标识符
    characterId: string,           // 关联的角色ID
    x: number,                     // X坐标 (百分比)
    y: number,                     // Y坐标 (百分比)
    width: number,                 // 宽度 (百分比)
    height: number,                // 高度 (百分比)
    feather: number,               // 羽化值 (0-50像素)
    opacity: number,               // 透明度 (0-100%)
    blendMode: string,             // 混合模式
    zIndex: number                 // 层级
}
```

### 2.3 画布配置
```javascript
CanvasConfig {
    width: number,                 // 画布宽度
    height: number,                // 画布高度
    gridSize: number,              // 网格大小
    showGrid: boolean,             // 显示网格
    snapToGrid: boolean,           // 网格对齐
    previewMode: boolean           // 预览模式
}
```

### 2.4 语法模式配置
```javascript
SyntaxMode {
    id: string,                    // 模式ID
    name: string,                  // 显示名称
    template: string,              // 语法模板
    supportedFeatures: string[]    // 支持的功能列表
}
```

## 3. 核心功能模块

### 3.1 角色管理模块 (CharacterManager)
- 角色的增删改查
- 角色列表的排序和筛选
- 角色模板的管理
- 角色数据的验证和清理

### 3.2 蒙版编辑模块 (MaskEditor)
- Canvas绘制和交互
- 蒙版的创建、编辑、删除
- 蒙版属性调整（羽化、透明度、混合模式）
- 蒙版层级管理

### 3.3 提示词生成模块 (PromptGenerator)
- 根据语法模式生成提示词
- 实时预览和更新
- 语法验证和错误检查
- 输出格式化

### 3.4 数据同步模块 (DataSync)
- 角色和蒙版数据的双向绑定
- 状态管理和更新
- 撤销/重做功能
- 数据持久化

## 4. 语法模式支持

### 4.1 Attention Couple模式
```
base_prompt COUPLE MASK(x1 x2, y1 y2) character1_prompt COUPLE MASK(x3 x4, y3 y4) character2_prompt
```

### 4.2 Regional Prompts模式
```
character1_prompt MASK(x1 x2, y1 y2) AND character2_prompt MASK(x3 x4, y3 y4)
```

### 4.3 混合模式
支持在同一提示词中混合使用不同的语法模式。

## 5. 用户交互设计

### 5.1 角色编辑交互
- 点击添加新角色
- 拖拽调整角色顺序
- 双击编辑角色名称
- 滑块调整权重
- 颜色选择器更改颜色

### 5.2 蒙版编辑交互
- 鼠标拖拽移动蒙版
- 拖拽角落/边缘调整大小
- 右键菜单访问高级选项
- 滚轮缩放画布
- 键盘快捷键操作

### 5.3 快捷键支持
```
Ctrl+Z: 撤销
Ctrl+Y: 重做
Ctrl+S: 保存配置
Delete: 删除选中角色/蒙版
Space+拖拽: 平移画布
Ctrl+拖拽: 复制蒙版
```

## 6. 性能优化策略

### 6.1 Canvas优化
- 使用离屏Canvas进行预渲染
- 实现视口裁剪，只渲染可见区域
- 使用requestAnimationFrame优化动画
- 缓存静态元素

### 6.2 数据优化
- 使用防抖处理频繁更新
- 实现增量更新机制
- 优化大数据量的渲染
- 内存泄漏防护

## 7. 错误处理和验证

### 7.1 输入验证
- 角色名称唯一性检查
- 提示词格式验证
- 蒙版边界检查
- 权重范围验证

### 7.2 错误恢复
- 自动保存和恢复
- 操作失败回滚
- 友好的错误提示
- 日志记录和调试

## 8. 扩展性设计

### 8.1 插件化架构
- 语法模式插件化
- 角色模板扩展
- 自定义渲染器
- 第三方集成接口

### 8.2 配置化设计
- 可配置的UI布局
- 自定义快捷键
- 主题和样式定制
- 行为偏好设置