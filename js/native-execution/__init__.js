/**
 * Optimized Execution System Module Initialization
 * Version: 2.0.0
 * Based on LG_GroupExecutor Pattern
 */

import { api } from "/scripts/api.js";
import { app } from "/scripts/app.js";
import { createLogger } from "../global/logger_client.js";

// 创建logger实例
const logger = createLogger('native_execution_init');

// ✅ 统一的节点名单制 - 替代原有的自动检测机制
// 无连接引脚名单：直接执行的全局影响节点（类似全局种子节点）
const GLOBAL_INFLUENCE_NODES = new Set([
    'easy globalSeed',      // Easy Use 全局种子节点
    'easy seed',            // Easy Use 普通种子节点
    // 可扩展其他全局影响节点
]);

// 有连接引脚名单：需要判断连接关系的预览/显示节点
const PREVIEW_DISPLAY_NODES = new Set([
    'PreviewImage',         // ComfyUI 内核预览图节点
    'SaveImage',           // ComfyUI 内核保存图节点
    'ShowText',            // ComfyUI-Custom-Scripts 显示文本节点
    'PreviewAny',          // ComfyUI 内核显示任意节点
    'SimpleImageCompare',  // 本项目图像对比节点
    'ImageCompare',        // rgthree 图像对比节点
    'Show Any',            // Easy Use 的 show any 节点
    // 可扩展其他预览显示节点
]);

// 调试输出：显示加载的节点名单
logger.info('[OptimizedExecutionSystem] ✅ 统一节点名单制已加载');
logger.info('[OptimizedExecutionSystem] 🌍 全局影响节点名单:', Array.from(GLOBAL_INFLUENCE_NODES).join(', '));
logger.info('[OptimizedExecutionSystem] 📺 预览显示节点名单:', Array.from(PREVIEW_DISPLAY_NODES).join(', '));

// ui-enhancement.js 已删除，不再需要
// migration-helper.js 已删除，不再需要

