// 输出区域组件
import { api } from "/scripts/api.js";
import { globalToastManager as toastManagerProxy } from './toast_manager.js';
import { globalMultiLanguageManager } from './multi_language.js';

class OutputArea {
    constructor(editor) {
        this.editor = editor;
        this.container = editor.container.querySelector('.mce-output-area');
        this.init();
    }

    init() {
        this.createLayout();
        this.bindEvents();

        // 监听语言变化事件
        document.addEventListener('languageChanged', (e) => {
            if (e.detail.component === 'outputArea' || !e.detail.component) {
                this.updateTexts();
            }
        });
    }

    createLayout() {
        const t = this.editor.languageManager ? this.editor.languageManager.t.bind(this.editor.languageManager) : globalMultiLanguageManager.t.bind(globalMultiLanguageManager);

        this.container.innerHTML = `
            <div class="mce-output-header">
                <h4 class="mce-output-title">${t('promptPreview')}</h4>
                <div class="mce-output-actions">
                    <button id="mce-copy-prompt" class="mce-button mce-button-small" title="${t('copy')}">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        <span>${t('buttonTexts.copy')}</span>
                    </button>
                    <button id="mce-validate-prompt" class="mce-button mce-button-small" title="${t('validate')}">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20,6 9,17 4,12"></polyline>
                        </svg>
                        <span>${t('buttonTexts.validate')}</span>
                    </button>
                </div>
            </div>
            <div class="mce-output-content">
                <textarea id="mce-prompt-output" class="mce-prompt-textarea" readonly placeholder="${t('promptPlaceholder')}"></textarea>
            </div>
            <div class="mce-output-footer">
                <div class="mce-output-status" id="mce-output-status"></div>
            </div>
        `;

        this.addStyles();
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .mce-output-area {
                height: 250px;
                background: rgba(42, 42, 62, 0.4);
                border-top: 1px solid rgba(255, 255, 255, 0.08);
                display: flex;
                flex-direction: column;
                padding: 16px;
                gap: 12px;
                border-radius: 0 0 8px 8px;
                margin: 0 4px 4px 4px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                backdrop-filter: blur(5px);
            }
            
            .mce-output-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-shrink: 0;
                background: linear-gradient(135deg, rgba(42, 42, 62, 0.3) 0%, rgba(58, 58, 78, 0.3) 100%);
                padding: 0 0 12px 0;
                position: relative;
            }
            
