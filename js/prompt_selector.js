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
                    "add_prompt": "新增提示词", "delete_selected": "删除选中", "import": "导入", "export": "导出", "settings": "设置",
                    "category": "类别", "single_select": "单选", "multi_select": "多选", "loading": "加载中...",
                    "no_prompts": "此分类下没有提示词。", "load_error": "加载数据失败!", "save_error": "保存数据失败!",
                    "edit_prompt": "编辑提示词", "alias": "备注名", "full_prompt": "完整提示词", "preview_image": "预览图",
                    "image_path_placeholder": "图片路径或URL", "save": "保存", "cancel": "取消",
                    "open_category_menu": "将在这里打开层级分类菜单！", "new_category_prompt": "输入新的分类名称 (可用'/'创建层级):",
                    "category_exists": "该分类名称已存在！", "delete_default_category_alert": "不能删除默认分类！",
                    "delete_category_confirm": "确定要删除分类 \"{category}\" 吗？此操作不可撤销。",
                    "language": "语言", "output_format": "输出格式", "separator": "间隔符", "separator_placeholder": "多选模式下的间隔符"
                },
                "en-US": {
                    "add_prompt": "Add Prompt", "delete_selected": "Delete Selected", "import": "Import", "export": "Export", "settings": "Settings",
                    "category": "Category", "single_select": "Single", "multi_select": "Multi", "loading": "Loading...",
                    "no_prompts": "No prompts in this category.", "load_error": "Failed to load data!", "save_error": "Failed to save data!",
                    "edit_prompt": "Edit Prompt", "alias": "Alias", "full_prompt": "Full Prompt", "preview_image": "Preview Image",
                    "image_path_placeholder": "Image path or URL", "save": "Save", "cancel": "Cancel",
                    "open_category_menu": "Hierarchical category menu will open here!", "new_category_prompt": "Enter new category name (use '/' for hierarchy):",
                    "category_exists": "Category name already exists!", "delete_default_category_alert": "Cannot delete the default category!",
                    "delete_category_confirm": "Are you sure you want to delete category \"{category}\"?",
                    "language": "Language", "output_format": "Output Format", "separator": "Separator", "separator_placeholder": "Separator for multi-select mode"
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

                root.querySelector("#ps-add-btn").title = t('add_prompt');
                root.querySelector("#ps-remove-btn").title = t('delete_selected');

                const header = root.querySelector(".prompt-selector-header");
                const importBtn = header.querySelector("#ps-import-btn");
                if (importBtn) {
                    const importSpan = importBtn.querySelector('span');
                    if (importSpan) importSpan.textContent = t('import');
                }

                const exportBtn = header.querySelector("#ps-export-btn");
                if (exportBtn) {
                    const exportSpan = exportBtn.querySelector('span');
                    if (exportSpan) exportSpan.textContent = t('export');
                }

                const settingsBtn = header.querySelector("#ps-settings-btn");
                if (settingsBtn) {
                    const settingsSpan = settingsBtn.querySelector('span');
                    if (settingsSpan) settingsSpan.textContent = t('settings');
                }

                const categoryBtn = header.querySelector("#ps-category-btn");
                if (categoryBtn) {
                    categoryBtn.textContent = `${t('category')}: ${node.selectedCategory}`;
                }

                root.querySelector("#ps-single-select-label").textContent = t('single_select');
                root.querySelector("#ps-multi-select-label").textContent = t('multi_select');
            };

            // 节点创建时的回调
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                onNodeCreated?.apply(this, arguments);

                console.log("提示词选择器节点已创建！");

                this.promptData = null; // 用于存储从后端获取的数据
                this.selectedCategory = "default";
                this.selectionMode = "single"; // 'single' or 'multi'
                this.selectedPrompts = new Set(); // 用于存储多选模式下的选中项

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
                contentArea.innerHTML = `<p style="color: #555; text-align: center; margin-top: 20px;">点击左上角书本图标打开提示词库</p>`;

                // --- 顶部控制栏 ---
                const header = document.createElement("div");
                header.className = "prompt-selector-header";
                header.innerHTML = `
                    <div class="header-controls-left">
                        <button class="ps-btn ps-btn-icon" id="ps-library-btn" title="打开提示词库">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-book"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0" /><path d="M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0" /><path d="M3 6l0 13" /><path d="M12 6l0 13" /><path d="M21 6l0 13" /></svg>
                        </button>
                    </div>
                    <div class="header-controls-right">
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

                // --- 底部控制栏 (旧版，将被移除) ---
                const footer = document.createElement("div");
                footer.className = "prompt-selector-footer";
                // 清空内容，因为所有操作都在模态框中
                footer.style.display = 'none';

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
                        this.renderContent();
                        updateUIText(this);
                    })
                    .catch(error => {
                        console.error("加载提示词数据失败:", error);
                        contentArea.innerHTML = `<p style="color: #c53939; text-align: center;">${t('load_error')}</p>`;
                    });

                // --- 事件监听 (旧版，将被移除或修改) ---

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

                const settingsBtn = header.querySelector("#ps-settings-btn");
                settingsBtn.addEventListener("click", () => {
                    this.showSettingsModal();
                });


                const importBtn = header.querySelector("#ps-import-btn");
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
                                alert("导入成功！正在刷新...");
                                // 重新加载数据
                                const data = await api.fetchApi("/prompt_selector/data").then(r => r.json());
                                this.promptData = data;
                                currentLanguage = this.promptData.settings?.language || "zh-CN";
                                this.updateCategoryDropdown();
                                this.renderContent();
                                updateUIText(this);
                            } else {
                                const error = await response.json();
                                throw new Error(error.error || "导入失败");
                            }
                        } catch (error) {
                            alert(`导入失败: ${error.message}`);
                        }
                    };
                    input.click();
                });

                const exportBtn = header.querySelector("#ps-export-btn");
                exportBtn.addEventListener("click", () => {
                    window.open("/prompt_selector/export", "_blank");
                });


                // --- 核心方法 ---
                this.updateCategoryDropdown = () => {
                    // 这个函数现在可能不再需要，或者需要更新以反映新的UI状态
                    // 暂时保留，但内容清空
                };

                this.renderContent = () => {
                    // 旧的渲染逻辑，不再需要
                };

                this.updateOutput = () => {
                    const separator = this.promptData.settings?.separator || ", ";
                    const outputString = Array.from(this.selectedPrompts).join(separator);
                    outputWidget.value = outputString;
                    console.log("Output updated:", outputString);
                };

                this.saveData = () => {
                    api.fetchApi("/prompt_selector/data", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(this.promptData),
                    }).then(response => {
                        if (!response.ok) {
                            alert("保存数据失败!");
                        }
                    }).catch(error => {
                        console.error("保存数据失败:", error);
                        alert("保存数据失败!");
                    });
                };

                this.showEditModal = (prompt) => {
                    // 防止重复创建
                    if (document.querySelector(".ps-edit-modal")) return;

                    const modal = document.createElement("div");
                    modal.className = "ps-edit-modal";
                    modal.innerHTML = `
                        <div class="ps-modal-content">
                            <h3>编辑提示词</h3>
                            <label>备注名:</label>
                            <input type="text" id="ps-edit-alias" value="${prompt.alias}">
                            <label>完整提示词:</label>
                            <textarea id="ps-edit-prompt" rows="5">${prompt.prompt}</textarea>
                            <label>预览图:</label>
                            <input type="text" id="ps-edit-image" value="${prompt.image || ''}" placeholder="图片路径或URL">
                            <div class="ps-modal-buttons">
                                <button id="ps-edit-save">保存</button>
                                <button id="ps-edit-cancel">取消</button>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(modal);

                    const closeModal = () => modal.remove();

                    modal.querySelector("#ps-edit-cancel").addEventListener("click", closeModal);
                    modal.querySelector("#ps-edit-save").addEventListener("click", () => {
                        // 更新数据
                        prompt.alias = modal.querySelector("#ps-edit-alias").value;
                        prompt.prompt = modal.querySelector("#ps-edit-prompt").value;
                        prompt.image = modal.querySelector("#ps-edit-image").value;

                        this.saveData();
                        this.renderContent();
                        closeModal();
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
                        <div class="ps-library-content">
                            <div class="ps-library-header">
                                <h3>提示词库</h3>
                                <button id="ps-library-close" class="ps-btn ps-btn-icon" title="关闭">&times;</button>
                            </div>
                            <div class="ps-library-search">
                                <input type="text" id="ps-library-search-input" placeholder="搜索类别或提示词...">
                            </div>
                            <div class="ps-library-body">
                                <div class="ps-library-left-panel">
                                    <!-- Category Tree will go here -->
                                </div>
                                <div class="ps-library-right-panel">
                                    <!-- Prompt List will go here -->
                                    <p style="color:#555;">提示词列表</p>
                                </div>
                            </div>
                            <div class="ps-library-footer">
                                <div class="footer-left">
                                    <button class="ps-btn" id="ps-new-category-btn">+ 新建类别</button>
                                </div>
                                <div class="footer-right">
                                    <button class="ps-btn" id="ps-save-as-btn">另存为...</button>
                                    <button class="ps-btn" id="ps-update-btn">更新</button>
                                    <button class="ps-btn" id="ps-quick-save-btn">快速保存...</button>
                                </div>
                            </div>
                        </div>
                    `;

                    document.body.appendChild(modal);

                    const closeModal = () => modal.remove();
                    modal.querySelector("#ps-library-close").addEventListener("click", closeModal);
                    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

                    const searchInput = modal.querySelector('#ps-library-search-input');
                    const leftPanel = modal.querySelector('.ps-library-left-panel');

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
                    const renderPromptList = (categoryName, searchTerm = '') => {
                        rightPanel.innerHTML = ''; // 清空
                        const category = this.promptData.categories.find(c => c.name === categoryName);

                        let promptsToShow = [];
                        if (category) {
                            promptsToShow = category.prompts;
                        }

                        if (searchTerm) {
                            const lowerCaseSearchTerm = searchTerm.toLowerCase();
                            // 如果有搜索词，则从所有提示词中过滤
                            if (!categoryName) {
                                promptsToShow = this.promptData.categories.flatMap(c => c.prompts);
                            }
                            promptsToShow = promptsToShow.filter(p =>
                                p.alias.toLowerCase().includes(lowerCaseSearchTerm) ||
                                p.prompt.toLowerCase().includes(lowerCaseSearchTerm)
                            );
                        }

                        if (!promptsToShow.length) {
                            rightPanel.innerHTML = `<p style="color: #555; text-align: center;">没有匹配的提示词。</p>`;
                            return;
                        }

                        const list = document.createElement("ul");
                        list.className = "ps-prompt-list";
                        promptsToShow.forEach(p => {
                            const item = document.createElement("li");
                            item.className = "ps-prompt-list-item";
                            item.innerHTML = `
                                <div class="ps-prompt-list-item-name">${p.alias}</div>
                                <div class="ps-prompt-list-item-preview">${p.prompt}</div>
                            `;

                            // 单击加载
                            item.addEventListener('click', () => {
                                const outputWidget = this.widgets.find(w => w.name === "selected_prompts");
                                outputWidget.value = p.prompt;
                                const textWidget = this.widgets.find(w => w.type === 'text' || w.type === 'string');
                                if (textWidget) {
                                    textWidget.value = p.prompt;
                                }
                                this.setDirtyCanvas(true, true);
                                closeModal();
                            });

                            list.appendChild(item);
                        });
                        rightPanel.appendChild(list);
                    };

                    const categoryTree = buildCategoryTree(this.promptData.categories);
                    const treeElement = renderCategoryTree(categoryTree, leftPanel);
                    leftPanel.innerHTML = ''; // 清空占位符
                    leftPanel.appendChild(treeElement);

                    // 默认渲染第一个分类的提示词
                    if (this.promptData.categories.length > 0) {
                        this.selectedCategory = this.promptData.categories[0].name;
                        const firstItem = leftPanel.querySelector('.ps-tree-item');
                        if (firstItem) {
                            firstItem.classList.add('selected');
                            renderPromptList(this.selectedCategory);
                        }
                    }

                    // --- 搜索逻辑 ---
                    searchInput.addEventListener('input', () => {
                        const searchTerm = searchInput.value.toLowerCase();
                        let selectedCategoryExists = true;

                        // 过滤树
                        const allTreeItems = leftPanel.querySelectorAll('li');
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

                    // --- 底部按钮逻辑 ---
                    const newCategoryBtn = modal.querySelector('#ps-new-category-btn');
                    newCategoryBtn.addEventListener('click', () => {
                        const newName = prompt("输入新的分类名称 (可用'/'创建层级):");
                        if (!newName || !newName.trim()) return;
                        const finalName = newName.trim();
                        if (this.promptData.categories.some(c => c.name === finalName)) {
                            alert("该分类名称已存在！");
                            return;
                        }
                        const newCategory = { name: finalName, prompts: [] };
                        this.promptData.categories.push(newCategory);
                        this.saveData();

                        // 刷新树
                        const categoryTree = buildCategoryTree(this.promptData.categories);
                        const treeElement = renderCategoryTree(categoryTree, leftPanel);
                        leftPanel.innerHTML = '';
                        leftPanel.appendChild(treeElement);
                    });

                    const quickSaveBtn = modal.querySelector('#ps-quick-save-btn');
                    quickSaveBtn.addEventListener('click', () => {
                        const input = prompt("输入类别路径和名称 (格式: 类别/子类别:提示词名称)");
                        if (!input || !input.trim()) return;

                        const parts = input.split(':');
                        const path = (parts.length > 1 ? parts[0] : this.selectedCategory).trim();
                        const alias = (parts.length > 1 ? parts[1] : parts[0]).trim();

                        if (!alias) {
                            alert("提示词名称不能为空！");
                            return;
                        }

                        let category = this.promptData.categories.find(c => c.name === path);
                        if (!category) {
                            category = { name: path, prompts: [] };
                            this.promptData.categories.push(category);
                        }

                        const textWidget = this.widgets.find(w => w.type === 'text' || w.type === 'string');
                        const promptText = textWidget ? textWidget.value : this.widgets.find(w => w.name === "selected_prompts").value;

                        category.prompts.push({ alias: alias, prompt: promptText, image: "" });
                        this.saveData();
                        renderPromptList(this.selectedCategory);
                        alert(`已保存到 "${path}"`);
                    });
                };

                this.showSettingsModal = () => {
                    if (document.querySelector(".ps-settings-modal")) return;

                    const modal = document.createElement("div");
                    modal.className = "ps-edit-modal ps-settings-modal"; // Re-use styles
                    modal.innerHTML = `
                        <div class="ps-modal-content" style="width: 600px; max-width: 90vw;">
                            <div class="ps-settings-container">
                                <div class="ps-settings-sidebar">
                                    <button class="active" data-pane="language">${t('language')}</button>
                                    <button data-pane="output">${t('output_format')}</button>
                                </div>
                                <div class="ps-settings-main">
                                    <div class="ps-settings-pane active" data-pane="language">
                                        <h3>${t('language')}</h3>
                                        <select id="ps-lang-select">
                                            <option value="zh-CN">简体中文</option>
                                            <option value="en-US">English</option>
                                        </select>
                                    </div>
                                    <div class="ps-settings-pane" data-pane="output">
                                        <h3>${t('output_format')}</h3>
                                        <label>${t('separator')}:</label>
                                        <input type="text" id="ps-separator-input" placeholder="${t('separator_placeholder')}">
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
                    langSelect.value = currentLanguage;

                    const separatorInput = modal.querySelector("#ps-separator-input");
                    separatorInput.value = this.promptData.settings?.separator || ", ";

                    // Tab switching
                    const tabs = modal.querySelectorAll(".ps-settings-sidebar button");
                    const panes = modal.querySelectorAll(".ps-settings-pane");
                    tabs.forEach(tab => {
                        tab.addEventListener("click", () => {
                            tabs.forEach(t => t.classList.remove("active"));
                            tab.classList.add("active");
                            panes.forEach(p => {
                                p.style.display = p.dataset.pane === tab.dataset.pane ? "block" : "none";
                            });
                        });
                    });

                    // Buttons
                    const closeModal = () => modal.remove();
                    modal.querySelector("#ps-settings-cancel").addEventListener("click", closeModal);
                    modal.querySelector("#ps-settings-save").addEventListener("click", () => {
                        this.promptData.settings.language = langSelect.value;
                        this.promptData.settings.separator = separatorInput.value;

                        const newLang = langSelect.value;
                        if (currentLanguage !== newLang) {
                            this.promptData.settings.language = newLang;
                            currentLanguage = newLang;
                            updateUIText(this);
                        }

                        this.saveData();
                        alert(t('save')); // 使用 t() 函数
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

                    /* Buttons */
                    .ps-btn {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 6px;
                        background-color: #303030;
                        color: #d0d0d0;
                        border: 1px solid #3a3a3a;
                        border-radius: 6px;
                        cursor: pointer;
                        padding: 6px 12px;
                        font-size: 13px;
                        font-weight: 500;
                        transition: background-color 0.2s, border-color 0.2s, box-shadow 0.2s;
                    }
                    .ps-btn:hover {
                        background-color: #383838;
                        border-color: #9932CC;
                        box-shadow: 0 0 5px rgba(153, 50, 204, 0.5);
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
                    }
                    .ps-btn-icon {
                        padding: 6px;
                        width: 32px;
                        height: 32px;
                    }
                    .ps-btn-icon svg {
                        width: 20px;
                        height: 20px;
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
                        transition: background-color 0.2s, border-color 0.2s;
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
                        border-color: #444;
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
                        margin-left: 15px;
                    }
                    .prompt-item input[type="checkbox"] {
                        margin-left: 10px;
                        margin-right: 4px;
                        min-width: 16px;
                        min-height: 16px;
                        accent-color: #9932CC;
                    }

                    .ps-mode-switch span, .ps-mode-switch label {
                        vertical-align: middle;
                    }

                    /* Switch toggle styles */
                    .ps-switch { position: relative; display: inline-block; width: 40px; height: 22px; margin: 0 6px; }
                    .ps-switch input { opacity: 0; width: 0; height: 0; }
                    .ps-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #444; transition: .4s; border-radius: 22px; }
                    .ps-slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
                    input:checked + .ps-slider { background-color: #9932CC; }
                    input:checked + .ps-slider:before { transform: translateX(18px); }

                    /* Tooltip Styles */
                    .ps-tooltip strong { color: #9932CC; }

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
                `;
                document.head.appendChild(style);
            }
        }
    },
});