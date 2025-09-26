import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

// 提示词选择器节点
app.registerExtension({
    name: "Comfy.PromptSelector",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "PromptSelector") {

            // --- I18n & UI Management ---
            const i18n = {
                "zh-CN": {
                    "add_prompt": "添加提示词", "delete_selected": "删除选中", "import": "导入", "export": "导出", "settings": "设置",
                    "category": "类别", "single_select": "单选", "multi_select": "多选", "loading": "加载中...",
                    "no_prompts": "此分类下没有提示词。", "load_error": "加载数据失败!", "save_error": "保存数据失败!",
                    "edit_prompt": "编辑提示词", "alias": "备注名", "full_prompt": "完整提示词", "preview_image": "预览图",
                    "image_path_placeholder": "图片路径或URL", "save": "保存", "cancel": "取消", "add": "添加",
                    "open_category_menu": "将在这里打开层级分类菜单！", "new_category_prompt": "输入新的分类名称 (可用'/'创建层级):",
                    "category_exists": "该分类名称已存在！", "delete_default_category_alert": "不能删除默认分类！",
                    "delete_category_confirm": "确定要删除分类 \"{category}\" 吗？此操作不可撤销。",
                    "language": "语言", "output_format": "输出格式", "separator": "间隔符", "separator_placeholder": "多选模式下的间隔符",
                    // 新增的翻译
                    "save_selection": "保存选择",
                    "library": "词库",
                    "batch_operations": "批量操作", "select_all": "全选", "deselect_all": "取消全选", "batch_delete": "批量删除",
                    "batch_move": "批量移动", "move_to": "移动到", "sort_by": "排序方式", "created_time": "创建时间",
                    "usage_count": "使用次数", "alphabetical": "字母顺序", "favorites": "收藏", "tags": "标签",
                    "add_tag": "添加标签", "remove_tag": "移除标签", "filter_by_tag": "按标签筛选", "show_favorites": "显示收藏",
                    "mark_favorite": "标记收藏", "unmark_favorite": "取消收藏", "usage_stats": "使用统计", "templates": "模板",
                    "create_template": "创建模板", "apply_template": "应用模板", "template_name": "模板名称",
                    "template_variables": "模板变量", "variable_name": "变量名", "variable_description": "变量描述",
                    "variable_type": "变量类型", "text": "文本", "number": "数字", "backup": "备份", "restore": "恢复",
                    "auto_backup": "自动备份", "manual_backup": "手动备份", "backup_created": "备份已创建",
                    "restore_confirm": "确定要恢复此备份吗？当前数据将被覆盖。", "statistics": "统计信息",
                    "backup_now": "立即备份", "restore_from_backup": "从备份恢复", "no_backups": "没有可用的备份。",
                    "max_backups": "最大备份数",
                    "open_library_hint": "点击左上角书本图标打开提示词库",
                    "import_success": "导入成功！正在刷新...",
                    "import_fail": "导入失败",
                    "delete_prompt_confirm": "确定要删除提示词 \"{prompt}\" 吗？",
                    "alias_placeholder": "提示词的显示名称",
                    "full_prompt_placeholder": "完整的提示词内容",
                    "prompt_empty_error": "请填写提示词名称和内容！",
                    "add_prompt_success": "提示词添加成功！",
                    "update_prompt_success": "提示词更新成功！",
                    "save_fail_retry": "保存失败，请重试！",
                    "exit_batch": "退出批量",
                    "prompt_list": "提示词列表",
                    "add_new": "+ 新增",
                    "ready": "就绪",
                    "no_matching_prompts": "没有匹配的提示词。",
                    "batch_delete_confirm": "确定要删除选中的 {count} 个提示词吗？",
                    "batch_delete_success": "批量删除成功！",
                    "batch_delete_fail": "批量删除失败！",
                    "move_to_category_prompt": "请输入目标分类名称:",
                    "batch_move_wip": "批量移动功能开发中...",
                    "load_backup_fail": "加载备份列表失败",
                    "backup_fail": "备份失败",
                    "select_backup_file": "请选择一个备份文件",
                    "restore_success_refreshing": "恢复成功！正在刷新...",
                    "restore_fail": "恢复失败",
                    "total_categories": "总分类数", "total_prompts": "总提示词数", "favorite_prompts": "收藏提示词",
                    "most_used": "最常用", "rename_category": "重命名分类", "delete_category": "删除分类",
                    "category_description": "分类描述", "prompt_description": "提示词描述", "drag_to_reorder": "拖拽重新排序",
                    "search_placeholder": "搜索提示词、标签或描述...", "advanced_search": "高级搜索",
                    "search_in_prompts": "在提示词中搜索", "search_in_tags": "在标签中搜索", "search_in_descriptions": "在描述中搜索"
                },
                "en-US": {
                    "add_prompt": "Add Prompt", "delete_selected": "Delete Selected", "import": "Import", "export": "Export", "settings": "Settings",
                    "category": "Category", "single_select": "Single", "multi_select": "Multi", "loading": "Loading...",
                    "no_prompts": "No prompts in this category.", "load_error": "Failed to load data!", "save_error": "Failed to save data!",
                    "edit_prompt": "Edit Prompt", "alias": "Alias", "full_prompt": "Full Prompt", "preview_image": "Preview Image",
                    "image_path_placeholder": "Image path or URL", "save": "Save", "cancel": "Cancel", "add": "Add",
                    "open_category_menu": "Hierarchical category menu will open here!", "new_category_prompt": "Enter new category name (use '/' for hierarchy):",
                    "category_exists": "Category name already exists!", "delete_default_category_alert": "Cannot delete the default category!",
                    "delete_category_confirm": "Are you sure you want to delete category \"{category}\"?",
                    "language": "Language", "output_format": "Output Format", "separator": "Separator", "separator_placeholder": "Separator for multi-select mode",
                    // New translations
                    "save_selection": "Save Selection",
                    "library": "Library",
                    "batch_operations": "Batch Operations", "select_all": "Select All", "deselect_all": "Deselect All", "batch_delete": "Batch Delete",
                    "batch_move": "Batch Move", "move_to": "Move To", "sort_by": "Sort By", "created_time": "Created Time",
                    "usage_count": "Usage Count", "alphabetical": "Alphabetical", "favorites": "Favorites", "tags": "Tags",
                    "add_tag": "Add Tag", "remove_tag": "Remove Tag", "filter_by_tag": "Filter by Tag", "show_favorites": "Show Favorites",
                    "mark_favorite": "Mark Favorite", "unmark_favorite": "Unmark Favorite", "usage_stats": "Usage Stats", "templates": "Templates",
                    "create_template": "Create Template", "apply_template": "Apply Template", "template_name": "Template Name",
                    "template_variables": "Template Variables", "variable_name": "Variable Name", "variable_description": "Variable Description",
                    "variable_type": "Variable Type", "text": "Text", "number": "Number", "backup": "Backup", "restore": "Restore",
                    "auto_backup": "Auto Backup", "manual_backup": "Manual Backup", "backup_created": "Backup Created",
                    "restore_confirm": "Are you sure you want to restore this backup? Current data will be overwritten.", "statistics": "Statistics",
                    "backup_now": "Backup Now", "restore_from_backup": "Restore from Backup", "no_backups": "No backups available.",
                    "max_backups": "Max Backups",
                    "open_library_hint": "Click the book icon in the upper left corner to open the prompt library",
                    "import_success": "Import successful! Refreshing...",
                    "import_fail": "Import failed",
                    "delete_prompt_confirm": "Are you sure you want to delete prompt \"{prompt}\"?",
                    "alias_placeholder": "Display name for the prompt",
                    "full_prompt_placeholder": "The full prompt content",
                    "prompt_empty_error": "Please fill in the prompt name and content!",
                    "add_prompt_success": "Prompt added successfully!",
                    "update_prompt_success": "Prompt updated successfully!",
                    "save_fail_retry": "Save failed, please try again!",
                    "exit_batch": "Exit Batch",
                    "prompt_list": "Prompt List",
                    "add_new": "+ Add New",
                    "ready": "Ready",
                    "no_matching_prompts": "No matching prompts.",
                    "batch_delete_confirm": "Are you sure you want to delete the selected {count} prompts?",
                    "batch_delete_success": "Batch delete successful!",
                    "batch_delete_fail": "Batch delete failed!",
                    "move_to_category_prompt": "Please enter the target category name:",
                    "batch_move_wip": "Batch move feature is under development...",
                    "load_backup_fail": "Failed to load backup list",
                    "backup_fail": "Backup failed",
                    "select_backup_file": "Please select a backup file",
                    "restore_success_refreshing": "Restore successful! Refreshing...",
                    "restore_fail": "Restore failed",
                    "total_categories": "Total Categories", "total_prompts": "Total Prompts", "favorite_prompts": "Favorite Prompts",
                    "most_used": "Most Used", "rename_category": "Rename Category", "delete_category": "Delete Category",
                    "category_description": "Category Description", "prompt_description": "Prompt Description", "drag_to_reorder": "Drag to Reorder",
                    "search_placeholder": "Search prompts, tags or descriptions...", "advanced_search": "Advanced Search",
                    "search_in_prompts": "Search in Prompts", "search_in_tags": "Search in Tags", "search_in_descriptions": "Search in Descriptions"
                }
            };
            let currentLanguage = "zh-CN";
            const t = (key, replacements) => {
                let text = i18n[currentLanguage]?.[key] || i18n["en-US"][key];
                if (replacements) {
                    for (const k in replacements) {
                        text = text.replace(`{${k}}`, replacements[k]);
                    }
                }
                return text;
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

                console.log("提示词选择器节点已创建！");

                this.promptData = null; // 用于存储从后端获取的数据
                this.selectedCategory = "default";
                this.selectionMode = "multi"; // 'single' or 'multi'
                this.selectedPrompts = new Set(); // 用于存储多选模式下的选中项
                this.batchMode = false; // 批量操作模式
                this.selectedForBatch = new Set(); // 批量操作选中的提示词ID
                this.currentSortBy = "created_at"; // 当前排序方式
                this.currentSortOrder = "desc"; // 当前排序顺序
                this.currentFilter = { favorites: false, tags: [], search: "" }; // 当前过滤条件
                this.draggedItem = null; // 拖拽的项目

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
                        currentLanguage = this.promptData.settings?.language || "zh-CN";
                        console.log("提示词数据已加载:", this.promptData);
                        this.updateCategoryDropdown();
                        this.restoreSelection(); // 恢复选择
                        this.renderContent();
                        updateUIText(this);
                    })
                    .catch(error => {
                        console.error("加载提示词数据失败:", error);
                        contentArea.innerHTML = `<p style="color: #c53939; text-align: center;">${t('load_error')}</p>`;
                    });

                // --- 事件监听 ---

                const addBtn = footer.querySelector("#ps-add-btn");
                addBtn.addEventListener("click", () => {
                    this.showEditModal({ alias: '', prompt: '' }, this.selectedCategory, true);
                });

                // Delete button is now per-item, so the global one is removed.

                const iconSelectAll = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M3.5 5.5l1.5 1.5l2.5 -2.5"></path><path d="M3.5 11.5l1.5 1.5l2.5 -2.5"></path><path d="M3.5 17.5l1.5 1.5l2.5 -2.5"></path><path d="M11 6l9 0"></path><path d="M11 12l9 0"></path><path d="M11 18l9 0"></path></svg>`;
                const iconDeselectAll = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M3 3m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z"></path><path d="M10 10l4 4m0 -4l-4 4"></path></svg>`;

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

                    const allSelected = promptsInCategory.every(p => this.selectedPrompts.has(p.prompt));

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
                    const allSelected = promptsInCategory.length > 0 && promptsInCategory.every(p => this.selectedPrompts.has(p.prompt));

                    if (allSelected) {
                        promptsInCategory.forEach(p => this.selectedPrompts.delete(p.prompt));
                    } else {
                        promptsInCategory.forEach(p => this.selectedPrompts.add(p.prompt));
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
                            const response = await api.fetchApi("/prompt_selector/import", {
                                method: "POST",
                                body: formData,
                            });
                            if (response.ok) {
                                this.showToast(t('import_success'));
                                // 重新加载数据
                                const data = await api.fetchApi("/prompt_selector/data").then(r => r.json());
                                this.promptData = data;
                                currentLanguage = this.promptData.settings?.language || "zh-CN";
                                this.updateCategoryDropdown();
                                this.renderContent();
                                updateUIText(this);
                            } else {
                                const error = await response.json();
                                throw new Error(error.error || t('import_fail'));
                            }
                        } catch (error) {
                            this.showToast(`${t('import_fail')}: ${error.message}`, 'error');
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
                        const text = categoryBtn.querySelector('span');
                        if (text) text.textContent = this.selectedCategory;
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

                    const list = document.createElement("ul");
                    list.className = "prompt-list";

                    category.prompts.forEach(p => {
                        const item = document.createElement("li");
                        item.className = "prompt-item";
                        // item.title = p.prompt; // 移除title属性，避免冗余提示

                        const textSpan = document.createElement("span");
                        textSpan.textContent = p.alias || p.prompt;

                        const editBtn = document.createElement("button");
                        editBtn.className = "ps-item-edit-btn";
                        // editBtn.title = t('edit_prompt'); // 移除title属性，避免冗余提示
                        editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;

                        const deleteBtn = document.createElement("button");
                        deleteBtn.className = "ps-item-delete-btn";
                        // deleteBtn.title = t('delete_selected'); // 移除title属性，避免冗余提示
                        deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v6"></path></svg>`;

                        item.appendChild(textSpan);
                        item.appendChild(editBtn);
                        item.appendChild(deleteBtn);

                        item.addEventListener('click', () => {
                            const promptValue = p.prompt;
                            if (this.selectionMode === 'single') {
                                if (this.selectedPrompts.has(promptValue)) {
                                    this.selectedPrompts.clear();
                                } else {
                                    this.selectedPrompts.clear();
                                    this.selectedPrompts.add(promptValue);
                                }
                            } else { // multi
                                if (this.selectedPrompts.has(promptValue)) {
                                    this.selectedPrompts.delete(promptValue);
                                } else {
                                    this.selectedPrompts.add(promptValue);
                                }
                            }
                            this.renderContent(); // Re-render to update selection state
                            this.updateOutput();
                        });

                        editBtn.addEventListener('click', (e) => {
                            e.stopPropagation(); // Prevent item's click event
                            this.showEditModal(p, this.selectedCategory, false);
                        });

                        deleteBtn.addEventListener('click', (e) => {
                            e.stopPropagation(); // Prevent item's click event
                            this.showConfirmModal(t('delete_prompt_confirm', { prompt: p.alias || p.prompt }), () => {
                                const category = this.promptData.categories.find(c => c.name === this.selectedCategory);
                                if (category) {
                                    const promptIndex = category.prompts.findIndex(item => item.id === p.id);
                                    if (promptIndex > -1) {
                                        category.prompts.splice(promptIndex, 1);
                                        this.selectedPrompts.delete(p.prompt);
                                        this.saveData();
                                        this.renderContent();
                                        this.updateOutput();
                                    }
                                }
                            });
                        });

                        if (this.selectedPrompts.has(p.prompt)) {
                            item.classList.add('selected');
                        }

                        list.appendChild(item);
                    });

                    contentArea.appendChild(list);
                    this.updateSelectAllButtonState();
                };

                this.updateOutput = () => {
                    const separator = this.promptData.settings?.separator || ", ";
                    const outputString = Array.from(this.selectedPrompts).join(separator);
                    outputWidget.value = outputString;
                    console.log("Output updated:", outputString);
                    this.saveSelection(); // 保存选择
                };

                this.saveData = () => {
                    return api.fetchApi("/prompt_selector/data", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(this.promptData),
                    }).then(response => {
                        if (!response.ok) {
                            this.showToast(t('save_error'), 'error');
                        }
                    }).catch(error => {
                        console.error("保存数据失败:", error);
                        this.showToast(t('save_error'), 'error');
                    });
                };

                this.showCategoryMenu = (button) => {
                    const existingMenu = document.querySelector(".ps-category-menu");

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
                    };

                    if (existingMenu) {
                        closeMenu();
                        return;
                    }

                    button.classList.add("open");
                    const menu = document.createElement("div");
                    menu.className = "ps-category-menu";

                    const searchInput = document.createElement("input");
                    searchInput.type = "text";
                    searchInput.placeholder = "搜索类别...";
                    searchInput.addEventListener("input", (e) => {
                        const searchTerm = e.target.value.toLowerCase();
                        ul.querySelectorAll("li").forEach(li => {
                            const categoryName = li.textContent.toLowerCase();
                            li.style.display = categoryName.includes(searchTerm) ? "" : "none";
                        });
                    });

                    const ul = document.createElement("ul");
                    this.promptData.categories.forEach(cat => {
                        const li = document.createElement("li");
                        li.textContent = cat.name;
                        li.addEventListener("click", () => {
                            this.selectedCategory = cat.name;
                            this.updateCategoryDropdown();
                            this.restoreSelection(); // 恢复新分类的选择
                            this.renderContent();
                            closeMenu();
                        });
                        ul.appendChild(li);
                    });

                    menu.appendChild(searchInput);
                    menu.appendChild(ul);
                    document.body.appendChild(menu);

                    const rect = button.getBoundingClientRect();
                    menu.style.left = `${rect.left}px`;
                    menu.style.top = `${rect.bottom + 5}px`;

                    const clickOutsideHandler = (event) => {
                        if (!menu.contains(event.target) && !button.contains(event.target)) {
                            closeMenu();
                        }
                    };

                    button.clickOutsideHandler = clickOutsideHandler;
                    document.addEventListener("click", clickOutsideHandler, true);
                };

                this.showEditModal = (prompt, categoryName, isNew = false) => {
                    // 防止重复创建
                    if (document.querySelector(".ps-edit-modal")) return;

                    const modal = document.createElement("div");
                    modal.className = "ps-edit-modal";
                    modal.innerHTML = `
                        <div class="ps-modal-content" style="width: 600px; max-width: 90vw;">
                            <h3>${isNew ? t('add_prompt') : t('edit_prompt')}</h3>
                            
                            <label>${t('alias')}:</label>
                            <input type="text" id="ps-edit-alias" value="${prompt.alias || ''}" placeholder="${t('alias_placeholder')}">
                            
                            <label>${t('full_prompt')}:</label>
                            <textarea id="ps-edit-prompt" rows="5" placeholder="${t('full_prompt_placeholder')}">${prompt.prompt || ''}</textarea>
                            
                            
                            <div class="ps-modal-buttons">
                                <button id="ps-edit-save">${isNew ? t('add') : t('save')}</button>
                                <button id="ps-edit-cancel">${t('cancel')}</button>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(modal);

                    const closeModal = () => modal.remove();


                    modal.querySelector("#ps-edit-cancel").addEventListener("click", closeModal);
                    modal.querySelector("#ps-edit-save").addEventListener("click", async () => {
                        const newId = `prompt-${Date.now()}`;
                        const updatedPrompt = {
                            id: isNew ? newId : prompt.id,
                            alias: modal.querySelector("#ps-edit-alias").value.trim(),
                            prompt: modal.querySelector("#ps-edit-prompt").value.trim(),
                            description: prompt.description || "",
                            image: prompt.image || "",
                            tags: prompt.tags || [],
                            favorite: prompt.favorite || false,
                            template: prompt.template || false,
                            created_at: prompt.created_at || new Date().toISOString(),
                            usage_count: prompt.usage_count || 0,
                            last_used: prompt.last_used
                        };

                        if (!updatedPrompt.alias || !updatedPrompt.prompt) {
                            this.showToast(t('prompt_empty_error'), 'error');
                            return;
                        }

                        try {
                            if (isNew) {
                                const category = this.promptData.categories.find(c => c.name === categoryName);
                                if (category) {
                                    category.prompts.push(updatedPrompt);
                                }
                            } else {
                                const category = this.promptData.categories.find(c => c.name === categoryName);
                                if (category) {
                                    const index = category.prompts.findIndex(p => p.id === prompt.id);
                                    if (index !== -1) {
                                        category.prompts[index] = updatedPrompt;
                                    }
                                }
                            }

                            await this.saveData();

                            // Dispatch event to notify library modal to refresh
                            document.dispatchEvent(new CustomEvent('ps-data-updated', {
                                detail: {
                                    categoryName: categoryName,
                                    isNew: isNew,
                                    promptId: updatedPrompt.id
                                }
                            }));

                            // 刷新主列表并滚动
                            this.renderContent();
                            const contentArea = mainContainer.querySelector(".prompt-selector-content-area");
                            if (contentArea) {
                                contentArea.scrollTop = contentArea.scrollHeight;
                            }

                            closeModal();
                            this.showToast(isNew ? t('add_prompt_success') : t('update_prompt_success'));
                        } catch (error) {
                            console.error('保存提示词失败:', error);
                            this.showToast(t('save_fail_retry'), 'error');
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
                        imageHTML = `<img src="/prompt_selector/images/${prompt.image}" alt="Preview">`;
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
                                    <div class="ps-filter-group">
                                        <label class="ps-filter-toggle">
                                            <input type="checkbox" id="ps-show-favorites"> ${t('show_favorites')}
                                        </label>
                                        <select id="ps-sort-select" class="ps-select">
                                            <option value="created_at">${t('created_time')}</option>
                                            <option value="alphabetical">${t('alphabetical')}</option>
                                        </select>
                                        <button class="ps-btn ps-btn-sm" id="ps-sort-order-btn">
                                            <svg viewBox="0 0 24 24"><path d="M3 6h18"></path><path d="M6 12h12"></path><path d="M9 18h6"></path></svg>
                                        </button>
                                    </div>
                                    <div class="ps-batch-controls" style="display: none;">
                                        <button class="ps-btn ps-btn-sm" id="ps-select-all-btn">${t('select_all')}</button>
                                        <button class="ps-btn ps-btn-sm" id="ps-batch-delete-btn">${t('batch_delete')}</button>
                                        <button class="ps-btn ps-btn-sm" id="ps-batch-move-btn">${t('batch_move')}</button>
                                        <button class="ps-btn ps-btn-sm" id="ps-exit-batch-btn">${t('exit_batch')}</button>
                                    </div>
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
                                            <button class="ps-btn ps-btn-sm" id="ps-batch-mode-btn">${t('batch_operations')}</button>
                                            <button class="ps-btn ps-btn-sm" id="ps-add-prompt-btn">${t('add_new')}</button>
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
                            renderPromptList(this.selectedCategory);

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

                    const closeModal = () => {
                        document.removeEventListener('keydown', handleKeydown);
                        document.removeEventListener('ps-data-updated', dataUpdateHandler);
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

                    // --- 类别树逻辑 ---
                    const buildCategoryTree = (categories) => {
                        const tree = { children: [] }; // 使用一个根节点
                        const map = { 'root': tree };

                        categories.sort((a, b) => a.name.localeCompare(b.name)).forEach(cat => {
                            const parts = cat.name.split('/');
                            let currentLevel = tree.children;
                            let path = '';

                            parts.forEach((part, i) => {
                                const oldPath = path;
                                path = i === 0 ? part : `${path}/${part}`;

                                let node = map[path];
                                if (!node) {
                                    node = { name: part, fullName: path, children: [] };
                                    map[path] = node;
                                    // 找到父节点并添加
                                    const parentNode = i === 0 ? tree : map[oldPath];
                                    parentNode.children.push(node);
                                }
                                currentLevel = node.children;
                            });
                        });
                        return tree.children;
                    };

                    const renderCategoryTree = (nodes, container) => {
                        const ul = document.createElement("ul");
                        nodes.forEach(node => {
                            const li = document.createElement("li");
                            li.dataset.fullName = node.fullName;
                            li.innerHTML = `<div class="ps-tree-item"><span>${node.name}</span></div>`;

                            const itemDiv = li.querySelector('.ps-tree-item');

                            if (node.children.length > 0) {
                                li.classList.add("parent");
                                const childrenUl = renderCategoryTree(node.children, li);
                                li.appendChild(childrenUl);
                                itemDiv.addEventListener('click', (e) => {
                                    e.stopPropagation();
                                    li.classList.toggle('open');
                                });
                            } else {
                                itemDiv.addEventListener('click', (e) => {
                                    e.stopPropagation();
                                    this.selectedCategory = node.fullName;
                                    renderPromptList(this.selectedCategory); // 更新右侧视图
                                    // 高亮显示
                                    modal.querySelectorAll('.ps-tree-item.selected').forEach(el => el.classList.remove('selected'));
                                    itemDiv.classList.add('selected');
                                });
                            }
                            ul.appendChild(li);
                        });
                        return ul;
                    };

                    // --- 提示词列表逻辑 ---
                    const rightPanel = modal.querySelector('.ps-library-right-panel');
                    const promptListContainer = rightPanel.querySelector('.ps-prompt-list-container');

                    const renderPromptList = (categoryName, searchTerm = '') => {
                        promptListContainer.innerHTML = ''; // 清空
                        const category = this.promptData.categories.find(c => c.name === categoryName);

                        let promptsToShow = [];
                        if (category) {
                            promptsToShow = [...category.prompts];
                        }

                        // 应用搜索过滤
                        if (searchTerm) {
                            const lowerCaseSearchTerm = searchTerm.toLowerCase();
                            if (!categoryName) {
                                promptsToShow = this.promptData.categories.flatMap(c => c.prompts);
                            }
                            promptsToShow = promptsToShow.filter(p => {
                                const searchInAlias = p.alias.toLowerCase().includes(lowerCaseSearchTerm);
                                const searchInPrompt = p.prompt.toLowerCase().includes(lowerCaseSearchTerm);
                                const searchInTags = p.tags && p.tags.some(tag => tag.toLowerCase().includes(lowerCaseSearchTerm));
                                const searchInDesc = p.description && p.description.toLowerCase().includes(lowerCaseSearchTerm);
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

                        // 应用排序
                        this.sortPrompts(promptsToShow);

                        if (!promptsToShow.length) {
                            promptListContainer.innerHTML = `<p style="color: #555; text-align: center;">${t('no_matching_prompts')}</p>`;
                            return;
                        }

                        const list = document.createElement("ul");
                        list.className = "ps-prompt-list";
                        list.setAttribute('data-category', categoryName);

                        promptsToShow.forEach((p, index) => {
                            // 确保每个提示词都有ID
                            if (!p.id) {
                                p.id = `prompt-${Date.now()}-${index}`;
                            }

                            const item = document.createElement("li");
                            item.className = "ps-prompt-list-item";
                            item.setAttribute('data-prompt-id', p.id);
                            item.draggable = true;

                            const favoriteClass = p.favorite ? 'favorite' : '';
                            const usageCount = p.usage_count || 0;
                            const tags = p.tags || [];

                            item.innerHTML = `
                                <div class="ps-prompt-item-header">
                                    <div class="ps-prompt-controls">
                                        ${this.batchMode ? `<input type="checkbox" class="ps-batch-checkbox" data-prompt-id="${p.id}">` : ''}
                                        <button class="ps-btn ps-btn-icon ps-favorite-btn ${favoriteClass}" data-prompt-id="${p.id}">
                                            <svg viewBox="0 0 24 24"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"></polygon></svg>
                                        </button>
                                        <button class="ps-btn ps-btn-icon ps-edit-btn" data-prompt-id="${p.id}">
                                            <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                        </button>
                                        <button class="ps-btn ps-btn-icon ps-delete-btn" data-prompt-id="${p.id}">
                                            <svg viewBox="0 0 24 24"><polyline points="3,6 5,6 21,6"></polyline><path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"></path></svg>
                                        </button>
                                    </div>
                                </div>
                                <div class="ps-prompt-content">
                                    <div class="ps-prompt-list-item-name">${p.alias}</div>
                                    <div class="ps-prompt-list-item-preview">${p.prompt}</div>
                                    ${p.description ? `<div class="ps-prompt-description">${p.description}</div>` : ''}
                                    ${tags.length > 0 ? `<div class="ps-prompt-tags">${tags.map(tag => `<span class="ps-tag">${tag}</span>`).join('')}</div>` : ''}
                                </div>
                            `;

                            // 拖拽事件
                            item.addEventListener('dragstart', (e) => {
                                this.draggedItem = { id: p.id, index: index };
                                e.dataTransfer.effectAllowed = 'move';
                            });

                            item.addEventListener('dragover', (e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                            });

                            item.addEventListener('drop', (e) => {
                                e.preventDefault();
                                if (this.draggedItem && this.draggedItem.id !== p.id) {
                                    this.reorderPrompts(categoryName, this.draggedItem.index, index);
                                }
                            });

                            // 单击加载提示词
                            item.querySelector('.ps-prompt-content').addEventListener('click', () => {
                                if (!this.batchMode) {
                                    this.loadPrompt(p);
                                    closeModal();
                                }
                            });

                            // 收藏按钮事件
                            item.querySelector('.ps-favorite-btn').addEventListener('click', (e) => {
                                e.stopPropagation();
                                this.toggleFavorite(categoryName, p.id);
                            });

                            // 编辑按钮事件
                            item.querySelector('.ps-edit-btn').addEventListener('click', (e) => {
                                e.stopPropagation();
                                this.showEditModal(p, categoryName);
                            });

                            // 删除按钮事件
                            item.querySelector('.ps-delete-btn').addEventListener('click', (e) => {
                                e.stopPropagation();
                                this.showConfirmModal(t('delete_prompt_confirm', { prompt: p.alias }), () => {
                                    this.deletePrompt(categoryName, p.id);
                                });
                            });

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

                    const categoryTree = buildCategoryTree(this.promptData.categories);
                    const treeElement = renderCategoryTree(categoryTree, categoryTreeContainer);
                    categoryTreeContainer.innerHTML = ''; // 清空占位符
                    categoryTreeContainer.appendChild(treeElement);

                    // 默认渲染第一个分类的提示词
                    if (this.promptData.categories.length > 0) {
                        this.selectedCategory = this.promptData.categories[0].name;
                        const firstItem = categoryTreeContainer.querySelector('.ps-tree-item');
                        if (firstItem) {
                            firstItem.classList.add('selected');
                            renderPromptList(this.selectedCategory);
                        }
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
                            renderPromptList(categoryToRender, searchTerm);
                        });
                    });

                    // --- 底部按钮逻辑 ---
                    const newCategoryBtn = modal.querySelector('#ps-new-category-btn');
                    newCategoryBtn.addEventListener('click', () => {
                        const newName = prompt(t('new_category_prompt'));
                        if (!newName || !newName.trim()) return;
                        const finalName = newName.trim();
                        if (this.promptData.categories.some(c => c.name === finalName)) {
                            this.showToast(t('category_exists'), 'error');
                            return;
                        }
                        const newCategory = { name: finalName, prompts: [] };
                        this.promptData.categories.push(newCategory);
                        this.saveData();

                        // 刷新树
                        const categoryTree = buildCategoryTree(this.promptData.categories);
                        const treeElement = renderCategoryTree(categoryTree, categoryTreeContainer);
                        categoryTreeContainer.innerHTML = '';
                        categoryTreeContainer.appendChild(treeElement);
                    });


                    // --- 新增的事件监听器 ---


                    // 收藏过滤
                    const showFavoritesCheckbox = modal.querySelector('#ps-show-favorites');
                    showFavoritesCheckbox.addEventListener('change', (e) => {
                        this.currentFilter.favorites = e.target.checked;
                        renderPromptList(this.selectedCategory);
                    });

                    // 排序选择
                    const sortSelect = modal.querySelector('#ps-sort-select');
                    sortSelect.value = this.currentSortBy;
                    sortSelect.addEventListener('change', (e) => {
                        this.currentSortBy = e.target.value;
                        renderPromptList(this.selectedCategory);
                    });

                    // 排序顺序
                    const sortOrderBtn = modal.querySelector('#ps-sort-order-btn');
                    sortOrderBtn.addEventListener('click', () => {
                        this.currentSortOrder = this.currentSortOrder === 'desc' ? 'asc' : 'desc';
                        const svg = sortOrderBtn.querySelector('svg');
                        if (this.currentSortOrder === 'asc') {
                            svg.innerHTML = '<path d="M3 18h18"></path><path d="M6 12h12"></path><path d="M9 6h6"></path>';
                        } else {
                            svg.innerHTML = '<path d="M3 6h18"></path><path d="M6 12h12"></path><path d="M9 18h6"></path>';
                        }
                        renderPromptList(this.selectedCategory);
                    });

                    // 批量操作模式
                    const batchModeBtn = modal.querySelector('#ps-batch-mode-btn');
                    batchModeBtn.addEventListener('click', () => {
                        this.batchMode = !this.batchMode;
                        batchModeBtn.textContent = this.batchMode ? t('exit_batch') : t('batch_operations');
                        batchModeBtn.classList.toggle('active', this.batchMode);

                        const filterGroup = modal.querySelector('.ps-filter-group');
                        const batchControls = modal.querySelector('.ps-batch-controls');

                        if (this.batchMode) {
                            filterGroup.style.display = 'none';
                            batchControls.style.display = 'flex';
                        } else {
                            filterGroup.style.display = 'flex';
                            batchControls.style.display = 'none';
                            this.selectedForBatch.clear();
                        }

                        renderPromptList(this.selectedCategory);
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

                        selectAllBtn.textContent = allChecked ? t('select_all') : t('deselect_all');
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
                                    // 更新本地数据
                                    const category = this.promptData.categories.find(c => c.name === this.selectedCategory);
                                    if (category) {
                                        category.prompts = category.prompts.filter(p => !this.selectedForBatch.has(p.id));
                                    }
                                    this.selectedForBatch.clear();
                                    renderPromptList(this.selectedCategory);
                                    this.showToast(t('batch_delete_success'));
                                }
                            } catch (error) {
                                console.error("批量删除失败:", error);
                                this.showToast(t('batch_delete_fail'), 'error');
                            }
                        });
                    });

                    // 批量移动
                    const batchMoveBtn = modal.querySelector('#ps-batch-move-btn');
                    batchMoveBtn.addEventListener('click', () => {
                        if (this.selectedForBatch.size === 0) return;

                        const targetCategory = prompt(t('move_to_category_prompt'));
                        if (!targetCategory) return;

                        // TODO: 实现批量移动功能
                        this.showToast(t('batch_move_wip'), 'warning');
                    });

                    // 退出批量模式
                    const exitBatchBtn = modal.querySelector('#ps-exit-batch-btn');
                    exitBatchBtn.addEventListener('click', () => {
                        this.batchMode = false;
                        batchModeBtn.textContent = t('batch_operations');
                        batchModeBtn.classList.remove('active');

                        const filterGroup = modal.querySelector('.ps-filter-group');
                        const batchControls = modal.querySelector('.ps-batch-controls');
                        filterGroup.style.display = 'flex';
                        batchControls.style.display = 'none';

                        this.selectedForBatch.clear();
                        renderPromptList(this.selectedCategory);
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
                };

                this.saveSelection = () => {
                    if (!this.promptData.settings?.save_selection) return;

                    api.fetchApi("/prompt_selector/selection", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            category: this.selectedCategory,
                            selected_prompts: Array.from(this.selectedPrompts)
                        }),
                    }).catch(error => {
                        console.error("保存选择失败:", error);
                    });
                };

                this.restoreSelection = () => {
                    if (!this.promptData.settings?.save_selection) return;

                    const category = this.promptData.categories.find(c => c.name === this.selectedCategory);
                    if (category && category.last_selected) {
                        this.selectedPrompts = new Set(category.last_selected);
                        this.updateOutput();
                    }
                };

                this.showSettingsModal = () => {
                    if (document.querySelector(".ps-settings-modal")) return;

                    const modal = document.createElement("div");
                    modal.className = "ps-edit-modal ps-settings-modal"; // Re-use styles
                    modal.innerHTML = `
                        <div class="ps-modal-content" style="width: 400px; max-width: 90vw;">
                             <h3>${t('settings')}</h3>
                             <div class="ps-settings-tabs">
                                <button class="ps-tab-btn active" data-pane="general">${t('language')}</button>
                                <button class="ps-tab-btn" data-pane="backup">${t('backup')}</button>
                             </div>
                             <div class="ps-settings-pane active" data-pane="general">
                                 <label for="ps-lang-select">${t('language')}:</label>
                                 <select id="ps-lang-select">
                                     <option value="zh-CN">简体中文</option>
                                     <option value="en-US">English</option>
                                 </select>
                                 
                                 <label class="ps-checkbox-label" style="margin-top: 15px;">
                                    <input type="checkbox" id="ps-save-selection-checkbox">
                                    ${t('save_selection')}
                                </label>
                             </div>
                             <div class="ps-settings-pane" data-pane="backup">
                                <label class="ps-checkbox-label">
                                    <input type="checkbox" id="ps-auto-backup-checkbox">
                                    ${t('auto_backup')}
                                </label>
                                <label>${t('max_backups')}:</label>
                                <input type="number" id="ps-max-backups-input" min="1" max="100" style="width: 100px;">
                                <div style="margin-top: 15px;">
                                    <button class="ps-btn ps-btn-sm" id="ps-backup-now-btn">${t('backup_now')}</button>
                                    <button class="ps-btn ps-btn-sm" id="ps-restore-backup-btn">${t('restore_from_backup')}</button>
                                </div>
                                <div id="ps-backup-list-container" style="margin-top: 15px;"></div>
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
                    langSelect.value = currentLanguage;

                    const saveSelectionCheckbox = modal.querySelector("#ps-save-selection-checkbox");
                    saveSelectionCheckbox.checked = this.promptData.settings?.save_selection || false;

                    const autoBackupCheckbox = modal.querySelector("#ps-auto-backup-checkbox");
                    autoBackupCheckbox.checked = this.promptData.settings?.auto_backup ?? true;

                    const maxBackupsInput = modal.querySelector("#ps-max-backups-input");
                    maxBackupsInput.value = this.promptData.settings?.max_backups || 10;

                    // Tab switching
                    modal.querySelectorAll('.ps-tab-btn').forEach(btn => {
                        btn.addEventListener('click', () => {
                            const paneName = btn.dataset.pane;
                            modal.querySelectorAll('.ps-tab-btn').forEach(b => b.classList.remove('active'));
                            btn.classList.add('active');
                            modal.querySelectorAll('.ps-settings-pane').forEach(p => {
                                p.style.display = p.dataset.pane === paneName ? 'block' : 'none';
                            });
                            if (paneName === 'backup') {
                                loadBackupList();
                            }
                        });
                    });
                    // Hide backup pane initially
                    modal.querySelector('.ps-settings-pane[data-pane="backup"]').style.display = 'none';


                    // Backup logic
                    const backupListContainer = modal.querySelector("#ps-backup-list-container");

                    const loadBackupList = async () => {
                        try {
                            const backups = await api.fetchApi("/prompt_selector/backups").then(r => r.json());
                            if (backups.length === 0) {
                                backupListContainer.innerHTML = `<p>${t('no_backups')}</p>`;
                                return;
                            }
                            backupListContainer.innerHTML = `
                                <select id="ps-backup-select" size="5" style="width: 100%;">
                                    ${backups.map(b => `<option value="${b}">${b}</option>`).join('')}
                                </select>
                            `;
                        } catch (error) {
                            backupListContainer.innerHTML = `<p style="color: #c53939;">${t('load_backup_fail')}</p>`;
                        }
                    };

                    modal.querySelector("#ps-backup-now-btn").addEventListener("click", async () => {
                        try {
                            const response = await api.fetchApi("/prompt_selector/backup/create", { method: "POST" });
                            if (response.ok) {
                                this.showToast(t('backup_created'));
                                loadBackupList();
                            }
                        } catch (error) {
                            this.showToast(t('backup_fail'), 'error');
                        }
                    });

                    modal.querySelector("#ps-restore-backup-btn").addEventListener("click", () => {
                        const backupSelect = modal.querySelector("#ps-backup-select");
                        if (!backupSelect || !backupSelect.value) {
                            this.showToast(t('select_backup_file'), 'warning');
                            return;
                        }
                        const filename = backupSelect.value;
                        this.showConfirmModal(t('restore_confirm'), async () => {
                            try {
                                const response = await api.fetchApi("/prompt_selector/backup/restore", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ filename: filename })
                                });
                                if (response.ok) {
                                    this.showToast(t('restore_success_refreshing'));
                                    // Reload data
                                    const data = await api.fetchApi("/prompt_selector/data").then(r => r.json());
                                    this.promptData = data;
                                    currentLanguage = this.promptData.settings?.language || "zh-CN";
                                    this.updateCategoryDropdown();
                                    this.renderContent();
                                    updateUIText(this);
                                    closeModal();
                                }
                            } catch (error) {
                                this.showToast(t('restore_fail'), 'error');
                            }
                        });
                    });

                    // Buttons
                    const closeModal = () => modal.remove();
                    modal.querySelector("#ps-settings-cancel").addEventListener("click", closeModal);
                    modal.querySelector("#ps-settings-save").addEventListener("click", () => {
                        const newLang = langSelect.value;
                        if (currentLanguage !== newLang) {
                            this.promptData.settings.language = newLang;
                            currentLanguage = newLang;
                            updateUIText(this);
                        }

                        this.promptData.settings.save_selection = saveSelectionCheckbox.checked;
                        this.promptData.settings.auto_backup = autoBackupCheckbox.checked;
                        this.promptData.settings.max_backups = parseInt(maxBackupsInput.value, 10) || 10;

                        this.saveData();
                        this.showToast(t('save'));
                        closeModal();
                    });
                };

                // --- 新增的管理功能方法 ---

                this.sortPrompts = (prompts) => {
                    switch (this.currentSortBy) {
                        case 'alphabetical':
                            prompts.sort((a, b) => {
                                const result = a.alias.localeCompare(b.alias);
                                return this.currentSortOrder === 'desc' ? -result : result;
                            });
                            break;
                        case 'created_at':
                        default:
                            prompts.sort((a, b) => {
                                const dateA = new Date(a.created_at || 0);
                                const dateB = new Date(b.created_at || 0);
                                return this.currentSortOrder === 'desc' ? dateB - dateA : dateA - dateB;
                            });
                            break;
                    }

                    // 收藏的提示词优先显示
                    if (this.promptData.settings?.show_favorites_first) {
                        prompts.sort((a, b) => {
                            if (a.favorite && !b.favorite) return -1;
                            if (!a.favorite && b.favorite) return 1;
                            return 0;
                        });
                    }
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
                            // 更新本地数据
                            const category = this.promptData.categories.find(c => c.name === categoryName);
                            if (category) {
                                const prompt = category.prompts.find(p => p.id === promptId);
                                if (prompt) {
                                    prompt.favorite = !prompt.favorite;
                                }
                            }
                            // 重新渲染列表
                            const modal = document.querySelector('.ps-library-modal');
                            if (modal) {
                                const renderPromptList = modal.renderPromptList;
                                if (renderPromptList) renderPromptList(categoryName);
                            }
                        }
                    } catch (error) {
                        console.error("切换收藏状态失败:", error);
                    }
                };

                this.deletePrompt = async (categoryName, promptId) => {
                    try {
                        const response = await api.fetchApi("/prompt_selector/prompts/batch_delete", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ category: categoryName, prompt_ids: [promptId] })
                        });

                        if (response.ok) {
                            // 更新本地数据
                            const category = this.promptData.categories.find(c => c.name === categoryName);
                            if (category) {
                                category.prompts = category.prompts.filter(p => p.id !== promptId);
                            }
                            // 重新渲染列表
                            const modal = document.querySelector('.ps-library-modal');
                            if (modal) {
                                const renderPromptList = modal.renderPromptList;
                                if (renderPromptList) renderPromptList(categoryName);
                            }
                        }
                    } catch (error) {
                        console.error("删除提示词失败:", error);
                    }
                };

                this.reorderPrompts = async (categoryName, fromIndex, toIndex) => {
                    const category = this.promptData.categories.find(c => c.name === categoryName);
                    if (!category) return;

                    // 重新排序本地数据
                    const prompts = category.prompts;
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
                    } catch (error) {
                        console.error("更新排序失败:", error);
                    }
                };


                this.updateBatchControls = () => {
                    const modal = document.querySelector('.ps-library-modal');
                    if (!modal) return;

                    const batchControls = modal.querySelector('.ps-batch-controls');
                    const selectedCount = this.selectedForBatch.size;

                    if (selectedCount > 0) {
                        batchControls.style.display = 'flex';
                        const deleteBtn = modal.querySelector('#ps-batch-delete-btn');
                        const moveBtn = modal.querySelector('#ps-batch-move-btn');
                        deleteBtn.textContent = `${t('batch_delete')} (${selectedCount})`;
                        moveBtn.textContent = `${t('batch_move')} (${selectedCount})`;
                    } else {
                        batchControls.style.display = 'none';
                    }
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

                this.showToast = (message, type = 'success') => {
                    const toast = document.createElement("div");
                    toast.className = `ps-toast ps-toast-${type}`;
                    toast.textContent = message;
                    document.body.appendChild(toast);

                    setTimeout(() => {
                        toast.classList.add('show');
                    }, 10);

                    setTimeout(() => {
                        toast.classList.remove('show');
                        setTimeout(() => {
                            toast.remove();
                        }, 300);
                    }, 3000);
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
                    }
                    .prompt-selector-header, .prompt-selector-footer {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 6px 8px;
                        flex-shrink: 0;
                        background-color: #222222; /* Header/footer background */
                        border-bottom: 1px solid #000;
                    }
                    .prompt-selector-footer {
                        border-top: 1px solid #000;
                        border-bottom: none;
                    }
                    .header-controls-left, .header-controls-right,
                    .footer-controls-left, .footer-controls-right {
                        display: flex;
                        align-items: center;
                        gap: 8px;
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
                        gap: 6px;
                        background-color: #3c3c3c;
                        color: #e0e0e0;
                        border: 1px solid #555;
                        border-radius: 8px;
                        cursor: pointer;
                        padding: 8px 14px;
                        font-size: 14px;
                        font-weight: 600;
                        transition: all 0.2s ease-in-out;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    }
                    .ps-btn:hover {
                        background-color: #4a4a4a;
                        border-color: #DA70D6;
                        box-shadow: 0 0 8px rgba(218, 112, 214, 0.5);
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
                       background: linear-gradient(145deg, #8a2be2, #9932cc);
                       border: none;
                       color: white;
                    }
 
                    #ps-library-btn:hover {
                       background: linear-gradient(145deg, #9b30ff, #a940dd);
                       box-shadow: 0 0 12px rgba(153, 50, 204, 0.8);
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
                       border-color: #9932CC;
                       box-shadow: 0 0 8px rgba(153, 50, 204, 0.7);
                       color: #DA70D6;
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
                        padding: 8px 10px;
                        cursor: pointer;
                        border-radius: 8px;
                        background-color: #282828;
                        border: 1px solid #333;
                        transition: background-color 0.2s;
                        position: relative;
                        overflow: hidden;
                    }
                    .prompt-item::before {
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
                        background-color: #3a2d4a; /* Darker purple background */
                        border-color: #9932CC;
                        color: white;
                    }
                    .prompt-item.selected::before {
                        background-color: #9932CC;
                    }
                    .prompt-item span {
                        flex-grow: 1;
                    }
                    .ps-item-edit-btn, .ps-item-delete-btn {
                        background: none;
                        border: none;
                        color: #888;
                        cursor: pointer;
                        padding: 2px;
                        margin-left: 8px;
                        display: none; /* Hidden by default */
                    }
                    .prompt-item:hover .ps-item-edit-btn,
                    .prompt-item:hover .ps-item-delete-btn {
                        display: block; /* Show on hover */
                    }
                    .ps-item-edit-btn:hover {
                        color: #DA70D6;
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
                    .ps-tooltip strong { color: #9932CC; }

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
                    .ps-category-menu li {
                        padding: 8px 12px;
                        cursor: pointer;
                        border-radius: 4px;
                    }
                    .ps-category-menu li:hover {
                        background-color: #9932CC;
                        color: white;
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
                    .ps-category-tree {
                        flex-grow: 1;
                        overflow-y: auto;
                        margin-top: 8px;
                    }
                    .ps-category-tree ul {
                        list-style: none;
                        padding-left: 15px;
                    }
                    .ps-category-tree li {
                        padding: 4px 0;
                        cursor: pointer;
                        color: #ccc;
                    }
                    .ps-category-tree li span {
                        transition: color 0.2s;
                    }
                    .ps-category-tree li span:hover {
                        color: #DA70D6; /* Lighter Orchid */
                    }
                    .ps-category-tree li.parent > span {
                        font-weight: bold;
                    }
                    .ps-category-tree li.parent > span::before {
                        content: '▶';
                        font-size: 10px;
                        transition: transform 0.2s;
                        display: inline-block;
                        width: 1.5em;
                        text-align: center;
                    }
                    .ps-category-tree li.parent.open > span::before {
                        transform: rotate(90deg);
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
                        border-color: #9932CC;
                    }
                    .ps-menu-footer button:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
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
                       padding: 0 15px 10px;
                       gap: 10px;
                   }

                   .ps-library-left-panel, .ps-library-right-panel {
                       background-color: #1B1B1B;
                       border-radius: 8px;
                       padding: 10px;
                       overflow-y: auto;
                   }

                   .ps-library-left-panel {
                       width: 35%;
                       flex-shrink: 0;
                       min-width: 150px;
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

                   .ps-search-container {
                       display: flex;
                       gap: 8px;
                       align-items: center;
                   }

                   .ps-filter-bar {
                       display: flex;
                       justify-content: space-between;
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
                       border-bottom: 1px solid #333;
                   }

                   .ps-category-header h4, .ps-prompt-header h4 {
                       margin: 0;
                       color: #eee;
                       font-size: 14px;
                   }

                   .ps-prompt-controls {
                       display: flex;
                       gap: 8px;
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
                       padding: 10px;
                       cursor: pointer;
                       transition: all 0.2s;
                   }

                   .ps-prompt-list-item:hover {
                       background-color: #303030;
                       border-color: #444;
                   }

                   .ps-prompt-item-header {
                       display: flex;
                       justify-content: space-between;
                       align-items: center;
                       margin-bottom: 8px;
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
                       cursor: pointer;
                   }

                   .ps-prompt-list-item-name {
                       font-weight: bold;
                       color: #eee;
                       margin-bottom: 4px;
                   }

                   .ps-prompt-list-item-preview {
                       color: #ccc;
                       font-size: 13px;
                       line-height: 1.4;
                       margin-bottom: 6px;
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

                   .ps-favorite-btn.favorite svg {
                       fill: #FFD700;
                   }

                   .ps-batch-checkbox {
                       accent-color: #9932CC;
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
                        margin-top: 10px;
                   }
                   .ps-settings-tabs {
                        display: flex;
                        border-bottom: 1px solid #444;
                        margin-bottom: 15px;
                   }
                   .ps-tab-btn {
                        background: none;
                        border: none;
                        color: #888;
                        padding: 10px 15px;
                        cursor: pointer;
                        font-size: 14px;
                   }
                   .ps-tab-btn.active {
                        color: #DA70D6;
                        border-bottom: 2px solid #DA70D6;
                   }
                   .ps-settings-pane {
                        display: none;
                   }
                   .ps-settings-pane.active {
                        display: block;
                   }
                   .ps-settings-tabs {
                        display: flex;
                        border-bottom: 1px solid #444;
                        margin-bottom: 15px;
                   }
                   .ps-tab-btn {
                        background: none;
                        border: none;
                        color: #888;
                        padding: 10px 15px;
                        cursor: pointer;
                        font-size: 14px;
                   }
                   .ps-tab-btn.active {
                        color: #DA70D6;
                        border-bottom: 2px solid #DA70D6;
                   }
                   .ps-settings-pane {
                        display: none;
                   }
                   .ps-settings-pane.active {
                        display: block;
                   }
                   .ps-settings-tabs {
                        display: flex;
                        border-bottom: 1px solid #444;
                        margin-bottom: 15px;
                   }
                   .ps-tab-btn {
                        background: none;
                        border: none;
                        color: #888;
                        padding: 10px 15px;
                        cursor: pointer;
                        font-size: 14px;
                   }
                   .ps-tab-btn.active {
                        color: #DA70D6;
                        border-bottom: 2px solid #DA70D6;
                   }
                   .ps-settings-pane {
                        display: none;
                   }
                   .ps-settings-pane.active {
                        display: block;
                   }
                   .ps-settings-tabs {
                        display: flex;
                        border-bottom: 1px solid #444;
                        margin-bottom: 15px;
                   }
                   .ps-tab-btn {
                        background: none;
                        border: none;
                        color: #888;
                        padding: 10px 15px;
                        cursor: pointer;
                        font-size: 14px;
                   }
                   .ps-tab-btn.active {
                        color: #DA70D6;
                        border-bottom: 2px solid #DA70D6;
                   }
                   .ps-settings-pane {
                        display: none;
                   }
                   .ps-settings-pane.active {
                        display: block;
                   }
                   .ps-settings-tabs {
                        display: flex;
                        border-bottom: 1px solid #444;
                        margin-bottom: 15px;
                   }
                   .ps-tab-btn {
                        background: none;
                        border: none;
                        color: #888;
                        padding: 10px 15px;
                        cursor: pointer;
                        font-size: 14px;
                   }
                   .ps-tab-btn.active {
                        color: #DA70D6;
                        border-bottom: 2px solid #DA70D6;
                   }
                   .ps-settings-pane {
                        display: none;
                   }
                   .ps-settings-pane.active {
                        display: block;
                   }
                   .ps-edit-modal .ps-modal-content {
                       background-color: #2a2a2a;
                       border: 1px solid #444;
                       border-radius: 12px;
                       padding: 20px;
                       color: #eee;
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
                       background-color: #9932CC;
                       color: white;
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
                       accent-color: #9932CC;
                   }

                   /* 批量操作激活状态 */
                   .ps-btn.active {
                       background-color: #9932CC;
                       color: white;
                       border-color: #9932CC;
                   }

                   /* 拖拽样式 */
                   .ps-prompt-list-item.dragging {
                       opacity: 0.5;
                       transform: rotate(2deg);
                   }

                   .ps-prompt-list-item.drag-over {
                       border-color: #9932CC;
                       background-color: #3a2d4a;
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
                       border-top: 3px solid #9932CC;
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

                   .ps-category-tree li {
                       transition: all 0.2s ease;
                   }

                   .ps-category-tree li ul {
                       transition: all 0.3s ease;
                       overflow: hidden;
                   }

                   .ps-category-tree li.parent > span::before {
                       transition: transform 0.2s ease;
                   }

                   .ps-tree-item {
                       padding: 6px 8px;
                       border-radius: 4px;
                       transition: all 0.2s ease;
                       cursor: pointer;
                   }

                   .ps-tree-item:hover {
                       background-color: #333;
                   }

                   .ps-tree-item.selected {
                       background-color: #9932CC;
                       color: white;
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
                       color: #9932CC;
                   }

                   .ps-tooltip p {
                       margin: 0;
                       color: #ccc;
                       font-size: 13px;
                       line-height: 1.4;
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
                   input:focus,
                   textarea:focus,
                   select:focus {
                       outline: 2px solid #9932CC;
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
                    /* Toast Notification */
                    .ps-toast {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        background-color: #333;
                        color: white;
                        padding: 12px 20px;
                        border-radius: 8px;
                        z-index: 2000;
                        opacity: 0;
                        transform: translateY(-20px);
                        transition: opacity 0.3s ease, transform 0.3s ease;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.5);
                        font-size: 14px;
                    }
                    .ps-toast.show {
                        opacity: 1;
                        transform: translateY(0);
                    }
                    .ps-toast.ps-toast-success {
                        background-color: #28a745;
                    }
                    .ps-toast.ps-toast-error {
                        background-color: #dc3545;
                    }
                    .ps-toast.ps-toast-warning {
                        background-color: #ffc107;
                        color: #212529;
                    }
                    .ps-highlight-new {
                        animation: ps-highlight-new-item 2s ease-out;
                    }
                    @keyframes ps-highlight-new-item {
                        0% { background-color: #9932CC; }
                        100% { background-color: #282828; }
                    }
                `;
                document.head.appendChild(style);
            }
        }
    },
});