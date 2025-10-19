/**
 * 图像获取节点 - Image Receiver Node
 * 前端JavaScript实现
 */

import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

app.registerExtension({
    name: "ImageReceiver",

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== "ImageReceiver") return;

        // 添加自定义Widget
        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function() {
            const result = onNodeCreated?.apply(this, arguments);

            // 初始化节点属性
            this.properties = {
                lastGetTime: 0,
                retrievedCount: 0,
                getStatus: "idle" // idle, getting, success, error
            };

            // 设置节点初始大小
            this.size = [400, 250];

            // 创建自定义UI
            this.createCustomUI();

            return result;
        };

        /**
         * 创建自定义UI界面
         */
        nodeType.prototype.createCustomUI = function() {
            const container = document.createElement('div');
            container.className = 'image-receiver-container';

            // 添加样式
            this.addStyles();

            container.innerHTML = `
                <div class="receiver-content">
                    <div class="receiver-header">
                        <span class="receiver-title">图像获取状态</span>
                        <div class="receiver-status" id="receiver-status">
                            <div class="status-indicator idle"></div>
                            <span class="status-text">空闲</span>
                        </div>
                    </div>
                    <div class="receiver-info">
                        <div class="info-item">
                            <span class="info-label">获取数量:</span>
                            <span class="info-value" id="get-count">0</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">最后获取:</span>
                            <span class="info-value" id="get-time">--:--:--</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">缓存状态:</span>
                            <span class="info-value" id="cache-status">未知</span>
                        </div>
                    </div>
                    <div class="receiver-controls">
                        <button class="refresh-button" id="refresh-cache-status" title="刷新缓存状态">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="23 4 23 10 17 10"></polyline>
                                <polyline points="1 20 1 14 7 14"></polyline>
                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                            </svg>
                            <span>刷新</span>
                        </button>
                    </div>
                </div>
            `;

            // 添加到节点的自定义widget
            this.addDOMWidget("receiver_ui", "div", container);
            this.customUI = container;

            // 绑定事件
            this.bindUIEvents();

            // 监听缓存更新事件
            this.setupCacheListener();

            // 初始刷新缓存状态
            setTimeout(() => {
                this.refreshCacheStatus();
            }, 500);

            return result;
        };

        /**
         * 添加样式
         */
        nodeType.prototype.addStyles = function() {
            if (document.querySelector('#image-receiver-styles')) return;

            const style = document.createElement('style');
            style.id = 'image-receiver-styles';
            style.textContent = `
                .image-receiver-container {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    background: #1e1e2e;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    overflow: hidden;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    font-size: 12px;
                    color: #E0E0E0;
                    padding: 8px;
                }

                .receiver-content {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .receiver-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding-bottom: 6px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }

                .receiver-title {
                    font-weight: 500;
                    color: #B0B0B0;
                }

                .receiver-status {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .status-indicator {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    transition: all 0.2s ease;
                }

                .status-indicator.idle {
                    background: #666;
                }

                .status-indicator.getting {
                    background: #007aff;
                    animation: pulse 1s infinite;
                }

                .status-indicator.success {
                    background: #34c759;
                }

                .status-indicator.error {
                    background: #ff3b30;
                }

                .status-text {
                    color: #B0B0B0;
                    font-size: 11px;
                }

                .receiver-info {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .info-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .info-label {
                    color: #B0B0B0;
                }

                .info-value {
                    color: #E0E0E0;
                    font-weight: 500;
                }

                .receiver-controls {
                    display: flex;
                    justify-content: center;
                    padding-top: 6px;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }

                .refresh-button {
                    background: rgba(0, 122, 255, 0.2);
                    border: 1px solid rgba(0, 122, 255, 0.3);
                    border-radius: 6px;
                    padding: 6px 12px;
                    color: #E0E0E0;
                    cursor: pointer;
                    font-size: 11px;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .refresh-button:hover {
                    background: rgba(0, 122, 255, 0.4);
                    border-color: rgba(0, 122, 255, 0.5);
                }

                .refresh-button svg {
                    stroke: #E0E0E0;
                }

                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }

                .cache-empty {
                    color: #ff9500 !important;
                }

                .cache-available {
                    color: #34c759 !important;
                }
            `;
            document.head.appendChild(style);
        };

        /**
         * 绑定UI事件
         */
        nodeType.prototype.bindUIEvents = function() {
            const refreshButton = this.customUI.querySelector('#refresh-cache-status');
            if (refreshButton) {
                refreshButton.addEventListener('click', () => {
                    this.refreshCacheStatus();
                });
            }
        };

        /**
         * 设置缓存监听器
         */
        nodeType.prototype.setupCacheListener = function() {
            // 监听缓存更新事件
            api.addEventListener("image-cache-update", ({ detail }) => {
                if (detail && detail.cache_info) {
                    this.updateCacheStatusDisplay(detail.cache_info);
                }
            });
        };

        /**
         * 刷新缓存状态
         */
        nodeType.prototype.refreshCacheStatus = function() {
            // 通过API查询当前缓存状态
            this.queryCacheStatus();
        };

        /**
         * 查询缓存状态
         */
        nodeType.prototype.queryCacheStatus = async function() {
            try {
                const response = await api.fetchApi('/image-cache/status', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const cacheInfo = await response.json();
                    this.updateCacheStatusDisplay(cacheInfo);
                } else {
                    console.warn('[ImageReceiver] 无法查询缓存状态');
                    this.setCacheStatusDisplay('未知');
                }
            } catch (error) {
                console.error('[ImageReceiver] 查询缓存状态时出错:', error);
                this.setCacheStatusDisplay('查询失败');
            }
        };

        /**
         * 更新缓存状态显示
         */
        nodeType.prototype.updateCacheStatusDisplay = function(cacheInfo) {
            if (!this.customUI) return;

            const cacheStatusElement = this.customUI.querySelector('#cache-status');
            if (!cacheStatusElement) return;

            if (cacheInfo.count > 0) {
                cacheStatusElement.textContent = `${cacheInfo.count} 张图像可用`;
                cacheStatusElement.className = 'info-value cache-available';
            } else {
                cacheStatusElement.textContent = '缓存为空';
                cacheStatusElement.className = 'info-value cache-empty';
            }
        };

        /**
         * 设置缓存状态显示
         */
        nodeType.prototype.setCacheStatusDisplay = function(status) {
            if (!this.customUI) return;

            const cacheStatusElement = this.customUI.querySelector('#cache-status');
            if (cacheStatusElement) {
                cacheStatusElement.textContent = status;
                cacheStatusElement.className = 'info-value';
            }
        };

        /**
         * 设置获取中状态
         */
        nodeType.prototype.setGettingStatus = function() {
            if (!this.customUI) return;

            const statusIndicator = this.customUI.querySelector('.status-indicator');
            const statusText = this.customUI.querySelector('.status-text');

            this.properties.getStatus = "getting";

            if (statusIndicator) {
                statusIndicator.className = 'status-indicator getting';
            }
            if (statusText) {
                statusText.textContent = '获取中...';
            }

            app.canvas.setDirty(true);
        };

        /**
         * 更新获取状态
         */
        nodeType.prototype.updateGetStatus = function(count, success = true) {
            if (!this.customUI) return;

            const statusIndicator = this.customUI.querySelector('.status-indicator');
            const statusText = this.customUI.querySelector('.status-text');
            const countElement = this.customUI.querySelector('#get-count');
            const timeElement = this.customUI.querySelector('#get-time');

            // 更新属性
            this.properties.lastGetTime = Date.now();
            this.properties.retrievedCount = count;
            this.properties.getStatus = success ? "success" : "error";

            // 更新UI
            if (statusIndicator) {
                statusIndicator.className = `status-indicator ${success ? 'success' : 'error'}`;
            }
            if (statusText) {
                statusText.textContent = success ? '获取成功' : '获取失败';
            }
            if (countElement) {
                countElement.textContent = count;
            }
            if (timeElement) {
                const date = new Date(this.properties.lastGetTime);
                timeElement.textContent = date.toLocaleTimeString();
            }

            console.log(`[ImageReceiver] 获取状态更新: ${count} 张图像, 成功: ${success}`);

            // 2秒后恢复空闲状态
            setTimeout(() => {
                if (statusIndicator) {
                    statusIndicator.className = 'status-indicator idle';
                }
                if (statusText) {
                    statusText.textContent = '空闲';
                }
                this.properties.getStatus = "idle";
            }, 2000);

            app.canvas.setDirty(true);
        };
    }
});