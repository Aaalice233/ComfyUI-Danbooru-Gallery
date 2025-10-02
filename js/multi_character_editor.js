import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

// 导入组件
import './character_editor.js';
import './mask_editor.js';
import './output_area.js';
import './settings_menu.js';
import { globalMultiLanguageManager } from './multi_language.js';
import { globalAutocompleteCache } from './autocomplete_cache.js';
import { globalToastManager } from './toast_manager.js';

/*
 * 多人提示词节点性能优化总结
 *
 * 已完成的优化工作：
 *
 * 1. CSS动画和过渡效果优化
 *    - 简化了复杂的渐变背景和阴影效果
 *    - 减少了不必要的动画和过渡
 *    - 移除了性能消耗大的光晕效果
 *    - 添加了 will-change 属性优化
 *
 * 2. Canvas渲染性能优化
 *    - 优化了网格绘制，只在可视区域内绘制
 *    - 简化了边框和蒙版绘制，移除了圆角
 *    - 降低了分辨率信息更新频率
 *    - 根据缩放级别调整渲染细节
 *
 * 3. 事件处理和DOM操作优化
 *    - 添加了鼠标移动和滚轮事件的节流处理
 *    - 优化了容器大小变化的处理
 *    - 使用事件委托减少事件监听器数量
 *    - 优化了拖拽事件处理
 *
 * 4. 渲染节流和防抖优化
 *    - 为角色列表渲染添加了防抖处理
 *    - 使用文档片段减少DOM操作
 *    - 优化了事件绑定，使用事件委托
 *    - 添加了渲染节流，限制最大渲染频率
 *
 * 优化效果：
 * - 减少了CPU和内存使用
 * - 提高了界面响应速度
 * - 降低了滚动和缩放时的卡顿
 * - 改善了整体用户体验
 */

