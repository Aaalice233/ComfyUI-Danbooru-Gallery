/**
 * 全局文本缓存获取节点 - JavaScript扩展
 * Global Text Cache Get Node - JavaScript Extension
 *
 * 功能：
 * - 监听缓存更新事件
 * - 动态刷新通道列表
 * - 支持手动输入通道名
 */

import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

// Toast通知管理器（如果存在）
let showToast = null;
try {
    const toastModule = await import("../global/toast_manager.js");
    // 正确获取showToast方法
    showToast = (message, type = 'success', duration = 3000) => {
        toastModule.globalToastManager.showToast(message, type, duration);
    };
    console.log("[GlobalTextCacheGet] Toast管理器加载成功");
} catch (e) {
    // 如果toast_manager不存在，使用console.log作为fallback
    console.warn("[GlobalTextCacheGet] Toast管理器加载失败，使用fallback:", e);
    showToast = (message) => console.log(`[Toast] ${message}`);
}

/**
 * 刷新通道列表
 * @param {object} node - 节点对象
 */
async function refreshChannelList(node) {
    try {
        const response = await api.fetchApi('/danbooru/text_cache/channels');
        if (!response.ok) {
            console.error("[GlobalTextCacheGet] 获取通道列表失败:", response.statusText);
            return;
        }

        const data = await response.json();
        const channels = data.channels || [];

        console.log(`[GlobalTextCacheGet] 获取到 ${channels.length} 个通道:`, channels);

        // 更新channel_name widget的选项
        const channelWidget = node.widgets?.find(w => w.name === "channel_name");
        if (channelWidget) {
            // 添加空选项和所有通道
            const newOptions = [""].concat(channels);

            // 更新widget的选项值
            if (channelWidget.options && channelWidget.options.values) {
                channelWidget.options.values = newOptions;
            } else {
                // 创建options对象
                channelWidget.options = {
                    values: newOptions
                };
            }

            console.log(`[GlobalTextCacheGet] 通道列表已更新:`, newOptions);
        }

    } catch (error) {
        console.error("[GlobalTextCacheGet] 刷新通道列表异常:", error);
    }
}

/**
 * 添加右键菜单选项
 * @param {object} node - 节点对象
 * @param {array} options - 菜单选项数组
 */
function addContextMenu(node, options) {
    // 添加分隔符
    options.push(null);

    // 添加"刷新通道列表"选项
    options.push({
        content: "🔄 刷新通道列表",
        callback: async () => {
            await refreshChannelList(node);
            showToast("✅ 通道列表已刷新", 'success', 2000);
        }
    });
}

// 注册节点扩展
app.registerExtension({
    name: "Danbooru.GlobalTextCacheGet",

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "GlobalTextCacheGet") {
            console.log("[GlobalTextCacheGet] 注册节点扩展");

            // 节点创建时的处理
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function() {
                const result = onNodeCreated?.apply(this, arguments);

                // 自动刷新通道列表
                setTimeout(() => {
                    refreshChannelList(this);
                }, 100);

                console.log(`[GlobalTextCacheGet] 节点已创建: ID=${this.id}`);
                return result;
            };

            // 添加右键菜单
            const originalGetExtraMenuOptions = nodeType.prototype.getExtraMenuOptions;
            nodeType.prototype.getExtraMenuOptions = function(_, options) {
                originalGetExtraMenuOptions?.apply(this, arguments);
                addContextMenu(this, options);
            };
        }
    },

    async setup() {
        // 监听全局缓存更新事件
        api.addEventListener("text-cache-channel-updated", (event) => {
            const detail = event.detail || {};
            console.log(`[GlobalTextCacheGet] 缓存更新事件:`, detail);

            // 刷新所有GlobalTextCacheGet节点的通道列表
            const nodes = app.graph._nodes || [];
            for (const node of nodes) {
                if (node.comfyClass === "GlobalTextCacheGet") {
                    refreshChannelList(node);
                }
            }
        });

        console.log("[GlobalTextCacheGet] 已注册缓存更新事件监听器");
    }
});

console.log("[GlobalTextCacheGet] JavaScript扩展加载完成");
