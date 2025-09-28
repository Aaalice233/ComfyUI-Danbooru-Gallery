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
- 🔄 **人物特征替换**: 新增 `Character Feature Swap` 节点，利用 LLM 智能替换提示词中的人物特征。
- 📚 **提示词选择器**: 新增 `Prompt Selector` 节点，用于分类管理和选择常用提示词。

### 新增节点详细说明

#### 🌟 人物特征替换 (Character Feature Swap)

这是一个利用大语言模型（LLM）API 来智能替换提示词中人物相关特征的节点。你可以用它来将一张图中的角色特征（如发型、眼睛颜色、服装等）替换为你想要的特征，同时尽可能保留原始构图、姿势和环境。

##### 功能

-   **智能替换**：通过 LLM 理解并替换提示词中的人物特征。
-   **多渠道支持**：支持 OpenRouter, Gemini API, DeepSeek, 以及其他兼容 OpenAI 的 API。同时支持通过 `@google/gemini-cli` 在本地执行。
-   **高度可配置**：支持自定义 LLM API 服务、模型和 AI 提示。
-   **预设管理**：可以保存和切换多组要替换的“特征类别”，方便不同场景使用。
-   **易于使用**：节点上提供独立的“设置”按钮，方便配置 API Key 等敏感信息，并提供连接测试功能。

##### 如何使用

1.  **添加节点**：在 ComfyUI 中，添加 `Danbooru > 人物特征替换 (Character Feature Swap)` 节点。
2.  **配置API**：
    -   点击节点上的 **“设置 (Settings)”** 按钮。
    -   在弹出的对话框中，选择你要使用的 `API渠道`。
    -   根据所选渠道，填入你的 API URL 和 API Key。
        -   **OpenRouter**: `https://openrouter.ai/api/v1`
        -   **Gemini API**: `https://generativelanguage.googleapis.com/v1beta`
        -   **DeepSeek**: `https://api.deepseek.com/v1`
        -   **OpenAI兼容**: 填入你的服务地址，例如 `http://localhost:11434/v1`
        -   **Gemini CLI**: 无需 URL 和 Key，但需要预先安装 `gemini-cli`。
    -   点击 **“获取模型列表”** 并选择一个你偏好的模型。
    -   点击 **“测试连接”** 和 **“测试回复”** 确保配置正确。
    -   点击 **“保存”**。
3.  **连接输入**：
    -   `original_prompt`：输入你从 Danbooru Gallery 或其他地方获取的、包含完整人物特征的原始提示词。
    -   `character_prompt`：输入你想要替换成的新的人物特征提示词，例如你自己的虚拟角色的特征。
4.  **获取输出**：
    -   `new_prompt` 输出的就是经过 LLM 处理后、替换了特征的新提示词。你可以将它连接到你的提示词编码器（如 `CLIPTextEncode`）中使用。

> [!NOTE]
> 如果选择使用 `Gemini CLI` 渠道，你需要先通过 `npm` 全局安装它：
> `npm install -g @google/gemini-cli`
> 并确保 `gemini` 命令在你的系统 `PATH` 中。

#### 📚 提示词选择器 (Prompt Selector)

这是一个用于分类、管理和选择常用提示词的节点。你可以用它来打造自己的提示词库，提高工作流效率。

##### 功能

-   **分类管理**：创建多个分类来组织你的提示词，例如“质量串”、“画风串”、“LORA”等。
-   **预览图支持**：为每个提示词条目上传一张预览图，方便直观选择。
-   **导入/导出**：支持通过 `.zip` 文件完整地导入和导出整个提示词库，方便备份和分享。
-   **批量操作**：支持批量删除和移动提示词。
-   **排序与收藏**：支持拖拽排序和标记常用提示词。
-   **灵活拼接**：可以将选择的提示词与上游节点（如 `Danbooru Gallery`）的输出拼接在一起。

##### 如何使用

1.  **添加节点**：在 ComfyUI 中，添加 `Danbooru > 提示词选择器 (Prompt Selector)` 节点。
2.  **管理词库**：
    -   双击节点打开管理界面。
    -   通过 **“添加分类”**、**“添加提示词”** 来构建你的词库。
    -   点击提示词条目右侧的图片图标可以上传预览图。
    -   使用 **“导入/导出”** 按钮来备份或恢复你的数据。
3.  **选择提示词**：
    -   在界面中点击你想要使用的提示词，它们会被添加到下方的“已选提示词”区域。
    -   你可以直接在“已选提示词”区域调整顺序或删除。
4.  **连接输入 (可选)**：
    -   `prefix_prompt`：可以连接一个上游的提示词输出（例如 `Danbooru Gallery`），选择器中的提示词会自动追加在后面。
