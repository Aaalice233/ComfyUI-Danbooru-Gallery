/**
 * Open In Krita - 前端JavaScript扩展
 * 添加按钮和UI交互功能
 */

import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";
import { globalToastManager } from "../global/toast_manager.js";

app.registerExtension({
    name: "open_in_krita",

    async init(app) {
        // 监听来自Python后端的Toast通知
        api.addEventListener("open-in-krita-notification", (event) => {
            const { message, type } = event.detail;
            const duration = type === "success" ? 3000 : 5000;
            globalToastManager.showToast(message, type || "info", duration);
        });
    },

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "OpenInKrita") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;

            nodeType.prototype.onNodeCreated = function () {
                onNodeCreated?.apply(this, arguments);

                // 设置节点初始大小和最小尺寸
                this.size = [280, 290];
                this.min_size = [280, 290];

                // 添加样式（只添加一次）
                addStyles();

                // 创建按钮容器
                const container = document.createElement('div');
                container.className = 'oik-buttons-container';

                // 创建四个按钮
                container.innerHTML = `
                    <button class="oik-button oik-button-primary" data-action="reinstallPlugin">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                        </svg>
                        <span>重新安装插件</span>
                    </button>
                    <button class="oik-button oik-button-secondary" data-action="setPath">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"></path>
                            <polygon points="18 2 22 6 12 16 8 16 8 12 18 2"></polygon>
                        </svg>
                        <span>设置Krita路径</span>
                    </button>
                    <button class="oik-button oik-button-secondary" data-action="checkPlugin">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        <span>检查Krita插件</span>
                    </button>
                    <button class="oik-button oik-button-danger" data-action="cancelWait">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                        <span>终止执行</span>
                    </button>
                `;

                // 绑定按钮事件
                const node = this;
                container.querySelectorAll('.oik-button').forEach(button => {
                    button.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        const action = button.getAttribute('data-action');
                        if (action === 'reinstallPlugin') {
                            reinstallPlugin(node);
                        } else if (action === 'setPath') {
                            setKritaPath(node);
                        } else if (action === 'checkPlugin') {
                            checkPluginStatus(node);
                        } else if (action === 'cancelWait') {
                            cancelWait(node);
                        }
                    });
                });

                // 添加DOM widget
                this.addDOMWidget("oik_buttons", "div", container, {
                    serialize: false,
                    hideOnZoom: false
                });

                // 处理节点大小调整，确保最小尺寸
                this.onResize = function (size) {
                    // 强制限制最小尺寸
                    if (size[0] < this.min_size[0]) {
                        size[0] = this.min_size[0];
                    }
                    if (size[1] < this.min_size[1]) {
                        size[1] = this.min_size[1];
                    }
                    app.graph.setDirtyCanvas(true);
                };
            };
        }
    }
});

/**
 * 添加样式（只添加一次）
 */
function addStyles() {
    if (document.querySelector('#oik-styles')) return;

    const style = document.createElement('style');
    style.id = 'oik-styles';
    style.textContent = `
        .oik-buttons-container {
            display: flex;
            flex-direction: column;
            gap: 6px;
            padding: 8px;
            width: 100%;
        }

        .oik-button {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 8px 12px;
            border: none;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            color: #fff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        .oik-button svg {
            flex-shrink: 0;
        }

        .oik-button span {
            white-space: nowrap;
        }

        .oik-button-primary {
            background: linear-gradient(135deg, #743795 0%, #5a2c75 100%);
            border: 1px solid rgba(116, 55, 149, 0.5);
        }

        .oik-button-primary:hover {
            background: linear-gradient(135deg, #8b4ba8 0%, #6a3a85 100%);
            border-color: rgba(116, 55, 149, 0.7);
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(116, 55, 149, 0.3);
        }

        .oik-button-primary:active {
            transform: translateY(0);
            box-shadow: 0 1px 4px rgba(116, 55, 149, 0.2);
        }

        .oik-button-secondary {
            background: rgba(80, 80, 100, 0.6);
            border: 1px solid rgba(150, 150, 170, 0.3);
        }

        .oik-button-secondary:hover {
            background: rgba(100, 100, 120, 0.7);
            border-color: rgba(150, 150, 170, 0.5);
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .oik-button-secondary:active {
            transform: translateY(0);
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
        }

        .oik-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none !important;
        }

        .oik-button-danger {
            background: rgba(239, 68, 68, 0.8);
            border: 1px solid rgba(239, 68, 68, 0.5);
        }

        .oik-button-danger:hover {
            background: rgba(220, 38, 38, 0.9);
            border-color: rgba(239, 68, 68, 0.7);
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
        }

        .oik-button-danger:active {
            transform: translateY(0);
            box-shadow: 0 1px 4px rgba(239, 68, 68, 0.2);
        }
    `;
    document.head.appendChild(style);
}

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
            const message = `✓ Krita插件已重新安装\n版本: ${result.version}\n路径: ${result.pykrita_dir}\n\n请重启Krita并启用插件：\nSettings → Configure Krita → Python Plugin Manager`;
            globalToastManager.showToast(message, "success", 10000);
        } else {
            globalToastManager.showToast(`安装失败: ${result.message || "未知错误"}`, "error", 5000);
        }

    } catch (error) {
        console.error("[OpenInKrita] Error reinstalling plugin:", error);
        globalToastManager.showToast(`网络错误: ${error.message}`, "error", 5000);
    }
}

