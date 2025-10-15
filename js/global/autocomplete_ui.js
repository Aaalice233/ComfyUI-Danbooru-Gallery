/**
 * 通用智能补全UI组件
 * 可被多个节点和编辑器复用
 * 支持动态语言切换和自定义样式
 */

import { globalAutocompleteCache } from './autocomplete_cache.js';

class AutocompleteUI {
    constructor(options = {}) {
        // 配置
        this.inputElement = options.inputElement; // 输入框元素
        this.containerElement = options.containerElement || null; // 建议容器（可选，不提供则自动创建）
        this.language = options.language || 'zh'; // 语言
        this.maxSuggestions = options.maxSuggestions || 10; // 最大建议数
        this.debounceDelay = options.debounceDelay || 200; // 防抖延迟（优化为200ms，平衡响应速度和性能）
        this.minQueryLength = options.minQueryLength || 2; // 最小查询长度（提高到2字符，减少无效请求）
        this.onSelect = options.onSelect || null; // 选择回调
        this.customClass = options.customClass || ''; // 自定义样式类

        // 状态
        this.isActive = false;
        this.selectedIndex = -1;
        this.currentSuggestions = [];
        this.debounceTimer = null;
        this.lastQuery = '';

        // 初始化
        this.init();
    }

    init() {
        if (!this.inputElement) {
            console.error('[AutocompleteUI] 输入框元素未提供');
            return;
        }

        // 创建建议容器
        if (!this.containerElement) {
            this.containerElement = this.createSuggestionsContainer();
        }

        // 绑定事件
        this.bindEvents();

        // 设置缓存语言
        if (globalAutocompleteCache) {
            globalAutocompleteCache.setLanguage(this.language);
        }
    }

