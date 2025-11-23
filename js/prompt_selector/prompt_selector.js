import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";
import { AutocompleteUI } from "../global/autocomplete_ui.js";
import { toastManagerProxy } from "../global/toast_manager.js";
import { globalMultiLanguageManager } from "../global/multi_language.js";

import { createLogger } from '../global/logger_client.js';

// 创建logger实例
const logger = createLogger('prompt_selector');

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 生成唯一的分类ID
 * 格式: cat-{timestamp}-{random}
 * @returns {string} 唯一的分类ID
 */
function generateCategoryId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `cat-${timestamp}-${random}`;
}

/**
 * 数据迁移：为旧数据中缺少ID的分类添加唯一ID
 * @param {Object} promptData - 提示词数据对象
 * @returns {boolean} 是否进行了迁移
 */
function migrateCategoriesToId(promptData) {
    if (!promptData || !promptData.categories) {
        return false;
    }

    let migrated = false;
    const now = new Date().toISOString();  // 生成当前时间戳

    for (const category of promptData.categories) {
        if (!category.id) {
            category.id = generateCategoryId();
            category.updated_at = now;  // 🔧 关键修复：更新时间戳，确保smartMerge能正确判断
            migrated = true;
            logger.info(`为分类 "${category.name}" 生成ID: ${category.id}`);
        }
    }

    if (migrated) {
        logger.info("✓ 分类数据迁移完成，已为旧数据添加ID");
    }

    return migrated;
}

// ============================================================================
// 数据同步管理器 - 处理多节点间的数据同步和智能合并
// ============================================================================

/**
 * 提示词数据同步管理器
 *
 * 功能：
 * 1. 定时轮询检查服务器数据更新（每3秒）
 * 2. 智能合并本地和服务器数据（基于时间戳）
 * 3. 管理同步状态和错误处理
 * 4. 支持暂停/恢复同步
 */
class PromptDataSyncManager {
    constructor(node) {
        this.node = node; // 关联的节点实例
        this.lastModified = null; // 上次同步的服务器时间戳
        this.syncTimer = null; // 定时器句柄
        this.syncInterval = 3000; // 同步间隔（毫秒）
        this.isSyncing = false; // 是否正在同步
        this.isPaused = false; // 是否暂停同步
        this.syncErrorCount = 0; // 连续同步错误计数
        this.maxSyncErrors = 5; // 最大连续错误数
        this.onSyncCallback = null; // 同步完成回调
        this.onErrorCallback = null; // 错误回调
    }

    /**
     * 启动定时同步
     */
    start() {
        if (this.syncTimer) {
            logger.warn("同步管理器已经在运行");
            return;
        }

        logger.info("启动数据同步管理器");
        this.isPaused = false;
        this.syncErrorCount = 0;

        // 立即执行一次同步（但不阻塞）
        this.checkForUpdates();

        // 启动定时器
        this.syncTimer = setInterval(() => {
            if (!this.isPaused && !this.isSyncing) {
                this.checkForUpdates();
            }
        }, this.syncInterval);
    }

