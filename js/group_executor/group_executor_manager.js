/**
 * 组执行管理器 - Group Executor Manager
 * 单节点管理多个组的执行顺序
 */

import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";
import { queueManager } from "./queue_manager.js";
import { globalMultiLanguageManager } from "../global/multi_language.js";
import { toastManagerProxy } from "../global/toast_manager.js";
import "./websocket_diagnostic.js";  // 加载WebSocket诊断工具

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

    /**
     * 在应用初始化时调用
     */
    async init(app) {
        console.log(`[GEM] ========== GroupExecutorManager Extension Initialized ==========`);

        // 加载WebSocket诊断工具
        if (!window.gemWebSocketDiagnostic) {
            console.log(`[GEM] Loading WebSocket diagnostic tool...`);
        }
    },

    /**
     * 在应用完全设置后调用
     */
    async setup(app) {
        console.log(`[GEM] ========== GroupExecutorManager Extension Setup Started ==========`);

        // =================================================================
        // 定义辅助函数（在 setup 内部，确保作用域正确）
        // =================================================================

        /**
         * 设置指定组的激活状态（mute/unmute）
         */
        const setGroupActive = (groupName, isActive) => {
            if (!app.graph || !app.graph._groups) return;
            const group = app.graph._groups.find(g => g.title === groupName);
            if (group) {
                group.is_muted = !isActive;
                console.log(`[GEM-GROUP] ${isActive ? 'Unmuting' : 'Muting'} group: ${groupName}`);
            }
        };

        /**
         * 更新节点状态widget
         */
        const updateNodeStatus = (node, statusText) => {
            if (!node || !node.widgets) return;
            const widget = node.widgets.find(w => w.name === "status");
            if (widget) {
                widget.value = statusText;
            }
        };

        /**
         * 更新节点进度widget
         */
        const updateNodeProgress = (node, progress) => {
            if (!node || !node.widgets) return;
            const widget = node.widgets.find(w => w.name === "progress");
            if (widget) {
                widget.value = progress;
            }
        };

        /**
         * 释放节点的执行锁
         */
        const releaseExecutionLock = (node) => {
            if (node) {
                node._executionLock = false;
                node._executionLockStartTime = null;
                if (node.properties) {
                    node.properties.isExecuting = false;
                }
            }
        };

        /**
         * 重置节点的执行状态
         * 关键：会 mute 所有受控组，并重置节点状态
         */
        const resetExecutionState = (node) => {
            if (!node || !node.widgets) {
                console.warn('[GEM-RESET] 节点无效或缺少widgets，无法重置状态');
                return;
            }
            console.log(`[GEM-RESET] 正在为节点 #${node.id} 重置执行状态...`);

            try {
                // 1. Mute 所有受控组
                const configWidget = node.widgets.find(w => w.name === "group_config");
                if (configWidget && configWidget.value) {
                    const config = JSON.parse(configWidget.value);
                    if (Array.isArray(config)) {
                        for (const group of config) {
                            if (group.group_name && group.group_name !== '__delay__') {
                                setGroupActive(group.group_name, false); // Mute all groups
                            }
                        }
                    }
                }

                // 2. 释放执行锁
                releaseExecutionLock(node);

                // 3. 更新UI
                updateNodeStatus(node, t('idle'));
                updateNodeProgress(node, 0);

                // 4. 强制重绘
                app.graph.setDirtyCanvas(true, true);

                console.log(`[GEM-RESET] ✓ 节点 #${node.id} 状态已重置`);
            } catch (e) {
                console.error(`[GEM-RESET] 重置状态时出错:`, e);
            }
        };

        // =================================================================
        // 注册WebSocket事件监听器
        // =================================================================

        console.log(`[GEM-SETUP] 注册 'execution_interrupted' 监听器...`);
        api.addEventListener("execution_interrupted", () => {
            console.log("[GEM-INTERRUPT] ========== 监听到执行中断事件 ==========");
            // 遍历所有节点，重置所有组执行管理器的状态
            const allNodes = app.graph._nodes;
            if (allNodes && allNodes.length > 0) {
                for (const node of allNodes) {
                    if (node.type === "GroupExecutorManager") {
                        console.log(`[GEM-INTERRUPT] 正在重置节点 #${node.id} 的状态...`);
                        resetExecutionState(node);
                    }
                }
            }
            console.log("[GEM-INTERRUPT] ✓ 所有组执行管理器节点已重置");
        });
        console.log(`[GEM-SETUP] ✓ 'execution_interrupted' 监听器注册成功`);

        console.log(`[GEM-SETUP] 注册 'group_executor_execute' 监听器...`);
        api.addEventListener("group_executor_execute", async ({ detail }) => {
            console.log(`[GEM-JS] ========== WebSocket 消息到达 ==========`);
            console.log(`[GEM-JS] detail:`, detail);

            const nodeId = String(detail.node_id);
            const node = app.graph._nodes_by_id[nodeId];

            if (!node) {
                console.error(`[GEM-JS] ✗ 未找到节点:`, nodeId);
                return;
            }

            console.log(`[GEM-JS] ✓ 找到节点 #${nodeId}`);

            // 执行前重置状态
            console.log(`[GEM-JS] 执行前重置节点状态...`);
            resetExecutionState(node);

            // 按顺序执行组
            const executionList = detail.execution_list;
            console.log(`[GEM-JS] 执行列表:`, executionList.map(e => e.group_name));

            try {
                updateNodeStatus(node, t('executing'));

                for (let i = 0; i < executionList.length; i++) {
                    const item = executionList[i];
                    const progress = (i + 1) / executionList.length;

                    console.log(`[GEM-JS] [${i + 1}/${executionList.length}] 执行组: ${item.group_name}`);

                    // 跳过延迟标记
                    if (item.group_name === '__delay__') {
                        if (item.delay_seconds > 0) {
                            console.log(`[GEM-JS] 执行延迟 ${item.delay_seconds} 秒...`);
                            await new Promise(resolve => setTimeout(resolve, item.delay_seconds * 1000));
                        }
                        continue;
                    }

                    // Unmute 当前组
                    setGroupActive(item.group_name, true);
                    updateNodeStatus(node, t('executingGroup', { groupName: item.group_name }));
                    updateNodeProgress(node, progress);

                    // 触发队列（执行当前 unmute 的组）
                    console.log(`[GEM-JS] 触发队列执行组: ${item.group_name}...`);
                    try {
                        window.GEM_EXECUTING_GROUP = true;
                        console.log(`[GEM-JS] 设置 GEM_EXECUTING_GROUP = true`);
                        await app.queuePrompt(0, 1);
                    } finally {
                        window.GEM_EXECUTING_GROUP = false;
                        console.log(`[GEM-JS] 设置 GEM_EXECUTING_GROUP = false`);
                    }

                    // 等待队列完成
                    console.log(`[GEM-JS] 等待队列完成...`);
                    await new Promise((resolve) => {
                        let hasStarted = false; // 标记队列是否已经开始执行

                        const checkQueue = () => {
                            api.fetchApi('/queue')
                                .then(response => response.json())
                                .then(data => {
                                    const isRunning = (data.queue_running || []).length > 0;
                                    const isPending = (data.queue_pending || []).length > 0;

                                    // 如果队列正在运行或有待处理项，说明已经开始了
                                    if (isRunning || isPending) {
                                        hasStarted = true;
                                        console.log(`[GEM-JS] 队列正在执行... (running: ${data.queue_running?.length || 0}, pending: ${data.queue_pending?.length || 0})`);
                                    }

                                    // 只有在队列已经开始执行后，才检查是否完成
                                    if (hasStarted && !isRunning && !isPending) {
                                        console.log(`[GEM-JS] ✓ 队列已清空`);
                                        setTimeout(resolve, 500); // 额外等待500ms确保完成
                                        return;
                                    }

                                    // 继续检查
                                    setTimeout(checkQueue, 300); // 每300ms检查一次
                                })
                                .catch(error => {
                                    console.error(`[GEM-JS] 检查队列状态出错:`, error);
                                    setTimeout(checkQueue, 1000); // 出错后1秒重试
                                });
                        };

                        // 延迟500ms后开始检查，给队列时间启动
                        setTimeout(checkQueue, 500);
                    });

                    console.log(`[GEM-JS] ✓ 组 "${item.group_name}" 执行完成`);

                    // Mute 当前组
                    setGroupActive(item.group_name, false);

                    // 延迟
                    if (item.delay_seconds > 0) {
                        console.log(`[GEM-JS] 组间延迟 ${item.delay_seconds} 秒...`);
                        await new Promise(resolve => setTimeout(resolve, item.delay_seconds * 1000));
                    }
                }

                // 执行完成
                console.log(`[GEM-JS] ========== 所有组执行完成 ==========`);
                updateNodeStatus(node, t('completed'));
                updateNodeProgress(node, 1);

            } catch (error) {
                console.error(`[GEM-JS] 执行出错:`, error);
                updateNodeStatus(node, t('error'));
            } finally {
                releaseExecutionLock(node);
                app.graph.setDirtyCanvas(true, true);
            }
        });
        console.log(`[GEM-SETUP] ✓ 'group_executor_execute' 监听器注册成功`);

        console.log(`[GEM] ========== GroupExecutorManager Extension Setup Complete ==========`);
    },

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== "GroupExecutorManager") return;

        // 添加自定义Widget
        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
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
         * 创建自定义UI界面 - 增强版本，包含错误处理和状态验证
         */
        nodeType.prototype.createCustomUI = function () {
            try {
                console.log('[GEM-UI] 开始创建自定义UI:', this.id);

                // 验证节点状态
                if (!this.properties) {
                    console.warn('[GEM-UI] 节点属性不存在，初始化默认属性');
                    this.properties = {
                        isExecuting: false,
                        groups: [],
                        selectedColorFilter: ''
                    };
                }

                // 验证组数据
                if (!Array.isArray(this.properties.groups)) {
                    console.warn('[GEM-UI] 组数据不是数组，重置为空数组');
                    this.properties.groups = [];
                }

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

                console.log('[GEM-UI] 自定义UI创建完成');

            } catch (error) {
                console.error('[GEM-UI] 创建自定义UI时出错:', error);

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

        /**
         * 设置图表变化监听器
         */
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

        /**
         * 添加样式
         */
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
        nodeType.prototype.switchLanguage = function () {
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
        nodeType.prototype.updateUIText = function () {
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

        /**
         * 删除组
         */
        nodeType.prototype.deleteGroup = function (groupId) {
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
        nodeType.prototype.updateGroupsList = function () {
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

        /**
         * 获取ComfyUI内置颜色列表
         */
        nodeType.prototype.getAvailableGroupColors = function () {
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

        /**
         * 获取ComfyUI内置颜色的十六进制值
         */
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
        nodeType.prototype.getDynamicColorFromWorkflow = function (colorName) {
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

        /**
         * 通过颜色名称匹配（检查ComfyUI内置颜色映射）
         */
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

        /**
         * 检查两个颜色是否相近（容差匹配）
         */
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
                console.warn('[GEM] 颜色比较失败:', error);
                return false;
            }
        };

        /**
         * 刷新颜色过滤器选项
         */
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
        nodeType.prototype.getColorDisplayName = function (color) {
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

        /**
         * 创建组项元素
         */
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

        /**
         * 同步配置到widget
         */
        nodeType.prototype.syncConfig = function () {
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
         * 序列化节点数据 - 增强版本，确保完整的状态保存
         */
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

            // 保存执行锁相关信息（用于异常恢复）
            if (this._executionLockStartTime) {
                info.gem_execution_lock = {
                    startTime: this._executionLockStartTime,
                    isLocked: this.properties.isExecuting
                };
            }

            // 保存版本信息，用于兼容性检查
            info.gem_version = "1.0.0";

            console.log('[GEM-SERIALIZE] 节点数据已序列化:', {
                nodeId: this.id,
                groupsCount: info.groups.length,
                hasColorFilter: !!info.selectedColorFilter,
                isLocked: info.isExecuting,
                hasLockData: !!info.gem_execution_lock
            });

            return data;
        };

        /**
         * 反序列化节点数据 - 增强版本，包含数据验证和兼容性处理
         */
        const onConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function (info) {
            // 调用原始配置方法
            onConfigure?.apply?.(this, arguments);

            console.log('[GEM-CONFIGURE] 开始配置节点:', {
                nodeId: this.id,
                hasGroups: !!info.groups,
                hasColorFilter: info.selectedColorFilter !== undefined,
                hasLockData: !!info.gem_execution_lock,
                version: info.gem_version
            });

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

                if (validGroups.length !== info.groups.length) {
                    console.warn(`[GEM-CONFIGURE] 过滤了 ${info.groups.length - validGroups.length} 个无效的组配置`);
                }
            } else {
                this.properties.groups = [];
            }

            // 恢复颜色过滤器
            if (info.selectedColorFilter !== undefined && typeof info.selectedColorFilter === 'string') {
                this.properties.selectedColorFilter = info.selectedColorFilter;
            } else {
                this.properties.selectedColorFilter = '';
            }

            // 恢复执行状态（仅在开发/调试模式下，正常情况下应该重置）
            if (info.isExecuting === true && info.gem_execution_lock) {
                // 检查执行锁是否过期（超过5分钟则自动重置）
                const lockAge = Date.now() - info.gem_execution_lock.startTime;
                const maxAge = 5 * 60 * 1000; // 5分钟

                if (lockAge > maxAge) {
                    console.warn('[GEM-CONFIGURE] 检测到过期的执行锁，自动重置');
                    this.properties.isExecuting = false;
                    this._executionLockStartTime = null;
                } else {
                    console.warn('[GEM-CONFIGURE] 恢复执行锁状态，可能需要手动重置');
                    this.properties.isExecuting = true;
                    this._executionLockStartTime = info.gem_execution_lock.startTime;
                }
            } else {
                // 正常情况下重置执行状态
                this.properties.isExecuting = false;
                this._executionLockStartTime = null;
            }

            // 恢复节点尺寸
            if (info.gem_node_size && typeof info.gem_node_size === 'object') {
                const width = typeof info.gem_node_size.width === 'number' ? info.gem_node_size.width : 450;
                const height = typeof info.gem_node_size.height === 'number' ? info.gem_node_size.height : 600;
                this.size = [width, height];
                console.log(`[GEM-CONFIGURE] 节点尺寸已恢复: ${width}x${height}`);
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

                    // 如果节点处于锁定状态，显示警告
                    if (this.properties.isExecuting) {
                        console.warn('[GEM-CONFIGURE] 节点加载时处于锁定状态，可能需要手动重置');
                        // 可以在这里添加UI提示
                    }
                }, 100);
            } else {
                // 如果UI还未创建，等待节点创建完成后恢复
                const originalCreateCustomUI = this.createCustomUI;
                this.createCustomUI = function () {
                    const result = originalCreateCustomUI.apply(this, arguments);

                    setTimeout(() => {
                        this.updateGroupsList();
                        const colorFilter = this.customUI.querySelector('#gem-color-filter');
                        if (colorFilter) {
                            colorFilter.value = this.properties.selectedColorFilter || '';
                        }
                    }, 50);

                    return result;
                };
            }

            console.log('[GEM-CONFIGURE] 节点配置完成:', {
                nodeId: this.id,
                groupsCount: this.properties.groups.length,
                colorFilter: this.properties.selectedColorFilter,
                isLocked: this.properties.isExecuting
            });
        };

        /**
         * 检查执行锁状态
         */
        nodeType.prototype.checkExecutionLock = function (node, executionId) {
            console.log(`[GEM-LOCK] #${executionId} ========== 检查执行锁状态 ==========`);

            // 检查节点是否有执行锁时间戳记录
            const lockStartTime = node._executionLockStartTime;
            const currentTime = Date.now();

            let lockAgeSeconds = 0;
            if (lockStartTime) {
                lockAgeSeconds = (currentTime - lockStartTime) / 1000;
                console.log(`[GEM-LOCK] #${executionId} 锁定开始时间: ${new Date(lockStartTime).toISOString()}`);
                console.log(`[GEM-LOCK] #${executionId} 锁定持续时间: ${lockAgeSeconds.toFixed(2)}秒`);
            } else {
                console.log(`[GEM-LOCK] #${executionId} 未找到锁开始时间戳`);
            }

            // 检查是否超时（超过60秒认为卡死）
            const maxLockDuration = 60; // 最大锁定时间60秒
            const isStuck = lockAgeSeconds > maxLockDuration;

            console.log(`[GEM-LOCK] #${executionId} 最大允许锁定时间: ${maxLockDuration}秒`);
            const stuckStatus = isStuck ? '是' : '否';
            console.log(`[GEM-LOCK] #${executionId} 锁定是否卡死: ${stuckStatus}`);

            // 检查队列状态
            const queueStatus = this.checkQueueStatus(executionId);
            console.log(`[GEM-LOCK] #${executionId} 队列状态:`, queueStatus);

            return {
                isLocked: node.properties.isExecuting,
                lockAgeSeconds: lockAgeSeconds,
                maxLockDuration: maxLockDuration,
                isStuck: isStuck,
                queueStatus: queueStatus,
                lockStartTime: lockStartTime
            };
        };

        /**
         * 强制释放执行锁
         */
        nodeType.prototype.forceReleaseExecutionLock = function (node, executionId, reason) {
            console.log(`[GEM-LOCK] #${executionId} ========== 强制释放执行锁 ==========`);
            console.log(`[GEM-LOCK] #${executionId} 释放原因: ${reason}`);

            // 记录到诊断工具
            if (window.gemWebSocketDiagnostic) {
                window.gemWebSocketDiagnostic.logLockRelease({
                    nodeId: node.id,
                    executionId: executionId,
                    reason: reason,
                    timestamp: new Date().toISOString(),
                    previousLockAge: node._executionLockStartTime ?
                        (Date.now() - node._executionLockStartTime) / 1000 : 0
                });
            }

            // 强制释放执行锁（直接操作，因为是强制恢复）
            node.properties.isExecuting = false;
            node._executionLockStartTime = null;

            console.log(`[GEM-LOCK] #${executionId} ✓ 执行锁已强制释放`);
            console.log(`[GEM-LOCK] #${executionId} 节点ID: ${node.id}`);
            console.log(`[GEM-LOCK] #${executionId} 节点类型: ${node.type}`);

            // 显示用户通知
            try {
                showToast(`组执行管理器: ${reason}，已强制释放执行锁`, 'warning', 5000);
                console.log(`[GEM-LOCK] #${executionId} ✓ 已显示用户通知`);
            } catch (e) {
                console.error(`[GEM-LOCK] #${executionId} ✗ 显示用户通知失败:`, e);
            }
        };

        /**
         * 检查队列状态
         */
        nodeType.prototype.checkQueueStatus = async function (executionId) {
            console.log(`[GEM-LOCK] #${executionId} 检查队列状态...`);

            try {
                const response = await api.fetchApi('/queue');
                const data = await response.json();

                const queueRunning = (data.queue_running || []).length;
                const queuePending = (data.queue_pending || []).length;
                const isQueueEmpty = queueRunning === 0 && queuePending === 0;

                console.log(`[GEM-LOCK] #${executionId} 正在执行: ${queueRunning} 个任务`);
                console.log(`[GEM-LOCK] #${executionId} 等待中: ${queuePending} 个任务`);
                const emptyStatus = isQueueEmpty ? '是' : '否';
                console.log(`[GEM-LOCK] #${executionId} 队列是否为空: ${emptyStatus}`);

                return {
                    running: queueRunning,
                    pending: queuePending,
                    isEmpty: isQueueEmpty,
                    total: queueRunning + queuePending
                };
            } catch (e) {
                console.error(`[GEM-LOCK] #${executionId} 检查队列状态失败:`, e);
                return {
                    running: -1,
                    pending: -1,
                    isEmpty: false,
                    total: -1,
                    error: e.message
                };
            }
        };

        /**
         * 安全设置执行锁
         */
        nodeType.prototype.setExecutionLock = function (node, executionId) {
            console.log(`[GEM-LOCK] #${executionId} ========== 安全设置执行锁 ==========`);
            console.log(`[GEM-LOCK] #${executionId} 节点ID: ${node.id}`);
            console.log(`[GEM-LOCK] #${executionId} 节点类型: ${node.type}`);
            console.log(`[GEM-LOCK] #${executionId} 当前锁定状态: ${node.properties.isExecuting}`);
            console.log(`[GEM-LOCK] #${executionId} 当前锁定时间戳: ${node._executionLockStartTime || 'null'}`);

            // 如果已经有锁且没有超时，不重复设置
            if (node.properties.isExecuting) {
                const existingAge = node._executionLockStartTime ?
                    (Date.now() - node._executionLockStartTime) / 1000 : 0;

                console.log(`[GEM-LOCK] #${executionId} 检测到现有锁，年龄: ${existingAge.toFixed(2)}秒`);

                if (existingAge < 60) {
                    console.warn(`[GEM-LOCK] #${executionId} ⚠️ 执行锁已存在且未超时（${existingAge.toFixed(2)}秒），跳过设置`);
                    console.log(`[GEM-LOCK] #${executionId} 锁状态详情:`, {
                        isLocked: node.properties.isExecuting,
                        lockAge: existingAge,
                        maxAge: 60,
                        shouldSkip: true
                    });
                    return false;
                } else {
                    console.warn(`[GEM-LOCK] #${executionId} ⚠️ 检测到过期执行锁（${existingAge.toFixed(2)}秒），将被覆盖`);
                    console.log(`[GEM-LOCK] #${executionId} 过期锁将被强制释放并重新设置`);
                }
            }

            // 设置执行锁
            const lockStartTime = Date.now();
            node.properties.isExecuting = true;
            node._executionLockStartTime = lockStartTime;

            console.log(`[GEM-LOCK] #${executionId} ✓ 执行锁已设置`);
            console.log(`[GEM-LOCK] #${executionId} 锁定开始时间: ${new Date(lockStartTime).toISOString()}`);
            console.log(`[GEM-LOCK] #${executionId} 锁状态详情:`, {
                isLocked: node.properties.isExecuting,
                lockStartTime: lockStartTime,
                lockStartTimeFormatted: new Date(lockStartTime).toISOString(),
                nodeId: node.id,
                nodeType: node.type
            });

            // 记录到诊断工具
            if (window.gemWebSocketDiagnostic) {
                window.gemWebSocketDiagnostic.logLockSet({
                    nodeId: node.id,
                    executionId: executionId,
                    timestamp: new Date(lockStartTime).toISOString(),
                    reason: "正常执行开始",
                    previousLockExisted: false
                });
            }

            return true;
        };

        /**
         * 安全释放执行锁
         */
        nodeType.prototype.releaseExecutionLock = function (node, executionId) {
            console.log(`[GEM-LOCK] #${executionId} ========== 安全释放执行锁 ==========`);
            console.log(`[GEM-LOCK] #${executionId} 节点ID: ${node.id}`);
            console.log(`[GEM-LOCK] #${executionId} 节点类型: ${node.type}`);
            console.log(`[GEM-LOCK] #${executionId} 当前锁定状态: ${node.properties.isExecuting}`);
            console.log(`[GEM-LOCK] #${executionId} 锁定开始时间戳: ${node._executionLockStartTime || 'null'}`);

            if (!node.properties.isExecuting) {
                console.warn(`[GEM-LOCK] #${executionId} ⚠️ 节点未被锁定，无需释放`);
                console.log(`[GEM-LOCK] #${executionId} 锁状态详情:`, {
                    isLocked: node.properties.isExecuting,
                    wasLocked: false,
                    nodeId: node.id,
                    executionId: executionId
                });
                return false;
            }

            const lockDuration = node._executionLockStartTime ?
                (Date.now() - node._executionLockStartTime) / 1000 : 0;

            console.log(`[GEM-LOCK] #${executionId} 锁定持续时间: ${lockDuration.toFixed(2)}秒`);
            const lockStartTimeStr = node._executionLockStartTime ? new Date(node._executionLockStartTime).toISOString() : '未知';
            console.log(`[GEM-LOCK] #${executionId} 锁定开始时间: ${lockStartTimeStr}`);
            console.log(`[GEM-LOCK] #${executionId} 释放时间: ${new Date().toISOString()}`);

            // 释放执行锁
            const releaseTime = Date.now();
            node.properties.isExecuting = false;
            const previousLockStartTime = node._executionLockStartTime;
            node._executionLockStartTime = null;

            console.log(`[GEM-LOCK] #${executionId} ✓ 执行锁已释放`);
            console.log(`[GEM-LOCK] #${executionId} 锁状态详情:`, {
                wasLocked: true,
                lockDuration: lockDuration,
                lockStartTime: previousLockStartTime,
                releaseTime: releaseTime,
                releaseTimeFormatted: new Date(releaseTime).toISOString(),
                nodeId: node.id,
                executionId: executionId
            });

            // 记录到诊断工具
            if (window.gemWebSocketDiagnostic) {
                window.gemWebSocketDiagnostic.logLockRelease({
                    nodeId: node.id,
                    executionId: executionId,
                    reason: "正常执行完成",
                    timestamp: new Date(releaseTime).toISOString(),
                    lockDuration: lockDuration,
                    lockStartTime: previousLockStartTime ? new Date(previousLockStartTime).toISOString() : null
                });
            }

            return true;
        };

        /**
         * 节点被移除时清理资源 - 增强版本，确保完整的资源清理
         */
        const onRemoved = nodeType.prototype.onRemoved;
        nodeType.prototype.onRemoved = function () {
            console.log('[GEM-REMOVE] 开始清理节点资源:', this.id);

            // 清除定时器
            if (this.groupsCheckInterval) {
                clearInterval(this.groupsCheckInterval);
                this.groupsCheckInterval = null;
                console.log('[GEM-REMOVE] 定时器已清理');
            }

            // 清除执行锁和相关状态
            if (this.properties.isExecuting) {
                console.log('[GEM-REMOVE] 节点被移除，清理执行锁');

                // 记录到诊断工具
                if (window.gemWebSocketDiagnostic) {
                    window.gemWebSocketDiagnostic.logLockRelease({
                        nodeId: this.id,
                        executionId: "NODE_REMOVED",
                        reason: "节点被移除，强制清理",
                        timestamp: new Date().toISOString(),
                        previousLockAge: this._executionLockStartTime ?
                            (Date.now() - this._executionLockStartTime) / 1000 : 0
                    });
                }

                // 强制释放执行锁
                this.properties.isExecuting = false;
                this._executionLockStartTime = null;
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
                    console.log('[GEM-REMOVE] DOM事件监听器已清理');
                } catch (e) {
                    console.warn('[GEM-REMOVE] 清理DOM事件监听器时出错:', e);
                }
            }

            // 清理自定义属性
            this.properties = {
                isExecuting: false,
                groups: [],
                selectedColorFilter: ''
            };

            // 清理内部状态
            this._executionLockStartTime = null;
            this.lastGroupsList = null;

            console.log('[GEM-REMOVE] 节点资源清理完成');

            // 调用原始移除方法
            onRemoved?.apply?.(this, arguments);
        };
    },


    /**
     * 检查执行锁状态
     */
    checkExecutionLock(node, executionId) {
        console.log(`[GEM-LOCK] #${executionId} ========== 检查执行锁状态 ==========`);

        // 检查节点是否有执行锁时间戳记录
        const lockStartTime = node._executionLockStartTime;
        const currentTime = Date.now();

        let lockAgeSeconds = 0;
        if (lockStartTime) {
            lockAgeSeconds = (currentTime - lockStartTime) / 1000;
            console.log(`[GEM-LOCK] #${executionId} 锁定开始时间: ${new Date(lockStartTime).toISOString()}`);
            console.log(`[GEM-LOCK] #${executionId} 锁定持续时间: ${lockAgeSeconds.toFixed(2)}秒`);
        } else {
            console.log(`[GEM-LOCK] #${executionId} 未找到锁开始时间戳`);
        }

        // 检查是否超时（超过60秒认为卡死）
        const maxLockDuration = 60; // 最大锁定时间60秒
        const isStuck = lockAgeSeconds > maxLockDuration;

        console.log(`[GEM-LOCK] #${executionId} 最大允许锁定时间: ${maxLockDuration}秒`);
        const stuckStatus = isStuck ? '是' : '否';
        console.log(`[GEM-LOCK] #${executionId} 锁定是否卡死: ${stuckStatus}`);

        // 检查队列状态
        const queueStatus = this.checkQueueStatus(executionId);
        console.log(`[GEM-LOCK] #${executionId} 队列状态:`, queueStatus);

        return {
            isLocked: node.properties.isExecuting,
            lockAgeSeconds: lockAgeSeconds,
            maxLockDuration: maxLockDuration,
            isStuck: isStuck,
            queueStatus: queueStatus,
            lockStartTime: lockStartTime
        };
    },

    /**
     * 强制释放执行锁
     */
    forceReleaseExecutionLock(node, executionId, reason) {
        console.log(`[GEM-LOCK] #${executionId} ========== 强制释放执行锁 ==========`);
        console.log(`[GEM-LOCK] #${executionId} 释放原因: ${reason}`);

        // 记录到诊断工具
        if (window.gemWebSocketDiagnostic) {
            window.gemWebSocketDiagnostic.logLockRelease({
                nodeId: node.id,
                executionId: executionId,
                reason: reason,
                timestamp: new Date().toISOString(),
                previousLockAge: node._executionLockStartTime ?
                    (Date.now() - node._executionLockStartTime) / 1000 : 0
            });
        }

        // 强制释放执行锁（直接操作，因为是强制恢复）
        node.properties.isExecuting = false;
        node._executionLockStartTime = null;

        console.log(`[GEM-LOCK] #${executionId} ✓ 执行锁已强制释放`);
        console.log(`[GEM-LOCK] #${executionId} 节点ID: ${node.id}`);
        console.log(`[GEM-LOCK] #${executionId} 节点类型: ${node.type}`);

        // 使用官方推荐的toast API
        try {
            showToast(`组执行管理器: ${reason}，已强制释放执行锁`, 'warning', 5000);
            console.log(`[GEM-LOCK] #${executionId} ✓ 已显示用户通知`);
        } catch (e) {
            console.error(`[GEM-LOCK] #${executionId} ✗ 显示用户通知失败:`, e);
        }
    },

    /**
     * 检查队列状态
     */
    async checkQueueStatus(executionId) {
        console.log(`[GEM-LOCK] #${executionId} 检查队列状态...`);

        try {
            const response = await api.fetchApi('/queue');
            const data = await response.json();

            const queueRunning = (data.queue_running || []).length;
            const queuePending = (data.queue_pending || []).length;
            const isQueueEmpty = queueRunning === 0 && queuePending === 0;

            console.log(`[GEM-LOCK] #${executionId} 正在执行: ${queueRunning} 个任务`);
            console.log(`[GEM-LOCK] #${executionId} 等待中: ${queuePending} 个任务`);
            const emptyStatus = isQueueEmpty ? '是' : '否';
            console.log(`[GEM-LOCK] #${executionId} 队列是否为空: ${emptyStatus}`);

            return {
                running: queueRunning,
                pending: queuePending,
                isEmpty: isQueueEmpty,
                total: queueRunning + queuePending
            };
        } catch (e) {
            console.error(`[GEM-LOCK] #${executionId} 检查队列状态失败:`, e);
            return {
                running: -1,
                pending: -1,
                isEmpty: false,
                total: -1,
                error: e.message
            };
        }
    },

    /**
     * 安全设置执行锁
     */
    setExecutionLock(node, executionId) {
        console.log(`[GEM-LOCK] #${executionId} ========== 安全设置执行锁 ==========`);
        console.log(`[GEM-LOCK] #${executionId} 节点ID: ${node.id}`);
        console.log(`[GEM-LOCK] #${executionId} 节点类型: ${node.type}`);
        console.log(`[GEM-LOCK] #${executionId} 当前锁定状态: ${node.properties.isExecuting}`);
        console.log(`[GEM-LOCK] #${executionId} 当前锁定时间戳: ${node._executionLockStartTime || 'null'}`);

        // 如果已经有锁且没有超时，不重复设置
        if (node.properties.isExecuting) {
            const existingAge = node._executionLockStartTime ?
                (Date.now() - node._executionLockStartTime) / 1000 : 0;

            console.log(`[GEM-LOCK] #${executionId} 检测到现有锁，年龄: ${existingAge.toFixed(2)}秒`);

            if (existingAge < 60) {
                console.warn(`[GEM-LOCK] #${executionId} ⚠️ 执行锁已存在且未超时（${existingAge.toFixed(2)}秒），跳过设置`);
                console.log(`[GEM-LOCK] #${executionId} 锁状态详情:`, {
                    isLocked: node.properties.isExecuting,
                    lockAge: existingAge,
                    maxAge: 60,
                    shouldSkip: true
                });
                return false;
            } else {
                console.warn(`[GEM-LOCK] #${executionId} ⚠️ 检测到过期执行锁（${existingAge.toFixed(2)}秒），将被覆盖`);
                console.log(`[GEM-LOCK] #${executionId} 过期锁将被强制释放并重新设置`);
            }
        }

        // 设置执行锁
        const lockStartTime = Date.now();
        node.properties.isExecuting = true;
        node._executionLockStartTime = lockStartTime;

        console.log(`[GEM-LOCK] #${executionId} ✓ 执行锁已设置`);
        console.log(`[GEM-LOCK] #${executionId} 锁定开始时间: ${new Date(lockStartTime).toISOString()}`);
        console.log(`[GEM-LOCK] #${executionId} 锁状态详情:`, {
            isLocked: node.properties.isExecuting,
            lockStartTime: lockStartTime,
            lockStartTimeFormatted: new Date(lockStartTime).toISOString(),
            nodeId: node.id,
            nodeType: node.type
        });

        // 记录到诊断工具
        if (window.gemWebSocketDiagnostic) {
            window.gemWebSocketDiagnostic.logLockSet({
                nodeId: node.id,
                executionId: executionId,
                timestamp: new Date(lockStartTime).toISOString(),
                reason: "正常执行开始",
                previousLockExisted: false
            });
        }

        return true;
    },

    /**
     * 安全释放执行锁
     */
    releaseExecutionLock(node, executionId) {
        console.log(`[GEM-LOCK] #${executionId} ========== 安全释放执行锁 ==========`);
        console.log(`[GEM-LOCK] #${executionId} 节点ID: ${node.id}`);
        console.log(`[GEM-LOCK] #${executionId} 节点类型: ${node.type}`);
        console.log(`[GEM-LOCK] #${executionId} 当前锁定状态: ${node.properties.isExecuting}`);
        console.log(`[GEM-LOCK] #${executionId} 锁定开始时间戳: ${node._executionLockStartTime || 'null'}`);

        if (!node.properties.isExecuting) {
            console.warn(`[GEM-LOCK] #${executionId} ⚠️ 节点未被锁定，无需释放`);
            console.log(`[GEM-LOCK] #${executionId} 锁状态详情:`, {
                isLocked: node.properties.isExecuting,
                wasLocked: false,
                nodeId: node.id,
                executionId: executionId
            });
            return false;
        }

        const lockDuration = node._executionLockStartTime ?
            (Date.now() - node._executionLockStartTime) / 1000 : 0;

        console.log(`[GEM-LOCK] #${executionId} 锁定持续时间: ${lockDuration.toFixed(2)}秒`);
        const lockStartTimeStr = node._executionLockStartTime ? new Date(node._executionLockStartTime).toISOString() : '未知';
        console.log(`[GEM-LOCK] #${executionId} 锁定开始时间: ${lockStartTimeStr}`);
        console.log(`[GEM-LOCK] #${executionId} 释放时间: ${new Date().toISOString()}`);

        // 释放执行锁
        const releaseTime = Date.now();
        node.properties.isExecuting = false;
        const previousLockStartTime = node._executionLockStartTime;
        node._executionLockStartTime = null;

        console.log(`[GEM-LOCK] #${executionId} ✓ 执行锁已释放`);
        console.log(`[GEM-LOCK] #${executionId} 锁状态详情:`, {
            wasLocked: true,
            lockDuration: lockDuration,
            lockStartTime: previousLockStartTime,
            releaseTime: releaseTime,
            releaseTimeFormatted: new Date(releaseTime).toISOString(),
            nodeId: node.id,
            executionId: executionId
        });

        // 记录到诊断工具
        if (window.gemWebSocketDiagnostic) {
            window.gemWebSocketDiagnostic.logLockRelease({
                nodeId: node.id,
                executionId: executionId,
                reason: "正常执行完成",
                timestamp: new Date(releaseTime).toISOString(),
                lockDuration: lockDuration,
                lockStartTime: previousLockStartTime ? new Date(previousLockStartTime).toISOString() : null
            });
        }

        return true;
    }
});
