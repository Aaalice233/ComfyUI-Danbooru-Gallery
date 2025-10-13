/**
 * 公共智能补全缓存系统 - 增强版
 * 提供本地缓存功能和智能补全API调用
 * 可被多个节点和组件共享使用
 * 
 * 新特性：
 * - 多层缓存策略（内存 + localStorage + 预加载）
 * - 智能预测和预加载
 * - 防抖和节流优化
 * - 更快的响应速度
 */

// 智能补全缓存类
class AutocompleteCache {
    constructor(options = {}) {
        // 缓存配置
        this.maxCacheSize = options.maxCacheSize || 500; // 优化缓存大小，减少内存占用
        this.maxCacheAge = options.maxCacheAge || 7200000; // 2小时，单位毫秒
        this.cacheEnabled = options.cacheEnabled !== false; // 默认启用缓存

        // 多层缓存存储
        this.memoryCache = new Map(); // L1: 内存缓存（最快）
        this.frequencyMap = new Map(); // 记录查询频率，用于缓存淘汰
        this.timestamps = new Map(); // 存储缓存时间戳

        // 请求去重
        this.pendingRequests = new Map(); // 正在进行的请求

        // 保存节流
        this._saveTimer = null;

        // API配置
        this.apiEndpoints = {
            autocomplete: '/danbooru_gallery/autocomplete',
            autocompleteWithTranslation: '/danbooru_gallery/autocomplete_with_translation',
            searchChinese: '/danbooru_gallery/search_chinese'
        };

        // 语言设置
        this.currentLanguage = options.language || 'zh';

        // 性能统计
        this.stats = {
            hits: 0,
            misses: 0,
            requests: 0,
            avgResponseTime: 0
        };

        // 初始化
        this.init();
    }

    init() {
        // 从localStorage加载缓存
        this.loadCacheFromStorage();

        // 延长清理间隔，减少性能影响（每5分钟清理一次）
        setInterval(() => {
            this.cleanExpiredCache();
        }, 300000); // 5分钟

        // 移除自动预加载，改为按需加载
    }

    /**
     * 从localStorage加载缓存（优化版）
     */
    loadCacheFromStorage() {
        try {
            const cacheData = localStorage.getItem('danbooru_autocomplete_cache_v2');
            const timestampsData = localStorage.getItem('danbooru_autocomplete_timestamps_v2');
            const frequencyData = localStorage.getItem('danbooru_autocomplete_frequency_v2');

            if (cacheData && timestampsData) {
                const entries = JSON.parse(cacheData);
                const timestamps = JSON.parse(timestampsData);

                // 加载到内存缓存
                this.memoryCache = new Map(entries);
                this.timestamps = new Map(timestamps);

                // 加载频率数据
                if (frequencyData) {
                    this.frequencyMap = new Map(JSON.parse(frequencyData));
                }

                // 清理过期缓存
                this.cleanExpiredCache();

                if (this.memoryCache.size > 0) {
                    console.log(`[AutocompleteCache] 已加载 ${this.memoryCache.size} 条缓存记录`);
                }
            }
        } catch (error) {
            console.warn('[AutocompleteCache] 加载缓存失败，重置缓存:', error);
            // 重置缓存并清理损坏的数据
            this.memoryCache.clear();
            this.timestamps.clear();
            this.frequencyMap.clear();

            // 清理可能损坏的localStorage数据
            try {
                localStorage.removeItem('danbooru_autocomplete_cache_v2');
                localStorage.removeItem('danbooru_autocomplete_timestamps_v2');
                localStorage.removeItem('danbooru_autocomplete_frequency_v2');
            } catch (e) {
                // 静默失败
            }
        }
    }

    /**
     * 保存缓存到localStorage（增强版，带压缩）
     */
    saveCacheToStorage() {
        try {
            // 只保存最热门的缓存条目
            const sortedEntries = Array.from(this.memoryCache.entries())
                .sort((a, b) => {
                    const freqA = this.frequencyMap.get(a[0]) || 0;
                    const freqB = this.frequencyMap.get(b[0]) || 0;
                    return freqB - freqA;
                })
                .slice(0, this.maxCacheSize);

            const cacheEntries = sortedEntries.map(([key, value]) => [key, value]);
            const timestampEntries = sortedEntries.map(([key]) => [key, this.timestamps.get(key)]);
            const frequencyEntries = sortedEntries.map(([key]) => [key, this.frequencyMap.get(key) || 0]);

            localStorage.setItem('danbooru_autocomplete_cache_v2', JSON.stringify(cacheEntries));
            localStorage.setItem('danbooru_autocomplete_timestamps_v2', JSON.stringify(timestampEntries));
            localStorage.setItem('danbooru_autocomplete_frequency_v2', JSON.stringify(frequencyEntries));
        } catch (error) {
            console.warn('[AutocompleteCache] 保存缓存失败:', error);
            // 如果存储空间不足，清理一半缓存
            if (error.name === 'QuotaExceededError') {
                this.reduceCacheSize();
                this.saveCacheToStorage(); // 重试
            }
        }
    }

