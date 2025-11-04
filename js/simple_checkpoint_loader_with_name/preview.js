/**
 * SimpleCheckpointLoaderWithName 预览图功能
 * 独立实现，无第三方依赖
 */

import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

// 预览图尺寸配置
const IMAGE_WIDTH = 384;
const IMAGE_MAX_HEIGHT = 512; // 最大高度，避免图片过高

// 预览图映射缓存
let previewsCache = null;
let lastCacheTime = 0;
const CACHE_DURATION = 60000; // 缓存60秒

/**
 * 加载预览图映射列表
 */
async function loadPreviewList() {
    const now = Date.now();

    // 使用缓存（60秒内有效）
    if (previewsCache && (now - lastCacheTime) < CACHE_DURATION) {
        console.log("[CheckpointPreview] 使用缓存的预览图列表");
        return previewsCache;
    }

    try {
        console.log("[CheckpointPreview] 开始加载预览图列表...");
        const response = await api.fetchApi("/checkpoint_preview/list");
        const data = await response.json();

        if (data.success) {
            previewsCache = data.previews;
            lastCacheTime = now;
            console.log("[CheckpointPreview] 成功加载预览图列表，共", Object.keys(previewsCache).length, "个模型");
            return previewsCache;
        } else {
            console.error("[CheckpointPreview] 加载预览图列表失败:", data.error);
            return {};
        }
    } catch (error) {
        console.error("[CheckpointPreview] 加载预览图列表异常:", error);
        return {};
    }
}

/**
 * 计算预览图的最佳显示位置
 */
function calculateImagePosition(targetElement, bodyRect, imageWidth, imageHeight) {
    const { top, left, right } = targetElement.getBoundingClientRect();
    const { width: bodyWidth, height: bodyHeight } = bodyRect;

    // 检查右侧是否有足够空间
    const isSpaceRight = right + imageWidth <= bodyWidth;
    let finalLeft = isSpaceRight ? right : left - imageWidth;

    // 计算垂直位置（居中对齐目标元素）
    let finalTop = top - imageHeight / 2;

    // 边界检查：防止超出屏幕
    if (finalTop + imageHeight > bodyHeight) {
        finalTop = bodyHeight - imageHeight;
    }
    if (finalTop < 0) {
        finalTop = 0;
    }

    return {
        left: Math.round(finalLeft),
        top: Math.round(finalTop),
        isLeft: !isSpaceRight
    };
}

/**
 * 显示预览图
 */
function showPreview(targetElement, imageUrl, previewImage) {
    console.log("[CheckpointPreview] 显示预览图:", imageUrl);
    const bodyRect = document.body.getBoundingClientRect();
    if (!bodyRect) return;

    // 先设置图片源
    previewImage.src = imageUrl;

    // 等待图片加载完成后再定位（确保获取到正确的尺寸）
    previewImage.onload = () => {
        // 获取图片的原始尺寸
        const naturalWidth = previewImage.naturalWidth;
        const naturalHeight = previewImage.naturalHeight;

        // 计算在约束条件下的实际显示尺寸
        let displayWidth = naturalWidth;
        let displayHeight = naturalHeight;

        // 应用最大宽度约束
        if (displayWidth > IMAGE_WIDTH) {
            const ratio = IMAGE_WIDTH / displayWidth;
            displayWidth = IMAGE_WIDTH;
            displayHeight = displayHeight * ratio;
        }

        // 应用最大高度约束
        if (displayHeight > IMAGE_MAX_HEIGHT) {
            const ratio = IMAGE_MAX_HEIGHT / displayHeight;
            displayHeight = IMAGE_MAX_HEIGHT;
            displayWidth = displayWidth * ratio;
        }

        // 设置图片的实际显示尺寸
        previewImage.style.width = `${Math.round(displayWidth)}px`;
        previewImage.style.height = `${Math.round(displayHeight)}px`;

        console.log(`[CheckpointPreview] 图片尺寸 - 原始: ${naturalWidth}x${naturalHeight}, 显示: ${Math.round(displayWidth)}x${Math.round(displayHeight)}`);

        const { left, top, isLeft } = calculateImagePosition(targetElement, bodyRect, displayWidth, displayHeight);

        previewImage.style.left = `${left}px`;
        previewImage.style.top = `${top}px`;

        // 根据位置调整图片对齐方式
        if (isLeft) {
            previewImage.classList.add("left");
        } else {
            previewImage.classList.remove("left");
        }
    };

    document.body.appendChild(previewImage);
}

/**
 * 隐藏预览图
 */
function hidePreview(previewImage) {
    if (previewImage.parentNode) {
        previewImage.parentNode.removeChild(previewImage);
    }
}

/**
 * 为下拉菜单项添加预览处理器
 */
