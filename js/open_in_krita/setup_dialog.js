/**
 * Krita设置引导对话框
 * 当检测到未配置Krita路径时显示友好的引导界面
 */

import { api } from "/scripts/api.js";
import { globalToastManager } from "../global/toast_manager.js";

import { createLogger } from '../global/logger_client.js';

// 创建logger实例
const logger = createLogger('setup_dialog');

/**
 * Krita设置引导对话框管理器
 */
class KritaSetupDialog {
    constructor() {
        this.dialog = null;
        this.overlay = null;
    }

    /**
     * 显示对话框
     * @param {string} nodeId - 节点ID
     * @param {string} message - 提示消息
     */
    show(nodeId, message) {
        // 如果已有对话框，先关闭
        if (this.dialog) {
            this.close();
        }

        // 创建遮罩层
        this.overlay = this.createOverlay();

        // 创建对话框
        this.dialog = this.createDialog(nodeId, message);

        // 添加到DOM
        document.body.appendChild(this.overlay);
        document.body.appendChild(this.dialog);

        // 添加动画
        setTimeout(() => {
            this.overlay.style.opacity = '1';
            this.dialog.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 10);
    }

    /**
     * 创建遮罩层
     * @returns {HTMLElement}
     */
    createOverlay() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.6);
            z-index: 9998;
            opacity: 0;
            transition: opacity 0.3s ease;
            backdrop-filter: blur(2px);
        `;

        // 点击遮罩层关闭对话框
        overlay.onclick = () => this.close();

        return overlay;
    }

    /**
     * 创建对话框
     * @param {string} nodeId - 节点ID
     * @param {string} message - 提示消息
     * @returns {HTMLElement}
     */
    createDialog(nodeId, message) {
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            position: fixed;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%) scale(0.9);
            background: linear-gradient(135deg, #2a2a2a 0%, #1e1e1e 100%);
            border: 2px solid #4a9eff;
            border-radius: 12px;
            padding: 28px;
            min-width: 420px;
            max-width: 520px;
            z-index: 9999;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            transition: all 0.3s ease;
        `;

        // 阻止点击对话框时关闭
        dialog.onclick = (e) => e.stopPropagation();

        // 图标
        const icon = document.createElement('div');
        icon.innerHTML = '⚠️';
        icon.style.cssText = `
            font-size: 56px;
            text-align: center;
            margin-bottom: 16px;
            animation: pulse 2s ease-in-out infinite;
        `;

