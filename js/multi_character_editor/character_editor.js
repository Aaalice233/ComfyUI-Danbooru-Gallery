// 角色编辑器组件
import { globalAutocompleteCache } from "../global/autocomplete_cache.js";
import { AutocompleteUI } from "../global/autocomplete_ui.js";
import { globalToastManager as toastManagerProxy } from "../global/toast_manager.js";
import { globalMultiLanguageManager } from "../global/multi_language.js";

class CharacterEditor {
    constructor(editor) {
        this.editor = editor;
        this.container = editor.container.querySelector('.mce-character-editor');
        this.characters = [];
        this.draggedElement = null;
        this.selectedCharacterId = null; // 🔧 新增：记录当前选中的角色ID
        this.toastManager = toastManagerProxy; // 🔧 添加toast管理器引用
        this.currentView = 'list'; // 当前视图：'list' 或 'edit'
        this.editingCharacterId = null; // 当前正在编辑的角色ID
        this.init();
    }

    init() {
        this.createLayout();
        this.bindEvents();
        this.loadPromptData();

        // 🔧 一次性绑定角色列表的事件委托
        this.bindCharacterListEvents();

        // 🔧 修复：初始化时渲染角色列表，确保全局提示词显示
        this.updateUI();

        // 设置全局引用
        window.characterEditor = this;

        // 监听语言变化事件
        document.addEventListener('languageChanged', (e) => {
            if (e.detail.component === 'characterEditor' || !e.detail.component) {
                this.updateTexts();
            }
        });
    }

    createLayout() {
        const t = this.editor.languageManager ? this.editor.languageManager.t.bind(this.editor.languageManager) : globalMultiLanguageManager.t.bind(globalMultiLanguageManager);

        this.container.innerHTML = `
            <div class="mce-character-header">
                <h3 class="mce-character-title">${t('characterEditor')}</h3>
                <div class="mce-character-actions">
                    <button id="mce-add-character" class="mce-button mce-button-primary" title="${t('addCharacter')}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        <span class="mce-button-text">${t('buttonTexts.addCharacter')}</span>
                    </button>
                    <button id="mce-library-button" class="mce-button" title="${t('selectFromLibrary')}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                            <line x1="8" y1="6" x2="16" y2="6"></line>
                            <line x1="8" y1="10" x2="16" y2="10"></line>
                            <line x1="8" y1="14" x2="13" y2="14"></line>
                        </svg>
                        <span class="mce-button-text">${t('buttonTexts.selectFromLibrary')}</span>
                    </button>
                </div>
            </div>
            <div class="mce-character-content">
            <div class="mce-character-list" id="mce-character-list">
                <!-- 角色列表将在这里动态生成 -->
                </div>
                <div class="mce-character-edit-panel" id="mce-character-edit-panel" style="display: none;">
                    <!-- 编辑面板将在这里动态生成 -->
                </div>
            </div>
            <div class="mce-character-footer">
                <button id="mce-save-as-preset" class="mce-button mce-button-primary mce-save-preset-btn" title="${t('saveAsPreset')}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                        <polyline points="7 3 7 8 15 8"></polyline>
                    </svg>
                    <span class="mce-button-text">${t('saveAsPreset')}</span>
                </button>
            </div>
        `;

        this.addStyles();
        this.listElement = this.container.querySelector('#mce-character-list');
        this.editPanel = this.container.querySelector('#mce-character-edit-panel');

        // 添加返回按钮
        this.createBackButton();
    }

    createBackButton() {
        const header = this.container.querySelector('.mce-character-header');
        if (!header) return;

        const t = this.editor.languageManager ? this.editor.languageManager.t.bind(this.editor.languageManager) : globalMultiLanguageManager.t.bind(globalMultiLanguageManager);

        const backButton = document.createElement('button');
        backButton.id = 'mce-back-to-list';
        backButton.className = 'mce-back-button';
        backButton.style.display = 'none';
        backButton.title = t('back') || '返回';
        backButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
        `;

        header.insertBefore(backButton, header.firstChild);

        backButton.addEventListener('click', () => {
            this.showListView();
        });
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .mce-character-editor {
                width: 420px;
                min-width: 420px;
                max-width: 500px;
                height: 100%;
                flex: 0 0 auto;
                background: rgba(42, 42, 62, 0.3);
                border-right: 1px solid rgba(255, 255, 255, 0.08);
                display: flex;
                flex-direction: column;
                backdrop-filter: blur(5px);
            }
            
            .mce-character-header {
                padding: 14px 20px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                display: flex;
                align-items: center;
                gap: 8px;
                flex-shrink: 0;
                flex-wrap: nowrap;
                background: linear-gradient(135deg, rgba(42, 42, 62, 0.5) 0%, rgba(58, 58, 78, 0.5) 100%);
                position: relative;
                min-height: 56px;
            }
            
            .mce-character-header::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 20px;
                right: 20px;
                height: 1px;
                background: linear-gradient(90deg,
                    transparent,
                    rgba(255, 255, 255, 0.1),
                    transparent);
            }
            
            .mce-character-title {
                margin: 0;
                font-size: 14px;
                font-weight: 600;
                color: #E0E0E0;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
                flex-shrink: 0;
            }
            
            .mce-character-actions {
                display: flex;
                gap: 8px;
                flex-shrink: 0;
                flex-wrap: nowrap;
                margin-left: auto;
            }
            
            .mce-button {
                padding: 8px 12px;
                background: linear-gradient(135deg, rgba(64, 64, 84, 0.8) 0%, rgba(74, 74, 94, 0.8) 100%);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 6px;
                color: #E0E0E0;
                cursor: pointer;
                font-size: 12px;
                font-weight: 500;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 6px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                position: relative;
                overflow: hidden;
                white-space: nowrap;
                flex-shrink: 0;
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
            
            .mce-button svg {
                flex-shrink: 0;
            }
            
            .mce-button-text {
                display: inline-block;
            }
            
            .mce-character-list {
                flex: 1;
                overflow-y: auto;
                padding: 12px 20px;
                min-height: 200px;
            }
            
            .mce-character-footer {
                padding: 12px 20px;
                border-top: 1px solid rgba(255, 255, 255, 0.08);
                display: flex;
                justify-content: center;
                align-items: center;
                background: linear-gradient(135deg, rgba(42, 42, 62, 0.5) 0%, rgba(58, 58, 78, 0.5) 100%);
                flex-shrink: 0;
                min-height: 60px;
            }
            
            .mce-save-preset-btn {
                width: 100%;
                max-width: 360px;
                justify-content: center;
                gap: 8px;
                font-size: 14px;
                font-weight: 600;
                padding: 12px 20px;
            }
            
            .mce-save-preset-btn:hover {
                transform: translateY(-1px);
            }
            
            .mce-save-preset-btn svg {
                filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
            }
            
            .mce-character-item {
                background: rgba(42, 42, 62, 0.6);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 8px;
                margin-bottom: 10px;
                padding: 12px 14px;
                cursor: pointer;
                transition: all 0.3s ease;
                position: relative;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                backdrop-filter: blur(5px);
            }
            
            .mce-character-item:hover {
                background: rgba(58, 58, 78, 0.7);
                border-color: rgba(124, 58, 237, 0.3);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
            
            .mce-character-item.selected {
                background: rgba(124, 58, 237, 0.25);
                border-color: rgba(124, 58, 237, 0.5);
                box-shadow: 0 4px 12px rgba(124, 58, 237, 0.2);
            }
            
            .mce-character-item.disabled {
                opacity: 0.5;
            }
            
            .mce-character-item.dragging {
                opacity: 0.5;
                transform: rotate(5deg);
            }
            
            .mce-character-item-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }
            
            .mce-character-name {
                font-weight: 600;
                color: #E0E0E0;
                display: flex;
                align-items: center;
                gap: 10px;
                flex: 1;
                min-width: 0;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
            }
            
            .mce-character-color {
                width: 18px;
                height: 18px;
                border-radius: 50%;
                border: 2px solid rgba(255, 255, 255, 0.2);
                box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2);
            }
            
            .mce-character-item.selected .mce-character-color {
                border-color: rgba(255, 255, 255, 0.5);
                box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3);
            }
            
            .mce-character-controls {
                display: flex;
                gap: 6px;
            }
            
            .mce-character-control {
                min-width: 28px;
                height: 28px;
                border: none;
                background: rgba(255, 255, 255, 0.05);
                color: #B0B0B0;
                cursor: pointer;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 4px;
                padding: 0 6px;
                transition: all 0.2s ease;
                font-size: 10px;
            }
            
            .mce-character-control span {
                white-space: nowrap;
            }
            
            .mce-character-control:hover {
                background: rgba(255, 255, 255, 0.1);
                color: #E0E0E0;
                transform: scale(1.1);
            }
            
            .mce-character-prompt {
                font-size: 12px;
                color: rgba(224, 224, 224, 0.8);
                line-height: 1.5;
                margin-bottom: 10px;
                overflow: hidden;
                text-overflow: ellipsis;
                display: -webkit-box;
                -webkit-line-clamp: 3;
                -webkit-box-orient: vertical;
                word-break: break-word;
            }
            
            .mce-character-info {
                display: flex;
                justify-content: flex-start;
                align-items: center;
                gap: 10px;
                flex-wrap: wrap;
                font-size: 11px;
                color: rgba(136, 136, 136, 0.8);
                margin-top: 8px;
                padding-top: 8px;
                border-top: 1px solid rgba(255, 255, 255, 0.06);
            }
            
            .mce-character-params {
                display: flex;
                gap: 10px;
                align-items: center;
                flex-wrap: wrap;
            }
            
            .mce-character-position {
                padding: 2px 8px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 4px;
                font-size: 10px;
                font-weight: 500;
                color: rgba(176, 176, 176, 0.8);
                flex-shrink: 0;
            }
            
            .mce-character-param {
                display: flex;
                align-items: center;
                gap: 4px;
                font-size: 10px;
                color: rgba(180, 180, 200, 0.9);
                background: rgba(124, 58, 237, 0.08);
                padding: 2px 8px;
                border-radius: 4px;
                border: 1px solid rgba(124, 58, 237, 0.15);
                flex-shrink: 0;
            }
            
            .mce-character-param svg {
                opacity: 0.7;
                flex-shrink: 0;
            }
            
            .mce-character-weight {
                display: flex;
                align-items: center;
                gap: 4px;
            }
            
            .mce-character-properties {
                border-top: 1px solid rgba(255, 255, 255, 0.08);
                padding: 16px;
                background: rgba(42, 42, 62, 0.4);
                max-height: 300px;
                overflow-y: auto;
            }
            
            .mce-empty-state {
                text-align: center;
                color: rgba(136, 136, 136, 0.8);
                font-style: italic;
                padding: 30px 20px;
            }
            
            .mce-property-group {
                margin-bottom: 18px;
            }
            
            .mce-property-label {
                display: block;
                margin-bottom: 6px;
                font-size: 12px;
                color: rgba(224, 224, 224, 0.8);
                font-weight: 500;
            }
            
            .mce-property-input {
                width: 100%;
                padding: 8px 12px;
                background: rgba(26, 26, 38, 0.6);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 6px;
                color: #E0E0E0;
                font-size: 12px;
                box-sizing: border-box;
                transition: all 0.2s ease;
            }
            
            .mce-property-input:hover {
                background: rgba(26, 26, 38, 0.8);
                border-color: rgba(255, 255, 255, 0.15);
            }
            
            .mce-property-input:focus {
                outline: none;
                border-color: #7c3aed;
                box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.2);
            }
            
            .mce-property-textarea {
                resize: vertical;
                min-height: 60px;
                font-family: inherit;
            }
            
            .mce-property-checkbox {
                display: flex;
                align-items: center;
                gap: 8px;
                cursor: pointer;
            }
            
            .mce-property-checkbox input {
                margin: 0;
            }
            
            .mce-property-slider {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .mce-property-slider input[type="range"] {
                flex: 1;
            }
            
            .mce-property-slider-value {
                min-width: 40px;
                text-align: right;
                font-size: 12px;
                color: rgba(224, 224, 224, 0.8);
            }
            
            .mce-property-color {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .mce-property-color input[type="color"] {
                width: 40px;
                height: 32px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 6px;
                background: transparent;
                cursor: pointer;
            }
            
            .mce-property-color-hex {
                flex: 1;
            }
            
            /* 🔧 全局提示词项独特样式 */
            .mce-global-prompt-item {
                background: rgba(124, 58, 237, 0.15);
                border: 2px solid rgba(124, 58, 237, 0.3);
                margin-bottom: 16px !important;
            }
            
            .mce-global-prompt-item:hover {
                background: rgba(124, 58, 237, 0.2);
                border-color: rgba(124, 58, 237, 0.5);
                box-shadow: 0 4px 12px rgba(124, 58, 237, 0.25);
            }
            
            .mce-global-icon {
                background: rgba(124, 58, 237, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid rgba(255, 255, 255, 0.3);
                box-shadow: 0 2px 6px rgba(124, 58, 237, 0.4);
            }
            
            .mce-global-icon svg {
                color: white;
                filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
            }
            
            .mce-global-title {
                font-weight: 700;
                color: rgba(167, 139, 250, 1);
                text-shadow: 0 1px 3px rgba(124, 58, 237, 0.5);
                letter-spacing: 0.5px;
            }
            
            .mce-character-badge {
                padding: 3px 10px;
                background: rgba(124, 58, 237, 0.8);
                border-radius: 12px;
                font-size: 10px;
                font-weight: 600;
                color: white;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .mce-character-syntax-badge {
                display: flex;
                gap: 6px;
                flex-shrink: 0;
            }

            .mce-syntax-tag {
                padding: 2px 8px;
                background: rgba(34, 197, 94, 0.2);
                border: 1px solid rgba(34, 197, 94, 0.5);
                border-radius: 4px;
                font-size: 9px;
                font-weight: 600;
                color: rgb(134, 239, 172);
                text-transform: uppercase;
                letter-spacing: 0.3px;
                white-space: nowrap;
            }
            
            /* FILL toggle按钮样式 */
            .mce-fill-toggle {
                position: relative;
                transition: all 0.3s ease;
            }
            
            .mce-fill-toggle:not(.active) {
                background: rgba(255, 255, 255, 0.05);
                color: rgba(176, 176, 176, 0.6);
                border: 1px solid rgba(255, 255, 255, 0.05);
            }
            
            .mce-fill-toggle.active {
                background: rgba(34, 197, 94, 0.25);
                color: rgb(134, 239, 172);
                border: 1px solid rgba(34, 197, 94, 0.5);
            }
            
            /* 🔧 已移除：闪烁动画效果，避免干扰用户操作 */
            
            .mce-fill-toggle:hover {
                transform: scale(1.05);
            }
            
            .mce-fill-toggle.active:hover {
                background: rgba(34, 197, 94, 0.35);
            }

            /* 返回按钮样式 */
            .mce-back-button {
                background: rgba(124, 58, 237, 0.15);
                border: 1px solid rgba(124, 58, 237, 0.3);
                border-radius: 6px;
                padding: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #b794f4;
                margin-right: 8px;
            }

            .mce-back-button:hover {
                background: rgba(124, 58, 237, 0.25);
                border-color: rgba(124, 58, 237, 0.5);
                transform: translateX(-2px);
            }

            .mce-back-button svg {
                flex-shrink: 0;
            }

            /* 角色内容区域 */
            .mce-character-content {
                flex: 1;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                position: relative;
                min-height: 0;
            }

            .mce-character-list {
                flex: 1;
                overflow-y: auto;
                overflow-x: hidden;
                min-height: 0;
            }

            /* 内联编辑面板 */
            .mce-character-edit-panel {
                flex: 1;
                display: none;
                flex-direction: column;
                overflow: hidden;
                background: #2a2a3e;
            }

            .mce-character-edit-panel.mce-edit-active {
                display: flex !important;
            }

            .mce-inline-edit-container {
                flex: 1;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }

            .mce-inline-edit-form {
                flex: 1;
                padding: 16px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 16px;
            }

            .mce-inline-textarea {
                width: 100%;
                min-height: 80px;
                resize: vertical;
                font-family: inherit;
                line-height: 1.5;
                background: #1a1a26;
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 6px;
                padding: 10px;
                color: #E0E0E0;
                font-size: 13px;
                transition: border-color 0.2s ease;
            }

            .mce-inline-textarea:focus {
                outline: none;
                border-color: #7c3aed;
                box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.2);
            }

            .mce-inline-edit-footer {
                padding: 14px;
                border-top: 1px solid rgba(255, 255, 255, 0.08);
                display: flex;
                gap: 8px;
                justify-content: flex-end;
                background: rgba(30, 30, 46, 0.6);
            }
            
        `;
        document.head.appendChild(style);
    }