            .mce-output-header::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 1px;
                background: linear-gradient(90deg,
                    transparent,
                    rgba(255, 255, 255, 0.05),
                    transparent);
            }
            
            .mce-output-title {
                margin: 0;
                font-size: 15px;
                font-weight: 600;
                color: #E0E0E0;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
            }
            
            .mce-output-actions {
                display: flex;
                gap: 10px;
            }
            
            .mce-button-small {
                padding: 6px 12px;
                font-size: 11px;
                font-weight: 500;
                background: linear-gradient(135deg, rgba(64, 64, 84, 0.8) 0%, rgba(74, 74, 94, 0.8) 100%);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 6px;
                color: #E0E0E0;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 6px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                position: relative;
                overflow: hidden;
                white-space: nowrap;
            }
            
            .mce-button-small span {
                white-space: nowrap;
            }
            
            .mce-button-small::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg,
                    transparent,
                    rgba(255, 255, 255, 0.1),
                    transparent);
                transition: left 0.5s;
            }
            
            .mce-button-small:hover::before {
                left: 100%;
            }
            
            .mce-button-small:hover {
                background: linear-gradient(135deg, rgba(74, 74, 94, 0.9) 0%, rgba(84, 84, 104, 0.9) 100%);
                border-color: rgba(124, 58, 237, 0.4);
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
            }
            
            .mce-button-small:active {
                transform: translateY(0);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            
            .mce-button-small.success {
                background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%);
                border-color: rgba(76, 175, 80, 0.5);
                box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
            }
            
            .mce-button-small.error {
                background: linear-gradient(135deg, #F44336 0%, #EF5350 100%);
                border-color: rgba(244, 67, 54, 0.5);
                box-shadow: 0 2px 8px rgba(244, 67, 54, 0.3);
            }
            
            .mce-output-content {
                flex: 1;
                min-height: 0;
            }
            
            .mce-prompt-textarea {
                width: 100%;
                height: 100%;
                min-height: 120px;
                max-height: 300px;
                background: rgba(26, 26, 38, 0.6);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 6px;
                color: #E0E0E0;
                font-family: 'Courier New', 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
                font-size: 13px;
                padding: 10px 14px;
                resize: vertical;
                box-sizing: border-box;
                line-height: 1.5;
                overflow-y: auto;
                transition: all 0.2s ease;
            }
            
            .mce-prompt-textarea:hover {
                background: rgba(26, 26, 38, 0.8);
                border-color: rgba(255, 255, 255, 0.15);
            }
            
            .mce-prompt-textarea:focus {
                outline: none;
                border-color: #7c3aed;
                box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.2);
            }
            
            .mce-prompt-textarea::placeholder {
                color: rgba(136, 136, 136, 0.8);
                font-style: italic;
            }
            
            .mce-output-footer {
                display: flex;
                justify-content: center;
                align-items: center;
                flex-shrink: 0;
                font-size: 11px;
                color: rgba(136, 136, 136, 0.8);
                padding-top: 8px;
                border-top: 1px solid rgba(255, 255, 255, 0.05);
            }
            
            .mce-output-status {
                font-style: italic;
            }
            
            .mce-output-status.success {
                color: #4CAF50;
            }
            
            .mce-output-status.error {
                color: #F44336;
            }
            
            .mce-output-status.warning {
                color: #FF9800;
            }
            
            
            /* 移除重复的toast样式，使用toast_manager.js中的统一样式 */
        `;
        document.head.appendChild(style);
    }

    bindEvents() {
        // 使用setTimeout确保DOM元素已经创建
        setTimeout(() => {
            try {
                // 复制按钮
                const copyBtn = document.getElementById('mce-copy-prompt');
                if (copyBtn) {
                    copyBtn.addEventListener('click', () => {
                        this.copyPrompt();
                    });
                }

                // 验证按钮
                const validateBtn = document.getElementById('mce-validate-prompt');
                if (validateBtn) {
                    validateBtn.addEventListener('click', () => {
                        this.validatePrompt();
                    });
                }

                // 提示词文本框快捷键
                const promptOutput = document.getElementById('mce-prompt-output');
                if (promptOutput) {
                    document.addEventListener('keydown', (e) => {
                        if (e.ctrlKey || e.metaKey) {
                            switch (e.key) {
                                case 'c':
                                    if (document.activeElement === promptOutput) {
                                        e.preventDefault();
                                        this.copyPrompt();
                                    }
                                    break;
                                case 'Enter':
                                    if (document.activeElement === promptOutput) {
                                        e.preventDefault();
                                        this.validatePrompt();
                                    }
                                    break;
                            }
                        }
                    });
                }

            } catch (error) {
                console.error("绑定OutputArea事件时发生错误:", error);
            }
        }, 100); // 延迟100ms确保DOM完全渲染

        // 🔧 初始化时生成一次提示词预览
        this.updatePromptPreview();
    }

    updatePrompt(prompt) {
        const promptOutput = document.getElementById('mce-prompt-output');
        if (promptOutput) {
            promptOutput.value = prompt;
        }
    }

    // 🔧 新增：自动更新提示词预览
    updatePromptPreview() {
        try {
            const config = this.editor.dataManager.getConfig();
            const generatedPrompt = this.editor.generatePrompt(config);
            this.updatePrompt(generatedPrompt);
        } catch (error) {
            console.error('更新提示词预览失败:', error);
        }
    }

    async copyPrompt() {
        const promptOutput = document.getElementById('mce-prompt-output');
        const prompt = promptOutput.value;

        if (!prompt.trim()) {
            const t = this.editor.languageManager ? this.editor.languageManager.t.bind(this.editor.languageManager) : globalMultiLanguageManager.t.bind(globalMultiLanguageManager);

            this.showToast(t('noPromptToCopy'), 'warning');
            return;
        }

        try {
            const t = this.editor.languageManager ? this.editor.languageManager.t.bind(this.editor.languageManager) : globalMultiLanguageManager.t.bind(globalMultiLanguageManager);
            await navigator.clipboard.writeText(prompt);
            this.showToast(t('promptCopied'), 'success');

            // 更新按钮状态
            const copyButton = document.getElementById('mce-copy-prompt');
            copyButton.classList.add('success');
            copyButton.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20,6 9,17 4,12"></polyline>
                </svg>
                <span>${t('buttonTexts.copied')}</span>
            `;

            setTimeout(() => {
                copyButton.classList.remove('success');
                const t = this.editor.languageManager ? this.editor.languageManager.t.bind(this.editor.languageManager) : globalMultiLanguageManager.t.bind(globalMultiLanguageManager);

                copyButton.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span>${t('buttonTexts.copy')}</span>
            `;
            }, 2000);

        } catch (error) {
            console.error('复制失败:', error);
            const t = this.editor.languageManager ? this.editor.languageManager.t.bind(this.editor.languageManager) : globalMultiLanguageManager.t.bind(globalMultiLanguageManager);

            this.showToast(t('copyFailed'), 'error');
        }
    }


    async validatePrompt() {
        const promptOutput = document.getElementById('mce-prompt-output');
        const prompt = promptOutput.value;
        const config = this.editor.dataManager.getConfig();
        const t = this.editor.languageManager ? this.editor.languageManager.t.bind(this.editor.languageManager) : globalMultiLanguageManager.t.bind(globalMultiLanguageManager);

        if (!prompt.trim()) {
            this.showToast(t('promptEmpty'), 'warning');
            return;
        }

        // 🔧 纯前端验证
        const result = this.validatePromptSyntax(prompt, config.syntax_mode || 'attention_couple');

        if (result.valid) {
            this.showToast(t('promptValidated'), 'success');
            this.updateStatus(t('syntaxCorrect'), 'success');
        } else {
            const errorMessage = result.errors.join('; ');
            this.showToast(`${t('syntaxError')}: ${errorMessage}`, 'error');
            this.updateStatus(`${t('syntaxError')}: ${errorMessage}`, 'error');
        }

        // 显示警告信息
        if (result.warnings && result.warnings.length > 0) {
            const warningMessage = result.warnings.join('; ');
            this.showToast(`${t('warning')}: ${warningMessage}`, 'warning');
        }
    }

    // 🔧 新增：纯前端语法验证
    validatePromptSyntax(prompt, syntaxMode) {
        const errors = [];
        const warnings = [];

        if (syntaxMode === 'attention_couple') {
            return this.validateAttentionCoupleSyntax(prompt, errors, warnings);
        } else if (syntaxMode === 'regional_prompts') {
            return this.validateRegionalPromptsSyntax(prompt, errors, warnings);
        } else {
            return { valid: true, errors: [], warnings: ['未知的语法模式'] };
        }
    }

    // 验证 Attention Couple 语法
    validateAttentionCoupleSyntax(prompt, errors, warnings) {
        // 正则模式（支持逗号和换行）
        const couplePattern = /COUPLE\s+MASK\(([^)]+)\)\s*,?|COUPLE\(([^)]+)\)\s*,?/gi;
        const maskPattern = /MASK\(([^)]+)\)/gi;
        const featherPattern = /FEATHER\(([^)]*)\)/gi;
        const fillPattern = /FILL\(\)/gi;

        // 检查 COUPLE 语法
        const coupleMatches = Array.from(prompt.matchAll(couplePattern));
        for (const match of coupleMatches) {
            const maskParams = match[1] || match[2];
            if (maskParams) {
                const paramErrors = this.validateMaskParameters(maskParams);
                errors.push(...paramErrors);
            }
        }

        // 检查独立的 MASK（应该在COUPLE后面或用于Regional Prompts）
        const standaloneMasks = prompt.match(/(?<!COUPLE\s)MASK\([^)]+\)/gi);
        if (standaloneMasks && coupleMatches.length > 0) {
            warnings.push('发现独立的MASK语法，在Attention Couple模式下应该使用 COUPLE MASK 或 COUPLE()');
        }

        // 检查 FEATHER 语法
        const featherMatches = Array.from(prompt.matchAll(featherPattern));
        for (const match of featherMatches) {
            const featherParams = match[1];
            if (featherParams) {
                const paramErrors = this.validateFeatherParameters(featherParams);
                errors.push(...paramErrors);
            }
        }

        // 检查 FILL 语法（只能有一个）
        const fillMatches = Array.from(prompt.matchAll(fillPattern));
        if (fillMatches.length > 1) {
            warnings.push('发现多个FILL()，通常只需要一个');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    // 验证 Regional Prompts 语法
    validateRegionalPromptsSyntax(prompt, errors, warnings) {
        // 检查是否使用 AND 分隔符
        const parts = prompt.split(/\s+AND\s+/i);

        if (parts.length === 1 && prompt.includes('MASK(')) {
            warnings.push('Regional Prompts 模式通常使用 AND 分隔不同区域');
        }

        // 检查每个部分的 MASK 语法
        const maskPattern = /MASK\(([^)]+)\)/gi;
        const areaPattern = /AREA\(([^)]+)\)/gi;

        for (const part of parts) {
            // 检查 MASK
            const maskMatches = Array.from(part.matchAll(maskPattern));
            for (const match of maskMatches) {
                const paramErrors = this.validateMaskParameters(match[1]);
                errors.push(...paramErrors);
            }

            // 检查 AREA
            const areaMatches = Array.from(part.matchAll(areaPattern));
            for (const match of areaMatches) {
                const paramErrors = this.validateMaskParameters(match[1]); // AREA 参数格式与 MASK 相同
                errors.push(...paramErrors);
            }
        }

        // 检查 FEATHER
        const featherPattern = /FEATHER\(([^)]*)\)/gi;
        const featherMatches = Array.from(prompt.matchAll(featherPattern));
        for (const match of featherMatches) {
            const paramErrors = this.validateFeatherParameters(match[1]);
            errors.push(...paramErrors);
        }

        // 检查是否使用了 COUPLE（Regional Prompts 不应使用）
        if (prompt.includes('COUPLE')) {
            warnings.push('Regional Prompts 模式不使用 COUPLE 关键字');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    // 验证 MASK 参数
    validateMaskParameters(params) {
        const errors = [];
        const parts = params.split(',').map(p => p.trim());

        if (parts.length < 1) {
            errors.push('MASK 参数不能为空');
            return errors;
        }

        // 第一个参数：x1 x2 或 x1 x2, y1 y2
        const firstPart = parts[0].split(/\s+/).filter(s => s);

        // 检查是否是完整格式（x1 x2, y1 y2）还是简化格式（x1 x2）
        if (firstPart.length >= 2) {
            // 至少有 x1 x2
            const x1 = parseFloat(firstPart[0]);
            const x2 = parseFloat(firstPart[1]);
            if (isNaN(x1) || isNaN(x2)) {
                errors.push(`X 坐标必须是数字: ${firstPart[0]}, ${firstPart[1]}`);
            } else if (x1 < 0 || x2 > 1 || x1 >= x2) {
                errors.push(`X 坐标范围错误（应该 0 <= x1 < x2 <= 1）: ${x1}, ${x2}`);
            }
        } else {
            errors.push('MASK 需要至少两个 X 坐标（x1 x2）');
        }

        // 第二个参数：y1 y2（可选，如果有逗号分隔）
        if (parts.length >= 2) {
            const yCoords = parts[1].split(/\s+/).filter(s => s);
            if (yCoords.length >= 2) {
                const y1 = parseFloat(yCoords[0]);
                const y2 = parseFloat(yCoords[1]);
                if (isNaN(y1) || isNaN(y2)) {
                    errors.push(`Y 坐标必须是数字: ${yCoords[0]}, ${yCoords[1]}`);
                } else if (y1 < 0 || y2 > 1 || y1 >= y2) {
                    errors.push(`Y 坐标范围错误（应该 0 <= y1 < y2 <= 1）: ${y1}, ${y2}`);
                }
            } else if (yCoords.length === 1) {
                // 只有 y1，默认 y2 = 1
                const y1 = parseFloat(yCoords[0]);
                if (isNaN(y1)) {
                    errors.push(`Y 坐标必须是数字: ${yCoords[0]}`);
                } else if (y1 < 0 || y1 >= 1) {
                    errors.push(`Y 坐标范围错误（应该 0 <= y1 < 1）: ${y1}`);
                }
            }
        }

        // 第三个参数：权重（可选）
        if (parts.length >= 3) {
            const weight = parseFloat(parts[2]);
            if (!isNaN(weight) && weight < 0) {
                errors.push(`权重不能为负数: ${weight}`);
            }
        }

        // 第四个参数：操作模式（可选）
        if (parts.length >= 4) {
            const validOps = ['multiply', 'add', 'subtract'];
            const op = parts[3].toLowerCase();
            if (!validOps.includes(op)) {
                errors.push(`无效的操作模式: ${parts[3]}（应该是 multiply, add 或 subtract）`);
            }
        }

        return errors;
    }

    // 验证 FEATHER 参数
    validateFeatherParameters(params) {
        const errors = [];
        if (!params || params.trim() === '') {
            return errors; // FEATHER() 是有效的
        }

        const values = params.split(/\s+/).filter(s => s);
        for (const val of values) {
            const num = parseFloat(val);
            if (isNaN(num)) {
                errors.push(`FEATHER 参数必须是数字: ${val}`);
            } else if (num < 0) {
                errors.push(`FEATHER 参数不能为负数: ${val}`);
            }
        }

        if (values.length > 4) {
            errors.push(`FEATHER 最多接受4个参数（left top right bottom），但提供了 ${values.length} 个`);
        }

        return errors;
    }

    updateStatus(message, type = '') {
        const statusElement = document.getElementById('mce-output-status');
        statusElement.textContent = message;
        statusElement.className = `mce-output-status ${type}`;

        // 3秒后清除状态
        setTimeout(() => {
            statusElement.textContent = '';
            statusElement.className = 'mce-output-status';
        }, 3000);
    }


    showToast(message, type = 'info', duration = 3000) {



        // 使用统一的弹出提示管理系统
        // 传递节点容器，以便调整提示位置
        const nodeContainer = this.editor && this.editor.container ? this.editor.container : null;

        if (!nodeContainer) {
            console.warn('[OutputArea] 编辑器容器不存在，使用默认提示位置');
        } else {
            console.log('[OutputArea] 编辑器容器存在，容器信息:', {
                tagName: nodeContainer.tagName,
                className: nodeContainer.className,
                id: nodeContainer.id,
                position: window.getComputedStyle(nodeContainer).position,
                top: window.getComputedStyle(nodeContainer).top,
                left: window.getComputedStyle(nodeContainer).left,
                transform: window.getComputedStyle(nodeContainer).transform
            });
        }


        try {
            const result = toastManagerProxy.showToast(message, type, duration, { nodeContainer });


            // 检查toast容器位置
            setTimeout(() => {
                const toastContainer = document.getElementById('mce-toast-container');
                if (toastContainer) {
                    console.log('[OutputArea] Toast容器位置信息:', {
                        tagName: toastContainer.tagName,
                        className: toastContainer.className,
                        id: toastContainer.id,
                        position: window.getComputedStyle(toastContainer).position,
                        top: window.getComputedStyle(toastContainer).top,
                        right: window.getComputedStyle(toastContainer).right,
                        left: window.getComputedStyle(toastContainer).left,
                        transform: window.getComputedStyle(toastContainer).transform,
                        zIndex: window.getComputedStyle(toastContainer).zIndex,
                        display: window.getComputedStyle(toastContainer).display,
                        parent: toastContainer.parentElement?.tagName || 'null'
                    });
                } else {
                    console.error('[OutputArea] Toast容器不存在！');
                }
            }, 100);
        } catch (error) {
            console.error('[OutputArea] 显示提示失败:', error);
            // 回退到不传递节点容器的方式
            try {
                const fallbackResult = toastManagerProxy.showToast(message, type, duration, {});

            } catch (fallbackError) {
                console.error('[OutputArea] 回退方式也失败:', fallbackError);
            }
        }
    }

    clear() {
        const promptOutput = document.getElementById('mce-prompt-output');
        promptOutput.value = '';
        this.updateStatus('');
    }


    updateUI() {
        // 不需要更新统计信息
    }

    /**
     * 更新所有文本
     */
    updateTexts() {
        const t = this.editor.languageManager ? this.editor.languageManager.t.bind(this.editor.languageManager) : globalMultiLanguageManager.t.bind(globalMultiLanguageManager);

        // 更新输出区域标题
        const outputTitle = this.container.querySelector('.mce-output-title');
        if (outputTitle) {
            outputTitle.textContent = t('promptPreview');
        }

        // 更新复制按钮的提示文本和文本
        const copyBtn = this.container.querySelector('#mce-copy-prompt');
        if (copyBtn) {
            copyBtn.title = t('copy');
            const span = copyBtn.querySelector('span');
            if (span) {
                span.textContent = t('buttonTexts.copy');
            }
        }

        // 更新验证按钮的提示文本和文本
        const validateBtn = this.container.querySelector('#mce-validate-prompt');
        if (validateBtn) {
            validateBtn.title = t('validate');
            const span = validateBtn.querySelector('span');
            if (span) {
                span.textContent = t('buttonTexts.validate');
            }
        }

        // 更新提示词占位符
        const promptOutput = this.container.querySelector('#mce-prompt-output');
        if (promptOutput) {
            promptOutput.placeholder = t('promptPlaceholder');
        }
    }
}

// 导出到全局作用域
window.OutputArea = OutputArea;