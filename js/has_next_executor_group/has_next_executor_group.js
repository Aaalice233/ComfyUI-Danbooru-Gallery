/**
 * 下一执行组是否有效节点 - Has Next Executor Group
 * 提供排除组配置UI和组名跟踪重命名功能
 */

import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

app.registerExtension({
    name: "Comfy.HasNextExecutorGroup",

    async init(app) {
        // 在扩展初始化时设置监听器和轮询
        console.log('[HasNext] 正在设置组内节点状态检测...');

        // 等待 app.graph 就绪
        const waitForGraph = setInterval(() => {
            if (app.graph) {
                clearInterval(waitForGraph);

                console.log('[HasNext] app.graph 已就绪，开始设置监听器和轮询');

                // 🔥 方案1: 定期轮询检测（每3秒检测一次状态变化）
                setInterval(() => {
                    syncDisabledGroupsToBackend();
                }, 3000);

                // 🔥 方案2: 执行前主动检测（监听queue prompt）
                const originalQueuePrompt = api.queuePrompt;
                api.queuePrompt = async function() {
                    // 执行前立即同步最新状态
                    await syncDisabledGroupsToBackend();
                    // 调用原始方法
                    return originalQueuePrompt.apply(this, arguments);
                };

                // 🔥 方案3: 监听节点模式变化（作为快速响应的补充）
                const originalOnNodeModeChange = app.graph.onNodeModeChange;
                app.graph.onNodeModeChange = function(node) {
                    if (originalOnNodeModeChange) {
                        originalOnNodeModeChange.apply(this, arguments);
                    }
                    syncDisabledGroupsToBackend();
                };

                // 监听图表配置加载（工作流加载时）
                const originalConfigure = app.graph.configure;
                app.graph.configure = function(data) {
                    if (originalConfigure) {
                        originalConfigure.apply(this, arguments);
                    }
                    setTimeout(() => {
                        syncDisabledGroupsToBackend();
                    }, 1000);
                };

                // 初始化时同步一次
                setTimeout(() => {
                    syncDisabledGroupsToBackend();
                }, 500);

                console.log('[HasNext] ✅ 组内节点状态检测已启用（轮询 + 执行前检测 + 事件监听）');
            }
        }, 100);
    },

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== "HasNextExecutorGroup") return;

        // 节点创建时的处理
        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            const result = onNodeCreated?.apply(this, arguments);

            // 初始化节点属性
            this.properties = {
                excludedGroups: [],  // 排除组列表
                locked: false        // 锁定模式状态
            };

            // 初始化组对象引用跟踪（用于支持组重命名）
            this.groupReferences = new WeakMap();

            // 设置节点初始大小
            this.size = [400, 400];

            // 创建自定义UI
            this.createCustomUI();

            // 从后端加载配置
            setTimeout(() => {
                this.loadConfigFromBackend();
            }, 100);

            // 监听图表变化，自动刷新和检测重命名
            this.setupGraphChangeListener();

            return result;
        };

        // 创建自定义UI
        nodeType.prototype.createCustomUI = function () {
            try {
                console.log('[HasNextExecutorGroup-UI] 开始创建自定义UI');

                const container = document.createElement('div');
                container.className = 'hneg-container';

                // 创建样式
                this.addStyles();

                // 创建布局
                container.innerHTML = `
                    <div class="hneg-content">
                        <div class="hneg-header">
                            <span class="hneg-title">排除组配置</span>
                            <div class="hneg-header-controls">
                                <button class="hneg-lock-button" id="hneg-lock-button" title="锁定模式（双击切换）">🔒</button>
                                <button class="hneg-refresh-button" id="hneg-refresh" title="刷新">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div class="hneg-list" id="hneg-list"></div>
                        <div class="hneg-add-container">
                            <button class="hneg-button hneg-button-primary" id="hneg-add-group">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                                <span>添加排除组</span>
                            </button>
                        </div>
                    </div>
                `;

                // 添加到节点的自定义widget
                this.addDOMWidget("hneg_ui", "div", container);
                this.customUI = container;

                // 绑定事件
                this.bindUIEvents();

                // 初始化组列表
                this.updateExcludedList();

                console.log('[HasNextExecutorGroup-UI] 自定义UI创建完成');

            } catch (error) {
                console.error('[HasNextExecutorGroup-UI] 创建自定义UI时出错:', error);
            }
        };

        // 添加样式
        nodeType.prototype.addStyles = function () {
            if (document.querySelector('#hneg-styles')) return;

            const style = document.createElement('style');
            style.id = 'hneg-styles';
            style.textContent = `
                .hneg-container {
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

                .hneg-content {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    background: rgba(30, 30, 46, 0.5);
                }

                .hneg-header {
                    padding: 12px 20px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .hneg-header-controls {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .hneg-title {
                    font-size: 12px;
                    font-weight: 500;
                    color: #B0B0B0;
                }

                .hneg-refresh-button {
                    background: rgba(116, 55, 149, 0.2);
                    border: 1px solid rgba(116, 55, 149, 0.3);
                    border-radius: 4px;
                    width: 32px;
                    height: 32px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .hneg-refresh-button:hover {
                    background: rgba(116, 55, 149, 0.4);
                    border-color: rgba(116, 55, 149, 0.5);
                }

                .hneg-refresh-button svg {
                    stroke: #B0B0B0;
                }

                .hneg-lock-button {
                    background: rgba(100, 100, 120, 0.2);
                    border: 1px solid rgba(100, 100, 120, 0.3);
                    border-radius: 4px;
                    width: 32px;
                    height: 32px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-size: 14px;
                    opacity: 0.5;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .hneg-lock-button:hover {
                    opacity: 0.8;
                    background: rgba(100, 100, 120, 0.3);
                }

                .hneg-lock-button.locked {
                    opacity: 1;
                    background: rgba(255, 193, 7, 0.3);
                    border-color: rgba(255, 193, 7, 0.5);
                    box-shadow: 0 0 10px rgba(255, 193, 7, 0.3);
                }

                .hneg-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 8px;
                }

                .hneg-list::-webkit-scrollbar {
                    width: 8px;
                }

                .hneg-list::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.1);
                }

                .hneg-list::-webkit-scrollbar-thumb {
                    background: rgba(116, 55, 149, 0.3);
                    border-radius: 4px;
                }

                .hneg-group-item {
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 8px;
                    padding: 12px;
                    margin-bottom: 8px;
                    transition: all 0.2s ease;
                }

                .hneg-group-item:hover {
                    background: rgba(255, 255, 255, 0.04);
                    border-color: rgba(255, 255, 255, 0.1);
                }

                .hneg-group-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .hneg-group-number {
                    background: rgba(116, 55, 149, 0.3);
                    border-radius: 50%;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 11px;
                    font-weight: 600;
                    color: #E0E0E0;
                    flex-shrink: 0;
                }

                .hneg-dropdown-container {
                    flex: 1;
                    position: relative;
                }

                .hneg-delete-button {
                    background: rgba(255, 107, 107, 0.15);
                    border: 1px solid rgba(255, 107, 107, 0.2);
                    border-radius: 4px;
                    padding: 4px 8px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .hneg-delete-button:hover {
                    background: rgba(255, 107, 107, 0.3);
                    border-color: rgba(255, 107, 107, 0.4);
                }

                .hneg-delete-button svg {
                    stroke: #ff6b6b;
                }

                .hneg-add-container {
                    padding: 12px 20px;
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                }

                .hneg-button {
                    width: 100%;
                    padding: 10px 16px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 500;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }

                .hneg-button-primary {
                    background: rgba(116, 55, 149, 0.3);
                    color: #E0E0E0;
                    border: 1px solid rgba(116, 55, 149, 0.4);
                }

                .hneg-button-primary:hover {
                    background: rgba(116, 55, 149, 0.5);
                    border-color: rgba(116, 55, 149, 0.6);
                }

                .hneg-button-primary svg {
                    stroke: #E0E0E0;
                }

                /* 可搜索下拉框样式 */
                .hneg-searchable-dropdown {
                    position: relative;
                    width: 100%;
                }

                .hneg-dropdown-display {
                    background: rgba(0, 0, 0, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 6px;
                    padding: 6px 28px 6px 10px;
                    color: #E0E0E0;
                    font-size: 12px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    position: relative;
                    user-select: none;
                }

                .hneg-dropdown-display.placeholder {
                    color: #808080;
                }

                .hneg-dropdown-display:hover {
                    background: rgba(0, 0, 0, 0.3);
                    border-color: rgba(255, 255, 255, 0.15);
                }

                .hneg-dropdown-display.active {
                    border-color: #743795;
                    background: rgba(0, 0, 0, 0.3);
                }

                .hneg-dropdown-arrow {
                    position: absolute;
                    right: 10px;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 0;
                    height: 0;
                    border-left: 4px solid transparent;
                    border-right: 4px solid transparent;
                    border-top: 4px solid #B0B0B0;
                    pointer-events: none;
                }

                .hneg-dropdown-display.active .hneg-dropdown-arrow {
                    transform: translateY(-50%) rotate(180deg);
                }

                .hneg-dropdown-menu {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    margin-top: 4px;
                    background: #252535;
                    border: 1px solid rgba(116, 55, 149, 0.3);
                    border-radius: 6px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                    z-index: 10000;
                    max-height: 200px;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }

                .hneg-dropdown-search {
                    padding: 8px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                }

                .hneg-dropdown-search input {
                    width: 100%;
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                    padding: 6px 10px;
                    color: #E0E0E0;
                    font-size: 12px;
                }

                .hneg-dropdown-search input:focus {
                    outline: none;
                    border-color: #743795;
                }

                .hneg-dropdown-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 4px;
                }

                .hneg-dropdown-list::-webkit-scrollbar {
                    width: 6px;
                }

                .hneg-dropdown-list::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.1);
                }

                .hneg-dropdown-list::-webkit-scrollbar-thumb {
                    background: rgba(116, 55, 149, 0.3);
                    border-radius: 3px;
                }

                .hneg-dropdown-item {
                    padding: 8px 12px;
                    cursor: pointer;
                    border-radius: 4px;
                    transition: all 0.15s ease;
                    font-size: 12px;
                    color: #E0E0E0;
                }

                .hneg-dropdown-item:hover {
                    background: rgba(116, 55, 149, 0.2);
                }

                .hneg-dropdown-item.selected {
                    background: rgba(116, 55, 149, 0.3);
                }

                .hneg-dropdown-empty {
                    padding: 16px;
                    text-align: center;
                    color: #808080;
                    font-size: 12px;
                }
            `;
            document.head.appendChild(style);
        };

        // 绑定UI事件
        nodeType.prototype.bindUIEvents = function () {
            const addButton = this.customUI.querySelector('#hneg-add-group');
            const refreshButton = this.customUI.querySelector('#hneg-refresh');
            const lockButton = this.customUI.querySelector('#hneg-lock-button');

            // 添加组按钮
            if (addButton) {
                addButton.addEventListener('click', () => {
                    if (this.properties.locked) return;
                    this.addExcludedGroup();
                });
            }

            // 刷新按钮
            if (refreshButton) {
                refreshButton.addEventListener('click', () => {
                    this.refreshExcludedList();
                });
            }

            // 锁定按钮（双击切换）
            if (lockButton) {
                lockButton.addEventListener('dblclick', () => {
                    this.toggleLock();
                });
            }
        };

        // 获取可用的组列表
        nodeType.prototype.getAvailableGroups = function () {
            if (!app.graph || !app.graph._groups) return [];

            const groups = app.graph._groups
                .filter(g => g && g.title)
                .map(g => g.title)
                .sort((a, b) => a.localeCompare(b));

            return groups;
        };

        // 添加排除组
        nodeType.prototype.addExcludedGroup = function () {
            if (this.properties.locked) return;

            const newGroup = '';
            this.properties.excludedGroups.push(newGroup);
            this.updateExcludedList();
            this.syncConfig();
        };

        // 删除排除组
        nodeType.prototype.deleteExcludedGroup = function (index) {
            if (this.properties.locked) return;

            this.properties.excludedGroups.splice(index, 1);
            this.updateExcludedList();
            this.syncConfig();
        };

        // 更新排除组列表
        nodeType.prototype.updateExcludedList = function () {
            const listContainer = this.customUI.querySelector('#hneg-list');
            if (!listContainer) return;

            listContainer.innerHTML = '';

            if (this.properties.excludedGroups.length === 0) {
                listContainer.innerHTML = '<div class="hneg-dropdown-empty">暂无排除组</div>';
                return;
            }

            this.properties.excludedGroups.forEach((groupName, index) => {
                const item = this.createExcludedGroupItem(groupName, index);
                listContainer.appendChild(item);
            });
        };

        // 创建排除组项
        nodeType.prototype.createExcludedGroupItem = function (groupName, index) {
            const item = document.createElement('div');
            item.className = 'hneg-group-item';

            // 获取可用的组列表
            const availableGroups = this.getAvailableGroups();

            // 创建HTML结构（不显示序号）
            item.innerHTML = `
                <div class="hneg-group-header">
                    <div class="hneg-dropdown-container"></div>
                    <button class="hneg-delete-button">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            `;

            // 创建可搜索下拉框
            const dropdownContainer = item.querySelector('.hneg-dropdown-container');
            const searchableDropdown = this.createSearchableDropdown(
                availableGroups,
                groupName,
                (selectedValue) => {
                    this.properties.excludedGroups[index] = selectedValue;

                    // 建立组对象到配置的引用映射（支持重命名检测）
                    if (app.graph && app.graph._groups && selectedValue) {
                        const groupObj = app.graph._groups.find(g => g.title === selectedValue);
                        if (groupObj) {
                            this.groupReferences.set(groupObj, { index, groupName: selectedValue });
                            console.log('[HasNextExecutorGroup] 建立组引用映射:', selectedValue);
                        }
                    }

                    this.syncConfig();
                }
            );
            dropdownContainer.appendChild(searchableDropdown);

            // 保存下拉框引用到item上，方便后续刷新
            item._searchableDropdown = searchableDropdown;

            // 锁定模式：禁用下拉框和删除按钮
            if (this.properties.locked) {
                const display = searchableDropdown.querySelector('.hneg-dropdown-display');
                if (display) {
                    display.style.pointerEvents = 'none';
                    display.style.opacity = '0.6';
                }
            }

            // 删除按钮
            const deleteButton = item.querySelector('.hneg-delete-button');
            if (deleteButton) {
                // 锁定模式：隐藏删除按钮
                if (this.properties.locked) {
                    deleteButton.style.display = 'none';
                }

                deleteButton.addEventListener('click', () => {
                    if (this.properties.locked) return;
                    this.deleteExcludedGroup(index);
                });
            }

            return item;
        };

        // 创建可搜索下拉框
        nodeType.prototype.createSearchableDropdown = function (options, currentValue, onChange) {
            const container = document.createElement('div');
            container.className = 'hneg-searchable-dropdown';

            // 创建显示框
            const display = document.createElement('div');
            display.className = 'hneg-dropdown-display';
            if (!currentValue) {
                display.classList.add('placeholder');
            }
            display.textContent = currentValue || '选择组';
            display.title = currentValue || '选择组';

            // 添加下拉箭头
            const arrow = document.createElement('div');
            arrow.className = 'hneg-dropdown-arrow';
            display.appendChild(arrow);

            container.appendChild(display);

            // 创建下拉菜单
            const menu = document.createElement('div');
            menu.className = 'hneg-dropdown-menu';
            menu.style.display = 'none';

            // 搜索框
            const searchContainer = document.createElement('div');
            searchContainer.className = 'hneg-dropdown-search';
            const searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.placeholder = '搜索组...';
            searchContainer.appendChild(searchInput);
            menu.appendChild(searchContainer);

            // 选项列表
            const listContainer = document.createElement('div');
            listContainer.className = 'hneg-dropdown-list';
            menu.appendChild(listContainer);

            container.appendChild(menu);

            // 渲染选项
            const renderOptions = (filterText = '') => {
                listContainer.innerHTML = '';
                const filteredOptions = options.filter(opt =>
                    opt.toLowerCase().includes(filterText.toLowerCase())
                );

                if (filteredOptions.length === 0) {
                    listContainer.innerHTML = '<div class="hneg-dropdown-empty">无匹配组</div>';
                    return;
                }

                filteredOptions.forEach(opt => {
                    const item = document.createElement('div');
                    item.className = 'hneg-dropdown-item';
                    if (opt === currentValue) {
                        item.classList.add('selected');
                    }
                    item.textContent = opt;
                    item.title = opt;

                    item.addEventListener('click', () => {
                        currentValue = opt;
                        display.textContent = opt;
                        display.title = opt;
                        display.classList.remove('placeholder');
                        closeMenu();
                        onChange(opt);
                    });

                    listContainer.appendChild(item);
                });
            };

            // 打开菜单
            const openMenu = () => {
                display.classList.add('active');
                menu.style.display = 'flex';
                searchInput.value = '';
                renderOptions();
                searchInput.focus();
            };

            // 关闭菜单
            const closeMenu = () => {
                display.classList.remove('active');
                menu.style.display = 'none';
            };

            // 显示框点击事件
            display.addEventListener('click', (e) => {
                e.stopPropagation();
                if (menu.style.display === 'none') {
                    openMenu();
                } else {
                    closeMenu();
                }
            });

            // 搜索输入事件
            searchInput.addEventListener('input', (e) => {
                renderOptions(e.target.value);
            });

            // 搜索框点击事件（防止冒泡关闭菜单）
            searchInput.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            // 点击外部关闭菜单
            document.addEventListener('click', (e) => {
                if (!container.contains(e.target)) {
                    closeMenu();
                }
            });

            // 提供更新选项的方法
            container.updateOptions = (newOptions) => {
                options = newOptions;
                if (menu.style.display !== 'none') {
                    renderOptions(searchInput.value);
                }
            };

            // 提供更新值的方法
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

            return container;
        };

        // 刷新排除组列表
        nodeType.prototype.refreshExcludedList = function () {
            console.log('[HasNextExecutorGroup] 刷新排除组列表');

            const availableGroups = this.getAvailableGroups();

            // 更新所有组项的可搜索下拉框
            this.properties.excludedGroups.forEach((groupName, index) => {
                const groupItem = this.customUI.querySelectorAll('.hneg-group-item')[index];
                if (!groupItem) return;

                // 获取可搜索下拉框引用
                const searchableDropdown = groupItem._searchableDropdown;
                if (!searchableDropdown) return;

                // 更新下拉框选项
                searchableDropdown.updateOptions(availableGroups);

                // 建立组对象引用映射（支持初始化时的重命名检测）
                if (groupName && app.graph && app.graph._groups) {
                    const groupObj = app.graph._groups.find(g => g.title === groupName);
                    if (groupObj && !this.groupReferences.has(groupObj)) {
                        this.groupReferences.set(groupObj, { index, groupName });
                        console.log('[HasNextExecutorGroup] 在刷新时建立组引用映射:', groupName);
                    }
                }

                // 同步下拉框的显示值（支持重命名后UI更新）
                if (groupName) {
                    if (availableGroups.includes(groupName)) {
                        // 组名存在，同步UI显示
                        searchableDropdown.updateValue(groupName);
                    } else {
                        // 组名不存在，清空选择
                        this.properties.excludedGroups[index] = '';
                        searchableDropdown.updateValue('');
                        this.syncConfig();
                    }
                }
            });
        };

        // 设置图表变化监听器
        nodeType.prototype.setupGraphChangeListener = function () {
            // 初始化组对象引用映射（支持重命名检测）
            if (app.graph && app.graph._groups) {
                app.graph._groups.forEach(group => {
                    const index = this.properties.excludedGroups.indexOf(group.title);
                    if (index !== -1) {
                        this.groupReferences.set(group, { index, groupName: group.title });
                        console.log('[HasNextExecutorGroup] 初始化组引用映射:', group.title);
                    }
                });
            }

            // 保存上次的组列表
            this.lastGroupsList = this.getAvailableGroups().join(',');

            // 定期检查组列表是否发生变化
            this.groupsCheckInterval = setInterval(() => {
                // 检测组重命名并自动更新配置
                if (app.graph && app.graph._groups) {
                    let hasRename = false;
                    app.graph._groups.forEach(group => {
                        const config = this.groupReferences.get(group);
                        if (config && this.properties.excludedGroups[config.index] !== group.title) {
                            console.log('[HasNextExecutorGroup] 检测到组重命名:',
                                this.properties.excludedGroups[config.index], '→', group.title);
                            this.properties.excludedGroups[config.index] = group.title;
                            hasRename = true;
                        }
                    });

                    // 如果发生重命名，同步到后端
                    if (hasRename) {
                        this.syncConfig();
                    }
                }

                // 检测组列表变化
                const currentGroupsList = this.getAvailableGroups().join(',');
                if (currentGroupsList !== this.lastGroupsList) {
                    console.log('[HasNextExecutorGroup] 检测到组列表变化，自动刷新');
                    this.lastGroupsList = currentGroupsList;
                    this.refreshExcludedList();
                }
            }, 2000); // 每2秒检查一次
        };

        // 同步配置到后端
        nodeType.prototype.syncConfig = async function () {
            try {
                const response = await api.fetchApi("/danbooru_gallery/has_next/save_excluded", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        excluded_groups: this.properties.excludedGroups
                    })
                });

                const result = await response.json();
                console.log('[HasNextExecutorGroup] 配置已同步到后端:', result);

            } catch (error) {
                console.error('[HasNextExecutorGroup] 同步配置到后端失败:', error);
            }
        };

        // 从后端加载配置
        nodeType.prototype.loadConfigFromBackend = async function () {
            try {
                const response = await api.fetchApi("/danbooru_gallery/has_next/load_excluded");
                const result = await response.json();

                if (result.status === 'success') {
                    this.properties.excludedGroups = result.excluded_groups || [];
                    this.updateExcludedList();
                    console.log('[HasNextExecutorGroup] 从后端加载配置成功:',
                        this.properties.excludedGroups);
                }

            } catch (error) {
                console.error('[HasNextExecutorGroup] 从后端加载配置失败:', error);
            }
        };

        // 切换锁定模式
        nodeType.prototype.toggleLock = function () {
            this.properties.locked = !this.properties.locked;
            this.updateLockUI();
            console.log('[HasNextExecutorGroup] 锁定模式:', this.properties.locked);
        };

        // 更新锁定模式UI
        nodeType.prototype.updateLockUI = function () {
            const lockButton = this.customUI.querySelector('#hneg-lock-button');
            const addButton = this.customUI.querySelector('#hneg-add-group');

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

            // 重新渲染列表以应用锁定状态到每个组项
            if (this.properties.excludedGroups && this.properties.excludedGroups.length > 0) {
                this.updateExcludedList();
            }
        };

        // 序列化节点数据（保存到工作流时）
        const onSerialize = nodeType.prototype.onSerialize;
        nodeType.prototype.onSerialize = function (info) {
            // 先调用原始序列化方法
            const data = onSerialize?.apply?.(this, arguments);

            // 保存自定义属性到info对象
            info.locked = this.properties.locked || false;
            info.excludedGroups = this.properties.excludedGroups || [];

            console.log('[HasNextExecutorGroup-Serialize] 💾 保存配置:', {
                locked: info.locked,
                excludedGroups: info.excludedGroups.length
            });

            return data;
        };

        // 反序列化节点数据（加载工作流时）
        const onConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function (info) {
            // 先调用原始配置方法
            onConfigure?.apply?.(this, arguments);

            // 初始化属性（如果不存在）
            if (!this.properties) {
                this.properties = {
                    excludedGroups: [],
                    locked: false
                };
            }

            // 恢复锁定状态
            if (info.locked !== undefined && typeof info.locked === 'boolean') {
                this.properties.locked = info.locked;
                console.log('[HasNextExecutorGroup] ✅ 恢复锁定状态:', this.properties.locked ? '已锁定' : '未锁定');
            } else {
                this.properties.locked = false;
            }

            // 恢复排除组列表
            if (info.excludedGroups && Array.isArray(info.excludedGroups)) {
                this.properties.excludedGroups = info.excludedGroups;
                console.log('[HasNextExecutorGroup] ✅ 恢复排除组:', this.properties.excludedGroups.length, '个');
            } else {
                this.properties.excludedGroups = [];
            }

            // 等待UI准备就绪后更新界面
            if (this.customUI) {
                setTimeout(() => {
                    this.updateExcludedList?.();
                    this.updateLockUI?.();
                }, 50);
            }
        };

        // 节点销毁时清理定时器
        const onRemoved = nodeType.prototype.onRemoved;
        nodeType.prototype.onRemoved = function () {
            if (this.groupsCheckInterval) {
                clearInterval(this.groupsCheckInterval);
            }
            if (onRemoved) {
                onRemoved.apply(this, arguments);
            }
        };

        console.log('[HasNextExecutorGroup] 节点扩展注册完成');
    }
});

