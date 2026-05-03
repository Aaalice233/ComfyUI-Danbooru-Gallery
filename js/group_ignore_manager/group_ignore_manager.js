/**
 * 组忽略管理器 - Group Ignore Manager
 * 提供可视化的组 ignore 控制和联动配置功能
 */

import { app } from "/scripts/app.js";

import { createLogger } from '../global/logger_client.js';

// 创建logger实例
const logger = createLogger('group_ignore_manager');

// ============================================================
// 工具函数：处理子图节点的深度优先遍历
// ============================================================

/**
 * 深度优先遍历节点及其子图节点
 * 改编自ComfyUI Frontend和rgthree的实现
 *
 * @param {LGraphNode|LGraphNode[]} nodeOrNodes - 节点或节点数组
 * @param {Function} reduceFn - 对每个节点执行的函数 (node, reduceTo) => newReduceTo
 * @param {*} reduceTo - 累积值（可选）
 * @returns {*} 最终累积值
 */
function reduceNodesDepthFirst(nodeOrNodes, reduceFn, reduceTo) {
    const nodes = Array.isArray(nodeOrNodes) ? nodeOrNodes : [nodeOrNodes];
    const stack = nodes.map((node) => ({ node }));

    // 使用栈进行迭代式深度优先遍历（避免递归栈溢出）
    while (stack.length > 0) {
        const { node } = stack.pop();
        const result = reduceFn(node, reduceTo);
        if (result !== undefined && result !== reduceTo) {
            reduceTo = result;
        }

        // 关键：如果是子图节点，将其内部节点也加入处理栈
        if (node.isSubgraphNode?.() && node.subgraph) {
            const children = node.subgraph.nodes;
            // 倒序添加以保持从左到右的处理顺序（LIFO栈特性）
            for (let i = children.length - 1; i >= 0; i--) {
                stack.push({ node: children[i] });
            }
        }
    }
    return reduceTo;
}

/**
 * 批量修改节点模式（支持子图节点递归处理）
 * 这是对 reduceNodesDepthFirst 的简单封装
 *
 * 注意：ComfyUI引入子图后，不会自动更新子图中节点的模式，
 * 因此需要使用此函数手动递归处理所有节点（包括子图内节点）
 *
 * @param {LGraphNode|LGraphNode[]} nodeOrNodes - 节点或节点数组
 * @param {number} mode - LiteGraph模式 (0=ALWAYS, 4=BYPASS)
 */
function changeModeOfNodes(nodeOrNodes, mode) {
    reduceNodesDepthFirst(nodeOrNodes, (n) => {
        n.mode = mode;
    });
}

/**
 * 获取组内的所有节点
 * 使用 group._children 而不是已弃用的 group.nodes
 *
 * @param {LGraphGroup} group - 组对象
 * @returns {LGraphNode[]} 组内节点数组
 */
function getGroupNodes(group) {
    return Array.from(group._children).filter((c) => c instanceof LGraphNode);
}

// ============================================================
// 组忽略管理器主体
// ============================================================

