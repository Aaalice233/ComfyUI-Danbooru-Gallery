/**
 * 参数控制面板 (Parameter Control Panel)
 * 支持滑条、开关、下拉菜单、分隔符等多种参数类型
 * 动态输出引脚，预设管理，拖拽排序
 */

import { app } from "/scripts/app.js";
import { globalToastManager } from "../global/toast_manager.js";
import { globalMultiLanguageManager } from "../global/multi_language.js";

import { createLogger } from '../global/logger_client.js';

// 创建logger实例
const logger = createLogger('parameter_control_panel');

// ====== 性能优化：节流和防抖工具函数 ======
/**
 * 节流函数 - 限制函数在指定时间内最多执行一次（带尾调用支持）
 * @param {Function} func 需要节流的函数
 * @param {number} delay 节流延迟（毫秒）
 */
function throttle(func, delay) {
    let lastCall = 0;
    let trailingTimeout = null;
    let lastArgs = null;
    let lastThis = null;

    const throttled = function (...args) {
        const now = Date.now();
        const remaining = delay - (now - lastCall);
        lastArgs = args;
        lastThis = this;

        if (remaining <= 0 || remaining > delay) {
            if (trailingTimeout) {
                clearTimeout(trailingTimeout);
                trailingTimeout = null;
            }
            lastCall = now;
            func.apply(this, args);
        } else if (!trailingTimeout) {
            // 添加尾调用，确保最后一次调用不会丢失
            trailingTimeout = setTimeout(() => {
                lastCall = Date.now();
                trailingTimeout = null;
                func.apply(lastThis, lastArgs);
            }, remaining);
        }
    };

    throttled.cancel = () => {
        clearTimeout(trailingTimeout);
        trailingTimeout = null;
        lastArgs = null;
        lastThis = null;
    };

    return throttled;
}

/**
 * 防抖函数 - 延迟执行函数，直到停止调用指定时间后才执行
 * @param {Function} func 需要防抖的函数
 * @param {number} delay 防抖延迟（毫秒）
 */
function debounce(func, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

// 工具函数：加载Marked.js库（与workflow_description一致）
let markedLoaded = false;
let markedLoadPromise = null;

async function ensureMarkedLoaded() {
    if (markedLoaded) return true;
    if (markedLoadPromise) return markedLoadPromise;

    markedLoadPromise = new Promise((resolve, reject) => {
        if (typeof marked !== 'undefined') {
            markedLoaded = true;
            resolve(true);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
        script.onload = () => {
            markedLoaded = true;
            logger.info('[PCP] Marked.js loaded successfully');
            resolve(true);
        };
        script.onerror = () => {
            logger.error('[PCP] Failed to load Marked.js');
            reject(false);
        };
        document.head.appendChild(script);
    });

    return markedLoadPromise;
}

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
        string: "字符串",
        image: "图像",
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
        autoSyncedOptions: "选项将在Break节点输出连接时自动同步",
        uploadImage: "上传图像",
        selectImage: "选择图像",
        noImageSelected: "未选择图像",
        imageFile: "图像文件",
        uploading: "上传中...",
        uploadSuccess: "上传成功",
        uploadFailed: "上传失败",
        description: "参数说明",
        descriptionPlaceholder: "输入参数说明（支持Markdown格式）",
        descriptionLockedHint: "锁定模式下无法修改说明",
        multiline: "多行文本",
        taglist: "标签列表",
        taglistEmpty: "暂无标签，输入后回车添加",
        taglistPlaceholder: "输入标签后回车添加（支持逗号分隔批量添加）",
        enum: "枚举",
        enumOptions: "枚举选项",
        enumOptionsPlaceholder: "每行一个选项（将作为枚举值）",
        enumDataSource: "数据源",
        enumHint: "枚举参数可与枚举切换节点联动，实现值的动态选择",
        copyParameter: "复制参数",
        pasteParameter: "粘贴参数",
        parameterCopied: "参数已复制到剪贴板",
        parameterPasted: "参数已粘贴",
        clipboardEmpty: "剪贴板为空",
        clipboardInvalid: "剪贴板数据无效",
        copyFailed: "复制失败",
        lockedModeNoPaste: "锁定模式下无法粘贴"
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
        string: "String",
        image: "Image",
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
        autoSyncedOptions: "Options will be auto-synced when Break output is connected",
        uploadImage: "Upload Image",
        selectImage: "Select Image",
        noImageSelected: "No Image Selected",
        imageFile: "Image File",
        uploading: "Uploading...",
        uploadSuccess: "Upload successful",
        uploadFailed: "Upload failed",
        description: "Description",
        descriptionPlaceholder: "Enter description (Markdown supported)",
        descriptionLockedHint: "Cannot modify description in locked mode",
        multiline: "Multiline",
        taglist: "Tag List",
        taglistEmpty: "No tags, press Enter to add",
        taglistPlaceholder: "Enter tag and press Enter (comma-separated for batch)",
        enum: "Enum",
        enumOptions: "Enum Options",
        enumOptionsPlaceholder: "One option per line (as enum values)",
        enumDataSource: "Data Source",
        enumHint: "Enum parameters can be linked with Enum Switch nodes for dynamic value selection",
        copyParameter: "Copy Parameter",
        pasteParameter: "Paste Parameter",
        parameterCopied: "Parameter copied to clipboard",
        parameterPasted: "Parameter pasted",
        clipboardEmpty: "Clipboard is empty",
        clipboardInvalid: "Invalid clipboard data",
        copyFailed: "Copy failed",
        lockedModeNoPaste: "Cannot paste in locked mode"
    }
};

globalMultiLanguageManager.registerTranslations('pcp', translations);

// 创建命名空间翻译函数
const t = (key) => globalMultiLanguageManager.t(`pcp.${key}`);

// ============================================================
// 左上角提示管理器 (Top Left Notice Manager)
// ============================================================

/**
 * 管理屏幕左上角的持久提示
 * 用于显示布尔参数启用时的状态提示
 */
class TopLeftNoticeManager {
    constructor() {
        this.notices = new Map(); // key: paramName, value: {text, element}
        this.container = null;
    }

    /**
     * 初始化容器（懒加载）
     */
    initContainer() {
        if (this.container) return;

        this.container = document.createElement('div');
        this.container.className = 'pcp-top-left-notice-container';
        document.body.appendChild(this.container);

        logger.info('[PCP-Notice] 左上角提示容器已创建');
    }

    /**
     * 显示提示
     * @param {string} paramName - 参数名称（唯一标识）
     * @param {string} text - 提示文本
     */
    showNotice(paramName, text) {
        // 确保容器存在
        this.initContainer();

        // 如果已存在相同参数的提示，先移除
        if (this.notices.has(paramName)) {
            this.hideNotice(paramName);
        }

        // 创建提示元素
        const noticeElement = document.createElement('div');
        noticeElement.className = 'pcp-top-left-notice-item';
        noticeElement.textContent = text;

        // 添加到容器
        this.container.appendChild(noticeElement);

        // 保存引用
        this.notices.set(paramName, {
            text: text,
            element: noticeElement
        });

        logger.info(`[PCP-Notice] 显示提示: ${text}`);
    }

    /**
     * 隐藏提示
     * @param {string} paramName - 参数名称
     */
    hideNotice(paramName) {
        const notice = this.notices.get(paramName);
        if (!notice) return;

        // 添加淡出动画
        notice.element.style.animation = 'slideOutLeft 0.3s ease';

        // 延迟移除元素
        setTimeout(() => {
            // 删除 DOM 元素
            if (notice.element.parentNode) {
                notice.element.parentNode.removeChild(notice.element);
            }

            // 只有当 Map 中的记录还是当前这个时，才删除记录
            // 避免误删新创建的提示记录
            if (this.notices.get(paramName) === notice) {
                this.notices.delete(paramName);
            }

            // 如果容器为空，移除容器
            if (this.notices.size === 0 && this.container && this.container.parentNode) {
                this.container.parentNode.removeChild(this.container);
                this.container = null;
                logger.info('[PCP-Notice] 左上角提示容器已移除（无活动提示）');
            }
        }, 300);

        logger.info(`[PCP-Notice] 隐藏提示: ${paramName}`);
    }

    /**
     * 更新提示文本
     * @param {string} paramName - 参数名称
     * @param {string} text - 新的提示文本
     */
    updateNotice(paramName, text) {
        const notice = this.notices.get(paramName);
        if (notice) {
            notice.element.textContent = text;
            notice.text = text;
        } else {
            this.showNotice(paramName, text);
        }
    }

    /**
     * 清除所有提示
     */
    clearAll() {
        for (const paramName of this.notices.keys()) {
            this.hideNotice(paramName);
        }
    }
}

// 全局单例
const globalTopLeftNoticeManager = new TopLeftNoticeManager();

// Markdown Tooltip 管理器
class MarkdownTooltipManager {
    constructor() {
        this.currentTooltip = null;
        this.showTimeout = null;
        this.hideTimeout = null;
        this.currentTarget = null;
    }

    /**
     * 显示 Tooltip
     * @param {HTMLElement} target - 触发元素
     * @param {string} markdownText - Markdown 文本
     * @param {Object} options - 选项
     */
    showTooltip(target, markdownText, options = {}) {
        // 如果已经在显示同一个 tooltip，直接返回
        if (this.currentTarget === target && this.currentTooltip) {
            return;
        }

        // 清除现有的延迟
        if (this.showTimeout) {
            clearTimeout(this.showTimeout);
        }
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
        }

        // 延迟显示，防止快速移动时闪烁
        this.showTimeout = setTimeout(async () => {
            await this._createTooltip(target, markdownText, options);
        }, 100);
    }

    /**
     * 隐藏 Tooltip
     */
    hideTooltip() {
        // 清除显示延迟
        if (this.showTimeout) {
            clearTimeout(this.showTimeout);
            this.showTimeout = null;
        }

        // 延迟隐藏，避免鼠标快速移动时闪烁
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
        }

        this.hideTimeout = setTimeout(() => {
            this._destroyTooltip();
        }, 50);
    }

    /**
     * 立即隐藏 Tooltip（无延迟）
     */
    hideTooltipImmediate() {
        if (this.showTimeout) {
            clearTimeout(this.showTimeout);
            this.showTimeout = null;
        }
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
        this._destroyTooltip();
    }

    /**
     * 创建 Tooltip（异步方法，确保marked已加载）
     */
    async _createTooltip(target, markdownText, options) {
        // 先移除现有的 tooltip
        this._destroyTooltip();

        if (!markdownText || !markdownText.trim()) {
            return;
        }

        // 确保Marked.js已加载
        await ensureMarkedLoaded();

        // 创建 tooltip 元素
        const tooltip = document.createElement('div');
        tooltip.className = 'pcp-markdown-tooltip';

        // 渲染 Markdown
        if (typeof marked !== 'undefined') {
            try {
                const html = marked.parse(markdownText, {
                    breaks: true,
                    gfm: true
                });
                tooltip.innerHTML = html;
            } catch (error) {
                logger.warn('[PCP] Markdown 渲染失败:', error);
                tooltip.textContent = markdownText;
            }
        } else {
            // 如果 marked.js 未加载，直接显示纯文本
            tooltip.innerHTML = markdownText.replace(/\n/g, '<br>');
        }

        // 添加到 body
        document.body.appendChild(tooltip);

        // 计算位置
        this._positionTooltip(tooltip, target, options);

        // 保存引用
        this.currentTooltip = tooltip;
        this.currentTarget = target;

        // 添加鼠标事件监听，允许鼠标移动到tooltip上
        tooltip.addEventListener('mouseenter', () => {
            // 鼠标进入tooltip，取消隐藏操作
            if (this.hideTimeout) {
                clearTimeout(this.hideTimeout);
                this.hideTimeout = null;
            }
        });

        tooltip.addEventListener('mouseleave', () => {
            // 鼠标离开tooltip，触发隐藏操作
            this.hideTooltip();
        });

        // 添加淡入动画
        setTimeout(() => {
            tooltip.style.opacity = '1';
        }, 10);
    }

    /**
     * 定位 Tooltip
     */
    _positionTooltip(tooltip, target, options) {
        const rect = target.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        const margin = options.margin || 10;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let left, top;

        // 默认优先显示在右侧
        left = rect.right + margin;
        top = rect.top;

        // 检查是否超出右侧边界
        if (left + tooltipRect.width > viewportWidth) {
            // 尝试显示在左侧
            left = rect.left - tooltipRect.width - margin;

            // 如果左侧也不够，显示在下方
            if (left < 0) {
                left = rect.left;
                top = rect.bottom + margin;

                // 如果下方也不够，显示在上方
                if (top + tooltipRect.height > viewportHeight) {
                    top = rect.top - tooltipRect.height - margin;
                }
            }
        }

        // 确保不超出上下边界
        if (top < 0) {
            top = margin;
        } else if (top + tooltipRect.height > viewportHeight) {
            top = viewportHeight - tooltipRect.height - margin;
        }

        // 确保不超出左右边界
        if (left < 0) {
            left = margin;
        } else if (left + tooltipRect.width > viewportWidth) {
            left = viewportWidth - tooltipRect.width - margin;
        }

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
    }

    /**
     * 销毁 Tooltip
     */
    _destroyTooltip() {
        if (this.currentTooltip) {
            this.currentTooltip.remove();
            this.currentTooltip = null;
            this.currentTarget = null;
        }
    }
}

// 创建全局实例
const tooltipManager = new MarkdownTooltipManager();

