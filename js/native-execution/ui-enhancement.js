/**
 * UI增强模块 - UI Enhancement Module
 * 为优化执行系统提供UI增强功能
 *
 * 版本: 2.0.0
 */

export class UIEnhancementManager {
    constructor() {
        this.nodeEnhancements = new Map(); // nodeId -> enhancement
        this.setupEventListeners();
        this.isInitialized = false;

        console.log('[UIEnhancementManager] 🎨 UI增强管理器已初始化');
        this.isInitialized = true;
    }

    setupEventListeners() {
        // 监听ComfyUI节点注册
        if (typeof app !== 'undefined') {
            this.enhanceExistingNodes();
        }

        // 监听优化执行系统的就绪事件
        document.addEventListener('optimizedExecutionSystemReady', (event) => {
            console.log('[UIEnhancementManager] 📡 收到优化执行系统就绪事件');
            this.setupOptimizedNodeEnhancements();
        });

        console.log('[UIEnhancementManager] 📋 事件监听器已设置');
    }

    enhanceExistingNodes() {
        /** 增强现有的ComfyUI节点 */
        const targetNodeTypes = [
            'GroupExecutorManager',
            // 'GroupExecutorTrigger',  // ⚠️ 已禁用：触发器不需要UI增强
            'ImageCacheGet'
        ];

        // 等待所有节点加载
        const checkNodes = () => {
            const registeredNodes = Object.keys(app.nodeDefs || {});
            const allRegistered = targetNodeTypes.every(type => registeredNodes.includes(type));

            if (allRegistered) {
                console.log('[UIEnhancementManager] ✅ 所有优化节点已注册');
                // 🔧 修复：调用正确的方法名
                this.setupOptimizedNodeEnhancements();
            } else {
                console.log('[UIEnhancementManager] ⏳ 等待节点注册:', registeredNodes);
                setTimeout(checkNodes, 1000);
            }
        };

        setTimeout(checkNodes, 2000); // 2秒后开始检查
    }

    setupOptimizedNodeEnhancements() {
        /** 为优化节点设置UI增强 */
        console.log('[UIEnhancementManager] 🔧 设置优化节点增强');

        // 为GroupExecutorManager添加增强
        this.addManagerNodeEnhancement('GroupExecutorManager');
        // ⚠️ 已禁用：触发器不需要UI增强
        // this.addTriggerNodeEnhancement('GroupExecutorTrigger');
        // 为ImageCacheGet添加增强
        this.addCacheNodeEnhancement('ImageCacheGet');
    }

    addManagerNodeEnhancement(nodeType) {
        /** 为管理器节点添加增强 */
        if (!app.nodeDefs || !app.nodeDefs[nodeType]) {
            return;
        }

        const nodeDef = app.nodeDefs[nodeType];

        // 增强配置UI
        this.enhanceConfigUI(nodeDef);

        // 添加状态指示器
        this.addStatusIndicator(nodeDef, 'manager');

        // 添加帮助按钮
        this.addHelpButton(nodeDef, 'manager');

        console.log(`[UIEnhancementManager] ✅ ${nodeType} 管理器增强已添加`);
    }

    addTriggerNodeEnhancement(nodeType) {
        /** 为触发器节点添加增强 */
        if (!app.nodeDefs || !app.nodeDefs[nodeType]) {
            return;
        }

        const nodeDef = app.nodeDefs[nodeType];

        // 增强触发器UI
        this.enhanceTriggerUI(nodeDef);

        // 添加执行状态指示器
        this.addStatusIndicator(nodeDef, 'trigger');

        // 添加执行历史查看
        this.addExecutionHistoryView(nodeDef);

        console.log(`[UIEnhancementManager] ✅ ${nodeType} 触发器增强已添加`);
    }

    addCacheNodeEnhancement(nodeType) {
        /** 为缓存节点添加增强 */
        if (!app.nodeDefs || !app.nodeDefs[nodeType]) {
            return;
        }

        const nodeDef = app.nodeDefs[nodeType];

        // 增强缓存UI
        this.enhanceCacheUI(nodeDef);

        // 添加缓存状态指示器
        this.addCacheStatusIndicator(nodeDef);

        // 添加缓存预览增强
        this.addCachePreviewEnhancement(nodeDef);

        console.log(`[UIEnhancementManager] ✅ ${nodeType} 缓存节点增强已添加`);
    }

