/**
 * 全局文本缓存保存节点 - JavaScript扩展
 * Global Text Cache Save Node - JavaScript Extension
 *
 * 功能：
 * - 监听指定节点的widget变化
 * - 自动通过API更新缓存
 * - 提供节点ID复制功能
 */

import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

// Toast互斥显示 - 保存上一次的缓存更新toast引用
let lastCacheUpdateToast = null;
let toastModule = null;

// 防抖机制 - 保存延迟定时器引用
const updateDebounceTimers = new Map(); // key: node.id, value: timerId
const DEBOUNCE_DELAY = 500; // 0.5秒防抖延迟

// 记录已警告的节点，避免重复警告
const warnedNodes = new Set();

// Toast通知管理器（如果存在）
let showToast = null;
try {
    toastModule = await import("../global/toast_manager.js");
    // 正确获取showToast方法
    showToast = (message, type = 'success', duration = 3000) => {
        return toastModule.globalToastManager.showToast(message, type, duration);
    };
    console.log("[GlobalTextCacheSave] Toast管理器加载成功");
} catch (e) {
    // 如果toast_manager不存在，使用console.log作为fallback
    console.warn("[GlobalTextCacheSave] Toast管理器加载失败，使用fallback:", e);
    showToast = (message) => console.log(`[Toast] ${message}`);
}

// 存储监听器引用，用于清理
const monitoringMap = new Map();

/**
 * 设置widget变化监听
 * @param {object} node - 当前节点
 */
function setupMonitoring(node) {
    // 获取监听配置
    const nodeIdWidget = node.widgets?.find(w => w.name === "monitor_node_id");
    const widgetNameWidget = node.widgets?.find(w => w.name === "monitor_widget_name");

    if (!nodeIdWidget || !widgetNameWidget) {
        console.warn("[GlobalTextCacheSave] 监听配置widget不存在");
        return;
    }

    const monitorNodeId = nodeIdWidget.value?.toString().trim();
    const monitorWidgetName = widgetNameWidget.value?.toString().trim();

    // 如果配置为空，清除现有监听
    if (!monitorNodeId || !monitorWidgetName) {
        cleanupMonitoring(node);
        return;
    }

    // 验证节点ID必须为整数
    if (!/^\d+$/.test(monitorNodeId)) {
        console.warn(`[GlobalTextCacheSave] 节点ID必须为整数: ${monitorNodeId}`);
        showToast(`❌ 节点ID必须为整数，当前值: ${monitorNodeId}`, 'error', 3000);
        return;
    }

    // 查找目标节点
    const targetNode = app.graph.getNodeById(parseInt(monitorNodeId));
    if (!targetNode) {
        console.warn(`[GlobalTextCacheSave] 未找到节点ID: ${monitorNodeId}`);
        showToast(`❌ 未找到节点ID: ${monitorNodeId}`, 'error', 3000);
        return;
    }

    // 查找目标widget
    const targetWidget = targetNode.widgets?.find(w => w.name === monitorWidgetName);
    if (!targetWidget) {
        console.warn(`[GlobalTextCacheSave] 节点 ${monitorNodeId} 不存在widget: ${monitorWidgetName}`);
        return;
    }

    // 清除警告标记（用户可能刚连接了text输入）
    warnedNodes.delete(node.id);

    console.log(`[GlobalTextCacheSave] 开始监听: 节点ID=${monitorNodeId}, Widget=${monitorWidgetName}`);

    // 清理旧的监听器
    cleanupMonitoring(node);

    // 保存原始callback
    const originalCallback = targetWidget.callback;

    // 创建带防抖的新callback
    const newCallback = function(value) {
        // 调用原始callback
        if (originalCallback) {
            originalCallback.call(this, value);
        }

        // 防抖逻辑：清除上一次的延迟
        const existingTimer = updateDebounceTimers.get(node.id);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        // 设置新的0.5秒延迟（减少日志输出）
        const newTimer = setTimeout(() => {
            updateCacheViaAPI(node, value);
            updateDebounceTimers.delete(node.id);
        }, DEBOUNCE_DELAY);

        updateDebounceTimers.set(node.id, newTimer);
    };

    // 替换callback
    targetWidget.callback = newCallback;

    // 存储监听信息，用于清理
    monitoringMap.set(node.id, {
        targetNode: targetNode,
        targetWidget: targetWidget,
        originalCallback: originalCallback,
        newCallback: newCallback
    });

    showToast(`✅ 已开始监听: 节点${monitorNodeId} / ${monitorWidgetName}`, 'info', 2000);

    // 更新预览状态
    updateStatusPreview(node);
}

/**
 * 清除监听
 * @param {object} node - 当前节点
 */
