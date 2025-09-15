# ComfyUI Danbooru Gallery

一个基于 Danbooru API 的 ComfyUI 图像搜索和画廊插件，支持通过标签搜索图像、查看详细信息、收藏管理等功能。

## 功能特性

- 🔍 **标签搜索**: 支持通过 Danbooru 标签进行精确搜索
- 📄 **分页加载**: 高效的分页机制，提升浏览体验
- 💾 **缓存机制**: 智能缓存，减少重复请求
- ⭐ **收藏管理**: 支持收藏喜欢的图像
- 🎨 **图像预览**: 高质量图像预览和下载
- 🔧 **设置管理**: 支持 API 密钥配置
- 🎯 **ComfyUI 集成**: 完美集成到 ComfyUI 工作流

## 安装

1. 将此插件文件夹放置到 ComfyUI 的 `custom_nodes` 目录下：
   ```
   ComfyUI/custom_nodes/ComfyUI-Danbooru-Gallery/
   ```

2. 安装依赖：
   ```bash
   pip install Pybooru aiohttp Pillow
   ```

3. 重启 ComfyUI

## 配置

### API 密钥设置（推荐）

为了获得更好的体验和更高的请求限制，建议配置 Danbooru API 密钥：

1. 在 Danbooru 网站注册账号
2. 进入设置页面获取 API 密钥
3. 在插件界面中点击 "Settings" 按钮
4. 输入用户名和 API 密钥
5. 点击 "Test Connection" 测试连接
6. 保存设置

### 匿名使用

如果不配置 API 密钥，插件将以匿名模式运行，但会有更严格的请求限制。

## 使用方法

### 基本使用

1. 在 ComfyUI 中添加 "Danbooru Images Gallery" 节点
2. 双击节点打开画廊界面
3. 在搜索框中输入标签（如：`1girl blue_eyes smile`）
4. 选择评分过滤器
5. 点击 "Search" 按钮搜索图像
6. 点击图像选择并导入到节点

### 标签语法

- 普通标签：`tag_name`
- 排除标签：`-tag_name`
- 多标签组合：`tag1 tag2 tag3`
- 示例：`1girl blue_eyes smile -blurry`

### 收藏功能

- 点击图像右上角的收藏按钮添加/移除收藏
- 在 "Favorites" 标签页查看所有收藏的图像
- 支持标签过滤收藏夹

## 节点输出

Danbooru Gallery 节点提供以下输出：

- **positive_prompt**: 正向提示词（从图像标签中提取）
- **negative_prompt**: 负向提示词（以 `-` 开头的标签）
- **image**: 下载的图像数据（如果启用了下载）
- **info**: 图像的详细信息（JSON 格式）

## 缓存机制

插件实现了多层缓存机制：

- **搜索结果缓存**: 1小时内相同搜索条件的缓存
- **图像缓存**: 本地缓存下载的图像，避免重复下载
- **UI状态缓存**: 保存用户的界面设置

缓存文件存储在插件目录的 `cache/` 文件夹中。

## 故障排除

### 连接问题

- 检查网络连接
- 确认 Danbooru 网站是否可访问
- 如果使用 API 密钥，确认密钥是否正确

### 图像加载失败

- 检查图像 URL 是否有效
- 确认有足够的磁盘空间存储缓存
- 尝试清除缓存文件

### 插件不显示

- 确认插件文件放置在正确的目录
- 检查 Python 依赖是否正确安装
- 查看 ComfyUI 控制台是否有错误信息

## 开发

### 项目结构

```
ComfyUI-Danbooru-Gallery/
├── __init__.py              # 插件入口
├── danbooru_gallery.py      # 主要后端逻辑
├── js/
│   └── danbooru_gallery.js  # 前端界面
├── cache/                   # 缓存目录
├── pyproject.toml          # 项目配置
└── README.md               # 说明文档
```

### 扩展开发

插件基于以下技术栈：

- **后端**: Python + aiohttp + Pybooru
- **前端**: JavaScript + ComfyUI UI 框架
- **缓存**: 文件系统缓存
- **API**: Danbooru REST API

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 致谢

- 感谢 Danbooru 提供优秀的 API
- 感谢 ComfyUI 社区提供优秀的平台
- 参考了 ComfyUI_Civitai_Gallery 项目的架构设计