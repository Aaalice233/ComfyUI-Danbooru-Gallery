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
        this.filteredPresets = [];
        this.searchQuery = '';

        this.init();
    }

    init() {
        this.loadPresets();

        // 添加全局事件监听器，确保在窗口滚动或调整大小时隐藏悬浮提示
        this.setupGlobalTooltipListeners();
    }

    /**
     * 设置全局悬浮提示监听器
     */
    setupGlobalTooltipListeners() {
        // 窗口滚动时隐藏悬浮提示
        window.addEventListener('scroll', () => {
            this.hidePresetTooltipImmediate();
        }, true);

        // 窗口大小改变时隐藏悬浮提示
        window.addEventListener('resize', () => {
            this.hidePresetTooltipImmediate();
        });

        // 键盘按下时隐藏悬浮提示（特别是ESC键）
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hidePresetTooltipImmediate();
            }
        });
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
                this.filteredPresets = [...this.presets];
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
                        <div class="mce-preset-search-container">
                            <div class="mce-preset-search-box">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <path d="M21 21l-4.35-4.35"></path>
                                </svg>
                                <input type="text" 
                                       id="preset-search-input" 
                                       class="mce-preset-search-input" 
                                       placeholder="${t('searchPresets')}" />
                            </div>
                        </div>
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
            this.closeModal('management');
        });

        // 点击遮罩关闭
        document.getElementById('preset-modal-overlay').addEventListener('click', (e) => {
            if (e.target.id === 'preset-modal-overlay') {
                this.closeModal('management');
            }
        });
    }

    /**
     * 渲染预设列表
     */
    renderPresetList() {
        const t = this.languageManager.t;

        if (this.filteredPresets.length === 0) {
            if (this.searchQuery) {
                return `
                    <div class="mce-preset-empty">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="M21 21l-4.35-4.35"></path>
                        </svg>
                        <p>${t('noSearchResults')}</p>
                        <span class="mce-preset-empty-hint">${t('tryDifferentKeywords')}</span>
                    </div>
                `;
            } else {
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
        }

        return this.filteredPresets.map(preset => `
            <div class="mce-preset-item" data-preset-id="${preset.id}">
                <div class="mce-preset-item-info">
                    <div class="mce-preset-item-header">
                        <h3 class="mce-preset-item-name">${this.escapeHtml(preset.name)}</h3>
                        <span class="mce-preset-syntax-mode">${this.getSyntaxModeDisplay(preset.syntax_mode)}</span>
                    </div>
                    <div class="mce-preset-item-content">
                        ${this.renderPresetContentPreview(preset)}
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

        // 获取当前语法模式
        const syntaxMode = preset.syntax_mode || 'attention_couple';
        const isRegionalMode = syntaxMode === 'regional_prompts';

        // 获取角色语法类型，默认为MASK
        const syntaxType = character.syntax_type || (isRegionalMode ? 'REGION' : 'MASK');
        const useMaskSyntax = character.use_mask_syntax !== false; // 默认使用MASK语法

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
                        rows="8">${character.prompt || ''}</textarea>
                </div>
                
                <!-- 参数设置区域 -->
                <div class="mce-preset-params-section">
                    <h4 class="mce-params-section-title">${t('parameters') || '参数设置'}</h4>
                    
                    <!-- 权重 -->
                    <div class="mce-param-item">
                        <label class="mce-param-label">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                            </svg>
                            ${t('weight') || '权重'}
                        </label>
                        <div class="mce-param-control">
                            <input type="range" min="0.1" max="2.0" step="0.01" value="${character.weight || 1.0}" id="edit-character-weight">
                            <input type="number" min="0.1" max="2.0" step="0.01" value="${character.weight || 1.0}" id="edit-character-weight-input" class="mce-param-number">
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
                            <input type="range" min="0" max="50" step="1" value="${character.feather || 0}" id="edit-character-feather">
                            <input type="number" min="0" max="50" step="1" value="${character.feather || 0}" id="edit-character-feather-input" class="mce-param-number">
                        </div>
                    </div>
                    
                    <!-- 语法类型 -->
                    ${isRegionalMode ? `
                    <div class="mce-param-item">
                        <label class="mce-param-label">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="4 7 4 4 20 4 20 7"></polyline>
                                <line x1="9" y1="20" x2="15" y2="20"></line>
                                <line x1="12" y1="4" x2="12" y2="20"></line>
                            </svg>
                            ${t('syntaxType') || '语法类型'}
                        </label>
                        <div class="mce-param-control">
                            <select id="edit-character-syntax-type" class="mce-param-select">
                                <option value="REGION" ${syntaxType === 'REGION' ? 'selected' : ''}>REGION</option>
                                <option value="MASK" ${syntaxType === 'MASK' ? 'selected' : ''}>MASK</option>
                            </select>
                        </div>
                    </div>` : `
                    <!-- 注意力耦合模式下隐藏语法类型选项，固定使用COUPLE -->
                    <input type="hidden" id="edit-character-syntax-type" value="COUPLE">`}
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
     * 获取预设完整提示词（用于在预览区域显示）
     */
    getPresetFullPrompt(preset) {
        if (!preset) return this.languageManager.t('promptEmpty');

        // 构建配置对象，与主编辑器保持一致
        const config = {
            base_prompt: '', // 预设中没有基础提示词
            global_prompt: preset.global_prompt || '',
            global_use_fill: preset.global_use_fill || false,
            syntax_mode: preset.syntax_mode || 'attention_couple', // 默认使用attention_couple
            characters: preset.characters || []
        };

        // 如果没有角色，直接返回全局提示词
        if (!config.characters || config.characters.length === 0) {
            return config.global_prompt || this.languageManager.t('promptEmpty');
        }

        // 过滤启用的角色
        const enabledCharacters = config.characters.filter(char => char.enabled !== false);
        if (!enabledCharacters || enabledCharacters.length === 0) {
            return config.global_prompt || this.languageManager.t('promptEmpty');
        }

        // 生成蒙版数据
        const masks = this.generateMasks(enabledCharacters);

        // 根据语法模式生成提示词
        if (config.syntax_mode === "attention_couple") {
            return this.generateAttentionCouple('', config.global_prompt, masks, config.global_use_fill, enabledCharacters);
        } else if (config.syntax_mode === "regional_prompts") {
            return this.generateRegionalPrompts('', config.global_prompt, masks);
        } else {
            // 默认使用attention_couple
            return this.generateAttentionCouple('', config.global_prompt, masks, config.global_use_fill, enabledCharacters);
        }
    }

    /**
     * 生成蒙版数据（从主编辑器复制）
     */
    generateMasks(characters) {
        const masks = [];
        for (const char of characters) {
            if (!char.mask) continue;

            // 确保坐标值有效
            const x = Math.max(0.0, Math.min(1.0, char.mask.x || 0.0));
            const y = Math.max(0.0, Math.min(1.0, char.mask.y || 0.0));
            const width = Math.max(0.01, Math.min(1.0 - x, char.mask.width || 0.5));
            const height = Math.max(0.01, Math.min(1.0 - y, char.mask.height || 0.5));

            masks.push({
                prompt: char.prompt || '',
                weight: char.weight || 1.0,
                x1: x,
                y1: y,
                x2: x + width,
                y2: y + height,
                feather: char.mask.feather || 0,
                blend_mode: char.mask.blend_mode || 'normal',
                use_fill: char.use_fill || false  // 添加角色的FILL状态
            });
        }
        return masks;
    }

    /**
     * 生成Attention Couple语法（从主编辑器复制）
     */
    generateAttentionCouple(basePrompt, globalPrompt, masks, globalUseFill, enabledCharacters) {
        if (!masks || masks.length === 0) {
            // 没有角色时，合并基础提示词和全局提示词
            let result = basePrompt;
            if (globalPrompt) {
                result = result ? `${result} ${globalPrompt}` : globalPrompt;
            }
            // 如果全局开启了FILL，添加FILL()
            if (globalUseFill && result) {
                result += ' FILL()';
            }
            return result || '';
        }

        const maskStrings = [];
        for (const mask of masks) {
            if (!mask.prompt || !mask.prompt.trim()) continue;

            // 确保坐标在有效范围内
            let x1 = Math.max(0.0, Math.min(1.0, mask.x1));
            let x2 = Math.max(0.0, Math.min(1.0, mask.x2));
            let y1 = Math.max(0.0, Math.min(1.0, mask.y1));
            let y2 = Math.max(0.0, Math.min(1.0, mask.y2));

            // 确保x2 > x1且y2 > y1
            if (x2 <= x1) {
                x2 = Math.min(1.0, x1 + 0.1);
            }
            if (y2 <= y1) {
                y2 = Math.min(1.0, y1 + 0.1);
            }

            // 使用完整格式：MASK(x1 x2, y1 y2, weight)
            const weight = mask.weight || 1.0;
            let maskParams = `${x1.toFixed(2)} ${x2.toFixed(2)}, ${y1.toFixed(2)} ${y2.toFixed(2)}, ${weight.toFixed(2)}`;

            let maskStr = `COUPLE MASK(${maskParams}) ${mask.prompt}`;

            // 如果该角色开启了FILL，在该角色提示词后添加FILL()
            if (mask.use_fill) {
                maskStr += ' FILL()';
            }

            // 添加羽化（简化语法，一个值表示所有边缘）
            // 羽化值为像素值，0表示不使用羽化
            const featherValue = parseInt(mask.feather) || 0;
            if (featherValue > 0) {
                maskStr += ` FEATHER(${featherValue})`;
            }

            maskStrings.push(maskStr);
        }

        // 合并基础提示词和全局提示词
        let finalBasePrompt = '';
        if (basePrompt && basePrompt.trim()) {
            finalBasePrompt = basePrompt.trim();
        }
        if (globalPrompt && globalPrompt.trim()) {
            if (finalBasePrompt) {
                finalBasePrompt = finalBasePrompt + ' ' + globalPrompt.trim();
            } else {
                finalBasePrompt = globalPrompt.trim();
            }
        }

        // 构建结果
        const resultParts = [];

        // 添加基础提示词，如果全局开启了FILL则添加FILL()
        if (finalBasePrompt) {
            if (globalUseFill) {
                resultParts.push(finalBasePrompt + ' FILL()');
            } else {
                resultParts.push(finalBasePrompt);
            }
        }

        // 添加所有角色提示词
        if (maskStrings.length > 0) {
            resultParts.push(...maskStrings);
        }

        return resultParts.join('\n');
    }

    /**
     * 生成Regional Prompts语法（从主编辑器复制）
     */
    generateRegionalPrompts(basePrompt, globalPrompt, masks) {
        if (!masks || masks.length === 0) {
            // 没有角色时，合并基础提示词和全局提示词
            let result = basePrompt;
            if (globalPrompt) {
                result = result ? `${result} ${globalPrompt}` : globalPrompt;
            }
            return result || '';
        }

        const regionStrings = [];
        for (const mask of masks) {
            if (!mask.prompt || !mask.prompt.trim()) continue;

            // 确保坐标在有效范围内
            let x1 = Math.max(0.0, Math.min(1.0, mask.x1));
            let x2 = Math.max(0.0, Math.min(1.0, mask.x2));
            let y1 = Math.max(0.0, Math.min(1.0, mask.y1));
            let y2 = Math.max(0.0, Math.min(1.0, mask.y2));

            // 确保x2 > x1且y2 > y1
            if (x2 <= x1) {
                x2 = Math.min(1.0, x1 + 0.1);
            }
            if (y2 <= y1) {
                y2 = Math.min(1.0, y1 + 0.1);
            }

            // 使用REGION语法
            const weight = mask.weight || 1.0;
            let regionParams = `${x1.toFixed(2)},${y1.toFixed(2)},${x2.toFixed(2)},${y2.toFixed(2)}`;

            let regionStr = `<region:${regionParams}:${weight.toFixed(2)}>`;
            regionStr += mask.prompt;
            regionStr += `</region>`;

            // 添加羽化
            const featherValue = parseInt(mask.feather) || 0;
            if (featherValue > 0) {
                regionStr += ` <feather:${featherValue}>`;
            }

            regionStrings.push(regionStr);
        }

        // 合并基础提示词和全局提示词
        let finalBasePrompt = '';
        if (basePrompt && basePrompt.trim()) {
            finalBasePrompt = basePrompt.trim();
        }
        if (globalPrompt && globalPrompt.trim()) {
            if (finalBasePrompt) {
                finalBasePrompt = finalBasePrompt + ' ' + globalPrompt.trim();
            } else {
                finalBasePrompt = globalPrompt.trim();
            }
        }

        // 构建结果
        const resultParts = [];

        // 添加基础提示词
        if (finalBasePrompt) {
            resultParts.push(finalBasePrompt);
        }

        // 添加所有区域提示词
        if (regionStrings.length > 0) {
            resultParts.push(...regionStrings);
        }

        return resultParts.join('\n');
    }

    /**
     * 搜索预设
     */
    searchPresets(query) {
        this.searchQuery = query.toLowerCase().trim();

        if (!this.searchQuery) {
            this.filteredPresets = [...this.presets];
        } else {
            this.filteredPresets = this.presets.filter(preset => {
                // 搜索预设名称
                if (preset.name && preset.name.toLowerCase().includes(this.searchQuery)) {
                    return true;
                }

                // 搜索角色名称/备注名称
                if (preset.characters && preset.characters.some(char => {
                    const name = char.name || '';
                    return name.toLowerCase().includes(this.searchQuery);
                })) {
                    return true;
                }

                // 搜索提示词内容
                if (preset.characters && preset.characters.some(char => {
                    const prompt = char.prompt || '';
                    return prompt.toLowerCase().includes(this.searchQuery);
                })) {
                    return true;
                }

                // 搜索全局提示词
                if (preset.global_prompt && preset.global_prompt.toLowerCase().includes(this.searchQuery)) {
                    return true;
                }

                return false;
            });
        }

        // 更新显示
        const listContainer = document.getElementById('preset-list-container');
        if (listContainer) {
            listContainer.innerHTML = this.renderPresetList();
            this.bindPresetManagementEvents();
        }
    }

    /**
     * 绑定预设管理面板事件
     */
    bindPresetManagementEvents() {
        // 搜索框事件
        const searchInput = document.getElementById('preset-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchPresets(e.target.value);
            });
        }

        // 编辑按钮
        document.querySelectorAll('.mce-preset-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.hidePresetTooltip(); // 点击按钮时隐藏悬浮提示
                const presetId = btn.dataset.presetId;
                this.showEditPresetPanel(presetId);
            });

            // 添加鼠标进入事件，防止悬浮提示干扰按钮交互
            btn.addEventListener('mouseenter', () => {
                this.hidePresetTooltip();
            });
        });

        // 删除按钮
        document.querySelectorAll('.mce-preset-delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                this.hidePresetTooltip(); // 点击按钮时隐藏悬浮提示
                const presetId = btn.dataset.presetId;
                await this.deletePreset(presetId);
            });

            // 添加鼠标进入事件，防止悬浮提示干扰按钮交互
            btn.addEventListener('mouseenter', () => {
                this.hidePresetTooltip();
            });
        });

        // 应用按钮
        document.querySelectorAll('.mce-preset-apply-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.hidePresetTooltip(); // 点击按钮时隐藏悬浮提示
                const presetId = btn.dataset.presetId;
                this.applyPreset(presetId);
            });

            // 添加鼠标进入事件，防止悬浮提示干扰按钮交互
            btn.addEventListener('mouseenter', () => {
                this.hidePresetTooltip();
            });
        });

        // 预设项悬浮效果
        document.querySelectorAll('.mce-preset-item').forEach(item => {
            item.addEventListener('mouseenter', (e) => {
                // 如果鼠标在按钮上，不显示悬浮提示
                if (e.target.closest('.mce-preset-action-btn')) {
                    return;
                }

                const presetId = item.dataset.presetId;
                const preset = this.presets.find(p => p.id === presetId);
                if (preset) {
                    this.showPresetTooltip(e, preset);
                }
            });

            item.addEventListener('mouseleave', (e) => {
                // 如果鼠标移到了按钮上，不隐藏悬浮提示
                if (e.relatedTarget && e.relatedTarget.closest('.mce-preset-action-btn')) {
                    return;
                }

                // 如果鼠标移到了悬浮提示上，不隐藏悬浮提示
                if (e.relatedTarget && e.relatedTarget.closest('.mce-preset-tooltip')) {
                    return;
                }

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
            this.closeModal('save');
        });

        // 取消按钮
        document.getElementById('save-preset-cancel').addEventListener('click', () => {
            this.closeModal('save');
        });

        // 保存按钮
        document.getElementById('save-preset-confirm').addEventListener('click', async () => {
            await this.savePreset();
        });

        // 点击遮罩关闭
        document.getElementById('save-preset-modal-overlay').addEventListener('click', (e) => {
            if (e.target.id === 'save-preset-modal-overlay') {
                this.closeModal('save');
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

        // 确保角色数据包含语法类型
        const characters = config.characters ? config.characters.map(char => ({
            ...char,
            syntax_type: char.syntax_type || (config.syntax_mode === 'regional_prompts' ? 'REGION' : 'COUPLE'),
            weight: char.weight || 1.0,
            feather: char.feather || 0
        })) : [];

        try {
            const response = await fetch('/multi_character_editor/presets/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: presetName,
                    characters: characters,
                    global_prompt: config.global_prompt,
                    global_use_fill: config.global_use_fill || false,
                    syntax_mode: config.syntax_mode || 'attention_couple',
                    global_note: '',
                    preview_image: imageData
                })
            });

            const data = await response.json();

            if (data.success) {
                this.toastManager.showToast(t('presetSaved'), 'success', 3000);
                await this.loadPresets();
                // 🔧 修复：保存成功后关闭模态框
                this.closeModal('save');
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

        // 获取当前语法模式
        const syntaxMode = preset.syntax_mode || 'attention_couple';

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
                                <!-- 预设设置区域 -->
                                <div class="mce-preset-settings-section">
                                    <!-- 语法模式 -->
                                    <div class="mce-setting-item">
                                        <label class="mce-setting-label">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <polyline points="4 7 4 4 20 4 20 7"></polyline>
                                                <line x1="9" y1="20" x2="15" y2="20"></line>
                                                <line x1="12" y1="4" x2="12" y2="20"></line>
                                            </svg>
                                            ${t('syntaxMode') || '语法模式'}
                                        </label>
                                        <div class="mce-setting-control">
                                            <select id="edit-preset-syntax-mode" class="mce-setting-select">
                                                <option value="attention_couple" ${syntaxMode === 'attention_couple' ? 'selected' : ''}>Attention Couple</option>
                                                <option value="regional_prompts" ${syntaxMode === 'regional_prompts' ? 'selected' : ''}>Regional Prompts</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                
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
                this.closeModal('edit');
            });
        }

        // 取消按钮
        const cancelBtn = document.getElementById('edit-preset-cancel');
        if (cancelBtn && !cancelBtn.dataset.bound) {
            cancelBtn.dataset.bound = 'true';
            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeModal('edit');
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
                this.closeModal('edit');
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
                    this.closeModal('edit');
                }
            });
        }

        // 绑定角色列表和全局提示词点击事件
        this.bindPresetCharacterListEvents(presetId);
        this.bindGlobalPromptEvents(presetId);

        // 绑定语法模式变化事件
        this.bindSyntaxModeEvents(presetId);

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
            this.closeModal('global');
        });

        // 取消按钮
        document.getElementById('global-prompt-cancel').addEventListener('click', () => {
            this.closeModal('global');
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
                this.closeModal('global');
                this.toastManager.showToast(t('globalPromptSaved') || '全局提示词已保存', 'success');
            }
        });

        // 点击遮罩关闭
        document.getElementById('global-prompt-modal-overlay').addEventListener('click', (e) => {
            if (e.target.id === 'global-prompt-modal-overlay') {
                this.closeModal('global');
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
        const weightInput = document.getElementById('edit-character-weight-input');
        const featherInput = document.getElementById('edit-character-feather-input');
        const syntaxTypeSelect = document.getElementById('edit-character-syntax-type');
        const syntaxModeSelect = document.getElementById('edit-preset-syntax-mode');

        if (noteInput || promptInput) {
            // 临时保存到预设数据中（不触发保存到服务器）
            const character = preset.characters[currentCharacterIndex];
            if (noteInput) character.name = noteInput.value.trim();
            if (promptInput) character.prompt = promptInput.value.trim();

            // 保存权重、羽化和语法类型
            if (weightInput) character.weight = parseFloat(weightInput.value) || 1.0;
            if (featherInput) character.feather = parseInt(featherInput.value) || 0;
            // 根据语法模式设置语法类型
            const syntaxMode = preset.syntax_mode || 'attention_couple';
            if (syntaxMode === 'attention_couple') {
                character.syntax_type = 'COUPLE';
            } else if (syntaxTypeSelect) {
                character.syntax_type = syntaxTypeSelect.value;
            }
        }

        // 同时保存全局提示词
        if (globalPromptInput) {
            preset.global_prompt = globalPromptInput.value.trim();
        }

        // 保存语法模式
        if (syntaxModeSelect) {
            preset.syntax_mode = syntaxModeSelect.value;
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
        const syntaxTypeSelect = document.getElementById('edit-character-syntax-type');

        if (noteInput) noteInput.value = character.name || ''; // 备注显示角色名称
        if (promptInput) promptInput.value = character.prompt || '';

        // 更新语法类型
        if (syntaxTypeSelect) {
            syntaxTypeSelect.value = character.syntax_type || 'COUPLE';
        }

        // 🔧 修复：同时更新全局提示词
        if (globalPromptInput) {
            globalPromptInput.value = preset.global_prompt || '';
        }
    }

    /**
     * 绑定预设角色编辑面板事件
     */
    bindPresetCharacterEditEvents(presetId, characterIndex) {
        // 权重滑块和输入框同步
        const weightSlider = document.getElementById('edit-character-weight');
        const weightInput = document.getElementById('edit-character-weight-input');

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
        const featherSlider = document.getElementById('edit-character-feather');
        const featherInput = document.getElementById('edit-character-feather-input');

        if (featherSlider && featherInput) {
            featherSlider.addEventListener('input', () => {
                featherInput.value = featherSlider.value;
            });

            featherInput.addEventListener('input', () => {
                const value = parseFloat(featherInput.value);
                if (!isNaN(value) && value >= 0 && value <= 50) {
                    featherSlider.value = value;
                }
            });
        }
    }


    /**
     * 保存预设角色
     */
    savePresetCharacter(presetId, characterIndex) {
        const noteInput = document.getElementById('edit-character-note');
        const promptInput = document.getElementById('edit-character-prompt');
        const weightInput = document.getElementById('edit-character-weight-input');
        const featherInput = document.getElementById('edit-character-feather-input');
        const syntaxTypeSelect = document.getElementById('edit-character-syntax-type');

        if (!noteInput || !promptInput) return;

        const preset = this.presets.find(p => p.id === presetId);
        if (!preset || !preset.characters || !preset.characters[characterIndex]) return;

        const character = preset.characters[characterIndex];
        character.name = noteInput.value.trim(); // 备注就是角色名称
        character.note = noteInput.value.trim(); // 同时保存到note字段以保持兼容性
        character.prompt = promptInput.value.trim();

        // 保存权重、羽化和语法类型
        if (weightInput) character.weight = parseFloat(weightInput.value) || 1.0;
        if (featherInput) character.feather = parseInt(featherInput.value) || 0;

        // 根据语法模式设置语法类型
        const syntaxMode = preset.syntax_mode || 'attention_couple';
        if (syntaxMode === 'attention_couple') {
            character.syntax_type = 'COUPLE';
        } else if (syntaxTypeSelect) {
            character.syntax_type = syntaxTypeSelect.value;
        }

        // 同时保存全局提示词到预设
        const globalPromptInput = document.getElementById('edit-global-prompt');
        if (globalPromptInput) {
            preset.global_prompt = globalPromptInput.value.trim();
        }

        // 保存语法模式
        const syntaxModeSelect = document.getElementById('edit-preset-syntax-mode');
        if (syntaxModeSelect) {
            preset.syntax_mode = syntaxModeSelect.value;
        }

        // 保存到本地存储
        this.savePresetToLocalStorage(preset);

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

        // 获取当前编辑器的配置，以确保保存语法模式和全局FILL状态
        const editorConfig = this.editor.dataManager.getConfig();
        const globalUseFill = editorConfig.global_use_fill || false;
        const syntaxMode = preset.syntax_mode || editorConfig.syntax_mode || 'attention_couple';

        // 确保角色数据包含语法类型
        const characters = preset.characters ? preset.characters.map(char => ({
            ...char,
            syntax_type: char.syntax_type || (syntaxMode === 'regional_prompts' ? 'REGION' : 'COUPLE'),
            weight: char.weight || 1.0,
            feather: char.feather || 0
        })) : [];

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
                    characters: characters,
                    global_prompt: globalPrompt,
                    global_use_fill: globalUseFill,
                    syntax_mode: syntaxMode,
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

                // 重新应用搜索过滤
                this.searchPresets(this.searchQuery);

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
            this.closeModal('management');
        }, 100);
    }

    /**
     * 显示预设工具提示
     */
    showPresetTooltip(e, preset) {
        // 立即隐藏所有现有的悬浮提示，防止多个同时出现
        this.hidePresetTooltipImmediate();

        // 清除可能存在的隐藏定时器
        if (this.tooltipHideTimer) {
            clearTimeout(this.tooltipHideTimer);
            this.tooltipHideTimer = null;
        }

        const tooltip = document.createElement('div');
        tooltip.className = 'mce-preset-tooltip';
        tooltip.id = 'mce-preset-tooltip';

        let imageHTML = '';
        if (preset.preview_image) {
            imageHTML = `<img src="${preset.preview_image}" alt="Preview" class="mce-tooltip-image" />`;
        } else {
            imageHTML = `<div class="mce-tooltip-no-preview"><span>暂无预览</span></div>`;
        }

        // 只显示预览图，不显示提示词
        tooltip.innerHTML = `
            <div class="mce-tooltip-content">
                <div class="mce-tooltip-image-container">${imageHTML}</div>
            </div>
        `;

        document.body.appendChild(tooltip);

        // 定位工具提示
        const rect = e.currentTarget.getBoundingClientRect();
        tooltip.style.left = `${e.clientX + 15}px`;
        tooltip.style.top = `${e.clientY + 15}px`;

        // 调整位置，避免超出屏幕
        const tooltipRect = tooltip.getBoundingClientRect();
        if (tooltipRect.right > window.innerWidth) {
            tooltip.style.left = `${window.innerWidth - tooltipRect.width - 10}px`;
        }
        if (tooltipRect.bottom > window.innerHeight) {
            tooltip.style.top = `${window.innerHeight - tooltipRect.height - 10}px`;
        }

        // 添加鼠标进入工具提示的事件，防止鼠标移入工具提示时它消失
        tooltip.addEventListener('mouseenter', () => {
            if (this.tooltipHideTimer) {
                clearTimeout(this.tooltipHideTimer);
                this.tooltipHideTimer = null;
            }
        });

        // 添加鼠标离开工具提示的事件
        tooltip.addEventListener('mouseleave', () => {
            this.hidePresetTooltip();
        });
    }

    /**
     * 立即隐藏所有悬浮提示
     */
    hidePresetTooltipImmediate() {
        // 清除可能存在的隐藏定时器
        if (this.tooltipHideTimer) {
            clearTimeout(this.tooltipHideTimer);
            this.tooltipHideTimer = null;
        }

        // 移除所有悬浮提示，而不仅仅是通过ID查找的那个
        const tooltips = document.querySelectorAll('.mce-preset-tooltip');
        tooltips.forEach(tooltip => tooltip.remove());
    }

    /**
     * 隐藏预设工具提示
     */
    hidePresetTooltip() {
        // 使用定时器延迟隐藏，这样可以防止鼠标快速移动时工具提示闪烁
        if (this.tooltipHideTimer) {
            clearTimeout(this.tooltipHideTimer);
        }

        this.tooltipHideTimer = setTimeout(() => {
            this.hidePresetTooltipImmediate();
        }, 50); // 50ms延迟，足够短不会让用户感觉到延迟，但足够长防止闪烁
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
     * @param {string} modalType - 要关闭的模态框类型: 'all'(默认), 'management', 'edit', 'save', 'global'
     */
    closeModal(modalType = 'all') {
        // 立即隐藏悬浮提示
        this.hidePresetTooltipImmediate();

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

        // 根据modalType选择要关闭的模态框
        let selectors = [];
        switch (modalType) {
            case 'management':
                selectors = ['#preset-modal-overlay'];
                break;
            case 'edit':
                selectors = ['#edit-preset-modal-overlay'];
                break;
            case 'save':
                selectors = ['#save-preset-modal-overlay'];
                break;
            case 'global':
                selectors = ['#global-prompt-modal-overlay'];
                break;
            case 'all':
            default:
                selectors = ['.mce-preset-modal-wrapper', '.mce-preset-modal-overlay', '.mce-edit-preset-container', '.mce-save-preset-container'];
                break;
        }

        // 移除指定的模态框
        selectors.forEach(selector => {
            const modals = document.querySelectorAll(selector);
            modals.forEach(modal => {
                modal.remove();
            });
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

            .mce-preset-search-container {
                margin-bottom: 16px;
            }

            .mce-preset-search-box {
                position: relative;
                display: flex;
                align-items: center;
                background: rgba(26, 26, 38, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 8px;
                padding: 8px 12px;
                transition: all 0.2s ease;
            }

            .mce-preset-search-box:focus-within {
                border-color: #7c3aed;
                box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.2);
            }

            .mce-preset-search-box svg {
                color: rgba(224, 224, 224, 0.5);
                margin-right: 8px;
                flex-shrink: 0;
            }

            .mce-preset-search-input {
                background: none;
                border: none;
                outline: none;
                color: #E0E0E0;
                font-size: 14px;
                flex: 1;
                padding: 0;
            }

            .mce-preset-search-input::placeholder {
                color: rgba(224, 224, 224, 0.4);
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
                margin-bottom: 8px; /* 减小上下间距 */
            }

            .mce-preset-item:hover {
                border-color: rgba(124, 58, 237, 0.5);
                box-shadow: 0 4px 12px rgba(124, 58, 237, 0.2);
                transform: translateY(-2px);
            }

            .mce-preset-item-info {
                padding: 10px; /* 减小内边距 */
                display: flex;
                flex-direction: column;
                gap: 6px; /* 减小元素间距 */
            }

            .mce-preset-item-name {
                margin: 0;
                font-size: 14px;
                font-weight: 600;
                color: #E0E0E0;
            }

            .mce-preset-item-prompt {
                font-size: 12px;
                color: rgba(224, 224, 224, 0.7);
                line-height: 1.4;
                word-break: break-word;
                overflow: hidden;
                display: -webkit-box;
                -webkit-line-clamp: 3;
                -webkit-box-orient: vertical;
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

            /* 工具提示样式 */
            .mce-preset-tooltip {
                position: fixed;
                background-color: #181818;
                border: 1px solid #555;
                color: #eee;
                padding: 0;
                border-radius: 8px;
                z-index: 10010;
                font-size: 13px;
                max-width: 200px; /* 减小最大宽度，使预览图更窄更高 */
                word-wrap: break-word;
                pointer-events: none;
                animation: mce-tooltip-fade-in 0.15s ease-out;
                box-shadow: 0 5px 15px rgba(0,0,0,0.5);
                display: flex;
            }

            .mce-tooltip-content {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 5px; /* 减小内边距 */
                gap: 0; /* 减小间隙 */
            }

            .mce-tooltip-image-container {
                width: 190px; /* 设置固定宽度 */
                height: 280px; /* 设置固定高度，形成竖着的长方形 */
                max-width: 190px;
                max-height: 280px;
                overflow: hidden;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(26, 26, 38, 0.6);
                border-radius: 6px;
            }

            .mce-tooltip-image {
                width: 100%;
                height: 100%;
                object-fit: cover; /* 使用cover填满整个容器 */
                border-radius: 6px;
            }

            .mce-tooltip-no-preview {
                color: rgba(224, 224, 224, 0.4);
                text-align: center;
                padding: 20px;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            @keyframes mce-tooltip-fade-in {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            /* 预设设置区域样式 */
            .mce-preset-settings-section {
                background: rgba(58, 58, 78, 0.4);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 16px;
            }
            
            .mce-settings-section-title {
                margin: 0 0 12px 0;
                font-size: 14px;
                font-weight: 600;
                color: #b794f4;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .mce-setting-item {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 8px;
            }
            
            .mce-setting-label {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 13px;
                color: rgba(224, 224, 224, 0.8);
                min-width: 100px;
            }
            
            .mce-setting-control {
                flex: 1;
            }
            
            .mce-setting-select {
                width: 100%;
                padding: 6px 10px;
                background: rgba(26, 26, 38, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 6px;
                color: #E0E0E0;
                font-size: 13px;
            }
            
            .mce-setting-select:focus {
                outline: none;
                border-color: #7c3aed;
                box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.2);
            }
            
            /* 参数设置区域样式 */
            .mce-preset-params-section {
                background: rgba(58, 58, 78, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                padding: 12px;
                margin-top: 16px;
            }
            
            .mce-params-section-title {
                margin: 0 0 12px 0;
                font-size: 14px;
                font-weight: 600;
                color: #b794f4;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .mce-param-item {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 10px; /* 减小间距 */
            }
            
            .mce-param-label {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 13px;
                color: rgba(224, 224, 224, 0.8);
                min-width: 80px;
                justify-content: flex-start; /* 确保文本左对齐 */
            }
            
            .mce-param-control {
                flex: 1;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .mce-param-number {
                width: 70px;
                padding: 4px 8px;
                background: rgba(26, 26, 38, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 4px;
                color: #E0E0E0;
                font-size: 12px;
                text-align: center;
            }
            
            .mce-param-number:focus {
                outline: none;
                border-color: #7c3aed;
            }
            
            .mce-param-select {
                flex: 1;
                padding: 4px 8px;
                background: rgba(26, 26, 38, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 4px;
                color: #E0E0E0;
                font-size: 12px;
            }
            
            .mce-param-select:focus {
                outline: none;
                border-color: #7c3aed;
            }
            
            /* 滑块样式 */
            input[type="range"] {
                flex: 1;
                height: 4px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 2px;
                outline: none;
                -webkit-appearance: none;
            }
            
            input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 16px;
                height: 16px;
                background: #7c3aed;
                border-radius: 50%;
                cursor: pointer;
            }
            
            input[type="range"]::-moz-range-thumb {
                width: 16px;
                height: 16px;
                background: #7c3aed;
                border-radius: 50%;
                cursor: pointer;
                border: none;
            }
            
            /* 预设项新样式 */
            .mce-preset-item-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 8px;
            }
            
            .mce-preset-syntax-mode {
                font-size: 11px;
                padding: 2px 6px;
                background: rgba(124, 58, 237, 0.2);
                border: 1px solid rgba(124, 58, 237, 0.3);
                border-radius: 4px;
                color: #b794f4;
                font-weight: 500;
            }
            
            .mce-preset-item-content {
                margin-top: 8px;
            }
            
            .mce-preset-content-list {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            
            .mce-preset-content-item {
                display: flex;
                flex-direction: column;
                gap: 4px;
                padding: 6px 8px;
                background: rgba(26, 26, 38, 0.4);
                border-radius: 6px;
                border-left: 3px solid transparent;
            }
            
            .mce-preset-content-item.mce-global-item {
                border-left-color: #7c3aed;
            }
            
            .mce-preset-content-item.mce-character-item {
                border-left-color: #10b981;
            }
            
            .mce-preset-item-label {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 12px;
                font-weight: 600;
                color: rgba(224, 224, 224, 0.9);
            }
            
            .mce-preset-item-details {
                display: flex;
                flex-direction: column;
                gap: 4px;
                margin-left: 18px;
            }
            
            .mce-preset-item-text {
                font-size: 11px;
                color: rgba(224, 224, 224, 0.7);
                line-height: 1.3;
                word-break: break-word;
            }
            
            .mce-preset-item-params {
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
                margin-top: 2px;
            }
            
            .mce-param-tag {
                font-size: 10px;
                padding: 1px 4px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
                color: rgba(224, 224, 224, 0.8);
            }
            
            .mce-preset-content-separator {
                height: 1px;
                background: rgba(255, 255, 255, 0.1);
                margin: 4px 0;
            }
            
            .mce-preset-empty-content {
                font-size: 12px;
                color: rgba(224, 224, 224, 0.5);
                font-style: italic;
                text-align: center;
                padding: 8px;
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * 绑定语法模式事件
     */
    bindSyntaxModeEvents(presetId) {
        const syntaxModeSelect = document.getElementById('edit-preset-syntax-mode');
        if (syntaxModeSelect) {
            syntaxModeSelect.addEventListener('change', (e) => {
                const newSyntaxMode = e.target.value;
                const preset = this.presets.find(p => p.id === presetId);
                if (preset) {
                    preset.syntax_mode = newSyntaxMode;

                    // 如果语法模式改变，需要更新所有角色的语法类型选项
                    this.updateCharacterSyntaxTypeOptions(preset, newSyntaxMode);

                    // 重新渲染编辑表单以显示/隐藏语法类型选项
                    const activeCharItem = document.querySelector('.mce-edit-preset-char-item.active');
                    if (activeCharItem) {
                        const activeIndex = parseInt(activeCharItem.dataset.characterId);
                        // 重新渲染编辑面板
                        const editPanel = document.getElementById('edit-preset-edit-panel');
                        if (editPanel) {
                            editPanel.innerHTML = this.renderPresetCharacterEditForm(preset, activeIndex);
                            // 重新绑定编辑面板事件
                            this.bindPresetCharacterEditEvents(presetId, activeIndex);
                            // 更新表单内容
                            this.updateEditForm(preset, activeIndex);
                        }
                    }

                    // 立即保存语法模式更改到本地存储
                    this.savePresetToLocalStorage(preset);
                }
            });
        }
    }

    /**
     * 更新角色语法类型选项
     */
    updateCharacterSyntaxTypeOptions(preset, syntaxMode) {
        const isRegionalMode = syntaxMode === 'regional_prompts';

        // 更新所有角色的语法类型
        if (preset.characters) {
            preset.characters.forEach(character => {
                // 如果切换到Regional模式且当前语法类型不是REGION或MASK，则设置为REGION
                if (isRegionalMode && character.syntax_type !== 'REGION' && character.syntax_type !== 'MASK') {
                    character.syntax_type = 'REGION';
                }
                // 如果切换到Attention模式，固定使用COUPLE
                else if (!isRegionalMode) {
                    character.syntax_type = 'COUPLE';
                }
            });
        }
    }

    /**
     * 获取语法模式显示文本
     */
    getSyntaxModeDisplay(syntaxMode) {
        const mode = syntaxMode || 'attention_couple';
        switch (mode) {
            case 'attention_couple':
                return 'Attention Couple';
            case 'regional_prompts':
                return 'Regional Prompts';
            default:
                return 'Attention Couple';
        }
    }

    /**
     * 渲染预设内容预览
     */
    renderPresetContentPreview(preset) {
        let content = '';

        // 显示全局提示词（如果有）
        if (preset.global_prompt) {
            const globalPreview = preset.global_prompt.length > 50 ?
                preset.global_prompt.substring(0, 50) + '...' :
                preset.global_prompt;
            content += `
                <div class="mce-preset-content-item mce-global-item">
                    <div class="mce-preset-item-label">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M12 8v8m-4-4h8"></path>
                        </svg>
                        ${this.languageManager.t('globalPrompt') || '全局提示词'}
                    </div>
                    <div class="mce-preset-item-text">${this.escapeHtml(globalPreview)}</div>
                </div>
            `;
        }

        // 显示角色列表（如果有）
        if (preset.characters && preset.characters.length > 0) {
            const charList = preset.characters
                .map((char, index) => {
                    const name = char.name || `角色 ${index + 1}`;
                    const prompt = char.prompt || '';
                    const preview = prompt.length > 30 ? prompt.substring(0, 30) + '...' : prompt;
                    const weight = char.weight || 1.0;
                    const feather = char.feather || 0;
                    const syntaxType = char.syntax_type || 'MASK';

                    return `
                        <div class="mce-preset-content-item mce-character-item">
                            <div class="mce-preset-item-label">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                ${this.escapeHtml(name)}
                            </div>
                            <div class="mce-preset-item-details">
                                <div class="mce-preset-item-text">${this.escapeHtml(preview) || '(无提示词)'}</div>
                                <div class="mce-preset-item-params">
                                    <span class="mce-param-tag">${syntaxType}</span>
                                    <span class="mce-param-tag">权重: ${weight.toFixed(1)}</span>
                                    ${feather > 0 ? `<span class="mce-param-tag">羽化: ${feather}px</span>` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                })
                .join('');

            if (content) content += '<div class="mce-preset-content-separator"></div>';
            content += charList;
        }

        return `
            <div class="mce-preset-content-list">
                ${content || '<div class="mce-preset-empty-content">无内容</div>'}
            </div>
        `;
    }

    /**
     * 保存预设到本地存储
     */
    savePresetToLocalStorage(preset) {
        try {
            // 获取当前存储的预设列表
            const storedPresets = localStorage.getItem('mce_presets');
            let presets = storedPresets ? JSON.parse(storedPresets) : [];

            // 找到并更新对应的预设
            const index = presets.findIndex(p => p.id === preset.id);
            if (index !== -1) {
                presets[index] = preset;
            } else {
                presets.push(preset);
            }

            // 保存回本地存储
            localStorage.setItem('mce_presets', JSON.stringify(presets));
        } catch (error) {
            console.error('保存预设到本地存储失败:', error);
        }
    }
}

// 导出
export { PresetManager };

