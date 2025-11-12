# Aaalice的定制节点 (Aaalice's Custom Nodes)

<img width="966" height="830" alt="image" src="https://github.com/user-attachments/assets/e2a5d34e-0001-417e-bf8e-7753521ea0d3" />

---

> [!NOTE]
> **项目说明 | Project Notice**
> 本项目是专为 [ShiQi_Workflow](https://github.com/Aaalice233/ShiQi_Workflow) 工作流定制开发的一系列ComfyUI节点。
> This project is a collection of ComfyUI nodes custom-developed specifically for the [ShiQi_Workflow](https://github.com/Aaalice233/ShiQi_Workflow).

---

## 目录 | Table of Contents

### 中文版本
- [简介](#简介)
- [主要特性](#主要特性)
- [节点介绍](#节点介绍)
  - [🖼️ D站画廊 (Danbooru Gallery)](#-d站画廊-danbooru-gallery)
  - [🔄 人物特征替换 (Character Feature Swap)](#-人物特征替换-character-feature-swap)
  - [📚 提示词选择器 (Prompt Selector)](#-提示词选择器-prompt-selector)
  - [👥 多人角色提示词编辑器 (Multi Character Editor)](#-多人角色提示词编辑器-multi-character-editor)
  - [🧹 提示词清洁女仆 (Prompt Cleaning Maid)](#-提示词清洁女仆-prompt-cleaning-maid)
  - [🎛️ 参数控制面板 (Parameter Control Panel)](#-参数控制面板-parameter-control-panel)
  - [📤 参数展开 (Parameter Break)](#-参数展开-parameter-break)
  - [📝 工作流说明 (Workflow Description)](#-工作流说明-workflow-description)
  - [🖼️ 简易图像对比 (Simple Image Compare)](#-简易图像对比-simple-image-compare)
  - [🖼️ 简易加载图像 (Simple Load Image)](#-简易加载图像-simple-load-image)
  - [🔺 像素放大器(锐化) (PixelKSampleUpscaler Sharpening)](#-像素放大器锐化-pixelksampleupscaler-sharpening)
  - [💾 增强保存图像 (Save Image Plus)](#-增强保存图像-save-image-plus)
  - [🎨 Krita 集成 (Open In Krita)](#-krita-集成-open-in-krita)
  - [⚡ 组执行管理器 (Group Executor Manager)](#-组执行管理器-group-executor-manager)
  - [🔇 组静音管理器 (Group Mute Manager)](#-组静音管理器-group-mute-manager)
  - [🧭 快速组导航器 (Quick Group Navigation)](#-快速组导航器-quick-group-navigation)
  - [🔍 后续执行组是否有效 (Has Next Executor Group)](#-后续执行组是否有效-has-next-executor-group)
  - [🖼️ 图像缓存节点 (Image Cache Nodes)](#-图像缓存节点-image-cache-nodes)
  - [📝 文本缓存节点 (Text Cache Nodes)](#-文本缓存节点-text-cache-nodes)
  - [📐 分辨率大师简化版 (Resolution Master Simplify)](#-分辨率大师简化版-resolution-master-simplify)
  - [📦 简易Checkpoint加载器 (Simple Checkpoint Loader)](#-简易checkpoint加载器-simple-checkpoint-loader)
  - [🔔 简易通知 (Simple Notify)](#-简易通知-simple-notify)
  - [✂️ 简易字符串分隔 (Simple String Split)](#-简易字符串分隔-simple-string-split)
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
  - [🧹 Prompt Cleaning Maid](#-prompt-cleaning-maid)
  - [🎛️ Parameter Control Panel](#-parameter-control-panel-1)
  - [📤 Parameter Break](#-parameter-break-1)
  - [📝 Workflow Description](#-workflow-description-1)
  - [🖼️ Simple Image Compare](#-simple-image-compare)
  - [🖼️ Simple Load Image](#-simple-load-image)
  - [🔺 PixelKSampleUpscaler Sharpening](#-pixelksampleupscaler-sharpening)
  - [💾 Save Image Plus](#-save-image-plus)
  - [🎨 Open In Krita](#-open-in-krita)
  - [⚡ Group Executor Manager](#-group-executor-manager)
  - [🔇 Group Mute Manager](#-group-mute-manager)
  - [🧭 Quick Group Navigation](#-quick-group-navigation)
  - [🔍 Has Next Executor Group](#-has-next-executor-group)
  - [🖼️ Image Cache Nodes](#-image-cache-nodes)
  - [📝 Text Cache Nodes](#-text-cache-nodes-1)
  - [📐 Resolution Master Simplify](#-resolution-master-simplify)
  - [📦 Simple Checkpoint Loader](#-simple-checkpoint-loader)
  - [🔔 Simple Notify](#-simple-notify-1)
  - [✂️ Simple String Split](#-simple-string-split-1)
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

### 🖼️ D站画廊 (Danbooru Gallery)

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

### 🧹 提示词清洁女仆 (Prompt Cleaning Maid)

**智能提示词清理和格式化节点 - 掌握贵族礼仪的专业女仆**

提示词清洁女仆是一个专业的提示词清理和格式化工具，能够自动清理提示词中的多余符号、空白和格式问题，并进行智能的提示词规范化处理，让提示词更加规范和整洁。

#### 核心功能
- 🧹 **逗号清理**: 自动移除多余的逗号（连续逗号、首尾逗号）
- ⚡ **空白规范**: 清理首尾空白和多余的空格/制表符
- 🏷️ **LoRA标签管理**: 可选择性移除字符串中的 `<lora:xxx>` 标签
- 📄 **换行处理**: 将换行符替换为空格或逗号
- 🔧 **括号修复**: 自动移除不匹配的圆括号 `()` 或方括号 `[]`
- ✨ **高级格式化**: 完整的提示词规范化处理系统
- 🔄 **智能清理**: 多阶段清理流程，确保提示词格式正确

#### ✨ 高级格式化功能
- 🔤 **下划线转换**: 将下划线 `_` 自动转换为空格，让标签更自然
- ⚖️ **权重语法补全**: 自动为不合规的权重语法添加括号，如 `tag:1.2` → `(tag:1.2)`
- 🎨 **智能括号转义**: 智能区分权重语法和角色系列名称，自动转义需要的括号
  - `narmaya(granblue fantasy)` → `narmaya \(granblue fantasy\)`
  - `(blue_eyes:1.2)` 保持为权重语法不变
- 🔍 **漏逗号检测**: 自动检测并修正漏逗号情况
  - `character(tag3:1.2)` → `character, (tag3:1.2)`
  - `name(series:1.0)` → `name, (series:1.0)`
- 🌐 **标准化逗号**: 将所有逗号统一为英文逗号+空格格式
- 📝 **多标签权重语法**: 支持复杂的多标签权重语法处理
  - `(tag1,tag2,tag3:1.2)` → `(tag1, tag2, tag3:1.2)`

#### 清理选项

**1. 清理逗号 (cleanup_commas)**
- 移除开头的逗号
- 移除结尾的逗号
- 合并连续的逗号为单个逗号
- 示例: `, , tag1, , tag2, ,` → `tag1, tag2`

**2. 清理空白 (cleanup_whitespace)**
- 清理首尾的空格和制表符
- 合并多个连续空格为单个空格
- 规范逗号周围的空格
- 示例: `  tag1  ,   tag2   ` → `tag1, tag2`

**3. 移除LoRA标签 (remove_lora_tags)**
- 完全移除字符串中的 LoRA 标签
- 支持各种 LoRA 格式: `<lora:name:weight>`
- 示例: `1girl, <lora:style:0.8>, smile` → `1girl, smile`

**4. 清理换行 (cleanup_newlines)**
- **否 (false)**: 保留换行符
- **空格 (space)**: 将 `\n` 替换为空格
- **逗号 (comma)**: 将 `\n` 替换为 `, `
- 示例 (逗号): `tag1\ntag2` → `tag1, tag2`

**5. 修复括号 (fix_brackets)**
- **否 (false)**: 不修复括号
- **圆括号 (parenthesis)**: 移除不匹配的 `()`
- **方括号 (brackets)**: 移除不匹配的 `[]`
- **两者 (both)**: 同时修复圆括号和方括号
- 示例: `((tag1) tag2))` → `(tag1) tag2`

#### ✨ 高级格式化选项

**6. 提示词格式化 (prompt_formatting)**
- **总开关**: 启用/禁用所有高级格式化功能
- 启用后将使用智能格式化系统替代原有基础清理逻辑
- 提供更专业、更智能的提示词规范化处理

**7. 下划线转空格 (underscore_to_space)**
- 将所有下划线 `_` 转换为空格
- 让技术性标签更自然易读
- 示例: `long_hair, blue_eyes` → `long hair, blue eyes`

**8. 权重语法补全 (complete_weight_syntax)**
- 自动为不合规的权重语法添加括号
- 支持 A1111 格式的权重语法
- 示例: `character name:1.2` → `(character name:1.2)`
- 示例: `tag:` → `(tag:)`

**9. 智能括号转义 (smart_bracket_escaping)**
- 智能区分权重语法和角色系列名称
- 自动转义需要转义的括号内容
- 支持漏逗号检测和修正
- 示例: `narmaya(granblue fantasy)` → `narmaya \(granblue fantasy\)`
- 示例: `character(tag3:1.2)` → `character, (tag3:1.2)`

**10. 标准化逗号 (standardize_commas)**
- 将所有逗号统一为英文逗号+空格格式
- 支持中英文逗号混合情况
- 示例: `tag1，tag2,tag3` → `tag1, tag2, tag3`

#### 使用方法
1. 添加 `Danbooru > 提示词清洁女仆 (Prompt Cleaning Maid)` 节点
2. 连接上游节点的字符串输出到 `string` 输入
3. 根据需要启用/禁用各项清理选项
4. 获取清理后的 `string` 输出

#### 应用场景
- **提示词规范化**: 统一提示词格式，方便管理和复用
- **自动化清理**: 批量清理从各种来源获取的提示词
- **格式转换**: 将多行提示词转换为单行，或调整分隔符
- **LoRA管理**: 快速移除或保留 LoRA 标签
- **括号修复**: 修复复制粘贴时产生的括号不匹配问题
- **权重语法规范化**: 自动修正不完整的权重语法格式
- **角色标签处理**: 智能处理角色(系列名称)格式的标签
- **国际化支持**: 统一中英文逗号和标点符号
- **批量格式化**: 处理来自不同来源的混乱提示词

#### 清理流程

**基础模式**（不启用高级格式化）:
1. **Stage 1**: 移除 LoRA 标签（如果启用）
2. **Stage 2**: 替换换行符（如果启用）
3. **Stage 3**: 清理多余逗号（如果启用）
4. **Stage 4**: 修复不匹配的括号（如果启用）
5. **Stage 5**: 清理多余空白（如果启用）

**高级格式化模式**（启用提示词格式化）:
1. **Stage 1**: 移除 LoRA 标签（如果启用）
2. **Stage 2**: 替换换行符（如果启用）
3. **Stage 3**: 高级智能格式化处理
   - 智能逗号分割（考虑括号嵌套）
   - 逐标签处理（根据用户选择的格式化选项）
   - 重新连接为标准格式
4. **Stage 4**: 最终空白清理和标准化

#### 示例

**基础清理示例**:
```
输入: , , 1girl, blue eyes,  , <lora:style:0.8>, smile
输出: 1girl, blue eyes, smile
```

**高级格式化示例** (启用所有格式化功能):
```
输入: 1girl, long_hair, character_name:1.2, narmaya(granblue fantasy), <lora:test:0.5>, name(series:1.0)
输出: 1girl, long hair, (character name:1.2), narmaya \(granblue fantasy\), name, (series:1.0)
```

**功能演示**:

1. **下划线转换**:
   ```
   输入: long_hair, blue_eyes, white_dress
   输出: long hair, blue eyes, white dress
   ```

2. **权重语法补全**:
   ```
   输入: character name:1.2, simple_tag, weight_test:
   输出: (character name:1.2), simple_tag, weight test:
   ```

3. **智能括号转义**:
   ```
   输入: narmaya(granblue fantasy), hakurei_reimu(touhou_project)
   输出: narmaya \(granblue fantasy\), hakurei reimu \(touhou project\)
   ```

4. **漏逗号检测**:
   ```
   输入: character(tag3:1.2), test(complex, description)
   输出: character, (tag3:1.2), test, (complex, description)
   ```

5. **多标签权重语法**:
   ```
   输入: (tag1,tag2,tag3:1.2), (long_hair, blue_eyes:1.3)
   输出: (tag1, tag2, tag3:1.2), (long hair, blue eyes:1.3)
   ```

**推荐配置**:
- **日常使用**: 启用所有高级格式化选项，获得最佳提示词质量
- **兼容模式**: 仅启用基础清理功能，保持原有行为
- **灵活处理**: 根据具体需求选择性地启用格式化功能

---

### 🎛️ 参数控制面板 (Parameter Control Panel)

**可视化参数管理和工作流控制节点**

参数控制面板是一个强大的参数管理节点，提供可视化界面来创建、管理和输出多种类型的参数，可以与参数展开节点配合使用，实现灵活的工作流参数控制。

#### 核心功能
- 🎨 **可视化参数编辑**: 直观的UI界面管理参数
- 📊 **多种参数类型**: 支持滑条、开关、下拉菜单、图像等多种参数类型
- 🎯 **分隔符支持**: 使用分隔符组织和分组参数
- 🔄 **拖拽排序**: 通过拖拽调整参数顺序
- 💾 **工作流持久化**: 参数配置随工作流保存
- 🔒 **锁定保护**: 锁定模式防止误操作
- 🎛️ **下拉菜单自适应**: 支持从连接自动获取下拉菜单选项

#### 参数类型

**1. 滑条 (Slider)**
- 支持整数和浮点数
- 可配置最小值、最大值、步长、默认值
- 实时数值显示和调整
- 示例：`steps (20, 1-150, step=1)`, `cfg (7.5, 1.0-30.0, step=0.5)`

**2. 开关 (Switch)**
- 布尔值开关
- 可配置默认值（True/False）
- 优雅的开关UI
- 示例：`enable_hr (True)`, `save_metadata (False)`

**3. 下拉菜单 (Dropdown)**
- 四种数据源模式：
  - **从连接获取**: 自动从Parameter Break连接的目标节点获取选项
  - **自定义**: 手动输入选项列表
  - **Checkpoint**: 自动加载checkpoint模型列表
  - **LoRA**: 自动加载LoRA模型列表
- 支持长文本自动省略显示
- 深紫色配色主题
- 示例：`sampler (euler_a, ddim, dpm++)`, `model (auto from connection)`

**4. 图像 (Image)**
- 图像上传和管理功能
- 支持通过文件选择器上传图像
- 悬浮显示图像预览（鼠标悬停在文件名上）
- 清空按钮可快速移除选中的图像
- 未上传图像时输出1024×1024纯白色图像
- 输出类型为IMAGE（ComfyUI标准图像张量）
- 适用于条件图像、参考图像等场景
- 示例：`reference_image (uploaded.png)`, `control_image (None → white image)`

**5. 分隔符 (Separator)**
- 视觉分组和组织参数
- 可自定义分隔符文本
- 优雅的紫色主题设计
- 示例：`--- 基础参数 ---`, `--- 高级设置 ---`

#### 使用方法
1. 添加 `Danbooru > 参数控制面板 (Parameter Control Panel)` 节点
2. 双击打开参数管理界面
3. 点击"+"按钮添加参数：
   - 输入参数名称
   - 选择参数类型
   - 配置参数选项（范围、选项等）
4. 调整参数值，连接 `parameters` 输出到 Parameter Break 节点
5. 使用锁定🔒按钮保护参数配置

#### 应用场景
- **工作流参数化**: 将常用参数集中管理
- **批量实验**: 快速调整参数进行对比实验
- **预设系统**: 保存不同的参数组合
- **模型切换**: 使用下拉菜单快速切换模型/LoRA
- **条件控制**: 使用开关控制工作流分支

#### 技术特点
- **响应式设计**: 节点大小自适应内容
- **深紫色主题**: 统一的视觉风格
- **性能优化**: 避免不必要的重绘
- **智能布局**: 自动调整按钮和控件位置

---

### 📤 参数展开 (Parameter Break)

**智能参数展开和选项同步节点**

参数展开节点接收来自参数控制面板的参数包，自动展开为独立的输出引脚，并支持从连接的目标节点自动同步下拉菜单选项。

#### 核心功能
- 📤 **自动展开**: 将参数包展开为独立的输出引脚
- 🔄 **智能同步**: 自动同步参数结构变化
- 🎯 **通配符类型**: 使用AnyType支持连接到任何输入
- 🔗 **选项自动获取**: 连接到combo输入时自动提取选项
- 🧹 **自动清空**: 断开连接时自动清空下拉菜单选项
- 📊 **实时更新**: 参数变化时立即更新输出引脚

#### 工作原理

**参数结构同步**：
1. Parameter Control Panel创建参数配置
2. Parameter Break接收参数包
3. 自动读取参数结构并创建对应数量的输出引脚
4. 每个输出引脚对应一个参数，保持名称和类型一致

**选项自动同步**：
1. 将Parameter Break的下拉菜单输出连接到目标节点的combo输入
2. 自动检测目标节点的输入类型和可用选项
3. 提取选项列表并同步回Parameter Control Panel
4. 下拉菜单UI自动刷新显示新选项
5. 断开连接时自动清空选项

#### 支持的同步场景
- ✅ **Checkpoint加载器**: 自动获取checkpoint列表
- ✅ **VAE选择器**: 自动获取VAE列表
- ✅ **采样器选择**: 自动获取sampler列表
- ✅ **调度器选择**: 自动获取scheduler列表
- ✅ **所有combo输入**: 支持所有ComfyUI的combo类型输入

#### 使用方法
1. 添加 `Danbooru > 参数展开 (Parameter Break)` 节点
2. 连接Parameter Control Panel的 `parameters` 输出
3. 自动生成对应的输出引脚
4. 将下拉菜单输出连接到目标节点的combo输入
5. 选项自动同步，在Parameter Control Panel中选择

#### 使用示例

**基础参数控制**：
```
Parameter Control Panel (steps=20, cfg=7.5, sampler=euler_a)
  ↓ parameters
Parameter Break
  ↓ steps (INT)
  ↓ cfg (FLOAT)
  ↓ sampler (STRING)
KSampler节点
```

**模型自动切换**：
```
Parameter Control Panel (model_name: dropdown - from_connection)
  ↓ parameters
Parameter Break
  ↓ model_name (*)  → CheckpointLoader的ckpt_name输入
                       (自动获取所有checkpoint列表)
```

**VAE自动选择**：
```
Parameter Control Panel (vae_name: dropdown - from_connection)
  ↓ parameters
Parameter Break
  ↓ vae_name (*)  → Simple Checkpoint Loader的vae_name输入
                     (自动获取所有VAE列表)
```

#### 应用场景
- **参数集中管理**: 将分散的参数集中到一个面板
- **快速模型切换**: 通过下拉菜单快速切换checkpoint/VAE
- **批量实验**: 配合组执行管理器进行批量参数实验
- **工作流模板**: 创建可复用的参数化工作流模板

#### 技术亮点
- **精确匹配**: 通过输入名称精确匹配对应的widget
- **智能缓存**: 避免重复同步相同的选项
- **防抖处理**: 300ms防抖避免频繁API调用
- **错误容错**: 完善的错误处理机制
- **连接恢复**: 基于参数ID恢复连接，支持参数重排序

#### 代码参考
参数展开节点的自动选项同步功能参考了 [ComfyUI-CRZnodes](https://github.com/CoreyCorza/ComfyUI-CRZnodes) 项目的设计思路。

---

### 📝 工作流说明 (Workflow Description)

**Markdown渲染工作流说明节点**

工作流说明节点提供了一个优雅的方式来为工作流添加说明文档，支持Markdown渲染、版本管理、首次打开提示弹窗等功能。

#### 核心功能
- 📝 **Markdown渲染**: 支持完整的Markdown语法，包括标题、列表、代码块、表格等
- 🎨 **富文本编辑**: 直观的编辑界面，支持实时预览
- 🔔 **版本提示弹窗**: 基于版本号的首次打开提示，确保用户看到最新说明
- 💾 **工作流持久化**: 说明内容随工作流保存，方便分享和协作
- 🎯 **简洁UI**: 节点内直接显示渲染后的Markdown内容
- 🔒 **虚拟节点**: 不参与实际执行，不影响工作流性能

#### 参数配置
- **标题 (title)**: 说明文档的标题，显示在节点顶部
- **内容 (content)**: Markdown格式的说明内容
- **版本号 (version)**: 用于控制首次打开提示弹窗，格式如 "1.0.0"
- **启用弹窗 (enable_popup)**: 是否在首次打开工作流时显示提示弹窗

#### 使用方法
1. 添加 `Danbooru > 工作流说明 (Workflow Description)` 节点
2. 双击节点打开编辑器
3. 输入标题和Markdown内容
4. 设置版本号（可选）
5. 启用/禁用首次打开弹窗
6. 保存后内容会在节点中实时渲染显示

#### 应用场景
- **工作流文档**: 为复杂工作流添加使用说明
- **参数说明**: 说明各个参数的作用和推荐值
- **更新日志**: 记录工作流的版本变更历史
- **协作共享**: 向团队成员说明工作流的使用方法
- **模板说明**: 在工作流模板中提供配置指南

#### Markdown支持
- ✅ **标题**: `# H1`, `## H2`, `### H3` 等
- ✅ **列表**: 有序列表、无序列表、嵌套列表
- ✅ **强调**: `**粗体**`, `*斜体*`, `~~删除线~~`
- ✅ **代码**: 行内代码和代码块（支持语法高亮）
- ✅ **链接**: `[链接文本](URL)`
- ✅ **图片**: `![图片说明](URL)`
- ✅ **表格**: Markdown表格语法
- ✅ **引用**: `> 引用文本`
- ✅ **分割线**: `---` 或 `***`

#### 版本弹窗机制
- 基于节点ID和版本号追踪
- 每个节点独立记录已打开的版本
- 版本号变更时自动触发弹窗提示
- 设置保存在插件目录，跨工作流共享

#### 技术特点
- **轻量级渲染**: 高效的Markdown解析和渲染
- **样式定制**: 紫色主题与插件整体风格统一
- **响应式设计**: 节点大小自适应内容
- **持久化存储**: 完善的数据保存和恢复机制

---

### 🖼️ 简易图像对比 (Simple Image Compare)

**高性能图像对比节点**

简易图像对比是一个性能优化版的图像对比工具，支持通过鼠标滑动实时对比两张图像，特别针对多节点场景进行了优化。

#### 核心功能
- 🎯 **滑动对比**: 鼠标悬浮并左右移动即可查看图像对比
- ⚡ **性能优化**: 针对多节点场景优化，避免工作流拖动卡顿
- 🖼️ **批量支持**: 支持选择批量图像中的任意两张进行对比
- 🎨 **智能渲染**: 节流处理和缓存机制，减少不必要的重绘
- 📐 **自适应布局**: 自动调整图像尺寸以适应节点大小

#### 性能优化特性
- 🚀 **移除动画循环**: 消除原版的 requestAnimationFrame 无限循环
- ⏱️ **鼠标移动节流**: 限制事件处理频率为 ~60fps
- 💾 **计算结果缓存**: 缓存图像位置和尺寸计算
- 🎯 **智能重绘**: 只在必要时触发画布重绘
- 📉 **资源节约**: 多节点场景下显著降低 CPU 占用

#### 使用方法
1. 添加 `image > 简易图像对比 (Simple Image Compare)` 节点
2. 连接 `image_a` 输入（第一张对比图像）
3. 连接 `image_b` 输入（第二张对比图像）
4. 鼠标悬浮在节点上，左右移动查看对比效果

#### 应用场景
- **质量对比**: 对比不同参数生成的图像质量
- **模型对比**: 对比不同模型的生成效果
- **LoRA 对比**: 对比使用不同 LoRA 的效果
- **参数调优**: 实时对比参数调整前后的变化
- **批量检查**: 快速浏览和对比大量生成的图像

#### 技术特点
相比原版图像对比节点，本节点在以下方面进行了优化：
- **工作流拖动流畅**: 10个以上节点时不再出现卡顿
- **CPU 占用更低**: 减少约 80% 的事件处理次数
- **渲染效率提升**: 通过缓存机制避免重复计算
- **内存使用优化**: 智能清理不再使用的缓存数据

---

### 🖼️ 简易加载图像 (Simple Load Image)

**简洁的图像加载节点**

简易加载图像节点提供与ComfyUI原生上传节点相似的基础功能，支持图像选择、上传和默认黑色图像。

#### 核心功能
- 📁 **图像选择**: 从input目录选择已有图像文件
- ⬆️ **图像上传**: 支持直接上传新图像到input目录
- ⚫ **默认黑图**: 第一个选项为黑色图像（simple_none.png），返回1024×1024纯黑色图像
- 🔄 **自动恢复**: 如果默认黑图被误删，会自动重新创建
- 🎯 **原生兼容**: 完全使用ComfyUI原生逻辑，预览和加载机制与原生节点一致

#### 使用方法
1. 添加 `image > 简易加载图像 (Simple Load Image)` 节点
2. 从下拉列表选择图像：
   - 第一项 `simple_none.png` 为默认黑色图像
   - 其他选项为input目录中的图像文件
3. 或点击上传按钮上传新图像
4. 节点输出IMAGE类型张量，可连接到任何需要图像输入的节点

#### 应用场景
- **占位图像**: 工作流开发时使用黑图作为占位符
- **图像切换**: 快速在不同图像间切换测试效果
- **批量测试**: 结合其他节点进行批量图像处理测试

#### 技术特点
- **完全原生**: 使用ComfyUI原生文件加载机制，无自定义前端代码
- **自动维护**: 默认黑图自动创建和恢复，无需手动管理
- **简洁高效**: 代码结构简单，性能开销极小

---

### 🔺 像素放大器(锐化) (PixelKSampleUpscaler Sharpening)

**增强版放大器提供者，集成 AMD FidelityFX CAS 锐化**

PixelKSampleUpscaler Sharpening 是一个带锐化功能的迭代放大器提供者节点，为 Impact Pack 的 Iterative Upscale 工作流提供快速的锐化放大方案。集成了 AMD FidelityFX CAS (Contrast Adaptive Sharpening) 算法，可作为慢速放大模型的高性能替代方案。

#### 核心功能
- 🚀 **三种放大模式**: 智能切换模型放大/锐化放大/简单放大
- ✨ **CAS 锐化算法**: 基于 AMD FidelityFX 的对比度自适应锐化
- ⚡ **快速方案**: 简单放大 + 锐化作为放大模型的高性能替代
- 🎛️ **可调节锐化**: 锐化强度 0-1 可调，默认 0.6
- 🔄 **完美兼容**: 完全兼容 Impact Pack 的 Iterative Upscale 节点
- 🧩 **分块 VAE 支持**: 支持分块 VAE 处理超大图像
- 🎯 **采样预览**: 支持实时采样预览和进度显示
- 🔌 **Hook 集成**: 完整支持 Impact Pack 的 Hook 系统

#### 工作模式
1. **模型放大模式**: 连接 upscale_model 时使用模型放大（高质量但慢）
2. **锐化放大模式**: 未连接模型且启用锐化时，使用简单放大 + CAS 锐化（快速）
3. **简单放大模式**: 未连接模型且禁用锐化时，仅使用简单放大

#### 使用方法
1. 添加 `Danbooru > PixelKSampleUpscalerProvider(Sharpening)` 节点
2. 连接基础参数：
   - `model`: ComfyUI 模型
   - `vae`: VAE 模型
   - `positive/negative`: 正负面条件
   - `scale_method`: 缩放方法（bilinear, lanczos 等）
3. 配置采样参数：
   - `seed`, `steps`, `cfg`: 标准采样参数
   - `sampler_name`, `scheduler`: 采样器和调度器
   - `denoise`: 去噪强度
4. 配置锐化参数：
   - `enable_sharpening`: 是否启用锐化（默认 True）
   - `sharpening_amount`: 锐化强度 0-1（默认 0.6）
5. 可选连接：
   - `upscale_model_opt`: 放大模型（连接后将使用模型而非锐化）
   - `pk_hook_opt`: Impact Pack Hook
6. 输出 `upscaler` 连接到 `Iterative Upscale (Image)` 节点

#### 技术特点
- **独立实现**: 完全独立实现，不依赖 Impact Pack 或 ComfyUI Essential
- **高性能**: CAS 锐化算法基于 3x3 邻域，计算高效
- **智能切换**: 根据是否连接放大模型自动切换工作模式
- **完整 Hook 支持**: 支持 Impact Pack 的 5 个 Hook 点
- **预览支持**: 集成 latent_preview 系统，显示采样进度

#### 应用场景
- **快速迭代**: 在测试工作流时使用锐化模式快速预览效果
- **资源节约**: 锐化模式无需加载大型放大模型，节省显存
- **灵活切换**: 预览阶段用锐化，最终生成时切换到模型放大
- **高分辨率**: 配合分块 VAE 处理超大图像放大

---

### 💾 增强保存图像 (Save Image Plus)

**专业级图像保存节点，支持完整 A1111 格式元数据**

Save Image Plus 是一个功能强大的图像保存节点，自动收集工作流中的所有元数据（模型、提示词、参数等），并以 Auto1111 WebUI 兼容格式嵌入到图像中，使图像可以被 Civitai 等平台正确识别和展示资源信息。

#### 核心功能
- 📋 **完整元数据收集**: 自动收集 Checkpoint、LoRA、VAE、提示词、采样参数等
- 🔄 **A1111 格式兼容**: 生成 Auto1111 WebUI 兼容的元数据格式
- 🌐 **Civitai 资源识别**: 图像上传到 Civitai 后可正确显示使用的模型资源
- 🎯 **独立元数据系统**: 使用自有的 metadata_collector 模块，不依赖其他插件
- 🔗 **灵活提示词输入**: 支持直接传入提示词或自动从工作流提取
- 💾 **多格式支持**: PNG/JPEG/WebP 格式，可选工作流嵌入
- 🧹 **纯净副本**: 可选保存不含元数据的纯净图像副本
- 👁️ **预览控制**: 可选择是否在界面显示预览（批量生成时提升性能）

#### 主要特性
- **智能 Hash 计算**: 完整读取模型文件计算准确哈希值（与 LoRA Manager 一致）
- **链式 Hook 支持**: 与其他元数据收集插件（如 LoRA Manager）共存不冲突
- **异常隔离**: 元数据收集错误不影响主流程执行
- **线程安全**: 支持多个实例同时运行

#### 使用方法
1. 添加 `image > Save Image Plus` 节点
2. 连接要保存的图像输入
3. 配置保存选项：
   - `enable`: 是否启用保存（关闭时跳过执行）
   - `filename_prefix`: 文件名前缀
   - `file_format`: 图像格式（PNG/JPEG/WEBP）
   - `quality`: JPEG/WebP 质量（1-100）
   - `embed_workflow`: 是否嵌入 ComfyUI 工作流数据（仅 PNG）
   - `save_clean_copy`: 是否额外保存无元数据的纯净副本
   - `enable_preview`: 是否在界面显示预览图
4. 可选连接提示词输入（否则自动从工作流提取）：
   - `positive_prompt`: 正面提示词
   - `negative_prompt`: 负面提示词
   - `lora_syntax`: LoRA 语法字符串

#### 元数据包含内容
- **模型信息**: Checkpoint 名称和哈希值
- **提示词**: 正负面提示词（支持 LoRA 语法）
- **采样参数**: Steps、CFG、Sampler、Scheduler 等
- **LoRA 列表**: 使用的 LoRA 及其权重
- **图像尺寸**: 生成的图像宽高
- **其他参数**: VAE、Clip Skip 等

#### 应用场景
- **Civitai 展示**: 上传到 Civitai 时自动显示使用的资源
- **参数记录**: 完整保存生成参数便于复现
- **工作流分享**: 嵌入工作流数据方便他人使用
- **批量生成**: 关闭预览提升大批量生成性能

#### 技术特点
- **独立实现**: 不依赖 LoRA Manager 等其他插件
- **完整兼容**: 哈希计算方法与 LoRA Manager 完全一致
- **性能优化**: 128KB 块大小读取文件，高效计算哈希
- **错误处理**: 完善的异常处理，不影响主流程

---

### 🎨 Krita 集成 (Open In Krita)

**ComfyUI 与 Krita 的无缝桥接节点**

Open In Krita 节点实现了 ComfyUI 与 Krita 之间的双向数据交互，让你可以在 Krita 中直接编辑 ComfyUI 生成的图像，并将编辑结果（包括选区蒙版）实时回传到工作流中继续处理。

#### 核心功能
- 🔄 **双向数据传输**: ComfyUI ↔ Krita 图像和蒙版数据互传
- 🎨 **自动启动 Krita**: 检测 Krita 未运行时自动启动
- 🖼️ **智能会话管理**: 相同图像复用标签页，不同图像创建新标签页
- ⏱️ **实时数据监控**: 等待用户在 Krita 中编辑完成并获取数据
- 🔌 **自动插件安装**: 首次使用时自动安装并配置 Krita 插件
- 🛡️ **版本同步更新**: 插件版本自动检测和更新
- 🎯 **选区蒙版支持**: 完整支持 Krita 选区作为蒙版输出
- ⚙️ **友好的设置向导**: 未配置时显示引导对话框

#### 工作流程
1. **发送图像到 Krita**:
   - 节点执行时自动将输入图像发送到 Krita
   - Krita 自动打开图像（新图像创建新标签页，相同图像复用标签页）
   - 节点进入等待状态（最长1小时）

2. **Krita 中编辑**:
   - 在 Krita 中自由编辑图像（绘画、调色、滤镜等）
   - 可创建选区作为蒙版区域
   - 编辑完成后点击节点的"从 Krita 获取数据"按钮

3. **数据回传到 ComfyUI**:
   - 节点获取编辑后的图像和选区蒙版
   - 输出 IMAGE 和 MASK，可连接到后续节点
   - 继续 ComfyUI 工作流处理

#### 使用方法
1. **首次配置**:
   - 添加 `Danbooru > 在Krita中打开 (Open In Krita)` 节点
   - 执行节点时会显示设置引导对话框
   - 选择"已安装，设置路径"或"未安装，跳转官网"
   - 插件会自动安装到 Krita（无需手动操作）

2. **日常使用**:
   - 连接 IMAGE 输入到节点
   - 执行节点→图像自动在 Krita 中打开
   - 在 Krita 中编辑图像
   - 点击"从 Krita 获取数据"按钮
   - 获取编辑结果继续工作流

#### 节点按钮说明
- 🟢 **从 Krita 获取数据**: 主动从 Krita 获取当前编辑的图像和选区
- 🔧 **重新安装插件**: 强制重新安装 Krita 插件（解决插件问题）
- ⚙️ **设置 Krita 路径**: 更改 Krita 可执行文件路径
- ✅ **检查 Krita 插件**: 检查插件安装状态和版本
- 🛑 **终止执行**: 取消等待，中断节点执行

#### 技术特点
- **文件监控机制**: 基于临时文件和请求-响应模式实现数据交互
- **自动版本管理**: 检测版本差异时自动更新 Krita 插件
- **智能启动**: 检测 Krita 进程状态，未运行时自动启动
- **图像 Hash 缓存**: 避免重复打开相同图像
- **批处理模式**: Krita 插件使用批处理模式，避免保存确认弹窗
- **完整日志记录**: 详细的日志帮助问题诊断

#### 系统要求
- **Krita**: 4.0 或更高版本
- **Python**: ComfyUI 环境（自带）
- **可选依赖**: `psutil`（用于进程管理，提升体验）

#### 常见问题
- **Q: 插件需要手动启用吗？**
  A: 不需要！插件安装时已设置 `EnabledByDefault=true`，重启 Krita 后自动启用

- **Q: 图像没有自动打开怎么办？**
  A: 检查 Krita 是否正在运行，尝试点击"检查 Krita 插件"按钮，或查看日志文件

- **Q: 如何查看详细日志？**
  A: 日志文件位于 `%TEMP%\open_in_krita\krita_plugin.log`（Windows）

#### 致谢
本节点的设计思路参考了以下优秀项目：
- [cg-krita](https://github.com/chrisgoringe/cg-krita) - Krita 集成的核心思路
- [comfyui-tooling-nodes](https://github.com/Acly/comfyui-tooling-nodes) - 外部工具集成参考
- [krita-ai-diffusion](https://github.com/Acly/krita-ai-diffusion) - Krita 插件架构参考

---

### ⚡ 组执行管理器 (Group Executor Manager)

**高效的批量工作流执行节点**

组执行管理器允许你将工作流分成多个组，按顺序或并行执行，配合图像缓存节点实现高效的批量生成。

#### 核心功能
- 🎯 **分组执行**: 将节点分成多个执行组，灵活控制执行流程
- 🔄 **顺序/并行模式**: 支持顺序执行和并行执行两种模式
- 💾 **智能缓存**: 配合图像缓存节点实现中间结果缓存
- ⏱️ **延迟控制**: 设置组间延迟时间，避免资源冲突
- 🛡️ **错误处理**: 完善的错误处理和重试机制
- 📊 **执行监控**: 实时显示执行进度和状态
- 🎛️ **可视化配置**: 直观的UI配置界面

#### 使用场景
- **批量生成**: 生成大量图像时分批执行，避免内存溢出
- **复杂工作流**: 将复杂工作流拆分成多个阶段执行
- **资源优化**: 合理安排执行顺序，优化GPU/内存使用
- **中间缓存**: 缓存中间结果，避免重复计算

#### 使用方法
1. 添加 `Danbooru > 组执行管理器 (Group Executor Manager)` 节点
2. 双击打开配置界面
3. 创建执行组并添加节点
4. 配置执行模式（sequential/parallel）和延迟时间
5. 添加 `组执行触发器 (Group Executor Trigger)` 节点开始执行

#### 配置示例
```json
{
  "groups": [
    {
      "name": "组1-文生图",
      "nodes": [1, 2, 3, 4],
      "delay": 0
    },
    {
      "name": "组2-图生图",
      "nodes": [5, 6, 7],
      "delay": 2
    },
    {
      "name": "组3-后处理",
      "nodes": [8, 9, 10],
      "delay": 1
    }
  ],
  "mode": "sequential"
}
```

---

### 🔇 组静音管理器 (Group Mute Manager)

**可视化组静音状态管理和联动配置节点**

组静音管理器提供了一个直观的界面来管理工作流中所有组的静音（mute）状态，并支持配置组间联动规则，实现复杂的工作流控制。

#### 核心功能
- 🎛️ **可视化管理**: 直观的UI界面管理所有组的静音状态
- 🔗 **组间联动**: 配置组开启/关闭时自动控制其他组
- 🎨 **颜色过滤**: 按ComfyUI内置颜色过滤显示特定组
- 🔄 **原生集成**: 使用ComfyUI原生mute功能（ALWAYS/NEVER模式）
- 🛡️ **防循环机制**: 智能检测并防止循环联动
- 💾 **持久化配置**: 配置保存到workflow JSON
- 🎯 **精确控制**: 独立控制每个组的静音状态

#### 联动规则
组静音管理器支持两种联动触发条件：
- **组开启时**: 当组被开启（unmute）时触发的联动规则
- **组关闭时**: 当组被关闭（mute）时触发的联动规则

每个联动规则可以：
- 选择目标组
- 选择操作（开启/关闭）

#### 使用方法
1. 添加 `Danbooru > 组静音管理器 (Group Mute Manager)` 节点
2. 双击打开管理界面
3. 使用开关按钮控制组的静音状态
4. 点击齿轮按钮配置组的联动规则
5. 可选择颜色过滤器只显示特定颜色的组

#### 使用场景
- **工作流调试**: 快速启用/禁用工作流的不同部分
- **条件执行**: 根据需求动态控制执行哪些组
- **批量管理**: 通过联动规则批量控制多个组
- **复杂流程**: 实现复杂的条件执行逻辑

#### 示例配置
```json
{
  "group_name": "主生成组",
  "enabled": true,
  "linkage": {
    "on_enable": [
      {"target_group": "预处理组", "action": "enable"},
      {"target_group": "调试组", "action": "disable"}
    ],
    "on_disable": [
      {"target_group": "预处理组", "action": "disable"}
    ]
  }
}
```

**防循环示例**：
如果配置了"组A开启时→开启组B"，"组B开启时→开启组A"，系统会自动检测并终止循环。

---

### 🧭 快速组导航器 (Quick Group Navigation)

**全局悬浮球式组导航和快捷键跳转工具**

快速组导航器提供了一个优雅的悬浮球界面，让您可以快速跳转到工作流中的任意组，并支持自定义快捷键一键导航。

#### 核心功能
- 🎯 **悬浮球导航**: 全局可拖拽悬浮球，随时访问组导航
- ⌨️ **快捷键跳转**: 为每个组分配数字或字母快捷键，一键跳转
- 🔍 **智能缩放**: 自动计算最佳缩放比例，完整显示目标组
- 🔒 **锁定模式**: 防止误操作的锁定功能
- 🎨 **智能定位**: 面板自动避开屏幕边界，确保完整显示
- 💾 **工作流集成**: 导航配置随工作流保存和迁移
- 🔄 **自动居中**: 跳转时自动居中到目标组
- 📍 **位置记忆**: 悬浮球位置本地保存

#### 快捷键系统
- **数字键 1-9**: 优先分配给前9个组
- **字母键 A-Z**: 数字键用完后自动分配字母键
- **冲突检测**: 自动检测并提示快捷键冲突
- **实时录制**: 点击按钮录制新快捷键
- **全局响应**: 在画布任意位置都能使用快捷键

#### 使用方法
1. 悬浮球会自动显示在屏幕右侧中央
2. 点击悬浮球展开导航面板
3. 点击"添加组"选择要导航的组
4. 点击快捷键按钮录制自定义快捷键
5. 使用快捷键或点击导航按钮快速跳转

#### 智能定位特性
- **水平自适应**: 悬浮球在右侧时面板显示在左侧，反之亦然
- **垂直自适应**: 悬浮球在底部时面板自动向上展开
- **边界保护**: 确保面板始终完整显示，不被屏幕边缘遮挡
- **拖拽友好**: 拖拽悬浮球不会误触发面板展开

#### 使用场景
- **大型工作流**: 快速在复杂工作流的不同区域间跳转
- **调试优化**: 高效定位需要调试的组
- **演示讲解**: 快速展示工作流的不同功能模块
- **批量操作**: 配合其他管理器快速切换工作区域

#### 提示通知
快速组导航器使用全局 Toast 通知系统，提供：
- ✅ **成功提示**: 添加组、设置快捷键成功
- ⚠️ **警告提示**: 组不存在、快捷键冲突
- ℹ️ **信息提示**: 所有组已添加等状态信息

---

### 🔍 后续执行组是否有效 (Has Next Executor Group)

**智能工作流条件执行节点**

后续执行组是否有效节点与组执行管理器深度集成，用于检测当前执行组之后是否还有待执行的组，帮助实现智能的工作流条件分支和优化执行流程。

#### 核心功能
- 🔍 **智能检测**: 自动检测后续是否有待执行的组
- 🚫 **排除组配置**: 可视化配置界面，灵活管理需要排除检测的组
- 🔒 **锁定模式**: 防止误操作的双击锁定功能
- 🔄 **组重命名跟踪**: 自动检测并更新重命名后的组名
- 💾 **工作流集成**: 配置随工作流保存，支持跨环境迁移
- 🎯 **精确控制**: 自动过滤被禁用的组和无效组名
- 📊 **详细输出**: 提供后续组列表和布尔判断两种输出

#### 输出类型
- **next_groups** (STRING): 所有后续待执行的组名，每行一个
- **has_next** (BOOLEAN): 是否还有下一个待执行的组

#### 使用场景
- **条件分支**: 根据是否有后续组来决定执行路径
  ```
  示例：只在最后一个组时执行最终保存
  后续执行组检测 → Switch节点 → 保存图像 / 跳过保存
  ```

- **流程优化**: 避免不必要的处理步骤
  ```
  示例：只在有后续组时保留中间结果
  后续执行组检测 → 条件缓存 → 清理临时文件
  ```

- **资源管理**: 智能控制资源使用
  ```
  示例：最后一个组时释放GPU显存
  后续执行组检测 → 显存管理 → 卸载模型
  ```

- **批量处理**: 在批量工作流中区分中间步骤和最终步骤
  ```
  示例：批量生成时只在最后输出通知
  后续执行组检测 → 通知节点 → "全部完成！"
  ```

#### 使用方法
1. 添加 `Danbooru > 后续执行组是否有效 (Has Next Executor Group)` 节点
2. 双击节点打开配置界面
3. 点击"添加排除组"按钮，从下拉菜单选择要排除的组
4. 可选：双击锁定按钮🔒防止误操作
5. 连接 `has_next` 输出到 Switch 或其他条件节点
6. 保存工作流，配置会自动随工作流保存

#### 配置说明

**排除组列表**：
- 可搜索的下拉框选择组名
- 支持多个排除组配置
- 点击删除按钮❌移除排除组
- 点击刷新按钮🔄更新组列表

**锁定模式**：
- 双击锁定按钮切换锁定状态
- 锁定后无法添加/删除/修改配置
- 适合在生产环境防止误操作

**组名验证**：
- 加载工作流时自动验证组名是否存在
- 自动清理不存在的组（如工作流迁移后）
- 控制台输出详细的清理信息

#### 智能特性

**自动组重命名跟踪**：
```
1. 配置排除组："测试组A"
2. 在ComfyUI中重命名组为："生产组A"
3. 节点自动检测并更新配置为："生产组A"
4. 保存工作流时更新后的配置会被保存
```

**跨环境迁移**：
```
1. 在项目A中配置排除组："项目A特定组"
2. 工作流复制到项目B
3. 加载时自动清理不存在的组
4. 控制台提示：⚠️ 组 "项目A特定组" 不存在，已自动清理
```

**状态检测机制**：
- ✅ 自动检测组内所有节点是否被禁用
- ✅ 支持深度优先遍历（包括子图节点）
- ✅ 实时同步禁用状态到后端
- ✅ 执行前主动检测最新状态

#### 配置持久化

**工作流序列化**：
- 配置通过 `onSerialize`/`onConfigure` 机制保存
- 随工作流 JSON 文件一起保存和加载
- 不依赖本地配置文件，支持工作流自由迁移
- 每个工作流拥有独立的配置，互不影响

#### 与组执行管理器集成

**完美配合**：
```
组执行管理器配置：
├── 组1：预处理
├── 组2：主生成
├── 组3：后处理（排除）
└── 组4：保存

后续执行组检测节点会自动：
- 跳过"组3：后处理"（在排除列表中）
- 跳过组内节点全部被禁用的组
- 返回实际会执行的后续组
```

#### 使用示例

**示例1：条件保存**
```
[组1: 生成] → 图像
           ↓
[组2: 后处理] → 图像 → 后续执行组检测
                              ↓
                         has_next → Switch
                              ↓           ↓
                           True(跳过)  False(保存)
```

**示例2：资源优化**
```
后续执行组检测 → has_next
                    ↓
                  False → 卸载模型 → 清理缓存 → 发送通知
```

**示例3：批量任务通知**
```
[for each item]
    ↓
执行任务 → 后续执行组检测
                ↓
            has_next == False → 简易通知("全部任务完成!")
```

#### 技术细节
- 基于组执行管理器的全局配置进行检测
- 使用 WeakMap 追踪组对象引用，支持重命名检测
- 每2秒自动检查组列表和重命名变化
- 配置通过ComfyUI原生序列化机制保存
- 自动过滤空组名和无效引用

#### 注意事项
- ⚠️ 节点仅检测组配置，不检查组内节点是否被静音/bypass
- ⚠️ 需要配合组执行管理器使用才能发挥作用
- ⚠️ 锁定模式需要双击锁定按钮才能切换
- ⚠️ 旧工作流加载时排除组配置为空，需要重新配置

---

### 🖼️ 图像缓存节点 (Image Cache Nodes)

**智能图像缓存和获取节点组**

图像缓存节点提供了强大的图像缓存和获取功能，配合组执行管理器实现高效的批量工作流。

#### 节点类型

**1. 图像缓存保存 (Image Cache Save)**
- 💾 **自动缓存**: 自动保存图像到缓存系统
- 🏷️ **前缀管理**: 支持自定义缓存前缀分类
- 📊 **缓存统计**: 实时显示缓存数量和状态
- 🔄 **自动更新**: 缓存更新时自动通知相关节点

**2. 图像缓存获取 (Image Cache Get)**
- 🔍 **智能获取**: 根据前缀和索引获取缓存图像
- 🔄 **Fallback模式**: 支持多种缓存未命中处理方式
  - `blank`: 返回空白图像
  - `default`: 返回默认占位图像
  - `error`: 抛出错误停止执行
  - `passthrough`: 跳过缓存检查
- 📋 **批量获取**: 支持批量获取多张缓存图像
- ⏱️ **自动重试**: 缓存未就绪时自动重试
- 👁️ **预览功能**: 可选的缓存图像预览

#### 核心功能
- 🚀 **高性能**: 基于内存的快速缓存系统
- 🔐 **权限控制**: 配合组执行管理器的权限系统
- 🎯 **精确定位**: 支持前缀+索引精确获取
- 📊 **实时通知**: WebSocket实时缓存更新通知
- 💡 **智能清理**: 自动清理过期缓存

#### 使用方法

**基础流程**：
1. 在第一组中添加 `图像缓存保存 (Image Cache Save)` 节点
2. 连接要缓存的图像输出
3. 设置缓存前缀（如 "base_image"）
4. 在后续组中添加 `图像缓存获取 (Image Cache Get)` 节点
5. 使用相同的前缀和索引获取缓存图像

**配合组执行示例**：
```
组1: 文生图 → 缓存保存(prefix="txt2img")
组2: 缓存获取(prefix="txt2img") → 图生图 → 缓存保存(prefix="img2img")
组3: 缓存获取(prefix="img2img") → 后处理 → 输出
```

#### 应用场景
- **多阶段生成**: 文生图 → 图生图 → 放大 → 后处理
- **批量处理**: 大量图像的分批处理
- **实验对比**: 保存中间结果用于不同参数对比
- **内存优化**: 避免同时加载所有中间结果

---

### 📝 文本缓存节点 (Text Cache Nodes)

**智能文本缓存和获取节点组**

文本缓存节点提供了强大的文本数据缓存和获取功能，支持多通道管理，可用于在工作流的不同部分传递和共享文本数据。

#### 节点类型

**1. 全局文本缓存保存 (Global Text Cache Save)**
- 💾 **自动缓存**: 自动保存文本到指定通道
- 🏷️ **通道管理**: 支持自定义通道名称分类
- 👁️ **节点监听**: 可监听其他节点widget变化并自动更新缓存
- 📊 **实时预览**: 显示缓存的文本内容和长度
- 🔄 **自动通知**: 缓存更新时自动通知获取节点

**2. 全局文本缓存获取 (Global Text Cache Get)**
- 🔍 **智能获取**: 根据通道名称获取缓存文本
- 🔄 **动态通道**: 下拉菜单自动显示所有已定义通道
- 📋 **持久化**: 工作流保存时自动保存通道配置
- 👁️ **预览功能**: 显示获取的文本内容和来源
- ⏱️ **自动更新**: 监听缓存变化并自动刷新

**3. 文本缓存查看器 (Text Cache Viewer)**
- 📊 **实时监控**: 实时显示所有文本缓存通道的状态和内容
- 🔍 **完整预览**: 查看每个通道的详细信息（名称、长度、更新时间、内容）
- 📝 **内容查看**: 支持滚动查看完整文本内容（最大显示3行，超出显示滚动条）
- ⏰ **时间追踪**: 显示相对更新时间（刚刚/分钟前/小时前/天前）
- 🔄 **自动刷新**: WebSocket实时更新，缓存变化时自动刷新显示
- 🎨 **美观界面**: 紫色主题UI，emoji图标，清晰的卡片式布局
- 🖱️ **手动刷新**: 提供刷新按钮，可手动更新显示内容

#### 核心功能
- 🚀 **高性能**: 基于内存的快速缓存系统
- 🔐 **线程安全**: 使用递归锁确保多线程安全
- 🎯 **精确定位**: 通过通道名称精确获取文本
- 📊 **实时通知**: WebSocket实时缓存更新通知
- 💡 **智能验证**: 自动验证通道有效性

#### 使用方法

**基础流程**：
1. 在工作流中添加 `全局文本缓存保存 (Global Text Cache Save)` 节点
2. 连接要缓存的文本输出
3. 设置通道名称（如 "my_prompt"）
4. 在其他位置添加 `全局文本缓存获取 (Global Text Cache Get)` 节点
5. 选择相同的通道名称获取文本

**监听其他节点**：
1. 在保存节点中配置 `monitor_node_id`（要监听的节点ID）
2. 配置 `monitor_widget_name`（要监听的widget名称）
3. 当监听的widget值变化时，自动更新缓存

**使用示例**：
```
节点A（文本生成器）
  ↓ positive输出
保存节点（channel="positive_prompt"）

节点B（其他位置）
  ← 获取节点（channel="positive_prompt"）
```

#### 应用场景
- **提示词复用**: 在多个地方使用相同的提示词
- **动态监听**: 监听文本输入节点的变化并自动更新
- **工作流通信**: 在工作流的不同部分传递文本信息
- **参数共享**: 共享配置参数到多个节点
- **调试辅助**: 临时保存和查看中间文本结果

---

### 📐 分辨率大师简化版 (Resolution Master Simplify)

**可视化分辨率控制节点**

基于 Resolution Master 的简化版本，提供直观的 2D 画布交互式分辨率控制，专注于核心功能。

#### 核心功能
- 🎨 **2D 交互画布**: 可视化拖拽调整分辨率
- 🎯 **三控制点系统**:
  - 白色主控制点 - 同时控制宽度和高度
  - 蓝色宽度控制 - 独立调整宽度
  - 粉色高度控制 - 独立调整高度
- 🧲 **画布吸附**: 默认吸附到网格点，按住 Ctrl 键精细调整
- 📋 **SDXL 预设**: 9 个内置 SDXL 分辨率预设（按大小排序）
- 💾 **自定义预设**: 保存和管理自定义分辨率预设
- 📊 **实时显示**: 输出引脚显示当前分辨率（颜色区分宽高）
- 📐 **分辨率范围**: 64×64 至 2048×2048

#### 主要特点
- ✨ **完全照抄原版样式**: 保持与 Resolution Master 一致的视觉风格
- 🎯 **简化设计**: 移除 Actions、Scaling、Auto-Detect 等复杂功能
- 🚀 **轻量高效**: 专注核心分辨率控制，界面简洁
- 🎨 **视觉反馈**: 蓝色/粉色输出数字对应控制点颜色

#### 使用方法
1. 添加 `Danbooru > 分辨率大师简化版 (Resolution Master Simplify)` 节点
2. 在 2D 画布上拖拽控制点调整分辨率：
   - 拖拽白色主控制点：同时调整宽高
   - 拖拽蓝色控制点：只调整宽度
   - 拖拽粉色控制点：只调整高度
3. 点击预设下拉框选择常用分辨率
4. 点击💾按钮保存当前分辨率为自定义预设
5. 连接 `width` 和 `height` 输出到其他节点

#### 内置预设列表
- 768×1024 (0.79 MP)
- 640×1536 (0.98 MP)
- 832×1216 (1.01 MP)
- 896×1152 (1.03 MP)
- 768×1344 (1.03 MP)
- 915×1144 (1.05 MP)
- 1254×836 (1.05 MP)
- 1024×1024 (1.05 MP)
- 1024×1536 (1.57 MP)

---

### 📦 简易Checkpoint加载器 (Simple Checkpoint Loader)

**支持自定义VAE的Checkpoint加载器**

基于ComfyUI_Mira的Checkpoint Loader with Name节点，增加了ComfyUI-Easy-Use简易加载器的VAE选择功能，让用户可以选择使用模型内置VAE或自定义VAE文件。

#### 核心功能
- 📦 **Checkpoint加载**: 加载diffusion模型checkpoint
- 🎨 **VAE选择**: 支持使用内置VAE或选择自定义VAE文件
- 📝 **模型名称输出**: 返回模型名称用于后续节点
- 🔄 **完整输出**: 返回MODEL、CLIP、VAE和模型名称

#### 使用方法
1. 添加 `danbooru > 简易Checkpoint加载器 (Simple Checkpoint Loader)` 节点
2. 从下拉列表选择要加载的checkpoint模型
3. 选择VAE选项:
   - **Baked VAE**: 使用checkpoint内置的VAE（默认）
   - **自定义VAE**: 从VAE列表中选择其他VAE文件
4. 连接输出到其他节点:
   - `MODEL`: 用于采样的模型
   - `CLIP`: 用于文本编码的CLIP模型
   - `VAE`: 用于编码/解码的VAE模型
   - `model_name`: 模型名称字符串

#### 应用场景
- **快速加载**: 简化checkpoint加载流程
- **VAE实验**: 快速测试不同VAE对生成效果的影响
- **工作流优化**: 统一的加载接口，便于工作流管理
- **模型对比**: 配合模型名称输出，方便记录使用的模型

#### 代码来源
本节点代码参考自：
- [ComfyUI_Mira](https://github.com/mirabarukaso/ComfyUI_Mira) - Checkpoint Loader with Name节点
- [ComfyUI-Easy-Use](https://github.com/yolain/ComfyUI-Easy-Use) - 简易加载器的VAE选择功能

---

### 🔔 简易通知 (Simple Notify)

**系统通知和音效二合一节点**

简易通知节点结合了系统通知和音效播放功能，为工作流完成时提供即时的视觉和听觉反馈。

#### 核心功能
- 🔔 **系统通知**: 在工作流完成时显示系统通知
- 🔊 **音效播放**: 播放提示音提醒任务完成
- 🎛️ **独立控制**: 可单独开关通知和音效
- 📝 **自定义消息**: 支持自定义通知消息内容
- 🔊 **音量控制**: 可调节音效播放音量
- 🔗 **工作流串联**: 保留输入输出引脚用于工作流串联

#### 使用方法
1. 添加 `danbooru > 简易通知 (Simple Notify)` 节点
2. 连接上游节点的输出到 `any` 输入引脚
3. 配置参数：
   - `message`: 通知消息内容（默认："任务已完成"）
   - `volume`: 音效音量 0-1（默认：0.5）
   - `enable_notification`: 是否启用系统通知（默认：True）
   - `enable_sound`: 是否启用音效（默认：True）
4. 节点会透传输入数据到输出引脚，可继续连接后续节点

#### 应用场景
- **长时间任务提醒**: 在长时间运行的工作流完成时得到通知
- **批量生成监控**: 批量生成图像时及时了解完成状态
- **多任务管理**: 同时运行多个工作流时区分完成状态
- **无人值守运行**: 离开电脑时也能知道任务完成情况

#### 使用示例
```
文生图 → 图生图 → 放大 → 简易通知(message="图像生成完成!", volume=0.7) → 保存图像
```

#### 代码来源
本节点功能参考自：
- [ComfyUI-Custom-Scripts](https://github.com/pythongosssss/ComfyUI-Custom-Scripts) - SystemNotification 和 PlaySound 节点

---

### ✂️ 简易字符串分隔 (Simple String Split)

**轻量级字符串分割工具节点**

简易字符串分隔节点提供基础的字符串分割功能，将输入字符串按指定分隔符分割为字符串数组，自动去除前后空白字符。

#### 核心功能
- ✂️ **简洁分割**: 按分隔符分割字符串为数组
- 🧹 **自动清理**: 自动去除每个元素前后的空白字符
- 🎯 **精确输出**: 只返回实际内容，不填充空元素
- 🔧 **灵活选择**: 支持逗号和竖线两种常用分隔符
- 📋 **列表输出**: 直接输出字符串数组，便于后续处理

#### 使用方法
1. 添加 `danbooru > 简易字符串分隔 (Simple String Split)` 节点
2. 在 `string` 参数中输入要分割的字符串
3. 选择 `split` 分隔符类型：
   - `,` (逗号) - 默认选项
   - `|` (竖线)
4. 节点输出字符串数组，可连接到支持列表输入的节点

#### 输入参数
- **string** (STRING): 要分割的字符串
- **split** (可选): 分隔符类型，支持 `,` 和 `|`

#### 输出参数
- **STRING** (列表): 分割后的字符串数组

#### 使用示例

**示例 1：分割标签列表**
```
输入: "face, eyes, hand"
分隔符: ,
输出: ["face", "eyes", "hand"]
```

**示例 2：竖线分隔**
```
输入: "option1 | option2 | option3"
分隔符: |
输出: ["option1", "option2", "option3"]
```

**示例 3：自动清理空白**
```
输入: "  tag1  ,  tag2  ,  tag3  "
分隔符: ,
输出: ["tag1", "tag2", "tag3"]
```

#### 应用场景
- **标签处理**: 分割逗号分隔的标签列表
- **配置解析**: 解析配置字符串为数组
- **数据预处理**: 将字符串数据转换为列表格式
- **批量操作**: 准备批量处理的参数列表

#### 代码来源
本节点基于以下项目简化而来：
- [cg-image-filter](https://github.com/chrisgoringe/cg-image-filter) - Split String by Commas 节点

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
├── prompt_cleaning_maid/           # 提示词清洁女仆
│   ├── __init__.py
│   └── prompt_cleaning_maid.py
├── parameter_control_panel/        # 参数控制面板
│   ├── __init__.py
│   └── parameter_control_panel.py
├── parameter_break/                # 参数展开
│   ├── __init__.py
│   └── parameter_break.py
├── workflow_description/           # 工作流说明
│   ├── __init__.py
│   ├── workflow_description.py
│   └── settings.json               # 版本记录设置文件
├── simple_image_compare/           # 简易图像对比
│   ├── __init__.py
│   └── simple_image_compare.py
├── simple_load_image/              # 简易加载图像
│   ├── __init__.py
│   └── simple_load_image.py
├── save_image_plus/                # 增强保存图像
│   ├── __init__.py
│   └── save_image_plus.py
├── metadata_collector/             # 元数据收集模块
│   ├── __init__.py
│   ├── metadata_hook.py            # Hook 安装（支持链式调用）
│   ├── metadata_registry.py       # 元数据注册表
│   ├── metadata_processor.py      # 元数据处理器
│   ├── node_extractors.py         # 节点提取器
│   └── constants.py                # 常量定义
├── group_executor_manager/         # 组执行管理器
│   ├── __init__.py
│   └── group_executor_manager.py
├── group_executor_trigger/         # 组执行触发器
│   └── group_executor_trigger.py
├── group_mute_manager/             # 组静音管理器
│   ├── __init__.py
│   └── group_mute_manager.py
├── quick_group_navigation/         # 快速组导航器
│   └── __init__.py
├── has_next_executor_group/        # 后续执行组是否有效节点
│   ├── __init__.py
│   └── has_next_executor_group.py
├── image_cache_save/               # 图像缓存保存节点
│   ├── __init__.py
│   └── image_cache_save.py
├── image_cache_get/                # 图像缓存获取节点
│   ├── __init__.py
│   └── image_cache_get.py
├── image_cache_manager/            # 图像缓存管理器
│   ├── __init__.py
│   └── image_cache_manager.py
├── global_text_cache_save/         # 全局文本缓存保存节点
│   ├── __init__.py
│   └── global_text_cache_save.py
├── global_text_cache_get/          # 全局文本缓存获取节点
│   ├── __init__.py
│   └── global_text_cache_get.py
├── text_cache_manager/             # 文本缓存管理器
│   ├── __init__.py
│   └── text_cache_manager.py
├── text_cache_viewer/              # 文本缓存查看器节点
│   ├── __init__.py
│   └── text_cache_viewer.py
├── resolution_master_simplify/     # 分辨率大师简化版
│   ├── __init__.py
│   ├── resolution_master_simplify.py
│   └── settings.json
├── simple_checkpoint_loader_with_name/  # 简易Checkpoint加载器
│   ├── __init__.py
│   └── simple_checkpoint_loader_with_name.py
├── simple_notify/                  # 简易通知
│   ├── __init__.py
│   ├── simple_notify.py
│   └── notify.mp3
├── simple_string_split/            # 简易字符串分隔
│   ├── __init__.py
│   └── simple_string_split.py
├── open_in_krita/                  # Open In Krita (Krita集成)
│   ├── __init__.py
│   ├── open_in_krita.py            # 主节点逻辑
│   ├── krita_manager.py            # Krita路径管理
│   └── plugin_installer.py         # Krita插件自动安装器
├── krita_files/                    # Krita插件源文件
│   ├── open_in_krita.desktop       # Krita插件配置文件
│   └── open_in_krita/              # Krita插件Python代码
│       ├── __init__.py
│       ├── extension.py            # Krita扩展主逻辑
│       ├── communication.py        # 与ComfyUI通信模块
│       └── logger.py               # 日志记录器
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
│   ├── native-execution/           # 组执行系统前端
│   │   ├── __init__.js
│   │   ├── cache-control-events.js
│   │   └── optimized-execution-engine.js
│   ├── group_executor_manager/     # 组执行管理器前端
│   │   └── group_executor_manager.js
│   ├── group_mute_manager/         # 组静音管理器前端
│   │   └── group_mute_manager.js
│   ├── quick_group_navigation/     # 快速组导航器前端
│   │   ├── quick_group_navigation.js
│   │   ├── floating_navigator.js
│   │   ├── styles.css
│   │   └── README.md
│   ├── resolution_master_simplify/ # 分辨率大师简化版前端
│   │   └── resolution_master_simplify.js
│   ├── parameter_control_panel/    # 参数控制面板前端
│   │   └── parameter_control_panel.js
│   ├── parameter_break/            # 参数展开前端
│   │   └── parameter_break.js
│   ├── workflow_description/       # 工作流说明前端
│   │   └── workflow_description.js
│   ├── simple_image_compare/       # 简易图像对比前端
│   │   └── simple_image_compare.js
│   ├── global_text_cache_save/     # 全局文本缓存保存节点前端
│   │   └── global_text_cache_save.js
│   ├── global_text_cache_get/      # 全局文本缓存获取节点前端
│   │   └── global_text_cache_get.js
│   ├── text_cache_viewer/          # 文本缓存查看器前端
│   │   └── text_cache_viewer.js
│   ├── simple_checkpoint_loader_with_name/  # 简易Checkpoint加载器前端（预留）
│   ├── simple_notify/              # 简易通知前端
│   │   └── simple_notify.js
│   ├── open_in_krita/              # Open In Krita 前端
│   │   ├── open_in_krita.js
│   │   └── setup_dialog.js
│   └── global/                     # 全局共享组件
│       ├── autocomplete_cache.js
│       ├── autocomplete_ui.js
│       ├── color_manager.js
│       ├── multi_language.js
│       ├── toast_manager.js
│       └── translations/
│           ├── resolution_simplify_translations.js
│           └── ...
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

### 🖼️ Danbooru Gallery

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

### 🧹 Prompt Cleaning Maid

**Intelligent Prompt Cleaning and Formatting Node**

Prompt Cleaning Maid is a professional prompt cleaning tool that automatically removes redundant symbols, whitespace, and formatting issues, making prompts more standardized and clean.

#### Core Features
- 🧹 **Comma Cleanup**: Automatically remove redundant commas (consecutive commas, leading/trailing commas)
- ⚡ **Whitespace Normalization**: Clean leading/trailing whitespace and excessive spaces/tabs
- 🏷️ **LoRA Tag Management**: Optionally remove `<lora:xxx>` tags from strings
- 📄 **Newline Handling**: Replace newline characters with spaces or commas
- 🔧 **Bracket Fixing**: Automatically remove unmatched parentheses `()` or brackets `[]`
- 🔄 **Smart Cleaning**: Multi-stage cleaning process ensures correct prompt formatting

#### Cleaning Options

**1. Cleanup Commas (cleanup_commas)**
- Remove leading commas
- Remove trailing commas
- Merge consecutive commas into single comma
- Example: `, , tag1, , tag2, ,` → `tag1, tag2`

**2. Cleanup Whitespace (cleanup_whitespace)**
- Clean leading/trailing spaces and tabs
- Merge multiple consecutive spaces into single space
- Normalize spacing around commas
- Example: `  tag1  ,   tag2   ` → `tag1, tag2`

**3. Remove LoRA Tags (remove_lora_tags)**
- Completely remove LoRA tags from strings
- Supports various LoRA formats: `<lora:name:weight>`
- Example: `1girl, <lora:style:0.8>, smile` → `1girl, smile`

**4. Cleanup Newlines (cleanup_newlines)**
- **False**: Preserve newline characters
- **Space**: Replace `\n` with space
- **Comma**: Replace `\n` with `, `
- Example (comma): `tag1\ntag2` → `tag1, tag2`

**5. Fix Brackets (fix_brackets)**
- **False**: Don't fix brackets
- **Parenthesis**: Remove unmatched `()`
- **Brackets**: Remove unmatched `[]`
- **Both**: Fix both parentheses and brackets
- Example: `((tag1) tag2))` → `(tag1) tag2`

#### Usage
1. Add `Danbooru > Prompt Cleaning Maid` node
2. Connect upstream node's string output to `string` input
3. Enable/disable cleaning options as needed
4. Get cleaned `string` output

#### Use Cases
- **Prompt Standardization**: Unify prompt format for easy management and reuse
- **Automated Cleaning**: Batch clean prompts from various sources
- **Format Conversion**: Convert multi-line prompts to single line or adjust delimiters
- **LoRA Management**: Quickly remove or retain LoRA tags
- **Bracket Fixing**: Fix bracket mismatches from copy-paste operations

#### Cleaning Process
Prompt Cleaning Maid performs cleaning in the following order for optimal results:
1. **Stage 1**: Remove LoRA tags (if enabled)
2. **Stage 2**: Replace newlines (if enabled)
3. **Stage 3**: Clean redundant commas (if enabled)
4. **Stage 4**: Fix unmatched brackets (if enabled)
5. **Stage 5**: Clean redundant whitespace (if enabled)

#### Example

**Input Prompt**:
```
, , 1girl, blue eyes,  , <lora:style:0.8>,
smile, ((long hair),  beautiful
```

**After Cleaning** (all options enabled, newlines→comma, brackets→both):
```
1girl, blue eyes, smile, (long hair), beautiful
```

---

### 🎛️ Parameter Control Panel

**Visual Parameter Management and Workflow Control Node**

Parameter Control Panel is a powerful parameter management node that provides a visual interface to create, manage, and output various types of parameters, working with Parameter Break node for flexible workflow parameter control.

#### Core Features
- 🎨 **Visual Parameter Editing**: Intuitive UI interface for parameter management
- 📊 **Multiple Parameter Types**: Support for sliders, switches, dropdown menus, images, and more
- 🎯 **Separator Support**: Use separators to organize and group parameters
- 🔄 **Drag-and-Drop Sorting**: Adjust parameter order through dragging
- 💾 **Workflow Persistence**: Parameter configuration saved with workflow
- 🔒 **Lock Protection**: Lock mode to prevent accidental modifications
- 🎛️ **Adaptive Dropdowns**: Support for auto-fetching dropdown options from connections

#### Parameter Types

**1. Slider**
- Support for integers and floating-point numbers
- Configurable min, max, step, and default values
- Real-time value display and adjustment
- Examples: `steps (20, 1-150, step=1)`, `cfg (7.5, 1.0-30.0, step=0.5)`

**2. Switch**
- Boolean value switch
- Configurable default value (True/False)
- Elegant switch UI
- Examples: `enable_hr (True)`, `save_metadata (False)`

**3. Dropdown**
- Four data source modes:
  - **From Connection**: Auto-fetch options from target node connected to Parameter Break
  - **Custom**: Manually input option list
  - **Checkpoint**: Auto-load checkpoint model list
  - **LoRA**: Auto-load LoRA model list
- Support for long text auto-ellipsis display
- Deep purple color theme
- Examples: `sampler (euler_a, ddim, dpm++)`, `model (auto from connection)`

**4. Image**
- Image upload and management functionality
- Support for uploading images via file selector
- Hover preview display (mouse over filename)
- Clear button to quickly remove selected image
- Outputs 1024×1024 pure white image when no image is uploaded
- Output type is IMAGE (ComfyUI standard image tensor)
- Suitable for conditional images, reference images, etc.
- Examples: `reference_image (uploaded.png)`, `control_image (None → white image)`

**5. Separator**
- Visual grouping and parameter organization
- Customizable separator text
- Elegant purple theme design
- Examples: `--- Basic Parameters ---`, `--- Advanced Settings ---`

#### Usage
1. Add `Danbooru > Parameter Control Panel` node
2. Double-click to open parameter management interface
3. Click "+" button to add parameters:
   - Input parameter name
   - Select parameter type
   - Configure parameter options (range, options, etc.)
4. Adjust parameter values, connect `parameters` output to Parameter Break node
5. Use lock 🔒 button to protect parameter configuration

#### Use Cases
- **Workflow Parameterization**: Centrally manage common parameters
- **Batch Experiments**: Quickly adjust parameters for comparative experiments
- **Preset System**: Save different parameter combinations
- **Model Switching**: Quickly switch models/LoRAs using dropdowns
- **Conditional Control**: Use switches to control workflow branches

#### Technical Features
- **Responsive Design**: Node size adapts to content
- **Deep Purple Theme**: Unified visual style
- **Performance Optimization**: Avoid unnecessary redraws
- **Smart Layout**: Automatically adjust button and control positions

---

### 📤 Parameter Break

**Smart Parameter Expansion and Option Synchronization Node**

Parameter Break node receives parameter packages from Parameter Control Panel, automatically expands them into independent output pins, and supports auto-syncing dropdown options from connected target nodes.

#### Core Features
- 📤 **Auto Expansion**: Expand parameter package into independent output pins
- 🔄 **Smart Synchronization**: Auto-sync parameter structure changes
- 🎯 **Wildcard Type**: Use AnyType to support connecting to any input
- 🔗 **Auto Option Fetching**: Auto-extract options when connected to combo inputs
- 🧹 **Auto Clear**: Auto-clear dropdown options when disconnected
- 📊 **Real-time Update**: Immediately update output pins when parameters change

#### How It Works

**Parameter Structure Synchronization**:
1. Parameter Control Panel creates parameter configuration
2. Parameter Break receives parameter package
3. Auto-read parameter structure and create corresponding output pins
4. Each output pin corresponds to one parameter, maintaining name and type consistency

**Option Auto-Synchronization**:
1. Connect Parameter Break's dropdown output to target node's combo input
2. Auto-detect target node's input type and available options
3. Extract option list and sync back to Parameter Control Panel
4. Dropdown UI auto-refreshes to display new options
5. Auto-clear options when disconnected

#### Supported Sync Scenarios
- ✅ **Checkpoint Loader**: Auto-fetch checkpoint list
- ✅ **VAE Selector**: Auto-fetch VAE list
- ✅ **Sampler Selection**: Auto-fetch sampler list
- ✅ **Scheduler Selection**: Auto-fetch scheduler list
- ✅ **All Combo Inputs**: Support all ComfyUI combo type inputs

#### Usage
1. Add `Danbooru > Parameter Break` node
2. Connect Parameter Control Panel's `parameters` output
3. Auto-generate corresponding output pins
4. Connect dropdown outputs to target node's combo inputs
5. Options auto-sync, select in Parameter Control Panel

#### Usage Examples

**Basic Parameter Control**:
```
Parameter Control Panel (steps=20, cfg=7.5, sampler=euler_a)
  ↓ parameters
Parameter Break
  ↓ steps (INT)
  ↓ cfg (FLOAT)
  ↓ sampler (STRING)
KSampler Node
```

**Auto Model Switching**:
```
Parameter Control Panel (model_name: dropdown - from_connection)
  ↓ parameters
Parameter Break
  ↓ model_name (*)  → CheckpointLoader's ckpt_name input
                       (auto-fetch all checkpoint lists)
```

**Auto VAE Selection**:
```
Parameter Control Panel (vae_name: dropdown - from_connection)
  ↓ parameters
Parameter Break
  ↓ vae_name (*)  → Simple Checkpoint Loader's vae_name input
                     (auto-fetch all VAE lists)
```

#### Use Cases
- **Centralized Parameter Management**: Centralize scattered parameters to one panel
- **Quick Model Switching**: Quickly switch checkpoint/VAE through dropdowns
- **Batch Experiments**: Conduct batch parameter experiments with Group Executor Manager
- **Workflow Templates**: Create reusable parameterized workflow templates

#### Technical Highlights
- **Precise Matching**: Precisely match corresponding widget through input name
- **Smart Caching**: Avoid repeatedly syncing same options
- **Debouncing**: 300ms debounce to avoid frequent API calls
- **Error Tolerance**: Comprehensive error handling mechanism
- **Connection Recovery**: Recover connections based on parameter ID, support parameter reordering

#### Code Reference
The auto option synchronization feature of Parameter Break node is inspired by the design of [ComfyUI-CRZnodes](https://github.com/CoreyCorza/ComfyUI-CRZnodes) project.

---

### 📝 Workflow Description

**Markdown Rendering Workflow Documentation Node**

Workflow Description node provides an elegant way to add documentation to workflows, supporting Markdown rendering, version management, and first-open popup notifications.

#### Core Features
- 📝 **Markdown Rendering**: Full Markdown syntax support including headings, lists, code blocks, tables, etc.
- 🎨 **Rich Text Editing**: Intuitive editing interface with real-time preview
- 🔔 **Version Popup**: First-open notification based on version number to ensure users see latest instructions
- 💾 **Workflow Persistence**: Documentation content saved with workflow for easy sharing and collaboration
- 🎯 **Clean UI**: Rendered Markdown content displayed directly in the node
- 🔒 **Virtual Node**: Does not participate in actual execution, no impact on workflow performance

#### Parameter Configuration
- **Title**: Title of the documentation, displayed at the top of the node
- **Content**: Markdown-formatted documentation content
- **Version**: Used to control first-open popup, format like "1.0.0"
- **Enable Popup**: Whether to show notification popup when first opening the workflow

#### Usage
1. Add `Danbooru > Workflow Description` node
2. Double-click the node to open the editor
3. Enter title and Markdown content
4. Set version number (optional)
5. Enable/disable first-open popup
6. After saving, content will be rendered and displayed in the node in real-time

#### Use Cases
- **Workflow Documentation**: Add usage instructions for complex workflows
- **Parameter Explanation**: Explain the purpose and recommended values of parameters
- **Change Log**: Record version change history of workflows
- **Collaboration Sharing**: Explain workflow usage to team members
- **Template Instructions**: Provide configuration guides in workflow templates

#### Markdown Support
- ✅ **Headings**: `# H1`, `## H2`, `### H3`, etc.
- ✅ **Lists**: Ordered lists, unordered lists, nested lists
- ✅ **Emphasis**: `**bold**`, `*italic*`, `~~strikethrough~~`
- ✅ **Code**: Inline code and code blocks (with syntax highlighting)
- ✅ **Links**: `[link text](URL)`
- ✅ **Images**: `![image description](URL)`
- ✅ **Tables**: Markdown table syntax
- ✅ **Blockquotes**: `> quote text`
- ✅ **Horizontal Rules**: `---` or `***`

#### Version Popup Mechanism
- Tracking based on node ID and version number
- Each node independently records opened versions
- Popup automatically triggered when version number changes
- Settings saved in plugin directory, shared across workflows

#### Technical Features
- **Lightweight Rendering**: Efficient Markdown parsing and rendering
- **Style Customization**: Purple theme consistent with overall plugin style
- **Responsive Design**: Node size adapts to content
- **Persistent Storage**: Comprehensive data save and recovery mechanism

---

### 🖼️ Simple Image Compare

**High-Performance Image Comparison Node**

Simple Image Compare is a performance-optimized image comparison tool that supports real-time comparison of two images through mouse sliding, specially optimized for multi-node scenarios.

#### Core Features
- 🎯 **Slide Comparison**: Hover and move left-right to view image comparison
- ⚡ **Performance Optimized**: Optimized for multi-node scenarios to avoid workflow dragging lag
- 🖼️ **Batch Support**: Supports selecting any two images from a batch for comparison
- 🎨 **Smart Rendering**: Throttling and caching mechanisms to reduce unnecessary redraws
- 📐 **Adaptive Layout**: Automatically adjusts image size to fit node dimensions

#### Performance Optimization Features
- 🚀 **Removed Animation Loop**: Eliminates the original requestAnimationFrame infinite loop
- ⏱️ **Mouse Move Throttling**: Limits event processing frequency to ~60fps
- 💾 **Calculation Result Caching**: Caches image position and size calculations
- 🎯 **Smart Redraw**: Only triggers canvas redraw when necessary
- 📉 **Resource Saving**: Significantly reduces CPU usage in multi-node scenarios

#### Usage
1. Add `image > Simple Image Compare` node
2. Connect `image_a` input (first comparison image)
3. Connect `image_b` input (second comparison image)
4. Hover mouse over the node and move left-right to view comparison

#### Use Cases
- **Quality Comparison**: Compare image quality with different parameters
- **Model Comparison**: Compare generation effects of different models
- **LoRA Comparison**: Compare effects of different LoRAs
- **Parameter Tuning**: Real-time comparison of changes before and after parameter adjustments
- **Batch Inspection**: Quickly browse and compare large numbers of generated images

#### Technical Highlights
Compared to the original image comparison node, this node is optimized in the following aspects:
- **Smooth Workflow Dragging**: No more lag with 10+ nodes
- **Lower CPU Usage**: Reduces event processing count by ~80%
- **Improved Rendering Efficiency**: Avoids redundant calculations through caching
- **Optimized Memory Usage**: Intelligently clears unused cache data

---

### 🖼️ Simple Load Image

**Minimalist Image Loading Node**

Simple Load Image provides basic functionality similar to ComfyUI's native upload node, supporting image selection, upload, and a default black image option.

#### Core Features
- 📁 **Image Selection**: Choose from existing image files in the input directory
- ⬆️ **Image Upload**: Directly upload new images to the input directory
- ⚫ **Default Black Image**: First option is a black image (simple_none.png) that returns a 1024×1024 pure black image
- 🔄 **Auto Recovery**: Automatically recreates the default black image if accidentally deleted
- 🎯 **Native Compatibility**: Uses ComfyUI's native logic entirely, preview and loading mechanism identical to native nodes

#### Usage
1. Add `image > Simple Load Image` node
2. Select image from dropdown:
   - First option `simple_none.png` is the default black image
   - Other options are image files in the input directory
3. Or click upload button to upload a new image
4. Node outputs IMAGE type tensor, can be connected to any node requiring image input

#### Use Cases
- **Placeholder Image**: Use black image as placeholder during workflow development
- **Image Switching**: Quickly switch between different images to test effects
- **Batch Testing**: Combine with other nodes for batch image processing tests

#### Technical Features
- **Fully Native**: Uses ComfyUI's native file loading mechanism, no custom frontend code
- **Auto Maintenance**: Default black image automatically created and recovered, no manual management needed
- **Simple & Efficient**: Simple code structure with minimal performance overhead

---

### 🔺 PixelKSampleUpscaler Sharpening

**Enhanced Upscaler Provider with AMD FidelityFX CAS Sharpening**

PixelKSampleUpscaler Sharpening is an enhanced upscaler provider node with integrated sharpening capabilities, designed for Impact Pack's Iterative Upscale workflow. It features the AMD FidelityFX CAS (Contrast Adaptive Sharpening) algorithm as a high-performance alternative to slow upscale models.

#### Core Features
- 🚀 **Three Upscale Modes**: Smart switching between model upscale/sharpening upscale/simple upscale
- ✨ **CAS Sharpening Algorithm**: Contrast adaptive sharpening based on AMD FidelityFX
- ⚡ **Fast Solution**: Simple upscale + sharpening as high-performance alternative to upscale models
- 🎛️ **Adjustable Sharpening**: Sharpening intensity 0-1, default 0.6
- 🔄 **Perfect Compatibility**: Fully compatible with Impact Pack's Iterative Upscale node
- 🧩 **Tiled VAE Support**: Support tiled VAE for processing ultra-large images
- 🎯 **Sampling Preview**: Support real-time sampling preview and progress display
- 🔌 **Hook Integration**: Full support for Impact Pack's Hook system

#### Working Modes
1. **Model Upscale Mode**: When upscale_model is connected, use model upscaling (high quality but slow)
2. **Sharpening Upscale Mode**: When no model connected and sharpening enabled, use simple upscale + CAS sharpening (fast)
3. **Simple Upscale Mode**: When no model connected and sharpening disabled, use simple upscale only

#### Usage
1. Add `Danbooru > PixelKSampleUpscalerProvider(Sharpening)` node
2. Connect basic parameters:
   - `model`: ComfyUI model
   - `vae`: VAE model
   - `positive/negative`: Positive/negative conditioning
   - `scale_method`: Scaling method (bilinear, lanczos, etc.)
3. Configure sampling parameters:
   - `seed`, `steps`, `cfg`: Standard sampling parameters
   - `sampler_name`, `scheduler`: Sampler and scheduler
   - `denoise`: Denoise strength
4. Configure sharpening parameters:
   - `enable_sharpening`: Enable sharpening (default True)
   - `sharpening_amount`: Sharpening intensity 0-1 (default 0.6)
5. Optional connections:
   - `upscale_model_opt`: Upscale model (when connected, will use model instead of sharpening)
   - `pk_hook_opt`: Impact Pack Hook
6. Output `upscaler` connects to `Iterative Upscale (Image)` node

#### Technical Features
- **Independent Implementation**: Fully independent, no dependency on Impact Pack or ComfyUI Essential
- **High Performance**: CAS sharpening algorithm based on 3x3 neighborhood, computationally efficient
- **Smart Switching**: Automatically switch working mode based on upscale model connection
- **Complete Hook Support**: Supports all 5 Hook points from Impact Pack
- **Preview Support**: Integrated latent_preview system for sampling progress display

#### Use Cases
- **Rapid Iteration**: Use sharpening mode for quick preview during workflow testing
- **Resource Saving**: Sharpening mode doesn't require loading large upscale models, saves VRAM
- **Flexible Switching**: Use sharpening for preview, switch to model upscale for final generation
- **High Resolution**: Work with tiled VAE for ultra-large image upscaling

---

### 💾 Save Image Plus

**Professional Image Saving Node with Full A1111 Format Metadata**

Save Image Plus is a powerful image saving node that automatically collects all metadata (models, prompts, parameters, etc.) from your workflow and embeds them into images in Auto1111 WebUI compatible format, enabling platforms like Civitai to correctly recognize and display resource information.

#### Core Features
- 📋 **Complete Metadata Collection**: Auto-collects Checkpoint, LoRA, VAE, prompts, sampling parameters, etc.
- 🔄 **A1111 Format Compatible**: Generates Auto1111 WebUI compatible metadata format
- 🌐 **Civitai Resource Recognition**: Images uploaded to Civitai correctly display used model resources
- 🎯 **Independent Metadata System**: Uses own metadata_collector module, no dependency on other plugins
- 🔗 **Flexible Prompt Input**: Supports direct prompt input or automatic extraction from workflow
- 💾 **Multiple Format Support**: PNG/JPEG/WebP formats with optional workflow embedding
- 🧹 **Clean Copy**: Optional saving of metadata-free clean image copies
- 👁️ **Preview Control**: Optional UI preview display (performance boost for batch generation)

#### Key Features
- **Smart Hash Calculation**: Complete file read for accurate hash values (consistent with LoRA Manager)
- **Chain Hook Support**: Coexists with other metadata collection plugins (like LoRA Manager) without conflicts
- **Exception Isolation**: Metadata collection errors don't affect main workflow execution
- **Thread Safe**: Supports multiple instances running simultaneously

#### Usage
1. Add `image > Save Image Plus` node
2. Connect image input to save
3. Configure save options:
   - `enable`: Enable/disable saving (skips execution when off)
   - `filename_prefix`: Filename prefix
   - `file_format`: Image format (PNG/JPEG/WEBP)
   - `quality`: JPEG/WebP quality (1-100)
   - `embed_workflow`: Embed ComfyUI workflow data (PNG only)
   - `save_clean_copy`: Save additional metadata-free clean copy
   - `enable_preview`: Show preview in UI
4. Optionally connect prompt inputs (otherwise auto-extracted from workflow):
   - `positive_prompt`: Positive prompt
   - `negative_prompt`: Negative prompt
   - `lora_syntax`: LoRA syntax string

#### Metadata Contents
- **Model Info**: Checkpoint name and hash value
- **Prompts**: Positive and negative prompts (supports LoRA syntax)
- **Sampling Parameters**: Steps, CFG, Sampler, Scheduler, etc.
- **LoRA List**: Used LoRAs with their weights
- **Image Dimensions**: Generated image width and height
- **Other Parameters**: VAE, Clip Skip, etc.

#### Use Cases
- **Civitai Display**: Automatically shows used resources when uploaded to Civitai
- **Parameter Recording**: Complete parameter save for easy reproduction
- **Workflow Sharing**: Embedded workflow data for others to use
- **Batch Generation**: Disable preview for better performance in large batches

#### Technical Features
- **Independent Implementation**: No dependency on LoRA Manager or other plugins
- **Full Compatibility**: Hash calculation method fully consistent with LoRA Manager
- **Performance Optimized**: 128KB chunk size for efficient hash calculation
- **Error Handling**: Comprehensive exception handling without affecting main workflow

---

### 🎨 Open In Krita

**Seamless Bridge Between ComfyUI and Krita**

The Open In Krita node implements bidirectional data exchange between ComfyUI and Krita, allowing you to edit ComfyUI-generated images directly in Krita and send the editing results (including selection masks) back to the workflow for continued processing.

#### Core Features
- 🔄 **Bidirectional Data Transfer**: ComfyUI ↔ Krita image and mask data exchange
- 🎨 **Auto-Launch Krita**: Automatically launches Krita when not running
- 🖼️ **Smart Session Management**: Reuses tabs for same images, creates new tabs for different images
- ⏱️ **Real-Time Monitoring**: Waits for user to complete editing in Krita and retrieve data
- 🔌 **Auto Plugin Installation**: Automatically installs and configures Krita plugin on first use
- 🛡️ **Version Sync Updates**: Automatic plugin version detection and updates
- 🎯 **Selection Mask Support**: Full support for Krita selections as mask output
- ⚙️ **Friendly Setup Wizard**: Shows guided dialog when not configured

#### Workflow
1. **Send Image to Krita**:
   - Node execution automatically sends input image to Krita
   - Krita automatically opens image (new tabs for new images, reuses tabs for same images)
   - Node enters waiting state (up to 1 hour)

2. **Edit in Krita**:
   - Freely edit image in Krita (painting, color adjustment, filters, etc.)
   - Can create selections as mask regions
   - Click node's "Fetch from Krita" button when editing is complete

3. **Return Data to ComfyUI**:
   - Node retrieves edited image and selection mask
   - Outputs IMAGE and MASK for connection to subsequent nodes
   - Continue ComfyUI workflow processing

#### Usage
1. **Initial Setup**:
   - Add `Danbooru > Open In Krita` node
   - Setup wizard dialog appears on first execution
   - Choose "Installed, Set Path" or "Not Installed, Go to Website"
   - Plugin automatically installs to Krita (no manual operation needed)

2. **Daily Use**:
   - Connect IMAGE input to node
   - Execute node → Image opens automatically in Krita
   - Edit image in Krita
   - Click "Fetch from Krita" button
   - Get editing results to continue workflow

#### Node Buttons
- 🟢 **Fetch from Krita**: Actively retrieve currently edited image and selection from Krita
- 🔧 **Reinstall Plugin**: Force reinstall Krita plugin (fixes plugin issues)
- ⚙️ **Set Krita Path**: Change Krita executable file path
- ✅ **Check Krita Plugin**: Check plugin installation status and version
- 🛑 **Cancel Execution**: Cancel waiting, interrupt node execution

#### Technical Features
- **File Monitoring Mechanism**: Implements data exchange based on temporary files and request-response pattern
- **Auto Version Management**: Automatically updates Krita plugin when version differences detected
- **Smart Launch**: Detects Krita process status, auto-launches when not running
- **Image Hash Caching**: Avoids repeatedly opening same image
- **Batch Mode**: Krita plugin uses batch mode to avoid save confirmation popups
- **Complete Logging**: Detailed logs help with problem diagnosis

#### System Requirements
- **Krita**: 4.0 or higher
- **Python**: ComfyUI environment (built-in)
- **Optional Dependency**: `psutil` (for process management, improves experience)

#### FAQ
- **Q: Does the plugin need manual enabling?**
  A: No! Plugin is set with `EnabledByDefault=true` during installation, automatically enabled after restarting Krita

- **Q: What if images don't open automatically?**
  A: Check if Krita is running, try clicking the "Check Krita Plugin" button, or view log files

- **Q: How to view detailed logs?**
  A: Log file located at `%TEMP%\open_in_krita\krita_plugin.log` (Windows)

#### Acknowledgments
This node's design is inspired by the following excellent projects:
- [cg-krita](https://github.com/chrisgoringe/cg-krita) - Core ideas for Krita integration
- [comfyui-tooling-nodes](https://github.com/Acly/comfyui-tooling-nodes) - External tool integration reference
- [krita-ai-diffusion](https://github.com/Acly/krita-ai-diffusion) - Krita plugin architecture reference

---

### ⚡ Group Executor Manager

**Efficient Batch Workflow Execution Node**

Group Executor Manager allows you to divide your workflow into multiple groups and execute them sequentially or in parallel, working with Image Cache nodes for efficient batch generation.

#### Core Features
- 🎯 **Group Execution**: Divide nodes into execution groups with flexible flow control
- 🔄 **Sequential/Parallel Modes**: Support for both sequential and parallel execution
- 💾 **Smart Caching**: Work with Image Cache nodes for intermediate result caching
- ⏱️ **Delay Control**: Set inter-group delays to avoid resource conflicts
- 🛡️ **Error Handling**: Comprehensive error handling and retry mechanisms
- 📊 **Execution Monitoring**: Real-time execution progress and status display
- 🎛️ **Visual Configuration**: Intuitive UI configuration interface

#### Use Cases
- **Batch Generation**: Execute in batches when generating large numbers of images to avoid memory overflow
- **Complex Workflows**: Split complex workflows into multiple execution stages
- **Resource Optimization**: Arrange execution order to optimize GPU/memory usage
- **Intermediate Caching**: Cache intermediate results to avoid redundant calculations

#### Usage
1. Add `Danbooru > Group Executor Manager` node
2. Double-click to open configuration interface
3. Create execution groups and add nodes
4. Configure execution mode (sequential/parallel) and delay times
5. Add `Group Executor Trigger` node to start execution

#### Configuration Example
```json
{
  "groups": [
    {
      "name": "Group1-Text2Image",
      "nodes": [1, 2, 3, 4],
      "delay": 0
    },
    {
      "name": "Group2-Image2Image",
      "nodes": [5, 6, 7],
      "delay": 2
    },
    {
      "name": "Group3-PostProcess",
      "nodes": [8, 9, 10],
      "delay": 1
    }
  ],
  "mode": "sequential"
}
```

---

### 🔇 Group Mute Manager

**Visual Group Mute Status Management and Linkage Configuration Node**

Group Mute Manager provides an intuitive interface to manage the mute status of all groups in your workflow, with support for configuring inter-group linkage rules for complex workflow control.

#### Core Features
- 🎛️ **Visual Management**: Intuitive UI for managing all group mute states
- 🔗 **Inter-Group Linkage**: Configure automatic control of other groups when a group is enabled/disabled
- 🎨 **Color Filtering**: Filter and display specific groups by ComfyUI built-in colors
- 🔄 **Native Integration**: Uses ComfyUI native mute functionality (ALWAYS/NEVER mode)
- 🛡️ **Anti-Loop Mechanism**: Intelligent detection and prevention of circular linkages
- 💾 **Persistent Configuration**: Configuration saved to workflow JSON
- 🎯 **Precise Control**: Independent control of each group's mute status

#### Linkage Rules
Group Mute Manager supports two types of linkage triggers:
- **On Enable**: Linkage rules triggered when a group is enabled (unmuted)
- **On Disable**: Linkage rules triggered when a group is disabled (muted)

Each linkage rule can:
- Select target group
- Select action (enable/disable)

#### Usage
1. Add `Danbooru > Group Mute Manager` node
2. Double-click to open management interface
3. Use toggle buttons to control group mute status
4. Click gear button to configure group linkage rules
5. Optionally select color filter to show only specific color groups

#### Use Cases
- **Workflow Debugging**: Quickly enable/disable different parts of workflow
- **Conditional Execution**: Dynamically control which groups execute based on needs
- **Batch Management**: Batch control multiple groups through linkage rules
- **Complex Flows**: Implement complex conditional execution logic

#### Example Configuration
```json
{
  "group_name": "Main Generation Group",
  "enabled": true,
  "linkage": {
    "on_enable": [
      {"target_group": "Preprocessing Group", "action": "enable"},
      {"target_group": "Debug Group", "action": "disable"}
    ],
    "on_disable": [
      {"target_group": "Preprocessing Group", "action": "disable"}
    ]
  }
}
```

**Anti-Loop Example**:
If configured with "Group A enable → enable Group B" and "Group B enable → enable Group A", the system will automatically detect and terminate the loop.

---

### 🧭 Quick Group Navigation

**Global Floating Ball Navigation and Keyboard Shortcut Group Jump Tool**

Quick Group Navigation provides an elegant floating ball interface that allows you to quickly jump to any group in your workflow, with support for custom keyboard shortcuts for one-key navigation.

#### Core Features
- 🎯 **Floating Ball Navigation**: Global draggable floating ball for instant group navigation access
- ⌨️ **Keyboard Shortcuts**: Assign number or letter shortcuts to each group for one-key jumping
- 🔍 **Smart Zoom**: Automatically calculates optimal zoom level to display target group completely
- 🔒 **Lock Mode**: Lock feature to prevent accidental operations
- 🎨 **Smart Positioning**: Panel automatically avoids screen edges for complete display
- 💾 **Workflow Integration**: Navigation configuration saved and migrated with workflow
- 🔄 **Auto-Center**: Automatically centers on target group when jumping
- 📍 **Position Memory**: Floating ball position saved locally

#### Keyboard Shortcut System
- **Number Keys 1-9**: Priority assignment to first 9 groups
- **Letter Keys A-Z**: Automatically assigned when number keys are exhausted
- **Conflict Detection**: Automatically detects and alerts shortcut conflicts
- **Live Recording**: Click button to record new keyboard shortcuts
- **Global Response**: Shortcuts work from anywhere on the canvas

#### Usage
1. Floating ball automatically appears on the right side center of screen
2. Click floating ball to expand navigation panel
3. Click "Add Group" to select groups for navigation
4. Click shortcut button to record custom keyboard shortcut
5. Use shortcuts or click navigation buttons for quick jumping

#### Smart Positioning Features
- **Horizontal Adaptive**: Panel shows on left when ball is on right, and vice versa
- **Vertical Adaptive**: Panel automatically expands upward when ball is at bottom
- **Boundary Protection**: Ensures panel is always fully displayed without being cut off by screen edges
- **Drag-Friendly**: Dragging floating ball doesn't accidentally trigger panel expansion

#### Use Cases
- **Large Workflows**: Quickly jump between different areas of complex workflows
- **Debug & Optimize**: Efficiently locate groups that need debugging
- **Presentation**: Quickly demonstrate different functional modules of workflow
- **Batch Operations**: Work with other managers to quickly switch work areas

#### Toast Notifications
Quick Group Navigation uses the global Toast notification system, providing:
- ✅ **Success Notifications**: Group added, shortcut set successfully
- ⚠️ **Warning Notifications**: Group not found, shortcut conflicts
- ℹ️ **Info Notifications**: All groups added and other status information

---

### 🔍 Has Next Executor Group

**Intelligent Workflow Conditional Execution Node**

Has Next Executor Group node integrates deeply with Group Executor Manager to detect whether there are pending groups to execute after the current group, enabling smart workflow conditional branching and optimized execution flow.

#### Core Features
- 🔍 **Smart Detection**: Automatically detect if there are pending groups to execute
- 🚫 **Exclude Group Configuration**: Visual configuration interface to flexibly manage groups to exclude from detection
- 🔒 **Lock Mode**: Double-click lock feature to prevent accidental operations
- 🔄 **Group Rename Tracking**: Automatically detect and update renamed group names
- 💾 **Workflow Integration**: Configuration saved with workflow, supports cross-environment migration
- 🎯 **Precise Control**: Automatically filter disabled groups and invalid group names
- 📊 **Detailed Output**: Provides both next group list and boolean judgment outputs

#### Output Types
- **next_groups** (STRING): All pending group names to execute, one per line
- **has_next** (BOOLEAN): Whether there is a next group to execute

#### Use Cases
- **Conditional Branching**: Decide execution path based on whether there are subsequent groups
  ```
  Example: Only execute final save on the last group
  Next Group Detection → Switch Node → Save Image / Skip Save
  ```

- **Flow Optimization**: Avoid unnecessary processing steps
  ```
  Example: Only keep intermediate results when there are subsequent groups
  Next Group Detection → Conditional Cache → Clean Temp Files
  ```

- **Resource Management**: Intelligently control resource usage
  ```
  Example: Release GPU memory on the last group
  Next Group Detection → Memory Management → Unload Models
  ```

- **Batch Processing**: Distinguish between intermediate and final steps in batch workflows
  ```
  Example: Only output notification at the end of batch generation
  Next Group Detection → Notification Node → "All Complete!"
  ```

#### Usage
1. Add `Danbooru > Has Next Executor Group` node
2. Double-click node to open configuration interface
3. Click "Add Exclude Group" button, select group from dropdown
4. Optional: Double-click lock button 🔒 to prevent accidental changes
5. Connect `has_next` output to Switch or other conditional nodes
6. Save workflow, configuration will automatically save with workflow

#### Configuration

**Exclude Group List**:
- Searchable dropdown for group name selection
- Support multiple exclude group configurations
- Click delete button ❌ to remove exclude group
- Click refresh button 🔄 to update group list

**Lock Mode**:
- Double-click lock button to toggle lock status
- Cannot add/delete/modify configuration when locked
- Suitable for preventing accidental changes in production environment

**Group Name Validation**:
- Automatically validate group names exist when loading workflow
- Automatically clean non-existent groups (e.g., after workflow migration)
- Output detailed cleaning information to console

#### Smart Features

**Automatic Group Rename Tracking**:
```
1. Configure exclude group: "Test Group A"
2. Rename group in ComfyUI to: "Production Group A"
3. Node automatically detects and updates config to: "Production Group A"
4. Updated configuration saved when workflow is saved
```

**Cross-Environment Migration**:
```
1. Configure exclude group in Project A: "Project A Specific Group"
2. Copy workflow to Project B
3. Automatically clean non-existent groups on load
4. Console prompt: ⚠️ Group "Project A Specific Group" not found, auto-cleaned
```

**Status Detection Mechanism**:
- ✅ Automatically detect if all nodes in group are disabled
- ✅ Support depth-first traversal (including subgraph nodes)
- ✅ Real-time sync disabled status to backend
- ✅ Proactively detect latest status before execution

#### Configuration Persistence

**Workflow Serialization**:
- Configuration saved via `onSerialize`/`onConfigure` mechanism
- Saved and loaded with workflow JSON file
- Not dependent on local config files, supports free workflow migration
- Each workflow has independent configuration without interference

#### Integration with Group Executor Manager

**Perfect Cooperation**:
```
Group Executor Manager Configuration:
├── Group 1: Preprocessing
├── Group 2: Main Generation
├── Group 3: Post-processing (Excluded)
└── Group 4: Save

Next Group Detection node automatically:
- Skip "Group 3: Post-processing" (in exclude list)
- Skip groups where all nodes are disabled
- Return actually executing subsequent groups
```

#### Usage Examples

**Example 1: Conditional Save**
```
[Group 1: Generate] → Image
           ↓
[Group 2: Post-process] → Image → Has Next Executor Group
                              ↓
                         has_next → Switch
                              ↓           ↓
                           True(Skip)  False(Save)
```

**Example 2: Resource Optimization**
```
Has Next Executor Group → has_next
                    ↓
                  False → Unload Models → Clean Cache → Send Notification
```

**Example 3: Batch Task Notification**
```
[for each item]
    ↓
Execute Task → Has Next Executor Group
                ↓
            has_next == False → Simple Notify("All tasks complete!")
```

#### Technical Details
- Detection based on Group Executor Manager's global configuration
- Use WeakMap to track group object references, supports rename detection
- Auto check group list and rename changes every 2 seconds
- Configuration saved via ComfyUI native serialization mechanism
- Automatically filter empty group names and invalid references

#### Notes
- ⚠️ Node only checks group configuration, not whether nodes in group are muted/bypassed
- ⚠️ Needs to work with Group Executor Manager to function properly
- ⚠️ Lock mode requires double-click on lock button to toggle
- ⚠️ Old workflows will have empty exclude group config on load, needs reconfiguration

---

### 🖼️ Image Cache Nodes

**Smart Image Caching and Retrieval Node Group**

Image Cache nodes provide powerful image caching and retrieval functionality, working with Group Executor Manager for efficient batch workflows.

#### Node Types

**1. Image Cache Save**
- 💾 **Auto Caching**: Automatically save images to cache system
- 🏷️ **Prefix Management**: Support custom cache prefix classification
- 📊 **Cache Statistics**: Real-time display of cache count and status
- 🔄 **Auto Update**: Automatically notify related nodes when cache updates

**2. Image Cache Get**
- 🔍 **Smart Retrieval**: Get cached images by prefix and index
- 🔄 **Fallback Modes**: Multiple cache miss handling modes
  - `blank`: Return blank image
  - `default`: Return default placeholder image
  - `error`: Throw error and stop execution
  - `passthrough`: Skip cache check
- 📋 **Batch Retrieval**: Support batch retrieval of multiple cached images
- ⏱️ **Auto Retry**: Automatically retry when cache not ready
- 👁️ **Preview Feature**: Optional cached image preview

#### Core Features
- 🚀 **High Performance**: Fast memory-based caching system
- 🔐 **Permission Control**: Work with Group Executor Manager's permission system
- 🎯 **Precise Positioning**: Support prefix + index for precise retrieval
- 📊 **Real-time Notification**: WebSocket real-time cache update notifications
- 💡 **Smart Cleanup**: Automatically clean expired cache

#### Usage

**Basic Flow**:
1. Add `Image Cache Save` node in the first group
2. Connect image output to be cached
3. Set cache prefix (e.g., "base_image")
4. Add `Image Cache Get` node in subsequent groups
5. Use the same prefix and index to retrieve cached images

**Group Execution Example**:
```
Group1: Text2Image → Cache Save(prefix="txt2img")
Group2: Cache Get(prefix="txt2img") → Image2Image → Cache Save(prefix="img2img")
Group3: Cache Get(prefix="img2img") → PostProcess → Output
```

#### Application Scenarios
- **Multi-stage Generation**: Text2Image → Image2Image → Upscale → PostProcess
- **Batch Processing**: Batch processing of large numbers of images
- **Experiment Comparison**: Save intermediate results for different parameter comparisons
- **Memory Optimization**: Avoid loading all intermediate results simultaneously

---

### 📝 Text Cache Nodes

**Smart Text Caching and Retrieval Node Group**

Text Cache nodes provide powerful text data caching and retrieval functionality with multi-channel management, allowing text to be passed and shared across different parts of the workflow.

#### Node Types

**1. Global Text Cache Save**
- 💾 **Auto Caching**: Automatically save text to specified channels
- 🏷️ **Channel Management**: Support custom channel name classification
- 👁️ **Node Monitoring**: Monitor other node widget changes and auto-update cache
- 📊 **Real-time Preview**: Display cached text content and length
- 🔄 **Auto Notification**: Automatically notify retrieval nodes when cache updates

**2. Global Text Cache Get**
- 🔍 **Smart Retrieval**: Get cached text by channel name
- 🔄 **Dynamic Channels**: Dropdown menu automatically displays all defined channels
- 📋 **Persistence**: Automatically save channel configuration when saving workflow
- 👁️ **Preview Feature**: Display retrieved text content and source
- ⏱️ **Auto Update**: Monitor cache changes and auto-refresh

**3. Text Cache Viewer**
- 📊 **Real-time Monitoring**: Display status and content of all text cache channels in real-time
- 🔍 **Complete Preview**: View detailed information for each channel (name, length, update time, content)
- 📝 **Content Viewing**: Support scrolling to view complete text content (max 3 lines display, scrollbar for overflow)
- ⏰ **Time Tracking**: Display relative update times (just now/minutes ago/hours ago/days ago)
- 🔄 **Auto Refresh**: WebSocket real-time updates, automatically refresh when cache changes
- 🎨 **Beautiful Interface**: Purple-themed UI with emoji icons and clean card-style layout
- 🖱️ **Manual Refresh**: Provides refresh button for manual content updates

#### Core Features
- 🚀 **High Performance**: Fast memory-based caching system
- 🔐 **Thread-Safe**: Uses recursive locks to ensure multi-thread safety
- 🎯 **Precise Positioning**: Accurately retrieve text by channel name
- 📊 **Real-time Notification**: WebSocket real-time cache update notifications
- 💡 **Smart Validation**: Automatically validate channel validity

#### Usage

**Basic Flow**:
1. Add `Global Text Cache Save` node in workflow
2. Connect text output to be cached
3. Set channel name (e.g., "my_prompt")
4. Add `Global Text Cache Get` node in another location
5. Select the same channel name to retrieve text

**Monitor Other Nodes**:
1. Configure `monitor_node_id` in save node (ID of node to monitor)
2. Configure `monitor_widget_name` (widget name to monitor)
3. Cache automatically updates when monitored widget value changes

**Usage Example**:
```
Node A (Text Generator)
  ↓ positive output
Save Node (channel="positive_prompt")

Node B (Other Location)
  ← Get Node (channel="positive_prompt")
```

#### Application Scenarios
- **Prompt Reuse**: Use the same prompt in multiple places
- **Dynamic Monitoring**: Monitor text input node changes and auto-update
- **Workflow Communication**: Pass text information between different parts of workflow
- **Parameter Sharing**: Share configuration parameters to multiple nodes
- **Debug Assistant**: Temporarily save and view intermediate text results

---

### 📐 Resolution Master Simplify

**Visual Resolution Control Node**

A simplified version based on Resolution Master, providing intuitive 2D canvas interactive resolution control focused on core functionality.

#### Core Features
- 🎨 **2D Interactive Canvas**: Visual drag-and-drop resolution adjustment
- 🎯 **Three Control Points System**:
  - White main control point - Controls both width and height
  - Blue width control - Adjusts width independently
  - Pink height control - Adjusts height independently
- 🧲 **Canvas Snapping**: Default snap to grid, hold Ctrl for fine adjustment
- 📋 **SDXL Presets**: 9 built-in SDXL resolution presets (sorted by size)
- 💾 **Custom Presets**: Save and manage custom resolution presets
- 📊 **Real-time Display**: Output pins show current resolution (color-coded for width/height)
- 📐 **Resolution Range**: 64×64 to 2048×2048

#### Key Features
- ✨ **Exact Original Styling**: Maintains consistent visual style with Resolution Master
- 🎯 **Simplified Design**: Removes complex features like Actions, Scaling, Auto-Detect
- 🚀 **Lightweight & Efficient**: Focuses on core resolution control with clean interface
- 🎨 **Visual Feedback**: Blue/pink output numbers match control point colors

#### Usage
1. Add `Danbooru > Resolution Master Simplify` node
2. Drag control points on 2D canvas to adjust resolution:
   - Drag white main control: Adjust both width and height
   - Drag blue control: Adjust width only
   - Drag pink control: Adjust height only
3. Click preset dropdown to select common resolutions
4. Click 💾 button to save current resolution as custom preset
5. Connect `width` and `height` outputs to other nodes

#### Built-in Preset List
- 768×1024 (0.79 MP)
- 640×1536 (0.98 MP)
- 832×1216 (1.01 MP)
- 896×1152 (1.03 MP)
- 768×1344 (1.03 MP)
- 915×1144 (1.05 MP)
- 1254×836 (1.05 MP)
- 1024×1024 (1.05 MP)
- 1024×1536 (1.57 MP)

---

### 📦 Simple Checkpoint Loader

**Checkpoint Loader with Custom VAE Support**

Based on ComfyUI_Mira's Checkpoint Loader with Name node, enhanced with VAE selection functionality from ComfyUI-Easy-Use's simple loader, allowing users to choose between built-in VAE or custom VAE files.

#### Core Features
- 📦 **Checkpoint Loading**: Load diffusion model checkpoints
- 🎨 **VAE Selection**: Support for built-in VAE or custom VAE files
- 📝 **Model Name Output**: Returns model name for downstream nodes
- 🔄 **Complete Outputs**: Returns MODEL, CLIP, VAE, and model name

#### Usage
1. Add `danbooru > Simple Checkpoint Loader` node
2. Select checkpoint model from dropdown list
3. Choose VAE option:
   - **Baked VAE**: Use checkpoint's built-in VAE (default)
   - **Custom VAE**: Select from available VAE files
4. Connect outputs to other nodes:
   - `MODEL`: Model for sampling
   - `CLIP`: CLIP model for text encoding
   - `VAE`: VAE model for encoding/decoding
   - `model_name`: Model name string

#### Use Cases
- **Quick Loading**: Simplified checkpoint loading workflow
- **VAE Experimentation**: Quickly test different VAEs' effects on generation
- **Workflow Optimization**: Unified loading interface for workflow management
- **Model Comparison**: Track used models with model name output

#### Code Sources
This node is based on code from:
- [ComfyUI_Mira](https://github.com/mirabarukaso/ComfyUI_Mira) - Checkpoint Loader with Name node
- [ComfyUI-Easy-Use](https://github.com/yolain/ComfyUI-Easy-Use) - VAE selection functionality from simple loader

---

### 🔔 Simple Notify

**System Notification and Sound Effect Combined Node**

Simple Notify node combines system notification and sound effect playback functions, providing instant visual and audio feedback when workflows complete.

#### Core Features
- 🔔 **System Notification**: Display system notification when workflow completes
- 🔊 **Sound Playback**: Play notification sound to remind task completion
- 🎛️ **Independent Control**: Separately toggle notification and sound on/off
- 📝 **Custom Message**: Support custom notification message content
- 🔊 **Volume Control**: Adjustable sound effect volume
- 🔗 **Workflow Chaining**: Preserves input/output pins for workflow chaining

#### Usage
1. Add `danbooru > Simple Notify` node
2. Connect upstream node's output to `any` input pin
3. Configure parameters:
   - `message`: Notification message content (default: "Task completed")
   - `volume`: Sound effect volume 0-1 (default: 0.5)
   - `enable_notification`: Enable system notification (default: True)
   - `enable_sound`: Enable sound effect (default: True)
4. Node passes through input data to output pin, can continue connecting subsequent nodes

#### Application Scenarios
- **Long-task Reminders**: Get notified when long-running workflows complete
- **Batch Generation Monitoring**: Timely understand completion status during batch image generation
- **Multi-task Management**: Distinguish completion status when running multiple workflows simultaneously
- **Unattended Operation**: Know task completion even when away from computer

#### Usage Example
```
Text2Image → Image2Image → Upscale → Simple Notify(message="Image generation complete!", volume=0.7) → Save Image
```

#### Code Sources
This node's functionality is based on:
- [ComfyUI-Custom-Scripts](https://github.com/pythongosssss/ComfyUI-Custom-Scripts) - SystemNotification and PlaySound nodes

---

### ✂️ Simple String Split

**Lightweight String Splitting Tool Node**

Simple String Split node provides basic string splitting functionality, dividing input strings into string arrays by specified delimiter, automatically removing leading and trailing whitespace.

#### Core Features
- ✂️ **Clean Splitting**: Split strings into arrays by delimiter
- 🧹 **Auto Cleanup**: Automatically remove leading and trailing whitespace from each element
- 🎯 **Precise Output**: Return only actual content without padding empty elements
- 🔧 **Flexible Choice**: Support two common delimiters: comma and pipe
- 📋 **List Output**: Directly output string arrays for easy subsequent processing

#### Usage
1. Add `danbooru > Simple String Split` node
2. Enter the string to split in the `string` parameter
3. Select `split` delimiter type:
   - `,` (comma) - Default option
   - `|` (pipe)
4. Node outputs string array, can connect to nodes supporting list input

#### Input Parameters
- **string** (STRING): String to split
- **split** (optional): Delimiter type, supports `,` and `|`

#### Output Parameters
- **STRING** (list): String array after splitting

#### Usage Examples

**Example 1: Split Tag List**
```
Input: "face, eyes, hand"
Delimiter: ,
Output: ["face", "eyes", "hand"]
```

**Example 2: Pipe Delimiter**
```
Input: "option1 | option2 | option3"
Delimiter: |
Output: ["option1", "option2", "option3"]
```

**Example 3: Auto Whitespace Cleanup**
```
Input: "  tag1  ,  tag2  ,  tag3  "
Delimiter: ,
Output: ["tag1", "tag2", "tag3"]
```

#### Application Scenarios
- **Tag Processing**: Split comma-separated tag lists
- **Configuration Parsing**: Parse configuration strings into arrays
- **Data Preprocessing**: Convert string data to list format
- **Batch Operations**: Prepare parameter lists for batch processing

#### Code Sources
This node is simplified from:
- [cg-image-filter](https://github.com/chrisgoringe/cg-image-filter) - Split String by Commas node

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
├── prompt_cleaning_maid/           # Prompt Cleaning Maid
│   ├── __init__.py
│   └── prompt_cleaning_maid.py
├── parameter_control_panel/        # Parameter Control Panel
│   ├── __init__.py
│   └── parameter_control_panel.py
├── parameter_break/                # Parameter Break
│   ├── __init__.py
│   └── parameter_break.py
├── workflow_description/           # Workflow Description
│   ├── __init__.py
│   ├── workflow_description.py
│   └── settings.json               # Version record settings file
├── simple_image_compare/           # Simple Image Compare
│   ├── __init__.py
│   └── simple_image_compare.py
├── simple_load_image/              # Simple Load Image
│   ├── __init__.py
│   └── simple_load_image.py
├── save_image_plus/                # Save Image Plus
│   ├── __init__.py
│   └── save_image_plus.py
├── metadata_collector/             # Metadata Collector Module
│   ├── __init__.py
│   ├── metadata_hook.py            # Hook Installation (Chain Support)
│   ├── metadata_registry.py       # Metadata Registry
│   ├── metadata_processor.py      # Metadata Processor
│   ├── node_extractors.py         # Node Extractors
│   └── constants.py                # Constant Definitions
├── group_executor_manager/         # Group Executor Manager
│   ├── __init__.py
│   └── group_executor_manager.py
├── group_executor_trigger/         # Group Executor Trigger
│   └── group_executor_trigger.py
├── group_mute_manager/             # Group Mute Manager
│   ├── __init__.py
│   └── group_mute_manager.py
├── quick_group_navigation/         # Quick Group Navigation
│   └── __init__.py
├── has_next_executor_group/        # Has Next Executor Group node
│   ├── __init__.py
│   └── has_next_executor_group.py
├── image_cache_save/               # Image Cache Save node
│   ├── __init__.py
│   └── image_cache_save.py
├── image_cache_get/                # Image Cache Get node
│   ├── __init__.py
│   └── image_cache_get.py
├── image_cache_manager/            # Image Cache Manager
│   ├── __init__.py
│   └── image_cache_manager.py
├── global_text_cache_save/         # Global Text Cache Save node
│   ├── __init__.py
│   └── global_text_cache_save.py
├── global_text_cache_get/          # Global Text Cache Get node
│   ├── __init__.py
│   └── global_text_cache_get.py
├── text_cache_manager/             # Text Cache Manager
│   ├── __init__.py
│   └── text_cache_manager.py
├── text_cache_viewer/              # Text Cache Viewer node
│   ├── __init__.py
│   └── text_cache_viewer.py
├── resolution_master_simplify/     # Resolution Master Simplify
│   ├── __init__.py
│   ├── resolution_master_simplify.py
│   └── settings.json
├── simple_checkpoint_loader_with_name/  # Simple Checkpoint Loader
│   ├── __init__.py
│   └── simple_checkpoint_loader_with_name.py
├── simple_notify/                  # Simple Notify
│   ├── __init__.py
│   ├── simple_notify.py
│   └── notify.mp3
├── simple_string_split/            # Simple String Split
│   ├── __init__.py
│   └── simple_string_split.py
├── open_in_krita/                  # Open In Krita (Krita Integration)
│   ├── __init__.py
│   ├── open_in_krita.py            # Main node logic
│   ├── krita_manager.py            # Krita path manager
│   └── plugin_installer.py         # Krita plugin auto-installer
├── krita_files/                    # Krita plugin source files
│   ├── open_in_krita.desktop       # Krita plugin config file
│   └── open_in_krita/              # Krita plugin Python code
│       ├── __init__.py
│       ├── extension.py            # Krita extension main logic
│       ├── communication.py        # ComfyUI communication module
│       └── logger.py               # Logger
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
│   ├── native-execution/           # Group Execution System frontend
│   │   ├── __init__.js
│   │   ├── cache-control-events.js
│   │   └── optimized-execution-engine.js
│   ├── group_executor_manager/     # Group Executor Manager frontend
│   │   └── group_executor_manager.js
│   ├── group_mute_manager/         # Group Mute Manager frontend
│   │   └── group_mute_manager.js
│   ├── quick_group_navigation/     # Quick Group Navigation frontend
│   │   ├── quick_group_navigation.js
│   │   ├── floating_navigator.js
│   │   ├── styles.css
│   │   └── README.md
│   ├── resolution_master_simplify/ # Resolution Master Simplify frontend
│   │   └── resolution_master_simplify.js
│   ├── parameter_control_panel/    # Parameter Control Panel frontend
│   │   └── parameter_control_panel.js
│   ├── parameter_break/            # Parameter Break frontend
│   │   └── parameter_break.js
│   ├── workflow_description/       # Workflow Description frontend
│   │   └── workflow_description.js
│   ├── simple_image_compare/       # Simple Image Compare frontend
│   │   └── simple_image_compare.js
│   ├── global_text_cache_save/     # Global Text Cache Save node frontend
│   │   └── global_text_cache_save.js
│   ├── global_text_cache_get/      # Global Text Cache Get node frontend
│   │   └── global_text_cache_get.js
│   ├── text_cache_viewer/          # Text Cache Viewer frontend
│   │   └── text_cache_viewer.js
│   ├── simple_checkpoint_loader_with_name/  # Simple Checkpoint Loader frontend (reserved)
│   ├── simple_notify/              # Simple Notify frontend
│   │   └── simple_notify.js
│   ├── open_in_krita/              # Open In Krita frontend
│   │   ├── open_in_krita.js
│   │   └── setup_dialog.js
│   └── global/                     # Global shared components
│       ├── autocomplete_cache.js
│       ├── autocomplete_ui.js
│       ├── color_manager.js
│       ├── multi_language.js
│       ├── toast_manager.js
│       └── translations/
│           ├── resolution_simplify_translations.js
│           └── ...
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

GPL-3.0-or-later License

---

## 致谢 | Acknowledgments

- 感谢 Danbooru 提供优秀的 API | Thanks to Danbooru for the excellent API
- 感谢 ComfyUI 社区 | Thanks to the ComfyUI community
- 参考了 ComfyUI_Civitai_Gallery 项目 | Inspired by ComfyUI_Civitai_Gallery project

### 核心功能参考 | Core Feature References

- [ComfyUI-CRZnodes](https://github.com/CoreyCorza/ComfyUI-CRZnodes) - 参数展开节点的自动选项同步功能设计参考 | Design reference for auto option synchronization in Parameter Break node
- [Comfyui-LG_GroupExecutor](https://github.com/LAOGOU-666/Comfyui-LG_GroupExecutor) - 组执行管理器和图像缓存节点的设计思路来源 | Design inspiration for Group Executor Manager and Image Cache nodes
- [rgthree-comfy](https://github.com/rgthree/rgthree-comfy) - 组静音管理器和简易图像对比节点的核心代码参考 | Core code reference for Group Mute Manager and Simple Image Compare node
- [Comfyui-Resolution-Master](https://github.com/Azornes/Comfyui-Resolution-Master) - 分辨率大师简化版的原版参考 | Original reference for Resolution Master Simplify
- [comfyui-adaptiveprompts](https://github.com/Alectriciti/comfyui-adaptiveprompts) - 提示词清洁女仆节点的代码来源 | Source code for Prompt Cleaning Maid node
- [ComfyUI_Mira](https://github.com/mirabarukaso/ComfyUI_Mira) - 简易Checkpoint加载器的基础代码来源 | Base code source for Simple Checkpoint Loader
- [ComfyUI-Easy-Use](https://github.com/yolain/ComfyUI-Easy-Use) - 简易Checkpoint加载器的VAE选择功能参考 | VAE selection functionality reference for Simple Checkpoint Loader
- [ComfyUI-KJNodes](https://github.com/kijai/ComfyUI-KJNodes) - 文本缓存节点的动态combo实现参考 | Dynamic combo implementation reference for Text Cache nodes
- [ComfyUI-Lora-Manager](https://github.com/willmiao/ComfyUI-Lora-Manager) - Save Image Plus 的哈希计算方法参考，元数据收集思路来源 | Hash calculation method reference for Save Image Plus, metadata collection inspiration
- [ComfyUI-Custom-Scripts](https://github.com/pythongosssss/ComfyUI-Custom-Scripts) - 简易通知节点的功能参考 | Functionality reference for Simple Notify node
- [cg-image-filter](https://github.com/chrisgoringe/cg-image-filter) - 简易字符串分隔节点的基础代码来源 | Base code source for Simple String Split node
- [cg-krita](https://github.com/chrisgoringe/cg-krita) - Open In Krita节点的设计思路来源 | Design inspiration for Open In Krita node
- [comfyui-tooling-nodes](https://github.com/Acly/comfyui-tooling-nodes) - Open In Krita节点的Krita集成思路参考 | Krita integration reference for Open In Krita node
- [krita-ai-diffusion](https://github.com/Acly/krita-ai-diffusion) - Open In Krita节点的Krita插件通信机制参考 | Krita plugin communication mechanism reference for Open In Krita node

### 翻译文件来源 | Translation Data Sources

- [danbooru-diffusion-prompt-builder](https://github.com/wfjsw/danbooru-diffusion-prompt-builder) - Danbooru 标签翻译数据
- [zh_CN-Tags](https://github.com/Yellow-Rush/zh_CN-Tags) - 中文标签数据
- [ComfyUI_Mira](https://github.com/mirabarukaso/ComfyUI_Mira) - 角色翻译数据