if (!window.optimizedExecutionSystemLoaded) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeOptimizedExecutionSystem);
    } else {
        initializeOptimizedExecutionSystem();
    }

    function initializeOptimizedExecutionSystem() {
        logger.info('[OptimizedExecutionSystem] Starting initialization');
        logger.info('[OptimizedExecutionSystem] Version: 2.0.0');
        logger.info('[OptimizedExecutionSystem] Based on LG_GroupExecutor pattern');

        // CRITICAL FIX: Install Hook immediately (no setTimeout delay)
        // This ensures the hook is ready before any queue submissions
        try {
            if (api && !api._originalQueuePrompt) {
                logger.info('[OptimizedExecutionSystem] Installing api.queuePrompt hook...');

                api._originalQueuePrompt = api.queuePrompt;
                window._queueNodeIds = null;

                api.queuePrompt = async function (index, prompt) {
                    logger.info('[OptimizedExecutionSystem] api.queuePrompt called');

                    // CRITICAL FIX: When workflow contains GroupExecutorTrigger and this is a native queue (not group execution)
                    // Only submit Manager and Trigger nodes, block all other nodes
                    if (!window._queueNodeIds && prompt.output) {
                        // Find GroupExecutorTrigger node
                        const triggerNodeEntry = Object.entries(prompt.output).find(([id, node]) => {
                            return node.class_type === 'GroupExecutorTrigger';
                        });

                        if (triggerNodeEntry) {
                            const [triggerNodeId, triggerNode] = triggerNodeEntry;
                            logger.info('[OptimizedExecutionSystem] 🎯 Detected GroupExecutorTrigger in workflow');

                            // ✅ 获取 Manager 节点ID（只声明一次）
                            const managerNodeId = triggerNode.inputs?.execution_data?.[0];

                            // ✅ 新增：检查 Trigger 和 Manager 节点的 mode 状态
                            // 查找实际的节点对象（从 app.graph）
                            const triggerGraphNode = app.graph._nodes.find(n => String(n.id) === String(triggerNodeId));

                            if (triggerGraphNode) {
                                // 检查 Trigger 节点是否被静音或bypass
                                // mode === 2: NEVER (静音/mute)
                                // mode === 4: Bypass
                                if (triggerGraphNode.mode === 2 || triggerGraphNode.mode === 4) {
                                    const modeText = triggerGraphNode.mode === 2 ? '静音(Mute)' : 'Bypass';
                                    logger.info(`[OptimizedExecutionSystem] 🚫 GroupExecutorTrigger 节点已被${modeText}，跳过组执行`);
                                    logger.info('[OptimizedExecutionSystem] ✅ 将正常提交所有节点');
                                    // 不进行过滤，让ComfyUI正常处理
                                    return api._originalQueuePrompt.apply(this, [index, prompt]);
                                }

                                // 查找 Manager 节点（Trigger的输入依赖）
                                if (managerNodeId) {
                                    const managerGraphNode = app.graph._nodes.find(n => String(n.id) === String(managerNodeId));
                                    if (managerGraphNode && (managerGraphNode.mode === 2 || managerGraphNode.mode === 4)) {
                                        const modeText = managerGraphNode.mode === 2 ? '静音(Mute)' : 'Bypass';
                                        logger.info(`[OptimizedExecutionSystem] 🚫 GroupExecutorManager 节点已被${modeText}，跳过组执行`);
                                        logger.info('[OptimizedExecutionSystem] ✅ 将正常提交所有节点');
                                        // 不进行过滤，让ComfyUI正常处理
                                        return api._originalQueuePrompt.apply(this, [index, prompt]);
                                    }
                                }
                            }

                            // ✅ 新增：检查Manager节点的groups配置是否为空
                            // 如果为空，跳过过滤，让所有节点正常执行
                            if (managerNodeId) {
                                const managerGraphNode = app.graph._nodes.find(n => String(n.id) === String(managerNodeId));
                                if (managerGraphNode && managerGraphNode.properties && managerGraphNode.properties.groups) {
                                    const groups = managerGraphNode.properties.groups;

                                    // 情况1: groups数组为空
                                    if (Array.isArray(groups) && groups.length === 0) {
                                        logger.info('[OptimizedExecutionSystem] 🚫 GroupExecutorManager 配置为空（0个组），跳过组执行');
                                        logger.info('[OptimizedExecutionSystem] ✅ 将正常提交所有节点');
                                        // 不进行过滤，让ComfyUI正常处理
                                        return api._originalQueuePrompt.apply(this, [index, prompt]);
                                    }

                                    // 情况2: 检查配置的组是否都被静音或不存在
                                    const allGroupsMutedOrInvalid = groups.every(g => {
                                        const groupName = g.group_name;
                                        if (!groupName) return true; // 未选择组名，视为无效

                                        // 在工作流中查找对应的组
                                        const workflowGroup = app.graph._groups.find(wg => wg.title === groupName);
                                        if (!workflowGroup) return true; // 组不存在，视为无效

                                        // 检查组内的节点是否都被静音
                                        const nodesInGroup = app.graph._nodes.filter(node => isNodeInGroup(node, workflowGroup));
                                        if (nodesInGroup.length === 0) return true; // 组内无节点，视为无效

                                        // 检查所有节点是否都被静音 (mode === 2 表示mute)
                                        return nodesInGroup.every(node => node.mode === 2);
                                    });

                                    if (allGroupsMutedOrInvalid) {
                                        logger.info('[OptimizedExecutionSystem] 🚫 所有配置的组都被静音或无效，跳过组执行');
                                        logger.info('[OptimizedExecutionSystem] ✅ 将正常提交所有节点');
                                        // 不进行过滤，让ComfyUI正常处理
                                        return api._originalQueuePrompt.apply(this, [index, prompt]);
                                    }
                                }
                            }

                            // ✅ 只提交 Manager + Trigger 节点
                            // 所有组（包括未配置组）的执行将由前端执行引擎完全控制
                            logger.info('[OptimizedExecutionSystem] 🎯 Filtering to Manager + Trigger only');

                            const oldOutput = prompt.output;
                            let newOutput = {};

                            // Recursively add Trigger node and its dependencies (which includes Manager)
                            // 不包含下游OUTPUT_NODE（避免在初始提交时包含所有组的OUTPUT_NODE）
                            recursiveAddNodes(String(triggerNodeId), oldOutput, newOutput, false);

                            prompt.output = newOutput;
                            logger.info('[OptimizedExecutionSystem] Original nodes:', Object.keys(oldOutput).length);
                            logger.info('[OptimizedExecutionSystem] Filtered to Manager + Trigger:', Object.keys(newOutput).length);
                            logger.info('[OptimizedExecutionSystem] Node IDs:', Object.keys(newOutput).join(', '));
                            logger.info('[OptimizedExecutionSystem] ✅ All groups (including unconfigured) will be controlled by frontend engine');
                        }
                    }

                    // Filter prompt if _queueNodeIds is set (group execution in progress)
                    if (window._queueNodeIds && window._queueNodeIds.length && prompt.output) {
                        logger.info('[OptimizedExecutionSystem] Filtering to nodes:', window._queueNodeIds);

                        const oldOutput = prompt.output;
                        let newOutput = {};

                        // ✅ 统一使用顶部的全局影响节点名单
                        // 这些节点虽然不在组内，但会影响组内节点的执行（通过 ComfyUI 的 on_prompt_handler）

                        for (const [nodeId, node] of Object.entries(oldOutput)) {
                            if (GLOBAL_INFLUENCE_NODES.has(node.class_type)) {
                                newOutput[nodeId] = node;
                                logger.info('[OptimizedExecutionSystem] 🌍 保留全局影响节点:', nodeId, node.class_type);
                            }
                        }

                        // Recursively add specified nodes and dependencies
                        // 包含下游OUTPUT_NODE（收集上游节点的预览节点）
                        for (const queueNodeId of window._queueNodeIds) {
                            recursiveAddNodes(String(queueNodeId), oldOutput, newOutput, true);
                        }

                        prompt.output = newOutput;
                        logger.info('[OptimizedExecutionSystem] Original nodes:', Object.keys(oldOutput).length);
                        logger.info('[OptimizedExecutionSystem] Filtered nodes:', Object.keys(newOutput).length);
                        logger.info('[OptimizedExecutionSystem] Final node IDs:', Object.keys(newOutput).join(', '));
                    }

                    // Call original method
                    const response = api._originalQueuePrompt.apply(this, [index, prompt]);

                    // Reset queue node IDs
                    window._queueNodeIds = null;
                    logger.info('[OptimizedExecutionSystem] api.queuePrompt completed, reset _queueNodeIds');

                    return response;
                };
                logger.info('[OptimizedExecutionSystem] api.queuePrompt hook installed successfully');
            }
        } catch (error) {
            logger.warn('[OptimizedExecutionSystem] Hook installation failed:', error);
            logger.error(error.stack);
        }

        // Mark as loaded and dispatch event
        window.optimizedExecutionSystemLoaded = true;

        logger.info('[OptimizedExecutionSystem] Initialization complete');
        logger.info('[OptimizedExecutionSystem] Components loaded:');
        logger.info('[OptimizedExecutionSystem]   - OptimizedExecutionEngine');
        logger.info('[OptimizedExecutionSystem]   - CacheControlEvents');

        const initEvent = new CustomEvent('optimizedExecutionSystemReady', {
            detail: {
                version: '2.0.0',
                timestamp: Date.now(),
                components: ['OptimizedExecutionEngine', 'CacheControlEvents']
            }
        });
        document.dispatchEvent(initEvent);
    }
}

