/**
 * 简化版队列管理器 - Simplified Queue Manager
 * 只保留核心节点过滤逻辑，简化架构
 */

import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

class QueueManager {
    constructor() {
        console.log('[GEM] 初始化队列管理器');
        this.queueNodeIds = null;
        this.initializeHooks();
    }

    /**
     * 初始化Hook，劫持api.queuePrompt方法
     */
    initializeHooks() {
        const originalApiQueuePrompt = api.queuePrompt;

        api.queuePrompt = (index, batch_count, prompt = app.graph.serialize()) => {
            // 如果设置了目标节点列表，过滤 prompt.output 只保留目标节点及其依赖
            if (this.queueNodeIds && this.queueNodeIds.length && prompt && prompt.output) {
                console.log('[GEM] 过滤节点，只执行目标节点:', this.queueNodeIds);

                const oldOutput = prompt.output;
                const oldNodeIds = Object.keys(oldOutput);
                console.log('[GEM] 过滤前节点数量:', oldNodeIds.length);
                console.log('[GEM] 过滤前节点列表:', oldNodeIds);

                let newOutput = {};

                // 使用递归依赖收集确保节点按正确顺序执行
                for (const queueNodeId of this.queueNodeIds) {
                    this.recursiveAddNodes(String(queueNodeId), oldOutput, newOutput);
                }

                // 替换 prompt.output，只保留过滤后的节点
                prompt.output = newOutput;
                const newNodeIds = Object.keys(newOutput);
                console.log('[GEM] 过滤后节点数量:', newNodeIds.length);
                console.log('[GEM] 过滤后节点列表:', newNodeIds);
                console.log('[GEM] 过滤完成，保留节点:', Object.keys(newOutput));

                // 打印被过滤掉的节点
                const filteredNodes = oldNodeIds.filter(id => !newNodeIds.includes(id));
                if (filteredNodes.length > 0) {
                    console.log('[GEM] 被过滤掉的节点:', filteredNodes);
                }
            }

            // 调用原始方法
            const result = originalApiQueuePrompt.call(api, index, batch_count, prompt);

            // 清除目标节点ID
            if (this.queueNodeIds) {
                this.queueNodeIds = null;
            }

            return result;
        };

        console.log('[GEM] Hook 已安装');
    }

    /**
     * 递归添加节点及其所有依赖 - 优化版本
     */
    recursiveAddNodes(nodeId, oldOutput, newOutput) {
        // 优化：提前检查，避免重复处理
        if (newOutput[nodeId] != null) return;

        const currentNode = oldOutput[nodeId];
        if (!currentNode) return;

        // 添加当前节点
        newOutput[nodeId] = currentNode;

        // 优化：使用Object.values和forEach简化循环
        Object.values(currentNode.inputs || {}).forEach(inputValue => {
            if (Array.isArray(inputValue)) {
                // inputValue 格式: [nodeId, slotIndex]
                this.recursiveAddNodes(inputValue[0], oldOutput, newOutput);
            }
        });
    }

    /**
     * 检查节点是否在静音组中
     */
    isNodeInMutedGroup(nodeId) {
        if (!app.graph || !app.graph._groups) {
            return false;
        }

        const node = app.graph._nodes_by_id[nodeId];
        if (!node) {
            return false;
        }

        // 检查节点是否在任何静音的组中
        for (const group of app.graph._groups) {
            if (group.is_muted && LiteGraph.overlapBounding(group._bounding, node.getBounding())) {
                return true;
            }
        }

        return false;
    }

    /**
     * 设置要执行的输出节点 - 优化版本
     */
    async queueOutputNodes(nodeIds) {
        if (!Array.isArray(nodeIds) || nodeIds.length === 0) {
            console.warn('[GEM] 无效的节点ID列表');
            return;
        }

        console.log('[GEM] 设置要执行的节点:', nodeIds);

        // 优化：使用map简化节点信息打印
        console.log('[GEM] 节点详细信息:');
        nodeIds.forEach(nodeId => {
            const node = app.graph._nodes_by_id[nodeId];
            if (node) {
                console.log(`  - 节点 ${nodeId}: ${node.title || node.type} (${node.type}) - 状态: ${node.mode === LiteGraph.NEVER ? '静音' : '激活'}`);
            } else {
                console.warn(`  - 节点 ${nodeId}: 未找到`);
            }
        });

        this.queueNodeIds = nodeIds;

        // 触发队列执行
        try {
            await api.queuePrompt();
        } catch (error) {
            console.error('[GEM] 队列执行失败:', error);
            this.queueNodeIds = null;
            throw error;
        } finally {
            // 确保清理目标节点ID
            this.queueNodeIds = null;
        }
    }
}

// 导出单例
export const simplifiedQueueManager = new QueueManager();
