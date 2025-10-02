import { app } from "../../../scripts/app.js";
import { $el } from "../../../scripts/ui.js";

app.registerExtension({
    name: "Comfy.DanbooruGallery",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name === "DanbooruGalleryNode") {
            // 多语言字典
            const i18n = {
                zh: {
                    // 搜索和控制
                    searchPlaceholder: "Tags (最多2个, 例如: 1girl, blue_eyes) - 第三个及后续tag将被忽略...",
                    categories: "类别",
                    formatting: "格式",
                    all: "全部",
                    general: "普通",
                    sensitive: "敏感",
                    questionable: "可疑",
                    explicit: "露骨",
                    artist: "画师",
                    copyright: "版权",
                    character: "角色",
                    meta: "元数据",

                    // 格式选项
                    escapeBrackets: "() -> \\(\\)",
                    replaceUnderscores: "_ -> 空格",

                    // 按钮
                    ranking: "排行榜",
                    refresh: "刷新",
                    settings: "设置",
                    language: "语言",
                    blacklist: "黑名单",
                    download: "下载原图",
                    favorite: "收藏",
                    unfavorite: "取消收藏",
                    favorites: "收藏夹",
                    userAuth: "用户认证",
                    username: "用户名",
                    apiKey: "API Key",
                    authDescription: "请输入您的Danbooru用户名和API Key来使用收藏功能",
                    authPlaceholderUsername: "输入您的Danbooru用户名",
                    authPlaceholderApiKey: "输入您的API Key",
                    authRequired: "请先在设置中配置用户名和API Key",
                    apiKeyHelp: "如何获取API Key？",
                    apiKeyTooltip: "点击查看如何获取Danbooru API Key和用户名",
                    languageSettings: "语言设置",
                    blacklistSettings: "黑名单设置",
                    promptFilterSettings: "提示词过滤设置",
                    promptFilterEnable: "启用提示词过滤",
                    promptFilterDescription: "从输出的提示词中移除指定的标签，每行一个标签",
                    promptFilterPlaceholder: "输入要过滤的标签，每行一个...\n例如：\nwatermark\nsample_watermark\nweibo_username",

                    // 界面设置
                    uiSettings: "界面设置",
                    autocompleteSettings: "自动补全设置",
                    autocompleteEnable: "启用自动补全",
                    autocompleteEnableDescription: "在输入标签时显示建议",
                    autocompleteMaxResults: "最大补全数量",
                    tooltipSettings: "悬浮提示设置",
                    tooltipEnable: "启用悬浮提示",
                    tooltipEnableDescription: "鼠标悬停在图片上时显示详细信息",

                    // 状态信息
                    loading: "加载中...",
                    noResults: "未找到结果",

                    // 黑名单对话框
                    blacklistTitle: "黑名单设置",
                    blacklistDescription: "每行一个标签，这些标签的图片将被过滤掉",
                    blacklistPlaceholder: "输入要屏蔽的标签，每行一个...\n例如：\nloli\nshota\nexplicit",
                    cancel: "取消",
                    save: "保存",
                    saveFailed: "保存失败，请重试",

                    // 悬浮提示
                    ratingTooltip: "按图片分级过滤 (General, Sensitive, Questionable, Explicit)",
                    categoriestooltip: "选择输出中包含的标签类别 (Artist, Copyright, Character, General, Meta)",
                    formattingTooltip: "输出标签的文本格式选项 (转义括号, 替换下划线)",
                    rankingTooltip: "切换排行榜 (order:rank)",
                    blacklistTooltip: "黑名单设置",
                    refreshTooltip: "刷新",
                    languageTooltip: "语言切换",

                    // 详细信息
                    details: "详细信息",
                    uploaded: "上传时间",
                    resolution: "分辨率",

                    // 社交链接
                    socialLinks: "社交链接",
                    githubTooltip: "访问GitHub项目页面",
                    discordTooltip: "加入Discord服务器",

                    // 设置侧边栏
                    generalSection: "通用",
                    userSection: "用户",
                    contentSection: "内容",
                    promptSection: "提示词",
                    uiSection: "界面",
                    editMode: "编辑模式",
                    editPanelTitle: "编辑提示词",
                    close: "关闭",
                    clearSearch: "清空搜索",
                    search: "搜索",
                    delete: "删除",
                    addTag: "添加标签",
                    resetTags: "重置标签",
                    edited: "已编辑",
                    viewImage: "查看大图",
                    copyTags: "复制标签",
                    copyTagsSuccess: "标签已复制到剪贴板！",
                    copyTagsFail: "复制标签失败。",
                    noTagsToCopy: "没有可复制的标签。",
                    importSettings: "导入设置",
                    exportSettings: "导出设置",
                    importSuccess: "设置已成功导入！",
                    exportSuccess: "设置已成功导出！",
                    importError: "导入设置失败，文件格式错误。",
                    saveSuccess: "设置已保存！",
                    filter: "筛选",
                    filterTooltip: "筛选图像",
                    filterByTime: "按时间范围筛选",
                    startTime: "开始时间",
                    endTime: "结束时间",
                    filterByPage: "按起始页码筛选",
                    startPage: "起始页码",
                    apply: "应用",
                    reset: "重置",
                    filterActive: "筛选已生效",
                    currentPage: "当前页",
                    totalPages: "总页数",
                },
                en: {
                    // 搜索和控制
                    searchPlaceholder: "Tags (Max 2, e.g., 1girl, blue_eyes) - Third and subsequent tags will be ignored...",
                    categories: "Categories",
                    formatting: "Formatting",
                    all: "ALL",
                    general: "General",
                    sensitive: "Sensitive",
                    questionable: "Questionable",
                    explicit: "Explicit",
                    artist: "Artist",
                    copyright: "Copyright",
                    character: "Character",
                    meta: "Meta",

                    // 格式选项
                    escapeBrackets: "() -> \\(\\)",
                    replaceUnderscores: "_ -> space",

                    // 按钮
                    ranking: "Ranking",
                    refresh: "Refresh",
                    settings: "Settings",
                    language: "Language",
                    blacklist: "Blacklist",
                    download: "Download Original",
                    favorite: "Favorite",
                    unfavorite: "Unfavorite",
                    favorites: "Favorites",
                    userAuth: "User Authentication",
                    username: "Username",
                    apiKey: "API Key",
                    authDescription: "Please enter your Danbooru username and API Key to use favorite features",
                    authPlaceholderUsername: "Enter your Danbooru username",
                    authPlaceholderApiKey: "Enter your API Key",
                    authRequired: "Please configure username and API Key in settings first",
                    apiKeyHelp: "How to get API Key?",
                    apiKeyTooltip: "Click to see how to get Danbooru API Key and username",
                    languageSettings: "Language Settings",
                    blacklistSettings: "Blacklist Settings",
                    promptFilterSettings: "Prompt Filter Settings",
                    promptFilterEnable: "Enable Prompt Filter",
                    promptFilterDescription: "Remove specified tags from output prompts, one tag per line",
                    promptFilterPlaceholder: "Enter tags to filter, one per line...\nExample:\nwatermark\nsample_watermark\nweibo_username",

                    // UI Settings
                    uiSettings: "UI Settings",
                    autocompleteSettings: "Autocomplete Settings",
                    autocompleteEnable: "Enable Autocomplete",
                    autocompleteEnableDescription: "Show suggestions while typing tags",
                    autocompleteMaxResults: "Max Results",
                    tooltipSettings: "Tooltip Settings",
                    tooltipEnable: "Enable Tooltip",
                    tooltipEnableDescription: "Show details when hovering over an image",

                    // 状态信息
                    loading: "Loading...",
                    noResults: "No results found.",

                    // 黑名单对话框
                    blacklistTitle: "Blacklist Settings",
                    blacklistDescription: "Each line contains one tag, images with these tags will be filtered out",
                    blacklistPlaceholder: "Enter tags to blacklist, one per line...\nExample:\nloli\nshota\nexplicit",
                    cancel: "Cancel",
                    save: "Save",
                    saveFailed: "Save failed, please try again",

                    // 悬浮提示
                    ratingTooltip: "Filter by image rating (General, Sensitive, Questionable, Explicit)",
                    categoriestooltip: "Select which tag categories to include in output (Artist, Copyright, Character, General, Meta)",
                    formattingTooltip: "Text formatting options for output tags (escape brackets, replace underscores)",
                    rankingTooltip: "Toggle Ranking (order:rank)",
                    blacklistTooltip: "Blacklist Settings",
                    refreshTooltip: "Refresh",
                    languageTooltip: "Language Switch",

                    // 详细信息
                    details: "Details",
                    uploaded: "Uploaded",
                    resolution: "Resolution",

                    // 社交链接
                    socialLinks: "Social Links",
                    githubTooltip: "Visit GitHub repository",
                    discordTooltip: "Join Discord server",

                    // 设置侧边栏
                    generalSection: "General",
                    userSection: "User",
                    contentSection: "Content",
                    promptSection: "Prompt",
                    uiSection: "UI",
                    editMode: "Edit Mode",
                    editPanelTitle: "Edit Prompt",
                    close: "Close",
                    clearSearch: "Clear Search",
                    search: "Search",
                    delete: "Delete",
                    addTag: "Add Tag",
                    resetTags: "Reset Tags",
                    edited: "Edited",
                    viewImage: "View Image",
                    copyTags: "Copy Tags",
                    copyTagsSuccess: "Tags copied to clipboard!",
                    copyTagsFail: "Failed to copy tags.",
                    noTagsToCopy: "No tags to copy.",
                    importSettings: "Import Settings",
                    exportSettings: "Export Settings",
                    importSuccess: "Settings imported successfully!",
                    exportSuccess: "Settings exported successfully!",
                    importError: "Failed to import settings, invalid file format.",
                    saveSuccess: "Settings saved!",
                    filter: "Filter",
                    filterTooltip: "Filter images",
                    filterByTime: "Filter by Time Range",
                    startTime: "Start Time",
                    endTime: "End Time",
                    filterByPage: "Filter by Start Page",
                    startPage: "Start Page",
                    apply: "Apply",
                    reset: "Reset",
                    filterActive: "Filter is active",
                    currentPage: "Current Page",
                    totalPages: "Total Pages",
                }
            };
            // 当前语言
            let currentLanguage = 'zh';

            // 获取翻译文本
            const t = (key) => {
                return i18n[currentLanguage]?.[key] || i18n.zh[key] || key;
            };

            // 本地存储函数
            const saveToLocalStorage = (key, value) => {
                try {
                    localStorage.setItem(`danbooru_gallery_${key}`, JSON.stringify(value));
                } catch (e) {
                    console.warn(`[Danbooru Gallery] Failed to save to localStorage: ${key}`, e);
                }
            };

            const loadFromLocalStorage = (key, defaultValue) => {
                try {
                    const item = localStorage.getItem(`danbooru_gallery_${key}`);
                    return item ? JSON.parse(item) : defaultValue;
                } catch (e) {
                    console.warn(`[Danbooru Gallery] Failed to load from localStorage: ${key}`, e);
                    return defaultValue;
                }
            };

            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                onNodeCreated?.apply(this, arguments);
                this.setSize([780, 938]);

                // 保存节点实例引用
                const nodeInstance = this;

                // 存储每张图片的原始标签数据，用于重置和编辑状态判断
                const originalPostCache = {};

                // 创建隐藏的 selection_data widget
                const selectionWidget = this.addWidget("text", "selection_data", JSON.stringify({}), () => { }, {
                    serialize: true // 确保序列化
                });

                // 确保widget不可见
                if (selectionWidget) {
                    selectionWidget.computeSize = () => [0, -4]; // 返回0宽度和负高度来隐藏
                    selectionWidget.draw = () => { }; // 覆盖draw方法，不绘制任何内容
                    selectionWidget.type = "hidden"; // 设置为隐藏类型
                    Object.defineProperty(selectionWidget, 'hidden', { value: true, writable: false }); // 标记为隐藏
                }

                // 创建隐藏的 filter_data widget
                const filterWidget = this.addWidget("text", "filter_data", JSON.stringify({ startTime: null, endTime: null, startPage: null }), () => { }, {
                    serialize: true // 确保序列化
                });

                // 确保widget不可见
                if (filterWidget) {
                    filterWidget.computeSize = () => [0, -4];
                    filterWidget.draw = () => { };
                    filterWidget.type = "hidden";
                    Object.defineProperty(filterWidget, 'hidden', { value: true, writable: false });
                }

                const container = $el("div.danbooru-gallery");

                // 添加错误显示区域
                const errorDisplay = $el("div.danbooru-error-display", {
                    style: {
                        display: "none",
                        color: "#dc3545",
                        marginBottom: "10px",
                        padding: "8px 12px",
                        border: "1px solid #dc3545",
                        borderRadius: "4px",
                        backgroundColor: "rgba(220, 53, 69, 0.1)",
                        fontSize: "14px",
                        fontWeight: "500"
                    }
                });
                container.appendChild(errorDisplay);

                // 添加tag提示显示区域
                const tagHintDisplay = $el("div.danbooru-tag-hint-display", {
                    style: {
                        display: "none",
                        color: "#17a2b8",
                        marginBottom: "5px",
                        padding: "6px 10px",
                        border: "1px solid #17a2b8",
                        borderRadius: "4px",
                        backgroundColor: "rgba(23, 162, 184, 0.1)",
                        fontSize: "13px",
                        fontWeight: "500"
                    }
                });
                container.appendChild(tagHintDisplay);

                // 显示错误信息的函数
                const showError = (message, persistent = false, anchorElement = null) => {
                    showToast(message, 'error');
                };

                // 清除错误信息的函数
                const clearError = () => {
                    errorDisplay.style.display = "none";
                };

                // 显示tag提示信息的函数
                const showTagHint = (message, persistent = false) => {
                    tagHintDisplay.textContent = message;
                    tagHintDisplay.style.display = "block";
                    if (!persistent) {
                        // 3秒后自动隐藏
                        setTimeout(() => {
                            tagHintDisplay.style.display = "none";
                        }, 3000);
                    }
                };

                // 清除tag提示信息的函数
                const clearTagHint = () => {
                    tagHintDisplay.style.display = "none";
                };

                // 检查网络连接状态
                const checkNetworkStatus = async () => {
                    try {
                        const response = await fetch('/danbooru_gallery/check_network');
                        const data = await response.json();
                        const isConnected = data.success && data.connected;
                        const now = Date.now();

                        // 更新网络状态
                        networkStatus.connected = isConnected;
                        networkStatus.lastChecked = now;

                        return isConnected;
                    } catch (e) {
                        console.warn('网络检测失败:', e);
                        networkStatus.connected = false;
                        networkStatus.lastChecked = Date.now();
                        return false;
                    }
                };

                this.addDOMWidget("danbooru_gallery_widget", "div", container, {
                    onDraw: () => { }
                });


                // 确保在 widget 渲染后调整大小
                setTimeout(() => {
                    this.onResize(this.size);
                }, 10);

                let globalTooltip, globalTooltipTimeout;
                let posts = [], currentPage = 1, isLoading = false;
                let filterState = { startTime: null, endTime: null, startPage: null };
                let userAuth = { username: "", api_key: "", has_auth: false }; // 用户认证信息
                let userFavorites = []; // 用户收藏列表，确保字符串
                let networkStatus = { connected: true, lastChecked: 0 }; // 网络状态跟踪
                let previousSearchValue = ""; // 跟踪搜索框之前的值，用于检测清空操作
                let temporaryTagEdits = {}; // Keyed by post.id

                // 用户认证管理功能
                const loadUserAuth = async () => {
                    try {
                        const response = await fetch('/danbooru_gallery/user_auth');
                        const data = await response.json();
                        userAuth = data;
                        return data;
                    } catch (e) {
                        console.warn("加载用户认证信息失败:", e);
                        userAuth = { username: "", api_key: "", has_auth: false };
                        return userAuth;
                    }
                };

                const saveUserAuth = async (username, api_key) => {
                    try {
                        const response = await fetch('/danbooru_gallery/user_auth', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ username: username, api_key: api_key })
                        });
                        const data = await response.json();
                        if (data.success) {
                            userAuth = { username, api_key, has_auth: true };
                        }
                        return data;
                    } catch (e) {
                        console.warn("保存用户认证信息失败:", e);
                        return { success: false, error: "网络错误" };
                    }
                };

                // 显示提示消息功能
                const showToast = (message, type = 'info', anchorElement = null) => {
                    // 尝试使用 ComfyUI 的内置系统
                    if (app.ui && app.ui.showToast) {
                        app.ui.showToast(message, type);
                        return;
                    }
                    if (app.ui && app.ui.notification && app.ui.notification.show) {
                        app.ui.notification.show(message, type);
                        return;
                    }
                    if (app.ui && app.ui.dialog && app.ui.dialog.showMessage) {
                        app.ui.dialog.showMessage(message);
                        return;
                    }

                    // Custom fallback with stacking
                    let toastContainer = document.querySelector("#danbooru-gallery-toast-container");
                    if (!toastContainer) {
                        toastContainer = $el("div#danbooru-gallery-toast-container");
                        document.body.appendChild(toastContainer);
                    }

                    const toast = $el("div.danbooru-toast", {
                        textContent: message,
                    });
                    toast.classList.add(`danbooru-toast-${type}`);
                    toastContainer.appendChild(toast);

                    setTimeout(() => {
                        toast.classList.add('show');
                    }, 10);

                    const duration = type === 'error' ? 5000 : 3000;
                    setTimeout(() => {
                        toast.classList.remove('show');
                        toast.classList.add('fade-out');
                        setTimeout(() => {
                            toast.remove();
                            if (toastContainer.children.length === 0) {
                                toastContainer.remove();
                            }
                        }, 300);
                    }, duration);
                };

                // 收藏管理功能
                const addToFavorites = async (postId, button = null) => {
                    if (!userAuth.has_auth) {
                        alert(t('authRequired'));
                        return { success: false, error: t('authRequired') };
                    }

                    // 显示加载状态
                    if (button) {
                        button.disabled = true;
                        const originalHTML = button.innerHTML;
                        button.innerHTML = '<div class="spinner"></div>';
                        button.dataset.originalHTML = originalHTML;
                    }

                    try {
                        const response = await fetch('/danbooru_gallery/favorites/add', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ post_id: postId })
                        });
                        const data = await response.json();

                        // 恢复按钮状态
                        if (button) {
                            button.disabled = false;
                            if (data.success || data.message === "已收藏，无需重复操作") {
                                button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="#DC3545" stroke="#DC3545" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                </svg>`;
                                button.title = t('unfavorite');
                                button.classList.add('favorited');
                                if (!userFavorites.includes(postId)) {
                                    userFavorites.push(String(postId));
                                }
                                // 显示收藏成功提示
                                showToast(t('favorite') + '成功', 'success', button);
                            } else {
                                button.innerHTML = button.dataset.originalHTML || originalHTML;
                            }
                            delete button.dataset.originalHTML;
                        }

                        if (!data.success) {
                            let errorMsg = data.error || "未知错误";
                            if (data.error.includes("网络错误")) {
                                showError(`${errorMsg} - 请检查网络连接`);
                            } else if (data.error.includes("认证") || data.error.includes("401")) {
                                errorMsg = `${errorMsg}\n\n${t('authRequired')}`;
                                if (confirm(errorMsg + "\n\n是否打开设置？")) {
                                    showSettingsDialog();
                                }
                            } else if (data.error.includes("Rate Limited") || data.error.includes("429")) {
                                showError(`${errorMsg} - 请稍后重试`);
                            } else {
                                showError(errorMsg);
                            }
                        }

                        return data;
                    } catch (e) {
                        console.warn("添加收藏失败:", e);
                        showError("网络错误 - 无法连接到Danbooru服务器");
                        if (button) {
                            button.disabled = false;
                            button.innerHTML = button.dataset.originalHTML || '<svg>...</svg>';  // 恢复
                            delete button.dataset.originalHTML;
                        }
                        return { success: false, error: "网络错误" };
                    }
                };

                const removeFromFavorites = async (postId, button = null) => {
                    if (!userAuth.has_auth) {
                        alert(t('authRequired'));
                        return { success: false, error: t('authRequired') };
                    }

                    // 显示加载状态
                    if (button) {
                        button.disabled = true;
                        const originalHTML = button.innerHTML;
                        button.innerHTML = '<div class="spinner"></div>';
                        button.dataset.originalHTML = originalHTML;
                    }

                    try {
                        const response = await fetch('/danbooru_gallery/favorites/remove', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ post_id: postId })
                        });
                        let data;
                        if (response.status === 204) {
                            // 204 No Content 表示成功，但没有响应体
                            data = { success: true, message: "取消收藏成功" };
                        } else {
                            data = await response.json();
                        }

                        // 恢复按钮状态
                        if (button) {
                            button.disabled = false;
                            if (data.success) {
                                button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                </svg>`;
                                button.title = t('favorite');
                                button.classList.remove('favorited');
                                const index = userFavorites.indexOf(String(postId));
                                if (index > -1) {
                                    userFavorites.splice(index, 1);
                                }
                                // 显示取消收藏成功提示
                                showToast(t('unfavorite') + '成功', 'success', button);
                            } else {
                                button.innerHTML = button.dataset.originalHTML || originalHTML;
                            }
                            delete button.dataset.originalHTML;
                        }

                        if (!data.success) {
                            let errorMsg = data.error || "未知错误";
                            if (data.error.includes("网络错误")) {
                                showError(`${errorMsg} - 请检查网络连接`);
                            } else if (data.error.includes("认证") || data.error.includes("401")) {
                                errorMsg = `${errorMsg}\n\n${t('authRequired')}`;
                                if (confirm(errorMsg + "\n\n是否打开设置？")) {
                                    showSettingsDialog();
                                }
                            } else if (data.error.includes("Rate Limited") || data.error.includes("429")) {
                                showError(`${errorMsg} - 请稍后重试`);
                            } else {
                                showError(errorMsg);
                            }
                        }

                        return data;
                    } catch (e) {
                        console.warn("移除收藏失败:", e);
                        showError("网络错误 - 无法连接到Danbooru服务器");
                        if (button) {
                            button.disabled = false;
                            button.innerHTML = button.dataset.originalHTML || '<svg>...</svg>';
                            delete button.dataset.originalHTML;
                        }
                        return { success: false, error: "网络错误" };
                    }
                };

                const loadFavorites = async () => {
                    try {
                        const response = await fetch('/danbooru_gallery/favorites');
                        const data = await response.json();
                        userFavorites = data.favorites || [];
                        return userFavorites;
                    } catch (e) {
                        console.warn("加载收藏列表失败:", e);
                        userFavorites = [];
                        return userFavorites;
                    }
                };

                // 语言管理功能
                const loadLanguage = async () => {
                    try {
                        const response = await fetch('/danbooru_gallery/language');
                        const data = await response.json();
                        currentLanguage = data.language || 'zh';
                    } catch (e) {
                        console.warn("加载语言设置失败:", e);
                        currentLanguage = 'zh';
                    }
                };

                const saveLanguage = async (language) => {
                    try {
                        const response = await fetch('/danbooru_gallery/language', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ language: language })
                        });
                        const data = await response.json();
                        return data.success;
                    } catch (e) {
                        console.warn("保存语言设置失败:", e);
                        return false;
                    }
                };

                // 更新界面文本
                const updateInterfaceTexts = () => {
                    // 更新搜索框
                    searchInput.placeholder = t('searchPlaceholder');

                    // 更新按钮文本和提示
                    const categoryButton = categoryDropdown.querySelector('.danbooru-category-button');
                    if (categoryButton) {
                        categoryButton.innerHTML = `${t('categories')} <svg class="arrow-down" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;
                        categoryButton.title = t('categoriestooltip');
                    }

                    const formattingButton = formattingDropdown.querySelector('.danbooru-category-button');
                    if (formattingButton) {
                        formattingButton.innerHTML = `${t('formatting')} <svg class="arrow-down" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;
                        formattingButton.title = t('formattingTooltip');
                    }

                    const ratingButton = ratingSelect.querySelector('.danbooru-category-button');
                    if (ratingButton) {
                        ratingButton.title = t('ratingTooltip');
                        // 更新当前显示的分级文本
                        const currentValue = ratingButton.dataset.value || "";
                        const ratingTexts = { "": "all", "general": "general", "sensitive": "sensitive", "questionable": "questionable", "explicit": "explicit" };
                        const textKey = ratingTexts[currentValue] || "all";
                        ratingButton.innerHTML = `${t(textKey)} <svg class="arrow-down" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;
                    }

                    // 更新分级选项
                    const ratingItems = ratingSelect.querySelectorAll('.danbooru-category-item');
                    const ratingKeys = ['all', 'general', 'sensitive', 'questionable', 'explicit'];
                    ratingItems.forEach((item, index) => {
                        if (ratingKeys[index]) {
                            item.textContent = t(ratingKeys[index]);
                        }
                    });

                    // 更新类别标签
                    const categoryItems = categoryDropdown.querySelectorAll('.danbooru-category-item label');
                    const categoryKeys = ['artist', 'copyright', 'character', 'general', 'meta'];
                    categoryItems.forEach((label, index) => {
                        if (categoryKeys[index]) {
                            label.textContent = t(categoryKeys[index]);
                        }
                    });

                    // 更新格式选项
                    const formatItems = formattingDropdown.querySelectorAll('.danbooru-category-item label');
                    if (formatItems.length >= 2) {
                        formatItems[0].textContent = t('escapeBrackets');
                        formatItems[1].textContent = t('replaceUnderscores');
                    }

                    // 更新按钮tooltip
                    rankingButton.title = t('rankingTooltip');
                    favoritesButton.title = t('favorites');
                    refreshButton.title = t('refreshTooltip');
                    settingsButton.title = t('settings');
                    filterButton.title = t('filterTooltip');

                    // 更新排行榜按钮文本
                    const rankingIcon = rankingButton.querySelector('.icon');
                    if (rankingIcon) {
                        rankingButton.innerHTML = rankingIcon.outerHTML + t('ranking');
                    }

                    // 更新收藏夹按钮文本
                    const favoritesIcon = favoritesButton.querySelector('.icon');
                    if (favoritesIcon) {
                        favoritesButton.innerHTML = favoritesIcon.outerHTML + t('favorites');
                    }

                    // 更新加载状态文本
                    const loadingElement = imageGrid.querySelector('.danbooru-loading');
                    if (loadingElement) {
                        loadingElement.textContent = t('loading');
                    }

                    // 更新侧边栏按钮文本（如果设置对话框已打开）
                    const sidebarButtons = document.querySelectorAll('.sidebar-button');
                    sidebarButtons.forEach(button => {
                        const key = button.dataset.key;
                        if (key) {
                            const titleSpan = button.querySelector('.sidebar-button-title');
                            if (titleSpan) {
                                titleSpan.textContent = t(key + 'Section');
                            }
                        }
                    });
                };

                const searchInput = $el("input.danbooru-search-input", { type: "text", placeholder: t('searchPlaceholder'), title: t('searchPlaceholder') });
                const createRatingDropdown = () => {
                    const options = [
                        { value: "", text: t('all') },
                        { value: "general", text: t('general') },
                        { value: "sensitive", text: t('sensitive') },
                        { value: "questionable", text: t('questionable') },
                        { value: "explicit", text: t('explicit') }
                    ];

                    const listItems = options.map(opt =>
                        $el("div.danbooru-category-item", {
                            textContent: opt.text,
                            dataset: { value: opt.value },
                            onclick: (e) => {
                                const button = e.target.closest('.danbooru-rating-dropdown').querySelector('.danbooru-category-button');
                                const list = e.target.closest('.danbooru-category-list');
                                button.dataset.value = opt.value;
                                button.innerHTML = `${opt.text} <svg class="arrow-down" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;
                                list.classList.remove('show');
                                button.classList.remove('open');
                                const ratingValue = opt.value;
                                saveToLocalStorage('ratingValue', ratingValue);
                                ratingSelect.dispatchEvent(new Event('change'));
                            }
                        })
                    );

                    const dropdown = $el("div.danbooru-rating-dropdown.danbooru-category-dropdown", [
                        $el("button.danbooru-category-button", {
                            innerHTML: `${t('all')} <svg class="arrow-down" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`,
                            dataset: { value: "" },
                            title: t('ratingTooltip')
                        }),
                        $el("div.danbooru-category-list", {}, listItems)
                    ]);

                    return dropdown;
                };

                const ratingSelect = createRatingDropdown();

                const createCategoryCheckbox = (name, checked = false) => { // Default to false, will be set later
                    const id = `danbooru-category-${name}`;
                    const checkbox = $el("input", { type: "checkbox", id, name, checked: checked, className: "danbooru-category-checkbox" });
                    checkbox.addEventListener('change', async () => {
                        const newSelectedCategories = Array.from(categoryDropdown.querySelectorAll("input:checked")).map(i => i.name);
                        uiSettings.selected_categories = newSelectedCategories;
                        saveToLocalStorage('selectedCategories', newSelectedCategories);
                        await saveUiSettings(uiSettings);
                    });
                    return $el("div.danbooru-category-item", [
                        checkbox,
                        $el("label", { htmlFor: id, textContent: t(name) })
                    ]);
                };

                const categoryDropdown = $el("div.danbooru-category-dropdown", [
                    $el("button.danbooru-category-button", {
                        innerHTML: `${t('categories')} <svg class="arrow-down" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`,
                        title: t('categoriestooltip')
                    }),
                    $el("div.danbooru-category-list", {}, [
                        createCategoryCheckbox("artist"),
                        createCategoryCheckbox("copyright"),
                        createCategoryCheckbox("character"),
                        createCategoryCheckbox("general"),
                        createCategoryCheckbox("meta")
                    ])
                ]);

                const createFormattingCheckbox = (name, label, checked = true) => {
                    const id = `danbooru-format-${name}`;
                    const checkbox = $el("input", { type: "checkbox", id, name, checked, className: "danbooru-format-checkbox" });
                    checkbox.addEventListener('change', async () => {
                        const newFormattingOptions = {
                            escapeBrackets: formattingDropdown.querySelector('[name="escapeBrackets"]').checked,
                            replaceUnderscores: formattingDropdown.querySelector('[name="replaceUnderscores"]').checked,
                        };
                        uiSettings.formatting = newFormattingOptions;
                        saveToLocalStorage('formatting', newFormattingOptions);
                        await saveUiSettings(uiSettings);
                    });
                    return $el("div.danbooru-category-item", [
                        checkbox,
                        $el("label", { htmlFor: id, textContent: label })
                    ]);
                };

                const formattingDropdown = $el("div.danbooru-formatting-dropdown.danbooru-category-dropdown", [
                    $el("button.danbooru-category-button", {
                        innerHTML: `${t('formatting')} <svg class="arrow-down" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`,
                        title: t('formattingTooltip')
                    }),
                    $el("div.danbooru-category-list", {}, [
                        createFormattingCheckbox("escapeBrackets", t('escapeBrackets')),
                        createFormattingCheckbox("replaceUnderscores", t('replaceUnderscores')),
                    ])
                ]);

                document.addEventListener("click", (e) => {
                    const dropdowns = [categoryDropdown, formattingDropdown, ratingSelect];
                    dropdowns.forEach(dropdown => {
                        const list = dropdown.querySelector(".danbooru-category-list");
                        const button = dropdown.querySelector(".danbooru-category-button");

                        if (!button || !list) return;

                        if (!dropdown.contains(e.target)) {
                            list.classList.remove("show");
                            button.classList.remove("open");
                        } else if (e.target.closest(".danbooru-category-button")) {
                            // Close other dropdowns
                            dropdowns.forEach(otherDropdown => {
                                if (otherDropdown !== dropdown) {
                                    otherDropdown.querySelector(".danbooru-category-list")?.classList.remove("show");
                                    const otherButton = otherDropdown.querySelector(".danbooru-category-button");
                                    otherButton?.classList.remove("open");
                                }
                            });
                            list.classList.toggle("show");
                            button.classList.toggle("open");
                        }
                    });
                });

                // 排行榜按钮
                const rankingButton = $el("button.danbooru-ranking-button", {
                    title: t('rankingTooltip')
                });
                rankingButton.innerHTML = `
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                       <path d="M16 6L19 9L16 12"></path>
                       <path d="M8 12L5 9L8 6"></path>
                       <path d="M12 2V22"></path>
                       <path d="M3 9H21"></path>
                   </svg>
                   ${t('ranking')}`;

                // 收藏夹按钮
                const favoritesButton = $el("button.danbooru-favorites-button", {
                    title: t('favorites')
                });
                favoritesButton.innerHTML = `
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                       <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                   </svg>
                   ${t('favorites')}`;

                // 导出设置
                const exportSettings = () => {
                    const settingsToExport = {
                        language: currentLanguage,
                        blacklist: currentBlacklist,
                        prompt_filter: {
                            enabled: filterEnabled,
                            tags: currentFilterTags,
                        },
                        ui: {
                            ...uiSettings,
                            // Ensure formatting is included from the checkboxes directly
                            formatting: {
                                escapeBrackets: formattingDropdown.querySelector('[name="escapeBrackets"]').checked,
                                replaceUnderscores: formattingDropdown.querySelector('[name="replaceUnderscores"]').checked,
                            }
                        },
                    };

                    const blob = new Blob([JSON.stringify(settingsToExport, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'danbooru_gallery_settings.json';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);

                    showToast(t('exportSuccess'), 'success');
                };

                // 导入设置
                const importSettings = (dialog) => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.json';
                    input.onchange = (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = async (event) => {
                            try {
                                const s = JSON.parse(event.target.result);

                                const promises = [];
                                if (s.language && i18n[s.language]) {
                                    promises.push(saveLanguage(s.language));
                                }
                                if (Array.isArray(s.blacklist)) {
                                    promises.push(saveBlacklist(s.blacklist));
                                }
                                if (s.prompt_filter && typeof s.prompt_filter.enabled === 'boolean' && Array.isArray(s.prompt_filter.tags)) {
                                    promises.push(saveFilterTags(s.prompt_filter.tags, s.prompt_filter.enabled));
                                }
                                if (s.ui) {
                                    // Merge formatting settings correctly
                                    const newUiSettings = { ...uiSettings, ...s.ui };
                                    if (s.ui.formatting) {
                                        newUiSettings.formatting = { ...uiSettings.formatting, ...s.ui.formatting };
                                    }
                                    promises.push(saveUiSettings(newUiSettings));
                                }

                                const results = await Promise.all(promises);

                                if (results.some(res => res === false)) {
                                    showToast(t('saveFailed'), 'error');
                                    return;
                                }

                                showToast(t('importSuccess'), 'success');
                                dialog.remove();

                                await initializeApp();
                                showSettingsDialog();

                            } catch (error) {
                                console.error("Failed to import settings:", error);
                                showToast(t('importError'), 'error');
                            }
                        };
                        reader.readAsText(file);
                    };
                    input.click();
                };

                // 创建设置页面对话框
                const showSettingsDialog = (initialState = {}) => {
                    const dialog = $el("div.danbooru-settings-dialog", {
                        style: {
                            position: "fixed",
                            top: "0",
                            left: "0",
                            width: "100%",
                            height: "100%",
                            backgroundColor: "rgba(0, 0, 0, 0.7)",
                            zIndex: "10000",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        }
                    });

                    const dialogContent = $el("div.danbooru-settings-dialog-content", {
                        style: {
                            backgroundColor: "var(--comfy-menu-bg)",
                            border: "1px solid var(--input-border-color)",
                            borderRadius: "12px",
                            padding: "24px",
                            width: "800px",
                            maxWidth: "90vw",
                            height: "600px",
                            maxHeight: "90vh",
                            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
                            display: "flex",
                            flexDirection: "column"
                        }
                    });

                    const mainContainer = $el("div", {
                        style: {
                            display: "flex",
                            flex: "1",
                            gap: "20px",
                            overflow: "hidden"
                        }
                    });


                    const sidebar = $el("div.danbooru-settings-sidebar", {
                        style: {
                            width: "180px",
                            flexShrink: "0",
                            borderRight: "1px solid var(--input-border-color)"
                        }
                    });


                    const scrollContainer = $el("div.danbooru-settings-scroll-container", {
                        style: {
                            flex: "1",
                            overflowY: "auto",
                            padding: "0 16px"
                        }
                    });

                    const title = $el("h2", {
                        textContent: t('settings'),
                        style: {
                            margin: "0 0 20px 0",
                            color: "var(--comfy-input-text)",
                            fontSize: "1.5em",
                            fontWeight: "600",
                            borderBottom: "2px solid var(--input-border-color)",
                            paddingBottom: "12px"
                        }
                    });

                    // 语言设置部分
                    const languageSection = $el("div.danbooru-settings-section", {
                        style: {
                            marginBottom: "20px",
                            padding: "16px",
                            border: "1px solid var(--input-border-color)",
                            borderRadius: "8px",
                            backgroundColor: "var(--comfy-input-bg)"
                        }
                    });

                    const languageTitle = $el("h3", {
                        textContent: t('languageSettings'),
                        style: {
                            margin: "0 0 12px 0",
                            color: "var(--comfy-input-text)",
                            fontSize: "1.1em",
                            fontWeight: "500",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                        }
                    });

                    const languageIcon = $el("span", {
                        innerHTML: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="2" y1="12" x2="22" y2="12"></line>
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                        </svg>`
                    });

                    languageTitle.insertBefore(languageIcon, languageTitle.firstChild);

                    const languageOptions = $el("div", {
                        style: {
                            display: "flex",
                            gap: "12px"
                        }
                    });

                    const createLanguageButton = (lang, text) => {
                        const isActive = currentLanguage === lang;
                        const button = $el("button", {
                            textContent: text,
                            className: `danbooru-language-select-button ${isActive ? 'active' : ''}`,
                            dataset: { lang: lang } // Store lang in dataset
                        });
                        return button;
                    };

                    const zhButton = createLanguageButton('zh', '中文');
                    const enButton = createLanguageButton('en', 'English');

                    languageOptions.appendChild(zhButton);
                    languageOptions.appendChild(enButton);


                    languageSection.appendChild(languageTitle);
                    languageSection.appendChild(languageOptions);


                    // 黑名单设置部分
                    const blacklistSection = $el("div.danbooru-settings-section", {
                        style: {
                            marginBottom: "20px",
                            padding: "16px",
                            border: "1px solid var(--input-border-color)",
                            borderRadius: "8px",
                            backgroundColor: "var(--comfy-input-bg)"
                        }
                    });

                    const blacklistTitle = $el("h3", {
                        textContent: t('blacklistSettings'),
                        style: {
                            margin: "0 0 8px 0",
                            color: "var(--comfy-input-text)",
                            fontSize: "1.1em",
                            fontWeight: "500",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                        }
                    });

                    const blacklistIcon = $el("span", {
                        innerHTML: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 6h18l-1.5 14H4.5L3 6z"></path>
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>`
                    });

                    blacklistTitle.insertBefore(blacklistIcon, blacklistTitle.firstChild);

                    const blacklistDescription = $el("p", {
                        textContent: t('blacklistDescription'),
                        style: {
                            margin: "0 0 12px 0",
                            color: "#888",
                            fontSize: "0.9em"
                        }
                    });

                    const blacklistTextarea = $el("textarea", {
                        placeholder: t('blacklistPlaceholder'),
                        value: initialState.blacklist ?? currentBlacklist.join('\n'),
                        style: {
                            width: "100%",
                            height: "120px",
                            padding: "12px",
                            border: "1px solid var(--input-border-color)",
                            borderRadius: "6px",
                            backgroundColor: "var(--comfy-menu-bg)",
                            color: "var(--comfy-input-text)",
                            fontSize: "14px",
                            resize: "vertical",
                            fontFamily: "monospace",
                            lineHeight: "1.4"
                        }
                    });

                    blacklistSection.appendChild(blacklistTitle);
                    blacklistSection.appendChild(blacklistDescription);
                    blacklistSection.appendChild(blacklistTextarea);

                    // 提示词过滤设置部分
                    const filterSection = $el("div.danbooru-settings-section", {
                        style: {
                            marginBottom: "20px",
                            padding: "16px",
                            border: "1px solid var(--input-border-color)",
                            borderRadius: "8px",
                            backgroundColor: "var(--comfy-input-bg)"
                        }
                    });

                    const filterTitle = $el("h3", {
                        textContent: t('promptFilterSettings'),
                        style: {
                            margin: "0 0 8px 0",
                            color: "var(--comfy-input-text)",
                            fontSize: "1.1em",
                            fontWeight: "500",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                        }
                    });

                    const filterIcon = $el("span", {
                        innerHTML: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                        </svg>`
                    });

                    filterTitle.insertBefore(filterIcon, filterTitle.firstChild);

                    const filterEnableDiv = $el("div", {
                        style: {
                            marginBottom: "12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                        }
                    });

                    const filterEnableCheckbox = $el("input", {
                        type: "checkbox",
                        id: "filterEnableCheckbox",
                        checked: initialState.filterEnabled ?? filterEnabled,
                        style: {
                            width: "16px",
                            height: "16px"
                        }
                    });

                    const filterEnableLabel = $el("label", {
                        htmlFor: "filterEnableCheckbox",
                        textContent: t('promptFilterEnable'),
                        style: {
                            cursor: "pointer",
                            color: "var(--comfy-input-text)",
                            fontSize: "0.9em",
                            fontWeight: "500"
                        }
                    });

                    filterEnableDiv.appendChild(filterEnableCheckbox);
                    filterEnableDiv.appendChild(filterEnableLabel);

                    const filterDescription = $el("p", {
                        textContent: t('promptFilterDescription'),
                        style: {
                            margin: "0 0 12px 0",
                            color: "#888",
                            fontSize: "0.9em"
                        }
                    });

                    const filterTextarea = $el("textarea", {
                        placeholder: t('promptFilterPlaceholder'),
                        value: initialState.filterTags ?? currentFilterTags.join('\n'),
                        style: {
                            width: "100%",
                            height: "120px",
                            padding: "12px",
                            border: "1px solid var(--input-border-color)",
                            borderRadius: "6px",
                            backgroundColor: "var(--comfy-menu-bg)",
                            color: "var(--comfy-input-text)",
                            fontSize: "14px",
                            resize: "vertical",
                            fontFamily: "monospace",
                            lineHeight: "1.4"
                        }
                    });

                    filterSection.appendChild(filterTitle);
                    filterSection.appendChild(filterEnableDiv);
                    filterSection.appendChild(filterDescription);
                    filterSection.appendChild(filterTextarea);

                    // 用户认证设置部分
                    const authSection = $el("div.danbooru-settings-section", {
                        style: {
                            marginBottom: "20px",
                            padding: "16px",
                            border: "1px solid var(--input-border-color)",
                            borderRadius: "8px",
                            backgroundColor: "var(--comfy-input-bg)"
                        }
                    });

                    const authTitle = $el("h3", {
                        textContent: t('userAuth'),
                        style: {
                            margin: "0 0 8px 0",
                            color: "var(--comfy-input-text)",
                            fontSize: "1.1em",
                            fontWeight: "500",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                        }
                    });

                    const authIcon = $el("span", {
                        innerHTML: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M9 12l2 2 4-4"></path>
                            <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"></path>
                            <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"></path>
                            <path d="M12 3v6m0 6v6"></path>
                        </svg>`
                    });

                    authTitle.insertBefore(authIcon, authTitle.firstChild);

                    const authDescription = $el("p", {
                        textContent: t('authDescription'),
                        style: {
                            margin: "0 0 12px 0",
                            color: "#888",
                            fontSize: "0.9em"
                        }
                    });

                    const usernameInput = $el("input", {
                        type: "text",
                        placeholder: t('authPlaceholderUsername'),
                        value: (initialState.username ?? userAuth.username) || "",
                        style: {
                            width: "100%",
                            padding: "8px 12px",
                            border: "1px solid var(--input-border-color)",
                            borderRadius: "6px",
                            backgroundColor: "var(--comfy-menu-bg)",
                            color: "var(--comfy-input-text)",
                            fontSize: "14px",
                            marginBottom: "8px"
                        }
                    });

                    const apiKeyInput = $el("input", {
                        type: "password",
                        placeholder: t('authPlaceholderApiKey'),
                        value: (initialState.apiKey ?? userAuth.api_key) || "",
                        style: {
                            width: "100%",
                            padding: "8px 12px",
                            border: "1px solid var(--input-border-color)",
                            borderRadius: "6px",
                            backgroundColor: "var(--comfy-menu-bg)",
                            color: "var(--comfy-input-text)",
                            fontSize: "14px",
                            marginBottom: "8px"
                        }
                    });

                    const apiKeyHelpButton = $el("button", {
                        textContent: t('apiKeyHelp'),
                        title: t('apiKeyTooltip'),
                        style: {
                            padding: "6px 12px",
                            border: "1px solid #5865F2",
                            borderRadius: "4px",
                            backgroundColor: "transparent",
                            color: "#5865F2",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "500",
                            transition: "all 0.2s ease"
                        },
                        onclick: () => {
                            window.open('https://danbooru.donmai.us/profile', '_blank');
                        }
                    });

                    authSection.appendChild(authTitle);
                    authSection.appendChild(authDescription);
                    authSection.appendChild(usernameInput);
                    authSection.appendChild(apiKeyInput);
                    authSection.appendChild(apiKeyHelpButton);

                    // 自动补全设置
                    const autocompleteSection = $el("div.danbooru-settings-section", { style: { marginBottom: "20px", padding: "16px", border: "1px solid var(--input-border-color)", borderRadius: "8px", backgroundColor: "var(--comfy-input-bg)" } });
                    const autocompleteTitle = $el("h3", { textContent: t('autocompleteSettings'), style: { margin: "0 0 8px 0", color: "var(--comfy-input-text)", fontSize: "1.1em", fontWeight: "500" } });
                    const autocompleteDesc = $el("p", { textContent: t('autocompleteEnableDescription'), style: { margin: "0 0 12px 0", color: "#888", fontSize: "0.9em" } });
                    const autocompleteEnableCheckbox = $el("input", { type: "checkbox", id: "autocompleteEnableCheckbox", checked: initialState.autocompleteEnabled ?? uiSettings.autocomplete_enabled, style: { width: "16px", height: "16px" } });
                    autocompleteEnableCheckbox.onchange = (e) => { /* 用户界面中的临时状态，无需处理 */ };
                    const autocompleteEnableLabel = $el("label", { htmlFor: "autocompleteEnableCheckbox", textContent: t('autocompleteEnable'), style: { cursor: "pointer", color: "var(--comfy-input-text)", fontSize: "1em", fontWeight: "500" } });
                    const autocompleteEnableDiv = $el("div", { style: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" } }, [autocompleteEnableCheckbox, autocompleteEnableLabel]);

                    // 新增：最大补全数量
                    const autocompleteMaxResultsLabel = $el("label", { htmlFor: "autocompleteMaxResultsInput", textContent: t('autocompleteMaxResults'), style: { color: "var(--comfy-input-text)", fontSize: "0.9em", fontWeight: "500" } });
                    const autocompleteMaxResultsInput = $el("input", {
                        type: "number",
                        id: "autocompleteMaxResultsInput",
                        title: t('autocompleteEnableDescription'),
                        value: (initialState.autocompleteMaxResults ?? uiSettings.autocomplete_max_results) || 20,
                        min: "1",
                        max: "50",
                        style: { width: "60px", padding: '4px', marginLeft: '8px', backgroundColor: 'var(--comfy-menu-bg)', color: 'var(--comfy-input-text)', border: '1px solid var(--input-border-color)', borderRadius: '4px' }
                    });
                    const autocompleteMaxResultsDiv = $el("div", { style: { display: "flex", alignItems: "center" } }, [autocompleteMaxResultsLabel, autocompleteMaxResultsInput]);

                    autocompleteSection.appendChild(autocompleteTitle);
                    autocompleteSection.appendChild(autocompleteDesc);
                    autocompleteSection.appendChild(autocompleteEnableDiv);
                    autocompleteSection.appendChild(autocompleteMaxResultsDiv);

                    // 悬浮提示设置
                    const tooltipSection = $el("div.danbooru-settings-section", { style: { marginBottom: "20px", padding: "16px", border: "1px solid var(--input-border-color)", borderRadius: "8px", backgroundColor: "var(--comfy-input-bg)" } });
                    const tooltipTitle = $el("h3", { textContent: t('tooltipSettings'), style: { margin: "0 0 8px 0", color: "var(--comfy-input-text)", fontSize: "1.1em", fontWeight: "500" } });
                    const tooltipDesc = $el("p", { textContent: t('tooltipEnableDescription'), style: { margin: "0 0 12px 0", color: "#888", fontSize: "0.9em" } });
                    const tooltipEnableCheckbox = $el("input", { type: "checkbox", id: "tooltipEnableCheckbox", checked: initialState.tooltipEnabled ?? uiSettings.tooltip_enabled, style: { width: "16px", height: "16px" } });
                    tooltipEnableCheckbox.onchange = (e) => { /* 用户界面中的临时状态，无需处理 */ };
                    const tooltipEnableLabel = $el("label", { htmlFor: "tooltipEnableCheckbox", textContent: t('tooltipEnable'), style: { cursor: "pointer", color: "var(--comfy-input-text)", fontSize: "1em", fontWeight: "500" } });
                    const tooltipEnableDiv = $el("div", { style: { display: "flex", alignItems: "center", gap: "8px" } }, [tooltipEnableCheckbox, tooltipEnableLabel]);
                    tooltipSection.appendChild(tooltipTitle);
                    tooltipSection.appendChild(tooltipDesc);
                    tooltipSection.appendChild(tooltipEnableDiv);


                    // 创建侧边栏按钮和内容区域的映射
                    const sections = {
                        'general': { title: t('generalSection'), icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>', elements: [languageSection] },
                        'user': { title: t('userSection'), icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>', elements: [authSection] },
                        'content': { title: t('contentSection'), icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18l-1.5 14H4.5L3 6z"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>', elements: [blacklistSection] },
                        'prompt': { title: t('promptSection'), icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>', elements: [filterSection] },
                        'ui': { title: t('uiSection'), icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>', elements: [autocompleteSection, tooltipSection] },
                    };

                    const setActiveSection = (key) => {
                        // 更新按钮样式
                        sidebar.querySelectorAll('.sidebar-button').forEach(btn => {
                            if (btn.dataset.key === key) {
                                btn.classList.add('active');
                            } else {
                                btn.classList.remove('active');
                            }
                        });


                        // 显示对应的内容
                        scrollContainer.innerHTML = '';
                        if (sections[key] && sections[key].elements.length > 0) {
                            sections[key].elements.forEach(el => scrollContainer.appendChild(el));
                        }
                    };

                    // 创建侧边栏按钮
                    Object.keys(sections).forEach(key => {
                        const section = sections[key];
                        const button = $el("button.sidebar-button", {
                            dataset: { key: key },
                            onclick: () => setActiveSection(key),
                        });
                        button.appendChild($el("div.sidebar-button-icon", { innerHTML: section.icon }));
                        button.appendChild($el("span.sidebar-button-title", { textContent: section.title }));
                        sidebar.appendChild(button);
                    });

                    // 设置初始活动区域
                    setActiveSection('general');

                    // 社交按钮
                    const githubButton = $el("button", {
                        innerHTML: `
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                            </svg>
                            <span style="margin-left: 8px;">GitHub</span>
                        `,
                        title: t('githubTooltip'),
                        style: {
                            padding: "10px 16px",
                            border: "1px solid #24292e",
                            borderRadius: "6px",
                            backgroundColor: "#24292e",
                            color: "white",
                            cursor: "pointer",
                            fontSize: "14px",
                            fontWeight: "500",
                            transition: "all 0.2s ease",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minWidth: "80px"
                        },
                        onclick: () => {
                            window.open('https://github.com/Aaalice233/ComfyUI-Danbooru-Gallery', '_blank');
                        }
                    });

                    const discordButton = $el("button", {
                        innerHTML: `
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.196.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.30z"></path>
                            </svg>
                            <span style="margin-left: 8px;">Discord</span>
                        `,
                        title: t('discordTooltip'),
                        style: {
                            padding: "10px 16px",
                            border: "1px solid #5865F2",
                            borderRadius: "6px",
                            backgroundColor: "#5865F2",
                            color: "white",
                            cursor: "pointer",
                            fontSize: "14px",
                            fontWeight: "500",
                            transition: "all 0.2s ease",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minWidth: "80px"
                        },
                        onclick: () => {
                            window.open('https://discord.gg/aaalice', '_blank');
                        }
                    });

                    // 按钮区域
                    const buttonContainer = $el("div", {
                        style: {
                            display: "flex",
                            gap: "12px",
                            marginTop: "24px",
                            justifyContent: "space-between",
                            alignItems: "center"
                        }
                    });

                    // 左侧社交按钮容器
                    const socialButtonsContainer = $el("div", {
                        style: {
                            display: "flex",
                            gap: "8px"
                        }
                    });

                    socialButtonsContainer.appendChild(githubButton);
                    socialButtonsContainer.appendChild(discordButton);

                    // 右侧主要按钮容器
                    const mainButtonsContainer = $el("div", {
                        style: {
                            display: "flex",
                            gap: "12px"
                        }
                    });

                    const importExportButtonStyle = {
                        padding: "10px 20px",
                        border: "1px solid var(--input-border-color)",
                        borderRadius: "6px",
                        backgroundColor: "var(--comfy-input-bg)",
                        color: "var(--comfy-input-text)",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "500",
                        transition: "all 0.2s ease"
                    };

                    const importButton = $el("button", {
                        textContent: t('importSettings'),
                        style: importExportButtonStyle,
                        onclick: () => importSettings(dialog)
                    });

                    const exportButton = $el("button", {
                        textContent: t('exportSettings'),
                        style: importExportButtonStyle,
                        onclick: exportSettings
                    });

                    const cancelButton = $el("button", {
                        textContent: t('cancel'),
                        style: {
                            padding: "10px 20px",
                            border: "1px solid var(--input-border-color)",
                            borderRadius: "6px",
                            backgroundColor: "var(--comfy-input-bg)",
                            color: "var(--comfy-input-text)",
                            cursor: "pointer",
                            fontSize: "14px",
                            fontWeight: "500",
                            transition: "all 0.2s ease"
                        },
                        onclick: () => dialog.remove()
                    });

                    const saveButton = $el("button", {
                        textContent: t('save'),
                        style: {
                            padding: "10px 20px",
                            border: "2px solid #7B68EE",
                            borderRadius: "6px",
                            backgroundColor: "#7B68EE",
                            color: "white",
                            cursor: "pointer",
                            fontSize: "14px",
                            fontWeight: "600",
                            transition: "all 0.2s ease"
                        },
                        onclick: async () => {
                            const blacklistText = blacklistTextarea.value.trim();
                            const newBlacklist = blacklistText ? blacklistText.split('\n').map(tag => tag.trim()).filter(tag => tag) : [];

                            const filterText = filterTextarea.value.trim();
                            const newFilterTags = filterText ? filterText.split('\n').map(tag => tag.trim()).filter(tag => tag) : [];
                            const newFilterEnabled = filterEnableCheckbox.checked;

                            // 保存用户认证信息
                            const newUsername = usernameInput.value.trim();
                            const newApiKey = apiKeyInput.value.trim();
                            let authSuccess = true;
                            if (newUsername !== userAuth.username || newApiKey !== userAuth.api_key) {
                                const authResult = await saveUserAuth(newUsername, newApiKey);
                                authSuccess = authResult.success;
                                if (authSuccess) {
                                    await loadFavorites(); // 登录成功后重新加载收藏夹
                                } else {
                                    alert(authResult.error || "保存认证信息失败");
                                    return;
                                }
                            }

                            const newAutocompleteEnabled = autocompleteEnableCheckbox.checked;
                            const newTooltipEnabled = tooltipEnableCheckbox.checked;
                            const newAutocompleteMaxResults = parseInt(autocompleteMaxResultsInput.value, 10);
                            const newSelectedCategories = Array.from(categoryDropdown.querySelectorAll("input:checked")).map(i => i.name);

                            // 保存所有设置
                            const [blacklistSuccess, filterSuccess, uiSettingsSuccess] = await Promise.all([
                                saveBlacklist(newBlacklist),
                                saveFilterTags(newFilterTags, newFilterEnabled),
                                saveUiSettings({
                                    autocomplete_enabled: newAutocompleteEnabled,
                                    tooltip_enabled: newTooltipEnabled,
                                    autocomplete_max_results: newAutocompleteMaxResults,
                                    selected_categories: newSelectedCategories
                                })
                            ]);

                            if (blacklistSuccess && filterSuccess && authSuccess && uiSettingsSuccess) {
                                // 同步本地状态
                                currentBlacklist = newBlacklist;
                                currentFilterTags = newFilterTags;
                                filterEnabled = newFilterEnabled;
                                uiSettings.autocomplete_enabled = newAutocompleteEnabled;
                                uiSettings.tooltip_enabled = newTooltipEnabled;
                                uiSettings.autocomplete_max_results = newAutocompleteMaxResults;
                                uiSettings.selected_categories = newSelectedCategories;

                                dialog.remove();
                                showToast(t('saveSuccess'), 'success');

                                // 重新过滤当前已加载的帖子
                                const filteredPosts = posts.filter(post => !isPostFiltered(post));
                                imageGrid.innerHTML = "";
                                filteredPosts.forEach(renderPost);

                                // 如果过滤后帖子太少，自动加载更多
                                if (filteredPosts.length < 20) {
                                    fetchAndRender(false);
                                }
                            } else {
                                alert(t('saveFailed'));
                            }
                        }
                    });

                    mainButtonsContainer.appendChild(importButton);
                    mainButtonsContainer.appendChild(exportButton);
                    mainButtonsContainer.appendChild(cancelButton);
                    mainButtonsContainer.appendChild(saveButton);

                    buttonContainer.appendChild(socialButtonsContainer);
                    buttonContainer.appendChild(mainButtonsContainer);

                    dialogContent.appendChild(title);
                    mainContainer.appendChild(sidebar);
                    mainContainer.appendChild(scrollContainer);
                    dialogContent.appendChild(mainContainer);
                    dialogContent.appendChild(buttonContainer);

                    dialog.appendChild(dialogContent);

                    // 点击背景关闭对话框
                    dialog.addEventListener('click', (e) => {
                        if (e.target === dialog) {
                            dialog.remove();
                        }
                    });

                    // ESC键关闭对话框
                    const escHandler = (e) => {
                        if (e.key === 'Escape') {
                            dialog.remove();
                            document.removeEventListener('keydown', escHandler);
                        }
                    };
                    document.addEventListener('keydown', escHandler);

                    document.body.appendChild(dialog);
                    blacklistTextarea.focus();

                    // Add event listeners after all elements are defined
                    dialog.querySelectorAll('.danbooru-language-select-button').forEach(button => {
                        button.onclick = async () => {
                            const lang = button.dataset.lang;
                            if (currentLanguage === lang) return;

                            // Preserve state
                            const currentState = {
                                blacklist: blacklistTextarea.value,
                                filterTags: filterTextarea.value,
                                filterEnabled: filterEnableCheckbox.checked,
                                username: usernameInput.value,
                                apiKey: apiKeyInput.value,
                                autocompleteEnabled: autocompleteEnableCheckbox.checked,
                                tooltipEnabled: tooltipEnableCheckbox.checked,
                                autocompleteMaxResults: autocompleteMaxResultsInput.value,
                            };

                            const success = await saveLanguage(lang);
                            if (success) {
                                currentLanguage = lang;
                                updateInterfaceTexts(); // Update main UI
                                dialog.remove(); // Close current dialog
                                showSettingsDialog(currentState); // Re-open with new language and preserved state
                            } else {
                                alert('Failed to save language setting.');
                            }
                        };
                    });
                };

                // 创建设置按钮
                const settingsButton = $el("button.danbooru-settings-button", {
                    innerHTML: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>`,
                    title: t('settings'),
                    onclick: () => {
                        showSettingsDialog();
                    }
                });

                // 创建筛选按钮
                const filterButton = $el("button.danbooru-filter-button", {
                    innerHTML: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                    </svg>`,
                    title: t('filterTooltip'),
                    onclick: () => {
                        showFilterDialog();
                    }
                });

                const refreshButton = $el("button.danbooru-refresh-button", {
                    title: t('refreshTooltip')
                });
                refreshButton.innerHTML = `
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                       <polyline points="23 4 23 10 17 10"></polyline>
                       <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                   </svg>`;


                const imageGrid = $el("div.danbooru-image-grid");

                // 创建筛选对话框
                const showFilterDialog = () => {
                    const dialog = $el("div.danbooru-settings-dialog", {
                        style: {
                            position: "absolute",
                            top: "0",
                            left: "0",
                            width: "100%",
                            height: "100%",
                            backgroundColor: "rgba(0, 0, 0, 0.7)",
                            zIndex: "1000",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        },
                        onclick: (e) => { if (e.target === dialog) dialog.remove(); }
                    });

                    const content = $el("div.danbooru-settings-dialog-content", {
                        style: {
                            width: "420px",
                            padding: "20px",
                            backgroundColor: "var(--comfy-menu-bg)",
                            border: "1px solid var(--input-border-color)",
                            borderRadius: "12px",
                            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "20px",
                            position: "relative", // 确保内容在对话框内
                            zIndex: "1001", // 确保内容在背景之上
                        }
                    });

                    const title = $el("h2", {
                        textContent: t('filter'),
                        style: {
                            margin: "0",
                            color: "var(--comfy-input-text)",
                            fontSize: "1.3em",
                            borderBottom: "1px solid var(--input-border-color)",
                            paddingBottom: "15px"
                        }
                    });

                    const body = $el("div", { style: { display: "flex", flexDirection: "column", gap: "20px" } });

                    // 筛选类型选择
                    const filterType = filterState.startPage ? 'page' : 'time';

                    const createRadio = (name, value, label, checked) => {
                        const radioId = `filter-type-${value}`;
                        const radio = $el("input", { type: "radio", name, value, id: radioId, checked, style: { display: 'none' } });
                        const indicator = $el("span.danbooru-radio-indicator");
                        const radioLabel = $el("label.danbooru-radio-label", {
                            htmlFor: radioId,
                            className: checked ? 'checked' : ''
                        }, [
                            indicator,
                            $el("span", { textContent: label, style: { zIndex: '1', position: 'relative' } })
                        ]);

                        // Set initial styles for checked state
                        // The container now IS the label, which contains the hidden radio button.
                        const container = $el("div.danbooru-radio-button-wrapper", {}, [radio, radioLabel]);

                        return container;
                    };

                    const timeRadio = createRadio("filter-type", "time", t('filterByTime'), filterType === 'time');
                    const pageRadio = createRadio("filter-type", "page", t('filterByPage'), filterType === 'page');

                    const radioGroup = $el("div", {
                        className: "danbooru-radio-group",
                        style: {
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            gap: "20px",
                            margin: "10px 0"
                        }
                    }, [timeRadio, pageRadio]);


                    // 时间范围筛选
                    const timeSection = $el("div.danbooru-settings-section");
                    const createInputRow = (label, input) => {
                        const row = $el("div.danbooru-input-row", {}, [
                            $el("label", { textContent: label, style: { color: "#ccc", fontSize: "0.9em", userSelect: "none" } }),
                            input
                        ]);
                        // Make the whole row clickable to open the date/time picker
                        row.addEventListener('click', () => {
                            try {
                                input.showPicker();
                            } catch (e) {
                                console.warn("input.showPicker() is not supported on this browser.", e);
                            }
                        });
                        return row;
                    };

                    const startTimeInput = $el("input", { type: "datetime-local", id: "startTime", value: filterState.startTime || '' });
                    const endTimeInput = $el("input", { type: "datetime-local", id: "endTime", value: filterState.endTime || '' });

                    timeSection.append(
                        $el("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } }, [
                            createInputRow(t('startTime'), startTimeInput),
                            createInputRow(t('endTime'), endTimeInput)
                        ])
                    );

                    // 起始页码筛选
                    const pageSection = $el("div.danbooru-settings-section");
                    const startPageInput = $el("input", { type: "number", id: "startPage", min: "1", placeholder: "1", value: filterState.startPage || '' });
                    pageSection.append(
                        createInputRow(t('startPage'), startPageInput)
                    );

                    body.append(radioGroup, timeSection, pageSection);

                    const toggleSections = (type) => {
                        if (type === 'time') {
                            timeSection.style.display = 'block';
                            pageSection.style.display = 'none';
                        } else {
                            timeSection.style.display = 'none';
                            pageSection.style.display = 'block';
                        }
                    };

                    toggleSections(filterType);

                    radioGroup.addEventListener('change', (e) => {
                        if (e.target.name === 'filter-type') {

                            // New robust logic: Iterate through radios and update their labels
                            radioGroup.querySelectorAll('input[type="radio"]').forEach(radio => {
                                const label = radioGroup.querySelector(`label[for="${radio.id}"]`);
                                if (label) {
                                    const indicator = label.querySelector('.danbooru-radio-indicator');

                                    if (radio.checked) {
                                        label.classList.add('checked');
                                        // FORCE INLINE STYLES FOR DEBUGGING
                                        label.style.setProperty('border-color', '#7B68EE', 'important');
                                        if (indicator) {
                                            indicator.style.setProperty('background-color', '#7B68EE', 'important');
                                            indicator.style.setProperty('border-color', '#7B68EE', 'important');
                                        }
                                    } else {
                                        label.classList.remove('checked');
                                        // CLEAR INLINE STYLES
                                        label.style.borderColor = '';
                                        if (indicator) {
                                            indicator.style.backgroundColor = '';
                                            indicator.style.borderColor = '';
                                        }
                                    }

                                    // Use a timeout to allow the browser to apply styles before we log them
                                    setTimeout(() => {
                                        if (indicator) {
                                        }
                                    }, 0);

                                } else {
                                }
                            });

                            const selectedValue = e.target.value;
                            toggleSections(selectedValue);
                        }
                    });

                    // 按钮
                    const footer = $el("div", { style: { display: "flex", justifyContent: "flex-end", gap: "12px", paddingTop: "15px", borderTop: "1px solid var(--input-border-color)" } });

                    const cancelButton = $el("button.danbooru-dialog-button--secondary", {
                        textContent: t('cancel'),
                        onclick: () => dialog.remove()
                    });

                    const resetButton = $el("button.danbooru-dialog-button--secondary", {
                        textContent: t('reset'),
                        onclick: () => {
                            filterState = { startTime: null, endTime: null, startPage: null };
                            saveToLocalStorage('filterData', filterState);
                            filterWidget.value = JSON.stringify(filterState);
                            filterButton.classList.remove('active');
                            dialog.remove();
                            fetchAndRender(true);
                        }
                    });
                    const applyButton = $el("button.danbooru-dialog-button--primary", {
                        textContent: t('apply'),
                        onclick: () => {
                            const selectedType = radioGroup.querySelector('input[name="filter-type"]:checked').value;

                            if (selectedType === 'time') {
                                const startTime = startTimeInput.value;
                                const endTime = endTimeInput.value;
                                if (startTime && endTime && new Date(startTime) > new Date(endTime)) {
                                    showError("结束时间不能早于开始时间。");
                                    return;
                                }
                                filterState.startTime = startTime || null;
                                filterState.endTime = endTime || null;
                                filterState.startPage = null;
                            } else { // page
                                const startPage = parseInt(startPageInput.value, 10);
                                if (startPageInput.value && (isNaN(startPage) || startPage < 1)) {
                                    showError("起始页码必须是大于0的整数。");
                                    return;
                                }
                                filterState.startTime = null;
                                filterState.endTime = null;
                                filterState.startPage = isNaN(startPage) ? null : startPage;
                            }

                            saveToLocalStorage('filterData', filterState);
                            filterWidget.value = JSON.stringify(filterState);

                            if (filterState.startTime || filterState.endTime || filterState.startPage) {
                                filterButton.classList.add('active');
                            } else {
                                filterButton.classList.remove('active');
                            }

                            dialog.remove();
                            fetchAndRender(true);
                        }
                    });
                    footer.append(cancelButton, resetButton, applyButton);

                    content.append(title, body, footer);
                    dialog.append(content);
                    container.appendChild(dialog);

                    // Manually trigger change event to set initial visual state
                    const initialCheckedRadio = radioGroup.querySelector('input[type="radio"]:checked');
                    if (initialCheckedRadio) {
                        initialCheckedRadio.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                };

                // 黑名单功能
                let currentBlacklist = [];

                // 提示词过滤功能
                let currentFilterTags = [];
                let filterEnabled = true; // 默认开启过滤功能
                let uiSettings = {
                    autocomplete_enabled: true,
                    tooltip_enabled: true,
                    autocomplete_max_results: 20,
                    selected_categories: ["copyright", "character", "general"],
                    formatting: {
                        escapeBrackets: true,
                        replaceUnderscores: true,
                    }
                };

                const loadUiSettings = async () => {
                    try {
                        const response = await fetch('/danbooru_gallery/ui_settings');
                        const data = await response.json();
                        if (data.success) {
                            uiSettings = {
                                autocomplete_enabled: data.settings.autocomplete_enabled,
                                tooltip_enabled: data.settings.tooltip_enabled,
                                autocomplete_max_results: data.settings.autocomplete_max_results || 20,
                                selected_categories: data.settings.selected_categories || ["copyright", "character", "general"],
                                formatting: data.settings.formatting || { escapeBrackets: true, replaceUnderscores: true }
                            };
                        }
                    } catch (e) {
                        console.warn("加载UI设置失败:", e);
                    }
                };

                const saveUiSettings = async (settings) => {
                    try {
                        const response = await fetch('/danbooru_gallery/ui_settings', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(settings)
                        });
                        const data = await response.json();
                        return data.success;
                    } catch (e) {
                        console.warn("保存UI设置失败:", e);
                        return false;
                    }
                };

                const loadBlacklist = async () => {
                    try {
                        const response = await fetch('/danbooru_gallery/blacklist');
                        const data = await response.json();
                        currentBlacklist = data.blacklist || [];
                    } catch (e) {
                        console.warn("加载黑名单失败:", e);
                        currentBlacklist = [];
                    }
                };

                const saveBlacklist = async (blacklistItems) => {
                    try {
                        const response = await fetch('/danbooru_gallery/blacklist', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ blacklist: blacklistItems })
                        });
                        const data = await response.json();
                        return data.success;
                    } catch (e) {
                        console.warn("保存黑名单失败:", e);
                        return false;
                    }
                };

                const loadFilterTags = async () => {
                    try {
                        const response = await fetch('/danbooru_gallery/filter_tags');
                        const data = await response.json();
                        currentFilterTags = data.filter_tags || [];
                        filterEnabled = data.filter_enabled !== undefined ? data.filter_enabled : true;
                    } catch (e) {
                        console.warn("加载提示词过滤设置失败:", e);
                        currentFilterTags = [];
                        filterEnabled = true; // 默认开启
                    }
                };

                const saveFilterTags = async (filterTags, enabled) => {
                    try {
                        const response = await fetch('/danbooru_gallery/filter_tags', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ filter_tags: filterTags, filter_enabled: enabled })
                        });
                        const data = await response.json();
                        return data.success;
                    } catch (e) {
                        console.warn("保存提示词过滤设置失败:", e);
                        return false;
                    }
                };


                // 文件类型过滤函数 - 只允许静态图像
                const isValidImageType = (post) => {
                    // 允许的静态图像文件扩展名
                    const allowedImageExtensions = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tiff', 'tif'];

                    // 检查文件扩展名
                    if (post.file_ext) {
                        const fileExt = post.file_ext.toLowerCase();
                        return allowedImageExtensions.includes(fileExt);
                    }

                    // 如果没有file_ext字段，尝试从file_url中提取扩展名
                    if (post.file_url) {
                        const url = post.file_url.toLowerCase();
                        const extMatch = url.match(/\.([^.?#]+)(?:\?|#|$)/);
                        if (extMatch) {
                            const fileExt = extMatch[1];
                            return allowedImageExtensions.includes(fileExt);
                        }
                    }

                    // 如果无法确定文件类型，默认拒绝
                    return false;
                };

                // 本地黑名单过滤函数
                const isPostBlacklisted = (post) => {
                    if (!currentBlacklist || currentBlacklist.length === 0) {
                        return false;
                    }

                    // 获取帖子的所有标签
                    const allTags = [];
                    if (post.tag_string) allTags.push(...post.tag_string.split(' '));
                    if (post.tag_string_artist) allTags.push(...post.tag_string_artist.split(' '));
                    if (post.tag_string_copyright) allTags.push(...post.tag_string_copyright.split(' '));
                    if (post.tag_string_character) allTags.push(...post.tag_string_character.split(' '));
                    if (post.tag_string_general) allTags.push(...post.tag_string_general.split(' '));
                    if (post.tag_string_meta) allTags.push(...post.tag_string_meta.split(' '));

                    // 检查是否包含黑名单中的任何标签
                    for (const blacklistTag of currentBlacklist) {
                        const normalizedBlacklistTag = blacklistTag.trim().toLowerCase();
                        if (normalizedBlacklistTag && allTags.some(tag => tag.toLowerCase() === normalizedBlacklistTag)) {
                            return true;
                        }
                    }
                    return false;
                };

                // 综合过滤函数 - 检查文件类型和黑名单
                const isPostFiltered = (post) => {
                    // 首先检查是否为有效的图像类型
                    if (!isValidImageType(post)) {
                        return true; // 如果不是有效图像类型，则过滤掉
                    }

                    // 然后检查黑名单
                    return isPostBlacklisted(post);
                };

                // 获取单个帖子的原始数据
                const fetchOriginalPost = async (postId) => {
                    try {
                        const response = await fetch(`/danbooru_gallery/posts?search[id]=${postId}&limit=1`);
                        const data = await response.json();
                        if (data && data.length > 0) {
                            return data[0];
                        }
                        return null;
                    } catch (error) {
                        console.error("Failed to fetch original post data:", error);
                        return null;
                    }
                };

                // 反向转换函数：将显示格式的标签转换回Danbooru API格式
                const convertTagsToApiFormat = (tagsString) => {
                    if (!tagsString) return "";

                    // 只按逗号分割标签，保持空格作为标签名称的一部分
                    const tags = tagsString.split(',').filter(tag => tag.trim() !== '');

                    return tags.map(tag => {
                        let convertedTag = tag.trim();

                        // 1. 反转义括号：\( -> (, \) -> )
                        convertedTag = convertedTag.replace(/\\([()])/g, '$1');

                        // 2. 空格转换为下划线（如果包含空格且不是特殊tag）
                        // 特殊tag通常以冒号开头（如 order:rank, ordfav:username）
                        if (!convertedTag.includes(':')) {
                            convertedTag = convertedTag.replace(/\s+/g, '_');
                        }

                        return convertedTag;
                    }).join(' ');
                };

                const fetchAndRender = async (reset = false) => {
                    if (isLoading) {
                        return;
                    }
                    isLoading = true;
                    refreshButton.classList.add("loading");
                    refreshButton.disabled = true;

                    const loadingIndicator = imageGrid.querySelector('.danbooru-loading');
                    if (!loadingIndicator) {
                        imageGrid.insertAdjacentHTML('beforeend', `<p class="danbooru-status danbooru-loading">${t('loading')}</p>`);
                    }

                    if (reset) {
                        currentPage = filterState.startPage || 1;
                        posts = [];
                        imageGrid.innerHTML = "";
                        imageGrid.insertAdjacentHTML('beforeend', `<p class="danbooru-status danbooru-loading">${t('loading')}</p>`);
                    }

                    // 检查网络连接状态
                    const isNetworkConnected = await checkNetworkStatus();

                    if (!isNetworkConnected) {
                        // 网络连接失败，显示持久错误提示
                        showError('网络连接失败 - 无法连接到Danbooru服务器，请检查网络连接', true);
                        imageGrid.innerHTML = `<p class="danbooru-status error">网络连接失败，请检查网络连接后重试</p>`;
                        isLoading = false;
                        refreshButton.classList.remove("loading");
                        refreshButton.disabled = false;
                        const indicator = imageGrid.querySelector('.danbooru-loading');
                        if (indicator) {
                            indicator.remove();
                        }
                        return;
                    } else {
                        // 网络连接恢复，清除之前的错误提示
                        clearError();
                    }

                    try {
                        // 检测tag数量
                        const searchValue = searchInput.value.trim();
                        const tags = searchValue.split(',').filter(tag => tag.trim() !== '');
                        const tagCount = tags.length;

                        // 如果超过2个tag，给用户提示
                        if (tagCount > 2) {
                            showTagHint('搜索只考虑前两个tag，第三个及后续tag将被忽略', false);
                        } else {
                            // 清除之前的提示
                            clearTagHint();
                        }

                        // 将搜索框中的标签转换为API格式
                        let apiFormattedTags = convertTagsToApiFormat(searchValue);

                        // 添加日期筛选
                        if (filterState.startTime || filterState.endTime) {
                            const start = filterState.startTime ? new Date(filterState.startTime).toISOString().split('T')[0] : '';
                            const end = filterState.endTime ? new Date(filterState.endTime).toISOString().split('T')[0] : '';
                            apiFormattedTags += ` date:${start}..${end}`;
                        }

                        const params = new URLSearchParams({
                            "search[tags]": apiFormattedTags.trim(),
                            "search[rating]": ratingSelect.querySelector('.danbooru-category-button').dataset.value,
                            limit: "100",
                            page: currentPage,
                        });

                        const response = await fetch(`/danbooru_gallery/posts?${params}`);
                        let newPosts = await response.json();

                        if (!Array.isArray(newPosts)) throw new Error("API did not return a valid list of posts.");

                        // 应用文件类型和黑名单过滤
                        const filteredPosts = newPosts.filter(post => !isPostFiltered(post));

                        const filteredCount = newPosts.length - filteredPosts.length;

                        if (filteredPosts.length === 0 && reset) {
                            imageGrid.innerHTML = `<p class="danbooru-status">${t('noResults')}</p>`;
                            return;
                        }

                        currentPage++;
                        posts.push(...filteredPosts);
                        filteredPosts.forEach(renderPost);

                    } catch (e) {
                        imageGrid.innerHTML = `<p class="danbooru-status error">${e.message}</p>`;
                    } finally {
                        isLoading = false;
                        refreshButton.classList.remove("loading");
                        refreshButton.disabled = false;
                        const indicator = imageGrid.querySelector('.danbooru-loading');
                        if (indicator) {
                            indicator.remove();
                        }
                    }
                };

                const resizeGrid = () => {
                    const rowGap = parseInt(window.getComputedStyle(imageGrid).getPropertyValue('grid-row-gap'));
                    const rowHeight = parseInt(window.getComputedStyle(imageGrid).getPropertyValue('grid-auto-rows'));

                    Array.from(imageGrid.children).forEach((wrapper) => {
                        const img = wrapper.querySelector('img');
                        if (img && img.clientHeight > 0) {
                            const spans = Math.ceil((img.clientHeight + rowGap) / (rowHeight + rowGap));
                            wrapper.style.gridRowEnd = `span ${spans}`;
                        }
                    });
                }

                const showEditPanel = (post) => {
                    // 在打开编辑面板时，检查当前图像是否被选中
                    // 强制将当前编辑的图像设置为选中状态，并更新 selectionWidget
                    const currentSelectedElement = imageGrid.querySelector('.danbooru-image-wrapper.selected');
                    if (currentSelectedElement && currentSelectedElement.dataset.postId && currentSelectedElement.dataset.postId != post.id) { // 检查 dataset.postId 是否存在
                        currentSelectedElement.classList.remove('selected');
                        // console.log(`[DanbooruGallery] showEditPanel: Deselected previously selected post ${currentSelectedElement.dataset.postId}`);
                    }
                    const targetWrapper = imageGrid.querySelector(`.danbooru-image-wrapper[data-post-id="${post.id}"]`);
                    if (targetWrapper) {
                        targetWrapper.classList.add('selected');
                        // 触发一次点击事件来更新 selectionWidget
                        // 注意：这里直接调用 onclick 可能会导致事件冒泡问题，
                        // 更好的方式是直接更新 selectionWidget 的值
                        // targetWrapper.querySelector('img').click();
                        // 而是直接更新 selectionWidget
                        const imageUrl = post.file_url || post.large_file_url;
                        const selectedCategories = Array.from(categoryDropdown.querySelectorAll("input:checked")).map(i => i.name);
                        const postToUse = temporaryTagEdits[post.id] || post;
                        let output_tags = [];
                        selectedCategories.forEach(category => {
                            const tags = postToUse[`tag_string_${category}`];
                            if (tags) {
                                output_tags.push(...tags.split(' '));
                            }
                        });
                        let tagsToProcess = (output_tags.length > 0) ? output_tags : (postToUse.tag_string || '').split(' ');
                        if (filterEnabled && currentFilterTags.length > 0) {
                            const filterTagsLower = currentFilterTags.map(tag => tag.toLowerCase().trim());
                            tagsToProcess = tagsToProcess.filter(tag => {
                                const tagLower = tag.toLowerCase().trim();
                                return !filterTagsLower.includes(tagLower);
                            });
                        }
                        const escapeBrackets = formattingDropdown.querySelector('[name="escapeBrackets"]').checked;
                        const replaceUnderscores = formattingDropdown.querySelector('[name="replaceUnderscores"]').checked;
                        const processedTags = tagsToProcess.map(tag => {
                            let processedTag = tag;
                            if (replaceUnderscores) {
                                processedTag = processedTag.replace(/_/g, ' ');
                            }
                            if (escapeBrackets) {
                                processedTag = processedTag.replaceAll('(', '\\(').replaceAll(')', '\\)');
                            }
                            return processedTag;
                        });
                        const prompt = processedTags.join(', ');
                        const selection = {
                            prompt: prompt,
                            image_url: imageUrl,
                        };
                        if (nodeInstance && nodeInstance.widgets) {
                            const selectionWidget = nodeInstance.widgets.find(w => w.name === "selection_data");
                            if (selectionWidget) {
                                selectionWidget.value = JSON.stringify(selection);
                                selectionWidget.callback();
                                // console.log(`[DanbooruGallery] showEditPanel: selectionWidget.value updated for post ${post.id}`);
                            }
                        }
                    }
                    const isPostCurrentlySelected = true; // 因为我们已经强制选中了
                    // console.log(`[DanbooruGallery] showEditPanel for post ${post.id} opened. Post was selected: ${isPostCurrentlySelected} (forced)`);

                    if (!temporaryTagEdits[post.id]) {
                        // Create a deep copy for editing if it doesn't exist
                        temporaryTagEdits[post.id] = JSON.parse(JSON.stringify(post));
                    }
                    const editablePost = temporaryTagEdits[post.id];

                    // Panel container
                    const panel = $el("div.danbooru-edit-panel", {
                        style: {
                            position: "fixed", top: "0", left: "0", width: "100%", height: "100%",
                            backgroundColor: "rgba(0, 0, 0, 0.7)", zIndex: "10001",
                            display: "flex", alignItems: "center", justifyContent: "center"
                        }
                    });

                    // Panel content
                    const content = $el("div.danbooru-edit-panel-content", {
                        style: {
                            backgroundColor: "var(--comfy-menu-bg)", border: "1px solid var(--input-border-color)",
                            borderRadius: "12px", padding: "20px", width: "700px", maxWidth: "90vw",
                            maxHeight: "80vh", display: "flex", flexDirection: "column",
                            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)"
                        }
                    });

                    // Title
                    const titleBar = $el("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" } }, [
                        $el("h2", { textContent: t('editPanelTitle'), style: { margin: "0", color: "var(--comfy-input-text)", fontSize: "1.3em" } }),
                        $el("button.danbooru-edit-panel-close-button", {
                            innerHTML: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
                            title: t('close'),
                            onclick: () => closePanel(isPostCurrentlySelected) // 将捕获到的选中状态传递给 closePanel
                        })
                    ]);

                    const tagsContainer = $el("div.danbooru-edit-tags-container", { style: { overflowY: "auto", flex: "1", paddingRight: "10px" } });

                    const closePanel = (wasSelectedOnOpen) => { // 接收打开面板时的选中状态
                        panel.remove();
                        const currentPostInArray = posts.find(p => p.id == post.id); // 获取posts数组中最新的post数据
                        if (!currentPostInArray) {
                            return;
                        }

                        // 准备数据，如果被编辑过则使用临时数据
                        let postDataToRender = temporaryTagEdits[post.id];

                        // 获取原始数据，用于比较
                        const originalPost = originalPostCache[post.id];

                        // 检查是否有实际编辑
                        let hasActualEdits = false;
                        if (postDataToRender && originalPost) {
                            const categories = ["artist", "copyright", "character", "general", "meta"];
                            for (const category of categories) {
                                if (!compareTagStrings(originalPost[`tag_string_${category}`], postDataToRender[`tag_string_${category}`])) {
                                    hasActualEdits = true;
                                    break;
                                }
                            }
                            if (!hasActualEdits && !compareTagStrings(originalPost.tag_string, postDataToRender.tag_string)) {
                                hasActualEdits = true;
                            }
                        }

                        if (hasActualEdits) {
                            // 如果有实际编辑，用编辑后的数据更新posts数组
                            const postIndex = posts.findIndex(p => p.id == post.id);
                            if (postIndex !== -1) {
                                posts[postIndex] = JSON.parse(JSON.stringify(postDataToRender)); // 确保深拷贝
                            }
                        } else {
                            // 如果没有实际编辑，清理临时副本
                            temporaryTagEdits[post.id] = undefined;
                            postDataToRender = currentPostInArray; // 确保渲染时使用 posts 数组中的当前数据
                        }

                        // 重新渲染该post
                        const oldPostElement = imageGrid.querySelector(`.danbooru-image-wrapper[data-post-id="${post.id}"]`);

                        const postIndex = posts.findIndex(p => p.id == post.id);
                        const newPostElement = createPostElement(posts[postIndex]); // 使用 posts 数组中的最新数据
                        if (newPostElement) {
                            if (oldPostElement && oldPostElement.parentNode) {
                                oldPostElement.parentNode.replaceChild(newPostElement, oldPostElement);
                            } else {
                                imageGrid.prepend(newPostElement);
                            }
                            resizeGrid();
                        } else {
                            if (oldPostElement) {
                                oldPostElement.remove();
                            }
                        }

                        // 无论是否编辑，如果打开面板时是选中状态，都强制更新selectionWidget和选中样式
                        if (wasSelectedOnOpen) {
                            const postToUpdate = posts[postIndex] || currentPostInArray;
                            const imageUrl = postToUpdate.file_url || postToUpdate.large_file_url;
                            const selectedCategories = Array.from(categoryDropdown.querySelectorAll("input:checked")).map(i => i.name);

                            let output_tags = [];
                            selectedCategories.forEach(category => {
                                const tags = postToUpdate[`tag_string_${category}`];
                                if (tags) {
                                    output_tags.push(...tags.split(' '));
                                }
                            });

                            let tagsToProcess = (output_tags.length > 0) ? output_tags : (postToUpdate.tag_string || '').split(' ');

                            // 应用提示词过滤
                            if (filterEnabled && currentFilterTags.length > 0) {
                                const filterTagsLower = currentFilterTags.map(tag => tag.toLowerCase().trim());
                                tagsToProcess = tagsToProcess.filter(tag => {
                                    const tagLower = tag.toLowerCase().trim();
                                    return !filterTagsLower.includes(tagLower);
                                });
                            }

                            const escapeBrackets = formattingDropdown.querySelector('[name="escapeBrackets"]').checked;
                            const replaceUnderscores = formattingDropdown.querySelector('[name="replaceUnderscores"]').checked;

                            // 格式化处理
                            const processedTags = tagsToProcess.map(tag => {
                                let processedTag = tag;
                                if (replaceUnderscores) {
                                    processedTag = processedTag.replace(/_/g, ' ');
                                }
                                if (escapeBrackets) {
                                    processedTag = processedTag.replaceAll('(', '\\(').replaceAll(')', '\\)');
                                }
                                return processedTag;
                            });

                            const prompt = processedTags.join(', ');

                            const selection = {
                                prompt: prompt,
                                image_url: imageUrl,
                            };

                            if (nodeInstance && nodeInstance.widgets) {
                                const selectionWidget = nodeInstance.widgets.find(w => w.name === "selection_data");
                                if (selectionWidget) {
                                    selectionWidget.value = JSON.stringify(selection);
                                    selectionWidget.callback(); // 触发回调，通知ComfyUI值已更新
                                }
                            }
                            // 重新给新元素添加选中状态
                            if (newPostElement) {
                                newPostElement.classList.add('selected');
                                // console.log(`[DanbooruGallery] Re-added 'selected' class to new element for post ID: ${post.id}. Has 'selected' class: ${newPostElement.classList.contains('selected')}`);
                            }
                        } else { // 如果打开面板时未选中，则清除所有选中的图像和提示词
                            // console.log(`[DanbooruGallery] Post was not selected when panel opened, clearing selection.`);
                            imageGrid.querySelectorAll('.danbooru-image-wrapper.selected').forEach(w => {
                                // console.log(`[DanbooruGallery] Clearing 'selected' class from post ID: ${w.dataset.postId}`);
                                w.classList.remove('selected');
                            });
                            if (nodeInstance && nodeInstance.widgets) {
                                const selectionWidget = nodeInstance.widgets.find(w => w.name === "selection_data");
                                if (selectionWidget) {
                                    selectionWidget.value = JSON.stringify({});
                                    selectionWidget.callback();
                                    // console.log(`[DanbooruGallery] selectionWidget.value cleared.`);
                                }
                            }
                        }

                        // 重新计算 isTrulyEdited 状态并更新指示器 (这里调用 updateEditedStatus 会基于新的逻辑进行判断)
                        // 注意：这里不再需要手动删除 temporaryTagEdits，因为 updateEditedStatus 会在判断为未编辑时将其设置为 undefined
                        let indicator = newPostElement ? newPostElement.querySelector('.danbooru-edited-indicator') : null;
                        if (newPostElement) {
                            // 确保 newPostElement 已经添加到 DOM 中，updateEditedStatus 才能找到 indicator
                            // 或者直接传递 isTrulyEdited 状态
                            updateEditedStatus(newPostElement, post.id); // 调用更新函数
                        }
                    };

                    content.appendChild(titleBar);
                    content.appendChild(tagsContainer);

                    // Add a footer for action buttons
                    const editPanelFooter = $el("div", {
                        style: {
                            display: "flex",
                            justifyContent: "flex-end", // Changed to align items to the end (right)
                            alignItems: "center",
                            marginTop: "15px",
                            paddingTop: "15px",
                            borderTop: "1px solid var(--input-border-color)",
                            gap: "10px", // Add some gap between buttons
                        }
                    });

                    // "Copy Tags to Clipboard" button
                    const copyTagsButton = $el("button", {
                        innerHTML: `📋 ${t('copyTags')}`,
                        style: {
                            padding: "8px 15px",
                            border: "1px solid #7B68EE",
                            borderRadius: "6px",
                            backgroundColor: "transparent",
                            color: "#7B68EE",
                            cursor: "pointer",
                            fontSize: "14px",
                            fontWeight: "500",
                            transition: "all 0.2s ease"
                        },
                        onclick: async () => {
                            const tagsToCopy = [];
                            // Collect selected categories from checkboxes
                            const selectedCategoriesCheckboxes = panel.querySelectorAll('.danbooru-edit-category-checkbox:checked');
                            const selectedCategoriesToCopy = Array.from(selectedCategoriesCheckboxes).map(cb => cb.name);

                            // Collect tags from the editable post, respecting selected categories
                            const categories = ["artist", "copyright", "character", "general", "meta"];
                            const postToCopy = temporaryTagEdits[post.id] || post;

                            categories.forEach(category => {
                                if (selectedCategoriesToCopy.includes(category)) { // Only include if category is selected
                                    const tags = postToCopy[`tag_string_${category}`];
                                    if (tags) {
                                        tagsToCopy.push(...tags.split(' '));
                                    }
                                }
                            });

                            if (tagsToCopy.length > 0) {
                                // 获取格式化选项
                                const escapeBrackets = formattingDropdown.querySelector('[name="escapeBrackets"]').checked;
                                const replaceUnderscores = formattingDropdown.querySelector('[name="replaceUnderscores"]').checked;

                                // 格式化标签
                                const processedTags = tagsToCopy.map(tag => {
                                    let processedTag = tag;
                                    if (replaceUnderscores) {
                                        processedTag = processedTag.replace(/_/g, ' ');
                                    }
                                    if (escapeBrackets) {
                                        processedTag = processedTag.replaceAll('(', '\\(').replaceAll(')', '\\)');
                                    }
                                    return processedTag;
                                });

                                const formattedTags = processedTags.join(', ');

                                try {
                                    await navigator.clipboard.writeText(formattedTags);
                                    showToast(t('copyTagsSuccess'), 'success', copyTagsButton);
                                } catch (err) {
                                    showToast(t('copyTagsFail'), 'error', copyTagsButton);
                                    console.error('Failed to copy: ', err);
                                }
                            } else {
                                showToast(t('noTagsToCopy'), 'info', copyTagsButton);
                            }
                        }
                    });
                    editPanelFooter.appendChild(copyTagsButton);

                    // "Reset Tags" button (moved and restyled)
                    const resetTagsButton = $el("button.danbooru-reset-tags-button", {
                        innerHTML: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg> ${t('resetTags')}`,
                        title: t('resetTags'),
                        onclick: async () => {
                            // 1. 从缓存中获取原始post数据
                            const originalPostData = originalPostCache[post.id];

                            if (originalPostData) {
                                // 2. Update posts array with original data
                                const postIndex = posts.findIndex(p => p.id === post.id);
                                if (postIndex !== -1) {
                                    posts[postIndex] = JSON.parse(JSON.stringify(originalPostData)); // 确保深拷贝
                                }

                                // 3. Clear temporaryTagEdits for this post
                                temporaryTagEdits[post.id] = undefined;

                                // 4. Re-render tags in the panel with the original data
                                renderTagsInPanel(tagsContainer, originalPostData, panel);

                                // 5. Update "edited" indicator on the main grid item
                                const wrapperElement = imageGrid.querySelector(`.danbooru-image-wrapper[data-post-id="${post.id}"]`);
                                if (wrapperElement) {
                                    updateEditedStatus(wrapperElement, originalPostData.id);
                                }

                                // 6. Update selectionWidget if the post is currently selected
                                if (isPostCurrentlySelected) {
                                    const imageUrl = originalPostData.file_url || originalPostData.large_file_url;
                                    const selectedCategories = Array.from(categoryDropdown.querySelectorAll("input:checked")).map(i => i.name);
                                    let output_tags = [];
                                    selectedCategories.forEach(category => {
                                        const tags = originalPostData[`tag_string_${category}`];
                                        if (tags) {
                                            output_tags.push(...tags.split(' '));
                                        }
                                    });
                                    let tagsToProcess = (output_tags.length > 0) ? output_tags : (originalPostData.tag_string || '').split(' ');
                                    if (filterEnabled && currentFilterTags.length > 0) {
                                        const filterTagsLower = currentFilterTags.map(tag => tag.toLowerCase().trim());
                                        tagsToProcess = tagsToProcess.filter(tag => {
                                            const tagLower = tag.toLowerCase().trim();
                                            return !filterTagsLower.includes(tagLower);
                                        });
                                    }
                                    const escapeBrackets = formattingDropdown.querySelector('[name="escapeBrackets"]').checked;
                                    const replaceUnderscores = formattingDropdown.querySelector('[name="replaceUnderscores"]').checked;
                                    const processedTags = tagsToProcess.map(tag => {
                                        let processedTag = tag;
                                        if (replaceUnderscores) {
                                            processedTag = processedTag.replace(/_/g, ' ');
                                        }
                                        if (escapeBrackets) {
                                            processedTag = processedTag.replaceAll('(', '\\(').replaceAll(')', '\\)');
                                        }
                                        return processedTag;
                                    });
                                    const prompt = processedTags.join(', ');
                                    const selection = {
                                        prompt: prompt,
                                        image_url: imageUrl,
                                    };
                                    if (nodeInstance && nodeInstance.widgets) {
                                        const selectionWidget = nodeInstance.widgets.find(w => w.name === "selection_data");
                                        if (selectionWidget) {
                                            selectionWidget.value = JSON.stringify(selection);
                                            selectionWidget.callback();
                                            // console.log(`[DanbooruGallery] resetTagsButton: selectionWidget.value updated for post ${post.id}`);
                                        }
                                    }
                                }
                                showToast(t('resetTags') + '成功', 'success', resetTagsButton);
                            } else {
                                // 如果缓存中没有原始数据，尝试从服务器获取一次
                                const fetchedOriginalPost = await fetchOriginalPost(post.id);
                                if (fetchedOriginalPost) {
                                    originalPostCache[post.id] = JSON.parse(JSON.stringify(fetchedOriginalPost)); // 缓存获取到的数据
                                    // 再次调用自身，以使用缓存中的数据进行重置
                                    showToast('已从服务器获取原始标签，请再次点击重置。', 'info', resetTagsButton);
                                    // 重新渲染面板
                                    renderTagsInPanel(tagsContainer, originalPostCache[post.id], panel);
                                } else {
                                    showError('未能获取原始标签，请检查网络或稍后重试。', false, resetTagsButton);
                                }
                            }
                        }
                    });
                    editPanelFooter.appendChild(resetTagsButton);

                    content.appendChild(editPanelFooter);
                    panel.appendChild(content);

                    // Close panel when clicking background
                    panel.addEventListener('click', (e) => {
                        if (e.target === panel) {
                            closePanel();
                        }
                    });

                    document.body.appendChild(panel);

                    renderTagsInPanel(tagsContainer, editablePost, panel);
                };

                const renderTagsInPanel = async (tagsContainer, postData, panel) => {
                    tagsContainer.innerHTML = ''; // Clear existing tags

                    const createClickableTagSpan = (tag, category, translation = null) => {
                        const displayText = translation ? `${tag} [${translation}]` : tag;
                        const span = $el("span", {
                            textContent: displayText,
                            className: `danbooru-tooltip-tag danbooru-clickable-tag tag-category-${category}`,
                        });

                        const removeExistingMenus = () => {
                            document.querySelectorAll('.danbooru-tag-context-menu').forEach(menu => menu.remove());
                        };

                        span.addEventListener('click', (e) => {
                            e.stopPropagation();
                            removeExistingMenus();

                            const menu = $el("div.danbooru-tag-context-menu", {
                                style: {
                                    position: 'absolute',
                                    zIndex: '10002',
                                    backgroundColor: 'var(--comfy-menu-bg)',
                                    border: '1px solid var(--input-border-color)',
                                    borderRadius: '6px',
                                    boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
                                    padding: '5px',
                                }
                            });

                            const searchOption = $el("div.danbooru-context-menu-item", {
                                textContent: '🔍 ' + t('search'),
                                onclick: () => {
                                    const currentVal = searchInput.value.trim();
                                    const apiTag = tag.replace(/\s+/g, '_');
                                    let newValue;
                                    if (currentVal && !/,\s*$/.test(currentVal)) {
                                        newValue = `${currentVal}, ${apiTag}, `;
                                    } else if (currentVal) {
                                        newValue = `${currentVal} ${apiTag}, `;
                                    } else {
                                        newValue = `${apiTag}, `;
                                    }
                                    searchInput.value = newValue;
                                    searchInput.dispatchEvent(new Event('input'));
                                    fetchAndRender(true);
                                    menu.remove();
                                }
                            });

                            const deleteOption = $el("div.danbooru-context-menu-item", {
                                textContent: '🗑️ ' + t('delete'),
                                onclick: () => {
                                    if (postData[`tag_string_${category}`]) {
                                        const tags = postData[`tag_string_${category}`].split(' ');
                                        const index = tags.indexOf(tag);
                                        if (index > -1) {
                                            tags.splice(index, 1);
                                            postData[`tag_string_${category}`] = tags.join(' ');
                                        }
                                    }
                                    // 强制重新渲染以更新状态
                                    renderTagsInPanel(tagsContainer, temporaryTagEdits[postData.id] || postData, panel);
                                    menu.remove();
                                }
                            });

                            menu.appendChild(searchOption);
                            menu.appendChild(deleteOption);

                            document.body.appendChild(menu);

                            const rect = span.getBoundingClientRect();
                            menu.style.left = `${rect.left}px`;
                            menu.style.top = `${rect.bottom + 5}px`;

                            const closeMenuHandler = (event) => {
                                if (!menu.contains(event.target)) {
                                    menu.remove();
                                    document.removeEventListener('click', closeMenuHandler, true);
                                }
                            };
                            document.addEventListener('click', closeMenuHandler, true);
                        });

                        return span;
                    };

                    const categoryOrder = ["artist", "copyright", "character", "general", "meta"];
                    const categorizedTags = { artist: new Set(), copyright: new Set(), character: new Set(), general: new Set(), meta: new Set() };

                    if (postData.tag_string_artist) postData.tag_string_artist.split(' ').forEach(t => categorizedTags.artist.add(t));
                    if (postData.tag_string_copyright) postData.tag_string_copyright.split(' ').forEach(t => categorizedTags.copyright.add(t));
                    if (postData.tag_string_character) postData.tag_string_character.split(' ').forEach(t => categorizedTags.character.add(t));
                    if (postData.tag_string_general) postData.tag_string_general.split(' ').forEach(t => categorizedTags.general.add(t));
                    if (postData.tag_string_meta) postData.tag_string_meta.split(' ').forEach(t => categorizedTags.meta.add(t));

                    if (Object.values(categorizedTags).every(s => s.size === 0) && postData.tag_string) {
                        postData.tag_string.split(' ').forEach(t => categorizedTags.general.add(t));
                    }

                    const allTags = Array.from(new Set(categoryOrder.flatMap(cat => Array.from(categorizedTags[cat])))).filter(Boolean);

                    let translations = {};
                    if (currentLanguage === 'zh' && allTags.length > 0) {
                        try {
                            const response = await fetch('/danbooru_gallery/translate_tags_batch', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ tags: allTags })
                            });
                            const data = await response.json();
                            if (data.success) translations = data.translations;
                        } catch (error) { console.warn("Tag translation failed for edit panel:", error); }
                    }

                    categoryOrder.forEach(categoryName => {
                        const tags = categorizedTags[categoryName];
                        if (tags.size > 0) {
                            const section = $el("div.danbooru-edit-panel-section"); // Changed class name for clarity

                            // Add a checkbox for each category in the edit panel
                            const categoryCheckboxId = `edit-panel-category-${categoryName}`;
                            const categoryCheckbox = $el("input", {
                                type: "checkbox",
                                id: categoryCheckboxId,
                                name: categoryName,
                                checked: categoryName === 'copyright' || categoryName === 'character' || categoryName === 'general', // Default to checked only for copyright, character, and general
                                className: "danbooru-edit-category-checkbox"
                            });
                            const categoryLabel = $el("label", {
                                htmlFor: categoryCheckboxId,
                                textContent: t(categoryName),
                                style: { marginLeft: "5px", fontWeight: "600", color: "#b0b3b8" } // Style to match header
                            });

                            const categoryHeader = $el("div", { style: { display: "flex", alignItems: "center", marginBottom: "4px" } }, [categoryCheckbox, categoryLabel]);
                            section.appendChild(categoryHeader);
                            const tagsWrapper = $el("div.danbooru-tooltip-tags-wrapper");
                            tags.forEach(tag => {
                                if (!tag) return;
                                const translation = translations[tag];
                                tagsWrapper.appendChild(createClickableTagSpan(tag, categoryName, translation));
                            });

                            // Add "+" button for adding new tags
                            const addButton = $el("button.danbooru-add-tag-button", {
                                textContent: "+",
                                title: t('addTag'),
                                onclick: (e) => {
                                    e.stopPropagation();
                                    addButton.style.display = 'none'; // Hide the add button

                                    const inputContainer = $el("div.danbooru-add-tag-container");
                                    const input = $el("input.danbooru-add-tag-input", { type: "text", placeholder: t('addTag') + "..." });
                                    const engSuggestions = $el("div.danbooru-suggestions-panel");
                                    const chnSuggestions = $el("div.danbooru-chinese-suggestions-panel");

                                    inputContainer.appendChild(input);
                                    document.body.appendChild(engSuggestions);
                                    document.body.appendChild(chnSuggestions);
                                    tagsWrapper.appendChild(inputContainer);

                                    input.focus();

                                    const onSelect = (selectedTag) => {
                                        const newTag = selectedTag.trim().replace(/\s/g, '_');
                                        if (newTag) {
                                            const tagStringKey = `tag_string_${categoryName}`;
                                            const currentTags = postData[tagStringKey] ? postData[tagStringKey].split(' ') : [];
                                            if (!currentTags.includes(newTag)) {
                                                currentTags.push(newTag);
                                                postData[tagStringKey] = currentTags.join(' ');
                                            }
                                            // 强制重新渲染以更新状态
                                            renderTagsInPanel(tagsContainer, temporaryTagEdits[postData.id] || postData, panel);
                                        }
                                        inputContainer.remove();
                                        engSuggestions.remove();
                                        chnSuggestions.remove();
                                        addButton.style.display = 'inline-flex';
                                    };

                                    input.addEventListener('input', () => handleAutocompletion(input, engSuggestions, chnSuggestions, onSelect));

                                    // Add positioning logic
                                    const positionSuggestions = () => {
                                        const inputRect = input.getBoundingClientRect();
                                        const top = inputRect.bottom + window.scrollY;
                                        const left = inputRect.left + window.scrollX;

                                        [engSuggestions, chnSuggestions].forEach(panel => {
                                            panel.style.top = `${top}px`;
                                            panel.style.left = `${left}px`;
                                            panel.style.minWidth = `${inputRect.width}px`;
                                        });
                                    };

                                    input.addEventListener('focus', positionSuggestions);
                                    input.addEventListener('input', positionSuggestions);
                                    window.addEventListener('resize', positionSuggestions);

                                    input.addEventListener('keydown', (e) => {
                                        if (e.key === 'Enter') {
                                            onSelect(input.value);
                                        } else if (e.key === 'Escape') {
                                            inputContainer.remove();
                                            engSuggestions.remove();
                                            chnSuggestions.remove();
                                            addButton.style.display = 'inline-flex';
                                        }
                                    });

                                    const blurHandler = (e) => {
                                        // Delay to allow click on suggestion to register
                                        setTimeout(() => {
                                            // Check if focus is moving to the suggestion panels
                                            if (!inputContainer.contains(document.activeElement) && !engSuggestions.contains(document.activeElement) && !chnSuggestions.contains(document.activeElement)) {
                                                inputContainer.remove();
                                                engSuggestions.remove();
                                                chnSuggestions.remove();
                                                addButton.style.display = 'inline-flex';
                                            }
                                        }, 100);
                                    };
                                    input.addEventListener('blur', blurHandler);
                                }
                            });
                            tagsWrapper.appendChild(addButton);

                            section.appendChild(tagsWrapper);
                            tagsContainer.appendChild(section);
                        }
                    });

                    // After rendering, check if the post is edited and update the main grid item
                    const postElement = imageGrid.querySelector(`.danbooru-image-wrapper[data-post-id="${postData.id}"]`);
                    if (postElement) {
                        updateEditedStatus(postElement, postData.id);
                    }
                };

                const createPostElement = (post) => {
                    if (!post.id || !post.preview_file_url) return null;

                    const wrapper = $el("div.danbooru-image-wrapper");
                    wrapper.dataset.postId = post.id; // 显式设置 data-post-id

                    // 首次创建post元素时，将原始post数据添加到 originalPostCache
                    if (!originalPostCache[post.id]) {
                        originalPostCache[post.id] = JSON.parse(JSON.stringify(post));
                    }

                    // Check and apply edited status on creation
                    updateEditedStatus(wrapper, post.id);

                    const img = $el("img", {
                        src: `${post.preview_file_url}?v=${post.md5}`,
                        loading: "lazy",
                        onload: resizeGrid,
                        onerror: () => { wrapper.style.display = 'none'; },
                        onclick: async (e) => {
                            e.stopPropagation(); // Prevent event from bubbling up and potentially causing issues
                            const isSelected = wrapper.classList.contains('selected');

                            // fetchAndRender(true); // 移除不必要的调用

                            // 首先，清除所有其他图像的选中状态
                            imageGrid.querySelectorAll('.danbooru-image-wrapper').forEach(w => {
                                if (w !== wrapper) {
                                    w.classList.remove('selected');
                                    // console.log(`[DanbooruGallery-Click] Removed 'selected' from other wrapper: ${w.dataset.postId}`);
                                }
                            });

                            // 然后，根据当前图像的选中状态进行切换
                            if (!isSelected) {
                                wrapper.classList.add('selected');
                                // console.log(`[DanbooruGallery-Click] Added 'selected' to wrapper: ${post.id}. Current classes: ${wrapper.classList}`);

                                const imageUrl = post.file_url || post.large_file_url;

                                const selectedCategories = Array.from(categoryDropdown.querySelectorAll("input:checked")).map(i => i.name);

                                // 动态获取最新的编辑数据
                                const currentPostId = post.id;
                                const postToUse = temporaryTagEdits[currentPostId] || post;

                                let output_tags = [];
                                selectedCategories.forEach(category => {
                                    const tags = postToUse[`tag_string_${category}`];
                                    if (tags) {
                                        output_tags.push(...tags.split(' '));
                                    }
                                });

                                let tagsToProcess = (output_tags.length > 0) ? output_tags : (postToUse.tag_string || '').split(' ');

                                // 先应用提示词过滤（在格式化之前）
                                if (filterEnabled && currentFilterTags.length > 0) {
                                    const filterTagsLower = currentFilterTags.map(tag => tag.toLowerCase().trim());
                                    tagsToProcess = tagsToProcess.filter(tag => {
                                        const tagLower = tag.toLowerCase().trim();
                                        return !filterTagsLower.includes(tagLower);
                                    });
                                }

                                const escapeBrackets = formattingDropdown.querySelector('[name="escapeBrackets"]').checked;
                                const replaceUnderscores = formattingDropdown.querySelector('[name="replaceUnderscores"]').checked;

                                // 然后进行格式化处理（括号转义和下划线替换）
                                const processedTags = tagsToProcess.map(tag => {
                                    let processedTag = tag;
                                    if (replaceUnderscores) {
                                        processedTag = processedTag.replace(/_/g, ' ');
                                    }
                                    if (escapeBrackets) {
                                        processedTag = processedTag.replaceAll('(', '\\(').replaceAll(')', '\\)');
                                    }
                                    return processedTag;
                                });

                                const prompt = processedTags.join(', ');

                                const selection = {
                                    prompt: prompt,
                                    image_url: imageUrl,
                                };

                                // 查找隐藏的 selection_data widget 并更新其值 - 使用保存的节点实例引用
                                if (nodeInstance && nodeInstance.widgets) {
                                    const selectionWidget = nodeInstance.widgets.find(w => w.name === "selection_data");
                                    if (selectionWidget) {
                                        selectionWidget.value = JSON.stringify(selection);
                                        selectionWidget.callback(); // 触发回调，通知ComfyUI值已更新
                                        // console.log(`[DanbooruGallery-Click] selectionWidget.value set to: ${selectionWidget.value}`);
                                    }
                                }
                            } else {
                                wrapper.classList.remove('selected');
                                // console.log(`[DanbooruGallery-Click] Removed 'selected' from wrapper: ${post.id}. Current classes: ${wrapper.classList}`);
                                if (nodeInstance && nodeInstance.widgets) {
                                    const selectionWidget = nodeInstance.widgets.find(w => w.name === "selection_data");
                                    if (selectionWidget) {
                                        selectionWidget.value = JSON.stringify({});
                                        selectionWidget.callback();
                                        // console.log(`[DanbooruGallery-Click] selectionWidget.value cleared.`);
                                    }
                                }
                            }
                        },
                    });

                    // 创建下载按钮
                    const downloadButton = $el("button.danbooru-download-button", {
                        innerHTML: `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>`,
                        title: t('download'),
                        onclick: async (e) => {
                            e.stopPropagation(); // 阻止事件冒泡，避免触发图片选择

                            try {
                                const imageUrl = post.file_url || post.large_file_url;
                                if (!imageUrl) {
                                    return;
                                }

                                // 获取图片文件扩展名
                                const fileExt = post.file_ext || 'jpg';
                                const fileName = `danbooru_${post.id}.${fileExt}`;

                                // 创建下载链接
                                const response = await fetch(imageUrl);
                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);

                                const a = document.createElement('a');
                                a.href = url;
                                a.download = fileName;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                window.URL.revokeObjectURL(url);
                            } catch (error) {
                                // 下载失败，静默处理
                            }
                        }
                    });

                    // 使用全局tooltip实例
                    if (!globalTooltip) {
                        globalTooltip = $el("div.danbooru-tag-tooltip", { style: { display: "none", position: "absolute", zIndex: "1000" } });
                        const tagsContainer = $el("div", { className: "danbooru-tooltip-tags" });
                        globalTooltip.appendChild(tagsContainer);
                        document.body.appendChild(globalTooltip);
                    }

                    const createTagSpan = (tag, category, translation = null) => {
                        const displayText = translation ? `${tag} [${translation}]` : tag;
                        return $el("span", {
                            textContent: displayText,
                            className: `danbooru-tooltip-tag tag-category-${category}`,
                        });
                    };

                    let currentClickHandler = null;

                    wrapper.addEventListener("mouseenter", async (e) => {
                        if (!uiSettings.tooltip_enabled) return;
                        clearTimeout(globalTooltipTimeout);

                        const tagsContainer = globalTooltip.querySelector('.danbooru-tooltip-tags');
                        tagsContainer.innerHTML = '';

                        // Details Section
                        const detailsSection = $el("div.danbooru-tooltip-section");
                        detailsSection.appendChild($el("div.danbooru-tooltip-category-header", { textContent: t('details') }));
                        if (post.created_at) {
                            const date = new Date(post.created_at);
                            const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                            detailsSection.appendChild($el("div", { textContent: `${t('uploaded')}: ${formattedDate}`, className: "danbooru-tooltip-upload-date" }));
                        }
                        if (post.image_width && post.image_height) {
                            detailsSection.appendChild($el("div", { textContent: `${t('resolution')}: ${post.image_width}×${post.image_height}`, className: "danbooru-tooltip-upload-date" }));
                        }
                        tagsContainer.appendChild(detailsSection);

                        // Tags Processing
                        const categoryOrder = ["artist", "copyright", "character", "general", "meta"];
                        const categorizedTags = {
                            artist: new Set(),
                            copyright: new Set(),
                            character: new Set(),
                            general: new Set(),
                            meta: new Set()
                        };

                        if (post.tag_string_artist) post.tag_string_artist.split(' ').forEach(t => categorizedTags.artist.add(t));
                        if (post.tag_string_copyright) post.tag_string_copyright.split(' ').forEach(t => categorizedTags.copyright.add(t));
                        if (post.tag_string_character) post.tag_string_character.split(' ').forEach(t => categorizedTags.character.add(t));
                        if (post.tag_string_general) post.tag_string_general.split(' ').forEach(t => categorizedTags.general.add(t));
                        if (post.tag_string_meta) post.tag_string_meta.split(' ').forEach(t => categorizedTags.meta.add(t));

                        // Fallback for older posts or different tag string formats
                        if (Object.values(categorizedTags).every(s => s.size === 0) && post.tag_string) {
                            post.tag_string.split(' ').forEach(t => categorizedTags.general.add(t));
                        }

                        // 收集所有tags用于批量翻译
                        const allTags = [];
                        categoryOrder.forEach(categoryName => {
                            if (categorizedTags[categoryName].size > 0) {
                                allTags.push(...Array.from(categorizedTags[categoryName]));
                            }
                        });

                        // 批量获取翻译（仅在中文模式下）
                        let translations = {};
                        if (currentLanguage === 'zh') {
                            try {
                                if (allTags.length > 0) {
                                    const response = await fetch('/danbooru_gallery/translate_tags_batch', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ tags: allTags })
                                    });
                                    const data = await response.json();
                                    if (data.success) {
                                        translations = data.translations;
                                    }
                                }
                            } catch (error) {
                                // 翻译获取失败，继续显示英文标签
                            }
                        }

                        // Render all tag categories with translations
                        categoryOrder.forEach(categoryName => {
                            if (categorizedTags[categoryName].size > 0) {
                                const section = $el("div.danbooru-tooltip-section");
                                section.appendChild($el("div.danbooru-tooltip-category-header", { textContent: t(categoryName) }));
                                const tagsWrapper = $el("div.danbooru-tooltip-tags-wrapper");
                                categorizedTags[categoryName].forEach(tag => {
                                    const translation = translations[tag];
                                    tagsWrapper.appendChild(createTagSpan(tag, categoryName, translation));
                                });
                                section.appendChild(tagsWrapper);
                                tagsContainer.appendChild(section);
                            }
                        });

                        globalTooltip.style.display = "block";

                        // 添加点击其他地方隐藏tooltip的保护机制
                        currentClickHandler = (e) => {
                            if (!wrapper.contains(e.target) && globalTooltip.style.display !== 'none') {
                                globalTooltip.style.display = "none";
                                document.removeEventListener('click', currentClickHandler);
                                currentClickHandler = null;
                            }
                        };

                        // 延迟添加点击监听器，避免立即触发
                        setTimeout(() => {
                            if (currentClickHandler) {
                                document.addEventListener('click', currentClickHandler);
                            }
                        }, 10);
                    });

                    wrapper.addEventListener("mouseleave", () => {
                        // 鼠标离开图像时立即隐藏tooltip
                        globalTooltip.style.display = "none";
                        // 移除点击监听器
                        if (currentClickHandler) {
                            document.removeEventListener('click', currentClickHandler);
                            currentClickHandler = null;
                        }
                    });

                    wrapper.addEventListener("mousemove", (e) => {
                        if (globalTooltip.style.display !== 'block') return;
                        const rect = globalTooltip.getBoundingClientRect();
                        const buffer = 15;
                        let newLeft = e.clientX + buffer, newTop = e.clientY + buffer;
                        if (newLeft + rect.width > window.innerWidth) newLeft = e.clientX - rect.width - buffer;
                        if (newTop + rect.height > window.innerHeight) newTop = e.clientY - rect.height - buffer;
                        globalTooltip.style.left = `${newLeft + window.scrollX}px`;
                        globalTooltip.style.top = `${newTop + window.scrollY}px`;
                    });

                    // 总是创建收藏按钮，无论用户是否登录
                    const currentSearch = searchInput.value.trim();
                    const inFavoritesMode = userAuth.has_auth && currentSearch.includes(`ordfav:${userAuth.username}`);
                    const isFavorited = inFavoritesMode || userFavorites.includes(String(post.id));
                    const favoriteButton = $el("button.danbooru-favorite-button", {
                        "data-post-id": post.id,
                        innerHTML: isFavorited ?
                            `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="#DC3545" stroke="#DC3545" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                            </svg>` :
                            `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                            </svg>`,
                        title: isFavorited ? t('unfavorite') : t('favorite'),
                        className: isFavorited ? 'favorited' : '',
                        onclick: async (e) => {
                            e.stopPropagation(); // 阻止事件冒泡，避免触发图片选择

                            // 如果用户未登录，提示登录
                            if (!userAuth.has_auth) {
                                alert(t('authRequired'));
                                return;
                            }

                            // 在操作收藏前验证用户名和API Key的有效性

                            const currentlyFavorited = userFavorites.includes(String(post.id)) || inFavoritesMode;
                            let result;

                            if (currentlyFavorited) {
                                // 取消收藏
                                result = await removeFromFavorites(post.id, favoriteButton);
                                if (result.success) {
                                    // 如果在收藏夹视图中，直接移除元素
                                    const currentSearch = searchInput.value.trim();
                                    if (currentSearch.includes(`ordfav:${userAuth.username}`)) {
                                        wrapper.remove();
                                    }
                                }
                            } else {
                                // 添加收藏
                                result = await addToFavorites(post.id, favoriteButton);
                            }

                            // 错误已在函数内处理
                        }
                    });

                    // 创建按钮容器
                    const buttonsContainer = $el("div.danbooru-image-buttons");

                    // 创建编辑模式按钮
                    const editButton = $el("button.danbooru-edit-button", {
                        innerHTML: `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>`,
                        title: t('editMode'),
                        onclick: (e) => {
                            e.stopPropagation();
                            showEditPanel(post);
                        }
                    });

                    const viewImageButton = $el("button.danbooru-view-image-button", {
                        innerHTML: `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
                        title: t('viewImage'),
                        onclick: (e) => {
                            e.stopPropagation();
                            const imageUrl = post.large_file_url || post.file_url;
                            if (imageUrl) {
                                window.open(imageUrl, '_blank');
                            }
                        }
                    });

                    buttonsContainer.appendChild(viewImageButton);
                    buttonsContainer.appendChild(editButton);
                    buttonsContainer.appendChild(downloadButton);
                    buttonsContainer.appendChild(favoriteButton);

                    wrapper.appendChild(img);
                    wrapper.appendChild(buttonsContainer);

                    return wrapper;
                };

                const renderPost = (post) => {
                    const element = createPostElement(post);
                    if (element) {
                        imageGrid.appendChild(element);
                    }
                };

                const observer = new ResizeObserver(resizeGrid);
                observer.observe(imageGrid);

                let scrollTimeout;
                imageGrid.addEventListener("scroll", () => {
                    if (imageGrid.scrollHeight - imageGrid.scrollTop - imageGrid.clientHeight < 400) {
                        fetchAndRender(false);
                    }

                    // Debounced scroll logic for page indicator
                    clearTimeout(scrollTimeout);
                    scrollTimeout = setTimeout(updateCurrentPageIndicator, 150);
                });

                searchInput.addEventListener("keydown", (e) => {
                    if (e.key === "Enter") {
                        saveToLocalStorage('searchValue', searchInput.value.trim());
                        fetchAndRender(true);
                    }
                });
                ratingSelect.addEventListener("change", () => {
                    if (globalTooltip) {
                        globalTooltip.style.display = 'none';
                    }
                    fetchAndRender(true); // 保留，因为改变评分需要重新加载
                });
                // 检查和更新排行榜按钮状态的函数
                const updateRankingButtonState = () => {
                    const currentValue = searchInput.value.trim();
                    const hasRanking = currentValue.includes('order:rank');

                    if (hasRanking) {
                        rankingButton.classList.add('active');
                    } else {
                        rankingButton.classList.remove('active');
                    }
                };

                // 排行榜按钮点击事件
                rankingButton.addEventListener("click", () => {
                    const currentValue = searchInput.value.trim();
                    const hasRanking = currentValue.includes('order:rank');

                    if (hasRanking) {
                        // 移除 order:rank，并清理残留的逗号
                        let newValue = currentValue.replace(/\s*order:rank\s*/g, '');
                        // 清理多余的逗号和空格
                        newValue = newValue.replace(/,\s*,/g, ',').replace(/,\s*$/g, '').replace(/^\s*,/g, '').replace(/\s+/g, ' ').trim();
                        searchInput.value = newValue;
                        rankingButton.classList.remove('active');
                    } else {
                        // 添加 order:rank
                        let newValue;
                        if (currentValue) {
                            // 如果前面已经有内容，用逗号分隔，但检查末尾是否已有逗号（后面可能有空格）
                            const hasTrailingComma = /\s*,\s*$/.test(currentValue);
                            const separator = hasTrailingComma ? ' ' : ', ';
                            newValue = `${currentValue}${separator}order:rank`;
                        } else {
                            newValue = 'order:rank';
                        }
                        searchInput.value = newValue;
                        rankingButton.classList.add('active');
                    }

                    // 刷新图像
                    saveToLocalStorage('searchValue', searchInput.value);
                    fetchAndRender(true);
                });

                // 监听搜索框变化，更新排行榜按钮状态
                // 更新收藏夹按钮状态
                const updateFavoritesButtonState = () => {
                    // 始终显示收藏夹按钮
                    favoritesButton.style.display = 'flex';

                    if (!userAuth.has_auth) {
                        favoritesButton.classList.remove('active');
                        return;
                    }

                    const currentValue = searchInput.value.trim();
                    const hasFavs = currentValue.includes(`ordfav:${userAuth.username}`);
                    if (hasFavs) {
                        favoritesButton.classList.add('active');
                    } else {
                        favoritesButton.classList.remove('active');
                    }
                };

                // 统一的搜索框输入处理函数
                const handleSearchInput = () => {
                    const currentValue = searchInput.value.trim();
                    if (previousSearchValue !== "" && currentValue === "") {
                        saveToLocalStorage('searchValue', '');
                        fetchAndRender(true); // 清空搜索框时自动刷新
                    }
                    previousSearchValue = currentValue;
                    updateRankingButtonState();
                    updateFavoritesButtonState();

                    const clearButton = searchContainer.querySelector('.danbooru-clear-search-button');
                    if (clearButton) {
                        clearButton.style.display = currentValue ? 'block' : 'none';
                    }

                    const onSelect = (selectedTag, lastWord) => {
                        const currentVal = searchInput.value;
                        const lastWordIndex = currentVal.lastIndexOf(lastWord);
                        const base = currentVal.substring(0, lastWordIndex).trim();
                        let newValue;
                        if (base && !/,\s*$/.test(base)) {
                            newValue = `${base}, ${selectedTag}, `;
                        } else if (base) {
                            newValue = `${base} ${selectedTag}, `;
                        } else {
                            newValue = `${selectedTag}, `;
                        }
                        searchInput.value = newValue;
                        suggestionsPanel.style.display = 'none';
                        chineseSuggestionsPanel.style.display = 'none';
                        searchInput.focus();
                        searchInput.dispatchEvent(new Event('input'));
                        fetchAndRender(true);
                    };

                    handleAutocompletion(searchInput, suggestionsPanel, chineseSuggestionsPanel, onSelect);
                };

                // 自动补全处理函数 (已重构以支持不同输入框)
                const handleAutocompletion = (inputElement, engSuggestionsEl, chnSuggestionsEl, onSelect) => {
                    clearTimeout(inputElement.debounceTimer);
                    clearTimeout(inputElement.chineseDebounceTimer);

                    const query = inputElement.value;
                    const lastWord = query.split(/[\s,]+/).pop();

                    if (currentLanguage === 'zh' && containsChinese(lastWord)) {
                        engSuggestionsEl.style.display = 'none';
                        inputElement.chineseDebounceTimer = setTimeout(async () => {
                            if (lastWord.length < 1) {
                                chnSuggestionsEl.style.display = 'none';
                                return;
                            }
                            try {
                                const response = await fetch(`/danbooru_gallery/search_chinese?query=${encodeURIComponent(lastWord)}&limit=10`);
                                const data = await response.json();
                                chnSuggestionsEl.innerHTML = '';
                                if (data.success && data.results.length > 0) {
                                    data.results.forEach(result => {
                                        const item = $el('div.danbooru-chinese-suggestion-item', {
                                            innerHTML: `<span class="danbooru-suggestion-chinese">${result.chinese}</span><span class="danbooru-suggestion-english">${result.english}</span>`
                                        });
                                        item.onclick = () => onSelect(result.english, lastWord);
                                        chnSuggestionsEl.appendChild(item);
                                    });
                                    chnSuggestionsEl.style.display = 'block';
                                } else {
                                    chnSuggestionsEl.style.display = 'none';
                                }
                            } catch (error) { chnSuggestionsEl.style.display = 'none'; }
                        }, 250);
                        return;
                    } else {
                        chnSuggestionsEl.style.display = 'none';
                    }

                    if (!uiSettings.autocomplete_enabled) {
                        engSuggestionsEl.style.display = 'none';
                        return;
                    }

                    inputElement.debounceTimer = setTimeout(async () => {
                        if (lastWord.length < 2) {
                            engSuggestionsEl.style.display = 'none';
                            return;
                        }
                        try {
                            const maxResults = uiSettings.autocomplete_max_results || 20;
                            const apiEndpoint = currentLanguage === 'zh' ? '/danbooru_gallery/autocomplete_with_translation' : '/danbooru_gallery/autocomplete';
                            const response = await fetch(`${apiEndpoint}?query=${encodeURIComponent(lastWord)}&limit=${maxResults}`);
                            const suggestions = await response.json();
                            engSuggestionsEl.innerHTML = '';
                            if (suggestions.length > 0) {
                                suggestions.slice(0, maxResults).forEach(tag => {
                                    const displayName = (currentLanguage === 'zh' && tag.translation) ? `${tag.name} [${tag.translation}]` : tag.name;
                                    const item = $el('div.danbooru-suggestion-item', {
                                        innerHTML: `<span class="danbooru-suggestion-name">${displayName}</span><span class="danbooru-suggestion-count">${tag.post_count}</span>`
                                    });
                                    item.onclick = () => onSelect(tag.name, lastWord);
                                    engSuggestionsEl.appendChild(item);
                                });
                                engSuggestionsEl.style.display = 'block';
                            } else {
                                engSuggestionsEl.style.display = 'none';
                            }
                        } catch (error) { engSuggestionsEl.style.display = 'none'; }
                    }, 250);
                };

                searchInput.addEventListener("input", handleSearchInput);

                // 收藏夹按钮点击事件
                favoritesButton.addEventListener("click", async () => {
                    if (!userAuth.has_auth) {
                        alert(t('authRequired'));
                        return;
                    }


                    const favTag = `ordfav:${userAuth.username}`;
                    const currentValue = searchInput.value.trim();
                    const hasFavs = currentValue.includes(favTag);

                    if (hasFavs) {
                        // 移除收藏夹标签，并清理残留的逗号
                        let newValue = currentValue.replace(new RegExp(`\\s*${favTag}\\s*`), '');
                        // 清理多余的逗号和空格
                        newValue = newValue.replace(/,\s*,/g, ',').replace(/,\s*$/g, '').replace(/^\s*,/g, '').replace(/\s+/g, ' ').trim();
                        searchInput.value = newValue;
                    } else {
                        let newValue;
                        if (currentValue) {
                            // 如果前面已经有内容，用逗号分隔，但检查末尾是否已有逗号（后面可能有空格）
                            const hasTrailingComma = /\s*,\s*$/.test(currentValue);
                            const separator = hasTrailingComma ? ' ' : ', ';
                            newValue = `${currentValue}${separator}${favTag}`;
                        } else {
                            newValue = favTag;
                        }
                        searchInput.value = newValue;
                        // 进入收藏夹模式时，不需要手动加载收藏列表，因为 fetchAndRender 会获取
                    }
                    updateFavoritesButtonState();
                    saveToLocalStorage('searchValue', searchInput.value);
                    fetchAndRender(true);
                });

                refreshButton.addEventListener("click", () => {
                    fetchAndRender(true);
                });

                const searchContainer = $el("div.danbooru-search-container");
                const clearButton = $el("button.danbooru-clear-search-button", {
                    innerHTML: '×',
                    title: t('clearSearch'),
                    style: {
                        display: 'none'
                    },
                    onclick: () => {
                        searchInput.value = '';
                        searchInput.dispatchEvent(new Event('input'));
                        fetchAndRender(true);
                    }
                });
                searchContainer.appendChild(searchInput);
                searchContainer.appendChild(clearButton);

                // 创建自动补全建议的容器
                const suggestionsPanel = $el("div.danbooru-suggestions-panel");
                searchContainer.appendChild(suggestionsPanel);

                // 创建中文搜索建议的容器
                const chineseSuggestionsPanel = $el("div.danbooru-chinese-suggestions-panel");
                searchContainer.appendChild(chineseSuggestionsPanel);

                // 将包含搜索框和建议面板的容器添加到总控件中
                container.appendChild($el("div.danbooru-controls", [searchContainer, rankingButton, favoritesButton, ratingSelect, categoryDropdown, formattingDropdown, filterButton, settingsButton, refreshButton]));
                container.appendChild(imageGrid);

                // 添加页码指示器
                const pageIndicator = $el("div.danbooru-page-indicator", {
                    style: {
                        display: 'none', // Initially hidden
                        padding: '4px 8px',
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        color: 'white',
                        fontSize: '12px',
                        borderRadius: '4px',
                        position: 'absolute',
                        bottom: '10px',
                        left: '10px',
                        zIndex: '20',
                        backdropFilter: 'blur(5px)'
                    }
                });
                container.appendChild(pageIndicator);

                // --- 自动补全和中文搜索逻辑 ---
                let debounceTimer;
                let chineseDebounceTimer;

                // 检测是否包含中文字符
                const containsChinese = (text) => {
                    return /[\u4e00-\u9fff]/.test(text);
                };

                let selectedSuggestionIndex = -1;

                searchInput.addEventListener('keydown', (e) => {
                    // 检查当前活跃的建议面板
                    const isChinesePanelActive = chineseSuggestionsPanel.style.display === 'block';
                    const isEnglishPanelActive = suggestionsPanel.style.display === 'block';

                    let suggestions = [];
                    if (isChinesePanelActive) {
                        suggestions = chineseSuggestionsPanel.querySelectorAll('.danbooru-chinese-suggestion-item');
                    } else if (isEnglishPanelActive) {
                        suggestions = suggestionsPanel.querySelectorAll('.danbooru-suggestion-item');
                    }

                    if (suggestions.length === 0) {
                        selectedSuggestionIndex = -1;
                        return;
                    }

                    if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        selectedSuggestionIndex = (selectedSuggestionIndex + 1) % suggestions.length;
                        updateSelectedSuggestion(suggestions);
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        selectedSuggestionIndex = (selectedSuggestionIndex - 1 + suggestions.length) % suggestions.length;
                        updateSelectedSuggestion(suggestions);
                    } else if (e.key === 'Enter') {
                        if (selectedSuggestionIndex > -1) {
                            e.preventDefault();
                            suggestions[selectedSuggestionIndex].click();
                        }
                    } else if (e.key === 'Escape') {
                        suggestionsPanel.style.display = 'none';
                        chineseSuggestionsPanel.style.display = 'none';
                        selectedSuggestionIndex = -1;
                    }
                });

                const updateSelectedSuggestion = (suggestions) => {
                    suggestions.forEach((item, index) => {
                        if (index === selectedSuggestionIndex) {
                            item.classList.add('selected');
                        } else {
                            item.classList.remove('selected');
                        }
                    });
                };

                // 点击外部区域隐藏建议列表
                document.addEventListener('click', (e) => {
                    if (!searchContainer.contains(e.target)) {
                        suggestionsPanel.style.display = 'none';
                        chineseSuggestionsPanel.style.display = 'none';
                    }
                });


                const insertNewPost = (post) => {
                    const newElement = createPostElement(post);
                    if (newElement) {
                        imageGrid.prepend(newElement);
                        newElement.classList.add('new-item');
                        newElement.addEventListener('animationend', () => newElement.classList.remove('new-item'));
                        resizeGrid();
                    }
                };

                const updateEditedStatus = (wrapperElement, postId) => {
                    const originalPost = originalPostCache[postId]; // 从缓存中获取原始数据
                    const editedPost = temporaryTagEdits[postId];

                    let isTrulyEdited = false;
                    if (editedPost && originalPost) {
                        const categories = ["artist", "copyright", "character", "general", "meta"];
                        const hasCategoryTags = categories.some(cat => originalPost.hasOwnProperty(`tag_string_${cat}`) || editedPost.hasOwnProperty(`tag_string_${cat}`));

                        if (hasCategoryTags) {
                            for (const category of categories) {
                                if (!compareTagStrings(originalPost[`tag_string_${category}`], editedPost[`tag_string_${category}`])) {
                                    isTrulyEdited = true;
                                    break;
                                }
                            }
                        } else {
                            // 如果没有分类标签，检查tag_string是否被编辑
                            if (!compareTagStrings(originalPost.tag_string, editedPost.tag_string)) {
                                isTrulyEdited = true;
                            }
                        }
                    }

                    const indicator = wrapperElement.querySelector('.danbooru-edited-indicator');

                    if (isTrulyEdited) {
                        if (!indicator) {
                            const newIndicator = $el("div.danbooru-edited-indicator", { textContent: t('edited') });
                            wrapperElement.appendChild(newIndicator);
                        }
                    } else {
                        if (indicator) {
                            indicator.remove();
                        }
                    }
                    return isTrulyEdited;
                };
                // 初始化功能
                const initializeApp = async () => {
                    try {
                        // Try to load filter state from the widget right before we need it
                        try {
                            if (filterWidget.value) {
                                filterState = JSON.parse(filterWidget.value);
                            }
                        } catch (e) {
                            console.warn("Danbooru Gallery: Could not parse filter state, using default.", e);
                            filterState = { startTime: null, endTime: null, startPage: null };
                        }

                        // console.log("Initializing Danbooru Gallery...");
                        let networkConnected = true;

                        // 优先检测网络连接状态
                        try {
                            const networkResponse = await fetch('/danbooru_gallery/check_network');
                            const networkData = await networkResponse.json();
                            if (!networkData.success || !networkData.connected) {
                                networkConnected = false;
                                showError('网络连接失败 - 无法连接到Danbooru服务器，请检查网络连接', true);
                            }
                        } catch (e) {
                            console.error('网络检测失败:', e);
                            networkConnected = false;
                            showError('网络检测失败 - 请检查网络连接', true);
                        }

                        // 加载语言设置
                        await loadLanguage();
                        // console.log("Language loaded:", currentLanguage);
                        // 加载用户认证信息
                        await loadUserAuth();
                        // console.log("User auth loaded:", userAuth);

                        if (networkConnected && userAuth.has_auth) {
                            await loadFavorites();
                        }

                        // 更新界面文本
                        updateInterfaceTexts();
                        // console.log("Interface texts updated.");
                        // 更新收藏夹按钮状态
                        updateFavoritesButtonState();
                        // console.log("Favorites button state updated.");
                        // 加载黑名单
                        await loadBlacklist();
                        // console.log("Blacklist loaded.");
                        // 加载提示词过滤设置
                        await loadFilterTags();
                        // console.log("Filter tags loaded.");
                        // 加载UI设置
                        await loadUiSettings();
                        // console.log("UI settings loaded.");

                        // 从 localStorage 加载并覆盖筛选状态
                        const savedSearch = loadFromLocalStorage('searchValue', null);
                        if (savedSearch !== null) {
                            searchInput.value = savedSearch;
                        }

                        const savedRating = loadFromLocalStorage('ratingValue', null);
                        if (savedRating !== null) {
                            const ratingButton = ratingSelect.querySelector('.danbooru-category-button');
                            const ratingItem = ratingSelect.querySelector(`.danbooru-category-item[data-value="${savedRating}"]`);
                            if (ratingButton && ratingItem) {
                                ratingButton.dataset.value = savedRating;
                                const ratingText = ratingItem.textContent;
                                ratingButton.innerHTML = `${ratingText} <svg class="arrow-down" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;
                            }
                        }

                        const savedCategories = loadFromLocalStorage('selectedCategories', null);
                        if (savedCategories) {
                            uiSettings.selected_categories = savedCategories;
                        }
                        const categoryCheckboxes = categoryDropdown.querySelectorAll('.danbooru-category-checkbox');
                        categoryCheckboxes.forEach(checkbox => {
                            checkbox.checked = uiSettings.selected_categories.includes(checkbox.name);
                        });

                        const savedFormatting = loadFromLocalStorage('formatting', null);
                        if (savedFormatting) {
                            uiSettings.formatting = savedFormatting;
                        }
                        const escapeBracketsCheckbox = formattingDropdown.querySelector('[name="escapeBrackets"]');
                        const replaceUnderscoresCheckbox = formattingDropdown.querySelector('[name="replaceUnderscores"]');
                        if (escapeBracketsCheckbox && uiSettings.formatting) {
                            escapeBracketsCheckbox.checked = uiSettings.formatting.escapeBrackets;
                        }
                        if (replaceUnderscoresCheckbox && uiSettings.formatting) {
                            replaceUnderscoresCheckbox.checked = uiSettings.formatting.replaceUnderscores;
                        }

                        const savedFilterData = loadFromLocalStorage('filterData', null);
                        if (savedFilterData) {
                            filterState = savedFilterData;
                            filterWidget.value = JSON.stringify(filterState);
                        }

                        // 初始化排行榜按钮状态
                        updateRankingButtonState();
                        // console.log("Ranking button state updated.");
                        // 根据加载的 filterState 更新筛选按钮状态
                        if (filterState.startTime || filterState.endTime || filterState.startPage) {
                            filterButton.classList.add('active');
                        } else {
                            filterButton.classList.remove('active');
                        }

                        // 页面加载时直接获取第一页的帖子
                        fetchAndRender(true);
                        // console.log("Initial fetch triggered.");
                    } catch (error) {
                        console.error("Danbooru Gallery initialization failed:", error);
                        showError("图库初始化失败，请检查控制台日志。", true);
                    }
                };

                const updateCurrentPageIndicator = () => {
                    if (posts.length === 0) {
                        pageIndicator.style.display = 'none';
                        return;
                    }

                    const itemsPerPage = 100;

                    // Find the first visible element in the grid
                    const firstVisibleChild = Array.from(imageGrid.children).find(child => {
                        const rect = child.getBoundingClientRect();
                        const gridRect = imageGrid.getBoundingClientRect();
                        return rect.bottom > gridRect.top && rect.top < gridRect.bottom;
                    });

                    if (firstVisibleChild) {
                        const postId = firstVisibleChild.dataset.postId;
                        const postIndex = posts.findIndex(p => String(p.id) === postId);

                        if (postIndex !== -1) {
                            const currentPageInView = Math.floor(postIndex / itemsPerPage) + (filterState.startPage || 1);
                            pageIndicator.textContent = `${t('currentPage')}: ${currentPageInView}`;
                            pageIndicator.style.display = 'block';
                        } else {
                            pageIndicator.style.display = 'none';
                        }
                    } else {
                        pageIndicator.style.display = 'none';
                    }
                };

                // 启动应用
                initializeApp();

                this.onResize = (size) => {
                    const [width, height] = size;
                    const controlsHeight = container.querySelector('.danbooru-controls')?.offsetHeight || 0;
                    if (controlsHeight > 0) {
                        imageGrid.style.height = `${height - controlsHeight - 10}px`;
                    }
                }
            };

            const onRemoved = nodeType.prototype.onRemoved;
            nodeType.prototype.onRemoved = function () {
                // 移除所有可能由该节点创建的全局UI元素
                const elementsToRemove = document.querySelectorAll(
                    ".danbooru-settings-dialog, .danbooru-edit-panel, .danbooru-tag-tooltip, .danbooru-tag-context-menu, .danbooru-toast"
                );
                elementsToRemove.forEach(el => el.remove());

                // 调用原始的 onRemoved 方法
                onRemoved?.apply(this, arguments);
            };
        }
    },
});

$el("style", {
    textContent: `
    /* 搜索容器，用于定位建议面板 */
    .danbooru-search-container {
        position: relative;
        flex-grow: 1;
        display: flex;
        align-items: center;
    }

    .danbooru-search-input {
        /* padding-right: 28px !important; */ /* 为清空按钮留出空间, 已被新的flex布局取代 */
    }

    .danbooru-clear-search-button {
        position: absolute;
        right: 5px;
        top: 50%;
        transform: translateY(-50%);
        background: transparent;
        border: none;
        color: #999;
        cursor: pointer;
        font-size: 20px;
        line-height: 1;
        padding: 0 5px;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        transition: all 0.2s;
    }
    .danbooru-clear-search-button:hover {
        background-color: rgba(255, 255, 255, 0.1);
        color: white;
    }

    /* 自动补全建议面板 */
    .danbooru-suggestions-panel {
        display: none;
        position: absolute;
        top: 100%;
        left: 0;
        min-width: 100%;
        max-width: 600px;
        width: auto;
        background-color: var(--comfy-menu-bg);
        border: 1px solid var(--input-border-color);
        border-top: none;
        border-radius: 0 0 6px 6px;
        z-index: 1002;
        max-height: 400px;
        overflow-y: auto;
        overflow-x: hidden;
        box-shadow: 0 8px 16px rgba(0,0,0,0.3);
        white-space: nowrap;
    }

    .danbooru-suggestion-item {
        padding: 8px 12px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: background-color 0.2s;
        min-width: fit-content;
    }

    .danbooru-suggestion-item:hover,
    .danbooru-suggestion-item.selected {
        background-color: rgba(123, 104, 238, 0.3);
    }

    .danbooru-suggestion-name {
        color: var(--comfy-input-text);
        font-weight: 500;
        flex: 1;
        text-overflow: ellipsis;
        overflow: hidden;
        margin-right: 8px;
    }

    .danbooru-suggestion-count {
        color: #888;
        font-size: 0.9em;
        flex-shrink: 0;
    }

    /* 中文搜索建议面板 */
    .danbooru-chinese-suggestions-panel {
        display: none;
        position: absolute;
        top: 100%;
        left: 0;
        min-width: 100%;
        max-width: 500px;
        width: auto;
        background-color: var(--comfy-menu-bg);
        border: 1px solid var(--input-border-color);
        border-top: none;
        border-radius: 0 0 6px 6px;
        z-index: 1003;
        max-height: 300px;
        overflow-y: auto;
        overflow-x: hidden;
        box-shadow: 0 8px 16px rgba(0,0,0,0.3);
        white-space: nowrap;
    }

    .danbooru-chinese-suggestion-item {
        padding: 8px 12px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: background-color 0.2s;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        min-width: fit-content;
    }

    .danbooru-chinese-suggestion-item:last-child {
        border-bottom: none;
    }

    .danbooru-chinese-suggestion-item:hover,
    .danbooru-chinese-suggestion-item.selected {
        background-color: rgba(123, 104, 238, 0.3);
    }

    .danbooru-suggestion-chinese {
        color: var(--comfy-input-text);
        font-weight: 600;
        font-size: 0.95em;
        margin-right: 8px;
        flex-shrink: 0;
    }

    .danbooru-suggestion-english {
        color: #888;
        font-size: 0.85em;
        font-style: italic;
        flex-shrink: 0;
    }

    /* Category Dropdown Styles */
    .danbooru-category-dropdown { position: relative; display: inline-block; }
    
    /* Spinner for buttons */
    .spinner {
        width: 10px;
        height: 10px;
        border: 1px solid currentColor;
        border-top: 1px solid transparent;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
   
   .danbooru-category-button {
       background-color: var(--comfy-input-bg);
       color: var(--comfy-input-text);
       padding: 5px 10px;
       border: 1px solid var(--input-border-color);
       border-radius: 4px;
       cursor: pointer;
       height: 100%;
       display: flex;
       align-items: center;
       gap: 5px;
       transition: background-color 0.2s;
   }
   .danbooru-category-button:hover { background-color: var(--comfy-menu-bg); }
   .danbooru-category-button .arrow-down { transition: transform 0.2s ease-in-out; }
   .danbooru-category-button.open .arrow-down { transform: rotate(180deg); }

   .danbooru-category-list {
       visibility: hidden;
       opacity: 0;
       transform: translateY(-10px);
       transition: visibility 0.2s, opacity 0.2s, transform 0.2s ease-out;
       position: absolute;
       background-color: var(--comfy-menu-bg);
       border: 1px solid var(--input-border-color);
       border-radius: 6px;
       z-index: 1001;
       min-width: 160px;
       box-shadow: 0 5px 15px rgba(0,0,0,0.3);
       padding: 6px;
       backdrop-filter: blur(5px);
   }
   .danbooru-category-list.show {
       visibility: visible;
       opacity: 1;
       transform: translateY(0);
   }

   .danbooru-category-item {
       display: flex;
       align-items: center;
       padding: 6px 10px;
       color: var(--comfy-input-text);
       border-radius: 4px;
       transition: background-color 0.2s;
   }
   .danbooru-category-item:hover { background-color: rgba(255, 255, 255, 0.1); }
   .danbooru-rating-dropdown .danbooru-category-item { cursor: pointer; }
   .danbooru-category-item label { margin-left: 10px; cursor: pointer; user-select: none; }
   
   .danbooru-category-checkbox {
       appearance: none;
       -webkit-appearance: none;
       width: 16px;
       height: 16px;
       border-radius: 4px;
       border: 2px solid #555;
       cursor: pointer;
       position: relative;
       transition: background-color 0.2s, border-color 0.2s;
   }
   .danbooru-category-checkbox:checked {
       background-color: #7B68EE;
       border-color: #7B68EE;
   }
   .danbooru-category-checkbox:checked::before {
       content: '✔';
       font-size: 12px;
       color: white;
       position: absolute;
       top: 50%;
       left: 50%;
       transform: translate(-50%, -50%);
   }

    .danbooru-gallery { width: 100%; display: flex; flex-direction: column; min-height: 200px; }
    .danbooru-controls { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 5px; align-items: stretch; }
    .danbooru-auth-controls { display: flex; gap: 5px; }
    .danbooru-controls > button, .danbooru-controls > div { padding: 5px; border-radius: 4px; border: 1px solid var(--input-border-color); background-color: var(--comfy-input-bg); color: var(--comfy-input-text); }
    .danbooru-controls > .danbooru-search-container > .danbooru-search-input { background: var(--comfy-input-bg); border: 1px solid var(--input-border-color); padding: 5px 10px; border-radius: 4px; }
    .danbooru-controls .danbooru-search-input { flex-grow: 1; min-width: 150px; }
    .danbooru-controls > select { min-width: 100px; }
    .danbooru-image-wrapper.new-item { animation: fadeInUp 0.5s ease-out; }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .danbooru-settings-button {
        flex-grow: 0;
        width: 40px;
        height: 40px;
        aspect-ratio: 1;
        padding: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background-color 0.2s, transform 0.2s;
        background-color: var(--comfy-input-bg);
        color: var(--comfy-input-text);
        border: 1px solid var(--input-border-color);
        border-radius: 6px;
    }
    .danbooru-settings-button:hover { background-color: var(--comfy-menu-bg); transform: scale(1.1); }
    .danbooru-settings-button .icon { width: 24px; height: 24px; }
    .danbooru-refresh-button { flex-grow: 0; width: 40px; height: 40px; aspect-ratio: 1; padding: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background-color 0.2s, transform 0.2s; border-radius: 6px; }
    .danbooru-refresh-button:hover { background-color: var(--comfy-menu-bg); transform: scale(1.1); }
    .danbooru-refresh-button.loading { cursor: not-allowed; }
    .danbooru-filter-button { flex-grow: 0; width: 40px; height: 40px; aspect-ratio: 1; padding: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background-color 0.2s, transform 0.2s, color 0.2s, border-color 0.2s; border-radius: 6px; }
    .danbooru-filter-button:hover { background-color: var(--comfy-menu-bg); transform: scale(1.1); }
    .danbooru-filter-button.active { background-color: #7B68EE; color: white; border-color: #7B68EE; }
    .danbooru-refresh-button.loading .icon { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .danbooru-ranking-button {
        flex-grow: 0;
        width: auto;
        padding: 5px 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        cursor: pointer;
        transition: background-color 0.2s, transform 0.2s;
        font-size: 12px;
        white-space: nowrap;
    }
    .danbooru-ranking-button:hover { background-color: var(--comfy-menu-bg); transform: scale(1.05); }
    .danbooru-ranking-button.active {
        background-color: #7B68EE;
        color: white;
        border-color: #7B68EE;
    }
    .danbooru-ranking-button .icon { width: 16px; height: 16px; }
    
    /* 收藏夹按钮样式 */
    .danbooru-favorites-button {
        flex-grow: 0;
        width: auto;
        padding: 5px 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        cursor: pointer;
        transition: background-color 0.2s, transform 0.2s;
        font-size: 12px;
        white-space: nowrap;
    }
    .danbooru-favorites-button:hover { background-color: var(--comfy-menu-bg); transform: scale(1.05); }
    .danbooru-favorites-button.active {
        background-color: #DC3545; /* Bootstrap's danger color */
        color: white;
        border-color: #DC3545;
    }
    .danbooru-favorites-button .icon { width: 16px; height: 16px; }
    .danbooru-image-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); grid-gap: 5px; grid-auto-rows: 1px; overflow-y: auto; background-color: var(--comfy-input-bg); padding: 5px; border-radius: 4px; flex-grow: 1; height: 0; }
    .danbooru-image-wrapper {
        grid-row-start: auto;
        border: 2px solid transparent;
        transition: border-color 0.2s, transform 0.2s ease-out, box-shadow 0.2s ease-out;
        border-radius: 6px;
        overflow: visible !important;
        position: relative !important; /* Add relative positioning */
        display: block !important;
    }
    .danbooru-image-wrapper:hover {
        transform: scale(1.05);
        box-shadow: 0 0 15px rgba(88, 101, 242, 0.7); /* 泛光效果 */
        z-index: 10;
        position: relative;
    }
    .danbooru-image-wrapper.selected {
        border-color: #7B68EE; /* A more vibrant purple */
        box-shadow: 0 0 20px rgba(123, 104, 238, 0.8); /* Stronger glow */
        transform: scale(1.05);
        z-index: 11;
    }

    .danbooru-image-wrapper.selected::after {
        content: "✓";
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: white;
        font-size: 50px;
        font-weight: bold;
        text-shadow: 0 0 10px rgba(0, 0, 0, 0.7);
        z-index: 12;
        pointer-events: none;
    }
    
    .danbooru-image-wrapper.selected::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(123, 104, 238, 0.3); /* Semi-transparent overlay */
        z-index: 11;
        pointer-events: none;
    }
    
    /* 按钮容器，位于右上角 */
    .danbooru-image-buttons {
        position: absolute;
        top: 3px;
        right: 3px;
        display: flex;
        gap: 2px;
        opacity: 0;
        transform: scale(0.9);
        transition: all 0.2s ease !important;
        z-index: 15;
    }
    
    .danbooru-image-wrapper:hover .danbooru-image-buttons {
        opacity: 1;
        transform: scale(1);
    }

    /* 通用按钮样式 */
    .danbooru-image-buttons button {
        background-color: rgba(0, 0, 0, 0.8) !important;
        color: white !important;
        border: none !important;
        border-radius: 50% !important;
        width: 20px !important;
        height: 20px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
        backdrop-filter: blur(5px) !important;
        -webkit-backdrop-filter: blur(5px) !important;
        padding: 0 !important;
        margin: 0 !important;
    }

    .danbooru-image-buttons button:hover {
        transform: scale(1.1) !important;
        background-color: rgba(123, 104, 238, 0.9) !important; /* 统一使用紫色悬浮效果 */
    }

    /* 收藏按钮特定样式 */
    .danbooru-favorite-button.favorited {
        background-color: rgba(220, 53, 69, 0.9) !important; /* DC3545 in rgba */
        color: white !important;
    }

    .danbooru-favorite-button.favorited:hover {
        background-color: rgba(123, 104, 238, 0.9) !important; /* 统一使用紫色悬浮效果 */
    }

    /* 统一所有按钮的悬浮样式 */
    .danbooru-download-button:hover,
    .danbooru-edit-button:hover,
    .danbooru-view-image-button:hover {
        background-color: rgba(123, 104, 238, 0.9) !important; /* 统一使用紫色悬浮效果 */
    }

    /* 可点击的tag样式 */
    .danbooru-clickable-tag {
        cursor: pointer !important;
        transition: transform 0.1s, filter 0.1s !important;
    }
    .danbooru-clickable-tag:hover {
        transform: scale(1.05) !important;
        filter: brightness(1.2) !important;
    }

    /* 旧的、独立的按钮样式将被上面的新规则取代或覆盖，为了清晰起见，我将删除它们 */
    /* 收藏按钮样式 - 位于右上角最右侧 (旧) */
    .danbooru-gallery .danbooru-image-grid .danbooru-image-wrapper .danbooru-favorite-button-old {
        position: absolute !important;
        top: 3px !important;
        right: 3px !important;
        bottom: auto !important;
        left: auto !important;
        border: none !important;
        /* Keep this empty or remove it. The styles are now in .danbooru-image-buttons button */
    }
    
    /* All button styles are now handled by .danbooru-image-buttons and its children. */
    /* The individual hover/visibility rules are replaced by the container's hover effect. */
    
    .danbooru-image-grid img {
        width: 100%;
        height: auto;
        cursor: pointer;
        display: block;
    }
    .danbooru-status { text-align: center; width: 100%; margin: 10px 0; color: #ccc; }
    .danbooru-status.error { color: #f55; }
    
        /* New Tooltip Styles */
        @keyframes danbooru-tooltip-fade-in {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
    
        .danbooru-tag-tooltip {
            background-color: rgba(28, 29, 31, 0.9);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 6px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.6);
            padding: 8px;
            max-width: 600px;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            animation: danbooru-tooltip-fade-in 0.15s ease-out;
            transition: opacity 0.15s, transform 0.15s;
            pointer-events: none; /* Disable mouse interaction */
        }

        .danbooru-tooltip-tags {
            display: flex;
            flex-direction: column;
            gap: 8px; /* Space between sections */
        }

        .danbooru-tooltip-section {
            display: flex;
            flex-direction: column;
        }

        .danbooru-tooltip-upload-date {
            color: #a0a3a8;
            font-size: 0.8em;
            margin-top: 2px;
        }

        .danbooru-tooltip-category-header {
            font-size: 0.85em;
            font-weight: 600;
            color: #b0b3b8;
            margin-bottom: 4px;
        }

        .danbooru-tooltip-tags-wrapper {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
        }
    
        .danbooru-tooltip-tag {
            font-size: 0.8em;
            font-weight: 500;
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            cursor: default; /* Change cursor to default */
            transition: none; /* Remove transitions */
        }
    
        .danbooru-tooltip-tag:hover {
            transform: none; /* Remove hover effect */
            filter: none; /* Remove hover effect */
        }
    
        .danbooru-tooltip-tag.copied {
            animation: danbooru-tag-copied-animation 0.6s ease-out;
        }
    
        @keyframes danbooru-tag-copied-animation {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); background-color: #ffffff; color: #000000; }
            100% { transform: scale(1); }
        }
        
        /* Tag Colors */
        /* Tag Colors based on new categories */
        .danbooru-tooltip-tag.tag-category-artist { background-color: #FFF3CD; color: #664D03; } /* Artist: Light Yellow */
        .danbooru-tooltip-tag.tag-category-copyright { background-color: #F8D7DA; color: #58151D; } /* Copyright: Light Pink */
        .danbooru-tooltip-tag.tag-category-character { background-color: #D4EDDA; color: #155724; } /* Character: Light Green */
        .danbooru-tooltip-tag.tag-category-general { background-color: #D1ECF1; color: #0C5460; } /* General: Light Blue */
        .danbooru-tooltip-tag.tag-category-meta { background-color: #F8F9FA; color: #383D41; border: 1px solid #DFE2E5; } /* Meta: Light Grey */
        
        /* 黑名单对话框样式 */
        .danbooru-blacklist-dialog * { box-sizing: border-box; }
        .danbooru-blacklist-dialog textarea:focus { outline: 2px solid #7B68EE; }
        .danbooru-blacklist-dialog button:hover { opacity: 0.9; }
        
        /* 语言切换按钮样式 */
        .danbooru-language-button {
            flex-grow: 0;
            width: auto;
            aspect-ratio: 1;
            padding: 5px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: background-color 0.2s, transform 0.2s;
        }
        .danbooru-language-button:hover {
            background-color: var(--comfy-menu-bg);
            transform: scale(1.1);
        }
        .danbooru-language-button .icon {
            width: 16px;
            height: 16px;
        }
        .danbooru-language-select-button {
            padding: 8px 16px;
            border: 2px solid var(--input-border-color);
            border-radius: 6px;
            background-color: var(--comfy-input-bg);
            color: var(--comfy-input-text);
            cursor: pointer;
            font-size: 14px;
            font-weight: normal;
            transition: all 0.2s ease;
        }
        .danbooru-language-select-button.active {
            border-color: #7B68EE;
            background-color: #7B68EE;
            color: white;
            font-weight: 600;
        }
        .danbooru-language-select-button:hover:not(.active) {
            border-color: #9a8ee8;
            background-color: rgba(123, 104, 238, 0.1);
        }
        /* 设置对话框样式 */
        .danbooru-settings-dialog * {
            box-sizing: border-box;
        }
        
        .danbooru-settings-dialog {
            /* backdrop-filter: blur(3px); */
            /* -webkit-backdrop-filter: blur(3px); */
        }
        
        .danbooru-settings-dialog-content {
            animation: fadeInScale 0.3s ease-out;
        }
        
        @keyframes fadeInScale {
            from {
                opacity: 0;
                transform: scale(0.9);
            }
            to {
                opacity: 1;
                transform: scale(1);
            }
        }
        
        .danbooru-settings-dialog-content h2 {
            padding: 0 10px 12px 10px !important;
        }

        .danbooru-settings-section {
            transition: all 0.2s ease;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            margin-bottom: 24px !important;
        }
        
        .danbooru-settings-section:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .danbooru-settings-dialog button:hover {
            opacity: 0.9;
            transform: translateY(-1px);
        }
        
        .danbooru-settings-dialog button:focus {
            outline: 2px solid #7B68EE;
            outline-offset: 2px;
        }
        
        .danbooru-settings-dialog textarea:focus {
            outline: 2px solid #7B68EE;
            outline-offset: 1px;
        }
        
        .danbooru-settings-sidebar {
            display: flex;
            flex-direction: column;
            gap: 5px;
            padding-right: 15px;
            border-right: 1px solid var(--input-border-color);
            flex-shrink: 0;
            width: 180px;
            box-sizing: border-box;
            overflow: visible;
        }

        .sidebar-button {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 15px;
            border-radius: 8px;
            cursor: pointer;
            background-color: transparent;
            color: var(--comfy-input-text);
            text-align: left;
            font-size: 14px;
            font-weight: 500;
            transition: background-color 0.2s, color 0.2s;
            width: 100%;
            border: none;
            box-sizing: border-box;
            justify-content: flex-start;
        }

        .sidebar-button.active {
            background-color: rgba(123, 104, 238, 0.2) !important;
            color: #E0E0E0 !important;
            font-weight: 600 !important;
            border: none !important;
            outline: none !important;
        }

        .sidebar-button:hover {
            background-color: rgba(255, 255, 255, 0.1);
        }

        .sidebar-button-icon {
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .sidebar-button svg {
            stroke-width: 2;
        }

        .sidebar-button:focus {
            outline: none;
        }

        /* 设置对话框滚动容器样式 */
        .danbooru-settings-scroll-container {
            scrollbar-width: thin;
            scrollbar-color: rgba(123, 104, 238, 0.6) transparent;
        }
        
        .danbooru-settings-scroll-container::-webkit-scrollbar {
            width: 8px;
        }
        
        .danbooru-settings-scroll-container::-webkit-scrollbar-track {
            background: transparent;
            border-radius: 4px;
        }
        
        .danbooru-settings-scroll-container::-webkit-scrollbar-thumb {
            background: rgba(123, 104, 238, 0.6);
            border-radius: 4px;
            transition: background 0.2s ease;
        }
        
        .danbooru-settings-scroll-container::-webkit-scrollbar-thumb:hover {
            background: rgba(123, 104, 238, 0.8);
        }
        
        /* 社交链接按钮样式 */
        .danbooru-settings-dialog button[title*="GitHub"]:hover {
            background-color: #1c2128 !important;
            border-color: #1c2128 !important;
            transform: translateY(-1px);
        }

        .danbooru-settings-dialog button[title*="Discord"]:hover {
            background-color: #4752c4 !important;
            border-color: #4752c4 !important;
            transform: translateY(-1px);
        }

        .danbooru-settings-dialog button[title*="GitHub"]:hover svg,
        .danbooru-settings-dialog button[title*="Discord"]:hover svg {
            transform: scale(1.1);
        }

        /* 移除社交链接按钮的focus效果 */
        .danbooru-settings-dialog button[title*="GitHub"]:focus,
        .danbooru-settings-dialog button[title*="Discord"]:focus {
            outline: none !important;
        }

        .danbooru-settings-dialog button svg {
            flex-shrink: 0;
            transition: transform 0.2s ease;
        }

        /* Toast提示样式 */
        #danbooru-gallery-toast-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 999999;
            display: flex;
            flex-direction: column;
            gap: 8px;
            align-items: flex-end;
        }
        .danbooru-toast {
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-size: 14px;
            font-weight: 500;
            max-width: 300px;
            word-wrap: break-word;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            opacity: 0;
            transform: translateX(100%);
            transition: opacity 0.3s ease-out, transform 0.3s ease-out;
        }
        .danbooru-toast.show {
            opacity: 1;
            transform: translateX(0);
        }

        .danbooru-toast-success {
            background-color: #28a745;
            border-left: 4px solid #1e7e34;
        }

        .danbooru-toast-error {
            background-color: #dc3545;
            border-left: 4px solid #bd2130;
        }

        .danbooru-toast-info {
            background-color: #17a2b8;
            border-left: 4px solid #117a8b;
        }

        @keyframes toastSlideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        .danbooru-toast.fade-out {
            animation: toastFadeOut 0.3s ease-out forwards;
        }

        @keyframes toastFadeOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        `,
    parent: document.head,
});

$el("style", {
    textContent: `
    /* 编辑面板样式 */
    .danbooru-edit-panel-content {
        position: relative;
    }
    .danbooru-edit-panel-close-button {
        background: transparent;
        border: none;
        color: var(--comfy-input-text);
        cursor: pointer;
        padding: 5px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s, transform 0.2s;
    }
    .danbooru-edit-panel-close-button:hover {
        background-color: rgba(255, 255, 255, 0.15);
        transform: rotate(90deg);
    }
    /* Styles for the new copy and reset buttons */
    .danbooru-edit-panel-content button {
        transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
    }
    .danbooru-edit-panel-content button:hover {
        background-color: rgba(123, 104, 238, 0.2); /* 统一紫色悬浮效果，增强视觉强度 */
        border-color: #7B68EE;
        color: white; /* 悬浮时文字改为白色，提高对比度 */
        transform: translateY(-2px);
    }
    .danbooru-edit-panel-content button:active {
        background-color: rgba(123, 104, 238, 0.3); /* 点击时进一步加深 */
        transform: translateY(0);
    }
    .danbooru-edit-tags-container {
        scrollbar-width: thin;
        scrollbar-color: #555 #333;
    }
    .danbooru-edit-tags-container::-webkit-scrollbar {
        width: 6px;
    }
    .danbooru-edit-tags-container::-webkit-scrollbar-track {
        background: #333;
        border-radius: 3px;
    }
    .danbooru-edit-tags-container::-webkit-scrollbar-thumb {
        background: #555;
        border-radius: 3px;
    }
    .danbooru-edit-tags-container::-webkit-scrollbar-thumb:hover {
        background: #777;
    }
    .danbooru-view-image-button:hover {
        background-color: rgba(23, 162, 184, 0.9) !important;
    }
    `,
    parent: document.head
});

$el("style", {
    textContent: `
    .danbooru-tag-context-menu {
        /* Styles are set in JS, but we can add basics here */
    }
    .danbooru-context-menu-item {
        padding: 8px 12px;
        cursor: pointer;
        font-size: 14px;
        border-radius: 4px;
        transition: background-color 0.2s;
    }
    .danbooru-context-menu-item:hover {
        background-color: rgba(123, 104, 238, 0.3);
    }
    .danbooru-add-tag-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: 1px dashed #888;
        color: #888;
        background-color: transparent;
        cursor: pointer;
        font-size: 16px;
        margin-left: 5px;
        transition: all 0.2s;
    }
    .danbooru-add-tag-button:hover {
        background-color: rgba(123, 104, 238, 0.3);
        color: white;
        border-style: solid;
        border-color: #7B68EE;
    }
    .danbooru-add-tag-input {
        background-color: var(--comfy-input-bg);
        border: 1px solid #7B68EE;
        color: var(--comfy-input-text);
        border-radius: 4px;
        padding: 2px 6px;
        font-size: 0.8em;
        margin-left: 5px;
        outline: none;
    }
    .danbooru-reset-tags-button {
        padding: 8px 15px;
        border: 1px solid #7B68EE;
        border-radius: 6px;
        background-color: transparent;
        color: #7B68EE;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .danbooru-reset-tags-button:hover {
        background-color: rgba(123, 104, 238, 0.2);
        border-color: #7B68EE;
        color: white;
        transform: translateY(-2px);
    }
    .danbooru-add-tag-container {
        position: relative;
        display: inline-block;
    }
    .danbooru-add-tag-input {
        background-color: var(--comfy-input-bg);
        border: 1px solid #7B68EE;
        color: var(--comfy-input-text);
        border-radius: 4px;
        padding: 2px 6px;
        font-size: 0.8em;
        outline: none;
        width: 120px;
    }
    /* These panels are now attached to body, so they need absolute positioning relative to viewport */
    .danbooru-add-tag-container .danbooru-suggestions-panel,
    .danbooru-add-tag-container .danbooru-chinese-suggestions-panel,
    .danbooru-suggestions-panel, /* Add rule for when it's a direct child of body */
    .danbooru-chinese-suggestions-panel {
        position: absolute; /* Changed from relative to absolute */
        z-index: 10003; /* Ensure it's on top of the edit panel */
        width: auto;
        min-width: 150px; /* Set a minimum width */
        max-width: 450px; /* Allow it to be wider */
        max-height: 300px;
        overflow-y: auto;
    }
    `,
    parent: document.head
});

$el("style", {
    textContent: `
    .danbooru-settings-section {
        padding: 16px;
        border: 1px solid var(--input-border-color);
        border-radius: 8px;
        background-color: var(--comfy-input-bg);
    }
    .danbooru-settings-dialog input[type="datetime-local"],
    .danbooru-settings-dialog input[type="number"] {
        background-color: var(--comfy-menu-bg);
        color: var(--comfy-input-text);
        border: 1px solid var(--input-border-color);
        border-radius: 4px;
        padding: 8px;
        user-select: none;
    }
    .danbooru-primary-button {
        padding: 10px 20px;
        border: 2px solid #7B68EE;
        border-radius: 6px;
        background-color: #7B68EE;
        color: white;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.2s ease;
    }
    .danbooru-radio-group {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 20px;
        margin: 10px 0;
    }
    .danbooru-radio-button-wrapper {
        flex: 0 0 auto;
        min-width: 140px;
    }
    .danbooru-radio-label {
        padding: 12px 20px;
        cursor: pointer;
        transition: all 0.3s ease;
        background-color: var(--comfy-input-bg);
        color: var(--comfy-input-text);
        border: 2px solid var(--input-border-color);
        border-radius: 8px;
        text-align: center;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        font-weight: 500;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        transform: translateY(0);
        position: relative;
        overflow: hidden;
    }
    .danbooru-radio-label:hover {
        background-color: rgba(123, 104, 238, 0.1);
        border-color: #7B68EE;
        color: #7B68EE;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(123, 104, 238, 0.3);
    }
    .danbooru-settings-dialog .danbooru-radio-label.checked {
        background-color: transparent;
        color: white;
        border-color: #7B68EE;
        box-shadow: 0 4px 12px rgba(123, 104, 238, 0.4);
        transform: translateY(-1px);
        font-weight: 600;
    }
    .danbooru-settings-dialog .danbooru-radio-label.checked::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: #7B68EE;
        z-index: 0;
        transition: transform 0.4s ease;
        transform: scaleX(1);
        transform-origin: left;
    }
    .danbooru-radio-label::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: #7B68EE;
        z-index: 0;
        transition: transform 0.4s ease;
        transform: scaleX(0);
        transform-origin: right;
    }
    .danbooru-radio-label:hover::before {
        transform: scaleX(1);
        transform-origin: left;
    }
    .danbooru-settings-dialog .danbooru-radio-label.checked:hover::before {
        transform: scaleX(1);
    }
    .danbooru-settings-dialog .danbooru-radio-label.checked:hover {
        background-color: transparent;
        color: white;
        border-color: #9a8ee8;
        transform: translateY(-3px);
        box-shadow: 0 6px 16px rgba(123, 104, 238, 0.5);
    }
    .danbooru-settings-dialog .danbooru-radio-label.checked:hover::before {
        background-color: #9a8ee8;
    }
    .danbooru-radio-indicator {
        display: inline-block;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 2px solid #888;
        margin-right: 10px;
        transition: all 0.2s;
        flex-shrink: 0;
        z-index: 1;
        position: relative;
    }
    .danbooru-radio-label:hover .danbooru-radio-indicator {
        border-color: #7B68EE;
    }
    .danbooru-settings-dialog .danbooru-radio-label.checked .danbooru-radio-indicator {
        background-color: #7B68EE;
        border-color: #7B68EE;
        position: relative;
    }
    .danbooru-settings-dialog .danbooru-radio-label.checked .danbooru-radio-indicator::before {
        content: "";
        position: absolute;
        top: 50%;
        left: 50%;
        width: 8px;
        height: 8px;
        background-color: white;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        z-index: 1;
    }
   .danbooru-input-row {
       display: flex;
       justify-content: space-between;
       align-items: center;
       width: 100%;
       padding: 8px;
       border-radius: 6px;
       transition: background-color 0.2s ease;
       cursor: pointer;
       user-select: none;
   }
   .danbooru-input-row:hover {
       background-color: rgba(255, 255, 255, 0.1);
   }
   .danbooru-input-row input {
       cursor: pointer;
   }
    .danbooru-dialog-button--secondary {
       padding: 8px 16px;
       border: 1px solid var(--input-border-color);
       border-radius: 6px;
       background-color: var(--comfy-input-bg);
       color: var(--comfy-input-text);
       cursor: pointer;
       transition: all 0.2s ease;
   }
   .danbooru-dialog-button--secondary:hover {
       background-color: var(--comfy-menu-bg);
       border-color: #999;
       transform: translateY(-2px);
       box-shadow: 0 2px 4px rgba(0,0,0,0.2);
   }

   .danbooru-dialog-button--primary {
       padding: 8px 16px;
       border: 1px solid #7B68EE;
       border-radius: 6px;
       background-color: #7B68EE;
       color: white;
       cursor: pointer;
       font-weight: 600;
       transition: all 0.2s ease;
   }
   .danbooru-dialog-button--primary:hover {
       background-color: #9a8ee8;
       border-color: #9a8ee8;
       transform: translateY(-2px);
       box-shadow: 0 4px 8px rgba(123, 104, 238, 0.3);
   }
    `,
    parent: document.head,
});


$el("style", {
    textContent: `
    /* "已编辑" 提示样式 */
    .danbooru-edited-indicator {
        position: absolute;
        top: 5px;
        left: 5px;
        background-color: rgba(123, 104, 238, 0.9); /* 紫色背景 */
        color: white;
        padding: 3px 8px;
        font-size: 10px;
        font-weight: bold;
        border-radius: 8px;
        z-index: 15;
        pointer-events: none;
        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        animation: fadeInDown 0.3s ease-out;
        border: 1px solid rgba(255, 255, 255, 0.2);
    }

    @keyframes fadeInDown {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    `,
    parent: document.head
});


