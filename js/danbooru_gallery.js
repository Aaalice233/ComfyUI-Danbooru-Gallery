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

                this.addDOMWidget("danbooru_gallery_widget", "div", container, {
                    onDraw: () => { }
                });


                // 确保在 widget 渲染后调整大小
                setTimeout(() => {
                    this.onResize(this.size);
                }, 10);

                let posts = [], currentPage = 1, isLoading = false;

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
                    refreshButton.title = t('refreshTooltip');
                    settingsButton.title = t('settings');

                    // 更新排行榜按钮文本
                    const rankingIcon = rankingButton.querySelector('.icon');
                    if (rankingIcon) {
                        rankingButton.innerHTML = rankingIcon.outerHTML + t('ranking');
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

                    // 将所有section添加到滚动容器
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

                            // 保存黑名单、提示词过滤和语言设置
                            const [blacklistSuccess, filterSuccess, languageSuccess] = await Promise.all([
                                saveBlacklist(newBlacklist),
                                saveFilterTags(newFilterTags, newFilterEnabled),
                                selectedLanguage !== currentLanguage ? saveLanguage(selectedLanguage) : Promise.resolve(true)
                            ]);

                            if (blacklistSuccess && filterSuccess && languageSuccess) {
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
                                const filteredPosts = posts.filter(post => !isPostBlacklisted(post));
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

                        // 应用本地黑名单过滤
                        const filteredPosts = newPosts.filter(post => !isPostBlacklisted(post));

                        console.log(`[Danbooru Gallery] 原始帖子数量: ${newPosts.length}, 过滤后: ${filteredPosts.length}`);
                        if (currentBlacklist.length > 0) {
                            const filteredCount = newPosts.length - filteredPosts.length;
                            if (filteredCount > 0) {
                                console.log(`[Danbooru Gallery] 已过滤 ${filteredCount} 个包含黑名单标签的帖子`);
                            }
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

                    const tooltip = $el("div.danbooru-tag-tooltip", { style: { display: "none", position: "absolute", zIndex: "1000" } });
                    const tagsContainer = $el("div", { className: "danbooru-tooltip-tags" });
                    let leaveTimeout;

                    tooltip.appendChild(tagsContainer);
                    document.body.appendChild(tooltip);

                    const createTagSpan = (tag, category) => $el("span", {
                        textContent: tag,
                        className: `danbooru-tooltip-tag tag-category-${category}`,
                    });

                    wrapper.addEventListener("mouseenter", (e) => {
                        clearTimeout(leaveTimeout);
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

                        tooltip.style.display = "block";
                    });

                    wrapper.addEventListener("mouseleave", () => {
                        tooltip.style.display = "none";
                    });

                    wrapper.addEventListener("mousemove", (e) => {
                        if (tooltip.style.display !== 'block') return;
                        const rect = tooltip.getBoundingClientRect();
                        const buffer = 15;
                        let newLeft = e.clientX + buffer, newTop = e.clientY + buffer;
                        if (newLeft + rect.width > window.innerWidth) newLeft = e.clientX - rect.width - buffer;
                        if (newTop + rect.height > window.innerHeight) newTop = e.clientY - rect.height - buffer;
                        tooltip.style.left = `${newLeft + window.scrollX}px`;
                        tooltip.style.top = `${newTop + window.scrollY}px`;
                    });

                    wrapper.appendChild(img);
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
                    const tooltips = document.querySelectorAll('.danbooru-tag-tooltip');
                    tooltips.forEach(tooltip => tooltip.style.display = 'none');
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

                refreshButton.addEventListener("click", () => fetchAndRender(true));

                container.appendChild($el("div.danbooru-controls", [searchInput, rankingButton, ratingSelect, categoryDropdown, formattingDropdown, settingsButton, refreshButton]));
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
                    // 加载语言设置
                    await loadLanguage();
                    // 更新界面文本
                    updateInterfaceTexts();
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
    .danbooru-controls { display: grid; grid-template-columns: 1fr auto auto auto auto auto auto; gap: 5px; margin-bottom: 5px; align-items: stretch; }
    .danbooru-auth-controls { display: flex; gap: 5px; }
    .danbooru-controls > * { padding: 5px; border-radius: 4px; border: 1px solid var(--input-border-color); background-color: var(--comfy-input-bg); color: var(--comfy-input-text); }
    .danbooru-controls .danbooru-search-input { flex-grow: 1; }
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
    .danbooru-image-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); grid-gap: 5px; grid-auto-rows: 1px; overflow-y: auto; background-color: var(--comfy-input-bg); padding: 5px; border-radius: 4px; flex-grow: 1; height: 0; }
    .danbooru-image-wrapper {
        grid-row-start: auto;
        border: 2px solid transparent;
        transition: border-color 0.2s, transform 0.2s ease-out, box-shadow 0.2s ease-out;
        border-radius: 6px;
        overflow: hidden;
        position: relative; /* Add relative positioning */
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
        `,
    parent: document.head,
});


