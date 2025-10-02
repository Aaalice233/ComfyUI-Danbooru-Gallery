// 设置菜单组件
import { globalToastManager } from './toast_manager.js';

class SettingsMenu {
    constructor(editor) {
        this.editor = editor;
        this.container = null;
        this.isVisible = false;
        this.currentCategory = 'language';
        this.settings = {
            language: 'zh-CN',
            theme: {
                primaryColor: '#743795',
                backgroundColor: '#2a2a2a',
                secondaryColor: '#333333'
            }
        };

        // 多语言支持
        this.translations = {
            'zh-CN': {
                title: '设置',
                categories: {
                    language: '语言',
                    interface: '界面',
                    about: '关于'
                },
                sections: {
                    language: '语言设置',
                    interface: '主题设置',
                    about: '关于'
                },
                labels: {
                    interfaceLanguage: '界面语言',
                    primaryColor: '主色调',
                    backgroundColor: '背景色',
                    secondaryColor: '次要颜色'
                },
                buttons: {
                    save: '保存',
                    reset: '重置',
                    close: '关闭'
                },
                messages: {
                    saved: '设置已保存',
                    saveFailed: '保存设置失败',
                    reset: '设置已重置',
                    resetConfirm: '确定要重置所有设置吗？'
                },
                about: {
                    title: '多人角色提示词编辑器 v1.0.0',
                    description: '一个强大的ComfyUI插件，用于创建多角色提示词。'
                }
            },
            'en-US': {
                title: 'Settings',
                categories: {
                    language: 'Language',
                    interface: 'Interface',
                    about: 'About'
                },
                sections: {
                    language: 'Language Settings',
                    interface: 'Theme Settings',
                    about: 'About'
                },
                labels: {
                    interfaceLanguage: 'Interface Language',
                    primaryColor: 'Primary Color',
                    backgroundColor: 'Background Color',
                    secondaryColor: 'Secondary Color'
                },
                buttons: {
                    save: 'Save',
                    reset: 'Reset',
                    close: 'Close'
                },
                messages: {
                    saved: 'Settings saved',
                    saveFailed: 'Failed to save settings',
                    reset: 'Settings reset',
                    resetConfirm: 'Are you sure you want to reset all settings?'
                },
                about: {
                    title: 'Multi Character Editor v1.0.0',
                    description: 'A powerful ComfyUI plugin for creating multi-character prompts.'
                }
            }
        };

        this.init();
    }

    init() {
        this.loadSettings();
        this.createMenu();
        this.bindEvents();
    }

    createMenu() {
        // 创建设置菜单容器
        this.container = document.createElement('div');
        this.container.className = 'mce-settings-menu';
        this.container.style.display = 'none';

        this.updateMenuContent();

        this.addStyles();
        document.body.appendChild(this.container);
    }

