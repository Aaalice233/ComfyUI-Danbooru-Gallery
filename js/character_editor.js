// 角色编辑器组件
class CharacterEditor {
    constructor(editor) {
        this.editor = editor;
        this.container = editor.container.querySelector('.mce-character-editor');
        this.characters = [];
        this.templates = [];
        this.draggedElement = null;
        this.init();
    }

    init() {
        this.createLayout();
        this.bindEvents();
        this.loadTemplates();

        // 设置全局引用
        window.characterEditor = this;
    }

    createLayout() {
        this.container.innerHTML = `
            <div class="mce-character-header">
                <h3 class="mce-character-title">角色编辑</h3>
                <div class="mce-character-actions">
                    <button id="mce-add-character" class="mce-button mce-button-primary">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        添加角色
                    </button>
                    <button id="mce-template-button" class="mce-button">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="9" y1="9" x2="15" y2="9"></line>
                            <line x1="9" y1="15" x2="15" y2="15"></line>
                        </svg>
                        模板
                    </button>
                </div>
            </div>
            <div class="mce-character-list" id="mce-character-list">
                <!-- 角色列表将在这里动态生成 -->
            </div>
        `;

        this.addStyles();
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .mce-character-editor {
                width: 300px;
                background: #333333;
                border-right: 1px solid #555555;
                display: flex;
                flex-direction: column;
            }
            
            .mce-character-header {
                padding: 12px 16px;
                border-bottom: 1px solid #555555;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-shrink: 0;
            }
            
            .mce-character-title {
                margin: 0;
                font-size: 14px;
                font-weight: 600;
                color: #E0E0E0;
            }
            
            .mce-character-actions {
                display: flex;
                gap: 8px;
            }
            
            .mce-button {
                padding: 6px 12px;
                background: #404040;
                border: 1px solid #555555;
                border-radius: 4px;
                color: #E0E0E0;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s;
            }
            
            .mce-button:hover {
                background: #4a4a4a;
                border-color: #0288D1;
            }
            
            .mce-button-primary {
                background: #0288D1;
                border-color: #0288D1;
            }
            
            .mce-button-primary:hover {
                background: #0288D1;
            }
            
            .mce-character-list {
                flex: 1;
                overflow-y: auto;
                padding: 8px;
                min-height: 200px;
            }
            
            .mce-character-item {
                background: #2a2a2a;
                border: 1px solid #555555;
                border-radius: 6px;
                margin-bottom: 8px;
                padding: 12px;
                cursor: pointer;
                transition: all 0.2s;
                position: relative;
            }
            
            .mce-character-item:hover {
                background: #3a3a3a;
                border-color: #0288D1;
            }
            
            .mce-character-item.selected {
                background: var(--mce-primary-color, #0288D1);
                border-color: var(--mce-primary-color, #0288D1);
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
                margin-bottom: 8px;
            }
            
            .mce-character-name {
                font-weight: 600;
                color: #E0E0E0;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .mce-character-color {
                width: 16px;
                height: 16px;
                border-radius: 50%;
                border: 2px solid #555555;
            }
            
            .mce-character-item.selected .mce-character-color {
                border-color: #ffffff;
            }
            
            .mce-character-controls {
                display: flex;
                gap: 4px;
            }
            
            .mce-character-control {
                width: 24px;
                height: 24px;
                border: none;
                background: transparent;
                color: #B0B0B0;
                cursor: pointer;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }
            
            .mce-character-control:hover {
                background: rgba(255, 255, 255, 0.1);
                color: #E0E0E0;
            }
            
            .mce-character-prompt {
                font-size: 12px;
                color: #B0B0B0;
                line-height: 1.4;
                margin-bottom: 8px;
                overflow: hidden;
                text-overflow: ellipsis;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
            }
            
            .mce-character-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 11px;
                color: #888888;
            }
            
            .mce-character-weight {
                display: flex;
                align-items: center;
                gap: 4px;
            }
            
            .mce-character-properties {
                border-top: 1px solid #555555;
                padding: 16px;
                background: #2a2a2a;
                max-height: 300px;
                overflow-y: auto;
            }
            
            .mce-empty-state {
                text-align: center;
                color: #888888;
                font-style: italic;
                padding: 20px;
            }
            
            .mce-property-group {
                margin-bottom: 16px;
            }
            
            .mce-property-label {
                display: block;
                margin-bottom: 4px;
                font-size: 12px;
                color: #B0B0B0;
                font-weight: 500;
            }
            
            .mce-property-input {
                width: 100%;
                padding: 6px 8px;
                background: #404040;
                border: 1px solid #555555;
                border-radius: 4px;
                color: #E0E0E0;
                font-size: 12px;
                box-sizing: border-box;
            }
            
            .mce-property-input:focus {
                outline: none;
                border-color: #0288D1;
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
                gap: 8px;
            }
            
            .mce-property-slider input[type="range"] {
                flex: 1;
            }
            
            .mce-property-slider-value {
                min-width: 40px;
                text-align: right;
                font-size: 12px;
                color: #B0B0B0;
            }
            
            .mce-property-color {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .mce-property-color input[type="color"] {
                width: 40px;
                height: 30px;
                border: 1px solid #555555;
                border-radius: 4px;
                background: transparent;
                cursor: pointer;
            }
            
            .mce-property-color-hex {
                flex: 1;
            }
            
            .mce-template-dropdown {
                position: fixed;
                background: #2a2a2a;
                border: 1px solid #555555;
                border-radius: 6px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
                z-index: 1000;
                max-height: 300px;
                overflow-y: auto;
                display: none;
            }
            
            .mce-template-item {
                padding: 12px 16px;
                cursor: pointer;
                border-bottom: 1px solid #404040;
                transition: background 0.2s;
            }
            
            .mce-template-item:hover {
                background: #404040;
            }
            
            .mce-template-item:last-child {
                border-bottom: none;
            }
            
            .mce-template-name {
                font-weight: 600;
                color: #E0E0E0;
                margin-bottom: 4px;
            }
            
            .mce-template-description {
                font-size: 11px;
                color: #888888;
                margin-bottom: 4px;
            }
            
            .mce-template-prompt {
                font-size: 12px;
                color: #B0B0B0;
                font-style: italic;
            }
        `;
        document.head.appendChild(style);
    }

    bindEvents() {
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

                // 模板按钮
                const templateBtn = document.getElementById('mce-template-button');
                if (templateBtn) {
                    templateBtn.addEventListener('click', (e) => {
                        this.showTemplateDropdown(e.target);
                    });
                }

                // 点击其他地方关闭模板下拉菜单
                document.addEventListener('click', (e) => {
                    if (!e.target.closest('#mce-template-button') && !e.target.closest('.mce-template-dropdown')) {
                        this.hideTemplateDropdown();
                    }
                });

            } catch (error) {
                console.error("绑定CharacterEditor事件时发生错误:", error);
            }
        }, 100); // 延迟100ms确保DOM完全渲染
    }

    async loadTemplates() {
        try {
            this.templates = this.editor.getTemplates();
        } catch (error) {
            console.error('加载模板失败:', error);
            this.templates = [];
        }
    }

    addCharacter(template = null) {
        try {
            const characterData = template ? {
                name: template.name,
                prompt: template.prompt,
                weight: template.weight,
                color: template.color,
                template: template.name
            } : null;

            if (!this.editor || !this.editor.dataManager) {
                console.error('编辑器或数据管理器不存在');
                return;
            }

            const character = this.editor.dataManager.addCharacter(characterData);

            this.renderCharacterList();

            this.selectCharacter(character.id);

        } catch (error) {
            console.error("addCharacter() 发生错误:", error);
        }
    }

    deleteCharacter(characterId) {
        if (confirm('确定要删除这个角色吗？')) {
            // 先删除对应的蒙版
            if (this.editor.components.maskEditor) {
                this.editor.components.maskEditor.deleteMask(characterId);
            }

            // 然后删除角色
            this.editor.dataManager.deleteCharacter(characterId);
            this.renderCharacterList();
            this.clearProperties();

            // 强制重新渲染蒙版编辑器
            if (this.editor.components.maskEditor) {
                this.editor.components.maskEditor.scheduleRender();
            }
        }
    }

    toggleCharacterEnabled(characterId) {
        const character = this.editor.dataManager.getCharacter(characterId);
        if (character) {
            this.editor.dataManager.updateCharacter(characterId, {
                enabled: !character.enabled
            });
            this.renderCharacterList();
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
        modal.innerHTML = `
            <div class="mce-edit-modal-content">
                <div class="mce-edit-modal-header">
                    <h3>编辑角色</h3>
                    <button class="mce-modal-close" onclick="this.closest('.mce-edit-modal').remove()">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="mce-edit-modal-body">
                    <div class="mce-property-group">
                        <label class="mce-property-label">角色名称</label>
                        <input type="text" class="mce-property-input" id="mce-modal-char-name" value="${character.name}">
                    </div>
                    
                    <div class="mce-property-group">
                        <label class="mce-property-label">提示词</label>
                        <textarea class="mce-property-input mce-property-textarea" id="mce-modal-char-prompt">${character.prompt}</textarea>
                    </div>
                    
                    <div class="mce-property-group">
                        <label class="mce-property-checkbox">
                            <input type="checkbox" id="mce-modal-char-enabled" ${character.enabled ? 'checked' : ''}>
                            启用角色
                        </label>
                    </div>
                    
                    <div class="mce-property-group">
                        <label class="mce-property-label">权重</label>
                        <div class="mce-property-slider">
                            <input type="range" id="mce-modal-char-weight" min="0.1" max="2.0" step="0.1" value="${character.weight}">
                            <span class="mce-property-slider-value">${character.weight.toFixed(1)}</span>
                        </div>
                    </div>
                    
                    <div class="mce-property-group">
                        <label class="mce-property-label">颜色</label>
                        <div class="mce-property-color">
                            <input type="color" id="mce-modal-char-color" value="${character.color}">
                            <input type="text" class="mce-property-input mce-property-color-hex" id="mce-modal-char-color-hex" value="${character.color}">
                        </div>
                    </div>
                </div>
                <div class="mce-edit-modal-footer">
                    <button class="mce-button" onclick="this.closest('.mce-edit-modal').remove()">取消</button>
                    <button class="mce-button mce-button-primary" id="mce-modal-save">保存</button>
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
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                
                .mce-edit-modal-content {
                    background: #2a2a2a;
                    border-radius: 8px;
                    width: 90%;
                    max-width: 500px;
                    max-height: 80vh;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }
                
                .mce-edit-modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px 20px;
                    border-bottom: 1px solid #555;
                }
                
                .mce-edit-modal-header h3 {
                    margin: 0;
                    color: #E0E0E0;
                }
                
                .mce-modal-close {
                    background: transparent;
                    border: none;
                    color: #B0B0B0;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .mce-modal-close:hover {
                    background: rgba(255, 255, 255, 0.1);
                    color: #E0E0E0;
                }
                
                .mce-edit-modal-body {
                    padding: 20px;
                    overflow-y: auto;
                    flex: 1;
                }
                
                .mce-edit-modal-footer {
                    display: flex;
                    justify-content: flex-end;
                    gap: 8px;
                    padding: 16px 20px;
                    border-top: 1px solid #555;
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
        // 权重滑块
        const weightSlider = document.getElementById('mce-modal-char-weight');
        const weightValue = document.querySelector('.mce-property-slider-value');

        weightSlider.addEventListener('input', () => {
            const weight = parseFloat(weightSlider.value);
            weightValue.textContent = weight.toFixed(1);
        });

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
        const listContainer = document.getElementById('mce-character-list');
        const characters = this.editor.dataManager.getCharacters();

        if (characters.length === 0) {
            listContainer.innerHTML = `
                <div class="mce-empty-state">
                    <p>还没有角色</p>
                    <p>点击"添加角色"开始创建</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = characters.map(character => `
            <div class="mce-character-item ${!character.enabled ? 'disabled' : ''}"
                 data-character-id="${character.id}"
                 draggable="true">
                <div class="mce-character-item-header">
                    <div class="mce-character-name">
                        <div class="mce-character-color" style="background-color: ${character.color}"></div>
                        <span>${character.name}</span>
                    </div>
                    <div class="mce-character-controls">
                        <button class="mce-character-control" onclick="characterEditor.toggleCharacterEnabled('${character.id}')" title="${character.enabled ? '禁用' : '启用'}">
                            ${character.enabled ?
                `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>` :
                `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                    <line x1="1" y1="1" x2="23" y2="23"></line>
                                </svg>`
            }
                        </button>
                        <button class="mce-character-control" onclick="characterEditor.editCharacter('${character.id}')" title="编辑">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="mce-character-control" onclick="characterEditor.deleteCharacter('${character.id}')" title="删除">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3,6 5,6 21,6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="mce-character-prompt">${character.prompt}</div>
                <div class="mce-character-info">
                    <div class="mce-character-weight">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M12 6v6l4 2"></path>
                        </svg>
                        ${character.weight.toFixed(1)}
                    </div>
                    <div class="mce-character-position">
                        #${character.position + 1}
                    </div>
                </div>
            </div>
        `).join('');

        // 绑定角色项事件
        listContainer.querySelectorAll('.mce-character-item').forEach(item => {
            const characterId = item.dataset.characterId;

            // 点击选择角色
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.mce-character-controls')) {
                    this.selectCharacter(characterId);
                }
            });

            // 拖拽事件
            item.addEventListener('dragstart', (e) => {
                this.draggedElement = item;
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', item.innerHTML);
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                this.draggedElement = null;
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';

                if (this.draggedElement && this.draggedElement !== item) {
                    const rect = item.getBoundingClientRect();
                    const midpoint = rect.top + rect.height / 2;

                    if (e.clientY < midpoint) {
                        item.style.borderTop = '2px solid #8D6E63';
                        item.style.borderBottom = '';
                    } else {
                        item.style.borderBottom = '2px solid #8D6E63';
                        item.style.borderTop = '';
                    }
                }
            });

            item.addEventListener('dragleave', () => {
                item.style.borderTop = '';
                item.style.borderBottom = '';
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                item.style.borderTop = '';
                item.style.borderBottom = '';

                if (this.draggedElement && this.draggedElement !== item) {
                    const draggedId = this.draggedElement.dataset.characterId;
                    const targetId = item.dataset.characterId;

                    const draggedIndex = characters.findIndex(c => c.id === draggedId);
                    const targetIndex = characters.findIndex(c => c.id === targetId);

                    if (draggedIndex !== -1 && targetIndex !== -1) {
                        this.editor.dataManager.reorderCharacters(draggedIndex, targetIndex);
                        this.renderCharacterList();
                    }
                }
            });
        });
    }



    clearProperties() {
        document.querySelectorAll('.mce-character-item').forEach(item => {
            item.classList.remove('selected');
        });
    }

    showTemplateDropdown(button) {
        // 隐藏现有下拉菜单
        this.hideTemplateDropdown();

        const dropdown = document.createElement('div');
        dropdown.className = 'mce-template-dropdown';

        if (this.templates.length === 0) {
            dropdown.innerHTML = '<div class="mce-template-item">没有可用模板</div>';
        } else {
            dropdown.innerHTML = this.templates.map(template => `
                <div class="mce-template-item" data-template-name="${template.name}">
                    <div class="mce-template-name">${template.name}</div>
                    ${template.description ? `<div class="mce-template-description">${template.description}</div>` : ''}
                    <div class="mce-template-prompt">${template.prompt}</div>
                </div>
            `).join('');

            // 绑定模板选择事件
            dropdown.querySelectorAll('.mce-template-item').forEach(item => {
                item.addEventListener('click', () => {
                    const templateName = item.dataset.templateName;
                    const template = this.templates.find(t => t.name === templateName);
                    if (template) {
                        this.addCharacter(template);
                    }
                    this.hideTemplateDropdown();
                });
            });
        }

        // 定位下拉菜单
        const rect = button.getBoundingClientRect();
        dropdown.style.top = `${rect.bottom + 2}px`;
        dropdown.style.left = `${rect.left}px`;
        dropdown.style.width = `${rect.width}px`;
        dropdown.style.display = 'block';

        document.body.appendChild(dropdown);
    }

    hideTemplateDropdown() {
        const dropdown = document.querySelector('.mce-template-dropdown');
        if (dropdown) {
            dropdown.remove();
        }
    }

    updateUI() {
        this.renderCharacterList();
    }
}

// 注意：防抖函数已在 multi_character_editor.js 中定义，这里不再重复定义

// 导出到全局作用域
window.characterEditor = null;
window.CharacterEditor = CharacterEditor;