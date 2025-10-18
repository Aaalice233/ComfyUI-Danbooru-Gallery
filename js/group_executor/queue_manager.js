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

        api.queuePrompt = async function(index, prompt) {
            console.log('[QueueManager] ========== api.queuePrompt 被调用 ==========');
            console.log('[QueueManager] 时间戳:', new Date().toISOString());
            console.log('[QueueManager] this.queueNodeIds:', this.queueNodeIds);
            console.log('[QueueManager] prompt:', prompt);
            console.log('[QueueManager] prompt.output 存在:', !!prompt?.output);
            console.log('[QueueManager] prompt.output 节点数:', Object.keys(prompt?.output || {}).length);

            // 检查是否需要过滤
            let shouldFilter = false;
            let filterReason = '';
            let needsClearQueueNodeIds = false; // 标记是否需要清除 queueNodeIds

            if (this.queueNodeIds && this.queueNodeIds.length && prompt.output) {
                // 情况1: queueOutputNodes 设置了目标节点
                shouldFilter = true;
                filterReason = 'queueOutputNodes 设置了目标节点';
            } else if (!this.queueNodeIds && prompt.output) {
                // 情况2: 用户点击 Queue Prompt，检查是否有 GroupExecutorManager
                const hasGroupExecutorManager = Object.values(prompt.output).some(
                    node => node.class_type === 'GroupExecutorManager'
                );

                if (hasGroupExecutorManager) {
                    // 找到所有 GroupExecutorManager 节点
                    const gemNodeIds = Object.entries(prompt.output)
                        .filter(([_, node]) => node.class_type === 'GroupExecutorManager')
                        .map(([id, _]) => id);

                    console.log('[QueueManager] ⚠️ 检测到 GroupExecutorManager 节点:', gemNodeIds);
                    console.log('[QueueManager] ⚠️ 将只执行 GroupExecutorManager 及其依赖，过滤其他输出节点');

                    // 临时设置为只执行 GroupExecutorManager
                    this.queueNodeIds = gemNodeIds;
                    shouldFilter = true;
                    filterReason = '检测到 GroupExecutorManager，自动过滤其他输出节点';
                    needsClearQueueNodeIds = true; // 需要在执行后清除
                }
            }

            if (shouldFilter) {
                console.log('[QueueManager] ✓ 条件满足，开始过滤节点');
                console.log('[QueueManager] 过滤原因:', filterReason);
                console.log('[QueueManager] 目标节点:', this.queueNodeIds);

                const oldOutput = prompt.output;
                let newOutput = {};

                // 递归添加目标节点及其依赖
                for (const queueNodeId of this.queueNodeIds) {
                    console.log('[QueueManager] 递归添加节点及其依赖:', queueNodeId);
                    this.recursiveAddNodes(String(queueNodeId), oldOutput, newOutput);
                }

                console.log('[QueueManager] 递归完成，收集到节点数:', Object.keys(newOutput).length);

                // 替换prompt.output，只保留目标节点及其依赖
                // 注意：GroupExecutorManager 节点需要被保留并执行，它会发送 WebSocket 消息到前端
                prompt.output = newOutput;

                console.log('[QueueManager] ✓ 过滤完成，保留节点数:', Object.keys(newOutput).length);
                console.log('[QueueManager] 保留的节点:', Object.entries(newOutput).map(([id, node]) => `${id}:${node.class_type}`));
            } else {
                console.log('[QueueManager] ✗ 条件不满足，跳过过滤');
                if (!this.queueNodeIds) {
                    console.log('[QueueManager]   原因：queueNodeIds 为 null/undefined');
                } else if (!this.queueNodeIds.length) {
                    console.log('[QueueManager]   原因：queueNodeIds 长度为 0');
                } else if (!prompt.output) {
                    console.log('[QueueManager]   原因：prompt.output 不存在');
                }
            }

            console.log('[QueueManager] 调用原始 api.queuePrompt...');
            const result = await originalApiQueuePrompt.apply(api, [index, prompt]);
            console.log('[QueueManager] ✓ 原始 api.queuePrompt 返回');

            // 如果是临时设置的 queueNodeIds，需要清除
            if (needsClearQueueNodeIds) {
                console.log('[QueueManager] 清除临时设置的 queueNodeIds');
                this.queueNodeIds = null;
            }

            return result;
        }.bind(this);

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
