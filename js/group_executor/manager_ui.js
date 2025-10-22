import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

/**
 * 组执行管理器UI组件
 * Group Executor Manager UI Component
 */
export class GroupExecutorManagerUI {
    constructor(node, widget) {
        this.node = node;
        this.widget = widget;

        // 使用默认配置
        this.groups = [
            {
                name: "示例组1",
                nodes: ["节点1", "节点2", "节点3"],
                description: "这是第一个执行组"
            },
            {
                name: "示例组2",
                nodes: ["节点4", "节点5"],
                description: "这是第二个执行组"
            }
        ];

        this.createUI();
        this.bindEvents();
    }

    createUI() {
        const container = document.createElement('div');
        container.className = 'group-executor-manager-ui';
        container.style.cssText = `
            width: 100%;
            min-height: 400px;
            padding: 15px;
            background: #2a2a2a;
            border: 1px solid #444;
            border-radius: 8px;
            color: #fff;
            font-family: 'Segoe UI', system-ui, sans-serif;
            font-size: 12px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            gap: 15px;
        `;

        // 标题
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 10px;
            border-bottom: 1px solid #444;
        `;

        const title = document.createElement('h3');
        title.textContent = '组执行配置';
        title.style.cssText = `
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            color: #4CAF50;
        `;

        const addButton = document.createElement('button');
        addButton.textContent = '+ 添加组';
        addButton.style.cssText = `
            padding: 6px 12px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
        `;
        addButton.addEventListener('click', () => this.addGroup());

        header.appendChild(title);
        header.appendChild(addButton);

        // 组列表
        const groupsSection = document.createElement('div');
        groupsSection.style.cssText = `
            flex: 1;
            overflow-y: auto;
        `;

        this.groupsContainer = document.createElement('div');
        this.groupsContainer.className = 'groups-container';
        this.groupsContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;

        groupsSection.appendChild(this.groupsContainer);

        // 底部操作区
        const actionsSection = document.createElement('div');
        actionsSection.style.cssText = `
            display: flex;
            gap: 10px;
            padding-top: 10px;
            border-top: 1px solid #444;
        `;

        const generateButton = document.createElement('button');
        generateButton.textContent = '生成执行计划';
        generateButton.style.cssText = `
            flex: 1;
            padding: 8px 16px;
            background: #2196F3;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
        `;
        generateButton.addEventListener('click', () => this.generateExecutionPlan());

        const clearButton = document.createElement('button');
        clearButton.textContent = '清空';
        clearButton.style.cssText = `
            padding: 8px 16px;
            background: #666;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        `;
        clearButton.addEventListener('click', () => this.clearGroups());

        actionsSection.appendChild(generateButton);
        actionsSection.appendChild(clearButton);

        container.appendChild(header);
        container.appendChild(groupsSection);
        container.appendChild(actionsSection);

        this.elements = { container, addButton, generateButton, clearButton };
        this.widget.element = container;

        // 初始渲染
        this.renderGroups();
    }

    bindEvents() {
        // 初始数据同步
        this.syncToNode();
    }

    renderGroups() {
        this.groupsContainer.innerHTML = '';

        if (this.groups.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.style.cssText = `
                text-align: center;
                color: #888;
                font-style: italic;
                padding: 40px 20px;
                border: 2px dashed #555;
                border-radius: 8px;
            `;
            emptyState.textContent = '暂无执行组，点击上方按钮添加';
            this.groupsContainer.appendChild(emptyState);
            return;
        }

        this.groups.forEach((group, index) => {
            const groupElement = this.createGroupElement(group, index);
            this.groupsContainer.appendChild(groupElement);
        });
    }

    createGroupElement(group, index) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'group-item';
        groupDiv.style.cssText = `
            background: #333;
            border: 1px solid #555;
            border-radius: 6px;
            padding: 12px;
            position: relative;
        `;

        // 组头部
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        `;

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = group.name;
        nameInput.style.cssText = `
            flex: 1;
            padding: 6px 8px;
            background: #444;
            border: 1px solid #666;
            border-radius: 4px;
            color: white;
            font-size: 13px;
            font-weight: 500;
        `;
        nameInput.addEventListener('input', (e) => {
            this.groups[index].name = e.target.value;
            this.syncToNode();
        });

        const deleteButton = document.createElement('button');
        deleteButton.textContent = '删除';
        deleteButton.style.cssText = `
            padding: 4px 8px;
            background: #F44336;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
            margin-left: 8px;
        `;
        deleteButton.addEventListener('click', () => this.deleteGroup(index));

        header.appendChild(nameInput);
        header.appendChild(deleteButton);

        // 描述
        const descInput = document.createElement('input');
        descInput.type = 'text';
        descInput.value = group.description || '';
        descInput.placeholder = '组描述（可选）';
        descInput.style.cssText = `
            width: 100%;
            padding: 4px 8px;
            background: #444;
            border: 1px solid #666;
            border-radius: 4px;
            color: #ccc;
            font-size: 11px;
            margin-bottom: 8px;
        `;
        descInput.addEventListener('input', (e) => {
            this.groups[index].description = e.target.value;
            this.syncToNode();
        });

        // 节点列表
        const nodesLabel = document.createElement('div');
        nodesLabel.textContent = '节点列表：';
        nodesLabel.style.cssText = `
            font-size: 11px;
            color: #aaa;
            margin-bottom: 4px;
        `;

        const nodesContainer = document.createElement('div');
        nodesContainer.style.cssText = `
            background: #444;
            border: 1px solid #666;
            border-radius: 4px;
            padding: 8px;
        `;

        const nodesList = document.createElement('div');
        nodesList.className = 'nodes-list';
        nodesList.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 4px;
            margin-bottom: 8px;
        `;

