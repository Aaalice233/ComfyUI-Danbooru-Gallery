import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";
import { globalMultiLanguageManager } from './global/multi_language.js';
import { globalToastManager } from './global/toast_manager.js';

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

            // DOM widget 状态
            this.domWidgetEnabled = false;

            // 设置节点大小 - 初始高度较小，会在 DOM 创建后自动调整
            this.size = [460, 150];
            this.resizable = true;

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
            // 创建主容器 - 现代扁平设计，紫色/深色主题
            this.domContainer = document.createElement('div');
            this.domContainer.className = 'group-execute-manager';
            this.domContainer.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                box-sizing: border-box;
            `;

            // 创建列表容器 - 滚动区域
            this.listContainer = document.createElement('div');
            this.listContainer.style.cssText = `
                flex: 1;
                overflow-y: auto;
                padding: 12px;
                box-sizing: border-box;
            `;
            this.domContainer.appendChild(this.listContainer);

            // 创建footer容器 - 添加组按钮区域
            this.footerContainer = document.createElement('div');
            this.footerContainer.style.cssText = `
                padding: 12px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                box-sizing: border-box;
            `;

            // 添加按钮 - 紫色渐变主题，滑动光效
            const addButton = document.createElement('button');
            addButton.innerHTML = `+ ${t('addGroup') || '添加组'}`;
            addButton.style.cssText = `
                width: 100%;
                padding: 12px;
                border: 1px solid rgba(124, 58, 237, 0.5);
                border-radius: 8px;
                background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%);
                color: #ffffff;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                box-sizing: border-box;
                position: relative;
                overflow: hidden;
            `;

            // 滑动光效伪元素效果
            const addButtonBefore = document.createElement('div');
            addButtonBefore.style.cssText = `
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
                transition: left 0.5s;
                pointer-events: none;
            `;
            addButton.appendChild(addButtonBefore);

            addButton.addEventListener('mouseenter', () => {
                addButton.style.transform = 'translateY(-2px)';
                addButton.style.background = 'linear-gradient(135deg, #8b5cf6 0%, #9d6fff 100%)';
                addButtonBefore.style.left = '100%';
            });
            addButton.addEventListener('mouseleave', () => {
                addButton.style.transform = 'translateY(0)';
                addButton.style.background = 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)';
                setTimeout(() => {
                    addButtonBefore.style.left = '-100%';
                }, 500);
            });
            addButton.addEventListener('click', () => this.showGroupSelector());
            this.footerContainer.appendChild(addButton);

            this.domContainer.appendChild(this.footerContainer);

            // 创建下拉菜单覆盖层（初始隐藏）
            this.dropdownOverlay = document.createElement('div');
            this.dropdownOverlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.6);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                box-sizing: border-box;
            `;
            this.dropdownOverlay.addEventListener('click', (e) => {
                if (e.target === this.dropdownOverlay) {
                    this.hideGroupSelector();
                }
            });
            this.domContainer.appendChild(this.dropdownOverlay);

            // 创建状态覆盖层（初始隐藏）
            this.statusOverlay = document.createElement('div');
            this.statusOverlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.6);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 1001;
                box-sizing: border-box;
            `;
            this.domContainer.appendChild(this.statusOverlay);

            // 打印调试信息
            console.log('[GroupExecuteManager] DOM structure created');
            console.log('[GroupExecuteManager] domContainer:', this.domContainer);
            console.log('[GroupExecuteManager] listContainer:', this.listContainer);
            console.log('[GroupExecuteManager] footerContainer:', this.footerContainer);
            console.log('[GroupExecuteManager] domContainer children:', this.domContainer.children.length);

            // 添加widget来显示DOM容器
            // 立即尝试添加 DOM widget，不要延迟
            try {
                if (typeof this.addDOMWidget === 'function') {
                    const widget = this.addDOMWidget('group_manager', 'div', this.domContainer);
                    console.log('[GroupExecuteManager] DOM widget added successfully:', widget);

                    // 标记 DOM 模式已启用
                    this.domWidgetEnabled = true;

                    // 强制更新节点尺寸
                    this.setSize(this.computeSize());
                } else {
                    console.warn('[GroupExecuteManager] addDOMWidget method not available, trying fallback');
                    // 降级到Canvas模式
                    this.addCustomWidget();
                }
            } catch (error) {
                console.error('[GroupExecuteManager] Failed to add DOM widget:', error);
                console.error('[GroupExecuteManager] Error stack:', error.stack);
                // 降级到Canvas模式
                this.addCustomWidget();
            }

            // 初始渲染
            console.log('[GroupExecuteManager] Calling renderGroups...');
            this.renderGroups();
            console.log('[GroupExecuteManager] renderGroups completed');

            // 添加详细调试日志
            setTimeout(() => {
                if (this.domContainer && this.domContainer.parentElement) {
                    const parent = this.domContainer.parentElement;
                    const parentStyle = window.getComputedStyle(parent);
                    const containerStyle = window.getComputedStyle(this.domContainer);

                    console.log('[GroupExecuteManager] === 容器调试信息 ===');
                    console.log('[GroupExecuteManager] 父容器:', parent);
                    console.log('[GroupExecuteManager] 父容器 tagName:', parent.tagName);
                    console.log('[GroupExecuteManager] 父容器 className:', parent.className);
                    console.log('[GroupExecuteManager] 父容器 position:', parentStyle.position);
                    console.log('[GroupExecuteManager] 父容器 width:', parentStyle.width, 'clientWidth:', parent.clientWidth);
                    console.log('[GroupExecuteManager] 父容器 height:', parentStyle.height, 'clientHeight:', parent.clientHeight);
                    console.log('[GroupExecuteManager] 父容器 offsetWidth:', parent.offsetWidth, 'offsetHeight:', parent.offsetHeight);
                    console.log('[GroupExecuteManager] domContainer position:', containerStyle.position);
                    console.log('[GroupExecuteManager] domContainer width:', containerStyle.width, 'clientWidth:', this.domContainer.clientWidth);
                    console.log('[GroupExecuteManager] domContainer height:', containerStyle.height, 'clientHeight:', this.domContainer.clientHeight);
                    console.log('[GroupExecuteManager] domContainer offsetWidth:', this.domContainer.offsetWidth, 'offsetHeight:', this.domContainer.offsetHeight);
                    console.log('[GroupExecuteManager] domContainer getBoundingClientRect:', this.domContainer.getBoundingClientRect());
                    console.log('[GroupExecuteManager] === 结束 ===');
                }
            }, 500);
        };

        // 降级到Canvas模式
        nodeType.prototype.addCustomWidget = function() {
            this.customWidgetMode = true;
            this.setDirtyCanvas(true, true);
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
            if (!this.listContainer) {
                console.warn('[GroupExecuteManager] listContainer not found');
                return;
            }

            console.log('[GroupExecuteManager] renderGroups called, groups:', this.groups);

            this.listContainer.innerHTML = '';

            // 如果没有组，显示提示
            if (this.groups.length === 0) {
                const emptyHint = document.createElement('div');
                emptyHint.style.cssText = `
                    padding: 20px;
                    text-align: center;
                    color: rgba(255, 255, 255, 0.5);
                    font-size: 14px;
                `;
                emptyHint.textContent = t('messages.noGroupsAvailable') || '点击下方按钮添加组';
                this.listContainer.appendChild(emptyHint);
                return;
            }

            this.groups.forEach((group, index) => {
                const item = document.createElement('div');
                item.style.cssText = `
                    background: rgba(42, 42, 62, 0.4);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 8px;
                    padding: 12px 14px;
                    margin-bottom: 8px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    transition: all 0.3s ease;
                    box-sizing: border-box;
                    cursor: move;
                `;
                item.draggable = true;

                // 拖拽图标（用两个短横线表示）
                const dragHandle = document.createElement('div');
                dragHandle.style.cssText = `
                    color: rgba(139, 92, 246, 0.8);
                    font-size: 16px;
                    cursor: move;
                    flex-shrink: 0;
                    user-select: none;
                `;
                dragHandle.textContent = '☰';
                item.appendChild(dragHandle);

                // 序号
                const indexNumber = document.createElement('div');
                indexNumber.style.cssText = `
                    color: #8b5cf6;
                    font-weight: 600;
                    font-size: 18px;
                    min-width: 30px;
                    flex-shrink: 0;
                `;
                indexNumber.textContent = `${index + 1}.`;
                item.appendChild(indexNumber);

                // 组名
                const nameText = document.createElement('div');
                nameText.style.cssText = `
                    flex: 1;
                    color: #E0E0E0;
                    font-size: 15px;
                    font-weight: 500;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                `;
                nameText.textContent = group.name || 'Unnamed';
                item.appendChild(nameText);

                // 延迟容器
                const delayContainer = document.createElement('div');
                delayContainer.style.cssText = `
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    flex-shrink: 0;
                `;

                const delayLabel = document.createElement('span');
                delayLabel.textContent = t('listHeader.delay') || '延迟';
                delayLabel.style.cssText = `
                    color: rgba(139, 92, 246, 0.8);
                    font-size: 12px;
                    font-weight: 500;
                `;
                delayContainer.appendChild(delayLabel);

                const delayInput = document.createElement('div');
                delayInput.textContent = `${group.delay !== undefined ? group.delay : 0}s`;
                delayInput.style.cssText = `
                    background: rgba(139, 92, 246, 0.15);
                    border: 1px solid rgba(139, 92, 246, 0.4);
                    border-radius: 6px;
                    padding: 5px 10px;
                    color: #8b5cf6;
                    font-size: 12px;
                    font-weight: 600;
                    min-width: 40px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.3s ease;
                `;
                delayInput.addEventListener('mouseenter', () => {
                    delayInput.style.background = 'rgba(139, 92, 246, 0.3)';
                    delayInput.style.borderColor = 'rgba(139, 92, 246, 0.6)';
                    delayInput.style.transform = 'scale(1.05)';
                });
                delayInput.addEventListener('mouseleave', () => {
                    delayInput.style.background = 'rgba(139, 92, 246, 0.15)';
                    delayInput.style.borderColor = 'rgba(139, 92, 246, 0.4)';
                    delayInput.style.transform = 'scale(1)';
                });
                delayInput.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.editDelay(index);
                });
                delayContainer.appendChild(delayInput);

                item.appendChild(delayContainer);

                // 删除按钮 - 带滑动光效
                const deleteButton = document.createElement('button');
                deleteButton.innerHTML = `<span style="position: relative; z-index: 1;">✕ ${t('deleteGroup') || '删除'}</span>`;
                deleteButton.style.cssText = `
                    background: linear-gradient(135deg, rgba(80, 80, 100, 0.3) 0%, rgba(100, 100, 120, 0.3) 100%);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 6px;
                    color: rgba(255, 255, 255, 0.9);
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    padding: 7px 14px;
                    transition: all 0.3s ease;
                    flex-shrink: 0;
                    box-sizing: border-box;
                    position: relative;
                    overflow: hidden;
                `;

                // 滑动光效
                const deleteButtonBefore = document.createElement('div');
                deleteButtonBefore.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
                    transition: left 0.5s;
                    pointer-events: none;
                `;
                deleteButton.insertBefore(deleteButtonBefore, deleteButton.firstChild);

                deleteButton.addEventListener('mouseenter', () => {
                    deleteButton.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.4) 0%, rgba(220, 38, 38, 0.4) 100%)';
                    deleteButton.style.borderColor = 'rgba(239, 68, 68, 0.6)';
                    deleteButton.style.transform = 'translateY(-2px)';
                    deleteButtonBefore.style.left = '100%';
                });
                deleteButton.addEventListener('mouseleave', () => {
                    deleteButton.style.background = 'linear-gradient(135deg, rgba(80, 80, 100, 0.3) 0%, rgba(100, 100, 120, 0.3) 100%)';
                    deleteButton.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    deleteButton.style.transform = 'translateY(0)';
                    setTimeout(() => {
                        deleteButtonBefore.style.left = '-100%';
                    }, 500);
                });
                deleteButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deleteGroup(index);
                });
                item.appendChild(deleteButton);

                // 拖拽事件
                item.addEventListener('dragstart', (e) => {
                    this.draggingIndex = index;
                    item.style.opacity = '0.5';
                    e.dataTransfer.effectAllowed = 'move';
                    console.log('[GroupExecuteManager] Drag start:', index);
                });

                item.addEventListener('dragend', () => {
                    this.draggingIndex = -1;
                    item.style.opacity = '1';
                    console.log('[GroupExecuteManager] Drag end');
                });

                item.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    if (this.draggingIndex !== -1 && this.draggingIndex !== index) {
                        item.style.borderColor = 'rgba(139, 92, 246, 0.6)';
                        item.style.borderWidth = '2px';
                        item.style.background = 'rgba(139, 92, 246, 0.2)';
                    }
                });

                item.addEventListener('dragleave', () => {
                    item.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    item.style.borderWidth = '1px';
                    item.style.background = 'rgba(42, 42, 62, 0.4)';
                });

                item.addEventListener('drop', (e) => {
                    e.preventDefault();
                    item.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    item.style.borderWidth = '1px';
                    item.style.background = 'rgba(42, 42, 62, 0.4)';

                    if (this.draggingIndex !== -1 && this.draggingIndex !== index) {
                        console.log(`[GroupExecuteManager] Drag & Drop: moving item from ${this.draggingIndex} to ${index}`);

                        // 移动数组元素
                        const draggedItem = this.groups[this.draggingIndex];
                        this.groups.splice(this.draggingIndex, 1);
                        this.groups.splice(index, 0, draggedItem);

                        console.log('[GroupExecuteManager] New order:',
                            this.groups.map((g, i) => `${i+1}. ${g.name}`).join(', '));

                        // 保存数据
                        this.saveGroupsToWidget();

                        // 重新渲染
                        this.renderGroups();

                        // 显示确认提示
                        globalToastManager.showToast(
                            `✅ ${t('messages.dragSuccess') || '排序完成'}: ${this.groups.map((g, i) => `${i+1}.${g.name}`).join(' → ')}`,
                            'success',
                            3000
                        );
                    }
                });

                this.listContainer.appendChild(item);
            });
        };

        // 显示组选择器
        nodeType.prototype.showGroupSelector = function () {
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
            dropdown.style.cssText = `
                background: linear-gradient(135deg, #2a2a3e 0%, #1e1e2e 100%);
                border: 1px solid rgba(139, 92, 246, 0.4);
                border-radius: 12px;
                padding: 8px;
                max-height: 300px;
                overflow-y: auto;
                min-width: 200px;
                max-width: 80%;
                box-sizing: border-box;
            `;

            availableGroups.forEach(groupName => {
                // 检查是否已经添加
                const alreadyAdded = this.groups.some(g => g.name === groupName);

                const item = document.createElement('div');
                item.textContent = groupName;
                item.style.cssText = `
                    padding: 10px 12px;
                    color: ${alreadyAdded ? 'rgba(255, 255, 255, 0.3)' : '#E0E0E0'};
                    font-size: 14px;
                    cursor: ${alreadyAdded ? 'not-allowed' : 'pointer'};
                    border-radius: 8px;
                    margin: 4px 0;
                    transition: all 0.3s ease;
                    box-sizing: border-box;
                    ${alreadyAdded ? 'text-decoration: line-through;' : ''}
                `;

                if (!alreadyAdded) {
                    item.addEventListener('mouseenter', () => {
                        item.style.background = 'rgba(139, 92, 246, 0.3)';
                        item.style.color = '#ffffff';
                        item.style.transform = 'translateX(4px)';
                    });

                    item.addEventListener('mouseleave', () => {
                        item.style.background = 'transparent';
                        item.style.color = '#E0E0E0';
                        item.style.transform = 'translateX(0)';
                    });

                    item.addEventListener('click', () => {
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
                        console.log('[GroupExecuteManager] Group added:', groupName);
                    });
                }

                dropdown.appendChild(item);
            });

            this.dropdownOverlay.appendChild(dropdown);
            this.dropdownOverlay.style.display = 'flex';
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
            }
        };

        // 更新执行状态
        nodeType.prototype.updateExecutionStatus = function (status) {
            this.executionStatus = status;
            if (status && this.statusOverlay) {
                this.statusOverlay.innerHTML = `
                    <div style="
                        background: linear-gradient(135deg, #2a2a3e 0%, #1e1e2e 100%);
                        border: 1px solid rgba(139, 92, 246, 0.6);
                        border-radius: 12px;
                        padding: 24px 36px;
                        min-width: 200px;
                        max-width: 80%;
                        box-sizing: border-box;
                    ">
                        <div style="
                            color: #E0E0E0;
                            font-size: 16px;
                            font-weight: 600;
                            text-align: center;
                        ">${status}</div>
                    </div>
                `;
                this.statusOverlay.style.display = 'flex';
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