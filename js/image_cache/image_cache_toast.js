import { app } from "/scripts/app.js";
import { toastManagerProxy } from "../global/toast_manager.js";
import { createLogger } from "../global/logger_client.js";

// 创建logger实例
const logger = createLogger('image_cache_toast');

// 图像缓存共享Toast监听器
app.registerExtension({
    name: "Comfy.ImageCacheToast",

    async setup() {
        logger.info("[ImageCacheToast] 初始化图像缓存Toast监听器");

        // 监听WebSocket消息
        const onMessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                // 处理图像缓存toast消息
                if (data.type === "image-cache-toast") {
                    const { message, type, duration } = data.data;

                    logger.info(`[ImageCacheToast] 收到Toast消息: ${message} (${type})`);

                    // 使用全局toast管理器显示通知
                    toastManagerProxy.showToast(
                        message,
                        type || "info",
                        duration || 3000
                    );
                }
            } catch (error) {
                logger.error("[ImageCacheToast] 处理WebSocket消息失败:", error);
            }
        };

        // 添加消息监听器
        if (app.socket) {
            app.socket.addEventListener("message", onMessage);
            logger.info("[ImageCacheToast] Toast监听器已注册");
        } else {
            logger.warn("[ImageCacheToast] WebSocket未初始化");
        }
    }
});