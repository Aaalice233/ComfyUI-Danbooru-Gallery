/**
 * 预设管理器
 * Preset Manager
 */

import { globalMultiLanguageManager } from '../global/multi_language.js';
import { globalToastManager as toastManagerProxy } from '../global/toast_manager.js';
import { AutocompleteUI } from '../global/autocomplete_ui.js';

class PresetManager {
    constructor(editor) {
        this.editor = editor;
        // 如果有主编辑器的languageManager（带命名空间包装器），使用它
        // 否则创建自己的包装器
        if (editor.languageManager) {
            this.languageManager = editor.languageManager;
        } else {
            this.languageManager = {
                t: (key) => globalMultiLanguageManager.t(`mce.${key}`),
                setLanguage: (lang) => globalMultiLanguageManager.setLanguage(lang),
                getLanguage: () => globalMultiLanguageManager.getLanguage(),
                showMessage: (msg, type) => globalMultiLanguageManager.showMessage(msg, type),
                updateInterfaceTexts: () => globalMultiLanguageManager.updateInterfaceTexts()
            };
        }
        this.toastManager = toastManagerProxy;
        this.presets = [];

        this.init();
    }

    init() {
        this.loadPresets();
    }

    /**
     * 加载所有预设
     */
    async loadPresets() {
        try {
            const response = await fetch('/multi_character_editor/presets/list');
            const data = await response.json();

            if (data.success) {
                this.presets = data.presets;
            } else {
                console.error('加载预设失败:', data.error);
            }
        } catch (error) {
            console.error('加载预设失败:', error);
        }
    }

