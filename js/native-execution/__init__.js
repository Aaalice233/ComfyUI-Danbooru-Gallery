/**
 * Optimized Execution System Module Initialization
 * Version: 2.0.0
 * Based on LG_GroupExecutor Pattern
 */

import { api } from "/scripts/api.js";
import { app } from "/scripts/app.js";

// ui-enhancement.js 已删除，不再需要
// migration-helper.js 已删除，不再需要

if (!window.optimizedExecutionSystemLoaded) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeOptimizedExecutionSystem);
    } else {
        initializeOptimizedExecutionSystem();
    }

    function initializeOptimizedExecutionSystem() {
        console.log('[OptimizedExecutionSystem] Starting initialization');
        console.log('[OptimizedExecutionSystem] Version: 2.0.0');
        console.log('[OptimizedExecutionSystem] Based on LG_GroupExecutor pattern');

        // CRITICAL FIX: Install Hook immediately (no setTimeout delay)
        // This ensures the hook is ready before any queue submissions
        try {
            if (api && !api._originalQueuePrompt) {
                console.log('[OptimizedExecutionSystem] Installing api.queuePrompt hook...');

                api._originalQueuePrompt = api.queuePrompt;
                window._queueNodeIds = null;

                api.queuePrompt = async function (index, prompt) {
                    console.log('[OptimizedExecutionSystem] api.queuePrompt called');

                    // CRITICAL FIX: When workflow contains GroupExecutorTrigger and this is a native queue (not group execution)
                    // Only submit Manager and Trigger nodes, block all other nodes
                    if (!window._queueNodeIds && prompt.output) {
                        // Find GroupExecutorTrigger node
                        const triggerNodeEntry = Object.entries(prompt.output).find(([id, node]) => {
                            return node.class_type === 'GroupExecutorTrigger';
                        });

                        if (triggerNodeEntry) {
                            const [triggerNodeId, triggerNode] = triggerNodeEntry;
                            console.log('[OptimizedExecutionSystem] 🎯 Detected GroupExecutorTrigger in workflow');

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
                                    console.log(`[OptimizedExecutionSystem] 🚫 GroupExecutorTrigger 节点已被${modeText}，跳过组执行`);
                                    console.log('[OptimizedExecutionSystem] ✅ 将正常提交所有节点');
                                    // 不进行过滤，让ComfyUI正常处理
                                    return api._originalQueuePrompt.apply(this, [index, prompt]);
                                }

                                // 查找 Manager 节点（Trigger的输入依赖）
                                if (managerNodeId) {
                                    const managerGraphNode = app.graph._nodes.find(n => String(n.id) === String(managerNodeId));
                                    if (managerGraphNode && (managerGraphNode.mode === 2 || managerGraphNode.mode === 4)) {
                                        const modeText = managerGraphNode.mode === 2 ? '静音(Mute)' : 'Bypass';
                                        console.log(`[OptimizedExecutionSystem] 🚫 GroupExecutorManager 节点已被${modeText}，跳过组执行`);
                                        console.log('[OptimizedExecutionSystem] ✅ 将正常提交所有节点');
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
                                        console.log('[OptimizedExecutionSystem] 🚫 GroupExecutorManager 配置为空（0个组），跳过组执行');
                                        console.log('[OptimizedExecutionSystem] ✅ 将正常提交所有节点');
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
                                        console.log('[OptimizedExecutionSystem] 🚫 所有配置的组都被静音或无效，跳过组执行');
                                        console.log('[OptimizedExecutionSystem] ✅ 将正常提交所有节点');
                                        // 不进行过滤，让ComfyUI正常处理
                                        return api._originalQueuePrompt.apply(this, [index, prompt]);
                                    }
                                }
                            }

                            // ✅ 新增：找出未配置组的节点
                            const unconfiguredNodeIds = findUnconfiguredGroupNodes(managerNodeId);

                            if (unconfiguredNodeIds.length > 0) {
                                console.log(`[OptimizedExecutionSystem] 📋 检测到 ${unconfiguredNodeIds.length} 个未配置组的节点`);
                                console.log('[OptimizedExecutionSystem] ✅ 这些节点将与Manager+Trigger一起提交，保持依赖关系');
                            }

                            console.log('[OptimizedExecutionSystem] 🎯 Filtering to Manager + Trigger + Unconfigured Groups');

                            const oldOutput = prompt.output;
                            let newOutput = {};

                            // Recursively add Trigger node and its dependencies (which includes Manager)
                            recursiveAddNodes(String(triggerNodeId), oldOutput, newOutput);

                            // ✅ 新增：添加未配置组的节点
                            for (const nodeId of unconfiguredNodeIds) {
                                recursiveAddNodes(String(nodeId), oldOutput, newOutput);
                            }

                            prompt.output = newOutput;
                            console.log('[OptimizedExecutionSystem] Original nodes:', Object.keys(oldOutput).length);
                            console.log('[OptimizedExecutionSystem] Filtered to Manager + Trigger:', Object.keys(newOutput).length);
                            console.log('[OptimizedExecutionSystem] Node IDs:', Object.keys(newOutput).join(', '));
                            console.log('[OptimizedExecutionSystem] ✅ Group execution will be controlled by frontend engine');
                        }
                    }

                    // Filter prompt if _queueNodeIds is set (group execution in progress)
                    if (window._queueNodeIds && window._queueNodeIds.length && prompt.output) {
                        console.log('[OptimizedExecutionSystem] Filtering to nodes:', window._queueNodeIds);

                        const oldOutput = prompt.output;
                        let newOutput = {};

                        // Recursively add specified nodes and dependencies
                        for (const queueNodeId of window._queueNodeIds) {
                            recursiveAddNodes(String(queueNodeId), oldOutput, newOutput);
                        }

                        prompt.output = newOutput;
                        console.log('[OptimizedExecutionSystem] Original nodes:', Object.keys(oldOutput).length);
                        console.log('[OptimizedExecutionSystem] Filtered nodes:', Object.keys(newOutput).length);
                        console.log('[OptimizedExecutionSystem] Final node IDs:', Object.keys(newOutput).join(', '));
                    }

                    // Call original method
                    const response = api._originalQueuePrompt.apply(this, [index, prompt]);

                    // Reset queue node IDs
                    window._queueNodeIds = null;
                    console.log('[OptimizedExecutionSystem] api.queuePrompt completed, reset _queueNodeIds');

                    return response;
                };
                console.log('[OptimizedExecutionSystem] api.queuePrompt hook installed successfully');
            }
        } catch (error) {
            console.warn('[OptimizedExecutionSystem] Hook installation failed:', error);
            console.error(error.stack);
        }

        // Mark as loaded and dispatch event
        window.optimizedExecutionSystemLoaded = true;

        console.log('[OptimizedExecutionSystem] Initialization complete');
        console.log('[OptimizedExecutionSystem] Components loaded:');
        console.log('[OptimizedExecutionSystem]   - OptimizedExecutionEngine');
        console.log('[OptimizedExecutionSystem]   - CacheControlEvents');

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

