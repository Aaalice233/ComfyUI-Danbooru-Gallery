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
                groups: []  // 组列表
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
                        <button class="gem-refresh-button" id="gem-refresh" title="${t('refresh')}">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="23 4 23 10 17 10"></polyline>
                                <polyline points="1 20 1 14 7 14"></polyline>
                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                            </svg>
                        </button>
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
        };

        /**
         * 刷新组列表下拉选项
         */
        nodeType.prototype.refreshGroupsList = function() {
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

                select.innerHTML = `<option value="">选择组...</option>${groupOptions}`;

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
         * 获取工作流中的所有组
         */
        nodeType.prototype.getAvailableGroups = function() {
            if (!app.graph || !app.graph._groups) return [];

            return app.graph._groups
                .filter(g => g && g.title)
                .map(g => g.title)
                .sort((a, b) => a.localeCompare(b));
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
                if (this.customUI) {
                    this.updateGroupsList();
                }
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

                    // 检查组内是否有输出节点
                    const outputNodes = groupNodes.filter((n) => {
                        return n.mode !== LiteGraph.NEVER &&
                               n.constructor.nodeData?.output_node === true;
                    });

                    if (outputNodes.length === 0) {
                        const errorMsg = t('noOutputNodes', { groupName: group_name });
                        console.error(`[GEM-JS] #${executionId} ✗ ${errorMsg}`);
                        validationErrors.push(errorMsg);
                        continue;
                    }

                    console.log(`[GEM-JS] #${executionId} ✓ 组 "${group_name}" 验证通过 (${outputNodes.length} 个输出节点)`);
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
