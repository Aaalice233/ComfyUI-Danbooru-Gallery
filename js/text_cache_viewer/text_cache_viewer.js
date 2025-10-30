/**
 * 文本缓存查看器 - Text Cache Viewer
 * 实时显示所有文本缓存通道的更新情况和内容
 */

import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

// HTML转义函数 - 防止XSS攻击和显示问题
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 文本缓存查看器扩展
app.registerExtension({
    name: "Comfy.TextCacheViewer",

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== "TextCacheViewer") return;

        // 节点创建时的处理
        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            const result = onNodeCreated?.apply(this, arguments);

            // 设置节点初始大小
            this.size = [600, 400];

            // 创建自定义UI
            this.createCustomUI();

            // 初始加载缓存数据
            setTimeout(() => {
                this.refreshCacheData();
            }, 300);

            return result;
        };

        // 创建自定义UI
        nodeType.prototype.createCustomUI = function () {
            try {
                console.log('[TextCacheViewer] 创建自定义UI:', this.id);

                const container = document.createElement('div');
                container.className = 'tcv-container';

                // 添加样式
                this.addStyles();

                // 创建布局
                container.innerHTML = `
                    <div class="tcv-content">
                        <div class="tcv-header">
                            <span class="tcv-title">📊 文本缓存总览</span>
                            <button class="tcv-refresh-button" title="刷新">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="23 4 23 10 17 10"></polyline>
                                    <polyline points="1 20 1 14 7 14"></polyline>
                                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                </svg>
                            </button>
                        </div>
                        <div class="tcv-display-area" id="tcv-display-area">
                            <div class="tcv-loading">正在加载...</div>
                        </div>
                    </div>
                `;

                // 添加到节点的自定义widget
                this.addDOMWidget("tcv_ui", "div", container);
                this.customUI = container;

                // 绑定事件
                this.bindUIEvents();

                console.log('[TextCacheViewer] 自定义UI创建完成');

            } catch (error) {
                console.error('[TextCacheViewer] 创建自定义UI时出错:', error);
            }
        };

        // 添加样式
        nodeType.prototype.addStyles = function () {
            if (document.querySelector('#tcv-styles')) return;

            const style = document.createElement('style');
            style.id = 'tcv-styles';
            style.textContent = `
                .tcv-container {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    background: #1e1e2e;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    overflow: hidden;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    color: #E0E0E0;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                }

                .tcv-content {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                .tcv-header {
                    padding: 12px 16px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: rgba(30, 30, 46, 0.8);
                }

                .tcv-title {
                    font-size: 14px;
                    font-weight: 600;
                    color: #E0E0E0;
                }

                .tcv-refresh-button {
                    background: rgba(116, 55, 149, 0.2);
                    border: 1px solid rgba(116, 55, 149, 0.3);
                    border-radius: 6px;
                    padding: 6px 8px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .tcv-refresh-button:hover {
                    background: rgba(116, 55, 149, 0.4);
                    border-color: rgba(116, 55, 149, 0.5);
                }

                .tcv-refresh-button:active {
                    transform: rotate(180deg);
                }

                .tcv-refresh-button svg {
                    stroke: #B0B0B0;
                }

                .tcv-display-area {
                    flex: 1;
                    overflow-y: auto;
                    padding: 16px;
                    background: rgba(42, 42, 62, 0.3);
                    font-size: 13px;
                    line-height: 1.6;
                }

                .tcv-display-area::-webkit-scrollbar {
                    width: 8px;
                }

                .tcv-display-area::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.1);
                    border-radius: 4px;
                }

                .tcv-display-area::-webkit-scrollbar-thumb {
                    background: rgba(116, 55, 149, 0.5);
                    border-radius: 4px;
                }

                .tcv-display-area::-webkit-scrollbar-thumb:hover {
                    background: rgba(116, 55, 149, 0.7);
                }

                .tcv-loading {
                    text-align: center;
                    color: #B0B0B0;
                    padding: 20px;
                    font-style: italic;
                }

                .tcv-empty {
                    text-align: center;
                    color: #B0B0B0;
                    padding: 20px;
                    font-style: italic;
                }

                .tcv-summary {
                    font-size: 14px;
                    font-weight: 600;
                    color: #F0F0F0;
                    margin-bottom: 16px;
                    padding-bottom: 12px;
                    border-bottom: 2px solid rgba(116, 55, 149, 0.3);
                }

                .tcv-channel {
                    background: rgba(0, 0, 0, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    padding: 12px;
                    margin-bottom: 12px;
                    transition: all 0.2s ease;
                }

                .tcv-channel:hover {
                    background: rgba(0, 0, 0, 0.3);
                    border-color: rgba(116, 55, 149, 0.3);
                }

                .tcv-channel-name {
                    font-size: 13px;
                    font-weight: 600;
                    color: #8b4ba8;
                    margin-bottom: 6px;
                }

                .tcv-channel-meta {
                    font-size: 12px;
                    color: #B0B0B0;
                    margin-bottom: 8px;
                    display: flex;
                    gap: 16px;
                }

                .tcv-channel-preview {
                    font-size: 12px;
                    line-height: 1.6;
                    color: #D0D0D0;
                    background: rgba(0, 0, 0, 0.2);
                    padding: 8px;
                    border-radius: 4px;
                    border-left: 3px solid rgba(116, 55, 149, 0.5);
                    font-family: 'Courier New', monospace;
                    white-space: pre-wrap;
                    word-break: break-word;
                    overflow-wrap: break-word;
                    max-height: calc(1.6em * 3 + 16px);
                    overflow-y: auto;
                }

                .tcv-channel-preview::-webkit-scrollbar {
                    width: 6px;
                }

                .tcv-channel-preview::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 3px;
                }

                .tcv-channel-preview::-webkit-scrollbar-thumb {
                    background: rgba(116, 55, 149, 0.4);
                    border-radius: 3px;
                }

                .tcv-channel-preview::-webkit-scrollbar-thumb:hover {
                    background: rgba(116, 55, 149, 0.6);
                }

                .tcv-update-animation {
                    animation: tcvPulse 0.5s ease-out;
                }

                @keyframes tcvPulse {
                    0% {
                        transform: scale(1);
                        opacity: 1;
                    }
                    50% {
                        transform: scale(1.02);
                        opacity: 0.8;
                    }
                    100% {
                        transform: scale(1);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        };

        // 绑定UI事件
        nodeType.prototype.bindUIEvents = function () {
            const container = this.customUI;

            // 刷新按钮
            const refreshButton = container.querySelector('.tcv-refresh-button');
            if (refreshButton) {
                refreshButton.addEventListener('click', () => {
                    this.refreshCacheData();
                });
            }
        };

        // 刷新缓存数据
        nodeType.prototype.refreshCacheData = async function () {
            try {
                console.log('[TextCacheViewer] 刷新缓存数据');

                const response = await fetch('/danbooru/text_cache/get_all_details');
                const data = await response.json();

                if (data.status === 'success') {
                    const channelDetails = data.channels || [];
                    console.log('[TextCacheViewer] 获取到通道详情:', channelDetails);
                    this.displayChannelData(data.count, channelDetails);
                } else {
                    console.warn('[TextCacheViewer] 获取通道详情失败:', data);
                    this.showEmpty('获取缓存失败');
                }

            } catch (error) {
                console.error('[TextCacheViewer] 刷新数据失败:', error);
                this.showEmpty('刷新失败');
            }
        };

        // 显示空状态
        nodeType.prototype.showEmpty = function (message = '暂无数据') {
            const displayArea = this.customUI.querySelector('#tcv-display-area');
            if (displayArea) {
                displayArea.innerHTML = `<div class="tcv-empty">${message}</div>`;
            }
        };

        // 监听节点执行结果
        const onExecuted = nodeType.prototype.onExecuted;
        nodeType.prototype.onExecuted = function (message) {
            onExecuted?.apply(this, arguments);

            // 从message中获取通道数据
            if (message && message.channel_count !== undefined && message.channels) {
                const channelCount = message.channel_count[0];
                const channels = message.channels[0];

                console.log('[TextCacheViewer] 收到执行结果:', channelCount, channels);

                // 更新显示
                this.displayChannelData(channelCount, channels);
            }
        };

        // 显示通道数据
        nodeType.prototype.displayChannelData = function (channelCount, channels) {
            const displayArea = this.customUI.querySelector('#tcv-display-area');
            if (!displayArea) return;

            try {
                let html = `
                    <div class="tcv-summary">
                        通道总数：${channelCount}
                    </div>
                `;

                if (channelCount === 0 || !channels || channels.length === 0) {
                    html += '<div class="tcv-empty">暂无缓存数据</div>';
                } else {
                    for (const channel of channels) {
                        // 转义通道名称和预览内容，防止HTML注入
                        const escapedName = escapeHtml(channel.name);
                        const escapedPreview = escapeHtml(channel.preview || '(空)');

                        html += `
                            <div class="tcv-channel">
                                <div class="tcv-channel-name">📝 通道：${escapedName}</div>
                                <div class="tcv-channel-meta">
                                    <span>📏 长度：${channel.length} 字符</span>
                                    <span>⏰ 更新：${channel.time}</span>
                                </div>
                                <div class="tcv-channel-preview">📄 ${escapedPreview}</div>
                            </div>
                        `;
                    }
                }

                displayArea.innerHTML = html;

                // 添加更新动画
                displayArea.classList.add('tcv-update-animation');
                setTimeout(() => {
                    displayArea.classList.remove('tcv-update-animation');
                }, 500);

            } catch (error) {
                console.error('[TextCacheViewer] 显示通道数据失败:', error);
            }
        };
    },

    async setup() {
        console.log('[TextCacheViewer] 设置扩展');

        // 监听WebSocket事件，实时更新所有TextCacheViewer节点
        api.addEventListener("text-cache-channel-updated", (event) => {
            const data = event.detail;
            console.log('[TextCacheViewer] 收到text-cache-channel-updated事件:', data);

            // 查找所有TextCacheViewer节点并触发刷新
            const nodes = app.graph._nodes.filter(n => n.type === "TextCacheViewer");
            nodes.forEach(node => {
                if (node.refreshCacheData) {
                    // 延迟一点刷新，确保后端数据已更新
                    setTimeout(() => {
                        node.refreshCacheData();
                    }, 100);
                }
            });
        });

        api.addEventListener("text-cache-channel-renamed", (event) => {
            const data = event.detail;
            console.log('[TextCacheViewer] 收到text-cache-channel-renamed事件:', data);

            // 刷新所有查看器节点
            const nodes = app.graph._nodes.filter(n => n.type === "TextCacheViewer");
            nodes.forEach(node => {
                if (node.refreshCacheData) {
                    setTimeout(() => {
                        node.refreshCacheData();
                    }, 100);
                }
            });
        });

        api.addEventListener("text-cache-channel-cleared", (event) => {
            const data = event.detail;
            console.log('[TextCacheViewer] 收到text-cache-channel-cleared事件:', data);

            // 刷新所有查看器节点
            const nodes = app.graph._nodes.filter(n => n.type === "TextCacheViewer");
            nodes.forEach(node => {
                if (node.refreshCacheData) {
                    setTimeout(() => {
                        node.refreshCacheData();
                    }, 100);
                }
            });
        });

        console.log('[TextCacheViewer] 扩展设置完成，监听器已注册');
    }
});

console.log('[TextCacheViewer] 模块加载完成');
