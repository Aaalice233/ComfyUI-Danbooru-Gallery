// 角色编辑器组件
import { globalAutocompleteCache } from "./autocomplete_cache.js";
import { globalToastManager as toastManagerProxy } from "./toast_manager.js";
import { globalMultiLanguageManager } from "./multi_language.js";

class CharacterEditor {
    constructor(editor) {
        this.editor = editor;
        this.container = editor.container.querySelector('.mce-character-editor');
        this.characters = [];
        this.draggedElement = null;
        this.selectedCharacterId = null; // 🔧 新增：记录当前选中的角色ID
        this.toastManager = toastManagerProxy; // 🔧 添加toast管理器引用
        this.init();
    }

    init() {
        this.createLayout();
        this.bindEvents();
        this.loadPromptData();

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
            <div class="mce-character-list" id="mce-character-list">
                <!-- 角色列表将在这里动态生成 -->
            </div>
        `;

        this.addStyles();
        this.listElement = this.container.querySelector('#mce-character-list');
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .mce-character-editor {
                width: 420px;
                min-width: 420px;
                max-width: 500px;
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
            
            .mce-character-item::before {
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
            
            .mce-character-item:hover {
                background: rgba(58, 58, 78, 0.7);
                border-color: rgba(124, 58, 237, 0.3);
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
            
            .mce-character-item:hover::before {
                opacity: 1;
            }
            
            .mce-character-item.selected {
                background: linear-gradient(135deg, rgba(124, 58, 237, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%);
                border-color: rgba(124, 58, 237, 0.5);
                box-shadow: 0 4px 12px rgba(124, 58, 237, 0.2);
            }
            
            .mce-character-item.selected::before {
                opacity: 1;
                background: linear-gradient(90deg, transparent, rgba(124, 58, 237, 0.8), transparent);
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
                justify-content: space-between;
                align-items: center;
                font-size: 11px;
                color: rgba(136, 136, 136, 0.8);
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

        // 绑定事件 - 使用setTimeout确保按钮已添加到DOM
        setTimeout(() => {
            const confirmBtn = document.getElementById('mce-confirm-delete');
            const cancelBtn = document.getElementById('mce-cancel-delete');

            if (confirmBtn) {
                confirmBtn.addEventListener('click', handleConfirm);
            }

            if (cancelBtn) {
                cancelBtn.addEventListener('click', closeModal);
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

    editCharacter(characterId) {
        this.showEditDialog(characterId);
    }

    showEditDialog(characterId) {
        const character = this.editor.dataManager.getCharacter(characterId);
        if (!character) return;

        // 创建模态对话框
        const modal = document.createElement('div');
        modal.className = 'mce-edit-modal';
        const t = this.editor.languageManager ? this.editor.languageManager.t.bind(this.editor.languageManager) : globalMultiLanguageManager.t.bind(globalMultiLanguageManager);

        modal.innerHTML = `
            <div class="mce-edit-modal-content">
                <div class="mce-edit-modal-header">
                    <h3>${t('editCharacter')}</h3>
                    <button class="mce-modal-close" onclick="this.closest('.mce-edit-modal').remove()">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="mce-edit-modal-body">
                    <div class="mce-property-group">
                        <label class="mce-property-label">${t('characterName')}</label>
                        <input type="text" class="mce-property-input" id="mce-modal-char-name" value="${character.name}">
                    </div>
                   
                    <div class="mce-property-group mce-prompt-input-group">
                        <label class="mce-property-label">${t('characterPrompt')}</label>
                        <div class="mce-prompt-input-container">
                            <textarea class="mce-property-input mce-property-textarea mce-autocomplete-input" id="mce-modal-char-prompt" placeholder="${t('autocomplete')}">${character.prompt}</textarea>
                            <div class="mce-autocomplete-suggestions"></div>
                        </div>
                    </div>
                   
                    <div class="mce-property-group">
                        <label class="mce-property-checkbox">
                            <input type="checkbox" id="mce-modal-char-enabled" ${character.enabled ? 'checked' : ''}>
                            ${t('enabledCharacter')}
                        </label>
                    </div>
                   
                   
                    <div class="mce-property-group">
                        <label class="mce-property-label">${t('characterWeight')}</label>
                        <div class="mce-property-slider">
                            <input type="range" min="0.1" max="2.0" step="0.1" value="${character.weight}" id="mce-modal-char-weight">
                            <span class="mce-property-slider-value">${character.weight}</span>
                        </div>
                    </div>
                   
                    <div class="mce-property-group">
                        <label class="mce-property-label">${t('color')}</label>
                        <div class="mce-property-color">
                            <input type="color" id="mce-modal-char-color" value="${character.color}">
                            <input type="text" class="mce-property-input mce-property-color-hex" id="mce-modal-char-color-hex" value="${character.color}">
                        </div>
                    </div>
                </div>
                <div class="mce-edit-modal-footer">
                    <button class="mce-button" onclick="this.closest('.mce-edit-modal').remove()">
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

        // 添加样式
        if (!document.querySelector('#mce-edit-modal-styles')) {
            const modalStyles = document.createElement('style');
            modalStyles.id = 'mce-edit-modal-styles';
            modalStyles.textContent = `
                .mce-edit-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(5px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                
                .mce-edit-modal-content {
                    background: linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%);
                    border-radius: 12px;
                    width: 90%;
                    max-width: 500px;
                    max-height: 80vh;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3),
                                0 0 0 1px rgba(255, 255, 255, 0.05),
                                inset 0 1px 0 rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.1);
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
                    padding: 24px;
                    overflow-y: auto;
                    flex: 1;
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
                    min-height: 80px;
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
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    max-height: 200px;
                    overflow-y: auto;
                    background: rgba(42, 42, 62, 0.9);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-top: none;
                    border-radius: 0 0 8px 8px;
                    z-index: 1001;
                    display: none;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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
            `;
            document.head.appendChild(modalStyles);
        }

        document.body.appendChild(modal);

        // 绑定保存按钮事件
        const saveBtn = modal.querySelector('#mce-modal-save');
        saveBtn.addEventListener('click', () => {
            this.saveCharacterFromModal(characterId);
            modal.remove();
        });

        // 绑定实时更新事件
        this.bindModalEvents(characterId);
    }

