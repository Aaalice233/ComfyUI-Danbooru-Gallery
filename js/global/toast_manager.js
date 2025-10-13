/**
 * 简化的弹出提示管理系统
 * 专注于可靠性和简单性，减少复杂的定位逻辑
 * 修复了ComfyUI布局冲突问题 - 使用更兼容的方式
 */

class ToastManager {
    constructor() {
        this.toasts = [];
        this.maxVisibleToasts = 8; // 增加最大同时显示的提示数量
        this.toastContainer = null;
        this.init();
    }

    init() {
        this.createToastContainer();
        this.addStyles();
    }

    createToastContainer() {
        // 创建弹出提示容器
        this.toastContainer = document.createElement('div');
        this.toastContainer.className = 'mce-toast-container';
        this.toastContainer.id = 'mce-toast-container';

        // 简化样式，避免使用!important，使用更兼容的方式
        this.toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 99999;
            display: flex;
            flex-direction: column-reverse; /* 垂直排列，最新的toast在最上面 */
            gap: 0px; /* 使用margin-bottom代替gap */
            pointer-events: none;
            align-items: center; /* 居中对齐 */
            max-width: 400px;
            width: auto;
            height: auto;
        `;


        // 简化DOM加载检查
        if (document.body) {
            if (!document.getElementById('mce-toast-container')) {
                document.body.appendChild(this.toastContainer);
            } else {
            }
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                if (document.body && !document.getElementById('mce-toast-container')) {
                    document.body.appendChild(this.toastContainer);
                }
            });
        }
    }

    // 位置检查方法，确保关键位置属性正确
    ensureCorrectPosition() {
        if (this.toastContainer) {
            // 只检查关键位置属性，不强制重置所有样式
            const computedStyle = window.getComputedStyle(this.toastContainer);

            // 如果位置不是fixed，则修复
            if (computedStyle.position !== 'fixed') {
                this.toastContainer.style.position = 'fixed';
            }

            // 如果z-index太低，则提高
            if (parseInt(computedStyle.zIndex) < 99999) {
                this.toastContainer.style.zIndex = '99999';
            }

            // 确保容器可见
            if (this.toastContainer.style.display === 'none') {
                this.toastContainer.style.display = 'flex';
            }

        }
    }

    addStyles() {
        // 检查是否已添加样式
        if (document.querySelector('#mce-toast-manager-styles')) return;

        const style = document.createElement('style');
        style.id = 'mce-toast-manager-styles';
        style.textContent = `
            #mce-toast-container.mce-toast-container {
                position: fixed !important;
                top: 20px !important;
                left: 50% !important;
                transform: translateX(-50%) !important;
                z-index: 99999 !important;
                display: flex !important;
                flex-direction: column-reverse !important; /* 垂直排列，最新的toast在最上面 */
                gap: 0px !important; /* 使用margin-bottom代替gap */
                pointer-events: none !important;
                align-items: center !important; /* 居中对齐 */
                max-width: 400px !important;
                width: auto !important;
                height: auto !important;
            }