    /**
     * 显示预设管理面板
     */
    showPresetManagementPanel() {
        // 创建模态框
        const modal = this.createModal();
        const t = this.languageManager.t;

        modal.innerHTML = `
            <div class="mce-preset-modal-overlay" id="preset-modal-overlay">
                <div class="mce-preset-modal-container">
                    <div class="mce-preset-modal-header">
                        <h2 class="mce-preset-modal-title">${t('presetManagement')}</h2>
                        <button class="mce-preset-modal-close" id="preset-modal-close">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div class="mce-preset-modal-body">
                        <div class="mce-preset-list" id="preset-list-container">
                            ${this.renderPresetList()}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.addModalStyles();
        this.bindPresetManagementEvents();

        // 关闭按钮事件
        document.getElementById('preset-modal-close').addEventListener('click', () => {
            this.closeModal();
        });

        // 点击遮罩关闭
        document.getElementById('preset-modal-overlay').addEventListener('click', (e) => {
            if (e.target.id === 'preset-modal-overlay') {
                this.closeModal();
            }
        });
    }

    /**
     * 渲染预设列表
     */
    renderPresetList() {
        const t = this.languageManager.t;

        if (this.presets.length === 0) {
            return `
                <div class="mce-preset-empty">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3">
                        <rect x="3" y="3" width="7" height="7"></rect>
                        <rect x="14" y="3" width="7" height="7"></rect>
                        <rect x="14" y="14" width="7" height="7"></rect>
                        <rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                    <p>${t('noPresets')}</p>
                    <span class="mce-preset-empty-hint">${t('clickToAddPreset')}</span>
                </div>
            `;
        }

        return this.presets.map(preset => `
            <div class="mce-preset-item" data-preset-id="${preset.id}">
                <div class="mce-preset-item-preview">
                    ${preset.preview_image
                ? `<img src="${preset.preview_image}" alt="${preset.name}" class="mce-preset-preview-img" />`
                : `<div class="mce-preset-no-preview">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21 15 16 10 5 21"></polyline>
                            </svg>
                        </div>`
            }
                </div>
                <div class="mce-preset-item-info">
                    <h3 class="mce-preset-item-name">${this.escapeHtml(preset.name)}</h3>
                    <p class="mce-preset-item-chars">${preset.characters.length} ${t('characterEditor')}</p>
                    <div class="mce-preset-item-prompt" title="${this.getPresetPromptPreview(preset)}">
                        ${this.getPresetPromptPreview(preset)}
                    </div>
                </div>
                <div class="mce-preset-item-actions">
                    <button class="mce-preset-action-btn mce-preset-edit-btn" data-preset-id="${preset.id}" title="${t('edit')}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        ${t('edit')}
                    </button>
                    <button class="mce-preset-action-btn mce-preset-delete-btn" data-preset-id="${preset.id}" title="${t('delete')}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        ${t('delete')}
                    </button>
                    <button class="mce-preset-action-btn mce-preset-apply-btn" data-preset-id="${preset.id}" title="${t('apply')}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <polyline points="19 12 12 19 5 12"></polyline>
                        </svg>
                        ${t('apply')}
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * 获取角色预览（用于保存预设时显示）
     */
    getCharactersPreview(config) {
        if ((!config.characters || config.characters.length === 0) && !config.global_prompt) {
            return `<div class="mce-preset-empty">${this.languageManager.t('noCharacters')}</div>`;
        }

        let content = '';

        // 显示全局提示词（如果有）
        if (config.global_prompt) {
            const globalPreview = config.global_prompt.length > 60 ? config.global_prompt.substring(0, 60) + '...' : config.global_prompt;
            content += `
                <div class="mce-preset-char-item mce-global-preview">
                    <span class="mce-preset-char-status">🌐</span>
                    <span class="mce-preset-char-name">${this.languageManager.t('globalPrompt') || '全局提示词'}</span>
                    <span class="mce-preset-char-prompt">${globalPreview}</span>
                </div>
            `;
        }

        // 显示角色列表（如果有）
        if (config.characters && config.characters.length > 0) {
            const charList = config.characters
                .map((char, index) => {
                    const name = char.name || `角色 ${index + 1}`;
                    const prompt = char.prompt || '';
                    const preview = prompt.length > 60 ? prompt.substring(0, 60) + '...' : prompt;
                    const status = char.enabled ? '✓' : '✗';
                    return `
                        <div class="mce-preset-char-item" style="opacity: ${char.enabled ? 1 : 0.5}">
                            <span class="mce-preset-char-status">${status}</span>
                            <span class="mce-preset-char-name">${name}</span>
                            <span class="mce-preset-char-prompt">${preview || '(无提示词)'}</span>
                        </div>
                    `;
                })
                .join('');

            if (content) content += '<div class="mce-preset-separator"></div>';
            content += charList;
        }

        return `
            <div class="mce-preset-chars-list">
                ${content}
            </div>
        `;
    }

    /**
     * 渲染预设角色列表
     */
    renderPresetCharacterList(preset) {
        if (!preset.characters || preset.characters.length === 0) {
            return `<div class="mce-preset-empty">${this.languageManager.t('noCharacters')}</div>`;
        }

        const charList = preset.characters
            .map((char, index) => {
                const name = char.name || `角色 ${index + 1}`;
                const prompt = char.prompt || '';
                const preview = prompt.length > 60 ? prompt.substring(0, 60) + '...' : prompt;
                const status = char.enabled ? '✓' : '✗';
                const statusClass = char.enabled ? '' : 'status-disabled';
                const isActive = index === 0 ? 'active' : ''; // 默认第一个角色激活
                return `
                    <div class="mce-edit-preset-char-item ${isActive}" data-character-id="${index}">
                        <div class="mce-edit-preset-char-header">
                            <span class="mce-edit-preset-char-status ${statusClass}">${status}</span>
                            <span class="mce-edit-preset-char-name">${name}</span>
                        </div>
                        <div class="mce-edit-preset-char-prompt">${preview || '(无提示词)'}</div>
                    </div>
                `;
            })
            .join('');

        return `
            <div class="mce-edit-preset-chars-list">
                ${charList}
            </div>
        `;
    }

    /**
     * 渲染预设角色编辑表单
     */
    renderPresetCharacterEditForm(preset, characterIndex) {
        if (!preset.characters || !preset.characters[characterIndex]) {
            return '';
        }

        const character = preset.characters[characterIndex];
        const t = this.languageManager.t;

        return `
            <div class="mce-edit-preset-form">
                <div class="mce-form-group">
                    <label class="mce-form-label">${t('buttonTexts.note') || '备注'}</label>
                    <textarea
                        id="edit-character-note"
                        class="mce-form-input mce-edit-character-textarea"
                        placeholder="${t('buttonTexts.notePlaceholder') || '输入角色备注...'}"
                        rows="3">${character.name || ''}</textarea>
                </div>
                <div class="mce-form-group">
                    <label class="mce-form-label">${t('buttonTexts.prompt') || '提示词'}</label>
                    <textarea
                        id="edit-character-prompt"
                        class="mce-form-input mce-edit-character-textarea mce-autocomplete-input"
                        placeholder="${t('buttonTexts.promptPlaceholder') || '输入提示词...'}"
                        rows="13">${character.prompt || ''}</textarea>
                </div>
            </div>
        `;
    }

    /**
     * 获取角色提示词文本（用于编辑预设时显示）
     */
    getCharactersPromptText(preset) {
        if (!preset.characters || preset.characters.length === 0) {
            return '';
        }

        return preset.characters
            .map((char, index) => {
                const name = char.name || `角色${index + 1}`;
                const prompt = char.prompt || '';
                const status = char.enabled ? '' : '[禁用] ';
                return `${status}${name}: ${prompt}`;
            })
            .join('\n\n');
    }

    /**
     * 获取预设提示词预览
     */
    getPresetPromptPreview(preset) {
        if (!preset.characters || preset.characters.length === 0) {
            return this.languageManager.t('promptEmpty');
        }

        const prompts = preset.characters
            .filter(char => char.enabled && char.prompt)
            .map(char => char.prompt.substring(0, 50))
            .join(', ');

        return prompts.length > 100 ? prompts.substring(0, 100) + '...' : prompts;
    }

    /**
     * 绑定预设管理面板事件
     */
    bindPresetManagementEvents() {
        // 编辑按钮
        document.querySelectorAll('.mce-preset-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const presetId = btn.dataset.presetId;
                this.showEditPresetPanel(presetId);
            });
        });

        // 删除按钮
        document.querySelectorAll('.mce-preset-delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const presetId = btn.dataset.presetId;
                await this.deletePreset(presetId);
            });
        });

        // 应用按钮
        document.querySelectorAll('.mce-preset-apply-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const presetId = btn.dataset.presetId;
                this.applyPreset(presetId);
            });
        });

        // 预设项悬浮效果
        document.querySelectorAll('.mce-preset-item').forEach(item => {
            item.addEventListener('mouseenter', () => {
                const presetId = item.dataset.presetId;
                const preset = this.presets.find(p => p.id === presetId);
                if (preset) {
                    this.showPresetTooltip(item, preset);
                }
            });

            item.addEventListener('mouseleave', () => {
                this.hidePresetTooltip();
            });
        });
    }

    /**
     * 显示另存为预设面板
     */
    showSaveAsPresetPanel() {
        const modal = this.createModal();
        const t = this.languageManager.t;

        // 获取当前角色配置
        const config = this.editor.dataManager.getConfig();

        modal.innerHTML = `
            <div class="mce-preset-modal-overlay" id="save-preset-modal-overlay">
                <div class="mce-preset-modal-container mce-save-preset-container">
                    <div class="mce-preset-modal-header">
                        <h2 class="mce-preset-modal-title">${t('saveAsPreset')}</h2>
                        <button class="mce-preset-modal-close" id="save-preset-modal-close">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div class="mce-preset-modal-body mce-save-preset-body">
                        <div class="mce-save-preset-left">
                            <div class="mce-form-group">
                                <label class="mce-form-label">${t('presetName')}</label>
                                <input type="text" 
                                       id="preset-name-input" 
                                       class="mce-form-input" 
                                       placeholder="${t('presetNamePlaceholder')}" 
                                       value="${t('presetList')} ${this.presets.length + 1}" />
                            </div>
                            <div class="mce-form-group">
                                <label class="mce-form-label">${t('presetPrompt')}</label>
                                <div class="mce-preset-chars-preview">
                                    ${this.getCharactersPreview(config)}
                                </div>
                            </div>
                        </div>
                        <div class="mce-save-preset-right">
                            <label class="mce-form-label">${t('previewImage')}</label>
                            <div class="mce-preset-image-upload" id="preset-image-upload">
                                <div class="mce-preset-image-preview" id="preset-image-preview">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                        <polyline points="21 15 16 10 5 21"></polyline>
                                    </svg>
                                    <p>${t('clickOrDragToUpload')}</p>
                                </div>
                                <input type="file" 
                                       id="preset-image-input" 
                                       class="mce-preset-image-input" 
                                       accept="image/png,image/jpeg,image/jpg,image/webp" />
                            </div>
                        </div>
                    </div>
                    <div class="mce-preset-modal-footer">
                        <button class="mce-button" id="save-preset-cancel">${t('cancel')}</button>
                        <button class="mce-button mce-button-primary" id="save-preset-confirm">${t('save')}</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.addModalStyles();
        this.bindSavePresetEvents();
    }

    /**
     * 绑定另存为预设面板事件
     */
    bindSavePresetEvents() {
        const t = this.languageManager.t;

        // 关闭按钮
        document.getElementById('save-preset-modal-close').addEventListener('click', () => {
            this.closeModal();
        });

        // 取消按钮
        document.getElementById('save-preset-cancel').addEventListener('click', () => {
            this.closeModal();
        });

        // 保存按钮
        document.getElementById('save-preset-confirm').addEventListener('click', async () => {
            await this.savePreset();
        });

        // 点击遮罩关闭
        document.getElementById('save-preset-modal-overlay').addEventListener('click', (e) => {
            if (e.target.id === 'save-preset-modal-overlay') {
                this.closeModal();
            }
        });

        // 图片上传
        const imageInput = document.getElementById('preset-image-input');
        const imageUpload = document.getElementById('preset-image-upload');
        const imagePreview = document.getElementById('preset-image-preview');

        // 点击上传区域触发文件选择
        imageUpload.addEventListener('click', () => {
            imageInput.click();
        });

        // 文件选择
        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleImageUpload(file, imagePreview);
            }
        });

        // 拖放上传
        imageUpload.addEventListener('dragover', (e) => {
            e.preventDefault();
            imageUpload.classList.add('mce-preset-image-dragover');
        });

        imageUpload.addEventListener('dragleave', () => {
            imageUpload.classList.remove('mce-preset-image-dragover');
        });

        imageUpload.addEventListener('drop', (e) => {
            e.preventDefault();
            imageUpload.classList.remove('mce-preset-image-dragover');

            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.handleImageUpload(file, imagePreview);
            }
        });
    }

    /**
     * 处理图片上传
     */
    handleImageUpload(file, previewContainer) {
        const reader = new FileReader();

        reader.onload = (e) => {
            const imageData = e.target.result;
            previewContainer.innerHTML = `<img src="${imageData}" alt="Preview" class="mce-preset-uploaded-image" />`;
            previewContainer.dataset.imageData = imageData;
        };

        reader.readAsDataURL(file);
    }

    /**
     * 保存预设
     */
    async savePreset() {
        const t = this.languageManager.t;
        const nameInput = document.getElementById('preset-name-input');
        const imagePreview = document.getElementById('preset-image-preview');

        const presetName = nameInput.value.trim();
        if (!presetName) {
            this.toastManager.showToast(t('presetNamePlaceholder'), 'warning', 3000);
            return;
        }

        // 获取当前配置
        const config = this.editor.dataManager.getConfig();
        const imageData = imagePreview.dataset.imageData || null;

        try {
            const response = await fetch('/multi_character_editor/presets/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: presetName,
                    characters: config.characters,
                    global_prompt: config.global_prompt,
                    global_note: '',
                    preview_image: imageData
                })
            });

            const data = await response.json();

            if (data.success) {
                this.toastManager.showToast(t('presetSaved'), 'success', 3000);
                await this.loadPresets();
                // 🔧 修复：保存成功后关闭模态框
                this.closeModal();
            } else {
                this.toastManager.showToast(data.error || t('error'), 'error', 3000);
            }
        } catch (error) {
            console.error('保存预设失败:', error);
            this.toastManager.showToast(t('error'), 'error', 3000);
        }
    }

    /**
     * 显示编辑预设面板
     */
    showEditPresetPanel(presetId) {
        const preset = this.presets.find(p => p.id === presetId);
        if (!preset) return;

        const modal = this.createModal();
        const t = this.languageManager.t;

        modal.innerHTML = `
            <div class="mce-preset-modal-overlay" id="edit-preset-modal-overlay">
                <div class="mce-preset-modal-container mce-edit-preset-container">
                    <div class="mce-preset-modal-header">
                        <h2 class="mce-preset-modal-title">${t('editPreset')}</h2>
                        <button class="mce-preset-modal-close" id="edit-preset-modal-close">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div class="mce-preset-modal-body mce-edit-preset-body">
                        <div class="mce-edit-preset-content">
                            <div class="mce-edit-preset-list" id="edit-preset-character-list">
                                <!-- 全局提示词固定在顶端 -->
                                <div class="mce-global-prompt-item" data-character-id="__global__">
                                    <div class="mce-character-item-header">
                                        <div class="mce-character-color mce-global-icon">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                                <circle cx="12" cy="12" r="10"></circle>
                                                <path d="M12 8v8m-4-4h8"></path>
                                            </svg>
                            </div>
                                        <span class="mce-global-title">${t('globalPrompt') || '全局提示词'}</span>
                                </div>
                                    <div class="mce-global-prompt-input-container">
                                        <textarea
                                            id="edit-global-prompt"
                                            class="mce-form-input mce-global-prompt-textarea mce-autocomplete-input"
                                            placeholder="${t('globalPromptPlaceholder') || '输入全局提示词，例如：2girls'}"
                                            rows="5">${this.editor.dataManager.config.global_prompt || preset.global_prompt || ''}</textarea>
                            </div>
                                </div>

                                <!-- 分隔线 -->
                                <div class="mce-global-separator"></div>

                                <!-- 角色列表 -->
                                ${this.renderPresetCharacterList(preset)}
                            </div>
                            <div class="mce-edit-preset-edit-panel" id="edit-preset-edit-panel">
                                ${preset.characters && preset.characters.length > 0 ? this.renderPresetCharacterEditForm(preset, 0) : ''}
                            </div>
                        </div>
                    </div>
                    <div class="mce-preset-modal-footer">
                        <button class="mce-button" id="edit-preset-cancel">${t('cancel')}</button>
                        <button class="mce-button mce-button-primary" id="edit-preset-save">${t('save')}</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.addModalStyles();
        this.bindEditPresetEvents(presetId);
    }

    /**
     * 绑定编辑预设事件
     */
    bindEditPresetEvents(presetId) {
        const t = this.languageManager.t;

        // 关闭按钮
        const closeBtn = document.getElementById('edit-preset-modal-close');
        if (closeBtn && !closeBtn.dataset.bound) {
            closeBtn.dataset.bound = 'true';
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeModal();
            });
        }

        // 取消按钮
        const cancelBtn = document.getElementById('edit-preset-cancel');
        if (cancelBtn && !cancelBtn.dataset.bound) {
            cancelBtn.dataset.bound = 'true';
            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeModal();
            });
        }

        // 保存按钮
        const saveBtn = document.getElementById('edit-preset-save');
        if (saveBtn && !saveBtn.dataset.bound) {
            saveBtn.dataset.bound = 'true';
            saveBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                // 🔧 修复：在最终保存前，先临时保存当前编辑的内容
                this.saveCurrentEditTemporarily(presetId);

                const activeCharItem = document.querySelector('.mce-edit-preset-char-item.active');
                if (activeCharItem) {
                    const activeIndex = parseInt(activeCharItem.dataset.characterId);
                    this.savePresetCharacter(presetId, activeIndex);
                }
                await this.updatePreset(presetId);

                // 🔧 修复：保存成功后关闭模态框
                this.closeModal();
            });
        }

        // 点击遮罩关闭
        const overlay = document.getElementById('edit-preset-modal-overlay');
        if (overlay && !overlay.dataset.bound) {
            overlay.dataset.bound = 'true';
            overlay.addEventListener('click', (e) => {
                if (e.target.id === 'edit-preset-modal-overlay') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.closeModal();
                }
            });
        }

        // 绑定角色列表和全局提示词点击事件
        this.bindPresetCharacterListEvents(presetId);
        this.bindGlobalPromptEvents(presetId);

        // 延迟设置智能补全，确保DOM完全渲染
        setTimeout(() => {
            this.setupGlobalPromptAutocomplete();
        }, 100);

        // 重新绑定角色列表事件（因为DOM重新生成了）
        setTimeout(() => {
            this.bindPresetCharacterListEvents(presetId);
        }, 100);

        // 确保表单内容被正确填充
        setTimeout(() => {
            const activeCharItem = document.querySelector('.mce-edit-preset-char-item.active');
            if (activeCharItem) {
                const activeIndex = parseInt(activeCharItem.dataset.characterId);
                this.updateEditForm(preset, activeIndex);
            }
        }, 150);
    }

    /**
     * 绑定全局提示词事件
     */
    bindGlobalPromptEvents(presetId) {
        const globalPromptItem = document.querySelector('.mce-global-prompt-item');
        if (globalPromptItem) {
            globalPromptItem.addEventListener('click', (e) => {
                e.stopPropagation();
                // 点击全局提示词时，显示全局提示词编辑面板
                this.showGlobalPromptEditPanel(presetId);
            });
        }
    }

    /**
     * 显示全局提示词编辑面板
     */
    showGlobalPromptEditPanel(presetId) {
        const preset = this.presets.find(p => p.id === presetId);
        if (!preset) return;

        const modal = this.createModal();
        const t = this.languageManager.t;

        modal.innerHTML = `
            <div class="mce-preset-modal-overlay" id="global-prompt-modal-overlay">
                <div class="mce-preset-modal-container mce-global-prompt-modal">
                    <div class="mce-preset-modal-header">
                        <h2 class="mce-preset-modal-title">${t('globalPrompt') || '全局提示词'}</h2>
                        <button class="mce-preset-modal-close" id="global-prompt-modal-close">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div class="mce-preset-modal-body">
                        <div class="mce-form-group">
                            <label class="mce-form-label">${t('globalPrompt')}</label>
                            <textarea
                                id="global-prompt-input"
                                class="mce-form-input mce-global-prompt-large mce-autocomplete-input"
                                placeholder="${t('globalPromptPlaceholder') || '输入全局提示词，例如：2girls'}"
                                rows="10">${this.editor.dataManager.config.global_prompt || preset.global_prompt || ''}</textarea>
                        </div>
                    </div>
                    <div class="mce-preset-modal-footer">
                        <button class="mce-button" id="global-prompt-cancel">${t('cancel')}</button>
                        <button class="mce-button mce-button-primary" id="global-prompt-save">${t('save')}</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.bindGlobalPromptModalEvents(presetId);
    }

    /**
     * 绑定全局提示词模态框事件
     */
    bindGlobalPromptModalEvents(presetId) {
        const t = this.languageManager.t;

        // 关闭按钮
        document.getElementById('global-prompt-modal-close').addEventListener('click', () => {
            this.closeModal();
        });

        // 取消按钮
        document.getElementById('global-prompt-cancel').addEventListener('click', () => {
            this.closeModal();
        });

        // 保存按钮
        document.getElementById('global-prompt-save').addEventListener('click', async () => {
            const globalPromptInput = document.getElementById('global-prompt-input');

            if (globalPromptInput) {
                const globalPrompt = globalPromptInput.value.trim();

                // 更新预设中的全局提示词
                const preset = this.presets.find(p => p.id === presetId);
                if (preset) {
                    preset.global_prompt = globalPrompt;
                }

                // 同时更新编辑器配置中的全局提示词
                this.editor.dataManager.updateConfig({ global_prompt: globalPrompt });

                // 延迟刷新角色列表，确保配置更新完成
                setTimeout(() => {
                    if (this.editor.components.characterEditor) {
                        this.editor.components.characterEditor.renderCharacterList();
                    }
                }, 50);

                // 重新初始化智能补全
                this.setupGlobalPromptModalAutocomplete();

                // 更新文本区域的值，确保显示最新内容
                globalPromptInput.value = globalPrompt;

                // 🔧 修复：保存成功后关闭模态框
                this.closeModal();
                this.toastManager.showToast(t('globalPromptSaved') || '全局提示词已保存', 'success');
            }
        });

        // 点击遮罩关闭
        document.getElementById('global-prompt-modal-overlay').addEventListener('click', (e) => {
            if (e.target.id === 'global-prompt-modal-overlay') {
                this.closeModal();
            }
        });

        // 设置智能补全
        this.setupGlobalPromptModalAutocomplete();
    }

    /**
     * 为全局提示词模态框设置智能补全
     */
    setupGlobalPromptModalAutocomplete() {
        const globalPromptInput = document.getElementById('global-prompt-input');
        if (!globalPromptInput) return;

        // 销毁旧实例
        if (this.globalPromptModalAutocompleteInstance) {
            this.globalPromptModalAutocompleteInstance.destroy();
            this.globalPromptModalAutocompleteInstance = null;
        }

        const currentLang = this.languageManager.getLanguage();

        setTimeout(() => {
            try {
                this.globalPromptModalAutocompleteInstance = new AutocompleteUI({
                    inputElement: globalPromptInput,
                    language: currentLang,
                    maxSuggestions: 10,
                    debounceDelay: 200,
                    minQueryLength: 1,
                    customClass: 'mce-autocomplete',
                    onSelect: (tag) => {
                        console.log('[PresetManager] 全局提示词模态框选择标签:', tag);
                    }
                });
                console.log('[PresetManager] 全局提示词模态框智能补全初始化成功');
            } catch (error) {
                console.error('[PresetManager] 全局提示词模态框智能补全初始化失败:', error);
            }
        }, 100);
    }


    /**
     * 绑定预设角色列表事件
     */
    bindPresetCharacterListEvents(presetId) {
        const characterList = document.getElementById('edit-preset-character-list');
        if (!characterList) return;

        characterList.addEventListener('click', (e) => {
            const charItem = e.target.closest('.mce-edit-preset-char-item');
            if (charItem) {
                const characterIndex = parseInt(charItem.dataset.characterId);
                this.editPresetCharacter(presetId, characterIndex);
            }
        });
    }

    /**
     * 编辑预设中的角色
     */
    editPresetCharacter(presetId, characterIndex) {
        const preset = this.presets.find(p => p.id === presetId);
        if (!preset || !preset.characters || !preset.characters[characterIndex]) return;

        // 🔧 修复：在切换角色前，先临时保存当前编辑的内容
        this.saveCurrentEditTemporarily(presetId);

        // 更新角色列表的激活状态
        this.updateCharacterListActiveState(characterIndex);

        // 更新编辑表单内容
        this.updateEditForm(preset, characterIndex);

        // 绑定编辑面板事件
        this.bindPresetCharacterEditEvents(presetId, characterIndex);

        // 销毁旧的智能补全实例
        if (this.presetCharacterAutocompleteInstance) {
            this.presetCharacterAutocompleteInstance.destroy();
            this.presetCharacterAutocompleteInstance = null;
        }

        // 设置智能补全
        this.setupPresetCharacterAutocomplete();
    }

    /**
     * 🔧 新增：临时保存当前编辑的内容
     */
    saveCurrentEditTemporarily(presetId) {
        const preset = this.presets.find(p => p.id === presetId);
        if (!preset) return;

        // 获取当前激活的角色索引
        const activeCharItem = document.querySelector('.mce-edit-preset-char-item.active');
        if (!activeCharItem) return;

        const currentCharacterIndex = parseInt(activeCharItem.dataset.characterId);
        if (isNaN(currentCharacterIndex) || !preset.characters[currentCharacterIndex]) return;

        // 获取表单中的当前值
        const noteInput = document.getElementById('edit-character-note');
        const promptInput = document.getElementById('edit-character-prompt');
        const globalPromptInput = document.getElementById('edit-global-prompt');

        if (noteInput || promptInput) {
            // 临时保存到预设数据中（不触发保存到服务器）
            const character = preset.characters[currentCharacterIndex];
            if (noteInput) character.name = noteInput.value.trim();
            if (promptInput) character.prompt = promptInput.value.trim();
        }

        // 同时保存全局提示词
        if (globalPromptInput) {
            preset.global_prompt = globalPromptInput.value.trim();
        }
    }

    /**
     * 更新角色列表激活状态
     */
    updateCharacterListActiveState(activeIndex) {
        const charItems = document.querySelectorAll('.mce-edit-preset-char-item');
        charItems.forEach((item, index) => {
            if (index === activeIndex) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    /**
     * 更新编辑表单内容
     */
    updateEditForm(preset, characterIndex) {
        if (!preset.characters || !preset.characters[characterIndex]) return;

        const character = preset.characters[characterIndex];

        // 填充编辑表单
        const noteInput = document.getElementById('edit-character-note');
        const promptInput = document.getElementById('edit-character-prompt');
        const globalPromptInput = document.getElementById('edit-global-prompt');

        if (noteInput) noteInput.value = character.name || ''; // 备注显示角色名称
        if (promptInput) promptInput.value = character.prompt || '';

        // 🔧 修复：同时更新全局提示词
        if (globalPromptInput) {
            globalPromptInput.value = preset.global_prompt || '';
        }
    }

    /**
     * 绑定预设角色编辑面板事件
     */
    bindPresetCharacterEditEvents(presetId, characterIndex) {
        // 这里不再需要绑定单个角色的保存取消按钮
        // 统一由底部的按钮管理整个表单
    }


    /**
     * 保存预设角色
     */
    savePresetCharacter(presetId, characterIndex) {
        const noteInput = document.getElementById('edit-character-note');
        const promptInput = document.getElementById('edit-character-prompt');

        if (!noteInput || !promptInput) return;

        const preset = this.presets.find(p => p.id === presetId);
        if (!preset || !preset.characters || !preset.characters[characterIndex]) return;

        const character = preset.characters[characterIndex];
        character.name = noteInput.value.trim(); // 备注就是角色名称
        character.note = noteInput.value.trim(); // 同时保存到note字段以保持兼容性
        character.prompt = promptInput.value.trim();

        // 同时保存全局提示词到预设
        const globalPromptInput = document.getElementById('edit-global-prompt');
        if (globalPromptInput) {
            preset.global_prompt = globalPromptInput.value.trim();
        }

        // 刷新角色列表和编辑表单
        this.refreshCharacterListAndForm(preset, characterIndex, presetId);

        this.toastManager.showToast('角色已保存', 'success');
    }

    /**
     * 刷新角色列表和编辑表单
     */
    refreshCharacterListAndForm(preset, characterIndex, presetId) {
        const t = this.languageManager.t;

        // 刷新角色列表（保留全局提示词部分）
        const characterList = document.getElementById('edit-preset-character-list');
        if (characterList) {
            // 获取当前全局提示词的值
            const globalPromptInput = document.getElementById('edit-global-prompt');
            const currentGlobalPrompt = globalPromptInput ? globalPromptInput.value : (this.editor.dataManager.config.global_prompt || preset.global_prompt || '');

            // 重新渲染整个列表，包括全局提示词
            characterList.innerHTML = `
                <!-- 全局提示词固定在顶端 -->
                <div class="mce-global-prompt-item" data-character-id="__global__">
                    <div class="mce-character-item-header">
                        <div class="mce-character-color mce-global-icon">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="M12 8v8m-4-4h8"></path>
                            </svg>
                        </div>
                        <span class="mce-global-title">${t('globalPrompt') || '全局提示词'}</span>
                    </div>
                    <div class="mce-global-prompt-input-container">
                        <textarea
                            id="edit-global-prompt"
                            class="mce-form-input mce-global-prompt-textarea mce-autocomplete-input"
                            placeholder="${t('globalPromptPlaceholder') || '输入全局提示词，例如：2girls'}"
                            rows="5">${currentGlobalPrompt}</textarea>
                    </div>
                </div>

                <!-- 分隔线 -->
                <div class="mce-global-separator"></div>

                <!-- 角色列表 -->
                ${this.renderPresetCharacterList(preset)}
            `;
        }

        // 刷新编辑表单
        const editPanel = document.getElementById('edit-preset-edit-panel');
        if (editPanel) {
            editPanel.innerHTML = this.renderPresetCharacterEditForm(preset, characterIndex);

            // 重新渲染后立即更新表单内容
            setTimeout(() => {
                this.updateEditForm(preset, characterIndex);
            }, 0);
        }

        // 重新绑定事件
        this.bindPresetCharacterListEvents(presetId);
        this.bindPresetCharacterEditEvents(presetId, characterIndex);
        this.bindGlobalPromptEvents(presetId);

        // 重新绑定主按钮事件（因为DOM重新生成了）
        this.bindEditPresetEvents(presetId);

        // 重新设置智能补全
        setTimeout(() => {
            this.setupPresetCharacterAutocomplete();
            this.setupGlobalPromptAutocomplete();
        }, 100);
    }

    /**
     * 为预设角色编辑面板设置智能补全
     */
    setupPresetCharacterAutocomplete() {
        const promptInput = document.getElementById('edit-character-prompt');
        if (!promptInput) return;

        // 销毁旧实例
        if (this.presetCharacterAutocompleteInstance) {
            this.presetCharacterAutocompleteInstance.destroy();
            this.presetCharacterAutocompleteInstance = null;
        }

        const currentLang = this.languageManager.getLanguage();

        // 延迟初始化
        setTimeout(() => {
            try {
                this.presetCharacterAutocompleteInstance = new AutocompleteUI({
                    inputElement: promptInput,
                    language: currentLang,
                    maxSuggestions: 10,
                    debounceDelay: 200,
                    minQueryLength: 2,
                    customClass: 'mce-autocomplete',
                    onSelect: (tag) => {
                        console.log('[PresetManager] 预设角色编辑选择标签:', tag);
                    }
                });
                console.log('[PresetManager] 预设角色编辑智能补全初始化成功');
            } catch (error) {
                console.error('[PresetManager] 预设角色编辑智能补全初始化失败:', error);
            }
        }, 100);
    }

    /**
     * 为全局提示词输入框设置智能补全
     */
    setupGlobalPromptAutocomplete() {
        const globalPromptInput = document.getElementById('edit-global-prompt');
        if (!globalPromptInput) return;

        // 销毁旧实例
        if (this.globalPromptAutocompleteInstance) {
            this.globalPromptAutocompleteInstance.destroy();
            this.globalPromptAutocompleteInstance = null;
        }

        const currentLang = this.languageManager.getLanguage();

        // 延迟初始化
        setTimeout(() => {
            try {
                this.globalPromptAutocompleteInstance = new AutocompleteUI({
                    inputElement: globalPromptInput,
                    language: currentLang,
                    maxSuggestions: 10,
                    debounceDelay: 200,
                    minQueryLength: 1,
                    customClass: 'mce-autocomplete',
                    onSelect: (tag) => {
                        console.log('[PresetManager] 全局提示词选择标签:', tag);
                    }
                });
                console.log('[PresetManager] 全局提示词智能补全初始化成功');
            } catch (error) {
                console.error('[PresetManager] 全局提示词智能补全初始化失败:', error);
            }
        }, 100);
    }


    /**
     * 更新预设
     */
    async updatePreset(presetId) {
        const t = this.languageManager.t;

        // 在编辑预设时，不需要获取输入框元素，因为预设名称不需要改变
        const preset = this.presets.find(p => p.id === presetId);
        if (!preset) return;

        const presetName = preset.name; // 使用预设现有的名称
        if (!presetName) {
            this.toastManager.showToast(t('presetNamePlaceholder'), 'warning', 3000);
            return;
        }

        // 直接使用预设中的角色数据（已经在编辑过程中更新了）
        // 编辑预设时不需要处理图片上传，所以imageData设为null
        const imageData = null;

        // 获取全局提示词的值
        const globalPromptInput = document.getElementById('edit-global-prompt');

        const globalPrompt = globalPromptInput ? globalPromptInput.value.trim() : (preset.global_prompt || '');

        // 同时更新编辑器配置中的全局提示词
        if (globalPromptInput) {
            this.editor.dataManager.updateConfig({ global_prompt: globalPrompt });

            // 延迟刷新角色列表，确保配置更新完成
            setTimeout(() => {
                if (this.editor.components.characterEditor) {
                    this.editor.components.characterEditor.renderCharacterList();
                }
            }, 50);
        }

        try {
            const response = await fetch('/multi_character_editor/presets/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: presetId,
                    name: presetName,
                    characters: preset.characters,
                    global_prompt: globalPrompt,
                    global_note: '',
                    preview_image: imageData
                })
            });

            const data = await response.json();

            if (data.success) {
                this.toastManager.showToast(t('presetSaved'), 'success', 3000);
                await this.loadPresets();
                // 不关闭模态框，让用户可以继续编辑
            } else {
                this.toastManager.showToast(data.error || t('error'), 'error', 3000);
            }
        } catch (error) {
            console.error('更新预设失败:', error);
            this.toastManager.showToast(t('error'), 'error', 3000);
        }
    }


    /**
     * 删除预设
     */
    async deletePreset(presetId) {
        const t = this.languageManager.t;
        const preset = this.presets.find(p => p.id === presetId);

        if (!preset) return;

        // 确认删除
        const confirmed = confirm(`${t('deletePresetConfirm')}\n\n${t('deletePresetWarning')}`);
        if (!confirmed) return;

        try {
            const response = await fetch('/multi_character_editor/presets/delete', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id: presetId })
            });

            const data = await response.json();

            if (data.success) {
                this.toastManager.showToast(t('presetDeleted'), 'success', 3000);
                await this.loadPresets();

                // 刷新预设列表
                const listContainer = document.getElementById('preset-list-container');
                if (listContainer) {
                    listContainer.innerHTML = this.renderPresetList();
                    this.bindPresetManagementEvents();
                }
            } else {
                this.toastManager.showToast(data.error || t('error'), 'error', 3000);
            }
        } catch (error) {
            console.error('删除预设失败:', error);
            this.toastManager.showToast(t('error'), 'error', 3000);
        }
    }

    /**
     * 应用预设
     */
    applyPreset(presetId) {
        const t = this.languageManager.t;
        const preset = this.presets.find(p => p.id === presetId);

        if (!preset || !preset.characters) return;

        // 清空当前角色列表
        if (this.editor.components.characterEditor) {
            this.editor.components.characterEditor.clearAllCharacters();
        }

        // 应用预设中的角色
        preset.characters.forEach(char => {
            if (this.editor.components.characterEditor) {
                this.editor.components.characterEditor.addCharacterToUI(char, false);
            }
        });

        // 更新配置
        this.editor.dataManager.updateConfig({
            characters: preset.characters,
            global_prompt: preset.global_prompt,
            global_note: ''
        });

        // 🔧 修复：强制刷新角色列表显示
        if (this.editor.components.characterEditor) {
            this.editor.components.characterEditor.renderCharacterList();
        }

        // 🔧 关键修复：同步蒙版数据并刷新显示
        if (this.editor.components.maskEditor) {
            // 从角色数据同步蒙版（统一使用这个方法）
            this.editor.components.maskEditor.syncMasksFromCharacters();
            // 强制重新渲染蒙版编辑器
            this.editor.components.maskEditor.scheduleRender();

            // 添加额外延迟渲染，确保在DOM更新后再次渲染
            setTimeout(() => {
                if (this.editor.components.maskEditor) {
                    this.editor.components.maskEditor.scheduleRender();
                }
            }, 200);
        }

        // 更新输出
        if (this.editor.components.outputArea && this.editor.components.outputArea.updatePromptPreview) {
            this.editor.components.outputArea.updatePromptPreview();
        }

        // 🔧 关键修复：保存到节点状态，确保数据持久化
        if (this.editor.saveToNodeState) {
            const config = this.editor.dataManager.getConfig();
            this.editor.saveToNodeState(config);
        }

        this.toastManager.showToast(t('presetApplied'), 'success', 3000);

        // 🔧 修复：应用预设后自动关闭面板
        // 使用setTimeout确保所有异步操作完成后再关闭
        setTimeout(() => {
            this.closeModal();
        }, 100);
    }

    /**
     * 显示预设工具提示
     */
    showPresetTooltip(element, preset) {
        // TODO: 实现工具提示显示完整提示词和预览图
    }

    /**
     * 隐藏预设工具提示
     */
    hidePresetTooltip() {
        const tooltip = document.getElementById('mce-preset-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }

    /**
     * 创建模态框容器
     */
    createModal() {
        // 清理按钮的绑定状态
        const boundButtons = document.querySelectorAll('[data-bound="true"]');
        boundButtons.forEach(button => {
            delete button.dataset.bound;
        });

        // 移除所有现有的预设相关模态框
        const existingModals = document.querySelectorAll('.mce-preset-modal-overlay, .mce-edit-preset-container, .mce-save-preset-container');
        existingModals.forEach(modal => {
            modal.remove();
        });

        const modal = document.createElement('div');
        modal.className = 'mce-preset-modal-wrapper';
        return modal;
    }

    /**
     * 关闭模态框
     */
    closeModal() {
        // 销毁智能补全实例
        if (this.presetAutocompleteInstance) {
            this.presetAutocompleteInstance.destroy();
            this.presetAutocompleteInstance = null;
        }

        if (this.presetCharacterAutocompleteInstance) {
            this.presetCharacterAutocompleteInstance.destroy();
            this.presetCharacterAutocompleteInstance = null;
        }

        if (this.globalPromptAutocompleteInstance) {
            this.globalPromptAutocompleteInstance.destroy();
            this.globalPromptAutocompleteInstance = null;
        }

        // 清理按钮的绑定状态
        const boundButtons = document.querySelectorAll('[data-bound="true"]');
        boundButtons.forEach(button => {
            delete button.dataset.bound;
        });

        // 移除所有预设相关模态框
        const modals = document.querySelectorAll('.mce-preset-modal-wrapper, .mce-preset-modal-overlay, .mce-edit-preset-container, .mce-save-preset-container');
        modals.forEach(modal => {
            modal.remove();
        });
    }

    /**
     * HTML转义
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 添加模态框样式
     */
    addModalStyles() {
        if (document.getElementById('mce-preset-modal-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'mce-preset-modal-styles';
        style.textContent = `
            .mce-preset-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.2s ease-out;
            }

            @keyframes fadeIn {
                from {
                    opacity: 0;
                }
                to {
                    opacity: 1;
                }
            }

            .mce-preset-modal-container {
                background: #2a2a3e;
                border-radius: 12px;
                width: 90%;
                max-width: 900px;
                max-height: 80vh;
                display: flex;
                flex-direction: column;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
                animation: slideUp 0.3s ease-out;
            }

            @keyframes slideUp {
                from {
                    transform: translateY(20px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }

            .mce-preset-modal-header {
                padding: 20px 24px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .mce-preset-modal-title {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                color: #E0E0E0;
            }

            .mce-preset-modal-close {
                background: none;
                border: none;
                color: rgba(224, 224, 224, 0.6);
                cursor: pointer;
                padding: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 6px;
                transition: all 0.2s ease;
            }

            .mce-preset-modal-close:hover {
                background: rgba(255, 255, 255, 0.1);
                color: #E0E0E0;
            }

            .mce-preset-modal-body {
                padding: 24px;
                overflow-y: auto;
                flex: 1;
            }

            .mce-global-prompt-item {
                background: rgba(124, 58, 237, 0.15);
                border: 2px solid rgba(124, 58, 237, 0.3);
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 12px;
            }

            .mce-global-prompt-input-container {
                margin-top: 8px;
            }

            .mce-global-prompt-textarea {
                min-height: 120px;
                resize: vertical;
                background: rgba(26, 26, 38, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 6px;
                color: #E0E0E0;
                padding: 8px 12px;
                font-family: inherit;
                transition: all 0.2s ease;
            }

            .mce-global-prompt-textarea:focus {
                outline: none;
                border-color: #7c3aed;
                box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.2);
            }

            .mce-global-separator {
                height: 1px;
                background: rgba(255, 255, 255, 0.1);
                margin: 12px 0;
            }

            .mce-save-preset-body {
                overflow: visible !important;
            }

            .mce-global-prompt-modal {
                max-width: 600px;
            }

            .mce-global-prompt-large {
                min-height: 200px;
                resize: vertical;
            }

            .mce-preset-modal-footer {
                padding: 16px 24px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            }

            .mce-preset-list {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: 16px;
            }

            .mce-preset-item {
                background: rgba(42, 42, 62, 0.6);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 10px;
                overflow: hidden;
                transition: all 0.2s ease;
                cursor: pointer;
            }

            .mce-preset-item:hover {
                border-color: rgba(124, 58, 237, 0.5);
                box-shadow: 0 4px 12px rgba(124, 58, 237, 0.2);
                transform: translateY(-2px);
            }

            .mce-preset-item-preview {
                width: 100%;
                height: 160px;
                background: #1a1a26;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
            }

            .mce-preset-preview-img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            .mce-preset-no-preview {
                color: rgba(224, 224, 224, 0.3);
            }

            .mce-preset-item-info {
                padding: 12px;
            }

            .mce-preset-item-name {
                margin: 0 0 6px 0;
                font-size: 14px;
                font-weight: 600;
                color: #E0E0E0;
            }

            .mce-preset-item-chars {
                margin: 0 0 8px 0;
                font-size: 12px;
                color: rgba(224, 224, 224, 0.6);
            }

            .mce-preset-item-prompt {
                font-size: 12px;
                color: rgba(224, 224, 224, 0.5);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                font-style: italic;
            }

            .mce-preset-item-actions {
                padding: 8px 12px 12px;
                display: flex;
                gap: 6px;
            }

            .mce-preset-action-btn {
                flex: 1;
                padding: 6px 8px;
                background: rgba(124, 58, 237, 0.15);
                border: 1px solid rgba(124, 58, 237, 0.3);
                border-radius: 6px;
                color: #b794f4;
                font-size: 11px;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 4px;
            }

            .mce-preset-action-btn:hover {
                background: rgba(124, 58, 237, 0.25);
                border-color: rgba(124, 58, 237, 0.5);
            }

            .mce-preset-delete-btn {
                background: rgba(239, 68, 68, 0.15);
                border-color: rgba(239, 68, 68, 0.3);
                color: #f87171;
            }

            .mce-preset-delete-btn:hover {
                background: rgba(239, 68, 68, 0.25);
                border-color: rgba(239, 68, 68, 0.5);
            }

            .mce-preset-apply-btn {
                background: rgba(16, 185, 129, 0.15);
                border-color: rgba(16, 185, 129, 0.3);
                color: #6ee7b7;
            }

            .mce-preset-apply-btn:hover {
                background: rgba(16, 185, 129, 0.25);
                border-color: rgba(16, 185, 129, 0.5);
            }

            .mce-preset-empty {
                grid-column: 1 / -1;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 60px 20px;
                color: rgba(224, 224, 224, 0.4);
            }

            .mce-preset-empty p {
                margin: 16px 0 8px;
                font-size: 16px;
            }

            .mce-preset-empty-hint {
                font-size: 13px;
                color: rgba(224, 224, 224, 0.3);
            }

            /* 另存为预设样式 */
            .mce-save-preset-container {
                max-width: 700px;
            }

            .mce-save-preset-body {
                display: flex;
                gap: 24px;
            }

            .mce-save-preset-left {
                flex: 1;
            }

            .mce-save-preset-right {
                width: 240px;
            }

            .mce-form-group {
                margin-bottom: 20px;
            }

            .mce-form-label {
                display: block;
                margin-bottom: 8px;
                font-size: 13px;
                font-weight: 500;
                color: rgba(224, 224, 224, 0.8);
            }

            .mce-form-input {
                width: 100%;
                padding: 10px 14px;
                background: #1a1a26;
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                color: #E0E0E0;
                font-size: 13px;
                transition: all 0.2s ease;
            }

            .mce-form-input:focus {
                outline: none;
                border-color: #7c3aed;
                box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
            }

            .mce-preset-chars-preview {
                max-height: 200px;
                overflow-y: auto;
                background: rgba(26, 26, 38, 0.6);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                padding: 8px;
            }

            .mce-preset-prompt-textarea {
                width: 100%;
                min-height: 200px;
                resize: vertical;
                font-family: inherit;
                line-height: 1.6;
                padding: 12px;
            }

            /* 预设编辑面板样式 */
            .mce-edit-preset-container {
                max-width: 900px;
                width: 90vw;
                max-height: 80vh;
            }

            .mce-edit-preset-body {
                padding: 0;
                overflow: hidden;
            }

            .mce-edit-preset-content {
                display: flex;
                height: 100%;
                min-height: 400px;
            }

            .mce-edit-preset-list {
                width: 300px;
                border-right: 1px solid rgba(255, 255, 255, 0.1);
                padding: 16px;
                overflow-y: auto;
                background: rgba(26, 26, 38, 0.3);
            }

            .mce-edit-preset-edit-panel {
                flex: 1;
                display: flex !important;
                flex-direction: column;
                padding: 20px;
                background: rgba(42, 42, 62, 0.3);
                overflow: hidden;
            }

            .mce-edit-preset-form {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 16px;
                overflow-y: auto;
                padding-right: 4px;
                padding-bottom: 20px;
            }


            .mce-edit-preset-chars-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .mce-edit-preset-char-item {
                padding: 12px;
                background: rgba(124, 58, 237, 0.1);
                border: 1px solid rgba(124, 58, 237, 0.2);
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .mce-edit-preset-char-item:hover,
            .mce-edit-preset-char-item.active {
                background: rgba(124, 58, 237, 0.15);
                border-color: rgba(124, 58, 237, 0.4);
                transform: translateY(-2px);
            }

            .mce-edit-preset-char-item.active {
                background: rgba(124, 58, 237, 0.2);
                border-color: rgba(124, 58, 237, 0.6);
                box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.3);
            }

            .mce-edit-preset-char-header {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 6px;
            }

            .mce-edit-preset-char-status {
                font-size: 12px;
                font-weight: 600;
                color: #10b981;
                background: rgba(16, 185, 129, 0.1);
                padding: 2px 6px;
                border-radius: 4px;
                min-width: 16px;
                text-align: center;
            }

            .mce-edit-preset-char-status.status-disabled {
                color: #ef4444;
                background: rgba(239, 68, 68, 0.1);
            }

            .mce-edit-preset-char-name {
                font-size: 14px;
                font-weight: 600;
                color: #E0E0E0;
                flex: 1;
            }

            .mce-edit-preset-char-prompt {
                font-size: 12px;
                color: rgba(224, 224, 224, 0.6);
                line-height: 1.4;
                word-break: break-word;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }

            .mce-edit-character-textarea {
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

            .mce-edit-character-textarea:focus {
                outline: none;
                border-color: #7c3aed;
                box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.2);
            }


            .mce-preset-chars-list {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            .mce-global-preview {
                background: rgba(124, 58, 237, 0.1);
                border-left: 3px solid #7c3aed;
            }

            .mce-preset-separator {
                height: 1px;
                background: rgba(255, 255, 255, 0.1);
                margin: 8px 0;
            }

            .mce-preset-char-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px 10px;
                background: rgba(42, 42, 62, 0.6);
                border: 1px solid rgba(255, 255, 255, 0.05);
                border-radius: 6px;
                font-size: 12px;
            }

            .mce-preset-char-status {
                color: #10b981;
                font-weight: bold;
                flex-shrink: 0;
            }

            .mce-preset-char-name {
                color: #b794f4;
                font-weight: 600;
                min-width: 80px;
                flex-shrink: 0;
            }

            .mce-preset-char-prompt {
                color: rgba(224, 224, 224, 0.8);
                flex: 1;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .mce-preset-empty {
                padding: 20px;
                text-align: center;
                color: rgba(176, 176, 176, 0.6);
                font-size: 13px;
            }

            .mce-preset-image-upload {
                position: relative;
                width: 100%;
                height: 240px;
                border: 2px dashed rgba(255, 255, 255, 0.2);
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
                overflow: hidden;
            }

            .mce-preset-image-upload:hover {
                border-color: #7c3aed;
                background: rgba(124, 58, 237, 0.05);
            }

            .mce-preset-image-dragover {
                border-color: #7c3aed;
                background: rgba(124, 58, 237, 0.1);
            }

            .mce-preset-image-preview {
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 12px;
                color: rgba(224, 224, 224, 0.5);
                text-align: center;
                padding: 20px;
            }

            .mce-preset-image-preview p {
                margin: 0;
                font-size: 12px;
            }

            .mce-preset-image-input {
                display: none;
            }

            .mce-preset-uploaded-image {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            .mce-button {
                padding: 8px 16px;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 8px;
                color: #E0E0E0;
                font-size: 13px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .mce-button:hover {
                background: rgba(255, 255, 255, 0.15);
            }

            .mce-button-primary {
                background: #7c3aed;
                border-color: #7c3aed;
                color: white;
            }

            .mce-button-primary:hover {
                background: #6d28d9;
                border-color: #6d28d9;
            }
        `;

        document.head.appendChild(style);
    }
}

// 导出
export { PresetManager };

