# ComfyUI Danbooru Gallery

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
- ⚙️ **高级设置**: 调试模式、页面大小设置、缓存配置

### 快速安装

#### 方法一：自动安装（推荐）

```bash
# 1. 将插件放到 ComfyUI/custom_nodes/ 目录
git clone https://github.com/comfyui-extensions/comfyui-danbooru-gallery.git

# 2. 运行安装脚本
cd comfyui-danbooru-gallery
python install.py

# 3. 重启 ComfyUI
```

#### 方法二：手动安装

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
- ⚙️ **Advanced Settings**: Debug mode, page size settings, cache configuration

### Quick Installation

#### Method 1: Automatic Installation (Recommended)

```bash
# 1. Clone to ComfyUI/custom_nodes/ directory
git clone https://github.com/comfyui-extensions/comfyui-danbooru-gallery.git

# 2. Run installation script
cd comfyui-danbooru-gallery
python install.py

# 3. Restart ComfyUI
```

#### Method 2: Manual Installation

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