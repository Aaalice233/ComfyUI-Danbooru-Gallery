/**
 * Simple Load Image - 前端JavaScript扩展
 * 为简易图像加载器添加Krita集成功能（右键菜单）
 */

import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";
import { globalToastManager } from "../global/toast_manager.js";
import { kritaSetupDialog } from "../open_in_krita/setup_dialog.js";
import { createLogger } from '../global/logger_client.js';

// 创建logger实例
const logger = createLogger('simple_load_image');

app.registerExtension({
    name: "simple_load_image",

    async init(app) {
        // 监听来自Python后端的Toast通知（复用open_in_krita的通知系统）
        api.addEventListener("simple-load-image-notification", (event) => {
            const { message, type } = event.detail;
            const duration = type === "success" ? 3000 : 5000;
            globalToastManager.showToast(message, type || "info", duration);
        });

        // 监听设置引导对话框触发事件
        api.addEventListener("simple-load-image-setup-dialog", (event) => {
            const { node_id, message } = event.detail;
            logger.info(`[SimpleLoadImage] Setup dialog event received: node_id=${node_id}`);
            kritaSetupDialog.show(node_id, message);
        });
    },

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "SimpleLoadImage") {
            logger.info("[SimpleLoadImage] Registering node extension");

            // 添加右键菜单选项
            const originalGetExtraMenuOptions = nodeType.prototype.getExtraMenuOptions;
            nodeType.prototype.getExtraMenuOptions = function(_, options) {
                // 调用原始方法（如果存在）
                if (originalGetExtraMenuOptions) {
                    originalGetExtraMenuOptions.apply(this, arguments);
                }

                // 添加菜单分隔符
                options.push(null);

                // 菜单选项1：在Krita中打开
                options.push({
                    content: "在Krita中打开",
                    callback: async () => {
                        await openImageInKrita(this);
                    }
                });

                // 菜单选项2：设置Krita路径
                options.push({
                    content: "设置Krita路径",
                    callback: async () => {
                        await setKritaPath(this);
                    }
                });
            };

            logger.info("[SimpleLoadImage] Node extension registered successfully");
        }
    }
});

/**
 * 在Krita中打开当前加载的图像
 * @param {Object} node - 节点实例
 */
async function openImageInKrita(node) {
    try {
        logger.info("[SimpleLoadImage] Opening image in Krita...");

        // 获取节点的输入值（图像文件名）
        const imageWidget = node.widgets?.find(w => w.name === "image");
        const imagePath = imageWidget?.value;

        if (!imagePath || imagePath === "simple_none.png") {
            globalToastManager.showToast(
                "请先选择要打开的图像\n（当前为黑色占位图）",
                "warning",
                4000
            );
            logger.warn("[SimpleLoadImage] No valid image selected");
            return;
        }

        logger.info(`[SimpleLoadImage] Image path: ${imagePath}`);

        // 调用后端API打开图像（后端会自动处理插件更新）
        const response = await api.fetchApi("/simple_load_image/open_in_krita", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                node_id: node.id.toString(),
                image_path: imagePath
            })
        });

        if (!response.ok) {
            const error = await response.text();
            globalToastManager.showToast(`打开失败: ${error}`, "error", 5000);
            logger.error("[SimpleLoadImage] API call failed:", error);
            return;
        }

        const result = await response.json();

        // 后端会通过WebSocket发送Toast通知，这里只需要记录日志
        if (result.status === "error") {
            logger.error("[SimpleLoadImage] Open failed:", result.message);
        } else if (result.status === "success") {
            logger.info("[SimpleLoadImage] Krita opened successfully");
        }

    } catch (error) {
        logger.error("[SimpleLoadImage] Error opening in Krita:", error);
        globalToastManager.showToast(`错误: ${error.message}`, "error", 5000);
    }
}

/**
 * 设置Krita路径
 * @param {Object} node - 节点实例
 */
async function setKritaPath(node) {
    try {
        logger.info("[SimpleLoadImage] Setting Krita path...");
        globalToastManager.showToast("正在打开文件选择对话框...", "info", 2000);

        // 调用文件浏览API
        const browseResponse = await api.fetchApi("/open_in_krita/browse_path", {
            method: "GET"
        });

        if (!browseResponse.ok) {
            const error = await browseResponse.text();
            globalToastManager.showToast(`打开文件选择对话框失败: ${error}`, "error", 5000);
            logger.error("[SimpleLoadImage] Browse dialog failed:", error);
            return;
        }

        const browseResult = await browseResponse.json();

        // 处理用户取消选择
        if (browseResult.status === "cancelled") {
            globalToastManager.showToast("已取消选择", "info", 2000);
            logger.info("[SimpleLoadImage] User cancelled path selection");
            return;
        }

        // 处理错误（如tkinter不可用）
        if (browseResult.status === "error") {
            globalToastManager.showToast(`文件选择失败: ${browseResult.message}`, "error", 5000);
            logger.error("[SimpleLoadImage] Browse error:", browseResult.message);
            return;
        }

        // 获取用户选择的路径
        const selectedPath = browseResult.path;

        if (!selectedPath) {
            return;
        }

        logger.info(`[SimpleLoadImage] Path selected: ${selectedPath}`);

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
            logger.error("[SimpleLoadImage] Set path failed:", error);
            return;
        }

        const result = await setResponse.json();

        if (result.status === "success") {
            globalToastManager.showToast(`✓ Krita路径已设置: ${result.path}`, "success", 4000);
            logger.info("[SimpleLoadImage] Path set successfully:", result.path);
        } else {
            globalToastManager.showToast(`设置失败: ${result.message}`, "error", 5000);
            logger.error("[SimpleLoadImage] Set path error:", result.message);
        }

    } catch (error) {
        logger.error("[SimpleLoadImage] Error setting Krita path:", error);
        globalToastManager.showToast(`网络错误: ${error.message}`, "error", 5000);
    }
}

logger.info("[SimpleLoadImage] Frontend extension loaded");
