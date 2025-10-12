/**
 * 通用工具库 - 为所有ComfyUI插件提供公共功能
 * 优化版本 - 避免与其他插件冲突
 */
class ComfyUIUtils {
    static version = '1.0.0';

    /**
     * 统一的模态框管理器
     */
    static modal = {
        stack: [],

        show(content, options = {}) {
            // 关闭现有模态框
            this.closeTop();

            const modal = document.createElement('div');
            modal.className = options.className || 'comfyui-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.7);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.2s ease-out;
            `;

            modal.innerHTML = `
                <div class="comfyui-modal-content" style="${options.contentStyle || 'background: var(--comfy-menu-bg); padding: 20px; border-radius: 8px; max-width: 90vw; max-height: 90vh; overflow-y: auto;'
                }">
                    ${content}
                </div>
            `;

            document.body.appendChild(modal);
            this.stack.push(modal);

            // 点击背景关闭
            if (options.closeOnBackdrop !== false) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.closeTop();
                    }
                });
            }

            return modal;
        },

        closeTop() {
            if (this.stack.length > 0) {
                const modal = this.stack.pop();
                modal.style.animation = 'fadeOut 0.2s ease-out';
                setTimeout(() => modal.remove(), 200);
                return true;
            }
            return false;
        },

        closeAll() {
            while (this.stack.length > 0) {
                this.closeTop();
            }
        }
    };

    /**
     * 统一的API调用包装器
     */
    static async api(endpoint, options = {}) {
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 30000
        };

        const finalOptions = { ...defaultOptions, ...options };

        try {
            const response = await fetch(endpoint, finalOptions);

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            return await response.text();
        } catch (error) {
            console.error(`API call failed for ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * 防抖函数
     */
    static debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    }

    /**
     * 节流函数
     */
    static throttle(func, limit) {
        let inThrottle;
        return function (...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * 统一的DOM元素创建器
     */
    static createElement(tag, options = {}) {
        const element = document.createElement(tag);

        // 设置属性
        if (options.attributes) {
            Object.entries(options.attributes).forEach(([key, value]) => {
                element.setAttribute(key, value);
            });
        }

        // 设置属性
        Object.entries(options).forEach(([key, value]) => {
            if (key === 'attributes' || key === 'events' || key === 'style') return;
            element[key] = value;
        });

        // 设置样式
        if (options.style) {
            Object.assign(element.style, options.style);
        }

        // 设置事件
        if (options.events) {
            Object.entries(options.events).forEach(([event, handler]) => {
                element.addEventListener(event, handler);
            });
        }

        return element;
    }

    /**
     * 统一的按钮创建器
     */
    static createButton(options = {}) {
        const defaultOptions = {
            className: 'comfyui-button',
            text: '',
            icon: '',
            style: '',
            onclick: null,
            disabled: false
        };

        const config = { ...defaultOptions, ...options };

        const iconHtml = config.icon ?
            `<i class="fas fa-${config.icon}" style="margin-right: 5px;"></i>` : '';

        return this.createElement('button', {
            className: config.className,
            innerHTML: `${iconHtml}${config.text}`,
            style: config.style,
            disabled: config.disabled,
            events: config.onclick ? { click: config.onclick } : undefined,
            attributes: { type: 'button' }
        });
    }

    /**
     * 统一的Toast通知 - 简化版本，避免与其他插件冲突
     */
    static toast = {
        container: null,

        init() {
            if (!this.container) {
                this.container = document.createElement('div');
                this.container.id = 'comfyui-toast-container';
                // 简化样式，避免使用!important
                this.container.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 99999;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    pointer-events: none;
                    max-width: 400px;
                    width: auto;
                    height: auto;
                    font-family: var(--comfy-font-family, sans-serif);
                `;

                // 确保容器被添加到body而不是其他元素
                if (document.body) {
                    document.body.appendChild(this.container);
                }
            }
        },

        show(message, type = 'info', duration = 3000) {
            this.init();

            const toast = document.createElement('div');
            toast.className = `comfyui-toast comfyui-toast-${type}`;
            toast.style.cssText = `
                background: ${type === 'success' ? '#4CAF50' :
                    type === 'error' ? '#f44336' :
                        type === 'warning' ? '#ff9800' : '#2196F3'};
                color: white;
                padding: 12px 20px;
                border-radius: 6px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                opacity: 0;
                transform: translateY(-20px);
                transition: all 0.3s ease;
                pointer-events: auto;
                max-width: 100%;
                word-wrap: break-word;
                font-size: 14px;
                line-height: 1.4;
            `;
            toast.textContent = message;

            this.container.appendChild(toast);

            // 动画显示
            setTimeout(() => {
                toast.style.opacity = '1';
                toast.style.transform = 'translateY(0)';
            }, 10);

            // 自动隐藏
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(-20px)';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }, duration);
        }
    };

    /**
     * 统一的国际化处理
     */
    static i18n = {
        currentLanguage: 'zh-CN',
        translations: {},

        setTranslations(lang, translations) {
            this.translations[lang] = translations;
        },

        setLanguage(lang) {
            this.currentLanguage = lang;
        },

        t(key, replacements = {}) {
            const lang = this.currentLanguage;
            let text = this.translations[lang]?.[key] || key;

            // 替换占位符
            Object.entries(replacements).forEach(([placeholder, value]) => {
                text = text.replace(`{${placeholder}}`, value);
            });

            return text;
        }
    };

    /**
     * 统一的本地存储管理
     */
    static storage = {
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                console.error('Storage set error:', error);
                return false;
            }
        },

        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.error('Storage get error:', error);
                return defaultValue;
            }
        },

        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.error('Storage remove error:', error);
                return false;
            }
        }
    };
}

// 添加必要的CSS - 使用更具体的选择器，避免全局污染
const styleId = 'comfyui-utils-styles';
if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
        
        .comfyui-modal {
            font-family: var(--comfy-font-family, sans-serif);
        }
        
        .comfyui-button {
            background: var(--comfy-input-bg);
            color: var(--comfy-input-text);
            border: 1px solid var(--input-border-color);
            border-radius: 4px;
            padding: 8px 12px;
            cursor: pointer;
            transition: all 0.2s ease;
            font-family: var(--comfy-font-family, sans-serif);
        }
        
        .comfyui-button:hover {
            background: var(--comfy-menu-bg);
            border-color: #7B68EE;
        }
        
        .comfyui-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    `;
    document.head.appendChild(style);
}

// 导出到全局
window.ComfyUIUtils = ComfyUIUtils;

// 移除全局事件监听，避免与其他插件冲突
// 这些监听器应该在需要时由各个插件自己添加