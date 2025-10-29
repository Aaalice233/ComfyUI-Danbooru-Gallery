/**
 * 组静音管理器 - Group Mute Manager
 * 提供可视化的组 mute 控制和联动配置功能
 */

import { app } from "/scripts/app.js";

// 组静音管理器
app.registerExtension({
    name: "GroupMuteManager",

    async init(app) {
        console.log('[GMM-UI] 初始化组静音管理器');
    },

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== "GroupMuteManager") return;

        // 节点创建时的处理
        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            const result = onNodeCreated?.apply(this, arguments);

            // 为节点分配唯一实例ID（用于区分事件源）
            this._gmmInstanceId = `gmm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

            // 初始化节点属性
            this.properties = {
                groups: [],  // 组配置列表
                selectedColorFilter: ''  // 选中的颜色过滤器
            };

            // 初始化循环检测栈
            this._processingStack = new Set();

            // 设置节点初始大小
            this.size = [400, 500];

            // 创建自定义UI
            this.createCustomUI();

            // 添加全局事件监听器，用于同步其他节点的状态变化
            this._gmmEventHandler = (e) => {
                // 只响应其他节点触发的事件，避免重复刷新
                if (e.detail && e.detail.sourceId !== this._gmmInstanceId) {
                    console.log('[GMM] 收到其他节点的状态变化事件，刷新UI');
                    this.updateGroupsList();
                }
            };

            // 监听组静音状态变化事件（使用 window 对象）
            window.addEventListener('group-mute-changed', this._gmmEventHandler);

            return result;
        };

        // 创建自定义UI
        nodeType.prototype.createCustomUI = function () {
            try {
                console.log('[GMM-UI] 开始创建自定义UI:', this.id);

                const container = document.createElement('div');
                container.className = 'gmm-container';

                // 创建样式
                this.addStyles();

                // 创建布局
                container.innerHTML = `
                <div class="gmm-content">
                    <div class="gmm-groups-header">
                        <span class="gmm-groups-title">组静音管理器</span>
                        <div class="gmm-header-controls">
                            <div class="gmm-color-filter-container" id="gmm-color-filter-container">
                                <span class="gmm-filter-label">颜色过滤</span>
                                <select class="gmm-color-filter-select" id="gmm-color-filter" title="按颜色过滤组">
                                    <option value="">所有颜色</option>
                                </select>
                            </div>
                            <button class="gmm-refresh-button" id="gmm-refresh" title="刷新">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="23 4 23 10 17 10"></polyline>
                                    <polyline points="1 20 1 14 7 14"></polyline>
                                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="gmm-groups-list" id="gmm-groups-list"></div>
                </div>
            `;

                // 添加到节点的自定义widget
                this.addDOMWidget("gmm_ui", "div", container);
                this.customUI = container;

                // 绑定事件
                this.bindUIEvents();

                // 初始化组列表
                this.updateGroupsList();

                // 立即初始化颜色过滤器
                setTimeout(() => {
                    this.refreshColorFilter();
                }, 50);

                console.log('[GMM-UI] 自定义UI创建完成');

            } catch (error) {
                console.error('[GMM-UI] 创建自定义UI时出错:', error);
            }
        };

        // 添加样式
        nodeType.prototype.addStyles = function () {
            if (document.querySelector('#gmm-styles')) return;

            const style = document.createElement('style');
            style.id = 'gmm-styles';
            style.textContent = `
                .gmm-container {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    background: #1e1e2e;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    overflow: hidden;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    font-size: 13px;
                    color: #E0E0E0;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                }

                .gmm-content {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    background: rgba(30, 30, 46, 0.5);
                }

                .gmm-groups-header {
                    padding: 12px 20px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .gmm-header-controls {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .gmm-color-filter-container {
                    position: relative;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .gmm-filter-label {
                    font-size: 12px;
                    color: #B0B0B0;
                    white-space: nowrap;
                    font-weight: 500;
                }

                .gmm-color-filter-select {
                    background: rgba(0, 0, 0, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 6px;
                    padding: 4px 8px;
                    color: #E0E0E0;
                    font-size: 12px;
                    min-width: 100px;
                    transition: all 0.2s ease;
                    cursor: pointer;
                }

                .gmm-color-filter-select:focus {
                    outline: none;
                    border-color: #743795;
                    background: rgba(0, 0, 0, 0.3);
                }

                .gmm-groups-title {
                    font-size: 12px;
                    font-weight: 500;
                    color: #B0B0B0;
                }

                .gmm-refresh-button {
                    background: rgba(116, 55, 149, 0.2);
                    border: 1px solid rgba(116, 55, 149, 0.3);
                    border-radius: 4px;
                    padding: 4px 8px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .gmm-refresh-button:hover {
                    background: rgba(116, 55, 149, 0.4);
                    border-color: rgba(116, 55, 149, 0.5);
                }

                .gmm-refresh-button svg {
                    stroke: #B0B0B0;
                }

                .gmm-groups-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 8px;
                }

                .gmm-groups-list::-webkit-scrollbar {
                    width: 8px;
                }

                .gmm-groups-list::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.1);
                    border-radius: 4px;
                }

                .gmm-groups-list::-webkit-scrollbar-thumb {
                    background: rgba(116, 55, 149, 0.5);
                    border-radius: 4px;
                }

                .gmm-groups-list::-webkit-scrollbar-thumb:hover {
                    background: rgba(116, 55, 149, 0.7);
                }

                .gmm-group-item {
                    background: linear-gradient(135deg, rgba(42, 42, 62, 0.6) 0%, rgba(58, 58, 78, 0.6) 100%);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 6px;
                    padding: 6px 8px;
                    margin-bottom: 4px;
                    transition: all 0.2s ease;
                    animation: gmmFadeIn 0.3s ease-out;
                }

                .gmm-group-item:hover {
                    border-color: rgba(116, 55, 149, 0.5);
                    box-shadow: 0 2px 8px rgba(116, 55, 149, 0.2);
                    transform: translateY(-1px);
                }

                .gmm-group-header {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .gmm-group-name {
                    flex: 1;
                    color: #E0E0E0;
                    font-size: 13px;
                    font-weight: 500;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    min-width: 0;
                }

                .gmm-switch {
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, rgba(116, 55, 149, 0.3) 0%, rgba(139, 75, 168, 0.3) 100%);
                    border: 2px solid rgba(116, 55, 149, 0.5);
                    transition: all 0.3s ease;
                    cursor: pointer;
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                }

                .gmm-switch svg {
                    width: 14px;
                    height: 14px;
                    stroke: rgba(255, 255, 255, 0.3);
                    transition: all 0.3s ease;
                }

                .gmm-switch:hover {
                    transform: scale(1.1);
                }

                .gmm-switch.active {
                    background: linear-gradient(135deg, #743795 0%, #8b4ba8 100%);
                    border-color: #8b4ba8;
                    box-shadow: 0 0 16px rgba(139, 75, 168, 0.6);
                }

                .gmm-switch.active svg {
                    stroke: white;
                }

                .gmm-linkage-button {
                    width: 26px;
                    height: 26px;
                    border-radius: 6px;
                    background: rgba(116, 55, 149, 0.2);
                    border: 1px solid rgba(116, 55, 149, 0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                    cursor: pointer;
                    flex-shrink: 0;
                }

                .gmm-linkage-button svg {
                    width: 13px;
                    height: 13px;
                    stroke: #B0B0B0;
                    transition: all 0.2s ease;
                }

                .gmm-linkage-button:hover {
                    background: rgba(116, 55, 149, 0.4);
                    border-color: rgba(116, 55, 149, 0.5);
                    transform: scale(1.1);
                }

                .gmm-linkage-button:hover svg {
                    stroke: #E0E0E0;
                }

                .gmm-navigate-button {
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    background: rgba(74, 144, 226, 0.2);
                    border: 1px solid rgba(74, 144, 226, 0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                    cursor: pointer;
                    flex-shrink: 0;
                }

                .gmm-navigate-button svg {
                    width: 14px;
                    height: 14px;
                    stroke: #4A90E2;
                    transition: all 0.2s ease;
                }

                .gmm-navigate-button:hover {
                    background: rgba(74, 144, 226, 0.4);
                    border-color: rgba(74, 144, 226, 0.6);
                    transform: scale(1.15);
                }

                .gmm-navigate-button:hover svg {
                    stroke: #6FA8E8;
                }

                @keyframes gmmFadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(5px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                /* 联动配置对话框 */
                .gmm-linkage-dialog {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: #1e1e2e;
                    border: 1px solid rgba(116, 55, 149, 0.5);
                    border-radius: 12px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
                    padding: 20px;
                    min-width: 450px;
                    max-width: 600px;
                    max-height: 80vh;
                    overflow-y: auto;
                    z-index: 10000;
                }

                .gmm-dialog-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 20px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }

                .gmm-dialog-header h3 {
                    margin: 0;
                    font-size: 16px;
                    font-weight: 600;
                    color: #E0E0E0;
                    flex: 1;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    min-width: 0;
                    padding-right: 12px;
                }

                .gmm-dialog-close {
                    width: 28px;
                    height: 28px;
                    border-radius: 6px;
                    background: rgba(220, 38, 38, 0.2);
                    border: 1px solid rgba(220, 38, 38, 0.3);
                    color: #E0E0E0;
                    font-size: 20px;
                    line-height: 24px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .gmm-dialog-close:hover {
                    background: rgba(220, 38, 38, 0.4);
                    border-color: rgba(220, 38, 38, 0.5);
                }

                .gmm-linkage-section {
                    margin-bottom: 20px;
                }

                .gmm-section-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 10px;
                }

                .gmm-section-header span {
                    font-size: 14px;
                    font-weight: 600;
                    color: #B0B0B0;
                }

                .gmm-add-rule {
                    width: 24px;
                    height: 24px;
                    border-radius: 6px;
                    background: linear-gradient(135deg, #743795 0%, #8b4ba8 100%);
                    border: none;
                    color: white;
                    font-size: 18px;
                    line-height: 24px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .gmm-add-rule:hover {
                    background: linear-gradient(135deg, #8b4ba8 0%, #a35dbe 100%);
                    transform: scale(1.1);
                }

                .gmm-rules-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .gmm-rule-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px;
                    background: rgba(42, 42, 62, 0.6);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 6px;
                    animation: gmmFadeIn 0.3s ease-out;
                }

                .gmm-target-select,
                .gmm-action-select {
                    background: rgba(0, 0, 0, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 6px;
                    padding: 6px 10px;
                    color: #E0E0E0;
                    font-size: 13px;
                    transition: all 0.2s ease;
                    cursor: pointer;
                }

                .gmm-target-select {
                    flex: 1;
                    min-width: 0;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .gmm-action-select {
                    flex-shrink: 0;
                    width: 70px;
                }

                .gmm-target-select option,
                .gmm-action-select option {
                    background: rgba(42, 42, 62, 0.95);
                    color: #E0E0E0;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    max-width: 100%;
                }

                .gmm-target-select:focus,
                .gmm-action-select:focus {
                    outline: none;
                    border-color: #743795;
                    background: rgba(0, 0, 0, 0.3);
                }

                .gmm-delete-rule {
                    width: 28px;
                    height: 28px;
                    border-radius: 6px;
                    background: linear-gradient(135deg, rgba(220, 38, 38, 0.8) 0%, rgba(185, 28, 28, 0.8) 100%);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: white;
                    font-size: 16px;
                    line-height: 28px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    flex-shrink: 0;
                }

                .gmm-delete-rule:hover {
                    background: linear-gradient(135deg, rgba(239, 68, 68, 0.9) 0%, rgba(220, 38, 38, 0.9) 100%);
                    transform: scale(1.05);
                }

                .gmm-dialog-footer {
                    display: flex;
                    gap: 8px;
                    margin-top: 20px;
                    padding-top: 12px;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }

                .gmm-button {
                    flex: 1;
                    padding: 10px 16px;
                    background: linear-gradient(135deg, rgba(64, 64, 84, 0.8) 0%, rgba(74, 74, 94, 0.8) 100%);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    color: #E0E0E0;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 500;
                    transition: all 0.2s ease;
                }

                .gmm-button:hover {
                    background: linear-gradient(135deg, rgba(84, 84, 104, 0.9) 0%, rgba(94, 94, 114, 0.9) 100%);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                }

                .gmm-button-primary {
                    background: linear-gradient(135deg, #743795 0%, #8b4ba8 100%);
                }

                .gmm-button-primary:hover {
                    background: linear-gradient(135deg, #8b4ba8 0%, #a35dbe 100%);
                }
            `;
            document.head.appendChild(style);
        };

        // 绑定UI事件
        nodeType.prototype.bindUIEvents = function () {
            const container = this.customUI;

            // 刷新按钮
            const refreshButton = container.querySelector('#gmm-refresh');
            if (refreshButton) {
                refreshButton.addEventListener('click', () => {
                    this.refreshGroupsList();
                });
            }

            // 颜色过滤器
            const colorFilter = container.querySelector('#gmm-color-filter');
            if (colorFilter) {
                colorFilter.addEventListener('change', (e) => {
                    this.properties.selectedColorFilter = e.target.value;
                    this.updateGroupsList();
                });
            }
        };

        // 更新组列表显示
        nodeType.prototype.updateGroupsList = function () {
            const listContainer = this.customUI.querySelector('#gmm-groups-list');
            if (!listContainer) return;

            listContainer.innerHTML = '';

            // 获取工作流中的所有组（未过滤）
            const allWorkflowGroups = this.getWorkflowGroups();

            // 应用颜色过滤用于显示 (rgthree-comfy approach)
            let displayGroups = allWorkflowGroups;
            if (this.properties.selectedColorFilter) {
                let filterColor = this.properties.selectedColorFilter.trim().toLowerCase();

                // Convert color name to groupcolor hex
                if (typeof LGraphCanvas !== 'undefined' && LGraphCanvas.node_colors) {
                    if (LGraphCanvas.node_colors[filterColor]) {
                        filterColor = LGraphCanvas.node_colors[filterColor].groupcolor;
                    } else {
                        // Fallback: 尝试用下划线替换空格（处理 'pale blue' -> 'pale_blue' 的情况）
                        const underscoreColor = filterColor.replace(/\s+/g, '_');
                        if (LGraphCanvas.node_colors[underscoreColor]) {
                            filterColor = LGraphCanvas.node_colors[underscoreColor].groupcolor;
                        } else {
                            // 第二次fallback: 尝试去掉空格
                            const spacelessColor = filterColor.replace(/\s+/g, '');
                            if (LGraphCanvas.node_colors[spacelessColor]) {
                                filterColor = LGraphCanvas.node_colors[spacelessColor].groupcolor;
                            }
                        }
                    }
                }

                // Normalize to 6-digit lowercase hex
                filterColor = filterColor.replace("#", "").toLowerCase();
                if (filterColor.length === 3) {
                    filterColor = filterColor.replace(/(.)(.)(.)/, "$1$1$2$2$3$3");
                }
                filterColor = `#${filterColor}`;

                // Filter groups
                displayGroups = allWorkflowGroups.filter(group => {
                    if (!group.color) return false;
                    let groupColor = group.color.replace("#", "").trim().toLowerCase();
                    if (groupColor.length === 3) {
                        groupColor = groupColor.replace(/(.)(.)(.)/, "$1$1$2$2$3$3");
                    }
                    groupColor = `#${groupColor}`;
                    return groupColor === filterColor;
                });
            }

            // 为每个显示的组创建UI
            displayGroups.forEach(group => {
                // 查找或创建配置
                let groupConfig = this.properties.groups.find(g => g.group_name === group.title);
                if (!groupConfig) {
                    groupConfig = {
                        id: Date.now() + Math.random(),
                        group_name: group.title,
                        enabled: this.isGroupEnabled(group),
                        linkage: {
                            on_enable: [],
                            on_disable: []
                        }
                    };
                    this.properties.groups.push(groupConfig);
                } else {
                    // 更新状态
                    groupConfig.enabled = this.isGroupEnabled(group);
                }

                const groupItem = this.createGroupItem(groupConfig, group);
                listContainer.appendChild(groupItem);
            });

            // 清理不存在的组配置（使用完整的组列表，不受颜色过滤影响）
            this.properties.groups = this.properties.groups.filter(config =>
                allWorkflowGroups.some(g => g.title === config.group_name)
            );
        };

        // 获取工作流中的所有组
        nodeType.prototype.getWorkflowGroups = function () {
            if (!app.graph || !app.graph._groups) return [];
            return app.graph._groups.filter(g => g && g.title);
        };

        // 检查组是否启用
        nodeType.prototype.isGroupEnabled = function (group) {
            if (!group) return false;

            const nodes = this.getNodesInGroup(group);
            if (nodes.length === 0) return false;

            // 如果组内有任何节点是 ALWAYS 状态，则认为组是启用的
            return nodes.some(node => node.mode === 0); // LiteGraph.ALWAYS = 0
        };

        // 获取组内的所有节点
        nodeType.prototype.getNodesInGroup = function (group) {
            if (!group || !app.graph) return [];

            // 重新计算组内节点
            if (group.recomputeInsideNodes) {
                group.recomputeInsideNodes();
            }

            return group.nodes || [];
        };

        // 截断文本辅助函数
        nodeType.prototype.truncateText = function (text, maxLength = 30) {
            if (!text || text.length <= maxLength) return text;
            return text.substring(0, maxLength) + '...';
        };

        // 创建组项元素
        nodeType.prototype.createGroupItem = function (groupConfig, group) {
            const item = document.createElement('div');
            item.className = 'gmm-group-item';
            item.dataset.groupName = groupConfig.group_name;

            const displayName = this.truncateText(groupConfig.group_name, 30);
            const fullName = groupConfig.group_name || '';

            item.innerHTML = `
                <div class="gmm-group-header">
                    <span class="gmm-group-name" title="${fullName}">${displayName}</span>
                    <div class="gmm-switch ${groupConfig.enabled ? 'active' : ''}">
                        <svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                            <line x1="12" y1="2" x2="12" y2="12"></line>
                        </svg>
                    </div>
                    <div class="gmm-linkage-button">
                        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                    </div>
                    <div class="gmm-navigate-button" title="跳转到组">
                        <svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M5 12h14m-7-7l7 7-7 7"/>
                        </svg>
                    </div>
                </div>
            `;

            // 绑定开关点击事件
            const switchBtn = item.querySelector('.gmm-switch');
            switchBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleGroup(groupConfig.group_name, !groupConfig.enabled);
            });

            // 绑定联动配置按钮点击事件
            const linkageBtn = item.querySelector('.gmm-linkage-button');
            linkageBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showLinkageDialog(groupConfig);
            });

            // 绑定跳转按钮点击事件
            const navigateBtn = item.querySelector('.gmm-navigate-button');
            if (navigateBtn) {
                navigateBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.navigateToGroup(groupConfig.group_name);
                });
            }

            return item;
        };

        // 切换组状态（带联动）
        nodeType.prototype.toggleGroup = function (groupName, enable) {
            // 防止循环联动 - 在修改状态之前检查
            if (!this._processingStack) {
                this._processingStack = new Set();
            }

            if (this._processingStack.has(groupName)) {
                console.warn('[GMM] 检测到循环联动，跳过切换:', groupName, enable ? '开启' : '关闭');
                return;
            }

            console.log('[GMM] 切换组状态:', groupName, enable ? '开启' : '关闭');

            const group = app.graph._groups.find(g => g.title === groupName);
            if (!group) {
                console.warn('[GMM] 未找到组:', groupName);
                return;
            }

            // 获取组内节点
            const nodes = this.getNodesInGroup(group);
            if (nodes.length === 0) {
                console.warn('[GMM] 组内没有节点:', groupName);
                return;
            }

            // 添加到处理栈
            this._processingStack.add(groupName);

            try {
                // 切换节点模式
                nodes.forEach(node => {
                    // LiteGraph.ALWAYS = 0, LiteGraph.NEVER = 2
                    node.mode = enable ? 0 : 2;
                });

                // 更新配置
                const config = this.properties.groups.find(g => g.group_name === groupName);
                if (config) {
                    config.enabled = enable;
                }

                // 触发联动
                this.applyLinkage(groupName, enable);

                // 更新UI
                this.updateGroupsList();

                // 刷新画布
                app.graph.setDirtyCanvas(true, true);

                // 广播状态变化事件，通知其他节点刷新UI（使用 window 对象）
                const event = new CustomEvent('group-mute-changed', {
                    detail: {
                        sourceId: this._gmmInstanceId,
                        groupName: groupName,
                        enabled: enable,
                        timestamp: Date.now()
                    }
                });
                window.dispatchEvent(event);
                console.log('[GMM] 已广播状态变化事件');
            } finally {
                // 从处理栈中移除
                this._processingStack.delete(groupName);
            }
        };

        // 跳转到指定组
        nodeType.prototype.navigateToGroup = function (groupName) {
            console.log('[GMM] 跳转到组:', groupName);

            const group = app.graph._groups.find(g => g.title === groupName);
            if (!group) {
                console.warn('[GMM] 未找到组:', groupName);
                return;
            }

            const canvas = app.canvas;

            // 居中到组
            canvas.centerOnNode(group);

            // 计算合适的缩放比例
            const zoomCurrent = canvas.ds?.scale || 1;
            const zoomX = canvas.canvas.width / group._size[0] - 0.02;
            const zoomY = canvas.canvas.height / group._size[1] - 0.02;

            // 设置缩放（不超过当前缩放，确保能看到完整的组）
            canvas.setZoom(Math.min(zoomCurrent, zoomX, zoomY), [
                canvas.canvas.width / 2,
                canvas.canvas.height / 2,
            ]);

            // 刷新画布
            canvas.setDirty(true, true);

            console.log('[GMM] 跳转完成');
        };

        // 应用联动规则
        nodeType.prototype.applyLinkage = function (groupName, enabled) {
            const config = this.properties.groups.find(g => g.group_name === groupName);
            if (!config || !config.linkage) return;

            const rules = enabled ? config.linkage.on_enable : config.linkage.on_disable;
            if (!rules || !Array.isArray(rules)) return;

            console.log('[GMM] 应用联动规则:', groupName, '规则数:', rules.length);

            rules.forEach(rule => {
                const targetEnable = rule.action === "enable";
                console.log('[GMM] 联动:', rule.target_group, rule.action);
                this.toggleGroup(rule.target_group, targetEnable);
            });
        };

        // 显示联动配置对话框
        nodeType.prototype.showLinkageDialog = function (groupConfig) {
            console.log('[GMM] 显示联动配置对话框:', groupConfig.group_name);

            // 创建对话框
            const dialog = document.createElement('div');
            dialog.className = 'gmm-linkage-dialog';

            const displayName = this.truncateText(groupConfig.group_name, 25);
            const fullName = groupConfig.group_name || '';

            dialog.innerHTML = `
                <div class="gmm-dialog-header">
                    <h3 title="${fullName}">联动配置：${displayName}</h3>
                    <button class="gmm-dialog-close">×</button>
                </div>

                <div class="gmm-linkage-section">
                    <div class="gmm-section-header">
                        <span>组开启时</span>
                        <button class="gmm-add-rule" data-type="on_enable">+</button>
                    </div>
                    <div class="gmm-rules-list" id="gmm-rules-enable"></div>
                </div>

                <div class="gmm-linkage-section">
                    <div class="gmm-section-header">
                        <span>组关闭时</span>
                        <button class="gmm-add-rule" data-type="on_disable">+</button>
                    </div>
                    <div class="gmm-rules-list" id="gmm-rules-disable"></div>
                </div>

                <div class="gmm-dialog-footer">
                    <button class="gmm-button" id="gmm-cancel">取消</button>
                    <button class="gmm-button gmm-button-primary" id="gmm-save">保存</button>
                </div>
            `;

            document.body.appendChild(dialog);

            // 阻止对话框内部点击事件冒泡到外部
            dialog.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            // 临时配置副本
            const tempConfig = JSON.parse(JSON.stringify(groupConfig));

            // 渲染现有规则
            this.renderRules(dialog, tempConfig, 'on_enable');
            this.renderRules(dialog, tempConfig, 'on_disable');

            // 绑定添加规则按钮
            dialog.querySelectorAll('.gmm-add-rule').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const type = btn.dataset.type;
                    this.addRule(dialog, tempConfig, type);
                });
            });

            // 绑定关闭按钮
            dialog.querySelector('.gmm-dialog-close').addEventListener('click', (e) => {
                e.stopPropagation();
                dialog.remove();
            });

            // 绑定取消按钮
            dialog.querySelector('#gmm-cancel').addEventListener('click', (e) => {
                e.stopPropagation();
                dialog.remove();
            });

            // 绑定保存按钮
            dialog.querySelector('#gmm-save').addEventListener('click', (e) => {
                e.stopPropagation();
                // 保存配置
                const originalConfig = this.properties.groups.find(g => g.group_name === groupConfig.group_name);
                if (originalConfig) {
                    originalConfig.linkage = tempConfig.linkage;
                }
                console.log('[GMM] 保存联动配置:', tempConfig.linkage);
                dialog.remove();
            });

            // 点击对话框外部关闭
            setTimeout(() => {
                const closeOnOutsideClick = (e) => {
                    if (!dialog.contains(e.target)) {
                        dialog.remove();
                        document.removeEventListener('click', closeOnOutsideClick);
                    }
                };
                document.addEventListener('click', closeOnOutsideClick);
            }, 100);
        };

        // 渲染规则列表
        nodeType.prototype.renderRules = function (dialog, config, type) {
            const listId = type === 'on_enable' ? 'gmm-rules-enable' : 'gmm-rules-disable';
            const list = dialog.querySelector(`#${listId}`);
            if (!list) return;

            list.innerHTML = '';

            const rules = config.linkage[type] || [];
            rules.forEach((rule, index) => {
                const ruleItem = this.createRuleItem(dialog, config, type, rule, index);
                list.appendChild(ruleItem);
            });
        };

        // 截断文本辅助函数
        nodeType.prototype.truncateText = function (text, maxLength = 30) {
            if (!text || text.length <= maxLength) return text;
            return text.substring(0, maxLength) + '...';
        };

        // 创建规则项
        nodeType.prototype.createRuleItem = function (dialog, config, type, rule, index) {
            const item = document.createElement('div');
            item.className = 'gmm-rule-item';

            // 获取可用组列表（排除当前组）
            const availableGroups = this.getWorkflowGroups()
                .filter(g => g.title !== config.group_name)
                .map(g => g.title)
                .sort((a, b) => a.localeCompare(b, 'zh-CN'));

            const groupOptions = availableGroups.map(name => {
                const selected = name === rule.target_group ? 'selected' : '';
                const displayName = this.truncateText(name, 30);
                return `<option value="${name}" ${selected} title="${name}">${displayName}</option>`;
            }).join('');

            item.innerHTML = `
                <select class="gmm-target-select">
                    ${groupOptions}
                </select>
                <select class="gmm-action-select">
                    <option value="enable" ${rule.action === 'enable' ? 'selected' : ''}>开启</option>
                    <option value="disable" ${rule.action === 'disable' ? 'selected' : ''}>关闭</option>
                </select>
                <button class="gmm-delete-rule">×</button>
            `;

            // 绑定目标组选择
            const targetSelect = item.querySelector('.gmm-target-select');
            targetSelect.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            targetSelect.addEventListener('change', (e) => {
                e.stopPropagation();
                rule.target_group = e.target.value;
            });

            // 绑定动作选择
            const actionSelect = item.querySelector('.gmm-action-select');
            actionSelect.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            actionSelect.addEventListener('change', (e) => {
                e.stopPropagation();
                rule.action = e.target.value;
            });

            // 绑定删除按钮
            item.querySelector('.gmm-delete-rule').addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                config.linkage[type].splice(index, 1);
                this.renderRules(dialog, config, type);
            });

            return item;
        };

        // 添加规则
        nodeType.prototype.addRule = function (dialog, config, type) {
            // 获取可用组列表（排除当前组）
            const availableGroups = this.getWorkflowGroups()
                .filter(g => g.title !== config.group_name)
                .sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));

            if (availableGroups.length === 0) {
                console.warn('[GMM] 没有可用的目标组');
                return;
            }

            const newRule = {
                target_group: availableGroups[0].title,
                action: "enable"
            };

            config.linkage[type].push(newRule);
            this.renderRules(dialog, config, type);
        };

        // 刷新组列表
        nodeType.prototype.refreshGroupsList = function () {
            console.log('[GMM] 刷新组列表');
            this.refreshColorFilter();
            this.updateGroupsList();
        };

        // 获取ComfyUI内置颜色列表
        nodeType.prototype.getAvailableGroupColors = function () {
            const builtinColors = [
                'red', 'brown', 'green', 'blue', 'pale blue',
                'cyan', 'purple', 'yellow', 'black'
            ];
            return builtinColors;
        };


        // 刷新颜色过滤器选项
        nodeType.prototype.refreshColorFilter = function () {
            const colorFilter = this.customUI.querySelector('#gmm-color-filter');
            if (!colorFilter) return;

            const currentValue = colorFilter.value;

            const builtinColors = this.getAvailableGroupColors();

            let options = [];

            builtinColors.forEach(colorName => {
                const displayName = this.getColorDisplayName(colorName);
                const isSelected = currentValue === colorName;
                const selectedAttr = isSelected ? 'selected' : '';

                // Direct LGraphCanvas lookup
                let hexColor = null;
                if (typeof LGraphCanvas !== 'undefined' && LGraphCanvas.node_colors) {
                    const normalizedName = colorName.toLowerCase();
                    if (LGraphCanvas.node_colors[normalizedName]) {
                        hexColor = LGraphCanvas.node_colors[normalizedName].groupcolor;
                    } else {
                        // Fallback: 尝试用下划线替换空格（处理 'pale blue' -> 'pale_blue' 的情况）
                        const underscoreColor = normalizedName.replace(/\s+/g, '_');
                        if (LGraphCanvas.node_colors[underscoreColor]) {
                            hexColor = LGraphCanvas.node_colors[underscoreColor].groupcolor;
                        } else {
                            // 第二次fallback: 尝试去掉空格
                            const spacelessColor = normalizedName.replace(/\s+/g, '');
                            if (LGraphCanvas.node_colors[spacelessColor]) {
                                hexColor = LGraphCanvas.node_colors[spacelessColor].groupcolor;
                            }
                        }
                    }
                }

                if (hexColor) {
                    options.push(`<option value="${colorName}" ${selectedAttr} style="background-color: ${hexColor}; color: ${this.getContrastColor(hexColor)};">${displayName}</option>`);
                } else {
                    options.push(`<option value="${colorName}" ${selectedAttr}>${displayName}</option>`);
                }
            });

            const allOptions = [
                `<option value="">所有颜色</option>`,
                ...options
            ].join('');

            colorFilter.innerHTML = allOptions;

            const validValues = ['', ...builtinColors];
            if (currentValue && !validValues.includes(currentValue)) {
                colorFilter.value = '';
                this.properties.selectedColorFilter = '';
            }
        };

        // 获取颜色显示名称
        nodeType.prototype.getColorDisplayName = function (color) {
            if (!color) return '所有颜色';

            const builtinColors = ['red', 'brown', 'green', 'blue', 'pale blue', 'cyan', 'purple', 'yellow', 'black'];
            if (builtinColors.includes(color.toLowerCase())) {
                const formattedName = color.toLowerCase();
                return formattedName.charAt(0).toUpperCase() + formattedName.slice(1);
            }

            return color;
        };

        // 获取对比色
        nodeType.prototype.getContrastColor = function (hexColor) {
            if (!hexColor) return '#E0E0E0';

            const color = hexColor.replace('#', '');

            const r = parseInt(color.substr(0, 2), 16);
            const g = parseInt(color.substr(2, 2), 16);
            const b = parseInt(color.substr(4, 2), 16);

            const brightness = (r * 299 + g * 587 + b * 114) / 1000;

            return brightness > 128 ? '#000000' : '#FFFFFF';
        };

        // 序列化节点数据
        const onSerialize = nodeType.prototype.onSerialize;
        nodeType.prototype.onSerialize = function (info) {
            const data = onSerialize?.apply?.(this, arguments);

            // 保存组配置到工作流 JSON
            info.groups = this.properties.groups || [];
            info.selectedColorFilter = this.properties.selectedColorFilter || '';

            console.log('[GMM-Serialize] 保存组配置:', info.groups.length, '个组');

            return data;
        };

        // 反序列化节点数据
        const onConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function (info) {
            onConfigure?.apply?.(this, arguments);

            // 从工作流 JSON 恢复组配置
            if (info.groups && Array.isArray(info.groups)) {
                this.properties.groups = info.groups;
                console.log('[GMM-Configure] 恢复组配置:', info.groups.length, '个组');
            }

            // 恢复颜色过滤器
            if (info.selectedColorFilter !== undefined && typeof info.selectedColorFilter === 'string') {
                this.properties.selectedColorFilter = info.selectedColorFilter;
            } else {
                this.properties.selectedColorFilter = '';
            }

            // 等待UI准备就绪后更新界面
            if (this.customUI) {
                setTimeout(() => {
                    this.refreshColorFilter();
                    this.updateGroupsList();

                    // 恢复颜色过滤器选择
                    const colorFilter = this.customUI.querySelector('#gmm-color-filter');
                    if (colorFilter) {
                        colorFilter.value = this.properties.selectedColorFilter || '';
                    }
                }, 100);
            }
        };

        // 节点被移除时清理资源
        const onRemoved = nodeType.prototype.onRemoved;
        nodeType.prototype.onRemoved = function () {
            console.log('[GMM] 清理节点资源:', this.id);

            // 移除事件监听器（使用 window 对象）
            if (this._gmmEventHandler) {
                window.removeEventListener('group-mute-changed', this._gmmEventHandler);
                this._gmmEventHandler = null;
                console.log('[GMM] 已移除事件监听器');
            }

            // 清理自定义属性
            this.properties = { groups: [], selectedColorFilter: '' };

            // 调用原始移除方法
            onRemoved?.apply?.(this, arguments);
        };
    }
});

console.log('[GMM] 组静音管理器已加载');
