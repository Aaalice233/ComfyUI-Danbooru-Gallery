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

            if (prompt && prompt.output) {
                console.log('[QueueManager] prompt.output 存在: true');
                console.log('[QueueManager] prompt.output 节点数:', Object.keys(prompt.output).length);

                const gemNodes = this.findGroupExecutorNodes(prompt);
                console.log('[QueueManager] ⚠️ 检测到 GroupExecutorManager 节点:', gemNodes);

                // =================================================================
                // ==================== GEM 内部执行时，跳过过滤 =====================
                // =================================================================
                // 当 GroupExecutorManager 正在执行一个组时，它会设置一个全局标志。
                // 在这种情况下，我们不应该过滤提示，而应该让 ComfyUI 正常处理
                // unmuted 的组。
                if (window.GEM_EXECUTING_GROUP) {
                    console.log('[QueueManager] ✓ 检测到 GEM_EXECUTING_GROUP 标志，跳过节点过滤');
                } else {
                    if (gemNodes.length > 0 && this.queueNodeIds === null) {
                        console.log('[QueueManager] ⚠️ 将只执行 GroupExecutorManager 及其依赖，过滤其他输出节点');
                        const newPrompt = this.filterPromptForGEM(prompt, gemNodes);
                        prompt = newPrompt;
                    }
                }
            } else {
                console.log('[QueueManager] prompt.output 不存在: false');
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
     * 递归添加节点及其所有依赖
     * @param {string} nodeId - 节点ID
     * @param {object} oldOutput - 原始输出对象
     * @param {object} newOutput - 新的输出对象
     */
    recursiveAddNodes(nodeId, oldOutput, newOutput) {
        let currentNode = oldOutput[nodeId];

        // 如果节点不存在或已添加，跳过
        if (!currentNode || newOutput[nodeId] != null) return;

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
