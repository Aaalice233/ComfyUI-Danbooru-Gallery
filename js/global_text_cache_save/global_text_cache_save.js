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

import { createLogger } from '../global/logger_client.js';

// 创建logger实例
const logger = createLogger('global_text_cache_save');

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
    logger.info("[GlobalTextCacheSave] Toast管理器加载成功");
} catch (e) {
    // 如果toast_manager不存在，使用console.log作为fallback
    logger.warn("[GlobalTextCacheSave] Toast管理器加载失败，使用fallback:", e);
    showToast = (message) => logger.info(`[Toast] ${message}`);
}

// 存储监听器引用，用于清理
const monitoringMap = new Map();

// ====== 已废弃的防堆叠Toast函数 - 现已移至全局toast_manager.js ======
// 以下代码已迁移到 js/global/toast_manager.js 的ToastManager类中
// 现在直接使用 showToast() 方法的防堆叠参数即可

/*
function showUniqueToast(type, message, toastType = 'info', duration = 3000) {
    // 防堆叠功能已移除，现在使用普通toast
    showToast(message, toastType, duration);
}

function clearUniqueToast(type) {
    // 已迁移到全局toast模块
    if (toastModule && toastModule.globalToastManager) {
        toastModule.globalToastManager.clearUniqueToast(type);
    }
}

function clearAllUniqueToasts() {
    // 已迁移到全局toast模块
    if (toastModule && toastModule.globalToastManager) {
        toastModule.globalToastManager.clearAllUniqueToasts();
    }
}
*/

/**
 * 设置widget变化监听
 * @param {object} node - 当前节点
 */
function setupMonitoring(node) {
    // 获取监听配置
    const nodeIdWidget = node.widgets?.find(w => w.name === "monitor_node_id");
    const widgetNameWidget = node.widgets?.find(w => w.name === "monitor_widget_name");

    if (!nodeIdWidget || !widgetNameWidget) {
        logger.warn("[GlobalTextCacheSave] 监听配置widget不存在");
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
        logger.warn(`[GlobalTextCacheSave] 节点ID必须为整数: ${monitorNodeId}`);
        showToast(`❌ 节点ID必须为整数，当前值: ${monitorNodeId}`, 'error', 3000);
        return;
    }

    // 查找目标节点
    const targetNode = app.graph.getNodeById(parseInt(monitorNodeId));
    if (!targetNode) {
        logger.warn(`[GlobalTextCacheSave] 未找到节点ID: ${monitorNodeId}`);
        showToast(`❌ 未找到节点ID: ${monitorNodeId}`, 'error', 3000);
        return;
    }

    // 查找目标widget
    const targetWidget = targetNode.widgets?.find(w => w.name === monitorWidgetName);
    if (!targetWidget) {
        logger.warn(`[GlobalTextCacheSave] 节点 ${monitorNodeId} 不存在widget: ${monitorWidgetName}`);
        return;
    }

    // 清除警告标记（用户可能刚连接了text输入）
    warnedNodes.delete(node.id);

    logger.info(`[GlobalTextCacheSave] 开始监听: 节点ID=${monitorNodeId}, Widget=${monitorWidgetName}`);

    // 清理旧的监听器
    cleanupMonitoring(node);

    // 保存原始callback
    const originalCallback = targetWidget.callback;

    // 创建带防抖的新callback
    const newCallback = function (value) {
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

    // 显示监听开始消息
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
            logger.info(`[GlobalTextCacheSave] 🔄 工作流初始化完成，执行初始缓存保存，当前值: ${currentValue}`);
            updateCacheViaAPI(node, currentValue);
        } else {
            logger.info(`[GlobalTextCacheSave] ⏸️ Text输入未连接，跳过初始缓存保存`);
        }
    }, 1000); // 1秒延迟，确保工作流完全加载

    // 预注册通道到后端（确保Get节点能获取到这个通道）
    const channelWidget = node.widgets?.find(w => w.name === "channel_name");
    const currentChannelName = channelWidget?.value || "default";
    if (currentChannelName && currentChannelName.trim() !== '') {
        // 开始监控节点通道注册状态
        channelRegistrationMonitor.startNodeRegistration(node, currentChannelName);

        // 执行通道注册（带重试）
        ensureChannelExists(currentChannelName).then((success) => {
            if (success) {
                logger.info(`[GlobalTextCacheSave] ✅ 监听初始化后预注册通道: ${currentChannelName}`);
                // 更新监控状态为成功（假设1次尝试成功）
                channelRegistrationMonitor.updateNodeStatus(node.id, 'success', 1);
            } else {
                logger.error(`[GlobalTextCacheSave] ❌ 通道注册失败: ${currentChannelName}`);
                // 更新监控状态为失败
                channelRegistrationMonitor.updateNodeStatus(node.id, 'failed', 5);
            }
        });
    }

    logger.info(`[GlobalTextCacheSave] ✅ 监听初始化完成`);
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
    logger.info(`[GlobalTextCacheSave] 已清除节点 ${node.id} 的监听`);

    // 更新预览状态
    updateStatusPreview(node);
}

