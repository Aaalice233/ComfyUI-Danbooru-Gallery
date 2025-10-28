/**
 * 参数控制面板 (Parameter Control Panel)
 * 支持滑条、开关、下拉菜单、分隔符等多种参数类型
 * 动态输出引脚，预设管理，拖拽排序
 */

import { app } from "/scripts/app.js";
import { globalToastManager } from "../global/toast_manager.js";
import { globalMultiLanguageManager } from "../global/multi_language.js";

// 注册多语言翻译
const translations = {
    zh: {
        title: "参数控制面板",
        preset: "预设",
        savePreset: "保存预设",
        loadPreset: "加载预设",
        deletePreset: "删除预设",
        addParameter: "新建参数",
        editParameter: "编辑参数",
        deleteParameter: "删除参数",
        parameterName: "参数名称",
        parameterType: "参数类型",
        separator: "分隔符",
        slider: "滑条",
        switch: "开关",
        dropdown: "下拉菜单",
        min: "最小值",
        max: "最大值",
        step: "步长",
        defaultValue: "默认值",
        dataSource: "数据源",
        custom: "自定义",
        checkpoint: "Checkpoint",
        lora: "LoRA",
        fromConnection: "从连接获取",
        options: "选项",
        confirm: "确认",
        cancel: "取消",
        presetNamePlaceholder: "输入预设名称",
        parameterNamePlaceholder: "输入参数名称",
        optionsPlaceholder: "每行一个选项",
        separatorLabel: "分组标题",
        success: "成功",
        error: "错误",
        presetSaved: "预设已保存",
        presetLoaded: "预设已加载",
        presetDeleted: "预设已删除",
        parameterAdded: "参数已添加",
        parameterUpdated: "参数已更新",
        parameterDeleted: "参数已删除",
        missingParameters: "部分参数未找到",
        duplicateName: "参数名称已存在",
        invalidInput: "输入无效",
        noPresets: "暂无预设",
        refreshPresets: "刷新预设列表",
        presetsRefreshed: "预设列表已刷新",
        autoSyncedOptions: "选项将在Break节点输出连接时自动同步"
    },
    en: {
        title: "Parameter Control Panel",
        preset: "Preset",
        savePreset: "Save Preset",
        loadPreset: "Load Preset",
        deletePreset: "Delete Preset",
        addParameter: "Add Parameter",
        editParameter: "Edit Parameter",
        deleteParameter: "Delete Parameter",
        parameterName: "Parameter Name",
        parameterType: "Parameter Type",
        separator: "Separator",
        slider: "Slider",
        switch: "Switch",
        dropdown: "Dropdown",
        min: "Min",
        max: "Max",
        step: "Step",
        defaultValue: "Default Value",
        dataSource: "Data Source",
        custom: "Custom",
        checkpoint: "Checkpoint",
        lora: "LoRA",
        fromConnection: "From Connection",
        options: "Options",
        confirm: "Confirm",
        cancel: "Cancel",
        presetNamePlaceholder: "Enter preset name",
        parameterNamePlaceholder: "Enter parameter name",
        optionsPlaceholder: "One option per line",
        separatorLabel: "Group Label",
        success: "Success",
        error: "Error",
        presetSaved: "Preset saved",
        presetLoaded: "Preset loaded",
        presetDeleted: "Preset deleted",
        parameterAdded: "Parameter added",
        parameterUpdated: "Parameter updated",
        parameterDeleted: "Parameter deleted",
        missingParameters: "Some parameters not found",
        duplicateName: "Parameter name already exists",
        invalidInput: "Invalid input",
        noPresets: "No presets available",
        refreshPresets: "Refresh Presets",
        presetsRefreshed: "Presets refreshed",
        autoSyncedOptions: "Options will be auto-synced when Break output is connected"
    }
};

globalMultiLanguageManager.registerTranslations('pcp', translations);

// 创建命名空间翻译函数
const t = (key) => globalMultiLanguageManager.t(`pcp.${key}`);