// ============================================================
// 组内节点状态检测 - 解耦方案
// ============================================================

/**
 * 工具函数：深度优先遍历节点及其子图节点
 */
function reduceNodesDepthFirst(nodeOrNodes, reduceFn, reduceTo) {
    const nodes = Array.isArray(nodeOrNodes) ? nodeOrNodes : [nodeOrNodes];
    const stack = nodes.map((node) => ({ node }));

    while (stack.length > 0) {
        const { node } = stack.pop();
        const result = reduceFn(node, reduceTo);
        if (result !== undefined && result !== reduceTo) {
            reduceTo = result;
        }

        // 如果是子图节点，将其内部节点也加入处理栈
        if (node.isSubgraphNode?.() && node.subgraph) {
            const children = node.subgraph.nodes;
            for (let i = children.length - 1; i >= 0; i--) {
                stack.push({ node: children[i] });
            }
        }
    }
    return reduceTo;
}

/**
 * 获取组内的所有节点
 */
function getNodesInGroup(group) {
    if (!group || !group._children) return [];
    return Array.from(group._children).filter((c) => c instanceof LGraphNode);
}

/**
 * 检查组内所有节点是否都被禁用（静音或bypass）
 */
function areAllNodesInGroupDisabled(groupTitle, app) {
    if (!app.graph || !app.graph._groups) return false;

    // 找到对应的组对象
    const groupObj = app.graph._groups.find(g => g && g.title === groupTitle);
    if (!groupObj) return false;

    // 获取组内所有节点
    const nodes = getNodesInGroup(groupObj);

    // 如果组内没有节点，视为已禁用
    if (nodes.length === 0) {
        return true;
    }

    // 使用深度优先遍历检查所有节点（包括子图内节点）
    // 如果有任何节点是 ALWAYS 状态，则认为组是启用的
    let hasActiveNode = false;
    reduceNodesDepthFirst(nodes, (node) => {
        if (node.mode === 0) { // LiteGraph.ALWAYS = 0
            hasActiveNode = true;
        }
    });

    return !hasActiveNode;
}

/**
 * 获取所有组内节点都被禁用的组列表
 */
function getAllDisabledNodeGroups(app) {
    if (!app.graph || !app.graph._groups) {
        return [];
    }

    const disabledGroups = [];

    for (const group of app.graph._groups) {
        if (!group || !group.title) continue;

        if (areAllNodesInGroupDisabled(group.title, app)) {
            disabledGroups.push(group.title);
        }
    }

    console.log(`[HasNext] 检测到 ${disabledGroups.length} 个组内节点都被禁用的组:`, disabledGroups);

    return disabledGroups;
}

/**
 * 同步被禁用的组列表到后端
 */
async function syncDisabledGroupsToBackend() {
    try {
        const disabledGroups = getAllDisabledNodeGroups(app);

        const response = await api.fetchApi("/danbooru_gallery/has_next/sync_disabled_node_groups", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                disabled_groups: disabledGroups
            })
        });

        const result = await response.json();
        if (result.status === 'success') {
            console.log('[HasNext] 被禁用组已同步到后端:', result.message);
        }

    } catch (error) {
        console.error('[HasNext] 同步被禁用组到后端时出错:', error);
    }
}
