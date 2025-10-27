/**
 * 图像缓存保存节点 - JavaScript扩展
 * Image Cache Save Node - JavaScript Extension
 *
 * 功能：
 * - 支持通道选择和管理
 * - 通道重命名自动同步到获取节点
 * - 预注册通道到后端
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
    console.log("[ImageCacheSave] Toast管理器加载成功");
} catch (e) {
    console.warn("[ImageCacheSave] Toast管理器加载失败，使用fallback:", e);
    showToast = (message) => console.log(`[Toast] ${message}`);
}

/**
 * 通过API确保通道存在（预注册通道）
 * @param {string} channelName - 通道名称
 * @returns {Promise<boolean>} 是否成功
 */
async function ensureChannelExists(channelName) {
    try {
        const response = await api.fetchApi('/danbooru/image_cache/ensure_channel', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                channel_name: channelName
            })
        });

        if (response.ok) {
            console.log(`[ImageCacheSave] ✅ 通道已预注册: ${channelName}`);
            return true;
        } else {
            console.error(`[ImageCacheSave] ❌ 通道预注册失败: ${channelName}`, response.statusText);
            return false;
        }
    } catch (error) {
        console.error(`[ImageCacheSave] ❌ 通道预注册异常: ${channelName}`, error);
        return false;
    }
}

// 注册节点扩展
app.registerExtension({
    name: "Danbooru.ImageCacheSave",

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "ImageCacheSave") {
            console.log("[ImageCacheSave] 注册节点扩展");

            // 节点创建时的处理
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function() {
                const result = onNodeCreated?.apply(this, arguments);

                // 找到channel_name widget
                const channelWidget = this.widgets?.find(w => w.name === "channel_name");

                if (channelWidget) {
                    // 初始化previousChannelName用于跟踪通道名变化
                    this._previousChannelName = channelWidget.value || "default";

                    // 监听通道名称变化
                    const originalChannelCallback = channelWidget.callback;
                    channelWidget.callback = async (value) => {
                        if (originalChannelCallback) originalChannelCallback.call(channelWidget, value);

                        const previousName = this._previousChannelName;
                        const newName = value;

                        // 如果名称确实改变了（改名操作）
                        if (previousName && newName && previousName !== newName) {
                            console.log(`[ImageCacheSave] 🔄 通道改名: "${previousName}" -> "${newName}"`);

                            try {
                                // 先检查旧通道是否存在
                                const channelsResponse = await api.fetchApi('/danbooru/image_cache/channels');
                                let existingChannels = [];
                                if (channelsResponse.ok) {
                                    const channelsData = await channelsResponse.json();
                                    existingChannels = channelsData.channels || [];
                                }

                                const oldChannelExists = existingChannels.includes(previousName);

                                // 如果旧通道不存在，说明是首次设置，直接注册新通道
                                if (!oldChannelExists) {
                                    console.log(`[ImageCacheSave] 📝 旧通道"${previousName}"不存在，直接注册新通道: ${newName}`);
                                    await ensureChannelExists(newName);
                                    this._previousChannelName = newName;
                                    return;
                                }

                                // 旧通道存在，执行重命名操作
                                // 1. 调用后端API重命名通道（会自动删除旧通道）
                                const response = await api.fetchApi('/danbooru/image_cache/rename_channel', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                        old_name: previousName,
                                        new_name: newName
                                    })
                                });

                                if (response.ok) {
                                    const data = await response.json();
                                    console.log(`[ImageCacheSave] ✅ 后端通道重命名成功:`, data);

                                    // 2. 获取最新的通道列表
                                    const channelsResponse = await api.fetchApi('/danbooru/image_cache/channels');
                                    let newChannelsList = [newName]; // 至少包含新通道名
                                    if (channelsResponse.ok) {
                                        const channelsData = await channelsResponse.json();
                                        newChannelsList = [""].concat((channelsData.channels || []).sort());
                                    }

                                    // 3. 找到所有Get节点，更新它们的通道值和下拉选项
                                    const allGetNodes = app.graph._nodes.filter(n => n.comfyClass === "ImageCacheGet");
                                    let updatedCount = 0;

                                    allGetNodes.forEach(getNode => {
                                        const getChannelWidget = getNode.widgets?.find(w => w.name === "channel_name");
                                        if (getChannelWidget) {
                                            // 更新下拉选项列表
                                            if (getChannelWidget.options && getChannelWidget.options.values) {
                                                getChannelWidget.options.values = newChannelsList;
                                            }

                                            // 如果当前选中的是旧通道名，更新为新通道名
                                            if (getChannelWidget.value === previousName) {
                                                getChannelWidget.value = newName;
                                                updatedCount++;
                                                console.log(`[ImageCacheSave] ✅ 已更新Get节点${getNode.id}的通道: ${previousName} -> ${newName}`);
                                            }
                                        }
                                    });

                                    if (updatedCount > 0) {
                                        showToast(`✅ 已同步${updatedCount}个Get节点到新通道: ${newName}`, 'success', 3000);
                                    } else {
                                        showToast(`✅ 通道已重命名: ${newName}`, 'success', 2000);
                                    }
                                } else {
                                    const error = await response.json();
                                    console.error(`[ImageCacheSave] ❌ 后端通道重命名失败:`, error);
                                    showToast(`❌ 通道重命名失败: ${error.error}`, 'error', 4000);
                                }
                            } catch (error) {
                                console.error(`[ImageCacheSave] ❌ 通道重命名异常:`, error);
                                showToast(`❌ 通道重命名异常: ${error.message}`, 'error', 4000);
                            }
                        } else if (newName && newName !== 'default' && newName.trim() !== '') {
                            // 首次设置通道名（不是改名）
                            await ensureChannelExists(newName);
                        }

                        // 更新previousChannelName
                        this._previousChannelName = newName;
                    };
                }

                console.log(`[ImageCacheSave] 节点已创建: ID=${this.id}`);
                return result;
            };
        }
    },

    async nodeCreated(node) {
        if (node.comfyClass === "ImageCacheSave") {
            // 初始化previousChannelName（工作流加载时）
            const channelWidget = node.widgets?.find(w => w.name === "channel_name");
            const currentChannelName = channelWidget?.value || "default";
            node._previousChannelName = currentChannelName;

            // 预注册通道到后端（确保Get节点能获取到这个通道）
            if (currentChannelName && currentChannelName.trim() !== '' && currentChannelName !== 'default') {
                setTimeout(async () => {
                    await ensureChannelExists(currentChannelName);
                    console.log(`[ImageCacheSave] ✅ 节点加载后预注册通道: ${currentChannelName}`);
                }, 500);
            }
        }
    }
});

console.log("[ImageCacheSave] JavaScript扩展加载完成");
