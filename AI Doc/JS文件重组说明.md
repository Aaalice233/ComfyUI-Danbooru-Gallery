# JS文件重组完成说明

## 📋 重组概述

已成功完成JS文件的重组，将各节点的JS文件移动到对应的节点文件夹中，通用模块统一管理，并将多语言系统升级为全局系统。

## 📁 最终文件结构

### 通用JS模块（`js/`目录）

```
js/
├── autocomplete_cache.js       # 智能补全缓存（全局共享）
├── autocomplete_ui.js          # 智能补全UI组件（全局共享）
├── toast_manager.js            # 消息提示管理器（全局共享）
├── multi_language.js           # 全局多语言系统（新升级）
└── translations/               # 翻译文件目录
    ├── mce_translations.js     # 多角色编辑器翻译
    └── README.md               # 多语言使用文档
```

### 各节点专属JS文件

#### 1. 多角色编辑器 (`multi_character_editor/js/`)

```
multi_character_editor/js/
├── multi_character_editor.js   # 主文件
├── character_editor.js         # 角色编辑器组件
├── mask_editor.js              # 蒙版编辑器组件
├── output_area.js              # 输出区域组件
├── settings_menu.js            # 设置菜单组件
└── preset_manager.js           # 预设管理器
```

#### 2. Danbooru图库 (`danbooru_gallery/js/`)

```
danbooru_gallery/js/
└── danbooru_gallery.js         # Danbooru图库节点
```

#### 3. 角色特征交换 (`character_feature_swap/js/`)

```
character_feature_swap/js/
└── character_feature_swap.js   # 角色特征交换节点
```

#### 4. 提示词选择器 (`prompt_selector/js/`)

```
prompt_selector/js/
└── prompt_selector.js          # 提示词选择器节点
```

## ✨ 重要改进

### 1. 全局多语言系统

原来的 `multi_language.js` 只服务于多角色编辑器，现在已升级为**全局多语言系统**，支持：

- ✅ 命名空间隔离（每个节点独立命名空间）
- ✅ 动态翻译注册
- ✅ 统一的语言切换
- ✅ localStorage持久化
- ✅ 完整的事件系统

**使用示例：**

```javascript
// 1. 导入系统
import { globalMultiLanguageManager } from '../../js/multi_language.js';

// 2. 注册翻译（在节点初始化时）
globalMultiLanguageManager.registerTranslations('your_namespace', {
    zh: {
        greeting: "你好",
        welcome: "欢迎"
    },
    en: {
        greeting: "Hello",
        welcome: "Welcome"
    }
});

// 3. 使用翻译
const t = (key) => globalMultiLanguageManager.t(`your_namespace.${key}`);
console.log(t('greeting')); // 输出: "你好" 或 "Hello"

// 4. 切换语言
globalMultiLanguageManager.setLanguage('en');

// 5. 监听语言变化
document.addEventListener('languageChanged', (e) => {
    console.log('语言已切换:', e.detail.language);
    // 更新UI
});
```

### 2. 清理的文件

已删除的无用文件：
- ❌ `js/utils/common.js` - 未使用的工具库
- ❌ `js/utils/` - 空目录

### 3. 导入路径更新

所有JS文件的导入路径已自动更新为正确的相对路径。

**示例：**

```javascript
// multi_character_editor/js/character_editor.js
import { globalAutocompleteCache } from "../../js/autocomplete_cache.js";
import { AutocompleteUI } from "../../js/autocomplete_ui.js";
import { globalToastManager } from "../../js/toast_manager.js";
import { globalMultiLanguageManager } from "../../js/multi_language.js";
```

## 🎯 各节点专属性说明

| 模块 | 位置 | 使用范围 |
|------|------|----------|
| autocomplete_cache.js | js/ | 全局共享 |
| autocomplete_ui.js | js/ | 全局共享 |
| toast_manager.js | js/ | 全局共享 |
| multi_language.js | js/ | 全局共享（支持命名空间） |
| character_editor.js | multi_character_editor/js/ | 仅多角色编辑器 |
| mask_editor.js | multi_character_editor/js/ | 仅多角色编辑器 |
| output_area.js | multi_character_editor/js/ | 仅多角色编辑器 |
| settings_menu.js | multi_character_editor/js/ | 仅多角色编辑器 |
| preset_manager.js | multi_character_editor/js/ | 仅多角色编辑器 |

## 📚 如何为其他节点添加多语言支持

详细文档请查看：`js/translations/README.md`

### 快速步骤：

1. **创建翻译文件** `js/translations/your_node_translations.js`
2. **注册翻译** 在节点JS中调用 `globalMultiLanguageManager.registerTranslations()`
3. **使用翻译** 通过 `t()` 函数获取翻译文本
4. **监听事件** 响应 `languageChanged` 事件更新UI

## 🔄 后续建议

### 为其他节点添加多语言支持

可以为以下节点添加多语言支持：

1. **Danbooru Gallery** (`danbooru` 命名空间)
2. **Prompt Selector** (`prompt_selector` 命名空间)
3. **Character Feature Swap** (`char_swap` 命名空间)

### 示例：为 Danbooru Gallery 添加多语言

1. 创建 `js/translations/danbooru_translations.js`：

```javascript
export const danbooruTranslations = {
    zh: {
        searchPlaceholder: "Tags (最多2个)",
        categories: "类别",
        all: "全部",
        // ...
    },
    en: {
        searchPlaceholder: "Tags (max 2)",
        categories: "Categories",
        all: "All",
        // ...
    }
};
```

2. 在 `danbooru_gallery/js/danbooru_gallery.js` 中注册：

```javascript
import { globalMultiLanguageManager } from "../../js/multi_language.js";
import { danbooruTranslations } from "../../js/translations/danbooru_translations.js";

// 注册翻译
globalMultiLanguageManager.registerTranslations('danbooru', danbooruTranslations);

// 使用
const t = (key) => globalMultiLanguageManager.t(`danbooru.${key}`);
```

## ✅ 验证清单

- [x] 所有JS文件已移动到正确位置
- [x] 所有导入路径已更新
- [x] 无用文件已删除
- [x] 多语言系统已升级为全局系统
- [x] 创建了详细的使用文档
- [x] 文件结构清晰合理

## 📝 注意事项

1. **路径引用**：各节点JS文件引用通用模块时使用 `../../js/xxx.js`
2. **命名空间**：多角色编辑器使用 `mce` 命名空间
3. **向后兼容**：原有代码无需修改，自动适配新的多语言系统
4. **扩展性**：其他节点可以轻松接入全局多语言系统

## 🎉 完成状态

**重组完成！** 文件结构现在更加清晰，通用模块和专属模块分离明确，并且提供了强大的全局多语言支持系统。