// 参数控制面板节点
app.registerExtension({
    name: "ParameterControlPanel",

    async init(app) {
        console.log('[PCP] 初始化参数控制面板');
    },

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== "ParameterControlPanel") return;

        // 节点创建时的处理
        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            const result = onNodeCreated?.apply(this, arguments);

            // 初始化节点属性
            this.properties = {
                parameters: [],  // 参数列表
                currentPreset: null,  // 当前预设名称
                locked: false  // 锁定模式状态
            };

            // 设置节点初始大小
            this.size = [500, 600];

            // 标志位：是否已从工作流加载
            this._loadedFromWorkflow = false;

            // 创建自定义UI
            this.createCustomUI();

            // 延迟加载配置（只在非工作流加载时生效）
            setTimeout(() => {
                this.loadConfigFromBackend();
            }, 100);

            return result;
        };

        // 创建自定义UI
        nodeType.prototype.createCustomUI = function () {
            try {
                console.log('[PCP-UI] 开始创建自定义UI:', this.id);

                const container = document.createElement('div');
                container.className = 'pcp-container';

                // 创建样式
                this.addStyles();

                // 创建布局
                container.innerHTML = `
                    <div class="pcp-content">
                        <div class="pcp-preset-bar">
                            <button class="pcp-lock-button" id="pcp-lock-button" title="锁定模式（双击切换）">🔒</button>
                            <span class="pcp-preset-label">${t('preset')}:</span>
                            <div class="pcp-preset-selector" id="pcp-preset-selector">
                                <input type="text" class="pcp-preset-search" id="pcp-preset-search" placeholder="${t('loadPreset')}..." readonly>
                                <div class="pcp-preset-dropdown" id="pcp-preset-dropdown" style="display: none;">
                                    <input type="text" class="pcp-preset-filter" id="pcp-preset-filter" placeholder="🔍 搜索预设...">
                                    <div class="pcp-preset-list" id="pcp-preset-list"></div>
                                </div>
                            </div>
                            <button class="pcp-preset-button pcp-button-refresh" id="pcp-refresh-preset" title="${t('refreshPresets')}">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="23 4 23 10 17 10"></polyline>
                                    <polyline points="1 20 1 14 7 14"></polyline>
                                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                </svg>
                            </button>
                            <button class="pcp-preset-button pcp-button-save" id="pcp-save-preset" title="${t('savePreset')}">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                    <polyline points="7 3 7 8 15 8"></polyline>
                                </svg>
                            </button>
                            <button class="pcp-preset-button pcp-button-delete" id="pcp-delete-preset" title="${t('deletePreset')}">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    <line x1="10" y1="11" x2="10" y2="17"></line>
                                    <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                            </button>
                            <button class="pcp-preset-button pcp-button-add" id="pcp-new-preset" title="${t('savePreset')}">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                            </button>
                        </div>
                        <div class="pcp-parameters-list" id="pcp-parameters-list"></div>
                        <div class="pcp-add-parameter-container">
                            <button class="pcp-button pcp-button-primary" id="pcp-add-parameter">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                                <span>${t('addParameter')}</span>
                            </button>
                        </div>
                    </div>
                `;

                // 添加到节点的自定义widget
                this.addDOMWidget("pcp_ui", "div", container);
                this.customUI = container;

                // 绑定事件
                this.bindUIEvents();

                // 初始化参数列表
                this.updateParametersList();

                // 加载预设列表
                this.loadPresetsList();

                // 应用锁定状态UI（确保初始状态正确）
                this.updateLockUI();

                console.log('[PCP-UI] 自定义UI创建完成');

            } catch (error) {
                console.error('[PCP-UI] 创建自定义UI时出错:', error);
            }
        };

        // 添加样式
        nodeType.prototype.addStyles = function () {
            if (document.querySelector('#pcp-styles')) return;

            const style = document.createElement('style');
            style.id = 'pcp-styles';
            style.textContent = `
                /* 容器样式 */
                .pcp-container {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    background: #1e1e2e;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    overflow: hidden;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    font-size: 13px;
                    color: #E0E0E0;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                }

                .pcp-content {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    background: rgba(30, 30, 46, 0.5);
                }

                /* 预设栏 */
                .pcp-preset-bar {
                    padding: 10px 16px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .pcp-lock-button {
                    background: rgba(100, 100, 120, 0.2);
                    border: 1px solid rgba(100, 100, 120, 0.3);
                    border-radius: 6px;
                    padding: 4px 8px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-size: 14px;
                    min-width: 32px;
                    opacity: 0.5;
                }

                .pcp-lock-button:hover {
                    opacity: 0.8;
                    background: rgba(100, 100, 120, 0.3);
                }

                .pcp-lock-button.locked {
                    opacity: 1;
                    background: rgba(255, 193, 7, 0.3);
                    border-color: rgba(255, 193, 7, 0.5);
                    box-shadow: 0 0 10px rgba(255, 193, 7, 0.3);
                }

                .pcp-preset-label {
                    font-size: 12px;
                    color: #B0B0B0;
                    white-space: nowrap;
                }

                .pcp-preset-selector {
                    flex: 1;
                    position: relative;
                    min-width: 150px;
                }

                .pcp-preset-search {
                    width: 100%;
                    background: rgba(0, 0, 0, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 6px;
                    padding: 4px 8px;
                    color: #E0E0E0;
                    font-size: 12px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .pcp-preset-search:focus {
                    outline: none;
                    border-color: #743795;
                    background: rgba(0, 0, 0, 0.3);
                }

                .pcp-preset-dropdown {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    margin-top: 4px;
                    background: #2a2a3a;
                    border: 1px solid #555;
                    border-radius: 6px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
                    z-index: 1000;
                    max-height: 300px;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }

                .pcp-preset-filter {
                    width: 100%;
                    background: #1a1a2a;
                    border: none;
                    border-bottom: 1px solid #555;
                    padding: 8px 12px;
                    color: #E0E0E0;
                    font-size: 12px;
                    box-sizing: border-box;
                }

                .pcp-preset-filter:focus {
                    outline: none;
                    background: #0a0a1a;
                }

                .pcp-preset-list {
                    flex: 1;
                    overflow-y: auto;
                    max-height: 250px;
                }

                .pcp-preset-list::-webkit-scrollbar {
                    width: 6px;
                }

                .pcp-preset-list::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.2);
                }

                .pcp-preset-list::-webkit-scrollbar-thumb {
                    background: rgba(116, 55, 149, 0.5);
                    border-radius: 3px;
                }

                .pcp-preset-item {
                    padding: 8px 12px;
                    cursor: pointer;
                    transition: background 0.2s ease;
                    color: #E0E0E0;
                    font-size: 12px;
                }

                .pcp-preset-item:hover {
                    background: rgba(116, 55, 149, 0.3);
                }

                .pcp-preset-item.active {
                    background: rgba(116, 55, 149, 0.5);
                    font-weight: 500;
                }

                .pcp-preset-empty {
                    padding: 12px;
                    text-align: center;
                    color: #999;
                    font-size: 12px;
                }

                .pcp-preset-button {
                    background: rgba(116, 55, 149, 0.2);
                    border: 1px solid rgba(116, 55, 149, 0.3);
                    border-radius: 4px;
                    padding: 4px 8px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 32px;
                }

                .pcp-preset-button:hover {
                    background: rgba(116, 55, 149, 0.4);
                    border-color: rgba(116, 55, 149, 0.5);
                }

                .pcp-button-refresh svg {
                    stroke: #B0B0B0;
                }

                .pcp-button-delete {
                    background: rgba(220, 38, 38, 0.2);
                    border-color: rgba(220, 38, 38, 0.3);
                }

                .pcp-button-delete:hover {
                    background: rgba(220, 38, 38, 0.4);
                    border-color: rgba(220, 38, 38, 0.5);
                }

                /* 参数列表 */
                .pcp-parameters-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 8px;
                }

                .pcp-parameters-list::-webkit-scrollbar {
                    width: 8px;
                }

                .pcp-parameters-list::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.1);
                    border-radius: 4px;
                }

                .pcp-parameters-list::-webkit-scrollbar-thumb {
                    background: rgba(116, 55, 149, 0.5);
                    border-radius: 4px;
                }

                .pcp-parameters-list::-webkit-scrollbar-thumb:hover {
                    background: rgba(116, 55, 149, 0.7);
                }

                /* 参数项 */
                .pcp-parameter-item {
                    background: linear-gradient(135deg, rgba(42, 42, 62, 0.6) 0%, rgba(58, 58, 78, 0.6) 100%);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 6px;
                    padding: 8px 10px;
                    margin-bottom: 6px;
                    transition: all 0.2s ease;
                    cursor: move;
                }

                .pcp-parameter-item:hover {
                    border-color: rgba(116, 55, 149, 0.5);
                    box-shadow: 0 2px 8px rgba(116, 55, 149, 0.2);
                    transform: translateY(-1px);
                }

                .pcp-parameter-item.dragging {
                    opacity: 0.5;
                }

                /* 参数控件容器 - 单行布局 */
                .pcp-parameter-control {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    width: 100%;
                }

                .pcp-parameter-name {
                    font-size: 12px;
                    font-weight: 500;
                    color: #E0E0E0;
                    white-space: nowrap;
                    min-width: 60px;
                    flex-shrink: 0;
                    position: relative;
                    padding-left: 18px;
                    user-select: none;
                    transition: all 0.2s ease;
                }

                /* 拖拽手柄图标 */
                .pcp-parameter-name::before {
                    content: '⋮⋮';
                    position: absolute;
                    left: 0;
                    top: 50%;
                    transform: translateY(-50%);
                    font-size: 14px;
                    color: #666;
                    opacity: 0.5;
                    transition: all 0.2s ease;
                    letter-spacing: -2px;
                }

                .pcp-parameter-name:hover {
                    color: #B39DDB;
                }

                .pcp-parameter-name:hover::before {
                    opacity: 1;
                    color: #B39DDB;
                }

                .pcp-parameter-edit {
                    background: rgba(59, 130, 246, 0.2);
                    border: 1px solid rgba(59, 130, 246, 0.3);
                    border-radius: 4px;
                    padding: 4px 6px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .pcp-parameter-edit svg {
                    stroke: #7CB3FF;
                }

                .pcp-parameter-edit:hover {
                    background: rgba(59, 130, 246, 0.4);
                    border-color: rgba(59, 130, 246, 0.5);
                }

                .pcp-parameter-delete {
                    background: rgba(220, 38, 38, 0.2);
                    border: 1px solid rgba(220, 38, 38, 0.3);
                    border-radius: 4px;
                    padding: 4px 6px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .pcp-parameter-delete svg {
                    stroke: #FF6B6B;
                }

                .pcp-parameter-delete:hover {
                    background: rgba(220, 38, 38, 0.4);
                    border-color: rgba(220, 38, 38, 0.5);
                }

                /* 分隔符样式 */
                .pcp-separator {
                    background: linear-gradient(135deg, rgba(116, 55, 149, 0.15) 0%, rgba(147, 112, 219, 0.1) 100%);
                    border: 1px solid rgba(147, 112, 219, 0.3);
                    border-radius: 8px;
                    padding: 10px 12px;
                    cursor: move;
                    box-shadow: 0 2px 8px rgba(116, 55, 149, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1);
                    transition: all 0.3s ease;
                }

                .pcp-separator:hover {
                    border-color: rgba(147, 112, 219, 0.5);
                    box-shadow: 0 4px 12px rgba(116, 55, 149, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.15);
                    transform: translateY(-1px);
                    background: linear-gradient(135deg, rgba(116, 55, 149, 0.2) 0%, rgba(147, 112, 219, 0.15) 100%);
                }

                /* 分隔符容器 - 单行布局 */
                .pcp-separator-container {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    width: 100%;
                }

                .pcp-separator-line {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    flex: 1;
                }

                .pcp-separator-line::before,
                .pcp-separator-line::after {
                    content: '';
                    flex: 1;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, rgba(147, 112, 219, 0.8), transparent);
                    box-shadow: 0 0 4px rgba(147, 112, 219, 0.4);
                }

                .pcp-separator-label {
                    font-size: 13px;
                    font-weight: 600;
                    color: #B39DDB;
                    white-space: nowrap;
                    text-shadow: 0 0 8px rgba(147, 112, 219, 0.5);
                    letter-spacing: 0.5px;
                    user-select: none;
                }

                /* 分隔符标签容器可拖拽时的视觉提示 */
                .pcp-separator-line span[draggable="true"]:hover {
                    filter: brightness(1.3);
                    text-shadow: 0 0 12px rgba(147, 112, 219, 0.8);
                }

                /* 滑条样式 */
                .pcp-slider-container {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex: 1;
                    min-width: 0; /* 允许被压缩，防止挤出按钮 */
                }

                .pcp-slider-track {
                    flex: 1;
                    min-width: 120px;
                }

                .pcp-slider {
                    width: 100%;
                    height: 6px;
                    border-radius: 3px;
                    background: rgba(0, 0, 0, 0.3);
                    outline: none;
                    -webkit-appearance: none;
                    appearance: none;
                }

                .pcp-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #743795 0%, #8b4ba8 100%);
                    cursor: pointer;
                    border: 2px solid #fff;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                }

                .pcp-slider::-moz-range-thumb {
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #743795 0%, #8b4ba8 100%);
                    cursor: pointer;
                    border: 2px solid #fff;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                }

                .pcp-slider-value {
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                    padding: 3px 6px;
                    color: #E0E0E0;
                    font-size: 11px;
                    width: 50px;
                    text-align: center;
                    flex-shrink: 0;
                }

                .pcp-slider-value:focus {
                    outline: none;
                    border-color: #743795;
                    background: rgba(0, 0, 0, 0.4);
                }

                /* 开关样式 */
                .pcp-switch {
                    position: relative;
                    width: 50px;
                    height: 24px;
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    flex-shrink: 0;
                    margin-left: auto;
                }

                .pcp-switch.active {
                    background: linear-gradient(135deg, #743795 0%, #8b4ba8 100%);
                    border-color: rgba(116, 55, 149, 0.5);
                }

                .pcp-switch-thumb {
                    position: absolute;
                    top: 2px;
                    left: 2px;
                    width: 18px;
                    height: 18px;
                    background: #fff;
                    border-radius: 50%;
                    transition: all 0.3s ease;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                }

                .pcp-switch.active .pcp-switch-thumb {
                    left: 28px;
                }

                /* 下拉菜单样式 */
                .pcp-dropdown {
                    flex: 1;
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 6px;
                    padding: 4px 8px;
                    color: #E0E0E0;
                    font-size: 12px;
                    min-width: 80px;
                    max-width: 100%; /* 限制最大宽度 */
                    transition: all 0.2s ease;
                    cursor: pointer;
                    /* 文本溢出处理 */
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .pcp-dropdown:focus {
                    outline: none;
                    border-color: #743795;
                    background: rgba(0, 0, 0, 0.4);
                }

                /* 下拉菜单选项样式 */
                .pcp-dropdown option {
                    background: #3d2951; /* 深紫色背景 */
                    color: #E0E0E0; /* 白色文字 */
                    padding: 6px 8px;
                }

                .pcp-dropdown option:hover {
                    background: #4d3561; /* 悬停时稍亮的紫色 */
                }

                .pcp-dropdown option:checked {
                    background: #5d4171; /* 选中时更亮的紫色 */
                    font-weight: 500;
                }

                /* 底部按钮 */
                .pcp-add-parameter-container {
                    padding: 12px;
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                    display: flex;
                    gap: 8px;
                }

                .pcp-button {
                    flex: 1;
                    padding: 10px 16px;
                    background: linear-gradient(135deg, rgba(64, 64, 84, 0.8) 0%, rgba(74, 74, 94, 0.8) 100%);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    color: #E0E0E0;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 500;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                }

                .pcp-button:hover {
                    background: linear-gradient(135deg, rgba(84, 84, 104, 0.9) 0%, rgba(94, 94, 114, 0.9) 100%);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                }

                .pcp-button-primary {
                    background: linear-gradient(135deg, #743795 0%, #8b4ba8 100%);
                }

                .pcp-button-primary:hover {
                    background: linear-gradient(135deg, #8b4ba8 0%, #a35dbe 100%);
                }

                /* 对话框样式 */
                .pcp-dialog-overlay {
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
                }

                .pcp-dialog {
                    background: #2a2a3a;
                    border: 2px solid #555;
                    border-radius: 12px;
                    padding: 24px;
                    min-width: 600px;
                    max-width: 800px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
                }

                .pcp-dialog h3 {
                    margin: 0 0 20px 0;
                    color: #fff;
                    font-size: 18px;
                }

                .pcp-dialog-row {
                    display: flex;
                    gap: 16px;
                    margin-bottom: 16px;
                }

                .pcp-dialog-field {
                    margin-bottom: 16px;
                }

                .pcp-dialog-field-half {
                    flex: 1;
                    margin-bottom: 0;
                }

                .pcp-dialog-label {
                    display: block;
                    color: #ccc;
                    margin-bottom: 8px;
                    font-size: 13px;
                }

                .pcp-dialog-input,
                .pcp-dialog-select,
                .pcp-dialog-textarea {
                    width: 100%;
                    padding: 8px 12px;
                    background: #1a1a2a;
                    border: 1px solid #555;
                    color: #fff;
                    border-radius: 6px;
                    font-size: 13px;
                    box-sizing: border-box;
                }

                .pcp-dialog-textarea {
                    min-height: 100px;
                    resize: vertical;
                    font-family: monospace;
                }

                .pcp-dialog-input:focus,
                .pcp-dialog-select:focus,
                .pcp-dialog-textarea:focus {
                    outline: none;
                    border-color: #743795;
                }

                .pcp-dialog-buttons {
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                    margin-top: 24px;
                }

                .pcp-dialog-button {
                    padding: 8px 20px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 500;
                    transition: all 0.2s ease;
                }

                .pcp-dialog-button-primary {
                    background: linear-gradient(135deg, #743795 0%, #8b4ba8 100%);
                    color: #fff;
                }

                .pcp-dialog-button-primary:hover {
                    background: linear-gradient(135deg, #8b4ba8 0%, #a35dbe 100%);
                }

                .pcp-dialog-button-secondary {
                    background: #444;
                    color: #fff;
                }

                .pcp-dialog-button-secondary:hover {
                    background: #555;
                }

                /* 颜色选择器样式 */
                .pcp-color-picker-container {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .pcp-color-picker {
                    width: 60px;
                    height: 40px;
                    border: 2px solid #555;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .pcp-color-picker:hover {
                    border-color: #743795;
                    box-shadow: 0 0 8px rgba(116, 55, 149, 0.4);
                }

                .pcp-color-value {
                    flex: 1;
                    background: #1a1a2a;
                    border: 1px solid #555;
                    color: #fff;
                    border-radius: 6px;
                    padding: 8px 12px;
                    font-size: 13px;
                    font-family: monospace;
                }

                .pcp-color-presets {
                    display: flex;
                    gap: 8px;
                    margin-top: 12px;
                    flex-wrap: wrap;
                }

                .pcp-color-preset-btn {
                    width: 40px;
                    height: 40px;
                    border: 2px solid #555;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    position: relative;
                }

                .pcp-color-preset-btn:hover {
                    border-color: #fff;
                    transform: scale(1.1);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
                }

                .pcp-color-preset-btn.active {
                    border-color: #fff;
                    box-shadow: 0 0 12px rgba(255, 255, 255, 0.6);
                }

                .pcp-color-preset-btn::after {
                    content: '✓';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    color: #fff;
                    font-size: 18px;
                    font-weight: bold;
                    text-shadow: 0 0 4px rgba(0, 0, 0, 0.8);
                    opacity: 0;
                    transition: opacity 0.2s ease;
                }

                .pcp-color-preset-btn.active::after {
                    opacity: 1;
                }

                /* 动画 */
                @keyframes pcpFadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(5px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .pcp-parameter-item {
                    animation: pcpFadeIn 0.3s ease-out;
                }
            `;
            document.head.appendChild(style);
        };

        // 绑定UI事件
        nodeType.prototype.bindUIEvents = function () {
            const container = this.customUI;

            // 锁定按钮 - 双击切换锁定状态
            const lockButton = container.querySelector('#pcp-lock-button');
            lockButton.addEventListener('dblclick', () => {
                this.toggleLock();
            });

            // 添加参数按钮
            const addButton = container.querySelector('#pcp-add-parameter');
            addButton.addEventListener('click', () => {
                this.showParameterDialog();
            });

            // 预设选择器
            const presetSearch = container.querySelector('#pcp-preset-search');
            const presetDropdown = container.querySelector('#pcp-preset-dropdown');
            const presetFilter = container.querySelector('#pcp-preset-filter');

            // 点击搜索框显示/隐藏下拉列表
            presetSearch.addEventListener('click', (e) => {
                e.stopPropagation();
                const isVisible = presetDropdown.style.display === 'block';
                presetDropdown.style.display = isVisible ? 'none' : 'block';
                if (!isVisible) {
                    presetFilter.value = '';
                    this.filterPresets('');
                    presetFilter.focus();
                }
            });

            // 搜索过滤
            presetFilter.addEventListener('input', (e) => {
                this.filterPresets(e.target.value);
            });

            // 点击外部关闭下拉列表
            document.addEventListener('click', (e) => {
                if (!container.contains(e.target)) {
                    presetDropdown.style.display = 'none';
                }
            });

            // 刷新预设列表按钮
            const refreshPresetButton = container.querySelector('#pcp-refresh-preset');
            refreshPresetButton.addEventListener('click', () => {
                this.loadPresetsList();
                this.showToast(t('presetsRefreshed'), 'success');
            });

            // 保存预设按钮
            const savePresetButton = container.querySelector('#pcp-save-preset');
            savePresetButton.addEventListener('click', () => {
                const presetName = this.properties.currentPreset;
                if (presetName) {
                    this.savePreset(presetName);
                }
            });

            // 新建预设按钮
            const newPresetButton = container.querySelector('#pcp-new-preset');
            newPresetButton.addEventListener('click', () => {
                this.showPresetDialog();
            });

            // 删除预设按钮
            const deletePresetButton = container.querySelector('#pcp-delete-preset');
            deletePresetButton.addEventListener('click', () => {
                const presetName = this.properties.currentPreset;
                if (presetName) {
                    this.deletePreset(presetName);
                }
            });
        };

        // 根据当前锁定状态更新UI（不改变锁定状态值）
        nodeType.prototype.updateLockUI = function () {
            if (!this.customUI) return;

            const lockButton = this.customUI.querySelector('#pcp-lock-button');
            const addButton = this.customUI.querySelector('#pcp-add-parameter');

            if (!lockButton || !addButton) return;

            if (this.properties.locked) {
                // 应用锁定模式UI
                lockButton.classList.add('locked');
                addButton.style.display = 'none';
            } else {
                // 应用解锁模式UI
                lockButton.classList.remove('locked');
                addButton.style.display = '';
            }

            // 重新渲染参数列表以应用锁定状态到每个参数项
            if (this.properties.parameters && this.properties.parameters.length > 0) {
                this.updateParametersList();
            }
        };

        // 切换锁定模式
        nodeType.prototype.toggleLock = function () {
            this.properties.locked = !this.properties.locked;

            // 更新UI
            this.updateLockUI();

            // 显示提示
            if (this.properties.locked) {
                this.showToast('已开启锁定模式', 'success');
                console.log('[PCP] 锁定模式已开启');
            } else {
                this.showToast('已关闭锁定模式', 'success');
                console.log('[PCP] 锁定模式已关闭');
            }
        };

        // 更新参数列表显示
        nodeType.prototype.updateParametersList = function () {
            const listContainer = this.customUI.querySelector('#pcp-parameters-list');
            listContainer.innerHTML = '';

            this.properties.parameters.forEach((param, index) => {
                const paramItem = this.createParameterItem(param, index);
                listContainer.appendChild(paramItem);
            });

            // 更新节点输出
            this.updateOutputs();

            // 通知连接的 ParameterBreak 节点更新
            this.notifyConnectedBreakNodes();
        };

        // 通知所有连接的 ParameterBreak 节点更新参数结构
        nodeType.prototype.notifyConnectedBreakNodes = function () {
            try {
                if (!this.outputs || this.outputs.length === 0) {
                    return;
                }

                const output = this.outputs[0];
                if (!output.links || output.links.length === 0) {
                    return;
                }

                // 遍历所有连接
                output.links.forEach(linkId => {
                    const link = this.graph.links[linkId];
                    if (!link) return;

                    const targetNode = this.graph.getNodeById(link.target_id);
                    if (!targetNode) return;

                    // 如果目标节点是 ParameterBreak，调用其同步方法
                    if (targetNode.type === "ParameterBreak" && typeof targetNode.syncParameterStructure === 'function') {
                        console.log('[PCP] 通知 ParameterBreak 节点更新:', targetNode.id);
                        // 延迟一下，确保数据已同步
                        setTimeout(() => {
                            targetNode.syncParameterStructure();
                        }, 50);
                    }
                });
            } catch (error) {
                console.error('[PCP] 通知连接节点时出错:', error);
            }
        };

        // ==================== 参数UI创建方法 ====================

        // 创建参数项DOM元素
        nodeType.prototype.createParameterItem = function (param, index) {
            const item = document.createElement('div');
            item.className = 'pcp-parameter-item';
            item.dataset.paramId = param.id;

            // 分隔符特殊处理
            if (param.type === 'separator') {
                item.classList.add('pcp-separator');

                // 创建单行布局容器
                const separatorContainer = document.createElement('div');
                separatorContainer.className = 'pcp-separator-container';

                // 创建分隔符内容（包含装饰线和标签）
                const separatorUI = this.createSeparator(param);

                // 为分隔符UI绑定拖拽事件
                const dragHandle = separatorUI.querySelector('span[draggable="true"]');
                if (dragHandle) {
                    // 锁定模式下禁用拖拽
                    if (this.properties.locked) {
                        dragHandle.draggable = false;
                        dragHandle.style.cursor = 'default';
                        dragHandle.title = '';
                    } else {
                        dragHandle.addEventListener('dragstart', (e) => {
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('text/plain', param.id);
                            item.classList.add('dragging');
                            e.stopPropagation();
                        });

                        dragHandle.addEventListener('dragend', () => {
                            item.classList.remove('dragging');
                        });
                    }
                }

                separatorContainer.appendChild(separatorUI);

                // 编辑按钮（SVG图标）
                const editButton = document.createElement('button');
                editButton.className = 'pcp-parameter-edit';
                editButton.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                `;
                // 阻止按钮触发拖拽
                editButton.addEventListener('mousedown', (e) => e.stopPropagation());
                editButton.draggable = false;
                separatorContainer.appendChild(editButton);

                // 删除按钮（SVG图标）- 锁定模式下隐藏
                const deleteButton = document.createElement('button');
                deleteButton.className = 'pcp-parameter-delete';
                deleteButton.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                `;
                // 阻止按钮触发拖拽
                deleteButton.addEventListener('mousedown', (e) => e.stopPropagation());
                deleteButton.draggable = false;
                // 锁定模式下隐藏删除按钮
                if (this.properties.locked) {
                    deleteButton.style.display = 'none';
                }
                separatorContainer.appendChild(deleteButton);

                item.appendChild(separatorContainer);

                // 绑定编辑/删除事件
                editButton.addEventListener('click', () => {
                    this.editParameter(param.id);
                });
                deleteButton.addEventListener('click', () => {
                    this.deleteParameter(param.id);
                });

                // item 本身不可拖拽，只能通过拖动分隔符标签来排序
                item.draggable = false;

                // 保留 dragover 和 drop 事件用于接收拖放
                item.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                });

                item.addEventListener('drop', (e) => {
                    e.preventDefault();
                    const draggedId = e.dataTransfer.getData('text/plain');
                    if (draggedId !== param.id) {
                        this.reorderParameters(draggedId, param.id);
                    }
                });

                return item;
            }

            // 单行布局：名称 + 控件 + 按钮全部在一行
            const control = document.createElement('div');
            control.className = 'pcp-parameter-control';

            // 阻止控件容器触发拖拽
            control.draggable = false;
            control.addEventListener('dragstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                return false;
            });

            // 参数名称（作为拖拽手柄）
            const nameLabel = document.createElement('span');
            nameLabel.className = 'pcp-parameter-name';
            nameLabel.textContent = param.name;

            // 锁定模式下禁用拖拽
            if (this.properties.locked) {
                nameLabel.draggable = false;
                nameLabel.style.cursor = 'default';
                nameLabel.title = '';
            } else {
                nameLabel.draggable = true;
                nameLabel.style.cursor = 'move';
                nameLabel.title = '拖动此处可排序';

                // 为名称标签绑定拖拽事件
                nameLabel.addEventListener('dragstart', (e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', param.id);
                    item.classList.add('dragging');
                    e.stopPropagation();
                });

                nameLabel.addEventListener('dragend', () => {
                    item.classList.remove('dragging');
                });
            }

            control.appendChild(nameLabel);

            // 添加对应的控件
            switch (param.type) {
                case 'slider':
                    control.appendChild(this.createSlider(param));
                    break;
                case 'switch':
                    control.appendChild(this.createSwitch(param));
                    break;
                case 'dropdown':
                    control.appendChild(this.createDropdown(param));
                    break;
            }

            // 编辑按钮（SVG图标）
            const editButton = document.createElement('button');
            editButton.className = 'pcp-parameter-edit';
            editButton.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
            `;
            // 阻止按钮触发拖拽
            editButton.draggable = false;
            editButton.addEventListener('dragstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                return false;
            });
            control.appendChild(editButton);

            // 删除按钮（SVG图标）- 锁定模式下隐藏
            const deleteButton = document.createElement('button');
            deleteButton.className = 'pcp-parameter-delete';
            deleteButton.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
            `;
            // 阻止按钮触发拖拽
            deleteButton.draggable = false;
            deleteButton.addEventListener('dragstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                return false;
            });
            // 锁定模式下隐藏删除按钮
            if (this.properties.locked) {
                deleteButton.style.display = 'none';
            }
            control.appendChild(deleteButton);

            item.appendChild(control);

            // 绑定事件
            editButton.addEventListener('click', () => {
                this.editParameter(param.id);
            });

            deleteButton.addEventListener('click', () => {
                this.deleteParameter(param.id);
            });

            // item 本身不可拖拽，只能通过拖动名称标签来排序
            item.draggable = false;

            // 保留 dragover 和 drop 事件用于接收拖放
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                const draggedId = e.dataTransfer.getData('text/plain');
                if (draggedId !== param.id) {
                    this.reorderParameters(draggedId, param.id);
                }
            });

            return item;
        };

        // 创建分隔符UI
        nodeType.prototype.createSeparator = function (param) {
            const separator = document.createElement('div');
            separator.className = 'pcp-separator-line';

            // 获取自定义颜色，如果没有则使用默认紫色
            const customColor = param.color || param.config?.color || '#9370DB';

            // 解析颜色为RGB以生成半透明版本
            const hexToRgb = (hex) => {
                const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                return result ? {
                    r: parseInt(result[1], 16),
                    g: parseInt(result[2], 16),
                    b: parseInt(result[3], 16)
                } : { r: 147, g: 112, b: 219 }; // 默认紫色
            };

            const rgb = hexToRgb(customColor);
            const rgbaSolid = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.9)`;
            const rgbaGlow = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`;

            // 创建连贯的装饰线（完整的横线）
            const fullLine = document.createElement('div');
            fullLine.style.position = 'absolute';
            fullLine.style.left = '0';
            fullLine.style.right = '0';
            fullLine.style.top = '50%';
            fullLine.style.transform = 'translateY(-50%)';
            fullLine.style.height = '2px';
            fullLine.style.background = `linear-gradient(90deg,
                transparent 0%,
                ${rgbaSolid} 10%,
                ${rgbaSolid} 90%,
                transparent 100%)`;
            fullLine.style.boxShadow = `0 0 6px ${rgbaGlow}`;
            fullLine.style.zIndex = '0';

            // 设置separator为相对定位
            separator.style.position = 'relative';

            // 创建标签容器（带背景遮罩，可拖拽）
            const labelContainer = document.createElement('span');
            labelContainer.style.position = 'relative';
            labelContainer.style.zIndex = '1';
            labelContainer.style.padding = '0 16px';
            labelContainer.style.background = 'linear-gradient(90deg, transparent, #1e1e2e 20%, #1e1e2e 80%, transparent)';
            labelContainer.style.display = 'inline-block';
            labelContainer.style.cursor = 'move';
            labelContainer.draggable = true;
            labelContainer.title = '拖动此处可排序';

            // 创建标签
            const label = document.createElement('span');
            label.className = 'pcp-separator-label';
            label.textContent = param.name || t('separatorLabel');
            label.style.color = customColor;
            label.style.textShadow = `0 0 8px ${rgbaGlow}, 0 0 12px ${rgbaGlow}`;

            labelContainer.appendChild(label);

            // 组装
            separator.appendChild(fullLine);
            separator.appendChild(labelContainer);

            return separator;
        };

        // 创建滑条UI
        nodeType.prototype.createSlider = function (param) {
            const container = document.createElement('div');
            container.className = 'pcp-slider-container';

            const config = param.config || {};
            const min = config.min || 0;
            const max = config.max || 100;
            const step = config.step || 1;
            const value = param.value !== undefined ? param.value : (config.default || min);

            // 滑条轨道容器
            const trackContainer = document.createElement('div');
            trackContainer.className = 'pcp-slider-track';

            // Range输入
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.className = 'pcp-slider';
            slider.min = min;
            slider.max = max;
            slider.step = step;
            slider.value = value;

            trackContainer.appendChild(slider);
            container.appendChild(trackContainer);

            // 数值输入框
            const valueInput = document.createElement('input');
            valueInput.type = 'number';
            valueInput.className = 'pcp-slider-value';
            valueInput.min = min;
            valueInput.max = max;
            valueInput.step = step;
            valueInput.value = value;

            container.appendChild(valueInput);

            // 阻止滑条触发拖拽事件（多层阻止）
            const preventDrag = (e) => {
                e.stopPropagation();
            };
            const preventDragStart = (e) => {
                e.preventDefault();
                e.stopPropagation();
            };

            // 容器级别阻止
            container.addEventListener('mousedown', preventDrag);
            container.addEventListener('dragstart', preventDragStart);
            container.draggable = false;

            // 滑条元素级别阻止
            slider.addEventListener('mousedown', preventDrag);
            slider.addEventListener('dragstart', preventDragStart);
            slider.draggable = false;

            // 数值输入框级别阻止
            valueInput.addEventListener('mousedown', preventDrag);
            valueInput.addEventListener('dragstart', preventDragStart);
            valueInput.draggable = false;

            // 同步滑条和输入框
            slider.addEventListener('input', (e) => {
                const newValue = parseFloat(e.target.value);
                valueInput.value = newValue;
                param.value = newValue;
                this.syncConfig();
            });

            valueInput.addEventListener('change', (e) => {
                let newValue = parseFloat(e.target.value);
                // 限制范围
                newValue = Math.max(min, Math.min(max, newValue));
                // 对齐步长
                newValue = Math.round(newValue / step) * step;
                valueInput.value = newValue;
                slider.value = newValue;
                param.value = newValue;
                this.syncConfig();
            });

            return container;
        };

        // 创建开关UI
        nodeType.prototype.createSwitch = function (param) {
            const switchContainer = document.createElement('div');
            switchContainer.className = 'pcp-switch';

            const value = param.value !== undefined ? param.value : (param.config?.default || false);
            if (value) {
                switchContainer.classList.add('active');
            }

            const thumb = document.createElement('div');
            thumb.className = 'pcp-switch-thumb';
            switchContainer.appendChild(thumb);

            // 阻止开关触发拖拽
            switchContainer.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });
            switchContainer.addEventListener('dragstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
            switchContainer.draggable = false;

            // 点击切换
            switchContainer.addEventListener('click', () => {
                const newValue = !param.value;
                param.value = newValue;

                if (newValue) {
                    switchContainer.classList.add('active');
                } else {
                    switchContainer.classList.remove('active');
                }

                this.syncConfig();
            });

            return switchContainer;
        };

        // 创建下拉菜单UI
        nodeType.prototype.createDropdown = function (param) {
            const container = document.createElement('div');
            container.className = 'pcp-dropdown-container';
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.style.gap = '8px';
            container.style.flex = '1';
            container.style.minWidth = '0'; // 允许被压缩，防止挤出按钮
            container.style.overflow = 'hidden'; // 隐藏溢出内容

            const select = document.createElement('select');
            select.className = 'pcp-dropdown';
            // 添加参数名标识，用于后续刷新选项
            select.dataset.paramName = param.name;

            const config = param.config || {};
            const dataSource = config.data_source || 'custom';

            // 添加数据源状态指示器
            const indicator = document.createElement('span');
            indicator.className = 'pcp-dropdown-indicator';
            indicator.style.fontSize = '14px';
            indicator.style.opacity = '0.7';
            indicator.style.flexShrink = '0';

            if (dataSource === 'from_connection') {
                indicator.textContent = '🔗';
                indicator.title = '从连接自动获取选项';
            } else if (dataSource === 'custom') {
                indicator.textContent = '✏️';
                indicator.title = '手动配置选项';
            } else {
                indicator.textContent = '📁';
                indicator.title = '从' + (dataSource === 'checkpoint' ? 'Checkpoint' : 'LoRA') + '目录获取';
            }

            // 阻止下拉菜单触发拖拽
            select.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });
            select.addEventListener('dragstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
            select.draggable = false;

            // 加载选项
            if (dataSource === 'custom' || dataSource === 'from_connection') {
                // 自定义选项或从连接获取
                const options = config.options || [];
                options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt;
                    option.textContent = opt;
                    if (param.value === opt) {
                        option.selected = true;
                    }
                    select.appendChild(option);
                });
            } else {
                // 动态数据源（checkpoint/lora）
                this.loadDataSource(dataSource).then(options => {
                    options.forEach(opt => {
                        const option = document.createElement('option');
                        option.value = opt;
                        option.textContent = opt;
                        if (param.value === opt) {
                            option.selected = true;
                        }
                        select.appendChild(option);
                    });
                });
            }

            // 选择事件
            select.addEventListener('change', (e) => {
                param.value = e.target.value;
                this.syncConfig();
            });

            // 组装container
            container.appendChild(indicator);
            container.appendChild(select);

            return container;
        };

        // ==================== 辅助方法 ====================

        // 加载数据源
        nodeType.prototype.loadDataSource = async function (sourceType) {
            try {
                const response = await fetch(`/danbooru_gallery/pcp/get_data_source?type=${sourceType}`);
                const data = await response.json();
                if (data.status === 'success') {
                    return data.options || [];
                }
                return [];
            } catch (error) {
                console.error('[PCP] 加载数据源失败:', error);
                return [];
            }
        };

        // 刷新下拉菜单选项（用于from_connection类型）
        nodeType.prototype.refreshDropdownOptions = function (paramName, options) {
            try {
                // 查找参数
                const param = this.properties.parameters.find(p => p.name === paramName);
                if (!param || param.type !== 'dropdown') {
                    console.warn('[PCP] 未找到下拉菜单参数:', paramName);
                    return;
                }

                // 更新参数配置中的选项
                if (!param.config) {
                    param.config = {};
                }
                param.config.options = options;

                // 查找对应的select元素
                const select = this.customUI?.querySelector(`select[data-param-name="${paramName}"]`);
                if (!select) {
                    console.warn('[PCP] 未找到下拉菜单UI元素:', paramName);
                    return;
                }

                // 保存当前选中值
                const currentValue = select.value;

                // 清空现有选项
                select.innerHTML = '';

                // 添加新选项
                options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt;
                    option.textContent = opt;
                    select.appendChild(option);
                });

                // 恢复选中值（如果仍然有效）
                if (options.includes(currentValue)) {
                    select.value = currentValue;
                    param.value = currentValue;
                } else if (options.length > 0) {
                    // 如果之前的值无效，选择第一个
                    select.value = options[0];
                    param.value = options[0];
                }

                console.log(`[PCP] 下拉菜单 '${paramName}' 选项已刷新: ${options.length} 个选项`);

                // 同步配置到后端
                this.syncConfig();

            } catch (error) {
                console.error('[PCP] 刷新下拉菜单选项失败:', error);
            }
        };

        // 根据ID查找参数
        nodeType.prototype.getParameterById = function (id) {
            return this.properties.parameters.find(p => p.id === id);
        };

        // 根据ID查找参数索引
        nodeType.prototype.getParameterIndexById = function (id) {
            return this.properties.parameters.findIndex(p => p.id === id);
        };

        // 检查参数名称是否重复
        nodeType.prototype.checkParameterNameDuplicate = function (name, excludeId = null) {
            return this.properties.parameters.some(p =>
                p.name === name && p.id !== excludeId && p.type !== 'separator'
            );
        };

        // 显示Toast提示
        nodeType.prototype.showToast = function (message, type = 'info') {
            try {
                globalToastManager.showToast(message, type, 3000);
            } catch (error) {
                console.error('[PCP] Toast显示失败:', error);
            }
        };

        // ==================== 对话框系统 ====================

        // 显示参数创建/编辑对话框
        nodeType.prototype.showParameterDialog = function (paramId = null) {
            const isEdit = paramId !== null;
            const param = isEdit ? this.getParameterById(paramId) : null;

            // 创建对话框覆盖层
            const overlay = document.createElement('div');
            overlay.className = 'pcp-dialog-overlay';

            // 创建对话框
            const dialog = document.createElement('div');
            dialog.className = 'pcp-dialog';

            const title = isEdit ? t('editParameter') : t('addParameter');

            dialog.innerHTML = `
                <h3>${title}</h3>

                <div class="pcp-dialog-row">
                    <div class="pcp-dialog-field pcp-dialog-field-half">
                        <label class="pcp-dialog-label">${t('parameterType')}</label>
                        <select class="pcp-dialog-select" id="pcp-param-type">
                            <option value="slider" ${param?.type === 'slider' ? 'selected' : ''}>${t('slider')}</option>
                            <option value="switch" ${param?.type === 'switch' ? 'selected' : ''}>${t('switch')}</option>
                            <option value="dropdown" ${param?.type === 'dropdown' ? 'selected' : ''}>${t('dropdown')}</option>
                            <option value="separator" ${param?.type === 'separator' ? 'selected' : ''}>${t('separator')}</option>
                        </select>
                    </div>

                    <div class="pcp-dialog-field pcp-dialog-field-half">
                        <label class="pcp-dialog-label">${t('parameterName')}</label>
                        <input type="text" class="pcp-dialog-input" id="pcp-param-name"
                               placeholder="${t('parameterNamePlaceholder')}"
                               value="${param?.name || ''}">
                    </div>
                </div>

                <div id="pcp-config-panel"></div>

                <div class="pcp-dialog-buttons">
                    <button class="pcp-dialog-button pcp-dialog-button-secondary" id="pcp-dialog-cancel">
                        ${t('cancel')}
                    </button>
                    <button class="pcp-dialog-button pcp-dialog-button-primary" id="pcp-dialog-confirm">
                        ${t('confirm')}
                    </button>
                </div>
            `;

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            const nameInput = dialog.querySelector('#pcp-param-name');
            const typeSelect = dialog.querySelector('#pcp-param-type');
            const configPanel = dialog.querySelector('#pcp-config-panel');
            const cancelButton = dialog.querySelector('#pcp-dialog-cancel');
            const confirmButton = dialog.querySelector('#pcp-dialog-confirm');

            // 锁定模式下禁用名称编辑
            if (isEdit && this.properties.locked) {
                nameInput.disabled = true;
                nameInput.style.opacity = '0.6';
                nameInput.style.cursor = 'not-allowed';
                nameInput.title = '锁定模式下无法修改参数名称';
            }

            // 更新配置面板
            const updateConfigPanel = (type) => {
                configPanel.innerHTML = '';

                switch (type) {
                    case 'separator':
                        // 分隔符配置：颜色选择
                        const separatorColor = param?.color || '#9370DB';
                        const colorPresets = [
                            { name: '紫色', value: '#9370DB' },
                            { name: '蓝色', value: '#4A90E2' },
                            { name: '绿色', value: '#50C878' },
                            { name: '橙色', value: '#FF8C42' },
                            { name: '红色', value: '#E74C3C' },
                            { name: '粉色', value: '#FF6B9D' },
                            { name: '青色', value: '#00CED1' },
                            { name: '金色', value: '#FFD700' }
                        ];

                        configPanel.innerHTML = `
                            <div class="pcp-dialog-field">
                                <p style="color: #999; font-size: 12px; margin: 0 0 12px 0;">
                                    提示：参数名称将作为分隔符的显示文本
                                </p>
                            </div>

                            <div class="pcp-dialog-field">
                                <label class="pcp-dialog-label">颜色主题</label>
                                <div class="pcp-color-picker-container">
                                    <input type="color" class="pcp-color-picker" id="pcp-separator-color" value="${separatorColor}">
                                    <input type="text" class="pcp-color-value" id="pcp-separator-color-value" value="${separatorColor}" readonly>
                                </div>
                            </div>

                            <div class="pcp-dialog-field">
                                <label class="pcp-dialog-label">快速选择</label>
                                <div class="pcp-color-presets" id="pcp-color-presets">
                                    ${colorPresets.map(preset => `
                                        <button class="pcp-color-preset-btn ${preset.value === separatorColor ? 'active' : ''}"
                                                data-color="${preset.value}"
                                                style="background: ${preset.value};"
                                                title="${preset.name}">
                                        </button>
                                    `).join('')}
                                </div>
                            </div>
                        `;

                        // 绑定颜色选择器事件
                        const colorPicker = configPanel.querySelector('#pcp-separator-color');
                        const colorValue = configPanel.querySelector('#pcp-separator-color-value');
                        const presetButtons = configPanel.querySelectorAll('.pcp-color-preset-btn');

                        // 颜色选择器变化
                        colorPicker.addEventListener('input', (e) => {
                            const newColor = e.target.value.toUpperCase();
                            colorValue.value = newColor;
                            // 更新预设按钮激活状态
                            presetButtons.forEach(btn => {
                                if (btn.dataset.color.toUpperCase() === newColor) {
                                    btn.classList.add('active');
                                } else {
                                    btn.classList.remove('active');
                                }
                            });
                        });

                        // 快速选择按钮
                        presetButtons.forEach(btn => {
                            btn.addEventListener('click', (e) => {
                                e.preventDefault();
                                const color = btn.dataset.color;
                                colorPicker.value = color;
                                colorValue.value = color.toUpperCase();
                                // 更新激活状态
                                presetButtons.forEach(b => b.classList.remove('active'));
                                btn.classList.add('active');
                            });
                        });
                        break;

                    case 'slider':
                        const sliderConfig = param?.config || {};
                        configPanel.innerHTML = `
                            <div class="pcp-dialog-row">
                                <div class="pcp-dialog-field pcp-dialog-field-half">
                                    <label class="pcp-dialog-label">${t('min')}</label>
                                    <input type="number" class="pcp-dialog-input" id="pcp-slider-min"
                                           value="${sliderConfig.min !== undefined ? sliderConfig.min : 0}">
                                </div>
                                <div class="pcp-dialog-field pcp-dialog-field-half">
                                    <label class="pcp-dialog-label">${t('max')}</label>
                                    <input type="number" class="pcp-dialog-input" id="pcp-slider-max"
                                           value="${sliderConfig.max !== undefined ? sliderConfig.max : 100}">
                                </div>
                            </div>
                            <div class="pcp-dialog-row">
                                <div class="pcp-dialog-field pcp-dialog-field-half">
                                    <label class="pcp-dialog-label">${t('step')}</label>
                                    <input type="number" class="pcp-dialog-input" id="pcp-slider-step"
                                           value="${sliderConfig.step !== undefined ? sliderConfig.step : 1}" step="0.01">
                                </div>
                                <div class="pcp-dialog-field pcp-dialog-field-half">
                                    <label class="pcp-dialog-label">${t('defaultValue')}</label>
                                    <input type="number" class="pcp-dialog-input" id="pcp-slider-default"
                                           value="${sliderConfig.default !== undefined ? sliderConfig.default : 0}">
                                </div>
                            </div>
                        `;
                        break;

                    case 'switch':
                        const switchDefault = param?.config?.default !== undefined ? param.config.default : false;
                        configPanel.innerHTML = `
                            <div class="pcp-dialog-field">
                                <label class="pcp-dialog-label">${t('defaultValue')}</label>
                                <select class="pcp-dialog-select" id="pcp-switch-default">
                                    <option value="false" ${!switchDefault ? 'selected' : ''}>False</option>
                                    <option value="true" ${switchDefault ? 'selected' : ''}>True</option>
                                </select>
                            </div>
                        `;
                        break;

                    case 'dropdown':
                        const dropdownConfig = param?.config || {};
                        const dataSource = dropdownConfig.data_source || 'custom';
                        const optionsText = Array.isArray(dropdownConfig.options)
                            ? dropdownConfig.options.join('\n')
                            : '';

                        configPanel.innerHTML = `
                            <div class="pcp-dialog-field">
                                <label class="pcp-dialog-label">${t('dataSource')}</label>
                                <select class="pcp-dialog-select" id="pcp-dropdown-source">
                                    <option value="from_connection" ${dataSource === 'from_connection' ? 'selected' : ''}>${t('fromConnection')}</option>
                                    <option value="custom" ${dataSource === 'custom' ? 'selected' : ''}>${t('custom')}</option>
                                    <option value="checkpoint" ${dataSource === 'checkpoint' ? 'selected' : ''}>${t('checkpoint')}</option>
                                    <option value="lora" ${dataSource === 'lora' ? 'selected' : ''}>${t('lora')}</option>
                                </select>
                            </div>
                            <div class="pcp-dialog-field" id="pcp-dropdown-options-field">
                                <label class="pcp-dialog-label">${t('options')}</label>
                                <textarea class="pcp-dialog-textarea" id="pcp-dropdown-options"
                                          placeholder="${t('optionsPlaceholder')}">${optionsText}</textarea>
                            </div>
                            <div class="pcp-dialog-field" id="pcp-dropdown-auto-sync-hint" style="display: none;">
                                <p style="color: #999; font-size: 12px; margin: 0; padding: 8px; background: rgba(116, 55, 149, 0.1); border-radius: 4px;">
                                    💡 ${t('autoSyncedOptions')}
                                </p>
                            </div>
                        `;

                        // 根据数据源显示/隐藏选项输入框和提示
                        const sourceSelect = configPanel.querySelector('#pcp-dropdown-source');
                        const optionsField = configPanel.querySelector('#pcp-dropdown-options-field');
                        const autoSyncHint = configPanel.querySelector('#pcp-dropdown-auto-sync-hint');

                        const updateOptionsField = () => {
                            const source = sourceSelect.value;
                            if (source === 'custom') {
                                optionsField.style.display = 'block';
                                autoSyncHint.style.display = 'none';
                            } else if (source === 'from_connection') {
                                optionsField.style.display = 'none';
                                autoSyncHint.style.display = 'block';
                            } else {
                                // checkpoint/lora等动态数据源
                                optionsField.style.display = 'none';
                                autoSyncHint.style.display = 'none';
                            }
                        };

                        sourceSelect.addEventListener('change', updateOptionsField);
                        updateOptionsField();
                        break;
                }
            };

            // 初始化配置面板
            updateConfigPanel(param?.type || 'slider');

            // 类型变化时更新配置面板
            typeSelect.addEventListener('change', (e) => {
                updateConfigPanel(e.target.value);
            });

            // 点击覆盖层关闭
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.remove();
                }
            });

            // 取消按钮
            cancelButton.addEventListener('click', () => {
                overlay.remove();
            });

            // ESC键关闭
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    overlay.remove();
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);

            // 确认按钮
            confirmButton.addEventListener('click', () => {
                const name = nameInput.value.trim();
                const type = typeSelect.value;

                // 验证名称（所有类型都需要名称）
                if (!name) {
                    this.showToast(t('invalidInput'), 'error');
                    nameInput.focus();
                    return;
                }

                // 检查名称重复（分隔符除外）
                if (type !== 'separator' && this.checkParameterNameDuplicate(name, paramId)) {
                    this.showToast(t('duplicateName'), 'error');
                    nameInput.focus();
                    return;
                }

                // 收集配置
                const config = {};
                let defaultValue = null;

                switch (type) {
                    case 'separator':
                        // 分隔符：保存颜色配置
                        const colorPicker = configPanel.querySelector('#pcp-separator-color');
                        if (colorPicker) {
                            config.color = colorPicker.value.toUpperCase();
                        } else {
                            config.color = '#9370DB'; // 默认紫色
                        }
                        break;

                    case 'slider':
                        const minInput = configPanel.querySelector('#pcp-slider-min');
                        const maxInput = configPanel.querySelector('#pcp-slider-max');
                        const stepInput = configPanel.querySelector('#pcp-slider-step');
                        const defaultInput = configPanel.querySelector('#pcp-slider-default');

                        config.min = parseFloat(minInput.value);
                        config.max = parseFloat(maxInput.value);
                        config.step = parseFloat(stepInput.value);
                        config.default = parseFloat(defaultInput.value);

                        // 验证范围
                        if (config.min >= config.max) {
                            this.showToast(t('invalidInput') + ': min < max', 'error');
                            return;
                        }

                        defaultValue = config.default;
                        break;

                    case 'switch':
                        const switchDefaultSelect = configPanel.querySelector('#pcp-switch-default');
                        config.default = switchDefaultSelect.value === 'true';
                        defaultValue = config.default;
                        break;

                    case 'dropdown':
                        const sourceSelect = configPanel.querySelector('#pcp-dropdown-source');
                        const optionsTextarea = configPanel.querySelector('#pcp-dropdown-options');

                        config.data_source = sourceSelect.value;

                        if (config.data_source === 'custom') {
                            const optionsText = optionsTextarea.value.trim();
                            config.options = optionsText.split('\n').map(s => s.trim()).filter(s => s);

                            if (config.options.length === 0) {
                                this.showToast(t('invalidInput') + ': ' + t('options'), 'error');
                                return;
                            }

                            defaultValue = config.options[0];
                        } else {
                            // 动态数据源，默认值为空字符串
                            defaultValue = '';
                        }
                        break;
                }

                // 构建参数数据
                const paramData = {
                    id: paramId || `param_${Date.now()}`,
                    name: name,  // 所有类型都使用用户输入的名称
                    type: type,
                    config: config,
                    value: param?.value !== undefined ? param.value : defaultValue
                };

                // 如果是分隔符，将颜色值提升到顶层以便访问
                if (type === 'separator' && config.color) {
                    paramData.color = config.color;
                }

                // 保存参数
                if (isEdit) {
                    this.updateParameter(paramId, paramData);
                    this.showToast(t('parameterUpdated'), 'success');
                } else {
                    this.addParameter(paramData);
                    this.showToast(t('parameterAdded'), 'success');
                }

                overlay.remove();
            });

            // 聚焦名称输入框
            nameInput.focus();
        };

        // 显示预设保存对话框
        nodeType.prototype.showPresetDialog = function () {
            // 创建对话框覆盖层
            const overlay = document.createElement('div');
            overlay.className = 'pcp-dialog-overlay';

            // 创建对话框
            const dialog = document.createElement('div');
            dialog.className = 'pcp-dialog';

            dialog.innerHTML = `
                <h3>${t('savePreset')}</h3>

                <div class="pcp-dialog-field">
                    <label class="pcp-dialog-label">${t('preset')}</label>
                    <input type="text" class="pcp-dialog-input" id="pcp-preset-name-input"
                           placeholder="${t('presetNamePlaceholder')}">
                </div>

                <div class="pcp-dialog-buttons">
                    <button class="pcp-dialog-button pcp-dialog-button-secondary" id="pcp-preset-dialog-cancel">
                        ${t('cancel')}
                    </button>
                    <button class="pcp-dialog-button pcp-dialog-button-primary" id="pcp-preset-dialog-confirm">
                        ${t('confirm')}
                    </button>
                </div>
            `;

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            const nameInput = dialog.querySelector('#pcp-preset-name-input');
            const cancelButton = dialog.querySelector('#pcp-preset-dialog-cancel');
            const confirmButton = dialog.querySelector('#pcp-preset-dialog-confirm');

            // 点击覆盖层关闭
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.remove();
                }
            });

            // 取消按钮
            cancelButton.addEventListener('click', () => {
                overlay.remove();
            });

            // ESC键关闭
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    overlay.remove();
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);

            // 确认按钮
            confirmButton.addEventListener('click', () => {
                const presetName = nameInput.value.trim();

                if (!presetName) {
                    this.showToast(t('invalidInput'), 'error');
                    nameInput.focus();
                    return;
                }

                this.savePreset(presetName);
                overlay.remove();
            });

            // 回车确认
            nameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    confirmButton.click();
                }
            });

            // 聚焦输入框
            nameInput.focus();
        };

        // 显示确认对话框
        nodeType.prototype.showDeleteConfirm = function (message, onConfirm) {
            // 创建对话框覆盖层
            const overlay = document.createElement('div');
            overlay.className = 'pcp-dialog-overlay';

            // 创建对话框
            const dialog = document.createElement('div');
            dialog.className = 'pcp-dialog';

            dialog.innerHTML = `
                <h3>${t('confirm')}</h3>

                <div class="pcp-dialog-field">
                    <p style="color: #E0E0E0; margin: 0;">${message}</p>
                </div>

                <div class="pcp-dialog-buttons">
                    <button class="pcp-dialog-button pcp-dialog-button-secondary" id="pcp-confirm-dialog-cancel">
                        ${t('cancel')}
                    </button>
                    <button class="pcp-dialog-button pcp-dialog-button-primary" id="pcp-confirm-dialog-ok">
                        ${t('confirm')}
                    </button>
                </div>
            `;

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            const cancelButton = dialog.querySelector('#pcp-confirm-dialog-cancel');
            const okButton = dialog.querySelector('#pcp-confirm-dialog-ok');

            // 点击覆盖层关闭
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.remove();
                }
            });

            // 取消按钮
            cancelButton.addEventListener('click', () => {
                overlay.remove();
            });

            // 确认按钮
            okButton.addEventListener('click', () => {
                if (onConfirm) {
                    onConfirm();
                }
                overlay.remove();
            });

            // ESC键关闭
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    overlay.remove();
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
        };

        // ==================== 参数管理 ====================

        // 添加参数
        nodeType.prototype.addParameter = function (paramData) {
            // 生成唯一ID
            if (!paramData.id) {
                paramData.id = `param_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }

            // 添加到参数列表
            this.properties.parameters.push(paramData);

            // 更新UI和同步配置
            this.updateParametersList();
            this.syncConfig();

            console.log('[PCP] 参数已添加:', paramData);
        };

        // 编辑参数（打开对话框）
        nodeType.prototype.editParameter = function (paramId) {
            this.showParameterDialog(paramId);
        };

        // 更新参数
        nodeType.prototype.updateParameter = function (paramId, newData) {
            const index = this.getParameterIndexById(paramId);
            if (index === -1) {
                console.error('[PCP] 参数未找到:', paramId);
                return;
            }

            // 保留原ID，更新其他数据
            newData.id = paramId;
            this.properties.parameters[index] = newData;

            // 更新UI和同步配置
            this.updateParametersList();
            this.syncConfig();

            console.log('[PCP] 参数已更新:', newData);
        };

        // 删除参数
        nodeType.prototype.deleteParameter = function (paramId) {
            const param = this.getParameterById(paramId);
            if (!param) {
                console.error('[PCP] 参数未找到:', paramId);
                return;
            }

            const paramName = param.type === 'separator'
                ? `${t('separator')}: ${param.name || ''}`
                : param.name;

            this.showDeleteConfirm(
                `${t('deleteParameter')}: "${paramName}"?`,
                () => {
                    const index = this.getParameterIndexById(paramId);
                    if (index !== -1) {
                        this.properties.parameters.splice(index, 1);
                        this.updateParametersList();
                        this.syncConfig();
                        this.showToast(t('parameterDeleted'), 'success');
                        console.log('[PCP] 参数已删除:', paramId);
                    }
                }
            );
        };

        // 拖拽排序参数
        nodeType.prototype.reorderParameters = function (draggedId, targetId) {
            const draggedIndex = this.getParameterIndexById(draggedId);
            const targetIndex = this.getParameterIndexById(targetId);

            if (draggedIndex === -1 || targetIndex === -1) {
                console.error('[PCP] 参数未找到:', draggedId, targetId);
                return;
            }

            // 移除被拖拽的参数
            const [draggedParam] = this.properties.parameters.splice(draggedIndex, 1);

            // 重新计算目标索引（因为数组已变化）
            const newTargetIndex = this.getParameterIndexById(targetId);

            // 插入到目标位置
            this.properties.parameters.splice(newTargetIndex, 0, draggedParam);

            // 更新UI和同步配置
            this.updateParametersList();
            this.syncConfig();

            console.log('[PCP] 参数已重新排序:', draggedId, '->', targetId);
        };

        // ==================== 预设管理 ====================

        // 加载预设列表（按节点标题分组）
        nodeType.prototype.loadPresetsList = async function () {
            try {
                const nodeGroup = this.title || 'default';
                const response = await fetch(`/danbooru_gallery/pcp/list_presets?node_group=${encodeURIComponent(nodeGroup)}`);
                const data = await response.json();

                if (data.status === 'success') {
                    this._allPresets = data.presets || [];
                    this.renderPresetsList(this._allPresets);
                    console.log('[PCP] 节点组', nodeGroup, '的预设列表已加载:', this._allPresets.length);
                }
            } catch (error) {
                console.error('[PCP] 加载预设列表失败:', error);
            }
        };

        // 渲染预设列表
        nodeType.prototype.renderPresetsList = function (presets) {
            const presetList = this.customUI.querySelector('#pcp-preset-list');
            const presetSearch = this.customUI.querySelector('#pcp-preset-search');

            // 更新搜索框显示
            if (this.properties.currentPreset) {
                presetSearch.value = this.properties.currentPreset;
            } else {
                presetSearch.value = '';
                presetSearch.placeholder = t('loadPreset') + '...';
            }

            // 清空列表
            presetList.innerHTML = '';

            if (presets.length === 0) {
                const empty = document.createElement('div');
                empty.className = 'pcp-preset-empty';
                empty.textContent = t('noPresets');
                presetList.appendChild(empty);
                return;
            }

            // 渲染预设项
            presets.forEach(presetName => {
                const item = document.createElement('div');
                item.className = 'pcp-preset-item';
                item.textContent = presetName;

                if (presetName === this.properties.currentPreset) {
                    item.classList.add('active');
                }

                item.addEventListener('click', () => {
                    this.loadPreset(presetName);
                    this.customUI.querySelector('#pcp-preset-dropdown').style.display = 'none';
                });

                presetList.appendChild(item);
            });
        };

        // 过滤预设列表
        nodeType.prototype.filterPresets = function (keyword) {
            if (!this._allPresets) return;

            const filtered = keyword
                ? this._allPresets.filter(name => name.toLowerCase().includes(keyword.toLowerCase()))
                : this._allPresets;

            this.renderPresetsList(filtered);
        };

        // 保存预设（按节点标题分组）
        nodeType.prototype.savePreset = async function (presetName) {
            try {
                const nodeGroup = this.title || 'default';
                const response = await fetch('/danbooru_gallery/pcp/save_preset', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        preset_name: presetName,
                        parameters: this.properties.parameters,
                        node_group: nodeGroup
                    })
                });

                const data = await response.json();

                if (data.status === 'success') {
                    this.properties.currentPreset = presetName;
                    this.showToast(t('presetSaved'), 'success');
                    await this.loadPresetsList();
                    console.log('[PCP] 预设已保存到节点组', nodeGroup, ':', presetName);
                } else {
                    this.showToast(`${t('error')}: ${data.message}`, 'error');
                }
            } catch (error) {
                console.error('[PCP] 保存预设失败:', error);
                this.showToast(`${t('error')}: ${error.message}`, 'error');
            }
        };

        // 加载预设（按节点标题分组）
        nodeType.prototype.loadPreset = async function (presetName) {
            try {
                const nodeGroup = this.title || 'default';
                const response = await fetch('/danbooru_gallery/pcp/load_preset', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        preset_name: presetName,
                        node_group: nodeGroup
                    })
                });

                const data = await response.json();

                if (data.status === 'success') {
                    const presetParams = data.parameters || [];

                    // 创建预设参数的名称映射（包括分隔符）
                    const presetParamsMap = {};
                    presetParams.forEach(p => {
                        if (p.name) {
                            presetParamsMap[p.name] = p;
                        }
                    });

                    // 遍历当前参数列表，按名称匹配并更新值和配置
                    let matchedCount = 0;
                    let unmatchedCount = 0;

                    this.properties.parameters.forEach(currentParam => {
                        const presetParam = presetParamsMap[currentParam.name];

                        if (presetParam) {
                            // 找到匹配的参数，更新值和配置
                            if (currentParam.type === 'separator') {
                                // 分隔符：更新颜色等属性
                                if (presetParam.color) {
                                    currentParam.color = presetParam.color;
                                }
                            } else {
                                // 普通参数：更新值和配置
                                currentParam.value = presetParam.value;
                                if (presetParam.config) {
                                    currentParam.config = { ...currentParam.config, ...presetParam.config };
                                }
                            }
                            matchedCount++;
                        } else {
                            // 没有找到匹配的参数
                            unmatchedCount++;
                        }
                    });

                    // 显示加载结果
                    this.properties.currentPreset = presetName;

                    if (unmatchedCount === 0) {
                        this.showToast(t('presetLoaded'), 'success');
                    } else {
                        this.showToast(`${t('presetLoaded')} (${unmatchedCount} 个参数未在预设中找到)`, 'warning');
                    }

                    this.updateParametersList();
                    this.syncConfig();
                    console.log('[PCP] 预设已加载:', presetName, '已匹配:', matchedCount, '未匹配:', unmatchedCount);
                } else {
                    this.showToast(`${t('error')}: ${data.message}`, 'error');
                }
            } catch (error) {
                console.error('[PCP] 加载预设失败:', error);
                this.showToast(`${t('error')}: ${error.message}`, 'error');
            }
        };

        // 删除预设（按节点标题分组）
        nodeType.prototype.deletePreset = async function (presetName) {
            this.showDeleteConfirm(
                `${t('deletePreset')}: "${presetName}"?`,
                async () => {
                    try {
                        const nodeGroup = this.title || 'default';
                        const response = await fetch('/danbooru_gallery/pcp/delete_preset', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                preset_name: presetName,
                                node_group: nodeGroup
                            })
                        });

                        const data = await response.json();

                        if (data.status === 'success') {
                            if (this.properties.currentPreset === presetName) {
                                this.properties.currentPreset = null;
                            }
                            this.showToast(t('presetDeleted'), 'success');
                            await this.loadPresetsList();
                            console.log('[PCP] 节点组', nodeGroup, '的预设已删除:', presetName);
                        } else {
                            this.showToast(`${t('error')}: ${data.message}`, 'error');
                        }
                    } catch (error) {
                        console.error('[PCP] 删除预设失败:', error);
                        this.showToast(`${t('error')}: ${error.message}`, 'error');
                    }
                }
            );
        };

        // 刷新数据（重新加载动态数据源）
        nodeType.prototype.refreshData = function () {
            this.updateParametersList();
            this.showToast('数据已刷新', 'success');
            console.log('[PCP] 数据已刷新');
        };

        // ==================== 输出同步与配置管理 ====================

        // 更新节点输出引脚
        nodeType.prototype.updateOutputs = function () {
            // 只保留一个输出引脚，输出参数包
            const paramCount = this.properties.parameters.filter(p => p.type !== 'separator').length;

            // 保留现有的连接信息（如果存在）
            const existingLinks = (this.outputs && this.outputs.length > 0 && this.outputs[0].links)
                ? this.outputs[0].links
                : null;

            this.outputs = [{
                name: 'parameters',
                type: 'DICT',
                links: existingLinks  // 使用保留的连接而不是null
            }];

            // 触发节点图更新
            if (this.graph && this.graph.setDirtyCanvas) {
                this.graph.setDirtyCanvas(true, true);
            }

            console.log('[PCP] 输出引脚已更新: 参数包包含', paramCount, '个参数, 连接数:', existingLinks ? existingLinks.length : 0);
        };

        // 格式化输出值显示
        nodeType.prototype.formatOutputValue = function (param) {
            if (param.value === undefined || param.value === null) {
                return 'N/A';
            }

            switch (param.type) {
                case 'slider':
                    return param.value.toFixed(param.config?.step === 1 ? 0 : 2);
                case 'switch':
                    return param.value ? 'True' : 'False';
                case 'dropdown':
                    return param.value;
                default:
                    return String(param.value);
            }
        };

        // 同步配置到后端
        nodeType.prototype.syncConfig = async function () {
            try {
                const response = await fetch('/danbooru_gallery/pcp/save_config', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        node_id: this.id,
                        parameters: this.properties.parameters
                    })
                });

                const data = await response.json();

                if (data.status === 'success') {
                    console.log('[PCP] 配置已同步到后端:', this.properties.parameters.length);
                } else {
                    console.error('[PCP] 同步配置失败:', data.message);
                }
            } catch (error) {
                console.error('[PCP] 同步配置异常:', error);
            }
        };

        // 从后端加载配置
        nodeType.prototype.loadConfigFromBackend = async function () {
            try {
                // 如果已从工作流加载，不要从后端加载（避免覆盖工作流数据）
                if (this._loadedFromWorkflow) {
                    console.log('[PCP] 已从工作流加载，跳过后端加载');
                    return;
                }

                const response = await fetch(`/danbooru_gallery/pcp/load_config?node_id=${this.id}`);
                const data = await response.json();

                if (data.status === 'success' && data.parameters && data.parameters.length > 0) {
                    this.properties.parameters = data.parameters;
                    this.updateParametersList();
                    console.log('[PCP] 配置已从后端加载:', data.parameters.length);
                } else {
                    console.log('[PCP] 后端无配置，使用默认空列表');
                }
            } catch (error) {
                console.error('[PCP] 加载配置失败:', error);
            }
        };

        // ==================== 序列化与反序列化 ====================

        // 序列化（保存到工作流）
        const onSerialize = nodeType.prototype.onSerialize;
        nodeType.prototype.onSerialize = function (info) {
            if (onSerialize) {
                onSerialize.apply(this, arguments);
            }

            // 保存参数配置到工作流
            info.parameters = this.properties.parameters;
            info.currentPreset = this.properties.currentPreset;

            console.log('[PCP] 序列化:', info.parameters?.length || 0, '个参数');
            return info;
        };

        // 反序列化（从工作流加载）
        const onConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function (info) {
            if (onConfigure) {
                onConfigure.apply(this, arguments);
            }

            // 从工作流恢复参数配置
            if (info.parameters) {
                this.properties.parameters = info.parameters;
                // 标记已从工作流加载，防止被后端空数据覆盖
                this._loadedFromWorkflow = true;
            }

            if (info.currentPreset) {
                this.properties.currentPreset = info.currentPreset;
            }

            // 恢复锁定状态
            if (info.locked !== undefined) {
                this.properties.locked = info.locked;
            }

            // 延迟更新UI，确保DOM已加载
            setTimeout(() => {
                if (this.customUI) {
                    this.updateParametersList();
                    this.loadPresetsList();
                    // 根据恢复的锁定状态更新UI
                    this.updateLockUI();
                }

                // 将工作流数据同步到后端内存
                if (this._loadedFromWorkflow) {
                    this.syncConfig();
                }
            }, 100);

            console.log('[PCP] 反序列化:', this.properties.parameters?.length || 0, '个参数, 锁定状态:', this.properties.locked);
        };

        // ==================== 节点生命周期钩子 ====================

        // 节点移除时的清理
        const onRemoved = nodeType.prototype.onRemoved;
        nodeType.prototype.onRemoved = function () {
            if (onRemoved) {
                onRemoved.apply(this, arguments);
            }

            // 移除全局样式（如果是最后一个节点）
            const allNodes = this.graph?._nodes || [];
            const hasOtherPCP = allNodes.some(n =>
                n !== this && n.type === 'ParameterControlPanel'
            );

            if (!hasOtherPCP) {
                const style = document.querySelector('#pcp-styles');
                if (style) {
                    style.remove();
                    console.log('[PCP] 样式已移除（无其他PCP节点）');
                }
            }

            console.log('[PCP] 节点已移除:', this.id);
        };

        // 节点执行时（前端辅助，主要逻辑在Python）
        const onExecuted = nodeType.prototype.onExecuted;
        nodeType.prototype.onExecuted = function (message) {
            if (onExecuted) {
                onExecuted.apply(this, arguments);
            }

            // 可以在这里处理执行结果
            console.log('[PCP] 节点已执行');
        };

        // ==================== 绘制覆盖（可选） ====================

        // 自定义节点绘制已禁用（不显示参数数量）
        // const onDrawForeground = nodeType.prototype.onDrawForeground;
        // nodeType.prototype.onDrawForeground = function (ctx) {
        //     if (onDrawForeground) {
        //         onDrawForeground.apply(this, arguments);
        //     }
        // };

        console.log('[PCP] 参数控制面板节点已完整注册');
    }
});

console.log('[PCP] 参数控制面板已加载');