    updateMenuContent() {
        const t = this.translations[this.settings.language];

        this.container.innerHTML = `
            <div class="mce-settings-overlay"></div>
            <div class="mce-settings-dialog">
                <div class="mce-settings-header">
                    <h3 class="mce-settings-title">${t.title}</h3>
                    <button id="mce-settings-close" class="mce-settings-close">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                
                <div class="mce-settings-content">
                    <div class="mce-settings-sidebar">
                        <div class="mce-settings-category active" data-category="language">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="2" y1="12" x2="22" y2="12"></line>
                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                            </svg>
                            ${t.categories.language}
                        </div>
                        <div class="mce-settings-category" data-category="interface">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="9" y1="9" x2="15" y2="9"></line>
                                <line x1="9" y1="15" x2="15" y2="15"></line>
                            </svg>
                            ${t.categories.interface}
                        </div>
                        <div class="mce-settings-category" data-category="about">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="16" x2="12" y2="12"></line>
                                <line x1="12" y1="8" x2="12.01" y2="8"></line>
                            </svg>
                            ${t.categories.about}
                        </div>
                    </div>
                    
                    <div class="mce-settings-main">
                        <div class="mce-settings-panel" data-panel="language">
                            <div class="mce-settings-section">
                                <h4>${t.sections.language}</h4>
                                <div class="mce-setting-item">
                                    <label>${t.labels.interfaceLanguage}</label>
                                    <select id="mce-language-select" class="mce-select">
                                        <option value="zh-CN" ${this.settings.language === 'zh-CN' ? 'selected' : ''}>简体中文</option>
                                        <option value="en-US" ${this.settings.language === 'en-US' ? 'selected' : ''}>English</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <div class="mce-settings-panel" data-panel="interface" style="display: none;">
                            <div class="mce-settings-section">
                                <h4>${t.sections.interface}</h4>
                                <div class="mce-setting-item">
                                    <label>${t.labels.primaryColor}</label>
                                    <div class="mce-color-picker">
                                        <input type="color" id="mce-primary-color" value="${this.settings.theme.primaryColor}">
                                        <input type="text" id="mce-primary-color-hex" class="mce-color-hex" value="${this.settings.theme.primaryColor}">
                                    </div>
                                </div>
                                <div class="mce-setting-item">
                                    <label>${t.labels.backgroundColor}</label>
                                    <div class="mce-color-picker">
                                        <input type="color" id="mce-background-color" value="${this.settings.theme.backgroundColor}">
                                        <input type="text" id="mce-background-color-hex" class="mce-color-hex" value="${this.settings.theme.backgroundColor}">
                                    </div>
                                </div>
                                <div class="mce-setting-item">
                                    <label>${t.labels.secondaryColor}</label>
                                    <div class="mce-color-picker">
                                        <input type="color" id="mce-secondary-color" value="${this.settings.theme.secondaryColor}">
                                        <input type="text" id="mce-secondary-color-hex" class="mce-color-hex" value="${this.settings.theme.secondaryColor}">
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="mce-settings-panel" data-panel="about" style="display: none;">
                            <div class="mce-settings-section">
                                <h4>${t.sections.about}</h4>
                                <div class="mce-about-content">
                                    <p><strong>${t.about.title}</strong></p>
                                    <p>${t.about.description}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="mce-settings-footer">
                    <div class="mce-settings-links">
                        <a href="#" class="mce-settings-link">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                <polyline points="15,3 21,3 21,9"></polyline>
                                <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                            GitHub
                        </a>
                        <a href="#" class="mce-settings-link">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            </svg>
                            反馈
                        </a>
                    </div>
                    <div class="mce-settings-actions">
                        <button id="mce-settings-reset" class="mce-button">${t.buttons.reset}</button>
                        <button id="mce-settings-save" class="mce-button mce-button-primary">${t.buttons.save}</button>
                    </div>
                </div>
            </div>
        `;
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .mce-settings-menu {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .mce-settings-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(5px);
            }
            
            .mce-settings-dialog {
                position: relative;
                width: 90%;
                max-width: 800px;
                height: 80vh;
                max-height: 600px;
                background: linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%);
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3),
                            0 0 0 1px rgba(255, 255, 255, 0.05),
                            inset 0 1px 0 rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.1);
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
            
            .mce-settings-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 24px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                flex-shrink: 0;
                background: linear-gradient(135deg, rgba(42, 42, 62, 0.5) 0%, rgba(58, 58, 78, 0.5) 100%);
                position: relative;
            }
            
            .mce-settings-header::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 24px;
                right: 24px;
                height: 1px;
                background: linear-gradient(90deg,
                    transparent,
                    rgba(255, 255, 255, 0.1),
                    transparent);
            }
            
            .mce-settings-title {
                margin: 0;
                color: #E0E0E0;
                font-size: 16px;
                font-weight: 600;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
            }
            
            .mce-settings-close {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                color: #B0B0B0;
                cursor: pointer;
                padding: 8px;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
            }
            
            .mce-settings-close:hover {
                background: rgba(255, 255, 255, 0.1);
                color: #E0E0E0;
                transform: scale(1.1);
            }
            
            .mce-settings-content {
                display: flex;
                flex: 1;
                overflow: hidden;
            }
            
            .mce-settings-sidebar {
                width: 200px;
                background: rgba(42, 42, 62, 0.4);
                border-right: 1px solid rgba(255, 255, 255, 0.08);
                padding: 16px 0;
                flex-shrink: 0;
                display: flex;
                flex-direction: column;
            }
            
            .mce-settings-category {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 20px;
                cursor: pointer;
                transition: all 0.2s ease;
                color: rgba(224, 224, 224, 0.8);
                position: relative;
            }
            
            .mce-settings-category::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 2px;
                background: linear-gradient(90deg, transparent, rgba(124, 58, 237, 0.5), transparent);
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .mce-settings-category:hover {
                background: rgba(255, 255, 255, 0.05);
                color: #E0E0E0;
                transform: translateX(2px);
            }
            
            .mce-settings-category:hover::before {
                opacity: 1;
            }
            
            .mce-settings-category.active {
                background: linear-gradient(135deg, rgba(124, 58, 237, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%);
                color: white;
            }
            
            .mce-settings-category.active::before {
                opacity: 1;
                background: linear-gradient(90deg, transparent, rgba(124, 58, 237, 0.8), transparent);
            }
            
            .mce-settings-main {
                flex: 1;
                overflow-y: auto;
                padding: 24px;
            }
            
            .mce-settings-panel {
                display: block;
            }
            
            .mce-settings-section {
                margin-bottom: 24px;
            }
            
            .mce-settings-section h4 {
                margin: 0 0 16px 0;
                color: #E0E0E0;
                font-size: 14px;
                font-weight: 600;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
            }
            
            .mce-setting-item {
                margin-bottom: 18px;
            }
            
            .mce-setting-item label {
                display: block;
                margin-bottom: 8px;
                color: rgba(224, 224, 224, 0.8);
                font-size: 13px;
                font-weight: 500;
            }
            
            .mce-select {
                width: 100%;
                padding: 8px 12px;
                background: rgba(26, 26, 38, 0.6);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 6px;
                color: #E0E0E0;
                font-size: 13px;
                transition: all 0.2s ease;
            }
            
            .mce-select:hover {
                background: rgba(26, 26, 38, 0.8);
                border-color: rgba(255, 255, 255, 0.15);
            }
            
            .mce-select:focus {
                outline: none;
                border-color: #7c3aed;
                box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.2);
            }
            
            .mce-color-picker {
                display: flex;
                gap: 10px;
                align-items: center;
            }
            
            .mce-color-picker input[type="color"] {
                width: 40px;
                height: 32px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 6px;
                background: transparent;
                cursor: pointer;
            }
            
            .mce-color-hex {
                flex: 1;
                padding: 8px 12px;
                background: rgba(26, 26, 38, 0.6);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 6px;
                color: #E0E0E0;
                font-size: 13px;
                transition: all 0.2s ease;
            }
            
            .mce-color-hex:hover {
                background: rgba(26, 26, 38, 0.8);
                border-color: rgba(255, 255, 255, 0.15);
            }
            
            .mce-color-hex:focus {
                outline: none;
                border-color: #7c3aed;
                box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.2);
            }
            
            .mce-about-content {
                color: rgba(224, 224, 224, 0.8);
                line-height: 1.6;
            }
            
            .mce-about-content p {
                margin: 0 0 12px 0;
            }
            
            .mce-settings-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 24px;
                border-top: 1px solid rgba(255, 255, 255, 0.08);
                flex-shrink: 0;
                background: linear-gradient(135deg, rgba(42, 42, 62, 0.3) 0%, rgba(58, 58, 78, 0.3) 100%);
                position: relative;
            }
            
            .mce-settings-footer::before {
                content: '';
                position: absolute;
                top: 0;
                left: 24px;
                right: 24px;
                height: 1px;
                background: linear-gradient(90deg,
                    transparent,
                    rgba(255, 255, 255, 0.05),
                    transparent);
            }
            
            .mce-settings-links {
                display: flex;
                gap: 16px;
            }
            
            .mce-settings-link {
                display: flex;
                align-items: center;
                gap: 6px;
                color: rgba(224, 224, 224, 0.8);
                text-decoration: none;
                font-size: 13px;
                transition: all 0.2s ease;
            }
            
            .mce-settings-link:hover {
                color: #7c3aed;
                transform: translateY(-1px);
            }
            
            .mce-settings-actions {
                display: flex;
                gap: 12px;
            }
            
            .mce-button {
                padding: 8px 16px;
                background: linear-gradient(135deg, rgba(64, 64, 84, 0.8) 0%, rgba(74, 74, 94, 0.8) 100%);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 6px;
                color: #E0E0E0;
                cursor: pointer;
                font-size: 13px;
                font-weight: 500;
                transition: all 0.2s ease;
                position: relative;
                overflow: hidden;
            }
            
            .mce-button::before {
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
            
            .mce-button:hover::before {
                left: 100%;
            }
            
            .mce-button:hover {
                background: linear-gradient(135deg, rgba(74, 74, 94, 0.9) 0%, rgba(84, 84, 104, 0.9) 100%);
                border-color: rgba(124, 58, 237, 0.4);
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
            }
            
            .mce-button:active {
                transform: translateY(0);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            
            .mce-button-primary {
                background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%);
                border-color: rgba(124, 58, 237, 0.5);
                box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
            }
            
            .mce-button-primary:hover {
                background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
                box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
            }
        `;
        document.head.appendChild(style);
    }

    bindEvents() {
        // 关闭按钮
        const closeBtn = this.container.querySelector('#mce-settings-close');
        closeBtn.addEventListener('click', () => {
            this.hide();
        });

        // 点击遮罩关闭
        const overlay = this.container.querySelector('.mce-settings-overlay');
        overlay.addEventListener('click', () => {
            this.hide();
        });

        // 分类切换
        const categories = this.container.querySelectorAll('.mce-settings-category');
        categories.forEach(category => {
            category.addEventListener('click', () => {
                const categoryName = category.dataset.category;
                this.switchCategory(categoryName);
            });
        });

        // 语言选择
        const languageSelect = this.container.querySelector('#mce-language-select');
        languageSelect.addEventListener('change', (e) => {
            this.settings.language = e.target.value;
        });

        // 颜色选择
        const primaryColor = this.container.querySelector('#mce-primary-color');
        const primaryColorHex = this.container.querySelector('#mce-primary-color-hex');
        primaryColor.addEventListener('input', (e) => {
            primaryColorHex.value = e.target.value;
            this.settings.theme.primaryColor = e.target.value;
            this.updateThemeColors();
        });
        primaryColorHex.addEventListener('input', (e) => {
            if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                primaryColor.value = e.target.value;
                this.settings.theme.primaryColor = e.target.value;
                this.updateThemeColors();
            }
        });

        const backgroundColor = this.container.querySelector('#mce-background-color');
        const backgroundColorHex = this.container.querySelector('#mce-background-color-hex');
        backgroundColor.addEventListener('input', (e) => {
            backgroundColorHex.value = e.target.value;
            this.settings.theme.backgroundColor = e.target.value;
            this.updateThemeColors();
        });
        backgroundColorHex.addEventListener('input', (e) => {
            if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                backgroundColor.value = e.target.value;
                this.settings.theme.backgroundColor = e.target.value;
                this.updateThemeColors();
            }
        });

        const secondaryColor = this.container.querySelector('#mce-secondary-color');
        const secondaryColorHex = this.container.querySelector('#mce-secondary-color-hex');
        secondaryColor.addEventListener('input', (e) => {
            secondaryColorHex.value = e.target.value;
            this.settings.theme.secondaryColor = e.target.value;
            this.updateThemeColors();
        });
        secondaryColorHex.addEventListener('input', (e) => {
            if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                secondaryColor.value = e.target.value;
                this.settings.theme.secondaryColor = e.target.value;
                this.updateThemeColors();
            }
        });

        // 保存按钮
        const saveBtn = this.container.querySelector('#mce-settings-save');
        saveBtn.addEventListener('click', () => {
            this.saveSettings();
        });

        // 重置按钮
        const resetBtn = this.container.querySelector('#mce-settings-reset');
        resetBtn.addEventListener('click', () => {
            this.resetSettings();
        });
    }

    switchCategory(categoryName) {
        // 更新分类激活状态
        const categories = this.container.querySelectorAll('.mce-settings-category');
        categories.forEach(category => {
            if (category.dataset.category === categoryName) {
                category.classList.add('active');
            } else {
                category.classList.remove('active');
            }
        });

        // 切换面板显示
        const panels = this.container.querySelectorAll('.mce-settings-panel');
        panels.forEach(panel => {
            if (panel.dataset.panel === categoryName) {
                panel.style.display = 'block';
            } else {
                panel.style.display = 'none';
            }
        });

        this.currentCategory = categoryName;
    }

    updateThemeColors() {
        // 更新CSS变量
        document.documentElement.style.setProperty('--mce-primary-color', this.settings.theme.primaryColor);
        document.documentElement.style.setProperty('--mce-background-color', this.settings.theme.backgroundColor);
        document.documentElement.style.setProperty('--mce-secondary-color', this.settings.theme.secondaryColor);
    }

    show() {
        this.container.style.display = 'flex';
        this.isVisible = true;
        this.loadSettingsToUI();
    }

    hide() {
        this.container.style.display = 'none';
        this.isVisible = false;
    }

    loadSettings() {
        // 从数据管理器加载设置
        if (this.editor.dataManager && this.editor.dataManager.config.settings) {
            this.settings = { ...this.settings, ...this.editor.dataManager.config.settings };
        }
    }

    loadSettingsToUI() {
        // 加载设置到UI
        const languageSelect = this.container.querySelector('#mce-language-select');
        languageSelect.value = this.settings.language;

        const primaryColor = this.container.querySelector('#mce-primary-color');
        const primaryColorHex = this.container.querySelector('#mce-primary-color-hex');
        primaryColor.value = this.settings.theme.primaryColor;
        primaryColorHex.value = this.settings.theme.primaryColor;

        const backgroundColor = this.container.querySelector('#mce-background-color');
        const backgroundColorHex = this.container.querySelector('#mce-background-color-hex');
        backgroundColor.value = this.settings.theme.backgroundColor;
        backgroundColorHex.value = this.settings.theme.backgroundColor;

        const secondaryColor = this.container.querySelector('#mce-secondary-color');
        const secondaryColorHex = this.container.querySelector('#mce-secondary-color-hex');
        secondaryColor.value = this.settings.theme.secondaryColor;
        secondaryColorHex.value = this.settings.theme.secondaryColor;

        this.updateThemeColors();
    }

    async saveSettings() {
        try {
            // 保存到数据管理器
            if (this.editor.dataManager) {
                this.editor.dataManager.updateConfig({ settings: this.settings });
                await this.editor.dataManager.saveConfig();
            }

            // 显示保存成功提示
            this.showToast('设置已保存', 'success');
        } catch (error) {
            console.error('保存设置失败:', error);
            this.showToast('保存设置失败', 'error');
        }
    }

    resetSettings() {
        if (confirm('确定要重置所有设置吗？')) {
            this.settings = {
                language: 'zh-CN',
                theme: {
                    primaryColor: '#743795',
                    backgroundColor: '#2a2a2a',
                    secondaryColor: '#333333'
                }
            };
            this.loadSettingsToUI();
            this.showToast('设置已重置', 'info');
        }
    }

    showToast(message, type = 'info') {
        // 使用统一的弹出提示管理系统
        globalToastManager.showToast(message, type, 3000);
    }
}

// 导出
window.SettingsMenu = SettingsMenu;