// Helper function: check if node is an output node (has OUTPUT_NODE = True)
function isOutputNode(nodeId) {
    if (app?.graph?._nodes) {
        const graphNode = app.graph._nodes.find(n => String(n.id) === String(nodeId));
        if (graphNode) {
            return graphNode.constructor?.nodeData?.output_node === true;
        }
    }
    return false;
}

// Helper function: get group name that contains the node
function getNodeGroupName(nodeId) {
    if (!app?.graph?._nodes || !app?.graph?._groups) {
        return null;
    }

    const graphNode = app.graph._nodes.find(n => String(n.id) === String(nodeId));
    if (!graphNode) {
        return null;
    }

    // 检查节点在哪个组内
    for (const group of app.graph._groups) {
        if (group && group._bounding && group.title) {
            try {
                const nodeBounds = graphNode.getBounding();
                // 使用LiteGraph的碰撞检测
                let isInGroup = false;
                if (window.LiteGraph && window.LiteGraph.overlapBounding) {
                    isInGroup = window.LiteGraph.overlapBounding(group._bounding, nodeBounds);
                } else {
                    // 降级方案：简单的边界框检测
                    isInGroup = (
                        nodeBounds[0] < group._bounding[2] &&
                        nodeBounds[2] > group._bounding[0] &&
                        nodeBounds[1] < group._bounding[3] &&
                        nodeBounds[3] > group._bounding[1]
                    );
                }

                if (isInGroup) {
                    return group.title;
                }
            } catch (e) {
                // 忽略碰撞检测错误，继续检查下一个组
                continue;
            }
        }
    }

    return null; // 不在任何组内
}

// Helper function: get managed group names from GroupExecutorManager
function getManagedGroupNames() {
    if (!app?.graph?._nodes) {
        return [];
    }

    // 查找 GroupExecutorManager 节点
    const managerNode = app.graph._nodes.find(n => n.type === 'GroupExecutorManager');
    if (!managerNode || !managerNode.properties || !managerNode.properties.groups) {
        return [];
    }

    // 提取被管理的组名列表
    const groups = managerNode.properties.groups;
    if (!Array.isArray(groups)) {
        return [];
    }

    return groups
        .filter(g => g && g.group_name)
        .map(g => g.group_name);
}

