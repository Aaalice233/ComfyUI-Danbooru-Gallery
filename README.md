# ComfyUI Danbooru Gallery

<img width="966" height="830" alt="image" src="https://github.com/user-attachments/assets/e2a5d34e-0001-417e-bf8e-7753521ea0d3" />

---

## 目录 | Table of Contents

### 中文版本
- [简介](#简介)
- [主要特性](#主要特性)
- [节点介绍](#节点介绍)
  - [🖼️ Danbooru Images Gallery](#-danbooru-images-gallery)
  - [🔄 人物特征替换 (Character Feature Swap)](#-人物特征替换-character-feature-swap)
  - [📚 提示词选择器 (Prompt Selector)](#-提示词选择器-prompt-selector)
  - [👥 多人角色提示词编辑器 (Multi Character Editor)](#-多人角色提示词编辑器-multi-character-editor)
- [安装说明](#安装说明)
- [系统要求](#系统要求)
- [高级功能](#高级功能)
- [项目结构](#项目结构)
- [故障排除](#故障排除)

### English Version
- [Overview](#overview)
- [Key Features](#key-features)
- [Node Documentation](#node-documentation)
  - [🖼️ Danbooru Images Gallery](#-danbooru-images-gallery-1)
  - [🔄 Character Feature Swap](#-character-feature-swap)
  - [📚 Prompt Selector](#-prompt-selector)
  - [👥 Multi Character Editor](#-multi-character-editor)
- [Installation](#installation)
- [System Requirements](#system-requirements-1)
- [Advanced Features](#advanced-features)
- [Project Structure](#project-structure-1)
- [Troubleshooting](#troubleshooting-1)

### 其他 | Others
- [开发 | Development](#开发--development)
- [许可证 | License](#许可证--license)
- [致谢 | Acknowledgments](#致谢--acknowledgments)

---

## 中文版本

### 简介

一个功能强大的 ComfyUI 插件套装，包含四个核心节点，为 AI 图像生成工作流提供完整的提示词管理和图像资源解决方案。基于 Danbooru API 构建，支持图像搜索、提示词编辑、角色特征替换和多角色区域提示词等高级功能。

### 主要特性

- 🔍 **智能图像搜索**: 基于 Danbooru API 的精确标签搜索
- 🎨 **可视化编辑**: 直观的画布编辑和拖拽操作
- 🤖 **AI 智能处理**: 利用 LLM 进行角色特征智能替换
- 📚 **提示词管理**: 分类管理和选择常用提示词库
- 👥 **多角色支持**: 可视化编辑多角色区域提示词
- 🌐 **多语言界面**: 中英文界面无缝切换
- 🈳 **中英标签互译**: 支持标签中英文互译和搜索
- ⭐ **云端同步**: 收藏和配置云端同步功能
- 🎯 **工作流集成**: 完美集成到 ComfyUI 工作流

---

## 节点介绍

### 🖼️ Danbooru Images Gallery

**核心图像搜索和管理节点**

这是插件的主要节点，提供基于 Danbooru API 的图像搜索、预览、下载和提示词提取功能。

#### 主要功能
- 🔍 **高级标签搜索**: 支持复合标签搜索和排除语法
- 📄 **智能分页**: 高效的分页加载机制
- 💡 **智能补全**: 实时标签自动补全和中文提示
- 🎨 **高质量预览**: 响应式瀑布流布局
- 📊 **内容分级**: 支持按图像评级过滤
- 🏷️ **标签分类**: 可选择输出的标签类别
- ⭐ **收藏系统**: 云端同步的收藏功能
- ✍️ **提示词编辑**: 内置提示词编辑器
- 🔐 **用户认证**: 支持 Danbooru 账户登录

#### 使用方法
1. 在 ComfyUI 中添加 `Danbooru > Danbooru Images Gallery` 节点
2. 双击节点打开画廊界面
3. 输入搜索标签，支持语法：
   - 普通标签：`1girl blue_eyes`
   - 排除标签：`1girl -blurry`
   - 复合搜索：`1girl blue_eyes smile -blurry`
4. 选择图像并导入提示词到工作流

---

### 🔄 人物特征替换 (Character Feature Swap)

**AI 驱动的角色特征智能替换节点**

利用大语言模型 API 智能替换提示词中的人物特征，保持构图和环境的同时改变角色属性。

#### 核心功能
- 🤖 **智能理解**: 通过 LLM 理解和替换人物特征
- 🌐 **多 API 支持**: 支持 OpenRouter、Gemini、DeepSeek 等
- ⚙️ **高度可配置**: 自定义 API 服务和模型选择
- 📋 **预设管理**: 保存和切换特征替换预设
- 🔧 **易于配置**: 独立设置界面和连接测试

#### 支持的 API 服务
- **OpenRouter**: `https://openrouter.ai/api/v1`
- **Gemini API**: `https://generativelanguage.googleapis.com/v1beta`
- **DeepSeek**: `https://api.deepseek.com/v1`
- **OpenAI 兼容**: 自定义服务地址
- **Gemini CLI**: 本地执行（需安装 `@google/gemini-cli`）

#### 使用步骤
1. 添加 `Danbooru > 人物特征替换 (Character Feature Swap)` 节点
2. 点击"设置"按钮配置 API
3. 连接输入：
   - `original_prompt`: 原始提示词
   - `character_prompt`: 新角色特征描述
4. 获取 `new_prompt` 输出

---

### 📚 提示词选择器 (Prompt Selector)

**专业的提示词库管理节点**

分类管理和选择常用提示词，构建个人提示词库，提高工作流效率。

#### 核心功能
- 📁 **分类管理**: 创建多个分类组织提示词
- 🖼️ **预览图支持**: 为提示词添加可视化预览
- 📦 **导入导出**: 完整的 `.zip` 格式备份和分享
- 🔄 **批量操作**: 支持批量删除和移动
- ⭐ **收藏排序**: 拖拽排序和常用标记
- 🔗 **灵活拼接**: 与上游节点输出拼接

#### 使用方法
1. 添加 `Danbooru > 提示词选择器 (Prompt Selector)` 节点
2. 双击打开管理界面，构建提示词库
3. 选择需要的提示词
4. 可选连接 `prefix_prompt` 输入
5. 获取拼接后的 `prompt` 输出

---

### 👥 多人角色提示词编辑器 (Multi Character Editor)

**可视化多角色区域提示词编辑节点**

专业的可视化编辑器，支持创建多角色区域提示词，精确控制角色位置和属性。

#### 核心功能
- 🎨 **可视化编辑**: 直观的画布拖拽编辑
- 🔄 **双语法支持**: Attention Couple 和 Regional Prompts
- 📐 **精确控制**: 百分比和像素坐标定位
- 🌊 **羽化效果**: 边缘羽化创造自然过渡
- ⚖️ **权重管理**: 独立的角色权重控制
- 💾 **预设系统**: 保存和加载角色配置
- ⚡ **实时预览**: 即时生成语法预览
- ✅ **语法验证**: 自动检测和提示错误

#### 依赖要求
> ⚠️ **重要提醒**: 本节点需要配合 **[comfyui-prompt-control](https://github.com/asagi4/comfyui-prompt-control)** 插件使用，因为 ComfyUI 原生不支持 MASK、FEATHER、AND 等高级语法。

#### 语法模式对比

| 特性 | Attention Couple | Regional Prompts |
|------|------------------|------------------|
| 分隔符 | COUPLE | AND |
| 生成速度 | 更快 | 较慢 |
| 灵活性 | 更高 | 中等 |
| FILL() 支持 | ✅ 支持 | ❌ 不支持 |
| 区域分离度 | 中等 | 更严格 |
| 推荐场景 | 快速原型、灵活布局 | 精确控制、严格分区 |

#### 使用方法
1. 添加 `Danbooru > 多人角色提示词编辑器 (Multi Character Editor)` 节点
2. 选择语法模式和画布尺寸
3. 双击打开可视化编辑界面
4. 添加角色并调整位置、权重、羽化等属性
5. 连接到 **comfyui-prompt-control** 节点使用

#### 使用示例

**双人肖像（Attention Couple）**：
```
portrait scene FILL() COUPLE MASK(0.00 0.50, 0.00 1.00, 1.00) beautiful woman with blonde hair, blue eyes FEATHER(10) COUPLE MASK(0.50 1.00, 0.00 1.00, 1.00) handsome man with brown hair, green eyes FEATHER(10)
```

**三角色场景（Regional Prompts）**：
```
fantasy forest AND elf archer MASK(0.00 0.33, 0.00 1.00, 1.00) FEATHER(8) AND dwarf warrior MASK(0.33 0.66, 0.00 1.00, 1.00) FEATHER(8) AND wizard MASK(0.66 1.00, 0.00 1.00, 1.00) FEATHER(8)
```

---

## 安装说明

### 方法一：ComfyUI Manager 安装（推荐）

1. 在 ComfyUI 中打开 Manager 界面
2. 点击 "Install Custom Nodes"
3. 搜索 "Danbooru Gallery" 或 "ComfyUI-Danbooru-Gallery"
4. 点击 "Install" 按钮
5. 重启 ComfyUI

### 方法二：自动安装

```bash
# 1. 克隆到 ComfyUI/custom_nodes/ 目录
git clone https://github.com/comfyui-extensions/comfyui-danbooru-gallery.git

# 2. 运行安装脚本
cd comfyui-danbooru-gallery
python install.py

# 3. 重启 ComfyUI
```

### 方法三：手动安装

```bash
# 安装依赖
pip install -r requirements.txt
```

---

## 系统要求

- **Python**: 3.8+
- **ComfyUI**: 最新版本

### 核心依赖

- `requests>=2.28.0` - HTTP请求库
- `aiohttp>=3.8.0` - 异步HTTP客户端
- `Pillow>=9.0.0` - 图像处理库
- `torch>=1.12.0` - PyTorch框架
- `numpy>=1.21.0` - 数值计算库

---

## 高级功能

### 🔐 用户认证系统
- 支持 Danbooru 用户名和 API 密钥认证
- 认证后可使用收藏功能和高级功能
- 自动验证认证状态和网络连接

### 🈳 中英对照系统
- **中英互译**: 自动翻译英文标签为中文描述
- **中文搜索**: 支持输入中文直接搜索对应英文标签
- **模糊匹配**: 支持中文拼音和部分字符匹配
- **批量翻译**: 高效的批量标签翻译处理
- **实时提示**: 自动补全时显示中文翻译

#### 翻译数据格式
- **JSON格式** (`zh_cn/all_tags_cn.json`): 英文标签到中文的键值对映射
- **CSV格式** (`zh_cn/danbooru.csv`): 英文标签,中文翻译 的CSV文件
- **角色CSV** (`zh_cn/wai_characters.csv`): 中文角色名,英文标签 的CSV文件

### ⚙️ 高级设置
- **多语言支持**: 中英文界面切换
- **黑名单管理**: 自定义过滤不需要的标签
- **提示词过滤**: 自动过滤水印、用户名等标签
- **调试模式**: 启用详细日志输出
- **页面大小**: 自定义每页显示的图像数量

---

## 项目结构

```
ComfyUI-Danbooru-Gallery/
├── __init__.py                     # 插件入口
├── danbooru_gallery/
│   ├── __init__.py
│   └── danbooru_gallery.py         # Danbooru画廊后端逻辑
├── character_feature_swap/
│   ├── __init__.py
│   └── character_feature_swap.py   # 人物特征替换后端逻辑
├── prompt_selector/
│   ├── __init__.py
│   └── prompt_selector.py          # 提示词选择器后端逻辑
├── multi_character_editor/
│   ├── __init__.py
│   ├── multi_character_editor.py   # 多人角色编辑器后端逻辑
│   ├── doc/                        # 语法文档
│   │   ├── complete_syntax_guide.md
│   │   └── complete_syntax_guide_en.md
│   └── settings/                   # 配置和预设文件
│       ├── editor_settings.json
│       ├── presets.json
│       └── preset_images/
├── install.py                      # 智能安装脚本
├── requirements.txt                # 依赖清单
├── js/
│   ├── danbooru_gallery.js         # Danbooru画廊前端
│   ├── character_feature_swap.js   # 人物特征替换前端
│   ├── prompt_selector.js          # 提示词选择器前端
│   ├── multi_character_editor.js   # 多人角色编辑器前端
│   ├── multi_character_editor/     # 多人角色编辑器组件
│   │   ├── character_editor.js
│   │   ├── mask_editor.js
│   │   ├── output_area.js
│   │   ├── preset_manager.js
│   │   └── settings_menu.js
│   └── global/                     # 全局共享组件
│       ├── autocomplete_cache.js
│       ├── autocomplete_ui.js
│       ├── color_manager.js
│       ├── multi_language.js
│       ├── toast_manager.js
│       └── translations/
├── danbooru_gallery/zh_cn/         # 中文翻译数据
│   ├── all_tags_cn.json
│   ├── danbooru.csv
│   └── wai_characters.csv
└── README.md                       # 说明文档
```

---

## 故障排除

- **连接问题**: 检查网络连接和 API 密钥
- **图像加载失败**: 确认磁盘空间和图像 URL
- **插件不显示**: 检查目录位置和依赖安装
- **多角色编辑器无效**: 确保安装了 comfyui-prompt-control 插件
- **性能问题**: 检查控制台日志获取详细信息

---

## English Version

### Overview

A powerful ComfyUI plugin suite featuring four core nodes that provide comprehensive prompt management and image resource solutions for AI image generation workflows. Built on the Danbooru API, it supports image search, prompt editing, character feature swapping, and multi-character regional prompts.

### Key Features

- 🔍 **Intelligent Image Search**: Precise tag-based search using Danbooru API
- 🎨 **Visual Editing**: Intuitive canvas editing with drag-and-drop
- 🤖 **AI Smart Processing**: LLM-powered intelligent character feature replacement
- 📚 **Prompt Management**: Categorized management of frequently used prompts
- 👥 **Multi-Character Support**: Visual editing of multi-character regional prompts
- 🌐 **Multi-language Interface**: Seamless Chinese/English interface switching
- 🈳 **Bilingual Tag Translation**: Chinese-English tag translation and search
- ⭐ **Cloud Synchronization**: Cloud sync for favorites and configurations
- 🎯 **Workflow Integration**: Perfect integration with ComfyUI workflows

---

## Node Documentation

### 🖼️ Danbooru Images Gallery

**Core Image Search and Management Node**

The main node of the plugin, providing Danbooru API-based image search, preview, download, and prompt extraction functionality.

#### Main Features
- 🔍 **Advanced Tag Search**: Complex tag search with exclusion syntax
- 📄 **Smart Pagination**: Efficient pagination loading mechanism
- 💡 **Intelligent Autocomplete**: Real-time tag completion with Chinese hints
- 🎨 **High-Quality Preview**: Responsive waterfall layout
- 📊 **Content Rating**: Filter by image rating
- 🏷️ **Tag Categories**: Selectable output tag categories
- ⭐ **Favorites System**: Cloud-synced favorites functionality
- ✍️ **Prompt Editor**: Built-in prompt editing capabilities
- 🔐 **User Authentication**: Danbooru account login support

#### Usage
1. Add `Danbooru > Danbooru Images Gallery` node in ComfyUI
2. Double-click node to open gallery interface
3. Enter search tags, supporting syntax:
   - Normal tags: `1girl blue_eyes`
   - Exclude tags: `1girl -blurry`
   - Complex search: `1girl blue_eyes smile -blurry`
4. Select images and import prompts to workflow

---

### 🔄 Character Feature Swap

**AI-Powered Character Feature Replacement Node**

Utilizes Large Language Model APIs to intelligently replace character features in prompts while preserving composition and environment.

#### Core Features
- 🤖 **Intelligent Understanding**: LLM-powered character feature understanding and replacement
- 🌐 **Multi-API Support**: Supports OpenRouter, Gemini, DeepSeek, and more
- ⚙️ **Highly Configurable**: Custom API services and model selection
- 📋 **Preset Management**: Save and switch feature replacement presets
- 🔧 **Easy Configuration**: Dedicated settings interface with connection testing

#### Supported API Services
- **OpenRouter**: `https://openrouter.ai/api/v1`
- **Gemini API**: `https://generativelanguage.googleapis.com/v1beta`
- **DeepSeek**: `https://api.deepseek.com/v1`
- **OpenAI Compatible**: Custom service addresses
- **Gemini CLI**: Local execution (requires `@google/gemini-cli`)

#### Usage Steps
1. Add `Danbooru > Character Feature Swap` node
2. Click "Settings" button to configure API
3. Connect inputs:
   - `original_prompt`: Original prompt
   - `character_prompt`: New character feature description
4. Get `new_prompt` output

---

### 📚 Prompt Selector

**Professional Prompt Library Management Node**

Categorize, manage, and select frequently used prompts to build personal prompt libraries and improve workflow efficiency.

#### Core Features
- 📁 **Category Management**: Create multiple categories to organize prompts
- 🖼️ **Preview Image Support**: Add visual previews to prompts
- 📦 **Import/Export**: Complete `.zip` format backup and sharing
- 🔄 **Batch Operations**: Batch deletion and moving support
- ⭐ **Favorites and Sorting**: Drag-and-drop sorting and favorites marking
- 🔗 **Flexible Concatenation**: Concatenation with upstream node outputs

#### Usage
1. Add `Danbooru > Prompt Selector` node
2. Double-click to open management interface and build prompt library
3. Select desired prompts
4. Optionally connect `prefix_prompt` input
5. Get concatenated `prompt` output

---

### 👥 Multi Character Editor

**Visual Multi-Character Regional Prompt Editor Node**

Professional visual editor supporting multi-character regional prompt creation with precise control over character positions and attributes.

#### Core Features
- 🎨 **Visual Editing**: Intuitive canvas drag-and-drop editing
- 🔄 **Dual Syntax Support**: Attention Couple and Regional Prompts
- 📐 **Precise Control**: Percentage and pixel coordinate positioning
- 🌊 **Feathering Effects**: Edge feathering for natural transitions
- ⚖️ **Weight Management**: Independent character weight control
- 💾 **Preset System**: Save and load character configurations
- ⚡ **Real-time Preview**: Instant syntax preview generation
- ✅ **Syntax Validation**: Automatic error detection and hints

#### Requirements
> ⚠️ **Important Notice**: This node requires **[comfyui-prompt-control](https://github.com/asagi4/comfyui-prompt-control)** plugin for full functionality, as ComfyUI natively doesn't support advanced syntax like MASK, FEATHER, AND, etc.

#### Syntax Mode Comparison

| Feature | Attention Couple | Regional Prompts |
|---------|------------------|------------------|
| Separator | COUPLE | AND |
| Generation Speed | Faster | Slower |
| Flexibility | Higher | Medium |
| FILL() Support | ✅ Supported | ❌ Not Supported |
| Region Separation | Medium | Stricter |
| Recommended Use | Rapid prototyping, flexible layouts | Precise control, strict regions |

#### Usage
1. Add `Danbooru > Multi Character Editor` node
2. Choose syntax mode and canvas dimensions
3. Double-click to open visual editing interface
4. Add characters and adjust positions, weights, feathering, etc.
5. Connect to **comfyui-prompt-control** node for use

#### Usage Examples

**Dual Portrait (Attention Couple)**:
```
portrait scene FILL() COUPLE MASK(0.00 0.50, 0.00 1.00, 1.00) beautiful woman with blonde hair, blue eyes FEATHER(10) COUPLE MASK(0.50 1.00, 0.00 1.00, 1.00) handsome man with brown hair, green eyes FEATHER(10)
```

**Three-Character Scene (Regional Prompts)**:
```
fantasy forest AND elf archer MASK(0.00 0.33, 0.00 1.00, 1.00) FEATHER(8) AND dwarf warrior MASK(0.33 0.66, 0.00 1.00, 1.00) FEATHER(8) AND wizard MASK(0.66 1.00, 0.00 1.00, 1.00) FEATHER(8)
```

---

## Installation

### Method 1: ComfyUI Manager Installation (Recommended)

1. Open Manager interface in ComfyUI
2. Click "Install Custom Nodes"
3. Search for "Danbooru Gallery" or "ComfyUI-Danbooru-Gallery"
4. Click "Install" button
5. Restart ComfyUI

### Method 2: Automatic Installation

```bash
# 1. Clone to ComfyUI/custom_nodes/ directory
git clone https://github.com/comfyui-extensions/comfyui-danbooru-gallery.git

# 2. Run installation script
cd comfyui-danbooru-gallery
python install.py

# 3. Restart ComfyUI
```

### Method 3: Manual Installation

```bash
# Install dependencies
pip install -r requirements.txt
```

---

## System Requirements

- **Python**: 3.8+
- **ComfyUI**: Latest version

### Core Dependencies

- `requests>=2.28.0` - HTTP request library
- `aiohttp>=3.8.0` - Async HTTP client
- `Pillow>=9.0.0` - Image processing library
- `torch>=1.12.0` - PyTorch framework
- `numpy>=1.21.0` - Numerical computing library

---

## Advanced Features

### 🔐 User Authentication System
- Support for Danbooru username and API key authentication
- Access to favorites and advanced features after authentication
- Automatic authentication status and network connection verification

### 🈳 Chinese-English Bilingual System
- **Bidirectional Translation**: Automatic translation of English tags to Chinese descriptions
- **Chinese Search**: Support for searching with Chinese input to find corresponding English tags
- **Fuzzy Matching**: Support for Chinese pinyin and partial character matching
- **Batch Translation**: Efficient batch tag translation processing
- **Real-time Hints**: Display Chinese translations during autocomplete

#### Translation Data Formats
- **JSON Format** (`zh_cn/all_tags_cn.json`): English tag to Chinese key-value mapping
- **CSV Format** (`zh_cn/danbooru.csv`): English tag, Chinese translation CSV file
- **Character CSV** (`zh_cn/wai_characters.csv`): Chinese character name, English tag CSV file

### ⚙️ Advanced Settings
- **Multi-language Support**: Chinese/English interface switching
- **Blacklist Management**: Custom filtering of unwanted tags
- **Prompt Filtering**: Automatic filtering of watermarks, usernames, etc.
- **Debug Mode**: Enable detailed logging output
- **Page Size**: Customize number of images displayed per page

---

## Project Structure

```
ComfyUI-Danbooru-Gallery/
├── __init__.py                     # Plugin entry point
├── danbooru_gallery/
│   ├── __init__.py
│   └── danbooru_gallery.py         # Danbooru Gallery backend logic
├── character_feature_swap/
│   ├── __init__.py
│   └── character_feature_swap.py   # Character Feature Swap backend logic
├── prompt_selector/
│   ├── __init__.py
│   └── prompt_selector.py          # Prompt Selector backend logic
├── multi_character_editor/
│   ├── __init__.py
│   ├── multi_character_editor.py   # Multi Character Editor backend logic
│   ├── doc/                        # Syntax documentation
│   │   ├── complete_syntax_guide.md
│   │   └── complete_syntax_guide_en.md
│   └── settings/                   # Configuration and preset files
│       ├── editor_settings.json
│       ├── presets.json
│       └── preset_images/
├── install.py                      # Smart installation script
├── requirements.txt                # Dependency list
├── js/
│   ├── danbooru_gallery.js         # Danbooru Gallery frontend
│   ├── character_feature_swap.js   # Character Feature Swap frontend
│   ├── prompt_selector.js          # Prompt Selector frontend
│   ├── multi_character_editor.js   # Multi Character Editor frontend
│   ├── multi_character_editor/     # Multi Character Editor components
│   │   ├── character_editor.js
│   │   ├── mask_editor.js
│   │   ├── output_area.js
│   │   ├── preset_manager.js
│   │   └── settings_menu.js
│   └── global/                     # Global shared components
│       ├── autocomplete_cache.js
│       ├── autocomplete_ui.js
│       ├── color_manager.js
│       ├── multi_language.js
│       ├── toast_manager.js
│       └── translations/
├── danbooru_gallery/zh_cn/         # Chinese translation data
│   ├── all_tags_cn.json
│   ├── danbooru.csv
│   └── wai_characters.csv
└── README.md                       # Documentation
```

---

## Troubleshooting

- **Connection Issues**: Check network and API key
- **Image Loading Fails**: Verify disk space and image URLs
- **Plugin Not Showing**: Check directory location and dependencies
- **Multi Character Editor Not Working**: Ensure comfyui-prompt-control plugin is installed
- **Performance Issues**: Check console logs for detailed information

---

## 开发 | Development

### 技术栈 | Tech Stack

- **Backend**: Python + aiohttp + requests
- **Frontend**: JavaScript + ComfyUI UI
- **Cache**: File system cache
- **API**: Danbooru REST API

### 贡献 | Contributing

欢迎提交 Issue 和 Pull Request！  
Issues and Pull Requests are welcome!

---

## 许可证 | License

MIT License

---

## 致谢 | Acknowledgments

- 感谢 Danbooru 提供优秀的 API | Thanks to Danbooru for the excellent API
- 感谢 ComfyUI 社区 | Thanks to the ComfyUI community
- 参考了 ComfyUI_Civitai_Gallery 项目 | Inspired by ComfyUI_Civitai_Gallery project

### 翻译文件来源 | Translation Data Sources

- [danbooru-diffusion-prompt-builder](https://github.com/wfjsw/danbooru-diffusion-prompt-builder) - Danbooru 标签翻译数据
- [zh_CN-Tags](https://github.com/Yellow-Rush/zh_CN-Tags) - 中文标签数据
- [ComfyUI_Mira](https://github.com/mirabarukaso/ComfyUI_Mira) - 角色翻译数据