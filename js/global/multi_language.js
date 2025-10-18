/**
 * 全局多语言系统
 * 支持多节点注册自己的翻译字典
 * Global Multi-Language System for ComfyUI Plugins
 */

import { globalToastManager as toastManagerProxy } from './toast_manager.js';

/**
 * 全局多语言管理器类
 */
class GlobalMultiLanguageManager {
    constructor(defaultLanguage = 'zh') {
        this.currentLanguage = defaultLanguage;
        this.storageKey = 'comfyui_global_language';

        // 翻译字典，支持命名空间
        // 格式: { namespace: { language: { key: value } } }
        this.translations = {};

        // 从localStorage加载语言设置
        this.loadLanguageFromStorage();

        console.log('[GlobalMultiLanguage] 全局多语言系统已初始化');
    }

    /**
     * 注册翻译字典（支持命名空间）
     * @param {string} namespace - 命名空间（如 'mce', 'danbooru', 'prompt_selector'）
     * @param {object} translations - 翻译字典 { zh: {...}, en: {...} }
     */
    registerTranslations(namespace, translations) {
        if (!this.translations[namespace]) {
            this.translations[namespace] = {};
        }

        // 合并翻译字典
        Object.keys(translations).forEach(lang => {
            if (!this.translations[namespace][lang]) {
                this.translations[namespace][lang] = {};
            }
            Object.assign(this.translations[namespace][lang], translations[lang]);
        });

        console.log(`[GlobalMultiLanguage] 已注册命名空间: ${namespace}`,
            Object.keys(translations));
    }

    /**
     * 从localStorage加载语言设置
     */
    loadLanguageFromStorage() {
        try {
            const savedLanguage = localStorage.getItem(this.storageKey);
            if (savedLanguage) {
                this.currentLanguage = savedLanguage;
            }
        } catch (error) {
            console.warn('[GlobalMultiLanguage] 加载语言设置失败:', error);
        }
    }

    /**
     * 保存语言设置到localStorage
     */
    saveLanguageToStorage() {
        try {
            localStorage.setItem(this.storageKey, this.currentLanguage);
        } catch (error) {
            console.warn('[GlobalMultiLanguage] 保存语言设置失败:', error);
        }
    }

    /**
     * 设置当前语言
     * @param {string} language - 语言代码（zh, en等）
     * @param {boolean} silent - 是否静默切换（不触发事件）
     */
    setLanguage(language, silent = false) {
        if (language !== this.currentLanguage) {
            this.currentLanguage = language;
            this.saveLanguageToStorage();

            if (!silent) {
                // 触发全局语言变化事件
                document.dispatchEvent(new CustomEvent('languageChanged', {
                    detail: { language: this.currentLanguage }
                }));
            }

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
     * 支持两种格式：
     * 1. 带命名空间: t('mce.addCharacter')
     * 2. 不带命名空间（向后兼容）: t('addCharacter', 'mce')
     * 
     * @param {string} key - 翻译键（可以是 namespace.key 或 key）
     * @param {string} defaultNamespace - 默认命名空间（可选）
     */
    t(key, defaultNamespace = null) {
        let namespace = defaultNamespace;
        let actualKey = key;

        // 解析命名空间
        if (key.includes('.')) {
            const parts = key.split('.');
            namespace = parts[0];
            actualKey = parts.slice(1).join('.');
        }

        // 如果没有命名空间，返回原始键
        if (!namespace) {
            console.warn(`[GlobalMultiLanguage] 缺少命名空间: ${key}`);
            return key;
        }

        // 查找翻译
        const nsTranslations = this.translations[namespace];
        if (!nsTranslations) {
            console.warn(`[GlobalMultiLanguage] 命名空间不存在: ${namespace}`);
            return key;
        }

        const langTranslations = nsTranslations[this.currentLanguage];
        if (!langTranslations) {
            // 回退到中文
            const zhTranslations = nsTranslations['zh'];
            if (zhTranslations) {
                return this.getNestedValue(zhTranslations, actualKey) || key;
            }
            return key;
        }

        return this.getNestedValue(langTranslations, actualKey) || key;
    }

    /**
     * 获取嵌套对象的值（支持 a.b.c 格式）
     */
    getNestedValue(obj, path) {
        const keys = path.split('.');
        let value = obj;

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return null;
            }
        }

        return value;
    }

    /**
     * 获取所有可用语言
     */
    getAvailableLanguages() {
        const languages = new Set();

        Object.values(this.translations).forEach(nsTranslations => {
            Object.keys(nsTranslations).forEach(lang => languages.add(lang));
        });

        return Array.from(languages).map(lang => ({
            code: lang,
            name: lang === 'zh' ? '中文' : lang === 'en' ? 'English' : lang
        }));
    }

    /**
     * 触发语言变化事件（供各节点组件使用）
     */
    notifyLanguageChanged(component = null) {
        document.dispatchEvent(new CustomEvent('languageChanged', {
            detail: {
                language: this.currentLanguage,
                component: component
            }
        }));
    }

    /**
     * 显示消息提示
     */
    showMessage(message, type = 'info', nodeContainer = null) {
        try {
            toastManagerProxy.showToast(message, type, 3000, { nodeContainer });
        } catch (error) {
            console.error('[GlobalMultiLanguage] 显示提示失败:', error);
        }
    }

    /**
     * 为特定命名空间创建便捷翻译函数
     * 返回一个绑定了命名空间的 t 函数
     */
    createNamespacedT(namespace) {
        return (key) => this.t(`${namespace}.${key}`);
    }
}

// 创建全局实例
const globalMultiLanguageManager = new GlobalMultiLanguageManager();

// 注册各节点的翻译
import { mceTranslations } from './translations/mce_translations.js';
import { danbooruTranslations } from './translations/danbooru_translations.js';
import { promptSelectorTranslations } from './translations/prompt_selector_translations.js';
import { charSwapTranslations } from './translations/char_swap_translations.js';
import { gemTranslations } from './translations/gem_translations.js';

globalMultiLanguageManager.registerTranslations('mce', mceTranslations);
globalMultiLanguageManager.registerTranslations('danbooru', danbooruTranslations);
globalMultiLanguageManager.registerTranslations('prompt_selector', promptSelectorTranslations);
globalMultiLanguageManager.registerTranslations('char_swap', charSwapTranslations);
globalMultiLanguageManager.registerTranslations('gem', gemTranslations);

// 导出类和全局实例
export { GlobalMultiLanguageManager, globalMultiLanguageManager };