// 组忽略管理器
app.registerExtension({
    name: "GroupIgnoreManager",

    async init(app) {
        logger.info('[GMM-UI] 初始化组忽略管理器');
    },

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== "GroupIgnoreManager") return;

        // 节点创建时的处理
        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            const result = onNodeCreated?.apply(this, arguments);

            // 为节点分配唯一实例ID（用于区分事件源）
            this._gmmInstanceId = `gmm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

            // 初始化节点属性
            this.properties = {
                groups: [],  // 组配置列表
                selectedColorFilter: '',  // 选中的颜色过滤器
                groupOrder: [],  // 组显示顺序（用于自定义拖拽排序）
                groupStatesCache: {},  // 组状态缓存（用于检测手动静音）
                // 模式相关
                managerMode: 'color',  // 管理模式: 'color'(按颜色) | 'custom'(自定义)
                customManagedGroups: [],  // 自定义模式下的受控组名列表
                customGroupOrder: []  // 自定义模式下的组顺序
            };

            // 初始化组引用跟踪（用于组重命名检测）
            this.groupReferences = new WeakMap();

            // 初始化循环检测栈
            this._processingStack = new Set();

            // 初始化双向同步标记（用于防止循环更新）
            this._syncingFromParameter = false;  // 正在从参数同步到组
            this._syncingToParameter = false;    // 正在从组同步到参数

            // 设置节点初始大小
            this.size = [400, 500];

            // 创建自定义UI
            this.createCustomUI();

            // 添加全局事件监听器，用于同步其他节点的状态变化
            this._gmmEventHandler = (e) => {
                // 只响应其他节点触发的事件，避免重复刷新
                if (e.detail && e.detail.sourceId !== this._gmmInstanceId) {
                    logger.info('[GMM] 收到其他节点的状态变化事件');
                    // 🚀 使用增量更新，避免整个列表重建
                    if (e.detail.groupName && e.detail.enabled !== undefined) {
                        this.updateSingleGroupItem(e.detail.groupName, e.detail.enabled);
                    } else {
                        // 如果事件没有包含足够信息，则完整刷新
                        this.updateGroupsList();
                    }
                }
            };

            // 监听组静音状态变化事件（使用 window 对象）
            window.addEventListener('group-ignore-changed', this._gmmEventHandler);

            return result;
        };

        // 创建自定义UI
        nodeType.prototype.createCustomUI = function () {
            try {
                logger.info('[GMM-UI] 开始创建自定义UI:', this.id);

                const container = document.createElement('div');
                container.className = 'gmm-container';

                // 创建样式
                this.addStyles();

                // 创建布局
                container.innerHTML = `
                <div class="gmm-content">
                    <div class="gmm-groups-header">
                        <span class="gmm-groups-title">组忽略管理器</span>
                        <div class="gmm-header-controls">
                            <div class="gmm-mode-container">
                                <span class="gmm-filter-label">模式</span>
                                <select class="gmm-mode-select" id="gmm-mode-select" title="选择管理模式">
                                    <option value="color">按颜色</option>
                                    <option value="custom">自定义</option>
                                </select>
                            </div>
                            <div class="gmm-color-filter-container" id="gmm-color-filter-container">
                                <span class="gmm-filter-label">颜色过滤</span>
                                <select class="gmm-color-filter-select" id="gmm-color-filter" title="按颜色过滤组">
                                    <option value="">所有颜色</option>
                                </select>
                            </div>
                            <button class="gmm-add-group-button" id="gmm-add-group" title="添加受控组" style="display: none;">
                                <svg viewBox="0 0 24 24" fill="none">
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                                添加组
                            </button>
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

                // 启动定时器：检测组状态变化和重命名
                this.stateCheckInterval = setInterval(() => {
                    this.checkGroupStatesChange();
                }, 3000); // 每3秒检查一次
                logger.info('[GMM-UI] 状态检测定时器已启动（3秒间隔）');

                // 启动定时器：检测绑定参数的值变化（双向同步）
                this.parameterCheckInterval = setInterval(() => {
                    this.checkParameterValuesChange();
                }, 3000); // 每3秒检查一次
                logger.info('[GMM-UI] 参数同步定时器已启动（3秒间隔）');

                logger.info('[GMM-UI] 自定义UI创建完成');

            } catch (error) {
                logger.error('[GMM-UI] 创建自定义UI时出错:', error);
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

                /* 模式选择器 */
                .gmm-mode-container {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .gmm-mode-select {
                    background: rgba(0, 0, 0, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 6px;
                    padding: 4px 8px;
                    color: #E0E0E0;
                    font-size: 12px;
                    min-width: 80px;
                    transition: all 0.2s ease;
                    cursor: pointer;
                }

                .gmm-mode-select:focus {
                    outline: none;
                    border-color: #743795;
                    background: rgba(0, 0, 0, 0.3);
                }

                /* 添加组按钮 */
                .gmm-add-group-button {
                    background: linear-gradient(135deg, #2a7c4f 0%, #34965e 100%);
                    border: 1px solid rgba(52, 150, 94, 0.5);
                    border-radius: 6px;
                    padding: 4px 10px;
                    color: white;
                    font-size: 12px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .gmm-add-group-button:hover {
                    background: linear-gradient(135deg, #34965e 0%, #3da86a 100%);
                    transform: translateY(-1px);
                    box-shadow: 0 2px 8px rgba(52, 150, 94, 0.3);
                }

                .gmm-add-group-button svg {
                    width: 12px;
                    height: 12px;
                    stroke: white;
                    stroke-width: 2.5;
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

                /* 拖拽手柄样式 */
                .gmm-drag-handle {
                    width: 20px;
                    height: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: grab;
                    flex-shrink: 0;
                    opacity: 0.4;
                    transition: opacity 0.2s ease;
                    margin-right: 4px;
                }

                .gmm-drag-handle:hover {
                    opacity: 0.8;
                }

                .gmm-drag-handle:active {
                    cursor: grabbing;
                }

                .gmm-drag-handle svg {
                    width: 14px;
                    height: 14px;
                    fill: #B0B0B0;
                }

                /* 拖拽时的样式 */
                .gmm-group-item[draggable="true"] {
                    cursor: grab;
                }

                .gmm-group-item[draggable="true"]:active {
                    cursor: grabbing;
                }

                /* 拖拽目标高亮样式 */
                .gmm-group-item.gmm-drag-over {
                    border: 2px dashed #743795;
                    background: linear-gradient(135deg, rgba(116, 55, 149, 0.2) 0%, rgba(139, 75, 168, 0.2) 100%);
                    transform: scale(1.02);
                }

                /* 参数绑定配置样式 */
                .gmm-parameter-binding-section {
                    margin-top: 20px;
                    padding: 15px;
                    background: rgba(74, 144, 226, 0.05);
                    border: 1px solid rgba(74, 144, 226, 0.2);
                    border-radius: 8px;
                }

                .gmm-parameter-binding-section .gmm-section-header {
                    margin-bottom: 12px;
                }

                .gmm-parameter-binding-section .gmm-section-header span {
                    color: #4A90E2;
                    font-size: 14px;
                    font-weight: 600;
                }

                .gmm-binding-content {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .gmm-field {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .gmm-field label {
                    color: #ccc;
                    font-size: 13px;
                }

                .gmm-field select,
                .gmm-field input[type="text"] {
                    width: 100%;
                    padding: 8px 12px;
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 6px;
                    color: #E0E0E0;
                    font-size: 13px;
                    transition: all 0.2s ease;
                }

                .gmm-field select:focus,
                .gmm-field input[type="text"]:focus {
                    outline: none;
                    border-color: #4A90E2;
                    background: rgba(0, 0, 0, 0.4);
                }

                .gmm-binding-status {
                    padding: 8px 12px;
                    background: rgba(255, 193, 7, 0.1);
                    border-left: 3px solid #FFC107;
                    border-radius: 4px;
                    font-size: 12px;
                    color: #FFC107;
                }
            `;
            document.head.appendChild(style);
        };

        // 绑定UI事件
        nodeType.prototype.bindUIEvents = function () {
            const container = this.customUI;

            // 模式选择器
            const modeSelect = container.querySelector('#gmm-mode-select');
            if (modeSelect) {
                modeSelect.addEventListener('change', (e) => {
                    this.switchManagerMode(e.target.value);
                });
            }

            // 添加受控组按钮
            const addGroupBtn = container.querySelector('#gmm-add-group');
            if (addGroupBtn) {
                addGroupBtn.addEventListener('click', (e) => {
                    this.showAddGroupMenu(e);
                });
            }

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

        // ============================================================
        // 模式管理方法
        // ============================================================

        // 切换管理模式
        nodeType.prototype.switchManagerMode = function (mode) {
            logger.info('[GMM] 切换管理模式:', mode);

            this.properties.managerMode = mode;

            const colorContainer = this.customUI.querySelector('#gmm-color-filter-container');
            const addGroupBtn = this.customUI.querySelector('#gmm-add-group');

            if (mode === 'color') {
                // 按颜色模式：显示颜色过滤器，隐藏添加按钮
                if (colorContainer) colorContainer.style.display = 'flex';
                if (addGroupBtn) addGroupBtn.style.display = 'none';
            } else {
                // 自定义模式：隐藏颜色过滤器，显示添加按钮
                if (colorContainer) colorContainer.style.display = 'none';
                if (addGroupBtn) addGroupBtn.style.display = 'flex';
            }

            // 更新组列表显示
            this.updateGroupsList();
        };

        // 显示添加组菜单
        nodeType.prototype.showAddGroupMenu = function (e) {
            const allGroups = this.getWorkflowGroups();
            const managedNames = new Set(this.properties.customManagedGroups || []);

            // 过滤出未添加的组
            const availableGroups = allGroups
                .filter(g => !managedNames.has(g.title))
                .sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));

            if (availableGroups.length === 0) {
                logger.info('[GMM] 所有组都已添加');
                // 可选：显示提示
                return;
            }

            // 构建菜单选项
            const options = availableGroups.map(group => ({
                content: group.title,
                callback: () => {
                    this.addCustomManagedGroup(group.title);
                }
            }));

            // 使用 LiteGraph 原生菜单
            new LiteGraph.ContextMenu(options, {
                event: e,
                title: '添加受控组',
                node: this
            });
        };

        // 添加自定义受控组
        nodeType.prototype.addCustomManagedGroup = function (groupName) {
            if (!this.properties.customManagedGroups) {
                this.properties.customManagedGroups = [];
            }
            if (!this.properties.customGroupOrder) {
                this.properties.customGroupOrder = [];
            }

            // 避免重复添加
            if (this.properties.customManagedGroups.includes(groupName)) {
                logger.warn('[GMM] 组已存在:', groupName);
                return;
            }

            this.properties.customManagedGroups.push(groupName);
            this.properties.customGroupOrder.push(groupName);

            logger.info('[GMM] 添加自定义受控组:', groupName);

            // 刷新UI
            this.updateGroupsList();
        };

        // 移除自定义受控组
        nodeType.prototype.removeCustomManagedGroup = function (groupName) {
            // 从自定义组列表中移除
            const idx = this.properties.customManagedGroups?.indexOf(groupName);
            if (idx > -1) {
                this.properties.customManagedGroups.splice(idx, 1);
            }

            // 从自定义顺序中移除
            const orderIdx = this.properties.customGroupOrder?.indexOf(groupName);
            if (orderIdx > -1) {
                this.properties.customGroupOrder.splice(orderIdx, 1);
            }

            logger.info('[GMM] 移除自定义受控组:', groupName);

            // 刷新UI
            this.updateGroupsList();
        };

        // 显示组项右键菜单（用于自定义模式下移除组）
        nodeType.prototype.showGroupItemContextMenu = function (e, groupName) {
            const options = [{
                content: '🗑️ 从管理器移除',
                callback: () => {
                    this.removeCustomManagedGroup(groupName);
                }
            }];

            new LiteGraph.ContextMenu(options, {
                event: e,
                title: groupName,
                node: this
            });
        };

        // 按自定义顺序排序组
        nodeType.prototype.sortGroupsByCustomOrder = function (groups) {
            const order = this.properties.customGroupOrder || [];

            if (order.length === 0) {
                // 没有自定义顺序，按名称排序
                return groups.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
            }

            const orderMap = new Map(order.map((name, idx) => [name, idx]));

            return groups.slice().sort((a, b) => {
                const idxA = orderMap.has(a.title) ? orderMap.get(a.title) : Infinity;
                const idxB = orderMap.has(b.title) ? orderMap.get(b.title) : Infinity;

                if (idxA === idxB) {
                    return a.title.localeCompare(b.title, 'zh-CN');
                }
                return idxA - idxB;
            });
        };

        // 更新组列表显示
        nodeType.prototype.updateGroupsList = function () {
            logger.info('[GMM-UI] === 开始更新组列表 ===');

            const listContainer = this.customUI.querySelector('#gmm-groups-list');
            if (!listContainer) {
                logger.warn('[GMM-UI] 找不到组列表容器');
                return;
            }

            listContainer.innerHTML = '';

            // 获取工作流中的所有组（未过滤）
            const allWorkflowGroups = this.getWorkflowGroups();
            logger.info('[GMM-UI] 工作流中的组总数:', allWorkflowGroups.length);
            logger.info('[GMM-UI] 所有组名称:', allWorkflowGroups.map(g => g.title));

            let displayGroups = [];

            // 根据模式决定显示哪些组
            if (this.properties.managerMode === 'custom') {
                // ============ 自定义模式 ============
                logger.info('[GMM-UI] 当前模式: 自定义');
                const managedNames = this.properties.customManagedGroups || [];

                // 清理已被删除的组（画布上不存在的组）
                const validNames = managedNames.filter(name =>
                    allWorkflowGroups.some(g => g.title === name)
                );

                // 如果有变化，更新存储
                if (validNames.length !== managedNames.length) {
                    logger.info('[GMM-UI] 清理已删除的组，从', managedNames.length, '减少到', validNames.length);
                    this.properties.customManagedGroups = validNames;
                    // 同步更新顺序列表
                    this.properties.customGroupOrder = (this.properties.customGroupOrder || [])
                        .filter(name => validNames.includes(name));
                }

                // 按自定义顺序获取组对象
                displayGroups = this.sortGroupsByCustomOrder(
                    allWorkflowGroups.filter(g => validNames.includes(g.title))
                );
                logger.info('[GMM-UI] 自定义模式显示组数量:', displayGroups.length);
            } else {
                // ============ 按颜色模式 ============
                logger.info('[GMM-UI] 当前模式: 按颜色');

                // 应用排序（默认按名称排序，或使用自定义顺序）
                const sortedGroups = this.sortGroupsByOrder(allWorkflowGroups);
                logger.info('[GMM-UI] 排序后的组顺序:', sortedGroups.map(g => g.title));

                // 应用颜色过滤用于显示 (rgthree-comfy approach)
                displayGroups = sortedGroups;
                logger.info('[GMM-UI] 当前颜色过滤器:', this.properties.selectedColorFilter || '无');
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

                    // Filter groups (使用已排序的组列表，保持排序顺序)
                    displayGroups = sortedGroups.filter(group => {
                        if (!group.color) return false;
                        let groupColor = group.color.replace("#", "").trim().toLowerCase();
                        if (groupColor.length === 3) {
                            groupColor = groupColor.replace(/(.)(.)(.)/, "$1$1$2$2$3$3");
                        }
                        groupColor = `#${groupColor}`;
                        return groupColor === filterColor;
                    });
                    logger.info('[GMM-UI] 颜色过滤后的组数量:', displayGroups.length);
                    logger.info('[GMM-UI] 过滤后的组名称:', displayGroups.map(g => g.title));
                }
            }

            logger.info('[GMM-UI] 最终显示的组数量:', displayGroups.length);
            logger.info('[GMM-UI] 最终显示顺序:', displayGroups.map(g => g.title));

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
                        },
                        parameterBinding: {
                            enabled: false,  // 是否启用参数绑定
                            nodeId: '',      // PCP节点ID
                            paramName: '',   // 参数名称
                            mapping: 'normal'  // "normal": true→enable, "inverse": true→disable
                        }
                    };
                    this.properties.groups.push(groupConfig);
                } else {
                    // 🔧 智能状态同步：检查实际状态，必要时同步到配置
                    // ⚠️ 重要：如果正在执行toggleGroup操作，禁止同步（避免覆盖用户刚设置的状态）
                    if (!this._isTogglingGroup) {
                        const actualEnabled = this.isGroupEnabled(group);
                        if (groupConfig.enabled !== actualEnabled) {
                            // 状态不一致，可能是通过联动或其他方式改变的，需要同步
                            logger.info('[GMM-UI] 检测到状态不一致，同步实际状态:', group.title, actualEnabled);
                            groupConfig.enabled = actualEnabled;
                        }
                    }

                    // 确保旧配置也有parameterBinding字段
                    if (!groupConfig.parameterBinding) {
                        groupConfig.parameterBinding = {
                            enabled: false,
                            nodeId: '',
                            paramName: '',
                            mapping: 'normal'
                        };
                    }
                }

                // 建立组对象到组名的引用映射（用于重命名检测）
                if (!this.groupReferences.has(group)) {
                    this.groupReferences.set(group, group.title);
                }

                const groupItem = this.createGroupItem(groupConfig, group);
                listContainer.appendChild(groupItem);
            });

            // 清理不存在的组配置（使用完整的组列表，不受颜色过滤影响）
            const beforeCleanupCount = this.properties.groups.length;
            this.properties.groups = this.properties.groups.filter(config =>
                allWorkflowGroups.some(g => g.title === config.group_name)
            );
            const afterCleanupCount = this.properties.groups.length;
            if (beforeCleanupCount !== afterCleanupCount) {
                logger.info('[GMM-UI] 清理了不存在的组配置，数量从', beforeCleanupCount, '减少到', afterCleanupCount);
            }

            logger.info('[GMM-UI] === 组列表更新完成 ===');
        };

        // 🚀 增量更新：只更新单个组项的开关状态（避免整个列表重建）
        nodeType.prototype.updateSingleGroupItem = function (groupName, enabled) {
            if (!this.customUI) {
                logger.warn('[GMM-UI] customUI 不存在，无法更新组项');
                return;
            }

            const item = this.customUI.querySelector(`[data-group-name="${groupName}"]`);
            if (!item) {
                logger.debug('[GMM-UI] 未找到组项:', groupName);
                return;
            }

            const switchBtn = item.querySelector('.gmm-switch');
            if (switchBtn) {
                if (enabled) {
                    switchBtn.classList.add('active');
                } else {
                    switchBtn.classList.remove('active');
                }
                logger.info('[GMM-UI] 增量更新组项开关状态:', groupName, '→', enabled);
            }
        };

        // 获取工作流中的所有组
        nodeType.prototype.getWorkflowGroups = function () {
            if (!app.graph || !app.graph._groups) return [];
            return app.graph._groups.filter(g => g && g.title);
        };

        // 按照自定义顺序或名称排序组列表
        nodeType.prototype.sortGroupsByOrder = function (groups) {
            if (!groups || groups.length === 0) {
                logger.info('[GMM-Sort] 输入组列表为空');
                return [];
            }

            logger.info('[GMM-Sort] 开始排序，组数量:', groups.length);
            logger.info('[GMM-Sort] 输入组名称:', groups.map(g => g.title));

            // 如果没有自定义顺序，按名称排序
            if (!this.properties.groupOrder || this.properties.groupOrder.length === 0) {
                logger.info('[GMM-Sort] 没有自定义顺序，按名称排序');
                const sorted = groups.slice().sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
                logger.info('[GMM-Sort] 排序结果:', sorted.map(g => g.title));
                return sorted;
            }

            logger.info('[GMM-Sort] 使用自定义顺序:', this.properties.groupOrder);

            // 按照自定义顺序排序
            const orderMap = new Map();
            this.properties.groupOrder.forEach((name, index) => {
                orderMap.set(name, index);
            });

            // 分离已排序和未排序的组
            const orderedGroups = [];
            const unorderedGroups = [];

            groups.forEach(group => {
                if (orderMap.has(group.title)) {
                    orderedGroups.push(group);
                } else {
                    unorderedGroups.push(group);
                }
            });

            logger.info('[GMM-Sort] 已排序的组:', orderedGroups.map(g => g.title));
            logger.info('[GMM-Sort] 未排序的组:', unorderedGroups.map(g => g.title));

            // 已排序的组按照 groupOrder 的顺序排列
            orderedGroups.sort((a, b) => {
                return orderMap.get(a.title) - orderMap.get(b.title);
            });

            // 未排序的组按名称排序
            unorderedGroups.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));

            // 合并返回
            const result = [...orderedGroups, ...unorderedGroups];
            logger.info('[GMM-Sort] 最终排序结果:', result.map(g => g.title));
            return result;
        };

        // 检查组是否启用（支持子图节点递归检查）
        nodeType.prototype.isGroupEnabled = function (group) {
            if (!group) return false;

            const nodes = this.getNodesInGroup(group);
            if (nodes.length === 0) return false;

            // 使用深度优先遍历检查所有节点（包括子图内节点）
            // 如果有任何节点是 ALWAYS 状态，则认为组是启用的
            let hasActiveNode = false;
            reduceNodesDepthFirst(nodes, (node) => {
                if (node.mode === 0) { // LiteGraph.ALWAYS = 0
                    hasActiveNode = true;
                }
            });
            return hasActiveNode;
        };

        // 检测组状态变化和重命名
        nodeType.prototype.checkGroupStatesChange = function () {
            if (!app.graph || !app.graph._groups) return;

            let hasStateChange = false;
            let hasRename = false;

            app.graph._groups.forEach(group => {
                if (!group || !group.title) return;

                // 1. 检测组重命名（通过WeakMap）
                const cachedName = this.groupReferences.get(group);
                if (cachedName && cachedName !== group.title) {
                    logger.info('[GMM] 检测到组重命名:', cachedName, '→', group.title);

                    // 更新配置中的组名
                    const config = this.properties.groups.find(g => g.group_name === cachedName);
                    if (config) {
                        config.group_name = group.title;
                    }

                    // 更新组顺序中的组名（按颜色模式）
                    const orderIndex = this.properties.groupOrder.indexOf(cachedName);
                    if (orderIndex !== -1) {
                        this.properties.groupOrder[orderIndex] = group.title;
                    }

                    // 更新自定义模式相关的数据
                    const customIndex = (this.properties.customManagedGroups || []).indexOf(cachedName);
                    if (customIndex !== -1) {
                        this.properties.customManagedGroups[customIndex] = group.title;
                    }
                    const customOrderIndex = (this.properties.customGroupOrder || []).indexOf(cachedName);
                    if (customOrderIndex !== -1) {
                        this.properties.customGroupOrder[customOrderIndex] = group.title;
                    }

                    // 更新状态缓存中的组名
                    if (this.properties.groupStatesCache[cachedName] !== undefined) {
                        this.properties.groupStatesCache[group.title] = this.properties.groupStatesCache[cachedName];
                        delete this.properties.groupStatesCache[cachedName];
                    }

                    // 更新联动配置中的组名引用
                    this.updateLinkageReferences(cachedName, group.title);

                    // 更新WeakMap
                    this.groupReferences.set(group, group.title);

                    hasRename = true;
                }

                // 2. 检测组状态变化（手动静音检测）
                const currentState = this.isGroupEnabled(group);
                const cachedState = this.properties.groupStatesCache[group.title];

                // ⚠️ 重要：如果正在执行toggleGroup操作，跳过所有检测（避免冲突）
                if (!this._isTogglingGroup) {
                    if (cachedState !== undefined && cachedState !== currentState) {
                        logger.info('[GMM] 检测到组状态变化:', group.title,
                            cachedState ? '启用 → 禁用' : '禁用 → 启用');
                        hasStateChange = true;

                        // 🚀 立即更新配置和UI（增量更新，不重建整个列表）
                        const config = this.properties.groups.find(g => g.group_name === group.title);
                        if (config) {
                            config.enabled = currentState;
                        }
                        this.updateSingleGroupItem(group.title, currentState);
                    }

                    // 更新状态缓存
                    this.properties.groupStatesCache[group.title] = currentState;
                }
            });

            // 3. 只在组重命名时才需要完整刷新UI（状态变化已经用增量更新处理了）
            if (hasRename) {
                logger.info('[GMM] 组重命名，刷新UI');
                this.updateGroupsList();
            } else if (hasStateChange) {
                logger.info('[GMM] 组状态变化已通过增量更新处理');
            }
        };

        /**
         * 更新所有组配置中联动规则里的目标组名
         * 当某个组重命名后,需要更新其他组的联动配置中对该组的引用
         *
         * @param {string} oldName - 旧组名
         * @param {string} newName - 新组名
         */
        nodeType.prototype.updateLinkageReferences = function (oldName, newName) {
            if (!oldName || !newName || oldName === newName) return;

            logger.info('[GMM-Linkage] 开始更新联动引用:', oldName, '→', newName);

            let updatedCount = 0;

            // 遍历所有组配置
            this.properties.groups.forEach(groupConfig => {
                if (!groupConfig.linkage) return;

                // 更新 on_enable 规则
                if (Array.isArray(groupConfig.linkage.on_enable)) {
                    groupConfig.linkage.on_enable.forEach(rule => {
                        if (rule.target_group === oldName) {
                            logger.info(`[GMM-Linkage] 更新规则: ${groupConfig.group_name} -> on_enable -> ${oldName} => ${newName}`);
                            rule.target_group = newName;
                            updatedCount++;
                        }
                    });
                }

                // 更新 on_disable 规则
                if (Array.isArray(groupConfig.linkage.on_disable)) {
                    groupConfig.linkage.on_disable.forEach(rule => {
                        if (rule.target_group === oldName) {
                            logger.info(`[GMM-Linkage] 更新规则: ${groupConfig.group_name} -> on_disable -> ${oldName} => ${newName}`);
                            rule.target_group = newName;
                            updatedCount++;
                        }
                    });
                }
            });

            logger.info(`[GMM-Linkage] 联动引用更新完成,共更新 ${updatedCount} 条规则`);
        };

        // 获取组内的所有节点
        nodeType.prototype.getNodesInGroup = function (group) {
            if (!group || !app.graph) return [];

            // 重新计算组内节点
            if (group.recomputeInsideNodes) {
                group.recomputeInsideNodes();
            }

            // 使用工具函数获取节点（支持_children，避免使用已弃用的group.nodes）
            return getGroupNodes(group);
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
            item.draggable = true;  // 启用拖拽

            const displayName = this.truncateText(groupConfig.group_name, 30);
            const fullName = groupConfig.group_name || '';

            item.innerHTML = `
                <div class="gmm-group-header">
                    <div class="gmm-drag-handle" title="拖拽排序">
                        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round">
                            <circle cx="9" cy="5" r="1.5"></circle>
                            <circle cx="9" cy="12" r="1.5"></circle>
                            <circle cx="9" cy="19" r="1.5"></circle>
                            <circle cx="15" cy="5" r="1.5"></circle>
                            <circle cx="15" cy="12" r="1.5"></circle>
                            <circle cx="15" cy="19" r="1.5"></circle>
                        </svg>
                    </div>
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

            // 绑定拖拽事件
            item.addEventListener('dragstart', (e) => this.onDragStart(e, groupConfig.group_name));
            item.addEventListener('dragover', (e) => this.onDragOver(e));
            item.addEventListener('drop', (e) => this.onDrop(e, groupConfig.group_name));
            item.addEventListener('dragend', (e) => this.onDragEnd(e));
            item.addEventListener('dragenter', (e) => this.onDragEnter(e));
            item.addEventListener('dragleave', (e) => this.onDragLeave(e));

            // 自定义模式下添加右键菜单（用于移除组）
            if (this.properties.managerMode === 'custom') {
                item.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showGroupItemContextMenu(e, groupConfig.group_name);
                });
            }

            return item;
        };

        // 拖拽开始事件
        nodeType.prototype.onDragStart = function (e, groupName) {
            e.stopPropagation();
            this._draggedGroup = groupName;
            e.target.style.opacity = '0.5';
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', groupName);
            logger.info('[GMM-Drag] 开始拖拽:', groupName);
        };

        // 拖拽经过事件
        nodeType.prototype.onDragOver = function (e) {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
        };

        // 拖拽进入事件
        nodeType.prototype.onDragEnter = function (e) {
            e.preventDefault();
            e.stopPropagation();
            const target = e.currentTarget;
            if (target && target.classList.contains('gmm-group-item')) {
                target.classList.add('gmm-drag-over');
            }
        };

        // 拖拽离开事件
        nodeType.prototype.onDragLeave = function (e) {
            e.preventDefault();
            e.stopPropagation();
            const target = e.currentTarget;
            if (target && target.classList.contains('gmm-group-item')) {
                target.classList.remove('gmm-drag-over');
            }
        };

        // 放置事件
        nodeType.prototype.onDrop = function (e, targetGroupName) {
            e.preventDefault();
            e.stopPropagation();

            const target = e.currentTarget;
            if (target) {
                target.classList.remove('gmm-drag-over');
            }

            const draggedGroupName = this._draggedGroup;
            if (!draggedGroupName || draggedGroupName === targetGroupName) {
                logger.info('[GMM-Drag] 取消放置 - 被拖拽组:', draggedGroupName, ', 目标组:', targetGroupName);
                return;
            }

            logger.info('[GMM-Drag] 放置事件触发:', draggedGroupName, '->', targetGroupName);

            // 更新 groupOrder
            this.updateGroupOrder(draggedGroupName, targetGroupName);

            // 刷新UI
            logger.info('[GMM-Drag] 开始刷新UI以显示新顺序');
            this.updateGroupsList();
            logger.info('[GMM-Drag] UI刷新完成');

            // 输出最终的 groupOrder 以确认保存成功
            logger.info('[GMM-Drag] 当前保存的 groupOrder:', this.properties.groupOrder);
        };

        // 拖拽结束事件
        nodeType.prototype.onDragEnd = function (e) {
            e.stopPropagation();
            e.target.style.opacity = '';
            this._draggedGroup = null;

            // 清理所有拖拽样式
            const items = this.customUI.querySelectorAll('.gmm-group-item');
            items.forEach(item => item.classList.remove('gmm-drag-over'));

            logger.info('[GMM-Drag] 拖拽结束');
        };

        // 更新组顺序
        nodeType.prototype.updateGroupOrder = function (draggedGroupName, targetGroupName) {
            logger.info('[GMM-Drag] === 开始更新组顺序 ===');
            logger.info('[GMM-Drag] 被拖拽的组:', draggedGroupName);
            logger.info('[GMM-Drag] 目标位置组:', targetGroupName);
            logger.info('[GMM-Drag] 当前模式:', this.properties.managerMode);

            // 根据模式决定使用哪个顺序属性和排序方法
            const isCustomMode = this.properties.managerMode === 'custom';
            const orderKey = isCustomMode ? 'customGroupOrder' : 'groupOrder';

            // 获取当前排序后的组列表
            const allGroups = this.getWorkflowGroups();
            logger.info('[GMM-Drag] 工作流中所有组:', allGroups.map(g => g.title));

            let sortedGroups;
            if (isCustomMode) {
                // 自定义模式：只使用已添加的组
                const managedNames = this.properties.customManagedGroups || [];
                const filteredGroups = allGroups.filter(g => managedNames.includes(g.title));
                sortedGroups = this.sortGroupsByCustomOrder(filteredGroups);
            } else {
                sortedGroups = this.sortGroupsByOrder(allGroups);
            }

            // 构建新的顺序
            const newOrder = sortedGroups.map(g => g.title);
            logger.info('[GMM-Drag] 拖拽前的顺序:', newOrder);

            // 找到被拖拽组和目标组的索引
            const draggedIndex = newOrder.indexOf(draggedGroupName);
            const targetIndex = newOrder.indexOf(targetGroupName);

            logger.info('[GMM-Drag] 被拖拽组索引:', draggedIndex);
            logger.info('[GMM-Drag] 目标组索引:', targetIndex);

            if (draggedIndex === -1 || targetIndex === -1) {
                logger.warn('[GMM-Drag] 找不到组索引 - 被拖拽组:', draggedGroupName, '(索引:', draggedIndex + '), 目标组:', targetGroupName, '(索引:', targetIndex + ')');
                return;
            }

            // 移除被拖拽的组
            newOrder.splice(draggedIndex, 1);
            logger.info('[GMM-Drag] 移除被拖拽组后:', newOrder);

            // 在目标位置插入
            const insertIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
            logger.info('[GMM-Drag] 计算的插入位置:', insertIndex);
            newOrder.splice(insertIndex, 0, draggedGroupName);

            logger.info('[GMM-Drag] 拖拽后的新顺序:', newOrder);

            // 更新 properties（根据模式选择对应的属性）
            this.properties[orderKey] = newOrder;
            logger.info('[GMM-Drag] 已保存新顺序到 properties.' + orderKey);
            logger.info('[GMM-Drag] === 组顺序更新完成 ===');
        };

        // 切换组状态（带联动）
        nodeType.prototype.toggleGroup = function (groupName, enable) {
            // 防止循环联动 - 在修改状态之前检查
            if (!this._processingStack) {
                this._processingStack = new Set();
            }

            if (this._processingStack.has(groupName)) {
                logger.warn('[GMM] 检测到循环联动，跳过切换:', groupName, enable ? '开启' : '关闭');
                return;
            }

            logger.info('[GMM] 切换组状态:', groupName, enable ? '开启' : '关闭');

            const group = app.graph._groups.find(g => g.title === groupName);
            if (!group) {
                logger.warn('[GMM] 未找到组:', groupName);
                return;
            }

            // 获取组内节点
            const nodes = this.getNodesInGroup(group);
            if (nodes.length === 0) {
                logger.warn('[GMM] 组内没有节点:', groupName);
                return;
            }

            // 添加到处理栈
            this._processingStack.add(groupName);

            // 🔒 设置标志：正在执行toggleGroup操作，禁止智能同步
            this._isTogglingGroup = true;

            try {
                // 切换节点模式（使用工具函数，支持子图节点递归处理）
                // LiteGraph.ALWAYS = 0, LiteGraph.BYPASS = 4
                const mode = enable ? 0 : 4;
                changeModeOfNodes(nodes, mode);

                // 更新配置
                const config = this.properties.groups.find(g => g.group_name === groupName);
                if (config) {
                    config.enabled = enable;
                }

                // 更新状态缓存（确保定时器不会错误地检测到状态变化）
                this.properties.groupStatesCache[groupName] = enable;

                // 触发联动
                this.applyLinkage(groupName, enable);

                // 🚀 更新UI（使用增量更新，避免整个列表重建和闪烁）
                this.updateSingleGroupItem(groupName, enable);

                // 刷新画布
                app.graph.setDirtyCanvas(true, true);

                // 广播状态变化事件，通知其他节点刷新UI（使用 window 对象）
                const event = new CustomEvent('group-ignore-changed', {
                    detail: {
                        sourceId: this._gmmInstanceId,
                        groupName: groupName,
                        enabled: enable,
                        timestamp: Date.now()
                    }
                });
                window.dispatchEvent(event);
                logger.info('[GMM] 已广播状态变化事件');

                // 同步到绑定的参数（避免循环：如果是从参数同步来的，不再反向同步）
                logger.info('[GMM-DEBUG] 检查是否需要同步到参数, _syncingFromParameter:', this._syncingFromParameter);
                if (!this._syncingFromParameter) {
                    // 检查同步模式，只在双向同步模式下才反向同步
                    const config = this.properties.groups.find(g => g.group_name === groupName);
                    const syncMode = config?.parameterBinding?.syncMode || 'bidirectional';
                    logger.info('[GMM-DEBUG] 同步模式:', syncMode);
                    if (syncMode === 'bidirectional') {
                        logger.info('[GMM-DEBUG] 双向同步模式，准备调用 syncGroupStateToParameter');
                        this.syncGroupStateToParameter(groupName, enable);
                    } else {
                        logger.info('[GMM-DEBUG] 单向同步模式，跳过反向同步');
                    }
                } else {
                    logger.info('[GMM-DEBUG] 正在从参数同步，跳过反向同步');
                }

                // 🚀 检查其他组是否受到间接影响（例如父组关闭导致子组也被关闭）
                this.checkAndUpdateAffectedGroups(groupName);
            } finally {
                // 从处理栈中移除
                this._processingStack.delete(groupName);

                // 🔓 清除标志：toggleGroup操作完成，恢复智能同步
                this._isTogglingGroup = false;
            }
        };

        // 🚀 检查并更新受影响的组（例如父组关闭导致子组也被关闭）
        nodeType.prototype.checkAndUpdateAffectedGroups = function (excludeGroupName) {
            if (!app.graph || !app.graph._groups) return;

            logger.info('[GMM] 检查受影响的组（排除:', excludeGroupName, '）');

            // 遍历所有组，检查状态是否改变
            this.properties.groups.forEach(groupConfig => {
                // 跳过当前正在操作的组
                if (groupConfig.group_name === excludeGroupName) return;

                // 查找对应的工作流组对象
                const group = app.graph._groups.find(g => g && g.title === groupConfig.group_name);
                if (!group) return;

                // 检查实际状态
                const actualEnabled = this.isGroupEnabled(group);

                // 如果状态不一致，更新配置和UI
                if (groupConfig.enabled !== actualEnabled) {
                    logger.info('[GMM] 检测到组受间接影响:', groupConfig.group_name,
                        groupConfig.enabled ? '启用 → 禁用' : '禁用 → 启用');

                    // 更新配置
                    groupConfig.enabled = actualEnabled;

                    // 更新状态缓存
                    this.properties.groupStatesCache[groupConfig.group_name] = actualEnabled;

                    // 增量更新UI
                    this.updateSingleGroupItem(groupConfig.group_name, actualEnabled);

                    // 同步到绑定的参数（避免循环：如果是从参数同步来的，不再反向同步）
                    if (!this._syncingFromParameter) {
                        // 检查同步模式，只在双向同步模式下才反向同步
                        const syncMode = groupConfig?.parameterBinding?.syncMode || 'bidirectional';
                        if (syncMode === 'bidirectional') {
                            this.syncGroupStateToParameter(groupConfig.group_name, actualEnabled);
                        }
                    }
                }
            });
        };

        // 跳转到指定组
        nodeType.prototype.navigateToGroup = function (groupName) {
            logger.info('[GMM] 跳转到组:', groupName);

            const group = app.graph._groups.find(g => g.title === groupName);
            if (!group) {
                logger.warn('[GMM] 未找到组:', groupName);
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

            logger.info('[GMM] 跳转完成');
        };

        // 应用联动规则
        nodeType.prototype.applyLinkage = function (groupName, enabled) {
            const config = this.properties.groups.find(g => g.group_name === groupName);
            if (!config || !config.linkage) return;

            const rules = enabled ? config.linkage.on_enable : config.linkage.on_disable;
            if (!rules || !Array.isArray(rules)) return;

            logger.info('[GMM] 应用联动规则:', groupName, '规则数:', rules.length);

            rules.forEach(rule => {
                const targetEnable = rule.action === "enable";
                logger.info('[GMM] 联动:', rule.target_group, rule.action);
                this.toggleGroup(rule.target_group, targetEnable);
            });
        };

        // 显示联动配置对话框
        nodeType.prototype.showLinkageDialog = function (groupConfig) {
            logger.info('[GMM] 显示联动配置对话框:', groupConfig.group_name);

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

                <div class="gmm-parameter-binding-section">
                    <div class="gmm-section-header">
                        <span>📌 参数绑定</span>
                    </div>
                    <div class="gmm-binding-content">
                        <div class="gmm-field">
                            <label>
                                <input type="checkbox" id="gmm-binding-enabled">
                                启用参数绑定
                            </label>
                        </div>
                        <div id="gmm-binding-config" style="display: none;">
                            <div class="gmm-field">
                                <label>选择参数</label>
                                <select id="gmm-param-selector">
                                    <option value="">-- 请选择 --</option>
                                </select>
                            </div>
                            <div class="gmm-field">
                                <label>映射关系</label>
                                <select id="gmm-mapping-mode">
                                    <option value="normal">参数True → 组开启</option>
                                    <option value="inverse">参数True → 组关闭</option>
                                </select>
                            </div>
                            <div class="gmm-field">
                                <label>同步模式</label>
                                <select id="gmm-sync-mode">
                                    <option value="bidirectional">双向同步（参数 ↔ 组）</option>
                                    <option value="unidirectional">单向同步（参数 → 组）</option>
                                </select>
                            </div>
                            <div class="gmm-binding-status" id="gmm-binding-status-text">
                                💡 启用后，参数值变化会自动控制组状态，组状态变化也会自动更新参数值
                            </div>
                        </div>
                    </div>
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

            // 初始化参数绑定配置
            const bindingCheckbox = dialog.querySelector('#gmm-binding-enabled');
            const bindingConfig = dialog.querySelector('#gmm-binding-config');
            const paramSelector = dialog.querySelector('#gmm-param-selector');
            const mappingMode = dialog.querySelector('#gmm-mapping-mode');
            const syncModeSelector = dialog.querySelector('#gmm-sync-mode');
            const bindingStatusText = dialog.querySelector('#gmm-binding-status-text');

            // 加载可访问的参数列表
            this.loadAccessibleParameters(paramSelector, tempConfig.parameterBinding);

            // 设置初始值
            if (tempConfig.parameterBinding && tempConfig.parameterBinding.enabled) {
                bindingCheckbox.checked = true;
                bindingConfig.style.display = 'block';
                mappingMode.value = tempConfig.parameterBinding.mapping || 'normal';
                syncModeSelector.value = tempConfig.parameterBinding.syncMode || 'bidirectional';
            } else {
                syncModeSelector.value = 'bidirectional'; // 默认双向
            }

            // 更新绑定状态提示文本的函数
            const updateBindingStatusText = () => {
                const syncMode = syncModeSelector.value;
                if (syncMode === 'bidirectional') {
                    bindingStatusText.textContent = '💡 启用后，参数值变化会自动控制组状态，组状态变化也会自动更新参数值';
                } else {
                    bindingStatusText.textContent = '💡 启用后，参数值变化会自动控制组状态（组状态变化不影响参数）';
                }
            };

            // 初始化时更新一次提示文本
            updateBindingStatusText();

            // 绑定启用/禁用事件
            bindingCheckbox.addEventListener('change', (e) => {
                bindingConfig.style.display = e.target.checked ? 'block' : 'none';
            });

            // 绑定同步模式改变事件
            syncModeSelector.addEventListener('change', updateBindingStatusText);

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

                    // 保存参数绑定配置
                    originalConfig.parameterBinding = {
                        enabled: bindingCheckbox.checked,
                        nodeId: '',
                        paramName: '',
                        mapping: mappingMode.value || 'normal',
                        syncMode: syncModeSelector.value || 'bidirectional'
                    };

                    // 如果启用了绑定，保存选中的参数
                    if (bindingCheckbox.checked && paramSelector.value) {
                        try {
                            const selectedParam = JSON.parse(paramSelector.value);
                            originalConfig.parameterBinding.nodeId = selectedParam.nodeId;
                            originalConfig.parameterBinding.paramName = selectedParam.paramName;
                            logger.info('[GMM] 保存参数绑定配置:', originalConfig.parameterBinding);
                        } catch (err) {
                            logger.error('[GMM] 解析参数选择失败:', err);
                        }
                    }
                }
                logger.info('[GMM] 保存联动配置:', tempConfig.linkage);
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

        // 加载可访问的参数列表
        nodeType.prototype.loadAccessibleParameters = async function(selectElement, currentBinding) {
            try {
                const response = await fetch('/danbooru_gallery/pcp/get_accessible_params_for_gmm');
                const data = await response.json();

                if (data.status === 'success') {
                    selectElement.innerHTML = '<option value="">-- 请选择 --</option>';

                    data.parameters.forEach(param => {
                        const option = document.createElement('option');
                        const paramData = {
                            nodeId: param.node_id,
                            paramName: param.param_name
                        };
                        option.value = JSON.stringify(paramData);
                        option.textContent = `${param.param_name} (节点: ${param.node_id.substring(0, 8)}...)`;

                        // 如果是当前绑定的参数，设为选中
                        if (currentBinding &&
                            currentBinding.nodeId === param.node_id &&
                            currentBinding.paramName === param.param_name) {
                            option.selected = true;
                        }

                        selectElement.appendChild(option);
                    });
                }
            } catch (error) {
                logger.error('[GMM] 加载可访问参数失败:', error);
            }
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
                logger.warn('[GMM] 没有可用的目标组');
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
            logger.info('[GMM] 刷新组列表');
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
            onSerialize?.apply?.(this, arguments);

            // 保存组配置到工作流 JSON
            info.groups = this.properties.groups || [];
            info.selectedColorFilter = this.properties.selectedColorFilter || '';
            info.groupOrder = this.properties.groupOrder || [];

            // 保存模式相关数据
            info.managerMode = this.properties.managerMode || 'color';
            info.customManagedGroups = this.properties.customManagedGroups || [];
            info.customGroupOrder = this.properties.customGroupOrder || [];

            logger.info('[GMM-Serialize] 保存组配置:', info.groups.length, '个组');
            logger.info('[GMM-Serialize] 保存组顺序:', info.groupOrder.length, '个组');
            logger.info('[GMM-Serialize] 保存管理模式:', info.managerMode);
            logger.info('[GMM-Serialize] 保存自定义组:', info.customManagedGroups.length, '个');
        };

        // 反序列化节点数据
        const onConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function (info) {
            onConfigure?.apply?.(this, arguments);

            // 从工作流 JSON 恢复组配置
            if (info.groups && Array.isArray(info.groups)) {
                this.properties.groups = info.groups;
                logger.info('[GMM-Configure] 恢复组配置:', info.groups.length, '个组');
            }

            // 恢复颜色过滤器
            if (info.selectedColorFilter !== undefined && typeof info.selectedColorFilter === 'string') {
                this.properties.selectedColorFilter = info.selectedColorFilter;
            } else {
                this.properties.selectedColorFilter = '';
            }

            // 恢复组顺序
            if (info.groupOrder && Array.isArray(info.groupOrder)) {
                this.properties.groupOrder = info.groupOrder;
                logger.info('[GMM-Configure] 恢复组顺序:', info.groupOrder.length, '个组');
            } else {
                this.properties.groupOrder = [];
            }

            // 恢复模式相关数据
            this.properties.managerMode = info.managerMode || 'color';
            this.properties.customManagedGroups = info.customManagedGroups || [];
            this.properties.customGroupOrder = info.customGroupOrder || [];
            logger.info('[GMM-Configure] 恢复管理模式:', this.properties.managerMode);
            logger.info('[GMM-Configure] 恢复自定义组:', this.properties.customManagedGroups.length, '个');

            // 等待UI准备就绪后更新界面
            if (this.customUI) {
                setTimeout(() => {
                    // 恢复模式选择器
                    const modeSelect = this.customUI.querySelector('#gmm-mode-select');
                    if (modeSelect) {
                        modeSelect.value = this.properties.managerMode;
                    }

                    // 切换到正确的模式UI
                    this.switchManagerMode(this.properties.managerMode);

                    this.refreshColorFilter();

                    // 恢复颜色过滤器选择
                    const colorFilter = this.customUI.querySelector('#gmm-color-filter');
                    if (colorFilter) {
                        colorFilter.value = this.properties.selectedColorFilter || '';
                    }
                }, 100);
            }
        };

        // 节点被移除时清理资源
        // 参数值到组状态的映射转换
        nodeType.prototype.mapParameterToGroupState = function(paramValue, mapping) {
            if (mapping === "inverse") {
                return !paramValue;  // true→disable, false→enable
            }
            return paramValue;       // true→enable, false→enable (默认)
        };

        // 组状态到参数值的映射转换
        nodeType.prototype.mapGroupStateToParameter = function(groupEnabled, mapping) {
            if (mapping === "inverse") {
                return !groupEnabled;  // enable→false, disable→true
            }
            return groupEnabled;       // enable→true, disable→false (默认)
        };

        // 检查绑定参数的值变化（参数→组同步）
        nodeType.prototype.checkParameterValuesChange = async function() {
            if (this._syncingToParameter) {
                // 正在同步到参数，跳过检查避免循环
                return;
            }

            for (const group of this.properties.groups) {
                if (!group.parameterBinding?.enabled) continue;

                try {
                    const response = await fetch(
                        `/danbooru_gallery/pcp/get_param_value?node_id=${group.parameterBinding.nodeId}&param_name=${encodeURIComponent(group.parameterBinding.paramName)}`
                    );
                    const data = await response.json();

                    if (data.status === 'success') {
                        // 🔥 关键修复：只有参数值真正变化时才同步，而不是简单比较组状态
                        const currentParamValue = data.value;
                        const lastParamValue = group.parameterBinding.lastParamValue;

                        // 如果是第一次检查，记录当前值但不同步
                        if (lastParamValue === undefined) {
                            group.parameterBinding.lastParamValue = currentParamValue;
                            logger.info(`[GMM] 初始化参数值记录：${group.parameterBinding.paramName} = ${currentParamValue}`);
                            continue;
                        }

                        // 🔥 只有参数值真正发生变化时才触发同步
                        if (currentParamValue !== lastParamValue) {
                            const expectedGroupState = this.mapParameterToGroupState(
                                currentParamValue,
                                group.parameterBinding.mapping
                            );

                            logger.info(`[GMM] 检测到参数值变化：${group.parameterBinding.paramName} (${lastParamValue} → ${currentParamValue})`);
                            logger.info(`[GMM] 参数同步：${group.parameterBinding.paramName} (${currentParamValue}) → ${group.group_name} (${expectedGroupState ? '开启' : '关闭'})`);

                            // 更新记录的参数值
                            group.parameterBinding.lastParamValue = currentParamValue;

                            // 执行同步
                            this._syncingFromParameter = true;
                            this.toggleGroup(group.group_name, expectedGroupState);
                            this._syncingFromParameter = false;
                        }
                    }
                } catch (error) {
                    // 忽略错误，继续检查下一个
                }
            }
        };

        // 将组状态同步到绑定的参数（组→参数同步）
        nodeType.prototype.syncGroupStateToParameter = async function(groupName, groupEnabled) {
            const config = this.properties.groups.find(g => g.group_name === groupName);

            // 调试日志：检查配置
            logger.info('[GMM-DEBUG] syncGroupStateToParameter 被调用:', groupName, groupEnabled);
            logger.info('[GMM-DEBUG] 找到的配置:', config);
            logger.info('[GMM-DEBUG] 参数绑定配置:', config?.parameterBinding);

            if (!config?.parameterBinding?.enabled) {
                logger.info('[GMM-DEBUG] 参数绑定未启用，跳过同步');
                return;
            }

            this._syncingToParameter = true;

            try {
                const paramValue = this.mapGroupStateToParameter(
                    groupEnabled,
                    config.parameterBinding.mapping
                );

                logger.info(`[GMM] 反向同步：${groupName} (${groupEnabled ? '开启' : '关闭'}) → ${config.parameterBinding.paramName} (${paramValue})`);

                const response = await fetch('/danbooru_gallery/pcp/update_param_value', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        node_id: config.parameterBinding.nodeId,
                        param_name: config.parameterBinding.paramName,
                        value: paramValue
                    })
                });

                const data = await response.json();
                if (data.status === 'success') {
                    // 🔥 更新参数值记录，避免下次检查时触发重复同步
                    config.parameterBinding.lastParamValue = paramValue;
                    logger.info(`[GMM] 已更新参数值记录：${config.parameterBinding.paramName} = ${paramValue}`);

                    // 发送自定义事件，通知PCP刷新UI
                    const event = new CustomEvent('pcp-param-value-changed', {
                        detail: {
                            nodeId: config.parameterBinding.nodeId,
                            paramName: config.parameterBinding.paramName,
                            newValue: paramValue,
                            source: 'gmm',
                            timestamp: Date.now()
                        }
                    });
                    window.dispatchEvent(event);
                    logger.info('[GMM] 已发送参数值变化事件通知PCP');
                }
            } catch (error) {
                logger.error('[GMM] 同步参数失败:', error);
            } finally {
                this._syncingToParameter = false;
            }
        };

        const onRemoved = nodeType.prototype.onRemoved;
        nodeType.prototype.onRemoved = function () {
            logger.info('[GMM] 清理节点资源:', this.id);

            // 清除状态检测定时器
            if (this.stateCheckInterval) {
                clearInterval(this.stateCheckInterval);
                this.stateCheckInterval = null;
                logger.info('[GMM] 状态检测定时器已清理');
            }

            // 清除参数同步定时器
            if (this.parameterCheckInterval) {
                clearInterval(this.parameterCheckInterval);
                this.parameterCheckInterval = null;
                logger.info('[GMM] 参数同步定时器已清理');
            }

            // 移除事件监听器（使用 window 对象）
            if (this._gmmEventHandler) {
                window.removeEventListener('group-ignore-changed', this._gmmEventHandler);
                this._gmmEventHandler = null;
                logger.info('[GMM] 已移除事件监听器');
            }

            // 清理自定义属性
            this.properties = { groups: [], selectedColorFilter: '', groupOrder: [], groupStatesCache: {} };

            // 清理组引用
            if (this.groupReferences) {
                this.groupReferences = new WeakMap();
            }

            // 调用原始移除方法
            onRemoved?.apply?.(this, arguments);
        };
    }
});

logger.info('[GMM] 组忽略管理器已加载');
