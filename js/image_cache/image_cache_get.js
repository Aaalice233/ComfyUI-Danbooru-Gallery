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

                // 立即设置动态combo（借鉴KJ节点的实现）
                const channelWidget = this.widgets?.find(w => w.name === "channel_name");
                if (channelWidget) {
                    // 保存工作流中的原始值
                    let savedValue = channelWidget.value;

                    // 尝试从widgets_values获取工作流保存的值
                    if (this.widgets_values && Array.isArray(this.widgets_values)) {
                        const channelWidgetIndex = this.widgets.indexOf(channelWidget);
                        if (channelWidgetIndex !== -1 && this.widgets_values[channelWidgetIndex]) {
                            savedValue = this.widgets_values[channelWidgetIndex];
                            console.log(`[ImageCacheGet] 从工作流恢复通道名: ${savedValue}`);
                        }
                    }

                    // ✅ 立即设置为函数式values（不使用延迟）
                    if (channelWidget.options) {
                        channelWidget.options.values = () => {
                            // 1. 从当前工作流的ImageCacheSave节点收集通道名
                            const saveNodes = app.graph._nodes.filter(n => n.type === "ImageCacheSave");
                            const workflowChannels = saveNodes
                                .map(n => n.widgets?.find(w => w.name === "channel_name")?.value)
                                .filter(v => v && v !== "");

                            // 2. 从全局缓存读取后端通道
                            const backendChannels = window.imageChannelUpdater?.lastChannels || [];

                            // 3. 如果有保存的值且不在列表中，添加进去
                            const allChannelsSet = new Set(["", ...workflowChannels, ...backendChannels]);
                            if (savedValue && savedValue !== "") {
                                allChannelsSet.add(savedValue);
                            }

                            // 4. 合并去重排序
                            return Array.from(allChannelsSet).sort();
                        };
                    }

                    // ✅ 恢复工作流保存的值
                    if (savedValue && savedValue.trim() !== '') {
                        channelWidget.value = savedValue;
                        console.log(`[ImageCacheGet] ✅ 恢复通道值: ${savedValue}`);

                        // 异步预注册通道到后端（确保通道存在）
                        api.fetchApi('/danbooru/image_cache/ensure_channel', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({channel_name: savedValue})
                        }).then(response => {
                            if (response.ok) {
                                console.log(`[ImageCacheGet] ✅ 预注册通道: ${savedValue}`);
                            }
                        }).catch(error => {
                            console.error(`[ImageCacheGet] 预注册通道失败:`, error);
                        });
                    }
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
