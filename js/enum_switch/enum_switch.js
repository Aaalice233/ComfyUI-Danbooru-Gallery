/**
 * 枚举切换节点 (Enum Switch)
 * 根据枚举值从多个输入中选择一个输出
 *
 * 功能：
 * - 输入引脚数量根据枚举选项动态调整
 * - 输出类型根据连接的下游节点自动推断
 * - 支持与 ParameterControlPanel 的枚举参数联动
 * - 采用 stabilize 模式确保工作流加载时连接不丢失
 */

import { app } from "/scripts/app.js";
import { createLogger } from '../global/logger_client.js';

const logger = createLogger('enum_switch');

// ==================== 工具函数 ====================

/**
 * 从节点末尾移除未使用的输入引脚
 * 参考 rgthree 的实现
 * @param {LGraphNode} node - 目标节点
 * @param {number} minNumber - 保留的最小输入数量（不包括 enum_value）
 * @param {RegExp} nameMatch - 输入名称匹配正则
 */
function removeUnusedInputsFromEnd(node, minNumber = 1, nameMatch = /^input_\d+$/) {
    if (node.removed) return;
    if (!node.inputs) return;
    
    // 找到第一个 input_* 的位置（跳过 enum_value）
    let firstInputIndex = 0;
    for (let i = 0; i < node.inputs.length; i++) {
        if (node.inputs[i].name.startsWith('input_')) {
            firstInputIndex = i;
            break;
        }
    }
    
    // 计算 input_* 的数量
    const inputCount = node.inputs.filter(i => i.name.startsWith('input_')).length;
    
    // 从末尾开始移除未连接的输入
    for (let i = node.inputs.length - 1; i >= firstInputIndex + minNumber; i--) {
        const input = node.inputs[i];
        if (!input) continue;
        
        // 如果输入有连接，停止移除
        if (input.link != null) {
            break;
        }
        
        // 匹配名称模式
        if (nameMatch && nameMatch.test(input.name)) {
            node.removeInput(i);
        }
    }
}