    bindEvents() {
        // 监听角色删除事件，更新角色列表
        if (this.editor.eventBus) {
            this.editor.eventBus.on('character:deleted', (characterId) => {
                this.renderCharacterList();
                // 如果删除的是当前选中的角色，清除属性面板
                if (this.selectedCharacterId === characterId) {
                    this.clearProperties();
                    this.selectedCharacterId = null;
                }
            });
        }

        // 使用setTimeout确保DOM元素已经创建
        setTimeout(() => {
            try {
                // 添加角色按钮
                const addCharacterBtn = document.getElementById('mce-add-character');
                if (addCharacterBtn) {
                    addCharacterBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.addCharacter();
                    });
                }

                // 从词库添加按钮
                const libraryBtn = document.getElementById('mce-library-button');
                if (libraryBtn) {
                    libraryBtn.addEventListener('click', (e) => {
                        this.showLibraryModal();
                    });
                }

                // 另存为预设按钮
                const savePresetBtn = document.getElementById('mce-save-as-preset');
                if (savePresetBtn) {
                    savePresetBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (this.editor.presetManager) {
                            this.editor.presetManager.showSaveAsPresetPanel();
                        }
                    });
                }

            } catch (error) {
                console.error("绑定CharacterEditor事件时发生错误:", error);
            }
        }, 100); // 延迟100ms确保DOM完全渲染
    }

    async loadPromptData() {
        try {
            // 从提示词选择器获取词库数据
            const response = await fetch("/prompt_selector/data");
            if (response.ok) {
                this.promptData = await response.json();
            } else {
                console.error('加载词库数据失败');
                this.promptData = { categories: [] };
            }
        } catch (error) {
            console.error('加载词库数据失败:', error);
            this.promptData = { categories: [] };
        }
    }

    addCharacter(promptData = null) {
        try {
            const characterData = promptData ? {
                name: promptData.alias || promptData.prompt,
                prompt: promptData.prompt,
                weight: 1.0,
                color: this.getRandomColor(),
            } : null;

            if (!this.editor || !this.editor.dataManager) {
                console.error('编辑器或数据管理器不存在');
                return;
            }

            const character = this.editor.dataManager.addCharacter(characterData);

            // 立即刷新角色列表，不使用防抖
            this.doRenderCharacterList();

            this.selectCharacter(character.id);

            // 🔧 关键修复：确保角色数据立即保存到节点状态
            if (this.editor.saveToNodeState) {
                const config = this.editor.dataManager.getConfig();

                this.editor.saveToNodeState(config);
            }

        } catch (error) {
            console.error("addCharacter() 发生错误:", error);
        }
    }

    // 🔧 新增：直接添加角色到UI，不触发事件
    addCharacterToUI(characterData, triggerEvent = true) {
        try {
            console.log('[CharacterEditor] addCharacterToUI: 添加角色到UI', {
                id: characterData?.id,
                name: characterData?.name,
                triggerEvent
            });

            if (!characterData) {
                console.error('[CharacterEditor] addCharacterToUI: 角色数据为空');
                return;
            }

            // 直接添加到characters数组，不触发事件
            this.characters.push(characterData);

            // 立即刷新角色列表
            this.doRenderCharacterList();

            // 选择角色
            this.selectCharacter(characterData.id);


        } catch (error) {
            console.error('[CharacterEditor] addCharacterToUI: 添加角色失败:', error);
        }
    }

    // 🔧 新增：清空所有角色
    clearAllCharacters() {
        try {

            this.characters = [];
            this.doRenderCharacterList();

        } catch (error) {
            console.error('[CharacterEditor] clearAllCharacters: 清空角色失败:', error);
        }
    }

    getRandomColor() {
        const colors = [
            "#FF6B6B", "#4ECDC4", "#FF9FF3", "#54A0FF",
            "#FFA502", "#96CEB4", "#786FA6", "#FFEAA7",
            "#FD79A8", "#A29BFE", "#6C5CE7", "#FDCB6E"
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    deleteCharacter(characterId) {
        const t = this.editor.languageManager ? this.editor.languageManager.t.bind(this.editor.languageManager) : globalMultiLanguageManager.t.bind(globalMultiLanguageManager);

        // 创建自定义确认对话框
        const modal = document.createElement('div');
        modal.className = 'mce-confirm-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const modalContent = document.createElement('div');
        modalContent.className = 'mce-confirm-content';
        modalContent.style.cssText = `
            background: #2a2a2a;
            border-radius: 8px;
            padding: 24px;
            max-width: 400px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        `;

        modalContent.innerHTML = `
            <h3 style="margin: 0 0 12px 0; color: #E0E0E0; font-size: 18px;">${t('deleteConfirm')}</h3>
            <p style="margin: 0 0 20px 0; color: #B0B0B0; font-size: 14px;">${t('deleteCharacterWarning')}</p>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="mce-cancel-delete" style="
                    padding: 8px 16px;
                    background: #454545;
                    border: 1px solid #555;
                    border-radius: 4px;
                    color: #E0E0E0;
                    cursor: pointer;
                    font-size: 14px;
                ">
                    ${t('buttonTexts.cancel')}
                </button>
                <button id="mce-confirm-delete" style="
                    padding: 8px 16px;
                    background: #f44336;
                    border: 1px solid #f44336;
                    border-radius: 4px;
                    color: white;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                ">
                    ${t('buttonTexts.delete')}
                </button>
            </div>
        `;

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // 关闭对话框的函数
        const closeModal = () => {
            if (modal.parentNode) {
                document.body.removeChild(modal);
            }
            document.removeEventListener('keydown', handleEscape);
        };

        // 确认删除的处理函数
        const handleConfirm = () => {
            // 🔧 优化：删除角色前先检查是否是当前选中的蒙版
            if (this.editor.components.maskEditor) {
                const selectedMask = this.editor.components.maskEditor.selectedMask;
                if (selectedMask && selectedMask.characterId === characterId) {
                    // 清除选中状态
                    this.editor.components.maskEditor.selectedMask = null;
                }
            }

            // 删除角色（会自动删除角色的提示词和蒙版数据）
            this.editor.dataManager.deleteCharacter(characterId);
            this.renderCharacterList();
            this.clearProperties();

            // 强制重新渲染蒙版编辑器，确保画布立即刷新
            if (this.editor.components.maskEditor) {
                // 立即同步蒙版数据（从角色列表重新构建蒙版列表）
                this.editor.components.maskEditor.syncMasksFromCharacters();
                // 强制重新渲染
                this.editor.components.maskEditor.scheduleRender();

                // 添加额外延迟渲染，确保在DOM更新后再次渲染
                setTimeout(() => {
                    this.editor.components.maskEditor.scheduleRender();
                }, 50);
            }

            closeModal();
        };

        // ESC键关闭功能
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeModal();
            }
        };

        // 绑定事件 - 使用querySelector在modal内查找按钮
        setTimeout(() => {
            const confirmBtn = modal.querySelector('#mce-confirm-delete');
            const cancelBtn = modal.querySelector('#mce-cancel-delete');

            if (confirmBtn) {
                confirmBtn.addEventListener('click', handleConfirm);
            } else {
                console.error('[CharacterEditor] 未找到确认删除按钮');
            }

            if (cancelBtn) {
                cancelBtn.addEventListener('click', closeModal);
            } else {
                console.error('[CharacterEditor] 未找到取消删除按钮');
            }

            // 点击背景关闭
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal();
                }
            });

            document.addEventListener('keydown', handleEscape);
        }, 0);
    }

    toggleCharacterEnabled(characterId) {
        const character = this.editor.dataManager.getCharacter(characterId);
        if (character) {
            this.editor.dataManager.updateCharacter(characterId, {
                enabled: !character.enabled
            });
            this.renderCharacterList();

            // 强制重新渲染蒙版编辑器，确保画布立即刷新
            if (this.editor.components.maskEditor) {
                // 立即同步蒙版数据
                this.editor.components.maskEditor.syncMasksFromCharacters();
                // 强制重新渲染
                this.editor.components.maskEditor.scheduleRender();

                // 添加额外延迟渲染，确保在DOM更新后再次渲染
                setTimeout(() => {
                    this.editor.components.maskEditor.scheduleRender();
                }, 50);
            }
        }
    }

    // 🔧 新增：切换FILL模式（单选）
    toggleFillMode(characterId) {
        console.log('[CharacterEditor] toggleFillMode 被调用，characterId:', characterId);

        if (characterId === '__global__') {
            // 切换全局提示词的FILL状态
            const config = this.editor.dataManager.getConfig();
            const currentState = config.global_use_fill || false;
            console.log('[CharacterEditor] 全局FILL当前状态:', currentState, '即将切换为:', !currentState);

            // 关闭所有角色的FILL
            const characters = this.editor.dataManager.getCharacters();
            characters.forEach(char => {
                if (char.use_fill) {
                    console.log('[CharacterEditor] 关闭角色FILL:', char.id, char.name);
                    this.editor.dataManager.updateCharacter(char.id, { use_fill: false });
                }
            });

            // 切换全局的FILL状态
            this.editor.dataManager.updateConfig({ global_use_fill: !currentState });
            console.log('[CharacterEditor] 全局FILL已更新为:', !currentState);
        } else {
            // 切换角色的FILL状态
            const character = this.editor.dataManager.getCharacter(characterId);
            if (!character) {
                console.error('[CharacterEditor] 角色不存在:', characterId);
                return;
            }

            const currentState = character.use_fill || false;
            console.log('[CharacterEditor] 角色FILL当前状态:', character.name, currentState, '即将切换为:', !currentState);

            if (!currentState) {
                // 如果要开启，先关闭全局和其他所有角色的FILL
                console.log('[CharacterEditor] 开启角色FILL前，先关闭全局FILL');
                this.editor.dataManager.updateConfig({ global_use_fill: false });

                const characters = this.editor.dataManager.getCharacters();
                characters.forEach(char => {
                    if (char.id !== characterId && char.use_fill) {
                        console.log('[CharacterEditor] 关闭其他角色FILL:', char.id, char.name);
                        this.editor.dataManager.updateCharacter(char.id, { use_fill: false });
                    }
                });
            }

            // 切换当前角色的FILL状态
            this.editor.dataManager.updateCharacter(characterId, { use_fill: !currentState });
            console.log('[CharacterEditor] 角色FILL已更新:', character.name, 'use_fill:', !currentState);
        }

        // 重新渲染列表
        this.renderCharacterList();
        // 🔧 修复：立即更新输出，确保FILL状态变化立即生效
        this.editor.updateOutput();

        // 额外触发一次保存，确保数据持久化
        setTimeout(() => {
            if (this.editor.saveToNodeState) {
                const config = this.editor.dataManager.getConfig();
                console.log('[CharacterEditor] 保存FILL状态到节点:', {
                    global_use_fill: config.global_use_fill,
                    characters_with_fill: config.characters?.filter(c => c.use_fill)?.length || 0
                });
                this.editor.saveToNodeState(config);
            }
        }, 50);
    }

    editCharacter(characterId) {
        if (characterId === '__global__') {
            // 编辑全局提示词
            this.showGlobalPromptDialog();
        } else {
            // 编辑普通角色
            this.showEditDialog(characterId);
        }
    }

    /**
     * 显示列表视图
     */
    showListView() {
        this.currentView = 'list';
        this.editingCharacterId = null;

        // 显示列表，隐藏编辑面板
        this.listElement.style.display = '';
        this.editPanel.style.display = 'none';
        this.editPanel.classList.remove('mce-edit-active');

        // 显示底部区域
        const footer = this.container.querySelector('.mce-character-footer');
        if (footer) footer.style.display = '';

        // 隐藏返回按钮，显示操作按钮
        const backButton = document.getElementById('mce-back-to-list');
        const actions = document.querySelector('.mce-character-actions');
        if (backButton) backButton.style.display = 'none';
        if (actions) actions.style.display = '';

        // 更新标题
        const title = document.getElementById('mce-character-title');
        const t = this.editor.languageManager ? this.editor.languageManager.t.bind(this.editor.languageManager) : globalMultiLanguageManager.t.bind(globalMultiLanguageManager);
        if (title) title.textContent = t('characterEditor');

        // 销毁编辑面板的智能补全实例
        if (this.inlineAutocompleteInstance) {
            this.inlineAutocompleteInstance.destroy();
            this.inlineAutocompleteInstance = null;
        }
    }

    /**
     * 显示内联编辑面板
     */
    showInlineEditPanel(characterId) {
        this.currentView = 'edit';
        this.editingCharacterId = characterId;

        const t = this.editor.languageManager ? this.editor.languageManager.t.bind(this.editor.languageManager) : globalMultiLanguageManager.t.bind(globalMultiLanguageManager);

        // 获取角色数据
        let character, characterName, characterNote, characterPrompt;
        if (characterId === '__global__') {
            const config = this.editor.dataManager.getConfig();
            characterName = t('globalPrompt') || '全局提示词';
            characterNote = config.global_note || '';
            characterPrompt = config.global_prompt || '';
        } else {
            character = this.editor.dataManager.getCharacter(characterId);
            if (!character) return;
            characterName = character.name;
            characterNote = character.note || '';
            characterPrompt = character.prompt || '';
        }

        // 渲染编辑面板
        this.editPanel.innerHTML = `
            <div class="mce-inline-edit-container">
                <div class="mce-inline-edit-form">
                    <div class="mce-form-group">
                        <label class="mce-form-label">${t('note') || '备注'}</label>
                        <textarea 
                            id="mce-inline-note-input" 
                            class="mce-form-input mce-inline-textarea" 
                            placeholder="${t('notePlaceholder') || '添加备注...'}"
                            rows="3">${characterNote}</textarea>
                    </div>
                    <div class="mce-form-group">
                        <label class="mce-form-label">${t('prompt') || '提示词'}</label>
                        <textarea 
                            id="mce-inline-prompt-input" 
                            class="mce-form-input mce-inline-textarea mce-autocomplete-input" 
                            placeholder="${t('promptPlaceholder') || '输入提示词...'}"
                            rows="12">${characterPrompt}</textarea>
                    </div>
                </div>
                <div class="mce-inline-edit-footer">
                    <button class="mce-button" id="mce-inline-cancel-btn">
                        ${t('cancel') || '取消'}
                    </button>
                    <button class="mce-button mce-button-primary" id="mce-inline-save-btn">
                        ${t('save') || '保存'}
                    </button>
                </div>
            </div>
        `;

        // 切换视图
        this.listElement.style.display = 'none';
        this.editPanel.style.display = '';
        this.editPanel.classList.add('mce-edit-active');

        // 显示返回按钮，隐藏操作按钮
        const backButton = document.getElementById('mce-back-to-list');
        const actions = document.querySelector('.mce-character-actions');
        if (backButton) backButton.style.display = '';
        if (actions) actions.style.display = 'none';

        // 隐藏底部区域
        const footer = this.container.querySelector('.mce-character-footer');
        if (footer) footer.style.display = 'none';

        // 更新标题
        const title = document.getElementById('mce-character-title');
        if (title) title.textContent = characterName;

        // 绑定事件
        this.bindInlineEditEvents(characterId);

        // 初始化智能补全
        this.setupInlineAutocomplete();
    }

    /**
     * 绑定内联编辑面板事件
     */
    bindInlineEditEvents(characterId) {
        const saveBtn = document.getElementById('mce-inline-save-btn');
        const cancelBtn = document.getElementById('mce-inline-cancel-btn');
        const noteInput = document.getElementById('mce-inline-note-input');
        const promptInput = document.getElementById('mce-inline-prompt-input');

        const t = this.editor.languageManager ? this.editor.languageManager.t.bind(this.editor.languageManager) : globalMultiLanguageManager.t.bind(globalMultiLanguageManager);

        // 保存按钮
        saveBtn.addEventListener('click', () => {
            const note = noteInput.value.trim();
            const prompt = promptInput.value.trim();

            if (characterId === '__global__') {
                // 更新全局提示词
                const config = this.editor.dataManager.getConfig();
                config.global_note = note;
                config.global_prompt = prompt;
                this.editor.dataManager.save();
            } else {
                // 更新角色
                const character = this.editor.dataManager.getCharacter(characterId);
                if (character) {
                    character.note = note;
                    character.prompt = prompt;
                    this.editor.dataManager.save();
                }
            }

            // 显示提示
            this.toastManager.showToast(t('saved') || '已保存', 'success');

            // 延迟刷新角色列表和输出，确保配置更新完成
            setTimeout(() => {
                this.renderCharacterList();
                this.editor.updateOutput();
            }, 50);
        });

        // 取消按钮
        cancelBtn.addEventListener('click', () => {
            this.showListView();
        });
    }

    /**
     * 为内联编辑面板设置智能补全
     */
    setupInlineAutocomplete() {
        const promptInput = document.getElementById('mce-inline-prompt-input');
        if (!promptInput) return;

        // 销毁旧实例
        if (this.inlineAutocompleteInstance) {
            this.inlineAutocompleteInstance.destroy();
            this.inlineAutocompleteInstance = null;
        }

        const currentLang = this.editor.languageManager ? this.editor.languageManager.getLanguage() : 'zh';

        // 延迟初始化
        setTimeout(() => {
            try {
                this.inlineAutocompleteInstance = new AutocompleteUI({
                    inputElement: promptInput,
                    language: currentLang,
                    maxSuggestions: 10,
                    debounceDelay: 200,
                    minQueryLength: 2,
                    customClass: 'mce-autocomplete',
                    onSelect: (tag) => {
                        console.log('[CharacterEditor] 内联编辑选择标签:', tag);
                    }
                });
                console.log('[CharacterEditor] 内联编辑智能补全初始化成功');
            } catch (error) {
                console.error('[CharacterEditor] 内联编辑智能补全初始化失败:', error);
            }
        }, 100);
    }

    // 🔧 新增：显示全局提示词编辑对话框
    showGlobalPromptDialog() {
        const t = this.editor.languageManager ? this.editor.languageManager.t.bind(this.editor.languageManager) : globalMultiLanguageManager.t.bind(globalMultiLanguageManager);
        const config = this.editor.dataManager.getConfig();
        const currentGlobalPrompt = config.global_prompt || '';

        // 🔧 确保模态框样式已加载
        this.ensureModalStyles();

        // 创建模态对话框
        const modal = document.createElement('div');
        modal.className = 'mce-edit-modal';
        modal.innerHTML = `
            <div class="mce-edit-modal-content">
                <div class="mce-edit-modal-header">
                    <h3>${t('globalPrompt') || '全局提示词'}</h3>
                    <button class="mce-modal-close" id="mce-global-close-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="mce-edit-modal-body">
                    <div class="mce-property-group">
                        <label class="mce-property-label">${t('globalPromptDescription') || '全局提示词会与基础提示词合并'}</label>
                        <div class="mce-prompt-input-container">
                            <textarea class="mce-property-input mce-property-textarea mce-autocomplete-input" id="mce-global-prompt-input"
                                      placeholder="${t('globalPromptPlaceholder') || '输入全局提示词，例如：2girls'}">${currentGlobalPrompt || ''}</textarea>
                            <div class="mce-autocomplete-suggestions"></div>
                        </div>
                    </div>
                </div>
                <div class="mce-edit-modal-footer">
                    <button class="mce-button" id="mce-global-cancel-btn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                        <span>${t('buttonTexts.cancel') || '取消'}</span>
                    </button>
                    <button class="mce-button mce-button-primary" id="mce-save-global-prompt">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span>${t('buttonTexts.save') || '保存'}</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 🔧 关键修复：为所有关闭按钮绑定事件监听器
        const closeModal = () => {
            // 清理智能补全实例
            if (this.globalAutocompleteInstance) {
                this.globalAutocompleteInstance.destroy();
                this.globalAutocompleteInstance = null;
            }
            modal.remove();
        };

        // 关闭按钮
        const closeButton = modal.querySelector('#mce-global-close-btn');
        closeButton.addEventListener('click', closeModal);

        // 取消按钮
        const cancelButton = modal.querySelector('#mce-global-cancel-btn');
        cancelButton.addEventListener('click', closeModal);

        // 保存按钮事件
        const saveButton = modal.querySelector('#mce-save-global-prompt');
        const textarea = modal.querySelector('#mce-global-prompt-input');

        saveButton.addEventListener('click', () => {
            const newGlobalPrompt = textarea.value.trim();
            this.editor.dataManager.updateConfig({ global_prompt: newGlobalPrompt });

            // 延迟刷新，确保配置更新完成
            setTimeout(() => {
                this.renderCharacterList();
                this.editor.updateOutput();
            }, 50);

            // 重新初始化智能补全
            this.setupGlobalPromptAutocomplete();

            // 更新文本区域的值，确保显示最新内容
            textarea.value = newGlobalPrompt;

            // 🔧 修复：保存成功后关闭模态框
            closeModal();
            this.showToast(t('globalPromptSaved') || '全局提示词已保存', 'success');
        });

        // 🔧 添加：点击模态框外部关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

        // 🔧 添加：ESC键关闭
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);

        // 🔧 添加智能补全功能
        this.setupGlobalPromptAutocomplete();
    }

    /**
     * 为全局提示词输入框设置智能补全
     */
    setupGlobalPromptAutocomplete() {
        const promptInput = document.getElementById('mce-global-prompt-input');
        const suggestionsContainer = document.querySelector('.mce-autocomplete-suggestions');

        if (!promptInput) return;

        // 销毁旧的智能补全实例
        if (this.globalAutocompleteInstance) {
            this.globalAutocompleteInstance.destroy();
            this.globalAutocompleteInstance = null;
        }

        // 延迟初始化，避免打开对话框时卡顿
        let isInitialized = false;

        const initAutocomplete = () => {
            if (isInitialized) return;
            isInitialized = true;

            console.log('[CharacterEditor] 开始初始化全局提示词智能补全...');

            try {
                // 获取当前语言
                const currentLang = this.editor.languageManager ? this.editor.languageManager.getLanguage() : 'zh';

                // 创建智能补全实例
                this.globalAutocompleteInstance = new AutocompleteUI({
                    inputElement: promptInput,
                    containerElement: suggestionsContainer || undefined,
                    language: currentLang,
                    maxSuggestions: 8,
                    debounceDelay: 150,
                    minQueryLength: 1,
                    customClass: 'mce-autocomplete',
                    onSelect: (tag) => {
                        console.log('[CharacterEditor] 全局提示词选择标签:', tag);
                    }
                });

                console.log('[CharacterEditor] 全局提示词智能补全初始化成功');
            } catch (error) {
                console.error('[CharacterEditor] 全局提示词智能补全初始化失败:', error);
            }
        };

        // 第一次聚焦时初始化
        promptInput.addEventListener('focus', initAutocomplete, { once: true });

        // 如果用户直接开始输入也要初始化
        promptInput.addEventListener('input', initAutocomplete, { once: true });
    }

    // 确保模态框样式已加载
    ensureModalStyles() {
        if (!document.querySelector('#mce-edit-modal-styles')) {
            const modalStyles = document.createElement('style');
            modalStyles.id = 'mce-edit-modal-styles';
            modalStyles.textContent = `
                .mce-edit-modal {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100% !important;
                    height: 100% !important;
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(5px);
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    z-index: 99999 !important;
                }
                
                .mce-edit-modal-content {
                    position: relative !important;
                    background: linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%);
                    border-radius: 12px;
                    width: 95%;
                    max-width: 800px;
                    max-height: 90vh;
                    overflow: visible;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3),
                                0 0 0 1px rgba(255, 255, 255, 0.05),
                                inset 0 1px 0 rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    margin: auto;
                }
                
                .mce-edit-modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px 24px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                    background: linear-gradient(135deg, rgba(42, 42, 62, 0.5) 0%, rgba(58, 58, 78, 0.5) 100%);
                    position: relative;
                }
                
                .mce-edit-modal-header::after {
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
                
                .mce-edit-modal-header h3 {
                    margin: 0;
                    color: #E0E0E0;
                    font-weight: 600;
                    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
                }
                
                .mce-modal-close {
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
                
                .mce-modal-close:hover {
                    background: rgba(255, 255, 255, 0.1);
                    color: #E0E0E0;
                    transform: scale(1.1);
                }
                
                .mce-edit-modal-body {
                    padding: 24px 32px;
                    overflow-y: auto;
                    overflow-x: visible;
                    flex: 1;
                    max-height: calc(90vh - 140px);
                }
                
                .mce-property-group {
                    margin-bottom: 20px;
                }
                
                .mce-property-group:last-child {
                    margin-bottom: 0;
                }
                
                .mce-property-label {
                    display: block;
                    margin-bottom: 8px;
                    color: #B0B0B0;
                    font-size: 13px;
                    font-weight: 500;
                }
                
                .mce-property-input {
                    width: 100%;
                    padding: 10px 12px;
                    background: rgba(26, 26, 38, 0.6);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 6px;
                    color: #E0E0E0;
                    font-size: 13px;
                    transition: all 0.2s ease;
                    box-sizing: border-box;
                }
                
                .mce-property-input:hover {
                    background: rgba(26, 26, 38, 0.8);
                    border-color: rgba(255, 255, 255, 0.15);
                }
                
                .mce-property-input:focus {
                    outline: none;
                    border-color: #7c3aed;
                    box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.2);
                }
                
                .mce-property-textarea {
                    resize: vertical;
                    min-height: 100px;
                    font-family: inherit;
                    line-height: 1.5;
                }
                
                .mce-property-checkbox {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: #E0E0E0;
                    font-size: 13px;
                    cursor: pointer;
                    user-select: none;
                }
                
                .mce-property-checkbox input[type="checkbox"] {
                    width: 18px;
                    height: 18px;
                    cursor: pointer;
                }
                
                .mce-property-slider {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                
                .mce-property-slider input[type="range"] {
                    flex: 1;
                    height: 6px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 3px;
                    outline: none;
                    -webkit-appearance: none;
                }
                
                .mce-property-slider input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 16px;
                    height: 16px;
                    background: #7c3aed;
                    border-radius: 50%;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                
                .mce-property-slider input[type="range"]::-webkit-slider-thumb:hover {
                    background: #8b5cf6;
                    transform: scale(1.1);
                }
                
                .mce-property-slider-value {
                    min-width: 40px;
                    text-align: center;
                    padding: 6px 12px;
                    background: rgba(124, 58, 237, 0.2);
                    border-radius: 6px;
                    color: #E0E0E0;
                    font-size: 13px;
                    font-weight: 500;
                }
                
                .mce-property-color {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                
                .mce-property-color input[type="color"] {
                    width: 60px;
                    height: 40px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 6px;
                    cursor: pointer;
                    background: transparent;
                }
                
                .mce-property-color-hex {
                    flex: 1;
                    text-transform: uppercase;
                }
                
                .mce-section {
                    margin-bottom: 24px;
                    padding-bottom: 24px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                }
                
                .mce-section:last-child {
                    margin-bottom: 0;
                    padding-bottom: 0;
                    border-bottom: none;
                }
                
                .mce-section-title {
                    font-size: 14px;
                    font-weight: 600;
                    color: #E0E0E0;
                    margin-bottom: 16px;
                    padding-left: 8px;
                    border-left: 3px solid #7c3aed;
                }
                
                .mce-edit-modal-footer {
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                    padding: 20px 24px;
                    border-top: 1px solid rgba(255, 255, 255, 0.08);
                    background: linear-gradient(135deg, rgba(42, 42, 62, 0.3) 0%, rgba(58, 58, 78, 0.3) 100%);
                }
                
                /* 智能补全样式 */
                .mce-prompt-input-group {
                    position: relative;
                }
                
                .mce-prompt-input-container {
                    position: relative;
                }
                
                .mce-autocomplete-input {
                    resize: vertical;
                    min-height: 120px;
                    font-family: inherit;
                    background: rgba(26, 26, 38, 0.6);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 6px;
                    color: #E0E0E0;
                    padding: 8px 12px;
                    transition: all 0.2s ease;
                }
                
                .mce-autocomplete-input:hover {
                    background: rgba(26, 26, 38, 0.8);
                    border-color: rgba(255, 255, 255, 0.15);
                }
                
                .mce-autocomplete-input:focus {
                    outline: none;
                    border-color: #7c3aed;
                    box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.2);
                }
                
                .mce-autocomplete-suggestions {
                    position: fixed !important;
                    max-height: 200px;
                    overflow-y: auto;
                    background: rgba(42, 42, 62, 0.95);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    border-radius: 8px;
                    z-index: 100001 !important;
                    display: none;
                    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
                }
                
                .mce-suggestion-item {
                    padding: 10px 14px;
                    cursor: pointer;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    color: #E0E0E0;
                    font-size: 12px;
                    transition: all 0.2s ease;
                }
                
                .mce-suggestion-item:last-child {
                    border-bottom: none;
                }
                
                .mce-suggestion-item:hover {
                    background: rgba(124, 58, 237, 0.2);
                }
                
                .mce-suggestion-item.selected {
                    background: rgba(124, 58, 237, 0.3);
                }
                
                .mce-suggestion-name {
                    font-weight: 500;
                }
                
                .mce-suggestion-count {
                    color: rgba(136, 136, 136, 0.8);
                    font-size: 11px;
                    margin-left: 8px;
                }
                
                /* 🔧 新增：紧凑布局样式 */
                .mce-compact-section {
                    padding: 0;
                    margin-bottom: 16px;
                    border: none;
                }
                
                .mce-name-enable-row {
                    display: flex;
                    gap: 12px;
                    align-items: center;
                }
                
                .mce-name-input-group {
                    flex: 1;
                }
                
                .mce-name-input {
                    font-size: 15px;
                    font-weight: 500;
                    padding: 12px 14px;
                }
                
                /* Toggle Switch */
                .mce-toggle-switch {
                    position: relative;
                    display: inline-block;
                    width: 48px;
                    height: 28px;
                    flex-shrink: 0;
                    cursor: pointer;
                }
                
                .mce-toggle-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                
                .mce-toggle-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(255, 255, 255, 0.1);
                    transition: 0.3s;
                    border-radius: 28px;
                    border: 1px solid rgba(255, 255, 255, 0.15);
                }
                
                .mce-toggle-slider:before {
                    position: absolute;
                    content: "";
                    height: 20px;
                    width: 20px;
                    left: 3px;
                    bottom: 3px;
                    background-color: #888;
                    transition: 0.3s;
                    border-radius: 50%;
                }
                
                .mce-toggle-switch input:checked + .mce-toggle-slider {
                    background-color: #7c3aed;
                }
                
                .mce-toggle-switch input:checked + .mce-toggle-slider:before {
                    transform: translateX(20px);
                    background-color: white;
                }
                
                /* 提示词区域 */
                .mce-prompt-section {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }
                
                .mce-prompt-section .mce-property-group {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }
                
                .mce-large-textarea {
                    min-height: 220px !important;
                    font-size: 14px !important;
                    line-height: 1.6 !important;
                    flex: 1;
                }
                
                /* 参数网格布局 */
                .mce-params-section {
                    margin-bottom: 12px;
                }
                
                .mce-params-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                }
                
                .mce-param-item {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                
                .mce-param-label {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    color: #B0B0B0;
                    font-size: 12px;
                    font-weight: 500;
                }
                
                .mce-param-label svg {
                    opacity: 0.7;
                }
                
                .mce-param-control {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }
                
                .mce-param-control input[type="range"] {
                    flex: 1;
                    height: 4px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 2px;
                    outline: none;
                    -webkit-appearance: none;
                }
                
                .mce-param-control input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 14px;
                    height: 14px;
                    background: #7c3aed;
                    border-radius: 50%;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                
                .mce-param-control input[type="range"]::-webkit-slider-thumb:hover {
                    background: #8b5cf6;
                    transform: scale(1.15);
                }
                
                .mce-param-number {
                    width: 60px !important;
                    text-align: center;
                    padding: 6px 8px !important;
                    font-size: 12px !important;
                    background: rgba(124, 58, 237, 0.15) !important;
                    border: 1px solid rgba(124, 58, 237, 0.3) !important;
                }
                
                /* 颜色选择器 */
                .mce-color-item {
                    grid-column: span 1;
                }
                
                .mce-color-picker {
                    width: 100%;
                    height: 40px;
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    border-radius: 6px;
                    cursor: pointer;
                    padding: 2px;
                    background: transparent;
                }
                
                .mce-color-picker::-webkit-color-swatch-wrapper {
                    padding: 0;
                }
                
                .mce-color-picker::-webkit-color-swatch {
                    border: none;
                    border-radius: 4px;
                }
                
                /* 语法模式切换 */
                .mce-syntax-item {
                    grid-column: span 1;
                }
                
                .mce-syntax-toggle {
                    display: flex;
                    gap: 6px;
                    background: rgba(26, 26, 38, 0.6);
                    padding: 4px;
                    border-radius: 6px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                
                .mce-syntax-btn {
                    flex: 1;
                    padding: 8px 12px;
                    background: transparent;
                    border: none;
                    border-radius: 4px;
                    color: #B0B0B0;
                    font-size: 12px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                
                .mce-syntax-btn:hover {
                    background: rgba(124, 58, 237, 0.2);
                    color: #E0E0E0;
                }
                
                .mce-syntax-btn.active {
                    background: #7c3aed;
                    color: white;
                }
            `;
            document.head.appendChild(modalStyles);
        }
    }

    showEditDialog(characterId) {
        const character = this.editor.dataManager.getCharacter(characterId);
        if (!character) return;

        // 确保模态框样式已加载
        this.ensureModalStyles();

        // 创建模态对话框
        const modal = document.createElement('div');
        modal.className = 'mce-edit-modal';
        const t = this.editor.languageManager ? this.editor.languageManager.t.bind(this.editor.languageManager) : globalMultiLanguageManager.t.bind(globalMultiLanguageManager);

        // 获取当前配置和语法模式
        const config = this.editor.dataManager.getConfig();
        const syntaxMode = config ? config.syntax_mode : 'attention_couple';
        const isRegionalMode = syntaxMode === 'regional_prompts';
        const useMaskSyntax = character.use_mask_syntax !== false; // 🔧 向后兼容字段

        modal.innerHTML = `
            <div class="mce-edit-modal-content">
                <div class="mce-edit-modal-header">
                    <h3>${t('editCharacter')}</h3>
                    <button class="mce-modal-close" id="mce-char-close-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="mce-edit-modal-body">
                    <!-- 角色名称和启用状态 -->
                    <div class="mce-section mce-compact-section">
                        <div class="mce-name-enable-row">
                            <div class="mce-name-input-group">
                                <input type="text" class="mce-property-input mce-name-input" id="mce-modal-char-name" value="${character.name}" placeholder="${t('enterCharacterName') || '输入角色名称'}">
                            </div>
                            <label class="mce-toggle-switch" title="${t('enabledCharacter')}">
                                <input type="checkbox" id="mce-modal-char-enabled" ${character.enabled ? 'checked' : ''}>
                                <span class="mce-toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    <!-- 提示词 -->
                    <div class="mce-section mce-prompt-section">
                        <div class="mce-section-title">${t('characterPrompt')}</div>
                        <div class="mce-property-group mce-prompt-input-group">
                            <div class="mce-prompt-input-container">
                                <textarea class="mce-property-input mce-property-textarea mce-large-textarea mce-autocomplete-input" id="mce-modal-char-prompt" placeholder="${t('autocomplete')}">${character.prompt}</textarea>
                                <div class="mce-autocomplete-suggestions"></div>
                            </div>
                        </div>
                    </div>

                    <!-- 参数设置 -->
                    <div class="mce-section mce-params-section">
                        <div class="mce-section-title">${t('parameters') || '参数设置'}</div>
                        
                        <div class="mce-params-grid">
                            <!-- 权重 -->
                            <div class="mce-param-item">
                                <label class="mce-param-label">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"></path>
                                    </svg>
                                    ${t('weight') || '权重'}
                                </label>
                                <div class="mce-param-control">
                                    <input type="range" min="0" max="1.0" step="0.01" value="${character.weight || 1.0}" id="mce-modal-char-weight">
                                    <input type="number" min="0" max="1.0" step="0.01" value="${character.weight || 1.0}" id="mce-modal-char-weight-input" class="mce-param-number">
                                </div>
                            </div>
                            
                            <!-- 羽化 -->
                            <div class="mce-param-item">
                                <label class="mce-param-label">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="12" cy="12" r="3"></circle>
                                        <path d="M12 1v6m0 6v6m4.22-13.22l4.24 4.24M1.54 1.54l4.24 4.24M20.46 20.46l-4.24-4.24M1.54 20.46l4.24-4.24"></path>
                                    </svg>
                                    ${t('feather') || '羽化'} (px)
                                </label>
                                <div class="mce-param-control">
                                    <input type="range" min="0" max="50" step="1" value="${character.feather || 0}" id="mce-modal-char-feather">
                                    <input type="number" min="0" max="50" step="1" value="${character.feather || 0}" id="mce-modal-char-feather-input" class="mce-param-number">
                                </div>
                            </div>
                            
                            <!-- 颜色 -->
                            <div class="mce-param-item mce-color-item">
                                <label class="mce-param-label">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="12" cy="12" r="10"></circle>
                                    </svg>
                                    ${t('color') || '颜色'}
                                </label>
                                <input type="color" id="mce-modal-char-color" value="${character.color}" class="mce-color-picker">
                            </div>
                            
                            ${isRegionalMode ? `
                            <!-- 语法模式切换 -->
                            <div class="mce-param-item mce-syntax-item">
                                <label class="mce-param-label">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="16 18 22 12 16 6"></polyline>
                                        <polyline points="8 6 2 12 8 18"></polyline>
                                    </svg>
                                    ${t('syntaxMode') || '语法模式'}
                                </label>
                                <div class="mce-syntax-toggle">
                                    <button class="mce-syntax-btn ${useMaskSyntax ? 'active' : ''}" id="mce-syntax-mask" data-syntax="mask">MASK</button>
                                    <button class="mce-syntax-btn ${!useMaskSyntax ? 'active' : ''}" id="mce-syntax-area" data-syntax="area">AREA</button>
                                </div>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
                <div class="mce-edit-modal-footer">
                    <button class="mce-button" id="mce-char-cancel-btn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                        <span>${t('buttonTexts.cancel')}</span>
                    </button>
                    <button class="mce-button mce-button-primary" id="mce-modal-save">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20,6 9,17 4,12"></polyline>
                        </svg>
                        <span>${t('buttonTexts.save')}</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 🔧 关键修复：为所有关闭按钮绑定事件监听器
        const closeModal = () => {
            // 清理智能补全实例
            if (this.autocompleteInstance) {
                this.autocompleteInstance.destroy();
                this.autocompleteInstance = null;
            }
            modal.remove();
        };

        // 关闭按钮
        const closeButton = modal.querySelector('#mce-char-close-btn');
        closeButton.addEventListener('click', closeModal);

        // 取消按钮
        const cancelButton = modal.querySelector('#mce-char-cancel-btn');
        cancelButton.addEventListener('click', closeModal);

        // 绑定保存按钮事件
        const saveBtn = modal.querySelector('#mce-modal-save');
        saveBtn.addEventListener('click', () => {
            this.saveCharacterFromModal(characterId);
            // 🔧 修复：保存成功后关闭模态框
            closeModal();
        });

        // 🔧 添加：点击模态框外部关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

        // 🔧 添加：ESC键关闭
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);

        // 绑定实时更新事件
        this.bindModalEvents(characterId);
    }

    bindModalEvents(characterId) {
        // 权重滑块和输入框同步
        const weightSlider = document.getElementById('mce-modal-char-weight');
        const weightInput = document.getElementById('mce-modal-char-weight-input');

        if (weightSlider && weightInput) {
            weightSlider.addEventListener('input', () => {
                weightInput.value = weightSlider.value;
            });

            weightInput.addEventListener('input', () => {
                const value = parseFloat(weightInput.value);
                if (!isNaN(value) && value >= 0.1 && value <= 2.0) {
                    weightSlider.value = value;
                }
            });
        }

        // 羽化滑块和输入框同步
        const featherSlider = document.getElementById('mce-modal-char-feather');
        const featherInput = document.getElementById('mce-modal-char-feather-input');

        if (featherSlider && featherInput) {
            featherSlider.addEventListener('input', () => {
                featherInput.value = featherSlider.value;
            });

            featherInput.addEventListener('input', () => {
                const value = parseFloat(featherInput.value);
                if (!isNaN(value) && value >= 0 && value <= 1.0) {
                    featherSlider.value = value;
                }
            });
        }

        // 语法模式切换按钮
        const syntaxMaskBtn = document.getElementById('mce-syntax-mask');
        const syntaxAreaBtn = document.getElementById('mce-syntax-area');

        if (syntaxMaskBtn && syntaxAreaBtn) {
            syntaxMaskBtn.addEventListener('click', () => {
                syntaxMaskBtn.classList.add('active');
                syntaxAreaBtn.classList.remove('active');
            });

            syntaxAreaBtn.addEventListener('click', () => {
                syntaxAreaBtn.classList.add('active');
                syntaxMaskBtn.classList.remove('active');
            });
        }

        // 智能补全功能
        this.setupAutocomplete(characterId);
    }

    /**
     * 🔧 优化：延迟初始化智能补全功能，避免卡顿
     * 只在用户第一次聚焦输入框时才初始化补全系统
     */
    setupAutocomplete(characterId) {
        const promptInput = document.getElementById('mce-modal-char-prompt');
        const suggestionsContainer = document.querySelector('.mce-autocomplete-suggestions');

        if (!promptInput) return;

        // 销毁旧的智能补全实例
        if (this.autocompleteInstance) {
            this.autocompleteInstance.destroy();
            this.autocompleteInstance = null;
        }

        // 🔧 关键优化：使用延迟初始化，避免打开对话框时卡顿
        let isInitialized = false;

        const initAutocomplete = () => {
            if (isInitialized) return;
            isInitialized = true;

            console.log('[CharacterEditor] 开始初始化智能补全...');

            // 获取当前语言
            const currentLang = this.editor.languageManager ? this.editor.languageManager.getLanguage() : 'zh';

            // 延迟100ms创建补全实例，让对话框先显示出来
            setTimeout(() => {
                try {
                    // 创建新的智能补全实例
                    this.autocompleteInstance = new AutocompleteUI({
                        inputElement: promptInput,
                        containerElement: suggestionsContainer || undefined,
                        language: currentLang,
                        maxSuggestions: 10,
                        debounceDelay: 200, // 增加防抖延迟，减少卡顿
                        minQueryLength: 2, // 增加最小查询长度，减少不必要的查询
                        customClass: 'mce-autocomplete',
                        onSelect: (tag) => {
                            console.log('[CharacterEditor] 选择标签:', tag);
                        }
                    });

                    console.log('[CharacterEditor] 智能补全初始化完成');
                } catch (error) {
                    console.error('[CharacterEditor] 智能补全初始化失败:', error);
                }
            }, 100);
        };

        // 🔧 关键优化：只在用户第一次聚焦或输入时才初始化
        const onFirstInteraction = () => {
            initAutocomplete();
            // 移除事件监听器，避免重复初始化
            promptInput.removeEventListener('focus', onFirstInteraction);
            promptInput.removeEventListener('input', onFirstInteraction);
        };

        promptInput.addEventListener('focus', onFirstInteraction, { once: true });
        promptInput.addEventListener('input', onFirstInteraction, { once: true });

        console.log('[CharacterEditor] 智能补全已设置为延迟加载模式');
    }

    saveCharacterFromModal(characterId) {
        const name = document.getElementById('mce-modal-char-name').value;
        const prompt = document.getElementById('mce-modal-char-prompt').value;
        const enabled = document.getElementById('mce-modal-char-enabled').checked;
        const weight = parseFloat(document.getElementById('mce-modal-char-weight').value);
        const color = document.getElementById('mce-modal-char-color').value;
        const feather = parseInt(document.getElementById('mce-modal-char-feather').value) || 0;

        // 🔧 修复：正确设置语法类型
        const config = this.editor.dataManager.getConfig();
        const syntaxMode = config.syntax_mode || 'attention_couple';

        let syntaxType;
        let useMaskSyntax = true; // 保持向后兼容

        if (syntaxMode === 'attention_couple') {
            // 注意力耦合模式：固定使用 COUPLE
            syntaxType = 'COUPLE';
            useMaskSyntax = true;
        } else if (syntaxMode === 'regional_prompts') {
            // 区域提示词模式：根据用户选择设置 REGION 或 MASK
            const syntaxMaskBtn = document.getElementById('mce-syntax-mask');
            const syntaxAreaBtn = document.getElementById('mce-syntax-area');

            if (syntaxMaskBtn && syntaxMaskBtn.classList.contains('active')) {
                syntaxType = 'MASK';
                useMaskSyntax = true;
            } else if (syntaxAreaBtn && syntaxAreaBtn.classList.contains('active')) {
                syntaxType = 'REGION'; // AREA 对应 REGION
                useMaskSyntax = false;
            } else {
                // 默认值：切换到区域提示词时默认使用MASK（符合用户要求）
                syntaxType = 'MASK';
                useMaskSyntax = true;
            }
        }

        this.editor.dataManager.updateCharacter(characterId, {
            name,
            prompt,
            enabled,
            weight,
            color,
            feather,
            use_mask_syntax: useMaskSyntax, // 保持向后兼容
            syntax_type: syntaxType  // 🔧 新增：设置正确的语法类型
        });

        this.renderCharacterList();
    }

    selectCharacter(characterId) {
        // 先清除所有选中状态
        document.querySelectorAll('.mce-character-item').forEach(item => {
            item.classList.remove('selected');
        });

        // 设置当前选中状态
        const selectedItem = document.querySelector(`[data-character-id="${characterId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
        }

        // 确保蒙版编辑器显示对应的蒙版
        const character = this.editor.dataManager.getCharacter(characterId);

        if (character && this.editor.components.maskEditor) {
            // 选择角色时，只需要确保蒙版编辑器重新渲染，而不是重复添加蒙版
            this.editor.components.maskEditor.scheduleRender();

            // 确保选中的蒙版正确设置
            const mask = this.editor.components.maskEditor.masks.find(m => m.characterId === characterId);
            if (mask) {
                this.editor.components.maskEditor.selectedMask = mask;
            }
        }
    }

    renderCharacterList() {
        // 使用防抖函数避免频繁渲染
        if (this.renderTimeout) {
            clearTimeout(this.renderTimeout);
        }

        this.renderTimeout = setTimeout(() => {
            this.renderTimeout = null;
            this.doRenderCharacterList();
        }, 16); // 约60fps的渲染频率
    }

    // 实际执行角色列表渲染的方法
    doRenderCharacterList() {
        const listContainer = document.getElementById('mce-character-list');
        // 卫兵语句：如果容器不存在，则中止执行以防止错误
        if (!listContainer) {
            console.warn("[CharacterEditor] doRenderCharacterList: 列表容器 'mce-character-list' 不存在，渲染中止。");
            return;
        }
        const characters = this.editor.dataManager.getCharacters();
        const t = this.editor.languageManager ? this.editor.languageManager.t.bind(this.editor.languageManager) : globalMultiLanguageManager.t.bind(globalMultiLanguageManager);
        const config = this.editor.dataManager.getConfig();
        const globalPrompt = config.global_prompt || '';
        const globalUseFill = config.global_use_fill || false;

        // 使用文档片段减少DOM操作，提高性能
        const fragment = document.createDocumentFragment();

        // 🔧 添加固定的全局提示词项（置顶）
        const globalItem = document.createElement('div');
        globalItem.className = 'mce-character-item mce-global-prompt-item';
        globalItem.dataset.characterId = '__global__';
        globalItem.innerHTML = `
            <div class="mce-character-item-header">
                <div class="mce-character-name">
                    <div class="mce-character-color mce-global-icon">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M12 8v8m-4-4h8"></path>
                        </svg>
                    </div>
                    <span class="mce-global-title">${t('globalPrompt') || '全局提示词'}</span>
                </div>
                <div class="mce-character-controls">
                    <button class="mce-character-control mce-fill-toggle ${globalUseFill ? 'active' : ''}" 
                            data-action="toggle-fill" data-character-id="__global__" 
                            title="${t('useFill') || 'FILL语法'}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                            <polyline points="7.5 4.21 12 6.81 16.5 4.21"></polyline>
                            <polyline points="7.5 19.79 7.5 14.6 3 12"></polyline>
                            <polyline points="21 12 16.5 14.6 16.5 19.79"></polyline>
                            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                            <line x1="12" y1="22.08" x2="12" y2="12"></line>
                        </svg>
                        <span>FILL</span>
                    </button>
                    <button class="mce-character-control" data-action="edit" data-character-id="__global__" title="${t('edit') || '编辑'}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        <span>${t('buttonTexts.edit') || '编辑'}</span>
                    </button>
                </div>
            </div>
            <div class="mce-character-prompt">${globalPrompt}</div>
            <div class="mce-character-info">
                <div class="mce-character-badge">${t('global') || '全局'}</div>
            </div>
        `;
        fragment.appendChild(globalItem);

        // 检查是否有角色
        if (characters.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'mce-empty-state';
            emptyState.innerHTML = `
                <p>${t('noCharacters')}</p>
                <p>${t('clickToAddCharacter')}</p>
            `;
            fragment.appendChild(emptyState);
            this.listElement.innerHTML = '';
            this.listElement.appendChild(fragment);
            return;
        }

        characters.forEach(character => {
            const item = document.createElement('div');
            item.className = `mce-character-item ${!character.enabled ? 'disabled' : ''}`;
            item.dataset.characterId = character.id;
            item.draggable = true;

            // 创建角色项内容
            const characterUseFill = character.use_fill || false;
            const weight = character.weight || 1.0;
            const feather = character.feather || 0;

            item.innerHTML = `
                <div class="mce-character-item-header">
                    <div class="mce-character-name">
                        <div class="mce-character-color" style="background-color: ${character.color}"></div>
                        <span>${character.name}</span>
                    </div>
                    <div class="mce-character-controls">
                        <button class="mce-character-control mce-fill-toggle ${characterUseFill ? 'active' : ''}" 
                                data-action="toggle-fill" data-character-id="${character.id}" 
                                title="${t('useFill') || 'FILL语法'}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                <polyline points="7.5 4.21 12 6.81 16.5 4.21"></polyline>
                                <polyline points="7.5 19.79 7.5 14.6 3 12"></polyline>
                                <polyline points="21 12 16.5 14.6 16.5 19.79"></polyline>
                                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                                <line x1="12" y1="22.08" x2="12" y2="12"></line>
                            </svg>
                            <span>FILL</span>
                        </button>
                        <button class="mce-character-control" data-action="toggle" data-character-id="${character.id}" title="${character.enabled ? t('disable') : t('enable')}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            <span>${character.enabled ? t('buttonTexts.disable') : t('buttonTexts.enable')}</span>
                        </button>
                        <button class="mce-character-control" data-action="edit" data-character-id="${character.id}" title="${t('edit')}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            <span>${t('buttonTexts.edit')}</span>
                        </button>
                        <button class="mce-character-control" data-action="delete" data-character-id="${character.id}" title="${t('delete')}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3,6 5,6 21,6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            <span>${t('buttonTexts.delete')}</span>
                        </button>
                    </div>
                </div>
                <div class="mce-character-prompt">${character.prompt}</div>
                <div class="mce-character-info">
                    <div class="mce-character-position">
                        #${character.position + 1}
                    </div>
                    <div class="mce-character-params">
                        <span class="mce-character-param">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"></path>
                            </svg>
                            ${t('weight') || '权重'}: ${weight.toFixed(2)}
                        </span>
                        ${feather > 0 ? `<span class="mce-character-param">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <circle cx="12" cy="12" r="3"></circle>
                                <path d="M12 1v6m0 6v6m4.22-13.22l4.24 4.24M1.54 1.54l4.24 4.24M20.46 20.46l-4.24-4.24M1.54 20.46l4.24-4.24"></path>
                            </svg>
                            ${t('feather') || '羽化'}: ${feather}px
                        </span>` : ''}
                    </div>
                    <div class="mce-character-syntax-badge">
                        ${this.getSyntaxBadge(character)}
                    </div>
                </div>
            `;

            fragment.appendChild(item);
        });

        // 一次性添加所有角色项，减少DOM操作
        this.listElement.innerHTML = '';
        this.listElement.appendChild(fragment);
    }

    // 🔧 新增：一次性绑定角色列表的事件委托（在init中调用，避免重复绑定）
    bindCharacterListEvents() {
        const container = this.listElement;
        if (!container) {
            console.warn('[CharacterEditor] bindCharacterListEvents: listElement不存在');
            return;
        }

        // 点击事件委托
        container.addEventListener('click', (e) => {
            const characterItem = e.target.closest('.mce-character-item');
            if (!characterItem) return;

            const characterId = characterItem.dataset.characterId;
            const actionButton = e.target.closest('.mce-character-control');

            if (actionButton) {
                // 🔧 关键修复：使用按钮上的characterId，支持全局提示词
                const action = actionButton.dataset.action;
                const buttonCharacterId = actionButton.dataset.characterId;

                console.log('[CharacterEditor] 按钮点击:', { action, buttonCharacterId });

                if (action === 'toggle-fill') {
                    e.stopPropagation(); // 阻止事件冒泡
                    this.toggleFillMode(buttonCharacterId);
                } else if (action === 'toggle') {
                    e.stopPropagation();
                    this.toggleCharacterEnabled(buttonCharacterId);
                } else if (action === 'edit') {
                    e.stopPropagation();
                    this.editCharacter(buttonCharacterId);
                } else if (action === 'delete') {
                    e.stopPropagation();
                    this.deleteCharacter(buttonCharacterId);
                }
            } else if (!e.target.closest('.mce-character-controls')) {
                // 🔧 修复：点击角色项时选择它（但不包括全局提示词）
                if (characterId && characterId !== '__global__') {
                    this.selectCharacter(characterId);
                }
            }
        });

        // 拖拽事件处理
        this.setupDragAndDrop(container);
    }

    // 🔧 已废弃：合并到bindCharacterListEvents中
    setupCharacterItemEvents(container, characters) {
        // 此方法已废弃，事件绑定移到bindCharacterListEvents中
    }

    // 设置拖拽功能
    setupDragAndDrop(container) {
        let draggedElement = null;
        let draggedIndex = -1;

        container.addEventListener('dragstart', (e) => {
            const characterItem = e.target.closest('.mce-character-item');
            if (!characterItem) return;

            // 🔧 防止拖拽全局提示词
            const characterId = characterItem.dataset.characterId;
            if (characterId === '__global__') {
                e.preventDefault();
                return;
            }

            // 🔧 动态获取当前角色列表
            const characters = this.editor.dataManager.getCharacters();
            draggedIndex = characters.findIndex(c => c.id === characterId);

            draggedElement = characterItem;
            characterItem.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', characterItem.innerHTML);
        });

        container.addEventListener('dragend', (e) => {
            const characterItem = e.target.closest('.mce-character-item');
            if (characterItem) {
                characterItem.classList.remove('dragging');
            }
            draggedElement = null;
            draggedIndex = -1;
        });

        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            const characterItem = e.target.closest('.mce-character-item');
            if (!characterItem || !draggedElement || draggedElement === characterItem) return;

            // 🔧 不允许拖拽到全局提示词位置
            if (characterItem.dataset.characterId === '__global__') return;

            const rect = characterItem.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;

            if (e.clientY < midpoint) {
                characterItem.style.borderTop = '2px solid #8D6E63';
                characterItem.style.borderBottom = '';
            } else {
                characterItem.style.borderBottom = '2px solid #8D6E63';
                characterItem.style.borderTop = '';
            }
        });

        container.addEventListener('dragleave', (e) => {
            const characterItem = e.target.closest('.mce-character-item');
            if (characterItem) {
                characterItem.style.borderTop = '';
                characterItem.style.borderBottom = '';
            }
        });

        container.addEventListener('drop', (e) => {
            const characterItem = e.target.closest('.mce-character-item');
            if (!characterItem) return;

            characterItem.style.borderTop = '';
            characterItem.style.borderBottom = '';

            if (!draggedElement || draggedElement === characterItem) return;

            // 🔧 不允许拖拽到全局提示词位置
            const targetId = characterItem.dataset.characterId;
            if (targetId === '__global__') return;

            // 🔧 动态获取当前角色列表
            const characters = this.editor.dataManager.getCharacters();
            const targetIndex = characters.findIndex(c => c.id === targetId);

            if (draggedIndex !== -1 && targetIndex !== -1) {
                this.editor.dataManager.reorderCharacters(draggedIndex, targetIndex);
                this.renderCharacterList();
            }
        });
    }



    clearProperties() {
        document.querySelectorAll('.mce-character-item').forEach(item => {
            item.classList.remove('selected');
        });
    }

    showLibraryModal() {
        // 防止重复创建
        if (document.querySelector(".mce-library-modal")) return;

        const modal = document.createElement("div");
        modal.className = "mce-library-modal";

        const t = this.editor.languageManager ? this.editor.languageManager.t.bind(this.editor.languageManager) : globalMultiLanguageManager.t.bind(globalMultiLanguageManager);

        modal.innerHTML = `
            <div class="mce-library-content">
                <div class="mce-library-header">
                    <h3>${t('selectFromLibrary')}</h3>
                    <div style="display: flex; gap: 8px;">
                        <button id="mce-library-refresh" class="mce-button mce-button-icon" title="${t('refresh') || '刷新'}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                            </svg>
                            <span>${t('refresh') || '刷新'}</span>
                        </button>
                        <button id="mce-library-close" class="mce-button mce-button-icon" title="${t('close') || '关闭'}">&times;</button>
                    </div>
                </div>
                <div class="mce-library-body">
                    <div class="mce-library-left-panel">
                        <div class="mce-category-header">
                            <h4>${t('category')}</h4>
                        </div>
                        <div class="mce-category-tree">
                            <!-- 分类树将在这里生成 -->
                        </div>
                    </div>
                    <div class="mce-library-right-panel">
                        <div class="mce-prompt-header">
                            <h4>${t('promptList')}</h4>
                        </div>
                        <div class="mce-prompt-list-container">
                            <!-- 提示词列表将在这里生成 -->
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 添加样式
        this.addLibraryModalStyles();

        // 绑定关闭事件
        const closeModal = () => modal.remove();
        modal.querySelector("#mce-library-close").addEventListener("click", closeModal);
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

        // 绑定刷新按钮事件
        const refreshBtn = modal.querySelector("#mce-library-refresh");
        if (refreshBtn) {
            refreshBtn.addEventListener("click", () => {
                // 显示刷新动画
                refreshBtn.style.animation = 'spin 0.5s linear';
                refreshBtn.disabled = true;

                // 显示加载提示
                const listContainer = modal.querySelector('.mce-prompt-list-container');
                if (listContainer) {
                    listContainer.innerHTML = `<div style="color: #888; text-align: center; padding: 20px;">${t('loading') || '加载中...'}</div>`;
                }

                // 强制重新加载数据
                this.loadPromptData().then(() => {
                    renderContent();
                    // 恢复按钮状态
                    refreshBtn.style.animation = '';
                    refreshBtn.disabled = false;
                    // 显示刷新成功提示
                    this.showToast(t('refreshed') || '已刷新', 'success', 2000);
                }).catch((error) => {
                    console.error('刷新词库数据失败:', error);
                    if (listContainer) {
                        listContainer.innerHTML = `<div style="color: #f44336; text-align: center; padding: 20px;">${t('loadFailed') || '加载失败'}</div>`;
                    }
                    // 恢复按钮状态
                    refreshBtn.style.animation = '';
                    refreshBtn.disabled = false;
                });
            });
        }

        // 🔧 优化：检查数据是否已加载，避免重复加载导致延迟
        const renderContent = () => {
            this.renderCategoryTree();
            // 默认选择第一个分类
            if (this.promptData && this.promptData.categories && this.promptData.categories.length > 0) {
                this.selectedCategory = this.promptData.categories[0].name;
                this.renderPromptList();
            }
        };

        // 如果数据已加载，直接渲染；否则先加载数据
        if (this.promptData && this.promptData.categories && this.promptData.categories.length > 0) {
            // 数据已加载，立即渲染
            renderContent();
        } else {
            // 数据未加载，显示加载提示
            const listContainer = modal.querySelector('.mce-prompt-list-container');
            if (listContainer) {
                listContainer.innerHTML = `<div style="color: #888; text-align: center; padding: 20px;">${t('loading') || '加载中...'}</div>`;
            }
            // 加载数据后渲染
            this.loadPromptData().then(() => {
                renderContent();
            }).catch((error) => {
                console.error('加载词库数据失败:', error);
                if (listContainer) {
                    listContainer.innerHTML = `<div style="color: #f44336; text-align: center; padding: 20px;">${t('loadFailed') || '加载失败'}</div>`;
                }
            });
        }
    }

    addLibraryModalStyles() {
        if (document.querySelector('#mce-library-modal-styles')) return;

        const style = document.createElement('style');
        style.id = 'mce-library-modal-styles';
        style.textContent = `
            .mce-library-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(5px);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            }
            
            .mce-library-content {
                width: 800px;
                height: 600px;
                background: linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3),
                            0 0 0 1px rgba(255, 255, 255, 0.05),
                            inset 0 1px 0 rgba(255, 255, 255, 0.1);
            }
            
            .mce-library-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                background: linear-gradient(135deg, rgba(42, 42, 62, 0.5) 0%, rgba(58, 58, 78, 0.5) 100%);
                position: relative;
            }
            
            .mce-library-header::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 20px;
                right: 20px;
                height: 1px;
                background: linear-gradient(90deg,
                    transparent,
                    rgba(255, 255, 255, 0.1),
                    transparent);
            }
            
            .mce-library-header h3 {
                margin: 0;
                color: #E0E0E0;
                font-weight: 600;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
            }
            
            /* 刷新按钮样式 */
            #mce-library-refresh {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 6px;
                background: rgba(124, 58, 237, 0.2);
                border: 1px solid rgba(124, 58, 237, 0.3);
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            #mce-library-refresh:hover:not(:disabled) {
                background: rgba(124, 58, 237, 0.3);
                border-color: rgba(124, 58, 237, 0.5);
                transform: translateY(-1px);
            }
            
            #mce-library-refresh:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            #mce-library-refresh svg {
                display: block;
            }
            
            .mce-library-body {
                display: flex;
                flex: 1;
                overflow: hidden;
            }
            
            .mce-library-left-panel {
                width: 30%;
                background: rgba(42, 42, 62, 0.4);
                border-right: 1px solid rgba(255, 255, 255, 0.08);
                overflow-y: auto;
            }
            
            .mce-library-right-panel {
                width: 70%;
                background: rgba(30, 30, 46, 0.3);
                overflow-y: auto;
            }
            
            .mce-category-header, .mce-prompt-header {
                padding: 14px 18px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                background: linear-gradient(135deg, rgba(42, 42, 62, 0.3) 0%, rgba(58, 58, 78, 0.3) 100%);
                position: relative;
            }
            
            .mce-category-header::after, .mce-prompt-header::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 18px;
                right: 18px;
                height: 1px;
                background: linear-gradient(90deg,
                    transparent,
                    rgba(255, 255, 255, 0.05),
                    transparent);
            }
            
            .mce-category-header h4, .mce-prompt-header h4 {
                margin: 0;
                color: #E0E0E0;
                font-weight: 600;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
            }
            
            .mce-category-tree {
                padding: 12px;
            }
            
            .mce-category-item {
                padding: 10px 14px;
                cursor: pointer;
                border-radius: 6px;
                color: rgba(224, 224, 224, 0.9);
                margin-bottom: 6px;
                transition: all 0.2s ease;
                position: relative;
            }
            
            .mce-category-item:hover {
                background: rgba(58, 58, 78, 0.5);
                transform: translateX(2px);
            }
            
            .mce-category-item.selected {
                background: rgba(124, 58, 237, 0.25);
                border-color: rgba(124, 58, 237, 0.3);
            }
            
            .mce-prompt-list-container {
                padding: 12px;
            }
            
            .mce-prompt-item {
                padding: 12px 14px;
                border-radius: 8px;
                background: rgba(42, 42, 62, 0.6);
                margin-bottom: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
                position: relative;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                backdrop-filter: blur(5px);
                border: 1px solid rgba(255, 255, 255, 0.05);
            }
            
            .mce-prompt-item:hover {
                background: rgba(58, 58, 78, 0.7);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                border-color: rgba(124, 58, 237, 0.3);
            }
            
            .mce-prompt-name {
                font-weight: 600;
                color: #E0E0E0;
                margin-bottom: 4px;
                font-size: 13px;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
            }
            
            .mce-prompt-text {
                color: rgba(224, 224, 224, 0.8);
                font-size: 12px;
                line-height: 1.5;
                overflow: hidden;
                text-overflow: ellipsis;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                word-break: break-word;
            }
        `;
        document.head.appendChild(style);
    }

    renderCategoryTree() {
        const treeContainer = document.querySelector('.mce-category-tree');
        if (!treeContainer || !this.promptData) return;

        treeContainer.innerHTML = '';

        // 构建分类树结构
        const categoryTree = this.buildCategoryTree(this.promptData.categories);
        const treeElement = this.renderCategoryTreeElement(categoryTree, treeContainer);
        treeContainer.appendChild(treeElement);
    }

    buildCategoryTree(categories) {
        const tree = [];
        const map = {};

        // 为每个分类创建节点
        categories.forEach(cat => {
            const parts = cat.name.split('/').filter(p => p.trim() !== '');
            let currentPath = '';
            parts.forEach(part => {
                const oldPath = currentPath;
                currentPath += (currentPath ? '/' : '') + part;
                if (!map[currentPath]) {
                    map[currentPath] = {
                        name: part,
                        fullName: currentPath,
                        children: [],
                        parent: oldPath || null
                    };
                }
            });
        });

        // 链接节点构建树
        Object.values(map).forEach(node => {
            if (node.parent && map[node.parent]) {
                if (!map[node.parent].children.some(child => child.fullName === node.fullName)) {
                    map[node.parent].children.push(node);
                }
            } else {
                if (!tree.some(rootNode => rootNode.fullName === node.fullName)) {
                    tree.push(node);
                }
            }
        });

        // 按字母顺序排序子节点
        const sortNodes = (nodes) => {
            nodes.sort((a, b) => a.name.localeCompare(b.name));
            nodes.forEach(node => sortNodes(node.children));
        };
        sortNodes(tree);

        return tree;
    }

    renderCategoryTreeElement(nodes, container, level = 0) {
        const ul = document.createElement('div');
        ul.style.marginLeft = level > 0 ? '16px' : '0';

        nodes.forEach(node => {
            const item = document.createElement('div');
            item.className = 'mce-category-item';
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.padding = '4px 8px';
            item.style.cursor = 'pointer';
            item.style.borderRadius = '4px';
            item.style.marginBottom = '2px';

            // 添加展开/折叠图标
            if (node.children.length > 0) {
                const toggle = document.createElement('span');
                toggle.textContent = '▶';
                toggle.style.marginRight = '6px';
                toggle.style.fontSize = '10px';
                toggle.style.transition = 'transform 0.2s';
                toggle.style.display = 'inline-block';
                toggle.style.width = '10px';
                item.appendChild(toggle);

                // 点击展开/折叠
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const childrenContainer = item.nextElementSibling;
                    if (childrenContainer && childrenContainer.classList.contains('mce-category-children')) {
                        const isHidden = childrenContainer.style.display === 'none';
                        childrenContainer.style.display = isHidden ? 'block' : 'none';
                        toggle.textContent = isHidden ? '▶' : '▼';
                        toggle.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(90deg)';
                    }
                });
            } else {
                // 为没有子节点的项目添加占位符
                const spacer = document.createElement('span');
                spacer.style.marginRight = '16px';
                spacer.style.display = 'inline-block';
                spacer.style.width = '10px';
                item.appendChild(spacer);
            }

            const name = document.createElement('span');
            name.textContent = node.name;
            name.style.flex = '1';
            item.appendChild(name);

            item.dataset.category = node.fullName;

            if (node.fullName === this.selectedCategory) {
                item.style.backgroundColor = '#0288D1';
            }

            item.addEventListener('click', () => {
                this.selectedCategory = node.fullName;
                this.renderPromptList();

                // 更新选中状态
                document.querySelectorAll('.mce-category-item').forEach(el => {
                    el.style.backgroundColor = '';
                });
                item.style.backgroundColor = '#0288D1';
            });

            item.addEventListener('mouseenter', () => {
                if (node.fullName !== this.selectedCategory) {
                    item.style.backgroundColor = '#404040';
                }
            });

            item.addEventListener('mouseleave', () => {
                if (node.fullName !== this.selectedCategory) {
                    item.style.backgroundColor = '';
                }
            });

            ul.appendChild(item);

            // 添加子节点容器
            if (node.children.length > 0) {
                const childrenContainer = document.createElement('div');
                childrenContainer.className = 'mce-category-children';
                childrenContainer.style.marginLeft = '16px';
                childrenContainer.style.display = 'none'; // 默认折叠
                const childrenElement = this.renderCategoryTreeElement(node.children, container, level + 1);
                childrenContainer.appendChild(childrenElement);
                ul.appendChild(childrenContainer);
            }
        });

        return ul;
    }

    renderPromptList() {
        const listContainer = document.querySelector('.mce-prompt-list-container');
        if (!listContainer || !this.promptData) return;

        const category = this.promptData.categories.find(c => c.name === this.selectedCategory);
        if (!category || !category.prompts) {
            const t = this.editor.languageManager ? this.editor.languageManager.t.bind(this.editor.languageManager) : globalMultiLanguageManager.t.bind(globalMultiLanguageManager);

            listContainer.innerHTML = `<div style="color: #888; text-align: center; padding: 20px;">${t('noPromptsInCategory')}</div>`;
            return;
        }

        listContainer.innerHTML = '';

        category.prompts.forEach(prompt => {
            const item = document.createElement('div');
            item.className = 'mce-prompt-item';

            const name = document.createElement('div');
            name.className = 'mce-prompt-name';
            name.textContent = prompt.alias || prompt.prompt;

            const text = document.createElement('div');
            text.className = 'mce-prompt-text';
            text.textContent = prompt.prompt;

            item.appendChild(name);
            item.appendChild(text);

            item.addEventListener('click', () => {
                this.hidePromptTooltip(); // 隐藏悬浮提示
                this.addCharacter(prompt);
                // 关闭模态框
                document.querySelector('.mce-library-modal').remove();
            });

            // 添加悬浮预览功能
            item.addEventListener('mouseenter', (e) => {
                this.showPromptTooltip(e, prompt);
            });

            item.addEventListener('mouseleave', () => {
                this.hidePromptTooltip();
            });

            listContainer.appendChild(item);
        });
    }

    showPromptTooltip(event, prompt) {
        // 隐藏现有提示框
        this.hidePromptTooltip();

        const tooltip = document.createElement('div');
        tooltip.className = 'mce-prompt-tooltip';

        let imageHTML = '';
        if (prompt.image) {
            imageHTML = `<img src="/prompt_selector/preview/${prompt.image}" alt="Preview" style="max-width: 150px; max-height: 150px; border-radius: 4px;">`;
        } else {
            const t = this.editor.languageManager ? this.editor.languageManager.t.bind(this.editor.languageManager) : globalMultiLanguageManager.t.bind(globalMultiLanguageManager);

            imageHTML = `<div style="width: 150px; height: 150px; background-color: #444; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #888;">${t('noPreview')}</div>`;
        }

        tooltip.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 8px; padding: 10px; max-width: 300px;">
                ${imageHTML}
                <div>
                    <div style="font-weight: bold; color: #E0E0E0;">${prompt.alias || prompt.prompt}</div>
                    <div style="color: #B0B0B0; font-size: 12px; margin-top: 4px;">${prompt.prompt}</div>
                </div>
            </div>
        `;

        document.body.appendChild(tooltip);

        // 定位提示框
        const rect = event.currentTarget.getBoundingClientRect();
        tooltip.style.position = 'fixed';
        tooltip.style.left = `${rect.right + 10}px`;
        tooltip.style.top = `${rect.top}px`;
        tooltip.style.zIndex = '1001';
        tooltip.style.backgroundColor = '#2a2a2a';
        tooltip.style.border = '1px solid #555';
        tooltip.style.borderRadius = '6px';
        tooltip.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';

        // 确保提示框不超出屏幕
        const tooltipRect = tooltip.getBoundingClientRect();
        if (tooltipRect.right > window.innerWidth) {
            tooltip.style.left = `${rect.left - tooltipRect.width - 10}px`;
        }
        if (tooltipRect.bottom > window.innerHeight) {
            tooltip.style.top = `${window.innerHeight - tooltipRect.height - 10}px`;
        }
    }

    hidePromptTooltip() {
        const tooltip = document.querySelector('.mce-prompt-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }

    updateUI() {
        this.renderCharacterList();
    }

    /**
     * 更新所有文本
     */
    updateTexts() {
        const t = this.editor.languageManager ? this.editor.languageManager.t.bind(this.editor.languageManager) : globalMultiLanguageManager.t.bind(globalMultiLanguageManager);

        // 更新角色编辑器标题
        const characterTitle = this.container.querySelector('.mce-character-title');
        if (characterTitle) {
            characterTitle.textContent = t('characterEditor');
        }

        // 更新添加角色按钮的提示文本和文本
        const addCharacterBtn = this.container.querySelector('#mce-add-character');
        if (addCharacterBtn) {
            addCharacterBtn.title = t('addCharacter');
            const span = addCharacterBtn.querySelector('span');
            if (span) {
                span.textContent = t('buttonTexts.addCharacter');
            }
        }

        // 更新词库按钮的提示文本和文本
        const libraryBtn = this.container.querySelector('#mce-library-button');
        if (libraryBtn) {
            libraryBtn.title = t('selectFromLibrary');
            const span = libraryBtn.querySelector('span');
            if (span) {
                span.textContent = t('buttonTexts.selectFromLibrary');
            }
        }

        // 更新空状态文本
        const emptyState = this.container.querySelector('.mce-empty-state p');
        if (emptyState) {
            emptyState.textContent = t('noCharacters');
        }

        // 更新另存为预设按钮的提示文本和文本
        const savePresetBtn = this.container.querySelector('#mce-save-as-preset');
        if (savePresetBtn) {
            savePresetBtn.title = t('saveAsPreset');
            const span = savePresetBtn.querySelector('span');
            if (span) {
                span.textContent = t('saveAsPreset');
            }
        }

        // 更新编辑模态框中的文本（如果模态框存在）
        const editModal = document.querySelector('.mce-edit-modal');
        if (editModal) {
            // 更新标题
            const title = editModal.querySelector('h3');
            if (title) {
                title.textContent = t('editCharacter');
            }

            // 更新角色名称输入框占位符
            const nameInput = editModal.querySelector('#mce-modal-char-name');
            if (nameInput) {
                nameInput.placeholder = t('characterName') || '角色名称';
            }

            // 更新启用状态标题
            const enableLabel = editModal.querySelector('.mce-toggle-switch[title]');
            if (enableLabel) {
                enableLabel.title = t('enabledCharacter');
            }

            // 更新提示词标题
            const promptTitle = editModal.querySelector('.mce-prompt-section .mce-section-title');
            if (promptTitle) {
                promptTitle.textContent = t('characterPrompt');
            }

            // 更新提示词输入框占位符
            const promptInput = editModal.querySelector('#mce-modal-char-prompt');
            if (promptInput) {
                promptInput.placeholder = t('autocomplete');
            }

            // 更新参数设置标题
            const paramsTitle = editModal.querySelector('.mce-params-section .mce-section-title');
            if (paramsTitle) {
                paramsTitle.textContent = t('parameters') || '参数设置';
            }

            // 更新权重标签
            const weightLabel = editModal.querySelector('.mce-param-label:has(svg)');
            if (weightLabel && weightLabel.textContent.includes('权重')) {
                weightLabel.innerHTML = weightLabel.innerHTML.replace(/权重/, t('weight') || '权重');
            }

            // 更新羽化标签
            const featherLabel = editModal.querySelector('.mce-param-label:has(svg)');
            if (featherLabel && featherLabel.textContent.includes('羽化')) {
                featherLabel.innerHTML = featherLabel.innerHTML.replace(/羽化/, t('feather') || '羽化');
            }

            // 更新颜色标签
            const colorLabel = editModal.querySelector('.mce-param-label:has(svg)');
            if (colorLabel && colorLabel.textContent.includes('颜色')) {
                colorLabel.innerHTML = colorLabel.innerHTML.replace(/颜色/, t('color') || '颜色');
            }

            // 更新语法模式标签
            const syntaxLabel = editModal.querySelector('.mce-param-label:has(svg)');
            if (syntaxLabel && syntaxLabel.textContent.includes('语法模式')) {
                syntaxLabel.innerHTML = syntaxLabel.innerHTML.replace(/语法模式/, t('syntaxMode') || '语法模式');
            }

            // 更新按钮文本
            const cancelBtn = editModal.querySelector('#mce-char-cancel-btn span');
            if (cancelBtn) {
                cancelBtn.textContent = t('buttonTexts.cancel');
            }

            const saveBtn = editModal.querySelector('#mce-modal-save span');
            if (saveBtn) {
                saveBtn.textContent = t('buttonTexts.save');
            }
        }

        // 重新渲染角色列表
        this.renderCharacterList();
    }

    /**
     * 显示弹出提示
     * @param {string} message - 提示消息
     * @param {string} type - 提示类型 (success, error, warning, info)
     * @param {number} duration - 显示时长（毫秒）
     */
    showToast(message, type = 'info', duration = 3000) {
        // 使用统一的弹出提示管理系统
        const nodeContainer = this.editor.container;

        try {
            this.toastManager.showToast(message, type, duration, { nodeContainer });
        } catch (error) {
            console.error('[CharacterEditor] 显示提示失败:', error);
            // 回退到不传递节点容器的方式
            try {
                this.toastManager.showToast(message, type, duration, {});
            } catch (fallbackError) {
                console.error('[CharacterEditor] 回退方式也失败:', fallbackError);
                // 最后的保险措施：使用浏览器原生alert
                alert(`${type.toUpperCase()}: ${message}`);
            }
        }
    }

    /**
     * 获取角色语法标签
     */
    getSyntaxBadge(character) {
        const config = this.editor.dataManager.getConfig();
        const syntaxMode = config.syntax_mode || 'attention_couple';

        let syntaxText = '';
        if (syntaxMode === 'attention_couple') {
            // 注意力耦合模式：固定显示 COUPLE
            syntaxText = 'COUPLE';
        } else if (syntaxMode === 'regional_prompts') {
            // 区域提示词模式：根据角色的语法类型显示 AREA 或 MASK
            const syntaxType = character.syntax_type || 'REGION';
            syntaxText = syntaxType === 'MASK' ? 'MASK' : 'AREA'; // 显示为 AREA 保持界面一致性
        }

        return `<span class="mce-syntax-tag">${syntaxText}</span>`;
    }

    // 🔧 新增：选择角色
    selectCharacter(characterId) {
        // 如果点击的是当前选中的角色，取消选择
        if (this.selectedCharacterId === characterId) {
            this.deselectCharacter();
            return;
        }

        this.selectedCharacterId = characterId;
        this.updateCharacterSelection();

        // 通知编辑器，以便同步选择蒙版
        if (this.editor.eventBus) {
            this.editor.eventBus.emit('character:selected', characterId);
        }
    }

    // 🔧 新增：取消选择角色
    deselectCharacter() {
        this.selectedCharacterId = null;
        this.updateCharacterSelection();

        // 通知编辑器
        if (this.editor.eventBus) {
            this.editor.eventBus.emit('character:deselected');
        }
    }

    // 🔧 新增：更新角色选择状态的视觉效果
    updateCharacterSelection() {
        const allItems = this.listElement.querySelectorAll('.mce-character-item');
        allItems.forEach(item => {
            const characterId = item.dataset.characterId;
            if (characterId === this.selectedCharacterId) {
                item.style.border = '2px solid #8D6E63';
                item.style.background = 'rgba(141, 110, 99, 0.2)';
            } else {
                item.style.border = '1px solid rgba(255, 255, 255, 0.08)';
                item.style.background = 'rgba(42, 42, 62, 0.6)';
            }
        });
    }
}

// 注意：防抖函数已在 multi_character_editor.js 中定义，这里不再重复定义

// 导出到全局作用域
window.characterEditor = null;
window.CharacterEditor = CharacterEditor;