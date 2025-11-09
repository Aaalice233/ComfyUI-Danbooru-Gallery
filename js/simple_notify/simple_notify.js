/**
 * 简易通知节点 (Simple Notify)
 * 结合系统通知和音效播放功能
 */

import { app } from "../../../scripts/app.js";

import { createLogger } from '../global/logger_client.js';

// 创建logger实例
const logger = createLogger('simple_notify');

/**
 * 系统通知设置
 * 检查浏览器通知支持和权限
 */
const notificationSetup = () => {
    if (!("Notification" in window)) {
        logger.info("此浏览器不支持系统通知。");
        alert("此浏览器不支持系统通知。");
        return false;
    }
    if (Notification.permission === "denied") {
        logger.info("系统通知已被阻止。请在浏览器设置中启用通知。");
        alert("系统通知已被阻止。请在浏览器设置中启用通知。");
        return false;
    }
    if (Notification.permission !== "granted") {
        Notification.requestPermission();
        return false;
    }
    return true;
};

// 注册节点扩展
app.registerExtension({
    name: "danbooru.SimpleNotify",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "SimpleNotify") {
            // 节点创建时的初始化
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                onNodeCreated?.apply(this, arguments);
                // 在节点创建时请求通知权限
                if ("Notification" in window && Notification.permission === "default") {
                    Notification.requestPermission();
                }
            };

            // 节点执行完成时的处理
            const onExecuted = nodeType.prototype.onExecuted;
            nodeType.prototype.onExecuted = async function (output) {
                onExecuted?.apply(this, arguments);

                // 从输出中提取参数
                const message = output.message?.[0] ?? "任务已完成";
                const volume = output.volume?.[0] ?? 0.5;
                const enableNotification = output.enable_notification?.[0] ?? true;
                const enableSound = output.enable_sound?.[0] ?? true;
                const mode = output.mode?.[0] ?? "always";
                const file = output.file?.[0] ?? "notify.mp3";

                // 检查模式（always或on empty queue）
                if (mode === "on empty queue") {
                    // 等待队列清空
                    if (app.ui.lastQueueSize !== 0) {
                        await new Promise((r) => setTimeout(r, 500));
                    }
                    if (app.ui.lastQueueSize !== 0) {
                        return;
                    }
                }

                // 显示系统通知
                if (enableNotification) {
                    if (notificationSetup()) {
                        new Notification("ComfyUI - 简易通知", {
                            body: message,
                            icon: null
                        });
                    }
                }

                // 播放音效
                if (enableSound) {
                    try {
                        // 构建音频文件路径
                        let audioFile = file;
                        if (!audioFile.startsWith("http")) {
                            // 相对路径：指向py/simple_notify/notify.mp3
                            if (!audioFile.includes("/")) {
                                // 使用相对于当前js文件的路径
                                audioFile = new URL(`../../py/simple_notify/${audioFile}`, import.meta.url).href;
                            } else {
                                audioFile = new URL(audioFile, import.meta.url).href;
                            }
                        }

                        // 创建并播放音频
                        const audio = new Audio(audioFile);
                        audio.volume = Math.max(0, Math.min(1, volume)); // 确保音量在0-1之间
                        audio.play().catch(err => {
                            logger.warn("[SimpleNotify] 音频播放失败:", err);
                        });
                    } catch (err) {
                        logger.error("[SimpleNotify] 音频加载失败:", err);
                    }
                }
            };
        }
    },
});
