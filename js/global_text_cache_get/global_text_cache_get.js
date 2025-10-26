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
 * 更新节点预览
 * @param {object} node - 节点对象
 * @param {object} output - 节点执行输出
 */
function updateNodePreview(node, output) {
    if (!node._cachePreviewElement) {
        return;
    }

    console.log("[GlobalTextCacheGet] 更新预览，output数据:", output);

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

    console.log("[GlobalTextCacheGet] 预览已更新:", {text: text.substring(0, 50), channel, length, usingDefault});
}

// 注意：通道列表现在使用动态combo实现，每次打开下拉列表时自动从后端获取最新列表
// 不再需要手动刷新通道列表的函数


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
                                    console.log(`[GlobalTextCacheGet] 从工作流数据恢复通道名: ${currentValue}`);
                                }
                            }

                            console.log(`[GlobalTextCacheGet] 准备处理通道，当前widget值: ${channelWidget.value}, 恢复的值: ${currentValue}`);

                            // 预注册当前通道到后端（确保通道在后端存在）
                            if (currentValue && currentValue.trim() !== '') {
                                try {
                                    const ensureResponse = await api.fetchApi('/danbooru/text_cache/ensure_channel', {
                                        method: 'POST',
                                        headers: {'Content-Type': 'application/json'},
                                        body: JSON.stringify({channel_name: currentValue})
                                    });
                                    if (ensureResponse.ok) {
                                        console.log(`[GlobalTextCacheGet] ✅ 预注册通道: ${currentValue}`);
                                    }
                                } catch (error) {
                                    console.error(`[GlobalTextCacheGet] 预注册通道失败:`, error);
                                }
                            }

                            // 获取最新通道列表
                            const response = await api.fetchApi('/danbooru/text_cache/channels');
                            if (response.ok) {
                                const data = await response.json();
                                const channels = data.channels || [];
                                let newOptions = [""].concat(channels.sort());

                                // 关键修复：如果当前值不在列表中，将其添加到列表中（保持持久化）
                                if (currentValue && !newOptions.includes(currentValue)) {
                                    console.log(`[GlobalTextCacheGet] ✅ 保留工作流中保存的通道名: ${currentValue}`);
                                    // 将当前值添加到选项列表中（在空字符串之后）
                                    newOptions = ["", currentValue].concat(channels.sort());
                                }

                                // 更新widget的选项
                                if (channelWidget.options && channelWidget.options.values) {
                                    channelWidget.options.values = newOptions;
                                }

                                // 只有在currentValue不为空时才恢复值（避免覆盖正确的值）
                                if (currentValue && currentValue.trim() !== '') {
                                    channelWidget.value = currentValue;
                                    console.log(`[GlobalTextCacheGet] ✅ 恢复通道值: ${currentValue}`);

                                    // 二次确认：300ms后再次强制设置值，防止被外部逻辑覆盖
                                    setTimeout(() => {
                                        if (channelWidget.value !== currentValue) {
                                            console.log(`[GlobalTextCacheGet] ⚠️ 检测到值被覆盖 (${channelWidget.value})，强制恢复为: ${currentValue}`);
                                            channelWidget.value = currentValue;
                                        } else {
                                            console.log(`[GlobalTextCacheGet] ✅ 二次确认值未被覆盖: ${currentValue}`);
                                        }
                                    }, 300);
                                } else {
                                    console.log(`[GlobalTextCacheGet] ⚠️ 未找到有效的通道值，保持当前值: ${channelWidget.value}`);
                                }

                                console.log(`[GlobalTextCacheGet] 节点创建后刷新通道列表:`, newOptions, `最终值: ${channelWidget.value}`);
                            }
                        } catch (error) {
                            console.error("[GlobalTextCacheGet] 获取通道列表失败:", error);
                        }
                    }, 1200); // 延迟1200ms，确保Save节点预注册完成
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

                console.log(`[GlobalTextCacheGet] 节点已创建: ID=${this.id}`);
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
        console.log("[GlobalTextCacheGet] 使用动态combo实现通道列表自动更新");
    }
});

console.log("[GlobalTextCacheGet] JavaScript扩展加载完成");