// 参数控制面板节点
app.registerExtension({
    name: "ParameterControlPanel",

    async init(app) {
        logger.info('[PCP] 初始化参数控制面板');

        // 预加载Marked.js用于Markdown tooltip
        await ensureMarkedLoaded();
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

            // 监听来自GMM的参数值变化事件
            this._pcpEventHandler = (e) => {
                // 宽松比较：支持字符串和数字的比较
                if (e.detail && String(e.detail.nodeId) === String(this.id)) {
                    logger.debug('[PCP] 收到GMM的参数值变化通知:', e.detail);
                    this.refreshParameterUI(e.detail.paramName, e.detail.newValue);
                }
            };
            window.addEventListener('pcp-param-value-changed', this._pcpEventHandler);
            logger.debug('[PCP] 已注册参数值变化事件监听器, 节点ID:', this.id);

            return result;
        };

        // 创建自定义UI
        nodeType.prototype.createCustomUI = function () {
            try {
                logger.info('[PCP-UI] 开始创建自定义UI:', this.id);

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

                logger.info('[PCP-UI] 自定义UI创建完成');

            } catch (error) {
                logger.error('[PCP-UI] 创建自定义UI时出错:', error);
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
                    /* 性能优化：启用 GPU 加速和 CSS Containment */
                    will-change: transform;
                    contain: layout style paint;
                    transform: translateZ(0);
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
                    transition: background-color 0.2s ease, opacity 0.2s ease, border-color 0.2s ease;
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
                    transition: background-color 0.2s ease, opacity 0.2s ease, border-color 0.2s ease;
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
                    transition: background-color 0.2s ease, opacity 0.2s ease, border-color 0.2s ease;
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
                    cursor: move;
                    /* 性能优化：CSS Containment 隔离重排影响 */
                    contain: layout style;
                }

                .pcp-parameter-item:hover {
                    border-color: rgba(116, 55, 149, 0.5);
                }

                /* 参数项警告样式 - 当锁定值不存在时 */
                .pcp-parameter-item-warning {
                    border: 2px solid #ff4444 !important;
                    background: linear-gradient(135deg, rgba(255, 68, 68, 0.08) 0%, rgba(255, 68, 68, 0.05) 100%) !important;
                }

                .pcp-parameter-item-warning:hover {
                    border-color: #ff6666 !important;
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
                    transition: background-color 0.2s ease, opacity 0.2s ease, border-color 0.2s ease;
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
                    transition: background-color 0.2s ease, opacity 0.2s ease, border-color 0.2s ease;
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
                    transition: background-color 0.2s ease, opacity 0.2s ease, border-color 0.2s ease;
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
                    transition: background-color 0.2s ease, opacity 0.2s ease, border-color 0.2s ease;
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
                    /* 性能优化：CSS Containment */
                    contain: layout style;
                }

                .pcp-separator:hover {
                    border-color: rgba(147, 112, 219, 0.5);
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
                    min-width: 50px;
                    width: auto;
                    text-align: center;
                    flex-shrink: 0;
                    -moz-appearance: textfield;
                }

                .pcp-slider-value::-webkit-outer-spin-button,
                .pcp-slider-value::-webkit-inner-spin-button {
                    -webkit-appearance: none;
                    display: none;
                    margin: 0;
                    width: 0;
                    height: 0;
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
                    transition: background-color 0.3s ease, border-color 0.3s ease;
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
                    transition: background-color 0.3s ease, border-color 0.3s ease;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                }

                .pcp-switch.active .pcp-switch-thumb {
                    left: 28px;
                }

                /* 下拉菜单样式 - 增强版 */
                .pcp-dropdown,
                .pcp-enum-select {
                    flex: 1;
                    background: linear-gradient(135deg, rgba(0, 0, 0, 0.35) 0%, rgba(20, 20, 30, 0.4) 100%);
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    border-radius: 8px;
                    padding: 8px 32px 8px 12px;
                    color: #E8E8E8;
                    font-size: 13px;
                    min-width: 100px;
                    max-width: 100%;
                    height: 36px;
                    transition: background-color 0.25s ease, border-color 0.25s ease;
                    cursor: pointer;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    /* 自定义下拉箭头 */
                    appearance: none;
                    -webkit-appearance: none;
                    -moz-appearance: none;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23B0B0B0' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: right 10px center;
                    background-size: 14px;
                }

                /* Hover 状态 */
                .pcp-dropdown:hover,
                .pcp-enum-select:hover {
                    border-color: rgba(116, 55, 149, 0.5);
                    background-color: rgba(0, 0, 0, 0.45);
                    box-shadow: 0 2px 8px rgba(116, 55, 149, 0.15);
                }

                /* Focus 状态 */
                .pcp-dropdown:focus,
                .pcp-enum-select:focus {
                    outline: none;
                    border-color: #743795;
                    background-color: rgba(0, 0, 0, 0.5);
                    box-shadow: 0 0 0 3px rgba(116, 55, 149, 0.2), 0 4px 12px rgba(116, 55, 149, 0.25);
                }

                /* 下拉选项样式 */
                .pcp-dropdown option,
                .pcp-enum-select option {
                    background: #2a2a3a;
                    color: #E8E8E8;
                    padding: 10px 12px;
                    font-size: 13px;
                }

                .pcp-dropdown option:hover,
                .pcp-enum-select option:hover {
                    background: linear-gradient(135deg, #3d2951 0%, #4d3561 100%);
                }

                .pcp-dropdown option:checked,
                .pcp-enum-select option:checked {
                    background: linear-gradient(135deg, #743795 0%, #8b4ba8 100%);
                    color: #fff;
                    font-weight: 500;
                }

                /* 禁用状态 */
                .pcp-dropdown:disabled,
                .pcp-enum-select:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                /* 枚举/下拉容器样式 */
                .pcp-enum-container,
                .pcp-dropdown-container {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex: 1;
                    min-width: 0;
                    overflow: hidden;
                    padding: 2px 0;
                }

                /* 枚举/下拉指示器图标 */
                .pcp-enum-indicator,
                .pcp-dropdown-indicator {
                    font-size: 16px;
                    opacity: 0.8;
                    flex-shrink: 0;
                    width: 28px;
                    height: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(116, 55, 149, 0.15);
                    border-radius: 6px;
                    transition: background-color 0.2s ease, opacity 0.2s ease, border-color 0.2s ease;
                }

                .pcp-enum-container:hover .pcp-enum-indicator,
                .pcp-dropdown-container:hover .pcp-dropdown-indicator {
                    background: rgba(116, 55, 149, 0.25);
                    transform: scale(1.05);
                }

                /* 图像参数样式 */
                .pcp-image-container {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex: 1;
                    min-width: 0;
                }

                .pcp-image-filename {
                    flex: 1;
                    padding: 4px 8px;
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 6px;
                    color: #E0E0E0;
                    font-size: 12px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    cursor: pointer;
                    transition: background-color 0.2s ease, opacity 0.2s ease, border-color 0.2s ease;
                }

                .pcp-image-filename:hover {
                    background: rgba(0, 0, 0, 0.4);
                    border-color: rgba(116, 55, 149, 0.3);
                }

                .pcp-image-clear-button {
                    padding: 4px 8px;
                    background: rgba(220, 38, 38, 0.2);
                    border: 1px solid rgba(220, 38, 38, 0.3);
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    flex-shrink: 0;
                    transition: background-color 0.2s ease, opacity 0.2s ease, border-color 0.2s ease;
                }

                .pcp-image-clear-button:hover {
                    background: rgba(220, 38, 38, 0.4);
                    border-color: rgba(220, 38, 38, 0.5);
                    transform: translateY(-1px);
                }

                .pcp-image-upload-button {
                    padding: 4px 8px;
                    background: rgba(116, 55, 149, 0.2);
                    border: 1px solid rgba(116, 55, 149, 0.3);
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    flex-shrink: 0;
                    transition: background-color 0.2s ease, opacity 0.2s ease, border-color 0.2s ease;
                }

                .pcp-image-upload-button:hover {
                    background: rgba(116, 55, 149, 0.4);
                    border-color: rgba(116, 55, 149, 0.5);
                    transform: translateY(-1px);
                }

                .pcp-image-preview-popup {
                    position: fixed;
                    z-index: 10000;
                    background: #2a2a3a;
                    border: 2px solid #555;
                    border-radius: 8px;
                    padding: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
                    max-width: 400px;
                    max-height: 400px;
                    pointer-events: none;
                    animation: pcp-fade-in 0.15s ease;
                }

                @keyframes pcp-fade-in {
                    from {
                        opacity: 0;
                        transform: scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }

                .pcp-image-preview-popup img {
                    max-width: 100%;
                    max-height: 100%;
                    display: block;
                    border-radius: 4px;
                }

                /* TagList 标签列表样式 */
                .pcp-taglist-container {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    flex: 1;
                    min-width: 0;
                }

                .pcp-taglist-wrapper {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 4px;
                    min-height: 28px;
                    padding: 4px;
                    background: rgba(0, 0, 0, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 6px;
                }

                .pcp-taglist-empty {
                    color: #666;
                    font-size: 11px;
                    font-style: italic;
                    padding: 2px 6px;
                }

                .pcp-taglist-tag {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 11px;
                    border: 1px solid;
                    cursor: pointer;
                    transition: background-color 0.2s ease, opacity 0.2s ease, border-color 0.2s ease;
                    user-select: none;
                    position: relative;
                }

                .pcp-taglist-tag:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                }

                .pcp-taglist-tag.disabled {
                    opacity: 0.6;
                    text-decoration: line-through;
                    background: rgba(128, 128, 128, 0.2) !important;
                    border-color: #666 !important;
                    color: #888 !important;
                }

                .pcp-taglist-tag-text {
                    max-width: 150px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .pcp-taglist-tag-delete {
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: bold;
                    opacity: 0.6;
                    transition: opacity 0.2s ease;
                    line-height: 1;
                }

                .pcp-taglist-tag-delete:hover {
                    opacity: 1;
                    color: #ff6b6b;
                }

                .pcp-taglist-input {
                    flex: 1;
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                    padding: 4px 8px;
                    color: #E0E0E0;
                    font-size: 11px;
                }

                .pcp-taglist-input:focus {
                    outline: none;
                    border-color: #743795;
                    background: rgba(0, 0, 0, 0.4);
                }

                .pcp-taglist-input::placeholder {
                    color: #666;
                }

                /* Tag 拖拽排序样式 */
                .pcp-taglist-tag[draggable="true"] {
                    cursor: grab;
                }

                .pcp-taglist-tag[draggable="true"]:active {
                    cursor: grabbing;
                }

                .pcp-taglist-tag.pcp-tag-dragging {
                    opacity: 0.4;
                    transform: scale(0.95);
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
                }

                .pcp-taglist-tag.pcp-tag-drag-over-left::before {
                    content: '';
                    position: absolute;
                    left: -3px;
                    top: 2px;
                    bottom: 2px;
                    width: 3px;
                    background-color: #743795;
                    border-radius: 2px;
                    box-shadow: 0 0 6px #743795;
                }

                .pcp-taglist-tag.pcp-tag-drag-over-right::after {
                    content: '';
                    position: absolute;
                    right: -3px;
                    top: 2px;
                    bottom: 2px;
                    width: 3px;
                    background-color: #743795;
                    border-radius: 2px;
                    box-shadow: 0 0 6px #743795;
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
                    transition: background-color 0.2s ease, opacity 0.2s ease, border-color 0.2s ease;
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
                    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.8);
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
                    transition: background-color 0.2s ease, opacity 0.2s ease, border-color 0.2s ease;
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
                    transition: background-color 0.2s ease, opacity 0.2s ease, border-color 0.2s ease;
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
                    transition: background-color 0.2s ease, opacity 0.2s ease, border-color 0.2s ease;
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

                /* Markdown Tooltip 样式 */
                .pcp-markdown-tooltip {
                    position: fixed;
                    background: rgba(30, 30, 40, 0.98);
                    border: 1px solid rgba(116, 55, 149, 0.6);
                    border-radius: 8px;
                    padding: 12px 16px;
                    max-width: 400px;
                    max-height: 500px;
                    overflow-y: auto;
                    z-index: 999999;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), 0 0 20px rgba(116, 55, 149, 0.3);
                    pointer-events: auto;
                    opacity: 0;
                    transition: opacity 0.15s ease-in-out;
                    font-size: 13px;
                    line-height: 1.6;
                    color: #E0E0E0;
                }

                .pcp-markdown-tooltip.visible {
                    opacity: 1;
                }

                .pcp-markdown-tooltip::-webkit-scrollbar {
                    width: 6px;
                }

                .pcp-markdown-tooltip::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 3px;
                }

                .pcp-markdown-tooltip::-webkit-scrollbar-thumb {
                    background: rgba(116, 55, 149, 0.5);
                    border-radius: 3px;
                }

                .pcp-markdown-tooltip::-webkit-scrollbar-thumb:hover {
                    background: rgba(116, 55, 149, 0.7);
                }

                /* Markdown 内容样式 */
                .pcp-markdown-tooltip h1,
                .pcp-markdown-tooltip h2,
                .pcp-markdown-tooltip h3,
                .pcp-markdown-tooltip h4,
                .pcp-markdown-tooltip h5,
                .pcp-markdown-tooltip h6 {
                    color: #B19CD9;
                    margin: 8px 0 4px 0;
                    font-weight: 600;
                }

                .pcp-markdown-tooltip h1 { font-size: 18px; }
                .pcp-markdown-tooltip h2 { font-size: 16px; }
                .pcp-markdown-tooltip h3 { font-size: 15px; }
                .pcp-markdown-tooltip h4 { font-size: 14px; }
                .pcp-markdown-tooltip h5 { font-size: 13px; }
                .pcp-markdown-tooltip h6 { font-size: 12px; }

                .pcp-markdown-tooltip p {
                    margin: 4px 0;
                }

                .pcp-markdown-tooltip code {
                    background: rgba(0, 0, 0, 0.3);
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                    font-size: 12px;
                    color: #F0DB4F;
                }

                .pcp-markdown-tooltip pre {
                    background: rgba(0, 0, 0, 0.4);
                    padding: 8px 12px;
                    border-radius: 4px;
                    border-left: 3px solid rgba(116, 55, 149, 0.8);
                    overflow-x: auto;
                    margin: 8px 0;
                }

                .pcp-markdown-tooltip pre code {
                    background: none;
                    padding: 0;
                }

                .pcp-markdown-tooltip ul,
                .pcp-markdown-tooltip ol {
                    margin: 4px 0;
                    padding-left: 20px;
                }

                .pcp-markdown-tooltip li {
                    margin: 2px 0;
                }

                .pcp-markdown-tooltip blockquote {
                    border-left: 3px solid rgba(116, 55, 149, 0.6);
                    padding-left: 12px;
                    margin: 8px 0;
                    color: #B0B0B0;
                    font-style: italic;
                }

                .pcp-markdown-tooltip a {
                    color: #9370DB;
                    text-decoration: underline;
                }

                .pcp-markdown-tooltip a:hover {
                    color: #B19CD9;
                }

                .pcp-markdown-tooltip strong {
                    color: #F0F0F0;
                    font-weight: 600;
                }

                .pcp-markdown-tooltip em {
                    color: #D0D0D0;
                    font-style: italic;
                }

                /* 说明图标样式 */
                .pcp-description-icon {
                    opacity: 0.6;
                    transition: opacity 0.2s ease;
                    user-select: none;
                }

                .pcp-description-icon:hover {
                    opacity: 1;
                }

                /* ============================================================ */
                /* 左上角提示样式 (Top Left Notice Styles) */
                /* ============================================================ */

                .pcp-top-left-notice-container {
                    position: fixed;
                    top: 120px;
                    left: 120px;
                    z-index: 99999;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    pointer-events: none; /* 不阻止鼠标事件 */
                }

                .pcp-top-left-notice-item {
                    background: linear-gradient(135deg, #743795 0%, #8b4ba8 100%);
                    padding: 12px 20px;
                    border-radius: 8px;
                    color: white;
                    font-weight: 500;
                    font-size: 14px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
                    animation: slideInLeft 0.3s ease;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    backdrop-filter: blur(10px);
                    pointer-events: auto; /* 提示本身可以接收鼠标事件 */
                }

                /* 滑入动画 */
                @keyframes slideInLeft {
                    from {
                        opacity: 0;
                        transform: translateX(-30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }

                /* 滑出动画 */
                @keyframes slideOutLeft {
                    from {
                        opacity: 1;
                        transform: translateX(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateX(-30px);
                    }
                }

                /* 参数条目右键菜单 */
                .pcp-context-menu {
                    position: fixed;
                    min-width: 160px;
                    background: #2a2a3a;
                    border: 1px solid rgba(116, 55, 149, 0.4);
                    border-radius: 8px;
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
                    z-index: 9999999999;
                    opacity: 0;
                    transform: scale(0.95);
                    transition: opacity 0.15s ease, transform 0.15s ease;
                    overflow: hidden;
                }

                .pcp-context-menu-visible {
                    opacity: 1;
                    transform: scale(1);
                }

                .pcp-context-menu-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 14px;
                    cursor: pointer;
                    transition: background 0.15s ease;
                    font-size: 13px;
                    color: #E0E0E0;
                    user-select: none;
                }

                .pcp-context-menu-item:hover {
                    background: rgba(116, 55, 149, 0.3);
                }

                .pcp-context-menu-item.disabled {
                    opacity: 0.4;
                    cursor: not-allowed;
                    pointer-events: none;
                }

                .pcp-context-menu-icon {
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 18px;
                    height: 18px;
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
                logger.info('[PCP] 锁定模式已开启');
            } else {
                this.showToast('已关闭锁定模式', 'success');
                logger.info('[PCP] 锁定模式已关闭');
            }
        };

        // 更新参数列表显示
        nodeType.prototype.updateParametersList = function () {
            try {
                // 检查 customUI 是否存在
                if (!this.customUI) {
                    logger.warn('[PCP] customUI 不存在，跳过参数列表更新');
                    return;
                }

                const listContainer = this.customUI.querySelector('#pcp-parameters-list');
                if (!listContainer) {
                    logger.warn('[PCP] 参数列表容器不存在');
                    return;
                }

                // 确保 parameters 数组存在
                if (!this.properties.parameters) {
                    this.properties.parameters = [];
                }

                // 保存所有textarea的当前高度（使用 param.id 作为 key）
                const textareaHeights = new Map();
                const existingItems = Array.from(listContainer.children);
                existingItems.forEach((item) => {
                    const paramId = item.dataset.paramId;
                    const textarea = item.querySelector('.pcp-string-textarea');
                    if (textarea && paramId) {
                        textareaHeights.set(paramId, textarea.style.height || `${textarea.offsetHeight}px`);
                    }
                });

                // 确保所有参数都有ID（兼容旧数据）
                this.properties.parameters.forEach(param => {
                    if (!param.id) {
                        param.id = `param_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                        logger.info(`[PCP] 为参数 '${param.name}' 补充ID:`, param.id);
                    }
                });

                // ====== 性能优化：使用 DocumentFragment 批量插入 DOM ======
                const fragment = document.createDocumentFragment();
                this.properties.parameters.forEach((param, index) => {
                    const paramItem = this.createParameterItem(param, index);
                    fragment.appendChild(paramItem);

                    // 恢复textarea高度（使用 param.id 作为 key）
                    if (textareaHeights.has(param.id)) {
                        const textarea = paramItem.querySelector('.pcp-string-textarea');
                        if (textarea) {
                            textarea.style.height = textareaHeights.get(param.id);
                        }
                    }
                });

                // 一次性清空并添加所有元素
                listContainer.innerHTML = '';
                listContainer.appendChild(fragment);

                // 更新节点输出
                this.updateOutputs();

                // 通知连接的 ParameterBreak 节点更新
                this.notifyConnectedBreakNodes();

                // 检查并修复from_connection类型的dropdown缺失options问题
                this.recheckFromConnectionDropdowns();
            } catch (error) {
                logger.error('[PCP] 更新参数列表失败:', error);
            }
        };

        // 恢复所有需要显示的左上角提示
        nodeType.prototype.restoreTopLeftNotices = function () {
            // 遍历所有参数
            this.properties.parameters.forEach(param => {
                // 只处理 switch 类型参数
                if (param.type !== 'switch') return;

                // 检查是否开启且配置了显示提示
                const value = param.value !== undefined ? param.value : (param.config?.default || false);
                if (value && param.config?.show_top_left_notice) {
                    const noticeText = param.config.notice_text || `${param.name}：已开启`;
                    globalTopLeftNoticeManager.showNotice(param.name, noticeText);
                    logger.info(`[PCP] 恢复提示: ${param.name} -> ${noticeText}`);
                }
            });
        };

        // 工作流初始化时刷新所有下拉菜单选项列表
        nodeType.prototype.refreshAllDropdownsOnWorkflowLoad = function () {
            try {
                // 获取所有下拉菜单参数
                const dropdownParams = this.properties.parameters.filter(param => param.type === 'dropdown');

                if (dropdownParams.length === 0) {
                    logger.info('[PCP] 工作流初始化: 没有找到下拉菜单参数，跳过刷新');
                    return;
                }

                logger.info(`[PCP] 🚀 工作流初始化: 开始刷新 ${dropdownParams.length} 个下拉菜单选项列表`);
                logger.debug('[PCP] 下拉菜单参数详情:', dropdownParams.map(p => ({ name: p.name, dataSource: p.config?.data_source || 'from_connection' })));

                // 📋 记录所有下拉菜单参数的详细信息
                const dropdownSummary = dropdownParams.map(param => ({
                    name: param.name,
                    dataSource: param.config?.data_source || 'from_connection',
                    currentValue: param.value,
                    hasValidConfig: !!param.config
                }));
                logger.info('[PCP] 📋 所有下拉菜单参数列表:', JSON.stringify(dropdownSummary, null, 2));

                // 🔍 调试：记录工作流保存的原始值
                logger.info(`[PCP] 🔍 调试：工作流加载时的参数值检查`);
                dropdownParams.forEach(param => {
                    logger.info(`[PCP] 🔍 参数 '${param.name}': 当前param.value='${param.value}', 数据源=${param.config?.data_source || 'from_connection'}`);
                });

                // 并行刷新所有下拉菜单
                const refreshPromises = dropdownParams.map(param => this.refreshSingleDropdown(param));

                // 等待所有刷新完成
                Promise.allSettled(refreshPromises).then(results => {
                    const successCount = results.filter(r => r.status === 'fulfilled').length;
                    const failCount = results.filter(r => r.status === 'rejected').length;

                    logger.info(`[PCP] 下拉菜单刷新完成: ${successCount} 成功, ${failCount} 失败`);
                });
            } catch (error) {
                logger.error('[PCP] 刷新下拉菜单选项时出错:', error);
            }
        };

        // 刷新单个下拉菜单参数
        nodeType.prototype.refreshSingleDropdown = function (param) {
            return new Promise((resolve, reject) => {
                if (!param.config) {
                    logger.info(`[PCP] 跳过参数刷新: ${param.name} (无配置)`);
                    resolve();
                    return;
                }

                const dataSource = param.config.data_source || 'from_connection';
                logger.info(`[PCP] 🔄 开始刷新参数: ${param.name}, 数据源: ${dataSource}`);

                // 🧪 强制刷新所有数据源类型（用于测试）
                const forceRefreshTypes = ['checkpoint', 'lora', 'controlnet', 'upscale_model'];
                if (forceRefreshTypes.includes(dataSource)) {
                    logger.info(`[PCP] 🧪 检测到需要强制刷新的数据源: ${dataSource}`);
                }

                // 根据数据源类型获取最新选项
                if (dataSource === 'checkpoint' || dataSource === 'lora' || dataSource === 'controlnet' || dataSource === 'upscale_model' || dataSource === 'sampler' || dataSource === 'scheduler') {
                    // 获取模型文件列表或系统选项
                    logger.info(`[PCP] 📡 发起 API 请求: /danbooru_gallery/pcp/get_data_source?type=${dataSource}`);
                    fetch(`/danbooru_gallery/pcp/get_data_source?type=${dataSource}`)
                        .then(response => response.json())
                        .then(data => {
                            logger.info(`[PCP] 📥 API 响应: ${dataSource}, 状态: ${data.status}, 选项数: ${data.options?.length || 0}`);
                            if (data.status === 'success' && data.options) {
                                logger.info(`[PCP] ✅ 成功获取 ${dataSource} 数据源: ${data.options.length} 个选项`);
                                logger.debug(`[PCP] ${dataSource} 选项列表:`, data.options);
                                this.refreshDropdownOptions(param.name, data.options, param.value);
                            } else {
                                logger.warn(`[PCP] ❌ ${dataSource} 数据源返回状态异常:`, data);
                            }
                            resolve();
                        })
                        .catch(error => {
                            logger.error(`[PCP] ❌ 获取 ${dataSource} 数据源失败:`, error);
                            resolve(); // 即使失败也resolve，不阻塞其他下拉菜单
                        });
                } else if (dataSource === 'custom' && param.config.options) {
                    // 自定义选项直接刷新
                    this.refreshDropdownOptions(param.name, param.config.options, param.value);
                    resolve();
                } else if (dataSource === 'from_connection') {
                    // 从 ParameterBreak 节点获取选项
                    this.getOptionsFromParameterBreak(param).then(options => {
                        if (options && options.length > 0) {
                            // 🔍 调试：记录传递给 refreshDropdownOptions 的值
                            logger.info(`[PCP] 🔍 from_connection 调试: 参数='${param.name}', 传递的 lockedValue='${param.value}', 选项数量=${options.length}`);
                            logger.info(`[PCP] 🔍 from_connection 调试: 选项列表前3个:`, options.slice(0, 3));
                            this.refreshDropdownOptions(param.name, options, param.value);
                        } else {
                            logger.warn(`[PCP] 无法从 ParameterBreak 获取参数 '${param.name}' 的选项`);
                        }
                        resolve();
                    }).catch(error => {
                        logger.error(`[PCP] 从 ParameterBreak 获取参数 '${param.name}' 选项失败:`, error);
                        // 向用户显示友好的错误提示
                        this.showToast(`无法刷新下拉菜单 '${param.name}'：${error.message}`, 'warning');
                        resolve(); // 即使失败也resolve，不阻塞其他下拉菜单
                    });
                } else {
                    // 未知数据源类型，跳过
                    logger.warn(`[PCP] 未知的数据源类型: ${dataSource}`);
                    resolve();
                }
            });
        };

        // 从 ParameterBreak 节点获取选项列表
        nodeType.prototype.getOptionsFromParameterBreak = function (param) {
            return new Promise((resolve, reject) => {
                try {
                    // 添加超时处理
                    const timeout = setTimeout(() => {
                        reject(new Error('获取 ParameterBreak 选项超时'));
                    }, 5000); // 5秒超时

                    // 检查是否有输出连接
                    if (!this.outputs || this.outputs.length === 0) {
                        clearTimeout(timeout);
                        reject(new Error('没有输出连接'));
                        return;
                    }

                    const output = this.outputs[0];
                    if (!output.links || output.links.length === 0) {
                        reject(new Error('输出未连接到 ParameterBreak 节点'));
                        return;
                    }

                    // 遍历所有连接，找到 ParameterBreak 节点
                    let parameterBreakNode = null;
                    let outputIndex = -1;

                    for (const linkId of output.links) {
                        const link = this.graph.links[linkId];
                        if (link && link.target_id) {
                            const targetNode = this.graph.getNodeById(link.target_id);
                            if (targetNode && targetNode.type === 'ParameterBreak') {
                                parameterBreakNode = targetNode;
                                outputIndex = link.target_slot;
                                break;
                            }
                        }
                    }

                    if (!parameterBreakNode) {
                        clearTimeout(timeout);
                        reject(new Error('未找到连接的 ParameterBreak 节点'));
                        return;
                    }

                    // 通过参数ID找到对应的输出索引
                    const paramStructure = parameterBreakNode.properties.paramStructure || [];
                    const paramInfo = paramStructure.find(p => p.param_id === param.id);

                    if (!paramInfo) {
                        clearTimeout(timeout);
                        reject(new Error(`在 ParameterBreak 节点中未找到参数 '${param.name}'`));
                        return;
                    }

                    // 获取该输出索引对应的选项列表
                    const outputIndexForParam = paramInfo.output_index;
                    const options = this.getOptionsFromParameterBreakOutput(parameterBreakNode, outputIndexForParam);

                    clearTimeout(timeout);
                    resolve(options);
                } catch (error) {
                    clearTimeout(timeout);
                    reject(error);
                }
            });
        };

        // 从 ParameterBreak 节点的特定输出获取选项列表
        nodeType.prototype.getOptionsFromParameterBreakOutput = function (parameterBreakNode, outputIndex) {
            try {
                // 首先通过参数结构获取参数信息
                const paramStructure = parameterBreakNode.properties.paramStructure || [];
                const paramInfo = paramStructure.find(p => p.output_index === outputIndex);

                if (!paramInfo) {
                    logger.warn(`[PCP] 在 ParameterBreak 节点中未找到输出索引 ${outputIndex} 对应的参数`);
                    return [];
                }

                // 方法1：检查选项同步缓存（ParameterBreak 节点使用这种方式存储选项）
                if (parameterBreakNode.properties && parameterBreakNode.properties.optionsSyncCache) {
                    const cacheKey = paramInfo.param_id;
                    const cachedOptionsStr = parameterBreakNode.properties.optionsSyncCache[cacheKey];
                    if (cachedOptionsStr) {
                        try {
                            const cachedOptions = JSON.parse(cachedOptionsStr);
                            if (Array.isArray(cachedOptions)) {
                                logger.info(`[PCP] 从缓存获取到 ${cachedOptions.length} 个选项`);
                                return cachedOptions;
                            }
                        } catch (parseError) {
                            logger.warn(`[PCP] 解析缓存选项失败:`, parseError);
                        }
                    }
                }

                // 方法2：尝试通过参数配置获取默认选项
                if (paramInfo.options && Array.isArray(paramInfo.options)) {
                    logger.info(`[PCP] 使用参数配置中的默认选项: ${paramInfo.options.length} 个`);
                    return paramInfo.options;
                }

                // 方法3：通过参数元数据获取选项（如果有的话）
                if (paramInfo.config && paramInfo.config.options && Array.isArray(paramInfo.config.options)) {
                    logger.info(`[PCP] 使用参数配置中的选项: ${paramInfo.config.options.length} 个`);
                    return paramInfo.config.options;
                }

                // 方法4：尝试重新触发连接获取选项
                if (parameterBreakNode.scanOutputConnections && typeof parameterBreakNode.scanOutputConnections === 'function') {
                    logger.info(`[PCP] 尝试重新扫描 ParameterBreak 节点的输出连接`);
                    // 异步触发扫描，但不等待结果，避免死锁
                    setTimeout(() => {
                        parameterBreakNode.scanOutputConnections();
                    }, 100);
                }

                logger.warn(`[PCP] 无法获取 ParameterBreak 节点输出 ${outputIndex} 的选项列表，返回空数组`);
                return [];
            } catch (error) {
                logger.error(`[PCP] 获取 ParameterBreak 选项时出错:`, error);
                return [];
            }
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
                        logger.info('[PCP] 通知 ParameterBreak 节点更新:', targetNode.id);
                        // 延迟一下，确保数据已同步
                        setTimeout(() => {
                            targetNode.syncParameterStructure();
                        }, 50);
                    }
                });
            } catch (error) {
                logger.error('[PCP] 通知连接节点时出错:', error);
            }
        };

        // 检查并修复from_connection类型的dropdown缺失options问题
        nodeType.prototype.recheckFromConnectionDropdowns = function () {
            try {
                // 查找所有from_connection类型但options为空的dropdown参数
                const brokenDropdowns = this.properties.parameters.filter(param => {
                    return param.type === 'dropdown' &&
                           param.config?.data_source === 'from_connection' &&
                           (!param.config.options || param.config.options.length === 0);
                });

                if (brokenDropdowns.length === 0) {
                    return;
                }

                logger.info('[PCP] 发现', brokenDropdowns.length, '个from_connection类型dropdown缺失options，准备修复...');

                // 查找连接的ParameterBreak节点
                if (!this.outputs || this.outputs.length === 0) {
                    logger.warn('[PCP] 没有输出连接，无法修复dropdown选项');
                    return;
                }

                const output = this.outputs[0];
                if (!output.links || output.links.length === 0) {
                    logger.warn('[PCP] 没有连接到ParameterBreak节点');
                    return;
                }

                // 遍历所有连接
                output.links.forEach(linkId => {
                    const link = this.graph.links[linkId];
                    if (!link) return;

                    const targetNode = this.graph.getNodeById(link.target_id);
                    if (!targetNode || targetNode.type !== "ParameterBreak") return;

                    // 对每个损坏的dropdown，清除ParameterBreak的缓存并重新同步
                    brokenDropdowns.forEach(param => {
                        // 清除缓存
                        if (targetNode.properties.optionsSyncCache && param.id) {
                            logger.info(`[PCP] 清除参数 '${param.name}' 的缓存，强制重新同步`);
                            delete targetNode.properties.optionsSyncCache[param.id];
                        }

                        // 找到该参数在ParameterBreak中的输出索引
                        const paramStructure = targetNode.properties.paramStructure || [];
                        const paramIndex = paramStructure.findIndex(p => p.param_id === param.id);

                        if (paramIndex === -1) {
                            logger.warn(`[PCP] 在ParameterBreak中未找到参数 '${param.name}'`);
                            return;
                        }

                        // 检查该输出是否有连接
                        if (targetNode.outputs && targetNode.outputs[paramIndex]) {
                            const paramOutput = targetNode.outputs[paramIndex];
                            if (paramOutput.links && paramOutput.links.length > 0) {
                                // 触发该输出的重新同步
                                setTimeout(() => {
                                    logger.info(`[PCP] 触发参数 '${param.name}' 重新同步选项`);
                                    const linkInfo = this.graph.links[paramOutput.links[0]];
                                    if (linkInfo && typeof targetNode.handleOutputConnection === 'function') {
                                        targetNode.handleOutputConnection(paramIndex, linkInfo);
                                    }
                                }, 100);
                            } else {
                                logger.warn(`[PCP] 参数 '${param.name}' 的输出未连接，无法同步选项`);
                            }
                        }
                    });
                });

            } catch (error) {
                logger.error('[PCP] 修复from_connection dropdown时出错:', error);
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
                        dragHandle.removeAttribute('title');
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

                // 绑定tooltip事件到整个item（排除按钮区域）
                const separatorDescription = param.config?.description;
                if (separatorDescription && separatorDescription.trim()) {
                    let isTooltipVisible = false;

                    const controlSelector = '.pcp-parameter-edit, .pcp-parameter-delete';

                    item.addEventListener('mousemove', (e) => {
                        const isInControl = e.target.closest(controlSelector);

                        if (!isInControl && !isTooltipVisible) {
                            tooltipManager.showTooltip(item, separatorDescription);
                            isTooltipVisible = true;
                        } else if (isInControl && isTooltipVisible) {
                            tooltipManager.hideTooltip();
                            isTooltipVisible = false;
                        }
                    });

                    item.addEventListener('mouseleave', () => {
                        tooltipManager.hideTooltip();
                        isTooltipVisible = false;
                    });
                }

                // 右键菜单事件
                item.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showParameterContextMenu(e.clientX, e.clientY, param.id);
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

            // 如果有说明，添加提示图标（tooltip绑定移到item级别）
            const description = param.config?.description;
            if (description && description.trim()) {
                const descIcon = document.createElement('span');
                descIcon.className = 'pcp-description-icon';
                descIcon.textContent = ' ℹ️';
                descIcon.style.cursor = 'help';
                nameLabel.appendChild(descIcon);
            }

            // 锁定模式下禁用拖拽
            if (this.properties.locked) {
                nameLabel.draggable = false;
                nameLabel.style.cursor = 'default';
                nameLabel.removeAttribute('title');
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
                case 'string':
                    control.appendChild(this.createString(param));
                    break;
                case 'image':
                    control.appendChild(this.createImage(param));
                    break;
                case 'taglist':
                    control.appendChild(this.createTagList(param));
                    break;
                case 'enum':
                    control.appendChild(this.createEnum(param));
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
            // 锁定模式下禁用编辑按钮视觉效果
            if (this.properties.locked) {
                editButton.style.opacity = '0.4';
                editButton.style.cursor = 'not-allowed';
                editButton.title = '锁定模式下无法编辑';
            }
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
                // 锁定模式下禁止编辑
                if (this.properties.locked) {
                    this.showToast('锁定模式下无法编辑参数', 'error');
                    return;
                }
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

            // 绑定tooltip事件到整个item（排除控件区域）
            if (description && description.trim()) {
                let isTooltipVisible = false;

                const controlSelector = '.pcp-slider-container, .pcp-switch, .pcp-dropdown-container, .pcp-string-input, .pcp-string-textarea, .pcp-image-container, .pcp-taglist-container, .pcp-parameter-edit, .pcp-parameter-delete';

                item.addEventListener('mousemove', (e) => {
                    const isInControl = e.target.closest(controlSelector);

                    if (!isInControl && !isTooltipVisible) {
                        tooltipManager.showTooltip(item, description);
                        isTooltipVisible = true;
                    } else if (isInControl && isTooltipVisible) {
                        tooltipManager.hideTooltip();
                        isTooltipVisible = false;
                    }
                });

                item.addEventListener('mouseleave', () => {
                    tooltipManager.hideTooltip();
                    isTooltipVisible = false;
                });
            }

            // 右键菜单事件
            item.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showParameterContextMenu(e.clientX, e.clientY, param.id);
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

            // 如果有说明，添加提示图标（tooltip绑定移到item级别）
            const description = param.config?.description;
            if (description && description.trim()) {
                const descIcon = document.createElement('span');
                descIcon.className = 'pcp-description-icon';
                descIcon.textContent = ' ℹ️';
                descIcon.style.cursor = 'help';
                descIcon.style.marginLeft = '6px';
                labelContainer.appendChild(descIcon);
            }

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
            const bindInteractionGuards = (el) => {
                el.addEventListener('pointerdown', preventDrag);
                el.addEventListener('mousedown', preventDrag);
                el.addEventListener('touchstart', preventDrag, { passive: true });
                el.addEventListener('dragstart', preventDragStart);
                el.draggable = false;
            };

            // 容器级别阻止
            bindInteractionGuards(container);

            // 滑条元素级别阻止
            bindInteractionGuards(slider);

            // 数值输入框级别阻止
            bindInteractionGuards(valueInput);

            // 同步滑条和输入框
            // ====== 性能优化：使用节流减少 syncConfig 调用频率 ======
            const throttledSyncConfig = throttle(() => this.syncConfig(), 100);
            slider.addEventListener('input', (e) => {
                const newValue = parseFloat(e.target.value);
                valueInput.value = newValue;
                param.value = newValue;
                throttledSyncConfig();
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

                // 根据配置显示/隐藏左上角提示
                if (param.config?.show_top_left_notice) {
                    if (newValue) {
                        const noticeText = param.config.notice_text || `${param.name}：已开启`;
                        globalTopLeftNoticeManager.showNotice(param.name, noticeText);
                    } else {
                        globalTopLeftNoticeManager.hideNotice(param.name);
                    }
                }
            });

            return switchContainer;
        };

        // 创建下拉菜单UI
        nodeType.prototype.createDropdown = function (param) {
            const container = document.createElement('div');
            container.className = 'pcp-dropdown-container';

            const select = document.createElement('select');
            select.className = 'pcp-dropdown';
            // 添加参数名标识，用于后续刷新选项
            select.dataset.paramName = param.name;

            const config = param.config || {};
            const dataSource = config.data_source || 'custom';

            // 添加数据源状态指示器
            const indicator = document.createElement('span');
            indicator.className = 'pcp-dropdown-indicator';

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

        // 创建枚举UI
        nodeType.prototype.createEnum = function (param) {
            const container = document.createElement('div');
            container.className = 'pcp-enum-container';

            const select = document.createElement('select');
            select.className = 'pcp-enum-select';
            select.dataset.paramName = param.name;
            select.dataset.paramId = param.id;

            const config = param.config || {};
            const dataSource = config.data_source || 'custom';

            // 添加数据源状态指示器
            const indicator = document.createElement('span');
            indicator.className = 'pcp-enum-indicator';

            if (dataSource === 'custom') {
                indicator.textContent = '🔢';
                indicator.title = '自定义枚举选项';
            } else {
                indicator.textContent = '📁';
                indicator.title = '从' + dataSource + '获取选项';
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
            const loadOptions = (options) => {
                select.innerHTML = '';
                options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt;
                    option.textContent = opt;
                    if (param.value === opt) {
                        option.selected = true;
                    }
                    select.appendChild(option);
                });
            };

            if (dataSource === 'custom') {
                const options = config.options || [];
                loadOptions(options);
            } else {
                // 动态数据源
                this.loadDataSource(dataSource).then(options => {
                    loadOptions(options);
                    // 更新 config.options 以便后续使用
                    if (!param.config) param.config = {};
                    param.config.options = options;
                });
            }

            // 选择事件 - 同步值并通知关联的 EnumSwitch 节点
            select.addEventListener('change', (e) => {
                param.value = e.target.value;
                this.syncConfig();

                // 发送枚举变更事件到关联的 EnumSwitch 节点
                this.notifyEnumSwitchNodes(param);
            });

            // 组装container
            container.appendChild(indicator);
            container.appendChild(select);

            return container;
        };

        // 通知关联的 EnumSwitch 节点
        nodeType.prototype.notifyEnumSwitchNodes = function(param) {
            const options = param.config?.options || [];
            const selectedValue = param.value || '';

            // 通过自定义事件广播
            if (this.graph) {
                // 遍历所有节点，找到连接到此 PCP 的 EnumSwitch 节点
                for (const node of this.graph._nodes) {
                    if (node.type === 'EnumSwitch') {
                        // 检查是否连接到此 PCP（直接连接或通过 ParameterBreak）
                        const enumInput = node.inputs && node.inputs[0];
                        if (enumInput && enumInput.link != null) {
                            const link = this.graph.links[enumInput.link];
                            if (link) {
                                let originNodeId = link.origin_id;
                                let shouldNotify = false;

                                // 检查是否直接连接到此 PCP
                                if (originNodeId === this.id) {
                                    shouldNotify = true;
                                } else {
                                    // 检查是否通过 ParameterBreak 连接
                                    const originNode = this.graph.getNodeById(originNodeId);
                                    if (originNode && originNode.type === 'ParameterBreak') {
                                        // 检查 ParameterBreak 是否连接到此 PCP
                                        const pbInput = originNode.inputs && originNode.inputs[0];
                                        if (pbInput && pbInput.link != null) {
                                            const pbLink = this.graph.links[pbInput.link];
                                            if (pbLink && pbLink.origin_id === this.id) {
                                                shouldNotify = true;
                                            }
                                        }
                                    }
                                }

                                if (shouldNotify) {
                                    window.dispatchEvent(new CustomEvent('enum-switch-update', {
                                        detail: {
                                            targetNodeId: node.id,
                                            options: options,
                                            selectedValue: selectedValue,
                                            panelNodeId: this.id,
                                            paramName: param.name
                                        }
                                    }));
                                }
                            }
                        }
                    }
                }
            }

            // 也通过后端 API 发送通知（用于刷新后恢复）
            fetch('/danbooru_gallery/pcp/notify_enum_change', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source_node_id: this.id,
                    param_name: param.name,
                    options: options,
                    selected_value: selectedValue
                })
            }).catch(error => {
                logger.warn('[PCP] 通知枚举变更失败:', error);
            });
        };

        // 创建字符串UI
        nodeType.prototype.createString = function (param) {
            const container = document.createElement('div');
            container.className = 'pcp-string-container';
            container.style.display = 'flex';
            container.style.alignItems = 'flex-start';
            container.style.gap = '8px';
            container.style.flex = '1';
            container.style.minWidth = '0';

            const config = param.config || {};
            const isMultiline = config.multiline || false;

            // 创建输入控件
            let input;
            if (isMultiline) {
                input = document.createElement('textarea');
                input.className = 'pcp-string-textarea';
                input.rows = 3;
                input.style.resize = 'vertical';
            } else {
                input = document.createElement('input');
                input.type = 'text';
                input.className = 'pcp-string-input';
            }

            input.value = param.value || '';
            input.placeholder = '输入文本...';
            input.style.flex = '1';
            input.style.padding = '6px 10px';
            input.style.background = 'rgba(0, 0, 0, 0.3)';
            input.style.border = '1px solid rgba(255, 255, 255, 0.1)';
            input.style.borderRadius = '6px';
            input.style.color = '#E0E0E0';
            input.style.fontSize = '12px';
            input.style.fontFamily = 'inherit';

            // 恢复保存的textarea高度（持久化）
            if (isMultiline && config.textareaHeight) {
                input.style.height = config.textareaHeight;
            }

            // 输入事件
            // ====== 性能优化：使用防抖减少 syncConfig 调用频率 ======
            const debouncedSyncConfig = debounce(() => this.syncConfig(), 300);
            input.addEventListener('input', (e) => {
                param.value = e.target.value;
                debouncedSyncConfig();
            });

            // 监听textarea高度变化并持久化保存
            if (isMultiline) {
                // ====== 性能优化：使用防抖减少 ResizeObserver 回调频率 ======
                const debouncedResizeSyncConfig = debounce(() => this.syncConfig(), 500);
                const resizeObserver = new ResizeObserver(() => {
                    const currentHeight = input.style.height || `${input.offsetHeight}px`;
                    if (!param.config) param.config = {};
                    if (param.config.textareaHeight !== currentHeight) {
                        param.config.textareaHeight = currentHeight;
                        debouncedResizeSyncConfig();
                    }
                });
                resizeObserver.observe(input);

                // 存储 ResizeObserver 引用以便在节点移除时清理
                if (!this._resizeObservers) this._resizeObservers = [];
                this._resizeObservers.push(resizeObserver);
            }

            // 聚焦样式
            input.addEventListener('focus', () => {
                input.style.outline = 'none';
                input.style.borderColor = '#743795';
                input.style.background = 'rgba(0, 0, 0, 0.4)';
            });

            input.addEventListener('blur', () => {
                input.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                input.style.background = 'rgba(0, 0, 0, 0.3)';
            });

            container.appendChild(input);

            return container;
        };

        // 创建图像UI
        nodeType.prototype.createImage = function (param) {
            const container = document.createElement('div');
            container.className = 'pcp-image-container';
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.style.gap = '8px';
            container.style.flex = '1';
            container.style.minWidth = '0';

            // 文件名显示区域（支持悬浮预览）
            const filenameDisplay = document.createElement('div');
            filenameDisplay.className = 'pcp-image-filename';
            filenameDisplay.style.flex = '1';
            filenameDisplay.style.padding = '4px 8px';
            filenameDisplay.style.background = 'rgba(0, 0, 0, 0.3)';
            filenameDisplay.style.border = '1px solid rgba(255, 255, 255, 0.1)';
            filenameDisplay.style.borderRadius = '6px';
            filenameDisplay.style.color = '#E0E0E0';
            filenameDisplay.style.fontSize = '12px';
            filenameDisplay.style.overflow = 'hidden';
            filenameDisplay.style.textOverflow = 'ellipsis';
            filenameDisplay.style.whiteSpace = 'nowrap';
            filenameDisplay.style.cursor = 'pointer';
            filenameDisplay.textContent = param.value || t('noImageSelected');
            filenameDisplay.title = param.value || '';

            // 清空按钮
            const clearButton = document.createElement('button');
            clearButton.className = 'pcp-image-clear-button';
            clearButton.textContent = '❌';
            clearButton.title = '清空图像';
            clearButton.style.padding = '4px 8px';
            clearButton.style.background = 'rgba(220, 38, 38, 0.2)';
            clearButton.style.border = '1px solid rgba(220, 38, 38, 0.3)';
            clearButton.style.borderRadius = '6px';
            clearButton.style.cursor = 'pointer';
            clearButton.style.fontSize = '14px';
            clearButton.style.flexShrink = '0';
            clearButton.style.display = param.value ? 'block' : 'none'; // 初始状态根据是否有值决定

            // 上传按钮
            const uploadButton = document.createElement('button');
            uploadButton.className = 'pcp-image-upload-button';
            uploadButton.textContent = '📁';
            uploadButton.title = t('selectImage');
            uploadButton.style.padding = '4px 8px';
            uploadButton.style.background = 'rgba(116, 55, 149, 0.2)';
            uploadButton.style.border = '1px solid rgba(116, 55, 149, 0.3)';
            uploadButton.style.borderRadius = '6px';
            uploadButton.style.cursor = 'pointer';
            uploadButton.style.fontSize = '14px';
            uploadButton.style.flexShrink = '0';

            // 创建隐藏的文件input
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';
            fileInput.style.display = 'none';

            // 阻止触发拖拽
            const preventDrag = (e) => {
                e.stopPropagation();
            };
            const preventDragStart = (e) => {
                e.preventDefault();
                e.stopPropagation();
            };

            container.addEventListener('mousedown', preventDrag);
            container.addEventListener('dragstart', preventDragStart);
            container.draggable = false;
            uploadButton.addEventListener('mousedown', preventDrag);
            uploadButton.addEventListener('dragstart', preventDragStart);
            uploadButton.draggable = false;
            clearButton.addEventListener('mousedown', preventDrag);
            clearButton.addEventListener('dragstart', preventDragStart);
            clearButton.draggable = false;
            filenameDisplay.addEventListener('mousedown', preventDrag);
            filenameDisplay.addEventListener('dragstart', preventDragStart);
            filenameDisplay.draggable = false;

            // 清空按钮点击事件
            clearButton.addEventListener('click', (e) => {
                e.stopPropagation();
                // 清空参数值
                param.value = '';
                filenameDisplay.textContent = t('noImageSelected');
                filenameDisplay.title = '';
                // 隐藏清空按钮
                clearButton.style.display = 'none';
                // 同步配置
                this.syncConfig();
            });

            // 上传按钮点击事件
            uploadButton.addEventListener('click', (e) => {
                e.stopPropagation();
                fileInput.click();
            });

            // 文件选择事件
            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                try {
                    // 显示上传中状态
                    const originalText = filenameDisplay.textContent;
                    filenameDisplay.textContent = t('uploading');

                    // 上传文件
                    const formData = new FormData();
                    formData.append('image', file);

                    const response = await fetch('/danbooru_gallery/pcp/upload_image', {
                        method: 'POST',
                        body: formData
                    });

                    const result = await response.json();

                    if (result.status === 'success') {
                        // 更新参数值
                        param.value = result.filename;
                        filenameDisplay.textContent = result.filename;
                        filenameDisplay.title = result.filename;
                        // 显示清空按钮
                        clearButton.style.display = 'block';
                        this.syncConfig();

                        // 显示成功提示
                        if (globalToastManager) {
                            globalToastManager.showToast(t('uploadSuccess'), 'success');
                        }
                    } else {
                        throw new Error(result.message || t('uploadFailed'));
                    }

                } catch (error) {
                    logger.error('[PCP] 上传图像失败:', error);
                    filenameDisplay.textContent = param.value || t('noImageSelected');
                    if (globalToastManager) {
                        globalToastManager.showToast(t('uploadFailed') + ': ' + error.message, 'error');
                    }
                }

                // 重置文件input
                fileInput.value = '';
            });

            // 悬浮预览功能
            let previewPopup = null;

            filenameDisplay.addEventListener('mouseenter', (e) => {
                if (!param.value) return;

                // 创建预览窗口
                previewPopup = document.createElement('div');
                previewPopup.className = 'pcp-image-preview-popup';
                previewPopup.style.position = 'fixed';
                previewPopup.style.zIndex = '10000';
                previewPopup.style.background = '#2a2a3a';
                previewPopup.style.border = '2px solid #555';
                previewPopup.style.borderRadius = '8px';
                previewPopup.style.padding = '8px';
                previewPopup.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)';
                previewPopup.style.maxWidth = '400px';
                previewPopup.style.maxHeight = '400px';
                previewPopup.style.pointerEvents = 'none';

                // 创建图像元素
                const img = document.createElement('img');
                img.src = `/view?filename=${encodeURIComponent(param.value)}&type=input`;
                img.style.maxWidth = '100%';
                img.style.maxHeight = '100%';
                img.style.display = 'block';
                img.style.borderRadius = '4px';

                previewPopup.appendChild(img);
                document.body.appendChild(previewPopup);

                // 定位预览窗口（在鼠标附近）
                const rect = filenameDisplay.getBoundingClientRect();
                previewPopup.style.left = `${rect.right + 10}px`;
                previewPopup.style.top = `${rect.top}px`;

                // 确保预览窗口不超出屏幕
                setTimeout(() => {
                    const popupRect = previewPopup.getBoundingClientRect();
                    if (popupRect.right > window.innerWidth) {
                        previewPopup.style.left = `${rect.left - popupRect.width - 10}px`;
                    }
                    if (popupRect.bottom > window.innerHeight) {
                        previewPopup.style.top = `${window.innerHeight - popupRect.height - 10}px`;
                    }
                }, 50);
            });

            filenameDisplay.addEventListener('mouseleave', () => {
                if (previewPopup) {
                    previewPopup.remove();
                    previewPopup = null;
                }
            });

            // 组装容器
            container.appendChild(filenameDisplay);
            container.appendChild(clearButton);
            container.appendChild(uploadButton);
            container.appendChild(fileInput);

            return container;
        };

        // 创建标签列表UI
        nodeType.prototype.createTagList = function (param) {
            const container = document.createElement('div');
            container.className = 'pcp-taglist-container';

            const tagsWrapper = document.createElement('div');
            tagsWrapper.className = 'pcp-taglist-wrapper';

            // 6色循环
            const tagColors = [
                { bg: 'rgba(139, 195, 74, 0.3)', border: '#8BC34A', text: '#E0E0E0' },   // 浅绿色
                { bg: 'rgba(3, 169, 244, 0.3)', border: '#03A9F4', text: '#E0E0E0' },    // 浅蓝色
                { bg: 'rgba(255, 152, 0, 0.3)', border: '#FF9800', text: '#E0E0E0' },    // 橙色
                { bg: 'rgba(156, 39, 176, 0.3)', border: '#9C27B0', text: '#E0E0E0' },   // 紫色
                { bg: 'rgba(233, 30, 99, 0.3)', border: '#E91E63', text: '#E0E0E0' },    // 粉色
                { bg: 'rgba(0, 150, 136, 0.3)', border: '#009688', text: '#E0E0E0' },    // 青绿色
            ];
            let colorIndex = 0;

            // 初始化 value 为数组
            if (!param.value || !Array.isArray(param.value)) {
                param.value = [];
            }

            // 渲染所有标签
            const renderTags = () => {
                tagsWrapper.innerHTML = '';
                colorIndex = 0;

                if (param.value.length === 0) {
                    const emptyHint = document.createElement('span');
                    emptyHint.className = 'pcp-taglist-empty';
                    emptyHint.textContent = t('taglistEmpty');
                    tagsWrapper.appendChild(emptyHint);
                    return;
                }

                param.value.forEach((tag, index) => {
                    const tagEl = document.createElement('span');
                    tagEl.className = 'pcp-taglist-tag' + (tag.enabled ? '' : ' disabled');

                    const color = tagColors[colorIndex % tagColors.length];
                    colorIndex++;

                    if (tag.enabled) {
                        tagEl.style.background = color.bg;
                        tagEl.style.borderColor = color.border;
                        tagEl.style.color = color.text;
                    }

                    // 标签文本
                    const textSpan = document.createElement('span');
                    textSpan.className = 'pcp-taglist-tag-text';
                    textSpan.textContent = tag.text;
                    tagEl.appendChild(textSpan);

                    // 删除按钮
                    const deleteBtn = document.createElement('span');
                    deleteBtn.className = 'pcp-taglist-tag-delete';
                    deleteBtn.innerHTML = '&times;';
                    deleteBtn.title = '删除标签';
                    tagEl.appendChild(deleteBtn);

                    // 双击切换启用/禁用
                    tagEl.addEventListener('dblclick', (e) => {
                        e.stopPropagation();
                        tag.enabled = !tag.enabled;
                        this.syncConfig();
                        renderTags();
                    });

                    // 删除按钮点击
                    deleteBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        param.value.splice(index, 1);
                        this.syncConfig();
                        renderTags();
                    });

                    // ========== 拖拽排序功能 ==========
                    tagEl.draggable = true;
                    tagEl.dataset.index = index;

                    // 拖拽开始
                    tagEl.addEventListener('dragstart', (e) => {
                        e.stopPropagation();
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', index.toString());
                        tagEl.classList.add('pcp-tag-dragging');
                        tagsWrapper._dragSourceIndex = index;
                    });

                    // 拖拽结束
                    tagEl.addEventListener('dragend', (e) => {
                        e.stopPropagation();
                        tagEl.classList.remove('pcp-tag-dragging');
                        tagsWrapper.querySelectorAll('.pcp-taglist-tag').forEach(el => {
                            el.classList.remove('pcp-tag-drag-over-left', 'pcp-tag-drag-over-right');
                        });
                        tagsWrapper._dragSourceIndex = null;
                    });

                    // 拖拽经过 - 根据鼠标 X 坐标判断放置在左侧还是右侧
                    tagEl.addEventListener('dragover', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.dataTransfer.dropEffect = 'move';

                        const rect = tagEl.getBoundingClientRect();
                        const midX = rect.left + rect.width / 2;

                        if (e.clientX < midX) {
                            tagEl.classList.remove('pcp-tag-drag-over-right');
                            tagEl.classList.add('pcp-tag-drag-over-left');
                        } else {
                            tagEl.classList.remove('pcp-tag-drag-over-left');
                            tagEl.classList.add('pcp-tag-drag-over-right');
                        }
                    });

                    // 拖拽离开
                    tagEl.addEventListener('dragleave', (e) => {
                        e.stopPropagation();
                        tagEl.classList.remove('pcp-tag-drag-over-left', 'pcp-tag-drag-over-right');
                    });

                    // 放置
                    tagEl.addEventListener('drop', (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        tagEl.classList.remove('pcp-tag-drag-over-left', 'pcp-tag-drag-over-right');

                        const fromIndex = tagsWrapper._dragSourceIndex;
                        if (fromIndex === null || fromIndex === undefined || fromIndex === index) {
                            return;
                        }

                        const rect = tagEl.getBoundingClientRect();
                        const midX = rect.left + rect.width / 2;
                        let toIndex = index;

                        if (e.clientX > midX) {
                            toIndex++;
                        }

                        if (fromIndex < toIndex) {
                            toIndex--;
                        }

                        if (fromIndex === toIndex) {
                            return;
                        }

                        // 执行数组重排序
                        const [movedItem] = param.value.splice(fromIndex, 1);
                        param.value.splice(toIndex, 0, movedItem);

                        this.syncConfig();
                        renderTags();
                    });

                    // 阻止拖拽冒泡到父元素
                    tagEl.addEventListener('mousedown', (e) => e.stopPropagation());

                    tagsWrapper.appendChild(tagEl);
                });
            };

            // 添加标签输入框
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'pcp-taglist-input';
            input.placeholder = t('taglistPlaceholder');

            // 回车添加标签
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const text = input.value.trim();
                    if (text) {
                        // 支持逗号分隔批量添加
                        const newTags = text.split(',').map(t => t.trim()).filter(t => t);
                        newTags.forEach(tagText => {
                            // 检查是否已存在
                            const exists = param.value.some(t => t.text === tagText);
                            if (!exists) {
                                param.value.push({ text: tagText, enabled: true });
                            }
                        });
                        input.value = '';
                        this.syncConfig();
                        renderTags();
                    }
                }
            });

            // 阻止输入框触发拖拽
            input.addEventListener('mousedown', (e) => e.stopPropagation());

            // 组装容器
            container.appendChild(tagsWrapper);
            container.appendChild(input);

            // 初始渲染
            renderTags();

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
                logger.error('[PCP] 加载数据源失败:', error);
                return [];
            }
        };

        // 刷新下拉菜单选项（支持值锁定机制）
        nodeType.prototype.refreshDropdownOptions = function (paramName, options, lockedValue = null) {
            try {
                // 查找参数
                const param = this.properties.parameters.find(p => p.name === paramName);
                if (!param || param.type !== 'dropdown') {
                    logger.warn('[PCP] 未找到下拉菜单参数:', paramName);
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
                    logger.warn('[PCP] 未找到下拉菜单UI元素:', paramName);
                    return;
                }

                // 保存当前选中值
                const currentValue = lockedValue !== null ? lockedValue : select.value;

                // 🔍 调试：记录值处理过程
                logger.info(`[PCP] 🔍 refreshDropdownOptions 调试: paramName='${paramName}', lockedValue='${lockedValue}', select.value='${select.value}', 最终currentValue='${currentValue}'`);
                logger.info(`[PCP] 🔍 refreshDropdownOptions 调试: 选项列表包含currentValue: ${options.includes(currentValue)}`);

                // 清空现有选项
                select.innerHTML = '';

                // 添加新选项
                options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt;
                    option.textContent = opt;
                    select.appendChild(option);
                });

                // 值锁定机制：优先使用锁定值
                if (options.includes(currentValue)) {
                    // 锁定值存在于新选项列表中，使用锁定值
                    select.value = currentValue;
                    param.value = currentValue;
                    logger.info(`[PCP] 下拉菜单 '${paramName}' 保持锁定值: '${currentValue}'`);

                    // 🔧 移除警告样式（值恢复正常）
                    this.setParameterWarningStyle(paramName, false);
                } else {
                    // 锁定值不存在于新选项列表中
                    logger.info(`[PCP] 🔍 分支调试: currentValue不在选项中, lockedValue='${lockedValue}', 进入锁定值处理逻辑`);

                    // 🔧 关键修复：对于 from_connection 类型，总是保持锁定值
                    const isFromConnection = param.config?.data_source === 'from_connection';

                    if (lockedValue !== null || isFromConnection) {
                        // 工作流初始化时的锁定值，或 from_connection 类型，保持锁定值
                        const lockReason = lockedValue !== null ? '工作流锁定值' : 'from_connection 类型锁定';
                        logger.warn(`[PCP] 锁定值 '${currentValue}' 不存在于选项列表中，下拉菜单 '${paramName}' 将保持${lockReason}`);
                        this.showToast(`警告：下拉菜单 '${paramName}' 的当前选择 '${currentValue}' 不在可用选项中，但已锁定为工作流保存的值`, 'warning');

                        // 添加锁定值为选项（不在列表中但可选择）
                        const lockedOption = document.createElement('option');
                        lockedOption.value = currentValue;
                        lockedOption.textContent = `${currentValue} (已锁定 - 不在列表中)`;
                        lockedOption.style.color = '#ff6b6b';
                        lockedOption.style.fontWeight = 'bold';
                        select.appendChild(lockedOption);
                        select.value = currentValue;
                        param.value = currentValue;

                        // 🔧 添加红框警告样式
                        this.setParameterWarningStyle(paramName, true);

                        logger.info(`[PCP] ✅ 修复成功：保持锁定值 '${currentValue}'，原因：${lockReason}`);
                    } else if (options.length > 0) {
                        // 非锁定情况，选择第一个选项
                        logger.info(`[PCP] 🔍 分支调试: lockedValue为null且非from_connection，选择第一个选项 '${options[0]}'`);
                        select.value = options[0];
                        param.value = options[0];
                    }
                }

                logger.info(`[PCP] 下拉菜单 '${paramName}' 选项已刷新: ${options.length} 个选项`);

                // 同步配置到后端
                this.syncConfig();

            } catch (error) {
                logger.error('[PCP] 刷新下拉菜单选项失败:', error);
            }
        };

        // 设置参数警告样式（红框警告）
        nodeType.prototype.setParameterWarningStyle = function (paramName, showWarning) {
            try {
                logger.info(`[PCP] 🔍 开始设置参数 '${paramName}' 的警告样式, showWarning=${showWarning}`);

                // 查找参数项元素
                const parameterItem = this.customUI?.querySelector(`.pcp-parameter-item[data-param-id]`);

                if (!parameterItem) {
                    logger.warn(`[PCP] ⚠️ 无法找到参数 '${paramName}' 的UI元素`);
                    return;
                }

                // 通过参数名称查找正确的参数项
                const allParameterItems = this.customUI?.querySelectorAll('.pcp-parameter-item');
                let targetItem = null;

                logger.info(`[PCP] 🔍 找到 ${allParameterItems?.length || 0} 个参数项`);

                if (allParameterItems) {
                    for (let i = 0; i < allParameterItems.length; i++) {
                        const item = allParameterItems[i];
                        const paramNameElement = item.querySelector('.pcp-parameter-name');

                        if (paramNameElement) {
                            const foundName = paramNameElement.textContent.trim();
                            // 🔧 修复：移除提示图标进行比较
                            const cleanFoundName = foundName.replace(/[🔍🔑📝⚠️✅❌💡ℹ️]/g, '').trim();
                            const cleanParamName = paramName.replace(/[🔍🔑📝⚠️✅❌💡ℹ️]/g, '').trim();

                            logger.info(`[PCP] 🔍 参数项 ${i}: 名称='${foundName}', 清理后='${cleanFoundName}', 查找目标='${paramName}', 清理后目标='${cleanParamName}'`);

                            if (cleanFoundName === cleanParamName) {
                                targetItem = item;
                                logger.info(`[PCP] ✅ 找到匹配的参数项: ${paramName}`);
                                break;
                            }
                        } else {
                            logger.warn(`[PCP] ⚠️ 参数项 ${i} 没有找到 .pcp-parameter-name 元素`);
                        }
                    }
                }

                if (!targetItem) {
                    logger.warn(`[PCP] ⚠️ 无法找到参数 '${paramName}' 的参数项元素`);
                    return;
                }

                // 应用或移除警告样式
                if (showWarning) {
                    targetItem.classList.add('pcp-parameter-item-warning');
                    logger.info(`[PCP] 🎨 样式警告: 参数 '${paramName}' 已添加红框样式`);
                } else {
                    targetItem.classList.remove('pcp-parameter-item-warning');
                    logger.info(`[PCP] 🎨 样式警告: 参数 '${paramName}' 已移除红框样式`);
                }

            } catch (error) {
                logger.error(`[PCP] 设置参数 '${paramName}' 警告样式失败:`, error);
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
                logger.error('[PCP] Toast显示失败:', error);
            }
        };

        // ==================== 右键菜单系统 ====================

        // 显示参数条目右键菜单
        nodeType.prototype.showParameterContextMenu = function (x, y, paramId) {
            // 删除已存在的菜单
            this.removeParameterContextMenu();

            const param = this.getParameterById(paramId);
            if (!param) return;

            // 检查剪贴板是否有数据
            const clipboardData = localStorage.getItem('pcp_clipboard_parameter');
            const hasClipboardData = !!clipboardData;

            // 锁定模式下粘贴不可用
            const canPaste = hasClipboardData && !this.properties.locked;

            // 创建菜单DOM
            const menu = document.createElement('div');
            menu.className = 'pcp-context-menu';
            menu.innerHTML = `
                <div class="pcp-context-menu-item" data-action="copy">
                    <span class="pcp-context-menu-icon">📋</span>
                    <span>${t('copyParameter')}</span>
                </div>
                <div class="pcp-context-menu-item ${canPaste ? '' : 'disabled'}" data-action="paste">
                    <span class="pcp-context-menu-icon">📥</span>
                    <span>${t('pasteParameter')}</span>
                </div>
            `;

            // 计算菜单位置（边界检测）
            const menuWidth = 160;
            const menuHeight = 80;
            const padding = 10;

            let menuX = x;
            let menuY = y;

            // 右侧边界检测
            if (menuX + menuWidth > window.innerWidth - padding) {
                menuX = window.innerWidth - menuWidth - padding;
            }

            // 底部边界检测
            if (menuY + menuHeight > window.innerHeight - padding) {
                menuY = window.innerHeight - menuHeight - padding;
            }

            menu.style.left = `${menuX}px`;
            menu.style.top = `${menuY}px`;

            // 添加到页面
            document.body.appendChild(menu);
            this._contextMenuElement = menu;
            this._contextMenuParamId = paramId;

            // 显示动画
            requestAnimationFrame(() => {
                menu.classList.add('pcp-context-menu-visible');
            });

            // 绑定菜单项事件
            const copyItem = menu.querySelector('[data-action="copy"]');
            const pasteItem = menu.querySelector('[data-action="paste"]');

            copyItem.addEventListener('click', () => {
                this.copyParameter(paramId);
                this.removeParameterContextMenu();
            });

            if (canPaste) {
                pasteItem.addEventListener('click', () => {
                    this.pasteParameterAfter(paramId);
                    this.removeParameterContextMenu();
                });
            }

            // 点击外部关闭菜单
            const closeMenu = (e) => {
                if (!menu.contains(e.target)) {
                    this.removeParameterContextMenu();
                }
            };
            // 延迟添加，避免当前右键点击立即触发关闭
            setTimeout(() => {
                document.addEventListener('click', closeMenu);
            }, 100);
            this._contextMenuCloseHandler = closeMenu;

            // ESC键关闭
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    this.removeParameterContextMenu();
                }
            };
            document.addEventListener('keydown', escHandler);
            this._contextMenuEscHandler = escHandler;

            logger.info('[PCP] 右键菜单已显示');
        };

        // 移除右键菜单
        nodeType.prototype.removeParameterContextMenu = function () {
            if (this._contextMenuElement) {
                this._contextMenuElement.remove();
                this._contextMenuElement = null;
                this._contextMenuParamId = null;
            }
            // 清理事件监听器
            if (this._contextMenuCloseHandler) {
                document.removeEventListener('click', this._contextMenuCloseHandler);
                this._contextMenuCloseHandler = null;
            }
            if (this._contextMenuEscHandler) {
                document.removeEventListener('keydown', this._contextMenuEscHandler);
                this._contextMenuEscHandler = null;
            }
        };

        // 复制参数到剪贴板
        nodeType.prototype.copyParameter = function (paramId) {
            const param = this.getParameterById(paramId);
            if (!param) {
                this.showToast(t('error'), 'error');
                return;
            }

            // 深拷贝参数数据（排除 ID，因为粘贴时会生成新 ID）
            const paramData = JSON.parse(JSON.stringify(param));
            delete paramData.id;

            // 添加复制时间戳和来源标识
            const clipboardData = {
                version: 1,
                timestamp: Date.now(),
                source: 'pcp',
                parameter: paramData
            };

            // 存储到 localStorage
            try {
                localStorage.setItem('pcp_clipboard_parameter', JSON.stringify(clipboardData));
                this.showToast(t('parameterCopied'), 'success');
                logger.info('[PCP] 参数已复制:', param.name);
            } catch (error) {
                logger.error('[PCP] 复制参数失败:', error);
                this.showToast(t('copyFailed'), 'error');
            }
        };

        // 在指定参数后粘贴
        nodeType.prototype.pasteParameterAfter = function (afterParamId) {
            // 锁定模式下禁止粘贴
            if (this.properties.locked) {
                this.showToast(t('lockedModeNoPaste'), 'error');
                return;
            }

            // 从 localStorage 读取剪贴板数据
            const clipboardStr = localStorage.getItem('pcp_clipboard_parameter');
            if (!clipboardStr) {
                this.showToast(t('clipboardEmpty'), 'warning');
                return;
            }

            let clipboardData;
            try {
                clipboardData = JSON.parse(clipboardStr);
            } catch (error) {
                logger.error('[PCP] 解析剪贴板数据失败:', error);
                this.showToast(t('clipboardInvalid'), 'error');
                return;
            }

            // 验证剪贴板数据格式
            if (!clipboardData.parameter || clipboardData.source !== 'pcp') {
                this.showToast(t('clipboardInvalid'), 'error');
                return;
            }

            // 深拷贝参数数据
            const newParam = JSON.parse(JSON.stringify(clipboardData.parameter));

            // 生成新 ID
            newParam.id = `param_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // 处理参数名称重复（非分隔符类型）
            if (newParam.type !== 'separator') {
                let baseName = newParam.name;
                let counter = 1;
                let newName = baseName;

                while (this.checkParameterNameDuplicate(newName)) {
                    newName = `${baseName}_${counter}`;
                    counter++;
                }
                newParam.name = newName;
            }

            // 找到插入位置
            const afterIndex = this.getParameterIndexById(afterParamId);
            if (afterIndex === -1) {
                // 如果找不到指定位置，添加到末尾
                this.properties.parameters.push(newParam);
            } else {
                // 在指定位置后插入
                this.properties.parameters.splice(afterIndex + 1, 0, newParam);
            }

            // 更新UI和同步配置
            this.updateParametersList();
            this.syncConfig();

            this.showToast(t('parameterPasted'), 'success');
            logger.info('[PCP] 参数已粘贴:', newParam.name);
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
                            <option value="enum" ${param?.type === 'enum' ? 'selected' : ''}>${t('enum')}</option>
                            <option value="string" ${param?.type === 'string' ? 'selected' : ''}>${t('string')}</option>
                            <option value="image" ${param?.type === 'image' ? 'selected' : ''}>${t('image')}</option>
                            <option value="separator" ${param?.type === 'separator' ? 'selected' : ''}>${t('separator')}</option>
                            <option value="taglist" ${param?.type === 'taglist' ? 'selected' : ''}>${t('taglist')}</option>
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

            // 锁定模式下禁用参数类型修改
            if (isEdit && this.properties.locked) {
                typeSelect.disabled = true;
                typeSelect.style.opacity = '0.6';
                typeSelect.style.cursor = 'not-allowed';
                typeSelect.title = '锁定模式下无法修改参数类型';
            }

            // 更新配置面板
            const updateConfigPanel = (type) => {
                configPanel.innerHTML = '';

                switch (type) {
                    case 'separator':
                        // 分隔符配置：颜色选择
                        const separatorColor = param?.color || '#9370DB';
                        const separatorDescription = param?.config?.description || '';
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
                                <label class="pcp-dialog-label">${t('description')}</label>
                                <textarea class="pcp-dialog-textarea pcp-param-description" id="pcp-param-description"
                                          placeholder="${t('descriptionPlaceholder')}"
                                          rows="3">${separatorDescription}</textarea>
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
                        const sliderDescription = sliderConfig.description || '';
                        configPanel.innerHTML = `
                            <div class="pcp-dialog-field">
                                <label class="pcp-dialog-label">${t('description')}</label>
                                <textarea class="pcp-dialog-textarea pcp-param-description" id="pcp-param-description"
                                          placeholder="${t('descriptionPlaceholder')}"
                                          rows="3">${sliderDescription}</textarea>
                            </div>
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
                        const switchConfig = param?.config || {};
                        const switchDefault = switchConfig.default !== undefined ? switchConfig.default : false;
                        const switchDescription = switchConfig.description || '';
                        const showTopLeftNotice = switchConfig.show_top_left_notice || false;
                        const noticeText = switchConfig.notice_text || '';
                        const accessibleToGroupExecutor = param?.accessible_to_group_executor || false;
                        const accessibleToGroupMuteManager = param?.accessible_to_group_mute_manager || false;
                        configPanel.innerHTML = `
                            <div class="pcp-dialog-field">
                                <label class="pcp-dialog-label">${t('description')}</label>
                                <textarea class="pcp-dialog-textarea pcp-param-description" id="pcp-param-description"
                                          placeholder="${t('descriptionPlaceholder')}"
                                          rows="3">${switchDescription}</textarea>
                            </div>
                            <div class="pcp-dialog-field">
                                <label class="pcp-dialog-label">${t('defaultValue')}</label>
                                <select class="pcp-dialog-select" id="pcp-switch-default">
                                    <option value="false" ${!switchDefault ? 'selected' : ''}>False</option>
                                    <option value="true" ${switchDefault ? 'selected' : ''}>True</option>
                                </select>
                            </div>
                            <div class="pcp-dialog-field">
                                <label class="pcp-dialog-label">
                                    <input type="checkbox" id="pcp-switch-show-notice" ${showTopLeftNotice ? 'checked' : ''}>
                                    开启时在左上角显示提示
                                </label>
                            </div>
                            <div class="pcp-dialog-field">
                                <label class="pcp-dialog-label">提示文本（留空则显示"参数名：已开启"）</label>
                                <input type="text" class="pcp-dialog-input" id="pcp-switch-notice-text"
                                       placeholder="例如：图生图模式：已开启" value="${noticeText}">
                            </div>
                            <div class="pcp-dialog-field">
                                <label class="pcp-dialog-label">
                                    <input type="checkbox" id="pcp-switch-accessible-to-group-executor" ${accessibleToGroupExecutor ? 'checked' : ''} ${this.properties.locked ? 'disabled' : ''}>
                                    允许组执行器访问此参数
                                </label>
                                <p style="color: #999; font-size: 12px; margin: 4px 0 0 24px;">
                                    勾选后，组执行管理器可以在激进模式条件中使用此参数
                                </p>
                            </div>
                            <div class="pcp-dialog-field">
                                <label class="pcp-dialog-label">
                                    <input type="checkbox" id="pcp-switch-accessible-to-group-mute-manager" ${accessibleToGroupMuteManager ? 'checked' : ''} ${this.properties.locked ? 'disabled' : ''}>
                                    允许组静音管理器访问此参数
                                </label>
                                <p style="color: #999; font-size: 12px; margin: 4px 0 0 24px;">
                                    勾选后，组静音管理器可以实现参数与组状态的双向同步
                                </p>
                            </div>
                        `;
                        break;

                    case 'dropdown':
                        const dropdownConfig = param?.config || {};
                        const dataSource = dropdownConfig.data_source || 'from_connection';
                        const dropdownDescription = dropdownConfig.description || '';
                        const optionsText = Array.isArray(dropdownConfig.options)
                            ? dropdownConfig.options.join('\n')
                            : '';

                        configPanel.innerHTML = `
                            <div class="pcp-dialog-field">
                                <label class="pcp-dialog-label">${t('description')}</label>
                                <textarea class="pcp-dialog-textarea pcp-param-description" id="pcp-param-description"
                                          placeholder="${t('descriptionPlaceholder')}"
                                          rows="3">${dropdownDescription}</textarea>
                            </div>
                            <div class="pcp-dialog-field">
                                <label class="pcp-dialog-label">${t('dataSource')}</label>
                                <select class="pcp-dialog-select" id="pcp-dropdown-source">
                                    <option value="from_connection" ${dataSource === 'from_connection' ? 'selected' : ''}>${t('fromConnection')}</option>
                                    <option value="custom" ${dataSource === 'custom' ? 'selected' : ''}>${t('custom')}</option>
                                    <option value="checkpoint" ${dataSource === 'checkpoint' ? 'selected' : ''}>${t('checkpoint')}</option>
                                    <option value="lora" ${dataSource === 'lora' ? 'selected' : ''}>${t('lora')}</option>
                                    <option value="controlnet" ${dataSource === 'controlnet' ? 'selected' : ''}>${t('controlnet')}</option>
                                    <option value="upscale_model" ${dataSource === 'upscale_model' ? 'selected' : ''}>${t('upscaleModel')}</option>
                                    <option value="sampler" ${dataSource === 'sampler' ? 'selected' : ''}>${t('sampler')}</option>
                                    <option value="scheduler" ${dataSource === 'scheduler' ? 'selected' : ''}>${t('scheduler')}</option>
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

                        // 锁定模式下禁用数据源选择器
                        if (isEdit && this.properties.locked) {
                            sourceSelect.disabled = true;
                            sourceSelect.style.opacity = '0.6';
                            sourceSelect.style.cursor = 'not-allowed';
                            sourceSelect.title = '锁定模式下无法修改数据源';
                        }
                        break;

                    case 'string':
                        const stringConfig = param?.config || {};
                        const stringDescription = stringConfig.description || '';
                        const stringDefault = stringConfig.default || '';
                        const stringMultiline = stringConfig.multiline || false;
                        configPanel.innerHTML = `
                            <div class="pcp-dialog-field">
                                <label class="pcp-dialog-label">${t('description')}</label>
                                <textarea class="pcp-dialog-textarea pcp-param-description" id="pcp-param-description"
                                          placeholder="${t('descriptionPlaceholder')}"
                                          rows="3">${stringDescription}</textarea>
                            </div>
                            <div class="pcp-dialog-field">
                                <label class="pcp-dialog-label">${t('defaultValue')}</label>
                                <input type="text" class="pcp-dialog-input" id="pcp-string-default"
                                       value="${stringDefault}"
                                       placeholder="输入默认文本...">
                            </div>
                            <div class="pcp-dialog-field">
                                <label class="pcp-dialog-label" style="display: flex; align-items: center; gap: 8px;">
                                    <input type="checkbox" id="pcp-string-multiline" ${stringMultiline ? 'checked' : ''}
                                           style="width: auto; margin: 0;">
                                    <span>${t('multiline')}</span>
                                </label>
                            </div>
                        `;
                        break;

                    case 'image':
                        const imageConfig = param?.config || {};
                        const imageDescription = imageConfig.description || '';
                        configPanel.innerHTML = `
                            <div class="pcp-dialog-field">
                                <label class="pcp-dialog-label">${t('description')}</label>
                                <textarea class="pcp-dialog-textarea pcp-param-description" id="pcp-param-description"
                                          placeholder="${t('descriptionPlaceholder')}"
                                          rows="3">${imageDescription}</textarea>
                            </div>
                            <div class="pcp-dialog-field">
                                <p style="color: #999; font-size: 12px; margin: 0;">
                                    💡 图像参数将输出IMAGE张量，可直接连接到其他节点的图像输入
                                </p>
                            </div>
                        `;
                        break;

                    case 'taglist':
                        const taglistConfig = param?.config || {};
                        const taglistDescription = taglistConfig.description || '';
                        configPanel.innerHTML = `
                            <div class="pcp-dialog-field">
                                <label class="pcp-dialog-label">${t('description')}</label>
                                <textarea class="pcp-dialog-textarea pcp-param-description" id="pcp-param-description"
                                          placeholder="${t('descriptionPlaceholder')}"
                                          rows="3">${taglistDescription}</textarea>
                            </div>
                            <div class="pcp-dialog-field">
                                <p style="color: #999; font-size: 12px; margin: 0;">
                                    💡 标签列表：双击标签切换启用/禁用状态，禁用的标签不会出现在输出中
                                </p>
                            </div>
                        `;
                        break;

                    case 'enum':
                        const enumConfig = param?.config || {};
                        const enumDataSource = enumConfig.data_source || 'custom';
                        const enumDescription = enumConfig.description || '';
                        const enumOptionsText = Array.isArray(enumConfig.options)
                            ? enumConfig.options.join('\n')
                            : '';

                        configPanel.innerHTML = `
                            <div class="pcp-dialog-field">
                                <label class="pcp-dialog-label">${t('description')}</label>
                                <textarea class="pcp-dialog-textarea pcp-param-description" id="pcp-param-description"
                                          placeholder="${t('descriptionPlaceholder')}"
                                          rows="3">${enumDescription}</textarea>
                            </div>
                            <div class="pcp-dialog-field">
                                <label class="pcp-dialog-label">${t('enumDataSource')}</label>
                                <select class="pcp-dialog-select" id="pcp-enum-source">
                                    <option value="custom" ${enumDataSource === 'custom' ? 'selected' : ''}>${t('custom')}</option>
                                    <option value="checkpoint" ${enumDataSource === 'checkpoint' ? 'selected' : ''}>${t('checkpoint')}</option>
                                    <option value="lora" ${enumDataSource === 'lora' ? 'selected' : ''}>${t('lora')}</option>
                                    <option value="sampler" ${enumDataSource === 'sampler' ? 'selected' : ''}>${t('sampler')}</option>
                                    <option value="scheduler" ${enumDataSource === 'scheduler' ? 'selected' : ''}>${t('scheduler')}</option>
                                </select>
                            </div>
                            <div class="pcp-dialog-field" id="pcp-enum-options-field">
                                <label class="pcp-dialog-label">${t('enumOptions')}</label>
                                <textarea class="pcp-dialog-textarea" id="pcp-enum-options"
                                          placeholder="${t('enumOptionsPlaceholder')}">${enumOptionsText}</textarea>
                            </div>
                            <div class="pcp-dialog-field">
                                <p style="color: #999; font-size: 12px; margin: 0; padding: 8px; background: rgba(116, 55, 149, 0.1); border-radius: 4px;">
                                    💡 ${t('enumHint')}
                                </p>
                            </div>
                        `;

                        // 根据数据源显示/隐藏选项输入框
                        const enumSourceSelect = configPanel.querySelector('#pcp-enum-source');
                        const enumOptionsField = configPanel.querySelector('#pcp-enum-options-field');

                        const updateEnumOptionsField = () => {
                            const source = enumSourceSelect.value;
                            if (source === 'custom') {
                                enumOptionsField.style.display = 'block';
                            } else {
                                enumOptionsField.style.display = 'none';
                            }
                        };

                        enumSourceSelect.addEventListener('change', updateEnumOptionsField);
                        updateEnumOptionsField();

                        // 锁定模式下禁用数据源选择器
                        if (isEdit && this.properties.locked) {
                            enumSourceSelect.disabled = true;
                            enumSourceSelect.style.opacity = '0.6';
                            enumSourceSelect.style.cursor = 'not-allowed';
                            enumSourceSelect.title = '锁定模式下无法修改数据源';
                        }
                        break;
                }
            };

            // 应用锁定模式禁用逻辑
            const applyLockModeDisabling = () => {
                if (isEdit && this.properties.locked) {
                    // 查找说明输入框并禁用
                    const descriptionTextarea = configPanel.querySelector('#pcp-param-description');
                    if (descriptionTextarea) {
                        descriptionTextarea.disabled = true;
                        descriptionTextarea.style.opacity = '0.6';
                        descriptionTextarea.style.cursor = 'not-allowed';
                        descriptionTextarea.title = t('descriptionLockedHint');
                    }
                }
            };

            // 初始化配置面板
            updateConfigPanel(param?.type || 'slider');
            applyLockModeDisabling();

            // 类型变化时更新配置面板
            typeSelect.addEventListener('change', (e) => {
                updateConfigPanel(e.target.value);
                applyLockModeDisabling();
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

                // 读取说明字段（所有类型共用）
                const descriptionTextarea = configPanel.querySelector('#pcp-param-description');
                if (descriptionTextarea) {
                    const description = descriptionTextarea.value.trim();
                    if (description) {
                        config.description = description;
                    }
                }

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
                        const switchShowNoticeCheckbox = configPanel.querySelector('#pcp-switch-show-notice');
                        const switchNoticeTextInput = configPanel.querySelector('#pcp-switch-notice-text');
                        const switchAccessibleCheckbox = configPanel.querySelector('#pcp-switch-accessible-to-group-executor');

                        config.default = switchDefaultSelect.value === 'true';
                        config.show_top_left_notice = switchShowNoticeCheckbox.checked;
                        config.notice_text = switchNoticeTextInput.value.trim();

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
                            // 动态数据源或从连接获取
                            // 保留原有的options,避免丢失已同步的选项
                            if (param?.config?.options) {
                                config.options = param.config.options;
                            }
                            defaultValue = '';
                        }
                        break;

                    case 'string':
                        const stringDefaultInput = configPanel.querySelector('#pcp-string-default');
                        const stringMultilineCheckbox = configPanel.querySelector('#pcp-string-multiline');

                        config.default = stringDefaultInput ? stringDefaultInput.value : '';
                        config.multiline = stringMultilineCheckbox ? stringMultilineCheckbox.checked : false;

                        defaultValue = config.default;
                        break;

                    case 'image':
                        // 图像类型：默认值为空字符串（未上传图像）
                        defaultValue = '';
                        break;

                    case 'taglist':
                        // 标签列表类型：默认值为空数组
                        defaultValue = [];
                        break;

                    case 'enum':
                        const enumSourceSelect = configPanel.querySelector('#pcp-enum-source');
                        const enumOptionsTextarea = configPanel.querySelector('#pcp-enum-options');

                        config.data_source = enumSourceSelect.value;

                        if (config.data_source === 'custom') {
                            const enumOptionsText = enumOptionsTextarea.value.trim();
                            config.options = enumOptionsText.split('\n').map(s => s.trim()).filter(s => s);

                            if (config.options.length === 0) {
                                this.showToast(t('invalidInput') + ': ' + t('enumOptions'), 'error');
                                return;
                            }

                            defaultValue = config.options[0];
                        } else {
                            // 动态数据源：延迟加载选项
                            if (param?.config?.options) {
                                config.options = param.config.options;
                            }
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

                // 如果是switch类型，保存组执行器和组静音管理器访问权限
                if (type === 'switch') {
                    const accessibleCheckbox = configPanel.querySelector('#pcp-switch-accessible-to-group-executor');
                    if (accessibleCheckbox) {
                        paramData.accessible_to_group_executor = accessibleCheckbox.checked;
                    }
                    const accessibleToGMMCheckbox = configPanel.querySelector('#pcp-switch-accessible-to-group-mute-manager');
                    if (accessibleToGMMCheckbox) {
                        paramData.accessible_to_group_mute_manager = accessibleToGMMCheckbox.checked;
                    }
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

        // 显示 switch 参数访问权限配置对话框
        nodeType.prototype.showSwitchAccessConfig = function (param) {
            // 创建对话框覆盖层
            const overlay = document.createElement('div');
            overlay.className = 'pcp-dialog-overlay';

            // 创建对话框
            const dialog = document.createElement('div');
            dialog.className = 'pcp-dialog';

            const isAccessible = param.accessible_to_group_executor || false;
            const isAccessibleToGMM = param.accessible_to_group_mute_manager || false;

            dialog.innerHTML = `
                <h3>配置访问权限</h3>

                <div class="pcp-dialog-field">
                    <p style="color: #E0E0E0; margin: 0 0 12px 0;">参数名称: <strong>${param.name}</strong></p>
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <input type="checkbox" id="pcp-access-checkbox" ${isAccessible ? 'checked' : ''}
                               style="width: 16px; height: 16px; cursor: pointer;">
                        <span style="color: #E0E0E0;">允许组执行管理器访问此参数</span>
                    </label>
                    <p style="color: #999; font-size: 12px; margin: 8px 0 0 24px;">
                        启用后，组执行管理器可以读取此参数的值，用于控制清理行为的激进模式条件。
                    </p>
                </div>

                <div class="pcp-dialog-field">
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <input type="checkbox" id="pcp-access-gmm-checkbox" ${isAccessibleToGMM ? 'checked' : ''}
                               style="width: 16px; height: 16px; cursor: pointer;">
                        <span style="color: #E0E0E0;">允许组静音管理器访问此参数</span>
                    </label>
                    <p style="color: #999; font-size: 12px; margin: 8px 0 0 24px;">
                        启用后，组静音管理器可以实现参数与组状态的双向同步。
                    </p>
                </div>

                <div class="pcp-dialog-buttons">
                    <button class="pcp-dialog-button pcp-dialog-button-secondary" id="pcp-access-config-cancel">
                        取消
                    </button>
                    <button class="pcp-dialog-button pcp-dialog-button-primary" id="pcp-access-config-save">
                        保存
                    </button>
                </div>
            `;

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            const checkbox = dialog.querySelector('#pcp-access-checkbox');
            const gmmCheckbox = dialog.querySelector('#pcp-access-gmm-checkbox');
            const cancelButton = dialog.querySelector('#pcp-access-config-cancel');
            const saveButton = dialog.querySelector('#pcp-access-config-save');

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

            // 保存按钮
            saveButton.addEventListener('click', () => {
                // 更新参数的访问权限配置
                param.accessible_to_group_executor = checkbox.checked;
                param.accessible_to_group_mute_manager = gmmCheckbox.checked;

                // 同步配置
                this.syncConfig();

                overlay.remove();

                // 显示提示
                const messages = [];
                if (checkbox.checked) messages.push('组执行管理器');
                if (gmmCheckbox.checked) messages.push('组静音管理器');

                const toastMsg = messages.length > 0
                    ? `已允许 ${messages.join('、')} 访问`
                    : '已禁止所有管理器访问';

                this.showToast(toastMsg, 'success');

                logger.info('[PCP] Switch参数访问权限已更新:', param.name, {
                    group_executor: checkbox.checked,
                    group_mute_manager: gmmCheckbox.checked
                });
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

            logger.info('[PCP] 参数已添加:', paramData);
        };

        // 编辑参数（打开对话框）
        nodeType.prototype.editParameter = function (paramId) {
            this.showParameterDialog(paramId);
        };

        // 更新参数
        nodeType.prototype.updateParameter = function (paramId, newData) {
            const index = this.getParameterIndexById(paramId);
            if (index === -1) {
                logger.error('[PCP] 参数未找到:', paramId);
                return;
            }

            // 保留原ID，更新其他数据
            newData.id = paramId;
            this.properties.parameters[index] = newData;

            // 更新UI和同步配置
            this.updateParametersList();
            this.syncConfig();

            logger.info('[PCP] 参数已更新:', newData);
        };

        // 刷新指定参数的UI（用于响应GMM的参数值变化）
        nodeType.prototype.refreshParameterUI = function (paramName, newValue) {
            logger.info('[PCP] 刷新参数UI:', paramName, '新值:', newValue);

            // 查找参数
            const param = this.properties.parameters.find(p => p.name === paramName);
            if (!param) {
                logger.warn('[PCP] 参数不存在:', paramName);
                return;
            }

            // 更新参数值
            param.value = newValue;

            // 查找对应的UI元素并更新
            const container = this.widgets?.[0]?.element;
            if (!container) {
                logger.warn('[PCP] UI容器不存在');
                return;
            }

            // 如果是switch类型，更新switch的状态
            if (param.type === 'switch') {
                // 正确的选择器：.pcp-switch 而不是 .pcp-switch-container
                const switchElement = container.querySelector(`[data-param-id="${param.id}"] .pcp-switch`);

                if (switchElement) {
                    // 直接操作 .pcp-switch 的 active class
                    if (newValue) {
                        switchElement.classList.add('active');
                    } else {
                        switchElement.classList.remove('active');
                    }
                    logger.debug('[PCP] Switch UI已更新:', paramName, newValue);

                    // 如果启用了左上角提示，显示/隐藏提示
                    if (param.config?.show_top_left_notice) {
                        if (newValue) {
                            const noticeText = param.config.notice_text || `${param.name}：已开启`;
                            if (window.globalTopLeftNoticeManager) {
                                window.globalTopLeftNoticeManager.showNotice(param.name, noticeText);
                            }
                        } else {
                            if (window.globalTopLeftNoticeManager) {
                                window.globalTopLeftNoticeManager.hideNotice(param.name);
                            }
                        }
                    }
                } else {
                    logger.debug('[PCP] switchElement 未找到，param.id:', param.id);
                }
            }

            // 同步到后端（虽然后端已经更新了，但为了保持一致性）
            this.syncConfig();
        };

        // 删除参数
        nodeType.prototype.deleteParameter = function (paramId) {
            const param = this.getParameterById(paramId);
            if (!param) {
                logger.error('[PCP] 参数未找到:', paramId);
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
                        logger.info('[PCP] 参数已删除:', paramId);
                    }
                }
            );
        };

        // 拖拽排序参数
        nodeType.prototype.reorderParameters = function (draggedId, targetId) {
            const draggedIndex = this.getParameterIndexById(draggedId);
            const targetIndex = this.getParameterIndexById(targetId);

            if (draggedIndex === -1 || targetIndex === -1) {
                logger.error('[PCP] 参数未找到:', draggedId, targetId);
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

            logger.info('[PCP] 参数已重新排序:', draggedId, '->', targetId);
        };

        // ==================== 预设管理 ====================

        // 加载预设列表（全局共享）
        nodeType.prototype.loadPresetsList = async function () {
            try {
                const response = await fetch(`/danbooru_gallery/pcp/list_presets`);
                const data = await response.json();

                if (data.status === 'success') {
                    this._allPresets = data.presets || [];
                    this.renderPresetsList(this._allPresets);
                    logger.info('[PCP] 全局预设列表已加载:', this._allPresets.length);
                }
            } catch (error) {
                logger.error('[PCP] 加载预设列表失败:', error);
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

        // 保存预设（全局共享）
        nodeType.prototype.savePreset = async function (presetName) {
            try {
                const response = await fetch('/danbooru_gallery/pcp/save_preset', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        preset_name: presetName,
                        parameters: this.properties.parameters
                    })
                });

                const data = await response.json();

                if (data.status === 'success') {
                    this.properties.currentPreset = presetName;
                    this.showToast(t('presetSaved'), 'success');
                    await this.loadPresetsList();
                    logger.info('[PCP] 全局预设已保存:', presetName);
                } else {
                    this.showToast(`${t('error')}: ${data.message}`, 'error');
                }
            } catch (error) {
                logger.error('[PCP] 保存预设失败:', error);
                this.showToast(`${t('error')}: ${error.message}`, 'error');
            }
        };

        // 加载预设（全局共享）
        nodeType.prototype.loadPreset = async function (presetName) {
            try {
                const response = await fetch('/danbooru_gallery/pcp/load_preset', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        preset_name: presetName
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

                    // 立即更新搜索框显示
                    const presetSearch = this.customUI.querySelector('#pcp-preset-search');
                    if (presetSearch) {
                        presetSearch.value = presetName;
                    }

                    if (unmatchedCount === 0) {
                        this.showToast(t('presetLoaded'), 'success');
                    } else {
                        this.showToast(`${t('presetLoaded')} (${unmatchedCount} 个参数未在预设中找到)`, 'warning');
                    }

                    this.updateParametersList();
                    this.syncConfig();
                    logger.info('[PCP] 预设已加载:', presetName, '已匹配:', matchedCount, '未匹配:', unmatchedCount);
                } else {
                    this.showToast(`${t('error')}: ${data.message}`, 'error');
                }
            } catch (error) {
                logger.error('[PCP] 加载预设失败:', error);
                this.showToast(`${t('error')}: ${error.message}`, 'error');
            }
        };

        // 删除预设（全局共享）
        nodeType.prototype.deletePreset = async function (presetName) {
            this.showDeleteConfirm(
                `${t('deletePreset')}: "${presetName}"?`,
                async () => {
                    try {
                        const response = await fetch('/danbooru_gallery/pcp/delete_preset', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                preset_name: presetName
                            })
                        });

                        const data = await response.json();

                        if (data.status === 'success') {
                            if (this.properties.currentPreset === presetName) {
                                this.properties.currentPreset = null;
                            }
                            this.showToast(t('presetDeleted'), 'success');
                            await this.loadPresetsList();
                            logger.info('[PCP] 全局预设已删除:', presetName);
                        } else {
                            this.showToast(`${t('error')}: ${data.message}`, 'error');
                        }
                    } catch (error) {
                        logger.error('[PCP] 删除预设失败:', error);
                        this.showToast(`${t('error')}: ${error.message}`, 'error');
                    }
                }
            );
        };

        // 刷新数据（重新加载动态数据源）
        nodeType.prototype.refreshData = function () {
            this.updateParametersList();
            this.showToast('数据已刷新', 'success');
            logger.info('[PCP] 数据已刷新');
        };

        // ==================== 输出同步与配置管理 ====================

        // 更新节点输出引脚
        nodeType.prototype.updateOutputs = function () {
            // 只保留一个输出引脚，输出参数包
            const paramCount = this.properties.parameters.filter(p => p.type !== 'separator').length;

            // 确保 outputs 数组存在
            if (!this.outputs) {
                this.outputs = [];
            }

            // 更新或创建第一个输出引脚
            if (this.outputs.length === 0) {
                // 没有输出，创建新的
                this.outputs.push({
                    name: 'parameters',
                    type: 'DICT',
                    links: []
                });
            } else {
                // 已有输出，更新现有对象（保持引用）
                const output = this.outputs[0];
                output.name = 'parameters';
                output.type = 'DICT';
                // 确保 links 数组存在且是数组
                if (!output.links || !Array.isArray(output.links)) {
                    output.links = [];
                }
            }

            // 移除多余的输出引脚
            if (this.outputs.length > 1) {
                this.outputs.length = 1;
            }

            // 触发节点图更新
            if (this.graph && this.graph.setDirtyCanvas) {
                this.graph.setDirtyCanvas(true, true);
            }

            const linksCount = this.outputs[0].links ? this.outputs[0].links.length : 0;
            logger.info('[PCP] 输出引脚已更新: 参数包包含', paramCount, '个参数, 连接数:', linksCount);
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
                case 'taglist':
                    // 只显示启用的标签，用逗号分隔
                    if (Array.isArray(param.value)) {
                        const enabledTags = param.value.filter(t => t.enabled).map(t => t.text);
                        return enabledTags.length > 0 ? enabledTags.join(', ') : '(无)';
                    }
                    return '(无)';
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
                    logger.info('[PCP] 配置已同步到后端:', this.properties.parameters.length);
                } else {
                    logger.error('[PCP] 同步配置失败:', data.message);
                }
            } catch (error) {
                logger.error('[PCP] 同步配置异常:', error);
            }
        };

        // 从后端加载配置
        nodeType.prototype.loadConfigFromBackend = async function () {
            try {
                // 如果已从工作流加载，不要从后端加载（避免覆盖工作流数据）
                if (this._loadedFromWorkflow) {
                    logger.info('[PCP] 已从工作流加载，跳过后端加载');
                    return;
                }

                const response = await fetch(`/danbooru_gallery/pcp/load_config?node_id=${this.id}`);
                const data = await response.json();

                if (data.status === 'success' && data.parameters && data.parameters.length > 0) {
                    this.properties.parameters = data.parameters;
                    this.updateParametersList();
                    logger.info('[PCP] 配置已从后端加载:', data.parameters.length);
                } else {
                    logger.info('[PCP] 后端无配置，使用默认空列表');
                }
            } catch (error) {
                logger.error('[PCP] 加载配置失败:', error);
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

            logger.info('[PCP] 序列化:', info.parameters?.length || 0, '个参数');
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
                // 确保所有参数都有ID（兼容旧工作流）
                this.properties.parameters = info.parameters.map(param => {
                    if (!param.id) {
                        // 为旧参数生成ID
                        param.id = `param_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                        logger.info(`[PCP] 为参数 '${param.name}' 补充ID:`, param.id);
                    }
                    return param;
                });
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
                // 检查节点是否仍然有效
                if (!this.graph) {
                    logger.warn('[PCP] 节点已被移除，跳过配置处理');
                    return;
                }

                logger.debug('[PCP] onConfigure: 开始处理工作流配置');
                if (this.customUI) {
                    this.updateParametersList();
                    this.loadPresetsList();
                    // 根据恢复的锁定状态更新UI
                    this.updateLockUI();
                    // 恢复所有左上角提示
                    this.restoreTopLeftNotices();

                    // 刷新下拉菜单选项列表（工作流初始化时）
                    logger.debug('[PCP] onConfigure: 触发下拉菜单选项刷新');
                    this.refreshAllDropdownsOnWorkflowLoad();
                } else {
                    logger.warn('[PCP] onConfigure: customUI 不存在，跳过UI更新');
                }

                // 将工作流数据同步到后端内存
                if (this._loadedFromWorkflow) {
                    this.syncConfig();
                }
            }, 100);

            logger.debug('[PCP] 反序列化:', this.properties.parameters?.length || 0, '个参数, 锁定状态:', this.properties.locked);
        };

        // ==================== 节点生命周期钩子 ====================

        // 节点移除时的清理
        const onRemoved = nodeType.prototype.onRemoved;
        nodeType.prototype.onRemoved = function () {
            if (onRemoved) {
                onRemoved.apply(this, arguments);
            }

            // 移除右键菜单（如果存在）
            this.removeParameterContextMenu();

            // 移除参数值变化事件监听器
            if (this._pcpEventHandler) {
                window.removeEventListener('pcp-param-value-changed', this._pcpEventHandler);
                this._pcpEventHandler = null;
                logger.info('[PCP] 已移除参数值变化事件监听器');
            }

            // 清理 ResizeObserver 实例
            if (this._resizeObservers) {
                this._resizeObservers.forEach(observer => observer.disconnect());
                this._resizeObservers = null;
                logger.info('[PCP] 已清理 ResizeObserver 实例');
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
                    logger.info('[PCP] 样式已移除（无其他PCP节点）');
                }
            }

            logger.info('[PCP] 节点已移除:', this.id);
        };

        // 节点执行时（前端辅助，主要逻辑在Python）
        const onExecuted = nodeType.prototype.onExecuted;
        nodeType.prototype.onExecuted = function (message) {
            if (onExecuted) {
                onExecuted.apply(this, arguments);
            }

            // 检查图像加载错误
            if (message && message.parameters && Array.isArray(message.parameters)) {
                const paramsData = message.parameters[0];
                if (paramsData && Array.isArray(paramsData._image_errors) && paramsData._image_errors.length > 0) {
                    // 显示所有图像加载错误
                    paramsData._image_errors.forEach(error => {
                        const errorMsg = t('imageNotFound', {
                            paramName: error.param_name,
                            imagePath: error.image_path
                        }) || `图像不存在，使用默认黑色图像：${error.param_name} (${error.image_path})`;

                        globalToastManager.showToast(errorMsg, 'warning', 5000);
                        logger.warn('[PCP] 图像加载错误:', error);
                    });
                }
            }

            // 可以在这里处理执行结果
            logger.info('[PCP] 节点已执行');
        };

        // ==================== 绘制覆盖（可选） ====================

        // 自定义节点绘制已禁用（不显示参数数量）
        // const onDrawForeground = nodeType.prototype.onDrawForeground;
        // nodeType.prototype.onDrawForeground = function (ctx) {
        //     if (onDrawForeground) {
        //         onDrawForeground.apply(this, arguments);
        //     }
        // };

        logger.info('[PCP] 参数控制面板节点已完整注册');
    }
});

logger.info('[PCP] 参数控制面板已加载');
