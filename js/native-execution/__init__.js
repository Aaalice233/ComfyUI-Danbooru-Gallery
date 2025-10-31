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

                            // ✅ 只提交 Manager + Trigger 节点
                            // 所有组（包括未配置组）的执行将由前端执行引擎完全控制
                            console.log('[OptimizedExecutionSystem] 🎯 Filtering to Manager + Trigger only');

                            const oldOutput = prompt.output;
                            let newOutput = {};

                            // Recursively add Trigger node and its dependencies (which includes Manager)
                            // 不包含下游OUTPUT_NODE（避免在初始提交时包含所有组的OUTPUT_NODE）
                            recursiveAddNodes(String(triggerNodeId), oldOutput, newOutput, false);

                            prompt.output = newOutput;
                            console.log('[OptimizedExecutionSystem] Original nodes:', Object.keys(oldOutput).length);
                            console.log('[OptimizedExecutionSystem] Filtered to Manager + Trigger:', Object.keys(newOutput).length);
                            console.log('[OptimizedExecutionSystem] Node IDs:', Object.keys(newOutput).join(', '));
                            console.log('[OptimizedExecutionSystem] ✅ All groups (including unconfigured) will be controlled by frontend engine');
                        }
                    }

                    // Filter prompt if _queueNodeIds is set (group execution in progress)
                    if (window._queueNodeIds && window._queueNodeIds.length && prompt.output) {
                        console.log('[OptimizedExecutionSystem] Filtering to nodes:', window._queueNodeIds);

                        const oldOutput = prompt.output;
                        let newOutput = {};

                        // Recursively add specified nodes and dependencies
                        // 包含下游OUTPUT_NODE（收集上游节点的预览节点）
                        for (const queueNodeId of window._queueNodeIds) {
                            recursiveAddNodes(String(queueNodeId), oldOutput, newOutput, true);
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
        console.warn(`[OptimizedExecutionSystem] ⚠️ 无法获取节点 ${nodeId} 的边界: ${e.message}`);
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
                console.log(`[OptimizedExecutionSystem] 🚫 排除节点 ${nodeId}：与被管理的组 "${managedGroupName}" 有重叠（当前执行组："${currentGroup || '无'}"）`);
                return true; // 发现重叠，排除该节点
            }
        }
    }

    // 没有与任何非当前执行的被管理组重叠，允许添加
    console.log(`[OptimizedExecutionSystem] ✅ 节点 ${nodeId} 没有与被管理组重叠，允许添加`);
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

    // ✅ 收集直接连接到当前节点的输出/预览节点（下游节点）
    // 这确保了像 PreviewImage、ShowText、SaveImage 等输出节点也会被包含
    // 但排除在"其他被管理的组"内的输出节点
    Object.entries(oldOutput).forEach(([downstreamNodeId, downstreamNode]) => {
        // 跳过已经添加的节点
        if (newOutput[downstreamNodeId] != null) {
            return;
        }

        // 检查该节点的输入是否引用了当前节点
        const hasConnectionToCurrentNode = Object.values(downstreamNode.inputs || {}).some(inputValue => {
            return Array.isArray(inputValue) && String(inputValue[0]) === String(nodeId);
        });

        // 如果连接到当前节点，且是输出节点，且不在其他被管理的组内，则添加
        if (hasConnectionToCurrentNode && isOutputNode(downstreamNodeId) && !isNodeInOtherManagedGroup(downstreamNodeId)) {
            newOutput[downstreamNodeId] = downstreamNode;
            console.log(`[OptimizedExecutionSystem] 📎 添加输出节点: ${downstreamNodeId} (${downstreamNode.class_type}) 连接到节点 ${nodeId}`);
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

