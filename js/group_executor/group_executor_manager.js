/**
 * 组执行管理器 - Group Executor Manager
 * 负责配置界面，不负责执行（执行由GroupExecutorSender负责）
 */

import { app } from "/scripts/app.js";

// Debug辅助函数
const COMPONENT_NAME = 'group_executor_manager';
const debugLog = (...args) => {
    if (window.shouldDebug && window.shouldDebug(COMPONENT_NAME)) {
        console.log(...args);
    }
};

// 组执行管理器（配置节点）
app.registerExtension({
    name: "GroupExecutorManager",

    async init(app) {
        debugLog('[GEM-UI] 初始化组执行管理器配置界面');
    },

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== "GroupExecutorManager") return;

        // 节点创建时的处理
        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            const result = onNodeCreated?.apply(this, arguments);

            // 初始化节点属性
            this.properties = {
                isExecuting: false,
                groups: [],
                selectedColorFilter: '',
                locked: false  // 锁定模式状态
            };

            // 🔴 初始化组对象引用跟踪（用于支持组重命名）
            this.groupReferences = new WeakMap();

            // 设置节点初始大小
            this.size = [450, 600];

            // 隐藏group_config文本框widget
            setTimeout(() => {
                const configWidget = this.widgets?.find(w => w.name === "group_config");
                if (configWidget) {
                    configWidget.type = "converted-widget";
                    configWidget.computeSize = () => [0, -4];
                }
            }, 1);

            // 创建自定义UI
            this.createCustomUI();

            return result;
        };

        // 创建自定义UI
        nodeType.prototype.createCustomUI = function () {
            try {
                console.log('[SimplifiedGEM-UI] 开始创建自定义UI:', this.id);

                const container = document.createElement('div');
                container.className = 'gem-container';

                // 创建样式
                this.addStyles();

                // 创建布局
                container.innerHTML = `
                <div class="gem-content">
                    <div class="gem-groups-header">
                        <span class="gem-groups-title">组执行管理器</span>
                        <div class="gem-header-controls">
                            <div class="gem-color-filter-container" id="gem-color-filter-container">
                                <span class="gem-filter-label">颜色过滤</span>
                                <select class="gem-color-filter-select" id="gem-color-filter" title="按颜色过滤组">
                                    <option value="">所有颜色</option>
                                </select>
                            </div>
                            <button class="gem-lock-button" id="gem-lock-button" title="锁定模式（双击切换）">🔒</button>
                            <button class="gem-refresh-button" id="gem-refresh" title="刷新">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="23 4 23 10 17 10"></polyline>
                                    <polyline points="1 20 1 14 7 14"></polyline>
                                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="gem-groups-list" id="gem-groups-list"></div>
                    <div class="gem-add-group-container">
                        <button class="gem-button gem-button-primary" id="gem-add-group">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            <span>添加组</span>
                        </button>
                    </div>
                </div>
            `;

                // 添加到节点的自定义widget
                this.addDOMWidget("gem_ui", "div", container);
                this.customUI = container;

                // 绑定事件
                this.bindUIEvents();

                // 初始化组列表
                this.updateGroupsList();

                // 立即初始化颜色过滤器
                setTimeout(() => {
                    this.refreshColorFilter();
                }, 50);

                // 从widget的group_config中加载初始数据
                setTimeout(() => {
                    this.loadConfigFromWidget();
                }, 100);

                // 从后端API加载配置
                setTimeout(() => {
                    this.loadConfigFromBackend();
                }, 150);

                // 监听图表变化，自动刷新组列表
                this.setupGraphChangeListener();

                console.log('[SimplifiedGEM-UI] 自定义UI创建完成');

            } catch (error) {
                console.error('[SimplifiedGEM-UI] 创建自定义UI时出错:', error);

                // 创建一个简单的错误提示UI
                const errorContainer = document.createElement('div');
                errorContainer.style.cssText = `
                    padding: 20px;
                    text-align: center;
                    color: #ff6b6b;
                    font-family: Arial, sans-serif;
                `;
                errorContainer.innerHTML = `
                    <h3>UI 创建失败</h3>
                    <p>错误: ${error.message}</p>
                    <small>请检查控制台获取更多信息</small>
                `;

                this.addDOMWidget("gem_ui_error", "div", errorContainer);
                this.customUI = errorContainer;
            }
        };

        // 添加样式
        nodeType.prototype.addStyles = function () {
            if (document.querySelector('#gem-styles')) return;

            const style = document.createElement('style');
            style.id = 'gem-styles';
            style.textContent = `
                .gem-container {
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

                .gem-content {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    background: rgba(30, 30, 46, 0.5);
                }

                .gem-groups-header {
                    padding: 12px 20px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .gem-header-controls {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .gem-color-filter-container {
                    position: relative;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .gem-filter-label {
                    font-size: 12px;
                    color: #B0B0B0;
                    white-space: nowrap;
                    font-weight: 500;
                }

                .gem-color-filter-select {
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

                .gem-color-filter-select:focus {
                    outline: none;
                    border-color: #743795;
                    background: rgba(0, 0, 0, 0.3);
                }

                .gem-groups-title {
                    font-size: 12px;
                    font-weight: 500;
                    color: #B0B0B0;
                }

                .gem-refresh-button {
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

                .gem-refresh-button:hover {
                    background: rgba(116, 55, 149, 0.4);
                    border-color: rgba(116, 55, 149, 0.5);
                }

                .gem-refresh-button svg {
                    stroke: #B0B0B0;
                }

                .gem-lock-button {
                    background: rgba(100, 100, 120, 0.2);
                    border: 1px solid rgba(100, 100, 120, 0.3);
                    border-radius: 4px;
                    padding: 4px 8px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-size: 14px;
                    min-width: 32px;
                    opacity: 0.5;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .gem-lock-button:hover {
                    opacity: 0.8;
                    background: rgba(100, 100, 120, 0.3);
                }

                .gem-lock-button.locked {
                    opacity: 1;
                    background: rgba(255, 193, 7, 0.3);
                    border-color: rgba(255, 193, 7, 0.5);
                    box-shadow: 0 0 10px rgba(255, 193, 7, 0.3);
                }

                .gem-groups-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 8px;
                }

                .gem-groups-list::-webkit-scrollbar {
                    width: 8px;
                }

                .gem-groups-list::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.1);
                    border-radius: 4px;
                }

                .gem-groups-list::-webkit-scrollbar-thumb {
                    background: rgba(116, 55, 149, 0.5);
                    border-radius: 4px;
                }

                .gem-groups-list::-webkit-scrollbar-thumb:hover {
                    background: rgba(116, 55, 149, 0.7);
                }

                .gem-group-item {
                    background: linear-gradient(135deg, rgba(42, 42, 62, 0.6) 0%, rgba(58, 58, 78, 0.6) 100%);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    padding: 12px;
                    margin-bottom: 8px;
                    transition: all 0.2s ease;
                    cursor: move;
                    position: relative;
                    z-index: 1;
                }

                .gem-group-item:hover {
                    border-color: rgba(116, 55, 149, 0.5);
                    box-shadow: 0 2px 8px rgba(116, 55, 149, 0.2);
                    transform: translateY(-1px);
                }

                .gem-group-item.dropdown-active {
                    z-index: 9999;
                }

                .gem-group-item.dragging {
                    opacity: 0.5;
                }

                .gem-group-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .gem-group-number {
                    width: 24px;
                    height: 24px;
                    background: linear-gradient(135deg, #743795 0%, #8b4ba8 100%);
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    font-weight: 600;
                    color: white;
                    flex-shrink: 0;
                }

                .gem-group-name-select {
                    flex: 1;
                    background: rgba(116, 55, 149, 0.3);
                    border: 1px solid rgba(116, 55, 149, 0.5);
                    border-radius: 6px;
                    padding: 6px 10px;
                    color: #E0E0E0;
                    font-size: 13px;
                    transition: all 0.2s ease;
                    cursor: pointer;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    min-width: 0;
                }

                .gem-group-name-select option {
                    background: rgba(42, 42, 62, 0.95);
                    color: #E0E0E0;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .gem-group-name-select:focus {
                    outline: none;
                    border-color: #8b4ba8;
                    background: rgba(116, 55, 149, 0.4);
                }

                /* 下拉框容器 */
                .gem-dropdown-container {
                    flex: 1;
                    min-width: 0;
                    display: flex;
                }

                /* 可搜索下拉框样式 */
                .gem-searchable-dropdown {
                    flex: 1;
                    position: relative;
                    min-width: 0;
                    outline: none;
                }

                .gem-dropdown-display {
                    background: rgba(116, 55, 149, 0.3);
                    border: 1px solid rgba(116, 55, 149, 0.5);
                    border-radius: 6px;
                    padding: 6px 28px 6px 10px;
                    color: #E0E0E0;
                    font-size: 13px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    position: relative;
                    user-select: none;
                }

                .gem-dropdown-display:hover {
                    border-color: #8b4ba8;
                    background: rgba(116, 55, 149, 0.4);
                }

                .gem-dropdown-display.active {
                    border-color: #8b4ba8;
                    background: rgba(116, 55, 149, 0.4);
                    border-bottom-left-radius: 0;
                    border-bottom-right-radius: 0;
                }

                .gem-dropdown-display.placeholder {
                    color: #B0B0B0;
                }

                .gem-dropdown-arrow {
                    position: absolute;
                    right: 8px;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 0;
                    height: 0;
                    border-left: 4px solid transparent;
                    border-right: 4px solid transparent;
                    border-top: 5px solid #E0E0E0;
                    transition: transform 0.2s ease;
                }

                .gem-dropdown-display.active .gem-dropdown-arrow {
                    transform: translateY(-50%) rotate(180deg);
                }

                .gem-dropdown-panel {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: rgba(30, 30, 46, 1);
                    border: 1px solid rgba(116, 55, 149, 0.5);
                    border-top: none;
                    border-radius: 0 0 6px 6px;
                    max-height: 350px;
                    overflow: hidden;
                    z-index: 10000;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                    display: none;
                    outline: none;
                }

                .gem-dropdown-panel.active {
                    display: block;
                    animation: gemDropdownFadeIn 0.15s ease-out;
                }

                @keyframes gemDropdownFadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(-5px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .gem-dropdown-search {
                    padding: 8px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    position: sticky;
                    top: 0;
                    background: rgba(30, 30, 46, 1);
                    z-index: 10001;
                    outline: none;
                }

                .gem-dropdown-search-input {
                    width: 100%;
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                    padding: 6px 8px;
                    color: #E0E0E0;
                    font-size: 12px;
                    outline: none;
                    transition: all 0.2s ease;
                }

                .gem-dropdown-search-input:focus {
                    border-color: #743795;
                    background: rgba(0, 0, 0, 0.4);
                }

                .gem-dropdown-search-input::placeholder {
                    color: #B0B0B0;
                }

                .gem-dropdown-list {
                    max-height: 300px;
                    overflow-y: auto;
                    outline: none;
                }

                .gem-dropdown-list::-webkit-scrollbar {
                    width: 6px;
                }

                .gem-dropdown-list::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.1);
                }

                .gem-dropdown-list::-webkit-scrollbar-thumb {
                    background: rgba(116, 55, 149, 0.5);
                    border-radius: 3px;
                }

                .gem-dropdown-list::-webkit-scrollbar-thumb:hover {
                    background: rgba(116, 55, 149, 0.7);
                }

                .gem-dropdown-item {
                    padding: 8px 12px;
                    cursor: pointer;
                    transition: all 0.1s ease;
                    color: #E0E0E0;
                    font-size: 13px;
                    outline: none;
                    background: #1e1e2e;
                }

                .gem-dropdown-item:hover {
                    background: linear-gradient(135deg, #5a3776 0%, #6d4489 100%);
                }

                .gem-dropdown-item.selected {
                    background: linear-gradient(135deg, #743795 0%, #8b4ba8 100%);
                    font-weight: 500;
                }

                .gem-dropdown-item.highlight {
                    background: linear-gradient(135deg, #684184 0%, #7c4e98 100%);
                }

                .gem-dropdown-item mark {
                    background: rgba(255, 215, 0, 0.3);
                    color: #FFD700;
                    padding: 0 2px;
                    border-radius: 2px;
                }

                .gem-dropdown-empty {
                    padding: 12px;
                    text-align: center;
                    color: #B0B0B0;
                    font-size: 12px;
                }

                .gem-delete-button {
                    background: linear-gradient(135deg, rgba(220, 38, 38, 0.8) 0%, rgba(185, 28, 28, 0.8) 100%);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 6px;
                    padding: 6px 8px;
                    color: white;
                    font-size: 12px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    flex-shrink: 0;
                }

                .gem-delete-button:hover {
                    background: linear-gradient(135deg, rgba(239, 68, 68, 0.9) 0%, rgba(220, 38, 38, 0.9) 100%);
                    transform: scale(1.05);
                }

                .gem-delete-button span {
                    display: none;
                }

                .gem-add-group-container {
                    padding: 12px;
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                    display: flex;
                    gap: 8px;
                }

                .gem-button {
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
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                }

                .gem-button:hover {
                    background: linear-gradient(135deg, rgba(84, 84, 104, 0.9) 0%, rgba(94, 94, 114, 0.9) 100%);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                }

                .gem-button-primary {
                    background: linear-gradient(135deg, #743795 0%, #8b4ba8 100%);
                }

                .gem-button-primary:hover {
                    background: linear-gradient(135deg, #8b4ba8 0%, #a35dbe 100%);
                }

                @keyframes gemFadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(5px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .gem-group-item {
                    animation: gemFadeIn 0.3s ease-out;
                }
            `;
            document.head.appendChild(style);
        };

        // 绑定UI事件
        nodeType.prototype.bindUIEvents = function () {
            const container = this.customUI;

            // 添加组按钮
            const addButton = container.querySelector('#gem-add-group');
            addButton.addEventListener('click', () => {
                this.addGroup();
            });

            // 刷新按钮
            const refreshButton = container.querySelector('#gem-refresh');
            refreshButton.addEventListener('click', () => {
                this.refreshGroupsList();
            });

            // 锁定按钮 - 双击切换锁定状态
            const lockButton = container.querySelector('#gem-lock-button');
            if (lockButton) {
                lockButton.addEventListener('dblclick', () => {
                    this.toggleLock();
                });
            }

            // 颜色过滤器
            const colorFilter = container.querySelector('#gem-color-filter');
            if (colorFilter) {
                colorFilter.addEventListener('change', (e) => {
                    this.properties.selectedColorFilter = e.target.value;
                    this.refreshGroupsList();
                });
            }
        };

        // 添加组
        nodeType.prototype.addGroup = function () {
            const newGroup = {
                id: Date.now(),
                group_name: ''
            };

            this.properties.groups.push(newGroup);
            this.updateGroupsList();
            this.syncConfig();
        };

        // 删除组
        nodeType.prototype.deleteGroup = function (groupId) {
            const index = this.properties.groups.findIndex(g => g.id === groupId);
            if (index !== -1) {
                this.properties.groups.splice(index, 1);
                this.updateGroupsList();
                this.syncConfig();
            }
        };

        // 更新组列表显示
        nodeType.prototype.updateGroupsList = function () {
            const listContainer = this.customUI.querySelector('#gem-groups-list');
            listContainer.innerHTML = '';

            this.properties.groups.forEach((group, index) => {
                const groupItem = this.createGroupItem(group, index);
                listContainer.appendChild(groupItem);
            });
        };

        // 获取工作流中的所有组（支持颜色过滤 - 采用rgthree-comfy的简洁实现）
        nodeType.prototype.getAvailableGroups = function () {
            if (!app.graph || !app.graph._groups) return [];

            let groups = app.graph._groups.filter(g => g && g.title);

            // 应用颜色过滤（采用rgthree-comfy的简洁方法）
            if (this.properties.selectedColorFilter) {
                // 标准化过滤器颜色
                let filterColor = this.properties.selectedColorFilter.trim().toLowerCase();

                // 如果是颜色名称，从LGraphCanvas转换为groupcolor十六进制值
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

                // 标准化为6位小写十六进制 (#f55 -> #ff5555)
                filterColor = filterColor.replace("#", "").toLowerCase();
                if (filterColor.length === 3) {
                    filterColor = filterColor.replace(/(.)(.)(.)/, "$1$1$2$2$3$3");
                }
                filterColor = `#${filterColor}`;

                // 过滤组
                groups = groups.filter(g => {
                    if (!g.color) return false;

                    // 标准化组颜色
                    let groupColor = g.color.replace("#", "").trim().toLowerCase();
                    if (groupColor.length === 3) {
                        groupColor = groupColor.replace(/(.)(.)(.)/, "$1$1$2$2$3$3");
                    }
                    groupColor = `#${groupColor}`;

                    // 简单匹配
                    return groupColor === filterColor;
                });
            }

            return groups
                .map(g => g.title)
                .sort((a, b) => a.localeCompare(b));
        };

        // 获取ComfyUI内置颜色列表
        nodeType.prototype.getAvailableGroupColors = function () {
            // 只返回ComfyUI内置颜色
            const builtinColors = [
                'red', 'brown', 'green', 'blue', 'pale blue',
                'cyan', 'purple', 'yellow', 'black'
            ];

            return builtinColors;
        };

        // 刷新颜色过滤器选项（简化版 - 直接从LGraphCanvas获取颜色）
        nodeType.prototype.refreshColorFilter = function () {
            const colorFilter = this.customUI.querySelector('#gem-color-filter');
            if (!colorFilter) return;

            // 保存当前选中的值
            const currentValue = colorFilter.value;

            // 获取ComfyUI内置颜色
            const builtinColors = this.getAvailableGroupColors();

            let options = [];

            // 添加ComfyUI内置颜色选项
            builtinColors.forEach(colorName => {
                const displayName = this.getColorDisplayName(colorName);
                const isSelected = currentValue === colorName;
                const selectedAttr = isSelected ? 'selected' : '';

                // 直接从LGraphCanvas获取groupcolor十六进制值
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

                // 如果获取到颜色值，添加背景色样式
                if (hexColor) {
                    options.push(`<option value="${colorName}" ${selectedAttr} style="background-color: ${hexColor}; color: ${this.getContrastColor(hexColor)};">${displayName}</option>`);
                } else {
                    // 如果无法获取颜色值，只显示名称
                    options.push(`<option value="${colorName}" ${selectedAttr}>${displayName}</option>`);
                }
            });

            // 构建最终的选项HTML
            const allOptions = [
                `<option value="">所有颜色</option>`,
                ...options
            ].join('');

            colorFilter.innerHTML = allOptions;

            // 如果当前值不在新的颜色列表中，清空选择
            const validValues = ['', ...builtinColors];
            if (currentValue && !validValues.includes(currentValue)) {
                colorFilter.value = '';
                this.properties.selectedColorFilter = '';
            }
        };

        // 获取颜色显示名称
        nodeType.prototype.getColorDisplayName = function (color) {
            if (!color) return '所有颜色';

            // 如果是颜色名称，返回首字母大写的格式
            const builtinColors = ['red', 'brown', 'green', 'blue', 'pale blue', 'cyan', 'purple', 'yellow', 'black'];
            if (builtinColors.includes(color.toLowerCase())) {
                const formattedName = color.toLowerCase();
                return formattedName.charAt(0).toUpperCase() + formattedName.slice(1);
            }

            // 默认返回原始值
            return color;
        };

        // 获取对比色（用于文本颜色）
        nodeType.prototype.getContrastColor = function (hexColor) {
            if (!hexColor) return '#E0E0E0';

            // 移除 # 号
            const color = hexColor.replace('#', '');

            // 转换为 RGB
            const r = parseInt(color.substr(0, 2), 16);
            const g = parseInt(color.substr(2, 2), 16);
            const b = parseInt(color.substr(4, 2), 16);

            // 计算亮度
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;

            // 根据亮度返回对比色
            return brightness > 128 ? '#000000' : '#FFFFFF';
        };

        // 截断文本辅助函数
        nodeType.prototype.truncateText = function (text, maxLength = 30) {
            if (!text || text.length <= maxLength) return text;
            return text.substring(0, maxLength) + '...';
        };

        // Toast提示方法
        nodeType.prototype.showToast = function (message, type = 'info') {
            try {
                if (typeof globalToastManager !== 'undefined') {
                    globalToastManager.showToast(message, type, 3000);
                } else {
                    console.log('[GEM] Toast:', message);
                }
            } catch (error) {
                console.error('[GEM] Toast显示失败:', error);
            }
        };

        // 切换锁定模式
        nodeType.prototype.toggleLock = function () {
            this.properties.locked = !this.properties.locked;

            // 更新UI
            this.updateLockUI();

            // 显示提示
            if (this.properties.locked) {
                this.showToast('已开启锁定模式', 'success');
                console.log('[GEM] 锁定模式已开启');
            } else {
                this.showToast('已关闭锁定模式', 'success');
                console.log('[GEM] 锁定模式已关闭');
            }
        };

        // 根据当前锁定状态更新UI（不改变锁定状态值）
        nodeType.prototype.updateLockUI = function () {
            if (!this.customUI) return;

            const lockButton = this.customUI.querySelector('#gem-lock-button');
            const addButton = this.customUI.querySelector('#gem-add-group');

            if (!lockButton || !addButton) return;

            if (this.properties.locked) {
                // 应用锁定模式UI
                lockButton.classList.add('locked');
                addButton.style.display = 'none';
            } else {
                // 应用解锁模式UI
                lockButton.classList.remove('locked');
                addButton.style.display = '';
            }

            // 重新渲染组列表以应用锁定状态到每个组项
            if (this.properties.groups && this.properties.groups.length > 0) {
                this.updateGroupsList();
            }
        };

        // 创建可搜索下拉框
        nodeType.prototype.createSearchableDropdown = function (options, currentValue, onChange) {
            const container = document.createElement('div');
            container.className = 'gem-searchable-dropdown';

            // 保存节点引用和父元素引用
            const node = this;
            let parentItem = null;

            // 创建显示框
            const display = document.createElement('div');
            display.className = 'gem-dropdown-display';
            if (!currentValue) {
                display.classList.add('placeholder');
            }
            display.textContent = currentValue || '选择组';
            display.title = currentValue || '选择组';

            // 添加下拉箭头
            const arrow = document.createElement('div');
            arrow.className = 'gem-dropdown-arrow';
            display.appendChild(arrow);

            // 创建下拉面板
            const panel = document.createElement('div');
            panel.className = 'gem-dropdown-panel';

            // 创建搜索框
            const searchContainer = document.createElement('div');
            searchContainer.className = 'gem-dropdown-search';
            const searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.className = 'gem-dropdown-search-input';
            searchInput.placeholder = '搜索组名...';
            searchContainer.appendChild(searchInput);
            panel.appendChild(searchContainer);

            // 创建列表容器
            const listContainer = document.createElement('div');
            listContainer.className = 'gem-dropdown-list';
            panel.appendChild(listContainer);

            // 渲染列表项
            const renderList = (filterText = '') => {
                listContainer.innerHTML = '';
                const normalizedFilter = filterText.toLowerCase().trim();

                // 过滤选项
                const filteredOptions = options.filter(opt =>
                    opt.toLowerCase().includes(normalizedFilter)
                );

                if (filteredOptions.length === 0) {
                    const emptyDiv = document.createElement('div');
                    emptyDiv.className = 'gem-dropdown-empty';
                    emptyDiv.textContent = '没有匹配的组';
                    listContainer.appendChild(emptyDiv);
                    return;
                }

                // 创建列表项
                filteredOptions.forEach(option => {
                    const item = document.createElement('div');
                    item.className = 'gem-dropdown-item';
                    if (option === currentValue) {
                        item.classList.add('selected');
                    }

                    // 高亮匹配文本
                    if (normalizedFilter) {
                        const regex = new RegExp(`(${normalizedFilter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                        item.innerHTML = option.replace(regex, '<mark>$1</mark>');
                    } else {
                        item.textContent = option;
                    }

                    // 点击选择
                    item.addEventListener('click', (e) => {
                        e.stopPropagation();
                        currentValue = option;
                        display.textContent = option;
                        display.title = option;
                        display.classList.remove('placeholder');
                        closePanel();
                        onChange(option);
                    });

                    listContainer.appendChild(item);
                });
            };

            // 打开/关闭面板
            const openPanel = () => {
                // 先关闭所有其他下拉框
                if (node.closeAllDropdowns) {
                    node.closeAllDropdowns();
                }

                display.classList.add('active');
                panel.classList.add('active');
                searchInput.value = '';
                searchInput.focus();
                renderList();

                // 给父元素添加 dropdown-active 类以提高 z-index
                if (parentItem) {
                    parentItem.classList.add('dropdown-active');
                }
            };

            const closePanel = () => {
                display.classList.remove('active');
                panel.classList.remove('active');

                // 移除父元素的 dropdown-active 类
                if (parentItem) {
                    parentItem.classList.remove('dropdown-active');
                }
            };

            // 绑定事件
            display.addEventListener('click', (e) => {
                e.stopPropagation();
                if (panel.classList.contains('active')) {
                    closePanel();
                } else {
                    openPanel();
                }
            });

            // 搜索输入事件
            searchInput.addEventListener('input', () => {
                renderList(searchInput.value);
            });

            // 阻止搜索框点击事件冒泡
            searchInput.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            // 点击外部关闭
            document.addEventListener('click', (e) => {
                if (!container.contains(e.target)) {
                    closePanel();
                }
            });

            // 键盘导航
            searchInput.addEventListener('keydown', (e) => {
                const items = Array.from(listContainer.querySelectorAll('.gem-dropdown-item'));
                const highlightedItem = listContainer.querySelector('.gem-dropdown-item.highlight');
                let currentIndex = highlightedItem ? items.indexOf(highlightedItem) : -1;

                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    currentIndex = Math.min(currentIndex + 1, items.length - 1);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    currentIndex = Math.max(currentIndex - 1, 0);
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (highlightedItem) {
                        highlightedItem.click();
                    } else if (items.length > 0) {
                        items[0].click();
                    }
                    return;
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    closePanel();
                    return;
                } else {
                    return; // 其他按键不处理高亮
                }

                // 更新高亮
                items.forEach((item, index) => {
                    if (index === currentIndex) {
                        item.classList.add('highlight');
                        item.scrollIntoView({ block: 'nearest' });
                    } else {
                        item.classList.remove('highlight');
                    }
                });
            });

            container.appendChild(display);
            container.appendChild(panel);

            // 提供更新方法
            container.updateValue = (newValue) => {
                currentValue = newValue;
                display.textContent = newValue || '选择组';
                display.title = newValue || '选择组';
                if (newValue) {
                    display.classList.remove('placeholder');
                } else {
                    display.classList.add('placeholder');
                }
            };

            // 提供更新选项方法
            container.updateOptions = (newOptions) => {
                options = newOptions;
                if (panel.classList.contains('active')) {
                    renderList(searchInput.value);
                }
            };

            // 暴露 closePanel 方法供外部调用
            container.closePanel = closePanel;

            // 提供设置父元素的方法
            container.setParentItem = (item) => {
                parentItem = item;
            };

            return container;
        };

        // 关闭所有打开的下拉框
        nodeType.prototype.closeAllDropdowns = function () {
            if (!this.customUI) return;

            const groupItems = this.customUI.querySelectorAll('.gem-group-item');
            groupItems.forEach(item => {
                const dropdown = item._searchableDropdown;
                if (dropdown && dropdown.closePanel) {
                    dropdown.closePanel();
                }
                // 确保移除 dropdown-active 类
                item.classList.remove('dropdown-active');
            });
        };

        // 创建组项元素
        nodeType.prototype.createGroupItem = function (group, index) {
            const item = document.createElement('div');
            item.className = 'gem-group-item';
            item.draggable = !this.properties.locked;  // ✅ 根据锁定状态设置拖拽能力
            item.dataset.groupId = group.id;

            // 获取可用的组列表
            const availableGroups = this.getAvailableGroups();

            // 创建HTML结构（用占位容器替换select元素）
            item.innerHTML = `
                <div class="gem-group-header">
                    <div class="gem-group-number">${index + 1}</div>
                    <div class="gem-dropdown-container"></div>
                    <button class="gem-delete-button">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            `;

            // 创建可搜索下拉框
            const dropdownContainer = item.querySelector('.gem-dropdown-container');
            const searchableDropdown = this.createSearchableDropdown(
                availableGroups,
                group.group_name,
                (selectedValue) => {
                    group.group_name = selectedValue;

                    // 🔴 建立组对象到配置的引用映射（支持重命名检测）
                    if (app.graph && app.graph._groups && selectedValue) {
                        const groupObj = app.graph._groups.find(g => g.title === selectedValue);
                        if (groupObj) {
                            this.groupReferences.set(groupObj, group);
                            console.log('[GEM] 建立组引用映射:', selectedValue);
                        }
                    }

                    this.syncConfig();
                }
            );
            dropdownContainer.appendChild(searchableDropdown);

            // 保存下拉框引用到item上，方便后续刷新
            item._searchableDropdown = searchableDropdown;

            // 设置下拉框的父元素引用（用于 dropdown-active 类管理）
            if (searchableDropdown.setParentItem) {
                searchableDropdown.setParentItem(item);
            }

            // ✅ 锁定模式：禁用下拉框
            if (this.properties.locked) {
                const display = searchableDropdown.querySelector('.gem-dropdown-display');
                if (display) {
                    display.style.pointerEvents = 'none';
                    display.style.opacity = '0.5';
                    display.style.cursor = 'not-allowed';
                }
            }

            const deleteButton = item.querySelector('.gem-delete-button');
            deleteButton.addEventListener('click', () => {
                this.deleteGroup(group.id);
            });

            // ✅ 锁定模式：隐藏删除按钮
            if (this.properties.locked) {
                deleteButton.style.display = 'none';
            }

            // 拖拽事件
            item.addEventListener('dragstart', (e) => {
                // ✅ 锁定模式：阻止拖拽
                if (this.properties.locked) {
                    e.preventDefault();
                    return;
                }

                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', group.id);
                item.classList.add('dragging');
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
            });

            item.addEventListener('dragover', (e) => {
                // ✅ 锁定模式：不允许drop
                if (this.properties.locked) {
                    return;
                }

                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });

            item.addEventListener('drop', (e) => {
                // ✅ 锁定模式：阻止drop
                if (this.properties.locked) {
                    return;
                }

                e.preventDefault();
                const draggedId = parseInt(e.dataTransfer.getData('text/plain'));
                const draggedIndex = this.properties.groups.findIndex(g => g.id === draggedId);

                // 动态计算目标索引：从DOM中找到当前item的实际位置
                const listContainer = this.customUI.querySelector('#gem-groups-list');
                const allItems = Array.from(listContainer.querySelectorAll('.gem-group-item'));
                const targetIndex = allItems.indexOf(item);

                if (draggedIndex !== -1 && draggedIndex !== targetIndex) {
                    const [draggedGroup] = this.properties.groups.splice(draggedIndex, 1);
                    this.properties.groups.splice(targetIndex, 0, draggedGroup);

                    this.updateGroupsList();
                    this.syncConfig();
                }
            });

            return item;
        };

        // 从widget加载配置
        nodeType.prototype.loadConfigFromWidget = function () {
            const configWidget = this.widgets?.find(w => w.name === "group_config");
            if (configWidget && configWidget.value) {
                try {
                    const groups = JSON.parse(configWidget.value);
                    if (Array.isArray(groups) && groups.length > 0) {
                        this.properties.groups = groups;
                        this.updateGroupsList();
                    }
                } catch (e) {
                    console.error("[GEM] 解析组配置失败:", e);
                }
            }
        };

        // 从后端API加载配置
        nodeType.prototype.loadConfigFromBackend = async function () {
            try {
                const response = await fetch('/danbooru_gallery/group_config/load');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const result = await response.json();
                if (result.status === 'success' && result.groups) {
                    this.properties.groups = result.groups;
                    this.updateGroupsList();
                    console.log('[GEM-API] 从后端加载配置成功');
                } else {
                    console.warn('[GEM-API] 从后端加载配置失败或未获取到组数据:', result.message);
                }
            } catch (error) {
                console.error('[GEM-API] 从后端加载配置出错:', error);
            }
        };

        // 同步配置到后端
        // 注意：此节点使用converted-widget，不需要手动同步到widget
        // ComfyUI会在序列化时自动从properties读取数据
        nodeType.prototype.syncConfig = function () {
            // 直接同步到后端API
            this.syncConfigToBackend();
        };

        // 同步配置到后端
        nodeType.prototype.syncConfigToBackend = async function () {
            if (this.properties.isExecuting) {
                console.warn('[GEM-API] 正在执行中，跳过同步配置到后端');
                return;
            }
            try {
                const response = await fetch('/danbooru_gallery/group_config/save', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        groups: this.properties.groups
                    })
                });

                const result = await response.json();
                if (result.status === 'success') {
                    console.log('[GEM-API] 配置已同步到后端:', result.message);
                } else {
                    console.error('[GEM-API] 同步配置失败:', result.message);
                }
            } catch (error) {
                console.error('[GEM-API] 同步配置到后端出错:', error);
            }
        };

        // 刷新组列表下拉选项
        nodeType.prototype.refreshGroupsList = function () {
            // 刷新颜色过滤器选项
            this.refreshColorFilter();

            const availableGroups = this.getAvailableGroups();

            // 更新所有组项的可搜索下拉框
            this.properties.groups.forEach((group, index) => {
                const groupItem = this.customUI.querySelectorAll('.gem-group-item')[index];
                if (!groupItem) return;

                // 获取可搜索下拉框引用
                const searchableDropdown = groupItem._searchableDropdown;
                if (!searchableDropdown) return;

                // 更新下拉框选项
                searchableDropdown.updateOptions(availableGroups);

                // 🔴 建立组对象引用映射（支持初始化时的重命名检测）
                if (group.group_name && app.graph && app.graph._groups) {
                    const groupObj = app.graph._groups.find(g => g.title === group.group_name);
                    if (groupObj && !this.groupReferences.has(groupObj)) {
                        this.groupReferences.set(groupObj, group);
                        console.log('[GEM] 在刷新时建立组引用映射:', group.group_name);
                    }
                }

                // 🔴 同步下拉框的显示值（支持重命名后UI更新）
                if (group.group_name) {
                    if (availableGroups.includes(group.group_name)) {
                        // 组名存在，同步UI显示
                        searchableDropdown.updateValue(group.group_name);
                    } else {
                        // 组名不存在，清空选择
                        group.group_name = '';
                        searchableDropdown.updateValue('');
                        this.syncConfig();
                    }
                }
            });
        };

        // 设置图表变化监听器
        nodeType.prototype.setupGraphChangeListener = function () {
            // 🔴 初始化组对象引用映射（支持重命名检测）
            if (app.graph && app.graph._groups) {
                app.graph._groups.forEach(group => {
                    const config = this.properties.groups.find(c => c.group_name === group.title);
                    if (config) {
                        this.groupReferences.set(group, config);
                        console.log('[GEM] 初始化组引用映射:', group.title);
                    }
                });
            }

            // 保存上次的组列表
            this.lastGroupsList = this.getAvailableGroups().join(',');

            // 定期检查组列表是否发生变化
            this.groupsCheckInterval = setInterval(() => {
                // 🔴 检测组重命名并自动更新配置
                if (app.graph && app.graph._groups) {
                    let hasRename = false;
                    app.graph._groups.forEach(group => {
                        const config = this.groupReferences.get(group);
                        if (config && config.group_name !== group.title) {
                            console.log('[GEM] 检测到组重命名:', config.group_name, '→', group.title);
                            config.group_name = group.title;
                            hasRename = true;
                        }
                    });

                    // 如果发生重命名，同步到后端
                    if (hasRename) {
                        this.syncConfig();
                    }
                }

                const currentGroupsList = this.getAvailableGroups().join(',');
                if (currentGroupsList !== this.lastGroupsList) {
                    console.log('[GEM] 检测到组列表变化，自动刷新');
                    this.lastGroupsList = currentGroupsList;
                    this.refreshGroupsList();
                }
            }, 2000); // 每2秒检查一次
        };

        // 序列化节点数据
        const onSerialize = nodeType.prototype.onSerialize;
        nodeType.prototype.onSerialize = function (info) {
            // 调用原始序列化方法
            const data = onSerialize?.apply?.(this, arguments);

            // ✅ 改进：保存自定义属性到info对象，这些会被保存到工作流JSON
            info.groups = this.properties.groups || [];
            info.selectedColorFilter = this.properties.selectedColorFilter || '';
            info.isExecuting = this.properties.isExecuting || false;
            info.locked = this.properties.locked || false;  // ✅ 保存锁定状态

            // 保存节点尺寸信息
            info.gem_node_size = {
                width: this.size[0],
                height: this.size[1]
            };

            // ✅ 新增：详细的序列化日志
            console.log('[GEM-Serialize] 💾 保存工作流数据:');
            console.log(`[GEM-Serialize]   节点ID: ${this.id}`);
            console.log(`[GEM-Serialize]   组数量: ${info.groups.length}`);
            info.groups.forEach((g, i) => {
                console.log(`[GEM-Serialize]   ${i + 1}. ${g.group_name}`);
            });
            console.log(`[GEM-Serialize]   节点大小: ${info.gem_node_size.width}x${info.gem_node_size.height}`);

            // ✅ 新增：保存时立即同步到后端，确保配置不会丢失
            this.syncConfigToBackend().catch(err => {
                console.warn('[GEM-Serialize] ⚠️  保存时同步配置到后端失败:', err);
            });

            return data;
        };

        // 反序列化节点数据
        const onConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function (info) {
            // 调用原始配置方法
            onConfigure?.apply?.(this, arguments);

            // 初始化属性（如果不存在）
            if (!this.properties) {
                this.properties = {};
            }

            // 恢复组数据，并进行验证
            if (info.groups && Array.isArray(info.groups)) {
                // 验证并清理组数据
                const validGroups = info.groups.filter(group => {
                    return group &&
                        typeof group === 'object' &&
                        typeof group.group_name === 'string';
                });

                this.properties.groups = validGroups;
                console.log('[GEM] ✅ 从工作流JSON恢复配置:', validGroups.length, '个组');
                validGroups.forEach((g, i) => {
                    console.log(`   ${i + 1}. ${g.group_name}`);
                });
            } else {
                this.properties.groups = [];
                console.log('[GEM] ⚠️  工作流JSON中没有组配置');
            }

            // 恢复颜色过滤器
            if (info.selectedColorFilter !== undefined && typeof info.selectedColorFilter === 'string') {
                this.properties.selectedColorFilter = info.selectedColorFilter;
            } else {
                this.properties.selectedColorFilter = '';
            }

            // ⚠️ 修复：加载工作流时强制重置执行状态为false，避免状态卡死
            this.properties.isExecuting = false;
            console.log('[GEM] 工作流加载完成，执行状态已重置为false');

            // ✅ 恢复锁定状态
            if (info.locked !== undefined && typeof info.locked === 'boolean') {
                this.properties.locked = info.locked;
                console.log('[GEM] ✅ 恢复锁定状态:', this.properties.locked ? '已锁定' : '未锁定');
            } else {
                this.properties.locked = false;
            }

            // 恢复节点尺寸
            if (info.gem_node_size && typeof info.gem_node_size === 'object') {
                const width = typeof info.gem_node_size.width === 'number' ? info.gem_node_size.width : 450;
                const height = typeof info.gem_node_size.height === 'number' ? info.gem_node_size.height : 600;
                this.size = [width, height];
            }

            // 等待UI准备就绪后更新界面
            if (this.customUI) {
                setTimeout(() => {
                    this.updateGroupsList();

                    // 恢复颜色过滤器选择
                    const colorFilter = this.customUI.querySelector('#gem-color-filter');
                    if (colorFilter) {
                        colorFilter.value = this.properties.selectedColorFilter || '';
                    }

                    // ✅ 恢复锁定状态的UI
                    this.updateLockUI();
                }, 100);
            }

            // ✅ 新增：工作流加载完成后，立即同步配置到后端
            // 这是关键步骤，确保后端能够读取到工作流中保存的groups配置
            setTimeout(async () => {
                if (this.properties.groups && this.properties.groups.length > 0) {
                    console.log('[GEM] 📤 工作流加载后，同步配置到后端...');
                    await this.syncConfigToBackend();
                }
            }, 200);
        };

        // 节点被移除时清理资源
        const onRemoved = nodeType.prototype.onRemoved;
        nodeType.prototype.onRemoved = function () {
            console.log('[GEM] 开始清理节点资源:', this.id);

            // 清除定时器
            if (this.groupsCheckInterval) {
                clearInterval(this.groupsCheckInterval);
                this.groupsCheckInterval = null;
                console.log('[GEM] 定时器已清理');
            }

            // 清理DOM事件监听器
            if (this.customUI) {
                try {
                    // 移除所有事件监听器
                    const allElements = this.customUI.querySelectorAll('*');
                    allElements.forEach(element => {
                        // 克隆节点以移除所有事件监听器
                        const newElement = element.cloneNode(true);
                        element.parentNode?.replaceChild(newElement, element);
                    });

                    // 清空自定义UI内容
                    this.customUI.innerHTML = '';
                    this.customUI = null;
                    console.log('[GEM] DOM事件监听器已清理');
                } catch (e) {
                    console.warn('[GEM] 清理DOM事件监听器时出错:', e);
                }
            }

            // 清理自定义属性
            this.properties = {
                isExecuting: false,
                groups: [],
                selectedColorFilter: ''
            };

            console.log('[GEM] 节点资源清理完成');

            // 调用原始移除方法
            onRemoved?.apply?.(this, arguments);
        };
    }
});

console.log('[GEM] 组执行管理器已加载');