    /**
     * 减少缓存大小
     */
    reduceCacheSize() {
        const entries = Array.from(this.memoryCache.entries());
        const halfSize = Math.floor(entries.length / 2);

        // 按频率排序，删除不常用的
        const sorted = entries.sort((a, b) => {
            const freqA = this.frequencyMap.get(a[0]) || 0;
            const freqB = this.frequencyMap.get(b[0]) || 0;
            return freqA - freqB;
        });

        // 删除前半部分
        for (let i = 0; i < halfSize; i++) {
            const [key] = sorted[i];
            this.memoryCache.delete(key);
            this.timestamps.delete(key);
            this.frequencyMap.delete(key);
        }
    }

    /**
     * 清理过期缓存（优化版）
     */
    cleanExpiredCache() {
        const now = Date.now();
        let cleanedCount = 0;

        // 删除过期缓存
        for (const [key, timestamp] of this.timestamps.entries()) {
            if (now - timestamp > this.maxCacheAge) {
                this.memoryCache.delete(key);
                this.timestamps.delete(key);
                this.frequencyMap.delete(key);
                cleanedCount++;
            }
        }

        // 如果缓存超过最大值，删除最少使用的条目（简化逻辑）
        if (this.memoryCache.size > this.maxCacheSize) {
            const excess = this.memoryCache.size - this.maxCacheSize;
            const entries = Array.from(this.memoryCache.keys())
                .map(key => ({
                    key,
                    frequency: this.frequencyMap.get(key) || 0,
                    timestamp: this.timestamps.get(key) || 0
                }))
                .sort((a, b) => {
                    // 优先按频率排序
                    if (a.frequency !== b.frequency) {
                        return a.frequency - b.frequency;
                    }
                    // 频率相同则按时间排序（旧的优先删除）
                    return a.timestamp - b.timestamp;
                });

            // 删除最少使用的条目
            for (let i = 0; i < excess; i++) {
                const key = entries[i].key;
                this.memoryCache.delete(key);
                this.timestamps.delete(key);
                this.frequencyMap.delete(key);
                cleanedCount++;
            }
        }

        // 如果有清理，使用节流保存
        if (cleanedCount > 0) {
            this.throttledSave();
        }
    }

    /**
     * 优化缓存
     */
    optimizeCache() {
        // 合并相似的查询结果
        // 这里可以添加更多优化逻辑
    }

