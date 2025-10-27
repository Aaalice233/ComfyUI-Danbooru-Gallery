/**
 * 图像缓存获取节点 - JavaScript扩展
 * Image Cache Get Node - JavaScript Extension
 *
 * 功能：
 * - 动态刷新通道列表
 * - 支持手动输入通道名
 * - 从工作流恢复通道值
 */

import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

// Toast通知管理器（如果存在）
let showToast = null;
try {
    const toastModule = await import("../global/toast_manager.js");
    showToast = (message, type = 'success', duration = 3000) => {
        toastModule.globalToastManager.showToast(message, type, duration);
    };
    console.log("[ImageCacheGet] Toast管理器加载成功");
} catch (e) {
    console.warn("[ImageCacheGet] Toast管理器加载失败，使用fallback:", e);
    showToast = (message) => console.log(`[Toast] ${message}`);
}

// 注册节点扩展
app.registerExtension({
    name: "Danbooru.ImageCacheGet",

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "ImageCacheGet") {
            console.log("[ImageCacheGet] 注册节点扩展");

            // 节点创建时的处理
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function() {
                const result = onNodeCreated?.apply(this, arguments);

                // 异步获取最新通道列表并更新widget选项（解决时序问题）
                const channelWidget = this.widgets?.find(w => w.name === "channel_name");
                if (channelWidget) {
                    // 延迟1200ms，确保Save节点预注册完成
                    setTimeout(async () => {
                        try {
                            // 在setTimeout中重新获取原始值（避免闭包问题）
                            let currentValue = channelWidget.value;

                            // 尝试从widgets_values获取原始值
                            if (this.widgets_values && Array.isArray(this.widgets_values)) {
                                const channelWidgetIndex = this.widgets.indexOf(channelWidget);
                                if (channelWidgetIndex !== -1 && this.widgets_values[channelWidgetIndex]) {
                                    currentValue = this.widgets_values[channelWidgetIndex];
                                    console.log(`[ImageCacheGet] 从工作流数据恢复通道名: ${currentValue}`);
                                }
                            }

                            console.log(`[ImageCacheGet] 准备处理通道，当前widget值: ${channelWidget.value}, 恢复的值: ${currentValue}`);

                            // 预注册当前通道到后端（确保通道在后端存在）
                            if (currentValue && currentValue.trim() !== '') {
                                try {
                                    const ensureResponse = await api.fetchApi('/danbooru/image_cache/ensure_channel', {
                                        method: 'POST',
                                        headers: {'Content-Type': 'application/json'},
                                        body: JSON.stringify({channel_name: currentValue})
                                    });
                                    if (ensureResponse.ok) {
                                        console.log(`[ImageCacheGet] ✅ 预注册通道: ${currentValue}`);
                                    }
                                } catch (error) {
                                    console.error(`[ImageCacheGet] 预注册通道失败:`, error);
                                }
                            }

                            // 获取最新通道列表
                            const response = await api.fetchApi('/danbooru/image_cache/channels');
                            if (response.ok) {
                                const data = await response.json();
                                const channels = data.channels || [];
                                let newOptions = [""].concat(channels.sort());

                                // 关键修复：如果当前值不在列表中，将其添加到列表中（保持持久化）
                                if (currentValue && !newOptions.includes(currentValue)) {
                                    console.log(`[ImageCacheGet] ✅ 保留工作流中保存的通道名: ${currentValue}`);
                                    // 将当前值添加到选项列表中（在空字符串之后）
                                    newOptions = ["", currentValue].concat(channels.sort());
                                }

                                // 设置为函数式values（与channel_updater.js配合）
                                if (channelWidget.options) {
                                    channelWidget.options.values = () => {
                                        // 1. 从当前工作流的ImageCacheSave节点收集通道名
                                        const saveNodes = app.graph._nodes.filter(n => n.type === "ImageCacheSave");
                                        const workflowChannels = saveNodes
                                            .map(n => n.widgets?.find(w => w.name === "channel_name")?.value)
                                            .filter(v => v && v !== "");

                                        // 2. 从全局缓存读取后端通道
                                        const backendChannels = window.imageChannelUpdater?.lastChannels || [];

                                        // 3. 合并去重排序
                                        const allChannels = ["", ...new Set([...workflowChannels, ...backendChannels])];

                                        return allChannels.sort();
                                    };
                                }

                                // 只有在currentValue不为空时才恢复值（避免覆盖正确的值）
                                if (currentValue && currentValue.trim() !== '') {
                                    channelWidget.value = currentValue;
                                    console.log(`[ImageCacheGet] ✅ 恢复通道值: ${currentValue}`);

                                    // 二次确认：300ms后再次强制设置值，防止被外部逻辑覆盖
                                    setTimeout(() => {
                                        if (channelWidget.value !== currentValue) {
                                            console.log(`[ImageCacheGet] ⚠️ 检测到值被覆盖 (${channelWidget.value})，强制恢复为: ${currentValue}`);
                                            channelWidget.value = currentValue;
                                        } else {
                                            console.log(`[ImageCacheGet] ✅ 二次确认值未被覆盖: ${currentValue}`);
                                        }
                                    }, 300);
                                } else {
                                    console.log(`[ImageCacheGet] ⚠️ 未找到有效的通道值，保持当前值: ${channelWidget.value}`);
                                }

                                console.log(`[ImageCacheGet] 节点创建后刷新通道列表:`, newOptions, `最终值: ${channelWidget.value}`);
                            }
                        } catch (error) {
                            console.error("[ImageCacheGet] 获取通道列表失败:", error);
                        }
                    }, 1200); // 延迟1200ms，确保Save节点预注册完成
                }

                console.log(`[ImageCacheGet] 节点已创建: ID=${this.id}`);
                return result;
            };
        }
    },

    async setup() {
        // 动态combo会在每次打开下拉列表时自动获取最新通道列表，不需要手动刷新
        console.log("[ImageCacheGet] 使用动态combo实现通道列表自动更新");
    }
});

console.log("[ImageCacheGet] JavaScript扩展加载完成");