5.  **获取输出**：
    -   `prompt` 输出拼接好的最终提示词。

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
├── install.py                      # 智能安装脚本
├── requirements.txt                # 依赖清单
├── js/
│   ├── danbooru_gallery.js         # Danbooru画廊前端
│   ├── character_feature_swap.js   # 人物特征替换前端
│   └── prompt_selector.js          # 提示词选择器前端
├── danbooru_gallery/zh_cn/         # 中文翻译数据
│   ├── all_tags_cn.json
│   ├── danbooru.csv
│   └── wai_characters.csv
└── README.md                       # 说明文档
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
- 🔄 **Character Feature Swap**: Adds a `Character Feature Swap` node to intelligently replace character features in prompts using an LLM.
- 📚 **Prompt Selector**: Adds a `Prompt Selector` node for categorizing, managing, and selecting frequently used prompts.

### New Nodes in Detail

#### 🌟 Character Feature Swap

This node utilizes a Large Language Model (LLM) API to intelligently replace character-related features in a prompt. You can use it to swap features from one image's prompt (like hair style, eye color, clothing) with your desired features, while preserving the original composition, pose, and environment as much as possible.

##### Features

-   **Intelligent Swapping**: Understands and replaces character features in prompts via an LLM.
-   **Multi-Channel Support**: Supports OpenRouter, Gemini API, DeepSeek, and other OpenAI-compatible APIs. Also supports local execution via `@google/gemini-cli`.
-   **Highly Configurable**: Allows customization of the LLM API service, model, and AI prompt.
-   **Preset Management**: Save and switch between multiple sets of "feature categories" to replace, making it convenient for different scenarios.
-   **Easy to Use**: A dedicated "Settings" button on the node simplifies the configuration of sensitive information like API keys and includes connection testing functionality.

##### How to Use

1.  **Add Node**: In ComfyUI, add the `Danbooru > Character Feature Swap` node.
2.  **Configure API**:
    -   Click the **"Settings"** button on the node.
    -   In the dialog, select the `API Channel` you want to use.
    -   Enter your API URL and API Key based on the selected channel.
        -   **OpenRouter**: `https://openrouter.ai/api/v1`
        -   **Gemini API**: `https://generativelanguage.googleapis.com/v1beta`
        -   **DeepSeek**: `https://api.deepseek.com/v1`
        -   **OpenAI-compatible**: Enter your service address, e.g., `http://localhost:11434/v1`
        -   **Gemini CLI**: No URL or Key needed, but requires `gemini-cli` to be pre-installed.
    -   Click **"Get Model List"** and choose your preferred model.
    -   Click **"Test Connection"** and **"Test Response"** to ensure the configuration is correct.
    -   Click **"Save"**.
3.  **Connect Inputs**:
    -   `original_prompt`: Input the original prompt containing full character features, obtained from Danbooru Gallery or elsewhere.
    -   `character_prompt`: Input the new character features you want to swap in, such as your own virtual character's features.
4.  **Get Output**:
    -   `new_prompt` outputs the new prompt with the replaced features, processed by the LLM. You can connect it to your prompt encoder (e.g., `CLIPTextEncode`).

> [!NOTE]
> If you choose the `Gemini CLI` channel, you need to install it globally via `npm` first:
> `npm install -g @google/gemini-cli`
> And ensure the `gemini` command is in your system's `PATH`.

#### 📚 Prompt Selector

This node is for categorizing, managing, and selecting frequently used prompts. You can use it to build your own prompt library and improve your workflow efficiency.

##### Features

-   **Category Management**: Create multiple categories to organize your prompts, such as "Quality Tags," "Style Tags," "LORAs," etc.
-   **Preview Image Support**: Upload a preview image for each prompt entry for intuitive selection.
-   **Import/Export**: Supports importing and exporting the entire prompt library via a `.zip` file for easy backup and sharing.
-   **Batch Operations**: Supports batch deletion and moving of prompts.
-   **Sorting and Favorites**: Supports drag-and-drop sorting and marking frequently used prompts.
-   **Flexible Concatenation**: The selected prompts can be concatenated with the output of an upstream node (like `Danbooru Gallery`).

##### How to Use

1.  **Add Node**: In ComfyUI, add the `Danbooru > Prompt Selector` node.
2.  **Manage Library**:
    -   Double-click the node to open the management interface.
    -   Build your library using **"Add Category"** and **"Add Prompt"**.
    -   Click the image icon on the right of a prompt entry to upload a preview image.
    -   Use the **"Import/Export"** buttons to back up or restore your data.
3.  **Select Prompts**:
    -   Click the prompts you want to use in the interface, and they will be added to the "Selected Prompts" area below.
    -   You can reorder or delete them directly in the "Selected Prompts" area.
4.  **Connect Input (Optional)**:
    -   `prefix_prompt`: You can connect an upstream prompt output (e.g., from `Danbooru Gallery`), and the prompts from the selector will be appended to it.
5.  **Get Output**:
    -   `prompt` outputs the final concatenated prompt.

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
├── install.py                      # Smart installation script
├── requirements.txt                # Dependency list
├── js/
│   ├── danbooru_gallery.js         # Danbooru Gallery frontend
│   ├── character_feature_swap.js   # Character Feature Swap frontend
│   └── prompt_selector.js          # Prompt Selector frontend
├── danbooru_gallery/zh_cn/         # Chinese translation data
│   ├── all_tags_cn.json
│   ├── danbooru.csv
│   └── wai_characters.csv
└── README.md                       # Documentation
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


