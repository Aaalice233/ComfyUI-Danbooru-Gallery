/**
 * 公共智能补全缓存系统
 * 提供本地缓存功能和智能补全API调用
 * 可被多个节点和组件共享使用
 */

// 智能补全缓存类
class AutocompleteCache {
    constructor(options = {}) {
        // 缓存配置
        this.maxCacheSize = options.maxCacheSize || 1000;
        this.maxCacheAge = options.maxCacheAge || 3600000; // 1小时，单位毫秒
        this.cacheEnabled = options.cacheEnabled !== false; // 默认启用缓存

        // 缓存存储
        this.cache = new Map(); // 存储缓存数据
        this.timestamps = new Map(); // 存储缓存时间戳

        // API配置
        this.apiEndpoints = {
            autocomplete: '/danbooru_gallery/autocomplete',
            autocompleteWithTranslation: '/danbooru_gallery/autocomplete_with_translation',
            searchChinese: '/danbooru_gallery/search_chinese'
        };

        // 语言设置
        this.currentLanguage = options.language || 'zh';

        // 初始化
        this.init();
    }

    init() {
        // 从localStorage加载缓存
        this.loadCacheFromStorage();

        // 定期清理过期缓存
        setInterval(() => {
            this.cleanExpiredCache();
        }, 60000); // 每分钟清理一次
    }

    /**
     * 从localStorage加载缓存
     */
    loadCacheFromStorage() {
        try {
            const cacheData = localStorage.getItem('danbooru_autocomplete_cache');
            const timestampsData = localStorage.getItem('danbooru_autocomplete_timestamps');

            if (cacheData && timestampsData) {
                this.cache = new Map(JSON.parse(cacheData));
                this.timestamps = new Map(JSON.parse(timestampsData));

                // 清理过期缓存
                this.cleanExpiredCache();
            }
        } catch (error) {
            console.warn('[AutocompleteCache] 加载缓存失败:', error);
        }
    }

    /**
     * 保存缓存到localStorage
     */
    saveCacheToStorage() {
        try {
            localStorage.setItem('danbooru_autocomplete_cache', JSON.stringify(Array.from(this.cache.entries())));
            localStorage.setItem('danbooru_autocomplete_timestamps', JSON.stringify(Array.from(this.timestamps.entries())));
        } catch (error) {
            console.warn('[AutocompleteCache] 保存缓存失败:', error);
        }
    }

    /**
     * 清理过期缓存
     */
    cleanExpiredCache() {
        const now = Date.now();
        const expiredKeys = [];

        for (const [key, timestamp] of this.timestamps.entries()) {
            if (now - timestamp > this.maxCacheAge) {
                expiredKeys.push(key);
            }
        }

        // 删除过期缓存
        for (const key of expiredKeys) {
            this.cache.delete(key);
            this.timestamps.delete(key);
        }

        // 如果缓存过多，删除最旧的缓存
        if (this.cache.size > this.maxCacheSize) {
            const sortedEntries = Array.from(this.timestamps.entries())
                .sort((a, b) => a[1] - b[1]); // 按时间戳排序，最旧的在前

            const keysToDelete = sortedEntries
                .slice(0, this.cache.size - this.maxCacheSize)
                .map(entry => entry[0]);

            for (const key of keysToDelete) {
                this.cache.delete(key);
                this.timestamps.delete(key);
            }
        }

        // 保存更新后的缓存
        if (expiredKeys.length > 0) {
            this.saveCacheToStorage();
        }
    }

    /**
     * 生成缓存键
     */
    generateCacheKey(type, query, options = {}) {
        const parts = [type, query];

        // 添加语言
        if (this.currentLanguage) {
            parts.push(`lang:${this.currentLanguage}`);
        }

        // 添加其他选项
        if (options.limit) {
            parts.push(`limit:${options.limit}`);
        }

        return parts.join(':');
    }

    /**
     * 获取英文自动补全建议
     */
    async getAutocompleteSuggestions(query, options = {}) {
        if (!query || query.length < 2) {
            return [];
        }

        const cacheKey = this.generateCacheKey('autocomplete', query, options);

        // 检查缓存
        if (this.cacheEnabled && this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            // 构建API URL
            const apiEndpoint = this.currentLanguage === 'zh'
                ? this.apiEndpoints.autocompleteWithTranslation
                : this.apiEndpoints.autocomplete;

            const params = new URLSearchParams({
                query: query,
                limit: options.limit || 20
            });

            const response = await fetch(`${apiEndpoint}?${params}`);
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }

            const suggestions = await response.json();

            // 存储到缓存
            if (this.cacheEnabled && Array.isArray(suggestions)) {
                this.cache.set(cacheKey, suggestions);
                this.timestamps.set(cacheKey, Date.now());
                this.saveCacheToStorage();
            }

            return suggestions;
        } catch (error) {
            console.error('[AutocompleteCache] 获取自动补全建议失败:', error);
            return [];
        }
    }

    /**
     * 获取中文搜索建议
     */
    async getChineseSearchSuggestions(query, options = {}) {
        if (!query) {
            return [];
        }

        const cacheKey = this.generateCacheKey('chinese_search', query, options);

        // 检查缓存
        if (this.cacheEnabled && this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const params = new URLSearchParams({
                query: query,
                limit: options.limit || 10
            });

            const response = await fetch(`${this.apiEndpoints.searchChinese}?${params}`);
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }

            const data = await response.json();
            const suggestions = data.success ? data.results : [];

            // 存储到缓存
            if (this.cacheEnabled && Array.isArray(suggestions)) {
                this.cache.set(cacheKey, suggestions);
                this.timestamps.set(cacheKey, Date.now());
                this.saveCacheToStorage();
            }

            return suggestions;
        } catch (error) {
            console.error('[AutocompleteCache] 获取中文搜索建议失败:', error);
            return [];
        }
    }

    /**
     * 设置语言
     */
    setLanguage(language) {
        this.currentLanguage = language;
    }

    /**
     * 清空所有缓存
     */
    clearCache() {
        this.cache.clear();
        this.timestamps.clear();
        localStorage.removeItem('danbooru_autocomplete_cache');
        localStorage.removeItem('danbooru_autocomplete_timestamps');
    }

    /**
     * 获取缓存统计信息
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxCacheSize,
            enabled: this.cacheEnabled,
            language: this.currentLanguage
        };
    }
}

// 创建全局实例
const globalAutocompleteCache = new AutocompleteCache();

// 导出类和全局实例
export { AutocompleteCache, globalAutocompleteCache };