/**
 * 设置Krita路径
 */
async function setKritaPath(node) {
    try {
        globalToastManager.showToast("正在打开文件选择对话框...", "info", 2000);

        // 调用文件浏览API
        const browseResponse = await api.fetchApi("/open_in_krita/browse_path", {
            method: "GET"
        });

        if (!browseResponse.ok) {
            const error = await browseResponse.text();
            globalToastManager.showToast(`打开文件选择对话框失败: ${error}`, "error", 5000);
            return;
        }

        const browseResult = await browseResponse.json();

        // 处理用户取消选择
        if (browseResult.status === "cancelled") {
            globalToastManager.showToast("已取消选择", "info", 2000);
            return;
        }

        // 处理错误（如tkinter不可用）
        if (browseResult.status === "error") {
            globalToastManager.showToast(`文件选择失败: ${browseResult.message}`, "error", 5000);
            return;
        }

        // 获取用户选择的路径
        const selectedPath = browseResult.path;

        if (!selectedPath) {
            return;
        }

        // 显示正在设置的提示
        globalToastManager.showToast("正在设置Krita路径...", "info", 2000);

        // 调用现有的set_path API保存路径
        const setResponse = await api.fetchApi("/open_in_krita/set_path", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                path: selectedPath
            })
        });

        if (!setResponse.ok) {
            const error = await setResponse.text();
            globalToastManager.showToast(`设置失败: ${error}`, "error", 5000);
            return;
        }

        const result = await setResponse.json();

        if (result.status === "success") {
            globalToastManager.showToast(`✓ Krita路径已设置: ${result.path}`, "success", 4000);
        } else {
            globalToastManager.showToast(`设置失败: ${result.message}`, "error", 5000);
        }

    } catch (error) {
        console.error("[OpenInKrita] Error setting Krita path:", error);
        globalToastManager.showToast(`网络错误: ${error.message}`, "error", 5000);
    }
}

/**
 * 检查Krita插件状态
 */
async function checkPluginStatus(node) {
    try {
        globalToastManager.showToast("正在检查Krita插件状态...", "info", 2000);

        const response = await api.fetchApi("/open_in_krita/check_plugin", {
            method: "GET"
        });

        if (!response.ok) {
            const error = await response.text();
            globalToastManager.showToast(`检查失败: ${error}`, "error", 5000);
            return;
        }

        const result = await response.json();

        let message = "";
        if (result.installed) {
            message = `✓ Krita插件已安装\n版本: ${result.version || "未知"}\n路径: ${result.pykrita_dir}`;
        } else {
            message = `✗ Krita插件未安装\n目标路径: ${result.pykrita_dir}\n\n插件会在节点首次运行时自动安装`;
        }

        if (result.krita_path) {
            message += `\n\nKrita路径: ${result.krita_path}`;
        } else {
            message += `\n\n⚠ 未检测到Krita，请设置Krita路径`;
        }

        globalToastManager.showToast(message, result.installed ? "success" : "warning", 8000);

    } catch (error) {
        console.error("[OpenInKrita] Error checking plugin status:", error);
        globalToastManager.showToast(`网络错误: ${error.message}`, "error", 5000);
    }
}

/**
 * 取消等待执行
 */
async function cancelWait(node) {
    try {
        globalToastManager.showToast("正在取消等待...", "info", 2000);

        const response = await api.fetchApi("/open_in_krita/cancel_wait", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                node_id: node.id.toString()
            })
        });

        if (!response.ok) {
            const error = await response.text();
            globalToastManager.showToast(`取消失败: ${error}`, "error", 5000);
            return;
        }

        const result = await response.json();

        if (result.status === "success") {
            globalToastManager.showToast("✓ 已取消等待", "success", 3000);
        } else {
            globalToastManager.showToast(result.message || "取消失败", "error", 5000);
        }

    } catch (error) {
        console.error("[OpenInKrita] Error cancelling wait:", error);
        globalToastManager.showToast(`网络错误: ${error.message}`, "error", 5000);
    }
}

console.log("[OpenInKrita] Frontend extension loaded");
