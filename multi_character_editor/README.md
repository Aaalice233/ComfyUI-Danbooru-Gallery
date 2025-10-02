# 多人角色提示词可视化编辑器

一个专为ComfyUI设计的高级多人角色提示词可视化编辑器，支持直观的角色管理和蒙版编辑功能。

## 📋 项目概述

本项目旨在为ComfyUI用户提供一个强大而直观的工具，用于创建和编辑包含多个角色的复杂提示词。通过可视化界面，用户可以轻松管理角色、调整蒙版区域，并生成符合不同语法格式的提示词。

## ✨ 主要特性

### 🎭 角色管理
- ✅ 动态添加/删除角色（无数量限制）
- ✅ 角色属性编辑（名称、提示词、权重、颜色）
- ✅ 角色列表拖拽排序
- ✅ 实时语法高亮和错误检测

### 🎨 蒙版编辑
- ✅ 基于Canvas的可视化蒙版编辑
- ✅ 拖拽移动和调整大小
- ✅ 羽化、透明度、混合模式调整
- ✅ 网格对齐辅助功能
- ✅ 蒙版层级管理

### 📝 语法支持
- ✅ Attention Couple语法
- ✅ Regional Prompts语法
- ✅ 实时语法预览
- ✅ 语法验证和错误检查

### 🛠️ 高级功能
- ✅ 撤销/重做操作
- ✅ 键盘快捷键支持
- ✅ 响应式布局
- ✅ 性能优化

## 🏗️ 项目结构

```
multi_character_editor/
├── __init__.py                 # 包初始化文件
├── multi_character_editor.py   # 主节点文件
├── js/
│   └── multi_character_editor.js  # 前端实现
├── styles/
│   └── multi_character_editor.css  # 样式文件
├── templates/
│   └── character_templates.json    # 角色模板
├── settings/
│   └── editor_settings.json        # 编辑器设置
└── docs/
    ├── README.md                    # 项目说明
    ├── architecture_design.md      # 架构设计文档
    ├── system_flow.md             # 系统流程文档
    ├── technical_specification.md  # 技术规范文档
    └── user_guide.md              # 用户指南
```

## 🚀 快速开始

### 安装要求
- ComfyUI
- Python 3.8+
- 现代浏览器（支持Canvas API）

### 安装步骤
1. 将整个`multi_character_editor`文件夹复制到ComfyUI的`custom_nodes`目录
2. 重启ComfyUI
3. 在节点菜单中找到"多人角色提示词编辑器"

### 基础使用
1. 在ComfyUI工作流中添加"多人角色提示词编辑器"节点
2. 点击"添加角色"按钮创建新角色
3. 编辑角色属性（名称、提示词、权重等）
4. 在右侧画布中调整蒙版位置和大小
5. 选择语法模式并查看生成的提示词
6. 复制生成的提示词用于其他节点

## 📚 文档

- [用户指南](user_guide.md) - 详细的使用说明和教程
- [架构设计](architecture_design.md) - 系统架构和数据结构
- [系统流程](system_flow.md) - 组件交互和数据流
- [技术规范](technical_specification.md) - 实现细节和接口规范

## 🎯 使用场景

### 1. 多角色图像生成
创建包含多个角色的复杂场景，精确控制每个角色的位置和属性。

### 2. 角色特征融合
将不同角色的特征进行智能融合，创造独特的角色形象。

### 3. 区域性提示词编辑
为图像的不同区域指定不同的提示词，实现精细控制。

### 4. 批量角色管理
管理大量角色配置，提高工作效率。

## 🔧 技术特点

### 前端技术
- **原生JavaScript**: 无额外依赖，性能优异
- **Canvas API**: 高效的图形渲染和交互
- **模块化设计**: 易于维护和扩展
- **响应式布局**: 适应不同屏幕尺寸

### 后端技术
- **Python**: 与ComfyUI无缝集成
- **异步处理**: 支持复杂操作的异步执行
- **JSON存储**: 轻量级配置管理
- **RESTful API**: 标准化的接口设计

### 性能优化
- **离屏渲染**: 提高Canvas绘制性能
- **视口裁剪**: 只渲染可见区域
- **事件节流**: 减少频繁更新
- **内存管理**: 防止内存泄漏

## 🎨 界面预览

```
┌─────────────────────────────────────────────────────────┐
│  [语法模式▼] [1024x1024▼] [预览] [设置]                  │
├─────────────────┬───────────────────────────────────────┤
│ 角色列表         │                                       │
│ ┌─────────────┐ │         Canvas 画布                   │
│ │ ● 角色1     │ │     ┌─────────────────────────┐       │
│ │   权重:1.0  │ │     │  ┌─────┐  ┌─────┐       │       │
│ │   颜色:红   │ │     │  │ 红色│  │蓝色 │       │       │
│ └─────────────┘ │     │  └─────┘  └─────┘       │       │
│ ┌─────────────┐ │     │                         │       │
│ │ ● 角色2     │ │     │      蒙版编辑区域         │       │
│ │   权重:1.2  │ │     │                         │       │
│ │   颜色:蓝   │ │     └─────────────────────────┘       │
│ └─────────────┘ │                                       │
│ [+] [模板] [设置] │                                       │
├─────────────────┴───────────────────────────────────────┤
│ 生成的提示词:                                           │
│ masterpiece, best quality COUPLE MASK(0 0.5, 0 1)...   │
│ [复制] [字符数:256] [Token:~64] [历史▼]                 │
└─────────────────────────────────────────────────────────┘
```

## 🔍 语法示例

### Attention Couple模式
```
masterpiece, best quality COUPLE MASK(0 0.5, 0 1) 1girl, long hair, blue eyes, dress COUPLE MASK(0.5 1, 0 1) 1boy, short hair, green eyes, shirt
```

### Regional Prompts模式
```
1girl, long hair, blue eyes, dress MASK(0 0.5, 0 1) AND 1boy, short hair, green eyes, shirt MASK(0.5 1, 0 1)
```

## ⌨️ 快捷键

### 通用
- `Ctrl+Z` - 撤销
- `Ctrl+Y` - 重做
- `Ctrl+S` - 保存配置
- `Delete` - 删除选中项

### 画布操作
- `Space+拖拽` - 平移画布
- `Ctrl+滚轮` - 缩放画布
- `Shift+拖拽` - 等比例缩放
- `G` - 切换网格显示

## 🤝 贡献指南

我们欢迎社区贡献！请遵循以下步骤：

1. Fork本项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request

## 📝 更新日志

### v1.0.0 (计划中)
- ✅ 基础架构设计
- ✅ 核心功能规划
- ✅ 技术规范制定
- ✅ 用户文档编写
- 🔄 Python节点实现
- 🔄 JavaScript前端开发
- 🔄 样式和UI设计
- 🔄 测试和优化

## 📄 许可证

本项目采用MIT许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- ComfyUI开发团队提供的优秀框架
- Attention Couple和Regional Prompts插件的作者
- 所有测试用户和贡献者

## 📞 联系方式

如果您有任何问题或建议，请通过以下方式联系：

- 📧 邮箱: [your-email@example.com]
- 🐛 问题反馈: [GitHub Issues]
- 💬 讨论区: [Discord/Forum]

---

**让创作更简单，让想象更自由！** 🎨✨