// Helper function: get group object by group name
function getGroupByName(groupName) {
    if (!app?.graph?._groups || !groupName) {
        return null;
    }
    return app.graph._groups.find(g => g.title === groupName);
}

// Helper function: get current executing group name
function getCurrentExecutingGroup() {
    // 从全局变量获取当前执行的组名
    // 这个变量在 execution-engine.js 的 executeGroup 中设置
    return window._currentExecutingGroup || null;
}

// Helper function: check if node is in other managed groups (not current executing group)
function isNodeInOtherManagedGroup(nodeId) {
    // 获取被管理的组名列表
    const managedGroups = getManagedGroupNames();
    if (managedGroups.length === 0) {
        return false; // 没有被管理的组，不排除
    }

    // 获取节点对象
    const graphNode = app.graph._nodes.find(n => String(n.id) === String(nodeId));
    if (!graphNode) {
        return false;
    }

    // 获取节点边界
    let nodeBounds;
    try {
        nodeBounds = graphNode.getBounding();
    } catch (e) {
        logger.warn(`[OptimizedExecutionSystem] ⚠️ 无法获取节点 ${nodeId} 的边界: ${e.message}`);
        return false;
    }

    // 获取当前执行的组
    const currentGroup = getCurrentExecutingGroup();

    // 遍历所有被管理的组，检查节点是否与它们重叠
    for (const managedGroupName of managedGroups) {
        // 跳过当前执行的组
        if (currentGroup && managedGroupName === currentGroup) {
            continue;
        }

        const managedGroup = getGroupByName(managedGroupName);
        if (managedGroup && managedGroup._bounding) {
            // 检查节点边界是否与被管理的组边界重叠
            let hasOverlap = false;
            if (window.LiteGraph && window.LiteGraph.overlapBounding) {
                hasOverlap = window.LiteGraph.overlapBounding(managedGroup._bounding, nodeBounds);
            } else {
                // 降级方案：简单的边界框碰撞检测
                hasOverlap = (
                    nodeBounds[0] < managedGroup._bounding[2] &&
                    nodeBounds[2] > managedGroup._bounding[0] &&
                    nodeBounds[1] < managedGroup._bounding[3] &&
                    nodeBounds[3] > managedGroup._bounding[1]
                );
            }

            if (hasOverlap) {
                logger.info(`[OptimizedExecutionSystem] 🚫 排除节点 ${nodeId}：与被管理的组 "${managedGroupName}" 有重叠（当前执行组："${currentGroup || '无'}"）`);
                return true; // 发现重叠，排除该节点
            }
        }
    }

    // 没有与任何非当前执行的被管理组重叠，允许添加
    logger.info(`[OptimizedExecutionSystem] ✅ 节点 ${nodeId} 没有与被管理组重叠，允许添加`);
    return false;
}

// Helper function: recursively add nodes and dependencies
function recursiveAddNodes(nodeId, oldOutput, newOutput, includeDownstreamOutputNodes = false) {
    if (newOutput[nodeId] != null) {
        return;
    }

    const currentNode = oldOutput[nodeId];
    if (!currentNode) {
        return;
    }

    newOutput[nodeId] = currentNode;

    // Recursively add dependent nodes (upstream dependencies)
    Object.values(currentNode.inputs || {}).forEach(inputValue => {
        if (Array.isArray(inputValue)) {
            recursiveAddNodes(String(inputValue[0]), oldOutput, newOutput, includeDownstreamOutputNodes);
        }
    });

    // ✅ 只在组执行期间才收集下游OUTPUT_NODE
    // 初始提交（Manager+Trigger）时不收集，避免包含所有组的OUTPUT_NODE
    if (!includeDownstreamOutputNodes) {
        return;
    }

    // ✅ 统一名单制：收集连接到当前节点的预览/显示节点（下游节点）
    // 基于硬编码名单进行精确控制，提高可靠性
    Object.entries(oldOutput).forEach(([downstreamNodeId, downstreamNode]) => {
        // 跳过已经添加的节点
        if (newOutput[downstreamNodeId] != null) {
            return;
        }

        // 检查该节点的输入是否引用了当前节点
        const hasConnectionToCurrentNode = Object.values(downstreamNode.inputs || {}).some(inputValue => {
            return Array.isArray(inputValue) && String(inputValue[0]) === String(nodeId);
        });

        // 如果连接到当前节点，使用统一名单制判断是否应该添加
        if (hasConnectionToCurrentNode) {
            // 检查是否是传统的OUTPUT_NODE（向后兼容）
            if (isOutputNode(downstreamNodeId)) {
                newOutput[downstreamNodeId] = downstreamNode;
                logger.info(`[OptimizedExecutionSystem] 📎 添加传统输出节点: ${downstreamNodeId} (${downstreamNode.class_type}) 连接到节点 ${nodeId}`);
            }
            // 检查是否在预览/显示名单中，且符合连接关系条件
            else if (shouldIncludePreviewDisplayNode(downstreamNodeId, downstreamNode.class_type, oldOutput)) {
                newOutput[downstreamNodeId] = downstreamNode;
                logger.info(`[OptimizedExecutionSystem] 📎 添加名单制节点: ${downstreamNodeId} (${downstreamNode.class_type}) 连接到节点 ${nodeId}`);
            }
        }
    });
}