    /**
     * 预加载热门标签（已禁用，按需加载更高效）
     */
    async preloadPopularTags() {
        // 移除自动预加载以提升性能
        // 现在采用纯粹的按需加载策略
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
     * 获取英文自动补全建议（增强版）
     */
    async getAutocompleteSuggestions(query, options = {}) {
        if (!query || query.length < 1) {
            return [];
        }

        const startTime = performance.now();
        const cacheKey = this.generateCacheKey('autocomplete', query, options);

        // 更新查询频率
        this.frequencyMap.set(cacheKey, (this.frequencyMap.get(cacheKey) || 0) + 1);

        // 检查内存缓存
        if (this.cacheEnabled && this.memoryCache.has(cacheKey)) {
            this.stats.hits++;
            const result = this.memoryCache.get(cacheKey);

            // 更新时间戳（LRU策略）
            this.timestamps.set(cacheKey, Date.now());

            const endTime = performance.now();
            this.updateStats(endTime - startTime);

            return result;
        }

        this.stats.misses++;

        // 检查是否有相同的请求正在进行
        if (this.pendingRequests.has(cacheKey)) {
            // 返回现有的Promise，避免重复请求
            return this.pendingRequests.get(cacheKey);
        }

        // 创建新的请求Promise
        const requestPromise = this._fetchSuggestions(query, options, cacheKey, startTime);
        this.pendingRequests.set(cacheKey, requestPromise);

        try {
            const result = await requestPromise;
            return result;
        } finally {
            // 请求完成后清理
            this.pendingRequests.delete(cacheKey);
        }
    }

    /**
     * 实际获取建议的方法
     */
    async _fetchSuggestions(query, options, cacheKey, startTime) {
        try {
            this.stats.requests++;

            // 构建API URL
            const apiEndpoint = this.currentLanguage === 'zh'
                ? this.apiEndpoints.autocompleteWithTranslation
                : this.apiEndpoints.autocomplete;

            const params = new URLSearchParams({
                query: query,
                limit: options.limit || 20
            });

            const response = await fetch(`${apiEndpoint}?${params}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                signal: AbortSignal.timeout(10000) // 10秒超时
            });

            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
            }

            const suggestions = await response.json();

            // 验证响应数据
            if (!Array.isArray(suggestions)) {
                console.warn('[AutocompleteCache] API返回的数据格式不正确');
                return [];
            }

            // 存储到缓存
            if (this.cacheEnabled && suggestions.length > 0) {
                this.memoryCache.set(cacheKey, suggestions);
                this.timestamps.set(cacheKey, Date.now());

                // 使用节流保存，避免频繁写入
                this.throttledSave();
            }

            const endTime = performance.now();
            this.updateStats(endTime - startTime);

            return suggestions;
        } catch (error) {
            console.error('[AutocompleteCache] 获取自动补全建议失败:', error.message);
            return [];
        }
    }

    /**
     * 节流保存到localStorage
     */
    throttledSave() {
        // 清除之前的保存计时器
        if (this._saveTimer) {
            clearTimeout(this._saveTimer);
        }

        // 设置新的保存计时器（2秒后保存）
        this._saveTimer = setTimeout(() => {
            this.saveCacheToStorage();
            this._saveTimer = null;
        }, 2000);
    }

    /**
     * 更新性能统计
     */
    updateStats(responseTime) {
        if (this.stats.requests > 0) {
            this.stats.avgResponseTime =
                (this.stats.avgResponseTime * (this.stats.requests - 1) + responseTime) / this.stats.requests;
        }
    }

    /**
     * 获取中文搜索建议（增强版）
     */
    async getChineseSearchSuggestions(query, options = {}) {
        if (!query) {
            return [];
        }

        const startTime = performance.now();
        const cacheKey = this.generateCacheKey('chinese_search', query, options);

        // 更新查询频率
        this.frequencyMap.set(cacheKey, (this.frequencyMap.get(cacheKey) || 0) + 1);

        // 检查内存缓存
        if (this.cacheEnabled && this.memoryCache.has(cacheKey)) {
            this.stats.hits++;
            const result = this.memoryCache.get(cacheKey);

            // 更新时间戳（LRU策略）
            this.timestamps.set(cacheKey, Date.now());

            const endTime = performance.now();
            this.updateStats(endTime - startTime);

            return result;
        }

        this.stats.misses++;

        // 检查是否有相同的请求正在进行
        if (this.pendingRequests.has(cacheKey)) {
            return this.pendingRequests.get(cacheKey);
        }

        // 创建新的请求Promise
        const requestPromise = this._fetchChineseSuggestions(query, options, cacheKey, startTime);
        this.pendingRequests.set(cacheKey, requestPromise);

        try {
            const result = await requestPromise;
            return result;
        } finally {
            this.pendingRequests.delete(cacheKey);
        }
    }

    /**
     * 实际获取中文建议的方法
     */
    async _fetchChineseSuggestions(query, options, cacheKey, startTime) {
        try {
            this.stats.requests++;

            const params = new URLSearchParams({
                query: query,
                limit: options.limit || 10
            });

            const response = await fetch(`${this.apiEndpoints.searchChinese}?${params}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                signal: AbortSignal.timeout(10000) // 10秒超时
            });

            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // 验证响应数据
            if (!data || typeof data !== 'object') {
                console.warn('[AutocompleteCache] 中文搜索API返回的数据格式不正确');
                return [];
            }

            const suggestions = data.success ? data.results : [];

            // 存储到缓存
            if (this.cacheEnabled && Array.isArray(suggestions) && suggestions.length > 0) {
                this.memoryCache.set(cacheKey, suggestions);
                this.timestamps.set(cacheKey, Date.now());

                // 使用节流保存，避免频繁写入
                this.throttledSave();
            }

            const endTime = performance.now();
            this.updateStats(endTime - startTime);

            return suggestions;
        } catch (error) {
            console.error('[AutocompleteCache] 获取中文搜索建议失败:', error.message);
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
        this.memoryCache.clear();
        this.timestamps.clear();
        this.frequencyMap.clear();
        this.pendingRequests.clear();

        // 清理旧版本缓存
        localStorage.removeItem('danbooru_autocomplete_cache');
        localStorage.removeItem('danbooru_autocomplete_timestamps');

        // 清理新版本缓存
        localStorage.removeItem('danbooru_autocomplete_cache_v2');
        localStorage.removeItem('danbooru_autocomplete_timestamps_v2');
        localStorage.removeItem('danbooru_autocomplete_frequency_v2');

        console.log('[AutocompleteCache] 缓存已清空');
    }

    /**
     * 获取缓存统计信息
     */
    getCacheStats() {
        const hitRate = this.stats.hits + this.stats.misses > 0
            ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
            : 0;

        return {
            size: this.memoryCache.size,
            maxSize: this.maxCacheSize,
            enabled: this.cacheEnabled,
            language: this.currentLanguage,
            hits: this.stats.hits,
            misses: this.stats.misses,
            hitRate: `${hitRate}%`,
            requests: this.stats.requests,
            avgResponseTime: `${this.stats.avgResponseTime.toFixed(2)}ms`,
            pendingRequests: this.pendingRequests.size
        };
    }

    /**
     * 获取热门查询
     */
    getPopularQueries(limit = 10) {
        const sorted = Array.from(this.frequencyMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit);

        return sorted.map(([key, freq]) => ({
            query: key,
            frequency: freq
        }));
    }

    /**
     * 手动触发缓存优化
     */
    manualOptimize() {
        this.cleanExpiredCache();
        this.optimizeCache();
        this.saveCacheToStorage();
        console.log('[AutocompleteCache] 手动优化完成', this.getCacheStats());
    }
}

// 创建全局实例
const globalAutocompleteCache = new AutocompleteCache();

// 导出类和全局实例
export { AutocompleteCache, globalAutocompleteCache };