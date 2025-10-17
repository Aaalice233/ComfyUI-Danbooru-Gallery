import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";
import { globalMultiLanguageManager } from './global/multi_language.js';
import { globalToastManager } from './global/toast_manager.js';

/**
 * 组执行管理器 - 统一CSS样式系统
 * 参考多人角色编辑器的简洁设计风格
 */

// 创建全局CSS样式
const createManagerStyles = () => {
    const styleId = 'group-execute-manager-styles';

    // 如果样式已存在，先删除
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
        existingStyle.remove();
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        /* 设计变量 */
        :root {
            --gem-primary: #7c3aed;
            --gem-primary-hover: #8b5cf6;
            --gem-primary-light: rgba(124, 58, 237, 0.1);
            --gem-primary-border: rgba(124, 58, 237, 0.5);
            --gem-bg-primary: linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%);
            --gem-bg-secondary: rgba(42, 42, 62, 0.4);
            --gem-bg-hover: rgba(139, 92, 246, 0.2);
            --gem-text-primary: #E0E0E0;
            --gem-text-secondary: rgba(255, 255, 255, 0.7);
            --gem-text-muted: rgba(255, 255, 255, 0.4);
            --gem-border: rgba(255, 255, 255, 0.1);
            --gem-border-hover: rgba(139, 92, 246, 0.6);
            --gem-radius-sm: 6px;
            --gem-radius-md: 8px;
            --gem-radius-lg: 12px;
            --gem-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            --gem-spacing-xs: 4px;
            --gem-spacing-sm: 8px;
            --gem-spacing-md: 12px;
            --gem-spacing-lg: 16px;
            --gem-transition: all 0.2s ease;
        }

        /* 主容器 */
        .gem-manager {
            width: 460px;
            min-width: 300px;
            min-height: 200px;
            background: var(--gem-bg-primary);
            border: 1px solid var(--gem-border);
            border-radius: var(--gem-radius-lg);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-shadow: var(--gem-shadow);
            font-family: system-ui, -apple-system, sans-serif;
            color: var(--gem-text-primary);
            box-sizing: border-box;
            transition: height 0.1s ease;
            margin-bottom: 8px;
        }

        /* 标题区域 */
        .gem-header {
            padding: var(--gem-spacing-sm) var(--gem-spacing-md);
            background: rgba(0, 0, 0, 0.1);
            border-bottom: 1px solid var(--gem-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-shrink: 0;
        }

        .gem-resize-hint {
            font-size: 10px;
            color: var(--gem-text-muted);
        }

        /* 控制区域 */
        .gem-controls {
            padding: var(--gem-spacing-sm);
            background: var(--gem-bg-secondary);
            border-bottom: 1px solid var(--gem-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-shrink: 0;
        }

        .gem-controls-left,
        .gem-controls-right {
            display: flex;
            gap: var(--gem-spacing-sm);
        }

        .gem-btn-icon {
            width: 30px;
            padding: var(--gem-spacing-xs) var(--gem-spacing-sm);
        }

        /* 列表容器 */
        .gem-list {
            flex: 1;
            overflow-y: auto;
            padding: var(--gem-spacing-md);
            box-sizing: border-box;
        }

        /* 底部容器 */
        .gem-footer {
            padding: var(--gem-spacing-md);
            border-top: 1px solid var(--gem-border);
            background: rgba(0, 0, 0, 0.1);
            box-sizing: border-box;
            flex-shrink: 0;
            min-height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        /* 空状态提示 */
        .gem-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            min-height: 200px;
            text-align: center;
            padding: var(--gem-spacing-lg);
        }

        .gem-empty-icon {
            font-size: 48px;
            margin-bottom: var(--spacing-md);
            opacity: 0.6;
        }

        .gem-empty-text {
            color: var(--gem-text-secondary);
            font-size: 16px;
            font-weight: 500;
            line-height: 1.5;
            max-width: 300px;
        }

        .gem-empty-subtext {
            color: var(--gem-text-muted);
            font-size: 14px;
            margin-top: var(--gem-spacing-sm);
        }

        /* 组项目 */
        .gem-item {
            background: var(--gem-bg-secondary);
            border: 1px solid var(--gem-border);
            border-radius: var(--gem-radius-md);
            padding: var(--gem-spacing-sm) var(--gem-spacing-sm);
            margin-bottom: var(--gem-spacing-xs);
            display: flex;
            align-items: center;
            gap: var(--gem-spacing-sm);
            transition: var(--gem-transition);
            box-sizing: border-box;
            cursor: move;
            min-height: 44px;
        }

        .gem-item:hover {
            background: var(--gem-bg-hover);
            border-color: var(--gem-border-hover);
            transform: translateY(-1px);
        }

        .gem-item.dragging {
            opacity: 0.5;
        }

        .gem-item.drag-over {
            border-color: var(--gem-border-hover);
            border-width: 2px;
            background: var(--gem-bg-hover);
        }

        /* 拖拽图标 */
        .gem-drag-handle {
            color: var(--gem-primary);
            font-size: 16px;
            cursor: move;
            user-select: none;
            flex-shrink: 0;
        }

        /* 序号 */
        .gem-index {
            color: var(--gem-primary);
            font-weight: 600;
            font-size: 18px;
            min-width: 30px;
            flex-shrink: 0;
        }

        /* 组名 */
        .gem-name {
            flex: 1;
            color: var(--gem-text-primary);
            font-size: 15px;
            font-weight: 500;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        /* 延迟容器 */
        .gem-delay-container {
            display: flex;
            align-items: center;
            gap: var(--gem-spacing-xs);
            flex-shrink: 0;
        }

        .gem-delay-label {
            color: var(--gem-text-secondary);
            font-size: 12px;
            font-weight: 500;
        }

        .gem-delay-value {
            background: var(--gem-primary-light);
            border: 1px solid var(--gem-primary-border);
            border-radius: var(--gem-radius-sm);
            padding: var(--gem-spacing-xs) var(--gem-spacing-sm);
            color: var(--gem-primary);
            font-size: 12px;
            font-weight: 600;
            min-width: 40px;
            text-align: center;
            cursor: pointer;
            transition: var(--gem-transition);
        }

        .gem-delay-value:hover {
            background: var(--gem-bg-hover);
            border-color: var(--gem-border-hover);
            transform: scale(1.05);
        }

        /* 按钮基础样式 */
        .gem-btn {
            border: 1px solid var(--gem-primary-border);
            border-radius: var(--gem-radius-md);
            color: var(--gem-text-primary);
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            padding: var(--gem-spacing-sm) var(--gem-spacing-md);
            transition: var(--gem-transition);
            box-sizing: border-box;
            position: relative;
            overflow: hidden;
            background: transparent;
        }

        .gem-btn:hover {
            transform: translateY(-1px);
        }

        .gem-btn:active {
            transform: translateY(0);
        }

        /* 主按钮样式 */
        .gem-btn-primary {
            background: linear-gradient(135deg, var(--gem-primary) 0%, var(--gem-primary-hover) 100%);
            color: #ffffff;
            width: 100%;
        }

        .gem-btn-primary:hover {
            background: linear-gradient(135deg, var(--gem-primary-hover) 0%, #9d6fff 100%);
        }

        /* 删除按钮样式 */
        .gem-btn-danger {
            background: var(--gem-bg-secondary);
            border-color: var(--gem-border);
        }

        .gem-btn-danger:hover {
            background: rgba(239, 68, 68, 0.4);
            border-color: rgba(239, 68, 68, 0.6);
        }

        /* 模态框样式 */
        .gem-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            box-sizing: border-box;
        }

        .gem-modal-content {
            background: var(--gem-bg-primary);
            border: 1px solid var(--gem-primary-border);
            border-radius: var(--gem-radius-lg);
            padding: var(--gem-spacing-lg);
            max-width: 80%;
            min-width: 200px;
            max-height: 300px;
            overflow-y: auto;
            box-sizing: border-box;
        }

        .gem-modal-item {
            padding: var(--gem-spacing-sm) var(--gem-spacing-md);
            margin: var(--gem-spacing-xs) 0;
            border-radius: var(--gem-radius-sm);
            transition: var(--gem-transition);
            cursor: pointer;
        }

        .gem-modal-item:hover {
            background: var(--gem-bg-hover);
        }

        .gem-modal-item.disabled {
            color: var(--gem-text-muted);
            cursor: not-allowed;
            text-decoration: line-through;
        }

        /* 响应式设计 */
        @media (max-width: 500px) {
            .gem-manager {
                width: 100%;
                min-width: 280px;
            }
        }

        /* 滚动条样式 */
        .gem-list::-webkit-scrollbar {
            width: 6px;
        }

        .gem-list::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 3px;
        }

        .gem-list::-webkit-scrollbar-thumb {
            background: var(--gem-primary);
            border-radius: 3px;
        }

        .gem-list::-webkit-scrollbar-thumb:hover {
            background: var(--gem-primary-hover);
        }
    `;

    document.head.appendChild(style);
    console.log('[GroupExecuteManager] CSS样式系统已加载');
};

/**
 * 组执行管理器节点
 * 在一个节点中管理所有组的执行
 * 支持拖拽排序、多语言、自定义GUI
 */

// 队列管理器 - 用于过滤和执行特定节点
class QueueManager {
    constructor() {
        this.queueNodeIds = null;
        this.initializeHooks();
    }

    initializeHooks() {
        const originalApiQueuePrompt = api.queuePrompt;

        api.queuePrompt = async function (index, prompt) {
            if (this.queueNodeIds && this.queueNodeIds.length && prompt.output) {
                const oldOutput = prompt.output;
                let newOutput = {};

                for (const queueNodeId of this.queueNodeIds) {
                    this.recursiveAddNodes(String(queueNodeId), oldOutput, newOutput);
                }

                prompt.output = newOutput;
            }

            return originalApiQueuePrompt.apply(api, [index, prompt]);
        }.bind(this);
    }

    recursiveAddNodes(nodeId, oldOutput, newOutput) {
        let currentNode = oldOutput[nodeId];

        if (newOutput[nodeId] != null) return;

        newOutput[nodeId] = currentNode;

        for (const inputValue of Object.values(currentNode.inputs || [])) {
            if (Array.isArray(inputValue)) {
                this.recursiveAddNodes(inputValue[0], oldOutput, newOutput);
            }
        }
    }

    async queueOutputNodes(nodeIds) {
        try {
            this.queueNodeIds = nodeIds;
            await app.queuePrompt();
        } finally {
            this.queueNodeIds = null;
        }
    }
}

const queueManager = new QueueManager();

// 创建命名空间绑定的翻译函数
const t = (key) => globalMultiLanguageManager.t(`group_manager.${key}`);

// 初始化CSS样式系统
createManagerStyles();

app.registerExtension({
    name: "GroupExecuteManager",

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== "GroupExecuteManager") return;

        // 初始化节点属性
        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            onNodeCreated?.apply(this, arguments);

            // 节点数据
            this.groups = []; // 组列表 [{name: "组1", delay: 0.5}, {name: "组2", delay: 1.0}, ...]
            this.draggingIndex = -1; // 正在拖拽的组索引

            // 执行状态
            this.isExecuting = false;
            this.executionStatus = '';

            // DOM容器
            this.domContainer = null;
            this.listContainer = null;
            this.footerContainer = null;
            this.dropdownOverlay = null;
            this.statusOverlay = null;
            this.domWidget = null;  // 保存 DOM widget 引用

            // DOM widget 状态
            this.domWidgetEnabled = false;

            // 设置节点大小和最小尺寸
            this.size = [460, 250];  // 宽度、高度 - 设置更合理的初始高度
            this.min_size = [300, 200];  // 最小尺寸 - 确保有足够空间
            this.resizable = true;

            // 动态调整节点尺寸的方法
            this.changeSize = function() {
                if (this.domContainer) {
                    const newSize = this.computeSize();

                    // 立即更新节点尺寸
                    this.size[0] = newSize[0];
                    this.size[1] = newSize[1];

                    // 立即更新DOM容器高度，确保内容完全适应
                    this.domContainer.style.height = newSize[1] + 'px';

                    // 立即通知ComfyUI节点尺寸已变化
                    this.setDirtyCanvas(true, true);

                    // 使用requestAnimationFrame确保视觉更新立即生效
                    requestAnimationFrame(() => {
                        this.setDirtyCanvas(true, false);
                    });
                }
            };

            // 优化的onResize方法
            this.onResize = function (size) {
                // 立即响应节点大小变化
                if (this.domContainer) {
                    // 立即更新DOM容器高度，确保内容完全适应
                    this.domContainer.style.height = size[1] + 'px';

                    // 立即重绘以避免延迟
                    this.setDirtyCanvas(true, false);
                }
            };

            // 创建隐藏的数据存储 widget
            this.addWidget("text", "groups_data", JSON.stringify(this.groups), (v) => {
                try {
                    this.groups = JSON.parse(v) || [];
                    console.log('[GroupExecuteManager] Widget data loaded:', this.groups);
                    if (this.listContainer) {
                        this.renderGroups();
                    }
                } catch (e) {
                    console.error('[GroupExecuteManager] Failed to parse widget data:', e);
                    this.groups = [];
                }
            }, {
                serialize: true
            });

            // 隐藏这个 widget（它只用于数据存储）
            if (this.widgets && this.widgets.length > 0) {
                this.widgets[0].type = "converted-widget";
                this.widgets[0].computeSize = () => [0, -4];
            }

            // 从序列化数据恢复
            if (this.widgets_values && this.widgets_values.length > 0) {
                try {
                    this.groups = JSON.parse(this.widgets_values[0]) || [];
                    console.log('[GroupExecuteManager] Restored from widgets_values:', this.groups);
                } catch (e) {
                    console.error('Failed to parse groups data:', e);
                    this.groups = [];
                }
            }

            // 序列化钩子
            this.serialize_widgets = true;

            // 创建DOM结构
            this.createDOMStructure();
        };

        // 创建DOM结构
        nodeType.prototype.createDOMStructure = function () {
            try {
                // 创建主容器 - 使用新的CSS类
                this.domContainer = document.createElement('div');
                this.domContainer.className = 'gem-manager';

                // 创建列表容器 - 滚动区域
                this.listContainer = document.createElement('div');
                this.listContainer.className = 'gem-list';
                this.domContainer.appendChild(this.listContainer);

                // 创建footer容器 - 添加组按钮区域
                this.footerContainer = document.createElement('div');
                this.footerContainer.className = 'gem-footer';

                // 添加按钮 - 使用CSS类
                const addButton = document.createElement('button');
                addButton.className = 'gem-btn gem-btn-primary';
                addButton.textContent = `+ ${t('addGroup') || '添加组'}`;
                addButton.addEventListener('click', () => this.showGroupSelector());
                this.footerContainer.appendChild(addButton);

                this.domContainer.appendChild(this.footerContainer);

                // 创建下拉菜单覆盖层（初始隐藏）
                this.dropdownOverlay = document.createElement('div');
                this.dropdownOverlay.className = 'gem-modal';
                this.dropdownOverlay.style.display = 'none';
                this.dropdownOverlay.addEventListener('click', (e) => {
                    if (e.target === this.dropdownOverlay) {
                        this.hideGroupSelector();
                    }
                });
                this.domContainer.appendChild(this.dropdownOverlay);

                // 创建状态覆盖层（初始隐藏）
                this.statusOverlay = document.createElement('div');
                this.statusOverlay.className = 'gem-modal';
                this.statusOverlay.style.display = 'none';
                this.domContainer.appendChild(this.statusOverlay);

                // 添加widget来显示DOM容器
                if (typeof this.addDOMWidget === 'function') {
                    const widget = this.addDOMWidget('group_manager', 'div', this.domContainer, {
                        hideOnZoom: false,
                        serialize: false
                    });

                    // 保存 widget 引用
                    this.domWidget = widget;
                    this.domWidgetEnabled = true;
                } else {
                    console.warn('[GroupExecuteManager] addDOMWidget method not available, using fallback');
                    this.addCustomWidget();
                }

                // 初始渲染
                this.renderGroups();

                // 初始化后调整尺寸，减少延迟
                setTimeout(() => {
                    this.changeSize();
                }, 10);
            } catch (error) {
                console.error('[GroupExecuteManager] Error in createDOMStructure:', error);
                globalToastManager.showToast(
                    t('messages.domError') || 'DOM创建错误',
                    'error',
                    3000
                );
                // 尝试降级到Canvas模式
                this.addCustomWidget();
            }
        };

        
        // 降级到Canvas模式
        nodeType.prototype.addCustomWidget = function() {
            this.customWidgetMode = true;
            this.setDirtyCanvas(true, true);
        };

        // 动态计算节点尺寸
        nodeType.prototype.computeSize = function(out) {
            // 基础尺寸
            const baseWidth = 460;
            let baseHeight = 250;

            // 如果有DOM容器，根据内容动态计算高度
            if (this.domContainer) {
                // 根据实际DOM结构和CSS计算高度
                const footerHeight = 72;  // 底部按钮区域高度 (min-height: 60px + padding: 24px + border: 1px)
                const itemHeight = 48;     // 每个组项目高度 (min-height: 44px + margin: 4px)
                const listPadding = 24;    // 列表容器的padding (12px * 2)
                const borderAndMargin = 6; // 边框和额外间距

                // 计算列表区域高度
                const groupsCount = this.groups ? this.groups.length : 0;
                let listHeight = 0;

                if (groupsCount === 0) {
                    // 空状态高度 - 根据CSS min-height: 200px + padding: 24px
                    listHeight = 224;
                } else {
                    // 根据组数量计算实际高度
                    listHeight = groupsCount * itemHeight;

                    // 添加列表容器的padding
                    listHeight += listPadding;

                    // 如果组数量超过10个，限制最大高度并显示滚动条
                    const maxListHeight = 10 * itemHeight + listPadding + 16; // 16px给滚动条
                    if (listHeight > maxListHeight) {
                        listHeight = maxListHeight;
                    }
                }

                // 计算总高度：列表高度 + 底部高度 + 边框间距
                baseHeight = listHeight + footerHeight + borderAndMargin;

                // 确保最小高度，至少能容纳空状态或少数项目
                baseHeight = Math.max(baseHeight, 300);
            }

            const size = [baseWidth, baseHeight];

            if (out) {
                out[0] = size[0];
                out[1] = size[1];
            }

            return size;
        };

        // Canvas模式的绘制
        nodeType.prototype.onDrawForeground = function(ctx) {
            // 如果 DOM widget 已启用，不要绘制 Canvas 内容
            if (this.domWidgetEnabled) return;

            // 只在降级模式下绘制
            if (!this.customWidgetMode) return;

            ctx.save();
            ctx.fillStyle = '#2d2b4a';
            ctx.fillRect(0, 0, this.size[0], this.size[1]);
            ctx.strokeStyle = '#7c3aed';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, this.size[0], this.size[1]);

            ctx.fillStyle = '#F5F5F5';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(t('title') || 'Group Execute Manager', this.size[0]/2, 30);

            ctx.font = '14px sans-serif';
            const line1 = t('dom_init_failed') || 'DOM initialization failed';
            const line2 = t('please_refresh') || 'Please refresh the page';
            ctx.fillText(line1, this.size[0]/2, this.size[1]/2 - 10);
            ctx.fillText(line2, this.size[0]/2, this.size[1]/2 + 15);

            ctx.restore();
        };

        // 渲染组列表
        nodeType.prototype.renderGroups = function () {
            try {
                if (!this.listContainer) {
                    console.warn('[GroupExecuteManager] listContainer not found');
                    return;
                }

                this.listContainer.innerHTML = '';

            // 如果没有组，显示居中的提示
            if (this.groups.length === 0) {
                const emptyHintContainer = document.createElement('div');
                emptyHintContainer.className = 'gem-empty';

                const emptyIcon = document.createElement('div');
                emptyIcon.className = 'gem-empty-icon';
                emptyIcon.innerHTML = '📋';

                const emptyHint = document.createElement('div');
                emptyHint.className = 'gem-empty-text';
                emptyHint.textContent = t('messages.noGroupsAvailable') || '点击下方按钮添加组';

                const subHint = document.createElement('div');
                subHint.className = 'gem-empty-subtext';
                subHint.textContent = '添加组后可以批量执行组内节点';

                emptyHintContainer.appendChild(emptyIcon);
                emptyHintContainer.appendChild(emptyHint);
                emptyHintContainer.appendChild(subHint);
                this.listContainer.appendChild(emptyHintContainer);
                return;
            }

            this.groups.forEach((group, index) => {
                const item = document.createElement('div');
                item.className = 'gem-item';
                item.draggable = true;

                // 拖拽图标（用两个短横线表示）
                const dragHandle = document.createElement('div');
                dragHandle.className = 'gem-drag-handle';
                dragHandle.textContent = '☰';
                item.appendChild(dragHandle);

                // 序号
                const indexNumber = document.createElement('div');
                indexNumber.className = 'gem-index';
                indexNumber.textContent = `${index + 1}.`;
                item.appendChild(indexNumber);

                // 组名
                const nameText = document.createElement('div');
                nameText.className = 'gem-name';
                nameText.textContent = group.name || 'Unnamed';
                item.appendChild(nameText);

                // 延迟容器
                const delayContainer = document.createElement('div');
                delayContainer.className = 'gem-delay-container';

                const delayLabel = document.createElement('span');
                delayLabel.className = 'gem-delay-label';
                delayLabel.textContent = t('listHeader.delay') || '延迟';
                delayContainer.appendChild(delayLabel);

                const delayInput = document.createElement('div');
                delayInput.className = 'gem-delay-value';
                delayInput.textContent = `${group.delay !== undefined ? group.delay : 0}s`;
                delayInput.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.editDelay(index);
                });
                delayContainer.appendChild(delayInput);

                item.appendChild(delayContainer);

                // 删除按钮
                const deleteButton = document.createElement('button');
                deleteButton.className = 'gem-btn gem-btn-danger';
                deleteButton.textContent = `✕ ${t('deleteGroup') || '删除'}`;
                deleteButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deleteGroup(index);
                });
                item.appendChild(deleteButton);

                // 简化的拖拽事件处理
                const handleDragStart = (e) => {
                    this.draggingIndex = index;
                    item.classList.add('dragging');
                    e.dataTransfer.effectAllowed = 'move';
                };

                const handleDragEnd = () => {
                    this.draggingIndex = -1;
                    item.classList.remove('dragging');
                };

                const handleDragOver = (e) => {
                    e.preventDefault();
                    if (this.draggingIndex !== -1 && this.draggingIndex !== index) {
                        item.classList.add('drag-over');
                    }
                };

                const handleDragLeave = () => {
                    item.classList.remove('drag-over');
                };

                const handleDrop = (e) => {
                    e.preventDefault();
                    item.classList.remove('drag-over');

                    if (this.draggingIndex !== -1 && this.draggingIndex !== index) {
                        // 移动数组元素
                        const draggedItem = this.groups[this.draggingIndex];
                        this.groups.splice(this.draggingIndex, 1);
                        this.groups.splice(index, 0, draggedItem);

                        // 保存数据和渲染
                        this.saveGroupsToWidget();
                        this.renderGroups();

                        // 显示确认提示
                        const orderText = this.groups.map((g, i) => `${i+1}.${g.name}`).join(' → ');
                        globalToastManager.showToast(
                            `✅ ${t('messages.dragSuccess') || '排序完成'}: ${orderText}`,
                            'success',
                            3000
                        );

                        // 拖拽排序后立即调整尺寸（确保布局正确）
                        this.changeSize();
                    }
                };

                // 添加事件监听器
                item.addEventListener('dragstart', handleDragStart);
                item.addEventListener('dragend', handleDragEnd);
                item.addEventListener('dragover', handleDragOver);
                item.addEventListener('dragleave', handleDragLeave);
                item.addEventListener('drop', handleDrop);

                this.listContainer.appendChild(item);
            });
            } catch (error) {
                console.error('[GroupExecuteManager] Error in renderGroups:', error);
                globalToastManager.showToast(
                    t('messages.renderError') || '渲染错误，请刷新页面',
                    'error',
                    3000
                );
            }

            // 渲染完成后立即调整节点尺寸，消除延迟
            this.changeSize();
        };

        // 显示组选择器
        nodeType.prototype.showGroupSelector = function () {
            try {
                const availableGroups = this.getAllGroupNames();
                if (availableGroups.length === 0) {
                    globalToastManager.showToast(
                        t('messages.noGroupsAvailable') || '工作流中没有可用的组',
                        'warning',
                        3000
                    );
                    return;
                }

            this.dropdownOverlay.innerHTML = '';
            const dropdown = document.createElement('div');
            dropdown.className = 'gem-modal-content';

            // 使用事件委托来处理点击事件
            dropdown.addEventListener('click', (e) => {
                const item = e.target.closest('.gem-modal-item:not(.disabled)');
                if (item) {
                    const groupName = item.textContent;

                    // 添加新组，默认延迟为0
                    this.groups.push({ name: groupName, delay: 0 });
                    this.saveGroupsToWidget();
                    globalToastManager.showToast(
                        `${t('messages.addGroupSuccess') || '添加成功'}: ${groupName}`,
                        'success',
                        2000
                    );
                    this.renderGroups();
                    this.hideGroupSelector();

                    // 添加新组后立即调整尺寸
                    this.changeSize();
                }
            });

            // 创建项目元素
            availableGroups.forEach(groupName => {
                const alreadyAdded = this.groups.some(g => g.name === groupName);
                const item = document.createElement('div');
                item.className = 'gem-modal-item';
                if (alreadyAdded) {
                    item.classList.add('disabled');
                }
                item.textContent = groupName;
                dropdown.appendChild(item);
            });

            this.dropdownOverlay.appendChild(dropdown);
            this.dropdownOverlay.style.display = 'flex';
            this.dropdownOverlay.style.alignItems = 'center';
            this.dropdownOverlay.style.justifyContent = 'center';
            } catch (error) {
                console.error('[GroupExecuteManager] Error in showGroupSelector:', error);
                globalToastManager.showToast(
                    t('messages.selectorError') || '选择器错误',
                    'error',
                    3000
                );
            }
        };

        // 隐藏组选择器
        nodeType.prototype.hideGroupSelector = function () {
            if (this.dropdownOverlay) {
                this.dropdownOverlay.style.display = 'none';
            }
        };

        // 编辑延迟
        nodeType.prototype.editDelay = function (index) {
            const currentDelay = this.groups[index].delay !== undefined ? this.groups[index].delay : 0;
            const promptMsg = t('dialogs.delayPrompt') || '请输入延迟时间（秒）:';
            const newDelay = prompt(promptMsg, currentDelay);

            if (newDelay !== null) {
                const parsedDelay = parseFloat(newDelay);
                if (!isNaN(parsedDelay) && parsedDelay >= 0) {
                    this.groups[index].delay = parsedDelay;
                    this.saveGroupsToWidget();
                    this.renderGroups();
                    globalToastManager.showToast(
                        `✅ ${t('messages.delayUpdated') || '延迟已更新'}: ${this.groups[index].name} = ${parsedDelay}s`,
                        'success',
                        2000
                    );
                    console.log('[GroupExecuteManager] Delay updated:', this.groups[index].name, parsedDelay);
                } else {
                    globalToastManager.showToast(
                        t('dialogs.delayInvalid') || '请输入有效的数字',
                        'error',
                        2000
                    );
                }
            }
        };

        // 删除组
        nodeType.prototype.deleteGroup = function (index) {
            const groupName = this.groups[index].name;
            const confirmMsg = t('dialogs.deleteConfirm') || '确定要删除这个组吗?';

            if (confirm(`${confirmMsg}\n"${groupName}"`)) {
                this.groups.splice(index, 1);
                this.saveGroupsToWidget();
                globalToastManager.showToast(
                    `${t('messages.deleteGroupSuccess') || '删除成功'}: ${groupName}`,
                    'success',
                    2000
                );
                this.renderGroups();
                console.log('[GroupExecuteManager] Group deleted:', groupName);

                // 删除组后立即调整尺寸
                this.changeSize();
            }
        };

        // 更新执行状态
        nodeType.prototype.updateExecutionStatus = function (status) {
            this.executionStatus = status;
            if (status && this.statusOverlay) {
                this.statusOverlay.innerHTML = `
                    <div class="gem-modal-content">
                        <div style="
                            color: var(--gem-text-primary);
                            font-size: 16px;
                            font-weight: 600;
                            text-align: center;
                        ">${status}</div>
                    </div>
                `;
                this.statusOverlay.style.display = 'flex';
                this.statusOverlay.style.alignItems = 'center';
                this.statusOverlay.style.justifyContent = 'center';
            } else if (this.statusOverlay) {
                this.statusOverlay.style.display = 'none';
            }
        };

        // 获取工作流中所有组的名称
        nodeType.prototype.getAllGroupNames = function () {
            if (!app.graph || !app.graph._groups) {
                return [];
            }
            return app.graph._groups
                .filter(g => g && g.title)
                .map(g => g.title)
                .sort();
        };

        // 获取组内的输出节点
        nodeType.prototype.getGroupOutputNodes = function (groupName) {
            const group = app.graph._groups.find(g => g.title === groupName);
            if (!group) {
                console.warn(`Group "${groupName}" not found`);
                return [];
            }

            const groupNodes = [];
            for (const node of app.graph._nodes) {
                if (!node || !node.pos) continue;
                if (LiteGraph.overlapBounding(group._bounding, node.getBounding())) {
                    groupNodes.push(node);
                }
            }

            return groupNodes.filter((n) => {
                return n.mode !== LiteGraph.NEVER &&
                    n.constructor.nodeData?.output_node === true;
            });
        };

        // 获取队列状态
        nodeType.prototype.getQueueStatus = async function () {
            try {
                const response = await api.fetchApi('/queue');
                const data = await response.json();

                return {
                    isRunning: (data.queue_running || []).length > 0,
                    isPending: (data.queue_pending || []).length > 0
                };
            } catch (error) {
                return { isRunning: false, isPending: false };
            }
        };

        // 等待队列完成
        nodeType.prototype.waitForQueue = async function () {
            return new Promise((resolve) => {
                const checkQueue = async () => {
                    if (this.cancelExecution) {
                        resolve();
                        return;
                    }

                    const status = await this.getQueueStatus();

                    if (!status.isRunning && !status.isPending) {
                        setTimeout(resolve, 100);
                        return;
                    }

                    setTimeout(checkQueue, 500);
                };

                checkQueue();
            });
        };

        // 执行所有组
        nodeType.prototype.executeAllGroups = async function () {
            try {
                console.log('[GroupExecuteManager] executeAllGroups called, isExecuting:', this.isExecuting);
                console.log('[GroupExecuteManager] Current groups:', this.groups);

                if (this.isExecuting) {
                    console.log('[GroupExecuteManager] Already executing, aborting');
                    globalToastManager.showToast(
                        t('messages.executionStarted') || '正在执行中',
                        'warning',
                        2000
                    );
                    return;
                }

            if (this.groups.length === 0) {
                globalToastManager.showToast(
                    t('messages.noGroupsToExecute') || '没有组可执行',
                    'warning',
                    2000
                );
                return;
            }

            // 显示执行顺序确认
            const executionOrder = this.groups.map((g, i) => `${i+1}. ${g.name}`).join(' → ');
            globalToastManager.showToast(
                `🚀 ${t('messages.executionStarted') || '开始执行'}: ${executionOrder}`,
                'info',
                4000
            );

            // 立即设置执行状态，防止重复触发
            this.isExecuting = true;
            this.cancelExecution = false;
            this.executionStatus = t('status.executing') || '执行中...';
            console.log('[GroupExecuteManager] Execution started, isExecuting set to true');
            this.updateExecutionStatus(this.executionStatus);

            try {
                for (let i = 0; i < this.groups.length; i++) {
                    if (this.cancelExecution) {
                        console.log('[GroupExecuteManager] Execution cancelled');
                        break;
                    }

                    const group = this.groups[i];
                    const delay = parseFloat(group.delay) || 0;

                    this.executionStatus = `${t('status.executing') || '执行'} ${i + 1}/${this.groups.length}: ${group.name}`;
                    this.updateExecutionStatus(this.executionStatus);
                    console.log(`[GroupExecuteManager] Executing group ${i + 1}/${this.groups.length}: ${group.name} (delay: ${delay}s)`);

                    const outputNodes = this.getGroupOutputNodes(group.name);
                    if (!outputNodes || outputNodes.length === 0) {
                        console.warn(`[GroupExecuteManager] No output nodes found in group: ${group.name}`);
                        globalToastManager.showToast(
                            `${t('messages.noOutputNodes') || '组中没有输出节点'}: "${group.name}"`,
                            'error',
                            3000
                        );
                        continue;
                    }

                    const nodeIds = outputNodes.map(n => n.id);
                    console.log(`[GroupExecuteManager] Queuing nodes:`, nodeIds);
                    await queueManager.queueOutputNodes(nodeIds);
                    await this.waitForQueue();
                    console.log(`[GroupExecuteManager] Group ${group.name} completed`);

                    // 执行完成后延迟（如果不是最后一个组）
                    if (delay > 0 && i < this.groups.length - 1) {
                        this.executionStatus = `${t('status.waiting') || '等待'} ${delay}s...`;
                        this.updateExecutionStatus(this.executionStatus);
                        console.log(`[GroupExecuteManager] Waiting ${delay}s before next group`);
                        await new Promise(resolve => setTimeout(resolve, delay * 1000));
                    }
                }

                this.executionStatus = t('status.completed') || '执行完成';
                this.updateExecutionStatus(this.executionStatus);
                globalToastManager.showToast(
                    t('messages.executionCompleted') || '执行完成',
                    'success',
                    2000
                );
                console.log('[GroupExecuteManager] All groups completed successfully');

                // 延迟清除状态文本
                setTimeout(() => {
                    this.executionStatus = '';
                    this.updateExecutionStatus('');
                }, 2000);

            } catch (error) {
                console.error('[GroupExecuteManager] Execution error:', error);
                this.executionStatus = `${t('status.error') || '错误'}: ${error.message}`;
                this.updateExecutionStatus(this.executionStatus);
                globalToastManager.showToast(
                    `${t('messages.executionError') || '执行错误'}: ${error.message}`,
                    'error',
                    3000
                );
            } finally {
                // 确保状态一定会被重置
                console.log('[GroupExecuteManager] Execution finished, resetting state');
                this.isExecuting = false;
                this.cancelExecution = false;
                console.log('[GroupExecuteManager] isExecuting reset to false');
            }
            } catch (error) {
                console.error('[GroupExecuteManager] Critical error in executeAllGroups:', error);
                globalToastManager.showToast(
                    t('messages.criticalError') || '严重错误，请检查控制台',
                    'error',
                    5000
                );
                // 确保在严重错误时也重置执行状态
                this.isExecuting = false;
                this.cancelExecution = false;
            }
        };

        // 保存组数据到widget
        nodeType.prototype.saveGroupsToWidget = function () {
            const groupsJson = JSON.stringify(this.groups);

            // 更新 widget 的值
            if (this.widgets && this.widgets.length > 0) {
                this.widgets[0].value = groupsJson;
            }

            // 更新widgets_values
            if (!this.widgets_values) {
                this.widgets_values = [];
            }
            this.widgets_values[0] = groupsJson;

            console.log('[GroupExecuteManager] Saved groups to widget:',
                this.groups.map((g, i) => `${i+1}. ${g.name}`).join(', '));
        };

        // 序列化
        const onSerialize = nodeType.prototype.onSerialize;
        nodeType.prototype.onSerialize = function (o) {
            onSerialize?.apply(this, arguments);
            o.groups = this.groups;
            console.log('[GroupExecuteManager] Serializing groups:',
                this.groups.map((g, i) => `${i+1}. ${g.name}`).join(', '));
        };

        // 反序列化
        const onConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function (o) {
            onConfigure?.apply(this, arguments);
            if (o.groups) {
                this.groups = o.groups;
                console.log('[GroupExecuteManager] Loaded groups from save:',
                    this.groups.map((g, i) => `${i+1}. ${g.name}`).join(', '));
                if (this.listContainer) {
                    this.renderGroups();
                    // 加载配置后立即调整尺寸
                    this.changeSize();
                }
            }
        };

        // 节点执行时触发
        const onExecuted = nodeType.prototype.onExecuted;
        nodeType.prototype.onExecuted = function (message) {
            console.log('[GroupExecuteManager] onExecuted triggered! message:', message);
            console.log('[GroupExecuteManager] Current isExecuting state:', this.isExecuting);
            console.log('[GroupExecuteManager] Current groups:', this.groups);

            onExecuted?.apply(this, arguments);

            // 防止重复执行和内部循环触发
            if (this.isExecuting) {
                console.log('[GroupExecuteManager] Already executing, skipping...');
                return;
            }

            console.log('[GroupExecuteManager] Scheduling executeAllGroups in 100ms...');
            // 使用setTimeout确保在下一个事件循环中执行，避免时序问题
            setTimeout(() => {
                console.log('[GroupExecuteManager] setTimeout callback fired, isExecuting:', this.isExecuting);
                if (!this.isExecuting) {
                    console.log('[GroupExecuteManager] Calling executeAllGroups now!');
                    this.executeAllGroups();
                } else {
                    console.log('[GroupExecuteManager] isExecuting is true, not calling executeAllGroups');
                }
            }, 100);
        };
    }
});