    /**
     * 创建建议容器
     */
    createSuggestionsContainer() {
        const container = document.createElement('div');
        container.className = `autocomplete-suggestions ${this.customClass}`;
        container.style.cssText = `
            position: fixed;
            max-height: 250px;
            min-width: 200px;
            max-width: 400px;
            overflow-y: auto;
            background: rgba(26, 26, 38, 0.98);
            border: 1px solid rgba(124, 58, 237, 0.3);
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 999999;
            display: none;
            backdrop-filter: blur(10px);
        `;

        // 将容器添加到body，以便使用fixed定位
        document.body.appendChild(container);

        return container;
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 输入事件（使用防抖）
        this.inputElement.addEventListener('input', (e) => {
            this.handleInput(e);
        });

        // 键盘事件
        this.inputElement.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });

        // 失焦事件 - 存储定时器以便可以取消
        this.blurTimer = null;
        this.inputElement.addEventListener('blur', (e) => {
            // 清除之前的定时器
            if (this.blurTimer) {
                clearTimeout(this.blurTimer);
            }

            // 延迟隐藏，以便可以点击建议
            this.blurTimer = setTimeout(() => {
                // 检查是否真的需要隐藏（可能用户正在与建议面板交互）
                const activeElement = document.activeElement;
                const stillFocused = this.inputElement === activeElement;
                const focusInContainer = this.containerElement.contains(activeElement);

                if (!stillFocused && !focusInContainer) {
                    this.hide();
                }
                this.blurTimer = null;
            }, 300);
        });

        // 聚焦事件 - 取消blur定时器
        this.inputElement.addEventListener('focus', () => {
            if (this.blurTimer) {
                clearTimeout(this.blurTimer);
                this.blurTimer = null;
            }
        });

        // 点击建议容器外部隐藏
        this.clickHandler = (e) => {
            const clickedInput = this.inputElement.contains(e.target);
            const clickedContainer = this.containerElement.contains(e.target);
            if (!clickedInput && !clickedContainer) {
                this.hide();
            }
        };
        document.addEventListener('click', this.clickHandler);

        // 建议容器mousedown事件 - 阻止输入框失焦
        this.containerElement.addEventListener('mousedown', (e) => {
            // 阻止默认行为，防止输入框失焦
            e.preventDefault();
        });

        // 窗口滚动和调整大小时更新位置
        this.scrollHandler = () => {
            if (this.isActive) {
                this.updatePosition();
            }
        };
        window.addEventListener('scroll', this.scrollHandler, true); // 使用捕获阶段监听所有滚动事件
        window.addEventListener('resize', this.scrollHandler);
    }

    /**
     * 处理输入
     */
    handleInput(e) {
        // 清除之前的防抖计时器
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }

        const value = e.target.value;
        const cursorPosition = e.target.selectionStart;

        // 获取光标位置的当前单词
        const textBeforeCursor = value.substring(0, cursorPosition);
        const lastWord = this.getLastWord(textBeforeCursor);

        // 如果输入长度不够，隐藏建议
        if (!lastWord || lastWord.length < this.minQueryLength) {
            this.hide();
            return;
        }

        // 防抖处理
        this.debounceTimer = setTimeout(async () => {
            try {
                await this.fetchSuggestions(lastWord);
            } catch (error) {
                console.error('[AutocompleteUI] 处理输入时出错:', error);
                this.hide();
            }
        }, this.debounceDelay);
    }

    /**
     * 获取最后一个单词
     */
    getLastWord(text) {
        // 支持多种分隔符：空格、逗号、括号等
        const separators = /[\s,，()（）\[\]【】{}｛｝]+/;
        const words = text.split(separators);
        return words[words.length - 1].trim();
    }

    /**
     * 获取建议
     */
    async fetchSuggestions(query) {
        if (query === this.lastQuery) {
            return; // 避免重复查询
        }

        this.lastQuery = query;

        try {
            // 检查缓存系统是否可用
            if (!globalAutocompleteCache) {
                console.warn('[AutocompleteUI] 缓存系统不可用');
                this.hide();
                return;
            }

            let suggestions = [];

            // 检测中文
            const containsChinese = /[\u4e00-\u9fff]/.test(query);

            if (containsChinese) {
                // 中文搜索
                suggestions = await globalAutocompleteCache.getChineseSearchSuggestions(query, {
                    limit: this.maxSuggestions
                });
            } else {
                // 英文补全
                suggestions = await globalAutocompleteCache.getAutocompleteSuggestions(query, {
                    limit: this.maxSuggestions
                });
            }

            // 验证返回数据
            if (!Array.isArray(suggestions)) {
                suggestions = [];
            }

            this.currentSuggestions = suggestions;
            this.renderSuggestions(suggestions, containsChinese);
        } catch (error) {
            console.error('[AutocompleteUI] 获取建议失败:', error);
            this.hide();
        }
    }

    /**
     * 渲染建议
     */
    renderSuggestions(suggestions, isChinese = false) {
        if (!suggestions || suggestions.length === 0) {
            this.hide();
            return;
        }

        this.containerElement.innerHTML = '';
        this.selectedIndex = -1;

        suggestions.forEach((item, index) => {
            const suggestionElement = document.createElement('div');
            suggestionElement.className = 'autocomplete-suggestion-item';
            suggestionElement.style.cssText = `
                padding: 8px 12px;
                cursor: pointer;
                transition: all 0.15s ease;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;

            if (isChinese) {
                // 中文搜索结果
                // 处理中文搜索API返回的格式 {chinese, english, weight}
                const tag = item.english || item.tag || item;
                const translation = item.chinese || item.translation || '';
                const count = item.post_count || item.count || 0;

                suggestionElement.innerHTML = `
                    <div style="flex: 1; overflow: hidden;">
                        <div style="color: #E0E0E0; font-weight: 500; margin-bottom: 2px;">${this.escapeHtml(tag)}</div>
                        ${translation ? `<div style="color: #999; font-size: 11px;">${this.escapeHtml(translation)}</div>` : ''}
                    </div>
                    ${count > 0 ? `<span style="color: #7c3aed; font-size: 11px; margin-left: 8px;">${this.formatCount(count)}</span>` : ''}
                `;

                suggestionElement.addEventListener('click', () => {
                    this.selectSuggestion(tag);
                });
            } else {
                // 英文补全结果
                const tag = item.tag || item.name || item;
                const translation = item.translation || '';
                const count = item.post_count || item.count || 0;

                suggestionElement.innerHTML = `
                    <div style="flex: 1; overflow: hidden;">
                        <div style="color: #E0E0E0; font-weight: 500; margin-bottom: 2px;">${this.escapeHtml(tag)}</div>
                        ${translation ? `<div style="color: #999; font-size: 11px;">${this.escapeHtml(translation)}</div>` : ''}
                    </div>
                    ${count > 0 ? `<span style="color: #7c3aed; font-size: 11px; margin-left: 8px;">${this.formatCount(count)}</span>` : ''}
                `;

                suggestionElement.addEventListener('click', () => {
                    this.selectSuggestion(tag);
                });
            }

            // 鼠标悬停效果
            suggestionElement.addEventListener('mouseenter', () => {
                this.highlightSuggestion(index);
            });

            this.containerElement.appendChild(suggestionElement);
        });

        this.show();
    }

    /**
     * 处理键盘事件
     */
    handleKeyDown(e) {
        if (!this.isActive || this.currentSuggestions.length === 0) {
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectedIndex = (this.selectedIndex + 1) % this.currentSuggestions.length;
                this.highlightSuggestion(this.selectedIndex);
                break;

            case 'ArrowUp':
                e.preventDefault();
                this.selectedIndex = this.selectedIndex <= 0
                    ? this.currentSuggestions.length - 1
                    : this.selectedIndex - 1;
                this.highlightSuggestion(this.selectedIndex);
                break;

            case 'Enter':
                if (this.selectedIndex >= 0) {
                    e.preventDefault();
                    const suggestion = this.currentSuggestions[this.selectedIndex];
                    // 支持多种数据格式：{english, tag, name} 或纯字符串
                    const tag = suggestion.english || suggestion.tag || suggestion.name || suggestion;
                    this.selectSuggestion(tag);
                }
                break;

            case 'Escape':
                e.preventDefault();
                this.hide();
                break;
        }
    }

    /**
     * 高亮建议
     */
    highlightSuggestion(index) {
        const items = this.containerElement.querySelectorAll('.autocomplete-suggestion-item');
        items.forEach((item, i) => {
            if (i === index) {
                item.style.background = 'rgba(124, 58, 237, 0.2)';
                item.style.borderLeft = '3px solid #7c3aed';
                item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else {
                item.style.background = 'transparent';
                item.style.borderLeft = 'none';
            }
        });
        this.selectedIndex = index;
    }

    /**
     * 选择建议
     */
    selectSuggestion(tag) {
        const value = this.inputElement.value;
        const cursorPosition = this.inputElement.selectionStart;
        const textBeforeCursor = value.substring(0, cursorPosition);
        const textAfterCursor = value.substring(cursorPosition);

        // 替换最后一个单词
        const lastWordStart = textBeforeCursor.lastIndexOf(this.lastQuery);
        if (lastWordStart !== -1) {
            // 在标签后添加逗号和空格
            const tagWithSeparator = tag + ', ';
            const newTextBefore = textBeforeCursor.substring(0, lastWordStart) + tagWithSeparator;
            const newValue = newTextBefore + textAfterCursor;

            this.inputElement.value = newValue;

            // 设置光标位置到逗号和空格之后
            const newCursorPos = newTextBefore.length;
            this.inputElement.setSelectionRange(newCursorPos, newCursorPos);

            // 触发input事件以便其他监听器知道值已改变
            this.inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // 调用选择回调
        if (this.onSelect) {
            this.onSelect(tag);
        }

        this.hide();
        this.inputElement.focus();
    }

    /**
     * 计算光标位置
     */
    getCursorPosition() {
        const input = this.inputElement;
        const cursorPos = input.selectionStart;
        const isTextarea = input.tagName === 'TEXTAREA';

        // 获取输入框的位置和样式
        const inputRect = input.getBoundingClientRect();
        const styles = window.getComputedStyle(input);

        // 创建镜像元素来测量光标位置
        const mirror = document.createElement('div');
        const mirrorStyles = [
            'box-sizing',
            'font-family',
            'font-size',
            'font-style',
            'font-variant',
            'font-weight',
            'letter-spacing',
            'line-height',
            'padding-top',
            'padding-right',
            'padding-bottom',
            'padding-left',
            'text-decoration',
            'text-transform',
            'white-space',
            'word-break',
            'word-spacing',
            'word-wrap',
            'border-width',
            'border-style'
        ];

        // 复制样式
        mirrorStyles.forEach(prop => {
            mirror.style[prop] = styles[prop];
        });

        // 设置固定宽度以匹配输入框
        mirror.style.width = inputRect.width + 'px';
        mirror.style.position = 'absolute';
        mirror.style.visibility = 'hidden';
        mirror.style.top = '-9999px';
        mirror.style.left = '-9999px';
        mirror.style.overflow = 'hidden';

        if (isTextarea) {
            mirror.style.whiteSpace = 'pre-wrap';
            mirror.style.wordWrap = 'break-word';
        } else {
            mirror.style.whiteSpace = 'pre';
        }

        document.body.appendChild(mirror);

        // 获取光标前的文本
        const textBeforeCursor = input.value.substring(0, cursorPos);
        mirror.textContent = textBeforeCursor;

        // 创建光标标记
        const cursorMarker = document.createElement('span');
        cursorMarker.textContent = '|';
        cursorMarker.style.display = 'inline';
        mirror.appendChild(cursorMarker);

        // 获取光标标记的位置
        const markerRect = cursorMarker.getBoundingClientRect();
        const mirrorRect = mirror.getBoundingClientRect();

        // 计算相对位置
        const offsetX = markerRect.left - mirrorRect.left;
        const offsetY = markerRect.top - mirrorRect.top;

        // 清理镜像元素
        document.body.removeChild(mirror);

        // 获取内边距和滚动
        const paddingLeft = parseFloat(styles.paddingLeft) || 0;
        const paddingTop = parseFloat(styles.paddingTop) || 0;
        const scrollLeft = input.scrollLeft || 0;
        const scrollTop = input.scrollTop || 0;
        const lineHeight = parseFloat(styles.lineHeight) || parseFloat(styles.fontSize) || 16;

        // 计算最终光标位置
        let cursorX = inputRect.left + offsetX - scrollLeft;
        let cursorY = inputRect.top + offsetY - scrollTop;

        // 对于textarea，添加行高以显示在当前行下方
        if (isTextarea) {
            cursorY += lineHeight;
        } else {
            // 对于单行输入框，显示在输入框下方
            cursorY = inputRect.bottom;
        }

        return { x: cursorX, y: cursorY };
    }

    /**
     * 更新补全菜单位置
     */
    updatePosition() {
        if (!this.isActive) return;

        // 计算光标位置
        const cursorPos = this.getCursorPosition();

        // 设置容器位置
        this.containerElement.style.left = cursorPos.x + 'px';
        this.containerElement.style.top = cursorPos.y + 'px';

        // 确保容器不会超出视口
        this.adjustPosition();
    }

    /**
     * 显示建议
     */
    show() {
        // 显示容器
        this.containerElement.style.display = 'block';
        this.isActive = true;

        // 更新位置
        this.updatePosition();
    }

    /**
     * 调整补全菜单位置，确保不超出视口
     */
    adjustPosition() {
        const container = this.containerElement;
        const rect = container.getBoundingClientRect();

        // 获取视口尺寸
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // 如果超出右侧，向左调整
        if (rect.right > viewportWidth) {
            const overflow = rect.right - viewportWidth;
            container.style.left = (rect.left - overflow - 10) + 'px';
        }

        // 如果超出底部，显示在光标上方
        if (rect.bottom > viewportHeight) {
            const inputRect = this.inputElement.getBoundingClientRect();
            container.style.top = (inputRect.top - container.offsetHeight - 5) + 'px';
        }

        // 如果超出左侧，调整到最左
        if (rect.left < 0) {
            container.style.left = '10px';
        }
    }

    /**
     * 隐藏建议
     */
    hide() {
        this.containerElement.style.display = 'none';
        this.isActive = false;
        this.selectedIndex = -1;
        this.currentSuggestions = [];
        this.lastQuery = '';
    }

    /**
     * 设置语言
     */
    setLanguage(language) {
        this.language = language;
        if (globalAutocompleteCache) {
            globalAutocompleteCache.setLanguage(language);
        }
    }

    /**
     * 销毁
     */
    destroy() {
        // 清理DOM
        if (this.containerElement && this.containerElement.parentElement) {
            this.containerElement.remove();
        }

        // 清理定时器
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }

        if (this.blurTimer) {
            clearTimeout(this.blurTimer);
            this.blurTimer = null;
        }

        // 清理事件监听器
        if (this.clickHandler) {
            document.removeEventListener('click', this.clickHandler);
            this.clickHandler = null;
        }

        if (this.scrollHandler) {
            window.removeEventListener('scroll', this.scrollHandler, true);
            window.removeEventListener('resize', this.scrollHandler);
            this.scrollHandler = null;
        }

        // 清理引用
        this.inputElement = null;
        this.containerElement = null;
        this.currentSuggestions = [];
    }

    /**
     * 格式化数量
     */
    formatCount(count) {
        if (count >= 1000000) {
            return (count / 1000000).toFixed(1) + 'M';
        } else if (count >= 1000) {
            return (count / 1000).toFixed(1) + 'K';
        }
        return count.toString();
    }

    /**
     * HTML转义
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 导出类
export { AutocompleteUI };

