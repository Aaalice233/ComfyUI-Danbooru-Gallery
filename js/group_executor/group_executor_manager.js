/**
 * 组执行管理器 - Group Executor Manager
 * 单节点管理多个组的执行顺序
 */

import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";
import { queueManager } from "./queue_manager.js";
import { globalMultiLanguageManager } from "../global/multi_language.js";

// Create convenience translation function for 'gem' namespace
const t = (key, params = {}) => {
    let text = globalMultiLanguageManager.t(`gem.${key}`);
    // Replace parameters like {groupName}, {errors}, etc.
    if (params && typeof text === 'string') {
        text = text.replace(/\{(\w+)\}/g, (match, param) => {
            return params[param] !== undefined ? params[param] : match;
        });
    }
    return text;
};

app.registerExtension({
    name: "GroupExecutorManager",

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== "GroupExecutorManager") return;

        // 添加自定义Widget
        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function() {
            const result = onNodeCreated?.apply(this, arguments);

            // 初始化节点属性
            this.properties = {
                isExecuting: false,
                groups: [],  // 组列表
                selectedColorFilter: ''  // 当前选中的颜色过滤器
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

        /**
         * 创建自定义UI界面
         */
        nodeType.prototype.createCustomUI = function() {

            const container = document.createElement('div');
            container.className = 'gem-container';

            // 创建样式
            this.addStyles();

            // 创建布局
            container.innerHTML = `
                <div class="gem-content">
                    <div class="gem-groups-header">
                        <span class="gem-groups-title">${t('title')}</span>
                        <div class="gem-header-controls">
                            <div class="gem-color-filter-container" id="gem-color-filter-container">
                                <span class="gem-filter-label">${t('filterOptions')}</span>
                                <select class="gem-color-filter-select" id="gem-color-filter" title="${t('filterByColor')}">
                                    <option value="">${t('allColors')}</option>
                                </select>
                            </div>
                            <button class="gem-refresh-button" id="gem-refresh" title="${t('refresh')}">
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
                            <span>${t('addGroup')}</span>
                        </button>
                        <button class="gem-language-switch" id="gem-language-switch" title="${t('languageSwitch')}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="2" y1="12" x2="22" y2="12"></line>
                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                            </svg>
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
        };

        /**
         * 设置图表变化监听器
         */
        nodeType.prototype.setupGraphChangeListener = function() {
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

        /**
         * 添加样式
         */
        nodeType.prototype.addStyles = function() {
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

                .gem-color-filter-select option {
                    background: #2a2a3e;
                    color: #E0E0E0;
                }

                .gem-color-filter-select::-ms-expand {
                    display: none;
                }

                .gem-color-filter-container::after {
                    content: '';
                    position: absolute;
                    right: 8px;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 0;
                    height: 0;
                    border-left: 4px solid transparent;
                    border-right: 4px solid transparent;
                    border-top: 4px solid #B0B0B0;
                    pointer-events: none;
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

                .gem-group-name-select option {
                    background: #2a2a3e;
                    color: #E0E0E0;
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

                .gem-language-switch {
                    padding: 10px;
                    background: rgba(64, 64, 84, 0.8);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    color: #E0E0E0;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .gem-language-switch:hover {
                    background: rgba(116, 55, 149, 0.6);
                    border-color: rgba(116, 55, 149, 0.5);
                    transform: translateY(-1px);
                }

                .gem-language-switch svg {
                    stroke: #E0E0E0;
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

        /**
         * 切换语言
         */
        nodeType.prototype.switchLanguage = function() {
            // 在中英文之间切换
            const currentLang = globalMultiLanguageManager.getLanguage();
            const newLang = currentLang === 'zh' ? 'en' : 'zh';

            // 切换全局语言（silent模式避免触发全局事件）
            globalMultiLanguageManager.setLanguage(newLang, true);

            console.log(`[GEM] Language switched to: ${newLang}`);

            // 更新 UI 文本（不重新创建整个 UI，避免 widget 重复添加）
            this.updateUIText();
        };

        /**
         * 更新 UI 文本（语言切换时使用）
         */
        nodeType.prototype.updateUIText = function() {
            if (!this.customUI) return;

            // 更新标题
            const titleElement = this.customUI.querySelector('.gem-groups-title');
            if (titleElement) {
                titleElement.textContent = t('title');
            }

            // 更新刷新按钮提示
            const refreshButton = this.customUI.querySelector('#gem-refresh');
            if (refreshButton) {
                refreshButton.title = t('refresh');
            }

            // 更新语言切换按钮提示
            const languageButton = this.customUI.querySelector('#gem-language-switch');
            if (languageButton) {
                languageButton.title = t('languageSwitch');
            }

            // 更新颜色过滤器
            const colorFilter = this.customUI.querySelector('#gem-color-filter');
            if (colorFilter && colorFilter.options[0]) {
                colorFilter.options[0].text = t('allColors');
                colorFilter.title = t('filterByColor');
            }

            // 更新过滤选项标签
            const filterLabel = this.customUI.querySelector('.gem-filter-label');
            if (filterLabel) {
                filterLabel.textContent = t('filterOptions');
            }

            // 更新添加组按钮
            const addButtonText = this.customUI.querySelector('#gem-add-group span');
            if (addButtonText) {
                addButtonText.textContent = t('addGroup');
            }

            // 更新所有组项的文本
            this.properties.groups.forEach((group, index) => {
                const groupItem = this.customUI.querySelectorAll('.gem-group-item')[index];
                if (!groupItem) return;

                // 更新选择组下拉框的占位符
                const select = groupItem.querySelector('.gem-group-name-select');
                if (select && select.options[0]) {
                    select.options[0].text = t('selectGroup');
                }

                // 更新延迟标签
                const delayLabel = groupItem.querySelector('.gem-delay-label');
                if (delayLabel) {
                    delayLabel.textContent = t('delay') + ':';
                }

                // 更新延迟单位
                const delayUnit = groupItem.querySelector('.gem-delay-unit');
                if (delayUnit) {
                    delayUnit.textContent = t('seconds');
                }
            });

            // 重新刷新颜色过滤器以更新选项文本
            this.refreshColorFilter();

            console.log('[GEM] UI text updated');
        };

        /**
         * 绑定UI事件
         */
        nodeType.prototype.bindUIEvents = function() {
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

            // 语言切换按钮
            const languageButton = container.querySelector('#gem-language-switch');
            if (languageButton) {
                languageButton.addEventListener('click', () => {
                    this.switchLanguage();
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

        /**
         * 刷新组列表下拉选项
         */
        nodeType.prototype.refreshGroupsList = function() {
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
                const groupOptions = availableGroups.map(name =>
                    `<option value="${name}" ${name === currentValue ? 'selected' : ''}>${name}</option>`
                ).join('');

                select.innerHTML = `<option value="">${t('selectGroup')}</option>${groupOptions}`;

                // 如果当前值不在新的组列表中，清空选择
                if (currentValue && !availableGroups.includes(currentValue)) {
                    select.value = '';
                    group.group_name = '';
                    this.syncConfig();
                }
            });
        };

        /**
         * 添加组
         */
        nodeType.prototype.addGroup = function() {
            const newGroup = {
                id: Date.now(),
                group_name: '',
                delay_seconds: 0
            };

            this.properties.groups.push(newGroup);
            this.updateGroupsList();
            this.syncConfig();
        };

        /**
         * 删除组
         */
        nodeType.prototype.deleteGroup = function(groupId) {
            const index = this.properties.groups.findIndex(g => g.id === groupId);
            if (index !== -1) {
                this.properties.groups.splice(index, 1);
                this.updateGroupsList();
                this.syncConfig();
            }
        };

        /**
         * 更新组列表显示
         */
        nodeType.prototype.updateGroupsList = function() {
            const listContainer = this.customUI.querySelector('#gem-groups-list');
            listContainer.innerHTML = '';

            this.properties.groups.forEach((group, index) => {
                const groupItem = this.createGroupItem(group, index);
                listContainer.appendChild(groupItem);
            });
        };

        /**
         * 获取工作流中的所有组（支持颜色过滤）
         */
        nodeType.prototype.getAvailableGroups = function() {
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

        /**
         * 获取ComfyUI内置颜色列表
         */
        nodeType.prototype.getAvailableGroupColors = function() {
            // 只返回ComfyUI内置颜色
            const builtinColors = [
                'red', 'brown', 'green', 'blue', 'pale blue',
                'cyan', 'purple', 'yellow', 'black'
            ];

            return builtinColors;
        };

        /**
         * 标准化颜色格式
         */
        nodeType.prototype.normalizeColor = function(color) {
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

        /**
         * 获取ComfyUI内置颜色的十六进制值
         */
        nodeType.prototype.getComfyUIColorHex = function(colorName) {
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

            // 动态检测工作流中该颜色名称对应的实际颜色值
            const dynamicColor = this.getDynamicColorFromWorkflow(normalizedColor);
            if (dynamicColor) {
                return dynamicColor;
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

        /**
         * 从工作流中动态检测颜色值
         */
        nodeType.prototype.getDynamicColorFromWorkflow = function(colorName) {
            if (!app.graph || !app.graph._groups) return null;

            const colorNameLower = colorName.toLowerCase();
            const matchingColors = new Set();

            // 收集所有匹配该颜色名称的组的实际颜色值
            app.graph._groups.forEach(group => {
                if (group && group.color) {
                    // 检查组名称是否包含颜色名称
                    const groupTitleLower = group.title.toLowerCase();
                    if (groupTitleLower.includes(colorNameLower)) {
                        matchingColors.add(this.normalizeColor(group.color));
                    }
                }
            });

            // 如果找到了匹配的颜色，使用最常见的那个
            if (matchingColors.size > 0) {
                const colorArray = Array.from(matchingColors);
                // 简单选择第一个匹配的颜色
                return colorArray[0];
            }

            return null;
        };

        /**
         * 检查组是否匹配指定颜色
         */
        nodeType.prototype.matchesGroupColor = function(group, filterColor) {
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

        /**
         * 通过颜色名称匹配（检查ComfyUI内置颜色映射）
         */
        nodeType.prototype.matchColorByName = function(groupColor, filterColorName) {
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

        /**
         * 检查两个颜色是否相近（容差匹配）
         */
        nodeType.prototype.isColorClose = function(color1, color2, tolerance = 50) {
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
                console.warn('[GEM] 颜色比较失败:', error);
                return false;
            }
        };

        /**
         * 刷新颜色过滤器选项
         */
        nodeType.prototype.refreshColorFilter = function() {
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
                    options.push(`<option value="${colorName}" ${isSelected ? 'selected' : ''} style="background-color: ${hexColor}; color: ${this.getContrastColor(hexColor)};">${displayName}</option>`);
                } else {
                    // 如果无法获取颜色值，只显示名称
                    const displayName = this.getColorDisplayName(colorName);
                    const isSelected = currentValue === colorName;
                    options.push(`<option value="${colorName}" ${isSelected ? 'selected' : ''}>${displayName}</option>`);
                }
            });

            // 构建最终的选项HTML
            const allOptions = [
                `<option value="">${t('allColors')}</option>`,
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

        /**
         * 获取颜色显示名称
         */
        nodeType.prototype.getColorDisplayName = function(color) {
            if (!color) return t('allColors');

            // 如果是颜色名称，返回首字母大写的格式
            const builtinColors = ['red', 'brown', 'green', 'blue', 'pale blue', 'cyan', 'purple', 'yellow', 'black'];
            if (builtinColors.includes(color.toLowerCase())) {
                const formattedName = color.toLowerCase();
                return formattedName.charAt(0).toUpperCase() + formattedName.slice(1);
            }

            // 默认返回原始值
            return color;
        };

        /**
         * 获取对比色（用于文本颜色）
         */
        nodeType.prototype.getContrastColor = function(hexColor) {
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

        /**
         * 创建组项元素
         */
        nodeType.prototype.createGroupItem = function(group, index) {
            const item = document.createElement('div');
            item.className = 'gem-group-item';
            item.draggable = true;
            item.dataset.groupId = group.id;

            // 获取可用的组列表
            const availableGroups = this.getAvailableGroups();
            const groupOptions = availableGroups.map(name =>
                `<option value="${name}" ${name === group.group_name ? 'selected' : ''}>${name}</option>`
            ).join('');

            item.innerHTML = `
                <div class="gem-group-header">
                    <div class="gem-group-number">${index + 1}</div>
                    <select class="gem-group-name-select">
                        <option value="">${t('selectGroup')}</option>
                        ${groupOptions}
                    </select>
                    <div class="gem-delay-container">
                        <label class="gem-delay-label">${t('delay')}:</label>
                        <input type="number"
                               class="gem-delay-input"
                               min="0"
                               step="0.1"
                               value="${group.delay_seconds || 0}">
                        <span class="gem-delay-unit">${t('seconds')}</span>
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

                console.log(`[GEM] 拖拽排序: draggedIndex=${draggedIndex}, targetIndex=${targetIndex}`);
                console.log(`[GEM] 拖拽前数组:`, this.properties.groups.map((g, i) => `[${i}] ${g.group_name}`));

                if (draggedIndex !== -1 && draggedIndex !== targetIndex) {
                    const [draggedGroup] = this.properties.groups.splice(draggedIndex, 1);
                    this.properties.groups.splice(targetIndex, 0, draggedGroup);

                    console.log(`[GEM] 拖拽后数组:`, this.properties.groups.map((g, i) => `[${i}] ${g.group_name}`));

                    this.updateGroupsList();
                    this.syncConfig();
                }
            });

            return item;
        };

        /**
         * 从widget加载配置
         */
        nodeType.prototype.loadConfigFromWidget = function() {
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

        /**
         * 同步配置到widget
         */
        nodeType.prototype.syncConfig = function() {
            console.log('[GEM-SYNC] ========== 同步配置 ==========');
            console.log('[GEM-SYNC] 时间戳:', new Date().toISOString());

            const configWidget = this.widgets?.find(w => w.name === "group_config");
            if (!configWidget) {
                console.error('[GEM-SYNC] ✗ 未找到 group_config widget');
                return;
            }

            const newConfig = JSON.stringify(this.properties.groups);
            const oldConfig = configWidget.value;

            console.log('[GEM-SYNC] 准备更新配置...');
            console.log('[GEM-SYNC] 组数量:', this.properties.groups.length);
            console.log('[GEM-SYNC] 组顺序:', this.properties.groups.map((g, i) => `[${i}] ${g.group_name}`));
            console.log('[GEM-SYNC] 旧配置长度:', oldConfig?.length || 0);
            console.log('[GEM-SYNC] 新配置长度:', newConfig.length);

            // 更新配置
            configWidget.value = newConfig;

            // 验证更新是否成功
            setTimeout(() => {
                const verifyConfig = configWidget.value;
                if (verifyConfig === newConfig) {
                    console.log('[GEM-SYNC] ✓ 配置更新成功，验证通过');
                } else {
                    console.error('[GEM-SYNC] ✗ 配置更新失败！');
                    console.error('[GEM-SYNC] 期望配置:', newConfig);
                    console.error('[GEM-SYNC] 实际配置:', verifyConfig);
                }
            }, 10);
        };


        /**
         * 序列化额外数据
         */
        const onSerialize = nodeType.prototype.onSerialize;
        nodeType.prototype.onSerialize = function(info) {
            const data = onSerialize?.apply?.(this, arguments);
            info.groups = this.properties.groups;
            info.selectedColorFilter = this.properties.selectedColorFilter;
            return data;
        };

        /**
         * 反序列化数据
         */
        const onConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function(info) {
            onConfigure?.apply?.(this, arguments);
            if (info.groups) {
                this.properties.groups = info.groups;
            }
            if (info.selectedColorFilter !== undefined) {
                this.properties.selectedColorFilter = info.selectedColorFilter;
            }
            if (this.customUI) {
                this.updateGroupsList();
                // 恢复颜色过滤器选择
                setTimeout(() => {
                    const colorFilter = this.customUI.querySelector('#gem-color-filter');
                    if (colorFilter) {
                        colorFilter.value = this.properties.selectedColorFilter || '';
                    }
                }, 100);
            }
        };

        /**
         * 节点被移除时清理资源
         */
        const onRemoved = nodeType.prototype.onRemoved;
        nodeType.prototype.onRemoved = function() {
            onRemoved?.apply?.(this, arguments);
            // 清除定时器
            if (this.groupsCheckInterval) {
                clearInterval(this.groupsCheckInterval);
                this.groupsCheckInterval = null;
            }
        };
    },

    async setup() {
        // 生成唯一的监听器 ID
        const listenerID = `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // 检测重复注册
        if (!window._gemSetupCount) {
            window._gemSetupCount = 0;
        }
        window._gemSetupCount++;

        console.log(`[GEM-SETUP] ==================== Setup() 被调用 #${window._gemSetupCount} ====================`);
        console.log(`[GEM-SETUP] 监听器ID: ${listenerID}`);
        console.log(`[GEM-SETUP] 时间戳: ${new Date().toISOString()}`);

        if (window._gemSetupCount > 1) {
            console.warn(`[GEM-SETUP] ⚠️ 警告：setup() 已被调用 ${window._gemSetupCount} 次，可能存在重复监听器！`);
        }

        // 全局执行计数器，用于调试和防护
        let globalExecutionCounter = 0;

        console.log(`[GEM-SETUP] 准备注册 addEventListener...`);

        /**
         * 监听错误事件（从后端触发）
         */
        api.addEventListener("group_executor_error", ({ detail }) => {
            console.error(`[GEM-ERROR] 收到错误信息:`, detail);

            const errors = detail.errors || [];
            if (errors.length === 0) return;

            // 构建错误消息
            const errorList = errors.map((err, idx) => `${idx + 1}. ${err}`).join('\n');
            const errorMessage = t('configError', { errors: errorList });

            // 显示错误对话框
            app.ui.dialog.show(errorMessage);
        });

        /**
         * 监听执行事件（从后端触发）
         */
        api.addEventListener("group_executor_execute", async ({ detail }) => {
            // 在最开始就打印接收信息
            console.log(`[GEM-JS] <<<<<<<<<< WebSocket 消息到达 >>>>>>>>>>`);
            console.log(`[GEM-JS] 监听器ID: ${listenerID}`);
            console.log(`[GEM-JS] 接收时间: ${new Date().toISOString()}`);
            console.log(`[GEM-JS] detail 对象:`, JSON.parse(JSON.stringify(detail)));

            globalExecutionCounter++;
            const executionId = globalExecutionCounter;

            console.log(`[GEM-JS] ========== 开始处理执行事件 #${executionId} ==========`);
            console.log(`[GEM-JS] #${executionId} 节点ID:`, detail.node_id);
            console.log(`[GEM-JS] #${executionId} Python 执行ID:`, detail.python_exec_id);
            console.log(`[GEM-JS] #${executionId} Python 时间戳:`, detail.timestamp);
            console.log(`[GEM-JS] #${executionId} 执行列表:`, detail.execution_list);
            console.log(`[GEM-JS] #${executionId} 执行列表长度:`, detail.execution_list?.length);
            console.log(`[GEM-JS] #${executionId} 组顺序:`, detail.execution_list?.map(e => e.group_name));

            console.log(`[GEM-JS] #${executionId} 查找节点...`);
            const node = app.graph._nodes_by_id[detail.node_id];
            if (!node) {
                console.error(`[GEM-JS] #${executionId} ✗ 未找到节点:`, detail.node_id);
                console.error(`[GEM-JS] #${executionId} 可用节点ID:`, Object.keys(app.graph._nodes_by_id));
                return;
            }
            console.log(`[GEM-JS] #${executionId} ✓ 找到节点，类型:`, node.type);

            console.log(`[GEM-JS] #${executionId} 检查执行锁...`);
            console.log(`[GEM-JS] #${executionId} 当前 isExecuting 状态:`, node.properties.isExecuting);
            console.log(`[GEM-JS] #${executionId} 节点属性:`, {
                isExecuting: node.properties.isExecuting,
                groups: node.properties.groups?.length || 0
            });

            if (node.properties.isExecuting) {
                console.warn(`[GEM-JS] #${executionId} ⚠️ 节点正在执行中，忽略此次请求`);
                console.warn(`[GEM-JS] #${executionId} ⚠️ 这可能表示有重复执行的问题！`);
                console.warn(`[GEM-JS] #${executionId} ⚠️ 监听器ID: ${listenerID}`);
                console.warn(`[GEM-JS] #${executionId} ⚠️ Python 执行ID: ${detail.python_exec_id}`);
                return;
            }

            const executionList = detail.execution_list;

            console.log(`[GEM-JS] #${executionId} ✓ 执行锁检查通过，设置执行锁...`);
            node.properties.isExecuting = true;
            console.log(`[GEM-JS] #${executionId} ✓ 执行锁已设置为 true`);
            console.log(`[GEM-JS] #${executionId} ========== 即将按以下顺序执行 ==========`);
            console.log(`[GEM-JS] #${executionId} 执行顺序: ${executionList.map(e => e.group_name).join(' -> ')}`);

            try {
                // ========== 执行前验证 ==========
                console.log(`[GEM-JS] #${executionId} ========== 开始执行前验证 ==========`);
                const validationErrors = [];

                for (let idx = 0; idx < executionList.length; idx++) {
                    const execution = executionList[idx];
                    const group_name = execution.group_name;

                    // 跳过延迟标记
                    if (group_name === "__delay__") continue;

                    console.log(`[GEM-JS] #${executionId} 验证组 "${group_name}" (${idx + 1}/${executionList.length})`);

                    // 检查组是否存在
                    const group = app.graph._groups.find(g => g.title === group_name);
                    if (!group) {
                        const errorMsg = t('groupNotFound', { groupName: group_name });
                        console.error(`[GEM-JS] #${executionId} ✗ ${errorMsg}`);
                        validationErrors.push(errorMsg);
                        continue;
                    }

                    // 检查组内是否有节点
                    const groupNodes = [];
                    for (const n of app.graph._nodes) {
                        if (!n || !n.pos) continue;
                        if (LiteGraph.overlapBounding(group._bounding, n.getBounding())) {
                            groupNodes.push(n);
                        }
                    }

                    if (groupNodes.length === 0) {
                        const errorMsg = t('noNodesInGroup', { groupName: group_name });
                        console.error(`[GEM-JS] #${executionId} ✗ ${errorMsg}`);
                        validationErrors.push(errorMsg);
                        continue;
                    }

                    // 检查组内是否有输出节点，区分mute状态
                    const allOutputNodes = groupNodes.filter((n) =>
                        n.constructor.nodeData?.output_node === true
                    );
                    const activeOutputNodes = allOutputNodes.filter((n) =>
                        n.mode !== LiteGraph.NEVER
                    );

                    if (allOutputNodes.length === 0) {
                        // 真正没有输出节点，这是严重错误
                        const errorMsg = t('noOutputNodes', { groupName: group_name });
                        console.error(`[GEM-JS] #${executionId} ✗ ${errorMsg}`);
                        validationErrors.push(errorMsg);
                        continue;
                    } else if (activeOutputNodes.length === 0) {
                        // 所有输出节点都被mute，记录跳过状态但不报错
                        console.warn(`[GEM-JS] #${executionId} ⚠️ 组 "${group_name}" 内所有输出节点已被静音，将跳过执行`);
                        // 在execution对象中标记跳过原因
                        execution.skipReason = 'all_nodes_muted';
                    } else {
                        console.log(`[GEM-JS] #${executionId} ✓ 组 "${group_name}" 验证通过 (${activeOutputNodes.length} 个活跃输出节点)`);
                    }
                }

                // 如果有验证错误，显示并退出
                if (validationErrors.length > 0) {
                    console.error(`[GEM-JS] #${executionId} ✗ 验证失败，发现 ${validationErrors.length} 个错误`);

                    const errorList = validationErrors.map((err, idx) => `${idx + 1}. ${err}`).join('\n');
                    const errorMessage = t('validationFailed', { errors: errorList });

                    app.ui.dialog.show(errorMessage);

                    // 释放锁并退出
                    node.properties.isExecuting = false;
                    console.error(`[GEM-JS] #${executionId} 由于验证失败，已释放执行锁`);
                    return;
                }

                console.log(`[GEM-JS] #${executionId} ✓ 所有组验证通过`);
                console.log(`[GEM-JS] #${executionId} ========== 开始执行循环 ==========`);
                const startTime = Date.now();

                for (let idx = 0; idx < executionList.length; idx++) {
                    const execution = executionList[idx];
                    const group_name = execution.group_name;
                    const delay_seconds = parseFloat(execution.delay_seconds) || 0;

                    const itemStartTime = Date.now();
                    console.log(`[GEM-JS] #${executionId} ========================================`);
                    console.log(`[GEM-JS] #${executionId} 处理第 ${idx + 1}/${executionList.length} 项`);
                    console.log(`[GEM-JS] #${executionId} 组名: "${group_name}"`);
                    console.log(`[GEM-JS] #${executionId} 延迟: ${delay_seconds}秒`);
                    console.log(`[GEM-JS] #${executionId} 执行对象:`, execution);

                    // 处理延迟标记
                    if (group_name === "__delay__") {
                        if (delay_seconds > 0) {
                            console.log(`[GEM-JS] #${executionId} 执行延迟等待 ${delay_seconds}秒`);
                            await new Promise(resolve =>
                                setTimeout(resolve, delay_seconds * 1000)
                            );
                            console.log(`[GEM-JS] #${executionId} ✓ 延迟等待完成`);
                        }
                        continue;
                    }

                    // 检查是否需要跳过（所有输出节点被mute）
                    if (execution.skipReason === 'all_nodes_muted') {
                        // 弹出toast提示
                        app.ui.toast(`组 "${group_name}" 内所有节点已被静音，跳过执行`);
                        console.log(`[GEM-JS] #${executionId} 跳过被mute的组: "${group_name}"`);
                        continue; // 跳过该组，继续下一个
                    }

                    // 查找组
                    console.log(`[GEM-JS] #${executionId} 查找组 "${group_name}"...`);
                    const group = app.graph._groups.find(g => g.title === group_name);
                    if (!group) {
                        console.error(`[GEM-JS] #${executionId} ✗ 未找到组: "${group_name}"`);
                        console.error(`[GEM-JS] #${executionId} 可用的组:`, app.graph._groups.map(g => g.title));
                        throw new Error(`未找到组: ${group_name}`);
                    }
                    console.log(`[GEM-JS] #${executionId} ✓ 找到组 "${group_name}"`);

                    // 查找组内的输出节点
                    console.log(`[GEM-JS] #${executionId} 查找组内输出节点...`);
                    const groupNodes = [];
                    for (const n of app.graph._nodes) {
                        if (!n || !n.pos) continue;
                        if (LiteGraph.overlapBounding(group._bounding, n.getBounding())) {
                            groupNodes.push(n);
                        }
                    }
                    console.log(`[GEM-JS] #${executionId} 组内节点数: ${groupNodes.length}`);

                    const outputNodes = groupNodes.filter((n) => {
                        return n.mode !== LiteGraph.NEVER &&
                               n.constructor.nodeData?.output_node === true;
                    });
                    console.log(`[GEM-JS] #${executionId} 输出节点数: ${outputNodes.length}`);
                    console.log(`[GEM-JS] #${executionId} 输出节点:`, outputNodes.map(n => `${n.type}(${n.id})`));

                    if (!outputNodes.length) {
                        console.error(`[GEM-JS] #${executionId} ✗ 组 "${group_name}" 中没有找到输出节点`);
                        throw new Error(`组 "${group_name}" 中没有找到输出节点`);
                    }

                    // 执行输出节点
                    const nodeIds = outputNodes.map(n => n.id);
                    console.log(`[GEM-JS] #${executionId} ========== 提交执行任务 ==========`);
                    console.log(`[GEM-JS] #${executionId} 目标节点ID:`, nodeIds);
                    console.log(`[GEM-JS] #${executionId} 提交时间:`, new Date().toISOString());

                    await queueManager.queueOutputNodes(nodeIds);

                    console.log(`[GEM-JS] #${executionId} ✓ 任务已提交，等待队列完成...`);
                    // 等待执行完成
                    await new Promise((resolve) => {
                        const checkQueue = async () => {
                            const response = await api.fetchApi('/queue');
                            const data = await response.json();
                            const isRunning = (data.queue_running || []).length > 0;
                            const isPending = (data.queue_pending || []).length > 0;

                            if (!isRunning && !isPending) {
                                console.log(`[GEM-JS] #${executionId} ✓ 队列已清空`);
                                setTimeout(resolve, 100);
                                return;
                            }

                            setTimeout(checkQueue, 500);
                        };
                        checkQueue();
                    });

                    const itemEndTime = Date.now();
                    const itemDuration = (itemEndTime - itemStartTime) / 1000;
                    console.log(`[GEM-JS] #${executionId} ✓ 组 "${group_name}" 执行完成，耗时: ${itemDuration.toFixed(2)}秒`);

                    // 延迟（如果不是最后一个组）
                    if (delay_seconds > 0 && idx < executionList.length - 1) {
                        console.log(`[GEM-JS] #${executionId} 组间延迟等待 ${delay_seconds}秒`);
                        await new Promise(resolve =>
                            setTimeout(resolve, delay_seconds * 1000)
                        );
                        console.log(`[GEM-JS] #${executionId} ✓ 组间延迟完成`);
                    }
                }

                const endTime = Date.now();
                const totalDuration = (endTime - startTime) / 1000;
                console.log(`[GEM-JS] #${executionId} ==================== 所有组执行完成 ====================`);
                console.log(`[GEM-JS] #${executionId} 总耗时: ${totalDuration.toFixed(2)}秒`);
                console.log(`[GEM-JS] #${executionId} 监听器ID: ${listenerID}`);
                console.log(`[GEM-JS] #${executionId} Python 执行ID: ${detail.python_exec_id}`);

            } catch (error) {
                console.error(`[GEM-JS] #${executionId} ==================== 执行错误 ====================`);
                console.error(`[GEM-JS] #${executionId} 错误类型:`, error.constructor.name);
                console.error(`[GEM-JS] #${executionId} 错误消息:`, error.message);
                console.error(`[GEM-JS] #${executionId} 错误堆栈:`, error.stack);
                console.error(`[GEM-JS] #${executionId} 监听器ID: ${listenerID}`);
                console.error(`[GEM-JS] #${executionId} Python 执行ID: ${detail.python_exec_id}`);
            } finally {
                console.log(`[GEM-JS] #${executionId} ========== Finally 块 ==========`);
                console.log(`[GEM-JS] #${executionId} 释放执行锁...`);
                node.properties.isExecuting = false;
                console.log(`[GEM-JS] #${executionId} ✓ 执行锁已释放`);
                console.log(`[GEM-JS] #${executionId} ========== 事件处理完成 ==========`);
            }
        });

        console.log(`[GEM-SETUP] ✓ addEventListener 注册完成`);
        console.log(`[GEM-SETUP] ==================== Setup() 完成 ====================`);
    }
});
