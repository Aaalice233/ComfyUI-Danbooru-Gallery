import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

// --- 设置对话框部分 (保持不变) ---
function createSettingsDialog(node) {
    // ... (代码与之前版本相同，此处省略以保持简洁)
    const dialog = document.createElement("div");
    dialog.className = "danbooru-gallery-settings-dialog";

    dialog.innerHTML = `
        <div class="danbooru-gallery-settings-content">
            <h2>人物特征替换节点设置 (Character Feature Swap Settings)</h2>
            <p>配置用于特征替换的LLM API。推荐使用 <a href="https://openrouter.ai" target="_blank">OpenRouter</a>。</p>
            <label for="cfs-api-url">API URL:</label>
            <input type="text" id="cfs-api-url" name="api_url">
            <label for="cfs-api-key">API Key:</label>
            <input type="password" id="cfs-api-key" name="api_key">
            <label for="cfs-model">模型 (Model):</label>
            <input type="text" id="cfs-model" name="model">
            <label for="cfs-custom-prompt">自定义AI提示词 (Custom Prompt):</label>
            <textarea id="cfs-custom-prompt" name="custom_prompt" rows="6"></textarea>
            <p class="description">使用 <code>{original_prompt}</code> 和 <code>{target_features}</code> 作为占位符。</p>
            <div class="danbooru-gallery-settings-buttons">
                <button id="cfs-save-settings">保存</button>
                <button id="cfs-close-dialog">关闭</button>
            </div>
        </div>
    `;

    document.body.appendChild(dialog);

    const apiUrlInput = dialog.querySelector("#cfs-api-url");
    const apiKeyInput = dialog.querySelector("#cfs-api-key");
    const modelInput = dialog.querySelector("#cfs-model");
    const customPromptInput = dialog.querySelector("#cfs-custom-prompt");

    api.fetchApi("/character_swap/llm_settings")
        .then(response => response.json())
        .then(settings => {
            apiUrlInput.value = settings.api_url || "";
            apiKeyInput.value = settings.api_key || "";
            modelInput.value = settings.model || "";
            customPromptInput.value = settings.custom_prompt || "";
        });

    dialog.querySelector("#cfs-save-settings").addEventListener("click", () => {
        const newSettings = {
            api_url: apiUrlInput.value,
            api_key: apiKeyInput.value,
            model: modelInput.value,
            custom_prompt: customPromptInput.value,
        };

        api.fetchApi("/character_swap/llm_settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newSettings),
        }).then(response => {
            if (response.ok) {
                alert("设置已保存！");
                dialog.remove();
            } else {
                alert("保存失败: " + response.statusText);
            }
        });
    });

    dialog.querySelector("#cfs-close-dialog").addEventListener("click", () => dialog.remove());
}