// Helper function: check if node is in group
function isNodeInGroup(node, group) {
    /** 检查节点是否在组内 - 使用LiteGraph碰撞检测 */
    if (!node || !node.pos || !group || !group._bounding) {
        return false;
    }

    try {
        const nodeBounds = node.getBounding();
        // 使用LiteGraph提供的碰撞检测（从window获取）
        if (window.LiteGraph && window.LiteGraph.overlapBounding) {
            return window.LiteGraph.overlapBounding(group._bounding, nodeBounds);
        }

        // 降级方案：简单的边界框检测
        return (
            nodeBounds[0] < group._bounding[2] &&
            nodeBounds[2] > group._bounding[0] &&
            nodeBounds[1] < group._bounding[3] &&
            nodeBounds[3] > group._bounding[1]
        );
    } catch (e) {
        logger.warn(`[OptimizedExecutionSystem] ⚠️ 碰撞检测异常: ${e.message}`);
        return false;
    }
}

// Helper function: check if preview/display node should be included based on名单制
function shouldIncludePreviewDisplayNode(nodeId, nodeClassType, oldOutput) {
    /** 检查预览/显示节点是否应该被包含 - 基于统一名单制 */

    try {
        // 参数验证
        if (!nodeId || !nodeClassType || !oldOutput) {
            logger.warn(`[OptimizedExecutionSystem] ⚠️ shouldIncludePreviewDisplayNode 参数无效: nodeId=${nodeId}, classType=${nodeClassType}`);
            return false;
        }

        // 如果节点不在预览/显示名单中，不包含
        if (!PREVIEW_DISPLAY_NODES.has(nodeClassType)) {
            return false;
        }

        // 检查该节点是否连接到当前执行组的节点
        const currentGroup = getCurrentExecutingGroup();
        if (!currentGroup) {
            // 如果没有当前执行组，使用原有的逻辑（避免意外影响）
            logger.debug(`[OptimizedExecutionSystem] 🔍 无当前执行组，包含预览节点 ${nodeId}(${nodeClassType})`);
            return true;
        }

        // 检查该节点的输入是否连接到当前执行组的节点
        const currentNode = oldOutput[nodeId];
        if (!currentNode || !currentNode.inputs) {
            logger.debug(`[OptimizedExecutionSystem] 🔍 预览节点 ${nodeId}(${nodeClassType}) 无输入或输入无效`);
            return false;
        }

        // 遍历该节点的所有输入，检查是否有来自当前执行组的连接
        for (const [inputName, inputValue] of Object.entries(currentNode.inputs)) {
            if (Array.isArray(inputValue) && inputValue.length >= 2) {
                const sourceNodeId = String(inputValue[0]);
                const sourceNodeGroupName = getNodeGroupName(sourceNodeId);

                // 如果输入源节点在当前执行组中，则包含此预览节点
                if (sourceNodeGroupName === currentGroup) {
                    logger.info(`[OptimizedExecutionSystem] 🎯 预览节点 ${nodeId}(${nodeClassType}) 连接到当前组 "${currentGroup}" 的节点 ${sourceNodeId}`);
                    return true;
                }
            }
        }

        // 如果没有连接到当前执行组，不包含此预览节点
        logger.info(`[OptimizedExecutionSystem] 🚫 预览节点 ${nodeId}(${nodeClassType}) 未连接到当前组 "${currentGroup}"，跳过`);
        return false;
    } catch (error) {
        logger.error(`[OptimizedExecutionSystem] ❌ shouldIncludePreviewDisplayNode 异常:`, error);
        // 出错时默认不包含，避免意外的节点执行
        return false;
    }
}

export const OPTIMIZED_EXECUTION_CONFIG = {
    version: '2.0.0',
    debugMode: true,
    defaultTimeout: 300000,
    maxRetries: 3
};

logger.info('[OptimizedExecutionSystem] Module loaded');