function cleanupMonitoring(node) {
    if (!monitoringMap.has(node.id)) {
        return;
    }

    // 清除防抖定时器
    const existingTimer = updateDebounceTimers.get(node.id);
    if (existingTimer) {
        clearTimeout(existingTimer);
        updateDebounceTimers.delete(node.id);
    }

    // 清除警告标记
    warnedNodes.delete(node.id);

    const monitorInfo = monitoringMap.get(node.id);

    // 恢复原始callback
    if (monitorInfo.targetWidget) {
        monitorInfo.targetWidget.callback = monitorInfo.originalCallback;
    }

    monitoringMap.delete(node.id);
    console.log(`[GlobalTextCacheSave] 已清除节点 ${node.id} 的监听`);

    // 更新预览状态
    updateStatusPreview(node);
}

/**
 * 通过API更新缓存
 * @param {object} node - 当前节点
 * @param {any} monitoredValue - 触发更新的监听值
 */
async function updateCacheViaAPI(node, monitoredValue) {
    try {
        // 获取节点参数
        const channelWidget = node.widgets?.find(w => w.name === "channel_name");

        if (!channelWidget) {
            console.error("[GlobalTextCacheSave] 缺少channel_name widget");
            return;
        }

        // 检查text输入是否连接（forceInput模式）
        const textInput = node.inputs?.find(i => i.name === "text");
        if (!textInput || textInput.link == null) {
            // 只在第一次时警告，避免频繁日志
            if (!warnedNodes.has(node.id)) {
                console.warn(`[GlobalTextCacheSave] ⚠️ 节点${node.id}的text输入未连接，无法更新缓存`);
                showToast(`⚠️ 请连接text输入以启用自动缓存更新`, 'warning', 3000);
                warnedNodes.add(node.id);
            }
            return;
        }

        // 从连接的源节点获取text值
        const link = app.graph.links[textInput.link];
        if (!link) {
            console.error("[GlobalTextCacheSave] 无法获取text连接");
            return;
        }

        const sourceNode = app.graph.getNodeById(link.origin_id);
        if (!sourceNode) {
            console.error("[GlobalTextCacheSave] 无法找到源节点");
            return;
        }

        // 获取源节点的输出值
        const sourceWidget = sourceNode.widgets?.find(w => w.name === link.origin_slot || w.name === "text" || w.name === "positive");
        const text = sourceWidget?.value || "";
        const channel = channelWidget.value || "default";

        // 调用API更新缓存
        const response = await api.fetchApi('/danbooru/text_cache/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: text,
                channel_name: channel,
                triggered_by: monitoredValue?.toString() || "",
                timestamp: Date.now()
            })
        });

        if (response.ok) {
            // Toast互斥显示：先移除上一条缓存更新toast
            if (lastCacheUpdateToast && toastModule) {
                try {
                    toastModule.globalToastManager.removeToast(lastCacheUpdateToast);
                } catch (e) {
                    // 忽略移除toast的错误
                }
            }

            // 显示新toast并保存引用
            if (showToast) {
                lastCacheUpdateToast = showToast(`💾 文本缓存已自动更新: ${channel}`, 'success', 2000);
            }

            // 更新预览显示
            updateNodePreview(node, text);
        } else {
            console.error(`[GlobalTextCacheSave] 缓存更新失败:`, response.statusText);
            showToast(`❌ 缓存更新失败: ${response.statusText}`, 'error', 4000);
        }

    } catch (error) {
        console.error("[GlobalTextCacheSave] API调用异常:", error);
        showToast(`❌ 缓存更新异常: ${error.message}`, 'error', 4000);
    }
}

/**
 * 更新节点预览
 * @param {object} node - 节点对象
 * @param {string} text - 要显示的文本
 */
function updateNodePreview(node, text) {
    const enablePreviewWidget = node.widgets?.find(w => w.name === "enable_preview");
    const enablePreview = enablePreviewWidget?.value !== false;

    if (!enablePreview || !node._cachePreviewElement) {
        return;
    }

    // 更新预览内容
    const maxLength = 500; // 最多显示500字符
    const displayText = text.length > maxLength
        ? text.substring(0, maxLength) + '\n\n...(已截断，共' + text.length + '字符)'
        : text;

    node._cachePreviewElement.textContent = displayText || '(空文本)';
    node._cachePreviewElement.title = '缓存内容预览（共' + text.length + '字符）';
}

/**
 * 更新节点状态预览
 * @param {object} node - 节点对象
 */