async function attachPreviewHandlers(menu, previewImage) {
    console.log("[CheckpointPreview] 开始附加预览处理器");
    const previews = await loadPreviewList();
    const items = menu.querySelectorAll(".litemenu-entry");
    console.log("[CheckpointPreview] 找到", items.length, "个菜单项");

    let foundCount = 0;
    items.forEach(item => {
        const modelName = item.getAttribute("data-value")?.trim();
        if (!modelName) {
            console.log("[CheckpointPreview] 菜单项缺少data-value属性");
            return;
        }

        // 检查是否有预览图
        if (previews[modelName]) {
            foundCount++;
            const imageUrl = previews[modelName];
            console.log("[CheckpointPreview] 找到预览图:", modelName, "->", imageUrl);

            // 添加视觉指示器（小星号）
            const indicator = document.createTextNode(" ★");
            item.appendChild(indicator);

            // 鼠标悬停显示预览
            item.addEventListener("mouseover", () => {
                console.log("[CheckpointPreview] 鼠标悬停:", modelName);
                showPreview(item, imageUrl, previewImage);
            }, { passive: true });

            // 鼠标离开隐藏预览
            item.addEventListener("mouseout", () => {
                console.log("[CheckpointPreview] 鼠标离开:", modelName);
                hidePreview(previewImage);
            }, { passive: true });

            // 点击时也隐藏预览
            item.addEventListener("click", () => {
                hidePreview(previewImage);
            }, { passive: true });
        }
    });
    console.log("[CheckpointPreview] 共为", foundCount, "个模型添加了预览功能");
}

/**
 * 注册ComfyUI扩展
 */
app.registerExtension({
    name: "danbooru.SimpleCheckpointLoaderPreview",

    async init(app) {
        // 添加CSS样式
        const style = document.createElement("style");
        style.textContent = `
            .checkpoint-preview-image {
                position: fixed;
                left: 0;
                top: 0;
                z-index: 9999;
                pointer-events: none;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 4px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
                background: transparent;
                animation: fadeIn 0.15s ease-in;
            }

            @keyframes fadeIn {
                from {
                    opacity: 0;
                    transform: scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }
        `;
        document.head.appendChild(style);

        // 创建预览图元素（复用）
        const previewImage = document.createElement("img");
        previewImage.className = "checkpoint-preview-image";

        // 监听DOM变化，检测下拉菜单打开
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                // 检测菜单关闭（移除预览图）
                for (const removed of mutation.removedNodes) {
                    if (removed.classList?.contains("litecontextmenu")) {
                        console.log("[CheckpointPreview] 菜单关闭");
                        hidePreview(previewImage);
                    }
                }

                // 检测菜单打开
                for (const added of mutation.addedNodes) {
                    if (added.classList?.contains("litecontextmenu")) {
                        console.log("[CheckpointPreview] 检测到菜单打开");
                        const widget = app.canvas.getWidgetAtCursor?.();
                        console.log("[CheckpointPreview] 当前widget:", widget?.name);

                        // 检查是否为 ckpt_name widget
                        if (widget?.name === "ckpt_name") {
                            // 通过多种方式尝试找到widget所属的节点
                            const node = widget.node ||
                                        widget.parent ||
                                        app.canvas.current_node ||
                                        app.canvas.node_over;

                            console.log("[CheckpointPreview] 找到节点:", node?.comfyClass || node?.type);

                            // 只处理 SimpleCheckpointLoaderWithName 节点
                            if (node && node.comfyClass === "SimpleCheckpointLoaderWithName") {
                                console.log("[CheckpointPreview] ✓ 确认是SimpleCheckpointLoaderWithName节点，开始处理");
                                requestAnimationFrame(() => {
                                    // 检查是否有筛选输入框（用于区分下拉菜单和右键菜单）
                                    const hasFilter = added.querySelector(".comfy-context-menu-filter");
                                    console.log("[CheckpointPreview] 筛选输入框存在:", !!hasFilter);
                                    if (!hasFilter) return;

                                    attachPreviewHandlers(added, previewImage);
                                });
                            } else {
                                console.log("[CheckpointPreview] ✗ 不是SimpleCheckpointLoaderWithName节点，跳过");
                            }
                        }
                        return;
                    }
                }
            }
        });

        // 开始监听
        observer.observe(document.body, {
            childList: true,
            subtree: false
        });

        console.log("[CheckpointPreview] ✓ 预览功能已加载");

        // 刷新时清除缓存
        const originalRefresh = app.refreshComboInNodes;
        if (originalRefresh) {
            app.refreshComboInNodes = async function() {
                previewsCache = null;  // 清除缓存
                lastCacheTime = 0;
                return await originalRefresh.apply(this, arguments);
            };
        }
    }
});