    bindModalEvents(characterId) {
        // 颜色同步
        const colorInput = document.getElementById('mce-modal-char-color');
        const colorHex = document.getElementById('mce-modal-char-color-hex');

        colorInput.addEventListener('input', () => {
            colorHex.value = colorInput.value;
        });

        colorHex.addEventListener('input', () => {
            const color = colorHex.value;
            if (/^#[0-9A-F]{6}$/i.test(color)) {
                colorInput.value = color;
            }
        });

        // 权重滑块同步
        const weightSlider = document.getElementById('mce-modal-char-weight');
        const weightValue = document.querySelector('.mce-property-slider-value');

        weightSlider.addEventListener('input', () => {
            weightValue.textContent = weightSlider.value;
        });

        // 智能补全功能
        this.setupAutocomplete(characterId);
    }

    /**
     * 设置智能补全功能
     */
    setupAutocomplete(characterId) {
        const promptInput = document.getElementById('mce-modal-char-prompt');
        const suggestionsContainer = document.querySelector('.mce-autocomplete-suggestions');

        if (!promptInput || !suggestionsContainer) return;

        // 获取当前语言
        const currentLang = this.editor.languageManager ? this.editor.languageManager.getLanguage() : 'zh';

        // 设置缓存系统的语言
        if (typeof globalAutocompleteCache !== 'undefined') {
            globalAutocompleteCache.setLanguage(currentLang);
        }

        let debounceTimer;
        let selectedSuggestionIndex = -1;

        // 输入事件处理
        promptInput.addEventListener('input', async () => {
            clearTimeout(debounceTimer);

            const query = promptInput.value.trim();
            const lastWord = query.split(/[\s,]+/).pop();

            if (lastWord.length < 2) {
                suggestionsContainer.style.display = 'none';
                return;
            }

            debounceTimer = setTimeout(async () => {
                try {
                    // 检测是否包含中文字符
                    const containsChinese = /[\u4e00-\u9fff]/.test(lastWord);

                    let suggestions = [];

                    if (containsChinese && typeof globalAutocompleteCache !== 'undefined') {
                        // 中文搜索
                        suggestions = await globalAutocompleteCache.getChineseSearchSuggestions(lastWord, { limit: 10 });

                        suggestionsContainer.innerHTML = '';
                        if (suggestions.length > 0) {
                            suggestions.forEach((result, index) => {
                                const item = document.createElement('div');
                                item.className = 'mce-suggestion-item';
                                item.innerHTML = `
                                    <span class="mce-suggestion-name">${result.chinese}</span>
                                    <span class="mce-suggestion-name">[${result.english}]</span>
                                `;

                                item.addEventListener('click', () => {
                                    // 替换最后一个词
                                    const words = promptInput.value.split(/[\s,]+/);
                                    words[words.length - 1] = result.english;
                                    promptInput.value = words.join(' ');
                                    suggestionsContainer.style.display = 'none';
                                    promptInput.focus();
                                });

                                suggestionsContainer.appendChild(item);
                            });
                            suggestionsContainer.style.display = 'block';
                        } else {
                            suggestionsContainer.style.display = 'none';
                        }
                    } else if (typeof globalAutocompleteCache !== 'undefined') {
                        // 英文自动补全
                        suggestions = await globalAutocompleteCache.getAutocompleteSuggestions(lastWord, { limit: 10 });

                        suggestionsContainer.innerHTML = '';
                        if (suggestions.length > 0) {
                            suggestions.forEach((tag, index) => {
                                const item = document.createElement('div');
                                item.className = 'mce-suggestion-item';
                                item.innerHTML = `
                                    <span class="mce-suggestion-name">${tag.name}</span>
                                    ${tag.post_count ? `<span class="mce-suggestion-count">${tag.post_count}</span>` : ''}
                                `;

                                item.addEventListener('click', () => {
                                    // 替换最后一个词
                                    const words = promptInput.value.split(/[\s,]+/);
                                    words[words.length - 1] = tag.name;
                                    promptInput.value = words.join(' ');
                                    suggestionsContainer.style.display = 'none';
                                    promptInput.focus();
                                });

                                suggestionsContainer.appendChild(item);
                            });
                            suggestionsContainer.style.display = 'block';
                        } else {
                            suggestionsContainer.style.display = 'none';
                        }
                    }

                    selectedSuggestionIndex = -1;

                } catch (error) {
                    console.error('[CharacterEditor] 获取智能补全建议失败:', error);
                    suggestionsContainer.style.display = 'none';
                }
            }, 250);
        });

        // 键盘事件处理
        promptInput.addEventListener('keydown', (e) => {
            const items = suggestionsContainer.querySelectorAll('.mce-suggestion-item');

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (items.length > 0) {
                    selectedSuggestionIndex = (selectedSuggestionIndex + 1) % items.length;
                    updateSelectedSuggestion(items, selectedSuggestionIndex);
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (items.length > 0) {
                    selectedSuggestionIndex = (selectedSuggestionIndex - 1 + items.length) % items.length;
                    updateSelectedSuggestion(items, selectedSuggestionIndex);
                }
            } else if (e.key === 'Enter') {
                if (selectedSuggestionIndex >= 0 && items[selectedSuggestionIndex]) {
                    e.preventDefault();
                    items[selectedSuggestionIndex].click();
                }
            } else if (e.key === 'Escape') {
                suggestionsContainer.style.display = 'none';
                selectedSuggestionIndex = -1;
            }
        });

        // 点击外部隐藏建议
        document.addEventListener('click', (e) => {
            if (!promptInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
                suggestionsContainer.style.display = 'none';
                selectedSuggestionIndex = -1;
            }
        });

        // 更新选中建议的函数
        function updateSelectedSuggestion(items, selectedIndex) {
            items.forEach((item, index) => {
                if (index === selectedIndex) {
                    item.classList.add('selected');
                } else {
                    item.classList.remove('selected');
                }
            });
        }
    }