// 防抖函数
function debounce(func, delay) {
    let timeout;
    return function (...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

// 节流函数
function throttle(func, delay) {
    let lastCall = 0;
    return function (...args) {
        const context = this;
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            return func.apply(context, args);
        }
    };
}

// 全局变量
let MultiCharacterEditorInstance = null;

// 主编辑器类
class MultiCharacterEditor {
    constructor(node, widgetName) {
        this.node = node;
        this.widgetName = widgetName;
        this.container = null;
        this.dataManager = null;
        this.eventBus = null;
        this.components = {};
        this.templates = [];

        // 多语言管理器
        this.languageManager = globalMultiLanguageManager;
        this.toastManager = globalToastManager;

        this.init();
    }

    init() {
        this.createContainer();
        this.initManagers();
        this.createLayout();
        this.initComponents();
        this.bindEvents();
        this.loadInitialData();
    }

    createContainer() {
        this.container = document.createElement('div');
        this.container.className = 'mce-container';
        this.container.style.cssText = `
            width: 800px;
            height: 800px;
            display: flex;
            flex-direction: column;
            background: #1e1e2e;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-size: 13px;
            color: #E0E0E0;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            position: relative;
            animation: fadeIn 0.3s ease-out;
            will-change: auto;
        `;

        // 简化内部光晕效果，减少动画
        const glowEffect = document.createElement('div');
        glowEffect.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg,
                transparent,
                rgba(255, 255, 255, 0.1),
                transparent);
            z-index: 10;
        `;
        this.container.appendChild(glowEffect);

        // 添加全局动画样式
        this.addGlobalAnimations();
    }

    addGlobalAnimations() {
        // 检查是否已添加动画样式
        if (document.querySelector('#mce-global-animations')) return;

        const style = document.createElement('style');
        style.id = 'mce-global-animations';
        style.textContent = `
            /* 响应式设计 */
            @media (max-width: 900px) {
                .mce-container {
                    width: 100% !important;
                    height: 100% !important;
                    border-radius: 0 !important;
                }
                
                .mce-character-editor {
                    width: 250px !important;
                }
            }
            
            @media (max-width: 768px) {
                .mce-main-area {
                    flex-direction: column !important;
                }
                
                .mce-character-editor {
                    width: 100% !important;
                    height: 200px !important;
                    border-right: none !important;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
                }
                
                .mce-toolbar {
                    flex-wrap: wrap !important;
                    padding: 10px !important;
                }
                
                .mce-toolbar-section {
                    width: 100% !important;
                    margin-bottom: 8px !important;
                }
                
                .mce-toolbar-section-right {
                    margin-left: 0 !important;
                    width: 100% !important;
                    justify-content: space-between !important;
                }
            }
            
            /* 高对比度模式支持 */
            @media (prefers-contrast: high) {
                .mce-container {
                    border: 2px solid #ffffff !important;
                }
                
                .mce-button {
                    border: 2px solid #ffffff !important;
                }
                
                .mce-select, .mce-input {
                    border: 2px solid #ffffff !important;
                }
            }
            
            /* 减少动画模式支持 */
            @media (prefers-reduced-motion: reduce) {
                .mce-container,
                .mce-button,
                .mce-character-item,
                .mce-mask-item,
                .mce-edit-modal,
                .mce-settings-dialog,
                .mce-toast {
                    animation: none !important;
                    transition: none !important;
                }
            }
            
            /* 简化动画，提高性能 */
            @keyframes fadeIn {
                from {
                    opacity: 0;
                    transform: translateY(5px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            /* 为按钮添加简化悬停效果 */
            .mce-button {
                position: relative;
                overflow: hidden;
                will-change: transform;
            }
            
            /* 为模态框添加简化动画 */
            .mce-edit-modal {
                animation: fadeIn 0.2s ease-out;
            }
            
            .mce-edit-modal-content {
                animation: fadeIn 0.2s ease-out;
            }
            
            /* 为提示添加简化动画 */
            .mce-toast {
                animation: fadeIn 0.2s ease-out;
            }
            
            /* 为设置菜单添加简化动画 */
            .mce-settings-dialog {
                animation: fadeIn 0.2s ease-out;
            }
            
            /* 为加载状态添加简化动画 */
            .mce-loading {
                display: inline-block;
                width: 16px;
                height: 16px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                border-top-color: #7c3aed;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                to {
                    transform: rotate(360deg);
                }
            }
            
            /* 性能优化：使用transform代替位置变化 */
            .mce-character-item {
                will-change: transform;
            }
            
            .mce-character-item:hover {
                transform: translateY(-1px);
            }
        `;
        document.head.appendChild(style);
    }

    initManagers() {
        this.dataManager = new DataManager(this);
        this.eventBus = new EventBus(this);
    }

    createLayout() {
        this.container.innerHTML = `
            <div class="mce-toolbar"></div>
            <div class="mce-main-area">
                <div class="mce-character-editor"></div>
                <div class="mce-mask-editor"></div>
            </div>
            <div class="mce-output-area"></div>
        `;
    }

    initComponents() {
        try {
            this.components.toolbar = new Toolbar(this);
            this.components.characterEditor = new CharacterEditor(this);
            this.components.maskEditor = new MaskEditor(this);
            this.components.outputArea = new OutputArea(this);
            this.components.settingsMenu = new SettingsMenu(this);
        } catch (error) {
            console.error("组件初始化过程中发生错误:", error);
        }
    }

    bindEvents() {
        // 绑定全局事件
        this.eventBus.on('character:added', this.onCharacterAdded.bind(this));
        this.eventBus.on('character:updated', this.onCharacterUpdated.bind(this));
        this.eventBus.on('character:deleted', this.onCharacterDeleted.bind(this));
        this.eventBus.on('character:reordered', this.onCharacterReordered.bind(this));
        this.eventBus.on('mask:updated', this.onMaskUpdated.bind(this));
        this.eventBus.on('config:changed', this.onConfigChanged.bind(this));
    }

    async loadInitialData() {
        try {
            // 加载模板
            await this.loadTemplates();

            // 加载配置
            const config = await this.dataManager.loadConfig();

            if (config.characters && config.characters.length > 0) {
                // 清空现有角色，避免重复添加
                this.dataManager.config.characters = [];
                config.characters.forEach(charData => {
                    this.dataManager.addCharacter(charData);
                });
            }
            // 移除自动添加默认角色的逻辑

            this.updateOutput();
        } catch (error) {
            console.error('加载初始数据失败:', error);
            // 不再自动添加默认角色
        }
    }

    async loadTemplates() {
        try {
            const response = await api.fetchApi('/multi_character_editor/templates');
            if (response.ok) {
                const data = await response.json();
                this.templates = data.templates || [];
            }
        } catch (error) {
            console.error('加载模板失败:', error);
            this.templates = [];
        }
    }

    addDefaultCharacter() {



        const defaultTemplate = this.templates.find(t => t.name === '女孩') || {
            name: '角色1',
            prompt: '1girl, solo',
            weight: 1.0,
            color: '#FF6B6B'
        };



        const newCharacter = this.dataManager.addCharacter({
            name: defaultTemplate.name,
            prompt: defaultTemplate.prompt,
            weight: defaultTemplate.weight,
            color: defaultTemplate.color,
            enabled: true
        });



    }

    onCharacterAdded(character) {
        if (this.components.maskEditor) {
            this.components.maskEditor.addMask(character);
        }

        this.updateOutput();
        this.saveConfigDebounced();
    }

    onCharacterUpdated(character) {
        if (this.components.maskEditor && character) {
            // 检查是否需要更新蒙版，避免循环调用
            const currentMask = this.components.maskEditor.masks.find(m => m.characterId === character.id);
            if (!currentMask || !this.masksEqual(currentMask, character.mask)) {
                this.components.maskEditor.updateMask(character.id, character.mask);
            }
        }
        this.updateOutputThrottled();
        this.saveConfigDebounced();
    }

    // 比较两个蒙版是否相等
    masksEqual(mask1, mask2) {
        if (!mask1 && !mask2) return true;
        if (!mask1 || !mask2) return false;

        return mask1.x === mask2.x &&
            mask1.y === mask2.y &&
            mask1.width === mask2.width &&
            mask1.height === mask2.height &&
            mask1.feather === mask2.feather &&
            mask1.opacity === mask2.opacity &&
            mask1.blend_mode === mask2.blend_mode;
    }

    onCharacterDeleted(characterId) {
        this.components.maskEditor.removeMask(characterId);
        this.updateOutput();
        this.saveConfigDebounced();
    }

    onCharacterReordered(characters) {
        this.updateOutput();
        this.saveConfigDebounced();
    }

    onMaskUpdated(mask) {
        this.updateOutput();
        this.saveConfigDebounced();
    }

    onConfigChanged(config) {
        this.updateOutput();
        // 通知蒙版编辑器画布尺寸已变化
        if (this.components.maskEditor) {
            this.components.maskEditor.resizeCanvas();
            this.components.maskEditor.scheduleRender();
        }

        this.saveConfigDebounced();
    }

    updateOutput() {
        const config = this.dataManager.getConfig();
        const prompt = this.generatePrompt(config);
        this.components.outputArea.updatePrompt(prompt);
        this.updateWidgetValue(config);
    }

    // 添加节流的更新输出方法
    updateOutputThrottled = throttle(function () {
        this.updateOutput();
    }, 100);

    generatePrompt(config) {
        // 使用Python后端生成提示词
        return config.base_prompt || '';
    }

    updateWidgetValue(config) {
        // 更新小部件值
        const widget = this.node.widgets.find(w => w.name === this.widgetName);
        if (widget) {
            widget.value = JSON.stringify(config);
            this.node.setDirtyCanvas(true, true);
        }

    }

    async saveConfig() {
        try {
            await this.dataManager.saveConfig();
        } catch (error) {
            console.error('保存配置失败:', error);
        }
    }

    // 获取模板列表
    getTemplates() {
        return this.templates;
    }

    // 处理节点大小变化
    handleResize(size) {
        if (!this.container || !size) return;

        const [width, height] = size;

        // 计算容器实际可用尺寸（减去不同的边距）
        const horizontalPadding = 20;
        const verticalPadding = 100; // 最后增加垂直边距

        // 确保容器尺寸能够适应节点大小变化，同时保持最小尺寸
        const containerWidth = Math.max(width - horizontalPadding, 800);
        const containerHeight = Math.max(height - verticalPadding, 800);

        // 计算各个区域的高度
        const toolbarHeight = 60;
        const outputAreaHeight = 200; // 降低输出区域高度
        const mainAreaHeight = containerHeight - toolbarHeight - outputAreaHeight;

        // 更新容器样式 - 使用实际可用尺寸
        this.container.style.width = `${containerWidth}px`;
        this.container.style.height = `${containerHeight}px`;

        // 更新工具栏高度
        const toolbar = this.container.querySelector('.mce-toolbar');
        if (toolbar) {
            toolbar.style.height = `${toolbarHeight}px`;
            toolbar.style.flexShrink = '0';
        }

        // 更新主编辑区域
        const mainArea = this.container.querySelector('.mce-main-area');
        if (mainArea) {
            mainArea.style.height = `${mainAreaHeight}px`;
            mainArea.style.flexShrink = '0';
        }

        // 更新输出区域高度
        const outputArea = this.container.querySelector('.mce-output-area');
        if (outputArea) {
            outputArea.style.height = `${outputAreaHeight}px`;
            outputArea.style.flexShrink = '0';
        }

        // 通知各个组件大小已变化
        if (this.components.maskEditor) {
            const maskEditorWidth = containerWidth - 300; // 减去角色编辑器宽度
            // 只传递预览区域的大小，不改变实际画布的尺寸
            this.components.maskEditor.handlePreviewResize(maskEditorWidth, mainAreaHeight);
        }

        // 注意：不再根据节点大小自动更新画布尺寸
        // 实际画布的尺寸应该由引脚值决定，而不是节点大小比例决定

        // 触发重新渲染
        this.setDirtyCanvas(true, true);
        
        // 调整弹出提示位置到节点顶部
        this.adjustToastPosition();
    }

    // 调整弹出提示位置到节点顶部
    adjustToastPosition() {
        if (this.toastManager && this.container) {
            this.toastManager.adjustPositionToNode(this.container);
        }
    }


    // 设置画布脏标记
    setDirtyCanvas(dirtyForeground, dirtyBackground) {
        if (this.node && this.node.setDirtyCanvas) {
            this.node.setDirtyCanvas(dirtyForeground, dirtyBackground);
        }
    }
}

// 数据管理器
class DataManager {
    constructor(editor) {
        this.editor = editor;
        this.config = {
            version: '1.0.0',
            syntax_mode: 'attention_couple',
            base_prompt: '',
            canvas: {
                width: 1024,
                height: 1024
            },
            characters: [],
            settings: {
                language: 'zh-CN',
                theme: {
                    primaryColor: '#743795',
                    backgroundColor: '#2a2a2a',
                    secondaryColor: '#333333'
                }
            }
        };
        this.nextId = 1;
        // console.log('DataManager初始化完成，默认配置:', this.config);
    }

    async loadConfig() {
        try {
            const response = await api.fetchApi('/multi_character_editor/load_config');
            if (response.ok) {
                const config = await response.json();
                if (config && Object.keys(config).length > 0) {
                    // 合并配置，确保canvas对象包含所有必需属性
                    const mergedConfig = { ...this.config, ...config };

                    // 确保canvas配置完整
                    if (!mergedConfig.canvas) {
                        mergedConfig.canvas = this.config.canvas;
                    } else {
                        // 合并canvas配置，确保所有必需属性存在
                        mergedConfig.canvas = {
                            ...this.config.canvas,
                            ...mergedConfig.canvas
                        };
                    }

                    this.config = mergedConfig;
                    // console.log('配置加载完成:', this.config);
                }
            }
        } catch (error) {
            console.error('加载配置失败:', error);
        }
        return this.config;
    }

    async saveConfig() {
        try {
            const response = await api.fetchApi('/multi_character_editor/save_config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.config)
            });
            return response.ok;
        } catch (error) {
            console.error('保存配置失败:', error);
            return false;
        }
    }

    addCharacter(data = {}) {
        // 数据验证和修复
        if (!Array.isArray(this.config.characters)) {
            this.config.characters = [];
        }

        // 如果角色数量异常，重置数据
        if (this.config.characters.length > 1000) {
            this.config.characters = [];
            this.nextId = 1;
        }

        try {
            // 确保 data 对象存在
            const safeData = data || {};

            let characterId = safeData.id;

            if (!characterId) {
                characterId = this.generateId('char');
            }

            if (!characterId) {
                characterId = `char_backup_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
            }

            const character = {
                id: characterId,
                name: safeData.name || `角色${this.config.characters.length + 1}`,
                prompt: safeData.prompt || '',
                enabled: safeData.enabled !== undefined ? safeData.enabled : true,
                weight: safeData.weight || 1.0,
                color: safeData.color || this.generateColor(),
                position: safeData.position || this.config.characters.length,
                mask: safeData.mask || null,
                template: safeData.template || ''
            };

            this.config.characters.push(character);

            if (this.editor && this.editor.eventBus) {
                this.editor.eventBus.emit('character:added', character);
            }

            return character;
        } catch (error) {
            // 尝试创建最小可用角色
            try {
                const safeData = data || {};

                const fallbackCharacter = {
                    id: `char_fallback_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
                    name: safeData.name || '新角色',
                    prompt: safeData.prompt || '',
                    enabled: true,
                    weight: 1.0,
                    color: '#FF6B6B',
                    position: this.config.characters.length,
                    mask: null,
                    template: ''
                };

                this.config.characters.push(fallbackCharacter);

                if (this.editor && this.editor.eventBus) {
                    this.editor.eventBus.emit('character:added', fallbackCharacter);
                }

                return fallbackCharacter;
            } catch (fallbackError) {
                // 最后的保险措施
                try {
                    const emergencyCharacter = {
                        id: `char_emergency_${Date.now()}`,
                        name: '紧急角色',
                        prompt: '',
                        enabled: true,
                        weight: 1.0,
                        color: '#FF6B6B',
                        position: this.config.characters.length,
                        mask: null,
                        template: ''
                    };

                    this.config.characters.push(emergencyCharacter);

                    if (this.editor && this.editor.eventBus) {
                        this.editor.eventBus.emit('character:added', emergencyCharacter);
                    }

                    return emergencyCharacter;
                } catch (emergencyError) {
                    throw emergencyError;
                }
            }
        }
    }

    updateCharacter(characterId, updates) {
        const index = this.config.characters.findIndex(c => c.id === characterId);
        if (index !== -1) {
            this.config.characters[index] = { ...this.config.characters[index], ...updates };
            const character = this.config.characters[index];
            this.editor.eventBus.emit('character:updated', character);
            return character;
        }
        return null;
    }

    deleteCharacter(characterId) {
        const index = this.config.characters.findIndex(c => c.id === characterId);
        if (index !== -1) {
            const character = this.config.characters[index];
            this.config.characters.splice(index, 1);
            // 重新排序
            this.config.characters.forEach((char, idx) => {
                char.position = idx;
            });
            this.editor.eventBus.emit('character:deleted', characterId);
            return character;
        }
        return null;
    }

    reorderCharacters(fromIndex, toIndex) {
        const characters = [...this.config.characters];
        const [moved] = characters.splice(fromIndex, 1);
        characters.splice(toIndex, 0, moved);

        // 更新位置
        characters.forEach((char, idx) => {
            char.position = idx;
        });

        this.config.characters = characters;
        this.editor.eventBus.emit('character:reordered', characters);
    }

    updateCharacterMask(characterId, mask) {
        return this.updateCharacter(characterId, { mask });
    }

    updateConfig(updates) {
        this.config = { ...this.config, ...updates };
        this.editor.eventBus.emit('config:changed', this.config);
    }

    generateId(prefix) {
        try {
            const timestamp = Date.now();
            const random = Math.random().toString(36).substr(2, 9);
            const id = `${prefix}_${timestamp}_${random}`;
            return id;
        } catch (error) {
            // 降级方案：使用简单的递增ID
            try {
                return `${prefix}_${this.nextId++}_${Date.now()}`;
            } catch (fallbackError) {
                // 最后的保险措施
                return `${prefix}_emergency_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
            }
        }
    }

    generateColor() {
        try {
            const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF9FF3', '#54A0FF'];
            return colors[Math.floor(Math.random() * colors.length)];
        } catch (error) {
            return '#FF6B6B'; // 默认颜色
        }
    }

    getConfig() {
        return this.config;
    }

    getCharacter(characterId) {
        return this.config.characters.find(c => c.id === characterId);
    }

    getCharacters() {
        return this.config.characters;
    }
}

// 事件总线
class EventBus {
    constructor(editor) {
        this.editor = editor;
        this.events = {};
    }

    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    off(event, callback) {
        if (this.events[event]) {
            const index = this.events[event].indexOf(callback);
            if (index > -1) {
                this.events[event].splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`事件处理错误 (${event}):`, error);
                }
            });
        }
    }
}

