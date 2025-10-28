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
const DEBOUNCE_DELAY = 1000; // 1秒防抖延迟（增加到1秒）

// 记录已警告的节点，避免重复警告
const warnedNodes = new Set();

// 全局请求队列机制 - 确保同一时间只有一个请求在处理
let isRequestInProgress = false;
const requestQueue = [];

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

    // 工作流初始化完成后，执行一次初始缓存保存
    // 延迟执行，确保工作流完全加载完成
    setTimeout(() => {
        // 检查text输入是否已连接
        const textInput = node.inputs?.find(i => i.name === "text");
        if (textInput && textInput.link != null) {
            // 获取当前被监听widget的值并触发保存
            const currentValue = targetWidget.value;
            console.log(`[GlobalTextCacheSave] 🔄 工作流初始化完成，执行初始缓存保存，当前值: ${currentValue}`);
            updateCacheViaAPI(node, currentValue);
        } else {
            console.log(`[GlobalTextCacheSave] ⏸️ Text输入未连接，跳过初始缓存保存`);
        }
    }, 1000); // 1秒延迟，确保工作流完全加载

    // 预注册通道到后端（确保Get节点能获取到这个通道）
    const channelWidget = node.widgets?.find(w => w.name === "channel_name");
    const currentChannelName = channelWidget?.value || "default";
    if (currentChannelName && currentChannelName.trim() !== '') {
        ensureChannelExists(currentChannelName).then(() => {
            console.log(`[GlobalTextCacheSave] ✅ 监听初始化后预注册通道: ${currentChannelName}`);
        });
    }

    console.log(`[GlobalTextCacheSave] ✅ 监听初始化完成`);
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

    // ✅ 清除内容hash缓存
    lastSentContentHash.delete(node.id);

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
 * 通过API确保通道存在（预注册通道）
 * @param {string} channelName - 通道名称
 * @returns {Promise<boolean>} 是否成功
 */
async function ensureChannelExists(channelName) {
    try {
        const response = await api.fetchApi('/danbooru/text_cache/ensure_channel', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                channel_name: channelName
            })
        });

        if (response.ok) {
            console.log(`[GlobalTextCacheSave] ✅ 通道已预注册: ${channelName}`);
            return true;
        } else {
            console.error(`[GlobalTextCacheSave] ❌ 通道预注册失败: ${channelName}`, response.statusText);
            return false;
        }
    } catch (error) {
        console.error(`[GlobalTextCacheSave] ❌ 通道预注册异常: ${channelName}`, error);
        return false;
    }
}

// 请求限流：记录每个节点的最后请求时间
const lastRequestTime = new Map(); // key: node.id, value: timestamp
const MIN_REQUEST_INTERVAL = 500; // 最小请求间隔（增加到500ms）

// 记录失败次数，防止重复错误日志
const failureCount = new Map(); // key: node.id, value: count

// 记录每个节点上次发送的文本内容hash，用于检测内容是否真的变化
const lastSentContentHash = new Map(); // key: node.id, value: content hash

/**
 * 计算字符串的简单hash（用于内容比较）
 * @param {string} str - 要计算hash的字符串
 * @returns {string} hash值
 */
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
}

/**
 * 处理请求队列
 * 确保同一时间只有一个API请求在处理
 */
async function processRequestQueue() {
    if (isRequestInProgress || requestQueue.length === 0) {
        return;
    }

    isRequestInProgress = true;
    const request = requestQueue.shift();

    try {
        await executeUpdateRequest(request.node, request.monitoredValue);
    } catch (error) {
        console.error("[GlobalTextCacheSave] 队列请求处理失败:", error);
    } finally {
        isRequestInProgress = false;
        // 继续处理下一个请求（如果有）
        if (requestQueue.length > 0) {
            setTimeout(processRequestQueue, 50); // 50ms后处理下一个
        }
    }
}

/**
 * 通过API更新缓存（队列入口）
 * @param {object} node - 当前节点
 * @param {any} monitoredValue - 触发更新的监听值
 */
