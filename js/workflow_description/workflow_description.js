/**
 * 工作流说明 - Workflow Description
 * 支持Markdown渲染和基于版本号的首次打开提示功能
 */

import { app } from "/scripts/app.js";

import { createLogger } from '../global/logger_client.js';

// 创建logger实例
const logger = createLogger('workflow_description');

// 工具函数：加载Marked.js库
let markedLoaded = false;
let markedLoadPromise = null;

async function ensureMarkedLoaded() {
    if (markedLoaded) return true;
    if (markedLoadPromise) return markedLoadPromise;

    markedLoadPromise = new Promise((resolve, reject) => {
        if (typeof marked !== 'undefined') {
            markedLoaded = true;
            resolve(true);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
        script.onload = () => {
            markedLoaded = true;
            logger.info('[WorkflowDescription] Marked.js loaded successfully');
            resolve(true);
        };
        script.onerror = () => {
            logger.error('[WorkflowDescription] Failed to load Marked.js');
            reject(false);
        };
        document.head.appendChild(script);
    });

    return markedLoadPromise;
}

// 工具函数：获取已打开的版本记录
async function getOpenedVersions() {
    try {
        const response = await fetch('/workflow_description/get_settings');
        const data = await response.json();
        return data.opened_versions || {};
    } catch (e) {
        logger.error('[WorkflowDescription] Failed to get opened versions:', e);
        return {};
    }
}

// 工具函数：保存已打开的版本
async function saveOpenedVersion(nodeId, version) {
    try {
        const response = await fetch('/workflow_description/save_settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ node_id: nodeId, version: version })
        });
        const data = await response.json();
        return data.success || false;
    } catch (e) {
        logger.error('[WorkflowDescription] Failed to save opened version:', e);
        return false;
    }
}

