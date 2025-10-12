/**
 * 多人提示词节点多语言系统
 * 提供中英文界面切换和文本翻译功能
 */

import { globalToastManager as toastManagerProxy } from './toast_manager.js';

// 多语言字典
const i18n = {
    zh: {
        // 工具栏
        syntaxMode: "语法模式",
        refreshCanvas: "刷新画布",
        settings: "设置",
        useFill: "使用FILL语法",
        syntaxDocs: "语法文档",

        // 语法模式选项
        attentionCouple: "Attention Couple",
        regionalPrompts: "Regional Prompts",

        // 角色编辑器
        characterEditor: "角色编辑器",
        addCharacter: "添加角色",
        characterName: "角色名称",
        characterPrompt: "角色提示词",
        characterWeight: "权重",
        enabled: "启用",
        delete: "删除",
        moveUp: "上移",
        moveDown: "下移",

        // 蒙版编辑器
        maskEditor: "蒙版编辑器",
        resetMask: "重置蒙版",

        // 输出区域
        outputArea: "输出区域",
        generatedPrompt: "生成的提示词",
        promptPreview: "提示词预览",
        copyPrompt: "复制提示词",

        // 全局提示词
        globalPrompt: "全局提示词",
        globalPromptDescription: "全局提示词会与基础提示词合并，作为FILL填充的内容。基础提示词在前，全局提示词在后。",
        globalPromptPlaceholder: "输入全局提示词，例如：2girls",
        globalPromptSaved: "全局提示词已保存",

        // 设置对话框
        settingsTitle: "设置",
        generalSettings: "常规设置",
        canvasSettings: "画布设置",
        languageSettings: "语言切换",

        // 设置分类
        categories: {
            language: "语言",
            interface: "界面",
            about: "关于"
        },

        // 设置面板
        sections: {
            language: "语言设置",
            interface: "主题设置",
            about: "关于"
        },

        // 设置标签
        labels: {
            interfaceLanguage: "界面语言",
            primaryColor: "主色调",
            backgroundColor: "背景色",
            secondaryColor: "次要颜色"
        },

        // 设置按钮
        buttons: {
            save: "保存",
            reset: "重置",
            close: "关闭"
        },

        // 画布设置
        canvasWidth: "画布宽度",
        canvasHeight: "画布高度",

        // 语言设置
        selectLanguage: "选择语言",
        chinese: "中文",
        english: "English",

        // 消息提示
        settingsSaved: "设置已保存",
        promptCopied: "提示词已复制到剪贴板",
        characterAdded: "角色已添加",
        characterDeleted: "角色已删除",
        canvasRefreshed: "画布已刷新",

        // 错误信息
        error: "错误",
        networkError: "网络错误",
        invalidInput: "输入无效",

        // 智能补全
        autocomplete: "自动补全",
        noSuggestions: "无建议",
        loading: "加载中...",

        // 确认对话框
        deleteConfirm: "确定要删除这个角色吗？",
        deleteCharacterWarning: "此操作将删除角色及其对应的蒙版，且无法撤销。",

        // 词库相关
        promptLibrary: "词库",
        selectFromLibrary: "从词库添加",
        noPromptsInCategory: "此分类下没有提示词",
        noPreview: "暂无预览",

        // 其他
        cancel: "取消",
        confirm: "确认",
        save: "保存",
        color: "颜色",

        // 角色编辑器额外文本
        noCharacters: "还没有角色",
        clickToAddCharacter: "点击\"添加角色\"开始创建",
        enable: "启用",
        disable: "禁用",
        edit: "编辑",
        category: "分类",
        promptList: "提示词列表",

        // 角色编辑器模态框
        editCharacter: "编辑角色",
        characterName: "角色名称",
        characterPrompt: "提示词",
        enabledCharacter: "启用角色",
        characterWeight: "权重",
        color: "颜色",

        // 输出区域
        generatedPrompt: "生成的提示词",
        generate: "生成",
        copy: "复制",
        validate: "验证",
        promptPlaceholder: "提示词将在这里显示...",
        noPromptToCopy: "没有可复制的提示词",
        promptCopied: "提示词已复制到剪贴板",
        copied: "已复制",
        copyFailed: "复制失败，请手动选择复制",
        generating: "生成中...",
        promptGenerated: "提示词生成成功",
        generateFailed: "生成失败",
        promptEmpty: "提示词为空",
        promptValidated: "提示词语法验证通过",
        syntaxCorrect: "语法正确",
        syntaxError: "语法错误",
        validationFailed: "验证请求失败",
        validatePromptFailed: "验证提示词失败",

        // 蒙版编辑器
        featherSettings: "羽化设置",
        opacitySettings: "透明度设置",
        blendMode: "混合模式",
        duplicateMask: "复制蒙版",
        deleteMask: "删除蒙版",
        featherPrompt: "设置羽化值 (0-50像素):",
        opacityPrompt: "设置透明度 (0-100%):",
        currentBlendMode: "当前混合模式",
        blendModePrompt: "点击\"确定\"切换到下一个模式，点击\"取消\"保持当前模式",
        deleteMaskConfirm: "确定要删除这个蒙版吗？",
        zoom: "缩放",
        copy: "副本",

        // 设置菜单
        settingsSaved: "设置已保存",
        saveSettingsFailed: "保存设置失败",
        settingsReset: "设置已重置",
        resetSettingsConfirm: "确定要重置所有设置吗？",

        // 语言切换
        switchedToChinese: "已切换到中文",
        switchedToEnglish: "Switched to English",

        // 按钮文本
        buttonTexts: {
            addCharacter: "添加角色",
            selectFromLibrary: "从词库添加",
            generate: "生成",
            copy: "复制",
            validate: "验证",
            globalPrompt: "全局提示词",
            refreshCanvas: "刷新画布",
            languageSettings: "语言切换",
            settings: "设置",
            syntaxDocs: "查看语法文档",
            save: "保存",
            cancel: "取消",
            confirm: "确认",
            edit: "编辑",
            delete: "删除",
            enable: "启用",
            disable: "禁用",
            copied: "已复制",
            generating: "生成中...",
            zoom: "缩放"
        }
    },
    en: {
        // Toolbar
        syntaxMode: "Syntax Mode",
        refreshCanvas: "Refresh Canvas",
        settings: "Settings",
        useFill: "Use FILL Syntax",
        syntaxDocs: "Syntax Docs",

        // Syntax mode options
        attentionCouple: "Attention Couple",
        regionalPrompts: "Regional Prompts",

        // Character editor
        characterEditor: "Character Editor",
        addCharacter: "Add Character",
        characterName: "Character Name",
        characterPrompt: "Character Prompt",
        characterWeight: "Weight",
        enabled: "Enabled",
        delete: "Delete",
        moveUp: "Move Up",
        moveDown: "Move Down",

        // Mask editor
        maskEditor: "Mask Editor",
        resetMask: "Reset Mask",

        // Output area
        outputArea: "Output Area",
        generatedPrompt: "Generated Prompt",
        promptPreview: "Prompt Preview",
        copyPrompt: "Copy Prompt",

        // Global prompt
        globalPrompt: "Global Prompt",
        globalPromptDescription: "Global prompt will be merged with base prompt as FILL content. Base prompt comes first, then global prompt.",
        globalPromptPlaceholder: "Enter global prompt, e.g.: 2girls",
        globalPromptSaved: "Global prompt saved",

        // Settings dialog
        settingsTitle: "Settings",
        generalSettings: "General Settings",
        canvasSettings: "Canvas Settings",
        languageSettings: "Language Switch",

        // Settings categories
        categories: {
            language: "Language",
            interface: "Interface",
            about: "About"
        },

        // Settings panels
        sections: {
            language: "Language Settings",
            interface: "Theme Settings",
            about: "About"
        },

        // Settings labels
        labels: {
            interfaceLanguage: "Interface Language",
            primaryColor: "Primary Color",
            backgroundColor: "Background Color",
            secondaryColor: "Secondary Color"
        },

        // Settings buttons
        buttons: {
            save: "Save",
            reset: "Reset",
            close: "Close"
        },

        // Canvas settings
        canvasWidth: "Canvas Width",
        canvasHeight: "Canvas Height",

        // Language settings
        selectLanguage: "Select Language",
        chinese: "中文",
        english: "English",

        // Messages
        settingsSaved: "Settings saved",
        promptCopied: "Prompt copied to clipboard",
        characterAdded: "Character added",
        characterDeleted: "Character deleted",
        canvasRefreshed: "Canvas refreshed",

        // Error messages
        error: "Error",
        networkError: "Network error",
        invalidInput: "Invalid input",

        // Autocomplete
        autocomplete: "Autocomplete",
        noSuggestions: "No suggestions",
        loading: "Loading...",

        // Confirmation dialogs
        deleteConfirm: "Are you sure you want to delete this character?",
        deleteCharacterWarning: "This operation will delete the character and its corresponding mask, and cannot be undone.",

        // Prompt library
        promptLibrary: "Prompt Library",
        selectFromLibrary: "Add from Library",
        noPromptsInCategory: "No prompts in this category",
        noPreview: "No preview available",

        // Other
        cancel: "Cancel",
        confirm: "Confirm",
        save: "Save",
        color: "Color",

        // Character editor additional text
        noCharacters: "No characters yet",
        clickToAddCharacter: "Click 'Add Character' to start creating",
        enable: "Enable",
        disable: "Disable",
        edit: "Edit",
        category: "Category",
        promptList: "Prompt List",

        // Character editor modal
        editCharacter: "Edit Character",
        characterName: "Character Name",
        characterPrompt: "Character Prompt",
        enabledCharacter: "Enable Character",
        characterWeight: "Weight",
        color: "Color",

        // Output area
        generatedPrompt: "Generated Prompt",
        generate: "Generate",
        copy: "Copy",
        validate: "Validate",
        promptPlaceholder: "Prompt will be displayed here...",
        noPromptToCopy: "No prompt to copy",
        promptCopied: "Prompt copied to clipboard",
        copied: "Copied",
        copyFailed: "Copy failed, please copy manually",
        generating: "Generating...",
        promptGenerated: "Prompt generated successfully",
        generateFailed: "Generation failed",
        promptEmpty: "Prompt is empty",
        promptValidated: "Prompt syntax validation passed",
        syntaxCorrect: "Syntax correct",
        syntaxError: "Syntax error",
        validationFailed: "Validation request failed",
        validatePromptFailed: "Failed to validate prompt",

        // Mask editor
        featherSettings: "Feather Settings",
        opacitySettings: "Opacity Settings",
        blendMode: "Blend Mode",
        duplicateMask: "Duplicate Mask",
        deleteMask: "Delete Mask",
        featherPrompt: "Set feather value (0-50 pixels):",
        opacityPrompt: "Set opacity value (0-100%):",
        currentBlendMode: "Current blend mode",
        blendModePrompt: "Click \"OK\" to switch to next mode, click \"Cancel\" to keep current mode",
        deleteMaskConfirm: "Are you sure you want to delete this mask?",
        zoom: "Zoom",
        copy: "Copy",

        // Settings menu
        settingsSaved: "Settings saved",
        saveSettingsFailed: "Failed to save settings",
        settingsReset: "Settings reset",
        resetSettingsConfirm: "Are you sure you want to reset all settings?",

        // Language switch
        switchedToChinese: "Switched to Chinese",
        switchedToEnglish: "Switched to English",

        // Button texts
        buttonTexts: {
            addCharacter: "Add Character",
            selectFromLibrary: "Add from Library",
            generate: "Generate",
            copy: "Copy",
            validate: "Validate",
            globalPrompt: "Global Prompt",
            refreshCanvas: "Refresh Canvas",
            languageSettings: "Language Switch",
            settings: "Settings",
            syntaxDocs: "View Syntax Docs",
            save: "Save",
            cancel: "Cancel",
            confirm: "Confirm",
            edit: "Edit",
            delete: "Delete",
            enable: "Enable",
            disable: "Disable",
            copied: "Copied",
            generating: "Generating...",
            zoom: "Zoom"
        }
    }
};

