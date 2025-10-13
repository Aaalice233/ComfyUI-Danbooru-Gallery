# JS文件结构说明

## 概述

项目的所有JavaScript文件已集中到根目录的 `js/` 文件夹下，采用简洁的分层结构，便于维护和引用。

## 目录结构

```
js/
├── global/                              # 全局模块（各节点共享）
│   ├── autocomplete_cache.js           # 智能补全缓存
│   ├── autocomplete_ui.js              # 智能补全UI组件
│   ├── multi_language.js               # 多语言管理器
│   ├── toast_manager.js                # 消息提示管理器
│   └── translations/                   # 翻译文件
│       ├── char_swap_translations.js
│       ├── danbooru_translations.js
│       ├── mce_translations.js
│       └── prompt_selector_translations.js
│
├── character_feature_swap/             # 角色特征交换模块
│   └── character_feature_swap.js
│
├── danbooru_gallery/                   # Danbooru图库模块
│   └── danbooru_gallery.js
│
├── multi_character_editor/             # 多角色编辑器模块
│   ├── multi_character_editor.js       # 主入口
│   ├── character_editor.js             # 角色编辑器
│   ├── mask_editor.js                  # 蒙版编辑器
│   ├── output_area.js                  # 输出区域
│   ├── preset_manager.js               # 预设管理器
│   └── settings_menu.js                # 设置菜单
│
└── prompt_selector/                    # 提示词选择器模块
    └── prompt_selector.js
```

## 导入路径规范

### 1. 功能模块引用全局模块

各功能模块中引用全局模块使用相对路径 `../global/`：

```javascript
// 在 js/character_feature_swap/character_feature_swap.js 中
import { toastManagerProxy } from "../global/toast_manager.js";
import { globalMultiLanguageManager } from "../global/multi_language.js";

// 在 js/multi_character_editor/multi_character_editor.js 中
import { globalAutocompleteCache } from "../global/autocomplete_cache.js";
import { AutocompleteUI } from "../global/autocomplete_ui.js";
```

### 2. 全局模块内部引用

全局模块内部使用相对路径 `./`：

```javascript
// 在 js/global/multi_language.js 中
import { globalToastManager } from './toast_manager.js';
import { mceTranslations } from './translations/mce_translations.js';
```

### 3. 引用ComfyUI核心模块

使用绝对路径 `/scripts/`：

```javascript
import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";
```

### 4. 同一功能模块内部引用

使用相对路径 `./`：

```javascript
// 在 js/multi_character_editor/multi_character_editor.js 中
import './character_editor.js';
import './mask_editor.js';
import { PresetManager } from './preset_manager.js';
```

## 优势

1. **清晰的分层结构**：全局模块和功能模块明确分离
2. **简洁的路径**：避免了复杂的相对路径嵌套（如 `../../`）
3. **易于维护**：所有JS文件集中管理，不再分散在各模块目录中
4. **便于扩展**：新增模块只需在 `js/` 下创建新的子文件夹

## 重组历史

- **旧结构**：JS文件分散在各模块子目录中，使用重定向文件和嵌套的 `js/js/` 结构
- **新结构**：所有JS文件集中到根目录 `js/` 下，采用扁平化的子文件夹分类
- **重组日期**：2025年10月13日