        // 添加pulse动画
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.8; transform: scale(1.05); }
            }
        `;
        document.head.appendChild(style);

        // 标题
        const title = document.createElement('h2');
        title.textContent = 'Krita未配置';
        title.style.cssText = `
            color: #4a9eff;
            font-size: 22px;
            font-weight: bold;
            margin: 0 0 20px 0;
            text-align: center;
            letter-spacing: 0.5px;
        `;

        // 消息
        const messageEl = document.createElement('p');
        messageEl.textContent = message;
        messageEl.style.cssText = `
            color: #ddd;
            font-size: 15px;
            line-height: 1.8;
            margin: 0 0 28px 0;
            text-align: center;
        `;

        // 按钮容器
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 14px;
            justify-content: center;
        `;

        // 按钮1：已安装，设置路径
        const btnInstalled = this.createButton(
            '✓ 已安装，设置路径',
            '#4a9eff',
            async () => {
                this.close();
                await this.handleSetPath(nodeId);
            }
        );

        // 按钮2：未安装，跳转官网
        const btnNotInstalled = this.createButton(
            '↗ 未安装，跳转官网',
            '#666',
            () => {
                this.close();
                this.handleGoToWebsite();
            }
        );

        buttonContainer.appendChild(btnInstalled);
        buttonContainer.appendChild(btnNotInstalled);

        // 组装对话框
        dialog.appendChild(icon);
        dialog.appendChild(title);
        dialog.appendChild(messageEl);
        dialog.appendChild(buttonContainer);

        return dialog;
    }

    /**
     * 创建按钮
     * @param {string} text - 按钮文字
     * @param {string} bgColor - 背景颜色
     * @param {Function} onClick - 点击回调
     * @returns {HTMLElement}
     */
    createButton(text, bgColor, onClick) {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.cssText = `
            background: ${bgColor};
            color: white;
            border: none;
            border-radius: 6px;
            padding: 12px 24px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            flex: 1;
            white-space: nowrap;
        `;

        button.onmouseover = () => {
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
            if (bgColor === '#4a9eff') {
                button.style.background = '#5ab0ff';
            } else {
                button.style.background = '#777';
            }
        };

        button.onmouseout = () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = 'none';
            button.style.background = bgColor;
        };

        button.onclick = onClick;

        return button;
    }

    /**
     * 处理设置路径
     * @param {string} nodeId - 节点ID
     */
    async handleSetPath(nodeId) {
        try {
            logger.info("[KritaSetupDialog] Opening file browser...");

            // 步骤1：调用文件浏览API获取路径
            const browseResponse = await api.fetchApi("/open_in_krita/browse_path", {
                method: "GET"
            });

            const browseResult = await browseResponse.json();

            if (browseResult.status === "cancelled") {
                globalToastManager.showToast(
                    "已取消设置",
                    "info",
                    2000
                );
                logger.info("[KritaSetupDialog] User cancelled path selection");
                return;
            }

            if (browseResult.status !== "success" || !browseResult.path) {
                globalToastManager.showToast(
                    `获取路径失败: ${browseResult.message || '未知错误'}`,
                    "error",
                    4000
                );
                logger.error("[KritaSetupDialog] Browse path failed:", browseResult);
                return;
            }

            const selectedPath = browseResult.path;
            logger.info("[KritaSetupDialog] Path selected:", selectedPath);

            // 步骤2：调用保存路径API
            const setResponse = await api.fetchApi("/open_in_krita/set_path", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    path: selectedPath
                })
            });

            const setResult = await setResponse.json();

            if (setResult.status === "success") {
                globalToastManager.showToast(
                    `✓ Krita路径已设置\n${selectedPath}`,
                    "success",
                    4000
                );
                logger.info("[KritaSetupDialog] Path saved successfully:", selectedPath);
            } else {
                globalToastManager.showToast(
                    `保存路径失败: ${setResult.message || '未知错误'}`,
                    "error",
                    4000
                );
                logger.error("[KritaSetupDialog] Save path failed:", setResult);
            }
        } catch (error) {
            globalToastManager.showToast(
                `设置失败: ${error.message}`,
                "error",
                4000
            );
            logger.error("[KritaSetupDialog] Error setting path:", error);
        }
    }

    /**
     * 处理跳转官网
     */
    handleGoToWebsite() {
        logger.info("[KritaSetupDialog] Opening Krita website...");

        // 打开Krita官网下载页
        window.open('https://krita.org/zh-cn/download/', '_blank');

        // 显示提示
        globalToastManager.showToast(
            "✓ 已打开Krita官网\n下载完成后请使用'设置Krita路径'按钮",
            "info",
            6000
        );

        logger.info("[KritaSetupDialog] Website opened");
    }

    /**
     * 关闭对话框
     */
    close() {
        if (this.overlay) {
            this.overlay.style.opacity = '0';
        }

        if (this.dialog) {
            this.dialog.style.transform = 'translate(-50%, -50%) scale(0.9)';
        }

        setTimeout(() => {
            if (this.overlay) {
                this.overlay.remove();
                this.overlay = null;
            }
            if (this.dialog) {
                this.dialog.remove();
                this.dialog = null;
            }
        }, 300);

        logger.info("[KritaSetupDialog] Dialog closed");
    }
}

// 创建全局单例
export const kritaSetupDialog = new KritaSetupDialog();

// 注册事件监听
api.addEventListener("open-in-krita-setup-dialog", (event) => {
    const { node_id, message } = event.detail;
    logger.info("[KritaSetupDialog] Setup dialog event received:", { node_id, message });
    kritaSetupDialog.show(node_id, message);
});

logger.info("[KritaSetupDialog] Module loaded and event listener registered");
