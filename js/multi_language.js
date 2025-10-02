/**
 * 多人提示词节点多语言系统
 * 提供中英文界面切换和文本翻译功能
 */

import { globalToastManager } from './toast_manager.js';

// 多语言字典
const i18n = {
    zh: {
        // 工具栏
        syntaxMode: "语法模式",
        refreshCanvas: "刷新画布",
        settings: "设置",

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
        copyPrompt: "复制提示词",

        // 设置对话框
        settingsTitle: "设置",
        generalSettings: "常规设置",
        canvasSettings: "画布设置",
        languageSettings: "语言设置",

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

        // 词库相关
        promptLibrary: "词库",
        selectFromLibrary: "从词库添加",
        noPromptsInCategory: "此分类下没有提示词",
        noPreview: "暂无预览",

        // 其他
        cancel: "取消",
        save: "保存",
        color: "颜色",

        // 角色编辑器额外文本
        noCharacters: "还没有角色",
        clickToAddCharacter: "点击\"添加角色\"开始创建",
        enable: "启用",
        disable: "禁用",
        edit: "编辑",
        category: "分类",
        promptList: "提示词列表"
    },
    en: {
        // Toolbar
        syntaxMode: "Syntax Mode",
        refreshCanvas: "Refresh Canvas",
        settings: "Settings",

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
        copyPrompt: "Copy Prompt",

        // Settings dialog
        settingsTitle: "Settings",
        generalSettings: "General Settings",
        canvasSettings: "Canvas Settings",
        languageSettings: "Language Settings",

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

        // Prompt library
        promptLibrary: "Prompt Library",
        selectFromLibrary: "Add from Library",
        noPromptsInCategory: "No prompts in this category",
        noPreview: "No preview available",

        // Other
        cancel: "Cancel",
        save: "Save",
        color: "Color",

        // Character editor additional text
        noCharacters: "No characters yet",
        clickToAddCharacter: "Click 'Add Character' to start creating",
        enable: "Enable",
        disable: "Disable",
        edit: "Edit",
        category: "Category",
        promptList: "Prompt List"
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
        return i18n[this.currentLanguage]?.[key] || i18n.zh[key] || key;
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
            const textNode = Array.from(refreshButton.childNodes).find(node =>
                node.nodeType === Node.TEXT_NODE
            );
            if (textNode) {
                textNode.textContent = this.t('refreshCanvas');
            }
        }

        // 更新设置按钮
        const settingsButton = document.getElementById('mce-settings');
        if (settingsButton) {
            const textNode = Array.from(settingsButton.childNodes).find(node =>
                node.nodeType === Node.TEXT_NODE
            );
            if (textNode) {
                textNode.textContent = this.t('settings');
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
        // 这里可以添加更新角色编辑器文本的逻辑
        // 由于角色编辑器是动态创建的，需要在创建时应用正确的文本
    }

    /**
     * 更新设置对话框文本
     */
    updateSettingsDialogTexts() {
        // 这里可以添加更新设置对话框文本的逻辑
        // 由于设置对话框是动态创建的，需要在创建时应用正确的文本
    }

    /**
     * 显示消息提示
     */
    showMessage(message, type = 'info') {
        // 使用统一的弹出提示管理系统
        globalToastManager.showToast(message, type, 3000);
    }
}

// 创建全局实例
const globalMultiLanguageManager = new MultiLanguageManager();

// 导出类和全局实例
export { MultiLanguageManager, globalMultiLanguageManager, i18n };