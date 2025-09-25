import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

// 防抖函数，用于延迟执行，避免频繁的API调用
function debounce(func, delay) {
    let timeout;
    return function (...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

// --- 扩展 ComfyUI ---
app.registerExtension({
    name: "Comfy.CharacterFeatureSwap",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "CharacterFeatureSwapNode") {

            // --- 全局国际化和UI管理 ---
            const i18n = {
                zh: {
                    language: "语言",
                    prompt: "提示词",
                    llm: "LLM",
                    languageSettings: "语言设置",
                    promptSettings: "提示词设置",
                    customPrompt: "自定义AI提示词 (Custom Prompt):",
                    promptPlaceholder: "使用 <code>{original_prompt}</code>、<code>{character_prompt}</code> 和 <code>{target_features}</code> 作为占位符。",
                    llmSettings: "LLM 设置",
                    llmDescription: `配置用于特征替换的LLM API。推荐使用 <a href="https://openrouter.ai" target="_blank">OpenRouter</a> (部分模型免费)。`,
                    apiUrl: "API URL:",
                    apiKey: "API Key:",
                    model: "模型 (Model):",
                    search: "搜索...",
                    save: "保存",
                    close: "关闭",
                    settingsSaved: "设置已保存！",
                    saveFailed: "保存失败: ",
                    testConnection: "测试连接",
                    testResponse: "测试回复",
                    testing: "测试中...",
                    connectionSuccess: "连接成功！",
                    connectionFailed: "连接失败: ",
                    responseSuccess: "回复成功: ",
                    responseFailed: "回复失败: ",
                    import: "导入",
                    export: "导出",
                    debug: "调试",
                    settings: "设置",
                    addTagPlaceholder: "输入后按回车...",
                    apiKeyMissingWarning: "警告: 未设置API Key。请在“设置”中配置。",
                    connectionFailedWarning: "连接失败。请检查设置和网络。",
                    checkingConnection: "正在检查连接...",
                    exportSuccess: "设置已成功导出！",
                    exportFailed: "导出失败。",
                    importSuccess: "设置已成功导入！",
                    importError: "导入设置失败，文件格式无效或已损坏。",
                    presets: "预设",
                    managePresets: "管理预设",
                    addPreset: "添加预设",
                    presetName: "预设名称...",
                    savePreset: "保存当前标签为预设",
                    deletePresetConfirmation: "确定要删除预设 '{presetName}' 吗？此操作无法撤销。",
                    presetNameExists: "预设名称已存在。",
                    presetDeleted: "预设已删除。",
                    presetSaved: "预设已保存。",
                    saveCurrentPreset: "保存到当前预设",
                    saveAsPreset: "另存为新预设",
                },
                en: {
                    language: "Language",
                    prompt: "Prompt",
                    llm: "LLM",
                    languageSettings: "Language Settings",
                    promptSettings: "Prompt Settings",
                    customPrompt: "Custom AI Prompt:",
                    promptPlaceholder: "Use <code>{original_prompt}</code>, <code>{character_prompt}</code>, and <code>{target_features}</code> as placeholders.",
                    llmSettings: "LLM Settings",
                    llmDescription: `Configure the LLM API for feature swapping. <a href="https://openrouter.ai" target="_blank">OpenRouter</a> is recommended (Some models are free).`,
                    apiUrl: "API URL:",
                    apiKey: "API Key:",
                    model: "Model:",
                    search: "Search...",
                    save: "Save",
                    close: "Close",
                    settingsSaved: "Settings saved!",
                    saveFailed: "Save failed: ",
                    testConnection: "Test Connection",
                    testResponse: "Test Response",
                    testing: "Testing...",
                    connectionSuccess: "Connection successful!",
                    connectionFailed: "Connection failed: ",
                    responseSuccess: "Response successful: ",
                    responseFailed: "Response failed: ",
                    import: "Import",
                    export: "Export",
                    debug: "Debug",
                    settings: "Settings",
                    addTagPlaceholder: "Enter to add...",
                    apiKeyMissingWarning: "Warning: API Key is not set. Please configure in Settings.",
                    connectionFailedWarning: "Connection failed. Check settings and network.",
                    checkingConnection: "Checking connection...",
                    exportSuccess: "Settings exported successfully!",
                    exportFailed: "Export failed.",
                    importSuccess: "Settings imported successfully!",
                    importError: "Failed to import settings. Invalid or corrupt file format.",
                    presets: "Presets",
                    managePresets: "Manage Presets",
                    addPreset: "Add Preset",
                    presetName: "Preset name...",
                    savePreset: "Save current tags as preset",
                    deletePresetConfirmation: "Are you sure you want to delete the preset '{presetName}'? This cannot be undone.",
                    presetNameExists: "Preset name already exists.",
                    presetDeleted: "Preset deleted.",
                    presetSaved: "Preset saved.",
                    saveCurrentPreset: "Save to Current Preset",
                    saveAsPreset: "Save as New Preset",
                }
            };
            let currentLanguage = 'zh';
            const t = (key) => i18n[currentLanguage]?.[key] || i18n.zh[key];
            const nodeUIs = new Map();

            function updateAllNodeUIs() {
                for (const [node, ui] of nodeUIs.entries()) {
                    ui.importButton.innerHTML = `<i class="fas fa-upload"></i> ${t('import')}`;
                    ui.exportButton.innerHTML = `<i class="fas fa-download"></i> ${t('export')}`;
                    ui.debugButton.innerHTML = `<i class="fas fa-bug"></i> ${t('debug')}`;
                    ui.settingsButton.innerHTML = `<i class="fas fa-cog"></i> ${t('settings')}`;
                }
            }

            function showMessage(ui, text, color = "#FF9800") {
                if (!ui || !ui.messageArea) return;
                ui.messageArea.textContent = text;
                ui.messageArea.style.color = color;
                ui.messageArea.style.display = text ? "block" : "none";
            }

            async function checkConnectionStatus(ui, settingsOverride = null) {
                if (!ui) return;
                showMessage(ui, t('checkingConnection'), '#ccc');
                try {
                    const settings = settingsOverride || await api.fetchApi("/character_swap/llm_settings").then(r => r.json());
                    if (!settings.api_key) {
                        showMessage(ui, t('apiKeyMissingWarning'));
                        return;
                    }
                    const response = await api.fetchApi("/character_swap/test_llm_connection", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ api_url: settings.api_url, api_key: settings.api_key }),
                    });
                    if (!response.ok) {
                        showMessage(ui, t('connectionFailedWarning'));
                    } else {
                        showMessage(ui, ""); // Success
                    }
                } catch (error) {
                    showMessage(ui, t('connectionFailedWarning'));
                    console.error("CFS: Connection check failed.", error);
                }
            }

            // --- 新的设置对话框 ---
            function createNewSettingsDialog(node) {
                // Prevent multiple dialogs
                if (document.querySelector(".cfs-new-settings-dialog")) {
                    return;
                }

                const dialog = document.createElement("div");
                dialog.className = "cfs-new-settings-dialog";

                // Initial structure, texts will be populated by updateUITexts
                dialog.innerHTML = `
        <div class="cfs-new-settings-content">
            <div class="cfs-new-settings-sidebar">
                <button class="cfs-new-settings-tab active" data-tab="language" data-i18n="language"></button>
                <button class="cfs-new-settings-tab" data-tab="prompt" data-i18n="prompt"></button>
                <button class="cfs-new-settings-tab" data-tab="llm" data-i18n="llm"></button>
            </div>
            <div class="cfs-new-settings-main">
                <div class="cfs-new-settings-pane active" data-pane="language">
                    <h3 data-i18n="languageSettings"></h3>
                    <div id="cfs-language-options"></div>
                </div>
                <div class="cfs-new-settings-pane" data-pane="prompt">
                    <h3 data-i18n="promptSettings"></h3>
                    <label for="cfs-custom-prompt-new" data-i18n="customPrompt"></label>
                    <textarea id="cfs-custom-prompt-new" name="custom_prompt" rows="10"></textarea>
                    <p class="description" data-i18n="promptPlaceholder" data-i18n-html></p>
                </div>
                <div class="cfs-new-settings-pane" data-pane="llm">
                     <h3 data-i18n="llmSettings"></h3>
                     <p data-i18n="llmDescription" data-i18n-html></p>
                     <label for="cfs-api-url-new" data-i18n="apiUrl"></label>
                     <input type="text" id="cfs-api-url-new" name="api_url">
                     <label for="cfs-api-key-new" data-i18n="apiKey"></label>
                     <input type="password" id="cfs-api-key-new" name="api_key">
                     <label for="cfs-model-new" data-i18n="model"></label>
                     <div class="cfs-custom-select-wrapper">
                         <div id="cfs-model-selected" class="cfs-custom-select-selected" tabindex="0"></div>
                         <div id="cfs-model-items" class="cfs-custom-select-items cfs-select-hide">
                             <input type="text" id="cfs-model-search-input" data-i18n-placeholder="search">
                             <div id="cfs-model-options"></div>
                         </div>
                     </div>
                     <select id="cfs-model-new" name="model" style="display: none;"></select>
                     <div class="cfs-llm-test-buttons">
                        <button id="cfs-test-connection-btn" data-i18n="testConnection"></button>
                        <button id="cfs-test-response-btn" data-i18n="testResponse"></button>
                    </div>
                    <div id="cfs-llm-test-result" class="cfs-llm-test-result"></div>
                </div>
            </div>
        </div>
        <div class="cfs-new-settings-buttons">
            <div class="cfs-social-buttons">
                <button id="cfs-github-button"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg><span style="margin-left: 8px;">GitHub</span></button>
                <button id="cfs-discord-button"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.196.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.30z"></path></svg><span style="margin-left: 8px;">Discord</span></button>
            </div>
            <div>
                <button id="cfs-save-new-settings" data-i18n="save"></button>
                <button id="cfs-close-new-dialog" data-i18n="close"></button>
            </div>
        </div>
    `;

                document.body.appendChild(dialog);

                function updateUITexts() {
                    dialog.querySelectorAll("[data-i18n]").forEach(el => {
                        const key = el.dataset.i18n;
                        if (el.hasAttribute("data-i18n-html")) {
                            el.innerHTML = t(key);
                        } else {
                            el.textContent = t(key);
                        }
                    });
                    dialog.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
                        const key = el.dataset.i18nPlaceholder;
                        el.placeholder = t(key);
                    });

                    const githubButton = dialog.querySelector("#cfs-github-button");
                    if (githubButton) githubButton.title = t('githubTooltip');
                    const discordButton = dialog.querySelector("#cfs-discord-button");
                    if (discordButton) discordButton.title = t('discordTooltip');
                }

                // Tab switching logic
                const tabs = dialog.querySelectorAll(".cfs-new-settings-tab");
                const panes = dialog.querySelectorAll(".cfs-new-settings-pane");

                tabs.forEach(tab => {
                    tab.addEventListener("click", () => {
                        const targetPane = tab.dataset.tab;

                        tabs.forEach(t => t.classList.remove("active"));
                        tab.classList.add("active");

                        panes.forEach(p => {
                            p.classList.remove("active");
                            if (p.dataset.pane === targetPane) {
                                p.classList.add("active");
                            }
                        });
                    });
                });

                // Close button
                dialog.querySelector("#cfs-close-new-dialog").addEventListener("click", () => {
                    const ui = nodeUIs.get(node);
                    if (ui) {
                        const tempSettings = {
                            api_url: apiUrlInput.value,
                            api_key: apiKeyInput.value,
                        };
                        checkConnectionStatus(ui, tempSettings);
                    }
                    dialog.remove();
                });

                // Social buttons
                const githubButton = dialog.querySelector("#cfs-github-button");
                if (githubButton) {
                    githubButton.onclick = () => window.open('https://github.com/Aaalice233/ComfyUI-Danbooru-Gallery', '_blank');
                }
                const discordButton = dialog.querySelector("#cfs-discord-button");
                if (discordButton) {
                    discordButton.onclick = () => window.open('https://discord.gg/aaalice', '_blank');
                }

                // --- Load and Save Logic ---
                const apiUrlInput = dialog.querySelector("#cfs-api-url-new");
                const apiKeyInput = dialog.querySelector("#cfs-api-key-new");
                const modelInput = dialog.querySelector("#cfs-model-new");
                const customPromptInput = dialog.querySelector("#cfs-custom-prompt-new");

                // --- Custom Searchable Select Logic ---
                const wrapper = dialog.querySelector(".cfs-custom-select-wrapper");
                const selectedDisplay = dialog.querySelector("#cfs-model-selected");
                const itemsContainer = dialog.querySelector("#cfs-model-items");
                const searchInput = dialog.querySelector("#cfs-model-search-input");
                const optionsContainer = dialog.querySelector("#cfs-model-options");
                const hiddenSelect = modelInput; // modelInput is the original, now hidden, select
                const originalParent = itemsContainer.parentNode;

                let allModels = [];

                function fuzzySearch(needle, haystack) {
                    const h = haystack.toLowerCase();
                    const n = needle.toLowerCase().replace(/\s/g, '');
                    if (n === "") return true;
                    let n_idx = 0;
                    let h_idx = 0;
                    while (n_idx < n.length && h_idx < h.length) {
                        if (h[h_idx] === n[n_idx]) {
                            n_idx++;
                        }
                        h_idx++;
                    }
                    return n_idx === n.length;
                }

                function updateOptions(filter = "") {
                    optionsContainer.innerHTML = "";
                    const filtered = allModels.filter(m => fuzzySearch(filter, m));

                    filtered.forEach(modelId => {
                        const opt = document.createElement("div");
                        opt.dataset.value = modelId;
                        opt.textContent = modelId;
                        if (modelId === hiddenSelect.value) {
                            opt.classList.add("selected");
                        }
                        optionsContainer.appendChild(opt);
                    });
                }

                function closeDropdown() {
                    if (!itemsContainer.classList.contains("cfs-select-hide")) {
                        itemsContainer.classList.add("cfs-select-hide");
                        // Crucially, move it back to the dialog so it's not orphaned
                        originalParent.appendChild(itemsContainer);
                    }
                }

                selectedDisplay.addEventListener("click", (e) => {
                    e.stopPropagation();

                    if (itemsContainer.classList.contains("cfs-select-hide")) {
                        const openDropdown = () => {
                            // Move to body to break out of stacking context
                            document.body.appendChild(itemsContainer);

                            // Position it
                            const rect = selectedDisplay.getBoundingClientRect();
                            itemsContainer.style.top = `${rect.bottom + 2}px`;
                            itemsContainer.style.left = `${rect.left}px`;
                            itemsContainer.style.width = `${rect.width}px`;

                            itemsContainer.classList.remove("cfs-select-hide");

                            updateOptions();
                            searchInput.value = "";
                            searchInput.focus();
                        };

                        if (allModels.length === 0) {
                            selectedDisplay.textContent = "Loading models...";
                            api.fetchApi("/character_swap/llm_models")
                                .then(response => response.json())
                                .then(models => {
                                    allModels = models;
                                    // Restore original selected text before opening
                                    selectedDisplay.textContent = hiddenSelect.value || "Select a model";
                                    openDropdown();
                                })
                                .catch(error => {
                                    console.error("Failed to load LLM models:", error);
                                    selectedDisplay.textContent = "Error loading models";
                                });
                        } else {
                            openDropdown();
                        }
                    } else {
                        closeDropdown();
                    }
                });

                searchInput.addEventListener("input", () => updateOptions(searchInput.value));
                searchInput.addEventListener("click", e => e.stopPropagation());

                optionsContainer.addEventListener("click", (e) => {
                    if (e.target.dataset.value) {
                        e.stopPropagation();
                        hiddenSelect.value = e.target.dataset.value;
                        selectedDisplay.textContent = e.target.dataset.value;
                        closeDropdown();
                    }
                });

                // Close dropdown when clicking outside
                document.addEventListener("click", (e) => {
                    if (!itemsContainer.contains(e.target) && !selectedDisplay.contains(e.target)) {
                        closeDropdown();
                    }
                });

                // --- Load Models and Settings ---
                function loadModels() {
                    // This function is now only called on demand.
                    // The logic is moved to the selectedDisplay click handler.
                }

                function loadSettings() {
                    api.fetchApi("/character_swap/llm_settings")
                        .then(response => response.json())
                        .then(settings => {
                            currentLanguage = settings.language || 'zh';
                            updateUITexts(); // Update UI text first

                            apiUrlInput.value = settings.api_url || "";
                            apiKeyInput.value = settings.api_key || "";
                            const defaultCustomPrompt = `You are an AI assistant for Stable Diffusion. Your task is to replace features in a prompt.
Your goal is to take the features described in the 'New Character Prompt' and intelligently merge them into the 'Original Prompt'.
The 'Features to Replace' list tells you which categories of features (like hair style, eye color, clothing) should be taken from the 'New Character Prompt'.
Respond with only the new, modified prompt, without any explanations.

**Original Prompt:**
{original_prompt}

**New Character Prompt:**
{character_prompt}

**Features to Replace (guide):**
{target_features}

**New Prompt:**`;
                            let prompt = settings.custom_prompt;
                            if (!prompt || !prompt.includes("**Original Prompt:**")) {
                                prompt = defaultCustomPrompt;
                            }
                            customPromptInput.value = prompt;

                            // Don't assume allModels is loaded. Just set the value.
                            const currentModel = settings.model || "gryphe/mythomax-l2-13b";
                            hiddenSelect.value = currentModel;
                            selectedDisplay.textContent = currentModel;

                            // Create language buttons
                            const langOptionsContainer = dialog.querySelector("#cfs-language-options");
                            langOptionsContainer.innerHTML = '';
                            const zhButton = document.createElement("button");
                            zhButton.textContent = "中文";
                            zhButton.className = `cfs-language-button ${currentLanguage === 'zh' ? 'active' : ''}`;
                            zhButton.onclick = () => handleLanguageChange('zh', settings);

                            const enButton = document.createElement("button");
                            enButton.textContent = "English";
                            enButton.className = `cfs-language-button ${currentLanguage === 'en' ? 'active' : ''}`;
                            enButton.onclick = () => handleLanguageChange('en', settings);

                            langOptionsContainer.appendChild(zhButton);
                            langOptionsContainer.appendChild(enButton);
                        });
                }

                function handleLanguageChange(lang, currentSettings) {
                    if (lang === currentLanguage) return;

                    const newSettings = { ...currentSettings, language: lang };

                    api.fetchApi("/character_swap/llm_settings", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(newSettings),
                    }).then(response => {
                        if (response.ok) {
                            currentLanguage = lang; // 更新当前语言
                            updateAllNodeUIs(); // 更新所有节点的UI
                            dialog.remove();
                            createNewSettingsDialog(node); // 使用新语言重新创建对话框
                        } else {
                            alert("Failed to save language setting.");
                        }
                    });
                }

                // --- LLM Testing Logic ---
                const testConnectionBtn = dialog.querySelector("#cfs-test-connection-btn");
                const testResponseBtn = dialog.querySelector("#cfs-test-response-btn");
                const testResultDiv = dialog.querySelector("#cfs-llm-test-result");

                testConnectionBtn.addEventListener("click", async () => {
                    testResultDiv.style.display = "block";
                    testResultDiv.textContent = t('testing');
                    testResultDiv.style.color = '#ccc';
                    testConnectionBtn.disabled = true;
                    testResponseBtn.disabled = true;

                    try {
                        const response = await api.fetchApi("/character_swap/test_llm_connection", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                api_url: apiUrlInput.value,
                                api_key: apiKeyInput.value,
                            }),
                        });
                        const result = await response.json();
                        if (response.ok && result.success) {
                            testResultDiv.textContent = t('connectionSuccess') + (result.message ? `\n${result.message}` : '');
                            testResultDiv.style.color = '#8BC34A';
                        } else {
                            throw new Error(result.error || 'Unknown error');
                        }
                    } catch (error) {
                        testResultDiv.textContent = t('connectionFailed') + error.message;
                        testResultDiv.style.color = '#c53939';
                    } finally {
                        testConnectionBtn.disabled = false;
                        testResponseBtn.disabled = false;
                    }
                });

                testResponseBtn.addEventListener("click", async () => {
                    testResultDiv.style.display = "block";
                    testResultDiv.textContent = t('testing');
                    testResultDiv.style.color = '#ccc';
                    testConnectionBtn.disabled = true;
                    testResponseBtn.disabled = true;

                    try {
                        const response = await api.fetchApi("/character_swap/test_llm_response", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                api_url: apiUrlInput.value,
                                api_key: apiKeyInput.value,
                                model: selectedDisplay.textContent,
                            }),
                        });
                        const result = await response.json();
                        if (response.ok && result.success) {
                            testResultDiv.textContent = t('responseSuccess') + `\n${result.message}`;
                            testResultDiv.style.color = '#8BC34A';
                        } else {
                            throw new Error(result.error || 'Unknown error');
                        }
                    } catch (error) {
                        testResultDiv.textContent = t('responseFailed') + error.message;
                        testResultDiv.style.color = '#c53939';
                    } finally {
                        testConnectionBtn.disabled = false;
                        testResponseBtn.disabled = false;
                    }
                });

                loadSettings(); // Initial call, but without loading models

                // Save settings
                dialog.querySelector("#cfs-save-new-settings").addEventListener("click", () => {
                    // 从节点小部件获取当前的特征
                    const featureWidget = node.widgets.find(w => w.name === "target_features");
                    const currentFeatures = featureWidget ? featureWidget.value.split(",").map(t => t.trim()).filter(t => t) : [];

                    const newSettings = {
                        api_url: apiUrlInput.value,
                        api_key: apiKeyInput.value,
                        model: selectedDisplay.textContent,
                        custom_prompt: customPromptInput.value,
                        language: currentLanguage,
                        // 保留预设的完整结构
                        active_preset_name: node.cfs_settings.active_preset_name,
                        presets: node.cfs_settings.presets,
                    };

                    api.fetchApi("/character_swap/llm_settings", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(newSettings),
                    }).then(response => {
                        if (response.ok) {
                            alert(t('settingsSaved'));
                            const ui = nodeUIs.get(node);
                            if (ui) {
                                // Use the just-saved settings for the check
                                checkConnectionStatus(ui, newSettings);
                            }
                            dialog.remove();
                        } else {
                            alert(t('saveFailed') + response.statusText);
                        }
                    });
                });
            }

            // --- 标签选择模态框 (已移除) ---

            // --- 帮助面板 ---
            function createHelpPanel() {
                // Prevent multiple panels
                if (document.querySelector(".cfs-help-panel")) {
                    return;
                }

                const panel = document.createElement("div");
                panel.className = "cfs-help-panel";

                const content = `
        <div class="cfs-help-panel-content">
            <h2>功能说明</h2>
            <pre>
此区域用于选择需要进行特征融合的'特征类别'。

工作流程：
1. 节点会从'original_prompt'中寻找并移除与所选类别相关的标签。
2. 同时，节点会将'character_prompt'中与这些类别相关的标签提取出来。
3. 最后，将提取出的特征标签与处理过的'original_prompt'合并，生成'new_prompt'。

示例：
- original_prompt: 1girl, solo, long hair, blue eyes, school uniform, smile
- character_prompt: 1boy, short hair, green eyes, armor, serious
- 选择的特征类别: [hair style], [eye color], [clothing]

- 结果 (new_prompt): 1girl, solo, smile, short hair, green eyes, armor
            </pre>
            <button class="cfs-help-panel-close-button">关闭</button>
        </div>
    `;

                panel.innerHTML = content;
                document.body.appendChild(panel);

                panel.querySelector(".cfs-help-panel-close-button").addEventListener("click", () => {
                    panel.remove();
                });

                // Also close when clicking the overlay
                panel.addEventListener("click", (e) => {
                    if (e.target === panel) {
                        panel.remove();
                    }
                });
            }

            const onNodeCreated_orig = nodeType.prototype.onNodeCreated; // Store original before overriding
            nodeType.prototype.onNodeCreated = function () {
                if (onNodeCreated_orig && onNodeCreated_orig !== nodeType.prototype.onNodeCreated) { // Prevent infinite recursion
                    onNodeCreated_orig.apply(this, arguments); // Call original if it exists
                }

                // 设置节点的最小尺寸
                this.min_size = [360, 260]; /* Adjusted height for message area */

                // --- 尺寸修复 ---
                // 存储原始的 computeSize 方法
                const originalComputeSize = this.computeSize;
                // 覆盖 computeSize 方法
                this.computeSize = () => {
                    // 调用原始的 computeSize
                    let size = originalComputeSize.apply(this, arguments);
                    // 确保尺寸不小于 min_size
                    if (this.min_size) {
                        size[0] = Math.max(this.min_size[0], size[0]);
                        size[1] = Math.max(this.min_size[1], size[1]);
                    }
                    return size;
                };

                const widgetName = "target_features";
                const widgetIndex = this.widgets.findIndex(w => w.name === widgetName);
                if (widgetIndex === -1) return;

                const originalWidget = this.widgets[widgetIndex];

                // 使用danbooru-gallery的方法彻底隐藏原始小部件
                originalWidget.computeSize = () => [0, -4]; // 让小部件不占空间
                originalWidget.draw = () => { }; // 阻止小部件(包括其标签)被绘制
                originalWidget.type = "hidden"; // 在某些UI模式下隐藏


                // --- 创建主容器 ---
                const wrapper = document.createElement("div");
                wrapper.className = "cfs-widget-wrapper";
                wrapper.style.marginBottom = "5px"; // Add some spacing

                // --- 添加帮助图标 ---
                const helpIcon = document.createElement("div");
                helpIcon.className = "cfs-help-icon";
                helpIcon.textContent = "?";
                helpIcon.onclick = createHelpPanel;
                wrapper.appendChild(helpIcon);

                // --- 已选标签容器 (REMOVED) ---

                // --- 添加标签按钮 ---
                const addTagButton = document.createElement("button");
                addTagButton.textContent = "＋";
                addTagButton.className = "cfs-add-tag-button";
                wrapper.appendChild(addTagButton);

                // --- 函数: 更新小部件的值 ---
                const updateWidgetValue = () => {
                    const tags = Array.from(wrapper.querySelectorAll(".cfs-tag")).map(el => el.textContent.replace("✖", "").trim());
                    // Update the value of the original widget
                    originalWidget.value = tags.join(", ");
                    this.setDirtyCanvas(true, true);
                };

                // --- 颜色管理 ---
                const tagColors = [
                    { bg: 'rgba(139, 195, 74, 0.3)', border: '#8BC34A', text: '#E0E0E0' }, // Light Green
                    { bg: 'rgba(3, 169, 244, 0.3)', border: '#03A9F4', text: '#E0E0E0' }, // Light Blue
                    { bg: 'rgba(255, 152, 0, 0.3)', border: '#FF9800', text: '#E0E0E0' }, // Orange
                    { bg: 'rgba(156, 39, 176, 0.3)', border: '#9C27B0', text: '#E0E0E0' }, // Purple
                    { bg: 'rgba(233, 30, 99, 0.3)', border: '#E91E63', text: '#E0E0E0' },  // Pink
                    { bg: 'rgba(0, 150, 136, 0.3)', border: '#009688', text: '#E0E0E0' },  // Teal
                ];
                let colorIndex = 0;
                const getNextColor = () => {
                    const color = tagColors[colorIndex];
                    colorIndex = (colorIndex + 1) % tagColors.length;
                    return color;
                };

                // --- 函数: 添加一个已选标签的UI元素 ---
                const addSelectedTag = (text) => {
                    text = text.trim();
                    const currentTags = Array.from(wrapper.querySelectorAll(".cfs-tag")).map(el => el.textContent.replace("✖", "").trim());
                    if (!currentTags.includes(text) && text) { // Only add if not already present and not empty
                        const tag = document.createElement("div");
                        tag.className = "cfs-tag";

                        // --- 应用颜色 ---
                        const color = getNextColor();
                        tag.style.backgroundColor = color.bg;
                        tag.style.borderColor = color.border;
                        tag.style.color = color.text;


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
                            debouncedAutosave(); // 自动保存
                        };

                        tag.appendChild(removeBtn);
                        // 将新标签插入到 addTagButton 之前
                        wrapper.insertBefore(tag, addTagButton);
                        updateWidgetValue();
                        debouncedAutosave(); // 自动保存
                    }
                };

                // --- 事件监听 ---
                addTagButton.addEventListener("click", () => {
                    // 隐藏按钮
                    addTagButton.style.display = "none";

                    // 创建临时输入框
                    const tempInput = document.createElement("input");
                    tempInput.type = "text";
                    tempInput.className = "cfs-temp-input";
                    tempInput.placeholder = t('addTagPlaceholder');
                    wrapper.appendChild(tempInput);
                    tempInput.focus();

                    const finalizeTag = () => {
                        const newTag = tempInput.value.trim();
                        if (newTag) {
                            addSelectedTag(newTag);
                        }
                        // 移除输入框并显示按钮
                        tempInput.remove();
                        addTagButton.style.display = "";
                    };

                    // 当输入框失去焦点时
                    tempInput.addEventListener("blur", finalizeTag);

                    // 当在输入框中按下回车时
                    tempInput.addEventListener("keydown", (e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            finalizeTag();
                        } else if (e.key === "Escape") {
                            tempInput.value = ""; // 清空以防添加
                            finalizeTag();
                        }
                    });
                });

                // --- 创建底部按钮栏 ---
                const bottomBar = document.createElement("div");
                bottomBar.className = "cfs-bottom-bar";

                const importButton = document.createElement("button");
                importButton.innerHTML = `<i class="fas fa-upload"></i> ${t('import')}`;
                importButton.className = "cfs-bottom-button";
                importButton.onclick = () => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.json';
                    input.onchange = (e) => {
                        const file = e.target.files[0];
                        if (!file) return;

                        const reader = new FileReader();
                        reader.onload = async (event) => {
                            try {
                                const importedData = JSON.parse(event.target.result);

                                // --- 全面导入逻辑 ---
                                // 1. 验证导入的数据结构
                                if (!importedData || (!importedData.presets && !importedData.target_features)) {
                                    alert(t('importError'));
                                    return;
                                }

                                // 2. 获取当前设置
                                const response = await api.fetchApi("/character_swap/llm_settings");
                                const currentSettings = await response.json();

                                // 3. 合并设置
                                const newSettings = { ...currentSettings };

                                // 优先导入新的预设结构
                                if (importedData.presets && Array.isArray(importedData.presets)) {
                                    newSettings.presets = importedData.presets;
                                    newSettings.active_preset_name = importedData.active_preset_name || "default";
                                }
                                // 向后兼容旧的 target_features 格式
                                else if (importedData.target_features) {
                                    const defaultPreset = newSettings.presets.find(p => p.name === "default") || { name: "default", features: [] };
                                    defaultPreset.features = importedData.target_features;
                                    if (!newSettings.presets.some(p => p.name === "default")) {
                                        newSettings.presets.push(defaultPreset);
                                    }
                                    newSettings.active_preset_name = "default";
                                }

                                // 更新其他非敏感设置
                                if (importedData.language) newSettings.language = importedData.language;
                                if (importedData.custom_prompt) newSettings.custom_prompt = importedData.custom_prompt;


                                // 4. 保存合并后的设置
                                const saveResponse = await api.fetchApi("/character_swap/llm_settings", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify(newSettings),
                                });

                                if (!saveResponse.ok) {
                                    throw new Error('Failed to save imported settings.');
                                }

                                // 5. 刷新整个节点UI以反映所有变化
                                this.cfs_settings = newSettings; // 更新缓存
                                currentLanguage = newSettings.language;
                                updateAllNodeUIs();

                                const activePreset = newSettings.presets.find(p => p.name === newSettings.active_preset_name) || newSettings.presets.find(p => p.name === "default");
                                wrapper.querySelectorAll(".cfs-tag").forEach(tag => tag.remove());
                                if (activePreset) {
                                    activePreset.features.forEach(addSelectedTag);
                                }
                                updateWidgetValue();
                                const ui = nodeUIs.get(this);
                                ui.presetButton.querySelector(".cfs-preset-text").textContent = newSettings.active_preset_name;


                                alert(t('importSuccess'));

                            } catch (err) {
                                alert(t('importError') + ": " + err.message);
                                console.error("CFS: Import failed", err);
                            }
                        };
                        reader.readAsText(file);
                    };
                    input.click();
                };

                const exportButton = document.createElement("button");
                exportButton.innerHTML = `<i class="fas fa-download"></i> ${t('export')}`;
                exportButton.className = "cfs-bottom-button";
                exportButton.onclick = async () => {
                    try {
                        const response = await api.fetchApi("/character_swap/llm_settings");
                        const currentSettings = await response.json();

                        // 创建一个不包含敏感信息的新对象用于导出
                        const settingsToExport = {
                            language: currentSettings.language,
                            custom_prompt: currentSettings.custom_prompt,
                            presets: currentSettings.presets,
                            active_preset_name: currentSettings.active_preset_name,
                        };
                        // 清理API Key
                        delete settingsToExport.api_key;
                        delete settingsToExport.api_url;
                        delete settingsToExport.model;


                        const blob = new Blob([JSON.stringify(settingsToExport, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'cfs_settings.json';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        alert(t('exportSuccess'));
                    } catch (error) {
                        console.error("CFS: Export failed", error);
                        alert(t('exportFailed'));
                    }
                };

                const debugButton = document.createElement("button");
                debugButton.innerHTML = `<i class="fas fa-bug"></i> ${t('debug')}`;
                debugButton.className = "cfs-bottom-button";
                debugButton.onclick = async () => {
                    const getPromptFromInput = (slot) => {
                        // A much simpler and potentially more robust way to get input data.
                        // This relies on the litegraph's built-in data flow.
                        const data = this.getInputData(slot);

                        if (data === undefined || data === null) {
                            return null;
                        }

                        // The data could be anything, so we need to handle it.
                        // It might be an array from a Reroute node, or a string, or our JSON object.
                        if (Array.isArray(data)) {
                            // Let's assume if it's an array, we want the first element.
                            // This is a common pattern in ComfyUI.
                            const firstElement = data[0];
                            if (firstElement === undefined || firstElement === null) return null;
                            return String(firstElement);
                        }

                        return String(data);
                    };

                    const showDebugPanel = async (finalPrompt) => {
                        if (document.querySelector(".cfs-debug-panel")) {
                            document.querySelector(".cfs-debug-panel").remove();
                        }
                        const debugPanel = document.createElement("div");
                        debugPanel.className = "cfs-help-panel cfs-debug-panel";
                        debugPanel.style.zIndex = "2001";
                        debugPanel.innerHTML = `
                            <div class="cfs-help-panel-content" style="max-width: 800px;">
                                <h2>LLM Debug Prompt</h2>
                                <pre style="white-space: pre-wrap; word-wrap: break-word; max-height: 60vh; overflow-y: auto; background-color: #222; padding: 10px; border-radius: 5px;">${finalPrompt}</pre>
                                <button class="cfs-help-panel-close-button">关闭</button>
                            </div>
                        `;
                        document.body.appendChild(debugPanel);
                        const closeButton = debugPanel.querySelector(".cfs-help-panel-close-button");
                        closeButton.onclick = () => debugPanel.remove();
                        debugPanel.onclick = (e) => { if (e.target === debugPanel) debugPanel.remove(); };
                    };

                    try {
                        let originalPrompt = getPromptFromInput(0);
                        let characterPrompt = getPromptFromInput(1);

                        // 如果任何一个输入未连接，则尝试从缓存中获取
                        if (originalPrompt === null || characterPrompt === null) {
                            const cachedResponse = await api.fetchApi("/character_swap/cached_prompts");
                            const cachedData = await cachedResponse.json();

                            if (originalPrompt === null) {
                                originalPrompt = cachedData.original_prompt || "";
                            }
                            if (characterPrompt === null) {
                                characterPrompt = cachedData.character_prompt || "";
                            }
                        }

                        // JSON parsing logic
                        const parseIfNeeded = (promptStr) => {
                            if (typeof promptStr === 'string' && promptStr.trim().startsWith('{')) {
                                try {
                                    const parsed = JSON.parse(promptStr);
                                    if (parsed && typeof parsed === 'object' && 'prompt' in parsed) {
                                        return parsed.prompt;
                                    }
                                } catch (e) {
                                    // Not a valid JSON, return original string
                                }
                            }
                            return promptStr;
                        };

                        originalPrompt = parseIfNeeded(originalPrompt);
                        characterPrompt = parseIfNeeded(characterPrompt);

                        if (!originalPrompt && !characterPrompt) {
                            alert("无法获取提示词。请确保至少有一个输入已连接，或者已经成功运行过一次以生成缓存。");
                            return;
                        }

                        const featureWidget = this.widgets.find(w => w.name === "target_features");
                        const targetFeatures = featureWidget ? featureWidget.value : "";

                        const payload = {
                            original_prompt: originalPrompt,
                            character_prompt: characterPrompt,
                            target_features: targetFeatures.split(",").map(t => t.trim()).filter(t => t)
                        };

                        console.log("CFS Debug: Payload sent to /debug_prompt", payload);

                        const response = await api.fetchApi("/character_swap/debug_prompt", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(payload),
                        });

                        const data = await response.json();

                        console.log("CFS Debug: Response received from /debug_prompt", data);

                        if (!response.ok) {
                            throw new Error(data.error || `获取调试信息失败 (HTTP ${response.status})`);
                        }

                        if (data.error) {
                            alert("调试错误: " + data.error);
                            return;
                        }

                        if (document.querySelector(".cfs-debug-panel")) {
                            document.querySelector(".cfs-debug-panel").remove();
                        }

                        const debugPanel = document.createElement("div");
                        debugPanel.className = "cfs-help-panel cfs-debug-panel";
                        debugPanel.style.zIndex = "2001";
                        debugPanel.innerHTML = `
                            <div class="cfs-help-panel-content" style="max-width: 800px;">
                                <h2>LLM Debug Prompt</h2>
                                <pre style="white-space: pre-wrap; word-wrap: break-word; max-height: 60vh; overflow-y: auto; background-color: #222; padding: 10px; border-radius: 5px;">${data.final_prompt}</pre>
                                <button class="cfs-help-panel-close-button">关闭</button>
                            </div>
                        `;
                        document.body.appendChild(debugPanel);

                        const closeButton = debugPanel.querySelector(".cfs-help-panel-close-button");
                        closeButton.onclick = () => debugPanel.remove();
                        debugPanel.onclick = (e) => { if (e.target === debugPanel) debugPanel.remove(); };

                    } catch (error) {
                        console.error("CFS Debug Error:", error);
                        alert("错误: " + error.message);
                    }
                };

                const settingsButton = document.createElement("button");
                settingsButton.innerHTML = `<i class="fas fa-cog"></i> ${t('settings')}`;
                settingsButton.className = "cfs-bottom-button cfs-settings-button";
                settingsButton.onclick = () => {
                    createNewSettingsDialog(this);
                };

                // This block is now incorrect, it will be moved and corrected.
                // We will add the preset button inside the wrapper directly.
                bottomBar.appendChild(importButton);
                bottomBar.appendChild(exportButton);
                bottomBar.appendChild(debugButton);
                bottomBar.appendChild(settingsButton);

                const mainContainer = document.createElement("div");
                mainContainer.className = "cfs-main-container";

                const presetButtonContainer = document.createElement("div");
                presetButtonContainer.className = "cfs-preset-button-container";
                const presetButton = document.createElement("button");
                presetButton.className = "cfs-preset-button-widget";
                presetButton.innerHTML = `<span class="cfs-preset-text">${t('presets')}</span><span class="cfs-preset-arrow">▼</span>`;
                presetButtonContainer.appendChild(presetButton);
                wrapper.appendChild(presetButtonContainer);

                mainContainer.appendChild(wrapper);

                // --- 预设下拉菜单逻辑 ---
                const createPresetDropdown = () => {
                    if (document.querySelector(".cfs-preset-dropdown")) {
                        document.querySelector(".cfs-preset-dropdown").remove();
                        return;
                    }

                    const dropdown = document.createElement("div");
                    dropdown.className = "cfs-preset-dropdown";
                    document.body.appendChild(dropdown);

                    const rect = presetButton.getBoundingClientRect();
                    // Position dropdown above the button
                    dropdown.style.left = `${rect.left}px`;
                    // dropdown.style.width = `${rect.width}px`; // Let CSS handle width

                    // Must be visible to calculate height
                    dropdown.style.visibility = "hidden";
                    dropdown.style.display = "flex";

                    const dropdownHeight = dropdown.offsetHeight;
                    dropdown.style.top = `${rect.top - dropdownHeight - 5}px`;

                    // Make it visible again
                    dropdown.style.visibility = "visible";


                    const searchInput = document.createElement("input");
                    searchInput.type = "text";
                    searchInput.placeholder = t('search');
                    searchInput.className = "cfs-preset-search";

                    const saveBtn = document.createElement("button");
                    saveBtn.className = "cfs-preset-action-btn";
                    saveBtn.innerHTML = `<i class="fas fa-save"></i>`;
                    saveBtn.title = t('saveCurrentPreset');

                    const saveAsBtn = document.createElement("button");
                    saveAsBtn.className = "cfs-preset-action-btn";
                    saveAsBtn.innerHTML = `<i class="fas fa-plus-square"></i>`;
                    saveAsBtn.title = t('saveAsPreset');

                    const searchContainer = document.createElement("div");
                    searchContainer.className = "cfs-search-container";
                    searchContainer.appendChild(searchInput);
                    searchContainer.appendChild(saveBtn);
                    searchContainer.appendChild(saveAsBtn);

                    const presetList = document.createElement("div");
                    presetList.className = "cfs-preset-list";

                    dropdown.appendChild(searchContainer);
                    dropdown.appendChild(presetList);

                    const node = this;

                    const renderPresets = (filter = "") => {
                        presetList.innerHTML = "";
                        const presets = (node.cfs_settings?.presets || []).filter(p =>
                            p.name.toLowerCase().includes(filter.toLowerCase())
                        );

                        presets.forEach(p => {
                            const item = document.createElement("div");
                            item.className = "cfs-preset-item";
                            if (p.name === node.cfs_settings.active_preset_name) {
                                item.classList.add("active");
                            }

                            const nameSpan = document.createElement("span");
                            nameSpan.textContent = p.name;
                            nameSpan.onclick = async () => {
                                node.cfs_settings.active_preset_name = p.name;
                                await api.fetchApi("/character_swap/llm_settings", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify(node.cfs_settings),
                                });

                                // Reload UI
                                wrapper.querySelectorAll(".cfs-tag").forEach(tag => tag.remove());
                                p.features.forEach(addSelectedTag);
                                updateWidgetValue();
                                presetButton.querySelector(".cfs-preset-text").textContent = p.name;
                                dropdown.remove();
                            };

                            const deleteBtn = document.createElement("div");
                            deleteBtn.className = "cfs-preset-delete-btn";
                            deleteBtn.innerHTML = "✖";
                            deleteBtn.onclick = async (e) => {
                                e.stopPropagation();
                                if (p.name === "default") return; // Cannot delete default
                                if (confirm(t('deletePresetConfirmation').replace('{presetName}', p.name))) {
                                    node.cfs_settings.presets = node.cfs_settings.presets.filter(preset => preset.name !== p.name);
                                    if (node.cfs_settings.active_preset_name === p.name) {
                                        node.cfs_settings.active_preset_name = "default";
                                        // Switch to default preset's tags
                                        const defaultPreset = node.cfs_settings.presets.find(pr => pr.name === "default");
                                        if (defaultPreset) {
                                            wrapper.querySelectorAll(".cfs-tag").forEach(tag => tag.remove());
                                            defaultPreset.features.forEach(addSelectedTag);
                                            updateWidgetValue();
                                            presetButton.querySelector(".cfs-preset-text").textContent = "default";
                                        }
                                    }
                                    await api.fetchApi("/character_swap/llm_settings", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify(node.cfs_settings),
                                    });
                                    renderPresets(searchInput.value);
                                    // alert(t('presetDeleted')); // No need for alert, UI updates
                                }
                            };

                            item.appendChild(nameSpan);
                            if (p.name !== "default") {
                                item.appendChild(deleteBtn);
                            }
                            presetList.appendChild(item);
                        });
                    };

                    searchInput.oninput = () => renderPresets(searchInput.value);

                    // "另存为" 按钮功能
                    saveAsBtn.onclick = async () => {
                        const newName = prompt(t('presetName'));
                        if (!newName || !newName.trim()) return;

                        const exists = node.cfs_settings.presets.some(p => p.name === newName.trim());
                        if (exists) {
                            alert(t('presetNameExists'));
                            return;
                        }

                        const currentTags = Array.from(wrapper.querySelectorAll(".cfs-tag-label")).map(el => el.textContent);
                        const newPreset = { name: newName.trim(), features: currentTags };
                        node.cfs_settings.presets.push(newPreset);
                        node.cfs_settings.active_preset_name = newName.trim();

                        await api.fetchApi("/character_swap/llm_settings", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(node.cfs_settings),
                        });

                        presetButton.querySelector(".cfs-preset-text").textContent = newName.trim();
                        dropdown.remove();
                    };

                    // "保存" 按钮功能
                    saveBtn.onclick = async () => {
                        const activePresetName = node.cfs_settings.active_preset_name;
                        const activePreset = node.cfs_settings.presets.find(p => p.name === activePresetName);
                        if (activePreset) {
                            const currentTags = Array.from(wrapper.querySelectorAll(".cfs-tag-label")).map(el => el.textContent);
                            activePreset.features = currentTags;

                            await api.fetchApi("/character_swap/llm_settings", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(node.cfs_settings),
                            });

                            saveBtn.style.background = '#8BC34A';
                            setTimeout(() => {
                                dropdown.remove();
                            }, 300);
                        }
                    };

                    renderPresets();
                    searchInput.focus();

                    // Close dropdown when clicking outside
                    const closeHandler = (e) => {
                        if (!dropdown.contains(e.target) && e.target !== presetButton && !presetButton.contains(e.target)) {
                            dropdown.remove();
                            document.removeEventListener("click", closeHandler, true);
                        }
                    };
                    document.addEventListener("click", closeHandler, true);
                };

                presetButton.addEventListener("click", createPresetDropdown);
                // --- 创建消息区域 ---
                const messageArea = document.createElement("div");
                messageArea.className = "cfs-message-area";
                mainContainer.appendChild(messageArea);

                mainContainer.appendChild(bottomBar);

                // --- 存储UI元素并添加DOM小部件 ---
                const uiElements = {
                    importButton,
                    exportButton,
                    debugButton,
                    settingsButton,
                    presetButton,
                    messageArea,
                };
                nodeUIs.set(this, uiElements);
                this.addDOMWidget(widgetName + "_custom", "div", mainContainer);

                // --- 自动保存逻辑 ---
                const nodeInstance = this; // 保存节点实例的引用
                const debouncedAutosave = debounce(async () => {
                    try {
                        // 1. 获取当前所有设置以避免覆盖
                        const response = await api.fetchApi("/character_swap/llm_settings");
                        if (!response.ok) throw new Error("Failed to fetch current settings.");
                        const currentSettings = await response.json();

                        // 2. 从小部件获取最新的特征列表
                        const featureWidget = nodeInstance.widgets.find(w => w.name === "target_features");
                        const currentFeatures = featureWidget ? featureWidget.value.split(",").map(t => t.trim()).filter(t => t) : [];

                        // 3. 创建新的设置对象
                        const newSettings = { ...currentSettings };
                        const activePresetName = newSettings.active_preset_name || "default";
                        let presetFound = false;
                        if (newSettings.presets) {
                            for (let preset of newSettings.presets) {
                                if (preset.name === activePresetName) {
                                    preset.features = currentFeatures;
                                    presetFound = true;
                                    break;
                                }
                            }
                        }
                        if (!presetFound) {
                            if (!newSettings.presets) newSettings.presets = [];
                            newSettings.presets.push({ name: activePresetName, features: currentFeatures });
                        }

                        // 4. 将更新后的设置发送回服务器
                        const saveResponse = await api.fetchApi("/character_swap/llm_settings", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(newSettings),
                        });

                        if (!saveResponse.ok) throw new Error("Failed to save settings.");

                        // console.log("CFS: Features autosaved."); // 可以在调试时取消注释

                    } catch (error) {
                        console.error("CFS: Autosave failed.", error);
                        // 可以在这里添加一个小的UI提示，告知用户自动保存失败
                    }
                }, 500); // 500毫秒延迟



                // 从服务器加载设置并应用 target_features
                api.fetchApi("/character_swap/llm_settings")
                    .then(response => response.json())
                    .then(settings => {
                        this.cfs_settings = settings; // 在节点上缓存设置
                        currentLanguage = settings.language || 'zh';
                        const ui = nodeUIs.get(this);
                        if (ui) {
                            checkConnectionStatus(ui, settings);
                        }
                        updateAllNodeUIs();

                        wrapper.querySelectorAll(".cfs-tag").forEach(tag => tag.remove());

                        const activePresetName = settings.active_preset_name || "default";
                        const activePreset = settings.presets?.find(p => p.name === activePresetName);

                        let tagsToRender = [];
                        if (activePreset && Array.isArray(activePreset.features)) {
                            tagsToRender = activePreset.features;
                        } else {
                            // Fallback if preset not found or features are missing
                            const defaultPreset = settings.presets?.find(p => p.name === "default");
                            if (defaultPreset && Array.isArray(defaultPreset.features)) {
                                tagsToRender = defaultPreset.features;
                                this.cfs_settings.active_preset_name = "default"; // Correct active preset name
                            } else {
                                tagsToRender = (originalWidget.value || "").split(",").map(t => t.trim()).filter(t => t);
                            }
                        }

                        tagsToRender.forEach(addSelectedTag);
                        updateWidgetValue();

                        // 更新预设按钮的文本
                        const presetButtonText = ui.presetButton.querySelector(".cfs-preset-text");
                        if (presetButtonText) {
                            presetButtonText.textContent = activePresetName;
                        }
                    })
                    .catch(error => {
                        // 如果加载失败，则使用小部件的默认值
                        console.error("CFS: Failed to load settings for tags, using default.", error);
                        const initialTags = (originalWidget.value || "").split(",").filter(t => t.trim());
                        initialTags.forEach(addSelectedTag);
                    });

                // --- 添加调试日志 ---
                console.log("CFS Debug: Wrapper element", wrapper);
                console.log("CFS Debug: Wrapper offsetHeight", wrapper.offsetHeight);
                console.log("CFS Debug: Wrapper computedStyle", getComputedStyle(wrapper));


                // --- 添加样式 (保持不变) ---
                // --- Font Awesome ---
                if (!document.querySelector('link[href*="font-awesome"]')) {
                    const faLink = document.createElement('link');
                    faLink.rel = 'stylesheet';
                    faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css';
                    document.head.appendChild(faLink);
                }

                // --- 添加样式 (保持不变) ---
                if (!document.getElementById("cfs-custom-styles")) {
                    const style = document.createElement('style');
                    style.id = "cfs-custom-styles";
                    style.textContent = `
                        /* 全局样式调整 */
                        :root {
                            --cfs-text-color: #E0E0E0;
                            --cfs-background-dark: #2a2a2a;
                            --cfs-background-medium: #333333;
                            --cfs-border-color: #555555;
                            --cfs-widget-border-color: #c53939; /* A more vibrant red for the main border */
                            --cfs-widget-bg: linear-gradient(145deg, #383838, #2e2e2e); /* Subtle gradient for the background */
                            --cfs-add-button-bg: #444444;
                            --cfs-add-button-border: #666666;
                            --cfs-hover-bg: #555555;
                            --cfs-selected-bg: #666666;
                        }

                        /* Main container for dynamic layout */
                        .cfs-main-container {
                            display: flex;
                            flex-direction: column;
                            min-height: 150px;  /* Set a default height for the whole widget area */
                            height: 100%; /* Make the container fill the available vertical space */
                            justify-content: space-between; /* Push content and bottom bar apart */
                        }

                        /* Message Area Styles */
                        .cfs-message-area {
                            padding: 4px 8px;
                            margin: 0 4px 4px 4px; /* Top, H, Bottom, H */
                            color: #FF9800; /* Warning color */
                            background-color: rgba(255, 152, 0, 0.1);
                            border: 1px solid rgba(255, 152, 0, 0.3);
                            border-radius: 4px;
                            font-size: 12px;
                            text-align: center;
                            display: none; /* Hidden by default */
                            flex-shrink: 0;
                        }

                        /* Bottom Bar Styles */
                        .cfs-bottom-bar {
                            width: 100%;
                            display: flex;
                            gap: 8px;
                            box-sizing: border-box;
                            padding: 8px 4px; /* Adjust horizontal padding */
                            flex-shrink: 0; /* Prevent buttons from shrinking */
                        }
                        .cfs-bottom-button {
                            height: 28px;
                            padding: 0 12px;
                            background-color: #333;
                            color: #E0E0E0;
                            border: 1px solid #555;
                            border-radius: 4px;
                            cursor: pointer;
                            text-align: center;
                            font-size: 12px;
                            transition: background-color 0.2s;
                            flex-shrink: 0;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            gap: 6px; /* Icon-text spacing */
                        }
                        .cfs-bottom-button:hover {
                            background-color: #444;
                            color: #fff;
                        }
                        .cfs-bottom-button:active {
                           background-color: #2a2a2a;
                        }
                        .cfs-settings-button {
                           margin-left: auto;
                        }

                        .cfs-preset-button-container {
                            position: absolute;
                            bottom: 8px;
                            right: 8px;
                        }

                        /* New style for the button inside the widget */
                        .cfs-preset-button-widget {
                            background-color: #222;
                            border: 1px solid #555;
                            color: #E0E0E0;
                            border-radius: 4px;
                            padding: 4px 12px;
                            cursor: pointer;
                            font-size: 13px;
                            height: 26px;
                            box-sizing: border-box;
                            width: auto; /* Let width be dynamic */
                            display: inline-flex; /* Use inline-flex for dynamic width */
                            align-items: center;
                            justify-content: center;
                            gap: 6px; /* Space between text and arrow */
                        }
                        .cfs-preset-button-widget .cfs-preset-text {
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            max-width: 120px; /* Prevent extremely long names from breaking layout */
                        }
                        .cfs-preset-button-widget .cfs-preset-arrow {
                            font-size: 10px;
                        }
                        .cfs-preset-button-widget:hover {
                            border-color: #888;
                        }

                        /* Preset Dropdown Styles */
                        .cfs-preset-dropdown {
                            position: fixed;
                            z-index: 2100;
                            background: #2a2a2a;
                            border: 1px solid #555;
                            border-radius: 6px;
                            box-shadow: 0 5px 15px rgba(0,0,0,0.5);
                            display: flex;
                            flex-direction: column;
                            padding: 5px;
                            gap: 5px;
                            min-width: 180px; /* Ensure minimum width */
                        }
                        .cfs-search-container {
                            display: flex;
                            align-items: center;
                            gap: 5px;
                        }
                        .cfs-preset-search {
                            flex-grow: 1;
                            padding: 8px;
                            margin: 0;
                            border: 1px solid #444;
                            background: #222;
                            color: #eee;
                            outline: none;
                            font-size: 13px;
                            border-radius: 4px;
                        }
                        .cfs-preset-action-btn {
                            flex-shrink: 0;
                            cursor: pointer;
                            width: 32px;
                            height: 32px;
                            font-size: 14px;
                            color: #ccc;
                            background: #3a3a3a;
                            border: 1px solid #444;
                            border-radius: 4px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            transition: all 0.2s;
                            padding: 0;
                        }
                        .cfs-preset-action-btn:hover {
                            background: #4a4a4a;
                            color: white;
                        }
                        .cfs-preset-action-btn:disabled {
                            opacity: 0.5;
                            cursor: not-allowed;
                            background: #3a3a3a;
                            color: #666;
                        }
                        .cfs-preset-list {
                            max-height: 200px;
                            overflow-y: auto;
                            display: flex;
                            flex-direction: column;
                            scrollbar-width: thin;
                            scrollbar-color: #555 #2a2a2a;
                        }
                        .cfs-preset-item {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            padding: 8px 10px;
                            color: #ccc;
                            cursor: pointer;
                            border-radius: 4px;
                        }
                        .cfs-preset-item:hover {
                            background: #3a3a3a;
                        }
                        .cfs-preset-item.active {
                            background: #03A9F4;
                            color: white;
                        }
                        .cfs-preset-item.active:hover {
                            background: #0288D1;
                        }
                        .cfs-preset-item span {
                            flex-grow: 1;
                        }
                        .cfs-preset-delete-btn {
                            padding: 2px 6px;
                            border-radius: 4px;
                            font-size: 12px;
                            opacity: 0.7;
                            font-weight: bold;
                        }
                        .cfs-preset-delete-btn:hover {
                            background: rgba(255, 82, 82, 0.3);
                            color: #ff5252;
                            opacity: 1;
                        }
                        .cfs-search-container {
                            display: flex;
                            align-items: center;
                            gap: 5px;
                        }
                        .cfs-preset-search {
                            flex-grow: 1;
                            padding: 8px;
                            margin: 0;
                            border: 1px solid #444;
                            background: #222;
                            color: #eee;
                            outline: none;
                            font-size: 13px;
                            border-radius: 4px;
                        }
                        /* This style block is now handled by .cfs-preset-action-btn */

                        /* New Settings Dialog Styles */
                        .cfs-new-settings-dialog {
                            position: fixed;
                            z-index: 2000;
                            left: 50%;
                            top: 50%;
                            transform: translate(-50%, -50%);
                            width: 90%;
                            max-width: 700px;
                            background: #2c2c2c;
                            border: 1px solid #444;
                            border-radius: 8px;
                            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                            display: flex;
                            flex-direction: column;
                            animation: cfs-fade-in 0.2s ease-out;
                        }
                        .cfs-new-settings-content {
                            display: flex;
                            flex-grow: 1;
                        }
                        .cfs-new-settings-sidebar {
                            width: 150px; /* Increased from 120px */
                            min-width: 150px; /* Ensure it doesn't shrink */
                            padding: 15px; /* Simplified padding */
                            border-right: 1px solid #444;
                            display: flex;
                            flex-direction: column;
                            gap: 8px; /* Slightly reduced gap */
                        }
                        .cfs-new-settings-tab {
                            width: 100%;
                            padding: 12px 18px; /* Increased padding for more space */
                            background: transparent;
                            border: none; /* Remove border */
                            color: #ccc;
                            text-align: left;
                            cursor: pointer;
                            border-radius: 0; /* Remove border-radius for a cleaner look */
                            font-size: 14px;
                            font-weight: 500; /* Set a consistent font-weight */
                            transition: background-color 0.2s, color 0.2s; /* Smooth transitions */
                            box-sizing: border-box;
                            white-space: nowrap; /* Prevent text from wrapping */
                            overflow: hidden; /* Hide overflowing text */
                            text-overflow: ellipsis; /* Add ellipsis for overflowing text */
                        }
                        .cfs-new-settings-tab:hover {
                            background: #3a3a3a; /* A slightly different hover color */
                            color: #fff;
                        }
                        .cfs-new-settings-tab.active {
                            background: #454545; /* A more distinct active background */
                            color: #fff;
                            box-shadow: inset 3px 0 0 0 #03A9F4; /* Use box-shadow for indicator */
                        }
                        #cfs-language-options {
                            display: flex;
                            gap: 10px;
                            margin-top: 10px;
                        }
                        .cfs-language-button {
                            padding: 8px 16px;
                            border: 1px solid #555;
                            border-radius: 5px;
                            background-color: #333;
                            color: #ccc;
                            cursor: pointer;
                            transition: all 0.2s;
                        }
                        .cfs-language-button:hover {
                            background-color: #444;
                            border-color: #777;
                        }
                        .cfs-language-button.active {
                            background-color: #03A9F4;
                            color: white;
                            border-color: #03A9F4;
                        }
                        .cfs-new-settings-main {
                            flex-grow: 1;
                            padding: 20px;
                            overflow-y: auto;
                        }
                        .cfs-new-settings-pane {
                            display: none;
                        }
                        .cfs-new-settings-pane.active {
                            display: block;
                        }
                        .cfs-new-settings-pane h3 {
                            margin-top: 0;
                            margin-bottom: 20px;
                            color: #E0E0E0;
                            border-bottom: 1px solid #444;
                            padding-bottom: 10px;
                        }
                        .cfs-new-settings-pane label, .cfs-new-settings-pane p {
                            color: #ccc;
                            font-size: 13px;
                        }
                        .cfs-new-settings-pane input[type="text"],
                        .cfs-new-settings-pane input[type="password"],
                        .cfs-new-settings-pane textarea,
                        .cfs-new-settings-pane select {
                            width: 100%;
                            padding: 8px;
                            margin-top: 4px;
                            margin-bottom: 12px;
                            box-sizing: border-box;
                            background-color: #222;
                            border: 1px solid #555;
                            color: #E0E0E0;
                            border-radius: 4px;
                        }
                        .cfs-new-settings-buttons {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            padding: 15px 20px;
                            border-top: 1px solid #444;
                            gap: 10px;
                        }
                        #cfs-save-new-settings, #cfs-close-new-dialog {
                            padding: 8px 16px;
                            border: none;
                            border-radius: 5px;
                            cursor: pointer;
                            font-weight: bold;
                        }
                        #cfs-save-new-settings {
                            background: #03A9F4;
                            color: #fff;
                        }
                        #cfs-close-new-dialog {
                            background: #4f4f4f;
                            color: #ccc;
                        }


                        /* Custom Searchable Select */
                        .cfs-custom-select-wrapper {
                            position: relative;
                            width: 100%;
                        }
                        .cfs-custom-select-selected {
                            width: 100%;
                            padding: 8px;
                            box-sizing: border-box;
                            background-color: #222;
                            border: 1px solid #555;
                            color: #E0E0E0;
                            border-radius: 4px;
                            cursor: pointer;
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            position: relative;
                        }
                        .cfs-custom-select-selected:after {
                            content: '↕';
                            position: absolute;
                            right: 10px;
                            top: 50%;
                            transform: translateY(-50%);
                            color: #ccc;
                            font-size: 14px;
                        }
                        .cfs-custom-select-items {
                            position: fixed; /* Use fixed to break out of dialog */
                            z-index: 2100;
                            background: #333;
                            border: 1px solid #555;
                            border-radius: 4px;
                            max-height: 300px;
                            display: flex;
                            flex-direction: column;
                            box-shadow: 0 5px 15px rgba(0,0,0,0.5);
                        }
                        .cfs-select-hide {
                            display: none;
                        }
                        #cfs-model-search-input {
                            flex-shrink: 0;
                            padding: 10px;
                            margin: 0;
                            border: none;
                            border-bottom: 1px solid #555;
                            background: #2a2a2a;
                            color: #eee;
                            outline: none;
                            font-size: 14px;
                        }
                        #cfs-model-options {
                            overflow-y: auto;
                            flex-grow: 1;
                        }
                        #cfs-model-options div {
                            padding: 10px 12px;
                            color: #ccc;
                            cursor: pointer;
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                        }
                        #cfs-model-options div:hover {
                            background: #4a4a4a;
                        }
                        #cfs-model-options div.selected {
                            background: #03A9F4;
                            color: white;
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

                        /* Help Panel Animations */
                        @keyframes cfs-fade-in {
                            from { opacity: 0; }
                            to { opacity: 1; }
                        }
                        @keyframes cfs-scale-up {
                            from { transform: scale(0.95); opacity: 0; }
                            to { transform: scale(1); opacity: 1; }
                        }

                        /* Help Panel */
                        .cfs-help-panel {
                            position: fixed;
                            z-index: 1001;
                            left: 0;
                            top: 0;
                            width: 100%;
                            height: 100%;
                            background-color: rgba(0, 0, 0, 0.8); /* Darker overlay */
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            animation: cfs-fade-in 0.2s ease-out;
                        }
                        .cfs-help-panel-content {
                            background: #2c2c2c;
                            padding: 20px 25px;
                            border: 1px solid #444;
                            width: 90%;
                            max-width: 650px;
                            border-radius: 8px;
                            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                            display: flex;
                            flex-direction: column;
                            gap: 15px;
                            animation: cfs-scale-up 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                        }
                        .cfs-help-panel-content h2 {
                            color: #E0E0E0;
                            margin: 0;
                            text-align: center;
                            font-size: 18px;
                            font-weight: 600;
                            border-bottom: 1px solid #444;
                            padding-bottom: 10px;
                            margin-bottom: 5px;
                        }
                        .cfs-help-panel-content pre {
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                            font-size: 14.5px;
                            color: #e0e0e0;
                            white-space: pre-wrap;
                            word-wrap: break-word;
                            background-color: transparent;
                            padding: 0;
                            border-radius: 0;
                            border: none;
                            line-height: 1.8;
                        }
                        .cfs-help-panel-close-button {
                            background: #4f4f4f;
                            color: #fff;
                            border: none;
                            padding: 8px 20px;
                            border-radius: 5px;
                            cursor: pointer;
                            transition: all 0.2s ease;
                            align-self: center;
                            font-weight: 600;
                            box-shadow: none;
                            margin-top: 10px;
                        }
                        .cfs-help-panel-close-button:hover {
                            background: #666;
                        }

                        /* Widget Wrapper (Tag Area) */
                        .cfs-widget-wrapper {
                            position: relative; /* For positioning context */
                            width: 100%;
                            display: flex;
                            flex-wrap: wrap;
                            gap: 6px; /* A bit more space */
                            padding: 8px !important;
                            padding-bottom: 16px !important; /* Add more padding to the bottom */
                            border: 1px solid #000; /* Almost invisible border */
                            background: #1a1a1a; /* Very dark background */
                            border-radius: 6px; /* Standard ComfyUI radius */
                            box-sizing: border-box;
                            box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5); /* Deep inner shadow */
                            align-content: flex-start; /* Use align-content for multi-line flex alignment */
                            flex-grow: 1; /* Allow this area to grow */
                            overflow-y: auto; /* Allow scrolling */
                            min-height: 120px; /* 为标签区域设置一个最小高度 */
                        }

                        /* Help Icon */
                        .cfs-help-icon {
                            position: absolute;
                            top: 4px;
                            right: 4px;
                            width: 16px;
                            height: 16px;
                            background-color: #444;
                            color: #ccc;
                            border: 1px solid #666;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 11px;
                            font-weight: bold;
                            cursor: help;
                            z-index: 10;
                            transition: all 0.2s;
                        }
                        .cfs-help-icon:hover {
                            background-color: #555;
                            color: #fff;
                        }

                        /* Tag styles */
                        .cfs-tag {
                            /* background-color is set by JS, using rgba(..., 0.3) for softer look */
                            padding: 4px 10px; /* More horizontal padding */
                            border-radius: 12px; /* Pill-shaped */
                            border: 1px solid; /* border-color is set by JS */
                            display: inline-flex;
                            align-items: center;
                            font-size: 13px;
                            font-weight: normal; /* Cleaner look */
                            /* box-shadow: none; */ /* Flat design */
                            transition: all 0.2s ease-in-out;
                            height: 26px;
                            line-height: 18px;
                            cursor: default;
                        }
                        .cfs-tag:hover {
                           /* No hover effect to keep it clean */
                        }

                        /* Remove button for tags */
                        .cfs-remove-btn {
                            cursor: pointer;
                            margin-left: 8px;
                            font-weight: bold;
                            font-size: 12px;
                            color: inherit;
                            opacity: 0.6;
                            transition: all 0.2s;
                            line-height: 1;
                        }
                        .cfs-remove-btn:hover {
                            opacity: 1;
                            transform: scale(1.1);
                        }
                        .cfs-remove-btn:active {
                            transform: none;
                        }

                        /* Add Tag Button */
                        .cfs-add-tag-button {
                            background-color: #2a2a2a;
                            color: #888;
                            border: 1px solid #333;
                            border-radius: 50%;
                            width: 26px;
                            height: 26px;
                            font-size: 18px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            cursor: pointer;
                            transition: all 0.2s;
                            flex-shrink: 0;
                            line-height: 26px;
                        }
                        .cfs-add-tag-button:hover {
                            background-color: #333;
                            color: #aaa;
                            border-color: #555;
                        }
                        .cfs-add-tag-button:active {
                        }

                        /* Temporary Input for adding tags */
                        .cfs-temp-input {
                            background-color: #333;
                            border: 1px solid #555;
                            color: #E0E0E0;
                            padding: 4px 10px;
                            border-radius: 12px;
                            font-size: 13px;
                            height: 26px;
                            box-sizing: border-box;
                            outline: none;
                            width: 120px; /* Give it a default width */
                            transition: all 0.2s;
                        }
                        .cfs-temp-input:focus {
                            border-color: #888;
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
                        }
                        .cfs-selectable-tag.selected {
                            background-color: var(--cfs-selected-bg);
                            color: var(--cfs-text-color);
                            cursor: not-allowed;
                            border-color: var(--cfs-text-color);
                        }
                        .cfs-llm-test-buttons {
                            display: flex;
                            gap: 10px;
                            margin-top: 15px;
                        }
                        .cfs-social-buttons {
                            display: flex;
                            gap: 8px;
                        }
                        .cfs-social-buttons button {
                            padding: 10px 16px;
                            border-radius: 6px;
                            color: white;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 500;
                            transition: all 0.2s ease;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            min-width: 80px;
                            border: 1px solid;
                        }
                        #cfs-github-button {
                            background-color: #24292e;
                            border-color: #24292e;
                        }
                        #cfs-discord-button {
                            background-color: #5865F2;
                            border-color: #5865F2;
                        }
                        .cfs-social-buttons button:hover {
                            opacity: 0.9;
                            transform: translateY(-1px);
                        }
                        .cfs-llm-test-buttons button {
                            padding: 6px 12px;
                            border: 1px solid #555;
                            border-radius: 5px;
                            background-color: #3a3a3a;
                            color: #ccc;
                            cursor: pointer;
                            font-size: 12px;
                            transition: background-color 0.2s;
                        }
                        .cfs-llm-test-buttons button:hover {
                            background-color: #4a4a4a;
                        }
                        .cfs-llm-test-buttons button:disabled {
                            background-color: #2a2a2a;
                            color: #666;
                            cursor: not-allowed;
                        }
                        .cfs-llm-test-result {
                            margin-top: 10px;
                            padding: 8px;
                            background-color: #222;
                            border: 1px solid #444;
                            border-radius: 4px;
                            font-size: 12px;
                            color: #ccc;
                            white-space: pre-wrap;
                            word-wrap: break-word;
                            display: none; /* Hidden by default */
                            max-height: 150px;
                            overflow-y: auto;
                        }
                    `;
                    document.head.appendChild(style);
                }


                // 强制节点在创建后重新计算其大小
                this.size = this.computeSize();
                this.setDirtyCanvas(true, true);
            };

            const onNodeRemoved_orig = nodeType.prototype.onNodeRemoved;
            nodeType.prototype.onNodeRemoved = function () {
                nodeUIs.delete(this);
                if (onNodeRemoved_orig) {
                    onNodeRemoved_orig.apply(this, arguments);
                }
            };
        }
    }
});
