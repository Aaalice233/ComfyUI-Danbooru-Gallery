/**
 * 组执行管理器 - Group Executor Manager
 * 负责配置界面，不负责执行（执行由GroupExecutorSender负责）
 */

import { app } from "/scripts/app.js";

// 组执行管理器（配置节点）
app.registerExtension({
    name: "GroupExecutorManager",

    async init(app) {
        console.log('[GEM-UI] 初始化组执行管理器配置界面');
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
                selectedColorFilter: ''
            };

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
                }

                .gem-group-item:hover {
                    border-color: rgba(116, 55, 149, 0.5);
                    box-shadow: 0 2px 8px rgba(116, 55, 149, 0.2);
                    transform: translateY(-1px);
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
                    background: rgba(0, 0, 0, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 6px;
                    padding: 6px 10px;
                    color: #E0E0E0;
                    font-size: 13px;
                    transition: all 0.2s ease;
                    cursor: pointer;
                }

                .gem-group-name-select:focus {
                    outline: none;
                    border-color: #743795;
                    background: rgba(0, 0, 0, 0.3);
                }

                .gem-delay-container {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .gem-delay-label {
                    font-size: 11px;
                    color: #B0B0B0;
                    white-space: nowrap;
                }

                .gem-delay-input {
                    background: rgba(0, 0, 0, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 6px;
                    padding: 4px 8px;
                    color: #E0E0E0;
                    font-size: 12px;
                    width: 60px;
                    transition: all 0.2s ease;
                }

                .gem-delay-input:focus {
                    outline: none;
                    border-color: #743795;
                    background: rgba(0, 0, 0, 0.3);
                }

                .gem-delay-unit {
                    font-size: 11px;
                    color: #B0B0B0;
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
                group_name: '',
                delay_seconds: 0
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

        // 获取工作流中的所有组（支持颜色过滤）
        nodeType.prototype.getAvailableGroups = function () {
            if (!app.graph || !app.graph._groups) return [];

            let groups = app.graph._groups.filter(g => g && g.title);

            // 应用颜色过滤
            if (this.properties.selectedColorFilter) {
                groups = groups.filter(g => this.matchesGroupColor(g, this.properties.selectedColorFilter));
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

        // 检查组是否匹配指定颜色
        nodeType.prototype.matchesGroupColor = function (group, filterColor) {
            if (!group) return false;
            if (!filterColor || filterColor === '') return true;

            // 如果组没有颜色，不匹配任何特定颜色
            if (!group.color) return false;

            // 处理内置颜色名称
            const builtinColors = ['red', 'brown', 'green', 'blue', 'pale blue', 'cyan', 'purple', 'yellow', 'black'];
            const normalizedFilterColor = filterColor.toLowerCase();

            if (builtinColors.includes(normalizedFilterColor)) {
                // 方法1: 尝试通过十六进制值匹配
                const expectedHex = this.getComfyUIColorHex(filterColor);
                const actualHex = this.normalizeColor(group.color);

                // 方法2: 尝试通过颜色名称直接匹配
                const isNameMatch = this.matchColorByName(group.color, normalizedFilterColor);

                // 方法3: 容错匹配 - 允许颜色值在一定范围内匹配
                const isHexMatch = expectedHex === actualHex;
                const isColorClose = this.isColorClose(expectedHex, actualHex);

                return isHexMatch || isNameMatch || isColorClose;
            }

            return false;
        };

        // 标准化颜色格式
        nodeType.prototype.normalizeColor = function (color) {
            if (!color) return '';

            let normalizedColor = color.replace('#', '').trim().toLowerCase();

            // 转换 ComfyUI 内置颜色名称为十六进制值
            if (LGraphCanvas.node_colors && LGraphCanvas.node_colors[normalizedColor]) {
                normalizedColor = LGraphCanvas.node_colors[normalizedColor].groupcolor;
            }

            // 标准化十六进制格式
            normalizedColor = normalizedColor.replace('#', '').toLowerCase();

            // 将 3 位十六进制转换为 6 位 (#RGB -> #RRGGBB)
            if (normalizedColor.length === 3) {
                normalizedColor = normalizedColor.replace(/(.)(.)(.)/, '$1$1$2$2$3$3');
            }

            return `#${normalizedColor}`;
        };

        // 获取ComfyUI内置颜色的十六进制值
        nodeType.prototype.getComfyUIColorHex = function (colorName) {
            if (!colorName) return null;

            const normalizedColor = colorName.replace('#', '').trim().toLowerCase();

            // 尝试从LGraphCanvas获取颜色（优先级最高）
            if (typeof LGraphCanvas !== 'undefined' && LGraphCanvas.node_colors) {
                // 直接查找
                if (LGraphCanvas.node_colors[normalizedColor]) {
                    const groupColor = LGraphCanvas.node_colors[normalizedColor].groupcolor;
                    const hexColor = this.normalizeColor(groupColor);
                    return hexColor;
                }

                // 尝试移除空格查找
                const spacelessColor = normalizedColor.replace(/\s+/g, '');
                if (LGraphCanvas.node_colors[spacelessColor]) {
                    const groupColor = LGraphCanvas.node_colors[spacelessColor].groupcolor;
                    const hexColor = this.normalizeColor(groupColor);
                    return hexColor;
                }
            }

            // 改进的硬编码ComfyUI默认颜色值（更准确的值）
            const defaultColors = {
                'red': '#f55',
                'brown': '#a63',
                'green': '#5a5',
                'blue': '#55a',
                'pale blue': '#3f789e', // 使用实际观测到的颜色值
                'cyan': '#5aa',
                'purple': '#a5a',
                'yellow': '#aa5',
                'black': '#222'
            };

            if (defaultColors[normalizedColor]) {
                return defaultColors[normalizedColor];
            }

            // 尝试移除空格匹配默认颜色
            const spacelessMatch = normalizedColor.replace(/\s+/g, '');
            if (defaultColors[spacelessMatch]) {
                return defaultColors[spacelessMatch];
            }

            return null;
        };

        // 通过颜色名称匹配（检查ComfyUI内置颜色映射）
        nodeType.prototype.matchColorByName = function (groupColor, filterColorName) {
            if (!groupColor || !filterColorName) return false;

            // 标准化组颜色
            const normalizedGroupColor = groupColor.replace('#', '').trim().toLowerCase();

            // 检查ComfyUI内置颜色映射
            if (typeof LGraphCanvas !== 'undefined' && LGraphCanvas.node_colors) {
                for (const [colorName, colorData] of Object.entries(LGraphCanvas.node_colors)) {
                    if (colorName === filterColorName) {
                        const expectedColor = this.normalizeColor(colorData.groupcolor);
                        const actualColor = this.normalizeColor(groupColor);
                        return expectedColor === actualColor;
                    }
                }
            }

            // 检查组的颜色值是否直接包含颜色名称
            return normalizedGroupColor.includes(filterColorName.replace(' ', ''));
        };

        // 检查两个颜色是否相近（容差匹配）
        nodeType.prototype.isColorClose = function (color1, color2, tolerance = 50) {
            if (!color1 || !color2) return false;

            try {
                // 移除#号并标准化
                const hex1 = color1.replace('#', '').toLowerCase();
                const hex2 = color2.replace('#', '').toLowerCase();

                // 确保是6位十六进制
                const c1 = hex1.length === 3 ? hex1.replace(/(.)(.)(.)/, '$1$1$2$2$3$3') : hex1;
                const c2 = hex2.length === 3 ? hex2.replace(/(.)(.)(.)/, '$1$1$2$2$3$3') : hex2;

                // 转换为RGB
                const r1 = parseInt(c1.substr(0, 2), 16);
                const g1 = parseInt(c1.substr(2, 2), 16);
                const b1 = parseInt(c1.substr(4, 2), 16);

                const r2 = parseInt(c2.substr(0, 2), 16);
                const g2 = parseInt(c2.substr(2, 2), 16);
                const b2 = parseInt(c2.substr(4, 2), 16);

                // 计算欧几里得距离
                const distance = Math.sqrt(
                    Math.pow(r1 - r2, 2) +
                    Math.pow(g1 - g2, 2) +
                    Math.pow(b1 - b2, 2)
                );

                return distance <= tolerance;
            } catch (error) {
                console.warn('[SimplifiedGEM] 颜色比较失败:', error);
                return false;
            }
        };

        // 刷新颜色过滤器选项
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
                const hexColor = this.getComfyUIColorHex(colorName);
                // 如果无法获取十六进制值，仍然显示颜色名称（用于节点刚创建时）
                if (hexColor) {
                    const displayName = this.getColorDisplayName(colorName);
                    const isSelected = currentValue === colorName || currentValue === hexColor;
                    const selectedAttr = isSelected ? 'selected' : '';
                    options.push(`<option value="${colorName}" ${selectedAttr} style="background-color: ${hexColor}; color: ${this.getContrastColor(hexColor)};">${displayName}</option>`);
                } else {
                    // 如果无法获取颜色值，只显示名称
                    const displayName = this.getColorDisplayName(colorName);
                    const isSelected = currentValue === colorName;
                    const selectedAttr2 = isSelected ? 'selected' : '';
                    options.push(`<option value="${colorName}" ${selectedAttr2}>${displayName}</option>`);
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

        // 创建组项元素
        nodeType.prototype.createGroupItem = function (group, index) {
            const item = document.createElement('div');
            item.className = 'gem-group-item';
            item.draggable = true;
            item.dataset.groupId = group.id;

            // 获取可用的组列表
            const availableGroups = this.getAvailableGroups();
            const groupOptions = availableGroups.map(name => {
                const isSelected = name === group.group_name;
                const selectedAttr = isSelected ? 'selected' : '';
                return `<option value="${name}" ${selectedAttr}>${name}</option>`;
            }).join('');

            item.innerHTML = `
                <div class="gem-group-header">
                    <div class="gem-group-number">${index + 1}</div>
                    <select class="gem-group-name-select">
                        <option value="">选择组</option>
                        ${groupOptions}
                    </select>
                    <div class="gem-delay-container">
                        <label class="gem-delay-label">延迟:</label>
                        <input type="number"
                               class="gem-delay-input"
                               min="0"
                               step="0.1"
                               value="${group.delay_seconds || 0}">
                        <span class="gem-delay-unit">秒</span>
                    </div>
                    <button class="gem-delete-button">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            `;

            // 绑定事件
            const nameSelect = item.querySelector('.gem-group-name-select');
            nameSelect.addEventListener('change', (e) => {
                group.group_name = e.target.value;
                this.syncConfig();
            });

            const delayInput = item.querySelector('.gem-delay-input');
            delayInput.addEventListener('change', (e) => {
                group.delay_seconds = Math.max(0, parseFloat(e.target.value) || 0);
                e.target.value = group.delay_seconds;
                this.syncConfig();
            });

            const deleteButton = item.querySelector('.gem-delete-button');
            deleteButton.addEventListener('click', () => {
                this.deleteGroup(group.id);
            });

            // 拖拽事件
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', group.id);
                item.classList.add('dragging');
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });

            item.addEventListener('drop', (e) => {
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

        // 同步配置到widget
        nodeType.prototype.syncConfig = function () {
            const configWidget = this.widgets?.find(w => w.name === "group_config");
            if (!configWidget) {
                console.error('[SimplifiedGEM] 未找到 group_config widget');
                return;
            }

            const newConfig = JSON.stringify(this.properties.groups);
            configWidget.value = newConfig;
        };

        // 刷新组列表下拉选项
        nodeType.prototype.refreshGroupsList = function () {
            // 刷新颜色过滤器选项
            this.refreshColorFilter();

            const availableGroups = this.getAvailableGroups();

            // 更新所有组项的下拉选择框
            this.properties.groups.forEach((group, index) => {
                const groupItem = this.customUI.querySelectorAll('.gem-group-item')[index];
                if (!groupItem) return;

                const select = groupItem.querySelector('.gem-group-name-select');
                if (!select) return;

                // 保存当前选中的值
                const currentValue = select.value;

                // 重新生成选项
                const groupOptions = availableGroups.map(name => {
                    const isSelected = name === currentValue;
                    const selectedAttr = isSelected ? 'selected' : '';
                    return `<option value="${name}" ${selectedAttr}>${name}</option>`;
                }).join('');

                select.innerHTML = `<option value="">选择组</option>${groupOptions}`;

                // 如果当前值不在新的组列表中，清空选择
                if (currentValue && !availableGroups.includes(currentValue)) {
                    select.value = '';
                    group.group_name = '';
                    this.syncConfig();
                }
            });
        };

        // 设置图表变化监听器
        nodeType.prototype.setupGraphChangeListener = function () {
            // 保存上次的组列表
            this.lastGroupsList = this.getAvailableGroups().join(',');

            // 定期检查组列表是否发生变化
            this.groupsCheckInterval = setInterval(() => {
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

            // 保存自定义属性
            info.groups = this.properties.groups || [];
            info.selectedColorFilter = this.properties.selectedColorFilter || '';
            info.isExecuting = this.properties.isExecuting || false;

            // 保存节点尺寸信息
            info.gem_node_size = {
                width: this.size[0],
                height: this.size[1]
            };

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
                        typeof group.group_name === 'string' &&
                        typeof group.delay_seconds === 'number';
                });

                this.properties.groups = validGroups;
            } else {
                this.properties.groups = [];
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
                }, 100);
            }
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