    saveCharacterFromModal(characterId) {
        const name = document.getElementById('mce-modal-char-name').value;
        const prompt = document.getElementById('mce-modal-char-prompt').value;
        const enabled = document.getElementById('mce-modal-char-enabled').checked;
        const weight = parseFloat(document.getElementById('mce-modal-char-weight').value);
        const color = document.getElementById('mce-modal-char-color').value;

        this.editor.dataManager.updateCharacter(characterId, {
            name,
            prompt,
            enabled,
            weight,
            color
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

        if (characters.length === 0) {
            this.listElement.innerHTML = `
                <div class="mce-empty-state">
                    <p>${t('noCharacters')}</p>
                    <p>${t('clickToAddCharacter')}</p>
                </div>
            `;
            return;
        }

        // 使用文档片段减少DOM操作，提高性能
        const fragment = document.createDocumentFragment();

        characters.forEach(character => {
            const item = document.createElement('div');
            item.className = `mce-character-item ${!character.enabled ? 'disabled' : ''}`;
            item.dataset.characterId = character.id;
            item.draggable = true;

            // 创建角色项内容
            item.innerHTML = `
                <div class="mce-character-item-header">
                    <div class="mce-character-name">
                        <div class="mce-character-color" style="background-color: ${character.color}"></div>
                        <span>${character.name}</span>
                    </div>
                    <div class="mce-character-controls">
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
                </div>
            `;

            fragment.appendChild(item);
        });

        // 一次性添加所有角色项，减少DOM操作
        this.listElement.innerHTML = '';
        this.listElement.appendChild(fragment);

        // 使用事件委托处理所有角色项事件，提高性能
        this.setupCharacterItemEvents(listContainer, characters);
    }

    // 设置角色项事件处理
    setupCharacterItemEvents(container, characters) {
        container.addEventListener('click', (e) => {
            const characterItem = e.target.closest('.mce-character-item');
            if (!characterItem) return;

            const characterId = characterItem.dataset.characterId;
            const actionButton = e.target.closest('.mce-character-control');

            if (actionButton) {
                const action = actionButton.dataset.action;
                const buttonCharacterId = actionButton.dataset.characterId;

                if (action === 'toggle') {
                    this.toggleCharacterEnabled(buttonCharacterId);
                } else if (action === 'edit') {
                    this.editCharacter(buttonCharacterId);
                } else if (action === 'delete') {
                    this.deleteCharacter(buttonCharacterId);
                }
            } else if (!e.target.closest('.mce-character-controls')) {
                // 🔧 修复：点击角色时选择它
                this.selectCharacter(characterId);
            }
        });

        // 拖拽事件处理
        this.setupDragAndDrop(container, characters);
    }

    // 设置拖拽功能
    setupDragAndDrop(container, characters) {
        let draggedElement = null;
        let draggedIndex = -1;

        container.addEventListener('dragstart', (e) => {
            const characterItem = e.target.closest('.mce-character-item');
            if (!characterItem) return;

            const characterId = characterItem.dataset.characterId;
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

            const targetId = characterItem.dataset.characterId;
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
            
            .mce-category-item::before {
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
            
            .mce-category-item:hover {
                background: rgba(58, 58, 78, 0.5);
                transform: translateX(2px);
            }
            
            .mce-category-item:hover::before {
                opacity: 1;
            }
            
            .mce-category-item.selected {
                background: linear-gradient(135deg, rgba(124, 58, 237, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%);
                border-color: rgba(124, 58, 237, 0.3);
            }
            
            .mce-category-item.selected::before {
                opacity: 1;
                background: linear-gradient(90deg, transparent, rgba(124, 58, 237, 0.8), transparent);
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
            
            .mce-prompt-item::before {
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
            
            .mce-prompt-item:hover {
                background: rgba(58, 58, 78, 0.7);
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                border-color: rgba(124, 58, 237, 0.3);
            }
            
            .mce-prompt-item:hover::before {
                opacity: 1;
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