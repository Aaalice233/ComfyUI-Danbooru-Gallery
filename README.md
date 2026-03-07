# 🎨 ComfyUI-Danbooru-Gallery

🇨🇳 本节点专为 [ShiQi_Workflow](https://github.com/Aaalice233/ShiQi_Workflow) 工作流打造，聚焦中文用户的实际使用场景与体验。

✨ 面向 ComfyUI 的实用节点集合，重点覆盖 Danbooru 图像检索、提示词编辑/清洗、缓存管理、Krita 联动与工作流辅助工具。

## 📌 当前状态

- ✅ 当前注册节点数：`28`
- 🧩 前端扩展：包含若干 JS 面板与交互增强（如快速组导航）
- 🗂️ 已移除的旧节点不再列出（例如 `Group Executor Manager`）

## 🚀 安装

1. 进入 ComfyUI 自定义节点目录：

```bash
cd ComfyUI/custom_nodes
```

2. 克隆仓库：

```bash
git clone https://github.com/Aaalice233/ComfyUI-Danbooru-Gallery.git
```

3. 安装依赖：

```bash
cd ComfyUI-Danbooru-Gallery
pip install -r requirements.txt
```

4. 重启 ComfyUI。

## 🛠️ 依赖与环境

- Python `>=3.8`
- 主要依赖：`requests`、`aiohttp`、`aiosqlite`、`psutil`、`Pillow`、`torch`、`numpy`

## 🧠 节点清单（当前有效）

### 🖼️ 图像与提示词核心

- `DanbooruGalleryNode`：D站画廊 (Danbooru Gallery)
- `PromptSelector`：提示词选择器 (Prompt Selector)
- `PromptCleaningMaid`：提示词清洁女仆 (Prompt Cleaning Maid)
- `CharacterFeatureSwapNode`：角色特征交换 (Character Feature Swap)
- `MultiCharacterEditorNode`：多角色编辑器 (Multi Character Editor)

### 💾 缓存与资源

- `ImageCacheSave`：图像缓存保存 (Image Cache Save)
- `ImageCacheGet`：图像缓存获取 (Image Cache Get)
- `GlobalTextCacheSave`：全局文本缓存保存 (Global Text Cache Save)
- `GlobalTextCacheGet`：全局文本缓存获取 (Global Text Cache Get)
- `TextCacheViewer`：文本缓存查看器 (Text Cache Viewer)

### 📂 图像输入输出与文件

- `SimpleLoadImage`：简易加载图像 (Simple Load Image)
- `SaveImagePlus`：保存图像增强版 (Save Image Plus)
- `SimpleImageCompare`：简易图像对比 (Simple Image Compare)
- `SimpleCheckpointLoaderWithName`：简易Checkpoint加载器 (Simple Checkpoint Loader)
- `ModelNameExtractor`：模型名称提取器 (Model Name Extractor)

### 🔧 工作流控制与字符串工具

- `ParameterControlPanel`：参数控制面板 (Parameter Control Panel)
- `ParameterBreak`：参数展开 (Parameter Break)
- `SimpleStringSplit`：简易字符串分隔 (Simple String Split)
- `SimpleValueSwitch`：简易值切换 (Simple Value Switch)
- `EnumSwitch`：枚举切换 (Enum Switch)
- `WorkflowDescription`：工作流说明 (Workflow Description)
- `SimpleNotify`：简易通知 (Simple Notify)
- `ResolutionMasterSimplify`：分辨率大师简化版 (Resolution Master Simplify)

### 🧷 组管理相关

- `GroupMuteManager`：组静音管理器 (Group Mute Manager)
- `GroupIgnoreManager`：组忽略管理器 (Group Ignore Manager)
- `GroupIsEnabled`：组是否启用 (Group Is Enabled)

### 🎨 Krita 联动

- `OpenInKrita`：从Krita获取数据 (Fetch From Krita)
- `FetchFromKrita`：从Krita获取数据 (Fetch From Krita)

## 🧩 非节点型前端扩展

以下功能以 JS 扩展形态存在，不会在节点列表中单独占一个节点名：

- `Quick Group Navigation`（快速组导航）
- 部分节点的设置弹窗、缓存面板、多语言与日志上报能力

## 📎 兼容与说明

- 本项目是 [ShiQi_Workflow](https://github.com/Aaalice233/ShiQi_Workflow) 的配套节点集，也可独立使用。
- 部分节点（如多角色编辑相关）可能依赖额外生态插件，请按节点 UI 提示安装。
- 若从旧版本升级，请以本 README 的“节点清单（当前有效）”为准，旧文档中的已删除节点不再维护。

## ❓ 常见问题

### 1. 🔍 节点没出现

- 确认仓库路径为 `ComfyUI/custom_nodes/ComfyUI-Danbooru-Gallery`
- 确认依赖安装完成后重启 ComfyUI
- 查看 ComfyUI 控制台是否有导入异常日志

### 2. 🖥️ 前端面板没加载

- 检查 `WEB_DIRECTORY` 是否成功注册（插件初始化日志会输出）
- 清理浏览器缓存后刷新 ComfyUI 页面

### 3. 🧪 Krita 功能不可用

- 检查 Krita 插件安装状态
- 查看节点内的安装/重装按钮日志提示

## 🧑‍💻 开发

- 代码入口：`__init__.py`
- Python 节点：`py/`
- 前端扩展：`js/`
- 工具脚本：`tools/`

## 📄 许可证

[MIT](LICENSE)