/**
 * 通过API确保通道存在（预注册通道）- 增强版支持重试
 * @param {string} channelName - 通道名称
 * @param {number} maxRetries - 最大重试次数（默认5次）
 * @returns {Promise<boolean>} 是否成功
 */
async function ensureChannelExists(channelName, maxRetries = 5) {
    const baseDelays = [500, 1000, 2000, 3000, 5000]; // 指数退避：0.5s, 1s, 2s, 3s, 5s

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await api.fetchApi('/danbooru/text_cache/ensure_channel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    channel_name: channelName,
                    attempt: attempt + 1  // 告知后端当前尝试次数
                })
            });

            if (response.ok) {
                if (attempt === 0) {
                    logger.info(`[GlobalTextCacheSave] ✅ 通道已预注册: ${channelName}`);
                } else {
                    logger.info(`[GlobalTextCacheSave] ✅ 重试${attempt + 1}次成功预注册通道: ${channelName}`);
                }
                return true;
            } else {
                logger.warn(`[GlobalTextCacheSave] ⚠️ 通道预注册失败 (尝试 ${attempt + 1}/${maxRetries}): ${channelName}`, response.status, response.statusText);
            }

        } catch (error) {
            logger.warn(`[GlobalTextCacheSave] ⚠️ 通道预注册异常 (尝试 ${attempt + 1}/${maxRetries}): ${channelName}`, error.message);
        }

        // 如果不是最后一次尝试，等待后重试
        if (attempt < maxRetries - 1) {
            const baseDelay = baseDelays[Math.min(attempt, baseDelays.length - 1)];
            const jitter = Math.random() * 200; // 0-200ms随机抖动
            const delay = baseDelay + jitter;

            logger.info(`[GlobalTextCacheSave] ⏳ 等待${Math.round(delay)}ms后重试通道注册: ${channelName}`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    // 所有重试都失败了
    logger.error(`[GlobalTextCacheSave] ❌ 通道预注册最终失败，已重试${maxRetries}次: ${channelName}`);
    return false;
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
        logger.error("[GlobalTextCacheSave] 队列请求处理失败:", error);
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
        logger.info(`[GlobalTextCacheSave] 请求过于频繁，跳过本次更新（间隔${now - lastTime}ms < ${MIN_REQUEST_INTERVAL}ms）`);
        return;
    }
    lastRequestTime.set(node.id, now);

    // 清除该节点在队列中的旧请求（只保留最新的）
    const existingIndex = requestQueue.findIndex(req => req.node.id === node.id);
    if (existingIndex !== -1) {
        requestQueue.splice(existingIndex, 1);
        logger.info(`[GlobalTextCacheSave] 队列中已有节点${node.id}的请求，替换为最新请求`);
    }

    // 添加到队列
    requestQueue.push({ node, monitoredValue });
    logger.info(`[GlobalTextCacheSave] 请求已加入队列，当前队列长度: ${requestQueue.length}`);

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
        logger.info(`[GlobalTextCacheSave] ⚙️ 开始处理节点${node.id}的缓存更新请求`);

        // 获取节点参数
        const channelWidget = node.widgets?.find(w => w.name === "channel_name");

        if (!channelWidget) {
            logger.error("[GlobalTextCacheSave] 缺少channel_name widget");
            return;
        }

        // 检查text输入是否连接（forceInput模式）
        const textInput = node.inputs?.find(i => i.name === "text");
        if (!textInput || textInput.link == null) {
            // 只在第一次时警告，避免频繁日志
            if (!warnedNodes.has(node.id)) {
                logger.warn(`[GlobalTextCacheSave] ⚠️ 节点${node.id}的text输入未连接，无法更新缓存`);
                showToast(`⚠️ 请连接text输入以启用自动缓存更新`, 'warning', 3000);
                warnedNodes.add(node.id);
            }
            return;
        }

        // 从连接的源节点获取text值
        const link = app.graph.links[textInput.link];
        if (!link) {
            logger.error("[GlobalTextCacheSave] 无法获取text连接");
            return;
        }

        const sourceNode = app.graph.getNodeById(link.origin_id);
        if (!sourceNode) {
            logger.error("[GlobalTextCacheSave] 无法找到源节点");
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
                    logger.info(`[GlobalTextCacheSave] ✅ 直接从被监听widget获取值: ${monitorWidgetName}`);
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
                            logger.info(`[GlobalTextCacheSave] ✅ 通过输出名称匹配到widget: ${widgetName} (输出: ${outputName})`);
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
                        logger.info(`[GlobalTextCacheSave] ✅ 通过常见名称匹配到widget: ${widgetName}`);
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
                        logger.info(`[GlobalTextCacheSave] ✅ toggle_trigger_words 格式转换完成: ${text}`);
                    } else {
                        text = String(rawValue);
                    }
                }
                // 检查是否为对象类型
                else if (typeof rawValue === 'object' && rawValue !== null) {
                    logger.warn(`[GlobalTextCacheSave] Widget值为对象类型，尝试JSON序列化`);
                    try {
                        text = JSON.stringify(rawValue);
                    } catch (jsonError) {
                        logger.error(`[GlobalTextCacheSave] JSON序列化失败，使用toString`, jsonError);
                        text = String(rawValue);
                    }
                } else {
                    text = String(rawValue);
                }

                logger.info(`[GlobalTextCacheSave] ✅ 成功获取widget值，长度: ${text.length}`);
            } else {
                logger.warn(`[GlobalTextCacheSave] ⚠️ 源节点${link.origin_id}未找到合适的widget`);
                logger.warn(`[GlobalTextCacheSave]    - origin_slot: ${link.origin_slot}`);
                logger.warn(`[GlobalTextCacheSave]    - 可用widgets: ${sourceNode.widgets?.map(w => w.name).join(', ') || '无'}`);
                text = "";
            }
        } catch (error) {
            logger.error(`[GlobalTextCacheSave] ❌ 获取源节点widget值失败:`, error);
            text = "";
            return; // 获取失败直接返回，不继续请求
        }

        const channel = channelWidget.value || "default";

        // 确保text长度合理（防止超大文本导致问题）
        const MAX_TEXT_LENGTH = 100000;
        if (text.length > MAX_TEXT_LENGTH) {
            logger.warn(`[GlobalTextCacheSave] 文本过长(${text.length}字符)，截断到${MAX_TEXT_LENGTH}字符`);
            text = text.substring(0, MAX_TEXT_LENGTH);
        }

        logger.info(`[GlobalTextCacheSave] 准备保存缓存: 通道=${channel}, 文本长度=${text.length}`);

        // ✅ 内容变化检测：计算当前文本的hash
        const currentHash = simpleHash(text + "_" + channel); // 包含通道名，确保不同通道的相同文本也会更新
        const lastHash = lastSentContentHash.get(node.id);

        // 如果内容没有变化，跳过API请求
        if (lastHash === currentHash) {
            logger.info(`[GlobalTextCacheSave] ⏭️ 内容未变化，跳过更新（hash: ${currentHash}）`);
            return; // 直接返回，不发送API请求，不显示toast
        }

        logger.info(`[GlobalTextCacheSave] ✨ 内容已变化，继续更新（旧hash: ${lastHash}, 新hash: ${currentHash}）`);

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
            logger.warn(`[GlobalTextCacheSave] triggered_by转换失败:`, e);
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
            logger.error(`[GlobalTextCacheSave] API请求失败:`, fetchError);

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
            logger.info(`[GlobalTextCacheSave] 📝 已更新内容hash缓存: ${currentHash}`);

            // 显示缓存更新消息
            showToast(`💾 文本缓存已自动更新: ${channel}`, 'success', 2000);

            // 更新预览显示
            updateNodePreview(node, text, isConverted);

            // Get节点现在使用动态combo，会自动获取最新通道列表，不需要手动刷新
        } else {
            const errorText = await response.text().catch(() => "未知错误");
            logger.error(`[GlobalTextCacheSave] 缓存更新失败:`, response.status, errorText);
            showToast(`❌ 缓存更新失败: ${response.status}`, 'error', 4000);
        }

    } catch (error) {
        logger.error("[GlobalTextCacheSave] API调用异常:", error);
        const stack = error.stack || "";
        logger.error("[GlobalTextCacheSave] 异常堆栈:", stack);
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
            logger.info("[GlobalTextCacheSave] 注册节点扩展");

            // 节点创建时的处理
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
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
                            logger.info(`[GlobalTextCacheSave] 🔄 通道改名: "${previousName}" -> "${newName}"`);

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
                                    logger.info(`[GlobalTextCacheSave] 📝 旧通道"${previousName}"不存在，直接注册新通道: ${newName}`);
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
                                    logger.info(`[GlobalTextCacheSave] ✅ 后端通道重命名成功:`, data);

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
                                                logger.info(`[GlobalTextCacheSave] ✅ 已更新Get节点${getNode.id}的通道: ${previousName} -> ${newName}`);
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
                                    logger.error(`[GlobalTextCacheSave] ❌ 后端通道重命名失败:`, error);
                                    showToast(`❌ 通道重命名失败: ${error.error}`, 'error', 4000);
                                }
                            } catch (error) {
                                logger.error(`[GlobalTextCacheSave] ❌ 通道重命名异常:`, error);
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

                logger.info(`[GlobalTextCacheSave] 节点已创建: ID=${this.id}`);
                return result;
            };

            // 右键菜单已移除

            // 节点移除时清理
            const onRemoved = nodeType.prototype.onRemoved;
            nodeType.prototype.onRemoved = function () {
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

                logger.info(`[GlobalTextCacheSave] 🔍 自动监听检查:`, {
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

// ====== 通道注册状态监控和反馈 ======

/**
 * 通道注册状态监控器
 * 跟踪所有节点的通道注册状态，提供实时反馈
 */
class ChannelRegistrationMonitor {
    constructor() {
        this.nodeStatuses = new Map(); // key: nodeId, value: {channel, status, attempts, lastAttempt}
        this.pendingRegistrations = new Set(); // 正在注册的通道
        this.successfulRegistrations = new Set(); // 成功注册的通道
        this.failedRegistrations = new Set(); // 失败注册的通道
        this.checkInterval = null;
        this.isMonitoring = false;
        this.hasShownSuccessToast = false; // 是否已显示成功Toast
    }

    /**
     * 开始监控节点的通道注册
     * @param {object} node - 节点对象
     * @param {string} channelName - 通道名称
     */
    startNodeRegistration(node, channelName) {
        const nodeId = node.id;
        this.nodeStatuses.set(nodeId, {
            channel: channelName,
            status: 'pending',
            attempts: 0,
            lastAttempt: Date.now(),
            node: node
        });

        logger.info(`[ChannelMonitor] 📝 开始监控节点${nodeId}的通道注册: ${channelName}`);

        if (!this.isMonitoring) {
            this.startMonitoring();
        }
    }

    /**
     * 更新节点注册状态
     * @param {number} nodeId - 节点ID
     * @param {string} status - 状态: 'pending', 'success', 'failed'
     * @param {number} attempts - 尝试次数
     */
    updateNodeStatus(nodeId, status, attempts = null) {
        const nodeStatus = this.nodeStatuses.get(nodeId);
        if (nodeStatus) {
            nodeStatus.status = status;
            nodeStatus.lastAttempt = Date.now();
            if (attempts !== null) {
                nodeStatus.attempts = attempts;
            }

            const channel = nodeStatus.channel;

            // 更新状态集合
            this.pendingRegistrations.delete(channel);
            if (status === 'success') {
                this.successfulRegistrations.add(channel);
                this.failedRegistrations.delete(channel);
                logger.info(`[ChannelMonitor] ✅ 节点${nodeId}通道注册成功: ${channel}`);
            } else if (status === 'failed') {
                this.failedRegistrations.add(channel);
                this.successfulRegistrations.delete(channel);
                logger.error(`[ChannelMonitor] ❌ 节点${nodeId}通道注册失败: ${channel}`);
            }

            // 更新节点预览状态
            this.updateNodePreview(nodeStatus.node);
        }
    }

    /**
     * 开始监控循环
     */
    startMonitoring() {
        if (this.isMonitoring) return;

        this.isMonitoring = true;
        logger.info("[ChannelMonitor] 🔍 开始通道注册状态监控");

        this.checkInterval = setInterval(() => {
            this.checkRegistrationStatus();
        }, 2000); // 每2秒检查一次
    }

    /**
     * 停止监控
     */
    stopMonitoring() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        this.isMonitoring = false;
        logger.info("[ChannelMonitor] ⏹️ 停止通道注册状态监控");
    }

    /**
     * 检查注册状态
     */
    async checkRegistrationStatus() {
        try {
            // 获取后端通道列表
            const response = await api.fetchApi('/danbooru/text_cache/channels');
            if (!response.ok) return;

            const data = await response.json();
            const backendChannels = new Set(data.channels || []);

            // 检查每个节点的通道注册状态
            for (const [nodeId, nodeStatus] of this.nodeStatuses.entries()) {
                const channel = nodeStatus.channel;
                const isRegistered = backendChannels.has(channel);

                if (isRegistered && nodeStatus.status !== 'success') {
                    this.updateNodeStatus(nodeId, 'success', nodeStatus.attempts);
                } else if (!isRegistered && nodeStatus.status === 'success') {
                    // 通道在后端丢失了，重新标记为待注册
                    this.updateNodeStatus(nodeId, 'pending', 0);
                    this.pendingRegistrations.add(channel);
                }
            }

            // 检查是否所有节点都已成功注册
            const totalNodes = this.nodeStatuses.size;
            const successNodes = this.successfulRegistrations.size;
            const pendingNodes = this.pendingRegistrations.size;
            const failedNodes = this.failedRegistrations.size;

            if (totalNodes > 0) {
                if (successNodes === totalNodes) {
                    logger.info(`[ChannelMonitor] 🎉 所有节点通道注册完成! (${successNodes}/${totalNodes})`);
                    this.stopMonitoring();

                    // 显示成功Toast（只显示一次）
                    if (showToast && !this.hasShownSuccessToast) {
                        showToast(`🎉 所有${totalNodes}个文本缓存节点通道注册成功!`, 'success', 3000);
                        this.hasShownSuccessToast = true;
                    }
                } else if (failedNodes > 0 && pendingNodes === 0) {
                    logger.warn(`[ChannelMonitor] ⚠️ 部分节点注册失败: 成功${successNodes}/${totalNodes}, 失败${failedNodes}`);

                    // 显示警告Toast
                    if (showToast) {
                        showToast(`⚠️ ${failedNodes}个节点通道注册失败，请检查网络连接`, 'warning', 5000);
                    }
                }
            }

        } catch (error) {
            logger.error("[ChannelMonitor] 检查注册状态时出错:", error);
        }
    }

    /**
     * 更新节点预览显示
     * @param {object} node - 节点对象
     */
    updateNodePreview(node) {
        if (!node || !node._cachePreviewElement) return;

        const nodeStatus = this.nodeStatuses.get(node.id);
        if (!nodeStatus) return;

        const statusIcon = {
            'pending': '⏳',
            'success': '✅',
            'failed': '❌'
        }[nodeStatus.status] || '❓';

        // 在现有状态信息前添加注册状态
        const currentText = node._cachePreviewElement.textContent;
        const lines = currentText.split('\n');

        // 在第一行（状态行）添加注册状态
        if (lines.length > 0) {
            const registrationStatus = `${statusIcon} 通道注册: ${nodeStatus.status}`;
            // 查找是否有现有的通道注册状态标记
            const existingRegistrationIndex = lines.findIndex(line =>
                line.includes('通道注册:') || line.includes('⏳') || line.includes('✅') || line.includes('❌')
            );

            if (existingRegistrationIndex >= 0) {
                lines[existingRegistrationIndex] = registrationStatus;
            } else {
                // 在状态行后插入注册状态
                lines.splice(1, 0, registrationStatus);
            }
        }

        node._cachePreviewElement.textContent = lines.join('\n');
    }

    /**
     * 获取注册统计信息
     */
    getStats() {
        return {
            total: this.nodeStatuses.size,
            success: this.successfulRegistrations.size,
            pending: this.pendingRegistrations.size,
            failed: this.failedRegistrations.size
        };
    }
}

// 创建全局监控器实例
const channelRegistrationMonitor = new ChannelRegistrationMonitor();

// 导出监控器供其他函数使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { channelRegistrationMonitor };
}

// ====== 双向状态验证机制 ======

/**
 * 工作流通道同步器
 * 负责扫描工作流中的Save节点并与后端进行双向验证
 */
class WorkflowChannelSynchronizer {
    constructor() {
        this.isSyncing = false;
        this.lastSyncTime = 0;
        this.syncInterval = 60000; // 改为60秒同步间隔，减少频率
        this.syncTimer = null;
        this.pendingChannels = new Set();
        this.lastWorkflowHash = ""; // 工作流变化检测
        this.lastSuccessToast = 0; // 成功通知频率控制
        this.ERROR_THROTTLE_INTERVAL = 10000; // 错误日志节流间隔10秒
        this.lastErrorLog = 0;
        this.hasShownSyncSuccessToast = false; // 是否已显示同步成功Toast
    }

    /**
     * 扫描当前工作流中的所有文本缓存保存节点
     * @returns {Array} 发现的通道列表
     */
    scanWorkflowChannels() {
        try {
            const workflowNodes = app.graph._nodes || [];
            const saveNodes = workflowNodes.filter(node => node.comfyClass === "GlobalTextCacheSave");
            const channels = [];

            saveNodes.forEach(node => {
                const channelWidget = node.widgets?.find(w => w.name === "channel_name");
                if (channelWidget && channelWidget.value) {
                    const channelName = channelWidget.value.toString().trim();
                    if (channelName && channelName !== "default") {
                        channels.push({
                            node: node,
                            channelName: channelName,
                            nodeId: node.id,
                            nodeTitle: node.title || "GlobalTextCacheSave"
                        });
                    }
                }
            });

            logger.info(`[WorkflowSynchronizer] 🔍 工作流扫描结果: 发现${saveNodes.length}个Save节点, ${channels.length}个有名称通道`);
            return channels;
        } catch (error) {
            logger.error("[WorkflowSynchronizer] 工作流扫描失败:", error);
            return [];
        }
    }

    /**
     * 获取当前工作流数据（用于发送到后端）
     * @returns {Object} 工作流数据
     */
    getWorkflowData() {
        try {
            // 尝试获取当前工作流的JSON数据
            // ComfyUI的工作流数据存储在app.graph中
            const workflow = {
                nodes: []
            };

            // 构建节点数据
            const nodes = app.graph._nodes || [];
            nodes.forEach(node => {
                const nodeData = {
                    id: node.id,
                    class_type: node.comfyClass || node.type || node.constructor?.name,
                    title: node.title || node.comfyClass || "Unknown",
                    widgets_values: []
                };

                // 获取widget值
                if (node.widgets) {
                    node.widgets.forEach(widget => {
                        if (widget.name === "channel_name" && widget.value) {
                            nodeData.widgets_values.push(widget.value.toString().trim());
                        } else if (widget.name === "monitor_node_id" && widget.value) {
                            nodeData.widgets_values.push(widget.value.toString().trim());
                        } else if (widget.name === "monitor_widget_name" && widget.value) {
                            nodeData.widgets_values.push(widget.value.toString().trim());
                        } else {
                            // 为保持一致的数组长度，添加空字符串
                            nodeData.widgets_values.push("");
                        }
                    });
                }

                workflow.nodes.push(nodeData);
            });

            return workflow;
        } catch (error) {
            logger.error("[WorkflowSynchronizer] 获取工作流数据失败:", error);
            return { nodes: [] };
        }
    }

    /**
     * 计算工作流哈希（用于变化检测）
     * @returns {string} 工作流哈希
     */
    calculateWorkflowHash() {
        try {
            const nodes = app.graph._nodes || [];
            const saveNodes = nodes.filter(node => node.comfyClass === "GlobalTextCacheSave");
            const nodeInfo = saveNodes.map(node => ({
                id: node.id,
                channel: node.widgets?.find(w => w.name === "channel_name")?.value || ""
            }));
            return JSON.stringify(nodeInfo);
        } catch (error) {
            return "";
        }
    }

    /**
     * 节流错误日志输出
     * @param {string} message - 错误消息
     * @param {Error} error - 错误对象
     */
    throttledErrorLog(message, error) {
        const now = Date.now();
        if (now - this.lastErrorLog > this.ERROR_THROTTLE_INTERVAL) {
            logger.error(message, error);
            this.lastErrorLog = now;
        }
    }

    /**
     * 执行工作流通道同步
     * @param {boolean} force - 是否强制同步
     */
    async syncWorkflowChannels(force = false) {
        const now = Date.now();
        if (!force && this.isSyncing) {
            return; // 静默跳过，避免日志刷屏
        }

        // 智能同步：检查工作流是否发生变化
        const currentWorkflowHash = this.calculateWorkflowHash();
        if (!force && !this.isSyncing) {
            if (currentWorkflowHash === this.lastWorkflowHash && (now - this.lastSyncTime) < this.syncInterval) {
                return; // 工作流未变化且间隔未到，跳过同步
            }
        }

        this.isSyncing = true;
        this.lastSyncTime = now;
        this.lastWorkflowHash = currentWorkflowHash;

        try {
            logger.info("[WorkflowSynchronizer] 🚀 开始工作流通道同步...");

            // 获取工作流数据
            const workflowData = this.getWorkflowData();
            const localChannels = this.scanWorkflowChannels();
            const localChannelNames = localChannels.map(item => item.channelName);

            // 调用后端同步API
            const response = await api.fetchApi('/danbooru/text_cache/sync_workflow_channels', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    workflow: workflowData
                })
            });

            if (response.ok) {
                const result = await response.json();
                logger.info("[WorkflowSynchronizer] ✅ 后端同步成功:", result);

                // 验证同步结果
                this.validateSyncResult(result, localChannelNames);

                // 通知用户同步结果（成功Toast只显示一次）
                if (showToast && result.status === "success") {
                    const { successful_registrations, failed_registrations } = result.sync_result;
                    // 注释掉成功通道的toast提示
                    // if (failed_registrations === 0 && !this.hasShownSyncSuccessToast) {
                    //     showToast(`🎉 工作流同步成功！${successful_registrations}个通道已注册`, 'success', 3000);
                    //     this.hasShownSyncSuccessToast = true;
                    // } else 
                    if (failed_registrations > 0) {
                        showToast(`⚠️ 同步部分完成：${successful_registrations}个成功, ${failed_registrations}个失败`, 'warning', 4000);
                    }
                }

            }

        } catch (error) {
            this.throttledErrorLog("[WorkflowSynchronizer] ❌ 工作流通道同步异常:", error);
            if (showToast) {
                showToast(`❌ 工作流同步异常: ${error.message}`, 'error', 4000);
            }
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * 验证同步结果
     * @param {Object} syncResult - 同步结果
     * @param {Array} localChannels - 本地发现的通道
     */
    validateSyncResult(syncResult, localChannels) {
        try {
            logger.info("[WorkflowSynchronizer] 🔍 开始验证同步结果...");

            const { sync_result } = syncResult;
            const { unique_channels_found, successful_registrations, failed_channels, found_nodes } = sync_result;

            // 验证发现的通道数量
            if (unique_channels_found !== localChannels.length) {
                logger.warn(`[WorkflowSynchronizer] ⚠️ 通道数量不匹配: 本地发现${localChannels.length}个, 后端识别${unique_channels_found}个`);
            }

            // 验证失败的通道
            if (failed_channels.length > 0) {
                logger.error(`[WorkflowSynchronizer] ❌ 以下通道注册失败: ${failed_channels.join(", ")}`);

                // 为失败的通道重新启动监控
                localChannels.forEach(channelInfo => {
                    if (failed_channels.includes(channelInfo.channelName)) {
                        channelRegistrationMonitor.startNodeRegistration(channelInfo.node, channelInfo.channelName);
                        channelRegistrationMonitor.updateNodeStatus(channelInfo.nodeId, 'failed', 5);
                    }
                });
            }

            // 验证成功的通道
            const successfulChannels = localChannels.filter(channelInfo =>
                !failed_channels.includes(channelInfo.channelName)
            );

            successfulChannels.forEach(channelInfo => {
                channelRegistrationMonitor.updateNodeStatus(channelInfo.nodeId, 'success', 1);
            });

            logger.info(`[WorkflowSynchronizer] ✅ 同步验证完成: ${successful_registrations}个成功, ${failed_channels.length}个失败`);

        } catch (error) {
            logger.error("[WorkflowSynchronizer] 验证同步结果时出错:", error);
        }
    }

    /**
     * 启动自动同步
     */
    startAutoSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
        }

        logger.info("[WorkflowSynchronizer] 🔄 启动自动同步模式");

        // 立即执行一次同步
        this.syncWorkflowChannels(true);

        // 设置定时同步
        this.syncTimer = setInterval(() => {
            this.syncWorkflowChannels();
        }, 60000); // 改为每60秒同步一次，减少性能影响
    }

    /**
     * 停止自动同步
     */
    stopAutoSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
            logger.info("[WorkflowSynchronizer] ⏹️ 停止自动同步模式");
        }
    }

    /**
     * 手动触发同步
     */
    manualSync() {
        logger.info("[WorkflowSynchronizer] 🔄 手动触发工作流通道同步");
        this.syncWorkflowChannels(true);
    }

    /**
     * 获取同步统计信息
     */
    getSyncStats() {
        return {
            isSyncing: this.isSyncing,
            lastSyncTime: this.lastSyncTime,
            syncInterval: this.syncInterval,
            pendingChannels: Array.from(this.pendingChannels)
        };
    }
}

// 创建全局工作流同步器实例
const workflowChannelSynchronizer = new WorkflowChannelSynchronizer();

// 在ComfyUI启动时自动同步
setTimeout(() => {
    logger.info("[WorkflowSynchronizer] 🚀 ComfyUI启动完成，开始自动工作流通道同步");

    // 重置Toast标志，确保页面刷新后能再次显示
    channelRegistrationMonitor.hasShownSuccessToast = false;
    workflowChannelSynchronizer.hasShownSyncSuccessToast = false;

    workflowChannelSynchronizer.startAutoSync();
}, 3000); // 3秒延迟，确保页面完全加载

logger.info("[GlobalTextCacheSave] JavaScript扩展加载完成");
