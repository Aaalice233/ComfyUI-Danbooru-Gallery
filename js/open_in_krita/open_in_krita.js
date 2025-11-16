/**
 * Fetch From Krita - 前端JavaScript扩展
 * 为从Krita获取数据节点添加右键菜单功能和重新安装插件按钮
 */

import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";
import { globalToastManager } from "../global/toast_manager.js";
import { createLogger } from '../global/logger_client.js';

// 创建logger实例
const logger = createLogger('fetch_from_krita');

// 添加按钮样式
const style = document.createElement('style');
style.textContent = `
    .fetch-from-krita-button {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 6px;
        padding: 8px 16px;
        margin: 4px 0;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.3s ease;
        box-shadow: 0 2px 6px rgba(102, 126, 234, 0.3);
        width: 100%;
        text-align: center;
    }

    .fetch-from-krita-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
    }

    .fetch-from-krita-button:active {
        transform: translateY(0);
        box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
    }
`;
document.head.appendChild(style);

app.registerExtension({
    name: "fetch_from_krita",

    async init(app) {
        // 监听来自Python后端的Toast通知
        api.addEventListener("open-in-krita-notification", (event) => {
            const { message, type } = event.detail;
            const duration = type === "success" ? 3000 : 5000;
            globalToastManager.showToast(message, type || "info", duration);
        });
    },

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        // 支持两个节点名称：新的FetchFromKrita和旧的OpenInKrita（向后兼容）
        if (nodeData.name === "FetchFromKrita" || nodeData.name === "OpenInKrita") {
            logger.info(`[FetchFromKrita] Registering node extension for ${nodeData.name}`);

            // 添加右键菜单选项
            const originalGetExtraMenuOptions = nodeType.prototype.getExtraMenuOptions;
            nodeType.prototype.getExtraMenuOptions = function(_, options) {
                // 调用原始方法（如果存在）
                if (originalGetExtraMenuOptions) {
                    originalGetExtraMenuOptions.apply(this, arguments);
                }

                // 添加菜单分隔符
                options.push(null);

                // 菜单选项：重新安装插件
                options.push({
                    content: "重新安装Krita插件",
                    callback: async () => {
                        await reinstallPlugin(this);
                    }
                });
            };

            // 在节点创建时添加按钮
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function() {
                if (onNodeCreated) {
                    onNodeCreated.apply(this, arguments);
                }

                // 创建"重新安装插件"按钮
                const reinstallButton = document.createElement('button');
                reinstallButton.textContent = '🔄 重新安装Krita插件';
                reinstallButton.className = 'fetch-from-krita-button';
                reinstallButton.onclick = async () => {
                    await reinstallPlugin(this);
                };

                // 添加按钮到节点
                this.addDOMWidget("reinstall_plugin_btn", "button", reinstallButton, {
                    serialize: false
                });

                logger.info(`[FetchFromKrita] Button added to node ${this.id}`);
            };

            logger.info(`[FetchFromKrita] Node extension registered successfully for ${nodeData.name}`);
        }
    }
});


/**
 * 重新安装Krita插件
 */
async function reinstallPlugin(node) {
    try {
        globalToastManager.showToast("正在重新安装Krita插件...", "info", 2000);

        const response = await api.fetchApi("/open_in_krita/reinstall_plugin", {
            method: "POST"
        });

        if (!response.ok) {
            const error = await response.text();
            globalToastManager.showToast(`重新安装失败: ${error}`, "error", 5000);
            return;
        }

        const result = await response.json();

        if (result.status === "success") {
            const message = `✓ Krita插件已重新安装\n版本: ${result.version}\n路径: ${result.pykrita_dir}\n\n插件已自动启用，请重启Krita以使用新版本`;
            globalToastManager.showToast(message, "success", 10000);
        } else {
            globalToastManager.showToast(`安装失败: ${result.message || "未知错误"}`, "error", 5000);
        }

    } catch (error) {
        logger.error("[FetchFromKrita] Error reinstalling plugin:", error);
        globalToastManager.showToast(`网络错误: ${error.message}`, "error", 5000);
    }
}

logger.info("[FetchFromKrita] Frontend extension loaded");