// 工具栏组件
class Toolbar {
    constructor(editor) {
        this.editor = editor;
        this.container = editor.container.querySelector('.mce-toolbar');
        this.languageManager = editor.languageManager;
        this.init();
    }

    init() {
        this.createToolbar();
        this.bindEvents();
        this.updateTexts();

        // 监听语言变化事件
        document.addEventListener('languageChanged', () => {
            this.updateTexts();
        });
    }

    createToolbar() {
        this.container.innerHTML = `
            <div class="mce-toolbar-section">
                <label class="mce-toolbar-label">${this.languageManager.t('syntaxMode')}:</label>
                <select id="mce-syntax-mode" class="mce-select">
                    <option value="attention_couple">${this.languageManager.t('attentionCouple')}</option>
                    <option value="regional_prompts">${this.languageManager.t('regionalPrompts')}</option>
                </select>
            </div>
            <div class="mce-toolbar-section">
                <button id="mce-refresh-canvas" class="mce-button mce-button-with-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M23 4v6h-6"></path>
                        <path d="M1 20v-6h6"></path>
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                    </svg>
                    <span class="button-text">${this.languageManager.t('refreshCanvas')}</span>
                </button>
            </div>
            <div class="mce-toolbar-section mce-toolbar-section-right">
                <button id="mce-language-toggle" class="mce-button mce-button-with-icon" title="${this.languageManager.t('languageSettings')}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M5 8l6 6"></path>
                        <path d="M4 14l6-6 2-3"></path>
                        <path d="M2 5h12"></path>
                        <path d="M7 2h1"></path>
                        <path d="M22 22l-5-10-5 10"></path>
                        <path d="M14 18h6"></path>
                    </svg>
                    <span class="button-text">${this.languageManager.getLanguage() === 'zh' ? '中' : 'En'}</span>
                </button>
                <button id="mce-settings" class="mce-button mce-button-with-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                    <span class="button-text">${this.languageManager.t('settings')}</span>
                </button>
            </div>
        `;

        this.addStyles();
    }