    enhanceConfigUI(nodeDef) {
        /** 增强配置UI */
        const configEnhancement = {
            addValidationIndicator: true,
            addTemplateSelector: true,
            addRealTimePreview: true,
            addQuickConfigButtons: true
        };

        this.nodeEnhancements.set(nodeDef.type, {
            ...this.nodeEnhancements.get(nodeDef.type, {}),
            config: configEnhancement
        });
    }

    enhanceTriggerUI(nodeDef) {
        /** 增强触发器UI */
        const triggerEnhancement = {
            addExecutionStatus: true,
            addProgressIndicator: true,
            addAbortButton: true,
            addRetryButton: true,
            addExecutionLog: true
        };

        this.nodeEnhancements.set(nodeDef.type, {
            ...this.nodeEnhancements.get(nodeDef.type, {}),
            trigger: triggerEnhancement
        });
    }

    enhanceCacheUI(nodeDef) {
        /** 增强缓存UI */
        const cacheEnhancement = {
            addCacheStatusDisplay: true,
            addCacheHistory: true,
            addQuickActions: true,
            addEnhancedPreview: true,
            addCacheStatistics: true
        };

        this.nodeEnhancements.set(nodeDef.type, {
            ...this.nodeEnhancements.get(nodeDef.type, {}),
            cache: cacheEnhancement
        });
    }

    addStatusIndicator(nodeDef, nodeType) {
        /** 添加状态指示器 */
        setTimeout(() => {
            const nodeWidgets = document.querySelectorAll(`#${nodeDef.id} .comfy-node-widget`);
            if (nodeWidgets.length === 0) return;

            // 查找配置区域
            const configWidget = Array.from(nodeWidgets).find(widget => {
                return widget.name === 'group_config' || widget.name === 'execution_plan_json';
            });

            if (configWidget) {
                // 添加状态指示器
                const statusDiv = document.createElement('div');
                statusDiv.className = 'optimized-node-status';
                statusDiv.innerHTML = `
                    <div class="status-indicator">
                        <div class="status-dot ready"></div>
                        <span class="status-text">就绪</span>
                    </div>
                `;

                configWidget.parentElement.insertBefore(statusDiv, configWidget.nextSibling);
            }
        }, 500);
    }

    addHelpButton(nodeDef, nodeType) {
        /** 添加帮助按钮 */
        setTimeout(() => {
            const nodeWidgets = document.querySelectorAll(`#${nodeDef.id} .comfy-node-widget`);
            if (nodeWidgets.length === 0) return;

            // 查找合适的位置
            const lastWidget = nodeWidgets[nodeWidgets.length - 1];
            if (!lastWidget) return;

            // 创建帮助按钮
            const helpButton = document.createElement('button');
            helpButton.className = 'optimized-help-button';
            helpButton.innerHTML = '❓';
            helpButton.title = '优化执行系统帮助';

            helpButton.addEventListener('click', () => {
                this.showHelpDialog(nodeType);
            });

            lastWidget.parentElement.insertBefore(helpButton, lastWidget.nextSibling);
        }, 600);
    }