            .mce-toast-container .mce-toast {
                position: relative !important;
                padding: 12px 16px !important;
                border-radius: 10px !important;
                color: #ffffff !important;
                font-size: 13px !important;
                font-weight: 600 !important;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08) !important;
                pointer-events: auto !important;
                transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
                opacity: 0 !important;
                transform: translateY(-20px) scale(0.9) !important;
                width: auto !important;
                min-width: 120px !important;
                max-width: 400px !important;
                height: auto !important;
                min-height: 40px !important;
                white-space: nowrap !important;
                text-overflow: ellipsis !important;
                overflow: hidden !important;
                flex-shrink: 0 !important;
                display: flex !important;
                align-items: center !important;
                visibility: visible !important;
                box-sizing: border-box !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
                margin-bottom: 12px !important;
                position: relative !important;
                top: auto !important;
                left: auto !important;
                right: auto !important;
                backdrop-filter: blur(12px) !important;
                border: 1px solid rgba(255, 255, 255, 0.18) !important;
                background-clip: padding-box !important;
            }
              
            .mce-toast-container .mce-toast.show {
                opacity: 1 !important;
                transform: translateY(0) scale(1) !important;
                display: flex !important;
                visibility: visible !important;
                margin-bottom: 12px !important;
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1) !important;
            }
              
            .mce-toast.multi-line {
                white-space: normal;
                word-wrap: break-word;
                width: 350px; /* 多行时使用更紧凑的宽度 */
                max-width: 70vw; /* 在小屏幕上限制宽度 */
            }
              
            .mce-toast-container .mce-toast.removing {
                opacity: 0 !important;
                transform: translateY(-20px) scale(0.8) !important;
                transition: all 0.3s cubic-bezier(0.55, 0.055, 0.675, 0.19) !important;
                margin-bottom: 0 !important;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08) !important;
            }

            /* 默认提示 - 绿色 */
            .mce-toast-container .mce-toast.success {
                background: linear-gradient(135deg, rgba(52, 211, 153, 0.95) 0%, rgba(16, 185, 129, 0.95) 100%) !important;
                border-color: rgba(52, 211, 153, 0.3) !important;
                color: #ffffff !important;
            }

            /* 错误提示 - 红色 */
            .mce-toast-container .mce-toast.error {
                background: linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(220, 38, 38, 0.95) 100%) !important;
                border-color: rgba(239, 68, 68, 0.3) !important;
                color: #ffffff !important;
            }

            /* 警告提示 - 黄色 */
            .mce-toast-container .mce-toast.warning {
                background: linear-gradient(135deg, rgba(245, 158, 11, 0.95) 0%, rgba(217, 119, 6, 0.95) 100%) !important;
                border-color: rgba(245, 158, 11, 0.3) !important;
                color: #ffffff !important;
            }

            /* 信息提示 - 蓝色 */
            .mce-toast-container .mce-toast.info {
                background: linear-gradient(135deg, rgba(59, 130, 246, 0.95) 0%, rgba(37, 99, 235, 0.95) 100%) !important;
                border-color: rgba(59, 130, 246, 0.3) !important;
                color: #ffffff !important;
            }

            /* 添加图标样式 */
            .mce-toast-container .mce-toast::before {
                content: '' !important;
                display: inline-block !important;
                width: 20px !important;
                height: 20px !important;
                margin-right: 12px !important;
                flex-shrink: 0 !important;
                background-size: contain !important;
                background-repeat: no-repeat !important;
                background-position: center !important;
            }

            .mce-toast-container .mce-toast.success::before {
                background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='white'%3e%3cpath fill-rule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z' clip-rule='evenodd'/%3e%3c/svg%3e") !important;
            }

            .mce-toast-container .mce-toast.error::before {
                background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='white'%3e%3cpath fill-rule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z' clip-rule='evenodd'/%3e%3c/svg%3e") !important;
            }

            .mce-toast-container .mce-toast.warning::before {
                background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='white'%3e%3cpath fill-rule='evenodd' d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z' clip-rule='evenodd'/%3e%3c/svg%3e") !important;
            }

            .mce-toast-container .mce-toast.info::before {
                background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='white'%3e%3cpath fill-rule='evenodd' d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z' clip-rule='evenodd'/%3e%3c/svg%3e") !important;
            }

            .mce-toast-close {
                margin-left: 10px;
                cursor: pointer;
                opacity: 0.7;
                transition: opacity 0.2s;
            }

            .mce-toast-close:hover {
                opacity: 1;
            }

            /* 响应式设计 */
            @media (max-width: 768px) {
                .mce-toast-container {
                    top: 10px;
                    left: 50% !important;
                    transform: translateX(-50%) !important;
                    max-width: calc(100vw - 20px);
                }

                .mce-toast {
                    max-width: calc(100vw - 40px);
                    min-width: 150px;
                    width: auto;
                }

                .mce-toast.multi-line {
                    max-width: calc(100vw - 40px);
                    width: calc(100vw - 40px);
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 显示弹出提示
     * @param {string} message - 提示消息
     * @param {string} type - 提示类型 (success, error, warning, info)
     * @param {number} duration - 显示时长（毫秒），0表示不自动消失
     * @param {Object} options - 额外选项
     * @param {boolean} options.closable - 是否可手动关闭
     * @param {Function} options.onClose - 关闭回调
     * @param {HTMLElement} options.nodeContainer - 节点容器，用于定位
     */
    showToast(message, type = 'info', duration = 3000, options = {}) {
        this.ensureCorrectPosition(); // 每次显示前确保位置正确

        const {
            closable = true,
            onClose = null,
            nodeContainer = null
        } = options;


        // 如果已达到最大显示数量，移除最旧的提示
        if (this.toasts.length >= this.maxVisibleToasts) {
            this.removeToast(this.toasts[0]);
        }

        // 创建提示元素
        const toast = document.createElement('div');
        toast.className = `mce-toast ${type}`;
        toast.dataset.timestamp = Date.now();

        // 创建内容容器
        const content = document.createElement('span');
        content.textContent = message;
        toast.appendChild(content);

        // 动态调整宽度和显示方式
        this.adjustToastWidth(toast, message);

        // 添加关闭按钮
        if (closable) {
            const closeBtn = document.createElement('span');
            closeBtn.className = 'mce-toast-close';
            closeBtn.innerHTML = '×';
            closeBtn.addEventListener('click', () => {
                this.removeToast(toast);
            });
            toast.appendChild(closeBtn);
        }

        // 添加到容器顶部（新提示会显示在最上面）
        this.toastContainer.prepend(toast); // 使用prepend添加到顶部
        this.toasts.unshift(toast); // 添加到数组开头

        // 确保容器可见
        this.toastContainer.style.display = 'flex';

        // 如果有节点容器，调整toast位置
        if (nodeContainer) {
            this.adjustPositionToNode(nodeContainer);
        }

        // 显示toast并触发重新排列
        setTimeout(() => {
            // 确保没有removing类
            toast.classList.remove('removing');
            toast.classList.add('show');
            this.rearrangeToasts();
        }, 10);

        // 自动移除
        if (duration > 0) {
            setTimeout(() => {
                this.removeToast(toast);
            }, duration);
        }

        // 返回提示元素，以便手动控制
        return toast;
    }

    /**
     * 根据内容长度动态调整toast宽度和显示方式
     * @param {HTMLElement} toast - toast元素
     * @param {string} message - 消息内容
     */
    adjustToastWidth(toast, message) {

        // 创建临时元素来测量文本宽度
        const measureElement = document.createElement('div');
        measureElement.style.cssText = `
            position: absolute;
            visibility: hidden;
            white-space: nowrap;
            font-family: var(--comfy-font-family, sans-serif);
            font-size: 13px;
            font-weight: 500;
            padding: 12px 16px;
        `;
        measureElement.textContent = message;
        document.body.appendChild(measureElement);

        const textWidth = measureElement.offsetWidth;
        document.body.removeChild(measureElement);


        // 计算合适的toast宽度：文本宽度 + 左右padding + 关闭按钮宽度(如果有)
        const paddingWidth = 32; // 左右padding各16px
        const closeButtonWidth = 20; // 关闭按钮宽度
        const minToastWidth = 120; // 减小最小宽度
        const maxToastWidth = Math.min(400, window.innerWidth * 0.7); // 减小最大宽度，不超过屏幕宽度的70%

        let calculatedWidth = textWidth + paddingWidth;
        if (message.length > 0) {
            calculatedWidth += closeButtonWidth; // 添加关闭按钮空间
        }

        // 确保宽度在合理范围内
        const finalWidth = Math.max(minToastWidth, Math.min(calculatedWidth, maxToastWidth));


        // 设置toast宽度
        toast.style.width = `${finalWidth}px`;
        toast.style.minWidth = `${minToastWidth}px`;
        toast.style.maxWidth = `${maxToastWidth}px`;

        // 如果内容很长，启用多行模式
        if (textWidth > maxToastWidth - paddingWidth - closeButtonWidth || message.length > 40) {
            toast.classList.add('multi-line');
            // 对于多行toast，使用更紧凑的宽度
            const multiLineWidth = Math.min(350, window.innerWidth * 0.7);
            toast.style.width = `${multiLineWidth}px`;
            toast.style.whiteSpace = 'normal';
            toast.style.wordWrap = 'break-word';
        } else {
            toast.classList.remove('multi-line');
            toast.style.whiteSpace = 'nowrap';
        }

    }

    /**
     * 移除弹出提示
     * @param {HTMLElement} toast - 提示元素
     */
    removeToast(toast) {
        if (!toast || !toast.parentNode) return;

        const index = this.toasts.indexOf(toast);
        if (index > -1) {
            this.toasts.splice(index, 1);
        }

        // 检查是否已经有removing类，避免重复添加
        if (!toast.classList.contains('removing')) {
            // 添加移除动画
            toast.classList.add('removing');

            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
                // 重新排列剩余的toast
                this.rearrangeToasts();
            }, 200);
        }
    }

    /**
     * 清除所有弹出提示
     */
    clearAllToasts() {
        // 复制数组，避免在迭代过程中修改原数组
        const toastsCopy = [...this.toasts];
        toastsCopy.forEach(toast => {
            this.removeToast(toast);
        });
    }

    /**
     * 设置最大可见提示数量
     * @param {number} maxVisible - 最大可见数量
     */
    setMaxVisibleToasts(maxVisible) {
        this.maxVisibleToasts = Math.max(1, parseInt(maxVisible) || 8);

        // 如果当前提示数量超过新的最大值，移除多余的
        while (this.toasts.length > this.maxVisibleToasts) {
            this.removeToast(this.toasts[0]);
        }

    }

    /**
     * 获取当前提示数量
     */
    getToastCount() {
        return this.toasts.length;
    }

    /**
     * 位置调整方法 - 根据节点容器调整toast位置
     */
    adjustPositionToNode(nodeContainer) {

        if (this.toastContainer) {

            // 确保容器可见
            this.toastContainer.style.display = 'flex';

            // 默认情况下toast已经定位到屏幕中心顶部
            // 如果有节点容器，可以在这里添加特殊定位逻辑
            if (nodeContainer) {
                // 可以在这里添加基于特定节点的定位逻辑
                // 目前保持默认的居中定位
            }

            this.ensureCorrectPosition();

        } else {
        }
    }

    /**
     * 重新排列所有toast的位置
     */
    rearrangeToasts() {
        // 获取所有可见的toast元素
        const visibleToasts = this.toastContainer.querySelectorAll('.mce-toast:not(.removing)');


        // 为每个toast设置适当的间距
        visibleToasts.forEach((toast, index) => {
            toast.style.marginBottom = '8px';
        });

    }

    /**
     * 简化的窗口大小变化监听
     */
    setupResizeListener() {
        // 简化：不再监听窗口大小变化
    }

    /**
     * 移除窗口大小变化监听器
     */
    removeResizeListener() {
        // 简化：不再需要移除监听器
    }
}

// 立即初始化，确保globalToastManager始终可用
let globalToastManager = new ToastManager();
let isInitialized = true;

// 简化：不再设置窗口大小变化监听
// globalToastManager.setupResizeListener();

// 创建一个代理对象，确保在使用前初始化
const toastManagerProxy = new Proxy({}, {
    get(target, prop) {
        return globalToastManager[prop];
    }
});


// 监听ComfyUI布局变化，确保toast容器位置正确
window.addEventListener('load', () => {
    // 页面加载完成后确保toast位置正确
    setTimeout(() => {
        if (globalToastManager) {
            globalToastManager.ensureCorrectPosition();
        }
    }, 1000);
});

// 监听窗口大小变化
window.addEventListener('resize', () => {
    if (globalToastManager) {
        globalToastManager.ensureCorrectPosition();
    }
});

// 导出类和全局实例（使用代理确保初始化）
export { ToastManager, globalToastManager, toastManagerProxy };
