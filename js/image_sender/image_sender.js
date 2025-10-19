/**
 * 图像缓存节点 - Image Cache Node
 * 前端JavaScript实现
 */

import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

app.registerExtension({
    name: "ImageCache",

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== "ImageCache") return;

        // 添加自定义Widget
        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function() {
            const result = onNodeCreated?.apply(this, arguments);

            // 初始化节点属性
            this.properties = {
                cachedCount: 0,
                lastCacheTime: 0,
                cacheStatus: "idle" // idle, caching, success, error
            };

            // 设置节点初始大小
            this.size = [400, 200];

            // 创建自定义UI
            this.createCustomUI();

            return result;
        };

        /**
         * 创建自定义UI界面
         */
        nodeType.prototype.createCustomUI = function() {
            const container = document.createElement('div');
            container.className = 'image-cache-container';

            // 添加样式
            this.addStyles();

            container.innerHTML = `
                <div class="cache-content">
                    <div class="cache-header">
                        <span class="cache-title">图像缓存状态</span>
                        <div class="cache-status" id="cache-status">
                            <div class="status-indicator idle"></div>
                            <span class="status-text">空闲</span>
                        </div>
                    </div>
                    <div class="cache-info">
                        <div class="info-item">
                            <span class="info-label">缓存数量:</span>
                            <span class="info-value" id="cache-count">0</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">最后更新:</span>
                            <span class="info-value" id="cache-time">--:--:--</span>
                        </div>
                    </div>
                </div>
            `;

            // 添加到节点的自定义widget
            this.addDOMWidget("cache_ui", "div", container);
            this.customUI = container;

            // 绑定事件
            this.bindUIEvents();

            // 监听缓存更新事件
            this.setupCacheListener();
        };

        /**
         * 添加样式
         */
        nodeType.prototype.addStyles = function() {
            if (document.querySelector('#image-cache-styles')) return;

            const style = document.createElement('style');
            style.id = 'image-cache-styles';
            style.textContent = `
                .image-cache-container {
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

                .cache-content {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .cache-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding-bottom: 6px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }

                .cache-title {
                    font-weight: 500;
                    color: #B0B0B0;
                }

                .cache-status {
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

                .status-indicator.caching {
                    background: #ff9500;
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

                .cache-info {
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

                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        };

        /**
         * 绑定UI事件
         */
        nodeType.prototype.bindUIEvents = function() {
            // UI相关事件可以在这里添加
        };

        /**
         * 设置缓存监听器
         */
        nodeType.prototype.setupCacheListener = function() {
            // 监听缓存更新事件
            api.addEventListener("image-cache-update", ({ detail }) => {
                if (detail && detail.cache_info) {
                    this.updateCacheStatus(detail.cache_info);
                }
            });
        };

        /**
         * 更新缓存状态
         */
        nodeType.prototype.updateCacheStatus = function(cacheInfo) {
            if (!this.customUI) return;

            const statusIndicator = this.customUI.querySelector('.status-indicator');
            const statusText = this.customUI.querySelector('.status-text');
            const countElement = this.customUI.querySelector('#cache-count');
            const timeElement = this.customUI.querySelector('#cache-time');

            // 更新属性
            this.properties.cachedCount = cacheInfo.count;
            this.properties.lastCacheTime = cacheInfo.timestamp;
            this.properties.cacheStatus = "success";

            // 更新UI
            if (statusIndicator) {
                statusIndicator.className = 'status-indicator success';
            }
            if (statusText) {
                statusText.textContent = '缓存成功';
            }
            if (countElement) {
                countElement.textContent = cacheInfo.count;
            }
            if (timeElement) {
                const date = new Date(cacheInfo.timestamp);
                timeElement.textContent = date.toLocaleTimeString();
            }

            console.log(`[ImageCache] 缓存状态更新: ${cacheInfo.count} 张图像`);

            // 2秒后恢复空闲状态
            setTimeout(() => {
                if (statusIndicator) {
                    statusIndicator.className = 'status-indicator idle';
                }
                if (statusText) {
                    statusText.textContent = '空闲';
                }
                this.properties.cacheStatus = "idle";
            }, 2000);

            app.canvas.setDirty(true);
        };

        /**
         * 设置缓存中状态
         */
        nodeType.prototype.setCachingStatus = function() {
            if (!this.customUI) return;

            const statusIndicator = this.customUI.querySelector('.status-indicator');
            const statusText = this.customUI.querySelector('.status-text');

            this.properties.cacheStatus = "caching";

            if (statusIndicator) {
                statusIndicator.className = 'status-indicator caching';
            }
            if (statusText) {
                statusText.textContent = '缓存中...';
            }

            app.canvas.setDirty(true);
        };
    }
});