// 多语言管理器类
class MultiLanguageManager {
    constructor(defaultLanguage = 'zh') {
        this.currentLanguage = defaultLanguage;
        this.storageKey = 'mce_language';

        // 从localStorage加载语言设置
        this.loadLanguageFromStorage();
    }

    /**
     * 从localStorage加载语言设置
     */
    loadLanguageFromStorage() {
        try {
            const savedLanguage = localStorage.getItem(this.storageKey);
            if (savedLanguage && i18n[savedLanguage]) {
                this.currentLanguage = savedLanguage;
            }
        } catch (error) {
            console.warn('[MultiLanguageManager] 加载语言设置失败:', error);
        }
    }

    /**
     * 保存语言设置到localStorage
     */
    saveLanguageToStorage() {
        try {
            localStorage.setItem(this.storageKey, this.currentLanguage);
        } catch (error) {
            console.warn('[MultiLanguageManager] 保存语言设置失败:', error);
        }
    }

    /**
     * 设置当前语言
     */
    setLanguage(language) {
        if (i18n[language]) {
            this.currentLanguage = language;
            this.saveLanguageToStorage();
            return true;
        }
        return false;
    }

    /**
     * 获取当前语言
     */
    getLanguage() {
        return this.currentLanguage;
    }

    /**
     * 获取翻译文本
     */
    t(key) {
        // 支持嵌套键，如 'buttonTexts.addCharacter'
        const keys = key.split('.');
        let value = i18n[this.currentLanguage];

        // 如果当前语言中没有找到，尝试使用中文
        if (!value) {
            value = i18n.zh;
        }

        // 遍历嵌套键
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                // 如果找不到嵌套键，尝试直接查找原始键
                value = i18n[this.currentLanguage]?.[key] || i18n.zh[key] || key;
                break;
            }
        }

        return value || key;
    }

    /**
     * 获取所有可用语言
     */
    getAvailableLanguages() {
        return Object.keys(i18n).map(lang => ({
            code: lang,
            name: i18n[lang].selectLanguage || lang
        }));
    }

    /**
     * 更新界面文本
     */
    updateInterfaceTexts() {
        // 更新工具栏
        this.updateToolbarTexts();

        // 更新角色编辑器
        this.updateCharacterEditorTexts();

        // 更新设置对话框
        this.updateSettingsDialogTexts();

        // 更新输出区域
        this.updateOutputAreaTexts();

        // 更新蒙版编辑器
        this.updateMaskEditorTexts();

        // 触发自定义事件，通知其他组件语言已更改
        document.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { language: this.currentLanguage }
        }));
    }

    /**
     * 更新工具栏文本
     */
    updateToolbarTexts() {
        // 更新语法模式标签
        const syntaxModeLabel = document.querySelector('.mce-toolbar-label');
        if (syntaxModeLabel) {
            syntaxModeLabel.textContent = this.t('syntaxMode');
        }

        // 更新刷新画布按钮
        const refreshButton = document.getElementById('mce-refresh-canvas');
        if (refreshButton) {
            // 更新按钮的title属性
            refreshButton.title = this.t('refreshCanvas');

            // 查找按钮内的span元素并更新其文本
            const spanElement = refreshButton.querySelector('span');
            if (spanElement) {
                spanElement.textContent = this.t('buttonTexts.refreshCanvas');
            }
        }

        // 更新设置按钮
        const settingsButton = document.getElementById('mce-settings');
        if (settingsButton) {
            // 更新按钮的title属性
            settingsButton.title = this.t('settings');

            // 查找按钮内的span元素并更新其文本
            const spanElement = settingsButton.querySelector('span');
            if (spanElement) {
                spanElement.textContent = this.t('buttonTexts.settings');
            }
        }

        // 更新语言切换按钮
        const languageButton = document.getElementById('mce-language-toggle');
        if (languageButton) {
            // 更新按钮的title属性
            languageButton.title = this.t('languageSettings');

            // 查找按钮内的span元素并更新其文本
            const spanElement = languageButton.querySelector('span');
            if (spanElement) {
                spanElement.textContent = this.t('buttonTexts.languageSettings');
            }
        }

        // 更新语法文档按钮
        const syntaxDocsButton = document.getElementById('mce-syntax-docs');
        if (syntaxDocsButton) {
            // 更新按钮的title属性
            syntaxDocsButton.title = this.t('syntaxDocs');

            // 查找按钮内的span元素并更新其文本
            const spanElement = syntaxDocsButton.querySelector('span');
            if (spanElement) {
                spanElement.textContent = this.t('buttonTexts.syntaxDocs');
            }
        }

        // 更新语法模式选项
        const syntaxModeSelect = document.getElementById('mce-syntax-mode');
        if (syntaxModeSelect) {
            const attentionOption = syntaxModeSelect.querySelector('option[value="attention_couple"]');
            if (attentionOption) {
                attentionOption.textContent = this.t('attentionCouple');
            }

            const regionalOption = syntaxModeSelect.querySelector('option[value="regional_prompts"]');
            if (regionalOption) {
                regionalOption.textContent = this.t('regionalPrompts');
            }
        }
    }

    /**
     * 更新角色编辑器文本
     */
    updateCharacterEditorTexts() {
        // 更新角色编辑器标题
        const characterTitle = document.querySelector('.mce-character-title');
        if (characterTitle) {
            characterTitle.textContent = this.t('characterEditor');
        }

        // 更新添加角色按钮的提示文本
        const addCharacterBtn = document.getElementById('mce-add-character');
        if (addCharacterBtn) {
            addCharacterBtn.title = this.t('addCharacter');
        }

        // 更新词库按钮的提示文本
        const libraryBtn = document.getElementById('mce-library-button');
        if (libraryBtn) {
            libraryBtn.title = this.t('selectFromLibrary');
        }

        // 更新空状态文本
        const emptyState = document.querySelector('.mce-empty-state p');
        if (emptyState) {
            emptyState.textContent = this.t('noCharacters');
        }

        // 触发自定义事件，通知角色编辑器组件语言已更改
        document.dispatchEvent(new CustomEvent('languageChanged', {
            detail: {
                language: this.currentLanguage,
                component: 'characterEditor'
            }
        }));
    }

    /**
     * 更新设置对话框文本
     */
    updateSettingsDialogTexts() {
        // 更新设置对话框标题
        const settingsTitle = document.querySelector('.mce-settings-title');
        if (settingsTitle) {
            settingsTitle.textContent = this.t('settingsTitle');
        }

        // 更新设置分类
        const categories = document.querySelectorAll('.mce-settings-category');
        categories.forEach(category => {
            const categoryName = category.dataset.category;
            if (categoryName === 'language') {
                const textSpan = category.querySelector('span') ||
                    Array.from(category.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
                if (textSpan) {
                    textSpan.textContent = this.t('categories.language');
                }
            } else if (categoryName === 'interface') {
                const textSpan = category.querySelector('span') ||
                    Array.from(category.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
                if (textSpan) {
                    textSpan.textContent = this.t('categories.interface');
                }
            } else if (categoryName === 'about') {
                const textSpan = category.querySelector('span') ||
                    Array.from(category.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
                if (textSpan) {
                    textSpan.textContent = this.t('categories.about');
                }
            }
        });

        // 更新设置面板
        const panels = document.querySelectorAll('.mce-settings-panel');
        panels.forEach(panel => {
            const panelName = panel.dataset.panel;
            if (panelName === 'language') {
                const sectionTitle = panel.querySelector('h4');
                if (sectionTitle) {
                    sectionTitle.textContent = this.t('sections.language');
                }
            } else if (panelName === 'interface') {
                const sectionTitle = panel.querySelector('h4');
                if (sectionTitle) {
                    sectionTitle.textContent = this.t('sections.interface');
                }
            } else if (panelName === 'about') {
                const sectionTitle = panel.querySelector('h4');
                if (sectionTitle) {
                    sectionTitle.textContent = this.t('sections.about');
                }
            }
        });

        // 更新设置按钮
        const saveBtn = document.getElementById('mce-settings-save');
        if (saveBtn) {
            saveBtn.textContent = this.t('save');
        }

        const resetBtn = document.getElementById('mce-settings-reset');
        if (resetBtn) {
            resetBtn.textContent = this.t('buttons.reset');
        }

        // 触发自定义事件，通知设置菜单组件语言已更改
        document.dispatchEvent(new CustomEvent('languageChanged', {
            detail: {
                language: this.currentLanguage,
                component: 'settingsMenu'
            }
        }));
    }

    /**
     * 更新输出区域文本
     */
    updateOutputAreaTexts() {
        // 更新输出区域标题
        const outputTitle = document.querySelector('.mce-output-title');
        if (outputTitle) {
            outputTitle.textContent = this.t('promptPreview');
        }

        // 更新复制按钮的提示文本
        const copyBtn = document.getElementById('mce-copy-prompt');
        if (copyBtn) {
            copyBtn.title = this.t('copy');
        }

        // 更新验证按钮的提示文本
        const validateBtn = document.getElementById('mce-validate-prompt');
        if (validateBtn) {
            validateBtn.title = this.t('validate');
        }

        // 更新提示词占位符
        const promptOutput = document.getElementById('mce-prompt-output');
        if (promptOutput) {
            promptOutput.placeholder = this.t('promptPlaceholder');
        }

        // 触发自定义事件，通知输出区域组件语言已更改
        document.dispatchEvent(new CustomEvent('languageChanged', {
            detail: {
                language: this.currentLanguage,
                component: 'outputArea'
            }
        }));
    }

    /**
     * 更新蒙版编辑器文本
     */
    updateMaskEditorTexts() {
        // 更新分辨率信息中的"缩放"文本
        const resolutionInfo = document.querySelector('.mce-resolution-info');
        if (resolutionInfo) {
            // 由于分辨率信息是动态生成的，这里只更新文本内容
            // 实际的更新会在渲染时进行
        }

        // 触发自定义事件，通知蒙版编辑器组件语言已更改
        document.dispatchEvent(new CustomEvent('languageChanged', {
            detail: {
                language: this.currentLanguage,
                component: 'maskEditor'
            }
        }));
    }

    /**
     * 显示消息提示
     */
    showMessage(message, type = 'info') {
        // 使用统一的弹出提示管理系统
        // 获取多人角色编辑器实例，传递节点容器
        const editorInstance = window.MultiCharacterEditorInstance;
        const nodeContainer = editorInstance && editorInstance.container ? editorInstance.container : null;

        if (!nodeContainer) {
            console.warn('[MultiLanguage] 编辑器容器不存在，使用默认提示位置');
        }

        try {
            toastManagerProxy.showToast(message, type, 3000, { nodeContainer });
        } catch (error) {
            console.error('[MultiLanguage] 显示提示失败:', error);
            // 回退到不传递节点容器的方式
            toastManagerProxy.showToast(message, type, 3000, {});
        }
    }
}

// 创建全局实例
const globalMultiLanguageManager = new MultiLanguageManager();

// 导出类和全局实例
export { MultiLanguageManager, globalMultiLanguageManager, i18n };