async function updateCacheViaAPI(node, monitoredValue) {
    // 请求限流：检查距离上次请求是否足够时间间隔
    const now = Date.now();
    const lastTime = lastRequestTime.get(node.id) || 0;
    if (now - lastTime < MIN_REQUEST_INTERVAL) {
        console.log(`[GlobalTextCacheSave] 请求过于频繁，跳过本次更新（间隔${now - lastTime}ms < ${MIN_REQUEST_INTERVAL}ms）`);
        return;
    }
    lastRequestTime.set(node.id, now);

    // 清除该节点在队列中的旧请求（只保留最新的）
    const existingIndex = requestQueue.findIndex(req => req.node.id === node.id);
    if (existingIndex !== -1) {
        requestQueue.splice(existingIndex, 1);
        console.log(`[GlobalTextCacheSave] 队列中已有节点${node.id}的请求，替换为最新请求`);
    }

    // 添加到队列
    requestQueue.push({ node, monitoredValue });
    console.log(`[GlobalTextCacheSave] 请求已加入队列，当前队列长度: ${requestQueue.length}`);

    // 启动队列处理
    processRequestQueue();
}

/**
 * 实际执行API请求（由队列调用）
 * @param {object} node - 当前节点
 * @param {any} monitoredValue - 触发更新的监听值
 */
