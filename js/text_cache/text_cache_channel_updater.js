import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";
import { createLogger } from "../global/logger_client.js";

// 创建logger实例
const logger = createLogger('text_cache_channel_updater');

/**
 * 文本缓存通道动态更新器
 * Text Cache Channel Dynamic Updater
 *
 * 功能：
 * - 监听WebSocket事件（text-cache-channel-updated, text-cache-channel-renamed, text-cache-channel-cleared）
 * - 动态更新所有GlobalTextCacheGet节点的channel_name下拉列表
 * - 保留用户当前选中的值
 * - 在工作流加载时自动刷新通道列表
 */

// 文本缓存通道管理器
class TextCacheChannelUpdater {
    constructor() {
        this.lastChannels = [];
        this.isUpdating = false;
        logger.info("[TextCacheChannelUpdater] 初始化通道更新器");
    }

    /**
     * 从API获取最新的通道列表
     */
    async fetchChannels() {
        try {
            const response = await fetch("/danbooru/text_cache/channels");
            const data = await response.json();

            if (data.status === "success") {
                logger.info(`[TextCacheChannelUpdater] 获取到 ${data.channels.length} 个通道:`, data.channels);
                return data.channels || [];
            } else {
                logger.warn("[TextCacheChannelUpdater] API返回错误:", data);
                return [];
            }
        } catch (error) {
            logger.error("[TextCacheChannelUpdater] 获取通道列表失败:", error);
            return [];
        }
    }

    /**
     * 刷新全局缓存（简化版：只更新缓存，不手动更新widget）
     */
    async refreshGlobalCache() {
        if (this.isUpdating) {
            return;
        }

        this.isUpdating = true;

        try {
            const channels = await this.fetchChannels();
            this.lastChannels = channels;
            logger.info(`[TextCacheChannelUpdater] 全局缓存已更新: ${channels.length}个通道`);
        } catch (error) {
            logger.error("[TextCacheChannelUpdater] 更新全局缓存失败:", error);
        } finally {
            this.isUpdating = false;
        }
    }
}

// 创建全局实例
const channelUpdater = new TextCacheChannelUpdater();

// 挂载到window供其他模块访问
window.textChannelUpdater = channelUpdater;

// 注册ComfyUI扩展
app.registerExtension({
    name: "Comfy.TextCacheChannelUpdater",

    async setup() {
        logger.info("[TextCacheChannelUpdater] 设置扩展");

        // 监听WebSocket消息，更新全局缓存
        api.addEventListener("text-cache-channel-updated", (event) => {
            const data = event.detail;
            logger.info("[TextCacheChannelUpdater] 收到text-cache-channel-updated事件");
            channelUpdater.refreshGlobalCache();
        });

        api.addEventListener("text-cache-channel-renamed", (event) => {
            const data = event.detail;
            logger.info("[TextCacheChannelUpdater] 收到text-cache-channel-renamed事件");
            channelUpdater.refreshGlobalCache();
        });

        api.addEventListener("text-cache-channel-cleared", (event) => {
            const data = event.detail;
            logger.info("[TextCacheChannelUpdater] 收到text-cache-channel-cleared事件");
            channelUpdater.refreshGlobalCache();
        });

        // 初始加载全局缓存
        channelUpdater.refreshGlobalCache();

        logger.info("[TextCacheChannelUpdater] 扩展设置完成，监听器已注册");
    },

    async nodeCreated(node) {
        // 当创建GlobalTextCacheGet节点时，将其channel_name widget改为函数式values
        if (node.type === "GlobalTextCacheGet") {
            logger.info(`[TextCacheChannelUpdater] GlobalTextCacheGet节点 #${node.id} 已创建，设置函数式values`);

            // 查找channel_name widget
            const widget = node.widgets?.find(w => w.name === "channel_name");

            if (widget && widget.type === "combo") {
                // 保存当前值
                const currentValue = widget.value;

                // 将values改为函数：每次打开下拉菜单时自动调用
                widget.options.values = () => {
                    // 1. 从当前工作流的GlobalTextCacheSave节点收集通道名
                    const saveNodes = app.graph._nodes.filter(n => n.type === "GlobalTextCacheSave");
                    const workflowChannels = saveNodes
                        .map(n => n.widgets?.find(w => w.name === "channel_name")?.value)
                        .filter(v => v && v !== "");

                    // 2. 从全局缓存读取后端通道
                    const backendChannels = channelUpdater.lastChannels || [];

                    // 3. 合并去重排序
                    const allChannels = ["", ...new Set([...workflowChannels, ...backendChannels])];

                    logger.info(`[TextCacheChannelUpdater] 节点 #${node.id} 下拉菜单打开，通道列表:`, allChannels);
                    return allChannels.sort();
                };

                // 恢复之前的值
                widget.value = currentValue || "";

                logger.info(`[TextCacheChannelUpdater] 节点 #${node.id} 函数式values设置完成，当前值: "${currentValue}"`);
            }
        }
    }
});

logger.info("[TextCacheChannelUpdater] 模块加载完成");
