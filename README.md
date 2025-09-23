# ComfyUI Danbooru Gallery
<img width="966" height="830" alt="image" src="https://github.com/user-attachments/assets/e2a5d34e-0001-417e-bf8e-7753521ea0d3" />

[中文](#中文版本) | [English](#english-version)

---

## 中文版本

### 简介

一个基于 Danbooru API 的 ComfyUI 图像搜索和画廊插件，支持通过标签搜索图像、查看详细信息、内容过滤等功能。

### 主要特性

- 🔍 **标签搜索**: 支持通过 Danbooru 标签进行精确搜索
- 📄 **分页加载**: 高效的分页机制，提升浏览体验
- 💡 **智能补全**: 输入时自动补全热门标签
- 🎨 **图像预览**: 高质量图像预览和下载
- 🔧 **设置管理**: 多语言、黑名单、提示词过滤设置
- 🎯 **ComfyUI 集成**: 完美集成到 ComfyUI 工作流
- 🌊 **瀑布流布局**: 响应式瀑布流图像排列
- 📊 **分级过滤**: 支持按图像分级过滤内容
- 🏷️ **类别选择**: 可选择输出的标签类别
- 📝 **格式化选项**: 支持括号转义和下划线替换
- 🎖️ **排行榜模式**: 支持按热度排序显示
- 🚫 **黑名单过滤**: 自定义过滤不需要的内容
- 📱 **响应式设计**: 自适应不同屏幕尺寸
- 🔐 **用户认证**: 支持 Danbooru 用户名和 API 密钥认证
- ⭐ **收藏功能**: 添加和移除图像收藏，支持云端同步
- 🌐 **网络检测**: 自动检测与 Danbooru 的网络连接状态
- 🈳 **中英对照**: 支持标签中英文互译和中文搜索匹配
- ⚙️ **高级设置**: 调试模式、页面大小设置、缓存配置
- 🖼️ **查看大图**: 支持点击图片查看全尺寸大图
- ✍️ **编辑提示词**: 支持对提示词进行增加、删减标签，并提供智能补全和一键还原功能
- 📋 **一键复制**: 方便地一键复制所有标签

### 快速安装

#### 方法一：ComfyUI Manager 安装（最推荐）

1. 在 ComfyUI 中打开 Manager 界面
2. 点击 "Install Custom Nodes"
3. 搜索 "Danbooru Gallery" 或 "ComfyUI-Danbooru-Gallery"
4. 点击 "Install" 按钮
5. 重启 ComfyUI

#### 方法二：自动安装

```bash
# 1. 将插件放到 ComfyUI/custom_nodes/ 目录
git clone https://github.com/comfyui-extensions/comfyui-danbooru-gallery.git

# 2. 运行安装脚本
cd comfyui-danbooru-gallery
python install.py

# 3. 重启 ComfyUI
```

#### 方法三：手动安装

```bash
# 安装依赖
pip install -r requirements.txt
```

### 系统要求

- **Python**: 3.8+
- **ComfyUI**: 最新版本

### 核心依赖

- `requests>=2.28.0` - HTTP请求库
- `aiohttp>=3.8.0` - 异步HTTP客户端
- `Pillow>=9.0.0` - 图像处理库
- `torch>=1.12.0` - PyTorch框架
- `numpy>=1.21.0` - 数值计算库

### 基本使用

1. 在 ComfyUI 中添加 "Danbooru Images Gallery" 节点
2. 双击节点打开画廊界面
3. 输入搜索标签（如：`1girl blue_eyes smile`）
4. 选择评分过滤器并搜索
5. 点击图像选择并导入到节点

### 详细功能说明

#### 🔐 用户认证系统
- 支持 Danbooru 用户名和 API 密钥认证
- 认证后可使用收藏功能和高级功能
- 自动验证认证状态和网络连接

#### ⭐ 收藏功能
- 添加/移除图像收藏
- 支持云端同步收藏列表
- 本地缓存收藏状态

#### 🌐 网络连接检测
- 自动检测与 Danbooru 服务器的连接状态
- 显示网络错误信息和超时处理

#### ⚙️ 高级设置
- **多语言支持**: 中英文界面切换
- **黑名单管理**: 自定义过滤不需要的标签
- **提示词过滤**: 自动过滤水印、用户名等标签
- **调试模式**: 启用详细日志输出
- **页面大小**: 自定义每页显示的图像数量

#### 🈳 中英对照系统
- **中英互译**: 自动翻译英文标签为中文描述
- **中文搜索**: 支持输入中文直接搜索对应英文标签
- **模糊匹配**: 支持中文拼音和部分字符匹配
- **批量翻译**: 高效的批量标签翻译处理
- **实时提示**: 自动补全时显示中文翻译
- **多数据源**: 支持JSON和CSV格式的翻译数据

### 翻译功能详解

#### 支持的翻译数据格式
- **JSON格式** (`zh_cn/all_tags_cn.json`): 英文标签到中文的键值对映射
- **CSV格式** (`zh_cn/danbooru.csv`): 英文标签,中文翻译 的CSV文件
- **角色CSV** (`zh_cn/wai_characters.csv`): 中文角色名,英文标签 的CSV文件

#### 翻译功能特性
- **智能搜索**: 支持精确匹配、前缀匹配、包含匹配和模糊匹配
- **缓存优化**: 翻译结果缓存，提高响应速度
- **下划线处理**: 自动处理有无下划线的标签变体
- **中文索引**: 构建中文字符索引，支持快速搜索
- **权重排序**: 根据匹配度为搜索结果排序

#### 使用方法
1. **中文搜索**: 在搜索框中直接输入中文（如"女孩"），系统会自动匹配对应的英文标签
2. **翻译显示**: 在中文界面下，标签悬浮提示和自动补全会显示中文翻译
3. **智能补全**: 输入英文标签时，自动显示对应的中文翻译

### 标签语法

```
普通标签：tag_name
排除标签：-tag_name  
多标签组合：tag1 tag2 tag3
示例：1girl blue_eyes smile -blurry
```

### 项目结构

```
ComfyUI-Danbooru-Gallery/
├── __init__.py                 # 插件入口
├── danbooru_gallery.py         # 主要后端逻辑
├── install.py                  # 智能安装脚本
├── requirements.txt            # 依赖清单
├── pyproject.toml             # 项目配置
├── js/
│   └── danbooru_gallery.js     # 前端界面
├── zh_cn/                      # 中文翻译数据
│   ├── all_tags_cn.json        # JSON格式翻译数据
│   ├── danbooru.csv            # CSV格式翻译数据
│   └── wai_characters.csv      # 角色翻译数据
├── cache/                      # 缓存目录
└── README.md                   # 说明文档
```

### 故障排除

- **连接问题**: 检查网络连接和 API 密钥
- **图像加载失败**: 确认磁盘空间和图像 URL
- **插件不显示**: 检查目录位置和依赖安装
- **性能问题**: 检查控制台日志获取详细信息

---

## English Version

### Overview

A ComfyUI plugin for browsing and importing images from Danbooru using its API, with features including tag-based search, image preview, content filtering, and more.

### Key Features

- 🔍 **Tag Search**: Precise search using Danbooru tags
- 📄 **Pagination**: Efficient pagination for better browsing
- 💡 **Intelligent Autocomplete**: Autocomplete popular tags while typing
- 🎨 **Image Preview**: High-quality image preview and download
- 🔧 **Settings**: Multi-language, blacklist, and prompt filtering
- 🎯 **ComfyUI Integration**: Seamless integration with ComfyUI workflow
- 🌊 **Waterfall Layout**: Responsive waterfall image arrangement
- 📊 **Rating Filter**: Filter content by image rating
- 🏷️ **Category Selection**: Choose which tag categories to output
- 📝 **Formatting Options**: Support bracket escaping and underscore replacement
- 🎖️ **Ranking Mode**: Display images sorted by popularity
- 🚫 **Blacklist Filter**: Custom filtering of unwanted content
- 📱 **Responsive Design**: Adaptive to different screen sizes
- 🔐 **User Authentication**: Support for Danbooru username and API key authentication
- ⭐ **Favorites**: Add and remove image favorites with cloud synchronization
- 🌐 **Network Detection**: Automatic detection of network connection to Danbooru
- 🈳 **Chinese-English Bilingual**: Support for tag translation and Chinese search matching
- ⚙️ **Advanced Settings**: Debug mode, page size settings, cache configuration
- 🖼️ **View Full Image**: Click on an image to view the full-size version
- ✍️ **Edit Prompts**: Add or remove tags from prompts, with intelligent autocomplete and one-click restore
- 📋 **One-Click Copy**: Easily copy all tags with a single click

### Quick Installation

#### Method 1: ComfyUI Manager Installation (Most Recommended)

1. Open Manager interface in ComfyUI
2. Click "Install Custom Nodes"
3. Search for "Danbooru Gallery" or "ComfyUI-Danbooru-Gallery"
4. Click "Install" button
5. Restart ComfyUI

#### Method 2: Automatic Installation

```bash
# 1. Clone to ComfyUI/custom_nodes/ directory
git clone https://github.com/comfyui-extensions/comfyui-danbooru-gallery.git

# 2. Run installation script
cd comfyui-danbooru-gallery
python install.py

# 3. Restart ComfyUI
```

#### Method 3: Manual Installation

```bash
# Install dependencies
pip install -r requirements.txt
```

### System Requirements

- **Python**: 3.8+
- **ComfyUI**: Latest version

### Core Dependencies

- `requests>=2.28.0` - HTTP request library
- `aiohttp>=3.8.0` - Async HTTP client
- `Pillow>=9.0.0` - Image processing library
- `torch>=1.12.0` - PyTorch framework
- `numpy>=1.21.0` - Numerical computing library

### Basic Usage

1. Add "Danbooru Images Gallery" node in ComfyUI
2. Double-click the node to open gallery interface
3. Enter search tags (e.g., `1girl blue_eyes smile`)
4. Select rating filter and search
5. Click images to select and import to node

### Detailed Features

#### 🔐 User Authentication System
- Support for Danbooru username and API key authentication
- Access to favorites and advanced features after authentication
- Automatic authentication status and network connection verification

#### ⭐ Favorites Feature
- Add/remove image favorites
- Cloud synchronization of favorites list
- Local caching of favorite status

#### 🌐 Network Connection Detection
- Automatic detection of connection status to Danbooru server
- Display network error messages and timeout handling

#### ⚙️ Advanced Settings
- **Multi-language Support**: Chinese/English interface switching
- **Blacklist Management**: Custom filtering of unwanted tags
- **Prompt Filtering**: Automatic filtering of watermarks, usernames, etc.
- **Debug Mode**: Enable detailed logging output
- **Page Size**: Customize number of images displayed per page

#### 🈳 Chinese-English Bilingual System
- **Bidirectional Translation**: Automatic translation of English tags to Chinese descriptions
- **Chinese Search**: Support for searching with Chinese input to find corresponding English tags
- **Fuzzy Matching**: Support for Chinese pinyin and partial character matching
- **Batch Translation**: Efficient batch tag translation processing
- **Real-time Hints**: Display Chinese translations during autocomplete
- **Multiple Data Sources**: Support for JSON and CSV format translation data

### Translation Features

#### Supported Translation Data Formats
- **JSON Format** (`zh_cn/all_tags_cn.json`): English tag to Chinese key-value mapping
- **CSV Format** (`zh_cn/danbooru.csv`): English tag, Chinese translation CSV file
- **Character CSV** (`zh_cn/wai_characters.csv`): Chinese character name, English tag CSV file

#### Translation System Features
- **Intelligent Search**: Support for exact match, prefix match, contains match, and fuzzy match
- **Cache Optimization**: Translation result caching for improved response speed
- **Underscore Handling**: Automatic handling of tag variants with/without underscores
- **Chinese Indexing**: Build Chinese character index for fast searching
- **Weight Sorting**: Sort search results by matching degree

#### Usage
1. **Chinese Search**: Enter Chinese directly in search box (e.g., "女孩"), system will automatically match corresponding English tags
2. **Translation Display**: In Chinese interface, tag tooltips and autocomplete show Chinese translations
3. **Smart Completion**: When typing English tags, automatically display corresponding Chinese translations

### Tag Syntax

```
Normal tags: tag_name
Exclude tags: -tag_name
Multiple tags: tag1 tag2 tag3
Example: 1girl blue_eyes smile -blurry
```

### Project Structure

```
ComfyUI-Danbooru-Gallery/
├── __init__.py                 # Plugin entry point
├── danbooru_gallery.py         # Main backend logic
├── install.py                  # Smart installation script
├── requirements.txt            # Dependency list
├── pyproject.toml             # Project configuration
├── js/
│   └── danbooru_gallery.js     # Frontend interface
├── zh_cn/                      # Chinese translation data
│   ├── all_tags_cn.json        # JSON format translation data
│   ├── danbooru.csv            # CSV format translation data
│   └── wai_characters.csv      # Character translation data
├── cache/                      # Cache directory
└── README.md                   # Documentation
```

### Troubleshooting

- **Connection Issues**: Check network and API key
- **Image Loading Fails**: Verify disk space and image URLs
- **Plugin Not Showing**: Check directory location and dependencies
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

### 许可证 | License

MIT License

### 致谢 | Acknowledgments

- 感谢 Danbooru 提供优秀的 API | Thanks to Danbooru for the excellent API
- 感谢 ComfyUI 社区 | Thanks to the ComfyUI community
- 参考了 ComfyUI_Civitai_Gallery 项目 | Inspired by ComfyUI_Civitai_Gallery project

#### 翻译文件来源 | Translation Data Sources

- [danbooru-diffusion-prompt-builder](https://github.com/wfjsw/danbooru-diffusion-prompt-builder) - Danbooru 标签翻译数据
- [zh_CN-Tags](https://github.com/Yellow-Rush/zh_CN-Tags) - 中文标签数据
- [ComfyUI_Mira](https://github.com/mirabarukaso/ComfyUI_Mira) - 角色翻译数据


---

### 🌟 新增节点：人物特征替换 (Character Feature Swap)

> [!WARNING]
> **此节点目前正在开发中，尚不可用。**

这是一个利用大语言模型（LLM）API 来智能替换提示词中人物相关特征的节点。你可以用它来将一张图中的角色特征（如发型、眼睛颜色、服装等）替换为你想要的特征，同时尽可能保留原始构图、姿势和环境。

#### 功能

-   **智能替换**：通过 LLM 理解并替换提示词中的人物特征。
-   **高度可配置**：支持自定义 LLM API 服务（默认 OpenRouter）、模型和 AI 提示。
-   **易于使用**：节点上提供独立的“设置”按钮，方便配置 API Key 等敏感信息。

#### 如何使用

1.  **添加节点**：在 ComfyUI 中，添加 `Danbooru > 人物特征替换` 节点。
2.  **配置API**：
    -   点击节点上的 **“设置 (Settings)”** 按钮。
    -   在弹出的对话框中，填入你的 LLM API URL 和 API Key。推荐使用 [OpenRouter](https://openrouter.ai/)，它支持多种模型。
    -   默认 API URL: `https://openrouter.ai/api/v1/chat/completions`
    -   默认模型: `gryphe/mythomax-l2-13b` (你也可以换成其他兼容的模型)
    -   点击 **“保存”**。
3.  **连接输入**：
    -   `original_prompt`：输入你从 D 站或其他地方获取的、包含完整人物特征的原始提示词。
    -   `target_features`：输入你想要替换成的新的人物特征提示词，例如你自己的虚拟角色的特征。
    -   `feature_categories_to_replace` (可选): 告知 AI 需要重点关注和替换哪些特征类别，有助于提高准确性。
4.  **获取输出**：
    -   `new_prompt` 输出的就是经过 LLM 处理后、替换了特征的新提示词。你可以将它连接到你的提示词编码器（如 `CLIPTextEncode`）中使用。

#### 示例

-   **原始提示词 (original\_prompt)**: `1girl, solo, long hair, blue eyes, school uniform, classroom, from side`
-   **目标特征 (target\_features)**: `short silver hair, red eyes, witch hat, magical forest`
-   **输出的新提示词 (new\_prompt)**: `1girl, solo, short silver hair, red eyes, witch hat, magical forest, from side` (这是一个理想的输出示例)

---
