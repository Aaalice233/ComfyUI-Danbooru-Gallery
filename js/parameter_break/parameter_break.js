/**
 * 参数展开节点 (Parameter Break)
 * 接收参数包并自动展开为独立的输出引脚
 */

import { app } from "/scripts/app.js";

// 参数展开节点
app.registerExtension({
    name: "ParameterBreak",

    async init(app) {
        console.log('[PB] 初始化参数展开节点');
    },

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        // 只处理ParameterBreak节点，避免产生大量冗余日志
        if (nodeData.name !== "ParameterBreak") {
            return;
        }
        console.log('[PB] 节点名称匹配，开始注册...');

        // 节点创建时的处理
        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            const result = onNodeCreated?.apply(this, arguments);

            // 初始化节点属性
            this.properties = {
                paramStructure: [],  // 参数结构（从参数包同步）
                lastSync: 0,         // 最后同步时间
                outputIdMap: {},     // 输出引脚索引 → 参数ID的映射
                optionsSyncCache: {} // 选项同步缓存，避免重复同步相同的选项
            };

            // 用于防抖的定时器
            this._syncDebounceTimers = {};

            // 设置节点初始大小
            this.size = [300, 150];

            // 标志位：是否已从工作流加载
            this._loadedFromWorkflow = false;

            console.log('[PB] 节点已创建:', this.id);

            return result;
        };

        // 监听连接变化（输入和输出）
        const onConnectionsChange = nodeType.prototype.onConnectionsChange;
        nodeType.prototype.onConnectionsChange = function (type, slotIndex, isConnected, link, ioSlot) {
            const result = onConnectionsChange?.apply(this, arguments);

            // 处理输入连接（type === LiteGraph.INPUT 或 type === 1）
            if (type === 1 && slotIndex === 0) {
                if (isConnected) {
                    console.log('[PB] 输入已连接，准备同步参数结构');
                    // 延迟同步，确保连接已建立
                    setTimeout(() => {
                        this.syncParameterStructure();
                    }, 100);
                } else {
                    console.log('[PB] 输入已断开');
                    // 可选：清空输出引脚
                    // this.clearOutputs();
                }
            }

            // 处理输出连接（type === LiteGraph.OUTPUT 或 type === 2）
            if (type === 2) {
                if (isConnected) {
                    console.log(`[PB] 输出引脚 ${slotIndex} 已连接，检查是否需要同步选项`);
                    // 延迟处理，确保连接已完全建立
                    setTimeout(() => {
                        this.handleOutputConnection(slotIndex, link);
                    }, 100);
                } else {
                    console.log(`[PB] 输出引脚 ${slotIndex} 已断开`);

                    // 获取对应的参数信息
                    const paramStructure = this.properties.paramStructure || [];
                    if (slotIndex < paramStructure.length) {
                        const paramMeta = paramStructure[slotIndex];
                        const paramName = paramMeta.name;
                        const paramType = paramMeta.param_type;

                        // 如果是下拉菜单类型，清空选项
                        if (paramType === 'dropdown') {
                            console.log(`[PB] 清空下拉菜单 '${paramName}' 的选项`);
                            this.syncOptionsToPanel(paramName, []);
                        }
                    }

                    // 清理对应的缓存
                    const paramId = this.properties.outputIdMap[slotIndex];
                    if (paramId && this.properties.optionsSyncCache) {
                        delete this.properties.optionsSyncCache[paramId];
                    }
                }
            }

            return result;
        };

        // 处理输出连接，检测目标节点并同步选项
        nodeType.prototype.handleOutputConnection = function (outputIndex, linkInfo) {
            try {
                // 获取当前输出对应的参数信息
                const paramStructure = this.properties.paramStructure || [];
                if (outputIndex >= paramStructure.length) {
                    console.log(`[PB] 输出索引 ${outputIndex} 超出参数结构范围`);
                    return;
                }

                const paramMeta = paramStructure[outputIndex];
                const paramName = paramMeta.name;
                const paramType = paramMeta.param_type;

                // 只处理下拉菜单类型的参数
                if (paramType !== 'dropdown') {
                    console.log(`[PB] 参数 '${paramName}' 不是下拉菜单类型，跳过`);
                    return;
                }

                // 获取目标节点和输入槽
                if (!linkInfo || !this.graph) {
                    console.log('[PB] 缺少连接信息或图形对象');
                    return;
                }

                const link = this.graph.links[linkInfo.id];
                if (!link) {
                    console.log('[PB] 无法找到连接对象');
                    return;
                }

                const targetNode = this.graph.getNodeById(link.target_id);
                if (!targetNode) {
                    console.log('[PB] 无法找到目标节点');
                    return;
                }

                const targetInputIndex = link.target_slot;
                console.log(`[PB] 参数 '${paramName}' 连接到节点 ${targetNode.type} 的输入 ${targetInputIndex}`);

                // 检查目标节点的输入是否为combo widget
                const options = this.extractComboOptions(targetNode, targetInputIndex);
                if (!options || options.length === 0) {
                    console.log(`[PB] 目标节点输入不是combo类型或无可用选项`);
                    return;
                }

                console.log(`[PB] 提取到 ${options.length} 个选项:`, options);

                // 检查是否需要同步（选项是否发生变化）
                const cacheKey = paramMeta.param_id;
                const cachedOptions = this.properties.optionsSyncCache[cacheKey];
                const optionsStr = JSON.stringify(options);

                if (cachedOptions === optionsStr) {
                    console.log(`[PB] 选项未变化，跳过同步`);
                    return;
                }

                // 更新缓存
                this.properties.optionsSyncCache[cacheKey] = optionsStr;

                // 同步选项到Parameter Control Panel
                this.syncOptionsToPanel(paramName, options);

            } catch (error) {
                console.error('[PB] 处理输出连接时出错:', error);
            }
        };

        // 从目标节点提取combo widget的选项
        nodeType.prototype.extractComboOptions = function (targetNode, inputIndex) {
            try {
                // 首先获取输入的名称
                const inputName = targetNode.inputs && targetNode.inputs[inputIndex]
                    ? targetNode.inputs[inputIndex].name
                    : null;

                if (!inputName) {
                    console.warn('[PB] 无法获取输入名称，inputIndex:', inputIndex);
                    return null;
                }

                console.log(`[PB] 查找输入 '${inputName}' (索引 ${inputIndex}) 的combo选项`);

                // 方法1: 在widgets中查找name匹配的combo widget
                if (targetNode.widgets && targetNode.widgets.length > 0) {
                    const matchedWidget = targetNode.widgets.find(widget =>
                        widget.name === inputName && widget.type === 'combo'
                    );

                    if (matchedWidget && matchedWidget.options && matchedWidget.options.values) {
                        console.log(`[PB] 通过widget name匹配找到combo选项: ${matchedWidget.options.values.length} 个`);
                        return matchedWidget.options.values;
                    }
                }

                // 方法2: 检查输入配置中的widget引用
                if (targetNode.inputs && targetNode.inputs[inputIndex]) {
                    const input = targetNode.inputs[inputIndex];
                    if (input.widget && input.widget.options && input.widget.options.values) {
                        console.log(`[PB] 通过input.widget找到combo选项: ${input.widget.options.values.length} 个`);
                        return input.widget.options.values;
                    }
                }

                // 方法3: 从节点定义中查找对应名称的combo输入
                const nodeDefName = targetNode.constructor.type || targetNode.type;
                const nodeDefs = window.LiteGraph ? window.LiteGraph.registered_node_types : null;
                if (nodeDefs && nodeDefs[nodeDefName]) {
                    const nodeDef = nodeDefs[nodeDefName];
                    if (nodeDef.nodeData && nodeDef.nodeData.input) {
                        // 合并required和optional inputs
                        const allInputs = {
                            ...(nodeDef.nodeData.input.required || {}),
                            ...(nodeDef.nodeData.input.optional || {})
                        };

                        // 查找与inputName匹配的combo配置
                        if (allInputs[inputName]) {
                            const config = allInputs[inputName];
                            if (Array.isArray(config) && Array.isArray(config[0])) {
                                // 这是一个combo类型: [["option1", "option2", ...]]
                                console.log(`[PB] 通过节点定义找到combo选项: ${config[0].length} 个`);
                                return config[0];
                            }
                        }
                    }
                }

                console.log(`[PB] 未找到输入 '${inputName}' 的combo选项`);
                return null;
            } catch (error) {
                console.error('[PB] 提取combo选项时出错:', error);
                return null;
            }
        };

        // 同步选项到Parameter Control Panel
        nodeType.prototype.syncOptionsToPanel = function (paramName, options) {
            // 使用防抖，避免频繁调用API
            const debounceKey = paramName;

            if (this._syncDebounceTimers[debounceKey]) {
                clearTimeout(this._syncDebounceTimers[debounceKey]);
            }

            this._syncDebounceTimers[debounceKey] = setTimeout(async () => {
                try {
                    // 查找源Parameter Control Panel节点
                    const sourceNode = this.getSourcePanelNode();
                    if (!sourceNode) {
                        console.log('[PB] 无法找到源Parameter Control Panel节点');
                        return;
                    }

                    // 调用API同步选项
                    const response = await fetch('/danbooru_gallery/pcp/sync_dropdown_options', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            node_id: sourceNode.id,
                            param_name: paramName,
                            options: options
                        })
                    });

                    const data = await response.json();

                    if (data.status === 'success') {
                        console.log(`[PB] 参数 '${paramName}' 选项已同步到Parameter Control Panel`);

                        // 直接刷新下拉菜单UI（不需要重建整个参数列表）
                        if (sourceNode.refreshDropdownOptions) {
                            sourceNode.refreshDropdownOptions(paramName, options);
                        }
                    } else {
                        console.error('[PB] 同步选项失败:', data.message);
                    }
                } catch (error) {
                    console.error('[PB] 同步选项异常:', error);
                }
            }, 300); // 300ms防抖
        };

        // 获取源Parameter Control Panel节点
        nodeType.prototype.getSourcePanelNode = function () {
            try {
                if (!this.inputs || this.inputs.length === 0) {
                    return null;
                }

                const input = this.inputs[0];
                if (!input.link) {
                    return null;
                }

                const link = this.graph.links[input.link];
                if (!link) {
                    return null;
                }

                const sourceNode = this.graph.getNodeById(link.origin_id);
                if (sourceNode && sourceNode.type === "ParameterControlPanel") {
                    return sourceNode;
                }

                return null;
            } catch (error) {
                console.error('[PB] 获取源节点时出错:', error);
                return null;
            }
        };

        // 同步参数结构（从连接的节点读取）
        nodeType.prototype.syncParameterStructure = function () {
            try {
                console.log('[PB] 开始同步参数结构...');

                // 获取输入连接
                if (!this.inputs || this.inputs.length === 0) {
                    console.log('[PB] 没有输入连接');
                    return;
                }

                const input = this.inputs[0];
                if (!input.link) {
                    console.log('[PB] 输入未连接');
                    return;
                }

                // 获取连接的源节点
                const link = this.graph.links[input.link];
                if (!link) {
                    console.log('[PB] 无法找到连接');
                    return;
                }

                const sourceNode = this.graph.getNodeById(link.origin_id);
                if (!sourceNode) {
                    console.log('[PB] 无法找到源节点');
                    return;
                }

                console.log('[PB] 源节点:', sourceNode.type, sourceNode.id);

                // 检查源节点是否是 ParameterControlPanel
                if (sourceNode.type === "ParameterControlPanel") {
                    // 从 ParameterControlPanel 读取参数结构
                    const parameters = sourceNode.properties?.parameters || [];
                    const paramMeta = [];

                    let order = 0;
                    for (const param of parameters) {
                        if (param.type !== "separator") {
                            // 确定输出类型
                            let outputType = "*";
                            if (param.type === "slider") {
                                outputType = param.config?.step === 1 ? "INT" : "FLOAT";
                            } else if (param.type === "switch") {
                                outputType = "BOOLEAN";
                            } else if (param.type === "dropdown") {
                                // 下拉菜单使用通配符类型，可以连接到任何输入
                                outputType = "*";
                            }

                            paramMeta.push({
                                name: param.name,
                                type: outputType,
                                order: order,
                                param_type: param.type,
                                param_id: param.id  // 添加参数ID用于追踪连接
                            });

                            order++;
                        }
                    }

                    console.log('[PB] 读取到参数结构:', paramMeta.length, '个参数');

                    // 更新节点的参数结构
                    this.properties.paramStructure = paramMeta;
                    this.properties.lastSync = Date.now();

                    // 更新输出引脚
                    this.updateOutputsFromStructure();

                    // 同步到后端
                    this.syncStructureToBackend();
                } else {
                    console.log('[PB] 源节点不是 ParameterControlPanel，无法自动同步');
                }

            } catch (error) {
                console.error('[PB] 同步参数结构时出错:', error);
            }
        };

        // 根据参数结构更新输出引脚
        nodeType.prototype.updateOutputsFromStructure = function () {
            const paramMeta = this.properties.paramStructure || [];

            if (paramMeta.length === 0) {
                // 没有参数，保留占位符输出
                this.outputs = [{
                    name: 'output',
                    type: '*',
                    links: null
                }];
                console.log('[PB] 参数结构为空，使用占位符输出');
                return;
            }

            // 初始化 outputIdMap（向后兼容）
            if (!this.properties.outputIdMap) {
                this.properties.outputIdMap = {};
            }

            // 保存现有连接：参数ID → 连接数组
            const connectionsByParamId = new Map();
            if (this.outputs && this.outputs.length > 0) {
                this.outputs.forEach((output, index) => {
                    const paramId = this.properties.outputIdMap[index];
                    if (paramId && output.links && output.links.length > 0) {
                        connectionsByParamId.set(paramId, [...output.links]);  // 复制连接数组
                        console.log('[PB] 保存参数', paramId, '的连接:', output.links.length, '个');
                    }
                });
            }

            // 根据参数结构生成新输出，基于参数ID恢复连接
            const newOutputs = paramMeta.map((meta, index) => {
                // 根据参数ID恢复连接
                const existingLinks = connectionsByParamId.get(meta.param_id) || null;

                if (existingLinks) {
                    console.log('[PB] 恢复参数', meta.param_id, '的连接:', existingLinks.length, '个');
                }

                return {
                    name: meta.name,
                    type: meta.type,
                    links: existingLinks
                };
            });

            // 更新 outputIdMap：索引 → 参数ID
            const newOutputIdMap = {};
            paramMeta.forEach((meta, index) => {
                newOutputIdMap[index] = meta.param_id;
            });
            this.properties.outputIdMap = newOutputIdMap;

            // 更新节点输出
            this.outputs = newOutputs;

            // 触发节点图更新
            if (this.graph && this.graph.setDirtyCanvas) {
                this.graph.setDirtyCanvas(true, true);
            }

            console.log('[PB] 输出引脚已更新:', newOutputs.length, '个输出，连接已基于参数ID恢复');
        };

        // 清空输出引脚
        nodeType.prototype.clearOutputs = function () {
            this.outputs = [{
                name: 'output',
                type: '*',
                links: null
            }];

            if (this.graph && this.graph.setDirtyCanvas) {
                this.graph.setDirtyCanvas(true, true);
            }

            console.log('[PB] 输出引脚已清空');
        };

        // 同步参数结构到后端
        nodeType.prototype.syncStructureToBackend = async function () {
            try {
                const response = await fetch('/danbooru_gallery/pb/update_structure', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        node_id: this.id,
                        meta: this.properties.paramStructure
                    })
                });

                const data = await response.json();

                if (data.status === 'success') {
                    console.log('[PB] 参数结构已同步到后端');
                } else {
                    console.error('[PB] 同步参数结构失败:', data.message);
                }
            } catch (error) {
                console.error('[PB] 同步参数结构异常:', error);
            }
        };

        // ==================== 序列化与反序列化 ====================

        // 序列化（保存到工作流）
        const onSerialize = nodeType.prototype.onSerialize;
        nodeType.prototype.onSerialize = function (info) {
            if (onSerialize) {
                onSerialize.apply(this, arguments);
            }

            // 保存参数结构到工作流（不返回，直接修改info对象）
            info.paramStructure = this.properties.paramStructure;
            info.lastSync = this.properties.lastSync;
            info.outputIdMap = this.properties.outputIdMap;  // 保存输出引脚映射

            console.log('[PB] 序列化:', info.paramStructure?.length || 0, '个参数, 映射:', Object.keys(info.outputIdMap || {}).length, '条');
            // 注意：不返回任何东西，数据已存储在info对象中
        };

        // 反序列化（从工作流加载）
        const onConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function (info) {
            if (onConfigure) {
                onConfigure.apply(this, arguments);
            }

            // 从工作流恢复参数结构（仅作为备份）
            if (info.paramStructure) {
                this.properties.paramStructure = info.paramStructure;
                // 标记已从工作流加载
                this._loadedFromWorkflow = true;
            }

            if (info.lastSync) {
                this.properties.lastSync = info.lastSync;
            }

            // 恢复输出引脚映射（关键：用于连接恢复）
            if (info.outputIdMap) {
                this.properties.outputIdMap = info.outputIdMap;
                console.log('[PB] 恢复输出映射:', Object.keys(info.outputIdMap).length, '条');
            }

            // 延迟从源节点同步，而不是使用保存的结构
            // 这样可以确保与 ParameterControlPanel 的状态一致
            setTimeout(() => {
                // 先尝试从连接的源节点同步
                this.syncParameterStructure();

                // 如果没有连接或同步失败，才使用保存的结构
                if (this.properties.paramStructure.length === 0 && this._loadedFromWorkflow) {
                    this.updateOutputsFromStructure();
                }

                // 工作流加载后，扫描所有输出连接并同步选项
                setTimeout(() => {
                    this.scanOutputConnections();
                }, 200);
            }, 150);

            console.log('[PB] 反序列化:', this.properties.paramStructure?.length || 0, '个参数（将从源节点同步）');
        };

        // 扫描所有输出连接并同步选项（用于工作流加载后）
        nodeType.prototype.scanOutputConnections = function () {
            try {
                if (!this.outputs || this.outputs.length === 0) {
                    return;
                }

                console.log('[PB] 开始扫描输出连接...');

                // 遍历所有输出引脚
                this.outputs.forEach((output, index) => {
                    if (output.links && output.links.length > 0) {
                        // 遍历该输出的所有连接
                        output.links.forEach(linkId => {
                            const link = this.graph.links[linkId];
                            if (link) {
                                console.log(`[PB] 扫描到输出 ${index} 的连接: linkId=${linkId}`);
                                // 触发选项同步
                                this.handleOutputConnection(index, link);
                            }
                        });
                    }
                });

                console.log('[PB] 输出连接扫描完成');
            } catch (error) {
                console.error('[PB] 扫描输出连接时出错:', error);
            }
        };

        // ==================== 节点生命周期钩子 ====================

        // 节点移除时的清理
        const onRemoved = nodeType.prototype.onRemoved;
        nodeType.prototype.onRemoved = function () {
            if (onRemoved) {
                onRemoved.apply(this, arguments);
            }

            console.log('[PB] 节点已移除:', this.id);
        };

        console.log('[PB] 参数展开节点已完整注册');
    }
});

console.log('[PB] 参数展开节点已加载');