async function executeUpdateRequest(node, monitoredValue) {
    try {
        console.log(`[GlobalTextCacheSave] ⚙️ 开始处理节点${node.id}的缓存更新请求`);

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

        // 获取源节点的输出值（改进的智能获取逻辑）
        let text = "";
        let isConverted = false; // 标记是否进行了格式转换
        try {
            let sourceWidget = null;

            // 方法1：如果源节点就是被监听的节点，直接从被监听的widget获取值
            const nodeIdWidget = node.widgets?.find(w => w.name === "monitor_node_id");
            const widgetNameWidget = node.widgets?.find(w => w.name === "monitor_widget_name");
            const monitorNodeId = nodeIdWidget?.value?.toString().trim();
            const monitorWidgetName = widgetNameWidget?.value?.toString().trim();

            if (monitorNodeId && monitorWidgetName && parseInt(monitorNodeId) === sourceNode.id) {
                // 源节点就是被监听的节点，直接从被监听的widget获取
                sourceWidget = sourceNode.widgets?.find(w => w.name === monitorWidgetName);
                if (sourceWidget) {
                    console.log(`[GlobalTextCacheSave] ✅ 直接从被监听widget获取值: ${monitorWidgetName}`);
                }
            }

            // 方法2：尝试通过输出slot名称匹配widget
            if (!sourceWidget) {
                // 获取输出名称（如果节点类型定义了RETURN_NAMES）
                const outputNames = sourceNode.constructor?.nodeData?.output_name || [];
                const outputName = outputNames[link.origin_slot];

                if (outputName) {
                    // 尝试通过输出名称匹配widget
                    // 例如：model_name输出可能对应ckpt_name widget
                    const possibleWidgetNames = [
                        outputName,  // 直接匹配
                        outputName.replace('_name', ''),  // model_name -> model
                        outputName.replace('model_', ''),  // model_name -> name
                    ];

                    // 特殊映射：model_name -> ckpt_name
                    if (outputName === 'model_name') {
                        possibleWidgetNames.push('ckpt_name');
                    }

                    for (const widgetName of possibleWidgetNames) {
                        sourceWidget = sourceNode.widgets?.find(w => w.name === widgetName);
                        if (sourceWidget) {
                            console.log(`[GlobalTextCacheSave] ✅ 通过输出名称匹配到widget: ${widgetName} (输出: ${outputName})`);
                            break;
                        }
                    }
                }
            }

            // 方法3：尝试常见的widget名称
            if (!sourceWidget) {
                const commonNames = [
                    "text",
                    "positive",
                    "opt_text",
                    "ckpt_name",
                    "model_name"
                ];

                for (const widgetName of commonNames) {
                    sourceWidget = sourceNode.widgets?.find(w => w.name === widgetName);
                    if (sourceWidget) {
                        console.log(`[GlobalTextCacheSave] ✅ 通过常见名称匹配到widget: ${widgetName}`);
                        break;
                    }
                }
            }

            // 转换widget值为字符串
            if (sourceWidget && sourceWidget.value !== undefined && sourceWidget.value !== null) {
                const rawValue = sourceWidget.value;

                // ✨ 特殊处理：toggle_trigger_words 格式转换
                if (monitorWidgetName === "toggle_trigger_words") {
                    // 检查是否为数组格式 [{text: "xxx", active: true}, ...]
                    if (Array.isArray(rawValue)) {
                        // 过滤 active 为 true 的项，提取 text，用逗号连接
                        const activeTexts = rawValue
                            .filter(item => item && typeof item === 'object' && item.active !== false)
                            .map(item => item.text)
                            .filter(text => text); // 过滤空字符串

                        text = activeTexts.join(', ');
                        isConverted = true; // 标记已转换
                        console.log(`[GlobalTextCacheSave] ✅ toggle_trigger_words 格式转换完成: ${text}`);
                    } else {
                        text = String(rawValue);
                    }
                }
                // 检查是否为对象类型
                else if (typeof rawValue === 'object' && rawValue !== null) {
                    console.warn(`[GlobalTextCacheSave] Widget值为对象类型，尝试JSON序列化`);
                    try {
                        text = JSON.stringify(rawValue);
                    } catch (jsonError) {
                        console.error(`[GlobalTextCacheSave] JSON序列化失败，使用toString`, jsonError);
                        text = String(rawValue);
                    }
                } else {
                    text = String(rawValue);
                }

                console.log(`[GlobalTextCacheSave] ✅ 成功获取widget值，长度: ${text.length}`);
            } else {
                console.warn(`[GlobalTextCacheSave] ⚠️ 源节点${link.origin_id}未找到合适的widget`);
                console.warn(`[GlobalTextCacheSave]    - origin_slot: ${link.origin_slot}`);
                console.warn(`[GlobalTextCacheSave]    - 可用widgets: ${sourceNode.widgets?.map(w => w.name).join(', ') || '无'}`);
                text = "";
            }
        } catch (error) {
            console.error(`[GlobalTextCacheSave] ❌ 获取源节点widget值失败:`, error);
            text = "";
            return; // 获取失败直接返回，不继续请求
        }

        const channel = channelWidget.value || "default";

        // 确保text长度合理（防止超大文本导致问题）
        const MAX_TEXT_LENGTH = 100000;
        if (text.length > MAX_TEXT_LENGTH) {
            console.warn(`[GlobalTextCacheSave] 文本过长(${text.length}字符)，截断到${MAX_TEXT_LENGTH}字符`);
            text = text.substring(0, MAX_TEXT_LENGTH);
        }

        console.log(`[GlobalTextCacheSave] 准备保存缓存: 通道=${channel}, 文本长度=${text.length}`);

        // ✅ 内容变化检测：计算当前文本的hash
        const currentHash = simpleHash(text + "_" + channel); // 包含通道名，确保不同通道的相同文本也会更新
        const lastHash = lastSentContentHash.get(node.id);

        // 如果内容没有变化，跳过API请求
        if (lastHash === currentHash) {
            console.log(`[GlobalTextCacheSave] ⏭️ 内容未变化，跳过更新（hash: ${currentHash}）`);
            return; // 直接返回，不发送API请求，不显示toast
        }

        console.log(`[GlobalTextCacheSave] ✨ 内容已变化，继续更新（旧hash: ${lastHash}, 新hash: ${currentHash}）`);

        // 安全处理triggered_by值
        let triggeredByStr = "";
        try {
            if (monitoredValue !== undefined && monitoredValue !== null) {
                if (typeof monitoredValue === 'object') {
                    triggeredByStr = JSON.stringify(monitoredValue).substring(0, 100);
                } else {
                    triggeredByStr = String(monitoredValue).substring(0, 100);
                }
            }
        } catch (e) {
            console.warn(`[GlobalTextCacheSave] triggered_by转换失败:`, e);
            triggeredByStr = "unknown";
        }

        // 调用API更新缓存（包装在try/catch中）
        let response;
        try {
            response = await api.fetchApi('/danbooru/text_cache/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text,
                    channel_name: channel,
                    triggered_by: triggeredByStr
                })
            });
        } catch (fetchError) {
            console.error(`[GlobalTextCacheSave] API请求失败:`, fetchError);

            // 记录失败次数，避免重复toast
            const currentFailures = (failureCount.get(node.id) || 0) + 1;
            failureCount.set(node.id, currentFailures);

            if (currentFailures <= 3) {  // 只显示前3次失败
                showToast(`❌ 缓存保存失败: ${fetchError.message}`, 'error', 4000);
            }
            return;
        }

        if (response.ok) {
            // 重置失败计数
            failureCount.set(node.id, 0);

            // ✅ 更新hash缓存：记录本次成功发送的内容hash
            lastSentContentHash.set(node.id, currentHash);
            console.log(`[GlobalTextCacheSave] 📝 已更新内容hash缓存: ${currentHash}`);

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
            updateNodePreview(node, text, isConverted);

            // Get节点现在使用动态combo，会自动获取最新通道列表，不需要手动刷新
        } else {
            const errorText = await response.text().catch(() => "未知错误");
            console.error(`[GlobalTextCacheSave] 缓存更新失败:`, response.status, errorText);
            showToast(`❌ 缓存更新失败: ${response.status}`, 'error', 4000);
        }

    } catch (error) {
        console.error("[GlobalTextCacheSave] API调用异常:", error);
        const stack = error.stack || "";
        console.error("[GlobalTextCacheSave] 异常堆栈:", stack);
        showToast(`❌ 缓存更新异常: ${error.message}`, 'error', 4000);
    }
}