// Workflow Description 扩展
app.registerExtension({
    name: "WorkflowDescription",

    async init(app) {
        logger.info('[WorkflowDescription] 初始化工作流说明节点');

        // 预加载Marked.js
        await ensureMarkedLoaded();
    },

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== "WorkflowDescription") return;

        // 节点创建时的处理
        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            const result = onNodeCreated?.apply(this, arguments);

            // 初始化节点属性
            this.properties = this.properties || {
                workflow_version: "1.0",
                markdown_text: "# 工作流说明\n\n## 版本信息\n当前版本：1.0\n\n## 使用说明\n请在此处编写工作流的使用说明...\n\n## 更新日志\n- v1.0: 初始版本",
                enable_prompt: true,
                prompt_title: "工作流提示",
                prompt_content: "欢迎使用此工作流！\n\n这是一个首次打开提示。",
                confirm_action: "none"  // none 或 navigate
            };

            // 设置节点初始大小
            this.size = [500, 400];

            // 创建自定义UI
            this.createCustomUI();

            // 检查是否需要显示首次提示
            setTimeout(() => {
                this.checkAndShowFirstTimePrompt();
            }, 500);

            return result;
        };

        // 创建自定义UI
        nodeType.prototype.createCustomUI = function () {
            try {
                logger.info('[MarkdownNotePlus-UI] 开始创建自定义UI:', this.id);

                const container = document.createElement('div');
                container.className = 'mnp-container';

                // 创建样式
                this.addStyles();

                // 创建布局
                container.innerHTML = `
                    <div class="mnp-content">
                        <div class="mnp-header">
                            <span class="mnp-title">工作流说明</span>
                            <div class="mnp-header-controls">
                                <label class="mnp-version-label">
                                    <span class="mnp-version-text">版本号:</span>
                                    <input type="text" class="mnp-version-input" value="${this.properties.workflow_version || '1.0'}" placeholder="1.0">
                                </label>
                                <label class="mnp-switch-label">
                                    <input type="checkbox" class="mnp-enable-prompt" ${this.properties.enable_prompt ? 'checked' : ''}>
                                    <span class="mnp-switch-text">首次提示</span>
                                </label>
                                <button class="mnp-settings-button" title="设置">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="12" cy="12" r="3"></circle>
                                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div class="mnp-markdown-area" id="mnp-markdown-area"></div>
                    </div>
                `;

                // 添加到节点的自定义widget
                this.addDOMWidget("mnp_ui", "div", container);
                this.customUI = container;

                // 渲染Markdown内容
                this.renderMarkdown(this.properties.markdown_text || '');

                // 绑定事件
                this.bindUIEvents();

                logger.info('[MarkdownNotePlus-UI] 自定义UI创建完成');

            } catch (error) {
                logger.error('[MarkdownNotePlus-UI] 创建自定义UI时出错:', error);
            }
        };

        // 添加样式
        nodeType.prototype.addStyles = function () {
            if (document.querySelector('#mnp-styles')) return;

            const style = document.createElement('style');
            style.id = 'mnp-styles';
            style.textContent = `
                .mnp-container {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    background: #1e1e2e;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    overflow: hidden;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    color: #E0E0E0;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                }

                .mnp-content {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                .mnp-header {
                    padding: 12px 16px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: rgba(30, 30, 46, 0.8);
                }

                .mnp-title {
                    font-size: 13px;
                    font-weight: 600;
                    color: #B0B0B0;
                }

                .mnp-header-controls {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .mnp-version-label {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .mnp-version-text {
                    font-size: 12px;
                    color: #B0B0B0;
                }

                .mnp-version-input {
                    width: 60px;
                    background: rgba(0, 0, 0, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                    padding: 4px 8px;
                    color: #E0E0E0;
                    font-size: 12px;
                    transition: all 0.2s ease;
                }

                .mnp-version-input:focus {
                    outline: none;
                    border-color: #743795;
                    background: rgba(0, 0, 0, 0.3);
                }

                .mnp-switch-label {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    cursor: pointer;
                    user-select: none;
                }

                .mnp-enable-prompt {
                    width: 16px;
                    height: 16px;
                    cursor: pointer;
                }

                .mnp-switch-text {
                    font-size: 12px;
                    color: #B0B0B0;
                }

                .mnp-settings-button {
                    background: rgba(116, 55, 149, 0.2);
                    border: 1px solid rgba(116, 55, 149, 0.3);
                    border-radius: 6px;
                    padding: 6px 8px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .mnp-settings-button:hover {
                    background: rgba(116, 55, 149, 0.4);
                    border-color: rgba(116, 55, 149, 0.5);
                }

                .mnp-settings-button svg {
                    stroke: #B0B0B0;
                }

                .mnp-markdown-area {
                    flex: 1;
                    overflow-y: auto;
                    padding: 16px;
                    background: rgba(42, 42, 62, 0.3);
                    font-size: 14px;
                    line-height: 1.6;
                }

                .mnp-markdown-area::-webkit-scrollbar {
                    width: 8px;
                }

                .mnp-markdown-area::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.1);
                    border-radius: 4px;
                }

                .mnp-markdown-area::-webkit-scrollbar-thumb {
                    background: rgba(116, 55, 149, 0.5);
                    border-radius: 4px;
                }

                .mnp-markdown-area::-webkit-scrollbar-thumb:hover {
                    background: rgba(116, 55, 149, 0.7);
                }

                /* Markdown渲染样式 */
                .mnp-markdown-area h1 {
                    font-size: 28px;
                    font-weight: 700;
                    margin: 0 0 16px 0;
                    color: #FFFFFF;
                    border-bottom: 2px solid rgba(116, 55, 149, 0.5);
                    padding-bottom: 8px;
                }

                .mnp-markdown-area h2 {
                    font-size: 22px;
                    font-weight: 600;
                    margin: 24px 0 12px 0;
                    color: #F0F0F0;
                }

                .mnp-markdown-area h3 {
                    font-size: 18px;
                    font-weight: 600;
                    margin: 20px 0 10px 0;
                    color: #E0E0E0;
                }

                .mnp-markdown-area p {
                    margin: 0 0 12px 0;
                    color: #D0D0D0;
                }

                .mnp-markdown-area ul, .mnp-markdown-area ol {
                    margin: 0 0 12px 0;
                    padding-left: 24px;
                }

                .mnp-markdown-area li {
                    margin: 4px 0;
                    color: #D0D0D0;
                }

                .mnp-markdown-area code {
                    background: rgba(116, 55, 149, 0.2);
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-family: 'Courier New', monospace;
                    font-size: 13px;
                    color: #F0F0F0;
                }

                .mnp-markdown-area pre {
                    background: rgba(0, 0, 0, 0.3);
                    padding: 12px;
                    border-radius: 6px;
                    overflow-x: auto;
                    margin: 0 0 12px 0;
                }

                .mnp-markdown-area pre code {
                    background: none;
                    padding: 0;
                }

                .mnp-markdown-area blockquote {
                    border-left: 4px solid rgba(116, 55, 149, 0.5);
                    padding-left: 16px;
                    margin: 0 0 12px 0;
                    color: #C0C0C0;
                    font-style: italic;
                }

                .mnp-markdown-area a {
                    color: #8b4ba8;
                    text-decoration: none;
                }

                .mnp-markdown-area a:hover {
                    text-decoration: underline;
                }

                /* 设置对话框样式 - 侧边栏布局 */
                .mnp-settings-dialog {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: #1e1e2e;
                    border: 1px solid rgba(116, 55, 149, 0.5);
                    border-radius: 12px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
                    min-width: 700px;
                    max-width: 900px;
                    height: 600px;
                    z-index: 10000;
                    display: flex;
                    flex-direction: column;
                }

                .mnp-dialog-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 9999;
                }

                .mnp-dialog-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 20px 24px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }

                .mnp-dialog-header h3 {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 600;
                    color: #E0E0E0;
                }

                .mnp-dialog-close {
                    width: 32px;
                    height: 32px;
                    border-radius: 6px;
                    background: rgba(220, 38, 38, 0.2);
                    border: 1px solid rgba(220, 38, 38, 0.3);
                    color: #E0E0E0;
                    font-size: 20px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .mnp-dialog-close:hover {
                    background: rgba(220, 38, 38, 0.4);
                    border-color: rgba(220, 38, 38, 0.5);
                }

                .mnp-dialog-body {
                    flex: 1;
                    display: flex;
                    overflow: hidden;
                }

                .mnp-dialog-sidebar {
                    width: 180px;
                    background: rgba(42, 42, 62, 0.5);
                    border-right: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    flex-direction: column;
                    padding: 12px 0;
                }

                .mnp-tab-button {
                    padding: 12px 20px;
                    background: transparent;
                    border: none;
                    color: #B0B0B0;
                    font-size: 14px;
                    text-align: left;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border-left: 3px solid transparent;
                }

                .mnp-tab-button:hover {
                    background: rgba(116, 55, 149, 0.1);
                    color: #E0E0E0;
                }

                .mnp-tab-button.active {
                    background: rgba(116, 55, 149, 0.2);
                    color: #FFFFFF;
                    border-left-color: #743795;
                }

                .mnp-dialog-content {
                    flex: 1;
                    padding: 24px;
                    overflow-y: auto;
                }

                .mnp-dialog-content::-webkit-scrollbar {
                    width: 8px;
                }

                .mnp-dialog-content::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.1);
                    border-radius: 4px;
                }

                .mnp-dialog-content::-webkit-scrollbar-thumb {
                    background: rgba(116, 55, 149, 0.5);
                    border-radius: 4px;
                }

                .mnp-dialog-content::-webkit-scrollbar-thumb:hover {
                    background: rgba(116, 55, 149, 0.7);
                }

                .mnp-tab-panel {
                    display: none;
                }

                .mnp-tab-panel.active {
                    display: block;
                }

                .mnp-form-group {
                    margin-bottom: 20px;
                }

                .mnp-form-label {
                    display: block;
                    font-size: 14px;
                    font-weight: 500;
                    color: #B0B0B0;
                    margin-bottom: 8px;
                }

                .mnp-form-input {
                    width: 100%;
                    background: rgba(0, 0, 0, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 6px;
                    padding: 10px 12px;
                    color: #E0E0E0;
                    font-size: 14px;
                    font-family: inherit;
                    transition: all 0.2s ease;
                    box-sizing: border-box;
                }

                .mnp-form-input:focus {
                    outline: none;
                    border-color: #743795;
                    background: rgba(0, 0, 0, 0.3);
                }

                .mnp-form-textarea {
                    min-height: 150px;
                    resize: vertical;
                    font-family: 'Courier New', monospace;
                }

                .mnp-form-textarea-large {
                    min-height: 400px;
                }

                .mnp-form-select {
                    width: 100%;
                    background: rgba(0, 0, 0, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 6px;
                    padding: 10px 12px;
                    color: #E0E0E0;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .mnp-form-select:focus {
                    outline: none;
                    border-color: #743795;
                    background: rgba(0, 0, 0, 0.3);
                }

                .mnp-dialog-footer {
                    display: flex;
                    gap: 12px;
                    padding: 16px 24px;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }

                .mnp-button {
                    flex: 1;
                    padding: 12px 20px;
                    background: linear-gradient(135deg, rgba(64, 64, 84, 0.8) 0%, rgba(74, 74, 94, 0.8) 100%);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    color: #E0E0E0;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: all 0.2s ease;
                }

                .mnp-button:hover {
                    background: linear-gradient(135deg, rgba(84, 84, 104, 0.9) 0%, rgba(94, 94, 114, 0.9) 100%);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                }

                .mnp-button-primary {
                    background: linear-gradient(135deg, #743795 0%, #8b4ba8 100%);
                }

                .mnp-button-primary:hover {
                    background: linear-gradient(135deg, #8b4ba8 0%, #a35dbe 100%);
                }

                /* 首次提示弹窗样式 */
                .mnp-first-prompt-dialog {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%);
                    border: 2px solid rgba(116, 55, 149, 0.6);
                    border-radius: 16px;
                    box-shadow: 0 12px 48px rgba(0, 0, 0, 0.6);
                    padding: 32px;
                    min-width: 450px;
                    max-width: 600px;
                    z-index: 10001;
                    animation: mnpFadeIn 0.3s ease-out;
                }

                .mnp-first-prompt-title {
                    font-size: 24px;
                    font-weight: 700;
                    color: #FFFFFF;
                    margin: 0 0 20px 0;
                    text-align: center;
                }

                .mnp-first-prompt-content {
                    font-size: 15px;
                    line-height: 1.8;
                    color: #D0D0D0;
                    margin: 0 0 28px 0;
                    white-space: pre-wrap;
                    text-align: center;
                }

                .mnp-first-prompt-footer {
                    display: flex;
                    gap: 12px;
                }

                @keyframes mnpFadeIn {
                    from {
                        opacity: 0;
                        transform: translate(-50%, -48%);
                    }
                    to {
                        opacity: 1;
                        transform: translate(-50%, -50%);
                    }
                }
            `;
            document.head.appendChild(style);
        };

        // 绑定UI事件
        nodeType.prototype.bindUIEvents = function () {
            const container = this.customUI;

            // 版本号输入框
            const versionInput = container.querySelector('.mnp-version-input');
            if (versionInput) {
                versionInput.addEventListener('change', (e) => {
                    this.properties.workflow_version = e.target.value;
                    logger.info('[WorkflowDescription] 版本号已更新:', e.target.value);
                });
            }

            // 首次提示开关
            const enablePromptCheckbox = container.querySelector('.mnp-enable-prompt');
            if (enablePromptCheckbox) {
                enablePromptCheckbox.addEventListener('change', (e) => {
                    this.properties.enable_prompt = e.target.checked;
                    logger.info('[WorkflowDescription] 首次提示开关:', e.target.checked);
                });
            }

            // 设置按钮
            const settingsButton = container.querySelector('.mnp-settings-button');
            if (settingsButton) {
                settingsButton.addEventListener('click', () => {
                    this.showSettingsDialog();
                });
            }
        };

        // 渲染Markdown内容
        nodeType.prototype.renderMarkdown = async function (text) {
            const markdownArea = this.customUI.querySelector('#mnp-markdown-area');
            if (!markdownArea) return;

            try {
                // 确保Marked.js已加载
                await ensureMarkedLoaded();

                if (typeof marked !== 'undefined') {
                    // 渲染Markdown
                    markdownArea.innerHTML = marked.parse(text || '');
                } else {
                    // Fallback: 显示纯文本
                    markdownArea.textContent = text || '';
                }
            } catch (error) {
                logger.error('[WorkflowDescription] 渲染Markdown失败:', error);
                markdownArea.textContent = text || '';
            }
        };

        // 显示设置对话框（侧边栏分类）
        nodeType.prototype.showSettingsDialog = function () {
            logger.info('[WorkflowDescription] 显示设置对话框');

            // 创建遮罩层
            const overlay = document.createElement('div');
            overlay.className = 'mnp-dialog-overlay';

            // 创建对话框
            const dialog = document.createElement('div');
            dialog.className = 'mnp-settings-dialog';

            dialog.innerHTML = `
                <div class="mnp-dialog-header">
                    <h3>节点设置</h3>
                    <button class="mnp-dialog-close">×</button>
                </div>

                <div class="mnp-dialog-body">
                    <div class="mnp-dialog-sidebar">
                        <button class="mnp-tab-button active" data-tab="content">节点内容设置</button>
                        <button class="mnp-tab-button" data-tab="prompt">弹窗内容设置</button>
                    </div>

                    <div class="mnp-dialog-content">
                        <!-- 节点内容设置面板 -->
                        <div class="mnp-tab-panel active" id="mnp-tab-content">
                            <div class="mnp-form-group">
                                <label class="mnp-form-label">Markdown内容</label>
                                <textarea class="mnp-form-input mnp-form-textarea mnp-form-textarea-large" id="mnp-markdown-text">${this.properties.markdown_text || ''}</textarea>
                            </div>
                        </div>

                        <!-- 弹窗内容设置面板 -->
                        <div class="mnp-tab-panel" id="mnp-tab-prompt">
                            <div class="mnp-form-group">
                                <label class="mnp-form-label">弹窗标题</label>
                                <input type="text" class="mnp-form-input" id="mnp-prompt-title" value="${this.properties.prompt_title || ''}">
                            </div>

                            <div class="mnp-form-group">
                                <label class="mnp-form-label">弹窗内容</label>
                                <textarea class="mnp-form-input mnp-form-textarea" id="mnp-prompt-content">${this.properties.prompt_content || ''}</textarea>
                            </div>

                            <div class="mnp-form-group">
                                <label class="mnp-form-label">点击确认后的行为</label>
                                <select class="mnp-form-select" id="mnp-confirm-action">
                                    <option value="none" ${this.properties.confirm_action === 'none' ? 'selected' : ''}>无行为</option>
                                    <option value="navigate" ${this.properties.confirm_action === 'navigate' ? 'selected' : ''}>跳转到此节点</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="mnp-dialog-footer">
                    <button class="mnp-button" id="mnp-cancel">取消</button>
                    <button class="mnp-button mnp-button-primary" id="mnp-save">保存</button>
                </div>
            `;

            document.body.appendChild(overlay);
            document.body.appendChild(dialog);

            // 绑定tab切换
            const tabButtons = dialog.querySelectorAll('.mnp-tab-button');
            const tabPanels = dialog.querySelectorAll('.mnp-tab-panel');

            tabButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const tabName = button.dataset.tab;

                    // 切换按钮激活状态
                    tabButtons.forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');

                    // 切换面板显示
                    tabPanels.forEach(panel => panel.classList.remove('active'));
                    dialog.querySelector(`#mnp-tab-${tabName}`).classList.add('active');
                });
            });

            // 绑定关闭按钮
            const closeButton = dialog.querySelector('.mnp-dialog-close');
            const cancelButton = dialog.querySelector('#mnp-cancel');
            const closeDialog = () => {
                overlay.remove();
                dialog.remove();
            };

            closeButton.addEventListener('click', closeDialog);
            cancelButton.addEventListener('click', closeDialog);
            overlay.addEventListener('click', closeDialog);

            // 阻止对话框内部点击事件冒泡
            dialog.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            // 绑定保存按钮
            const saveButton = dialog.querySelector('#mnp-save');
            saveButton.addEventListener('click', () => {
                // 保存节点内容设置
                this.properties.markdown_text = dialog.querySelector('#mnp-markdown-text').value;

                // 保存弹窗设置
                this.properties.prompt_title = dialog.querySelector('#mnp-prompt-title').value;
                this.properties.prompt_content = dialog.querySelector('#mnp-prompt-content').value;
                this.properties.confirm_action = dialog.querySelector('#mnp-confirm-action').value;

                logger.info('[WorkflowDescription] 设置已保存:', this.properties);

                // 重新渲染Markdown内容
                this.renderMarkdown(this.properties.markdown_text);

                closeDialog();
            });
        };

        // 检查并显示首次提示
        nodeType.prototype.checkAndShowFirstTimePrompt = async function () {
            if (!this.properties.enable_prompt) {
                logger.info('[WorkflowDescription] 首次提示已禁用');
                return;
            }

            try {
                const nodeId = this.id;
                const currentVersion = this.properties.workflow_version || '1.0';
                const openedVersions = await getOpenedVersions();

                logger.info('[WorkflowDescription] 节点ID:', nodeId);
                logger.info('[WorkflowDescription] 当前版本:', currentVersion);
                logger.info('[WorkflowDescription] 已打开的版本记录:', openedVersions);

                // 检查此节点ID对应的版本是否已打开
                const savedVersion = openedVersions[nodeId];

                if (!savedVersion || savedVersion !== currentVersion) {
                    logger.info('[WorkflowDescription] 首次打开此版本，显示提示');
                    this.showFirstTimePrompt(nodeId, currentVersion);
                } else {
                    logger.info('[WorkflowDescription] 已经打开过此版本');
                }
            } catch (error) {
                logger.error('[WorkflowDescription] 检查首次提示失败:', error);
            }
        };

        // 显示首次提示弹窗
        nodeType.prototype.showFirstTimePrompt = function (nodeId, version) {
            // 创建遮罩层
            const overlay = document.createElement('div');
            overlay.className = 'mnp-dialog-overlay';

            // 创建弹窗
            const dialog = document.createElement('div');
            dialog.className = 'mnp-first-prompt-dialog';

            dialog.innerHTML = `
                <h2 class="mnp-first-prompt-title">${this.properties.prompt_title || '工作流提示'}</h2>
                <div class="mnp-first-prompt-content">${this.properties.prompt_content || '欢迎使用此工作流！'}</div>
                <div class="mnp-first-prompt-footer">
                    <button class="mnp-button" id="mnp-prompt-cancel">取消</button>
                    <button class="mnp-button mnp-button-primary" id="mnp-prompt-confirm">确认</button>
                </div>
            `;

            document.body.appendChild(overlay);
            document.body.appendChild(dialog);

            // 关闭弹窗的函数
            const closePrompt = () => {
                overlay.remove();
                dialog.remove();
            };

            // 绑定取消按钮
            const cancelButton = dialog.querySelector('#mnp-prompt-cancel');
            cancelButton.addEventListener('click', closePrompt);

            // 绑定确认按钮
            const confirmButton = dialog.querySelector('#mnp-prompt-confirm');
            confirmButton.addEventListener('click', async () => {
                // 执行确认行为
                if (this.properties.confirm_action === 'navigate') {
                    this.navigateToNode();
                }

                // 记录此节点的版本已打开
                await saveOpenedVersion(nodeId, version);
                logger.info('[WorkflowDescription] 已记录节点版本:', nodeId, version);

                closePrompt();
            });
        };

        // 跳转到节点
        nodeType.prototype.navigateToNode = function () {
            logger.info('[WorkflowDescription] 跳转到节点:', this.id);

            try {
                const canvas = app.canvas;

                // 1. 先使用内置方法居中节点（可靠的坐标转换）
                canvas.centerOnNode(this);

                // 2. 设置缩放为 0.9x（在居中之后设置）
                const targetZoom = 0.9;
                canvas.setZoom(targetZoom, [
                    canvas.canvas.width / 2,
                    canvas.canvas.height / 2,
                ]);

                // 3. 调整垂直偏移，让节点显示在顶部而不是中心
                // 当前节点在画布中心，需要向上移动到顶部 1/4 处
                const verticalShift = canvas.canvas.height / 4;  // 从中心移到顶部 1/4
                canvas.ds.offset[1] += verticalShift;

                // 4. 刷新画布
                canvas.setDirty(true, true);

                logger.info('[WorkflowDescription] 跳转完成 - 缩放:', targetZoom);
            } catch (error) {
                logger.error('[WorkflowDescription] 跳转失败:', error);
            }
        };

        // 序列化节点数据
        const onSerialize = nodeType.prototype.onSerialize;
        nodeType.prototype.onSerialize = function (info) {
            const data = onSerialize?.apply?.(this, arguments);

            // 保存节点属性到工作流 JSON
            info.properties = this.properties || {};

            logger.info('[WorkflowDescription-Serialize] 保存节点属性:', info.properties);

            return data;
        };

        // 反序列化节点数据
        const onConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function (info) {
            onConfigure?.apply?.(this, arguments);

            // 从工作流 JSON 恢复节点属性
            if (info.properties) {
                this.properties = info.properties;
                logger.info('[WorkflowDescription-Configure] 恢复节点属性:', info.properties);
            }

            // 等待UI准备就绪后更新界面
            if (this.customUI) {
                setTimeout(() => {
                    // 更新版本号输入框
                    const versionInput = this.customUI.querySelector('.mnp-version-input');
                    if (versionInput) {
                        versionInput.value = this.properties.workflow_version || '1.0';
                    }

                    // 更新开关状态
                    const enablePromptCheckbox = this.customUI.querySelector('.mnp-enable-prompt');
                    if (enablePromptCheckbox) {
                        enablePromptCheckbox.checked = this.properties.enable_prompt;
                    }

                    // 重新渲染Markdown内容
                    this.renderMarkdown(this.properties.markdown_text || '');
                }, 100);
            }
        };
    }
});

logger.info('[WorkflowDescription] 工作流说明节点已加载');
