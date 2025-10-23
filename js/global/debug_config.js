/**
 * Debug配置管理模块 - 前端版本
 * 统一管理所有前端组件的debug模式开关
 */

class DebugConfig {
    constructor() {
        this.config = {
            group_executor_manager: false,
            group_executor_trigger: false,
            image_cache_save: false,
            image_cache_get: false,
            execution_engine: false,
            cache_control_events: false
        };
        this.loaded = false;
    }

    /**
     * 从后端API加载配置
     */
    async loadConfig() {
        try {
            const response = await fetch('/danbooru_gallery/get_debug_config');
            if (response.ok) {
                const data = await response.json();
                if (data.status === 'success') {
                    this.config = data.debug || this.config;
                    this.loaded = true;
                    console.log('[DebugConfig] 配置加载成功:', this.config);
                    return true;
                }
            }
            console.warn('[DebugConfig] 配置加载失败，使用默认配置');
            return false;
        } catch (error) {
            console.error('[DebugConfig] 加载配置时出错:', error);
            return false;
        }
    }

    /**
     * 检查指定组件是否应该打印debug日志
     * @param {string} component - 组件名称
     * @returns {boolean} - true表示应该打印日志
     */
    shouldDebug(component) {
        return this.config[component] || false;
    }

    /**
     * 条件打印日志
     * @param {string} component - 组件名称
     * @param {...any} args - 要打印的内容
     */
    debugLog(component, ...args) {
        if (this.shouldDebug(component)) {
            console.log(...args);
        }
    }

    /**
     * 条件打印警告
     * @param {string} component - 组件名称
     * @param {...any} args - 要打印的内容
     */
    debugWarn(component, ...args) {
        if (this.shouldDebug(component)) {
            console.warn(...args);
        }
    }

    /**
     * 条件打印错误
     * @param {string} component - 组件名称
     * @param {...any} args - 要打印的内容
     */
    debugError(component, ...args) {
        if (this.shouldDebug(component)) {
            console.error(...args);
        }
    }

    /**
     * 条件打印信息
     * @param {string} component - 组件名称
     * @param {...any} args - 要打印的内容
     */
    debugInfo(component, ...args) {
        if (this.shouldDebug(component)) {
            console.info(...args);
        }
    }

    /**
     * 获取所有配置
     * @returns {Object} - 配置对象
     */
    getAllConfig() {
        return { ...this.config };
    }

    /**
     * 更新配置（可选功能）
     * @param {Object} newConfig - 新的配置
     */
    async updateConfig(newConfig) {
        try {
            const response = await fetch('/danbooru_gallery/update_debug_config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ debug: newConfig })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.status === 'success') {
                    this.config = newConfig;
                    console.log('[DebugConfig] 配置更新成功');
                    return true;
                }
            }
            console.error('[DebugConfig] 配置更新失败');
            return false;
        } catch (error) {
            console.error('[DebugConfig] 更新配置时出错:', error);
            return false;
        }
    }
}

// 创建全局实例
window.debugConfig = new DebugConfig();

// 自动加载配置
window.debugConfig.loadConfig().then(() => {
    console.log('[DebugConfig] Debug配置系统已初始化');
});

// 导出便捷函数
window.shouldDebug = (component) => window.debugConfig.shouldDebug(component);
window.debugLog = (component, ...args) => window.debugConfig.debugLog(component, ...args);
window.debugWarn = (component, ...args) => window.debugConfig.debugWarn(component, ...args);
window.debugError = (component, ...args) => window.debugConfig.debugError(component, ...args);
window.debugInfo = (component, ...args) => window.debugConfig.debugInfo(component, ...args);
