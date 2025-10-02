/**
 * 统一的弹出提示管理系统
 * 负责管理所有弹出提示的显示位置和防重叠逻辑
 */

class ToastManager {
    constructor() {
        this.toasts = [];
        this.maxVisibleToasts = 5; // 最大同时显示的提示数量
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
        document.body.appendChild(this.toastContainer);
    }

    addStyles() {
        // 检查是否已添加样式
        if (document.querySelector('#mce-toast-manager-styles')) return;

        const style = document.createElement('style');
        style.id = 'mce-toast-manager-styles';
        style.textContent = `
            .mce-toast-container {
                position: fixed;
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 10000;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                pointer-events: none;
            }

            .mce-toast {
                position: relative;
                padding: 10px 16px;
                border-radius: 8px;
                color: #ffffff;
                font-size: 13px;
                font-weight: 500;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3),
                           0 0 0 1px rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                pointer-events: auto;
                transition: all 0.3s ease;
                opacity: 0;
                transform: translateY(-10px);
                white-space: nowrap;
                max-width: 80vw;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .mce-toast.show {
                opacity: 1;
                transform: translateY(0);
            }

            .mce-toast.hide {
                opacity: 0;
                transform: translateY(-10px);
            }

            .mce-toast.success {
                background: linear-gradient(135deg, rgba(76, 175, 80, 0.9) 0%, rgba(102, 187, 106, 0.9) 100%);
                border: 1px solid rgba(76, 175, 80, 0.5);
            }

            .mce-toast.error {
                background: linear-gradient(135deg, rgba(244, 67, 54, 0.9) 0%, rgba(239, 83, 80, 0.9) 100%);
                border: 1px solid rgba(244, 67, 54, 0.5);
            }

            .mce-toast.warning {
                background: linear-gradient(135deg, rgba(255, 152, 0, 0.9) 0%, rgba(255, 193, 7, 0.9) 100%);
                border: 1px solid rgba(255, 152, 0, 0.5);
            }

            .mce-toast.info {
                background: linear-gradient(135deg, rgba(33, 150, 243, 0.9) 0%, rgba(100, 181, 246, 0.9) 100%);
                border: 1px solid rgba(33, 150, 243, 0.5);
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
                    top: 5px;
                    left: 5px;
                    right: 5px;
                    transform: none;
                }
                
                .mce-toast {
                    max-width: calc(100vw - 10px);
                    white-space: normal;
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
     */
    showToast(message, type = 'info', duration = 3000, options = {}) {
        const {
            closable = true,
            onClose = null
        } = options;

        // 如果已达到最大显示数量，移除最旧的提示
        if (this.toasts.length >= this.maxVisibleToasts) {
            this.removeToast(this.toasts[0]);
        }

        // 创建提示元素
        const toast = document.createElement('div');
        toast.className = `mce-toast ${type}`;

        // 创建内容容器
        const content = document.createElement('span');
        content.textContent = message;
        toast.appendChild(content);

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

        // 添加到容器
        this.toastContainer.appendChild(toast);
        this.toasts.push(toast);

        // 显示动画
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

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
     * 移除弹出提示
     * @param {HTMLElement} toast - 提示元素
     */
    removeToast(toast) {
        if (!toast || !toast.parentNode) return;

        const index = this.toasts.indexOf(toast);
        if (index > -1) {
            this.toasts.splice(index, 1);
        }

        // 隐藏动画
        toast.classList.add('hide');

        // 动画完成后移除元素
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
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
        this.maxVisibleToasts = Math.max(1, parseInt(maxVisible) || 5);

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
     * 根据节点容器调整位置
     * @param {HTMLElement} nodeContainer - 节点容器
     */
    adjustPositionToNode(nodeContainer) {
        if (!nodeContainer || !this.toastContainer) return;

        // 获取节点容器的位置和尺寸
        const rect = nodeContainer.getBoundingClientRect();

        // 调整提示容器位置到节点顶部
        this.toastContainer.style.position = 'fixed';
        this.toastContainer.style.top = `${rect.top + 10}px`;
        this.toastContainer.style.left = `${rect.left + rect.width / 2}px`;
        this.toastContainer.style.transform = 'translateX(-50%)';
        this.toastContainer.style.width = `${rect.width}px`;
    }

    /**
     * 重置位置到屏幕顶部中心
     */
    resetPosition() {
        if (!this.toastContainer) return;

        this.toastContainer.style.position = 'fixed';
        this.toastContainer.style.top = '10px';
        this.toastContainer.style.left = '50%';
        this.toastContainer.style.transform = 'translateX(-50%)';
        this.toastContainer.style.width = 'auto';
    }
}

// 创建全局实例
const globalToastManager = new ToastManager();

// 导出类和全局实例
export { ToastManager, globalToastManager };