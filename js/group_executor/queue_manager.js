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
        // 节点类型黑名单：这些节点不应该在组执行时被包含
        this.excludedNodeTypes = [
            'GroupExecutorManager',  // 管理器节点只在初始Queue时执行
            'GroupExecutorTrigger'   // 触发器节点只在初始Queue时执行
        ];
        this.initializeHooks();
    }

    /**
     * 初始化Hook，劫持api.queuePrompt方法
     */
    initializeHooks() {
        const originalApiQueuePrompt = api.queuePrompt;

        // ✅ 修复：按照文档标准实现Hook，使用.bind(this)绑定上下文
        api.queuePrompt = async function(index, prompt) {
            // ✅ 修复：移除prompt生成逻辑，避免重复调用导致多个队列项
            // app.queuePrompt()会自动调用graphToPrompt()生成prompt

            // 如果设置了目标节点列表，过滤 prompt.output 只保留目标节点及其依赖
            if (this.queueNodeIds && this.queueNodeIds.length && prompt && prompt.output) {
                console.log('[GEM] 过滤节点，只执行目标节点:', this.queueNodeIds);

                // 保存原始output
                const oldOutput = prompt.output;
                const oldNodeIds = Object.keys(oldOutput);
                console.log('[GEM] 过滤前节点数量:', oldNodeIds.length);

                // 创建新的output对象，保留所有原始属性
                let newOutput = {};

                // 使用递归依赖收集确保节点按正确顺序执行
                for (const queueNodeId of this.queueNodeIds) {
                    const nodeIdStr = String(queueNodeId);
                    this.recursiveAddNodes(nodeIdStr, oldOutput, newOutput);
                }

                // 创建新的prompt对象，保留所有原始属性但替换output
                const newPrompt = { ...prompt };
                newPrompt.output = newOutput;

                const newNodeIds = Object.keys(newOutput);
                console.log('[GEM] 过滤后节点数量:', newNodeIds.length);

                // 打印被过滤掉的节点（用于调试）
                const filteredNodes = oldNodeIds.filter(id => !newNodeIds.includes(id));
                if (filteredNodes.length > 0) {
                    console.log('[GEM] 被过滤掉的节点:', filteredNodes);
                }

                // 调用原始方法，使用新的prompt对象
                const result = originalApiQueuePrompt.apply(api, [index, newPrompt]);

                // 清除目标节点ID
                this.queueNodeIds = null;

                return result;
            } else {
                // 没有需要过滤的节点，直接调用原始方法
                return originalApiQueuePrompt.apply(api, [index, prompt]);
            }
        }.bind(this);  // ✅ 修复：绑定上下文，确保this指向QueueManager实例

        console.log('[GEM] Hook 已安装');
    }

    /**
     * 递归添加节点及其所有依赖 - 优化版本
     */
    recursiveAddNodes(nodeId, oldOutput, newOutput) {
        // 优化：提前检查，避免重复处理
        if (newOutput[nodeId] != null) {
            console.log(`[GEM] ↺ 节点 ${nodeId} 已添加，跳过重复处理`);
            return;
        }

        const currentNode = oldOutput[nodeId];
        if (!currentNode) {
            console.warn(`[GEM] ✗ 节点 ${nodeId} 在oldOutput中不存在`);
            return;
        }

        // ⚠️ 关键修复：检查节点类型是否在黑名单中
        // 获取节点类型（class_type字段）
        const nodeType = currentNode.class_type;

        // ✅ 增强日志：记录每个节点的处理过程
        console.log(`[GEM] 🔍 检查节点 ${nodeId}: 类型="${nodeType}"`);

        // 如果节点在黑名单中，跳过它和它的依赖
        if (this.excludedNodeTypes.includes(nodeType)) {
            console.warn(`[GEM] ⊘⊘⊘ 跳过黑名单节点: ${nodeId} (${nodeType}) ⊘⊘⊘`);
            console.warn(`[GEM] 黑名单列表:`, this.excludedNodeTypes);
            return;
        }

        // 添加当前节点
        console.log(`[GEM] ✓ 添加节点 ${nodeId} (${nodeType})`);
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
            console.log('[GEM] 调用app.queuePrompt，通过app层级生成正确的prompt');
            // 关键：调用 app.queuePrompt() 而不是 api.queuePrompt()
            // app.queuePrompt() 会自动处理 graphToPrompt 并生成正确的节点ID映射
            await app.queuePrompt();
            console.log('[GEM] app.queuePrompt调用成功');
        } catch (error) {
            console.error('[GEM] 队列执行失败:', error);
            console.error('[GEM] 错误详情:', error.message);
            console.error('[GEM] 错误堆栈:', error.stack);
            this.queueNodeIds = null;
            throw error;
        }
    }
}

// 导出单例
export const simplifiedQueueManager = new QueueManager();
