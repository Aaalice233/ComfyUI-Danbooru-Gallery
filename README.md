# Aaalice的定制节点

**中文** | [English](README_EN.md)

<img width="966" height="830" alt="image" src="https://github.com/user-attachments/assets/e2a5d34e-0001-417e-bf8e-7753521ea0d3" />

---

> [!NOTE]
> **项目说明**
> 本项目是专为 [ShiQi_Workflow](https://github.com/Aaalice233/ShiQi_Workflow) 工作流定制开发的一系列ComfyUI节点。

---

## 目录

- [简介](#简介)
- [主要特性](#主要特性)
- [节点介绍](#节点介绍)
  - [🖼️ D站画廊](#-d站画廊-danbooru-gallery)
  - [🔄 人物特征替换](#-人物特征替换-character-feature-swap)
  - [📚 提示词选择器](#-提示词选择器-prompt-selector)
  - [👥 多人角色提示词编辑器](#-多人角色提示词编辑器-multi-character-editor)
  - [🧹 提示词清洁女仆](#-提示词清洁女仆-prompt-cleaning-maid)
  - [🎛️ 参数控制面板](#-参数控制面板-parameter-control-panel)
  - [📤 参数展开](#-参数展开-parameter-break)
  - [📝 工作流说明](#-工作流说明-workflow-description)
  - [🖼️ 简易图像对比](#-简易图像对比-simple-image-compare)
  - [🖼️ 简易加载图像](#-简易加载图像-simple-load-image)
  - [💾 增强保存图像](#-增强保存图像-save-image-plus)
  - [🎨 Krita 集成](#-krita-集成-open-in-krita)
  - [⚡ 组执行管理器](#-组执行管理器-group-executor-manager)
  - [🔇 组静音管理器](#-组静音管理器-group-mute-manager)
  - [🧭 快速组导航器](#-快速组导航器-quick-group-navigation)
  - [🖼️ 图像缓存节点](#-图像缓存节点-image-cache-nodes)
  - [📝 文本缓存节点](#-文本缓存节点-text-cache-nodes)
  - [📐 分辨率大师简化版](#-分辨率大师简化版-resolution-master-simplify)
  - [📦 简易Checkpoint加载器](#-简易checkpoint加载器-simple-checkpoint-loader)
  - [📦 模型名称提取器](#-模型名称提取器-model-name-extractor)
  - [🔔 简易通知](#-简易通知-simple-notify)
  - [✂️ 简易字符串分隔](#-简易字符串分隔-simple-string-split)
  - [🔀 简易值切换](#-简易值切换-simple-value-switch)
- [安装说明](#安装说明)
- [系统要求](#系统要求)
- [高级功能](#高级功能)
- [项目结构](#项目结构)
- [故障排除](#故障排除)
- [开发](#开发--development)
- [许可证](#许可证--license)
- [致谢](#致谢--acknowledgments)

---

## 简介

一个功能强大的 ComfyUI 插件套装，包含四个核心节点，为 AI 图像生成工作流提供完整的提示词管理和图像资源解决方案。基于 Danbooru API 构建，支持图像搜索、提示词编辑、角色特征替换和多角色区域提示词等高级功能。

## 主要特性

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
   - `filename_prefix`: 文件名前缀（支持占位符）
   - `file_format`: 图像格式（PNG/JPEG/WEBP）
   - `quality`: JPEG/WebP 质量（1-100）
   - `embed_workflow`: 是否嵌入 ComfyUI 工作流数据（仅 PNG）
   - `save_clean_copy`: 是否额外保存无元数据的纯净副本
   - `enable_preview`: 是否在界面显示预览图
4. 可选连接提示词输入（否则自动从工作流提取）：
   - `positive_prompt`: 正面提示词
   - `negative_prompt`: 负面提示词
   - `lora_syntax`: LoRA 语法字符串
   - `checkpoint_name`: 手动传入 checkpoint 模型名称（最高优先级）

#### 文件名占位符

文件名前缀支持以下占位符，可灵活组合使用：

| 占位符 | 描述 | 示例 |
|--------|------|------|
| `%date%` | 当前日期时间（默认格式：yyyyMMddhhmmss） | `20251114143025` |
| `%date:format%` | 自定义日期时间格式 | `%date:yyyyMMdd%` → `20251114` |
| `%seed%` | 生成图像的种子值 | `12345678` |
| `%model%` | 使用的 checkpoint 模型名称 | `realisticVisionV51_v51VAE` |

**日期格式占位符**：
- `yyyy`：四位年份（2025）
- `yy`：两位年份（25）
- `MM`：月份（01-12）
- `dd`：日期（01-31）
- `hh`：小时（00-23）
- `mm`：分钟（00-59）
- `ss`：秒数（00-59）

**使用示例**：
```
示例 1：简单模型名称
输入: %model%
输出: realisticVisionV51_v51VAE_00001_.png

示例 2：日期和模型组合
输入: outputs/%date:yyyyMMdd%/%model%
输出: outputs/20251114/realisticVisionV51_v51VAE_00001_.png

示例 3：完整组合
输入: %model%_%date:yyyyMMdd_hhmm%_s%seed%
输出: realisticVisionV51_v51VAE_20251114_1430_s12345678_00001_.png
```

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

### 🎨 Krita 集成 (Krita Integration)

**从ComfyUI一键在Krita中打开图像并实时获取编辑结果**

Krita集成功能通过**简易图像加载器**节点的右键菜单,实现了ComfyUI与Krita之间的无缝交互。你可以在Krita中自由编辑图像,ComfyUI会自动获取编辑后的结果和选区蒙版。

#### 核心功能
- 🖼️ **右键快速打开**: 在简易图像加载器节点右键选择"在Krita中打开"
- 🔄 **自动数据获取**: 节点自动获取Krita中当前编辑的图像和选区蒙版
- 🎨 **自动启动Krita**: Krita未运行时自动启动并打开图像
- 🔌 **自动插件管理**: 首次使用自动安装插件,后续自动检测版本并更新
- 🎯 **选区蒙版支持**: 支持将Krita选区作为蒙版输出到工作流
- ⚙️ **简单配置**: 首次使用时设置Krita路径即可,之后自动工作

#### 节点说明

本集成功能使用以下两个节点:

**1. 简易图像加载器 (Simple Load Image)**
- 用于加载和选择图像
- 右键菜单提供"在Krita中打开"功能
- 右键菜单提供"设置Krita路径"功能

**2. 从Krita获取 (Fetch From Krita)**  
- 自动从Krita获取当前编辑的图像和蒙版
- 输出IMAGE和MASK供后续节点使用
- Krita未运行时返回输入图像和蒙版

#### 使用方法

**首次配置**:
1. 在工作流中添加 `简易图像加载器 (Simple Load Image)` 节点
2. 右键节点,选择"设置Krita路径"
3. 在文件浏览器中选择Krita可执行文件
4. 插件会自动安装(如需要),无需手动操作

**日常使用**:
1. 在 `简易图像加载器` 节点中选择要编辑的图像
2. 右键节点,选择"在Krita中打开"
3. 图像会自动在Krita中打开(Krita未运行会自动启动)
4. 在Krita中自由编辑图像(绘画、调色、滤镜、选区等)
5. 添加 `从Krita获取 (Fetch From Krita)` 节点到工作流
6. 连接输入图像到该节点
7. 执行工作流时,节点会自动获取Krita中的最新图像和蒙版
8. 将输出连接到后续节点继续处理

#### 工作流程示例
```
简易图像加载器 (右键→在Krita中打开)
  ↓ image
从Krita获取
  ↓ image, mask
后续处理节点 (图生图、放大、保存等)
```

#### 技术特点
- **文件监控机制**: Krita插件实时监控临时目录,自动处理数据请求
- **自动版本管理**: 检测插件版本差异时自动更新,无需手动干预
- **智能启动**: 检测Krita进程状态,未运行时自动启动应用
- **请求-响应模式**: 基于文件通信的请求-响应机制实现数据交互
- **批处理模式**: Krita插件使用批处理模式,避免保存确认弹窗
- **完整日志记录**: 详细的日志帮助问题诊断

#### 系统要求
- **Krita**: 4.0或更高版本
- **Python**: ComfyUI环境(自带)
- **可选依赖**: `psutil`(用于进程管理,提升体验)

#### 常见问题

**Q: 插件需要手动启用吗?**  
A: 不需要!插件安装时已设置自动启用,Krita启动后自动加载。如遇问题,可在Krita中打开"设置→配置Krita→Python插件管理器"检查插件状态。

**Q: 右键打开后Krita没有反应?**  
A: 请检查:
1. Krita路径是否正确设置
2. 查看ComfyUI控制台是否有错误信息
3. 检查日志文件: `%TEMP%\open_in_krita\krita_plugin.log`(Windows)

**Q: 如何更新Krita插件?**  
A: 插件会在使用时自动检测版本并更新,无需手动操作。更新过程中Krita会自动重启。

**Q: 获取数据节点返回的是输入图像而不是编辑后的?**  
A: 请确保:
1. Krita正在运行并有打开的文档
2. 插件已正确加载(查看插件管理器)
3. 执行节点时等待数据获取完成

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

### 📦 模型名称提取器 (Model Name Extractor)

**从模型对象提取底模名称的工具节点**

模型名称提取器用于从工作流中提取当前使用的 checkpoint 模型名称，配合 Save Image Plus 节点使用，将模型信息保存到图像元数据中。

#### 核心功能
- 🔍 **自动提取**: 自动从 metadata_collector 获取底模名称
- 🔗 **直通传递**: MODEL 直接传递，不影响工作流
- 🛡️ **备用名称**: 支持设置无法获取时的备用名称

#### 使用方法
1. 添加 `danbooru > 模型名称提取器 (Model Name Extractor)` 节点
2. 将 Checkpoint 加载器的 MODEL 输出连接到本节点的 model 输入
3. 将 model_name 输出连接到 Save Image Plus 的 checkpoint_name 输入

#### 工作流示例
```
[Checkpoint Loader] --MODEL--> [Model Name Extractor]
        |                              |
        |                         model_name
        v                              |
   [KSampler] -----------------------> v
        |                      [Save Image Plus]
        v                              ^
   [VAE Decode] ------image------------+
```

#### 应用场景
- **元数据记录**: 自动获取底模名称用于图像元数据保存
- **Civitai 兼容**: 确保上传到 Civitai 时正确显示模型信息
- **工作流简化**: 无需手动输入模型名称

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

### 🔀 简易值切换 (Simple Value Switch)

**优先级值选择节点**

简易值切换节点接受任意数量和类型的输入，输出第一个非空值。这是一个通用的值优先级选择工具，可用于默认值回退、条件值选择等场景。

#### 核心功能
- 🔀 **优先级选择**: 遍历所有输入，返回第一个非空值
- 🎯 **任意类型支持**: 支持图像、文本、模型等所有 ComfyUI 类型
- 🔢 **动态输入**: 支持任意数量的输入引脚（渐进式添加）
- 🧠 **智能判空**: 不仅判断 None，还识别空字典、空对象等
- 🔗 **工作流灵活**: 简化条件逻辑，减少分支节点使用

#### 工作原理

节点按顺序检查所有输入值：
1. 从第一个输入开始遍历
2. 检查值是否为空（None、空字典、空 Context 等）
3. 返回第一个非空值
4. 如果所有值都为空，返回 None

#### 使用方法
1. 添加 `danbooru > 简易值切换 (Simple Value Switch)` 节点
2. 连接多个可能的输入值（按优先级从高到低）
3. 第一个输入会自动显示，连接后会自动显示下一个输入
4. 节点输出第一个非空的输入值

#### 输入参数
- **value_1, value_2, ...** (任意类型，可选): 按优先级顺序的候选值
  - 所有输入都是可选的
  - 支持任意 ComfyUI 类型（通配符类型 `*`）
  - 输入数量动态扩展（前端自动管理）

#### 输出参数
- **output** (任意类型): 第一个非空的输入值，如果都为空则为 None

#### 使用示例

**示例 1：默认值回退**
```
用户输入值 (可能为空) → value_1
默认值 "hello"          → value_2
                          ↓
                       输出：优先输出用户输入，空则输出默认值
```

**示例 2：多优先级选择**
```
高优先级参数 (可能不可用) → value_1
中优先级参数 (备用方案)   → value_2
低优先级参数 (兜底方案)   → value_3
                            ↓
                         输出：第一个可用的参数
```

**示例 3：条件图像选择**
```
条件路径A生成的图像 → value_1
条件路径B生成的图像 → value_2
默认占位图像       → value_3
                    ↓
                 输出：第一个成功生成的图像
```

#### 应用场景
- **默认值设置**: 提供默认值回退机制
- **条件选择**: 简化多条件值选择逻辑
- **容错处理**: 当主值不可用时自动使用备用值
- **参数优化**: 灵活切换不同来源的参数
- **工作流简化**: 减少复杂的 Switch 节点链

#### 空值判断规则

节点使用增强的空值判断逻辑：
- `None` → 空
- `{}` (空字典) → 空
- 空 Context 对象 → 空
- 其他所有值 → 非空（包括 `0`, `False`, `""` 等）

**注意**: 空字符串 `""`、数字 `0`、布尔值 `False` 被视为**非空**有效值

#### 技术特点
- **通配符类型**: 使用 AnyType (`*`) 支持所有 ComfyUI 类型
- **渐进式输入**: 前端 JavaScript 动态管理输入引脚
- **性能优化**: 短路求值，找到第一个非空值即返回
- **类型安全**: 保持输入类型，无类型转换

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
├── model_name_extractor/            # 模型名称提取器
│   ├── __init__.py
│   └── model_name_extractor.py
├── simple_notify/                  # 简易通知
│   ├── __init__.py
│   ├── simple_notify.py
│   └── notify.mp3
├── simple_string_split/            # 简易字符串分隔
│   ├── __init__.py
│   └── simple_string_split.py
├── simple_value_switch/            # 简易值切换
│   ├── __init__.py
│   └── simple_value_switch.py
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

