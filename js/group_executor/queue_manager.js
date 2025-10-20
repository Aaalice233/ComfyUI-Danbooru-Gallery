/**
 * 队列管理器 - Queue Manager
 * 用于过滤和管理ComfyUI工作流执行队列
 */

import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

class QueueManager {
    constructor() {
        console.log('[QueueManager] ==================== 构造函数被调用 ====================');
        this.queueNodeIds = null;
        console.log('[QueueManager] 初始化 queueNodeIds =', this.queueNodeIds);
        console.log('[QueueManager] 准备安装 Hook...');
        this.initializeHooks();
        console.log('[QueueManager] ==================== 构造完成 ====================');
    }

    /**
     * 初始化Hook，劫持api.queuePrompt方法
     */
    initializeHooks() {
        const originalApiQueuePrompt = api.queuePrompt;

        api.queuePrompt = (index, batch_count, prompt = app.graph.serialize()) => {
            console.log('[QueueManager] ========== api.queuePrompt 被调用 ==========');
            console.log(`[QueueManager] 时间戳: ${new Date().toISOString()}`);
            console.log('[QueueManager] this.queueNodeIds:', this.queueNodeIds);
            console.log('[QueueManager] prompt:', prompt);

            // =====================================================================
            // ============ 核心节点过滤逻辑（参考 GroupExecutor 官方实现）=============
            // =====================================================================
            // 如果设置了目标节点列表，过滤 prompt.output 只保留目标节点及其依赖
            if (this.queueNodeIds && this.queueNodeIds.length && prompt && prompt.output) {
                console.log('[QueueManager] ✓ 检测到 queueNodeIds，开始过滤节点...');
                console.log('[QueueManager] 目标节点ID:', this.queueNodeIds);
                console.log('[QueueManager] 原始 prompt.output 节点数:', Object.keys(prompt.output).length);

                const oldOutput = prompt.output;
                let newOutput = {};

                // 递归添加目标节点及其所有依赖
                for (const queueNodeId of this.queueNodeIds) {
                    console.log('[QueueManager] 处理目标节点:', queueNodeId);
                    this.recursiveAddNodes(String(queueNodeId), oldOutput, newOutput);
                }

                // 替换 prompt.output，只保留过滤后的节点
                prompt.output = newOutput;
                console.log('[QueueManager] ✓ 过滤完成，新的 prompt.output 节点数:', Object.keys(newOutput).length);
                console.log('[QueueManager] 保留的节点ID:', Object.keys(newOutput));
            }

            // ✅ 关键修复：处理初始队列（用户直接点击Queue Prompt的情况）
            // 当queueNodeIds为null时，只执行GroupExecutorManager节点，过滤掉其他所有OUTPUT_NODE
            if (!this.queueNodeIds && prompt && prompt.output) {
                const groupExecutorNodes = [];

                // 查找所有GroupExecutorManager节点
                for (const [nodeId, nodeData] of Object.entries(prompt.output)) {
                    if (nodeData.class_type === "GroupExecutorManager") {
                        groupExecutorNodes.push(nodeId);
                    }
                }

                // 如果有GroupExecutorManager节点，只保留它们及其依赖
                if (groupExecutorNodes.length > 0) {
                    console.log('[QueueManager] 检测到初始队列，只执行GroupExecutorManager节点:', groupExecutorNodes);
                    console.log('[QueueManager] 原始 prompt.output 节点数:', Object.keys(prompt.output).length);

                    const oldOutput = prompt.output;
                    let newOutput = {};

                    // 递归添加GroupExecutorManager节点及其依赖
                    for (const nodeId of groupExecutorNodes) {
                        this.recursiveAddNodes(String(nodeId), oldOutput, newOutput);
                    }

                    prompt.output = newOutput;
                    console.log('[QueueManager] 过滤后 prompt.output 节点数:', Object.keys(newOutput).length);
                }
            }

            console.log('[QueueManager] 调用原始 api.queuePrompt...');
            const result = originalApiQueuePrompt.call(api, index, batch_count, prompt);
            console.log('[QueueManager] ✓ 原始 api.queuePrompt 返回');

            if (this.queueNodeIds) {
                // 如果是临时设置的 queueNodeIds，需要清除
                console.log('[QueueManager] 清除临时设置的 queueNodeIds');
                this.queueNodeIds = null;
            }

            return result;
        };

        console.log('[QueueManager] ✓ Hook 已安装');
    }

    /**
     * 检查节点是否在被muted的组内
     * @param {number} nodeId - 节点ID
     * @returns {boolean} 如果节点在被muted的组内返回true
     */
    isNodeInMutedGroup(nodeId) {
        if (!app.graph || !app.graph._nodes || !app.graph._groups) {
            return false;
        }

        // 查找节点
        const node = app.graph._nodes.find(n => n.id == nodeId);
        if (!node || !node.pos) {
            return false;
        }

        // 检查是否在任何被muted的组内
        for (const group of app.graph._groups) {
            if (group.is_muted && group._bounding) {
                // 使用 LiteGraph 的边界重叠检测
                if (LiteGraph.overlapBounding(group._bounding, node.getBounding())) {
                    console.log(`[QueueManager] 节点 #${nodeId} (${node.type}) 在被muted的组 "${group.title}" 内，跳过`);
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * 递归添加节点及其所有依赖
     * @param {string} nodeId - 节点ID
     * @param {object} oldOutput - 原始输出对象
     * @param {object} newOutput - 新的输出对象
     */
    recursiveAddNodes(nodeId, oldOutput, newOutput) {
        let currentNode = oldOutput[nodeId];

        // 如果节点不存在或已添加，跳过
        if (!currentNode || newOutput[nodeId] != null) return;

        // ✅ 关键修复：检查节点是否在被muted的组内
        // 如果是，则跳过该节点，即使它是依赖关系
        if (this.isNodeInMutedGroup(nodeId)) {
            console.log(`[QueueManager] 跳过被muted组内的节点 #${nodeId}`);
            return;
        }

        // 添加当前节点
        newOutput[nodeId] = currentNode;

        // 递归添加所有输入节点
        for (const inputValue of Object.values(currentNode.inputs || [])) {
            if (Array.isArray(inputValue)) {
                // inputValue 格式: [nodeId, slotIndex]
                this.recursiveAddNodes(inputValue[0], oldOutput, newOutput);
            }
        }
    }

    /**
     * 队列指定的输出节点
     * @param {Array<number>} nodeIds - 要执行的节点ID列表
     */
    async queueOutputNodes(nodeIds) {
        console.log('[QueueManager] ==================== queueOutputNodes 被调用 ====================');
        console.log('[QueueManager] 时间戳:', new Date().toISOString());
        console.log('[QueueManager] 目标节点ID:', nodeIds);

        try {
            // 设置目标节点ID
            console.log('[QueueManager] 设置 this.queueNodeIds =', nodeIds);
            this.queueNodeIds = nodeIds;
            console.log('[QueueManager] ✓ this.queueNodeIds 已设置:', this.queueNodeIds);

            // 调用app.queuePrompt()，会触发劫持的方法
            console.log('[QueueManager] 准备调用 app.queuePrompt()...');
            await app.queuePrompt();
            console.log('[QueueManager] ✓ app.queuePrompt() 返回');
        } finally {
            // 清除目标节点ID，恢复正常行为
            console.log('[QueueManager] 清除 this.queueNodeIds');
            this.queueNodeIds = null;
            console.log('[QueueManager] ✓ this.queueNodeIds 已清除');
        }

        console.log('[QueueManager] ==================== queueOutputNodes 完成 ====================');
    }
}

// 导出单例
export const queueManager = new QueueManager();
