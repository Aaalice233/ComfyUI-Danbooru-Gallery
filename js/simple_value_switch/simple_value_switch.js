import { app } from "../../../scripts/app.js";

/**
 * 简易值切换节点 - 渐进式动态输入
 *
 * 功能：
 * - 默认显示一个输入引脚
 * - 连接后自动显示下一个输入引脚
 * - 断开连接后自动清理多余的空引脚
 * - 始终保持至少一个可用的输入引脚
 */

app.registerExtension({
    name: "Comfy.SimpleValueSwitch",

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        // 只处理 SimpleValueSwitch 节点
        if (nodeData.name !== "SimpleValueSwitch") {
            return;
        }

        // 保存原始的 onNodeCreated 方法
        const onNodeCreated = nodeType.prototype.onNodeCreated;

        // 重写 onNodeCreated 方法
        nodeType.prototype.onNodeCreated = function () {
            // 调用原始方法
            const result = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;

            // 初始化：确保至少有一个输入
            this.addInput("value_1", "*");

            // 保存原始的连接回调
            const originalOnConnectionsChange = this.onConnectionsChange;

            // 监听连接变化
            this.onConnectionsChange = function (type, slotIndex, isConnected, link_info, ioSlot) {
                // 调用原始回调
                if (originalOnConnectionsChange) {
                    originalOnConnectionsChange.apply(this, arguments);
                }

                // 只处理输入连接
                if (type !== 1) { // 1 = INPUT
                    return;
                }

                if (isConnected) {
                    // 连接时：检查是否需要添加新输入
                    this.checkAndAddNewInput();
                } else {
                    // 断开连接时：清理多余的空输入
                    this.cleanupEmptyInputs();
                }
            };

            // 添加辅助方法：检查并添加新输入
            this.checkAndAddNewInput = function () {
                // 获取所有输入
                const inputs = this.inputs || [];

                // 检查最后一个输入是否已连接
                if (inputs.length > 0) {
                    const lastInput = inputs[inputs.length - 1];
                    if (lastInput && lastInput.link != null) {
                        // 最后一个输入已连接，添加新输入
                        const newIndex = inputs.length + 1;
                        this.addInput(`value_${newIndex}`, "*");
                    }
                }
            };

            // 添加辅助方法：清理多余的空输入
            this.cleanupEmptyInputs = function () {
                const inputs = this.inputs || [];

                // 至少保留一个输入
                if (inputs.length <= 1) {
                    return;
                }

                // 从后往前检查，移除末尾连续的空输入（但至少保留一个）
                let removeCount = 0;
                for (let i = inputs.length - 1; i >= 1; i--) { // 从倒数第二个开始，确保至少保留第一个
                    const input = inputs[i];
                    if (input && input.link == null) {
                        removeCount++;
                    } else {
                        // 遇到已连接的输入，停止
                        break;
                    }
                }

                // 移除多余的空输入，但至少保留一个空输入
                if (removeCount > 1) {
                    for (let i = 0; i < removeCount - 1; i++) {
                        this.removeInput(inputs.length - 1);
                    }
                }
            };

            // 初始化时检查是否需要添加输入（用于加载已有工作流）
            setTimeout(() => {
                this.checkAndAddNewInput();
            }, 100);

            return result;
        };

        // 重写序列化方法，确保输入状态正确保存
        const onSerialize = nodeType.prototype.onSerialize;
        nodeType.prototype.onSerialize = function (o) {
            if (onSerialize) {
                onSerialize.apply(this, arguments);
            }

            // 保存输入数量信息
            o.inputs_count = this.inputs ? this.inputs.length : 1;
        };

        // 重写反序列化方法，恢复输入状态
        const onConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function (o) {
            if (onConfigure) {
                onConfigure.apply(this, arguments);
            }

            // 恢复输入（基于连接情况）
            if (o.inputs && o.inputs.length > 0) {
                // 确保输入数量匹配
                while (this.inputs.length < o.inputs.length) {
                    const newIndex = this.inputs.length + 1;
                    this.addInput(`value_${newIndex}`, "*");
                }
            }

            // 延迟检查，确保在所有连接恢复后再添加新输入
            setTimeout(() => {
                this.checkAndAddNewInput();
            }, 100);
        };
    },
});

console.log("[SimpleValueSwitch] 渐进式动态输入扩展已加载 ✓");
