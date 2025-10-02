// Canvas蒙版编辑器组件
class MaskEditor {
    constructor(editor) {
        this.editor = editor;
        this.container = editor.container.querySelector('.mce-mask-editor');
        this.canvas = null;
        this.ctx = null;
        this.masks = [];
        this.selectedMask = null;
        this.isDragging = false;
        this.isResizing = false;
        this.dragStart = { x: 0, y: 0 };
        this.resizeHandle = null;
        this.viewport = { x: 0, y: 0, width: 1, height: 1 };
        this.scale = 1;
        this.offset = { x: 0, y: 0 };
        this.pendingPreviewResize = null;

        // 添加拖拽状态管理
        this.dragStart = null;
        this.initialMaskPosition = null;
        this.initialMaskState = null;


        this.init();
    }

    init() {
        this.createCanvas();
        this.bindCanvasEvents();
        this.bindKeyboardEvents();
        this.startRenderLoop();

        // 添加延迟初始化，确保在DOM完全加载后进行
        setTimeout(() => {
            this.forceInitialRender();
        }, 1500);
    }

    createCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'mce-canvas';
        this.ctx = this.canvas.getContext('2d');

        // 设置Canvas样式
        this.canvas.style.cssText = `
            width: 100%;
            height: 100%;
            cursor: crosshair;
            background: #1a1a1a;
            display: block !important;
            visibility: visible !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            z-index: 1 !important;
        `;

        // 确保容器样式正确
        this.container.style.cssText = `
            position: relative !important;
            width: 100% !important;
            height: 100% !important;
            overflow: auto !important;
            background: #1a1a1a !important;
        `;

        // 添加调试日志
        // console.log('=== 蒙版编辑器容器初始化 ===');
        // console.log('容器初始样式:', this.container.style.cssText);
        // console.log('容器初始尺寸:', {
        //     width: this.container.offsetWidth,
        //     height: this.container.offsetHeight
        // });

        this.container.appendChild(this.canvas);