/**
 * 更新节点预览
 * @param {object} node - 节点对象
 * @param {string} text - 要显示的文本
 * @param {boolean} isConverted - 是否已转换格式（可选，默认false）
 */
function updateNodePreview(node, text, isConverted = false) {
    if (!node._cachePreviewElement) {
        return;
    }

    // 生成状态行
    const statusLine = generateStatusLine(node);

    // 生成文本内容行（不限制长度，完整显示）
    const textContent = text || '(空文本)';

    // 根据是否转换，决定标签文本
    const label = isConverted ? '📝 文本内容（已转换）：' : '📝 文本内容：';

    // 组合显示：第一行状态，第二行文本内容
    const displayText = `${statusLine}\n${label}${textContent}`;

    node._cachePreviewElement.textContent = displayText;
    node._cachePreviewElement.title = '缓存内容预览（共' + text.length + '字符）';
}

/**
 * 生成状态行文本
 * @param {object} node - 节点对象
 * @returns {string} 单行状态文本
 */
function generateStatusLine(node) {
    const nodeIdWidget = node.widgets?.find(w => w.name === "monitor_node_id");
    const widgetNameWidget = node.widgets?.find(w => w.name === "monitor_widget_name");
    const channelWidget = node.widgets?.find(w => w.name === "channel_name");

    // 检查text输入是否连接（forceInput模式下，text是input而非widget）
    const textInput = node.inputs?.find(i => i.name === "text");
    const isTextConnected = textInput && textInput.link != null;

    const channelName = channelWidget?.value || 'default';
    const nodeIdValue = nodeIdWidget?.value?.toString().trim();
    const widgetName = widgetNameWidget?.value?.toString().trim();

    let statusLine = `📊 通道:${channelName}`;

    // 监听配置部分
    if (nodeIdValue && widgetName) {
        // 检查节点ID格式
        if (!/^\d+$/.test(nodeIdValue)) {
            statusLine += ` | 监听:❌ 节点ID必须为整数(${nodeIdValue})`;
        } else {
            statusLine += ` | 监听:节点${nodeIdValue}/${widgetName}`;
        }
    } else if (nodeIdValue || widgetName) {
        statusLine += ` | 监听:⚠️ 配置不完整`;
    } else {
        statusLine += ` | 监听:未配置`;
    }

    // 监听状态
    const isMonitoring = monitoringMap.has(node.id);
    if (isMonitoring) {
        statusLine += ' | ✅ 监听已启动';
    } else if (nodeIdValue && widgetName) {
        if (!/^\d+$/.test(nodeIdValue)) {
            statusLine += ' | ❌ 格式错误';
        } else if (!isTextConnected) {
            statusLine += ' | ⚠️ Text未连接';
        } else {
            statusLine += ' | ⏸️ 等待启动';
        }
    }

    return statusLine;
}

