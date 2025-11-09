/**
 * Tag Sync WebSocket Listener
 * Listens for sync progress updates and displays in persistent status bar
 * 使用右上角持久化状态栏显示进度（与组执行管理器兼容堆叠）
 */

import { app } from "../../../scripts/app.js";
import { api } from "../../../scripts/api.js";
import { globalToastManager } from "./toast_manager.js";

import { createLogger } from '../global/logger_client.js';

// 创建logger实例
const logger = createLogger('tag_sync_listener');

// Register extension
app.registerExtension({
    name: "danbooru_gallery.tag_sync_listener",

    async setup() {
        const STATUS_BAR_ID = 'tag_sync_progress'; // 状态栏唯一ID

        // Listen for tag sync status bar show/update
        api.addEventListener("tag_sync_status_show", (event) => {
            const { message } = event.detail;

            if (typeof globalToastManager !== 'undefined' && globalToastManager.showStatusBar) {
                globalToastManager.showStatusBar(STATUS_BAR_ID, message, {
                    closable: true,
                    onClose: () => {
                        logger.info('[标签同步] 用户手动关闭状态栏');
                    }
                });
                logger.info('[标签同步] 显示状态栏:', message);
            } else {
                logger.warn('[标签同步] globalToastManager 或 showStatusBar 未定义');
            }
        });

        // Listen for tag sync status bar update
        api.addEventListener("tag_sync_status_update", (event) => {
            const { message } = event.detail;

            if (typeof globalToastManager !== 'undefined' && globalToastManager.updateStatusBar) {
                globalToastManager.updateStatusBar(STATUS_BAR_ID, message);
                logger.info('[标签同步] 更新状态栏:', message);
            }
        });

        // Listen for tag sync status bar hide
        api.addEventListener("tag_sync_status_hide", (event) => {
            if (typeof globalToastManager !== 'undefined' && globalToastManager.hideStatusBar) {
                globalToastManager.hideStatusBar(STATUS_BAR_ID);
                logger.info('[标签同步] 隐藏状态栏');
            }
        });

        // 保留toast通知作为补充（用于重要提示）
        api.addEventListener("tag_sync_toast", (event) => {
            const { message, type, duration } = event.detail;

            if (typeof globalToastManager !== 'undefined' && globalToastManager.showToast) {
                globalToastManager.showToast(message, type, duration || 3000);
                logger.info('[标签同步] Toast:', message);
            }
        });

        logger.info("[标签同步] WebSocket 监听器已加载 (支持状态栏+Toast)");
    }
});