        // 监听容器大小变化
        this.resizeObserver = new ResizeObserver((entries) => {
            // 如果正在拖动或调整大小，不处理容器大小变化
            if (this.isDragging || this.isResizing || this.isPanning) {
                return;
            }

            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                // 确保容器尺寸有效
                if (width > 0 && height > 0) {
                    this.resizeCanvas();
                    this.scheduleRender();

                    // 添加延迟渲染，确保在DOM完全更新后渲染
                    setTimeout(() => {
                        this.resizeCanvas();
                        this.scheduleRender();
                    }, 50);
                }
            }
        });
        this.resizeObserver.observe(this.container);

        this.resizeCanvas();

        // 初始渲染
        this.scheduleRender();

        // 添加延迟渲染作为备份，确保在DOM完全加载后渲染
        setTimeout(() => {
            this.resizeCanvas();
            this.scheduleRender();
        }, 500);

        // 添加更多延迟渲染，确保容器完全可见
        setTimeout(() => {
            this.resizeCanvas();
            this.scheduleRender();
        }, 1000);
    }

    resizeCanvas(preserveTransform = false) {
        // console.log('=== resizeCanvas 调试开始 ===');
        const rect = this.container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        // 防止异常的DPR值 - 限制DPR为1以避免高DPR导致的渲染问题
        const safeDpr = 1; // 强制使用1，避免高DPR设备上的渲染问题

        // 确保容器尺寸有效，如果无效则使用默认尺寸
        if (rect.width <= 0 || rect.height <= 0 || !isFinite(rect.width) || !isFinite(rect.height)) {
            // 使用默认尺寸作为回退
            rect.width = 800;
            rect.height = 600;
        }

        // 限制最大尺寸，防止异常值
        const maxWidth = 2048; // 降低最大尺寸限制
        const maxHeight = 2048;
        const safeWidth = Math.min(rect.width, maxWidth);
        const safeHeight = Math.min(rect.height, maxHeight);

        // console.log('容器尺寸信息:', {
        //     原始尺寸: { width: rect.width, height: rect.height },
        //     安全尺寸: { width: safeWidth, height: safeHeight },
        //     画布元素: { width: this.canvas.width, height: this.canvas.height },
        //     保留变换: preserveTransform
        // });

        // 保存当前的缩放和偏移状态
        const oldScale = this.scale;
        const oldOffsetX = this.offset.x;
        const oldOffsetY = this.offset.y;

        // 设置实际尺寸 - 使用较低的分辨率以提高性能
        this.canvas.width = safeWidth * safeDpr;
        this.canvas.height = safeHeight * safeDpr;

        // 缩放上下文以适应设备像素比
        this.ctx.scale(safeDpr, safeDpr);

        // 确保画布填充整个容器
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';

        // 计算缩放比例
        const config = this.editor.dataManager.getConfig();
        if (!config || !config.canvas) {
            // 使用默认配置
            this.scale = 1;
            this.offset = { x: 0, y: 0 };
            // console.log('使用默认配置:', { scale: this.scale, offset: this.offset });
            return;
        }

        const canvasWidth = config.canvas.width;
        const canvasHeight = config.canvas.height;

        // console.log('虚拟画布配置:', {
        //     虚拟画布尺寸: { width: canvasWidth, height: canvasHeight },
        //     当前缩放: oldScale,
        //     当前偏移: { x: oldOffsetX, y: oldOffsetY }
        // });

        // 如果preserveTransform为true，保持当前的变换状态
        if (preserveTransform) {
            // 保持当前的缩放比例，但调整偏移量以适应新的画布大小
            // 计算画布中心点的位置
            const centerX = oldOffsetX + (this.canvas.width / safeDpr) / 2;
            const centerY = oldOffsetY + (this.canvas.height / safeDpr) / 2;

            // 计算新的偏移量，保持画布中心点不变
            this.offset.x = centerX - (safeWidth) / 2;
            this.offset.y = centerY - (safeHeight) / 2;

            // 限制偏移量，防止画布漂移太远
            const maxOffsetX = safeWidth * 0.8;
            const maxOffsetY = safeHeight * 0.8;
            this.offset.x = Math.max(-maxOffsetX, Math.min(maxOffsetX, this.offset.x));
            this.offset.y = Math.max(-maxOffsetY, Math.min(maxOffsetY, this.offset.y));
        } else {
            // 如果当前的缩放比例是默认值（1），则重新计算适应屏幕的缩放比例
            // 否则保持当前的缩放比例，让用户可以继续使用滚轮缩放
            if (Math.abs(oldScale - 1) < 0.01) {
                // 计算缩放比例，使虚拟画布完全适应实际画布
                this.scale = Math.min(safeWidth / canvasWidth, safeHeight / canvasHeight);

                // 居中显示
                this.offset.x = (safeWidth - canvasWidth * this.scale) / 2;
                this.offset.y = (safeHeight - canvasHeight * this.scale) / 2;
            } else {
                // 保持当前的缩放比例，但调整偏移量以适应新的画布大小
                // 计算画布中心点的位置
                const centerX = oldOffsetX + (this.canvas.width / safeDpr) / 2;
                const centerY = oldOffsetY + (this.canvas.height / safeDpr) / 2;

                // 计算新的偏移量，保持画布中心点不变
                this.offset.x = centerX - (safeWidth) / 2;
                this.offset.y = centerY - (safeHeight) / 2;

                // 限制偏移量，防止画布漂移太远
                const maxOffsetX = safeWidth * 0.8;
                const maxOffsetY = safeHeight * 0.8;
                this.offset.x = Math.max(-maxOffsetX, Math.min(maxOffsetX, this.offset.x));
                this.offset.y = Math.max(-maxOffsetY, Math.min(maxOffsetY, this.offset.y));
            }
        }

        // console.log('计算后的缩放和偏移:', {
        //     新缩放: this.scale,
        //     新偏移: this.offset,
        //     可视区域: {
        //         x: -this.offset.x / this.scale,
        //         y: -this.offset.y / this.scale,
        //         width: safeWidth / this.scale,
        //         height: safeHeight / this.scale
        //     }
        // });

        // 强制重新渲染，确保画布内容正确显示
        this.scheduleRender();
        // console.log('=== resizeCanvas 调试结束 ===');
    }

    bindCanvasEvents() {
        // 鼠标事件
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        // 重新启用滚轮事件绑定，恢复画布缩放功能
        this.canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
        this.canvas.addEventListener('contextmenu', this.onContextMenu.bind(this));

        // 触摸事件（移动设备支持）
        this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this));

        // 失去焦点时清除选择
        this.canvas.addEventListener('blur', () => {
            this.selectedMask = null;
        });
    }

    bindKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            if (!this.selectedMask) return;

            const stepSize = e.shiftKey ? 10 : 1;
            const mask = this.selectedMask;
            const updates = {};

            // 获取配置
            const config = this.editor.dataManager.getConfig();
            const canvasConfig = config.canvas;

            // 计算步长
            let step = 0.01; // 默认步长
            if (canvasConfig) {
                step = 1 / Math.max(canvasConfig.width, canvasConfig.height);
            }

            switch (e.key) {
                // 移除 Delete 和 Backspace 键的快捷键处理
                // case 'Delete':
                // case 'Backspace':
                //     e.preventDefault();
                //     this.deleteMask(mask.characterId);
                //     break;

                case 'ArrowLeft':
                    e.preventDefault();
                    updates.x = Math.max(0, mask.x - step * stepSize);
                    break;

                case 'ArrowRight':
                    e.preventDefault();
                    updates.x = Math.min(1 - mask.width, mask.x + step * stepSize);
                    break;

                case 'ArrowUp':
                    e.preventDefault();
                    updates.y = Math.max(0, mask.y - step * stepSize);
                    break;

                case 'ArrowDown':
                    e.preventDefault();
                    updates.y = Math.min(1 - mask.height, mask.y + step * stepSize);
                    break;

                case '+':
                case '=':
                    e.preventDefault();
                    updates.width = Math.min(1 - mask.x, mask.width + step * stepSize);
                    updates.height = Math.min(1 - mask.y, mask.height + step * stepSize);
                    break;

                case '-':
                case '_':
                    e.preventDefault();
                    updates.width = Math.max(0.05, mask.width - step * stepSize);
                    updates.height = Math.max(0.05, mask.height - step * stepSize);
                    break;


            }

            if (Object.keys(updates).length > 0) {
                this.updateMask(mask.characterId, { ...mask, ...updates });
            }
        });
    }


    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const mask = this.getMaskAtPosition(x, y);

        // console.log('MaskEditor调试:onMouseDown', {
        //     pointer: { x, y },
        //     offset: { ...this.offset },
        //     scale: this.scale,
        //     maskFound: !!mask
        // });

        if (mask) {
            this.selectedMask = mask;
            const handle = this.getResizeHandle(mask, x, y);

            if (handle) {
                this.isResizing = true;
                this.resizeHandle = handle;
                this.dragStart = { x, y };

                // console.log('MaskEditor调试:开始缩放', {
                //     handle,
                //     dragStart: this.dragStart,
                //     maskSnapshot: { ...mask }
                // });

                // 保存初始蒙版状态用于调整大小
                this.initialMaskState = { ...mask };

                // 临时禁用 ResizeObserver，防止干扰拖动操作
                if (this.resizeObserver) {
                    this.resizeObserver.disconnect();
                    // console.log('临时禁用 ResizeObserver');
                }
            } else {
                this.isDragging = true;
                // 获取画布配置
                const config = this.editor.dataManager.getConfig();
                if (config && config.canvas) {
                    const { width, height } = config.canvas;
                    // 修正拖拽起始位置计算
                    this.dragStart = {
                        x: x - (mask.x * width * this.scale) - this.offset.x,
                        y: y - (mask.y * height * this.scale) - this.offset.y
                    };
                    // 保存初始位置用于网格对齐计算
                    this.initialMaskPosition = { x: mask.x, y: mask.y };
                } else {
                    this.dragStart = { x, y };
                    this.initialMaskPosition = { x: mask.x, y: mask.y };
                }
            }
        } else {
            // 如果没有点击到蒙版，则开始画布拖拽
            this.selectedMask = null;
            this.isPanning = true;
            this.panStart = { x, y };
            this.initialOffset = { x: this.offset.x, y: this.offset.y };
            this.canvas.style.cursor = 'grab';
        }

        const cursorHandle = this.getResizeHandle(mask, x, y);
        // console.log('MaskEditor调试:光标更新', {
        //     handleCandidate: cursorHandle,
        //     cursor: this.getCursor(mask, cursorHandle)
        // });
        this.canvas.style.cursor = this.getCursor(mask, cursorHandle);
    }

    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.isPanning) {
            // 处理画布拖拽
            const dx = x - this.panStart.x;
            const dy = y - this.panStart.y;

            this.offset.x = this.initialOffset.x + dx;
            this.offset.y = this.initialOffset.y + dy;

            // 不再限制偏移量，允许画布自由移动
            // 这样可以确保画布可以正常移动和缩放

            // 触发重新渲染
            this.scheduleRender();

        } else if (this.isDragging && this.selectedMask) {
            // 获取画布配置
            const config = this.editor.dataManager.getConfig();
            if (!config || !config.canvas) {
                return;
            }

            const { width, height } = config.canvas;

            // 修正坐标计算，确保拖拽平滑
            const newX = (x - this.dragStart.x - this.offset.x) / (this.scale * width);
            const newY = (y - this.dragStart.y - this.offset.y) / (this.scale * height);

            // 使用网格对齐
            let finalX = this.snapToGrid(newX * width) / width;
            let finalY = this.snapToGrid(newY * height) / height;

            // 边界检查
            finalX = Math.max(0, Math.min(1 - this.selectedMask.width, finalX));
            finalY = Math.max(0, Math.min(1 - this.selectedMask.height, finalY));

            // 只有位置真正改变时才更新
            if (Math.abs(finalX - this.selectedMask.x) > 0.001 ||
                Math.abs(finalY - this.selectedMask.y) > 0.001) {
                this.updateMask(this.selectedMask.characterId, {
                    ...this.selectedMask,
                    x: finalX,
                    y: finalY
                });
            }

        } else if (this.isResizing && this.selectedMask) {
            // console.log('onMouseMove: 调整大小中', {
            //     isResizing: this.isResizing,
            //     selectedMask: !!this.selectedMask,
            //     resizeHandle: this.resizeHandle,
            //     mousePosition: { x, y }
            // });

            // 直接调用 handleResize，不添加延迟或其他可能干扰的代码
            this.handleResize(x, y);

        } else {
            // 更新鼠标光标
            const mask = this.getMaskAtPosition(x, y);
            const handle = this.getResizeHandle(mask, x, y);

            if (this.isPanning) {
                this.canvas.style.cursor = 'grabbing';
            } else {
                this.canvas.style.cursor = this.getCursor(mask, handle);
            }
        }
    }

    onMouseUp(e) {
        if (this.isDragging) {
            // 清理拖拽状态
            this.dragStart = null;
            this.initialMaskPosition = null;
        }
        if (this.isResizing) {
            // 清理调整大小状态
            this.resizeHandle = null;
            this.initialMaskState = null;

            // 重新启用 ResizeObserver
            if (this.resizeObserver && this.container) {
                this.resizeObserver.observe(this.container);
                // console.log('重新启用 ResizeObserver');
            }
        }
        if (this.isPanning) {
            // 清理画布拖拽状态
            this.isPanning = false;
            this.panStart = null;
            this.initialOffset = null;
        }
        this.isDragging = false;
        this.isResizing = false;

        if (!this.isDragging && !this.isResizing && !this.isPanning && this.pendingPreviewResize) {
            const pending = this.pendingPreviewResize;
            this.pendingPreviewResize = null;
            // 不再调用 handlePreviewResize，因为它可能会干扰刚刚完成的拖动操作
            // console.log('onMouseUp: 忽略待处理的预览区域大小变化', pending);
        }

        // 强制重新渲染以确保状态正确
        this.scheduleRender();
    }

    onWheel(e) {
        e.preventDefault();

        // 获取画布配置
        const config = this.editor.dataManager.getConfig();
        if (!config || !config.canvas) {
            return;
        }

        // 获取鼠标位置
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // 计算缩放前的画布坐标
        const canvasX = (mouseX - this.offset.x) / this.scale;
        const canvasY = (mouseY - this.offset.y) / this.scale;

        // 计算缩放因子
        const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(0.1, Math.min(5, this.scale * scaleFactor));

        // 如果缩放没有变化，直接返回
        if (newScale === this.scale) {
            return;
        }

        // 计算缩放后的偏移量，使鼠标位置保持不变
        this.offset.x = mouseX - canvasX * newScale;
        this.offset.y = mouseY - canvasY * newScale;
        this.scale = newScale;

        // 不再限制偏移量，允许画布自由移动
        // 这样可以确保画布可以正常移动和缩放

        // 触发重新渲染
        this.scheduleRender();
    }

    onContextMenu(e) {
        e.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const mask = this.getMaskAtPosition(x, y);
        if (mask) {
            this.showContextMenu(mask, e.clientX, e.clientY);
        }
    }

    onTouchStart(e) {
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.canvas.dispatchEvent(mouseEvent);
    }

    onTouchMove(e) {
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.canvas.dispatchEvent(mouseEvent);
    }

    onTouchEnd(e) {
        const mouseEvent = new MouseEvent('mouseup', {});
        this.canvas.dispatchEvent(mouseEvent);
    }

    getMaskAtPosition(x, y) {
        // 转换为画布坐标
        const canvasX = (x - this.offset.x) / this.scale;
        const canvasY = (y - this.offset.y) / this.scale;

        // 获取画布配置
        const config = this.editor.dataManager.getConfig();
        if (!config || !config.canvas) {
            return null;
        }

        const { width, height } = config.canvas;

        // 从后往前遍历，优先选择上层的蒙版
        for (let i = this.masks.length - 1; i >= 0; i--) {
            const mask = this.masks[i];

            // 确保蒙版有必要的属性
            if (!mask || typeof mask.x !== 'number' || typeof mask.y !== 'number' ||
                typeof mask.width !== 'number' || typeof mask.height !== 'number') {
                continue;
            }

            // 计算蒙版在画布上的实际位置和尺寸
            const maskX = mask.x * width;
            const maskY = mask.y * height;
            const maskWidth = mask.width * width;
            const maskHeight = mask.height * height;

            // 增加点击区域容差，提高点击精度
            // 容差应该基于画布坐标，而不是屏幕坐标
            const tolerance = Math.max(2, 4 / this.scale);

            // 检查点击位置是否在蒙版内（增加容差）
            if (canvasX >= maskX - tolerance && canvasX <= maskX + maskWidth + tolerance &&
                canvasY >= maskY - tolerance && canvasY <= maskY + maskHeight + tolerance) {
                return mask;
            }
        }

        return null;
    }

    getResizeHandle(mask, x, y) {
        if (!mask) return null;

        const canvasX = (x - this.offset.x) / this.scale;
        const canvasY = (y - this.offset.y) / this.scale;

        // 获取画布配置
        const config = this.editor.dataManager.getConfig();
        if (!config || !config.canvas) {
            return null;
        }

        const { width, height } = config.canvas;

        // 计算蒙版在画布上的实际位置和尺寸
        const maskX = mask.x * width;
        const maskY = mask.y * height;
        const maskWidth = mask.width * width;
        const maskHeight = mask.height * height;

        // 动态调整手柄大小，确保在不同缩放级别下都能点击
        // 手柄大小应该基于画布坐标，而不是屏幕坐标
        const handleSize = Math.max(8, 16 / this.scale);

        const handles = {
            'nw': { x: maskX, y: maskY },
            'ne': { x: maskX + maskWidth, y: maskY },
            'sw': { x: maskX, y: maskY + maskHeight },
            'se': { x: maskX + maskWidth, y: maskY + maskHeight }
        };

        for (const [name, pos] of Object.entries(handles)) {
            const distance = Math.sqrt(Math.pow(canvasX - pos.x, 2) + Math.pow(canvasY - pos.y, 2));

            // 使用距离检测而不是矩形检测，提高准确性
            if (distance <= handleSize) {
                return name;
            }
        }
        return null;
    }

    getCursor(mask, handle) {
        if (this.isPanning) {
            return 'grabbing';
        }

        if (!mask) return 'grab';

        const cursors = {
            'nw': 'nw-resize',
            'ne': 'ne-resize',
            'sw': 'sw-resize',
            'se': 'se-resize'
        };

        return handle ? cursors[handle] : 'move';
    }

    handleResize(x, y) {
        // console.log('=== handleResize 调试开始 ===');
        // console.log('handleResize 参数:', { x, y });
        // console.log('handleResize 状态:', {
        //     selectedMask: !!this.selectedMask,
        //     resizeHandle: this.resizeHandle,
        //     isResizing: this.isResizing
        // });

        if (!this.selectedMask || !this.resizeHandle) {
            // console.log('handleResize: 缺少必要的参数，返回');
            return;
        }

        // 获取画布配置
        const config = this.editor.dataManager.getConfig();
        if (!config || !config.canvas) {
            return;
        }

        const { width, height } = config.canvas;

        const canvasX = (x - this.offset.x) / this.scale;
        const canvasY = (y - this.offset.y) / this.scale;

        const mask = this.selectedMask;
        const updates = { ...mask };

        // console.log('调整大小前的状态:', {
        //     鼠标位置: { x, y },
        //     画布坐标: { x: canvasX, y: canvasY },
        //     当前蒙版: {
        //         x: mask.x, y: mask.y,
        //         width: mask.width, height: mask.height
        //     },
        //     缩放: this.scale,
        //     偏移: this.offset,
        //     调整手柄: this.resizeHandle
        // });

        // 计算蒙版在画布上的实际位置和尺寸
        const maskX = mask.x * width;
        const maskY = mask.y * height;
        const maskWidth = mask.width * width;
        const maskHeight = mask.height * height;

        // 使用网格对齐的坐标，但限制在画布边界内
        const snappedCanvasX = Math.max(0, Math.min(width, this.snapToGrid(canvasX)));
        const snappedCanvasY = Math.max(0, Math.min(height, this.snapToGrid(canvasY)));

        switch (this.resizeHandle) {
            case 'nw':
                // 确保左上角手柄不会超出画布边界
                updates.width = (maskX + maskWidth - snappedCanvasX) / width;
                updates.height = (maskY + maskHeight - snappedCanvasY) / height;
                updates.x = snappedCanvasX / width;
                updates.y = snappedCanvasY / height;
                break;
            case 'ne':
                // 确保右上角手柄不会超出画布边界
                updates.width = (snappedCanvasX - maskX) / width;
                updates.height = (maskY + maskHeight - snappedCanvasY) / height;
                updates.y = snappedCanvasY / height;
                break;
            case 'sw':
                // 确保左下角手柄不会超出画布边界
                updates.width = (maskX + maskWidth - snappedCanvasX) / width;
                updates.height = (snappedCanvasY - maskY) / height;
                updates.x = snappedCanvasX / width;
                break;
            case 'se':
                // 确保右下角手柄不会超出画布边界
                updates.width = (snappedCanvasX - maskX) / width;
                updates.height = (snappedCanvasY - maskY) / height;
                break;
        }

        // 确保最小尺寸
        updates.width = Math.max(0.05, updates.width);
        updates.height = Math.max(0.05, updates.height);

        // 确保最大尺寸 - 限制蒙版不能超过画布大小
        updates.width = Math.min(updates.width, 1 - updates.x);
        updates.height = Math.min(updates.height, 1 - updates.y);

        // 边界检查
        updates.x = Math.max(0, Math.min(1 - updates.width, updates.x));
        updates.y = Math.max(0, Math.min(1 - updates.height, updates.y));

        // console.log('调整大小后的状态:', {
        //     新蒙版: {
        //         x: updates.x, y: updates.y,
        //         width: updates.width, height: updates.height
        //     },
        //     蒙版像素尺寸: {
        //         x: updates.x * width, y: updates.y * height,
        //         width: updates.width * width, height: updates.height * height
        //     }
        // });

        // 检查蒙版是否会超出可视区域
        const viewportLeft = -this.offset.x / this.scale;
        const viewportTop = -this.offset.y / this.scale;
        const viewportRight = viewportLeft + this.canvas.width / this.scale;
        const viewportBottom = viewportTop + this.canvas.height / this.scale;

        const maskPixelX = updates.x * width;
        const maskPixelY = updates.y * height;
        const maskPixelWidth = updates.width * width;
        const maskPixelHeight = updates.height * height;

        // console.log('可视区域检查:', {
        //     可视区域: { left: viewportLeft, top: viewportTop, right: viewportRight, bottom: viewportBottom },
        //     蒙版像素区域: {
        //         left: maskPixelX, top: maskPixelY,
        //         right: maskPixelX + maskPixelWidth, bottom: maskPixelY + maskPixelHeight
        //     },
        //     超出边界: {
        //         left: maskPixelX < viewportLeft,
        //         top: maskPixelY < viewportTop,
        //         right: maskPixelX + maskPixelWidth > viewportRight,
        //         bottom: maskPixelY + maskPixelHeight > viewportBottom
        //     }
        // });

        // 直接更新选中的蒙版对象
        this.selectedMask = updates;

        // 立即更新本地蒙版数组中的蒙版数据
        const maskIndex = this.masks.findIndex(m => m.characterId === this.selectedMask.characterId);
        if (maskIndex !== -1) {
            this.masks[maskIndex] = updates;
        }

        // 直接通过数据管理器更新蒙版数据，不通过updateMask方法避免被覆盖
        this.editor.dataManager.updateCharacterMask(this.selectedMask.characterId, updates);

        // 只触发重新渲染，不触发画布重新调整
        this.scheduleRender();
        // console.log('=== handleResize 调试结束 ===');
    }

    showContextMenu(mask, x, y) {
        // 移除现有菜单
        const existingMenu = document.querySelector('.mce-context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        const menu = document.createElement('div');
        menu.className = 'mce-context-menu';
        menu.innerHTML = `
            <div class="mce-context-menu-item" data-action="feather">羽化设置</div>
            <div class="mce-context-menu-item" data-action="opacity">透明度设置</div>
            <div class="mce-context-menu-item" data-action="blend">混合模式</div>
            <div class="mce-context-menu-separator"></div>
            <div class="mce-context-menu-item" data-action="duplicate">复制蒙版</div>
            <div class="mce-context-menu-item" data-action="delete">删除蒙版</div>
        `;

        // 添加样式
        menu.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            background: #2a2a2a;
            border: 1px solid #555;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            z-index: 1000;
            min-width: 150px;
            padding: 4px 0;
        `;

        // 添加菜单项样式
        const style = document.createElement('style');
        style.textContent = `
            .mce-context-menu-item {
                padding: 8px 16px;
                cursor: pointer;
                font-size: 12px;
                color: #E0E0E0;
                transition: background 0.2s;
            }
            
            .mce-context-menu-item:hover {
                background: #404040;
            }
            
            .mce-context-menu-separator {
                height: 1px;
                background: #555;
                margin: 4px 0;
            }
        `;
        document.head.appendChild(style);

        // 绑定事件
        menu.querySelectorAll('.mce-context-menu-item').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                this.handleContextMenuAction(mask, action);
                menu.remove();
            });
        });

        document.body.appendChild(menu);

        // 点击其他地方关闭菜单
        setTimeout(() => {
            document.addEventListener('click', () => {
                if (menu.parentNode) {
                    menu.remove();
                }
            }, { once: true });
        }, 100);
    }

    handleContextMenuAction(mask, action) {
        switch (action) {
            case 'feather':
                this.showFeatherDialog(mask);
                break;
            case 'opacity':
                this.showOpacityDialog(mask);
                break;
            case 'blend':
                this.showBlendDialog(mask);
                break;
            case 'duplicate':
                this.duplicateMask(mask);
                break;
            case 'delete':
                this.deleteMask(mask.characterId);
                break;
        }
    }

    showFeatherDialog(mask) {
        const value = mask.feather || 0;
        const newValue = prompt('设置羽化值 (0-50像素):', value);

        if (newValue !== null) {
            const feather = Math.max(0, Math.min(50, parseInt(newValue) || 0));
            this.updateMask(mask.characterId, { ...mask, feather });
        }
    }

    showOpacityDialog(mask) {
        const value = mask.opacity || 100;
        const newValue = prompt('设置透明度 (0-100%):', value);

        if (newValue !== null) {
            const opacity = Math.max(0, Math.min(100, parseInt(newValue) || 100));
            this.updateMask(mask.characterId, { ...mask, opacity });
        }
    }

    showBlendDialog(mask) {
        const blendModes = ['normal', 'multiply', 'screen', 'overlay', 'soft_light', 'hard_light'];
        const currentMode = mask.blend_mode || 'normal';

        const selectedIndex = blendModes.indexOf(currentMode);
        const choice = confirm(`当前混合模式: ${currentMode}\n\n点击"确定"切换到下一个模式，点击"取消"保持当前模式`);

        if (choice) {
            const nextIndex = (selectedIndex + 1) % blendModes.length;
            const nextMode = blendModes[nextIndex];
            this.updateMask(mask.characterId, { ...mask, blend_mode: nextMode });
        }
    }

    duplicateMask(mask) {
        const character = this.editor.dataManager.getCharacter(mask.characterId);
        if (character) {
            const newMask = {
                ...mask,
                x: Math.min(0.9, mask.x + 0.05),
                y: Math.min(0.9, mask.y + 0.05)
            };

            // 创建新角色
            const newCharacter = this.editor.dataManager.addCharacter({
                name: character.name + ' 副本',
                prompt: character.prompt,
                weight: character.weight,
                color: this.editor.dataManager.generateColor(),
                enabled: character.enabled,
                mask: newMask
            });
        }
    }

    addMask(character) {
        // 确保蒙版数组存在
        if (!this.masks) {
            this.masks = [];
        }

        if (!character.mask) {
            // 创建默认蒙版
            const mask = {
                id: this.editor.dataManager.generateId('mask'),
                characterId: character.id,
                x: 0.1 + (this.masks.length * 0.1) % 0.6,
                y: 0.1 + Math.floor(this.masks.length / 6) * 0.3,
                width: 0.3,
                height: 0.3,
                feather: 0,
                opacity: 100,
                blend_mode: 'normal',
                zIndex: this.masks.length
            };

            this.masks.push(mask);
            this.selectedMask = mask;

            // 更新角色的蒙版数据
            this.editor.dataManager.updateCharacterMask(character.id, mask);
        } else {
            // 检查蒙版是否已存在
            const existingMask = this.masks.find(m => m.characterId === character.id);
            if (!existingMask) {
                this.masks.push(character.mask);
            }
            this.selectedMask = character.mask;
        }

        // 强制重新渲染画布
        this.scheduleRender();

        // 添加延迟渲染作为备份，确保在DOM更新后渲染
        setTimeout(() => {
            this.scheduleRender();
        }, 100);
    }

    updateMask(characterId, mask) {
        if (!characterId) {
            return;
        }

        const index = this.masks.findIndex(m => m.characterId === characterId);

        if (index !== -1 && mask) {
            // 检查蒙版是否真的发生了变化
            const existingMask = this.masks[index];
            const hasChanged = !this.masksEqual(existingMask, mask);

            if (hasChanged) {
                this.masks[index] = mask;
                this.selectedMask = mask;

                // 通过dataManager更新蒙版以触发事件
                this.editor.dataManager.updateCharacterMask(characterId, mask);
                this.scheduleRender(); // 强制重新渲染
            }
        } else if (index === -1 && mask) {
            // 如果蒙版不存在，添加新蒙版
            this.masks.push(mask);
            this.selectedMask = mask;

            // 通过dataManager更新蒙版以触发事件
            this.editor.dataManager.updateCharacterMask(characterId, mask);
            this.scheduleRender(); // 强制重新渲染
        }

        // 强制重新渲染
        this.scheduleRender();
    }

    // 比较两个蒙版是否相等
    masksEqual(mask1, mask2) {
        if (!mask1 && !mask2) return true;
        if (!mask1 || !mask2) return false;

        return mask1.x === mask2.x &&
            mask1.y === mask2.y &&
            mask1.width === mask2.width &&
            mask1.height === mask2.height &&
            mask1.feather === mask2.feather &&
            mask1.opacity === mask2.opacity &&
            mask1.blend_mode === mask2.blend_mode;
    }

    removeMask(characterId) {
        this.masks = this.masks.filter(m => m.characterId !== characterId);
        if (this.selectedMask && this.selectedMask.characterId === characterId) {
            this.selectedMask = null;
        }
    }

    deleteMask(characterId) {
        if (confirm('确定要删除这个蒙版吗？')) {
            this.removeMask(characterId);
            this.editor.dataManager.updateCharacterMask(characterId, null);

            // 强制重新渲染确保蒙版被移除
            this.scheduleRender();
        }
    }

    startRenderLoop() {
        // 不再使用无限渲染循环，改为按需渲染
        // 只有在需要时才调用render方法
    }

    scheduleRender() {
        // 使用 requestAnimationFrame 来优化渲染性能
        if (this.renderFrameId) {
            cancelAnimationFrame(this.renderFrameId);
        }
        this.renderFrameId = requestAnimationFrame(() => {
            this.render();
            this.renderFrameId = null;
        });

        // 添加渲染节流，防止过度渲染
        if (this.renderTimeout) {
            clearTimeout(this.renderTimeout);
        }
        this.renderTimeout = setTimeout(() => {
            if (this.renderFrameId) {
                cancelAnimationFrame(this.renderFrameId);
                this.renderFrameId = null;
                this.render();
            }
        }, 16); // 限制最大渲染频率为60fps
    }

    render() {
        // console.log('=== render 调试开始 ===');

        // 检查画布是否已正确初始化
        if (!this.canvas || !this.ctx) {
            // console.log('画布未初始化，跳过渲染');
            return;
        }

        const config = this.editor.dataManager.getConfig();

        // 确保配置存在
        if (!config || !config.canvas) {
            // console.log('配置不存在，跳过渲染');
            return;
        }

        // 强制同步蒙版数据
        this.syncMasksFromCharacters();

        const { width, height } = config.canvas;

        // console.log('渲染参数:', {
        //     虚拟画布尺寸: { width, height },
        //     实际画布尺寸: { width: this.canvas.width, height: this.canvas.height },
        //     容器尺寸: { width: this.container.offsetWidth, height: this.container.offsetHeight },
        //     缩放: this.scale,
        //     偏移: this.offset,
        //     蒙版数量: this.masks.length
        // });

        // 安全检查：防止异常的Canvas尺寸
        if (this.canvas.width <= 0 || this.canvas.height <= 0 ||
            this.canvas.width > 10000 || this.canvas.height > 10000 ||
            !isFinite(this.canvas.width) || !isFinite(this.canvas.height)) {
            // console.log('画布尺寸异常:', {
            //     width: this.canvas.width,
            //     height: this.canvas.height
            // });
            return;
        }

        // 安全检查：防止异常的缩放或偏移
        if (!isFinite(this.scale) || this.scale <= 0 || this.scale > 10 ||
            !isFinite(this.offset.x) || !isFinite(this.offset.y)) {
            // console.log('缩放或偏移异常，重置为默认值');
            this.scale = 1;
            this.offset = { x: 0, y: 0 };
        }

        // 计算可视区域
        const viewportLeft = -this.offset.x / this.scale;
        const viewportTop = -this.offset.y / this.scale;
        const viewportRight = viewportLeft + this.canvas.width / this.scale;
        const viewportBottom = viewportTop + this.canvas.height / this.scale;

        // console.log('可视区域:', {
        //     left: viewportLeft,
        //     top: viewportTop,
        //     right: viewportRight,
        //     bottom: viewportBottom
        // });

        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 保存状态
        this.ctx.save();

        // 应用变换
        this.ctx.translate(this.offset.x, this.offset.y);
        this.ctx.scale(this.scale, this.scale);

        // 绘制背景
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, width, height);

        // 绘制点阵网格
        this.drawGrid(width, height);

        // 绘制圆角带内阴影的边框
        this.drawCanvasBorder(width, height);

        // 绘制蒙版
        this.masks.forEach((mask, index) => {
            // console.log(`绘制蒙版 ${index + 1}/${this.masks.length}:`, mask);
            this.drawMask(mask);
        });

        // 绘制选中框
        if (this.selectedMask) {
            // console.log('绘制选中框:', this.selectedMask);
            this.drawSelection(this.selectedMask);
        }

        // 恢复状态
        this.ctx.restore();

        // 添加右下角分辨率信息
        this.drawResolutionInfo();

        // console.log('=== render 调试结束 ===');
    }

    // 在右下角添加分辨率信息
    drawResolutionInfo() {
        if (!this.canvas || !this.ctx) return;

        // 保存当前状态
        this.ctx.save();

        // 重置变换，确保文字在屏幕坐标中绘制
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);

        const config = this.editor.dataManager.getConfig();

        // 显示缩放比例
        const zoomLevel = Math.round(this.scale * 100);
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = '#CCCCCC';
        this.ctx.textAlign = 'right';
        this.ctx.textBaseline = 'bottom';
        this.ctx.fillText(
            `缩放: ${zoomLevel}%`,
            this.canvas.width - 10,
            this.canvas.height - 10
        );

        // 显示画布分辨率（使用与缩放文本相同的样式）
        if (config && config.canvas) {
            this.ctx.fillText(
                `画布分辨率: ${config.canvas.width}x${config.canvas.height}`,
                this.canvas.width - 10,
                this.canvas.height - 30
            );
        } else {
            this.ctx.fillText(
                '画布分辨率: 未知',
                this.canvas.width - 10,
                this.canvas.height - 30
            );
        }

        // 添加操作提示
        this.ctx.fillText(
            '滚轮缩放 | 拖拽移动',
            this.canvas.width - 10,
            this.canvas.height - 50
        );

        // 恢复状态
        this.ctx.restore();
    }

    // 强制同步蒙版数据
    syncMasksFromCharacters() {
        // 如果正在拖动或调整大小，不要同步蒙版数据，避免覆盖用户的操作
        if (this.isDragging || this.isResizing || this.isPanning) {
            return;
        }

        const characters = this.editor.dataManager.getCharacters();

        const newMasks = characters
            .filter(char => char.mask && char.enabled)
            .map(char => char.mask)
            .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

        // 只有当蒙版数据发生变化时才更新
        if (newMasks.length !== this.masks.length ||
            JSON.stringify(newMasks) !== JSON.stringify(this.masks)) {
            this.masks = newMasks;
        }
    }




    // 绘制点阵网格
    drawGrid(width, height) {
        const gridSize = 32; // 网格大小，32像素一个点
        const dotSize = 2; // 增大点的大小
        const dotColor = '#555555'; // 使用更亮的颜色提高可见性

        this.ctx.fillStyle = dotColor;

        // 绘制点阵
        for (let x = gridSize; x < width; x += gridSize) {
            for (let y = gridSize; y < height; y += gridSize) {
                this.ctx.beginPath();
                this.ctx.arc(x, y, dotSize, 0, 2 * Math.PI);
                this.ctx.fill();
            }
        }
    }

    // 绘制圆角带内阴影的边框
    drawCanvasBorder(width, height) {
        const borderRadius = 8;
        const borderWidth = 2;
        const borderColor = '#666666';

        // 保存当前状态
        this.ctx.save();

        // 设置阴影效果（内阴影）
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 4;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;

        // 绘制圆角矩形边框
        this.ctx.strokeStyle = borderColor;
        this.ctx.lineWidth = borderWidth;

        this.ctx.beginPath();
        this.ctx.moveTo(borderRadius, 0);
        this.ctx.lineTo(width - borderRadius, 0);
        this.ctx.quadraticCurveTo(width, 0, width, borderRadius);
        this.ctx.lineTo(width, height - borderRadius);
        this.ctx.quadraticCurveTo(width, height, width - borderRadius, height);
        this.ctx.lineTo(borderRadius, height);
        this.ctx.quadraticCurveTo(0, height, 0, height - borderRadius);
        this.ctx.lineTo(0, borderRadius);
        this.ctx.quadraticCurveTo(0, 0, borderRadius, 0);
        this.ctx.closePath();

        // 创建内阴影效果
        this.ctx.clip();
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.lineWidth = borderWidth * 2;
        this.ctx.strokeRect(-borderWidth, -borderWidth, width + borderWidth * 2, height + borderWidth * 2);

        // 绘制实际边框
        this.ctx.strokeStyle = borderColor;
        this.ctx.lineWidth = borderWidth;
        this.ctx.strokeRect(0, 0, width, height);

        // 恢复状态
        this.ctx.restore();
    }

    // 获取网格对齐的坐标
    snapToGrid(value) {
        const gridSize = 32; // 与drawGrid中的gridSize保持一致
        return Math.round(value / gridSize) * gridSize;
    }

    drawMask(mask) {
        // console.log('=== drawMask 调试开始 ===');
        // console.log('绘制蒙版:', mask);

        const character = this.editor.dataManager.getCharacter(mask.characterId);
        // console.log('获取到的角色:', character);
        if (!character) {
            // console.log('角色不存在，跳过绘制');
            return;
        }

        const config = this.editor.dataManager.getConfig();
        // console.log('获取到的配置:', config);
        if (!config || !config.canvas) {
            // console.log('配置或画布配置不存在，跳过绘制');
            return;
        }

        const { width, height } = config.canvas;
        // console.log('画布尺寸:', { width, height });

        // 计算实际像素坐标
        const x = mask.x * width;
        const y = mask.y * height;
        const w = mask.width * width;
        const h = mask.height * height;

        // console.log('计算后的蒙版坐标和尺寸:', { x, y, w, h });

        // 设置透明度
        const opacity = (mask.opacity || 100) / 100;
        this.ctx.globalAlpha = opacity;
        // console.log('设置透明度:', opacity);

        // 绘制填充 - 使用半透明样式
        const fillColor = character.color + '40'; // 使用25%不透明度
        // console.log('填充颜色:', fillColor);
        this.ctx.fillStyle = fillColor;
        this.ctx.fillRect(x, y, w, h);

        // 绘制细边框
        const scaledLineWidth = Math.max(0.5, 1 / this.scale);
        this.ctx.strokeStyle = character.color;
        this.ctx.lineWidth = scaledLineWidth;
        this.ctx.strokeRect(x, y, w, h);

        // 重置透明度
        this.ctx.globalAlpha = 1;

        // 绘制标签 - 字体大小也应该考虑缩放因素
        const fontSize = Math.max(12, 16 / this.scale);
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = `bold ${fontSize}px sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(character.name, x + w / 2, y + h / 2);

        // console.log('=== drawMask 调试结束 ===');
    }

    drawSelection(mask) {
        const { width, height } = this.editor.dataManager.getConfig().canvas;

        const x = mask.x * width;
        const y = mask.y * height;
        const w = mask.width * width;
        const h = mask.height * height;

        // 绘制选中边框
        this.ctx.strokeStyle = '#0288D1';
        this.ctx.lineWidth = 2 / this.scale; // 线宽应该考虑缩放因素
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
        this.ctx.setLineDash([]);

        // 绘制调整手柄 - 只显示四个角的圆形实心白点
        const handleRadius = Math.max(4, 8 / this.scale);
        const handles = [
            { x: x, y: y }, // nw
            { x: x + w, y: y }, // ne
            { x: x + w, y: y + h }, // se
            { x: x, y: y + h } // sw
        ];

        this.ctx.fillStyle = '#FFFFFF';
        handles.forEach(handle => {
            this.ctx.beginPath();
            this.ctx.arc(handle.x, handle.y, handleRadius, 0, 2 * Math.PI);
            this.ctx.fill();
        });
    }
    updateUI() {
        // 重新加载蒙版数据
        const characters = this.editor.dataManager.getCharacters();

        this.masks = characters
            .filter(char => char.mask && char.enabled)
            .map(char => char.mask)
            .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

        this.scheduleRender();
    }

    // 强制初始渲染
    forceInitialRender() {
        // console.log('=== forceInitialRender 调试开始 ===');
        // console.log('强制执行初始渲染');

        // 确保蒙版数据是最新的
        this.syncMasksFromCharacters();

        // 强制重新渲染
        this.scheduleRender();

        // 添加额外的延迟渲染
        setTimeout(() => {
            // console.log('执行延迟渲染');
            this.scheduleRender();
        }, 200);

        // console.log('=== forceInitialRender 调试结束 ===');
    }

    // 处理预览区域大小变化（不影响实际画布尺寸）
    handlePreviewResize(width, height) {
        // console.log('=== handlePreviewResize 调试开始 ===');
        // console.log('预览区域大小变化:', { width, height });
        // console.trace('handlePreviewResize 调用堆栈'); // 添加调用堆栈跟踪

        if (!this.container || !width || !height) return;

        if (this.isDragging || this.isResizing || this.isPanning) {
            // 在拖动或调整大小时，完全忽略 handlePreviewResize
            // console.log('handlePreviewResize: 当前存在交互，完全忽略', {
            //     width, height,
            //     isDragging: this.isDragging,
            //     isResizing: this.isResizing,
            //     isPanning: this.isPanning
            // });
            return;
        }

        // 记录变化前的状态
        const oldContainerWidth = this.container.offsetWidth;
        const oldContainerHeight = this.container.offsetHeight;
        const oldCanvasWidth = this.canvas.width;
        const oldCanvasHeight = this.canvas.height;

        // console.log('变化前的状态:', {
        //     容器尺寸: { width: oldContainerWidth, height: oldContainerHeight },
        //     画布尺寸: { width: oldCanvasWidth, height: oldCanvasHeight },
        //     缩放: this.scale,
        //     偏移: this.offset
        // });

        // 更新容器样式：保持 flex 自动扩展，避免缩放交互时重复重算尺寸
        this.container.style.flex = '1 1 0%';
        this.container.style.width = '';
        this.container.style.height = '';
        this.container.style.minWidth = '0';
        this.container.style.minHeight = '0';

        // console.log('设置容器样式:', {
        //     传入尺寸: { width, height },
        //     最终容器尺寸: {
        //         width: this.container.offsetWidth,
        //         height: this.container.offsetHeight
        //     },
        //     容器样式: this.container.style.cssText
        // });

        const mainArea = this.editor.container.querySelector('.mce-main-area');
        if (mainArea) {
            const mainAreaStyles = window.getComputedStyle(mainArea);
            // console.log('预览区域诊断 -> 主区域 overflow 设置:', {
            //     overflowX: mainAreaStyles.overflowX,
            //     overflowY: mainAreaStyles.overflowY
            // });
        }

        // console.log('预览区域诊断 -> 容器滚动信息:', {
        //     clientWidth: this.container.clientWidth,
        //     scrollWidth: this.container.scrollWidth,
        //     clientHeight: this.container.clientHeight,
        //     scrollHeight: this.container.scrollHeight
        // });

        // 重新调整画布大小（只调整显示大小，不改变实际画布尺寸）
        // 保留当前的变换状态，避免覆盖用户的缩放操作
        this.resizeCanvas(true);

        // 强制重新渲染
        this.scheduleRender();

        // 添加延迟渲染，确保在DOM完全更新后渲染
        setTimeout(() => {
            // console.log('延迟渲染前的状态:', {
            //     容器尺寸: {
            //         width: this.container.offsetWidth,
            //         height: this.container.offsetHeight
            //     },
            //     画布尺寸: { width: this.canvas.width, height: this.canvas.height },
            //     容器滚动信息: {
            //         clientWidth: this.container.clientWidth,
            //         scrollWidth: this.container.scrollWidth,
            //         clientHeight: this.container.clientHeight,
            //         scrollHeight: this.container.scrollHeight
            //     },
            //     容器样式: this.container.style.cssText
            // });

            const delayedMainArea = this.editor.container.querySelector('.mce-main-area');
            if (delayedMainArea) {
                const delayedStyles = window.getComputedStyle(delayedMainArea);
                // console.log('预览区域诊断 -> 延迟检查 overflow 设置:', {
                //     overflowX: delayedStyles.overflowX,
                //     overflowY: delayedStyles.overflowY
                // });
            }

            // 保留当前的变换状态，避免覆盖用户的缩放操作
            this.resizeCanvas(true);
            this.scheduleRender();
        }, 100);

        // console.log('=== handlePreviewResize 调试结束 ===');
    }

    // 处理容器大小变化（保留原有方法以防其他地方调用）
    handleContainerResize(width, height) {
        // 直接调用预览区域大小变化方法
        this.handlePreviewResize(width, height);
    }

    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    }
}

// 导出到全局作用域
window.MaskEditor = MaskEditor;