// Helper function: recursively add nodes and dependencies
function recursiveAddNodes(nodeId, oldOutput, newOutput) {
    if (newOutput[nodeId] != null) {
        return;
    }

    const currentNode = oldOutput[nodeId];
    if (!currentNode) {
        return;
    }

    newOutput[nodeId] = currentNode;

    // Recursively add dependent nodes
    Object.values(currentNode.inputs || {}).forEach(inputValue => {
        if (Array.isArray(inputValue)) {
            recursiveAddNodes(String(inputValue[0]), oldOutput, newOutput);
        }
    });
}

// Helper function: find nodes in unconfigured groups
function findUnconfiguredGroupNodes(managerNodeId) {
    /** 找出未配置组的所有节点 */
    if (!app.graph || !app.graph._nodes || !app.graph._groups) {
        console.warn('[OptimizedExecutionSystem] ⚠️ 无法访问图数据');
        return [];
    }

    // 1. 获取所有组
    const allGroups = app.graph._groups || [];
    if (allGroups.length === 0) {
        return [];
    }

    // 2. 获取Manager节点配置的组名
    const managerNode = app.graph._nodes.find(n => String(n.id) === String(managerNodeId));
    if (!managerNode || !managerNode.properties || !managerNode.properties.groups) {
        // Manager没有配置或没有groups属性，所有组都是未配置的
        console.log('[OptimizedExecutionSystem] 📋 Manager没有配置，所有组都视为未配置');
        return getAllGroupNodeIds(allGroups);
    }

    const configuredGroupNames = managerNode.properties.groups.map(g => g.group_name);
    console.log('[OptimizedExecutionSystem] 📋 已配置的组:', configuredGroupNames.join(', '));

    // 3. 找出未配置的组
    const unconfiguredGroups = allGroups.filter(g => !configuredGroupNames.includes(g.title));
    if (unconfiguredGroups.length === 0) {
        console.log('[OptimizedExecutionSystem] ✅ 所有组都已配置');
        return [];
    }

    console.log('[OptimizedExecutionSystem] 📋 未配置的组:', unconfiguredGroups.map(g => g.title).join(', '));

    // 4. 找出这些组内的所有节点
    const unconfiguredNodeIds = [];
    for (const group of unconfiguredGroups) {
        const nodesInGroup = app.graph._nodes.filter(node => {
            return isNodeInGroup(node, group);
        });

        const nodeIds = nodesInGroup.map(n => String(n.id));
        unconfiguredNodeIds.push(...nodeIds);

        console.log(`[OptimizedExecutionSystem] 📍 组"${group.title}"包含 ${nodeIds.length} 个节点`);
    }

    return unconfiguredNodeIds;
}

// Helper function: get all node IDs from all groups
function getAllGroupNodeIds(groups) {
    /** 获取所有组的所有节点ID */
    const allNodeIds = [];
    for (const group of groups) {
        const nodesInGroup = app.graph._nodes.filter(node => {
            return isNodeInGroup(node, group);
        });
        allNodeIds.push(...nodesInGroup.map(n => String(n.id)));
    }
    return allNodeIds;
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
        console.warn(`[OptimizedExecutionSystem] ⚠️ 碰撞检测异常: ${e.message}`);
        return false;
    }
}

export const OPTIMIZED_EXECUTION_CONFIG = {
    version: '2.0.0',
    debugMode: true,
    defaultTimeout: 300000,
    maxRetries: 3
};

console.log('[OptimizedExecutionSystem] Module loaded');

