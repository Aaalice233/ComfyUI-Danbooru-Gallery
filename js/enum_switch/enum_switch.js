/**
 * 枚举切换节点 (Enum Switch)
 * 根据枚举值从多个输入中选择一个输出
 *
 * 功能：
 * - 输入引脚数量根据枚举选项动态调整
 * - 输出类型根据连接的下游节点自动推断
 * - 支持与 ParameterControlPanel 的枚举参数联动
 */

import { app } from "/scripts/app.js";
import { createLogger } from '../global/logger_client.js';

const logger = createLogger('enum_switch');

// 最大支持的输入数量（需要与后端一致）
const MAX_INPUTS = 20;

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

            // 初始化节点属性
            this.properties = {
                enumOptions: [],           // 枚举选项列表
                linkedPanelNodeId: null,   // 关联的参数面板节点ID
                linkedParamName: null,     // 关联的枚举参数名称
                outputType: "*",           // 推断的输出类型
                selectedValue: ""          // 当前选中的值
            };

            // 生成唯一实例ID
            this._esInstanceId = `es_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

            // 标志位：是否已从工作流加载
            this._loadedFromWorkflow = false;

            // 初始化时移除所有动态输入，只保留 enum_value
            this.initializeInputs();

            // 设置节点尺寸
            this.size = [200, 80];

            logger.info('[ES] 节点已创建:', this.id);

            return result;
        };

        // 初始化输入引脚
        nodeType.prototype.initializeInputs = function() {
            // 移除所有 input_* 输入，只保留 enum_value
            if (this.inputs) {
                for (let i = this.inputs.length - 1; i >= 0; i--) {
                    if (this.inputs[i].name.startsWith('input_')) {
                        this.removeInput(i);
                    }
                }
            }
        };

        // 更新枚举选项
        nodeType.prototype.updateEnumOptions = function(options, panelNodeId, paramName, selectedValue) {
            logger.info(`[ES] 更新枚举选项: ${options.length} 个选项`);

            this.properties.enumOptions = options;
            this.properties.linkedPanelNodeId = panelNodeId;
            this.properties.linkedParamName = paramName;
            if (selectedValue !== undefined) {
                this.properties.selectedValue = selectedValue;
            }

            // 更新输入引脚
            this.updateInputsFromOptions(options);

            // 同步配置到后端
            this.syncConfigToBackend();
        };

        // 根据选项更新输入引脚
        nodeType.prototype.updateInputsFromOptions = function(options) {
            // 保存现有连接
            const existingLinks = new Map();
            if (this.inputs) {
                for (let i = 0; i < this.inputs.length; i++) {
                    const input = this.inputs[i];
                    if (input && input.name.startsWith('input_') && input.link != null) {
                        existingLinks.set(input.name, input.link);
                    }
                }
            }

            // 移除所有动态输入（保留 enum_value）
            if (this.inputs) {
                for (let i = this.inputs.length - 1; i >= 0; i--) {
                    if (this.inputs[i].name.startsWith('input_')) {
                        this.removeInput(i);
                    }
                }
            }

            // 根据选项添加新输入
            const inputType = this.properties.outputType || "*";
            options.forEach((option, index) => {
                const inputName = `input_${index}`;
                this.addInput(inputName, inputType);

                // 设置输入的显示标签为枚举选项名
                if (this.inputs[this.inputs.length - 1]) {
                    this.inputs[this.inputs.length - 1].label = option;
                }
            });

            // 调整节点大小
            const baseHeight = 80;
            const inputHeight = 26;
            const newHeight = baseHeight + options.length * inputHeight;
            this.size = [Math.max(200, this.size[0]), Math.max(newHeight, 80)];

            // 触发图形更新
            if (this.graph && this.graph.setDirtyCanvas) {
                this.graph.setDirtyCanvas(true, true);
            }

            logger.info(`[ES] 输入引脚已更新: ${options.length} 个动态输入`);
        };

        // 同步配置到后端
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

        // 监听连接变化
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
                    } else {
                        logger.info('[ES] enum_value 输入已断开');
                        // 可选：清空关联信息
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

            return result;
        };

        // 检测 PCP 连接
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

        // 从 ParameterBreak 同步配置
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
                    const options = param.options || param.config?.options || [];
                    const selectedValue = param.value || '';

                    logger.info(`[ES] 从 ParameterBreak 同步枚举参数: ${param.name}, ${options.length} 个选项`);

                    // 查找关联的 PCP 节点
                    let panelNodeId = null;
                    if (breakNode.inputs && breakNode.inputs[0] && breakNode.inputs[0].link != null) {
                        const breakLink = this.graph.links[breakNode.inputs[0].link];
                        if (breakLink) {
                            panelNodeId = breakLink.origin_id;
                        }
                    }

                    this.updateEnumOptions(options, panelNodeId, param.name, selectedValue);
                }

            } catch (error) {
                logger.error('[ES] 从 ParameterBreak 同步失败:', error);
            }
        };

        // 从 ParameterControlPanel 同步配置
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

        // 推断输出类型
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

                    // 更新输出类型
                    if (this.outputs && this.outputs[0]) {
                        this.outputs[0].type = inferredType;
                    }

                    // 更新所有输入类型（保持类型一致性）
                    if (this.inputs) {
                        for (let i = 0; i < this.inputs.length; i++) {
                            if (this.inputs[i] && this.inputs[i].name.startsWith('input_')) {
                                this.inputs[i].type = inferredType;
                            }
                        }
                    }

                    // 触发图形更新以反映类型变化
                    if (this.graph && this.graph.setDirtyCanvas) {
                        this.graph.setDirtyCanvas(true, true);
                    }

                    logger.info(`[ES] 推断输出类型: ${inferredType}`);
                }
            } catch (error) {
                logger.error('[ES] 推断输出类型失败:', error);
            }
        };

        // 序列化
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

        // 反序列化
        const onConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function(info) {
            if (onConfigure) {
                onConfigure.apply(this, arguments);
            }

            this._loadedFromWorkflow = true;

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

            // 延迟恢复输入引脚
            setTimeout(() => {
                if (this.properties.enumOptions && this.properties.enumOptions.length > 0) {
                    this.updateInputsFromOptions(this.properties.enumOptions);
                }
                this.syncConfigToBackend();
            }, 150);

            logger.info('[ES] 反序列化:', this.properties.enumOptions?.length || 0, '个选项');
        };

        // 节点移除时清理
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

        // 添加右键菜单
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
