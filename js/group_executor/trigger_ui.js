import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";
import { globalMultiLanguageManager } from "../global/multi_language.js";
import { globalToastManager } from "../global/toast_manager.js";
import { ExecutionStatusDisplay, EXECUTION_STATUS } from "./execution_status.js";
import { GroupListDisplay } from "./group_list_display.js";

/**
 * 组执行触发器UI组件
 * Group Executor Trigger UI Component
 */
export class GroupExecutorTriggerUI {
    constructor(node, widget) {
        this.node = node;
        this.widget = widget;
        this.currentData = null;

        // 创建UI容器
        this.createUI();

        // 绑定事件
        this.bindEvents();
    }

    createUI() {
        const container = document.createElement('div');
        container.className = 'group-executor-trigger-ui';
        container.style.cssText = `
            width: 100%;
            max-width: 320px;
            height: 280px;
            padding: 10px;
            background: #2a2a2a;
            border: 2px solid #4CAF50;
            border-radius: 8px;
            color: #fff;
            font-family: 'Segoe UI', system-ui, sans-serif;
            font-size: 12px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            gap: 10px;
            box-sizing: border-box;
        `;

        // 标题区域
        const header = document.createElement('div');
        header.className = 'trigger-header';
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 8px;
            border-bottom: 1px solid #444;
        `;

        const title = document.createElement('h3');
        title.textContent = '组执行状态';
        title.style.cssText = `
            margin: 0;
            font-size: 14px;
            font-weight: 600;
            color: #4CAF50;
        `;

        header.appendChild(title);

        // 执行状态显示组件
        const statusContainer = document.createElement('div');
        this.executionStatus = new ExecutionStatusDisplay(statusContainer);

        // 组列表显示组件
        const groupListContainer = document.createElement('div');
        this.groupListDisplay = new GroupListDisplay(groupListContainer);

        // 可滚动的内容区域
        const scrollableContent = document.createElement('div');
        scrollableContent.style.cssText = `
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding-right: 5px;
        `;

        // 添加自定义滚动条样式
        this.addCustomScrollbar(scrollableContent);

        // 当前组信息
        const currentGroupSection = document.createElement('div');
        currentGroupSection.className = 'current-group-section';
        currentGroupSection.innerHTML = `
            <div style="font-weight: 600; color: #ccc; margin-bottom: 4px;">当前执行组:</div>
            <div class="current-group-name" style="padding: 6px 8px; background: #2a4a2a; border-radius: 4px; color: #4CAF50; font-weight: 500; margin-bottom: 8px;">等待输入</div>
            <div style="font-weight: 600; color: #ccc; margin-bottom: 4px;">当前组节点:</div>
            <div class="nodes-list" style="max-height: 80px; overflow-y: auto; background: #333; border-radius: 4px; padding: 4px;"></div>
        `;

        // 执行信息
        const infoSection = document.createElement('div');
        infoSection.className = 'info-section';
        infoSection.innerHTML = `
            <div style="display: flex; justify-content: space-between; font-size: 11px; color: #888; padding: 4px; background: #333; border-radius: 4px;">
                <span class="execution-mode">模式: 顺序执行</span>
                <span class="execution-id">ID: --</span>
            </div>
        `;

        scrollableContent.appendChild(groupListContainer);
        scrollableContent.appendChild(currentGroupSection);
        scrollableContent.appendChild(infoSection);

        container.appendChild(header);
        container.appendChild(statusContainer);
        container.appendChild(scrollableContent);

        // 保存DOM引用
        this.elements = {
            container,
            currentGroupName: container.querySelector('.current-group-name'),
            nodesList: container.querySelector('.nodes-list'),
            executionMode: container.querySelector('.execution-mode'),
            executionId: container.querySelector('.execution-id')
        };

        // 设置widget元素
        this.widget.element = container;
    }

    addCustomScrollbar(element) {
        // 添加自定义滚动条样式
        const styleId = 'trigger-ui-scrollbar-styles';
        if (!document.querySelector(`#${styleId}`)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .group-executor-trigger-ui::-webkit-scrollbar {
                    width: 6px;
                }
                .group-executor-trigger-ui::-webkit-scrollbar-track {
                    background: #444;
                    border-radius: 3px;
                }
                .group-executor-trigger-ui::-webkit-scrollbar-thumb {
                    background: #4CAF50;
                    border-radius: 3px;
                }
                .group-executor-trigger-ui::-webkit-scrollbar-thumb:hover {
                    background: #66BB6A;
                }
                .group-executor-trigger-ui div::-webkit-scrollbar {
                    width: 4px;
                }
                .group-executor-trigger-ui div::-webkit-scrollbar-track {
                    background: #444;
                    border-radius: 2px;
                }
                .group-executor-trigger-ui div::-webkit-scrollbar-thumb {
                    background: #666;
                    border-radius: 2px;
                }
                .group-executor-trigger-ui div::-webkit-scrollbar-thumb:hover {
                    background: #888;
                }
            `;
            document.head.appendChild(style);
        }
    }

    bindEvents() {
        // 监听节点数据更新
        this.updateData = this.updateData.bind(this);

        // 初始渲染
        this.renderUI();

        // 如果有实时更新需求，可以添加定时器或WebSocket监听
        this.startRealTimeUpdates();
    }

    updateData(data) {
        if (!data || typeof data !== 'object') return;

        this.currentData = data;
        this.renderUI();
    }

    renderUI() {
        // 如果没有数据，显示等待状态
        const data = this.currentData || {
            status: 'waiting',
            current_group: '等待输入',
            group_list: [],
            current_nodes: [],
            execution_mode: 'sequential',
            execution_id: '--'
        };

        // 更新执行状态
        this.executionStatus.updateStatus(data.status || 'waiting', data);

        // 更新组列表
        if (data.group_list && Array.isArray(data.group_list)) {
            const groups = data.group_list.map((name, index) => ({
                name: name,
                nodes: index === 0 ? (data.current_nodes || []) : [],
                status: index === 0 ? (data.status || 'waiting') : 'waiting'
            }));

            // 找到当前组的索引
            const currentGroupIndex = groups.findIndex(g => g.name === data.current_group);
            this.groupListDisplay.updateGroups(groups, Math.max(0, currentGroupIndex));
        } else {
            // 显示空状态
            this.groupListDisplay.updateGroups([], 0);
        }

        // 更新当前组名称
        if (this.elements.currentGroupName) {
            this.elements.currentGroupName.textContent = data.current_group || '等待输入';
        }

        // 更新节点列表
        this.renderNodesList(data.current_nodes || []);

        // 更新执行信息
        this.updateExecutionInfo(data);
    }

    renderNodesList(nodes) {
        this.elements.nodesList.innerHTML = '';

        if (!nodes || nodes.length === 0) {
            const emptyItem = document.createElement('div');
            emptyItem.textContent = '无节点数据';
            emptyItem.style.cssText = 'color: #888; font-style: italic; padding: 4px;';
            this.elements.nodesList.appendChild(emptyItem);
            return;
        }

        nodes.forEach((node, index) => {
            const item = document.createElement('div');
            item.textContent = `${index + 1}. ${node}`;
            item.style.cssText = `
                padding: 2px 6px;
                margin: 1px 0;
                background: #555;
                border-radius: 3px;
                color: #fff;
                font-size: 11px;
                font-family: monospace;
            `;
            this.elements.nodesList.appendChild(item);
        });
    }

    updateExecutionInfo(data) {
        const modeTexts = {
            'sequential': '顺序执行',
            'parallel': '并行执行'
        };

        const modeText = modeTexts[data.execution_mode] || data.execution_mode || '未知模式';
        this.elements.executionMode.textContent = `模式: ${modeText}`;

        const shortId = data.execution_id ? data.execution_id.substring(0, 8) : '--';
        this.elements.executionId.textContent = `ID: ${shortId}`;
    }

    startRealTimeUpdates() {
        // 每500ms检查一次更新
        this.updateInterval = setInterval(() => {
            // 从节点的_ui_data属性获取最新数据
            if (this.node._ui_data) {
                const data = this.node._ui_data;

                if (JSON.stringify(data) !== JSON.stringify(this.currentData)) {
                    this.updateData(data);
                }
            }
        }, 500);
    }

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        // 销毁子组件
        if (this.executionStatus) {
            this.executionStatus.destroy();
        }

        if (this.groupListDisplay) {
            this.groupListDisplay.destroy();
        }

        // 清理主容器
        if (this.elements.container && this.elements.container.parentNode) {
            this.elements.container.parentNode.removeChild(this.elements.container);
        }
    }
}

// 注册到ComfyUI
app.registerExtension({
    name: 'danbooru.GroupExecutorTriggerUI',
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === 'GroupExecutorTrigger') {
            // 覆盖创建节点函数
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function() {
                const ret = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;

                // 等待节点完全创建后再初始化UI
                setTimeout(() => {
                    this.initializeGroupExecutorUI();
                }, 200);

                return ret;
            };

            // 添加UI初始化方法到节点原型
            nodeType.prototype.initializeGroupExecutorUI = function() {
                // 保留所有原有的widgets（包括输入引脚）
                // 创建虚拟widget用于UI显示
                const uiWidget = {
                    name: 'trigger_ui',
                    type: 'custom-ui',
                    value: null,
                    computeSize: () => [340, 320] // 固定大小，防止节点撑开
                };

                this.widgets.push(uiWidget);

                // 创建UI组件
                new GroupExecutorTriggerUI(this, uiWidget);

                // 强制重绘节点
                app.graph.setDirtyCanvas(true, true);
            };

            // 覆盖nodeCreated以确保UI初始化
            const onNodeCreatedOriginal = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function() {
                const result = onNodeCreatedOriginal ? onNodeCreatedOriginal.apply(this, arguments) : undefined;

                // 确保UI在节点创建后被初始化
                requestAnimationFrame(() => {
                    this.initializeGroupExecutorUI();
                });

                return result;
            };
        }
    }
});