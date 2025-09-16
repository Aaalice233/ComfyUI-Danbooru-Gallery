import { app } from "../../../scripts/app.js";
import { $el } from "../../../scripts/ui.js";

// 多语言字典
const i18n = {
    zh: {
        // 搜索和控制
        searchPlaceholder: "Tags (最多2个, 例如: 1girl, blue_eyes)...",
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
        discordTooltip: "加入Discord服务器"
    },
    en: {
        // 搜索和控制
        searchPlaceholder: "Tags (Max 2, e.g., 1girl, blue_eyes)...",
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
        discordTooltip: "Join Discord server"
    }
};

// 当前语言
let currentLanguage = 'zh';

// 全局悬浮提示实例
let globalTooltip = null;
let globalTooltipTimeout = null;

// 获取翻译文本
const t = (key) => {
    return i18n[currentLanguage]?.[key] || i18n.zh[key] || key;
};

app.registerExtension({
    name: "Comfy.DanbooruGallery",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name === "DanbooruGalleryNode") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                onNodeCreated?.apply(this, arguments);
                this.setSize([750, 938]);

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

                // 显示错误信息的函数
                const showError = (message, persistent = false) => {
                    errorDisplay.textContent = message;
                    errorDisplay.style.display = "block";
                    if (!persistent) {
                        // 5秒后自动隐藏
                        setTimeout(() => {
                            errorDisplay.style.display = "none";
                        }, 5000);
                    }
                };

                // 清除错误信息的函数
                const clearError = () => {
                    errorDisplay.style.display = "none";
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

                let posts = [], currentPage = 1, isLoading = false;
                let userAuth = { username: "", api_key: "", has_auth: false }; // 用户认证信息
                let userFavorites = []; // 用户收藏列表，确保字符串
                let networkStatus = { connected: true, lastChecked: 0 }; // 网络状态跟踪

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
                    console.log("Showing toast:", message, type);

                    // 尝试使用 ComfyUI 的内置系统
                    if (app.ui && app.ui.showToast) {
                        console.log("Using app.ui.showToast");
                        app.ui.showToast(message, type);
                        return;
                    }

                    if (app.ui && app.ui.notification && app.ui.notification.show) {
                        console.log("Using app.ui.notification.show");
                        app.ui.notification.show(message, type);
                        return;
                    }

                    if (app.ui && app.ui.dialog && app.ui.dialog.showMessage) {
                        console.log("Using app.ui.dialog.showMessage");
                        app.ui.dialog.showMessage(message);
                        return;
                    }

                    console.log("Using custom toast");

                    const toast = $el("div", {
                        textContent: message,
                        style: {
                            position: "fixed",
                            padding: "8px 16px",
                            borderRadius: "4px",
                            color: "white",
                            fontSize: "12px",
                            fontWeight: "500",
                            zIndex: "999999",
                            maxWidth: "200px",
                            wordWrap: "break-word",
                            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
                            backgroundColor: type === 'success' ? "#28a745" : type === 'error' ? "#dc3545" : "#17a2b8",
                            borderLeft: `3px solid ${type === 'success' ? "#1e7e34" : type === 'error' ? "#bd2130" : "#117a8b"}`,
                            pointerEvents: "none",
                            opacity: "0",
                            transition: "opacity 0.3s ease-out"
                        }
                    });

                    // 计算位置
                    if (anchorElement) {
                        const rect = anchorElement.getBoundingClientRect();
                        toast.style.left = `${rect.left + rect.width / 2 - 100}px`; // 居中对齐
                        toast.style.top = `${rect.top - 40}px`; // 在元素上方
                    } else {
                        toast.style.top = "20px";
                        toast.style.right = "20px";
                    }

                    // 强制添加到 document.body
                    document.body.appendChild(toast);
                    console.log("Toast added to body, element:", toast);

                    // 立即显示
                    setTimeout(() => {
                        toast.style.opacity = "1";
                    }, 10);

                    // 3秒后自动移除
                    setTimeout(() => {
                        toast.style.opacity = "0";
                        setTimeout(() => {
                            if (toast.parentNode) {
                                toast.remove();
                                console.log("Toast removed");
                            }
                        }, 300);
                    }, 3000);
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
                    console.log("开始取消收藏", postId);
                    if (!userAuth.has_auth) {
                        console.log("用户未认证，取消操作");
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
                        console.log("发送POST请求到 /danbooru_gallery/favorites/remove", { post_id: postId });
                        const response = await fetch('/danbooru_gallery/favorites/remove', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ post_id: postId })
                        });
                        console.log("fetch 响应状态", response.status);
                        let data;
                        if (response.status === 204) {
                            // 204 No Content 表示成功，但没有响应体
                            data = { success: true, message: "取消收藏成功" };
                            console.log("204 响应，视为成功");
                        } else {
                            data = await response.json();
                            console.log("解析响应数据", data);
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
                };

                const searchInput = $el("input.danbooru-search-input", { type: "text", placeholder: t('searchPlaceholder') });
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

                const createCategoryCheckbox = (name, checked = true) => {
                    const id = `danbooru-category-${name}`;
                    const isChecked = name !== 'artist' && name !== 'meta';
                    return $el("div.danbooru-category-item", [
                        $el("input", { type: "checkbox", id, name, checked: isChecked, className: "danbooru-category-checkbox" }),
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
                    return $el("div.danbooru-category-item", [
                        $el("input", { type: "checkbox", id, name, checked, className: "danbooru-format-checkbox" }),
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

                // 创建设置页面对话框
                const showSettingsDialog = () => {
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
                            minWidth: "480px",
                            maxWidth: "600px",
                            maxHeight: "80vh",
                            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
                            display: "flex",
                            flexDirection: "column"
                        }
                    });

                    const scrollContainer = $el("div.danbooru-settings-scroll-container", {
                        style: {
                            flex: "1",
                            overflowY: "auto",
                            marginBottom: "16px",
                            paddingRight: "8px"
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

                    let selectedLanguage = currentLanguage; // 新增：临时语言选择状态

                    const createLanguageButton = (lang, text) => {
                        const isActive = selectedLanguage === lang;
                        const button = $el("button", {
                            textContent: text,
                            style: {
                                padding: "8px 16px",
                                border: `2px solid ${isActive ? '#7B68EE' : 'var(--input-border-color)'}`,
                                borderRadius: "6px",
                                backgroundColor: isActive ? '#7B68EE' : 'var(--comfy-input-bg)',
                                color: isActive ? 'white' : 'var(--comfy-input-text)',
                                cursor: "pointer",
                                fontSize: "14px",
                                fontWeight: isActive ? "600" : "normal",
                                transition: "all 0.2s ease"
                            },
                            onclick: () => {
                                // 只更新临时选择状态，不立即保存
                                selectedLanguage = lang;

                                // 更新所有按钮的样式
                                languageOptions.querySelectorAll('button').forEach(btn => {
                                    const isCurrentActive = btn.textContent === text;
                                    btn.style.border = `2px solid ${isCurrentActive ? '#7B68EE' : 'var(--input-border-color)'}`;
                                    btn.style.backgroundColor = isCurrentActive ? '#7B68EE' : 'var(--comfy-input-bg)';
                                    btn.style.color = isCurrentActive ? 'white' : 'var(--comfy-input-text)';
                                    btn.style.fontWeight = isCurrentActive ? "600" : "normal";
                                });
                            }
                        });
                        return button;
                    };

                    languageOptions.appendChild(createLanguageButton('zh', '中文'));
                    languageOptions.appendChild(createLanguageButton('en', 'English'));

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
                        value: currentBlacklist.join('\n'),
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
                        checked: filterEnabled,
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
                        value: currentFilterTags.join('\n'),
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
                        value: userAuth.username || "",
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
                        value: userAuth.api_key || "",
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

                    // 将所有section添加到滚动容器
                    scrollContainer.appendChild(authSection);
                    scrollContainer.appendChild(languageSection);
                    scrollContainer.appendChild(blacklistSection);
                    scrollContainer.appendChild(filterSection);

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

                            // 保存黑名单、提示词过滤和语言设置
                            const [blacklistSuccess, filterSuccess, languageSuccess] = await Promise.all([
                                saveBlacklist(newBlacklist),
                                saveFilterTags(newFilterTags, newFilterEnabled),
                                selectedLanguage !== currentLanguage ? saveLanguage(selectedLanguage) : Promise.resolve(true)
                            ]);

                            if (blacklistSuccess && filterSuccess && languageSuccess && authSuccess) {
                                currentBlacklist = newBlacklist;
                                currentFilterTags = newFilterTags;
                                filterEnabled = newFilterEnabled;

                                // 如果语言发生了变化，更新当前语言并刷新界面
                                if (selectedLanguage !== currentLanguage) {
                                    currentLanguage = selectedLanguage;
                                    updateInterfaceTexts();
                                    console.log(`[Danbooru Gallery] 语言已切换至: ${currentLanguage === 'zh' ? '中文' : 'English'}`);
                                }

                                dialog.remove();
                                console.log(`[Danbooru Gallery] 黑名单已更新: ${newBlacklist.join(', ')}`);
                                console.log(`[Danbooru Gallery] 提示词过滤已更新: ${newFilterEnabled ? '启用' : '禁用'}, 过滤标签: ${newFilterTags.join(', ')}`);

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

                    mainButtonsContainer.appendChild(cancelButton);
                    mainButtonsContainer.appendChild(saveButton);

                    buttonContainer.appendChild(socialButtonsContainer);
                    buttonContainer.appendChild(mainButtonsContainer);

                    dialogContent.appendChild(title);
                    dialogContent.appendChild(scrollContainer);
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
                };

                // 创建设置按钮
                const settingsButton = $el("button.danbooru-settings-button", {
                    innerHTML: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>`,
                    title: t('settings'),
                    onclick: () => showSettingsDialog()
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

                // 黑名单功能
                let currentBlacklist = [];

                // 提示词过滤功能
                let currentFilterTags = [];
                let filterEnabled = true; // 默认开启过滤功能

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

                const fetchAndRender = async (reset = false) => {
                    if (isLoading) return;
                    isLoading = true;
                    refreshButton.classList.add("loading");
                    refreshButton.disabled = true;

                    const loadingIndicator = imageGrid.querySelector('.danbooru-loading');
                    if (!loadingIndicator) {
                        imageGrid.insertAdjacentHTML('beforeend', `<p class="danbooru-status danbooru-loading">${t('loading')}</p>`);
                    }

                    if (reset) {
                        currentPage = 1;
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
                        const params = new URLSearchParams({
                            "search[tags]": searchInput.value.replace(/,/g, ' ').trim(),
                            "search[rating]": ratingSelect.querySelector('.danbooru-category-button').dataset.value,
                            limit: "100",
                            page: currentPage,
                        });

                        const response = await fetch(`/danbooru_gallery/posts?${params}`);
                        let newPosts = await response.json();

                        if (!Array.isArray(newPosts)) throw new Error("API did not return a valid list of posts.");

                        // 应用文件类型和黑名单过滤
                        const filteredPosts = newPosts.filter(post => !isPostFiltered(post));

                        console.log(`[Danbooru Gallery] 原始帖子数量: ${newPosts.length}, 过滤后: ${filteredPosts.length}`);
                        const filteredCount = newPosts.length - filteredPosts.length;
                        if (filteredCount > 0) {
                            console.log(`[Danbooru Gallery] 已过滤 ${filteredCount} 个帖子 (包括非图像文件和黑名单标签)`);
                        }

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

                const createPostElement = (post) => {
                    if (!post.id || !post.preview_file_url) return null;

                    const wrapper = $el("div.danbooru-image-wrapper");
                    const img = $el("img", {
                        src: `${post.preview_file_url}?v=${post.md5}`,
                        loading: "lazy",
                        onload: resizeGrid,
                        onerror: () => { wrapper.style.display = 'none'; },
                        onclick: async () => {
                            const isSelected = wrapper.classList.contains('selected');
                            imageGrid.querySelectorAll('.danbooru-image-wrapper').forEach(w => w.classList.remove('selected'));

                            if (!isSelected) {
                                wrapper.classList.add('selected');

                                const imageUrl = post.file_url || post.large_file_url;

                                const selectedCategories = Array.from(categoryDropdown.querySelectorAll("input:checked")).map(i => i.name);
                                let output_tags = [];
                                selectedCategories.forEach(category => {
                                    const tags = post[`tag_string_${category}`];
                                    if (tags) {
                                        output_tags.push(...tags.split(' '));
                                    }
                                });

                                let tagsToProcess = (output_tags.length > 0) ? output_tags : post.tag_string.split(' ');

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

                                // 查找隐藏的 selection_data widget 并更新其值
                                const selectionWidget = this.widgets?.find(w => w.name === "selection_data");
                                if (selectionWidget) {
                                    selectionWidget.value = JSON.stringify(selection);
                                }
                            } else {
                                wrapper.classList.remove('selected');
                                const selectionWidget = this.widgets?.find(w => w.name === "selection_data");
                                if (selectionWidget) {
                                    selectionWidget.value = JSON.stringify({});
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
                                    console.error('[Danbooru Gallery] 无法获取图片URL');
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

                                console.log(`[Danbooru Gallery] 下载完成: ${fileName}`);
                            } catch (error) {
                                console.error('[Danbooru Gallery] 下载失败:', error);
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

                    const createTagSpan = (tag, category) => $el("span", {
                        textContent: tag,
                        className: `danbooru-tooltip-tag tag-category-${category}`,
                    });

                    let currentClickHandler = null;

                    wrapper.addEventListener("mouseenter", (e) => {
                        // 清除任何可能的延迟隐藏
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

                        // Render all tag categories
                        categoryOrder.forEach(categoryName => {
                            if (categorizedTags[categoryName].size > 0) {
                                const section = $el("div.danbooru-tooltip-section");
                                section.appendChild($el("div.danbooru-tooltip-category-header", { textContent: t(categoryName) }));
                                const tagsWrapper = $el("div.danbooru-tooltip-tags-wrapper");
                                categorizedTags[categoryName].forEach(t => tagsWrapper.appendChild(createTagSpan(t, categoryName)));
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

                            console.log("点击收藏按钮", post.id, "当前收藏状态:", userFavorites.includes(String(post.id)), "收藏夹模式:", inFavoritesMode);

                            // 如果用户未登录，提示登录
                            if (!userAuth.has_auth) {
                                console.log("用户未认证");
                                alert(t('authRequired'));
                                return;
                            }

                            // 在操作收藏前验证用户名和API Key的有效性
                            try {
                                const verifyResponse = await fetch('/danbooru_gallery/verify_auth', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ username: userAuth.username, api_key: userAuth.api_key })
                                });
                                const verifyData = await verifyResponse.json();

                                if (!verifyData.success || !verifyData.valid) {
                                    userAuth.has_auth = false; // 更新认证状态
                                    if (verifyData.network_error) {
                                        alert('网络错误 - 无法连接到Danbooru服务器，请检查网络连接');
                                    } else {
                                        alert('认证无效 - 请检查用户名和API Key设置');
                                    }
                                    return;
                                }
                            } catch (e) {
                                console.warn('认证验证失败:', e);
                                userAuth.has_auth = false; // 更新认证状态
                                alert('网络错误 - 无法验证认证信息，请检查网络连接');
                                return;
                            }

                            const currentlyFavorited = userFavorites.includes(String(post.id)) || inFavoritesMode;
                            console.log("计算的收藏状态:", currentlyFavorited);
                            let result;

                            if (currentlyFavorited) {
                                // 取消收藏
                                console.log("调用取消收藏函数");
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

                imageGrid.addEventListener("scroll", () => {
                    if (imageGrid.scrollHeight - imageGrid.scrollTop - imageGrid.clientHeight < 400) {
                        fetchAndRender(false);
                    }
                });

                searchInput.addEventListener("keydown", (e) => {
                    if (e.key === "Enter") fetchAndRender(true);
                });
                ratingSelect.addEventListener("change", () => {
                    if (globalTooltip) {
                        globalTooltip.style.display = 'none';
                    }
                    fetchAndRender(true);
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
                        // 移除 order:rank
                        const newValue = currentValue.replace(/\s*order:rank\s*/g, ' ').replace(/\s+/g, ' ').trim();
                        searchInput.value = newValue;
                        rankingButton.classList.remove('active');
                    } else {
                        // 添加 order:rank
                        const newValue = currentValue ? `${currentValue} order:rank` : 'order:rank';
                        searchInput.value = newValue;
                        rankingButton.classList.add('active');
                    }

                    // 刷新图像
                    fetchAndRender(true);
                });

                // 监听搜索框变化，更新排行榜按钮状态
                searchInput.addEventListener("input", updateRankingButtonState);

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

                // 收藏夹按钮点击事件
                favoritesButton.addEventListener("click", async () => {
                    if (!userAuth.has_auth) {
                        alert(t('authRequired'));
                        return;
                    }

                    // 在进入收藏夹模式前验证用户名和API Key的有效性
                    try {
                        const verifyResponse = await fetch('/danbooru_gallery/verify_auth', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ username: userAuth.username, api_key: userAuth.api_key })
                        });
                        const verifyData = await verifyResponse.json();

                        if (!verifyData.success || !verifyData.valid) {
                            userAuth.has_auth = false; // 更新认证状态
                            if (verifyData.network_error) {
                                alert('网络错误 - 无法连接到Danbooru服务器，请检查网络连接');
                            } else {
                                alert('认证无效 - 请检查用户名和API Key设置');
                            }
                            return;
                        }
                    } catch (e) {
                        console.warn('认证验证失败:', e);
                        userAuth.has_auth = false; // 更新认证状态
                        alert('网络错误 - 无法验证认证信息，请检查网络连接');
                        return;
                    }

                    const favTag = `ordfav:${userAuth.username}`;
                    const currentValue = searchInput.value.trim();
                    const hasFavs = currentValue.includes(favTag);

                    if (hasFavs) {
                        const newValue = currentValue.replace(new RegExp(`\\s*${favTag}\\s*`), ' ').replace(/\s+/g, ' ').trim();
                        searchInput.value = newValue;
                    } else {
                        const newValue = currentValue ? `${currentValue} ${favTag}` : favTag;
                        searchInput.value = newValue;
                        // 进入收藏夹模式时，重新加载最新的收藏列表以同步本地缓存
                        try {
                            await loadFavorites();
                        } catch (e) {
                            console.warn("重新加载收藏列表失败:", e);
                        }
                    }
                    updateFavoritesButtonState();
                    fetchAndRender(true);
                });

                searchInput.addEventListener("input", updateFavoritesButtonState);

                refreshButton.addEventListener("click", () => {
                    fetchAndRender(true);
                });

                container.appendChild($el("div.danbooru-controls", [searchInput, rankingButton, favoritesButton, ratingSelect, categoryDropdown, formattingDropdown, settingsButton, refreshButton]));
                container.appendChild(imageGrid);

                const insertNewPost = (post) => {
                    const newElement = createPostElement(post);
                    if (newElement) {
                        imageGrid.prepend(newElement);
                        newElement.classList.add('new-item');
                        newElement.addEventListener('animationend', () => newElement.classList.remove('new-item'));
                        resizeGrid();
                    }
                };
                // 初始化功能
                const initializeApp = async () => {
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
                        console.warn('网络检测失败:', e);
                        networkConnected = false;
                        showError('网络检测失败 - 请检查网络连接', true);
                    }

                    // 加载语言设置
                    await loadLanguage();
                    // 加载用户认证信息
                    await loadUserAuth();

                    // 只有在网络连接正常且有认证信息时才验证认证
                    if (networkConnected && userAuth.has_auth) {
                        try {
                            const verifyResponse = await fetch('/danbooru_gallery/verify_auth', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ username: userAuth.username, api_key: userAuth.api_key })
                            });
                            const verifyData = await verifyResponse.json();
                            if (!verifyData.valid) {
                                userAuth.has_auth = false;
                                if (verifyData.network_error) {
                                    showError('网络错误 - 无法连接到Danbooru服务器，请检查网络连接');
                                } else {
                                    showError('认证无效 - 请检查用户名和API Key设置');
                                }
                            } else {
                                await loadFavorites();
                            }
                        } catch (e) {
                            console.warn('认证验证失败:', e);
                            userAuth.has_auth = false;
                            showError('网络错误 - 无法验证认证信息，请检查网络连接');
                        }
                    } else if (!networkConnected) {
                        // 网络连接失败时，不验证认证，直接标记为无认证状态
                        userAuth.has_auth = false;
                    }

                    // 更新界面文本
                    updateInterfaceTexts();
                    // 更新收藏夹按钮状态
                    updateFavoritesButtonState();
                    // 加载黑名单
                    loadBlacklist();
                    // 加载提示词过滤设置
                    loadFilterTags();
                    // 初始化排行榜按钮状态
                    updateRankingButtonState();
                    // 页面加载时直接获取第一页的帖子
                    fetchAndRender(true);
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
        }
    },
});

$el("style", {
    textContent: `
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
    .danbooru-controls > * { padding: 5px; border-radius: 4px; border: 1px solid var(--input-border-color); background-color: var(--comfy-input-bg); color: var(--comfy-input-text); }
    .danbooru-controls .danbooru-search-input { flex-grow: 1; min-width: 150px; }
    .danbooru-controls > select { min-width: 100px; }
    .danbooru-image-wrapper.new-item { animation: fadeInUp 0.5s ease-out; }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .danbooru-settings-button {
        flex-grow: 0;
        width: auto;
        aspect-ratio: 1;
        padding: 5px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background-color 0.2s, transform 0.2s;
        background-color: var(--comfy-input-bg);
        color: var(--comfy-input-text);
        border: 1px solid var(--input-border-color);
        border-radius: 4px;
    }
    .danbooru-settings-button:hover { background-color: var(--comfy-menu-bg); transform: scale(1.1); }
    .danbooru-settings-button .icon { width: 20px; height: 20px; }
    .danbooru-refresh-button { flex-grow: 0; width: auto; aspect-ratio: 1; padding: 5px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background-color 0.2s, transform 0.2s; }
    .danbooru-refresh-button:hover { background-color: var(--comfy-menu-bg); transform: scale(1.1); }
    .danbooru-refresh-button.loading { cursor: not-allowed; }
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
    }

    /* 收藏按钮特定样式 */
    .danbooru-favorite-button.favorited {
        background-color: rgba(220, 53, 69, 0.9) !important; /* DC3545 in rgba */
        color: white !important;
    }

    .danbooru-favorite-button.favorited:hover {
        background-color: rgba(153, 27, 27, 0.9) !important;
    }

    /* 下载按钮特定样式 */
    .danbooru-download-button:hover {
        background-color: rgba(34, 139, 34, 0.9) !important;
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
        /* 设置对话框样式 */
        .danbooru-settings-dialog * {
            box-sizing: border-box;
        }
        
        .danbooru-settings-dialog {
            backdrop-filter: blur(3px);
            -webkit-backdrop-filter: blur(3px);
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
        
        .danbooru-settings-section {
            transition: all 0.2s ease;
        }
        
        .danbooru-settings-section:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
        .danbooru-toast {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-size: 14px;
            font-weight: 500;
            z-index: 999999;
            max-width: 300px;
            word-wrap: break-word;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            animation: toastSlideIn 0.3s ease-out;
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


