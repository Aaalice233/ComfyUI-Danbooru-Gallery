/**
 * 组执行触发器 - Group Executor Trigger
 * 接收execution_list并触发前端异步组执行
 */

import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";
import { simplifiedQueueManager } from "./queue_manager.js";

// 组执行触发器
app.registerExtension({
    name: "GroupExecutorTrigger",

    async init(app) {
        console.log('[GET] 初始化组执行触发器');
    },

    async setup(app) {
        console.log('[GET] 设置事件监听器');

        // 监听执行指令 - 由触发器节点发送（使用独特的事件名避免与其他插件冲突）
        api.addEventListener("danbooru_gem_trigger_execute", async ({ detail }) => {
            console.log('[GET-JS] ========================================');
            console.log('[GET-JS] ========== 收到组执行指令 ==========');
            console.log('[GET-JS] ========================================');
            console.log('[GET-JS] 节点ID:', detail.node_id);
            console.log('[GET-JS] 执行列表项数:', detail.execution_list?.length || 0);
            console.log('[GET-JS] 时间戳:', new Date(detail.timestamp * 1000).toLocaleTimeString());

            const nodeId = String(detail.node_id);
            const node = app.graph._nodes_by_id[nodeId];

            if (!node) {
                console.error('[GET-JS] ✗ 未找到触发器节点:', nodeId);
                return;
            }

            // 防止重复执行
            if (node.properties && node.properties.isExecuting) {
                console.warn('[GET-JS] ⚠ 节点正在执行中，跳过重复执行');
                return;
            }

            // 初始化属性（如果不存在）
            if (!node.properties) {
                node.properties = {};
            }

            // 设置执行状态锁
            node.properties.isExecuting = true;
            console.log('[GET-JS] ✓ 执行状态锁已设置');

            try {
                // ⚠️ 关键设计：
                // 触发器节点在初始队列中执行完毕（发送WebSocket消息后立即返回）
                // 当我们收到这个消息时，初始队列已经完成了
                // 因此不需要等待队列清空，可以直接开始组执行
                console.log('[GET-JS] ===== 初始队列状态检查 =====');
                console.log('[GET-JS] 注意: 触发器节点已在初始队列执行完毕');
                console.log('[GET-JS] 注意: 初始队列已清空，直接开始组执行');
                console.log('[GET-JS] ===== 开始执行组列表 =====');

                await this.executeGroupList(detail.execution_list, node);

                console.log('[GET-JS] ========================================');
                console.log('[GET-JS] ========== 所有组执行完成 ==========');
                console.log('[GET-JS] ========================================');
            } catch (error) {
                console.error('[GET-JS] ========================================');
                console.error('[GET-JS] ========== 执行出错 ==========');
                console.error('[GET-JS] ========================================');
                console.error('[GET-JS] 错误类型:', error.name);
                console.error('[GET-JS] 错误消息:', error.message);
                console.error('[GET-JS] 错误堆栈:', error.stack);
            } finally {
                // 清除执行状态锁
                node.properties.isExecuting = false;
                console.log('[GET-JS] ✓ 执行状态锁已释放');
            }
        });
    },

    // 设置当前缓存组
    async setCurrentCacheGroup(groupName) {
        try {
            const response = await api.fetchApi("/danbooru_gallery/set_current_group", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ group_name: groupName }),
            });
            const result = await response.json();
            if (result.success) {
                if (groupName) {
                    console.log(`[GET-JS] ✓ 切换缓存通道: ${groupName}`);
                } else {
                    console.log(`[GET-JS] ✓ 清除缓存通道`);
                }
            } else {
                console.error(`[GET-JS] ✗ 设置缓存组失败:`, result.error);
            }
        } catch (error) {
            console.error("[GET-JS] ✗ 设置缓存组失败:", error);
        }
    },

    // 执行组列表
    async executeGroupList(executionList, node) {
        console.log('[GET-JS] ========================================');
        console.log('[GET-JS] ========== 开始执行组列表 ==========');
        console.log('[GET-JS] ========================================');
        console.log('[GET-JS] 总组数:', executionList.length);
        console.log('[GET-JS] 执行顺序:', executionList.map(item => item.group_name).join(' → '));

        const workflowStartTime = performance.now();

        for (let i = 0; i < executionList.length; i++) {
            const item = executionList[i];
            console.log(`[GET-JS] ========================================`);
            console.log(`[GET-JS] ========== 组 ${i + 1}/${executionList.length}: ${item.group_name} ==========`);
            console.log(`[GET-JS] ========================================`);
            console.log(`[GET-JS] 组名称: "${item.group_name}"`);
            console.log(`[GET-JS] 组延迟: ${item.delay_seconds}秒`);

            // 处理延迟
            if (item.group_name === '__delay__') {
                if (item.delay_seconds > 0) {
                    console.log(`[GET-JS] ⏱ 延迟 ${item.delay_seconds} 秒...`);
                    await new Promise(resolve => setTimeout(resolve, item.delay_seconds * 1000));
                    console.log(`[GET-JS] ✓ 延迟完成`);
                }
                continue;
            }

            // 记录组执行开始时间
            const groupStartTime = performance.now();
            console.log(`[GET-JS] 开始执行组 "${item.group_name}"...`);

            // 查找组内的输出节点
            console.log(`[GET-JS] 查找组 "${item.group_name}" 内的输出节点...`);
            const outputNodes = this.getGroupOutputNodes(item.group_name);
            if (!outputNodes || outputNodes.length === 0) {
                console.error(`[GET-JS] ✗ 组 "${item.group_name}" 中没有找到输出节点，跳过该组`);
                continue;
            }

            console.log(`[GET-JS] ✓ 找到 ${outputNodes.length} 个输出节点`);

            // 按照节点ID排序，确保执行顺序一致
            const sortedNodeIds = outputNodes
                .map(n => n.id)
                .sort((a, b) => {
                    const numA = parseInt(a);
                    const numB = parseInt(b);
                    if (!isNaN(numA) && !isNaN(numB)) {
                        return numA - numB;
                    }
                    return String(a).localeCompare(String(b));
                });

            console.log(`[GET-JS] 组 "${item.group_name}" 的输出节点ID列表: [${sortedNodeIds.join(', ')}]`);

            // 打印每个输出节点的详细信息
            console.log(`[GET-JS] 组 "${item.group_name}" 的输出节点详情:`);
            outputNodes.forEach((node, idx) => {
                console.log(`[GET-JS]   [${idx + 1}/${outputNodes.length}] ID=${node.id}, 类型="${node.type}", 标题="${node.title || '(无标题)'}"`);
            });

            // 执行节点并等待完成
            console.log(`[GET-JS] ===== 提交组 "${item.group_name}" 的节点到队列 =====`);
            await this.executeNodes(sortedNodeIds, item.group_name);

            // 等待当前组执行完成
            console.log(`[GET-JS] ===== 等待组 "${item.group_name}" 执行完成 =====`);
            await this.waitForExecutionComplete();

            // 计算组执行耗时
            const groupElapsedTime = ((performance.now() - groupStartTime) / 1000).toFixed(3);
            console.log(`[GET-JS] ========================================`);
            console.log(`[GET-JS] ✓ 组 "${item.group_name}" 执行完成`);
            console.log(`[GET-JS] 组执行耗时: ${groupElapsedTime}秒`);
            console.log(`[GET-JS] ========================================`);

            // 组间延迟
            if (item.delay_seconds > 0 && i < executionList.length - 1) {
                console.log(`[GET-JS] ⏱ 组间延迟 ${item.delay_seconds} 秒...`);
                await new Promise(resolve => setTimeout(resolve, item.delay_seconds * 1000));
                console.log(`[GET-JS] ✓ 组间延迟完成`);
            }
        }

        const workflowElapsedTime = ((performance.now() - workflowStartTime) / 1000).toFixed(3);
        console.log('[GET-JS] ========================================');
        console.log('[GET-JS] ========== 所有组执行完成 ==========');
        console.log('[GET-JS] ========================================');
        console.log(`[GET-JS] 工作流总耗时: ${workflowElapsedTime}秒`);
    },

    // 获取组内的输出节点
    getGroupOutputNodes(groupName) {
        if (!app.graph || !app.graph._groups) {
            console.log(`[GET-JS] 没有找到组或图数据，无法获取组 "${groupName}" 的输出节点`);
            return [];
        }

        const group = app.graph._groups.find(g => g.title === groupName);
        if (!group) {
            console.warn(`[GET-JS] 未找到组 "${groupName}"`);
            return [];
        }

        console.log(`[GET-JS] 正在查找组 "${groupName}" 的输出节点...`);

        const groupNodes = app.graph._nodes.filter(node => {
            if (!node || !node.pos) return false;
            return LiteGraph.overlapBounding(group._bounding, node.getBounding());
        });

        console.log(`[GET-JS] 组 "${groupName}" 内共找到 ${groupNodes.length} 个节点:`);
        groupNodes.forEach(node => {
            const isOutput = node.mode !== LiteGraph.NEVER && node.constructor.nodeData?.output_node === true;
            const isMuted = node.mode === LiteGraph.NEVER;
            console.log(`  - 节点 ${node.id}: ${node.title || node.type} (${node.type}) ${isOutput ? '(输出节点)' : ''} ${isMuted ? '(已静音)' : ''}`);
        });

        const outputNodes = groupNodes.filter(n =>
            n.mode !== LiteGraph.NEVER &&
            n.constructor.nodeData?.output_node === true
        );

        console.log(`[GET-JS] 组 "${groupName}" 内找到 ${outputNodes.length} 个输出节点:`);
        outputNodes.forEach(node => {
            console.log(`  - 输出节点 ${node.id}: ${node.title || node.type} (${node.type})`);
        });

        return outputNodes;
    },

    // 执行指定节点
    async executeNodes(nodeIds, groupName = '未知组') {
        console.log(`[GET-JS] ----------------------------------------`);
        console.log(`[GET-JS] 开始执行节点（组: ${groupName}）`);
        console.log(`[GET-JS] ----------------------------------------`);
        console.log('[GET-JS] 接收到的节点ID列表:', nodeIds);

        // 在执行前设置缓存通道
        console.log(`[GET-JS] 设置当前缓存通道为: "${groupName}"`);
        await this.setCurrentCacheGroup(groupName);

        try {
            const sortedNodeIds = nodeIds.map(id => String(id)).sort((a, b) => {
                const numA = parseInt(a);
                const numB = parseInt(b);
                if (!isNaN(numA) && !isNaN(numB)) {
                    return numA - numB;
                }
                return a.localeCompare(b);
            });

            console.log('[GET-JS] 排序后的节点ID列表:', sortedNodeIds);

            // 打印每个节点的详细信息
            console.log(`[GET-JS] 将要执行的节点详情（共 ${sortedNodeIds.length} 个）:`);
            sortedNodeIds.forEach((nodeId, idx) => {
                const node = app.graph._nodes_by_id[nodeId];
                if (node) {
                    console.log(`[GET-JS]   [${idx + 1}/${sortedNodeIds.length}] 节点详情:`);
                    console.log(`[GET-JS]     - ID: ${nodeId}`);
                    console.log(`[GET-JS]     - 类型: "${node.type}"`);
                    console.log(`[GET-JS]     - 标题: "${node.title || '(无标题)'}"`);
                    console.log(`[GET-JS]     - 所属组: "${groupName}"`);
                    console.log(`[GET-JS]     - 是否静音: ${node.mode === LiteGraph.NEVER ? '是' : '否'}`);
                    console.log(`[GET-JS]     - 是否输出节点: ${node.constructor.nodeData?.output_node === true ? '是' : '否'}`);
                } else {
                    console.warn(`[GET-JS]   ✗ 节点 ${nodeId} 未找到`);
                }
            });

            const nodesStartTime = performance.now();

            try {
                console.log(`[GET-JS] ===== 调用队列管理器提交节点 =====`);
                console.log(`[GET-JS] 队列管理器: simplifiedQueueManager.queueOutputNodes()`);
                console.log(`[GET-JS] 提交的节点ID: [${sortedNodeIds.join(', ')}]`);

                await simplifiedQueueManager.queueOutputNodes(sortedNodeIds);

                const nodesElapsedTime = ((performance.now() - nodesStartTime) / 1000).toFixed(3);
                console.log(`[GET-JS] ✓ 节点已成功提交到队列，耗时: ${nodesElapsedTime}秒`);
            } catch (error) {
                console.error(`[GET-JS] ✗ 执行节点失败（组: ${groupName}）:`);
                console.error(`[GET-JS]   错误类型: ${error.name}`);
                console.error(`[GET-JS]   错误消息: ${error.message}`);
                console.error(`[GET-JS]   错误堆栈:`, error.stack);
                throw error;
            }

            console.log(`[GET-JS] 等待组 "${groupName}" 的节点执行完成...`);
            await this.waitForExecutionComplete();

            const totalElapsedTime = ((performance.now() - nodesStartTime) / 1000).toFixed(3);
            console.log(`[GET-JS] ----------------------------------------`);
            console.log(`[GET-JS] ✓ 节点执行完成（组: ${groupName}）`);
            console.log(`[GET-JS] 总耗时: ${totalElapsedTime}秒`);
            console.log(`[GET-JS] ----------------------------------------`);
        } finally {
            console.log(`[GET-JS] 清除缓存通道`);
            await this.setCurrentCacheGroup(null);
        }
    },

    // 等待执行完成
    async waitForExecutionComplete() {
        console.log('[GET-JS] 开始等待当前队列执行完成...');
        let attempts = 0;
        const maxAttempts = 600;
        const pollInterval = 500;

        while (attempts < maxAttempts) {
            attempts++;

            try {
                const response = await api.fetchApi('/queue');

                if (!response || !response.ok) {
                    console.warn(`[GET-JS] 队列API响应异常: status=${response?.status}`);
                    await new Promise(resolve => setTimeout(resolve, pollInterval));
                    continue;
                }

                const data = await response.json();
                const running = (data.queue_running || []).length;
                const pending = (data.queue_pending || []).length;

                if (running === 0 && pending === 0) {
                    console.log('[GET-JS] ✓ 队列执行完成');
                    console.log(`[GET-JS] 总轮询次数: ${attempts}次，总等待时间: ${(attempts * pollInterval / 1000).toFixed(2)}秒`);
                    return;
                }

                if (attempts % 5 === 0) {
                    console.log(`[GET-JS] 执行中 (${attempts}/${maxAttempts}): running=${running}, pending=${pending}`);
                }
            } catch (error) {
                if (attempts % 10 === 0) {
                    console.warn(`[GET-JS] ⚠ 检查执行状态失败 (${attempts}/${maxAttempts}):`, error.message || error);
                }
            }

            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }

        console.error(`[GET-JS] ✗ 执行完成超时（已等待 ${maxAttempts * pollInterval / 1000}秒）`);
        throw new Error('等待执行完成超时');
    },

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== "GroupExecutorTrigger") return;

        // 节点创建时的处理
        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            const result = onNodeCreated?.apply(this, arguments);

            // 初始化节点属性
            this.properties = {
                isExecuting: false
            };

            // 设置节点初始大小
            this.size = [280, 60];

            return result;
        };
    }
});

console.log('[GET] 组执行触发器已加载');