        // 渲染现有节点
        (group.nodes || []).forEach((node, nodeIndex) => {
            const nodeItem = this.createNodeItem(node, index, nodeIndex);
            nodesList.appendChild(nodeItem);
        });

        const addNodeButton = document.createElement('button');
        addNodeButton.textContent = '+ 添加节点';
        addNodeButton.style.cssText = `
            padding: 4px 8px;
            background: #555;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
        `;
        addNodeButton.addEventListener('click', () => this.addNode(index));

        nodesContainer.appendChild(nodesList);
        nodesContainer.appendChild(addNodeButton);

        groupDiv.appendChild(header);
        groupDiv.appendChild(descInput);
        groupDiv.appendChild(nodesLabel);
        groupDiv.appendChild(nodesContainer);

        return groupDiv;
    }

    createNodeItem(node, groupIndex, nodeIndex) {
        const nodeItem = document.createElement('div');
        nodeItem.style.cssText = `
            display: flex;
            gap: 4px;
            align-items: center;
        `;

        const nodeInput = document.createElement('input');
        nodeInput.type = 'text';
        nodeInput.value = node;
        nodeInput.style.cssText = `
            flex: 1;
            padding: 3px 6px;
            background: #555;
            border: 1px solid #777;
            border-radius: 3px;
            color: white;
            font-size: 11px;
            font-family: monospace;
        `;
        nodeInput.addEventListener('input', (e) => {
            this.groups[groupIndex].nodes[nodeIndex] = e.target.value;
            this.syncToNode();
        });

        const removeNodeButton = document.createElement('button');
        removeNodeButton.textContent = '×';
        removeNodeButton.style.cssText = `
            width: 20px;
            height: 20px;
            background: #F44336;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        removeNodeButton.addEventListener('click', () => this.removeNode(groupIndex, nodeIndex));

        nodeItem.appendChild(nodeInput);
        nodeItem.appendChild(removeNodeButton);

        return nodeItem;
    }

    addGroup() {
        const newGroup = {
            name: `新组${this.groups.length + 1}`,
            nodes: [`节点${this.groups.length * 10 + 1}`],
            description: ''
        };
        this.groups.push(newGroup);
        this.renderGroups();
        this.syncToNode();
    }

    deleteGroup(index) {
        if (this.groups.length > 1) {
            this.groups.splice(index, 1);
            this.renderGroups();
            this.syncToNode();
        }
    }

    addNode(groupIndex) {
        this.groups[groupIndex].nodes.push(`新节点${Date.now() % 1000}`);
        this.renderGroups();
        this.syncToNode();
    }

    removeNode(groupIndex, nodeIndex) {
        if (this.groups[groupIndex].nodes.length > 1) {
            this.groups[groupIndex].nodes.splice(nodeIndex, 1);
            this.renderGroups();
            this.syncToNode();
        }
    }

    clearGroups() {
        this.groups = [];
        this.renderGroups();
        this.syncToNode();
    }

    syncToNode() {
        // 将组数据同步到节点
        const configData = {
            groups: this.groups
        };

        // 更新节点的内部状态
        this.node._groupConfig = configData;

        // 触发节点重新执行
        if (app.graph) {
            app.graph.setDirtyCanvas(true, false);
        }
    }

    generateExecutionPlan() {
        // 强制触发节点执行
        if (this.node && this.node.execute) {
            this.node.execute();
        }
    }

    getGroupsConfig() {
        return {
            groups: this.groups
        };
    }

    destroy() {
        if (this.elements.container && this.elements.container.parentNode) {
            this.elements.container.parentNode.removeChild(this.elements.container);
        }
    }
}

// 注册到ComfyUI
app.registerExtension({
    name: 'danbooru.GroupExecutorManagerUI',
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === 'GroupExecutorManager') {
            // 覆盖创建节点函数
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function() {
                const ret = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;

                // 等待节点完全创建后再初始化UI
                setTimeout(() => {
                    this.initializeManagerUI();
                }, 200);

                return ret;
            };

            // 添加UI初始化方法到节点原型
            nodeType.prototype.initializeManagerUI = function() {
                // 清空现有widgets
                this.widgets.length = 0;

                // 创建虚拟widget用于UI显示
                const uiWidget = {
                    name: 'manager_ui',
                    type: 'custom-ui',
                    value: null,
                    computeSize: () => [350, 450]
                };

                this.widgets.push(uiWidget);

                // 创建UI组件
                new GroupExecutorManagerUI(this, uiWidget);

                // 强制重绘节点
                app.graph.setDirtyCanvas(true, true);
            };

            // 确保UI在节点创建后被初始化
            const onNodeCreatedOriginal = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function() {
                const result = onNodeCreatedOriginal ? onNodeCreatedOriginal.apply(this, arguments) : undefined;

                requestAnimationFrame(() => {
                    this.initializeManagerUI();
                });

                return result;
            };
        }
    }
});