function updateStatusPreview(node) {
    if (!node._cachePreviewElement) {
        return;
    }

    const nodeIdWidget = node.widgets?.find(w => w.name === "monitor_node_id");
    const widgetNameWidget = node.widgets?.find(w => w.name === "monitor_widget_name");
    const channelWidget = node.widgets?.find(w => w.name === "channel_name");

    // 检查text输入是否连接（forceInput模式下，text是input而非widget）
    const textInput = node.inputs?.find(i => i.name === "text");
    const isTextConnected = textInput && textInput.link != null;

    let statusText = '📊 状态：\n';
    statusText += `- 通道名称: ${channelWidget?.value || 'default'}\n`;

    // 检查节点ID格式
    const nodeIdValue = nodeIdWidget?.value?.toString().trim();
    if (nodeIdValue) {
        if (!/^\d+$/.test(nodeIdValue)) {
            statusText += `- 监听节点ID: ❌ 必须为整数 (${nodeIdValue})\n`;
        } else {
            statusText += `- 监听节点ID: ${nodeIdValue}\n`;
        }
    } else {
        statusText += `- 监听节点ID: ❌ 未配置\n`;
    }

    statusText += `- 监听Widget: ${widgetNameWidget?.value || '❌ 未配置'}\n`;

    // 只在未连接时显示警告
    if (!isTextConnected) {
        statusText += `- Text输入: ❌ 未连接\n`;
    }

    statusText += '\n';

    // 检查监听是否已启动
    const isMonitoring = monitoringMap.has(node.id);
    if (isMonitoring) {
        statusText += '✅ 监听已启动\n';
    } else if (nodeIdWidget?.value && widgetNameWidget?.value) {
        // 如果节点ID格式错误，显示错误提示
        if (nodeIdValue && !/^\d+$/.test(nodeIdValue)) {
            statusText += '❌ 节点ID格式错误，请输入整数\n';
        } else {
            statusText += '⚠️ 配置已设置，等待启动监听\n';
        }
    } else {
        statusText += '💡 配置监听后，widget变化时会自动更新缓存';
    }

    node._cachePreviewElement.textContent = statusText;
}

// 注册节点扩展
app.registerExtension({
    name: "Danbooru.GlobalTextCacheSave",

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "GlobalTextCacheSave") {
            console.log("[GlobalTextCacheSave] 注册节点扩展");

            // 节点创建时的处理
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function() {
                const result = onNodeCreated?.apply(this, arguments);

                // 创建预览容器
                const previewContainer = document.createElement('div');
                previewContainer.style.cssText = `
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                    padding: 8px;
                    margin: 4px 0;
                    max-height: 150px;
                    overflow-y: auto;
                    font-family: 'Consolas', 'Monaco', monospace;
                    font-size: 11px;
                    color: #E0E0E0;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    line-height: 1.4;
                `;
                previewContainer.textContent = '等待缓存更新...';

                // 添加到节点
                this.addDOMWidget("cache_preview", "div", previewContainer);
                this._cachePreviewElement = previewContainer;

                // 监听widget值变化
                const nodeIdWidget = this.widgets?.find(w => w.name === "monitor_node_id");
                const widgetNameWidget = this.widgets?.find(w => w.name === "monitor_widget_name");
                const channelWidget = this.widgets?.find(w => w.name === "channel_name");

                if (nodeIdWidget && widgetNameWidget) {
                    // 当配置改变时，重新设置监听并更新预览
                    const originalNodeIdCallback = nodeIdWidget.callback;
                    nodeIdWidget.callback = (value) => {
                        if (originalNodeIdCallback) originalNodeIdCallback.call(nodeIdWidget, value);
                        setupMonitoring(this);
                        updateStatusPreview(this);
                    };

                    const originalWidgetNameCallback = widgetNameWidget.callback;
                    widgetNameWidget.callback = (value) => {
                        if (originalWidgetNameCallback) originalWidgetNameCallback.call(widgetNameWidget, value);
                        setupMonitoring(this);
                        updateStatusPreview(this);
                    };
                }

                // 监听通道名称变化
                if (channelWidget) {
                    const originalChannelCallback = channelWidget.callback;
                    channelWidget.callback = (value) => {
                        if (originalChannelCallback) originalChannelCallback.call(channelWidget, value);
                        updateStatusPreview(this);
                    };
                }

                console.log(`[GlobalTextCacheSave] 节点已创建: ID=${this.id}`);
                return result;
            };

            // 右键菜单已移除

            // 节点移除时清理
            const onRemoved = nodeType.prototype.onRemoved;
            nodeType.prototype.onRemoved = function() {
                cleanupMonitoring(this);
                return onRemoved?.apply(this, arguments);
            };
        }
    },

    async nodeCreated(node) {
        if (node.comfyClass === "GlobalTextCacheSave") {

            // 节点加载完成后自动设置监听（如果已配置）
            setTimeout(() => {
                const nodeIdWidget = node.widgets?.find(w => w.name === "monitor_node_id");
                const widgetNameWidget = node.widgets?.find(w => w.name === "monitor_widget_name");

                // 检查text输入连接（forceInput模式）
                const textInput = node.inputs?.find(i => i.name === "text");
                const isTextConnected = textInput && textInput.link != null;

                console.log(`[GlobalTextCacheSave] 🔍 自动监听检查:`, {
                    nodeId: node.id,
                    monitorNodeId: nodeIdWidget?.value,
                    monitorWidgetName: widgetNameWidget?.value,
                    isTextConnected: isTextConnected
                });

                // 自动启动监听（如果已配置）
                if (nodeIdWidget?.value && widgetNameWidget?.value) {
                    setupMonitoring(node);
                }

                // 更新预览状态信息
                updateStatusPreview(node);
            }, 200); // 增加延迟到200ms
        }
    }
});

console.log("[GlobalTextCacheSave] JavaScript扩展加载完成");