    showHelpDialog(nodeType) {
        /** 显示帮助对话框 */
        const helpContent = this.getHelpContent(nodeType);

        // 创建模态对话框
        const modal = document.createElement('div');
        modal.className = 'optimized-help-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>优化执行系统帮助</h3>
                    <button class="close-button" onclick="this.parentElement.remove()">✕</button>
                </div>
                <div class="modal-body">
                    ${helpContent}
                </div>
                <div class="modal-footer">
                    <button class="primary-button" onclick="this.parentElement.remove()">确定</button>
                </div>
            </div>
        `;

        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .optimized-help-modal {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 9999;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
            }

            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                font-weight: bold;
            }

            .modal-body {
                margin-bottom: 20px;
                line-height: 1.5;
            }

            .modal-footer {
                display: flex;
                justify-content: flex-end;
            }

            .primary-button {
                padding: 8px 16px;
                background: #007acc;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }

            .close-button {
                background: transparent;
                border: none;
                font-size: 18px;
                cursor: pointer;
                color: white;
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(modal);
    }

    getHelpContent(nodeType) {
        /** 获取帮助内容 */
        const helpContents = {
            manager: `
                <h4>优化组执行管理器</h4>
                <p><strong>功能特性：</strong></p>
                <ul>
                    <li>✅ 严格的组配置验证</li>
                    <li>✅ 基于ComfyUI原生机制</li>
                    <li>✅ 增强的错误处理</li>
                    <li>✅ 详细的调试日志</li>
                </ul>

                <p><strong>使用提示：</strong></p>
                <ul>
                    <li>1. 配置JSON格式的组执行列表</li>
                    <li>2. 设置执行模式为sequential（顺序执行）</li>
                    <li>3. 启用debug模式查看详细日志</li>
                    <li>4. 缓存控制模式建议使用block_until_allowed</li>
                </ul>
            `,

            trigger: `
                <h4>优化组执行触发器</h4>
                <p><strong>功能特性：</strong></p>
                <ul>
                    <li>✅ 基于client_id的多窗口隔离</li>
                    <li>✅ 增强的执行优先级支持</li>
                    <li>✅ 完整的错误处理和重试机制</li>
                    <li>✅ 详细的执行状态监控</li>
                </ul>

                <p><strong>使用提示：</strong></p>
                <ul>
                    <li>1. 连接触发器节点到管理器节点的输出</li>
                    <li>2. 使用force_execution参数强制重新执行</li>
                    <li>3. 设置execution_priority控制执行优先级</li>
                    <li>4. 启用debug模式查看执行过程</li>
                </ul>
            `,

            cache: `
                <h4>优化缓存获取节点</h4>
                <p><strong>功能特性：</strong></p>
                <ul>
                    <li>✅ 稳定的MD5哈希算法</li>
                    <li>✅ 多种fallback模式（blank、default、error、passthrough）</li>
                    <li>✅ 完整的预览功能</li>
                    <li>✅ 智能重试和超时机制</li>
                    <li>✅ 与缓存管理器的完美集成</li>
                </ul>

                <p><strong>使用提示：</strong></p>
                <ul>
                    <li>1. 连接缓存获取节点到控制信号</li>
                    <li>2. 使用passthrough模式跳过权限检查</li>
                    <li>3. 设置enable_preview控制预览生成</li>
                    <li>4. 使用fallback_mode控制缓存为空时的处理方式</li>
                </ul>
            `
        };

        return helpContents[nodeType] || '<p>帮助内容加载中...</p>';
    }

    // 🔧 新增：缺失的方法
    addExecutionHistoryView(nodeDef) {
        /** 添加执行历史查看 */
        console.log(`[UIEnhancementManager] 添加执行历史查看: ${nodeDef.type}`);
        // 这里可以添加具体的执行历史查看功能
    }

    addCacheStatusIndicator(nodeDef) {
        /** 添加缓存状态指示器 */
        console.log(`[UIEnhancementManager] 添加缓存状态指示器: ${nodeDef.type}`);
        // 复用通用的状态指示器
        this.addStatusIndicator(nodeDef, 'cache');
    }

    addCachePreviewEnhancement(nodeDef) {
        /** 添加缓存预览增强 */
        console.log(`[UIEnhancementManager] 添加缓存预览增强: ${nodeDef.type}`);
        // 这里可以添加具体的缓存预览增强功能
    }

    // 公共方法
    getNodeEnhancements(nodeType) {
        /** 获取节点的增强配置 */
        return this.nodeEnhancements.get(nodeType) || {};
    }

    updateNodeStatus(nodeId, status, message = '') {
        /** 更新节点状态显示 */
        const statusElement = document.querySelector(`#${nodeId} .optimized-node-status`);
        if (statusElement) {
            const statusDot = statusElement.querySelector('.status-dot');
            const statusText = statusElement.querySelector('.status-text');

            statusDot.className = `status-dot ${status}`;
            statusText.textContent = message || this.getStatusText(status);
        }
    }

    getStatusText(status) {
        /** 获取状态文本 */
        const statusTexts = {
            ready: '就绪',
            running: '执行中',
            completed: '已完成',
            error: '错误',
            warning: '警告'
        };

        return statusTexts[status] || '未知';
    }

    getDebugInfo() {
        /** 获取调试信息 */
        return {
            enhancedNodes: Array.from(this.nodeEnhancements.keys()),
            isInitialized: this.isInitialized,
            version: '2.0.0'
        };
    }
}

// 创建全局实例
window.uiEnhancementManager = new UIEnhancementManager();

console.log('[UIEnhancementManager] 🚀 UI增强管理器已启动');
console.log('[UIEnhancementManager] 📋 版本: 2.0.0');