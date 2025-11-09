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

import { createLogger } from '../global/logger_client.js';

// 创建logger实例
const logger = createLogger('global_text_cache_get');

// Toast通知管理器（如果存在）
let showToast = null;
try {
    const toastModule = await import("../global/toast_manager.js");
    // 正确获取showToast方法
    showToast = (message, type = 'success', duration = 3000) => {
        toastModule.globalToastManager.showToast(message, type, duration);
    };
    logger.info("[GlobalTextCacheGet] Toast管理器加载成功");
} catch (e) {
    // 如果toast_manager不存在，使用console.log作为fallback
    logger.warn("[GlobalTextCacheGet] Toast管理器加载失败，使用fallback:", e);
    showToast = (message) => logger.info(`[Toast] ${message}`);
}

/**
 * 更新节点预览
 * @param {object} node - 节点对象
 * @param {object} output - 节点执行输出
 */
function updateNodePreview(node, output) {
    if (!node._cachePreviewElement) {
        return;
    }

    logger.info("[GlobalTextCacheGet] 更新预览，output数据:", output);

    // 从output中直接获取ui数据（ComfyUI的onExecuted会将ui数据展开到output中）
    const text = output?.text?.[0] || '';
    const channel = output?.channel?.[0] || 'default';
    const length = output?.length?.[0] || 0;
    const usingDefault = output?.using_default?.[0] || false;

    // 生成状态行
    const source = usingDefault ? '默认值' : '缓存';
    const statusLine = `📥 通道:${channel} | 长度:${length}字符 | 来源:${source}`;

    // 组合显示：第一行状态，第二行文本内容
    const displayText = `${statusLine}\n📝 文本内容：${text || '(空文本)'}`;

    node._cachePreviewElement.textContent = displayText;
    node._cachePreviewElement.title = `缓存内容预览（共${length}字符）`;

    logger.info("[GlobalTextCacheGet] 预览已更新:", {text: text.substring(0, 50), channel, length, usingDefault});
}

// 注意：通道列表现在使用动态combo实现，每次打开下拉列表时自动从后端获取最新列表
// 不再需要手动刷新通道列表的函数


// 注册节点扩展
app.registerExtension({
    name: "Danbooru.GlobalTextCacheGet",

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "GlobalTextCacheGet") {
            logger.info("[GlobalTextCacheGet] 注册节点扩展");

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
                            logger.info(`[GlobalTextCacheGet] 从工作流恢复通道名: ${savedValue}`);
                        }
                    }

                    // ✅ 立即设置为函数式values（不使用延迟）
                    if (channelWidget.options) {
                        channelWidget.options.values = () => {
                            // 1. 从当前工作流的GlobalTextCacheSave节点收集通道名
                            const saveNodes = app.graph._nodes.filter(n => n.type === "GlobalTextCacheSave");
                            const workflowChannels = saveNodes
                                .map(n => n.widgets?.find(w => w.name === "channel_name")?.value)
                                .filter(v => v && v !== "");

                            // 2. 从全局缓存读取后端通道
                            const backendChannels = window.textChannelUpdater?.lastChannels || [];

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
                        logger.info(`[GlobalTextCacheGet] ✅ 恢复通道值: ${savedValue}`);

                        // 异步预注册通道到后端（确保通道存在）
                        api.fetchApi('/danbooru/text_cache/ensure_channel', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({channel_name: savedValue})
                        }).then(response => {
                            if (response.ok) {
                                logger.info(`[GlobalTextCacheGet] ✅ 预注册通道: ${savedValue}`);
                            }
                        }).catch(error => {
                            logger.error(`[GlobalTextCacheGet] 预注册通道失败:`, error);
                        });
                    }
                }

                // 创建预览容器
                const previewContainer = document.createElement('div');
                previewContainer.style.cssText = `
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                    padding: 8px;
                    margin: 4px 0;
                    overflow-y: auto;
                    font-family: 'Consolas', 'Monaco', monospace;
                    font-size: 11px;
                    color: #E0E0E0;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    line-height: 1.4;
                `;
                previewContainer.textContent = '等待获取缓存...';

                // 添加到节点
                this.addDOMWidget("cache_preview", "div", previewContainer);
                this._cachePreviewElement = previewContainer;

                // 设置初始节点大小（宽度400，高度280）
                this.setSize([400, 280]);

                logger.info(`[GlobalTextCacheGet] 节点已创建: ID=${this.id}`);
                return result;
            };

            // 右键菜单已移除（动态combo不需要手动刷新）

            // 监听节点执行完成
            const onExecuted = nodeType.prototype.onExecuted;
            nodeType.prototype.onExecuted = function(output) {
                const result = onExecuted?.apply(this, arguments);
                // 更新预览显示
                updateNodePreview(this, output);
                return result;
            };
        }
    },

    async setup() {
        // 动态combo会在每次打开下拉列表时自动获取最新通道列表，不需要手动刷新
        logger.info("[GlobalTextCacheGet] 使用动态combo实现通道列表自动更新");
    }
});

logger.info("[GlobalTextCacheGet] JavaScript扩展加载完成");