    /**
     * 更新工具栏文本
     */
    updateTexts() {
        // 更新语法模式标签
        const syntaxModeLabel = this.container.querySelector('.mce-toolbar-label');
        if (syntaxModeLabel) {
            syntaxModeLabel.textContent = `${this.languageManager.t('syntaxMode')}:`;
        }

        // 更新语法模式选项
        const syntaxModeSelect = document.getElementById('mce-syntax-mode');
        if (syntaxModeSelect) {
            const attentionOption = syntaxModeSelect.querySelector('option[value="attention_couple"]');
            if (attentionOption) {
                attentionOption.textContent = this.languageManager.t('attentionCouple');
            }

            const regionalOption = syntaxModeSelect.querySelector('option[value="regional_prompts"]');
            if (regionalOption) {
                regionalOption.textContent = this.languageManager.t('regionalPrompts');
            }
        }

        // 更新刷新画布按钮
        const refreshButton = document.getElementById('mce-refresh-canvas');
        if (refreshButton) {
            const textSpan = refreshButton.querySelector('.button-text');
            if (textSpan) {
                textSpan.textContent = this.languageManager.t('refreshCanvas');
            }
        }

        // 更新语言切换按钮
        const languageButton = document.getElementById('mce-language-toggle');
        if (languageButton) {
            const textSpan = languageButton.querySelector('.button-text');
            if (textSpan) {
                textSpan.textContent = this.languageManager.getLanguage() === 'zh' ? '中' : 'En';
            }
        }

        // 更新设置按钮
        const settingsButton = document.getElementById('mce-settings');
        if (settingsButton) {
            const textSpan = settingsButton.querySelector('.button-text');
            if (textSpan) {
                textSpan.textContent = this.languageManager.t('settings');
            }
        }
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .mce-main-area {
                flex: 1;
                display: flex;
                overflow: visible;
                min-width: 0;
                background: #1e1e2e;
                border-radius: 0 0 10px 10px;
                margin: 0 4px 4px 4px;
            }
            
            .mce-character-editor {
                width: 300px;
                flex-shrink: 0;
                border-right: 1px solid rgba(255, 255, 255, 0.08);
                overflow-y: auto;
                background: #2a2a3e;
            }
            
            .mce-mask-editor {
                flex: 1;
                position: relative;
                background: #1a1a26;
                min-height: 0;
                min-width: 0;
                width: 100%;
                height: 100%;
                overflow: visible;
                border-radius: 0 0 8px 0;
            }
            
            .mce-output-area {
                height: 300px;
                background: #2a2a3e;
                border-top: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 0 0 8px 8px;
                margin: 0 4px 4px 4px;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
            }
            
            .mce-toolbar {
                display: flex;
                align-items: center;
                gap: 16px;
                padding: 14px 20px;
                background: #2a2a3e;
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                flex-shrink: 0;
                flex-wrap: wrap;
                position: relative;
                z-index: 5;
            }
            
            .mce-toolbar-section {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .mce-toolbar-section-right {
                margin-left: auto;
            }
            
            .mce-toolbar-label {
                font-size: 12px;
                color: rgba(224, 224, 224, 0.8);
                white-space: nowrap;
                font-weight: 500;
            }
            
            .mce-select, .mce-input {
                padding: 6px 12px;
                background: #1a1a26;
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 6px;
                color: #E0E0E0;
                font-size: 12px;
                transition: background-color 0.15s ease, border-color 0.15s ease;
                will-change: auto;
            }
            
            .mce-select:hover, .mce-input:hover {
                background: #262632;
                border-color: rgba(255, 255, 255, 0.15);
            }
            
            .mce-select:focus, .mce-input:focus {
                outline: none;
                border-color: #7c3aed;
                box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.2);
            }
            
            .mce-button {
                padding: 8px 14px;
                background: #404054;
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 6px;
                color: #E0E0E0;
                cursor: pointer;
                font-size: 12px;
                font-weight: 500;
                transition: background-color 0.15s ease, transform 0.1s ease;
                display: flex;
                align-items: center;
                gap: 6px;
                position: relative;
                overflow: hidden;
                will-change: transform;
            }
            
            .mce-button:hover {
                background: #4a4a5e;
                border-color: rgba(124, 58, 237, 0.4);
                transform: translateY(-1px);
            }
            
            .mce-button:active {
                transform: translateY(0);
            }
            
            .mce-button svg {
                flex-shrink: 0;
                transition: transform 0.1s ease;
            }
            
            .mce-button:hover svg {
                transform: scale(1.05);
            }
            
            .mce-button-with-icon {
                padding: 8px 12px;
            }
            
            .mce-button .button-text {
                white-space: nowrap;
            }
            
            /* 增强按钮交互反馈 */
            .mce-button:focus {
                outline: none;
                box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.5);
            }
        `;

        document.head.appendChild(style);
    }

    bindEvents() {
        // 使用setTimeout确保DOM元素已经创建
        setTimeout(() => {
            try {
                // 语法模式切换
                const syntaxMode = document.getElementById('mce-syntax-mode');
                if (syntaxMode) {
                    syntaxMode.addEventListener('change', (e) => {
                        this.editor.dataManager.updateConfig({ syntax_mode: e.target.value });
                    });
                }

                // 刷新画布
                const refreshCanvas = document.getElementById('mce-refresh-canvas');
                if (refreshCanvas) {
                    refreshCanvas.addEventListener('click', () => {
                        this.refreshCanvas();
                        this.languageManager.showMessage(this.languageManager.t('canvasRefreshed'), 'success');
                    });
                }

                // 语言切换
                const languageToggle = document.getElementById('mce-language-toggle');
                if (languageToggle) {
                    languageToggle.addEventListener('click', () => {
                        const currentLang = this.languageManager.getLanguage();
                        const newLang = currentLang === 'zh' ? 'en' : 'zh';

                        if (this.languageManager.setLanguage(newLang)) {
                            this.updateTexts();
                            this.languageManager.showMessage(
                                newLang === 'zh' ? '已切换到中文' : 'Switched to English',
                                'success'
                            );

                            // 更新智能补全缓存系统的语言
                            if (typeof globalAutocompleteCache !== 'undefined') {
                                globalAutocompleteCache.setLanguage(newLang);
                            }
                        }
                    });
                }

                // 设置
                const settings = document.getElementById('mce-settings');
                if (settings) {
                    settings.addEventListener('click', () => {
                        this.showSettings();
                    });
                }

                // console.log("Toolbar事件绑定完成");
            } catch (error) {
                console.error("绑定Toolbar事件时发生错误:", error);
            }
        }, 100); // 延迟100ms确保DOM完全渲染
    }


    refreshCanvas() {
        // 获取当前节点的画布宽度和高度引脚
        const node = this.editor.node;
        const canvasWidthWidget = node.widgets.find(w => w.name === 'canvas_width');
        const canvasHeightWidget = node.widgets.find(w => w.name === 'canvas_height');

        if (canvasWidthWidget && canvasHeightWidget) {
            const width = canvasWidthWidget.value;
            const height = canvasHeightWidget.value;

            // 无论引脚值是否为null，都更新配置中的画布尺寸
            // 如果引脚值为null，使用默认值1024
            const canvasWidth = width !== null ? width : 1024;
            const canvasHeight = height !== null ? height : 1024;

            // 更新配置中的画布尺寸
            this.editor.dataManager.updateConfig({
                canvas: {
                    ...this.editor.dataManager.config.canvas,
                    width: canvasWidth,
                    height: canvasHeight
                }
            });

            // 重置缩放和偏移
            if (this.editor.components.maskEditor) {
                this.editor.components.maskEditor.scale = 1;
                this.editor.components.maskEditor.offset = { x: 0, y: 0 };

                // 强制触发画布重新调整
                setTimeout(() => {
                    this.editor.components.maskEditor.resizeCanvas();
                    this.editor.components.maskEditor.scheduleRender();
                }, 100);
            }

            // 额外刷新一次画布大小，确保从节点缓存的数据中获取最新的引脚值
            setTimeout(() => {
                this.refreshCanvasFromNodePins();
            }, 200);

            // console.log(`画布已刷新: ${canvasWidth}x${canvasHeight}`);
        }
    }

    // 从节点引脚刷新画布大小
    refreshCanvasFromNodePins() {
        const node = this.editor.node;
        const canvasWidthWidget = node.widgets.find(w => w.name === 'canvas_width');
        const canvasHeightWidget = node.widgets.find(w => w.name === 'canvas_height');

        if (canvasWidthWidget && canvasHeightWidget) {
            const width = canvasWidthWidget.value;
            const height = canvasHeightWidget.value;

            // 无论引脚值是否为null，都更新配置中的画布尺寸
            // 如果引脚值为null，使用默认值1024
            const canvasWidth = width !== null ? width : 1024;
            const canvasHeight = height !== null ? height : 1024;

            // 检查画布尺寸是否需要更新
            const currentConfig = this.editor.dataManager.config.canvas;
            if (currentConfig.width !== canvasWidth || currentConfig.height !== canvasHeight) {
                // 更新配置中的画布尺寸
                this.editor.dataManager.updateConfig({
                    canvas: {
                        ...currentConfig,
                        width: canvasWidth,
                        height: canvasHeight
                    }
                });

                // 强制触发画布重新调整
                if (this.editor.components.maskEditor) {
                    setTimeout(() => {
                        this.editor.components.maskEditor.resizeCanvas();
                        this.editor.components.maskEditor.scheduleRender();
                    }, 100);
                }

                // console.log(`画布大小已从引脚更新: ${canvasWidth}x${canvasHeight}`);
            }
        }
    }

    showSettings() {
        if (this.editor.components.settingsMenu) {
            this.editor.components.settingsMenu.show();
        }
    }

    updateUI(config) {
        // console.log('更新UI，当前配置:', config);

        // 确保config对象存在
        if (!config) {
            console.warn('配置对象不存在，跳过UI更新');
            return;
        }

        // 更新语法模式
        const syntaxModeElement = document.getElementById('mce-syntax-mode');
        if (syntaxModeElement) {
            syntaxModeElement.value = config.syntax_mode || 'attention_couple';
        }

        // console.log('UI更新完成');
    }
}


// 注册ComfyUI扩展
app.registerExtension({
    name: "Comfy.MultiCharacterEditor",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        // console.log("MultiCharacterEditor 扩展注册中...", nodeData.name);
        if (nodeData.name === "MultiCharacterEditorNode") {
            // console.log("找到 MultiCharacterEditorNode，设置回调函数");
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                // console.log("MultiCharacterEditorNode 正在创建...");
                if (onNodeCreated) {
                    onNodeCreated.apply(this, arguments);
                }

                // 设置节点最小尺寸
                this.min_size = [800, 800];
                // console.log("设置节点最小尺寸:", this.min_size);

                // 存储原始的computeSize方法
                const originalComputeSize = this.computeSize;

                // 重写computeSize方法以动态计算最小尺寸
                this.computeSize = function (out) {
                    // 调用原始方法
                    const size = originalComputeSize.call(this, out);

                    // 计算自定义控件的实际尺寸需求
                    if (MultiCharacterEditorInstance && MultiCharacterEditorInstance.container) {
                        // 强制使用固定尺寸确保完全包裹自定义控件
                        const requiredWidth = 800;
                        const requiredHeight = 800;

                        // 添加额外的边距以确保完全包裹
                        // 底部需要更多边距，因为ComfyUI节点底部有额外的空间占用
                        const horizontalPadding = 20;
                        const verticalPadding = 100; // 最后增加垂直边距
                        const finalWidth = requiredWidth + horizontalPadding;
                        const finalHeight = requiredHeight + verticalPadding;

                        // 更新节点的最小尺寸
                        this.min_size = [finalWidth, finalHeight];

                        // 强制设置节点尺寸为所需尺寸
                        size[0] = finalWidth;
                        size[1] = finalHeight;
                    }

                    return size;
                };

                // 存储原始的onResize方法
                const originalOnResize = this.onResize;

                // 重写onResize方法以处理大小变化
                this.onResize = function (size) {
                    // 调用原始方法
                    if (originalOnResize) {
                        originalOnResize.call(this, size);
                    }

                    // 通知编辑器实例大小已变化
                    if (MultiCharacterEditorInstance) {
                        MultiCharacterEditorInstance.handleResize(size);

                        // 确保画布编辑器能够立即响应大小变化
                        if (MultiCharacterEditorInstance.components.maskEditor) {
                            // 延迟触发画布重新调整，确保DOM已更新
                            setTimeout(() => {
                                MultiCharacterEditorInstance.components.maskEditor.resizeCanvas();
                                MultiCharacterEditorInstance.components.maskEditor.scheduleRender();
                            }, 50);
                        }
                    }
                };

                // 存储原始的onExecute方法
                const originalOnExecute = this.onExecuted;

                // 重写onExecuted方法以在节点执行后刷新画布
                this.onExecuted = function (output) {
                    // 调用原始方法
                    if (originalOnExecute) {
                        originalOnExecute.apply(this, arguments);
                    }

                    // 节点执行后刷新画布
                    if (MultiCharacterEditorInstance && MultiCharacterEditorInstance.components.toolbar) {
                        setTimeout(() => {
                            MultiCharacterEditorInstance.components.toolbar.refreshCanvas();
                        }, 100);
                    }
                };

                try {
                    // 隐藏所有输入输出小部件的引脚，除了画布宽度和高度
                    this.widgets.forEach(widget => {
                        // 保留画布宽度和高度引脚的显示，让它们使用ComfyUI的原生样式
                        if (widget.name === 'canvas_width' || widget.name === 'canvas_height') {
                            // 不隐藏这些引脚，让它们使用ComfyUI的原生样式
                            return;
                        }
                        // 参照 danbooru_gallery.js 的做法，通过重写 computeSize 和 draw 来彻底隐藏小部件
                        widget.computeSize = () => [0, -4];
                        widget.draw = () => { };
                        widget.type = "hidden";
                    });

                    // 创建编辑器实例
                    // console.log("创建编辑器实例...");
                    MultiCharacterEditorInstance = new MultiCharacterEditor(this, "config_data");
                    // console.log("编辑器实例创建成功");

                    // 添加防抖保存
                    MultiCharacterEditorInstance.saveConfigDebounced = debounce(() => {
                        MultiCharacterEditorInstance.saveConfig();
                    }, 1000);

                    // 添加DOM小部件
                    // console.log("添加DOM小部件...");
                    this.addDOMWidget("config_data", "div", MultiCharacterEditorInstance.container);
                    // console.log("DOM小部件添加成功");

                    // 初始化时读取宽高引脚的值
                    setTimeout(() => {
                        const canvasWidthWidget = this.widgets.find(w => w.name === 'canvas_width');
                        const canvasHeightWidget = this.widgets.find(w => w.name === 'canvas_height');

                        if (canvasWidthWidget && canvasHeightWidget && MultiCharacterEditorInstance) {
                            const width = canvasWidthWidget.value;
                            const height = canvasHeightWidget.value;

                            // 无论引脚值是否为null，都更新配置中的画布尺寸
                            // 如果引脚值为null，使用默认值1024
                            const canvasWidth = width !== null ? width : 1024;
                            const canvasHeight = height !== null ? height : 1024;

                            // 更新配置中的画布尺寸
                            MultiCharacterEditorInstance.dataManager.updateConfig({
                                canvas: {
                                    ...MultiCharacterEditorInstance.dataManager.config.canvas,
                                    width: canvasWidth,
                                    height: canvasHeight
                                }
                            });

                            // 强制触发画布重新调整
                            setTimeout(() => {
                                if (MultiCharacterEditorInstance.components.maskEditor) {
                                    MultiCharacterEditorInstance.components.maskEditor.resizeCanvas();
                                    MultiCharacterEditorInstance.components.maskEditor.scheduleRender();
                                }
                            }, 100);
                        }
                    }, 500);

                    // 重写onWidgetChanged方法来监听引脚值变化
                    const onWidgetChanged = this.onWidgetChanged;
                    this.onWidgetChanged = function (widget, value) {
                        if (onWidgetChanged) {
                            onWidgetChanged.apply(this, arguments);
                        }

                        // 当画布宽度或高度引脚值变化时，更新画布
                        if (widget.name === 'canvas_width' || widget.name === 'canvas_height') {
                            if (MultiCharacterEditorInstance) {
                                const canvasWidthWidget = this.widgets.find(w => w.name === 'canvas_width');
                                const canvasHeightWidget = this.widgets.find(w => w.name === 'canvas_height');

                                if (canvasWidthWidget && canvasHeightWidget) {
                                    const width = canvasWidthWidget.value;
                                    const height = canvasHeightWidget.value;

                                    // 无论引脚值是否为null，都更新配置中的画布尺寸
                                    // 如果引脚值为null，使用默认值1024
                                    const canvasWidth = width !== null ? width : 1024;
                                    const canvasHeight = height !== null ? height : 1024;

                                    // 更新配置中的画布尺寸
                                    MultiCharacterEditorInstance.dataManager.updateConfig({
                                        canvas: {
                                            ...MultiCharacterEditorInstance.dataManager.config.canvas,
                                            width: canvasWidth,
                                            height: canvasHeight
                                        }
                                    });

                                    // 立即强制触发画布重新调整，不使用延迟
                                    if (MultiCharacterEditorInstance.components.maskEditor) {
                                        // 重置缩放和偏移，确保画布正确显示
                                        MultiCharacterEditorInstance.components.maskEditor.scale = 1;
                                        MultiCharacterEditorInstance.components.maskEditor.offset = { x: 0, y: 0 };

                                        // 立即调整画布大小
                                        MultiCharacterEditorInstance.components.maskEditor.resizeCanvas();

                                        // 立即触发重新渲染
                                        MultiCharacterEditorInstance.components.maskEditor.scheduleRender();

                                        // 添加额外的渲染调用，确保画布完全更新
                                        setTimeout(() => {
                                            if (MultiCharacterEditorInstance.components.maskEditor) {
                                                MultiCharacterEditorInstance.components.maskEditor.resizeCanvas();
                                                MultiCharacterEditorInstance.components.maskEditor.scheduleRender();
                                            }
                                        }, 50);
                                    }
                                }
                            }
                        }
                    };

                    // 强制节点重新计算大小
                    this.size = this.computeSize();

                    // 确保节点初始尺寸能够完全包裹自定义控件
                    const requiredWidth = 800;
                    const requiredHeight = 800;
                    const horizontalPadding = 20;
                    const verticalPadding = 100; // 最后增加垂直边距
                    const finalWidth = requiredWidth + horizontalPadding;
                    const finalHeight = requiredHeight + verticalPadding;

                    // 强制设置节点尺寸为所需尺寸（包含边距）
                    this.size[0] = finalWidth;
                    this.size[1] = finalHeight;

                    // 更新最小尺寸
                    this.min_size = [finalWidth, finalHeight];

                    this.setDirtyCanvas(true, true);

                    // 初始化时触发一次大小调整
                    setTimeout(() => {
                        if (MultiCharacterEditorInstance) {
                            MultiCharacterEditorInstance.handleResize(this.size);
                        }
                    }, 100);

                    // console.log("节点创建完成，设置初始尺寸:", this.size);
                } catch (error) {
                    console.error("创建节点时发生错误:", error);
                }
            };

            const onNodeRemoved = nodeType.prototype.onNodeRemoved;
            nodeType.prototype.onNodeRemoved = function () {
                // console.log("MultiCharacterEditorNode 被移除");
                MultiCharacterEditorInstance = null;
                if (onNodeRemoved) {
                    onNodeRemoved.apply(this, arguments);
                }
            };
        }
    }
});