/**
 * 更新节点状态预览
 * @param {object} node - 节点对象
 */
function updateStatusPreview(node) {
    if (!node._cachePreviewElement) {
        return;
    }

    const statusLine = generateStatusLine(node);
    node._cachePreviewElement.textContent = statusLine;
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

                // 初始化previousChannelName用于跟踪通道名变化
                this._previousChannelName = channelWidget?.value || "default";

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
                    channelWidget.callback = async (value) => {
                        if (originalChannelCallback) originalChannelCallback.call(channelWidget, value);

                        const previousName = this._previousChannelName;
                        const newName = value;

                        // 如果名称确实改变了（改名操作）
                        if (previousName && newName && previousName !== newName) {
                            console.log(`[GlobalTextCacheSave] 🔄 通道改名: "${previousName}" -> "${newName}"`);

                            try {
                                // 先检查旧通道是否存在
                                const channelsResponse = await api.fetchApi('/danbooru/text_cache/channels');
                                let existingChannels = [];
                                if (channelsResponse.ok) {
                                    const channelsData = await channelsResponse.json();
                                    existingChannels = channelsData.channels || [];
                                }

                                const oldChannelExists = existingChannels.includes(previousName);

                                // 如果旧通道不存在，说明是首次设置，直接注册新通道
                                if (!oldChannelExists) {
                                    console.log(`[GlobalTextCacheSave] 📝 旧通道"${previousName}"不存在，直接注册新通道: ${newName}`);
                                    await ensureChannelExists(newName);
                                    this._previousChannelName = newName;
                                    return;
                                }

                                // 旧通道存在，执行重命名操作
                                // 1. 调用后端API重命名通道（会自动删除旧通道）
                                const response = await api.fetchApi('/danbooru/text_cache/rename_channel', {
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
                                    console.log(`[GlobalTextCacheSave] ✅ 后端通道重命名成功:`, data);

                                    // 2. 获取最新的通道列表
                                    const channelsResponse = await api.fetchApi('/danbooru/text_cache/channels');
                                    let newChannelsList = [newName]; // 至少包含新通道名
                                    if (channelsResponse.ok) {
                                        const channelsData = await channelsResponse.json();
                                        newChannelsList = [""].concat((channelsData.channels || []).sort());
                                    }

                                    // 3. 找到所有Get节点，更新它们的通道值和下拉选项
                                    const allGetNodes = app.graph._nodes.filter(n => n.comfyClass === "GlobalTextCacheGet");
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
                                                console.log(`[GlobalTextCacheSave] ✅ 已更新Get节点${getNode.id}的通道: ${previousName} -> ${newName}`);
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
                                    console.error(`[GlobalTextCacheSave] ❌ 后端通道重命名失败:`, error);
                                    showToast(`❌ 通道重命名失败: ${error.error}`, 'error', 4000);
                                }
                            } catch (error) {
                                console.error(`[GlobalTextCacheSave] ❌ 通道重命名异常:`, error);
                                showToast(`❌ 通道重命名异常: ${error.message}`, 'error', 4000);
                            }
                        } else if (newName && newName !== 'default' && newName.trim() !== '') {
                            // 首次设置通道名（不是改名）
                            await ensureChannelExists(newName);
                        }

                        // 3. 更新previousChannelName
                        this._previousChannelName = newName;

                        updateStatusPreview(this);
                    };
                }

                // 设置初始节点大小（宽度400，高度350）
                this.setSize([400, 350]);

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
            // 初始化previousChannelName（工作流加载时）
            const channelWidget = node.widgets?.find(w => w.name === "channel_name");
            const currentChannelName = channelWidget?.value || "default";
            node._previousChannelName = currentChannelName;

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
