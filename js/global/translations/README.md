# 全局多语言系统使用说明

## 概述

这是一个支持多节点共享的全局多语言系统，每个节点可以注册自己的翻译字典到独立的命名空间。

## 已注册的命名空间

- `mce` - Multi Character Editor（多角色编辑器）

## 如何为新节点添加多语言支持

### 1. 创建翻译文件

在 `js/translations/` 目录下创建节点的翻译文件，例如 `danbooru_translations.js`:

```javascript
/**
 * Danbooru Gallery 翻译字典
 */

export const danbooruTranslations = {
    zh: {
        searchPlaceholder: "搜索标签...",
        categories: "类别",
        all: "全部",
        general: "普通",
        // ... 更多翻译
    },
    en: {
        searchPlaceholder: "Search tags...",
        categories: "Categories",
        all: "All",
        general: "General",
        // ... 更多翻译
    }
};
```

### 2. 在节点JS文件中注册翻译

```javascript
import { globalMultiLanguageManager } from '../../js/multi_language.js';
import { danbooruTranslations } from '../../js/translations/danbooru_translations.js';

// 注册翻译到'danbooru'命名空间
globalMultiLanguageManager.registerTranslations('danbooru', danbooruTranslations);

// 方式1: 使用命名空间前缀
const text1 = globalMultiLanguageManager.t('danbooru.searchPlaceholder');

// 方式2: 创建绑定命名空间的翻译函数（推荐）
const t = (key) => globalMultiLanguageManager.t(`danbooru.${key}`);
const text2 = t('searchPlaceholder');
```

### 3. 监听语言变化事件

```javascript
// 监听全局语言变化事件
document.addEventListener('languageChanged', (e) => {
    const currentLanguage = e.detail.language;
    console.log('语言已切换到:', currentLanguage);
    
    // 更新界面文本
    updateInterfaceTexts();
});
```

### 4. 切换语言

```javascript
// 切换语言
globalMultiLanguageManager.setLanguage('en'); // 或 'zh'

// 获取当前语言
const currentLang = globalMultiLanguageManager.getLanguage();

// 获取可用语言列表
const languages = globalMultiLanguageManager.getAvailableLanguages();
// 返回: [{ code: 'zh', name: '中文' }, { code: 'en', name: 'English' }]
```

## 完整示例

### 示例翻译文件: `js/translations/prompt_selector_translations.js`

```javascript
export const promptSelectorTranslations = {
    zh: {
        title: "提示词选择器",
        addPrompt: "添加提示词",
        deleteSelected: "删除选中",
        import: "导入",
        export: "导出",
        settings: "设置",
    },
    en: {
        title: "Prompt Selector",
        addPrompt: "Add Prompt",
        deleteSelected: "Delete Selected",
        import: "Import",
        export: "Export",
        settings: "Settings",
    }
};
```

### 示例节点代码: `prompt_selector/js/prompt_selector.js`

```javascript
import { app } from "/scripts/app.js";
import { globalMultiLanguageManager } from "../../js/multi_language.js";
import { promptSelectorTranslations } from "../../js/translations/prompt_selector_translations.js";

// 注册翻译
globalMultiLanguageManager.registerTranslations('prompt_selector', promptSelectorTranslations);

app.registerExtension({
    name: "Comfy.PromptSelector",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "PromptSelector") {
            // 创建绑定命名空间的翻译函数
            const t = (key) => globalMultiLanguageManager.t(`prompt_selector.${key}`);
            
            // 使用翻译
            const titleText = t('title');
            const addButtonText = t('addPrompt');
            
            // 监听语言变化
            document.addEventListener('languageChanged', (e) => {
                updateUI();
            });
            
            function updateUI() {
                // 更新界面文本
                const titleElement = document.querySelector('.ps-title');
                if (titleElement) {
                    titleElement.textContent = t('title');
                }
                // ... 更新其他元素
            }
        }
    }
});
```

## API 参考

### `globalMultiLanguageManager.registerTranslations(namespace, translations)`

注册翻译字典到指定命名空间。

- **namespace** (string): 命名空间名称
- **translations** (object): 翻译字典对象 `{ zh: {...}, en: {...} }`

### `globalMultiLanguageManager.t(key)`

获取翻译文本。

- **key** (string): 翻译键，格式为 `namespace.key` 或 `namespace.nested.key`
- **returns** (string): 翻译后的文本

### `globalMultiLanguageManager.setLanguage(language, silent)`

设置当前语言。

- **language** (string): 语言代码（'zh', 'en'等）
- **silent** (boolean): 是否静默切换（不触发事件）

### `globalMultiLanguageManager.getLanguage()`

获取当前语言代码。

- **returns** (string): 当前语言代码

### `globalMultiLanguageManager.getAvailableLanguages()`

获取所有可用语言列表。

- **returns** (array): 语言列表 `[{ code, name }, ...]`

## 注意事项

1. **命名空间命名**: 使用简短、描述性的命名空间名称，如 'mce', 'danbooru', 'prompt_selector'
2. **翻译键**: 使用点号分隔的嵌套键，如 'buttons.save', 'messages.error'
3. **语言持久化**: 语言设置会自动保存到 localStorage
4. **事件监听**: 监听 'languageChanged' 事件以响应语言切换
5. **向后兼容**: 如果某个语言缺少翻译，会自动回退到中文

## 命名空间规范

为了避免冲突，建议使用以下命名空间规范：

- `mce` - Multi Character Editor
- `danbooru` - Danbooru Gallery
- `prompt_selector` - Prompt Selector
- `char_swap` - Character Feature Swap

## 语言代码规范

目前支持的语言代码：

- `zh` - 简体中文
- `en` - English

如需添加更多语言，只需在翻译文件中添加对应的语言代码和翻译即可。

