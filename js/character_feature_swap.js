import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

// 创建设置对话框
function createSettingsDialog(node) {
    const dialog = document.createElement("div");
    dialog.className = "danbooru-gallery-settings-dialog"; // 可以复用一些样式

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

    // 加载当前设置
    api.fetchApi("/character_swap/llm_settings")
        .then(response => response.json())
        .then(settings => {
            apiUrlInput.value = settings.api_url || "";
            apiKeyInput.value = settings.api_key || "";
            modelInput.value = settings.model || "";
            customPromptInput.value = settings.custom_prompt || "";
        })
        .catch(err => console.error("无法加载LLM设置:", err));

    // 保存设置
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
        })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    alert("设置已保存！");
                    dialog.remove();
                } else {
                    alert("保存失败: " + result.error);
                }
            })
            .catch(err => {
                console.error("保存LLM设置失败:", err);
                alert("保存失败，请查看控制台日志。");
            });
    });

    // 关闭对话框
    dialog.querySelector("#cfs-close-dialog").addEventListener("click", () => {
        dialog.remove();
    });
}

// 扩展 ComfyUI
app.registerExtension({
    name: "Comfy.CharacterFeatureSwap",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "CharacterFeatureSwapNode") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                onNodeCreated?.apply(this, arguments);

                // 添加设置按钮
                const settingsButton = this.addWidget(
                    "button",
                    "设置 (Settings)",
                    null,
                    () => {
                        // 检查是否已存在对话框
                        if (document.querySelector(".danbooru-gallery-settings-dialog")) {
                            return;
                        }
                        createSettingsDialog(this);
                    }
                );
                settingsButton.serialize = false; // 不保存按钮状态
            };
        }
    },
});