// --- 标签选择模态框 ---
function createTagSelectionModal(node, allTagsData, onTagSelected) {
    const modal = document.createElement("div");
    modal.className = "cfs-tag-modal";

    modal.innerHTML = `
        <div class="cfs-tag-modal-content">
            <h2>选择标签</h2>
            <input type="text" class="cfs-tag-modal-search-input" placeholder="搜索标签...">
            <div class="cfs-tag-modal-available-tags"></div>
            <div class="cfs-tag-modal-buttons">
                <button class="cfs-tag-modal-close-button">关闭</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const searchInput = modal.querySelector(".cfs-tag-modal-search-input");
    const availableTagsContainer = modal.querySelector(".cfs-tag-modal-available-tags");
    const closeButton = modal.querySelector(".cfs-tag-modal-close-button");

    const renderModalTags = (filter = "") => {
        availableTagsContainer.innerHTML = "";
        filter = filter.toLowerCase();
        const currentSelected = Array.from(node.wrapper.querySelector(".cfs-selected-tags-container").querySelectorAll(".cfs-tag-label")).map(el => el.textContent);

        const filteredTags = Object.entries(allTagsData).filter(([tag, translation]) => {
            const fullText = `${tag} [${translation}]`;
            return fullText.toLowerCase().includes(filter);
        });

        if (filteredTags.length === 0) {
            availableTagsContainer.textContent = "未找到标签。";
            return;
        }

        for (const [tag, translation] of filteredTags) {
            const fullText = `${tag} [${translation}]`;
            const tagEl = document.createElement("div");
            tagEl.className = "cfs-selectable-tag";
            tagEl.textContent = fullText;

            if (currentSelected.includes(tag)) {
                tagEl.classList.add("selected");
            }

            tagEl.addEventListener("click", () => {
                if (!tagEl.classList.contains("selected")) {
                    onTagSelected(tag);
                    tagEl.classList.add("selected");
                    // No need to re-render modal tags here, it will be closed
                }
            });
            availableTagsContainer.appendChild(tagEl);
        }
    };

    searchInput.addEventListener("input", () => renderModalTags(searchInput.value));
    closeButton.addEventListener("click", () => modal.remove());

    // Initial render
    renderModalTags();
}

// --- 扩展 ComfyUI ---
app.registerExtension({
    name: "Comfy.CharacterFeatureSwap",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "CharacterFeatureSwapNode") {
            const onNodeCreated_orig = nodeType.prototype.onNodeCreated; // Store original before overriding
            nodeType.prototype.onNodeCreated = function () {
                if (onNodeCreated_orig && onNodeCreated_orig !== nodeType.prototype.onNodeCreated) { // Prevent infinite recursion
                    onNodeCreated_orig.apply(this, arguments); // Call original if it exists
                }

                const widgetName = "target_features";
                const widgetIndex = this.widgets.findIndex(w => w.name === widgetName);
                if (widgetIndex === -1) return;

                const originalWidget = this.widgets[widgetIndex];

                // 使用danbooru-gallery的方法彻底隐藏原始小部件
                originalWidget.computeSize = () => [0, -4]; // 让小部件不占空间
                originalWidget.draw = () => { }; // 阻止小部件(包括其标签)被绘制
                originalWidget.type = "hidden"; // 在某些UI模式下隐藏

                let allTagsData = {};

                // --- 创建主容器 ---
                const wrapper = document.createElement("div");
                wrapper.className = "cfs-widget-wrapper";
                wrapper.style.marginBottom = "5px"; // Add some spacing

                // --- 已选标签容器 ---
                const selectedTagsContainer = document.createElement("div");
                selectedTagsContainer.className = "cfs-selected-tags-container";
                wrapper.appendChild(selectedTagsContainer);

                // --- 添加标签按钮 (触发模态框) ---
                const addTagButton = document.createElement("button");
                addTagButton.textContent = "＋";
                addTagButton.className = "cfs-add-tag-button";
                selectedTagsContainer.appendChild(addTagButton); // 将按钮添加到标签容器内部

                // --- 函数: 更新小部件的值 ---
                const updateWidgetValue = () => {
                    const tags = Array.from(selectedTagsContainer.querySelectorAll(".cfs-tag")).map(el => el.textContent.replace("✖", "").trim());
                    // Update the value of the original widget
                    originalWidget.value = tags.join(", ");
                    this.setDirtyCanvas(true, true);
                };

                // --- 函数: 添加一个已选标签的UI元素 ---
                const addSelectedTag = (text) => {
                    text = text.trim();
                    const currentTags = Array.from(selectedTagsContainer.querySelectorAll(".cfs-tag")).map(el => el.textContent.replace("✖", "").trim());
                    if (!currentTags.includes(text) && text) { // Only add if not already present and not empty
                        const tag = document.createElement("div");
                        tag.className = "cfs-tag";

                        const label = document.createElement("span");
                        label.className = "cfs-tag-label";
                        label.textContent = text;
                        tag.appendChild(label);

                        const removeBtn = document.createElement("span");
                        removeBtn.className = "cfs-remove-btn";
                        removeBtn.textContent = "✖";
                        removeBtn.onclick = (e) => {
                            e.stopPropagation();
                            tag.remove();
                            updateWidgetValue();
                        };

                        tag.appendChild(removeBtn);
                        // 将新标签插入到 addTagButton 之前
                        selectedTagsContainer.insertBefore(tag, addTagButton);
                        updateWidgetValue();
                    }
                };

                // --- 事件监听 ---
                addTagButton.addEventListener("click", async () => {
                    if (Object.keys(allTagsData).length === 0) {
                        try {
                            const response = await api.fetchApi("/character_swap/get_all_tags");
                            const data = await response.json();
                            if (data.error) throw new Error(data.error);
                            allTagsData = data;
                        } catch (err) {
                            console.error("无法加载标签:", err);
                            alert("加载标签失败。");
                            return;
                        }
                    }
                    createTagSelectionModal(this, allTagsData, (tag) => {
                        addSelectedTag(tag);
                    });
                });

                // --- 将自定义UI作为新的DOM小部件添加 ---
                this.addDOMWidget(widgetName + "_custom", "div", wrapper);

                // Set initial value from the original widget and render tags
                const initialTags = (originalWidget.value || "").split(",").filter(t => t.trim());
                initialTags.forEach(addSelectedTag);

                // --- 添加调试日志 ---
                console.log("CFS Debug: Wrapper element", wrapper);
                console.log("CFS Debug: Wrapper offsetHeight", wrapper.offsetHeight);
                console.log("CFS Debug: Wrapper computedStyle", getComputedStyle(wrapper));
                console.log("CFS Debug: Selected Tags Container element", selectedTagsContainer);
                console.log("CFS Debug: Selected Tags Container offsetHeight", selectedTagsContainer.offsetHeight);
                console.log("CFS Debug: Selected Tags Container computedStyle", getComputedStyle(selectedTagsContainer));


                // --- 添加样式 (保持不变) ---
                if (!document.getElementById("cfs-custom-styles")) {
                    const style = document.createElement('style');
                    style.id = "cfs-custom-styles";
                    style.textContent = `
                        /* 全局样式调整 */
                        :root {
                            --cfs-text-color: #E0E0E0;
                            --cfs-background-dark: #2a2a2a; /* 模仿图2的深色背景 */
                            --cfs-background-medium: #333333;
                            --cfs-border-color: #555555;
                            --cfs-tag-bg: #444444; /* 标签背景色 */
                            --cfs-tag-border: #666666; /* 标签边框色 */
                            --cfs-add-button-bg: #444444;
                            --cfs-add-button-border: #666666;
                            --cfs-hover-bg: #555555; /* 悬停背景色 */
                            --cfs-selected-bg: #666666; /* 选中背景色 */
                        }

                        /* Modal styles (保持与图2风格一致的扁平化) */
                        .cfs-tag-modal {
                            position: fixed;
                            z-index: 1000;
                            left: 0;
                            top: 0;
                            width: 100%;
                            height: 100%;
                            overflow: auto;
                            background-color: rgba(0,0,0,0.7); /* 更深的背景遮罩 */
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        }
                        .cfs-tag-modal-content {
                            background-color: var(--cfs-background-dark);
                            margin: auto;
                            padding: 20px;
                            border: 1px solid var(--cfs-border-color);
                            width: 80%;
                            max-width: 500px;
                            border-radius: 5px; /* 较小的圆角 */
                            box-shadow: none; /* 移除阴影，扁平化 */
                            display: flex;
                            flex-direction: column;
                            gap: 10px;
                        }
                        .cfs-tag-modal-content h2 {
                            color: var(--cfs-text-color);
                            margin-bottom: 15px;
                            text-align: center;
                        }
                        .cfs-tag-modal-search-input {
                            width: 100%;
                            padding: 8px;
                            box-sizing: border-box;
                            background-color: var(--cfs-background-medium);
                            border: 1px solid var(--cfs-border-color);
                            color: var(--cfs-text-color);
                            border-radius: 4px;
                            font-size: 13px;
                        }
                        .cfs-tag-modal-search-input:focus {
                            border-color: var(--cfs-text-color);
                            outline: none;
                        }
                        .cfs-tag-modal-available-tags {
                            max-height: 300px;
                            overflow-y: auto;
                            display: flex;
                            flex-wrap: wrap;
                            gap: 6px;
                            padding: 8px;
                            border: 1px solid var(--cfs-border-color);
                            background-color: var(--cfs-background-dark);
                            border-radius: 4px;
                            scrollbar-width: thin;
                            scrollbar-color: var(--cfs-tag-border) transparent;
                        }
                        .cfs-tag-modal-available-tags::-webkit-scrollbar {
                            width: 6px;
                        }
                        .cfs-tag-modal-available-tags::-webkit-scrollbar-thumb {
                            background-color: var(--cfs-tag-border);
                            border-radius: 3px;
                        }
                        .cfs-tag-modal-available-tags::-webkit-scrollbar-track {
                            background-color: var(--cfs-background-medium);
                        }
                        .cfs-tag-modal-buttons {
                            display: flex;
                            justify-content: flex-end;
                            margin-top: 10px;
                        }
                        .cfs-tag-modal-close-button {
                            background-color: var(--cfs-tag-bg);
                            color: var(--cfs-text-color);
                            border: 1px solid var(--cfs-tag-border);
                            padding: 6px 12px;
                            border-radius: 4px;
                            cursor: pointer;
                            transition: background-color 0.2s, border-color 0.2s;
                            font-size: 13px;
                        }
                        .cfs-tag-modal-close-button:hover {
                            background-color: var(--cfs-hover-bg);
                            border-color: var(--cfs-text-color);
                        }

                        /* Widget Wrapper */
                        .cfs-widget-wrapper {
                            width: 100%;
                            display: flex;
                            flex-wrap: wrap;
                            gap: 2px; /* 调整间距 */
                            padding: 2px !important; /* 进一步调整内边距 */
                            border: 1px solid var(--cfs-border-color);
                            background-color: var(--cfs-background-dark);
                            border-radius: 5px;
                            box-sizing: border-box;
                            box-shadow: none;
                            min-height: 46px !important; /* 确保容器至少有一定高度 */
                            overflow: auto !important; /* 显示滚动条 */
                            align-items: flex-start; /* 确保内容从顶部开始对齐 */
                            min-height: 34px !important; /* 调整最小高度 */
                        }

                        .cfs-selected-tags-container {
                            display: flex; /* 确保内部标签可以flex布局 */
                            flex-wrap: wrap; /* 确保标签可以换行 */
                            align-items: center; /* 确保内容居中对齐 */
                            gap: 4px; /* 标签和按钮之间的间距 */
                            flex-grow: 1; /* 允许其增长以占据空间 */
                        }

                        /* Tag styles */
                        .cfs-tag {
                            background-color: var(--cfs-tag-bg);
                            color: var(--cfs-text-color);
                            padding: 2px 6px;
                            border-radius: 4px;
                            border: 1px solid var(--cfs-tag-border);
                            display: inline-flex;
                            align-items: center;
                            font-size: 13px;
                            font-weight: normal;
                            box-shadow: none;
                            transition: background-color 0.2s, border-color 0.2s;
                            height: 24px;
                            line-height: 20px;
                            cursor: default;
                        }
                        .cfs-tag:hover {
                            background-color: var(--cfs-hover-bg);
                            border-color: var(--cfs-text-color);
                            transform: none;
                            box-shadow: none;
                        }

                        /* Remove button for tags */
                        .cfs-remove-btn {
                            cursor: pointer;
                            margin-left: 4px; /* 调整左侧间距为更小 */
                            font-weight: bold;
                            font-size: 9px; /* 调整字体大小为更小 */
                            color: var(--cfs-text-color);
                            transition: color 0.2s;
                            line-height: 1;
                        }
                        .cfs-remove-btn:hover {
                            color: #FF6666;
                            transform: none;
                        }
                        .cfs-remove-btn:active {
                            transform: none;
                        }

                        /* Add Tag Button */
                        .cfs-add-tag-button {
                            background-color: var(--cfs-add-button-bg);
                            color: var(--cfs-text-color);
                            border: 1px solid var(--cfs-add-button-border);
                            border-radius: 4px;
                            width: 24px;
                            height: 24px;
                            font-size: 18px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            cursor: pointer;
                            transition: background-color 0.2s, border-color 0.2s;
                            flex-shrink: 0;
                            line-height: 24px; /* 调整行高以匹配高度，确保垂直居中 */
                            box-shadow: none;
                        }
                        .cfs-add-tag-button:hover {
                            background-color: var(--cfs-hover-bg);
                            border-color: var(--cfs-text-color);
                            transform: none;
                            box-shadow: none;
                        }
                        .cfs-add-tag-button:active {
                            transform: none;
                            box-shadow: none;
                        }

                        /* Selectable Tags in Modal */
                        .cfs-selectable-tag {
                            background-color: var(--cfs-tag-bg);
                            color: var(--cfs-text-color);
                            padding: 4px 8px; /* 调整内边距 */
                            border-radius: 4px;
                            border: 1px solid var(--cfs-tag-border);
                            cursor: pointer;
                            transition: background-color 0.2s, border-color 0.2s;
                            font-size: 13px; /* 调整字体大小 */
                        }
                        .cfs-selectable-tag:hover {
                            background-color: var(--cfs-hover-bg);
                            border-color: var(--cfs-text-color);
                            transform: none;
                            box-shadow: none;
                        }
                        .cfs-selectable-tag.selected {
                            background-color: var(--cfs-selected-bg);
                            color: var(--cfs-text-color);
                            cursor: not-allowed;
                            border-color: var(--cfs-text-color);
                            box-shadow: none;
                        }
                    `;
                    document.head.appendChild(style);
                }


                // --- 添加设置按钮 (保持不变) ---
                const settingsButton = this.addWidget("button", "设置 (Settings)", null, () => {
                    if (!document.querySelector(".danbooru-gallery-settings-dialog")) {
                        createSettingsDialog(this);
                    }
                });
                settingsButton.serialize = false;
            };
        }
    },
});