/**
 * 防抖函数
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ==================== 节点扩展 ====================

app.registerExtension({
    name: "Comfy.EnumSwitch",

    async init(app) {
        logger.info('[ES] 初始化枚举切换节点');
    },

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== "EnumSwitch") {
            return;
        }

        logger.info('[ES] 注册枚举切换节点...');

        // 节点创建时的处理
        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function() {
            const result = onNodeCreated?.apply(this, arguments);

            // 初始化节点属性（保留已有属性，避免覆盖从工作流加载的数据）
            if (!this.properties || Object.keys(this.properties).length === 0) {
                this.properties = {
                    enumOptions: [],           // 枚举选项列表
                    linkedPanelNodeId: null,   // 关联的参数面板节点ID
                    linkedParamName: null,     // 关联的枚举参数名称
                    outputType: "*",           // 推断的输出类型
                    selectedValue: ""          // 当前选中的值
                };
            }

            // 生成唯一实例ID
            this._esInstanceId = `es_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

            // 标志位：是否已从工作流加载
            this._loadedFromWorkflow = false;
            
            // 标志位：是否正在进行稳定化
            this._stabilizing = false;

            // 绑定稳定化函数
            this.stabilizeBound = this.stabilize.bind(this);
            this.debouncedStabilize = debounce(this.stabilizeBound, 64);

            // 设置节点尺寸
            this.size = [200, 80];

            logger.info('[ES] 节点已创建:', this.id);

            return result;
        };

        /**
         * 稳定化函数 - 核心机制
         * 确保输入引脚与枚举选项同步，同时保留已有连接
         */
        nodeType.prototype.stabilize = function() {
            if (this._stabilizing || this.removed) return;
            this._stabilizing = true;
            
            try {
                const options = this.properties.enumOptions || [];
                const outputType = this.properties.outputType || "*";
                
                // 1. 确保有足够的输入引脚
                this.ensureInputsForOptions(options, outputType);
                
                // 2. 从末尾移除多余的未连接输入（保留至少与选项数量相等的输入）
                const minInputs = Math.max(options.length, 1);
                removeUnusedInputsFromEnd(this, minInputs);
                
                // 3. 更新所有输入的类型
                if (this.inputs) {
                    for (const input of this.inputs) {
                        if (input.name.startsWith('input_')) {
                            input.type = outputType;
                        }
                    }
                }
                
                // 4. 更新输出类型
                if (this.outputs && this.outputs[0]) {
                    this.outputs[0].type = outputType;
                }
                
                // 5. 调整节点大小
                this.adjustNodeSize();
                
                // 6. 触发图形更新
                if (this.graph && this.graph.setDirtyCanvas) {
                    this.graph.setDirtyCanvas(true, true);
                }
                
            } finally {
                this._stabilizing = false;
            }
        };

        /**
         * 确保有足够的输入引脚
         */
        nodeType.prototype.ensureInputsForOptions = function(options, inputType) {
            if (!this.inputs) return;
            
            // 获取当前的 input_* 引脚
            const currentInputs = this.inputs.filter(i => i.name.startsWith('input_'));
            const currentCount = currentInputs.length;
            const targetCount = options.length;
            
            // 如果数量已经匹配，只需更新标签
            if (currentCount === targetCount) {
                for (let i = 0; i < currentCount; i++) {
                    const inputIndex = this.inputs.findIndex(inp => inp.name === `input_${i}`);
                    if (inputIndex >= 0 && options[i]) {
                        this.inputs[inputIndex].label = options[i];
                    }
                }
                return;
            }
            
            // 需要添加或调整引脚
            if (currentCount < targetCount) {
                // 添加缺少的引脚
                for (let i = currentCount; i < targetCount; i++) {
                    this.addInput(`input_${i}`, inputType);
                    const newIndex = this.inputs.length - 1;
                    if (this.inputs[newIndex] && options[i]) {
                        this.inputs[newIndex].label = options[i];
                    }
                }
            }
            
            // 更新所有标签
            for (let i = 0; i < Math.min(targetCount, this.inputs.length); i++) {
                const inputIndex = this.inputs.findIndex(inp => inp.name === `input_${i}`);
                if (inputIndex >= 0 && options[i]) {
                    this.inputs[inputIndex].label = options[i];
                }
            }
        };

        /**
         * 调整节点大小
         */
        nodeType.prototype.adjustNodeSize = function() {
            const inputCount = this.inputs ? this.inputs.filter(i => i.name.startsWith('input_')).length : 0;
            const baseHeight = 80;
            const inputHeight = 26;
            const newHeight = baseHeight + inputCount * inputHeight;
            this.size = [Math.max(200, this.size[0]), Math.max(newHeight, 80)];
        };

        /**
         * 调度稳定化（带防抖）
         */
        nodeType.prototype.scheduleStabilize = function(ms = 64) {
            if (this.debouncedStabilize) {
                this.debouncedStabilize();
            } else {
                setTimeout(() => this.stabilize(), ms);
            }
        };

        /**
         * 更新枚举选项
         */
        nodeType.prototype.updateEnumOptions = function(options, panelNodeId, paramName, selectedValue) {
            logger.info(`[ES] 更新枚举选项: ${options.length} 个选项`);

            // 检查选项是否有变化
            const oldOptions = this.properties.enumOptions || [];
            const optionsChanged = options.length !== oldOptions.length ||
                options.some((opt, i) => opt !== oldOptions[i]);

            this.properties.enumOptions = options;
            this.properties.linkedPanelNodeId = panelNodeId;
            this.properties.linkedParamName = paramName;
            if (selectedValue !== undefined) {
                this.properties.selectedValue = selectedValue;
            }

            // 触发稳定化
            if (optionsChanged) {
                this.scheduleStabilize();
            }

            // 同步配置到后端
            this.syncConfigToBackend();
        };

        /**
         * 同步配置到后端
         */
        nodeType.prototype.syncConfigToBackend = async function() {
            try {
                const response = await fetch('/danbooru_gallery/enum_switch/update_config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        node_id: this.id,
                        options: this.properties.enumOptions,
                        panel_node_id: this.properties.linkedPanelNodeId,
                        param_name: this.properties.linkedParamName,
                        selected_value: this.properties.selectedValue
                    })
                });

                const data = await response.json();
                if (data.status === 'success') {
                    logger.debug('[ES] 配置已同步到后端');
                } else {
                    logger.error('[ES] 同步配置失败:', data.message);
                }
            } catch (error) {
                logger.error('[ES] 同步配置异常:', error);
            }
        };

        /**
         * 监听连接变化
         */
        const onConnectionsChange = nodeType.prototype.onConnectionsChange;
        nodeType.prototype.onConnectionsChange = function(type, slotIndex, isConnected, link, ioSlot) {
            const result = onConnectionsChange?.apply(this, arguments);

            // 处理输入连接（type === 1）
            if (type === 1) {
                // 检查是否是 enum_value 输入（第一个输入）
                if (slotIndex === 0) {
                    if (isConnected) {
                        logger.info('[ES] enum_value 输入已连接');
                        // 延迟检测连接的源节点
                        setTimeout(() => {
                            this.detectPanelConnection();
                        }, 100);
                    }
                }
            }

            // 处理输出连接（type === 2）
            if (type === 2 && slotIndex === 0) {
                if (isConnected && link) {
                    // 输出连接时，推断类型
                    setTimeout(() => {
                        this.inferOutputType(link);
                    }, 100);
                }
            }

            // 触发稳定化
            this.scheduleStabilize();

            return result;
        };

        /**
         * 检测 PCP 连接
         */
        nodeType.prototype.detectPanelConnection = function() {
            try {
                // 获取 enum_value 输入的连接
                const enumInput = this.inputs && this.inputs[0];
                if (!enumInput || enumInput.link == null) {
                    return;
                }

                const link = this.graph.links[enumInput.link];
                if (!link) {
                    return;
                }

                const sourceNode = this.graph.getNodeById(link.origin_id);
                if (!sourceNode) {
                    return;
                }

                logger.info(`[ES] 检测到连接来源: ${sourceNode.type}`);

                // 检查是否是 ParameterBreak 节点
                if (sourceNode.type === 'ParameterBreak') {
                    this.syncFromParameterBreak(sourceNode, link.origin_slot);
                }
                // 也可以检查是否直接连接到 ParameterControlPanel
                else if (sourceNode.type === 'ParameterControlPanel') {
                    this.syncFromParameterPanel(sourceNode);
                }

            } catch (error) {
                logger.error('[ES] 检测 PCP 连接失败:', error);
            }
        };

        /**
         * 从 ParameterBreak 同步配置
         */
        nodeType.prototype.syncFromParameterBreak = function(breakNode, outputSlot) {
            try {
                const paramStructure = breakNode.properties?.paramStructure || [];

                if (outputSlot >= paramStructure.length) {
                    logger.warn('[ES] 输出槽索引超出参数结构范围');
                    return;
                }

                const param = paramStructure[outputSlot];

                // 检查是否是枚举类型
                if (param.param_type === 'enum' || param.param_type === 'dropdown') {
                    let options = param.options || [];
                    let selectedValue = param.value || '';

                    // 如果 paramStructure 中没有 options，尝试直接从 PCP 获取
                    if (options.length === 0) {
                        logger.info('[ES] paramStructure 中无 options，尝试从 PCP 获取...');
                        const pcpNode = this.findLinkedPCPNode(breakNode);
                        if (pcpNode) {
                            const pcpParam = this.findParamInPCP(pcpNode, param.name);
                            if (pcpParam) {
                                options = pcpParam.options || pcpParam.config?.options || [];
                                selectedValue = pcpParam.value || selectedValue;
                                logger.info(`[ES] 从 PCP 获取到 ${options.length} 个选项`);
                            }
                        }
                    }

                    logger.info(`[ES] 从 ParameterBreak 同步枚举参数: ${param.name}, ${options.length} 个选项`);

                    // 查找关联的 PCP 节点
                    let panelNodeId = null;
                    if (breakNode.inputs && breakNode.inputs[0] && breakNode.inputs[0].link != null) {
                        const breakLink = this.graph.links[breakNode.inputs[0].link];
                        if (breakLink) {
                            panelNodeId = breakLink.origin_id;
                        }
                    }

                    if (options.length > 0) {
                        this.updateEnumOptions(options, panelNodeId, param.name, selectedValue);
                    }
                } else {
                    logger.info(`[ES] 参数 ${param.name} 不是枚举类型，是 ${param.param_type}`);
                }

            } catch (error) {
                logger.error('[ES] 从 ParameterBreak 同步失败:', error);
            }
        };

        /**
         * 查找与 ParameterBreak 连接的 PCP 节点
         */
        nodeType.prototype.findLinkedPCPNode = function(breakNode) {
            try {
                if (!breakNode.inputs || !breakNode.inputs[0] || breakNode.inputs[0].link == null) {
                    return null;
                }
                const link = this.graph.links[breakNode.inputs[0].link];
                if (!link) return null;
                const sourceNode = this.graph.getNodeById(link.origin_id);
                if (sourceNode && sourceNode.type === 'ParameterControlPanel') {
                    return sourceNode;
                }
                return null;
            } catch (e) {
                return null;
            }
        };

        /**
         * 在 PCP 中查找指定名称的参数
         */
        nodeType.prototype.findParamInPCP = function(pcpNode, paramName) {
            try {
                const parameters = pcpNode.properties?.parameters || [];
                return parameters.find(p => p.name === paramName);
            } catch (e) {
                return null;
            }
        };

        /**
         * 从 ParameterControlPanel 同步配置
         */
        nodeType.prototype.syncFromParameterPanel = function(panelNode) {
            try {
                const parameters = panelNode.properties?.parameters || [];

                // 查找枚举类型的参数
                const enumParams = parameters.filter(p =>
                    p.param_type === 'enum' || p.param_type === 'dropdown'
                );

                if (enumParams.length > 0) {
                    // 使用第一个枚举参数
                    const param = enumParams[0];
                    const options = param.options || param.config?.options || [];
                    const selectedValue = param.value || '';

                    logger.info(`[ES] 从 PCP 同步枚举参数: ${param.name}, ${options.length} 个选项`);

                    this.updateEnumOptions(options, panelNode.id, param.name, selectedValue);
                }

            } catch (error) {
                logger.error('[ES] 从 PCP 同步失败:', error);
            }
        };

        /**
         * 推断输出类型
         */
        nodeType.prototype.inferOutputType = function(linkInfo) {
            try {
                const linkId = typeof linkInfo === 'object' ? linkInfo.id : linkInfo;
                const link = this.graph.links[linkId];
                if (!link) return;

                const targetNode = this.graph.getNodeById(link.target_id);
                if (!targetNode) return;

                const targetInput = targetNode.inputs?.[link.target_slot];
                if (!targetInput) return;

                const inferredType = targetInput.type;

                if (inferredType && inferredType !== "*") {
                    this.properties.outputType = inferredType;

                    // 触发稳定化来更新类型
                    this.scheduleStabilize();

                    logger.info(`[ES] 推断输出类型: ${inferredType}`);
                }
            } catch (error) {
                logger.error('[ES] 推断输出类型失败:', error);
            }
        };

        /**
         * 序列化
         */
        const onSerialize = nodeType.prototype.onSerialize;
        nodeType.prototype.onSerialize = function(info) {
            if (onSerialize) {
                onSerialize.apply(this, arguments);
            }

            info.enumOptions = this.properties.enumOptions;
            info.linkedPanelNodeId = this.properties.linkedPanelNodeId;
            info.linkedParamName = this.properties.linkedParamName;
            info.outputType = this.properties.outputType;
            info.selectedValue = this.properties.selectedValue;

            logger.debug('[ES] 序列化:', info.enumOptions?.length || 0, '个选项');
        };

        /**
         * 反序列化 - 关键改进：不再强制重建输入引脚
         */
        const onConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function(info) {
            if (onConfigure) {
                onConfigure.apply(this, arguments);
            }

            this._loadedFromWorkflow = true;

            // 恢复属性
            if (info.enumOptions) {
                this.properties.enumOptions = info.enumOptions;
            }
            if (info.linkedPanelNodeId !== undefined) {
                this.properties.linkedPanelNodeId = info.linkedPanelNodeId;
            }
            if (info.linkedParamName !== undefined) {
                this.properties.linkedParamName = info.linkedParamName;
            }
            if (info.outputType !== undefined) {
                this.properties.outputType = info.outputType;
            }
            if (info.selectedValue !== undefined) {
                this.properties.selectedValue = info.selectedValue;
            }

            // 关键改进：延迟执行，让 LiteGraph 先恢复连接
            // 不再调用 updateInputsFromOptions，而是使用 stabilize
            setTimeout(() => {
                // 只更新标签，不重建引脚（保留 LiteGraph 已恢复的连接）
                const options = this.properties.enumOptions || [];
                if (this.inputs) {
                    for (let i = 0; i < options.length; i++) {
                        const inputIndex = this.inputs.findIndex(inp => inp.name === `input_${i}`);
                        if (inputIndex >= 0) {
                            this.inputs[inputIndex].label = options[i];
                        }
                    }
                }
                
                // 更新类型
                const outputType = this.properties.outputType || "*";
                if (this.inputs) {
                    for (const input of this.inputs) {
                        if (input.name.startsWith('input_')) {
                            input.type = outputType;
                        }
                    }
                }
                if (this.outputs && this.outputs[0]) {
                    this.outputs[0].type = outputType;
                }
                
                // 调整大小
                this.adjustNodeSize();
                
                // 同步到后端
                this.syncConfigToBackend();
                
                // 延迟尝试从上游节点同步
                setTimeout(() => {
                    if (this.inputs && this.inputs[0] && this.inputs[0].link != null) {
                        logger.info('[ES] 主动从上游节点同步枚举选项...');
                        this.detectPanelConnection();
                    }
                }, 300);
                
            }, 100);

            logger.info('[ES] 反序列化:', this.properties.enumOptions?.length || 0, '个选项');
        };

        /**
         * 节点移除时清理
         */
        const onRemoved = nodeType.prototype.onRemoved;
        nodeType.prototype.onRemoved = function() {
            // 清理后端配置
            fetch('/danbooru_gallery/enum_switch/clear_config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ node_id: this.id })
            }).catch(err => {
                logger.warn('[ES] 清理后端配置失败:', err);
            });

            if (onRemoved) {
                onRemoved.apply(this, arguments);
            }

            logger.info('[ES] 节点已移除:', this.id);
        };

        /**
         * 添加右键菜单
         */
        const getExtraMenuOptions = nodeType.prototype.getExtraMenuOptions;
        nodeType.prototype.getExtraMenuOptions = function(_, options) {
            if (getExtraMenuOptions) {
                getExtraMenuOptions.apply(this, arguments);
            }

            options.push({
                content: "🔄 重新同步配置",
                callback: () => {
                    this.detectPanelConnection();
                }
            });

            options.push({
                content: "📋 查看枚举选项",
                callback: () => {
                    const opts = this.properties.enumOptions || [];
                    const msg = opts.length > 0
                        ? `枚举选项 (${opts.length}):\n${opts.join('\n')}`
                        : '暂无枚举选项';
                    alert(msg);
                }
            });
            
            options.push({
                content: "🔧 强制稳定化",
                callback: () => {
                    this.stabilize();
                }
            });
        };

        logger.info('[ES] 枚举切换节点注册完成');
    }
});

// 监听来自 ParameterControlPanel 的枚举更新事件
window.addEventListener('enum-switch-update', (event) => {
    const detail = event.detail;
    if (!detail || !detail.targetNodeId) {
        return;
    }

    // 查找目标节点
    const graph = app.graph;
    if (!graph) {
        return;
    }

    const targetNode = graph.getNodeById(detail.targetNodeId);
    if (!targetNode || targetNode.type !== 'EnumSwitch') {
        return;
    }

    logger.info('[ES] 收到枚举更新事件:', detail);

    // 更新节点配置
    if (targetNode.updateEnumOptions) {
        targetNode.updateEnumOptions(
            detail.options || [],
            detail.panelNodeId,
            detail.paramName,
            detail.selectedValue
        );
    }
});

logger.info('[ES] 枚举切换节点扩展已加载');