    /**
     * 停止定时同步
     */
    stop() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
            logger.info("数据同步管理器已停止");
        }
    }

    /**
     * 暂停同步（临时）
     */
    pause() {
        this.isPaused = true;
        logger.info("数据同步已暂停");
    }

    /**
     * 恢复同步
     */
    resume() {
        this.isPaused = false;
        logger.info("数据同步已恢复");
        // 恢复时立即检查更新
        this.checkForUpdates();
    }

    /**
     * 检查服务器是否有更新
     */
    async checkForUpdates() {
        if (this.isSyncing || this.isPaused) {
            return;
        }

        this.isSyncing = true;

        try {
            // 获取服务器元数据（轻量级）
            const response = await api.fetchApi("/prompt_selector/metadata");

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const metadata = await response.json();
            const serverLastModified = metadata.last_modified;

            // 如果是首次检查，记录时间戳
            if (this.lastModified === null) {
                this.lastModified = serverLastModified;
                logger.info(`初始同步时间戳: ${serverLastModified}`);
                this.syncErrorCount = 0;
                this.isSyncing = false;
                return;
            }

            // 比较时间戳，检测是否有更新
            if (serverLastModified !== this.lastModified) {
                logger.info(`检测到服务器数据更新: ${serverLastModified}`);
                await this.syncFromServer();
                this.lastModified = serverLastModified;
            }

            this.syncErrorCount = 0; // 重置错误计数
        } catch (error) {
            this.syncErrorCount++;
            logger.error(`同步检查失败 (${this.syncErrorCount}/${this.maxSyncErrors}):`, error);

            // 如果连续错误过多，暂停同步并通知
            if (this.syncErrorCount >= this.maxSyncErrors) {
                logger.error("连续同步错误过多，暂停自动同步");
                this.pause();
                if (this.onErrorCallback) {
                    this.onErrorCallback(new Error("连续同步失败，已暂停自动同步"));
                }
            }
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * 从服务器同步最新数据并智能合并
     */
    async syncFromServer() {
        try {
            logger.info("从服务器拉取最新数据...");

            // 获取完整服务器数据
            const response = await api.fetchApi("/prompt_selector/data");
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const serverData = await response.json();

            // 执行智能合并
            const mergedData = this.smartMerge(this.node.promptData, serverData);

            // 更新节点数据
            this.node.promptData = mergedData;

            logger.info("✓ 数据同步完成");

            // 触发回调通知UI更新
            if (this.onSyncCallback) {
                this.onSyncCallback(mergedData);
            }

            // 触发自定义事件（用于UI更新）
            document.dispatchEvent(new CustomEvent('ps-data-synced', {
                detail: { data: mergedData }
            }));

        } catch (error) {
            logger.error("从服务器同步数据失败:", error);
            throw error;
        }
    }

    /**
     * 智能合并算法：基于时间戳合并本地和服务器数据
     *
     * 规则：
     * 1. 新增项目：两边都保留
     * 2. 修改项目：保留 updated_at 较新的版本
     * 3. 删除检测：如果服务器有但本地没有，比较时间戳判断是"服务器新增"还是"本地删除"
     * 4. ID 冲突：优先保留 updated_at 较新的
     *
     * @param {Object} localData - 本地数据
     * @param {Object} serverData - 服务器数据
     * @returns {Object} 合并后的数据
     */
    smartMerge(localData, serverData) {
        // 如果本地数据为空，直接使用服务器数据
        if (!localData || !localData.categories) {
            logger.info("本地数据为空，使用服务器数据");
            return serverData;
        }

        logger.info("执行智能合并...");

        const merged = {
            version: serverData.version,
            settings: { ...serverData.settings },
            last_modified: serverData.last_modified,
            categories: []
        };

        // 获取本地数据的最后修改时间（用于判断删除操作）
        const localLastModified = new Date(localData.last_modified || 0);

        // 创建服务器分类的映射（按ID，优先；如果没有ID则降级使用name）
        const serverCategoriesMap = {};
        const serverCategoriesByName = {};  // 备用：按name的映射，用于处理旧数据
        for (const serverCat of serverData.categories || []) {
            const key = serverCat.id || `name:${serverCat.name}`;  // 优先ID，降级name
            serverCategoriesMap[key] = serverCat;
            serverCategoriesByName[serverCat.name] = serverCat;  // 备用映射
        }

        // 创建本地分类的映射（按ID，优先；如果没有ID则降级使用name）
        const localCategoriesMap = {};
        const localCategoriesByName = {};  // 备用：按name的映射，用于处理旧数据
        for (const localCat of localData.categories || []) {
            const key = localCat.id || `name:${localCat.name}`;  // 优先ID，降级name
            localCategoriesMap[key] = localCat;
            localCategoriesByName[localCat.name] = localCat;  // 备用映射
        }

        // 合并所有分类（服务器 + 本地独有的）
        const allCategoryKeys = new Set([
            ...Object.keys(serverCategoriesMap),
            ...Object.keys(localCategoriesMap)
        ]);

        for (const categoryKey of allCategoryKeys) {
            const serverCat = serverCategoriesMap[categoryKey];
            const localCat = localCategoriesMap[categoryKey];

            // 情况1：仅服务器有
            if (serverCat && !localCat) {
                // 检查是"服务器新增"还是"本地删除"
                const serverCatTime = new Date(serverCat.updated_at || 0);
                if (serverCatTime > localLastModified) {
                    // 服务器分类比本地数据新 → 服务器新增的分类
                    merged.categories.push(serverCat);
                }
                // 否则：是本地删除的分类，不添加
                continue;
            }

            // 情况2：仅本地有 - 检查是"本地新建"还是"服务器删除"
            if (!serverCat && localCat) {
                const localCatTime = new Date(localCat.updated_at || 0);
                const serverLastModified = new Date(serverData.last_modified || 0);

                // 如果本地分类的时间戳 > 服务器的 last_modified
                // 说明是本地新建的（在服务器最后更新之后创建），保留
                if (localCatTime > serverLastModified) {
                    merged.categories.push(localCat);
                }
                // 否则：是服务器删除的分类（服务器在这个分类之后有更新），不添加
                continue;
            }

            // 情况3：两边都有，需要合并提示词
            // 比较分类级别的时间戳，使用更新的数据
            const serverCatTime = new Date(serverCat.updated_at || 0);
            const localCatTime = new Date(localCat.updated_at || 0);
            const useLocal = localCatTime > serverCatTime;

            const mergedCategory = {
                id: serverCat.id || localCat.id,  // 保留ID（优先服务器）
                name: useLocal ? localCat.name : serverCat.name,  // 使用更新的那边的名称（处理重命名）
                updated_at: useLocal ? localCat.updated_at : serverCat.updated_at,
                prompts: []
            };

            // 合并提示词（基于 ID）
            const serverPromptsMap = {};
            for (const prompt of serverCat.prompts || []) {
                if (prompt.id) {
                    serverPromptsMap[prompt.id] = prompt;
                }
            }

            const localPromptsMap = {};
            for (const prompt of localCat.prompts || []) {
                if (prompt.id) {
                    localPromptsMap[prompt.id] = prompt;
                }
            }

            const allPromptIds = new Set([
                ...Object.keys(serverPromptsMap),
                ...Object.keys(localPromptsMap)
            ]);

            for (const promptId of allPromptIds) {
                const serverPrompt = serverPromptsMap[promptId];
                const localPrompt = localPromptsMap[promptId];

                // 仅服务器有：检查是"服务器新增"还是"本地删除"
                if (serverPrompt && !localPrompt) {
                    const serverPromptTime = new Date(serverPrompt.updated_at || serverPrompt.created_at || 0);

                    // 如果服务器提示词的时间戳 > 本地数据的 last_modified
                    // 说明是服务器新增的，保留
                    if (serverPromptTime > localLastModified) {
                        mergedCategory.prompts.push(serverPrompt);
                    }
                    // 否则：是本地删除的提示词，不添加
                    continue;
                }

                // 仅本地有：检查是"本地新增"还是"服务器删除"
                if (!serverPrompt && localPrompt) {
                    const localPromptTime = new Date(localPrompt.updated_at || localPrompt.created_at || 0);
                    const serverLastModified = new Date(serverData.last_modified || 0);

                    // 如果本地提示词的时间戳 > 服务器的 last_modified
                    // 说明是本地新增的（在服务器最后更新之后创建），保留
                    if (localPromptTime > serverLastModified) {
                        logger.info(`[SmartMerge] 保留本地新增提示词: ${localPrompt.alias || localPrompt.prompt} (${localPromptTime.toISOString()} > ${serverLastModified.toISOString()})`);
                        mergedCategory.prompts.push(localPrompt);
                    } else {
                        logger.info(`[SmartMerge] 检测到服务器删除提示词: ${localPrompt.alias || localPrompt.prompt} (${localPromptTime.toISOString()} <= ${serverLastModified.toISOString()})`);
                    }
                    // 否则：是服务器删除的提示词（服务器在这个提示词之后有更新），不添加
                    continue;
                }

                // 两边都有：比较时间戳
                const serverTime = new Date(serverPrompt.updated_at || serverPrompt.created_at || 0);
                const localTime = new Date(localPrompt.updated_at || localPrompt.created_at || 0);

                if (serverTime >= localTime) {
                    mergedCategory.prompts.push(serverPrompt);
                } else {
                    mergedCategory.prompts.push(localPrompt);
                }
            }

            merged.categories.push(mergedCategory);
        }

        logger.info(`✓ 智能合并完成: ${merged.categories.length} 个分类`);
        return merged;
    }

    /**
     * 设置同步完成回调
     */
    onSync(callback) {
        this.onSyncCallback = callback;
    }

    /**
     * 设置错误回调
     */
    onError(callback) {
        this.onErrorCallback = callback;
    }

    /**
     * 更新本地数据的时间戳
     * 在任何本地修改操作后调用此方法，确保智能合并能正确识别本地更改
     *
     * @param {Object} promptData - 提示词数据对象
     * @param {string} categoryName - 分类名称（可选，如果提供则同时更新分类时间戳）
     * @param {string} promptId - 提示词ID（可选，如果提供则同时更新提示词时间戳）
     */
    static updateLocalTimestamps(promptData, categoryName = null, promptId = null) {
        const now = new Date().toISOString();

        // 总是更新全局 last_modified
        promptData.last_modified = now;

        // 如果指定了分类名称，更新分类的 updated_at
        if (categoryName) {
            const category = promptData.categories.find(c => c.name === categoryName);
            if (category) {
                category.updated_at = now;

                // 如果指定了提示词ID，更新提示词的 updated_at
                if (promptId) {
                    const prompt = category.prompts.find(p => p.id === promptId);
                    if (prompt) {
                        prompt.updated_at = now;
                    }
                }
            }
        }

        return now;
    }
}

// 提示词选择器节点
app.registerExtension({
    name: "Comfy.PromptSelector",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "PromptSelector") {

            // 使用全局多语言系统（prompt_selector命名空间）
            const t = (key, replacements) => {
                let text = globalMultiLanguageManager.t(`prompt_selector.${key}`);
                if (replacements) {
                    for (const k in replacements) {
                        text = text.replace(`{${k}}`, replacements[k]);
                    }
                }
                return text || key;
            };

            const updateUIText = (node) => {
                const widget = node.widgets.find(w => w.name === "prompt_selector");
                if (!widget) return;
                const root = widget.element;
                if (!root) return;

                const footer = root.querySelector(".prompt-selector-footer");
                const importBtn = footer.querySelector("#ps-import-btn");
                if (importBtn) {
                    const importSpan = importBtn.querySelector('span');
                    if (importSpan) importSpan.textContent = t('import');
                }

                const exportBtn = footer.querySelector("#ps-export-btn");
                if (exportBtn) {
                    const exportSpan = exportBtn.querySelector('span');
                    if (exportSpan) exportSpan.textContent = t('export');
                }

                const settingsBtn = footer.querySelector("#ps-settings-btn");
                if (settingsBtn) {
                    const settingsSpan = settingsBtn.querySelector('span');
                    if (settingsSpan) settingsSpan.textContent = t('settings');
                }

                const header = root.querySelector(".prompt-selector-header");
                const categoryBtn = header.querySelector("#ps-category-btn");
                if (categoryBtn) {
                    const text = categoryBtn.querySelector('span');
                    if (text) text.textContent = node.selectedCategory;
                }

                const libraryBtn = header.querySelector("#ps-library-btn");
                if (libraryBtn) {
                    const librarySpan = libraryBtn.querySelector('span');
                    if (librarySpan) librarySpan.textContent = t('library');
                }
            };


            // 节点创建时的回调
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                onNodeCreated?.apply(this, arguments);


                this.promptData = null; // 用于存储从后端获取的数据
                this.selectedCategory = "default"; // Default value, will be overwritten
                this.selectionMode = "multi"; // 'single' or 'multi'
                this.selectedPrompts = {}; // 用于按分类存储多选模式下的选中项（Map<categoryName, Set<prompt>>）
                this.promptWeights = {}; // 用于存储提示词权重（Map<categoryName, Map<prompt, weight>>）
                this.batchMode = false; // 批量操作模式
                this.selectedForBatch = new Set(); // 批量操作选中的提示诏ID
                this.currentFilter = { favorites: false, tags: [], search: "" }; // 当前过滤条件
                this.draggedItem = null; // 拖拽的项目
                this.searchTerm = ""; // 主界面搜索关键词
                this.mainSearchAutocomplete = null; // 主搜索框的自动补全实例

                // 保存队列和状态跟踪（防止并发冲突）
                this.saveQueue = Promise.resolve(); // 保存队列，确保串行保存
                this.isSaving = false; // 当前是否正在保存
                this.saveRetryCount = 0; // 保存重试计数
                this.maxSaveRetries = 3; // 最大重试次数

                // 初始化数据同步管理器（多节点数据同步）
                this.syncManager = new PromptDataSyncManager(this);
                this.syncStatus = 'idle'; // 同步状态: idle, syncing, error

                // 获取隐藏的输出小部件
                const outputWidget = this.widgets.find(w => w.name === "selected_prompts");
                if (outputWidget) {
                    // 参照 danbooru_gallery.js 的做法，通过重写 computeSize 和 draw 来彻底隐藏小部件
                    outputWidget.computeSize = () => [0, -4];
                    outputWidget.draw = () => { };
                    outputWidget.type = "hidden";
                }

                // --- 创建主容器 ---
                const mainContainer = document.createElement("div");
                mainContainer.className = "prompt-selector-main-container";

                // --- 中央内容区 (现在由模态框处理，此区域可简化或移除) ---
                const contentArea = document.createElement("div");
                contentArea.className = "prompt-selector-content-area";
                contentArea.innerHTML = `<p style="color: #555; text-align: center; margin-top: 20px;">${t('open_library_hint')}</p>`;

                // --- 顶部控制栏 ---
                const header = document.createElement("div");
                header.className = "prompt-selector-header";
                header.innerHTML = `
                    <div class="header-controls-left">
                       <button class="ps-btn" id="ps-category-btn">
                           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                           <span>default</span>
                       </button>
                        <button class="ps-btn" id="ps-library-btn">
                           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-book-2"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M19 4v16h-12a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h12z" /><path d="M19 16h-12a2 2 0 0 0 -2 2" /><path d="M9 8h6" /></svg>
                           <span>${t('library')}</span>
                        </button>
                    </div>
                    <div class="header-controls-center">
                        <div class="ps-search-container">
                            <svg class="ps-search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>
                            <input type="text" id="ps-main-search-input" class="ps-search-input" placeholder="搜索..." />
                            <button class="ps-btn ps-btn-icon ps-search-clear-btn" id="ps-search-clear-btn" style="display: none;" title="清除搜索">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                    </div>
                    <div class="header-controls-right">
                        <button class="ps-btn ps-btn-icon" id="ps-toggle-select-all-btn" title="${t('select_all')}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M3.5 5.5l1.5 1.5l2.5 -2.5"></path><path d="M3.5 11.5l1.5 1.5l2.5 -2.5"></path><path d="M3.5 17.5l1.5 1.5l2.5 -2.5"></path><path d="M11 6l9 0"></path><path d="M11 12l9 0"></path><path d="M11 18l9 0"></path></svg>
                        </button>
                    </div>
                `;


                // --- 底部控制栏 (旧版，将被移除) ---
                const footer = document.createElement("div");
                footer.className = "prompt-selector-footer";
                footer.innerHTML = `
                    <div class="footer-controls-left">
                        <button class="ps-btn ps-btn-icon" id="ps-add-btn">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </button>
                    </div>
                    <div class="footer-controls-right">
                        <button class="ps-btn" id="ps-import-btn">
                            <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            <span>${t('import')}</span>
                        </button>
                        <button class="ps-btn" id="ps-export-btn">
                            <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                            <span>${t('export')}</span>
                        </button>
                        <button class="ps-btn" id="ps-settings-btn">
                            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                            <span>${t('settings')}</span>
                        </button>
                    </div>
                `;

                mainContainer.appendChild(header);
                mainContainer.appendChild(contentArea);
                mainContainer.appendChild(footer);

                // --- 将UI添加到节点 ---
                const widget = this.addDOMWidget("prompt_selector", "div", mainContainer, {
                    shared: {},
                });

                // --- 加载数据并初始化 ---
                api.fetchApi("/prompt_selector/data")
                    .then(response => response.json())
                    .then(data => {
                        this.promptData = data;

                        // 数据迁移：为旧数据添加分类ID
                        const migrated = migrateCategoriesToId(this.promptData);
                        if (migrated) {
                            // 迁移后需要保存数据
                            this.saveData().catch(err => {
                                logger.error("迁移后保存数据失败:", err);
                            });
                        }

                        // 转换语言代码：zh-CN -> zh, en-US -> en
                        const legacyLang = this.promptData.settings?.language || "zh-CN";
                        const globalLang = legacyLang === "zh-CN" ? "zh" : "en";
                        globalMultiLanguageManager.setLanguage(globalLang, true);
                        this.applyTheme(); // 应用主题


                        // 恢复上次选择的分类
                        // 优先从节点属性中读取，实现节点独立状态
                        const nodeCategory = this.properties.selectedCategory;

                        // If the node has its own saved category, use it. Otherwise, default to "default".
                        // This prevents nodes in old workflows from all adopting the same global category.
                        this.selectedCategory = nodeCategory || "default";

                        const categoryExists = this.promptData.categories.some(c => c.name === this.selectedCategory);
                        if (!categoryExists && this.promptData.categories.length > 0) {
                            this.selectedCategory = this.promptData.categories[0].name;
                        }
                        this.properties.selectedCategory = this.selectedCategory;


                        this.updateCategoryDropdown();
                        // Restore selected prompts and weights from node properties for independent state
                        if (this.properties.selectedPrompts) {
                            try {
                                const savedSelections = JSON.parse(this.properties.selectedPrompts);
                                // 将对象或数组转换为 Set
                                for (const category in savedSelections) {
                                    const saved = savedSelections[category];
                                    const selectionSet = new Set();

                                    if (Array.isArray(saved)) {
                                        // 兼容旧版本：数组格式
                                        saved.forEach(prompt => {
                                            selectionSet.add(prompt);
                                        });
                                    } else if (typeof saved === 'object') {
                                        // 新版本：对象格式，只取key作为选中项
                                        for (const prompt in saved) {
                                            selectionSet.add(prompt);
                                        }
                                    }

                                    if (selectionSet.size > 0) {
                                        this.selectedPrompts[category] = selectionSet;
                                    }
                                }
                            } catch (e) {
                                logger.error(`[PromptSelector #${this.id}] Failed to parse saved selections:`, e);
                                this.selectedPrompts = {};
                            }
                        } else {
                            // If no selections are saved in the node, start with a clean slate.
                            this.selectedPrompts = {};
                        }

                        // Restore weights from node properties
                        if (this.properties.promptWeights) {
                            try {
                                const savedWeights = JSON.parse(this.properties.promptWeights);
                                for (const category in savedWeights) {
                                    const weightsObj = savedWeights[category];
                                    if (typeof weightsObj === 'object') {
                                        const weightsMap = new Map();
                                        for (const prompt in weightsObj) {
                                            weightsMap.set(prompt, weightsObj[prompt] || 1);
                                        }
                                        if (weightsMap.size > 0) {
                                            this.promptWeights[category] = weightsMap;
                                        }
                                    }
                                }
                            } catch (e) {
                                logger.error(`[PromptSelector #${this.id}] Failed to parse saved weights:`, e);
                                this.promptWeights = {};
                            }
                        } else {
                            this.promptWeights = {};
                        }
                        this.renderContent();
                        this.updateOutput(); // 更新一次初始输出
                        updateUIText(this);

                        // 启动数据同步管理器（自动检测多节点间的数据变更）
                        logger.info("启动数据同步管理器...");

                        // 设置同步完成回调（更新UI）
                        this.syncManager.onSync((mergedData) => {
                            logger.info("同步完成，刷新UI");
                            this.syncStatus = 'idle';

                            // 更新本地 promptData（关键！）
                            this.promptData = mergedData;

                            // 检查当前分类是否还存在
                            const categoryExists = mergedData.categories.some(c => c.name === this.selectedCategory);
                            if (!categoryExists && mergedData.categories.length > 0) {
                                this.selectedCategory = mergedData.categories[0].name;
                                this.properties.selectedCategory = this.selectedCategory;
                            }

                            // 刷新UI
                            this.updateCategoryDropdown();
                            this.renderContent();
                            this.updateOutput();
                        });

                        // 设置错误回调
                        this.syncManager.onError((error) => {
                            logger.error("同步错误:", error);
                            this.syncStatus = 'error';
                            this.showToast('数据同步失败，已暂停自动同步', 'error');
                        });

                        // 启动自动同步
                        this.syncManager.start();
                    })
                    .catch(error => {
                        logger.error("加载提示词数据失败:", error);
                        contentArea.innerHTML = `<p style="color: #c53939; text-align: center;">${t('load_error')}</p>`;
                    });

                // --- 事件监听 ---

                const addBtn = footer.querySelector("#ps-add-btn");
                addBtn.addEventListener("click", () => {
                    this.showEditModal({ alias: '', prompt: '' }, this.selectedCategory, true);
                });

                // Delete button is now per-item, so the global one is removed.

                const iconSelectAll = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M3.5 5.5l1.5 1.5l2.5 -2.5"></path><path d="M3.5 11.5l1.5 1.5l2.5 -2.5"></path><path d="M3.5 17.5l1.5 1.5l2.5 -2.5"></path><path d="M11 6l9 0"></path><path d="M11 12l9 0"></path><path d="M11 18l9 0"></path></svg>`;
                const iconDeselectAll = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>`;

                this.updateSelectAllButtonState = () => {
                    const toggleBtn = header.querySelector("#ps-toggle-select-all-btn");
                    if (!toggleBtn || !this.promptData) return;

                    const category = this.promptData.categories.find(c => c.name === this.selectedCategory);
                    const promptsInCategory = category ? category.prompts : [];
                    if (promptsInCategory.length === 0) {
                        toggleBtn.style.display = 'none';
                        return;
                    }
                    toggleBtn.style.display = 'flex';

                    const categorySelections = this.selectedPrompts[this.selectedCategory];
                    const allSelected = promptsInCategory.length > 0 && promptsInCategory.every(p =>
                        categorySelections instanceof Set && categorySelections.has(p.prompt)
                    );

                    if (allSelected) {
                        toggleBtn.innerHTML = iconDeselectAll;
                        toggleBtn.title = t('deselect_all');
                    } else {
                        toggleBtn.innerHTML = iconSelectAll;
                        toggleBtn.title = t('select_all');
                    }
                };

                const toggleBtn = header.querySelector("#ps-toggle-select-all-btn");
                toggleBtn.addEventListener("click", () => {
                    const category = this.promptData.categories.find(c => c.name === this.selectedCategory);
                    if (!category || !category.prompts) return;

                    const promptsInCategory = category.prompts;
                    let categorySelections = this.selectedPrompts[this.selectedCategory];
                    if (!(categorySelections instanceof Set)) {
                        categorySelections = new Set();
                        this.selectedPrompts[this.selectedCategory] = categorySelections;
                    }

                    const allSelected = promptsInCategory.length > 0 && promptsInCategory.every(p => categorySelections.has(p.prompt));

                    if (allSelected) {
                        // Deselect all in current category
                        promptsInCategory.forEach(p => categorySelections.delete(p.prompt));
                    } else {
                        // Select all in current category
                        promptsInCategory.forEach(p => categorySelections.add(p.prompt));
                    }
                    this.renderContent();
                    this.updateOutput();
                });

                const libraryButton = header.querySelector("#ps-library-btn");
                libraryButton.addEventListener("click", () => {
                    this.showLibraryModal();
                });

                this.checkPromptInLibrary = () => {
                    const textWidget = this.widgets.find(w => w.type === 'text' || w.type === 'string');
                    if (!textWidget || !this.promptData) return;
                    const currentPrompt = textWidget.value;
                    const allPrompts = this.promptData.categories.flatMap(c => c.prompts);
                    const isInLibrary = allPrompts.some(p => p.prompt === currentPrompt);

                    if (isInLibrary) {
                        libraryButton.classList.add('highlight');
                    } else {
                        libraryButton.classList.remove('highlight');
                    }
                };

                const settingsBtn = footer.querySelector("#ps-settings-btn");
                settingsBtn.addEventListener("click", () => {
                    this.showSettingsModal();
                });

                const categoryBtn = header.querySelector("#ps-category-btn");
                categoryBtn.addEventListener("click", (e) => {
                    this.showCategoryMenu(e.currentTarget);
                });

                // Re-add hover preview to the main category button
                // categoryBtn.addEventListener("mouseenter", (e) => {
                //
                //     if (this.hidePreviewTimeout) {
                //         clearTimeout(this.hidePreviewTimeout);
                //         this.hidePreviewTimeout = null;
                //     }
                //     // Only show preview if the menu is not open
                //     if (!document.querySelector(".ps-category-menu")) {
                //         this.showAllActivePromptsPreview(e.currentTarget);
                //     }
                // });
                // categoryBtn.addEventListener("mouseleave", () => {
                //     this.hidePreviewTimeout = setTimeout(() => {
                //         this.hideActivePromptsPreview();
                //     }, 100);
                // });

                // --- 主搜索框事件监听器 ---
                const mainSearchInput = header.querySelector("#ps-main-search-input");
                const searchClearBtn = header.querySelector("#ps-search-clear-btn");

                // 创建标签格式化函数
                const formatTagWithGallerySettings = (tag) => {
                    // 从localStorage读取画廊的格式化设置
                    let formattingSettings = { escapeBrackets: true, replaceUnderscores: true };
                    try {
                        const savedFormatting = localStorage.getItem('formatting');
                        if (savedFormatting) {
                            const parsed = JSON.parse(savedFormatting);
                            if (parsed && typeof parsed === 'object') {
                                formattingSettings = { ...formattingSettings, ...parsed };
                            }
                        }
                    } catch (e) {
                        logger.warn('[PromptSelector] 读取格式化设置失败:', e);
                    }

                    // 应用格式化逻辑
                    let processedTag = tag;
                    if (formattingSettings.replaceUnderscores) {
                        processedTag = processedTag.replace(/_/g, ' ');
                    }
                    if (formattingSettings.escapeBrackets) {
                        processedTag = processedTag.replaceAll('(', '\\(').replaceAll(')', '\\)');
                    }
                    return processedTag;
                };

                // 创建AutocompleteUI实例
                this.mainSearchAutocomplete = new AutocompleteUI({
                    inputElement: mainSearchInput,
                    language: globalMultiLanguageManager.getLanguage(),
                    maxSuggestions: 10,
                    customClass: 'prompt-selector-main-search-autocomplete',
                    formatTag: formatTagWithGallerySettings
                });

                // 搜索框输入事件（使用防抖）
                let searchTimeout;
                mainSearchInput.addEventListener('input', (e) => {
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(() => {
                        this.searchTerm = e.target.value.toLowerCase();
                        this.renderContent();

                        // 显示/隐藏清除按钮
                        if (this.searchTerm) {
                            searchClearBtn.style.display = 'flex';
                        } else {
                            searchClearBtn.style.display = 'none';
                        }
                    }, 300);
                });

                // 清除搜索按钮
                searchClearBtn.addEventListener('click', () => {
                    mainSearchInput.value = '';
                    this.searchTerm = '';
                    searchClearBtn.style.display = 'none';
                    this.renderContent();
                    mainSearchInput.focus();
                });

                // ESC键清除搜索
                mainSearchInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape' && this.searchTerm) {
                        e.preventDefault();
                        mainSearchInput.value = '';
                        this.searchTerm = '';
                        searchClearBtn.style.display = 'none';
                        this.renderContent();
                    }
                });


                const importBtn = footer.querySelector("#ps-import-btn");
                importBtn.addEventListener("click", () => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".zip";
                    input.onchange = async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;

                        const formData = new FormData();
                        formData.append("zip_file", file);

                        try {
                            this.showToast("正在预解析文件...", 'info');
                            const response = await api.fetchApi("/prompt_selector/pre_import", {
                                method: "POST",
                                body: formData,
                            });

                            if (response.ok) {
                                const { categories } = await response.json();
                                this.showImportModal(file, categories);
                            } else {
                                const error = await response.json();
                                throw new Error(error.error || "预解析失败");
                            }
                        } catch (error) {
                            this.showToast(`导入失败: ${error.message}`, 'error');
                        }
                    };
                    input.click();
                });

                const exportBtn = footer.querySelector("#ps-export-btn");
                exportBtn.addEventListener("click", () => {
                    window.open("/prompt_selector/export", "_blank");
                });


                // --- 核心方法 ---
                this.updateCategoryDropdown = () => {
                    const categoryBtn = header.querySelector("#ps-category-btn");
                    if (categoryBtn) {
                        const text = categoryBtn.querySelector('span:not(.ps-total-count-badge)');
                        if (text) {
                            text.textContent = this.selectedCategory;
                            // 
                        }

                        // Remove old count badge if it exists
                        const existingBadge = categoryBtn.querySelector('.ps-total-count-badge');
                        if (existingBadge) {
                            existingBadge.remove();
                        }

                        // Calculate total active prompts
                        let totalActiveCount = 0;
                        if (this.selectedPrompts) {
                            for (const categoryName in this.selectedPrompts) {
                                totalActiveCount += this.selectedPrompts[categoryName].size;
                            }
                        }

                        // Add new count badge if needed
                        if (totalActiveCount > 0) {
                            const countBadge = document.createElement("span");
                            countBadge.className = "ps-total-count-badge";
                            countBadge.innerHTML = `<span class="ps-count-number">${totalActiveCount}</span><span class="ps-delete-icon">×</span>`;
                            categoryBtn.appendChild(countBadge);

                            // Add hover events to the badge itself
                            countBadge.addEventListener("mouseenter", (e) => {

                                if (this.hidePreviewTimeout) {
                                    clearTimeout(this.hidePreviewTimeout);
                                    this.hidePreviewTimeout = null;
                                }
                                this.showAllActivePromptsPreview(e.currentTarget);
                            });
                            countBadge.addEventListener("mouseleave", () => {
                                this.hidePreviewTimeout = setTimeout(() => {
                                    this.hideActivePromptsPreview();
                                }, 100);
                            });
                            // Add click event to clear all selections
                            countBadge.addEventListener("click", (e) => {
                                e.stopPropagation();
                                this.clearSelection(); // Clear all selections
                            });
                        }
                    }
                };

                this.renderContent = () => {
                    const contentArea = mainContainer.querySelector(".prompt-selector-content-area");
                    if (!contentArea) return;
                    contentArea.innerHTML = ''; // Clear it

                    if (!this.promptData) {
                        contentArea.innerHTML = `<p style="color: #c53939; text-align: center;">${t('loading')}</p>`;
                        return;
                    }

                    const category = this.promptData.categories.find(c => c.name === this.selectedCategory);
                    if (!category || !category.prompts || category.prompts.length === 0) {
                        contentArea.innerHTML = `<p style="color: #555; text-align: center;">${t('no_prompts')}</p>`;
                        return;
                    }

                    // 应用搜索过滤
                    let promptsToShow = category.prompts;
                    if (this.searchTerm && this.searchTerm.trim()) {
                        const searchLower = this.searchTerm.trim();
                        promptsToShow = category.prompts.filter(p => {
                            const searchInAlias = (p.alias || '').toLowerCase().includes(searchLower);
                            const searchInPrompt = (p.prompt || '').toLowerCase().includes(searchLower);
                            return searchInAlias || searchInPrompt;
                        });
                    }

                    // 如果搜索后没有结果
                    if (promptsToShow.length === 0) {
                        if (this.searchTerm && this.searchTerm.trim()) {
                            contentArea.innerHTML = `<p style="color: #555; text-align: center;">未找到匹配的提示词</p>`;
                        } else {
                            contentArea.innerHTML = `<p style="color: #555; text-align: center;">${t('no_prompts')}</p>`;
                        }
                        return;
                    }

                    const list = document.createElement("ul");
                    list.className = "prompt-list";

                    promptsToShow.forEach((p, index) => {
                        const item = document.createElement("li");
                        item.className = "prompt-item";
                        item.draggable = true; // 允许拖动

                        const textContainer = document.createElement("div");
                        textContainer.className = "prompt-text-container";

                        const aliasSpan = document.createElement("span");
                        aliasSpan.className = "prompt-item-alias";
                        aliasSpan.textContent = p.alias || p.prompt;
                        textContainer.appendChild(aliasSpan);

                        if (p.alias && p.alias !== p.prompt) {
                            const promptSpan = document.createElement("span");
                            promptSpan.className = "prompt-item-full-prompt";
                            promptSpan.textContent = p.prompt;
                            textContainer.appendChild(promptSpan);
                        }

                        const controlsContainer = document.createElement("div");
                        controlsContainer.className = "prompt-item-controls-wrapper";

                        // 权重输入框(新增) - 移到末尾,位置固定
                        const weightInput = document.createElement("input");
                        weightInput.type = "text";
                        weightInput.className = "ps-weight-input";
                        weightInput.setAttribute('aria-label', '提示词权重');
                        weightInput.placeholder = "1";
                        weightInput.title = "输入权重 (Enter应用)";

                        // 从 promptWeights 获取权重值(与选中状态无关)
                        let categoryWeights = this.promptWeights[this.selectedCategory];
                        if (!categoryWeights) {
                            categoryWeights = new Map();
                            this.promptWeights[this.selectedCategory] = categoryWeights;
                        }
                        const currentWeight = categoryWeights.get(p.prompt) || 1;
                        if (currentWeight !== 1) {
                            weightInput.value = currentWeight.toFixed(2).replace(/\.?0+$/, '');
                        }

                        const editBtn = document.createElement("button");
                        editBtn.className = "ps-item-edit-btn";
                        editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;

                        const deleteBtn = document.createElement("button");
                        deleteBtn.className = "ps-item-delete-btn";
                        deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v6"></path></svg>`;

                        const copyBtn = document.createElement("button");
                        copyBtn.className = "ps-item-copy-btn";
                        copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
                        copyBtn.title = t('copy_prompt');

                        controlsContainer.appendChild(copyBtn);
                        controlsContainer.appendChild(editBtn);
                        controlsContainer.appendChild(deleteBtn);
                        controlsContainer.appendChild(weightInput);

                        item.appendChild(textContainer);
                        item.appendChild(controlsContainer);

                        // --- 权重输入框事件处理 ---

                        // 验证并格式化权重值
                        const validateWeight = (value) => {
                            if (value === '' || value === null || value === undefined) {
                                return null; // 空值表示移除权重
                            }
                            let num = parseFloat(value);
                            if (isNaN(num)) return 1; // 非数字返回默认值
                            num = Math.max(0, Math.min(20, num)); // 限制范围 0-20
                            return Math.round(num * 100) / 100; // 保留两位小数
                        };

                        // 应用权重到数据(与选中状态无关)
                        const applyWeight = (weight) => {
                            let categoryWeights = this.promptWeights[this.selectedCategory];
                            if (!categoryWeights) {
                                categoryWeights = new Map();
                                this.promptWeights[this.selectedCategory] = categoryWeights;
                            }

                            if (weight === null || weight === 1) {
                                // 权重为空或1,设置为默认权重1
                                categoryWeights.set(p.prompt, 1);
                            } else {
                                // 设置自定义权重
                                categoryWeights.set(p.prompt, weight);
                            }

                            this.updateOutput();

                            // 短暂高亮提示已应用
                            weightInput.style.borderColor = 'var(--ps-theme-color)';
                            setTimeout(() => {
                                weightInput.style.borderColor = '';
                            }, 300);
                        };

                        // 输入验证（实时）
                        weightInput.addEventListener('input', (e) => {
                            const value = e.target.value;
                            // 允许空值、数字、小数点
                            if (value !== '' && !/^\d*\.?\d{0,2}$/.test(value)) {
                                e.target.value = e.target.value.slice(0, -1);
                            }
                        });

                        // 失焦时应用权重
                        weightInput.addEventListener('blur', (e) => {
                            const weight = validateWeight(e.target.value);
                            if (weight !== null && weight !== 1) {
                                e.target.value = weight.toFixed(2).replace(/\.?0+$/, '');
                            } else {
                                e.target.value = '';
                            }
                            applyWeight(weight);
                        });

                        // 聚焦时全选文本
                        weightInput.addEventListener('focus', (e) => {
                            e.target.select();
                        });

                        // Enter键应用权重
                        weightInput.addEventListener('keydown', (e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                e.stopPropagation();
                                const weight = validateWeight(e.target.value);
                                if (weight !== null && weight !== 1) {
                                    e.target.value = weight.toFixed(2).replace(/\.?0+$/, '');
                                } else {
                                    e.target.value = '';
                                }
                                applyWeight(weight);
                                e.target.blur(); // 失去焦点
                            }
                        });

                        // 阻止权重输入框触发选择/取消选择
                        weightInput.addEventListener('click', (e) => {
                            e.stopPropagation();
                        });

                        // --- Hover Tooltip Logic ---
                        item.addEventListener('mouseenter', (e) => {
                            const aliasEl = item.querySelector('.prompt-item-alias');
                            const promptEl = item.querySelector('.prompt-item-full-prompt');
                            // Always show tooltip for now to ensure the mechanism works
                            this.showPromptTooltip(e, p);
                        });

                        item.addEventListener('mouseleave', (e) => {
                            this.hidePromptTooltip();
                        });


                        // --- Drag and Drop Logic ---
                        item.addEventListener('dragstart', (e) => {
                            this.draggedItem = { id: p.id, index: index };
                            e.dataTransfer.effectAllowed = 'move';
                            item.classList.add('dragging');
                        });

                        item.addEventListener('dragend', (e) => {
                            item.classList.remove('dragging');
                            this.draggedItem = null;
                        });

                        item.addEventListener('dragover', (e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            const rect = item.getBoundingClientRect();
                            const midY = rect.top + rect.height / 2;
                            if (e.clientY < midY) {
                                item.classList.remove('drag-over-bottom');
                                item.classList.add('drag-over-top');
                            } else {
                                item.classList.remove('drag-over-top');
                                item.classList.add('drag-over-bottom');
                            }
                        });

                        item.addEventListener('dragleave', () => {
                            item.classList.remove('drag-over-top', 'drag-over-bottom');
                        });

                        item.addEventListener('drop', (e) => {
                            e.preventDefault();
                            item.classList.remove('drag-over-top', 'drag-over-bottom');
                            if (this.draggedItem && this.draggedItem.id !== p.id) {
                                const fromIndex = this.draggedItem.index;
                                let toIndex = index;

                                const rect = item.getBoundingClientRect();
                                const midY = rect.top + rect.height / 2;
                                if (e.clientY > midY) {
                                    toIndex++;
                                }

                                if (fromIndex < toIndex) {
                                    toIndex--;
                                }

                                this.reorderPrompts(this.selectedCategory, fromIndex, toIndex);
                                this.renderContent(); // Re-render to show new order
                            }
                            this.draggedItem = null;
                        });


                        item.addEventListener('click', (e) => {
                            this.hidePromptTooltip(); // 在处理点击前，强制隐藏悬浮提示
                            // 忽略拖拽带起的点击事件
                            if (e.target.closest('.ps-item-edit-btn, .ps-item-delete-btn, .ps-item-copy-btn, .ps-weight-input')) {
                                return;
                            }
                            if (item.classList.contains('dragging')) {
                                return;
                            }

                            const promptValue = p.prompt;
                            if (this.selectionMode === 'single') {
                                const categorySelections = this.selectedPrompts[this.selectedCategory];
                                const isCurrentlySelected = categorySelections instanceof Set && categorySelections.has(promptValue);

                                // In single select mode, only one item can be selected across ALL categories.
                                // So, first, we clear everything.
                                this.selectedPrompts = {};

                                // If the clicked item was not the one selected before, we select it.
                                // If it was already selected, the clear operation above has already deselected it.
                                if (!isCurrentlySelected) {
                                    const newSet = new Set();
                                    newSet.add(promptValue);
                                    this.selectedPrompts[this.selectedCategory] = newSet;
                                }
                            } else { // multi
                                let categorySelections = this.selectedPrompts[this.selectedCategory];
                                if (!(categorySelections instanceof Set)) {
                                    categorySelections = new Set();
                                    this.selectedPrompts[this.selectedCategory] = categorySelections;
                                }

                                if (categorySelections.has(promptValue)) {
                                    // 取消选中
                                    categorySelections.delete(promptValue);
                                } else {
                                    // 选中
                                    categorySelections.add(promptValue);
                                }
                            }
                            this.renderContent(); // Re-render to update selection state
                            this.updateOutput();
                        });

                        copyBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(p.prompt).then(() => {
                                this.showToast(t('copy_success'));
                            });
                        });

                        editBtn.addEventListener('click', (e) => {
                            e.stopPropagation(); // Prevent item's click event
                            this.showEditModal(p, this.selectedCategory, false);
                        });

                        deleteBtn.addEventListener('click', (e) => {
                            e.stopPropagation(); // Prevent item's click event
                            this.showConfirmModal(t('delete_prompt_confirm', { prompt: p.alias || p.prompt }), () => {
                                // 调用统一的 deletePrompt 方法（会调用后端API并重新拉取数据）
                                this.deletePrompt(this.selectedCategory, p.id);
                            });
                        });

                        if (this.selectedPrompts[this.selectedCategory] instanceof Set &&
                            this.selectedPrompts[this.selectedCategory].has(p.prompt)) {
                            item.classList.add('selected');
                        }

                        list.appendChild(item);
                    });

                    contentArea.appendChild(list);
                    this.updateSelectAllButtonState();
                };

                this.updateOutput = () => {
                    const separator = this.promptData.settings?.separator || ", ";
                    const allSelected = [];
                    // 按照分类在promptData中的顺序合并，以保持输出的稳定性
                    this.promptData.categories.forEach(cat => {
                        const selectionSet = this.selectedPrompts[cat.name];
                        const categoryWeights = this.promptWeights[cat.name];

                        if (selectionSet instanceof Set && selectionSet.size > 0) {
                            // 按照提示词在分类中的顺序排序
                            cat.prompts.forEach(p => {
                                if (selectionSet.has(p.prompt)) {
                                    const weight = categoryWeights instanceof Map ? (categoryWeights.get(p.prompt) || 1) : 1;
                                    let formattedPrompt = p.prompt;

                                    // 根据权重格式化提示词
                                    if (weight !== undefined && weight !== null && weight !== 1 && weight !== 1.0) {
                                        // 权重非1，添加括号和权重
                                        const weightStr = weight.toFixed(2).replace(/\.?0+$/, '');
                                        formattedPrompt = `(${p.prompt}:${weightStr})`;
                                    }

                                    allSelected.push(formattedPrompt);
                                }
                            });
                        }
                    });

                    const outputString = allSelected.join(separator);
                    outputWidget.value = outputString;

                    // Serialize the selectedPrompts (Set) for saving in properties
                    const serializableSelections = {};
                    for (const category in this.selectedPrompts) {
                        const selectionSet = this.selectedPrompts[category];
                        if (selectionSet instanceof Set && selectionSet.size > 0) {
                            const arr = Array.from(selectionSet);
                            serializableSelections[category] = arr;
                        }
                    }
                    this.properties.selectedPrompts = JSON.stringify(serializableSelections);

                    // Serialize the promptWeights (Map) for saving in properties
                    const serializableWeights = {};
                    for (const category in this.promptWeights) {
                        const weightsMap = this.promptWeights[category];
                        if (weightsMap instanceof Map && weightsMap.size > 0) {
                            const obj = {};
                            weightsMap.forEach((weight, prompt) => {
                                obj[prompt] = weight;
                            });
                            serializableWeights[category] = obj;
                        }
                    }
                    this.properties.promptWeights = JSON.stringify(serializableWeights);

                    this.updateCategoryDropdown();
                };

                this.clearSelection = (categoryName = null) => {
                    this.hideActivePromptsPreview(); // Hide tooltip immediately
                    if (categoryName) {
                        // Clear selection for a specific category (no confirmation)
                        if (this.selectedPrompts[categoryName]) {
                            this.selectedPrompts[categoryName].clear();
                        }

                        // Instead of re-rendering the whole menu, just find and remove the badge
                        const menu = document.querySelector(".ps-category-menu");
                        if (menu) {
                            const li = menu.querySelector(`li[data-full-name="${categoryName}"]`);
                            if (li) {
                                const badge = li.querySelector('.ps-category-count');
                                if (badge) {
                                    badge.remove();
                                }
                            }
                        }
                        this.renderContent();
                        this.updateOutput();
                    } else {
                        // Clear all selections (with confirmation)
                        this.showConfirmModal(t('clear_all_confirm'), () => {
                            this.selectedPrompts = {};
                            // Manually close the category menu if it's open
                            const existingMenu = document.querySelector(".ps-category-menu");
                            if (existingMenu) {
                                existingMenu.remove();
                                const categoryBtn = header.querySelector("#ps-category-btn");
                                if (categoryBtn) categoryBtn.classList.remove("open");
                            }
                            this.renderContent();
                            this.updateOutput();
                        });
                    }
                };

                /**
                 * 保存数据到服务器（使用队列机制防止并发冲突 + 智能合并）
                 *
                 * 保存流程：
                 * 1. 暂停自动同步
                 * 2. 从服务器拉取最新数据
                 * 3. 执行智能合并（本地修改 + 服务器最新数据）
                 * 4. 保存合并后的数据
                 * 5. 恢复自动同步
                 *
                 * @returns {Promise} 保存操作的 Promise
                 */
                this.saveData = () => {
                    // 将保存操作加入队列，确保串行执行
                    this.saveQueue = this.saveQueue.then(async () => {
                        // 设置保存状态
                        this.isSaving = true;
                        this.saveRetryCount = 0;

                        // 暂停自动同步（避免在保存过程中发生同步）
                        if (this.syncManager) {
                            this.syncManager.pause();
                        }

                        const attemptSave = async (retryCount = 0) => {
                            try {
                                logger.info(`开始保存数据（尝试 ${retryCount + 1}/${this.maxSaveRetries + 1}）...`);

                                // === 步骤1：拉取服务器最新数据 ===
                                logger.info("正在拉取服务器最新数据以执行智能合并...");
                                const serverResponse = await api.fetchApi("/prompt_selector/data");

                                if (!serverResponse.ok) {
                                    throw new Error(`拉取服务器数据失败: HTTP ${serverResponse.status}`);
                                }

                                const serverData = await serverResponse.json();

                                // === 步骤2：智能合并本地和服务器数据 ===
                                logger.info("执行智能合并（本地修改 + 服务器最新）...");
                                const mergedData = this.syncManager.smartMerge(this.promptData, serverData);

                                // 更新本地数据为合并后的结果
                                this.promptData = mergedData;

                                // === 步骤3：保存合并后的数据 ===
                                logger.info("保存合并后的数据到服务器...");
                                const saveResponse = await api.fetchApi("/prompt_selector/data", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify(mergedData),
                                });

                                if (!saveResponse.ok) {
                                    const errorText = await saveResponse.text();
                                    throw new Error(`HTTP ${saveResponse.status}: ${errorText}`);
                                }

                                const saveResult = await saveResponse.json();

                                // 使用服务器返回的最新数据更新本地状态（包含所有更新后的时间戳）
                                if (saveResult.success && saveResult.data) {
                                    this.promptData = saveResult.data;

                                    // 更新同步管理器的时间戳
                                    if (this.syncManager) {
                                        this.syncManager.lastModified = saveResult.data.last_modified;
                                    }

                                    logger.info(`✓ 数据已保存并更新，last_modified: ${saveResult.data.last_modified}`);
                                } else {
                                    // 兼容旧版本响应格式
                                    if (saveResult.last_modified && this.syncManager) {
                                        this.syncManager.lastModified = saveResult.last_modified;
                                    }
                                    logger.info("✓ 数据保存成功（含智能合并）");
                                }
                                this.isSaving = false;

                                // 恢复自动同步
                                if (this.syncManager) {
                                    this.syncManager.resume();
                                }

                                return true;

                            } catch (error) {
                                logger.error(`✗ 保存失败（尝试 ${retryCount + 1}）:`, error);

                                // 如果还有重试机会，使用指数退避策略重试
                                if (retryCount < this.maxSaveRetries) {
                                    const delayMs = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
                                    logger.warn(`将在 ${delayMs}ms 后重试...`);
                                    await new Promise(resolve => setTimeout(resolve, delayMs));
                                    return attemptSave(retryCount + 1);
                                } else {
                                    // 重试次数用尽，显示错误
                                    this.showToast(t('save_error'), 'error');
                                    this.isSaving = false;

                                    // 恢复自动同步（即使保存失败）
                                    if (this.syncManager) {
                                        this.syncManager.resume();
                                    }

                                    throw error;
                                }
                            }
                        };

                        return attemptSave();
                    }).catch(error => {
                        // 最终失败处理
                        logger.error("数据保存最终失败:", error);
                        this.isSaving = false;

                        // 确保恢复自动同步
                        if (this.syncManager) {
                            this.syncManager.resume();
                        }

                        // 不再抛出错误，避免影响队列
                    });

                    return this.saveQueue;
                };

                this.saveLastCategory = (categoryName) => {
                    this.properties.selectedCategory = categoryName;
                };

                this.showCategoryMenu = (button, isRefresh = false, searchTerm = '') => {
                    const existingMenu = document.querySelector(".ps-category-menu");

                    // If it's not a refresh, toggle the menu
                    if (!isRefresh && existingMenu) {
                        existingMenu.remove();
                        button.classList.remove("open");
                        if (button.clickOutsideHandler) {
                            document.removeEventListener("click", button.clickOutsideHandler, true);
                            button.clickOutsideHandler = null;
                        }
                        this.hideActivePromptsPreview();
                        return;
                    }

                    if (existingMenu) {
                        existingMenu.remove();
                    }


                    const closeMenu = () => {
                        const menu = document.querySelector(".ps-category-menu");
                        if (menu) {
                            menu.remove();
                        }
                        button.classList.remove("open");
                        if (button.clickOutsideHandler) {
                            document.removeEventListener("click", button.clickOutsideHandler, true);
                            button.clickOutsideHandler = null;
                        }
                        this.hideActivePromptsPreview();
                    };


                    button.classList.add("open");
                    const menu = document.createElement("div");
                    menu.className = "ps-category-menu";

                    const searchInput = document.createElement("input");
                    searchInput.type = "text";
                    searchInput.placeholder = "搜索类别...";
                    searchInput.value = searchTerm; // Restore search term on refresh
                    const categoryTree = this.buildCategoryTree(this.promptData.categories);
                    const treeContainer = document.createElement('div');
                    treeContainer.className = 'ps-category-tree';
                    const treeElement = this.renderCategoryTree(categoryTree, treeContainer, (node) => {
                        this.selectedCategory = node.fullName;
                        this.properties.selectedCategory = node.fullName; // 保存到节点属性
                        this.updateCategoryDropdown();
                        this.renderContent();
                        closeMenu();
                    });
                    treeContainer.appendChild(treeElement);

                    searchInput.addEventListener("input", (e) => {
                        const currentSearchTerm = e.target.value.toLowerCase();
                        const allItems = ul.querySelectorAll("li");
                        allItems.forEach(li => {
                            const categoryName = li.dataset.fullName.toLowerCase();
                            const match = categoryName.includes(currentSearchTerm);
                            li.style.display = match ? "" : "none";

                            if (!currentSearchTerm) {
                                li.classList.remove('open');
                            } else if (match) {
                                let parent = li.parentElement.closest('li.parent');
                                while (parent) {
                                    parent.classList.add('open');
                                    parent.style.display = "";
                                    parent = parent.parentElement.closest('li.parent');
                                }
                            }
                        });
                    });

                    // Trigger filtering on refresh
                    if (searchTerm) {
                        setTimeout(() => searchInput.dispatchEvent(new Event('input')), 0);
                    }

                    menu.appendChild(searchInput);
                    menu.appendChild(treeContainer);
                    document.body.appendChild(menu);

                    const rect = button.getBoundingClientRect();
                    menu.style.left = `${rect.left}px`;
                    menu.style.top = `${rect.bottom + 5}px`;

                    menu.addEventListener("mouseleave", () => {
                        this.hideActivePromptsPreview();
                    });

                    const clickOutsideHandler = (event) => {
                        if (!menu.contains(event.target) && !button.contains(event.target)) {
                            closeMenu();
                        }
                    };

                    // Only add the outside click handler if it's not a refresh
                    if (!isRefresh) {
                        button.clickOutsideHandler = clickOutsideHandler;
                        document.addEventListener("click", clickOutsideHandler, true);
                    }
                };


                this.hideActivePromptsPreview = () => {
                    const previewBoxes = document.querySelectorAll(".ps-active-prompts-preview");
                    if (previewBoxes.length > 0) {
                        previewBoxes.forEach(p => p.remove());
                    }
                };

                this.showActivePromptsPreview = (categoryName, targetElement) => {
                    this.hideActivePromptsPreview(); // Ensure no multiple tooltips

                    const activePromptDetails = [];
                    if (this.promptData && this.selectedPrompts) {
                        for (const catName in this.selectedPrompts) {
                            if (catName === categoryName || catName.startsWith(categoryName + '/')) {
                                const selectionSet = this.selectedPrompts[catName];
                                if (selectionSet && selectionSet.size > 0) {
                                    const category = this.promptData.categories.find(c => c.name === catName);
                                    if (category) {
                                        const details = category.prompts
                                            .filter(p => selectionSet.has(p.prompt))
                                            .map(p => ({ category: catName, text: p.alias || p.prompt }));
                                        activePromptDetails.push(...details);
                                    }
                                }
                            }
                        }
                    }


                    if (activePromptDetails.length === 0) return;

                    const previewBox = document.createElement("div");
                    previewBox.className = "ps-active-prompts-preview";

                    const ul = document.createElement("ul");
                    activePromptDetails.forEach(promptInfo => {
                        const li = document.createElement("li");
                        const displayCategory = promptInfo.category.startsWith(categoryName + '/')
                            ? '...' + promptInfo.category.substring(categoryName.length)
                            : (promptInfo.category !== categoryName ? `[${promptInfo.category}]` : '');

                        li.innerHTML = `${displayCategory ? `<span class="ps-preview-category">${displayCategory}</span> ` : ''}${promptInfo.text}`;
                        ul.appendChild(li);
                    });
                    previewBox.appendChild(ul);

                    // Prevent preview from hiding when mouse enters it
                    previewBox.addEventListener("mouseenter", () => {
                        if (this.hidePreviewTimeout) {
                            clearTimeout(this.hidePreviewTimeout);
                            this.hidePreviewTimeout = null;
                        }
                    });
                    previewBox.addEventListener("mouseleave", () => {
                        this.hideActivePromptsPreview();
                    });

                    document.body.appendChild(previewBox);

                    const targetRect = targetElement.getBoundingClientRect();
                    const menu = document.querySelector(".ps-category-menu");
                    const menuRect = menu ? menu.getBoundingClientRect() : targetRect;

                    previewBox.style.left = `${targetRect.right + 5}px`;
                    previewBox.style.top = `${targetRect.top}px`;
                    previewBox.style.maxHeight = `${window.innerHeight - targetRect.top - 20}px`;
                };

                this.showAllActivePromptsPreview = (targetElement) => {
                    this.hideActivePromptsPreview(); // Hide any existing one first

                    const allActivePrompts = [];
                    if (this.promptData && this.selectedPrompts) {
                        this.promptData.categories.forEach(cat => {
                            const selectionSet = this.selectedPrompts[cat.name];
                            if (selectionSet && selectionSet.size > 0) {
                                const activeDetails = cat.prompts
                                    .filter(p => selectionSet.has(p.prompt))
                                    .map(p => ({ category: cat.name, text: p.alias || p.prompt }));
                                allActivePrompts.push(...activeDetails);
                            }
                        });
                    }

                    if (allActivePrompts.length === 0) return;

                    const previewBox = document.createElement("div");
                    previewBox.className = "ps-active-prompts-preview";

                    const ul = document.createElement("ul");
                    allActivePrompts.forEach(promptInfo => {
                        const li = document.createElement("li");
                        li.innerHTML = `<span class="ps-preview-category">[${promptInfo.category}]</span> ${promptInfo.text}`;
                        ul.appendChild(li);
                    });
                    previewBox.appendChild(ul);

                    previewBox.addEventListener("mouseenter", () => {
                        if (this.hidePreviewTimeout) {
                            clearTimeout(this.hidePreviewTimeout);
                            this.hidePreviewTimeout = null;
                        }
                    });
                    previewBox.addEventListener("mouseleave", () => {
                        this.hideActivePromptsPreview();
                    });

                    document.body.appendChild(previewBox);

                    const mainButton = header.querySelector("#ps-category-btn");
                    const anchorElement = targetElement || mainButton;

                    if (anchorElement && mainButton) {
                        const anchorRect = anchorElement.getBoundingClientRect();
                        const mainButtonRect = mainButton.getBoundingClientRect();
                        previewBox.style.left = `${mainButtonRect.left}px`;
                        previewBox.style.top = `${anchorRect.bottom + 5}px`;
                        previewBox.style.minWidth = `${mainButtonRect.width}px`;
                    }
                };

                this.showEditModal = (prompt, categoryName, isNew = false) => {
                    // 防止重复创建
                    if (document.querySelector(".ps-edit-modal")) return;

                    const modal = document.createElement("div");
                    modal.className = "ps-edit-modal";
                    modal.innerHTML = `
                        <div class="ps-modal-content" style="width: 800px; max-width: 90vw;">
                            <h3>${isNew ? t('add_prompt') : t('edit_prompt')}</h3>
                            <div class="ps-edit-form-container">
                                <div class="ps-edit-form-left">
                                    <label>${t('alias')}:</label>
                                    <input type="text" id="ps-edit-alias" value="${prompt.alias || ''}" placeholder="${t('alias_placeholder')}">
                                    
                                    <label>${t('full_prompt')}:</label>
                                    <textarea id="ps-edit-prompt" rows="8" placeholder="${t('full_prompt_placeholder')}">${prompt.prompt || ''}</textarea>
                                </div>
                                <div class="ps-edit-form-right">
                                    <label>${t('preview_image')}:</label>
                                    <div id="ps-image-upload-area" class="ps-image-upload-area">
                                        <div id="ps-preview-container" class="ps-preview-container">
                                            ${prompt.image ?
                            `<img src="/prompt_selector/preview/${prompt.image}?t=${new Date().getTime()}" alt="Preview" class="ps-uploaded-image">` :
                            `<div class="ps-no-preview">
                                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                                        <polyline points="21 15 16 10 5 21"></polyline>
                                                    </svg>
                                                    <p>点击或拖拽上传预览图</p>
                                                </div>`
                        }
                                        </div>
                                        <input type="file" id="ps-image-upload" accept="image/png, image/jpeg, image/webp" style="display: none;">
                                    </div>
                                </div>
                            </div>
                            <div class="ps-modal-buttons">
                                <button id="ps-edit-save">${isNew ? t('add') : t('save')}</button>
                                <button id="ps-edit-cancel">${t('cancel')}</button>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(modal);

                    const closeModal = () => {
                        if (promptAutocomplete) {
                            promptAutocomplete.destroy();
                        }
                        modal.remove();
                    };
                    let selectedImageFile = null;

                    const uploadArea = modal.querySelector("#ps-image-upload-area");
                    const fileInput = modal.querySelector("#ps-image-upload");
                    const previewContainer = modal.querySelector("#ps-preview-container");

                    // 为提示词textarea添加智能补全
                    const promptTextarea = modal.querySelector("#ps-edit-prompt");
                    const promptAutocomplete = new AutocompleteUI({
                        inputElement: promptTextarea,
                        language: globalMultiLanguageManager.getLanguage(),
                        maxSuggestions: 20,
                        customClass: 'prompt-selector-autocomplete',
                        formatTag: formatTagWithGallerySettings
                    });

                    // 点击上传区域触发文件选择
                    uploadArea.addEventListener("click", () => fileInput.click());

                    // 文件选择
                    fileInput.addEventListener("change", (e) => {
                        const file = e.target.files[0];
                        if (file) {
                            this.handleImageFileUpload(file, previewContainer, (f) => {
                                selectedImageFile = f;
                            });
                        }
                    });

                    // 拖放上传
                    uploadArea.addEventListener("dragover", (e) => {
                        e.preventDefault();
                        uploadArea.classList.add("ps-image-dragover");
                    });

                    uploadArea.addEventListener("dragleave", () => {
                        uploadArea.classList.remove("ps-image-dragover");
                    });

                    uploadArea.addEventListener("drop", (e) => {
                        e.preventDefault();
                        uploadArea.classList.remove("ps-image-dragover");

                        const file = e.dataTransfer.files[0];
                        if (file && file.type.startsWith("image/")) {
                            this.handleImageFileUpload(file, previewContainer, (f) => {
                                selectedImageFile = f;
                            });
                        }
                    });

                    modal.querySelector("#ps-edit-cancel").addEventListener("click", closeModal);
                    modal.querySelector("#ps-edit-save").addEventListener("click", async () => {
                        const saveButton = modal.querySelector("#ps-edit-save");
                        this.setButtonLoading(saveButton, true);

                        let imageUrl = prompt.image || "";

                        if (selectedImageFile) {
                            const formData = new FormData();
                            formData.append("image", selectedImageFile);
                            const alias = modal.querySelector("#ps-edit-alias").value.trim();
                            formData.append("alias", alias);
                            try {
                                const response = await api.fetchApi("/prompt_selector/upload_image", {
                                    method: "POST",
                                    body: formData,
                                });
                                if (response.ok) {
                                    const res = await response.json();
                                    imageUrl = res.filename;
                                } else {
                                    throw new Error("Image upload failed");
                                }
                            } catch (error) {
                                logger.error("Image upload error:", error);
                                this.showToast("图片上传失败!", 'error');
                                this.setButtonLoading(saveButton, false);
                                return;
                            }
                        }

                        const now = new Date().toISOString();
                        const newId = `prompt-${Date.now()}`;
                        const updatedPrompt = {
                            id: isNew ? newId : prompt.id,
                            alias: modal.querySelector("#ps-edit-alias").value.trim(),
                            prompt: modal.querySelector("#ps-edit-prompt").value.trim(),
                            description: prompt.description || "",
                            image: imageUrl,
                            tags: prompt.tags || [],
                            favorite: prompt.favorite || false,
                            template: prompt.template || false,
                            created_at: prompt.created_at || now,
                            updated_at: now,  // 添加/更新时设置 updated_at
                            usage_count: prompt.usage_count || 0,
                            last_used: prompt.last_used
                        };

                        if (!updatedPrompt.alias || !updatedPrompt.prompt) {
                            this.showToast(t('prompt_empty_error'), 'error');
                            this.setButtonLoading(saveButton, false);
                            return;
                        }

                        try {
                            if (isNew) {
                                let category = this.promptData.categories.find(c => c.name === categoryName);
                                // 如果分类不存在，则创建它
                                if (!category) {
                                    category = { name: categoryName, prompts: [], updated_at: now };
                                    this.promptData.categories.push(category);
                                }
                                category.prompts.push(updatedPrompt);
                            } else {
                                const category = this.promptData.categories.find(c => c.name === categoryName);
                                if (category) {
                                    const index = category.prompts.findIndex(p => p.id === prompt.id);
                                    if (index !== -1) {
                                        // 保存前检查提示词是否被修改，如果修改了且原来是选中的，需要更新选中状态
                                        const oldPromptValue = prompt.prompt;
                                        const newPromptValue = updatedPrompt.prompt;
                                        const categorySelections = this.selectedPrompts[categoryName];

                                        if (oldPromptValue !== newPromptValue && categorySelections?.has(oldPromptValue)) {
                                            // 从选中集合中删除旧的提示词内容，添加新的提示词内容
                                            categorySelections.delete(oldPromptValue);
                                            categorySelections.add(newPromptValue);
                                        }

                                        category.prompts[index] = updatedPrompt;
                                    }
                                }
                            }

                            // saveData() 会自动从服务器获取最新的时间戳，无需手动更新

                            await this.saveData();

                            document.dispatchEvent(new CustomEvent('ps-data-updated', {
                                detail: {
                                    categoryName: categoryName,
                                    isNew: isNew,
                                    promptId: updatedPrompt.id
                                }
                            }));

                            this.renderContent();
                            this.updateOutput();  // 同步工作流状态，防止刷新后选中状态丢失
                            const contentArea = mainContainer.querySelector(".prompt-selector-content-area");
                            if (contentArea) {
                                contentArea.scrollTop = contentArea.scrollHeight;
                            }

                            closeModal();
                            this.showToast(isNew ? t('add_prompt_success') : t('update_prompt_success'));
                        } catch (error) {
                            logger.error('保存提示词失败:', error);
                            this.showToast(t('save_fail_retry'), 'error');
                        } finally {
                            this.setButtonLoading(saveButton, false);
                        }
                    });
                };

                this.showTooltip = (e, prompt) => {
                    this.hideTooltip(); // Ensure no multiple tooltips
                    const tooltip = document.createElement("div");
                    tooltip.className = "ps-tooltip";

                    let imageHTML = '';
                    if (prompt.image) {
                        // 注意：这里的图片路径需要一个方法来解析。暂时假定它可以直接访问。
                        // 实际应用中可能需要一个API端点来服务图片。
                        imageHTML = `<img src="/prompt_selector/preview/${prompt.image}" alt="Preview">`;
                    }

                    tooltip.innerHTML = `
                        ${imageHTML}
                        <strong>${prompt.alias}</strong>
                        <p>${prompt.prompt}</p>
                    `;
                    document.body.appendChild(tooltip);

                    const rect = e.currentTarget.getBoundingClientRect();
                    tooltip.style.left = `${rect.right + 10}px`;
                    tooltip.style.top = `${rect.top}px`;
                };

                this.hideTooltip = () => {
                    const tooltip = document.querySelector(".ps-tooltip");
                    if (tooltip) {
                        tooltip.remove();
                    }
                };

                this.showPromptTooltip = (e, prompt) => {
                    this.hidePromptTooltip(); // Ensure no multiple tooltips
                    const tooltip = document.createElement("div");
                    tooltip.className = "ps-prompt-tooltip";

                    let imageHTML = '';
                    if (prompt.image) {
                        imageHTML = `<img src="/prompt_selector/preview/${prompt.image}?t=${new Date().getTime()}" alt="Preview">`;
                    } else {
                        imageHTML = `<div class="ps-tooltip-no-preview"><span>暂无预览</span></div>`;
                    }

                    tooltip.innerHTML = `
                        <div class="ps-tooltip-content">
                            <div class="ps-tooltip-image-container">${imageHTML}</div>
                            <div class="ps-tooltip-text-container"><p>${prompt.prompt}</p></div>
                        </div>
                    `;
                    document.body.appendChild(tooltip);

                    const rect = e.currentTarget.getBoundingClientRect();
                    tooltip.style.left = `${e.clientX + 15}px`;
                    tooltip.style.top = `${e.clientY + 15}px`;

                    // Adjust if it goes off-screen
                    const tooltipRect = tooltip.getBoundingClientRect();
                    if (tooltipRect.right > window.innerWidth) {
                        tooltip.style.left = `${window.innerWidth - tooltipRect.width - 10}px`;
                    }
                    if (tooltipRect.bottom > window.innerHeight) {
                        tooltip.style.top = `${window.innerHeight - tooltipRect.height - 10}px`;
                    }
                };

                this.hidePromptTooltip = () => {
                    const tooltips = document.querySelectorAll(".ps-prompt-tooltip");
                    if (tooltips.length > 0) {
                        tooltips.forEach(t => t.remove());
                    }
                };

                this.showLibraryModal = () => {
                    // 防止重复创建
                    if (document.querySelector(".ps-library-modal")) return;

                    const modal = document.createElement("div");
                    modal.className = "ps-library-modal";

                    modal.innerHTML = `
                        <div class="ps-library-content" id="ps-library-content">
                            <div class="ps-library-header" id="ps-library-header">
                                <h3>${t('library')}</h3>
                                <div class="ps-header-controls">
                                </div>
                                <button id="ps-library-close" class="ps-btn ps-btn-icon">&times;</button>
                            </div>
                            <div class="ps-library-search">
                                <div class="ps-search-container">
                                    <input type="text" id="ps-library-search-input" placeholder="${t('search_placeholder')}">
                                </div>
                                <div class="ps-filter-bar">
                                    <!-- Batch controls are now moved to the prompt header -->
                                </div>
                            </div>
                            <div class="ps-library-body">
                                <div class="ps-library-left-panel">
                                    <div class="ps-category-header">
                                        <h4>${t('category')}</h4>
                                        <button class="ps-btn ps-btn-sm" id="ps-new-category-btn">+</button>
                                    </div>
                                    <div class="ps-category-tree">
                                        <!-- Category Tree will go here -->
                                    </div>
                                </div>
                                <div class="ps-library-right-panel">
                                    <div class="ps-prompt-header">
                                        <h4>${t('prompt_list')}</h4>
                                        <div class="ps-prompt-controls">
                                            <div class="ps-default-controls" style="display: flex; gap: 8px;">
                                                <button class="ps-btn ps-btn-sm" id="ps-move-favorites-top-btn">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 12 5 19 12"></polyline></svg>
                                                    <span>${t('move_favorites_to_top')}</span>
                                                </button>
                                                <button class="ps-btn ps-btn-sm" id="ps-batch-mode-btn">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 5.5l1.5 1.5l2.5 -2.5"></path><path d="M3.5 11.5l1.5 1.5l2.5 -2.5"></path><path d="M3.5 17.5l1.5 1.5l2.5 -2.5"></path><path d="M11 6l9 0"></path><path d="M11 12l9 0"></path><path d="M11 18l9 0"></path></svg>
                                                    <span>${t('batch_operations')}</span>
                                                </button>
                                                <button class="ps-btn ps-btn-sm ps-btn-primary" id="ps-add-prompt-btn">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                                    <span>${t('add_new')}</span>
                                                </button>
                                            </div>
                                            <div class="ps-batch-controls" style="display: none; gap: 8px;">
                                                <button class="ps-btn ps-btn-sm" id="ps-select-all-btn">${t('select_all')}</button>
                                                <button class="ps-btn ps-btn-sm" id="ps-batch-delete-btn">${t('batch_delete')}</button>
                                                <button class="ps-btn ps-btn-sm" id="ps-batch-move-btn">${t('batch_move')}</button>
                                                <button class="ps-btn ps-btn-sm" id="ps-exit-batch-btn">${t('exit_batch')}</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="ps-prompt-list-container">
                                        <!-- Prompt List will go here -->
                                    </div>
                                </div>
                            </div>
                            <div class="ps-library-footer">
                                <div class="footer-left">
                                    <span class="ps-status-text">${t('ready')}</span>
                                </div>
                                <div class="footer-right">
                                </div>
                            </div>
                        </div>
                    `;

                    document.body.appendChild(modal);

                    // 添加模态框拖拽功能
                    this.makeDraggable(modal.querySelector('#ps-library-content'), modal.querySelector('#ps-library-header'));

                    // 添加键盘快捷键支持
                    const handleKeydown = (e) => {
                        if (e.key === 'Escape') {
                            closeModal();
                        } else if (e.ctrlKey && e.key === 'f') {
                            e.preventDefault();
                            searchInput.focus();
                        }
                    };
                    document.addEventListener('keydown', handleKeydown);

                    const dataUpdateHandler = (e) => {
                        // Check if the update is for the currently selected category
                        if (e.detail.categoryName === this.selectedCategory) {
                            this.renderPromptList(this.selectedCategory);

                            // If a new prompt was added, scroll to it
                            if (e.detail.isNew && e.detail.promptId) {
                                setTimeout(() => {
                                    const container = modal.querySelector('.ps-prompt-list-container');
                                    const newItem = container.querySelector(`[data-prompt-id="${e.detail.promptId}"]`);
                                    if (newItem) {
                                        newItem.scrollIntoView({ behavior: 'smooth', block: 'end' });
                                        newItem.classList.add('ps-highlight-new');
                                        setTimeout(() => newItem.classList.remove('ps-highlight-new'), 2000);
                                    }
                                }, 100);
                            }
                        }
                    };
                    document.addEventListener('ps-data-updated', dataUpdateHandler);

                    // 监听同步事件，当其他节点修改数据时自动刷新弹窗
                    const dataSyncedHandler = (e) => {
                        logger.info("词库弹窗检测到数据同步，刷新列表");

                        // 刷新分类树
                        const categoryTree = this.buildCategoryTree(this.promptData.categories);
                        const treeElement = this.renderCategoryTree(categoryTree, categoryTreeContainer);
                        categoryTreeContainer.innerHTML = '';
                        categoryTreeContainer.appendChild(treeElement);

                        // 刷新当前显示的提示词列表
                        if (this.selectedCategory) {
                            this.renderPromptList(this.selectedCategory);
                        }
                    };
                    document.addEventListener('ps-data-synced', dataSyncedHandler);

                    const closeModal = () => {
                        document.removeEventListener('keydown', handleKeydown);
                        document.removeEventListener('ps-data-updated', dataUpdateHandler);
                        document.removeEventListener('ps-data-synced', dataSyncedHandler);
                        modal.remove();
                    };
                    modal.querySelector("#ps-library-close").addEventListener("click", closeModal);
                    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

                    const searchInput = modal.querySelector('#ps-library-search-input');
                    const leftPanel = modal.querySelector('.ps-library-left-panel');
                    const categoryTreeContainer = modal.querySelector('.ps-category-tree');

                    // 添加搜索防抖功能
                    let searchTimeout;
                    const debouncedSearch = (callback, delay = 300) => {
                        clearTimeout(searchTimeout);
                        searchTimeout = setTimeout(callback, delay);
                    };

                    const categoryTree = this.buildCategoryTree(this.promptData.categories);
                    const treeElement = this.renderCategoryTree(categoryTree, categoryTreeContainer);
                    categoryTreeContainer.innerHTML = ''; // 清空占位符
                    categoryTreeContainer.appendChild(treeElement);

                    // Create and insert the favorites button area
                    const favoritesContainer = document.createElement('div');
                    favoritesContainer.className = 'ps-favorites-container';

                    const favoritesButton = document.createElement('button');
                    favoritesButton.className = 'ps-btn ps-favorites-btn';
                    favoritesButton.innerHTML = `<span>${t('favorites_category')}</span>`;
                    favoritesButton.addEventListener('click', (e) => {
                        this.selectedCategory = "__favorites__";
                        this.renderPromptList("__favorites__");
                        // Handle selection state
                        modal.querySelectorAll('.ps-tree-item.selected').forEach(el => el.classList.remove('selected'));
                        favoritesButton.classList.add('selected');
                    });

                    favoritesContainer.appendChild(favoritesButton);

                    const categoryHeader = leftPanel.querySelector('.ps-category-header');
                    leftPanel.insertBefore(favoritesContainer, categoryHeader);


                    // 默认渲染第一个分类的提示词
                    // Select first non-favorite category by default
                    if (this.promptData.categories.length > 0) {
                        const firstItem = categoryTreeContainer.querySelector('.ps-tree-item'); // 获取树中的第一个项目
                        if (firstItem) {
                            this.selectedCategory = firstItem.closest('li').dataset.fullName; // 从元素中获取正确的分类名

                            // 清除所有已选项并选中第一个
                            modal.querySelectorAll('.ps-tree-item.selected, .ps-favorites-btn.selected').forEach(el => el.classList.remove('selected'));
                            firstItem.classList.add('selected');

                            this.renderPromptList(this.selectedCategory);
                        }
                    } else {
                        this.renderPromptList(null); // 没有分类时清空列表
                    }

                    // --- 搜索逻辑 (使用防抖) ---
                    searchInput.addEventListener('input', () => {
                        const searchTerm = searchInput.value.toLowerCase();
                        debouncedSearch(() => {
                            let selectedCategoryExists = true;

                            // 过滤树
                            const allTreeItems = categoryTreeContainer.querySelectorAll('li');
                            allTreeItems.forEach(li => {
                                const itemName = li.dataset.fullName.toLowerCase();
                                const match = itemName.includes(searchTerm);
                                li.style.display = match ? '' : 'none';
                                if (li.dataset.fullName === this.selectedCategory && !match) {
                                    selectedCategoryExists = false;
                                }
                                if (match && searchTerm) {
                                    // 展开所有父级
                                    let parent = li.parentElement.closest('li.parent');
                                    while (parent) {
                                        parent.classList.add('open');
                                        parent.style.display = "";
                                        parent = parent.parentElement.closest('li.parent');
                                    }
                                }
                            });

                            // 过滤右侧列表
                            const categoryToRender = selectedCategoryExists ? this.selectedCategory : null;
                            this.renderPromptList(categoryToRender, searchTerm);
                        });
                    });

                    // --- 底部按钮逻辑 ---
                    const newCategoryBtn = modal.querySelector('#ps-new-category-btn');
                    newCategoryBtn.addEventListener('click', () => {
                        this.showInputModal(t('add'), t('new_category_prompt'), '', (newName) => {
                            if (!newName || !newName.trim()) return;
                            const finalName = newName.trim();
                            if (finalName === "__favorites__" || finalName === t('favorites_category').replace('⭐ ', '')) {
                                this.showToast(t('cannot_create_special_category'), 'error');
                                return;
                            }
                            if (this.promptData.categories.some(c => c.name === finalName)) {
                                this.showToast(t('category_exists'), 'error');
                                return;
                            }
                            const newCategory = {
                                id: generateCategoryId(),
                                name: finalName,
                                prompts: []
                            };
                            this.promptData.categories.push(newCategory);
                            this.saveData();

                            // 刷新树
                            const categoryTree = this.buildCategoryTree(this.promptData.categories);
                            const treeElement = this.renderCategoryTree(categoryTree, categoryTreeContainer);
                            categoryTreeContainer.innerHTML = '';
                            categoryTreeContainer.appendChild(treeElement);
                        });
                    });


                    // --- 新增的事件监听器 ---



                    this.updateBatchControlsVisibility = () => {
                        const modal = document.querySelector('.ps-library-modal');
                        if (!modal) return;
                        const defaultControls = modal.querySelector('.ps-default-controls');
                        const batchControls = modal.querySelector('.ps-batch-controls');

                        if (this.batchMode) {
                            defaultControls.style.display = 'none';
                            batchControls.style.display = 'flex';
                        } else {
                            defaultControls.style.display = 'flex';
                            batchControls.style.display = 'none';
                        }
                    };

                    // 批量操作模式
                    const batchModeBtn = modal.querySelector('#ps-batch-mode-btn');
                    batchModeBtn.addEventListener('click', () => {
                        this.batchMode = true;
                        this.updateBatchControlsVisibility();
                        this.renderPromptList(this.selectedCategory);
                    });

                    // 全选按钮
                    const selectAllBtn = modal.querySelector('#ps-select-all-btn');
                    selectAllBtn.addEventListener('click', () => {
                        const checkboxes = modal.querySelectorAll('.ps-batch-checkbox');
                        const allChecked = Array.from(checkboxes).every(cb => cb.checked);

                        checkboxes.forEach(cb => {
                            cb.checked = !allChecked;
                            const promptId = cb.dataset.promptId;
                            if (cb.checked) {
                                this.selectedForBatch.add(promptId);
                            } else {
                                this.selectedForBatch.delete(promptId);
                            }
                        });

                        this.updateBatchControls();
                    });

                    // 批量删除
                    const batchDeleteBtn = modal.querySelector('#ps-batch-delete-btn');
                    batchDeleteBtn.addEventListener('click', async () => {
                        if (this.selectedForBatch.size === 0) return;

                        this.showConfirmModal(t('batch_delete_confirm', { count: this.selectedForBatch.size }), async () => {
                            try {
                                const response = await api.fetchApi("/prompt_selector/prompts/batch_delete", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                        category: this.selectedCategory,
                                        prompt_ids: Array.from(this.selectedForBatch)
                                    })
                                });

                                if (response.ok) {
                                    logger.info("✓ 批量删除成功，从服务器重新拉取最新数据");

                                    // 从服务器重新拉取数据（包括后端更新的时间戳）
                                    const dataResponse = await api.fetchApi("/prompt_selector/data");
                                    const freshData = await dataResponse.json();
                                    this.promptData = freshData;

                                    // 更新同步管理器的时间戳
                                    if (this.syncManager) {
                                        this.syncManager.lastModified = freshData.last_modified;
                                    }

                                    logger.info(`服务器数据已更新，last_modified: ${freshData.last_modified}`);

                                    // 触发数据同步事件，通知其他UI组件（如library modal）刷新
                                    document.dispatchEvent(new CustomEvent('ps-data-synced', {
                                        detail: { data: freshData }
                                    }));

                                    this.selectedForBatch.clear();
                                    this.renderPromptList(this.selectedCategory);
                                    this.renderContent(); // 刷新主节点
                                    this.updateOutput(); // 更新输出和徽章
                                    this.showToast(t('batch_delete_success'));
                                } else {
                                    const error = await response.json();
                                    throw new Error(error.error || t('batch_delete_fail'));
                                }
                            } catch (error) {
                                logger.error("批量删除失败:", error);
                                this.showToast(t('batch_delete_fail'), 'error');
                            }
                        });
                    });

                    // 批量移动
                    const batchMoveBtn = modal.querySelector('#ps-batch-move-btn');
                    batchMoveBtn.addEventListener('click', () => {
                        if (this.selectedForBatch.size === 0) return;

                        this.showCategorySelectionModal((targetCategory) => {
                            if (!targetCategory || targetCategory === this.selectedCategory) return;

                            this.showConfirmModal(
                                `确定要将 ${this.selectedForBatch.size} 个提示词移动到 "${targetCategory}" 分类吗？`,
                                async () => {
                                    try {
                                        const response = await api.fetchApi("/prompt_selector/prompts/batch_move", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                                source_category: this.selectedCategory,
                                                target_category: targetCategory,
                                                prompt_ids: Array.from(this.selectedForBatch)
                                            })
                                        });

                                        if (response.ok) {
                                            logger.info("✓ 批量移动成功，从服务器重新拉取最新数据");

                                            // 从服务器重新拉取最新数据（包含更新后的时间戳）
                                            const refreshedData = await api.fetchApi("/prompt_selector/data").then(r => r.json());
                                            this.promptData = refreshedData;

                                            // 更新同步管理器的时间戳
                                            if (this.syncManager) {
                                                this.syncManager.lastModified = refreshedData.last_modified;
                                            }

                                            logger.info(`服务器数据已更新，last_modified: ${refreshedData.last_modified}`);

                                            // 触发数据同步事件，通知其他UI组件（如library modal）刷新
                                            document.dispatchEvent(new CustomEvent('ps-data-synced', {
                                                detail: { data: refreshedData }
                                            }));

                                            this.selectedForBatch.clear();
                                            this.renderPromptList(this.selectedCategory);
                                            this.showToast('批量移动成功！');
                                        } else {
                                            const error = await response.json();
                                            // logger.error("Batch move API error response:", error); // Add logging here
                                            throw new Error(error.error || '批量移动失败');
                                        }
                                    } catch (error) {
                                        logger.error("批量移动失败:", error);
                                        this.showToast(error.message, 'error');
                                    }
                                }
                            );
                        });
                    });

                    // 退出批量模式
                    // 退出批量模式
                    const exitBatchBtn = modal.querySelector('#ps-exit-batch-btn');
                    exitBatchBtn.addEventListener('click', () => {
                        this.batchMode = false;
                        this.selectedForBatch.clear();
                        this.updateBatchControlsVisibility();
                        this.renderPromptList(this.selectedCategory);
                    });

                    // 新增提示词按钮
                    const addPromptBtn = modal.querySelector('#ps-add-prompt-btn');
                    addPromptBtn.addEventListener('click', () => {
                        this.showEditModal({
                            id: `new-${Date.now()}`,
                            alias: '',
                            prompt: '',
                            image: '',
                            tags: [],
                            favorite: false,
                            description: ''
                        }, this.selectedCategory, true);
                    });

                    const moveFavoritesBtn = modal.querySelector('#ps-move-favorites-top-btn');
                    moveFavoritesBtn.addEventListener('click', async () => {
                        const categoryName = this.selectedCategory;
                        const category = this.promptData.categories.find(c => c.name === categoryName);
                        if (!category || categoryName === "__favorites__") {
                            this.showToast("只能在常规分类中执行此操作", 'warning');
                            return;
                        }

                        const favorites = category.prompts.filter(p => p.favorite);
                        const nonFavorites = category.prompts.filter(p => !p.favorite);

                        if (favorites.length === 0) {
                            this.showToast("当前分类没有收藏的词条", 'info');
                            return;
                        }

                        // 生成新的排序ID列表
                        const orderedIds = [...favorites, ...nonFavorites].map(p => p.id);

                        try {
                            // ✅ 调用后端排序 API
                            await api.fetchApi("/prompt_selector/prompts/update_order", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    category: categoryName,
                                    ordered_ids: orderedIds
                                })
                            });

                            logger.info("✓ 收藏置顶成功，从服务器重新拉取最新数据");

                            // ✅ 重新拉取数据
                            const freshData = await api.fetchApi("/prompt_selector/data").then(r => r.json());
                            this.promptData = freshData;

                            if (this.syncManager) {
                                this.syncManager.lastModified = freshData.last_modified;
                            }

                            // 触发数据同步事件，通知其他UI组件（如library modal）刷新
                            document.dispatchEvent(new CustomEvent('ps-data-synced', {
                                detail: { data: freshData }
                            }));

                            this.renderPromptList(categoryName, '', true);
                            this.renderContent();
                            this.updateOutput();
                            this.showToast("收藏词条已置顶！");
                        } catch (error) {
                            logger.error("置顶收藏失败:", error);
                            this.showToast("操作失败，请重试", 'error');
                        }
                    });
                };




                this.showSettingsModal = () => {
                    if (document.querySelector(".ps-settings-modal")) return;

                    const modal = document.createElement("div");
                    modal.className = "ps-edit-modal ps-settings-modal"; // Re-use styles
                    modal.innerHTML = `
                        <div class="ps-modal-content" style="width: 600px; height: 400px; max-width: 90vw; display: flex; flex-direction: column;">
                             <h3 style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #444;">${t('settings')}</h3>
                             <div style="display: flex; flex-grow: 1; overflow: hidden;">
                                  <div class="ps-settings-sidebar">
                                      <button class="ps-sidebar-btn active" data-pane="general">${t('language')}</button>
                                      <button class="ps-sidebar-btn" data-pane="interface">${t('interface')}</button>
                                      <button class="ps-sidebar-btn" data-pane="function">${t('function')}</button>
                                  </div>
                                  <div class="ps-settings-content">
                                      <div class="ps-settings-pane active" data-pane="general">
                                           <div style="display: flex; align-items: center; gap: 8px;">
                                              <label for="ps-lang-select" style="margin: 0; white-space: nowrap;">${t('language')}:</label>
                                              <select id="ps-lang-select" style="width: 200px;">
                                                  <option value="zh-CN">简体中文</option>
                                                  <option value="en-US">English</option>
                                              </select>
                                           </div>
                                      </div>
                                      <div class="ps-settings-pane" data-pane="interface">
                                           <div style="display: flex; align-items: center; gap: 8px;">
                                              <label for="ps-theme-color-picker" style="display: inline; margin: 0;">${t('theme_color')}:</label>
                                              <input type="color" id="ps-theme-color-picker" style="width: 40px; height: 25px; padding: 2px; border: 1px solid #555; cursor: pointer;">
                                           </div>
                                      </div>
                                      <div class="ps-settings-pane" data-pane="function">
                                           <div style="display: flex; align-items: center; gap: 8px;">
                                              <label for="ps-separator-input" style="display: inline; margin: 0;">${t('separator')}:</label>
                                              <input type="text" id="ps-separator-input" placeholder="${t('separator_placeholder')}" style="width: 100px; background-color: #1b1b1b; border: 1px solid #555; color: #eee; padding: 8px; border-radius: 4px;">
                                           </div>
                                      </div>
                                  </div>
                             </div>
                             <div class="ps-modal-buttons">
                                <button id="ps-settings-save">${t('save')}</button>
                                <button id="ps-settings-cancel">${t('cancel')}</button>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(modal);

                    // --- Logic ---
                    const langSelect = modal.querySelector("#ps-lang-select");
                    // 转换语言代码：zh -> zh-CN, en -> en-US
                    const globalLang = globalMultiLanguageManager.getLanguage();
                    langSelect.value = globalLang === "zh" ? "zh-CN" : "en-US";

                    const colorPicker = modal.querySelector("#ps-theme-color-picker");
                    colorPicker.value = this.promptData.settings?.theme_color || '#8a2be2';

                    const separatorInput = modal.querySelector("#ps-separator-input");
                    separatorInput.value = this.promptData.settings?.separator || ', ';

                    // Sidebar logic
                    modal.querySelectorAll('.ps-sidebar-btn').forEach(btn => {
                        btn.addEventListener('click', () => {
                            const paneName = btn.dataset.pane;
                            modal.querySelectorAll('.ps-sidebar-btn').forEach(b => b.classList.remove('active'));
                            btn.classList.add('active');
                            modal.querySelectorAll('.ps-settings-pane').forEach(p => {
                                p.classList.toggle('active', p.dataset.pane === paneName);
                            });
                        });
                    });

                    // Buttons
                    const closeModal = () => modal.remove();
                    modal.querySelector("#ps-settings-cancel").addEventListener("click", closeModal);
                    modal.querySelector("#ps-settings-save").addEventListener("click", () => {
                        // Ensure settings object exists
                        if (!this.promptData.settings) {
                            this.promptData.settings = {};
                        }

                        const newLang = langSelect.value;
                        const currentLegacyLang = globalMultiLanguageManager.getLanguage() === "zh" ? "zh-CN" : "en-US";
                        if (currentLegacyLang !== newLang) {
                            this.promptData.settings.language = newLang;
                            // 转换语言代码：zh-CN -> zh, en-US -> en
                            const globalLang = newLang === "zh-CN" ? "zh" : "en";
                            globalMultiLanguageManager.setLanguage(globalLang);
                            updateUIText(this);
                        }

                        this.promptData.settings.theme_color = colorPicker.value;
                        this.promptData.settings.separator = modal.querySelector("#ps-separator-input").value;
                        this.applyTheme();

                        // This setting is now always true implicitly
                        this.promptData.settings.save_selection = true;

                        this.saveData();
                        this.showToast(t('save_success'));
                        closeModal();
                    });
                };

                // --- 新增的管理功能方法 ---

                this.findPromptAndCategory = (promptId) => {
                    for (const category of this.promptData.categories) {
                        const prompt = category.prompts.find(p => p.id === promptId);
                        if (prompt) {
                            return { prompt, category };
                        }
                    }
                    return { prompt: null, category: null };
                };


                this.loadPrompt = (prompt) => {
                    const outputWidget = this.widgets.find(w => w.name === "selected_prompts");
                    outputWidget.value = prompt.prompt;
                    const textWidget = this.widgets.find(w => w.type === 'text' || w.type === 'string');
                    if (textWidget) {
                        textWidget.value = prompt.prompt;
                    }

                    this.setDirtyCanvas(true, true);
                };

                this.toggleFavorite = async (categoryName, promptId) => {
                    try {
                        const response = await api.fetchApi("/prompt_selector/prompts/toggle_favorite", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ category: categoryName, prompt_id: promptId })
                        });

                        if (response.ok) {
                            logger.info("✓ 收藏状态切换成功，从服务器重新拉取最新数据");

                            // 从服务器重新拉取数据（包括后端更新的时间戳）
                            const dataResponse = await api.fetchApi("/prompt_selector/data");
                            const freshData = await dataResponse.json();
                            this.promptData = freshData;

                            // 更新同步管理器的时间戳
                            if (this.syncManager) {
                                this.syncManager.lastModified = freshData.last_modified;
                            }

                            // 触发数据同步事件，通知其他UI组件（如library modal）刷新
                            document.dispatchEvent(new CustomEvent('ps-data-synced', {
                                detail: { data: freshData }
                            }));

                            // 重新渲染列表
                            const modal = document.querySelector('.ps-library-modal');
                            if (modal) {
                                this.renderPromptList(this.selectedCategory);
                            }
                        }
                    } catch (error) {
                        logger.error("切换收藏状态失败:", error);
                    }
                };

                this.deletePrompt = async (categoryName, promptId) => {
                    try {
                        logger.info(`🗑️ 开始删除提示词: category="${categoryName}", promptId="${promptId}"`);

                        const response = await api.fetchApi("/prompt_selector/prompts/batch_delete", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ category: categoryName, prompt_ids: [promptId] })
                        });

                        if (response.ok) {
                            logger.info("✓ 后端删除成功，从服务器重新拉取最新数据");

                            // 从服务器重新拉取数据（包括后端更新的时间戳）
                            const dataResponse = await api.fetchApi("/prompt_selector/data");
                            const freshData = await dataResponse.json();
                            this.promptData = freshData;

                            // 更新同步管理器的时间戳
                            if (this.syncManager) {
                                this.syncManager.lastModified = freshData.last_modified;
                            }

                            logger.info(`服务器数据已更新，last_modified: ${freshData.last_modified}`);

                            // 从选中项中移除已删除的提示词
                            const category = this.promptData.categories.find(c => c.name === categoryName);
                            if (category && this.selectedPrompts[categoryName]) {
                                // 检查哪些选中的提示词已经被删除
                                const validPrompts = new Set(category.prompts.map(p => p.prompt));
                                for (const selectedPrompt of this.selectedPrompts[categoryName]) {
                                    if (!validPrompts.has(selectedPrompt)) {
                                        this.selectedPrompts[categoryName].delete(selectedPrompt);
                                    }
                                }
                            }

                            // 触发数据同步事件，通知其他UI组件（如library modal）刷新
                            document.dispatchEvent(new CustomEvent('ps-data-synced', {
                                detail: { data: freshData }
                            }));

                            // 重新渲染列表
                            const modal = document.querySelector('.ps-library-modal');
                            if (modal) {
                                this.renderPromptList(this.selectedCategory);
                            }
                            this.renderContent(); // 刷新主节点
                            this.updateOutput(); // 更新输出和徽章
                            this.showToast(t('delete_success'));
                        } else {
                            const error = await response.json();
                            throw new Error(error.error || '删除失败');
                        }
                    } catch (error) {
                        logger.error("删除提示词失败:", error);
                        this.showToast(error.message, 'error');
                    }
                };

                this.reorderPrompts = async (categoryName, fromIndex, toIndex) => {
                    const category = this.promptData.categories.find(c => c.name === categoryName);
                    if (!category) return;

                    // 重新排序本地数据（临时，仅用于生成orderedIds）
                    const prompts = [...category.prompts]; // 创建副本
                    const [movedItem] = prompts.splice(fromIndex, 1);
                    prompts.splice(toIndex, 0, movedItem);

                    // 发送到后端
                    const orderedIds = prompts.map(p => p.id);
                    try {
                        await api.fetchApi("/prompt_selector/prompts/update_order", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ category: categoryName, ordered_ids: orderedIds })
                        });

                        logger.info("✓ 排序更新成功，从服务器重新拉取最新数据");

                        // 从服务器重新拉取数据（包括后端更新的时间戳）
                        const dataResponse = await api.fetchApi("/prompt_selector/data");
                        const freshData = await dataResponse.json();
                        this.promptData = freshData;

                        // 更新同步管理器的时间戳
                        if (this.syncManager) {
                            this.syncManager.lastModified = freshData.last_modified;
                        }

                        // 触发数据同步事件，通知其他UI组件（如library modal）刷新
                        document.dispatchEvent(new CustomEvent('ps-data-synced', {
                            detail: { data: freshData }
                        }));
                    } catch (error) {
                        logger.error("更新排序失败:", error);
                    }
                };


                this.showCategoryContextMenu = (event, categoryName) => {
                    // Close any existing menu
                    const existingMenu = document.querySelector('.ps-context-menu');
                    if (existingMenu) {
                        existingMenu.remove();
                    }

                    const menu = document.createElement('div');
                    menu.className = 'ps-context-menu';
                    menu.style.left = `${event.clientX}px`;
                    menu.style.top = `${event.clientY}px`;

                    menu.innerHTML = `
                        <ul>
                            <li id="ps-context-add-sub">➕ ${t('create_subcategory')}</li>
                            <li id="ps-context-rename">✏️ ${t('rename_category')}</li>
                            <li id="ps-context-delete">🗑️ ${t('delete_category')}</li>
                            <li id="ps-context-clear">🧹 ${t('clear_category')}</li>
                        </ul>
                    `;

                    document.body.appendChild(menu);

                    menu.querySelector('#ps-context-add-sub').addEventListener('click', () => {
                        this.showInputModal(t('create_subcategory'), t('subcategory_prompt'), '', (subName) => {
                            if (!subName || !subName.trim()) return;
                            const finalName = `${categoryName}/${subName.trim()}`;
                            if (this.promptData.categories.some(c => c.name === finalName)) {
                                this.showToast(t('category_exists'), 'error');
                                return;
                            }
                            const newCategory = {
                                id: generateCategoryId(),
                                name: finalName,
                                prompts: []
                            };
                            this.promptData.categories.push(newCategory);
                            this.saveData();
                            // Refresh tree
                            const modal = document.querySelector('.ps-library-modal');
                            if (modal) {
                                const categoryTreeContainer = modal.querySelector('.ps-category-tree');
                                const categoryTree = this.buildCategoryTree(this.promptData.categories);
                                const treeElement = this.renderCategoryTree(categoryTree, categoryTreeContainer);
                                categoryTreeContainer.innerHTML = '';
                                categoryTreeContainer.appendChild(treeElement);
                            }
                        });
                    });

                    menu.querySelector('#ps-context-rename').addEventListener('click', () => {
                        this.renameCategory(categoryName);
                    });

                    menu.querySelector('#ps-context-delete').addEventListener('click', () => {
                        this.deleteCategory(categoryName);
                    });

                    menu.querySelector('#ps-context-clear').addEventListener('click', () => {
                        this.clearCategory(categoryName);
                    });

                    const closeMenu = () => {
                        menu.remove();
                        document.removeEventListener('click', closeMenu);
                    };

                    // Close menu on next click
                    setTimeout(() => document.addEventListener('click', closeMenu), 0);
                };

                this.renameCategory = (oldName) => {
                    const oldNameParts = oldName.split('/');
                    const nameToEdit = oldNameParts.pop();

                    this.showInputModal(t('rename_category'), t('new_category_prompt'), nameToEdit, async (newNameInput) => {
                        const newName = newNameInput.trim();
                        if (!newName || newName.includes('/') || newName === nameToEdit) {
                            if (newName.includes('/')) this.showToast("分类名不能包含'/'", 'error');
                            return;
                        }

                        const parentPath = oldNameParts.join('/');
                        const newFullName = parentPath ? `${parentPath}/${newName}` : newName;

                        if (this.promptData.categories.some(c => c.name === newFullName)) {
                            this.showToast(t('category_exists'), 'error');
                            return;
                        }

                        let wasUpdated = false;
                        const now = new Date().toISOString();
                        this.promptData.categories.forEach(cat => {
                            if (cat.name === oldName) {
                                cat.name = newFullName;
                                cat.updated_at = now;  // 更新时间戳，确保smartMerge能识别这是最新修改
                                wasUpdated = true;
                            } else if (cat.name.startsWith(oldName + '/')) {
                                const restOfPath = cat.name.substring(oldName.length);
                                cat.name = newFullName + restOfPath;
                                cat.updated_at = now;  // 更新子分类时间戳
                                wasUpdated = true;
                            }
                        });

                        if (wasUpdated) {
                            const newSelectedPrompts = {};
                            for (const key in this.selectedPrompts) {
                                if (key === oldName || key.startsWith(oldName + '/')) {
                                    const restOfPath = key.substring(oldName.length);
                                    const newKey = newFullName + restOfPath;
                                    newSelectedPrompts[newKey] = this.selectedPrompts[key];
                                } else {
                                    newSelectedPrompts[key] = this.selectedPrompts[key];
                                }
                            }
                            this.selectedPrompts = newSelectedPrompts;

                            // saveData() 会自动从服务器获取最新的时间戳，无需手动更新

                            // 使用 await 等待保存完成
                            await this.saveData();

                            this.showToast(t('update_prompt_success'));

                            if (this.selectedCategory === oldName || this.selectedCategory.startsWith(oldName + '/')) {
                                const restOfPath = this.selectedCategory.substring(oldName.length);
                                this.selectedCategory = newFullName + restOfPath;
                                this.saveLastCategory(this.selectedCategory);
                            }

                            const modal = document.querySelector('.ps-library-modal');
                            if (modal) {
                                const categoryTreeContainer = modal.querySelector('.ps-category-tree');
                                const categoryTree = this.buildCategoryTree(this.promptData.categories);
                                const treeElement = this.renderCategoryTree(categoryTree, categoryTreeContainer);
                                categoryTreeContainer.innerHTML = '';
                                categoryTreeContainer.appendChild(treeElement);

                                const newSelectedItem = categoryTreeContainer.querySelector(`.ps-tree-item[data-full-name="${this.selectedCategory}"]`);
                                if (newSelectedItem) {
                                    newSelectedItem.classList.add('selected');
                                    let parentLi = newSelectedItem.closest('li.parent');
                                    while (parentLi) {
                                        parentLi.classList.add('open');
                                        parentLi = parentLi.parentElement.closest('li.parent');
                                    }
                                }

                                this.renderPromptList(this.selectedCategory);
                            }
                            this.updateCategoryDropdown();
                            updateUIText(this); // 确保节点上的分类显示更新
                        }
                    });
                };

                this.deleteCategory = (categoryName) => {
                    const hasChildren = this.promptData.categories.some(c => c.name.startsWith(categoryName + '/'));
                    const confirmMessage = hasChildren
                        ? `确定要删除分类 "${categoryName}" 及其所有子分类吗？此操作不可撤销。`
                        : t('delete_category_confirm', { category: categoryName });

                    this.showConfirmModal(confirmMessage, async () => {
                        // Force hide any lingering tooltips before DOM changes
                        this.hidePromptTooltip();
                        this.hideActivePromptsPreview();

                        try {
                            const response = await api.fetchApi("/prompt_selector/category/delete", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ name: categoryName })
                            });

                            if (!response.ok) {
                                const error = await response.json();
                                // logger.error("[DEBUG] API deletion failed:", error);
                                throw new Error(error.error || "删除失败");
                            }

                            // Fetch the entire updated data from the server to ensure consistency
                            const updatedData = await api.fetchApi("/prompt_selector/data").then(r => r.json());
                            this.promptData = updatedData;

                            // Clean up selections for deleted categories
                            const categoriesToDelete = this.promptData.categories
                                .filter(c => c.name === categoryName || c.name.startsWith(categoryName + '/'))
                                .map(c => c.name);
                            categoriesToDelete.forEach(catName => {
                                delete this.selectedPrompts[catName];
                            });

                            // Determine the next valid selected category
                            const currentSelectionStillValid = this.promptData.categories.some(c => c.name === this.selectedCategory);
                            if (!currentSelectionStillValid) {
                                if (this.promptData.categories.length > 0) {
                                    this.promptData.categories.sort((a, b) => a.name.localeCompare(b.name));
                                    this.selectedCategory = this.promptData.categories[0].name;
                                } else {
                                    this.selectedCategory = ""; // No categories left
                                }
                            }
                            this.saveLastCategory(this.selectedCategory);

                            // Refresh UI
                            const modal = document.querySelector('.ps-library-modal');
                            if (modal) {
                                const categoryTreeContainer = modal.querySelector('.ps-category-tree');
                                const categoryTree = this.buildCategoryTree(this.promptData.categories);
                                const treeElement = this.renderCategoryTree(categoryTree, categoryTreeContainer);
                                categoryTreeContainer.innerHTML = '';
                                if (treeElement) categoryTreeContainer.appendChild(treeElement);

                                modal.querySelectorAll('.ps-tree-item.selected').forEach(el => el.classList.remove('selected'));
                                const selectedItem = categoryTreeContainer.querySelector(`.ps-tree-item[data-full-name="${this.selectedCategory}"]`);
                                if (selectedItem) {
                                    selectedItem.classList.add('selected');
                                }
                                this.renderPromptList(this.selectedCategory);
                            }
                            this.renderContent();
                            this.updateOutput();
                            this.updateCategoryDropdown();

                            // Move toast to the end
                            this.showToast(t('delete_success'));

                        } catch (e) {
                            logger.error("[PromptSelector] Error during category deletion:", e);
                            this.showToast(e.message || "删除分类时发生错误", 'error');
                        }
                    });
                };

                this.clearCategory = (categoryName) => {
                    if (categoryName === 'default') {
                        this.showToast(t('cannot_clear_default'), 'error');
                        return;
                    }
                    this.showConfirmModal(t('clear_category_confirm', { category: categoryName }), async () => {
                        const category = this.promptData.categories.find(c => c.name === categoryName);
                        if (!category || category.prompts.length === 0) {
                            this.showToast(t('clear_category_success'));
                            return;
                        }

                        // 获取所有提示词ID
                        const promptIds = category.prompts.map(p => p.id);

                        try {
                            // ✅ 调用批量删除 API
                            const response = await api.fetchApi("/prompt_selector/prompts/batch_delete", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    category: categoryName,
                                    prompt_ids: promptIds
                                })
                            });

                            if (response.ok) {
                                logger.info("✓ 分类已清空，从服务器重新拉取最新数据");

                                // ✅ 重新拉取数据
                                const freshData = await api.fetchApi("/prompt_selector/data").then(r => r.json());
                                this.promptData = freshData;

                                if (this.syncManager) {
                                    this.syncManager.lastModified = freshData.last_modified;
                                }

                                // 触发数据同步事件，通知其他UI组件（如library modal）刷新
                                document.dispatchEvent(new CustomEvent('ps-data-synced', {
                                    detail: { data: freshData }
                                }));

                                this.showToast(t('clear_category_success'));
                                const modal = document.querySelector('.ps-library-modal');
                                if (modal && this.selectedCategory === categoryName) {
                                    this.renderPromptList(categoryName);
                                }
                            }
                        } catch (error) {
                            logger.error("清空分类失败:", error);
                            this.showToast(error.message, 'error');
                        }
                    });
                };

                this.showInputModal = (title, message, defaultValue, onConfirm) => {
                    if (document.querySelector(".ps-input-modal")) return;

                    const modal = document.createElement("div");
                    modal.className = "ps-edit-modal ps-input-modal";
                    modal.innerHTML = `
                        <div class="ps-modal-content" style="width: 450px; max-width: 90vw;">
                            <h3>${title}</h3>
                            <label>${message}</label>
                            <input type="text" id="ps-input-value" value="${defaultValue || ''}">
                            <div class="ps-modal-buttons">
                                <button id="ps-input-confirm">${t('save')}</button>
                                <button id="ps-input-cancel">${t('cancel')}</button>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(modal);

                    const input = modal.querySelector("#ps-input-value");
                    input.focus();
                    input.select();

                    const closeModal = () => modal.remove();

                    const confirmButton = modal.querySelector("#ps-input-confirm");
                    confirmButton.addEventListener("click", () => {
                        if (onConfirm) {
                            onConfirm(input.value);
                        }
                        closeModal();
                    });

                    modal.querySelector("#ps-input-cancel").addEventListener("click", closeModal);

                    input.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            confirmButton.click();
                        } else if (e.key === 'Escape') {
                            closeModal();
                        }
                    });
                };

                this.updateBatchControls = () => {
                    const modal = document.querySelector('.ps-library-modal');
                    if (!modal || !this.batchMode) return;

                    const deleteBtn = modal.querySelector('#ps-batch-delete-btn');
                    const moveBtn = modal.querySelector('#ps-batch-move-btn');
                    const selectAllBtn = modal.querySelector('#ps-select-all-btn');
                    const selectedCount = this.selectedForBatch.size;

                    // 启用/禁用删除和移动按钮
                    deleteBtn.disabled = selectedCount === 0;
                    moveBtn.disabled = selectedCount === 0;

                    // 更新按钮文本
                    deleteBtn.textContent = selectedCount > 0 ? `${t('batch_delete')} (${selectedCount})` : t('batch_delete');
                    moveBtn.textContent = selectedCount > 0 ? `${t('batch_move')} (${selectedCount})` : t('batch_move');

                    // 更新全选/取消全选按钮的文本
                    const checkboxes = modal.querySelectorAll('.ps-prompt-list-container .ps-batch-checkbox');
                    const allChecked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);
                    selectAllBtn.textContent = allChecked ? t('deselect_all') : t('select_all');
                };


                this.renderCategoryTree = (nodes, container, onSelect, level = 0) => {
                    const ul = document.createElement("ul");
                    if (level > 0) {
                        ul.classList.add('nested');
                    }

                    nodes.forEach(node => {
                        const li = document.createElement("li");
                        li.dataset.fullName = node.fullName;

                        const itemDiv = document.createElement('div');
                        itemDiv.className = 'ps-tree-item';

                        const toggleSpan = document.createElement('span');
                        toggleSpan.className = 'ps-tree-toggle';

                        const nameSpan = document.createElement('span');
                        nameSpan.className = 'ps-tree-name';
                        nameSpan.textContent = node.name;

                        itemDiv.appendChild(toggleSpan);
                        itemDiv.appendChild(nameSpan);

                        // --- Add Category Count Badge ---
                        const getCategoryAndSubCategorySelectionCount = (categoryFullName) => {
                            let count = 0;
                            if (!this.selectedPrompts) return 0;
                            for (const categoryName in this.selectedPrompts) {
                                if (categoryName === categoryFullName || categoryName.startsWith(categoryFullName + '/')) {
                                    const selectionSet = this.selectedPrompts[categoryName];
                                    if (selectionSet) {
                                        count += selectionSet.size;
                                    }
                                }
                            }
                            return count;
                        };

                        const count = getCategoryAndSubCategorySelectionCount(node.fullName);

                        if (count > 0) {
                            const countBadge = document.createElement("span");
                            countBadge.className = "ps-category-count";
                            countBadge.innerHTML = `<span class="ps-count-number">${count}</span><span class="ps-delete-icon">×</span>`;
                            itemDiv.appendChild(countBadge);

                            countBadge.addEventListener("mouseenter", (e) => {
                                e.stopPropagation();
                                if (this.hidePreviewTimeout) {
                                    clearTimeout(this.hidePreviewTimeout);
                                    this.hidePreviewTimeout = null;
                                }
                                this.showActivePromptsPreview(node.fullName, e.currentTarget);
                            });
                            countBadge.addEventListener("mouseleave", (e) => {
                                e.stopPropagation();
                                this.hidePreviewTimeout = setTimeout(() => {
                                    this.hideActivePromptsPreview();
                                }, 100);
                            });

                            countBadge.addEventListener("click", (e) => {
                                e.stopPropagation();
                                this.clearCategorySelectionWithSubcategories(node.fullName);
                            });
                        }
                        // --- End of Badge Logic ---


                        li.appendChild(itemDiv);

                        if (node.children.length > 0) {
                            li.classList.add("parent");
                            const childrenUl = this.renderCategoryTree(node.children, li, onSelect, level + 1);
                            li.appendChild(childrenUl);
                        }

                        if (onSelect) {
                            // Dropdown menu logic: click on item toggles parent or selects leaf
                            itemDiv.addEventListener('click', (e) => {
                                e.stopPropagation();
                                if (e.target.closest('.ps-category-count')) return; // Ignore clicks on badge
                                // 如果是父分类，则切换展开/折叠
                                if (li.classList.contains('parent')) {
                                    li.classList.toggle('open');
                                } else {
                                    // 否则，选择该分类并关闭菜单
                                    onSelect(node);
                                }
                            });
                        } else {
                            // Library modal logic: combined click for the whole item
                            itemDiv.addEventListener('click', (e) => {
                                e.stopPropagation();
                                const modal = document.querySelector('.ps-library-modal');
                                if (!modal) return;

                                if (li.classList.contains('parent')) {
                                    li.classList.toggle('open');
                                }
                                this.selectedCategory = node.fullName;
                                this.renderPromptList(this.selectedCategory);
                                modal.querySelectorAll('.ps-tree-item.selected').forEach(el => el.classList.remove('selected'));
                                modal.querySelector('.ps-favorites-btn')?.classList.remove('selected');
                                itemDiv.classList.add('selected');
                            });

                            // Context menu for library items
                            itemDiv.addEventListener('contextmenu', (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                this.showCategoryContextMenu(e, node.fullName);
                            });
                        }

                        ul.appendChild(li);
                    });
                    return ul;
                };

                this.renderPromptList = (categoryName, searchTerm = '', skipSort = false) => {
                    const modal = document.querySelector('.ps-library-modal');
                    if (!modal) return;
                    const promptListContainer = modal.querySelector('.ps-prompt-list-container');
                    if (!promptListContainer) return;

                    promptListContainer.innerHTML = ''; // 清空
                    let promptsToShow = [];
                    const isParentCategory = categoryName && categoryName !== "__favorites__" && this.promptData.categories.some(c => c.name.startsWith(categoryName + '/'));

                    if (categoryName === "__favorites__") {
                        promptsToShow = this.promptData.categories.flatMap(c =>
                            c.prompts.map(p => ({ ...p, sourceCategory: c.name }))
                        ).filter(p => p.favorite);
                    } else if (isParentCategory) {
                        promptsToShow = this.promptData.categories
                            .filter(c => c.name === categoryName || c.name.startsWith(categoryName + '/'))
                            .flatMap(c => c.prompts.map(p => ({ ...p, sourceCategory: c.name })));
                    } else {
                        const category = this.promptData.categories.find(c => c.name === categoryName);
                        if (category) {
                            promptsToShow = category.prompts.map(p => ({ ...p, sourceCategory: category.name }));
                        }
                    }

                    // 应用搜索过滤
                    const currentSearchTerm = modal.querySelector('#ps-library-search-input').value.toLowerCase();
                    if (currentSearchTerm) {
                        if (!categoryName) { // If searching globally
                            promptsToShow = this.promptData.categories.flatMap(c => c.prompts);
                        }
                        promptsToShow = promptsToShow.filter(p => {
                            const searchInAlias = p.alias.toLowerCase().includes(currentSearchTerm);
                            const searchInPrompt = p.prompt.toLowerCase().includes(currentSearchTerm);
                            const searchInTags = p.tags && p.tags.some(tag => tag.toLowerCase().includes(currentSearchTerm));
                            const searchInDesc = p.description && p.description.toLowerCase().includes(currentSearchTerm);
                            return searchInAlias || searchInPrompt || searchInTags || searchInDesc;
                        });
                    }


                    // 应用收藏过滤
                    if (this.currentFilter.favorites) {
                        promptsToShow = promptsToShow.filter(p => p.favorite);
                    }

                    // 应用标签过滤
                    if (this.currentFilter.tags.length > 0) {
                        promptsToShow = promptsToShow.filter(p =>
                            p.tags && this.currentFilter.tags.some(tag => p.tags.includes(tag))
                        );
                    }


                    if (!promptsToShow.length) {
                        promptListContainer.innerHTML = `<p style="color: #555; text-align: center;">${t('no_matching_prompts')}</p>`;
                        return;
                    }

                    const list = document.createElement("ul");
                    list.className = "ps-prompt-list";
                    if (this.batchMode) {
                        list.classList.add('ps-batch-mode');
                    }
                    list.setAttribute('data-category', categoryName);

                    promptsToShow.forEach((p, index) => {
                        // 确保每个提示词都有ID
                        if (!p.id) {
                            p.id = `prompt-${Date.now()}-${index}`;
                        }

                        const item = document.createElement("li");
                        item.className = "ps-prompt-list-item";
                        item.setAttribute('data-prompt-id', p.id);
                        const isSingleCategoryView = categoryName && categoryName !== "__favorites__" && !isParentCategory && !currentSearchTerm;
                        item.draggable = isSingleCategoryView;

                        const favoriteClass = p.favorite ? 'favorite' : '';
                        const usageCount = p.usage_count || 0;
                        const tags = p.tags || [];

                        const showCategoryTag = isParentCategory && p.sourceCategory && p.sourceCategory !== categoryName;
                        // 从完整路径中提取子分类的名称
                        const subCategoryName = showCategoryTag ? p.sourceCategory.substring(categoryName.length + 1) : '';


                        item.innerHTML = `
                            ${this.batchMode ? `<div class="ps-batch-checkbox-wrapper"><input type="checkbox" class="ps-batch-checkbox" data-prompt-id="${p.id}"></div>` : ''}
                            <div class="ps-prompt-content">
                                <div class="ps-prompt-list-item-header">
                                    <div class="ps-prompt-list-item-name">${p.favorite ? '<span class="ps-favorite-star">⭐</span>' : ''}${p.alias}</div>
                                    ${showCategoryTag ? `<span class="ps-subcategory-tag">${subCategoryName}</span>` : ''}
                                </div>
                                <div class="ps-prompt-list-item-preview">${p.prompt}</div>
                                ${p.description ? `<div class="ps-prompt-description">${p.description}</div>` : ''}
                            </div>
                            <div class="ps-prompt-item-controls">
                                <button class="ps-btn ps-btn-icon ps-favorite-btn ${favoriteClass}" title="${t('mark_favorite')}" data-prompt-id="${p.id}">
                                    <svg viewBox="0 0 24 24"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"></polygon></svg>
                                </button>
                                <button class="ps-btn ps-btn-icon ps-copy-btn" title="${t('copy_prompt')}" data-prompt-id="${p.id}">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                </button>
                                <button class="ps-btn ps-btn-icon ps-edit-btn" title="${t('edit_prompt')}" data-prompt-id="${p.id}">
                                    <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                </button>
                                <button class="ps-btn ps-btn-icon ps-delete-btn" title="${t('delete_prompt_confirm', { prompt: p.alias })}" data-prompt-id="${p.id}">
                                    <svg viewBox="0 0 24 24"><polyline points="3,6 5,6 21,6"></polyline><path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"></path></svg>
                                </button>
                            </div>
                        `;

                        // 拖拽事件
                        if (isSingleCategoryView) {
                            item.addEventListener('dragstart', (e) => {
                                this.draggedItem = { id: p.id, index: index };
                                e.dataTransfer.effectAllowed = 'move';
                                item.classList.add('dragging');
                            });

                            item.addEventListener('dragend', (e) => {
                                item.classList.remove('dragging');
                                this.draggedItem = null;
                            });

                            item.addEventListener('dragover', (e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                                const rect = item.getBoundingClientRect();
                                const midY = rect.top + rect.height / 2;
                                if (e.clientY < midY) {
                                    item.classList.remove('drag-over-bottom');
                                    item.classList.add('drag-over-top');
                                } else {
                                    item.classList.remove('drag-over-top');
                                    item.classList.add('drag-over-bottom');
                                }
                            });

                            item.addEventListener('dragleave', () => {
                                item.classList.remove('drag-over-top', 'drag-over-bottom');
                            });

                            item.addEventListener('drop', (e) => {
                                e.preventDefault();
                                item.classList.remove('drag-over-top', 'drag-over-bottom');
                                if (this.draggedItem && this.draggedItem.id !== p.id) {
                                    const fromIndex = this.draggedItem.index;
                                    let toIndex = index;

                                    const rect = item.getBoundingClientRect();
                                    const midY = rect.top + rect.height / 2;
                                    if (e.clientY > midY) {
                                        toIndex++;
                                    }

                                    if (fromIndex < toIndex) {
                                        toIndex--;
                                    }

                                    this.reorderPrompts(categoryName, fromIndex, toIndex);
                                    this.renderPromptList(categoryName); // Re-render to show new order

                                    // Also re-render the main node view if the category is the same
                                    if (this.selectedCategory === categoryName) {
                                        this.renderContent();
                                        this.updateOutput();
                                    }
                                }
                                this.draggedItem = null;
                            });
                        }

                        // 悬浮预览
                        item.addEventListener('mouseenter', (e) => {
                            this.showPromptTooltip(e, p);
                        });
                        item.addEventListener('mouseleave', (e) => {
                            this.hidePromptTooltip();
                        });

                        // 悬浮预览
                        item.addEventListener('mouseenter', (e) => {
                            this.showPromptTooltip(e, p);
                        });
                        item.addEventListener('mouseleave', (e) => {
                            this.hidePromptTooltip();
                        });

                        // 单击加载提示词或切换选择
                        item.addEventListener('click', (e) => {
                            this.hidePromptTooltip(); // 在处理点击前，强制隐藏悬浮提示
                            if (e.target.closest('.ps-prompt-item-controls, .ps-tag')) {
                                return; // 忽略在按钮或标签上的点击
                            }

                            if (this.batchMode) {
                                const checkbox = item.querySelector('.ps-batch-checkbox');
                                if (checkbox) {
                                    checkbox.checked = !checkbox.checked;
                                    checkbox.dispatchEvent(new Event('change'));
                                }
                            } else {
                                this.loadPrompt(p);
                                const libraryModal = document.querySelector('.ps-library-modal');
                                if (libraryModal) libraryModal.querySelector("#ps-library-close").click();
                            }
                        });

                        // 按钮事件
                        const controlsEl = item.querySelector('.ps-prompt-item-controls');
                        if (controlsEl) {
                            const getRealCategory = (promptId) => {
                                if (categoryName !== '__favorites__') {
                                    return categoryName;
                                }
                                const { category } = this.findPromptAndCategory(promptId);
                                return category ? category.name : null;
                            };

                            controlsEl.querySelector('.ps-favorite-btn').addEventListener('click', (e) => {
                                e.stopPropagation();
                                const realCategoryName = getRealCategory(p.id);
                                if (realCategoryName) this.toggleFavorite(realCategoryName, p.id);
                            });
                            controlsEl.querySelector('.ps-copy-btn').addEventListener('click', (e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(p.prompt).then(() => {
                                    this.showToast(t('copy_success'));
                                });
                            });
                            controlsEl.querySelector('.ps-edit-btn').addEventListener('click', (e) => {
                                e.stopPropagation();
                                const realCategoryName = getRealCategory(p.id);
                                if (realCategoryName) this.showEditModal(p, realCategoryName);
                            });
                            controlsEl.querySelector('.ps-delete-btn').addEventListener('click', (e) => {
                                e.stopPropagation();
                                const realCategoryName = getRealCategory(p.id);
                                if (realCategoryName) {
                                    this.showConfirmModal(t('delete_prompt_confirm', { prompt: p.alias }), () => {
                                        this.deletePrompt(realCategoryName, p.id);
                                    });
                                }
                            });
                        }

                        // 批量选择事件
                        const batchCheckbox = item.querySelector('.ps-batch-checkbox');
                        if (batchCheckbox) {
                            batchCheckbox.addEventListener('change', (e) => {
                                if (e.target.checked) {
                                    this.selectedForBatch.add(p.id);
                                } else {
                                    this.selectedForBatch.delete(p.id);
                                }
                                this.updateBatchControls();
                            });
                        }

                        list.appendChild(item);
                    });

                    promptListContainer.appendChild(list);
                };

                this.buildCategoryTree = (categories) => {
                    const tree = [];
                    const map = {};

                    // Create a node for every category and subcategory
                    categories.forEach(cat => {
                        const parts = cat.name.split('/').filter(p => p.trim() !== ''); // Filter out empty parts
                        let currentPath = '';
                        parts.forEach(part => {
                            const oldPath = currentPath;
                            currentPath += (currentPath ? '/' : '') + part;
                            if (!map[currentPath]) {
                                map[currentPath] = {
                                    name: part,
                                    fullName: currentPath,
                                    children: [],
                                    parent: oldPath || null
                                };
                            }
                        });
                    });

                    // Link nodes to build the tree
                    Object.values(map).forEach(node => {
                        if (node.parent && map[node.parent]) {
                            if (!map[node.parent].children.some(child => child.fullName === node.fullName)) {
                                map[node.parent].children.push(node);
                            }
                        } else {
                            if (!tree.some(rootNode => rootNode.fullName === node.fullName)) {
                                tree.push(node);
                            }
                        }
                    });

                    // Sort children alphabetically
                    const sortNodes = (nodes) => {
                        nodes.sort((a, b) => a.name.localeCompare(b.name));
                        nodes.forEach(node => sortNodes(node.children));
                    };
                    sortNodes(tree);

                    return tree;
                };
                // 添加拖拽功能实现
                this.makeDraggable = (element, handle) => {
                    let isDragging = false;
                    let startX, startY, startLeft, startTop;

                    const onMouseDown = (e) => {
                        if (e.target !== handle && !handle.contains(e.target)) return;

                        isDragging = true;
                        startX = e.clientX;
                        startY = e.clientY;

                        const rect = element.getBoundingClientRect();
                        startLeft = rect.left;
                        startTop = rect.top;

                        element.style.position = 'fixed';
                        element.style.left = startLeft + 'px';
                        element.style.top = startTop + 'px';
                        element.style.margin = '0';

                        document.addEventListener('mousemove', onMouseMove);
                        document.addEventListener('mouseup', onMouseUp);

                        e.preventDefault();
                    };

                    const onMouseMove = (e) => {
                        if (!isDragging) return;

                        const deltaX = e.clientX - startX;
                        const deltaY = e.clientY - startY;

                        const newLeft = Math.max(0, Math.min(window.innerWidth - element.offsetWidth, startLeft + deltaX));
                        const newTop = Math.max(0, Math.min(window.innerHeight - element.offsetHeight, startTop + deltaY));

                        element.style.left = newLeft + 'px';
                        element.style.top = newTop + 'px';
                    };

                    const onMouseUp = () => {
                        isDragging = false;
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                    };

                    handle.addEventListener('mousedown', onMouseDown);
                    handle.style.cursor = 'move';
                };

                // 添加加载状态管理
                this.showLoadingState = (container, message = '加载中...') => {
                    container.innerHTML = `
                        <div class="ps-loading-container">
                            <div class="ps-loading-spinner"></div>
                            <span class="ps-loading-text">${message}</span>
                        </div>
                    `;
                };

                // 添加按钮加载状态
                this.setButtonLoading = (button, loading = true) => {
                    if (loading) {
                        button.disabled = true;
                        button.dataset.originalText = button.textContent;
                        button.innerHTML = `
                            <div class="ps-btn-loading">
                                <div class="ps-loading-spinner-sm"></div>
                                <span>处理中...</span>
                            </div>
                        `;
                    } else {
                        button.disabled = false;
                        button.textContent = button.dataset.originalText || button.textContent;
                    }
                };

                // 处理图片文件上传预览
                this.handleImageFileUpload = (file, previewContainer, callback) => {
                    if (!file || !file.type.startsWith("image/")) {
                        this.showToast("请选择有效的图片文件", 'error');
                        return;
                    }

                    const reader = new FileReader();
                    reader.onload = (event) => {
                        previewContainer.innerHTML = `<img src="${event.target.result}" alt="Preview" class="ps-uploaded-image">`;
                        if (callback) callback(file);
                    };
                    reader.onerror = () => {
                        this.showToast("图片读取失败", 'error');
                    };
                    reader.readAsDataURL(file);
                };

                this.showToast = (message, type = 'success') => {
                    // 使用全局toast系统
                    const widget = this.widgets.find(w => w.name === "prompt_selector");
                    const nodeContainer = widget && widget.element ? widget.element : null;

                    // 调用全局toast管理器
                    toastManagerProxy.showToast(message, type, 3000, {
                        nodeContainer: nodeContainer,
                        closable: true
                    });
                };

                this.showConfirmModal = (message, onConfirm) => {
                    // 防止重复创建
                    if (document.querySelector(".ps-confirm-modal")) return;

                    const modal = document.createElement("div");
                    modal.className = "ps-edit-modal ps-confirm-modal"; // Re-use styles
                    modal.innerHTML = `
                       <div class="ps-modal-content" style="width: 400px; max-width: 90vw;">
                            <h3>确认操作</h3>
                            <p>${message}</p>
                            <div class="ps-modal-buttons">
                               <button id="ps-confirm-ok">确认</button>
                               <button id="ps-confirm-cancel">取消</button>
                           </div>
                       </div>
                   `;
                    document.body.appendChild(modal);

                    const closeModal = () => modal.remove();

                    modal.querySelector("#ps-confirm-cancel").addEventListener("click", closeModal);
                    modal.querySelector("#ps-confirm-ok").addEventListener("click", () => {
                        onConfirm();
                        closeModal();
                    });
                };

                this.clearCategorySelectionWithSubcategories = (categoryName) => {
                    this.showConfirmModal(`确定要清空分类 "${categoryName}" 及其子分类中的所有已选项吗？`, () => {
                        for (const catName in this.selectedPrompts) {
                            if (catName === categoryName || catName.startsWith(categoryName + '/')) {
                                delete this.selectedPrompts[catName];
                            }
                        }
                        // Refresh the menu to update counts
                        const menu = document.querySelector(".ps-category-menu");
                        if (menu) {
                            const searchInput = menu.querySelector("input");
                            const searchTerm = searchInput ? searchInput.value : '';
                            const categoryBtn = this.widgets.find(w => w.name === "prompt_selector")?.element.querySelector("#ps-category-btn");
                            if (categoryBtn) {
                                this.showCategoryMenu(categoryBtn, true, searchTerm);
                            }
                        }
                        this.renderContent();
                        this.updateOutput();
                    });
                };

                this.applyTheme = () => {
                    const themeColor = this.promptData.settings?.theme_color || '#8a2be2';
                    document.documentElement.style.setProperty('--ps-theme-color', themeColor);
                    const secondaryColor = this.adjustColor(themeColor, 20);
                    document.documentElement.style.setProperty('--ps-theme-color-secondary', secondaryColor);
                    const contrastColor = this.getContrastColor(themeColor);
                    document.documentElement.style.setProperty('--ps-theme-contrast-color', contrastColor);
                    const secondaryContrastColor = this.getContrastColor(secondaryColor);
                    document.documentElement.style.setProperty('--ps-theme-contrast-color-secondary', secondaryContrastColor);
                };

                this.getContrastColor = (hexcolor) => {
                    if (hexcolor.startsWith('#')) {
                        hexcolor = hexcolor.slice(1);
                    }
                    const r = parseInt(hexcolor.substr(0, 2), 16);
                    const g = parseInt(hexcolor.substr(2, 2), 16);
                    const b = parseInt(hexcolor.substr(4, 2), 16);
                    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
                    return (yiq >= 128) ? '#000000' : '#FFFFFF';
                };

                this.adjustColor = (color, amount) => {
                    return '#' + color.replace(/^#/, '').replace(/../g, color => ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
                };

                // 设置节点尺寸
                this.size = [450, 600];
                this.setDirtyCanvas(true, true);

                // 限制最小尺寸
                this.onResize = function (size) {
                    const min_width = 420;
                    const min_height = 200;
                    if (size[0] < min_width) {
                        size[0] = min_width;
                    }
                    if (size[1] < min_height) {
                        size[1] = min_height;
                    }
                };

                this.showCategorySelectionModal = (onConfirm) => {
                    if (document.querySelector(".ps-category-select-modal")) return;

                    const modal = document.createElement("div");
                    modal.className = "ps-edit-modal ps-category-select-modal";
                    modal.innerHTML = `
                        <div class="ps-modal-content" style="width: 450px; max-width: 90vw; height: 500px; display: flex; flex-direction: column;">
                            <h3>${t('batch_move')}</h3>
                            <p>请选择目标分类:</p>
                            <div class="ps-category-tree" style="flex-grow: 1; overflow-y: auto; border: 1px solid #444; padding: 10px; border-radius: 8px; background: #222;"></div>
                            <div class="ps-modal-buttons">
                                <button id="ps-select-confirm" disabled>${t('save')}</button>
                                <button id="ps-select-cancel">${t('cancel')}</button>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(modal);

                    const treeContainer = modal.querySelector(".ps-category-tree");
                    const categoryTree = this.buildCategoryTree(this.promptData.categories);

                    let selectedCategory = null;
                    const confirmBtn = modal.querySelector("#ps-select-confirm");

                    // Local renderer for the selection tree
                    const _renderSelectionTree = (nodes, level = 0) => {
                        const ul = document.createElement("ul");
                        if (level > 0) ul.classList.add('nested');

                        nodes.forEach(node => {
                            const li = document.createElement("li");
                            li.dataset.fullName = node.fullName;

                            const itemDiv = document.createElement('div');
                            itemDiv.className = 'ps-tree-item';

                            const toggleSpan = document.createElement('span');
                            toggleSpan.className = 'ps-tree-toggle';

                            const nameSpan = document.createElement('span');
                            nameSpan.className = 'ps-tree-name';
                            nameSpan.textContent = node.name;

                            itemDiv.appendChild(toggleSpan);
                            itemDiv.appendChild(nameSpan);
                            li.appendChild(itemDiv);

                            if (node.children.length > 0) {
                                li.classList.add("parent");
                                const childrenUl = _renderSelectionTree(node.children, level + 1);
                                li.appendChild(childrenUl);
                            }

                            itemDiv.addEventListener('click', (e) => {
                                e.stopPropagation();
                                if (li.classList.contains('parent')) {
                                    li.classList.toggle('open');
                                }
                                treeContainer.querySelectorAll('.ps-tree-item.selected').forEach(el => el.classList.remove('selected'));
                                itemDiv.classList.add('selected');
                                selectedCategory = node.fullName;
                                confirmBtn.disabled = !selectedCategory || selectedCategory === this.selectedCategory;
                            });

                            ul.appendChild(li);
                        });
                        return ul;
                    };

                    const treeElement = _renderSelectionTree(categoryTree);
                    if (treeElement) { // Add a check here
                        treeContainer.appendChild(treeElement);
                    } else {
                        // logger.warn("[Debug] treeElement is null or undefined, not appending.");
                    }

                    const closeModal = () => modal.remove();
                    modal.querySelector("#ps-select-cancel").addEventListener("click", closeModal);
                    confirmBtn.addEventListener("click", () => {
                        if (onConfirm && selectedCategory) {
                            onConfirm(selectedCategory);
                        }
                        closeModal();
                    });
                };

                this.showImportModal = (file, categories) => {

                    if (document.querySelector(".ps-import-modal")) return;

                    const modal = document.createElement("div");
                    modal.className = "ps-edit-modal ps-import-modal";
                    modal.innerHTML = `
                        <div class="ps-modal-content" style="width: 500px; max-width: 90vw;">
                            <h3>选择要导入的提示词类别</h3>
                            <div class="ps-import-controls">
                                <button id="ps-import-select-all">全选</button>
                                <button id="ps-import-deselect-all">全不选</button>
                            </div>
                            <div class="ps-import-list-container"></div>
                            <div class="ps-modal-buttons">
                                <button id="ps-import-confirm">确认导入</button>
                                <button id="ps-import-cancel">取消</button>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(modal);

                    const listContainer = modal.querySelector(".ps-import-list-container");

                    // 创建简单的垂直列表
                    const list = document.createElement("ul");
                    list.className = "ps-import-category-list";

                    categories.forEach(categoryName => {
                        const item = document.createElement("li");
                        item.className = "ps-import-category-item";

                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.checked = true;
                        checkbox.className = 'ps-import-checkbox';
                        checkbox.dataset.fullName = categoryName;

                        const label = document.createElement('span');
                        label.className = 'ps-import-category-name';
                        label.textContent = categoryName;

                        item.appendChild(checkbox);
                        item.appendChild(label);

                        // 点击项目切换复选框
                        item.addEventListener('click', (e) => {
                            if (e.target.type !== 'checkbox') {
                                checkbox.checked = !checkbox.checked;
                            }
                        });

                        list.appendChild(item);
                    });

                    listContainer.appendChild(list);

                    // 简化的复选框逻辑
                    const allCheckboxes = Array.from(modal.querySelectorAll('.ps-import-checkbox'));

                    modal.querySelector('#ps-import-select-all').addEventListener('click', () => {
                        allCheckboxes.forEach(cb => cb.checked = true);
                    });
                    modal.querySelector('#ps-import-deselect-all').addEventListener('click', () => {
                        allCheckboxes.forEach(cb => cb.checked = false);
                    });

                    const closeModal = () => modal.remove();
                    modal.querySelector("#ps-import-cancel").addEventListener("click", closeModal);

                    modal.querySelector("#ps-import-confirm").addEventListener("click", async () => {
                        const selectedCategories = allCheckboxes
                            .filter(cb => cb.checked)
                            .map(cb => cb.dataset.fullName);

                        if (selectedCategories.length === 0) {
                            this.showToast("没有选择任何分类", "warning");
                            return;
                        }

                        const formData = new FormData();
                        formData.append("zip_file", file);
                        formData.append("selected_categories", JSON.stringify(selectedCategories));

                        this.setButtonLoading(modal.querySelector("#ps-import-confirm"), true);

                        try {
                            const response = await api.fetchApi("/prompt_selector/import", {
                                method: "POST",
                                body: formData,
                            });
                            if (response.ok) {
                                this.showToast(t('import_success'));
                                const data = await api.fetchApi("/prompt_selector/data").then(r => r.json());
                                this.promptData = data;
                                // 转换语言代码：zh-CN -> zh, en-US -> en
                                const legacyLang = this.promptData.settings?.language || "zh-CN";
                                const globalLang = legacyLang === "zh-CN" ? "zh" : "en";
                                globalMultiLanguageManager.setLanguage(globalLang, true);

                                if (this.promptData.categories.length > 0 && !this.promptData.categories.some(c => c.name === this.selectedCategory)) {
                                    this.selectedCategory = this.promptData.categories[0].name;
                                    this.saveLastCategory(this.selectedCategory);
                                }

                                this.updateCategoryDropdown();
                                this.renderContent();
                                updateUIText(this);

                                const libraryModal = document.querySelector('.ps-library-modal');
                                if (libraryModal) {
                                    const categoryTreeContainer = libraryModal.querySelector('.ps-category-tree');
                                    const categoryTree = this.buildCategoryTree(this.promptData.categories);
                                    const treeElement = this.renderCategoryTree(categoryTree, categoryTreeContainer);
                                    categoryTreeContainer.innerHTML = '';
                                    categoryTreeContainer.appendChild(treeElement);
                                    this.renderPromptList(this.selectedCategory);
                                }
                                this.showToast(t('refresh_success'));
                                closeModal();
                            } else {
                                const error = await response.json();
                                throw new Error(error.error || t('import_fail'));
                            }
                        } catch (error) {
                            this.showToast(`${t('import_fail')}: ${error.message}`, 'error');
                            this.setButtonLoading(modal.querySelector("#ps-import-confirm"), false);
                        }
                    });
                };
            };

            // 节点移除时的回调
            const onRemoved = nodeType.prototype.onRemoved;
            nodeType.prototype.onRemoved = function () {
                // 停止数据同步管理器（防止内存泄漏）
                if (this.syncManager) {
                    logger.info("停止数据同步管理器...");
                    this.syncManager.stop();
                    this.syncManager = null;
                }

                // 移除所有可能悬浮的UI元素
                this.hidePromptTooltip?.();
                this.hideActivePromptsPreview?.();

                // 移除可能打开的菜单或模态框
                const elementsToRemove = document.querySelectorAll(
                    ".ps-category-menu, .ps-edit-modal, .ps-library-modal, .ps-context-menu"
                );
                elementsToRemove.forEach(el => el.remove());

                onRemoved?.apply(this, arguments);

            };


            // --- 添加样式 ---
            if (!document.getElementById("ps-style")) {
                const style = document.createElement("style");
                style.id = "ps-style";
                style.textContent = `
                    /* General container and layout */
                    .prompt-selector-main-container {
                        display: flex;
                        flex-direction: column;
                        height: 100%;
                        background-color: #1B1B1B; /* Deep dark background */
                        border-radius: 12px; /* 设置圆角 */
                        overflow: hidden; /* 隐藏溢出的子元素 */
                    }
                    .prompt-selector-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 6px 8px;
                        flex-shrink: 0;
                        background-color: #222222; /* Header/footer background */
                        border-bottom: 1px solid #000;
                    }
                    .prompt-selector-footer {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 6px 8px;
                        flex-shrink: 0;
                        background-color: #222222; /* Header/footer background */
                        border-top: 1px solid #000;
                        border-bottom: none;
                    }
                    .header-controls-left, .header-controls-right,
                    .footer-controls-left, .footer-controls-right {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    .header-controls-center {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        padding: 0 12px;
                    }
                    .ps-search-container {
                        position: relative;
                        display: flex;
                        align-items: center;
                        width: 180px;
                    }
                    .ps-search-icon {
                        position: absolute;
                        left: 12px;
                        width: 18px;
                        height: 18px;
                        stroke: #999;
                        pointer-events: none;
                        z-index: 1;
                    }
                    .ps-search-input {
                        width: 100%;
                        background-color: #2a2a2a;
                        color: #e0e0e0;
                        border: 1px solid #444;
                        border-radius: 8px;
                        padding: 10px 40px 10px 38px;
                        font-size: 14px;
                        outline: none;
                        transition: all 0.2s ease;
                        min-height: 40px;
                    }
                    .ps-search-input:focus {
                        border-color: var(--ps-theme-color-secondary);
                        background-color: #333;
                        box-shadow: 0 0 0 2px color-mix(in srgb, var(--ps-theme-color-secondary) 20%, transparent);
                    }
                    .ps-search-input::placeholder {
                        color: #666;
                    }
                    .ps-search-clear-btn {
                        position: absolute !important;
                        right: 8px !important;
                        top: 50% !important;
                        margin-top: -10px !important;
                        width: 20px !important;
                        height: 20px !important;
                        padding: 0 !important;
                        background-color: rgba(255, 255, 255, 0.05) !important;
                        border: none !important;
                        border-radius: 50% !important;
                        cursor: pointer;
                        transition: all 0.2s ease !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                    }
                    .ps-search-clear-btn:hover {
                        background-color: rgba(255, 255, 255, 0.2) !important;
                        transform: scale(1.1) !important;
                        box-shadow: none !important;
                    }
                    .ps-search-clear-btn svg {
                        width: 12px !important;
                        height: 12px !important;
                        stroke: #999;
                    }
                    .prompt-selector-content-area {
                        flex-grow: 1;
                        overflow-y: auto;
                        padding: 8px;
                        background-color: #1B1B1B;
                    }
                    
                    .prompt-selector-content-area::-webkit-scrollbar {
                        width: 8px;
                    }
                    .prompt-selector-content-area::-webkit-scrollbar-track {
                        background: #1b1b1b;
                        border-radius: 4px;
                    }
                    .prompt-selector-content-area::-webkit-scrollbar-thumb {
                        background: #444;
                        border-radius: 4px;
                    }
                    .prompt-selector-content-area::-webkit-scrollbar-thumb:hover {
                        background: #555;
                    }
                    .prompt-selector-content-area::-webkit-scrollbar-button {
                        display: none;
                    }

                    /* Buttons */
                    .ps-btn {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 2px;
                        background-color: #3c3c3c;
                        color: #e0e0e0;
                        border: 1px solid #555;
                        border-radius: 8px;
                        cursor: pointer;
                        padding: 8px 10px;
                        font-size: 14px;
                        font-weight: 600;
                        transition: all 0.2s ease-in-out;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    }
                    .ps-btn:hover {
                        background-color: #4a4a4a;
                        border-color: var(--ps-theme-color-secondary);
                        box-shadow: 0 0 8px color-mix(in srgb, var(--ps-theme-color-secondary) 50%, transparent);
                        transform: translateY(-1px);
                    }
                    .ps-btn:active {
                        background-color: #2a2a2a;
                    }
                    .ps-btn svg {
                        width: 16px;
                        height: 16px;
                        stroke-width: 2.5;
                        fill: none;
                        stroke: currentColor;
                        stroke-linecap: round;
                        stroke-linejoin: round;
                        transition: transform 0.2s ease-in-out;
                    }
                    #ps-category-btn.open svg {
                        transform: rotate(180deg);
                    }
                    .ps-btn-icon {
                        padding: 8px;
                        width: 36px;
                        height: 36px;
                    }
                    .ps-btn-icon svg {
                        width: 20px;
                        height: 20px;
                    }

                    #ps-category-btn {
                       background-color: #2c2c2c;
                    }

                    #ps-library-btn {
                       background: linear-gradient(145deg, var(--ps-theme-color), var(--ps-theme-color-secondary));
                       border: none;
                       color: var(--ps-theme-contrast-color);
                    }
 
                    #ps-library-btn:hover {
                       background: linear-gradient(145deg, color-mix(in srgb, var(--ps-theme-color) 90%, white), color-mix(in srgb, var(--ps-theme-color-secondary) 90%, white));
                       box-shadow: 0 0 12px color-mix(in srgb, var(--ps-theme-color) 80%, transparent);
                    }

                    .ps-category-select {
                        background-color: #303030;
                        color: #d0d0d0;
                        border: 1px solid #3a3a3a;
                        border-radius: 6px;
                        padding: 6px 10px;
                        font-size: 13px;
                        font-weight: 500;
                    }
 
                   #ps-library-btn.highlight {
                       border-color: var(--ps-theme-color-secondary);
                       box-shadow: 0 0 8px color-mix(in srgb, var(--ps-theme-color-secondary) 70%, transparent);
                       color: var(--ps-theme-color-secondary);
                   }

                    /* Prompt List */
                    .prompt-list {
                        list-style: none;
                        padding: 0;
                        margin: 0;
                        display: flex;
                        flex-direction: column;
                        gap: 6px;
                    }
                    .prompt-item {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 8px;
                        padding: 8px 10px;
                        cursor: pointer;
                        border-radius: 8px;
                        background-color: #282828;
                        border: 1px solid #333;
                        transition: background-color 0.2s;
                        position: relative;
                        /* overflow: hidden; */ /* This was causing the top drag indicator to be clipped */
                    }
                    .prompt-item::after {
                        content: '';
                        position: absolute;
                        left: 0;
                        top: 0;
                        bottom: 0;
                        width: 5px;
                        background-color: #444;
                        transition: background-color 0.2s;
                    }
                    .prompt-item:hover {
                        background-color: #303030;
                    }
                    .prompt-item.selected {
                        background-color: color-mix(in srgb, var(--ps-theme-color) 30%, #282828); /* Mix theme color with item background */
                        border-color: var(--ps-theme-color-secondary);
                        color: white;
                        box-shadow: 0 0 5px color-mix(in srgb, var(--ps-theme-color) 50%, transparent);
                    }
                    .prompt-item.selected::after {
                        background-color: var(--ps-theme-color);
                    }
                    .prompt-text-container {
                        display: flex;
                        align-items: baseline;
                        flex-grow: 1;
                        min-width: 0; /* Important for flexbox truncation */
                    }
                    .prompt-item-alias {
                        white-space: nowrap;
                        flex-shrink: 0; /* Do not shrink the alias */
                    }
                    .prompt-item-full-prompt {
                        margin-left: 8px;
                        font-size: 0.85em;
                        color: #888;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        flex-shrink: 1; /* Allow shrinking */
                    }
                    .prompt-item-controls-wrapper {
                        display: flex;
                        flex-shrink: 0;
                        align-items: center;
                        gap: 4px;
                    }
                    
                    /* 权重输入框样式 - 始终显示在最右侧 */
                    .ps-weight-input {
                        width: 50px;
                        height: 24px;
                        padding: 4px 6px;
                        font-size: 12px;
                        color: #e0e0e0;
                        background-color: #2a2a2a;
                        border: 1px solid #555;
                        border-radius: 4px;
                        text-align: center;
                        outline: none;
                        transition: all 0.2s ease;
                        margin-left: 8px;
                    }
                    .ps-weight-input:hover {
                        border-color: #777;
                    }
                    .ps-weight-input:focus {
                        border-color: var(--ps-theme-color);
                        background-color: #333;
                    }
                    .ps-weight-input::placeholder {
                        color: #666;
                    }
                    
                    .ps-item-edit-btn, .ps-item-delete-btn, .ps-item-copy-btn {
                        background: none;
                        border: none;
                        color: #888;
                        cursor: pointer;
                        padding: 2px;
                        margin-left: 8px;
                        display: none; /* Hidden by default */
                    }
                    .prompt-item:hover .prompt-item-controls-wrapper .ps-item-edit-btn,
                    .prompt-item:hover .prompt-item-controls-wrapper .ps-item-delete-btn,
                    .prompt-item:hover .prompt-item-controls-wrapper .ps-item-copy-btn {
                        display: block; /* Show on hover */
                    }
                    .ps-item-edit-btn:hover, .ps-item-copy-btn:hover {
                        color: var(--ps-theme-color-secondary);
                    }
                    .ps-item-delete-btn:hover {
                        color: #e53935; /* A reddish color for delete */
                    }

                    .header-controls-right .ps-btn-icon {
                        padding: 6px;
                        width: 32px;
                        height: 32px;
                    }
                    .header-controls-right .ps-btn-icon svg {
                        width: 18px;
                        height: 18px;
                    }

                    /* Tooltip Styles */
                    .ps-tooltip strong { color: var(--ps-theme-color-secondary); }

                    /* Custom Category Menu */
                    .ps-category-menu {
                        position: absolute;
                        background-color: #2a2a2a;
                        border: 1px solid #444;
                        border-radius: 8px;
                        box-shadow: 0 5px 15px rgba(0,0,0,0.5);
                        z-index: 1000;
                        padding: 8px;
                        min-width: 200px;
                        max-height: 300px;
                        overflow-y: auto;
                    }
                    .ps-category-menu input {
                        width: 100%;
                        box-sizing: border-box;
                        background-color: #1b1b1b;
                        border: 1px solid #555;
                        color: #eee;
                        padding: 6px;
                        border-radius: 4px;
                        margin-bottom: 8px;
                    }
                    .ps-category-menu ul {
                        list-style: none;
                        padding: 0;
                        margin: 0;
                    }
                    .ps-category-count {
                        background-color: var(--ps-theme-color);
                        color: var(--ps-theme-contrast-color);
                        padding: 1px 6px;
                        border-radius: 10px;
                        font-size: 11px;
                        margin-left: auto;
                        padding-left: 10px;
                        flex-shrink: 0;
                        font-weight: bold;
                    }
                    .ps-total-count-badge {
                        background-color: var(--ps-theme-color);
                        color: var(--ps-theme-contrast-color);
                        padding: 1px 6px;
                        border-radius: 10px;
                        font-size: 11px;
                        margin-left: 8px;
                        font-weight: bold;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    }
                    .ps-category-count:hover, .ps-total-count-badge:hover {
                        background-color: #e53935; /* Red for delete */
                        color: white;
                    }
                    .ps-category-count .ps-count-number, .ps-total-count-badge .ps-count-number {
                        display: inline;
                    }
                    .ps-category-count .ps-delete-icon, .ps-total-count-badge .ps-delete-icon {
                        display: none;
                    }
                    .ps-preview-category {
                        color: #888;
                        margin-right: 5px;
                        font-size: 0.9em;
                    }
                    .ps-category-count:hover .ps-count-number, .ps-total-count-badge:hover .ps-count-number {
                        display: none;
                    }
                    .ps-category-count:hover .ps-delete-icon, .ps-total-count-badge:hover .ps-delete-icon {
                        display: inline;
                        font-weight: bold;
                    }
                    .ps-active-prompts-preview {
                        position: absolute;
                        background-color: #2a2a2a;
                        border: 1px solid #444;
                        border-radius: 8px;
                        box-shadow: 0 5px 15px rgba(0,0,0,0.5);
                        z-index: 1001; /* Above category menu */
                        padding: 8px;
                        overflow-y: auto;
                        animation: ps-modal-fade-in 0.2s ease-out;
                    }
                    .ps-active-prompts-preview ul {
                        list-style: none;
                        padding: 0;
                        margin: 0;
                    }
                    .ps-active-prompts-preview li {
                        padding: 4px 8px;
                        color: #ccc;
                        font-size: 12px;
                        white-space: nowrap;
                    }
 
                    /* Category Menu Styles */
                    .ps-category-menu {
                        position: absolute;
                        background-color: #2a2a2a;
                        border: 1px solid #444;
                        border-radius: 8px;
                        box-shadow: 0 5px 15px rgba(0,0,0,0.5);
                        z-index: 1000;
                        padding: 8px;
                        min-width: 250px;
                        max-height: 400px;
                        display: flex;
                        flex-direction: column;
                    }
                    .ps-menu-header {
                        padding-bottom: 8px;
                        border-bottom: 1px solid #444;
                    }
                    #ps-category-search {
                        width: 100%;
                        box-sizing: border-box;
                        background-color: #1b1b1b;
                        border: 1px solid #555;
                        color: #eee;
                        padding: 6px;
                        border-radius: 4px;
                    }
                    .ps-category-menu .ps-category-tree {
                         flex-grow: 1;
                         overflow-y: auto;
                         margin-top: 8px;
                    }
                    .ps-category-tree {
                        flex-grow: 1;
                        overflow-y: auto;
                        margin-top: 0;
                        padding: 0;
                    }
                    .ps-category-tree > ul {
                        list-style: none;
                        padding-left: 0;
                    }
                    .ps-category-tree ul ul {
                        padding-left: 5px;
                    }
                    .ps-category-tree li {
                        padding: 2px 0;
                        cursor: pointer;
                        color: #ccc;
                    }
                    .ps-category-tree li span {
                        transition: color 0.2s;
                    }
                    .ps-category-tree li span:hover {
                        color: var(--ps-theme-color-secondary); /* Lighter Orchid */
                    }
                    .ps-category-tree li ul {
                        display: none;
                    }
                    .ps-category-tree li.open > ul {
                        display: block;
                    }
                    .ps-menu-footer {
                        padding-top: 8px;
                        margin-top: 8px;
                        border-top: 1px solid #444;
                        display: flex;
                        gap: 8px;
                        justify-content: flex-end;
                    }
                    .ps-menu-footer button {
                        background-color: #333;
                        border: 1px solid #555;
                        color: #ccc;
                        padding: 4px 8px;
                        border-radius: 4px;
                        cursor: pointer;
                    }
                    .ps-menu-footer button:hover {
                        background-color: #444;
                        border-color: var(--ps-theme-color-secondary);
                    }
                    .ps-menu-footer button:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                    }

                    .ps-category-menu ul.nested {
                        display: none;
                    }
                    .ps-category-menu li.open > ul.nested {
                        display: block;
                    }
                    .ps-category-menu li {
                        padding: 0;
                        list-style: none;
                    }

                    /* Edit Modal Base Style */
                    .ps-edit-modal {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background-color: rgba(0, 0, 0, 0.7);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        z-index: 1000;
                        animation: ps-modal-fade-in 0.2s ease-out;
                    }

                   /* New Library Modal Styles */
                   .ps-library-modal {
                       position: fixed;
                       top: 0;
                       left: 0;
                       width: 100%;
                       height: 100%;
                       background-color: rgba(0, 0, 0, 0.7);
                       display: flex;
                       justify-content: center;
                       align-items: center;
                       z-index: 999;
                   }

                   .ps-library-content {
                       width: 800px;
                       height: 600px;
                       background-color: #2a2a2a;
                       border: 1px solid #444;
                       border-radius: 12px;
                       box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                       display: flex;
                       flex-direction: column;
                       overflow: hidden;
                       resize: both;
                   }

                   .ps-library-header {
                       display: flex;
                       justify-content: space-between;
                       align-items: center;
                       padding: 10px 15px;
                       border-bottom: 1px solid #444;
                       flex-shrink: 0;
                       cursor: move;
                   }

                   .ps-library-header h3 {
                       margin: 0;
                       font-size: 16px;
                       color: #eee;
                   }

                   #ps-library-close {
                       padding: 2px;
                       width: 28px;
                       height: 28px;
                       font-size: 24px;
                       line-height: 1;
                       cursor: pointer;
                   }

                   .ps-library-search {
                       padding: 10px 15px;
                       flex-shrink: 0;
                   }

                   #ps-library-search-input {
                       width: 100%;
                       box-sizing: border-box;
                       background-color: #1b1b1b;
                       border: 1px solid #555;
                       color: #eee;
                       padding: 8px 12px;
                       border-radius: 6px;
                   }

                   .ps-library-body {
                       flex-grow: 1;
                       display: flex;
                       overflow: hidden;
                       padding: 0 15px 10px 0;
                       gap: 10px;
                   }

                   .ps-library-left-panel {
                       background-color: #222;
                       border-radius: 8px;
                       padding: 10px;
                       overflow-y: auto;
                       display: flex;
                       flex-direction: column;
                   }
                   .ps-library-right-panel {
                       background-color: #1B1B1B;
                       border-radius: 8px;
                       padding: 10px;
                       overflow-y: auto;
                   }

                   .ps-library-left-panel {
                       width: 35%;
                       flex-shrink: 0;
                       min-width: 200px;
                   }

                   .ps-library-right-panel {
                       width: 65%;
                   }

                   .ps-library-footer {
                       display: flex;
                       justify-content: space-between;
                       align-items: center;
                       padding: 10px 15px;
                       border-top: 1px solid #444;
                       flex-shrink: 0;
                   }

                   .ps-library-footer .footer-left, .ps-library-footer .footer-right {
                       display: flex;
                       gap: 10px;
                   }

                   /* 新增样式 */

                   .ps-header-controls {
                       display: flex;
                       gap: 8px;
                       align-items: center;
                   }

                   .ps-filter-bar {
                       display: none; /* Hidden by default */
                       justify-content: flex-end;
                       align-items: center;
                       margin-top: 10px;
                       padding-top: 10px;
                       border-top: 1px solid #444;
                   }

                   .ps-filter-group {
                       display: flex;
                       gap: 10px;
                       align-items: center;
                   }

                   .ps-filter-toggle {
                       display: flex;
                       align-items: center;
                       gap: 5px;
                       color: #ccc;
                       font-size: 12px;
                   }

                   .ps-select {
                       background-color: #1b1b1b;
                       border: 1px solid #555;
                       color: #eee;
                       padding: 4px 8px;
                       border-radius: 4px;
                       font-size: 12px;
                   }

                   .ps-batch-controls {
                       display: flex;
                       gap: 8px;
                       align-items: center;
                   }

                   .ps-category-header, .ps-prompt-header {
                       display: flex;
                       justify-content: space-between;
                       align-items: center;
                       margin-bottom: 10px;
                       padding-bottom: 8px;
                       /* border-bottom: 1px solid #333; */
                   }

                   .ps-category-header h4, .ps-prompt-header h4 {
                       margin: 0;
                       color: #eee;
                       font-size: 14px;
                   }

                   .ps-prompt-controls {
                       display: flex;
                       gap: 8px;
                       align-items: center;
                   }
                   .ps-btn-sm {
                       padding: 6px 12px;
                       font-size: 13px;
                       display: flex;
                       align-items: center;
                       gap: 6px;
                   }
                   .ps-btn-primary {
                       background-color: var(--ps-theme-color);
                       border-color: var(--ps-theme-color);
                       color: var(--ps-theme-contrast-color);
                   }
                   .ps-btn-primary:hover {
                       background-color: var(--ps-theme-color-secondary);
                       border-color: var(--ps-theme-color-secondary);
                   }

                   .ps-prompt-list-container {
                       flex-grow: 1;
                       overflow-y: auto;
                   }

                   .ps-prompt-list {
                       list-style: none;
                       padding: 0;
                       margin: 0;
                       display: flex;
                       flex-direction: column;
                       gap: 8px;
                   }

                   .ps-prompt-list-item {
                       background-color: #282828;
                       border: 1px solid #333;
                       border-radius: 8px;
                       padding: 12px 15px;
                       transition: all 0.2s;
                       display: flex;
                       align-items: center;
                       justify-content: space-between;
                       position: relative;
                   }

                   .ps-prompt-list-item:hover {
                       background-color: #303030;
                       border-color: #444;
                   }

                   .ps-prompt-item-controls {
                       display: flex;
                       gap: 4px;
                       flex-shrink: 0;
                   }
                   .ps-prompt-item-controls .ps-btn-icon {
                       background-color: transparent;
                       border: 1px solid transparent;
                       color: #777;
                       padding: 5px;
                       border-radius: 6px;
                       transition: all 0.2s;
                       display: none; /* 默认隐藏 */
                   }
                   .ps-prompt-list-item:hover .ps-prompt-item-controls .ps-btn-icon {
                       display: inline-flex; /* 悬停时显示 */
                   }
                   .ps-prompt-item-controls .ps-btn-icon:hover {
                       background-color: #3a3a3a;
                       color: white;
                   }
                   .ps-prompt-item-controls .ps-copy-btn:hover {
                       color: var(--ps-theme-color-secondary);
                   }
                   .ps-prompt-item-controls .ps-btn-icon svg {
                       width: 16px;
                       height: 16px;
                   }

                   .ps-prompt-stats {
                       display: flex;
                       gap: 8px;
                       align-items: center;
                       font-size: 12px;
                       color: #888;
                   }

                   .ps-usage-count {
                       display: flex;
                       align-items: center;
                       gap: 2px;
                   }

                   .ps-prompt-content {
                       flex-grow: 1;
                       cursor: pointer;
                       overflow: hidden;
                       padding-right: 10px;
                   }

                   .ps-prompt-list-item-header {
                       display: flex;
                       align-items: baseline;
                       gap: 8px;
                       margin-bottom: 4px;
                   }

                   .ps-prompt-list-item-name {
                       font-weight: bold;
                       color: #eee;
                       font-size: 14px;
                       white-space: nowrap;
                       overflow: hidden;
                       text-overflow: ellipsis;
                       flex-shrink: 1;
                   }

                   .ps-subcategory-tag {
                       background-color: color-mix(in srgb, var(--ps-theme-color) 50%, #444);
                       color: #fff;
                       padding: 2px 6px;
                       border-radius: 4px;
                       font-size: 11px;
                       font-weight: bold;
                       flex-shrink: 0;
                       white-space: nowrap;
                   }

                   .ps-prompt-list-item-preview {
                       color: #999;
                       font-size: 12px;
                       line-height: 1.4;
                       margin-bottom: 6px;
                       white-space: nowrap;
                       overflow: hidden;
                       text-overflow: ellipsis;
                   }

                   .ps-prompt-description {
                       color: #999;
                       font-size: 12px;
                       font-style: italic;
                       margin-bottom: 6px;
                   }

                   .ps-prompt-tags {
                       display: flex;
                       gap: 4px;
                       flex-wrap: wrap;
                   }

                   .ps-tag {
                       background-color: #444;
                       color: #ccc;
                       padding: 2px 6px;
                       border-radius: 12px;
                       font-size: 11px;
                       border: 1px solid #555;
                   }

                   .ps-favorite-btn.favorite {
                       color: #FFD700;
                   }

                   .ps-favorite-star {
                       margin-right: 5px;
                       color: #FFD700;
                   }

                   .ps-favorite-btn.favorite svg {
                       fill: #FFD700;
                   }

                   .ps-batch-checkbox-wrapper {
                       flex-shrink: 0;
                       margin-right: 15px;
                       display: flex;
                       align-items: center;
                       justify-content: center;
                   }
                   .ps-batch-checkbox {
                       width: 18px;
                       height: 18px;
                       accent-color: var(--ps-theme-color);
                   }
                   .ps-prompt-list-item {
                       cursor: default; /* Remove pointer cursor from the whole item */
                   }
                   .ps-prompt-list.ps-batch-mode .ps-prompt-list-item {
                       cursor: pointer; /* Add pointer cursor in batch mode */
                   }
                   .ps-prompt-content {
                       cursor: pointer; /* Add pointer cursor only to the content area */
                   }

                   .ps-status-text {
                       color: #888;
                       font-size: 12px;
                   }


                   /* 编辑模态框增强 */
                   .ps-settings-modal .ps-modal-content {
                       padding: 20px;
                   }
                   .ps-settings-modal select {
                        width: 100%;
                        background-color: #1b1b1b;
                        border: 1px solid #555;
                        color: #eee;
                        padding: 8px;
                        border-radius: 4px;
                        box-sizing: border-box;
                   }
                   .ps-settings-sidebar {
                        width: 140px;
                        flex-shrink: 0;
                        border-right: 1px solid #444;
                        padding-right: 15px;
                   }
                   .ps-settings-content {
                        flex-grow: 1;
                        overflow-y: auto;
                        padding-left: 20px;
                   }
                   .ps-sidebar-btn {
                        display: block;
                        width: 100%;
                        background: none;
                        border: none;
                        border-left: 3px solid transparent;
                        color: #ccc;
                        padding: 10px 15px;
                        cursor: pointer;
                        font-size: 14px;
                        text-align: left;
                        margin-bottom: 5px;
                        transition: all 0.2s ease;
                   }
                   .ps-sidebar-btn.active {
                        color: var(--ps-theme-color-secondary);
                        font-weight: bold;
                        background-color: color-mix(in srgb, var(--ps-theme-color-secondary) 10%, transparent);
                        border-left-color: var(--ps-theme-color-secondary);
                   }
                   .ps-sidebar-btn:hover:not(.active) {
                        background-color: #3a3a3a;
                        color: white;
                   }
                   .ps-settings-pane {
                        display: none;
                   }
                   .ps-settings-pane.active {
                        display: block;
                        animation: ps-modal-fade-in 0.3s;
                   }
                   .ps-edit-modal .ps-modal-content {
                       background-color: #2a2a2a;
                       border: 1px solid #444;
                       border-radius: 12px;
                       padding: 20px;
                       color: #eee;
                   }
                   .ps-edit-form-container {
                       display: flex;
                       gap: 20px;
                   }
                   .ps-edit-form-left {
                       flex: 2;
                   }
                   .ps-edit-form-right {
                       flex: 1;
                       display: flex;
                       flex-direction: column;
                   }

                   /* 图片上传区域 */
                   .ps-image-upload-area {
                       position: relative;
                       width: 100%;
                       cursor: pointer;
                       transition: all 0.3s ease;
                   }

                   .ps-image-upload-area:hover {
                       transform: translateY(-2px);
                   }

                   .ps-image-dragover {
                       transform: translateY(0) !important;
                       opacity: 0.8;
                   }

                   .ps-preview-container {
                       width: 100%;
                       aspect-ratio: 1 / 1;
                       background: rgba(26, 26, 38, 0.6);
                       border: 2px dashed rgba(255, 255, 255, 0.2);
                       border-radius: 8px;
                       display: flex;
                       align-items: center;
                       justify-content: center;
                       overflow: hidden;
                       transition: all 0.2s ease;
                   }

                   .ps-image-upload-area:hover .ps-preview-container {
                       border-color: #7c3aed;
                       background: rgba(124, 58, 237, 0.05);
                   }

                   .ps-image-dragover .ps-preview-container {
                       border-color: #7c3aed;
                       background: rgba(124, 58, 237, 0.1);
                   }

                   .ps-preview-container .ps-uploaded-image {
                       width: 100%;
                       height: 100%;
                       object-fit: cover;
                   }

                   .ps-no-preview {
                       display: flex;
                       flex-direction: column;
                       align-items: center;
                       justify-content: center;
                       gap: 12px;
                       padding: 20px;
                       color: rgba(176, 176, 176, 0.6);
                       text-align: center;
                   }

                   .ps-no-preview svg {
                       color: rgba(176, 176, 176, 0.4);
                       flex-shrink: 0;
                   }

                   .ps-no-preview p {
                       margin: 0;
                       font-size: 13px;
                       line-height: 1.4;
                   }
                   .ps-edit-modal h3 {
                       margin-top: 0;
                       color: #eee;
                       border-bottom: 1px solid #444;
                       padding-bottom: 10px;
                   }

                   .ps-edit-modal label {
                       display: block;
                       margin: 15px 0 5px;
                       color: #ccc;
                       font-weight: bold;
                   }

                   .ps-edit-modal input, .ps-edit-modal textarea, .ps-edit-modal select {
                       width: 100%;
                       background-color: #1b1b1b;
                       border: 1px solid #555;
                       color: #eee;
                       padding: 8px;
                       border-radius: 4px;
                       box-sizing: border-box;
                   }

                   .ps-edit-modal textarea {
                       resize: vertical;
                       min-height: 80px;
                   }

                   .ps-modal-buttons {
                       display: flex;
                       gap: 10px;
                       justify-content: flex-end;
                       margin-top: 20px;
                       padding-top: 15px;
                       border-top: 1px solid #444;
                   }

                   .ps-modal-buttons button {
                       padding: 8px 16px;
                       border: none;
                       border-radius: 4px;
                       cursor: pointer;
                       font-weight: bold;
                   }

                   .ps-modal-buttons button:first-child {
                       background-color: var(--ps-theme-color-secondary);
                       color: var(--ps-theme-contrast-color-secondary);
                    }

                   .ps-modal-buttons button:last-child {
                       background-color: #555;
                       color: #ccc;
                   }

                   .ps-modal-buttons button:hover {
                       opacity: 0.8;
                   }

                   /* 标签输入和预览样式 */
                   .ps-tags-input-container {
                       margin-bottom: 10px;
                   }

                   .ps-tags-preview {
                       margin-top: 8px;
                       display: flex;
                       gap: 4px;
                       flex-wrap: wrap;
                       min-height: 24px;
                       padding: 4px;
                       border: 1px solid #333;
                       border-radius: 4px;
                       background-color: #1b1b1b;
                   }

                   .ps-edit-options {
                       display: flex;
                       gap: 20px;
                       margin: 15px 0;
                       padding: 10px;
                       background-color: #333;
                       border-radius: 4px;
                   }

                   .ps-checkbox-label {
                       display: flex;
                       align-items: center;
                       gap: 8px;
                       color: #ccc;
                       cursor: pointer;
                   }

                   .ps-checkbox-label input[type="checkbox"] {
                       accent-color: var(--ps-theme-color-secondary);
                   }

                   /* 批量操作激活状态 */
                   .ps-btn.active {
                       background-color: var(--ps-theme-color-secondary);
                       color: var(--ps-theme-contrast-color-secondary);
                       border-color: var(--ps-theme-color-secondary);
                   }

                   /* 拖拽样式 */
                   .prompt-item.dragging,
                   .ps-prompt-list-item.dragging {
                       opacity: 0.4;
                       background: #444;
                       transform: scale(0.98);
                       z-index: 100;
                   }

                   .prompt-item,
                   .ps-prompt-list-item {
                       position: relative; /* Ensure pseudo-elements are positioned relative to the item */
                   }

                   .prompt-item.drag-over-top::before,
                   .ps-prompt-list-item.drag-over-top::before {
                       content: '';
                       position: absolute;
                       top: -2px;
                       left: 10px;
                       right: 10px;
                       height: 4px;
                       background-color: var(--ps-theme-color);
                       border-radius: 2px;
                       box-shadow: 0 0 10px var(--ps-theme-color);
                       z-index: 1;
                   }

                   /* For .prompt-item, ::after is the side-bar, so we must use ::before for the bottom indicator */
                   .prompt-item.drag-over-bottom::before {
                       content: '';
                       position: absolute;
                       bottom: -2px;
                       left: 10px;
                       right: 10px;
                       height: 4px;
                       background-color: var(--ps-theme-color);
                       border-radius: 2px;
                       box-shadow: 0 0 10px var(--ps-theme-color);
                       z-index: 1;
                   }

                   /* For .ps-prompt-list-item, pseudo-elements are free, so we can keep using ::after for the bottom */
                   .ps-prompt-list-item.drag-over-bottom::after {
                       content: '';
                       position: absolute;
                       bottom: -2px;
                       left: 10px;
                       right: 10px;
                       height: 4px;
                       background-color: var(--ps-theme-color);
                       border-radius: 2px;
                       box-shadow: 0 0 10px var(--ps-theme-color);
                       z-index: 1;
                   }

                   /* 加载状态样式 */
                   .ps-loading-container {
                       display: flex;
                       flex-direction: column;
                       align-items: center;
                       justify-content: center;
                       padding: 40px;
                       color: #ccc;
                   }

                   .ps-loading-spinner {
                       width: 40px;
                       height: 40px;
                       border: 3px solid #444;
                       border-top: 3px solid var(--ps-theme-color-secondary);
                       border-radius: 50%;
                       animation: ps-spin 1s linear infinite;
                       margin-bottom: 15px;
                   }

                   .ps-loading-spinner-sm {
                       width: 16px;
                       height: 16px;
                       border: 2px solid #444;
                       border-top: 2px solid #fff;
                       border-radius: 50%;
                       animation: ps-spin 1s linear infinite;
                       margin-right: 8px;
                   }

                   .ps-btn-loading {
                       display: flex;
                       align-items: center;
                       justify-content: center;
                   }

                   @keyframes ps-spin {
                       0% { transform: rotate(0deg); }
                       100% { transform: rotate(360deg); }
                   }

                   .ps-loading-text {
                       font-size: 14px;
                       color: #888;
                   }

                   /* 动画和过渡效果 */
                   .ps-library-modal {
                       animation: ps-modal-fade-in 0.3s ease-out;
                   }

                   .ps-library-content {
                       animation: ps-modal-slide-in 0.3s ease-out;
                   }

                   @keyframes ps-modal-fade-in {
                       from { opacity: 0; }
                       to { opacity: 1; }
                   }

                   @keyframes ps-modal-slide-in {
                       from {
                           opacity: 0;
                           transform: scale(0.9) translateY(-20px);
                       }
                       to {
                           opacity: 1;
                           transform: scale(1) translateY(0);
                       }
                   }

                   .ps-category-tree ul {
                       list-style: none;
                       padding: 0;
                       margin: 0;
                   }
                   .ps-category-tree li {
                       position: relative;
                       padding-left: 0;
                       transition: all 0.2s ease;
                   }
                   .ps-category-tree li::before, .ps-category-tree li::after {
                       display: none;
                   }
                   .ps-category-tree ul.nested {
                       display: none;
                   }
                   .ps-category-tree li.open > ul.nested {
                       display: block;
                   }
                   .ps-tree-item {
                       display: flex;
                       align-items: center;
                       padding: 4px 8px;
                       margin: 2px 0;
                       border-radius: 6px;
                       transition: all 0.2s ease;
                       cursor: pointer;
                   }
                   .ps-tree-item:hover {
                       background-color: #333;
                   }
                   .ps-tree-item.selected {
                       background-color: var(--ps-theme-color);
                       color: var(--ps-theme-contrast-color);
                       box-shadow: 0 0 8px color-mix(in srgb, var(--ps-theme-color) 50%, transparent);
                   }
                   .ps-tree-toggle {
                       width: 16px;
                       height: 16px;
                       display: flex;
                       align-items: center;
                       justify-content: center;
                       flex-shrink: 0;
                       margin-right: 6px;
                   }
                   li:not(.parent) .ps-tree-toggle {
                       visibility: hidden; /* Hide toggle for non-parent items but keep space */
                   }
                   .ps-tree-toggle::before {
                       content: '▸';
                       color: #888;
                       transition: transform 0.2s ease;
                       transform: rotate(0deg);
                   }
                   li.open > .ps-tree-item > .ps-tree-toggle::before {
                       transform: rotate(90deg);
                   }
                   .ps-tree-name {
                       white-space: nowrap;
                       overflow: hidden;
                       text-overflow: ellipsis;
                   }

                   .ps-prompt-list-item {
                       transition: all 0.2s ease, transform 0.1s ease;
                   }

                   .ps-prompt-list-item:hover {
                       /* transform: translateY(-1px); */
                       /* box-shadow: 0 4px 12px rgba(0,0,0,0.3); */
                   }

                   .ps-btn {
                       transition: all 0.2s ease;
                   }

                   /* Context Menu */
                   .ps-context-menu {
                       position: fixed;
                       background-color: #3a3a3a;
                       border: 1px solid #555;
                       border-radius: 8px;
                       box-shadow: 0 5px 15px rgba(0,0,0,0.5);
                       z-index: 1002;
                       padding: 5px;
                       min-width: 150px;
                   }
                   .ps-context-menu ul {
                       list-style: none;
                       padding: 0;
                       margin: 0;
                   }
                   .ps-context-menu li {
                       padding: 8px 12px;
                       cursor: pointer;
                       border-radius: 4px;
                       display: flex;
                       align-items: center;
                       gap: 8px;
                   }
                   .ps-context-menu li:hover {
                       background-color: var(--ps-theme-color-secondary);
                       color: var(--ps-theme-contrast-color-secondary);
                   }
                   .ps-context-menu li svg {
                       width: 16px;
                       height: 16px;
                   }

                   /* Context Menu */
                   .ps-context-menu {
                       position: fixed;
                       background-color: #3a3a3a;
                       border: 1px solid #555;
                       border-radius: 8px;
                       box-shadow: 0 5px 15px rgba(0,0,0,0.5);
                       z-index: 1002;
                       padding: 5px;
                       min-width: 150px;
                   }
                   .ps-context-menu ul {
                       list-style: none;
                       padding: 0;
                       margin: 0;
                   }
                   .ps-context-menu li {
                       padding: 8px 12px;
                       cursor: pointer;
                       border-radius: 4px;
                       display: flex;
                       align-items: center;
                       gap: 8px;
                   }
                   .ps-context-menu li:hover {
                       background-color: var(--ps-theme-color-secondary);
                       color: var(--ps-theme-contrast-color-secondary);
                   }
                   .ps-context-menu li svg {
                       width: 16px;
                       height: 16px;
                   }

                   /* .ps-btn:hover is already defined above, removing this duplicate */

                   .ps-btn:active {
                       transform: translateY(0);
                   }

                   /* 响应式布局 */
                   @media (max-width: 1024px) {
                       .ps-library-content {
                           width: 90vw;
                           height: 80vh;
                       }
                       
                       .ps-library-left-panel {
                           width: 40%;
                       }
                       
                       .ps-library-right-panel {
                           width: 60%;
                       }
                   }

                   @media (max-width: 768px) {
                       .ps-library-content {
                           width: 95vw;
                           height: 90vh;
                       }
                       
                       .ps-library-body {
                           flex-direction: column;
                       }
                       
                       .ps-library-left-panel, .ps-library-right-panel {
                           width: 100%;
                           height: 50%;
                       }
                       
                       .ps-filter-bar {
                           flex-direction: column;
                           gap: 10px;
                           align-items: stretch;
                       }
                       
                       .ps-filter-group {
                           flex-wrap: wrap;
                       }
                       
                       .ps-header-controls {
                           flex-wrap: wrap;
                       }
                       
                       .ps-prompt-controls {
                           flex-wrap: wrap;
                       }
                   }

                   @media (max-width: 480px) {
                       .ps-library-header {
                           padding: 8px 10px;
                       }
                       
                       .ps-library-header h3 {
                           font-size: 14px;
                       }
                       
                       .ps-btn {
                           padding: 4px 8px;
                           font-size: 12px;
                       }
                       
                       .ps-btn-sm {
                           padding: 2px 6px;
                           font-size: 11px;
                       }
                       
                       .ps-prompt-list-item {
                           padding: 8px;
                       }
                       
                       .ps-prompt-item-header {
                           flex-direction: column;
                           align-items: flex-start;
                           gap: 8px;
                       }
                   }

                   .ps-favorites-container {
                       padding-bottom: 10px;
                       margin-bottom: 10px;
                       border-bottom: 1px solid #333;
                   }

                   .ps-favorites-btn {
                       width: 100%;
                       text-align: left;
                       padding: 8px 15px;
                       font-size: 14px;
                       background-color: #282828;
                       border: 1px solid #333;
                       justify-content: flex-start;
                       border-radius: 8px;
                   }

                   .ps-favorites-btn.selected {
                       background-color: var(--ps-theme-color-secondary);
                       color: var(--ps-theme-contrast-color-secondary);
                       border-color: var(--ps-theme-color-secondary);
                   }

                   /* 工具提示增强 */
                   .ps-tooltip {
                       position: absolute;
                       background-color: #2a2a2a;
                       border: 1px solid #444;
                       border-radius: 8px;
                       padding: 12px;
                       box-shadow: 0 8px 24px rgba(0,0,0,0.4);
                       z-index: 1001;
                       max-width: 300px;
                       animation: ps-tooltip-fade-in 0.2s ease-out;
                   }

                   @keyframes ps-tooltip-fade-in {
                       from {
                           opacity: 0;
                           transform: translateY(10px);
                       }
                       to {
                           opacity: 1;
                           transform: translateY(0);
                       }
                   }

                   .ps-tooltip img {
                       max-width: 100%;
                       border-radius: 4px;
                       margin-bottom: 8px;
                   }

                   .ps-tooltip strong {
                       display: block;
                       margin-bottom: 4px;
                       color: var(--ps-theme-color-secondary);
                   }

                   .ps-tooltip p {
                       margin: 0;
                       color: #ccc;
                       font-size: 13px;
                       line-height: 1.4;
                   }

                   /* New Prompt Tooltip */
                   .ps-prompt-tooltip {
                       position: fixed;
                       background-color: #181818;
                       border: 1px solid #555;
                       color: #eee;
                       padding: 0;
                       border-radius: 8px;
                       z-index: 1005; /* High z-index */
                       font-size: 13px;
                       max-width: 500px;
                       word-wrap: break-word;
                       pointer-events: none; /* Prevent tooltip from blocking mouse events */
                       animation: ps-tooltip-fade-in 0.15s ease-out;
                       box-shadow: 0 5px 15px rgba(0,0,0,0.5);
                       display: flex;
                   }
                   .ps-tooltip-content {
                       display: flex;
                       flex-direction: row;
                       align-items: flex-start;
                       padding: 10px;
                       gap: 10px;
                   }
                   .ps-tooltip-image-container {
                       flex-shrink: 0;
                       width: 150px;
                       max-width: 150px;
                       max-height: 200px;
                       overflow: hidden;
                       display: flex;
                       align-items: center;
                       justify-content: center;
                   }
                   .ps-prompt-tooltip img {
                       max-width: 100%;
                       max-height: 100%;
                       object-fit: contain;
                       border-radius: 4px;
                       margin-bottom: 0;
                   }
                   .ps-tooltip-text-container {
                       flex-grow: 1;
                       min-width: 0;
                       border: 1px solid #444;
                       padding: 8px;
                       border-radius: 4px;
                       background-color: #222;
                   }
                   .ps-prompt-tooltip p {
                       margin: 0;
                       line-height: 1.4;
                   }
                   .ps-tooltip-no-preview {
                       width: 150px;
                       height: 150px;
                       background-color: #222;
                       display: flex;
                       align-items: center;
                       justify-content: center;
                       color: #777;
                       font-size: 16px;
                       border-radius: 4px;
                       margin-bottom: 0;
                   }

                   /* 滚动条美化 */
                   .ps-library-left-panel::-webkit-scrollbar,
                   .ps-library-right-panel::-webkit-scrollbar,
                   .ps-prompt-list-container::-webkit-scrollbar {
                       width: 8px;
                   }

                   .ps-library-left-panel::-webkit-scrollbar-track,
                   .ps-library-right-panel::-webkit-scrollbar-track,
                   .ps-prompt-list-container::-webkit-scrollbar-track {
                       background: #1b1b1b;
                       border-radius: 4px;
                   }

                   .ps-library-left-panel::-webkit-scrollbar-thumb,
                   .ps-library-right-panel::-webkit-scrollbar-thumb,
                   .ps-prompt-list-container::-webkit-scrollbar-thumb {
                       background: #444;
                       border-radius: 4px;
                   }

                   .ps-library-left-panel::-webkit-scrollbar-thumb:hover,
                   .ps-library-right-panel::-webkit-scrollbar-thumb:hover,
                   .ps-prompt-list-container::-webkit-scrollbar-thumb:hover {
                       background: #555;
                   }

                   .ps-library-left-panel::-webkit-scrollbar-button,
                   .ps-library-right-panel::-webkit-scrollbar-button,
                   .ps-prompt-list-container::-webkit-scrollbar-button {
                       display: none;
                   }

                   /* 焦点状态 */
                   .ps-btn:focus {
                       outline: none;
                   }
                   .ps-library-modal input:focus,
                   .ps-library-modal textarea:focus,
                   .ps-library-modal select:focus,
                   .prompt-selector-main-container input:focus,
                   .prompt-selector-main-container textarea:focus,
                   .prompt-selector-main-container select:focus {
                       outline: 2px solid var(--ps-theme-color-secondary);
                       outline-offset: 2px;
                   }

                   /* 禁用状态 */
                   .ps-btn:disabled {
                       opacity: 0.5;
                       cursor: not-allowed;
                       transform: none !important;
                   }

                   /* 成功/错误状态 */
                   .ps-btn-success {
                       background-color: #28a745;
                       border-color: #28a745;
                   }

                   .ps-btn-danger {
                       background-color: #dc3545;
                       border-color: #dc3545;
                   }

                   .ps-btn-warning {
                       background-color: #ffc107;
                       border-color: #ffc107;
                       color: #212529;
                   }
                `;
                style.textContent += `
                    /* Import Modal Styles - Simplified List Layout */
                    .ps-import-list-container {
                        height: 300px;
                        overflow-y: auto;
                        border: 1px solid #444;
                        padding: 8px;
                        margin: 15px 0;
                        border-radius: 8px;
                        background: #222;
                    }
                    .ps-import-category-list {
                        list-style: none;
                        padding: 0;
                        margin: 0;
                        display: flex;
                        flex-direction: column;
                        gap: 4px;
                    }
                    .ps-import-category-item {
                        display: flex;
                        align-items: center;
                        padding: 8px 12px;
                        margin: 0;
                        border-radius: 6px;
                        transition: all 0.2s ease;
                        cursor: pointer;
                        gap: 10px;
                        background-color: #282828;
                        border: 1px solid #333;
                    }
                    .ps-import-category-item:hover {
                        background-color: #333;
                        border-color: #444;
                    }
                    .ps-import-category-name {
                        flex-grow: 1;
                        color: #eee;
                        font-size: 14px;
                        text-align: left;
                    }
                    .ps-import-controls {
                        display: flex;
                        gap: 10px;
                        margin-bottom: 10px;
                    }
                    .ps-import-controls button {
                        background-color: #444;
                        border: 1px solid #666;
                        color: #eee;
                        padding: 6px 12px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 13px;
                    }
                    .ps-import-controls button:hover {
                        background-color: #555;
                    }
                    .ps-import-modal .ps-import-checkbox {
                        width: 18px;
                        height: 18px;
                        accent-color: var(--ps-theme-color);
                        margin: 0;
                        flex-shrink: 0;
                    }
                    /* 滚动条样式 */
                    .ps-import-list-container::-webkit-scrollbar {
                        width: 8px;
                    }
                    .ps-import-list-container::-webkit-scrollbar-track {
                        background: #1b1b1b;
                        border-radius: 4px;
                    }
                    .ps-import-list-container::-webkit-scrollbar-thumb {
                        background: #444;
                        border-radius: 4px;
                    }
                    .ps-import-list-container::-webkit-scrollbar-thumb:hover {
                        background: #555;
                    }

                    .ps-highlight-new {
                        animation: ps-highlight-new-item 2s ease-out;
                    }
                    @keyframes ps-highlight-new-item {
                       0% { background-color: var(--ps-theme-color-secondary); }
                       100% { background-color: #282828; }
                   }
                `;
                document.head.appendChild(style);
            }
        }
    },
});