// 输出区域组件
class OutputArea {
    constructor(editor) {
        this.editor = editor;
        this.container = editor.container.querySelector('.mce-output-area');
        this.init();
    }

    init() {
        this.createLayout();
        this.bindEvents();
    }

    createLayout() {
        this.container.innerHTML = `
            <div class="mce-output-header">
                <h4 class="mce-output-title">生成的提示词</h4>
                <div class="mce-output-actions">
                    <button id="mce-generate-prompt" class="mce-button mce-button-small mce-generate-button">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                        </svg>
                        生成
                    </button>
                    <button id="mce-copy-prompt" class="mce-button mce-button-small">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        复制
                    </button>
                    <button id="mce-validate-prompt" class="mce-button mce-button-small">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20,6 9,17 4,12"></polyline>
                        </svg>
                        验证
                    </button>
                </div>
            </div>
            <div class="mce-output-content">
                <textarea id="mce-prompt-output" class="mce-prompt-textarea" readonly placeholder="提示词将在这里显示..."></textarea>
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
                height: 200px;
                background: #333333;
                border-top: 1px solid #555555;
                display: flex;
                flex-direction: column;
                padding: 12px;
                gap: 8px;
            }
            
            .mce-output-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-shrink: 0;
            }
            
            .mce-output-title {
                margin: 0;
                font-size: 14px;
                font-weight: 600;
                color: #E0E0E0;
            }
            
            .mce-output-actions {
                display: flex;
                gap: 8px;
            }
            
            .mce-button-small {
                padding: 4px 8px;
                font-size: 11px;
                background: #404040;
                border: 1px solid #555555;
                border-radius: 4px;
                color: #E0E0E0;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .mce-button-small:hover {
                background: #4a4a4a;
                border-color: #0288D1;
            }
            
            .mce-generate-button {
                background: #0288D1;
                border-color: #0288D1;
                color: #ffffff;
                font-weight: bold;
            }
            
            .mce-generate-button:hover {
                background: #0277BD;
                border-color: #0277BD;
            }
            
            .mce-generate-button:disabled {
                background: #666666;
                border-color: #666666;
                cursor: not-allowed;
            }
            
            .mce-button-small.success {
                background: #4CAF50;
                border-color: #4CAF50;
            }
            
            .mce-button-small.error {
                background: #F44336;
                border-color: #F44336;
            }
            
            .mce-output-content {
                flex: 1;
                min-height: 0;
            }
            
            .mce-prompt-textarea {
                width: 100%;
                height: 100%;
                min-height: 100px;
                max-height: 300px;
                background: #2a2a2a;
                border: 1px solid #555555;
                border-radius: 4px;
                color: #E0E0E0;
                font-family: 'Courier New', monospace;
                font-size: 13px;
                padding: 8px;
                resize: vertical;
                box-sizing: border-box;
                line-height: 1.4;
            }
            
            .mce-prompt-textarea:focus {
                outline: none;
                border-color: #0288D1;
            }
            
            .mce-prompt-textarea::placeholder {
                color: #888888;
                font-style: italic;
            }
            
            .mce-output-footer {
                display: flex;
                justify-content: center;
                align-items: center;
                flex-shrink: 0;
                font-size: 11px;
                color: #888888;
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
            
            
            .mce-toast {
                position: absolute;
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
                padding: 12px 16px;
                background: #2a2a2a;
                border: 1px solid #555555;
                border-radius: 6px;
                color: #E0E0E0;
                font-size: 13px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                z-index: 10000;
                animation: slideDown 0.3s ease-out;
                white-space: nowrap;
                max-width: 80%;
            }
            
            .mce-toast.success {
                border-color: #4CAF50;
                background: #2a4a2a;
            }
            
            .mce-toast.error {
                border-color: #F44336;
                background: #4a2a2a;
            }
            
            .mce-toast.warning {
                border-color: #FF9800;
                background: #4a3a2a;
            }
            
            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateX(-50%) translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
    }

    bindEvents() {
        // 使用setTimeout确保DOM元素已经创建
        setTimeout(() => {
            try {
                // 生成按钮
                const generateBtn = document.getElementById('mce-generate-prompt');
                if (generateBtn) {
                    generateBtn.addEventListener('click', () => {
                        this.generatePrompt();
                    });
                }

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

                // 提示词文本框变化
                const promptOutput = document.getElementById('mce-prompt-output');
                if (promptOutput) {
                    // 键盘快捷键
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

                // console.log("OutputArea事件绑定完成");
            } catch (error) {
                console.error("绑定OutputArea事件时发生错误:", error);
            }
        }, 100); // 延迟100ms确保DOM完全渲染
    }

    updatePrompt(prompt) {
        const promptOutput = document.getElementById('mce-prompt-output');
        promptOutput.value = prompt;
    }

    async copyPrompt() {
        const promptOutput = document.getElementById('mce-prompt-output');
        const prompt = promptOutput.value;

        if (!prompt.trim()) {
            this.showToast('没有可复制的提示词', 'warning');
            return;
        }

        try {
            await navigator.clipboard.writeText(prompt);
            this.showToast('提示词已复制到剪贴板', 'success');

            // 更新按钮状态
            const copyButton = document.getElementById('mce-copy-prompt');
            copyButton.classList.add('success');
            copyButton.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20,6 9,17 4,12"></polyline>
                </svg>
                已复制
            `;

            setTimeout(() => {
                copyButton.classList.remove('success');
                copyButton.innerHTML = `
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    复制
                `;
            }, 2000);

        } catch (error) {
            console.error('复制失败:', error);
            this.showToast('复制失败，请手动选择复制', 'error');
        }
    }

    async generatePrompt() {
        const generateBtn = document.getElementById('mce-generate-prompt');
        const config = this.editor.dataManager.getConfig();

        // 禁用按钮，防止重复点击
        generateBtn.disabled = true;
        generateBtn.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12,6 12,12 16,14"></polyline>
            </svg>
            生成中...
        `;

        try {
            // 直接在前端生成提示词
            const basePrompt = config.base_prompt || '';
            const generatedPrompt = this.generatePromptLocally(basePrompt, config);

            // 更新输出区域
            this.updatePrompt(generatedPrompt);
            this.showToast('提示词生成成功', 'success');

        } catch (error) {
            console.error('生成提示词失败:', error);
            this.showToast(`生成失败: ${error.message}`, 'error');
        } finally {
            // 恢复按钮状态
            generateBtn.disabled = false;
            generateBtn.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
                生成
            `;
        }
    }

    // 在前端本地生成提示词的方法
    generatePromptLocally(basePrompt, config) {
        try {
            const characters = config.characters || [];
            if (!characters || characters.length === 0) {
                return basePrompt || '';
            }

            // 过滤启用的角色
            const enabledCharacters = characters.filter(char => char.enabled !== false);
            if (!enabledCharacters || enabledCharacters.length === 0) {
                return basePrompt || '';
            }

            // 生成蒙版数据
            const masks = this.generateMasks(enabledCharacters);

            // 根据语法模式生成提示词
            if (config.syntax_mode === "attention_couple") {
                return this.generateAttentionCouple(basePrompt, masks);
            } else if (config.syntax_mode === "regional_prompts") {
                return this.generateRegionalPrompts(masks);
            } else {
                // 默认使用attention_couple
                return this.generateAttentionCouple(basePrompt, masks);
            }
        } catch (error) {
            console.error('本地生成提示词失败:', error);
            return basePrompt || '';
        }
    }

    // 生成蒙版数据
    generateMasks(characters) {
        const masks = [];
        for (const char of characters) {
            if (!char.mask) continue;

            masks.push({
                prompt: char.prompt || '',
                weight: char.weight || 1.0,
                x1: char.mask.x || 0.0,
                y1: char.mask.y || 0.0,
                x2: (char.mask.x || 0.0) + (char.mask.width || 0.5),
                y2: (char.mask.y || 0.0) + (char.mask.height || 0.5),
                feather: char.mask.feather || 0,
                opacity: char.mask.opacity || 100,
                blend_mode: char.mask.blend_mode || 'normal'
            });
        }
        return masks;
    }

    // 生成Attention Couple语法
    generateAttentionCouple(basePrompt, masks) {
        if (!masks || masks.length === 0) {
            return basePrompt || '';
        }

        const maskStrings = [];
        for (const mask of masks) {
            if (!mask.prompt || !mask.prompt.trim()) continue;

            let maskStr = `COUPLE MASK(${mask.x1.toFixed(2)} ${mask.x2.toFixed(2)}, ${mask.y1.toFixed(2)} ${mask.y2.toFixed(2)}) ${mask.prompt}`;

            // 添加权重
            if (mask.weight !== 1.0) {
                maskStr += `:${mask.weight.toFixed(2)}`;
            }

            // 添加羽化
            if (mask.feather > 0) {
                maskStr += ` FEATHER(${mask.feather})`;
            }

            maskStrings.push(maskStr);
        }

        let result = (basePrompt || '').trim();
        if (maskStrings.length > 0) {
            result += " " + maskStrings.join(" ");
        }

        return result.trim();
    }

    // 生成Regional Prompts语法
    generateRegionalPrompts(masks) {
        if (!masks || masks.length === 0) {
            return '';
        }

        const maskStrings = [];
        for (const mask of masks) {
            if (!mask.prompt || !mask.prompt.trim()) continue;

            let maskStr = `${mask.prompt} MASK(${mask.x1.toFixed(2)} ${mask.x2.toFixed(2)}, ${mask.y1.toFixed(2)} ${mask.y2.toFixed(2)})`;

            // 添加权重
            if (mask.weight !== 1.0) {
                maskStr += `:${mask.weight.toFixed(2)}`;
            }

            // 添加羽化
            if (mask.feather > 0) {
                maskStr += ` FEATHER(${mask.feather})`;
            }

            // 添加混合模式
            if (mask.blend_mode && mask.blend_mode !== 'normal') {
                maskStr += ` BLEND(${mask.blend_mode})`;
            }

            maskStrings.push(maskStr);
        }

        return maskStrings.join(" AND ");
    }

    async validatePrompt() {
        const promptOutput = document.getElementById('mce-prompt-output');
        const prompt = promptOutput.value;
        const config = this.editor.dataManager.getConfig();

        if (!prompt.trim()) {
            this.showToast('提示词为空', 'warning');
            return;
        }

        try {
            const response = await api.fetchApi('/multi_character_editor/validate_prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt,
                    syntax_mode: config.syntax_mode
                })
            });

            if (response.ok) {
                const result = await response.json();

                if (result.valid) {
                    this.showToast('提示词语法验证通过', 'success');
                    this.updateStatus('语法正确', 'success');
                } else {
                    const errorMessage = result.errors.join('; ');
                    this.showToast(`语法错误: ${errorMessage}`, 'error');
                    this.updateStatus(`语法错误: ${errorMessage}`, 'error');
                }

                // 显示警告信息
                if (result.warnings && result.warnings.length > 0) {
                    const warningMessage = result.warnings.join('; ');
                    this.showToast(`警告: ${warningMessage}`, 'warning');
                }

            } else {
                this.showToast('验证请求失败', 'error');
            }

        } catch (error) {
            console.error('验证失败:', error);
            // 提供更准确的错误信息
            let errorMessage = '验证提示词失败';
            if (error.message) {
                if (error.message.includes('Failed to fetch')) {
                    errorMessage = '无法连接到ComfyUI服务器，请检查服务器是否正常运行';
                } else if (error.message.includes('404')) {
                    errorMessage = '验证提示词的API端点未找到，请检查插件是否正确安装';
                } else if (error.message.includes('500')) {
                    errorMessage = '服务器内部错误，请查看ComfyUI控制台获取详细错误信息';
                } else if (error.message.includes('timeout')) {
                    errorMessage = '请求超时，请稍后重试';
                } else {
                    errorMessage = `验证失败: ${error.message}`;
                }
            }
            this.showToast(errorMessage, 'error');
        }
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
        // 移除现有的toast
        const existingToast = document.querySelector('.mce-toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = `mce-toast ${type}`;
        toast.textContent = message;

        // 找到节点容器，将toast添加到节点容器中
        const nodeContainer = this.editor.container;
        if (nodeContainer) {
            // 设置相对定位，以便toast可以相对于节点定位
            if (nodeContainer.style.position !== 'relative' && nodeContainer.style.position !== 'absolute') {
                nodeContainer.style.position = 'relative';
            }
            nodeContainer.appendChild(toast);
        } else {
            // 如果找不到节点容器，则添加到body中
            document.body.appendChild(toast);
        }

        // 自动移除
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, duration);
    }

    clear() {
        const promptOutput = document.getElementById('mce-prompt-output');
        promptOutput.value = '';
        this.updateStatus('');
    }


    updateUI() {
        // 不需要更新统计信息
    }
}

// 导出到全局作用域
window.OutputArea = OutputArea;