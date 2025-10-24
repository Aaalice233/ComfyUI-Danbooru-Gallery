import { app } from "../../../scripts/app.js";
import { api } from "../../../scripts/api.js";

/**
 * 简易图像对比节点 - 性能优化版
 *
 * 性能优化：
 * 1. 移除 requestAnimationFrame 无限循环，避免持续重绘
 * 2. 鼠标移动事件节流（16ms），减少处理频率
 * 3. 智能重绘触发，只在必要时重绘
 * 4. 缓存图像位置和尺寸计算结果
 * 5. 避免在拖动工作流时触发节点内部处理
 */

// 工具函数：节流
function throttle(func, delay) {
    let lastCall = 0;
    return function (...args) {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            func.apply(this, args);
        }
    };
}

// 图像数据转 URL
function imageDataToUrl(data) {
    return api.apiURL(
        `/view?filename=${encodeURIComponent(data.filename)}&type=${data.type}&subfolder=${data.subfolder}${app.getPreviewFormatParam()}${app.getRandParam()}`
    );
}

class SimpleImageCompare {
    constructor(node) {
        this.node = node;
        this.name = "simple_image_compare_widget";
        this.type = "custom";

        // 状态
        this.isPointerOver = false;
        this.pointerOverPos = [0, 0];
        this.imageIndex = 0;

        // 图像数据
        this.value = { images: [] };
        this.selected = [];
        this.imgs = [];
        this.hitAreas = {};

        // 缓存
        this.cachedDrawData = null;
        this.lastNodeSize = null;

        // 性能优化：节流的鼠标移动处理
        this.throttledMouseMove = throttle(this.handleMouseMove.bind(this), 16); // ~60fps
    }

    // 处理执行输出
    onExecuted(output) {
        if ("images" in output) {
            this.setValue({
                images: (output.images || []).map((d, i) => ({
                    name: i === 0 ? "A" : "B",
                    selected: true,
                    url: imageDataToUrl(d),
                }))
            });
        } else {
            output.a_images = output.a_images || [];
            output.b_images = output.b_images || [];
            const imagesToChoose = [];
            const multiple = output.a_images.length + output.b_images.length > 2;

            for (const [i, d] of output.a_images.entries()) {
                imagesToChoose.push({
                    name: output.a_images.length > 1 || multiple ? `A${i + 1}` : "A",
                    selected: i === 0,
                    url: imageDataToUrl(d),
                });
            }

            for (const [i, d] of output.b_images.entries()) {
                imagesToChoose.push({
                    name: output.b_images.length > 1 || multiple ? `B${i + 1}` : "B",
                    selected: i === 0,
                    url: imageDataToUrl(d),
                });
            }

            this.setValue({ images: imagesToChoose });
        }
    }

    // 设置值
    setValue(v) {
        let cleanedVal;
        if (Array.isArray(v)) {
            cleanedVal = v.map((d, i) => {
                if (!d || typeof d === "string") {
                    d = { url: d, name: i === 0 ? "A" : "B", selected: true };
                }
                return d;
            });
        } else {
            cleanedVal = v.images || [];
        }

        if (cleanedVal.length > 2) {
            const hasAAndB = cleanedVal.some((i) => i.name.startsWith("A")) &&
                cleanedVal.some((i) => i.name.startsWith("B"));
            if (!hasAAndB) {
                cleanedVal = [cleanedVal[0], cleanedVal[1]];
            }
        }

        let selected = cleanedVal.filter((d) => d.selected);
        if (!selected.length && cleanedVal.length) {
            cleanedVal[0].selected = true;
        }

        selected = cleanedVal.filter((d) => d.selected);
        if (selected.length === 1 && cleanedVal.length > 1) {
            cleanedVal.find((d) => !d.selected).selected = true;
        }

        this.value.images = cleanedVal;
        selected = cleanedVal.filter((d) => d.selected);
        this.setSelected(selected);

        // 清除缓存
        this.cachedDrawData = null;
    }

    // 设置选中的图像
    setSelected(selected) {
        this.value.images.forEach((d) => (d.selected = false));
        this.imgs.length = 0;

        for (const sel of selected) {
            if (!sel.img) {
                sel.img = new Image();
                sel.img.src = sel.url;
                this.imgs.push(sel.img);
            }
            sel.selected = true;
        }

        this.selected = selected;
        this.cachedDrawData = null; // 清除缓存
    }

    // 鼠标进入节点
    onMouseEnter(event) {
        this.isPointerOver = true;
        // 只标记需要重绘，不触发全局重绘
        this.node.setDirtyCanvas(true, false);
    }

    // 鼠标离开节点
    onMouseLeave(event) {
        this.isPointerOver = false;
        this.imageIndex = 0;
        // 离开时重绘一次以清除滑动效果
        this.node.setDirtyCanvas(true, false);
    }

    // 鼠标移动处理（节流后）
    handleMouseMove(pos) {
        if (!this.isPointerOver) return;

        const oldPos = this.pointerOverPos[0];
        this.pointerOverPos = [...pos];
        this.imageIndex = this.pointerOverPos[0] > this.node.size[0] / 2 ? 1 : 0;

        // 只有位置真正改变时才重绘
        if (Math.abs(oldPos - this.pointerOverPos[0]) > 1) {
            this.node.setDirtyCanvas(true, false);
        }
    }

    // 鼠标移动（使用节流）
    onMouseMove(event, pos, canvas) {
        this.throttledMouseMove(pos);
    }

    // 选择框点击处理
    onSelectionDown(event, pos, bounds) {
        const selected = [...this.selected];
        if (bounds?.data.name.startsWith("A")) {
            selected[0] = bounds.data;
        } else if (bounds?.data.name.startsWith("B")) {
            selected[1] = bounds.data;
        }
        this.setSelected(selected);
        this.node.setDirtyCanvas(true, false);
    }

    // 绘制函数
    draw(ctx, node, width, y) {
        this.hitAreas = {};

        // 绘制图像选择器（如果有多个图像）
        if (this.value.images.length > 2) {
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.font = `14px Arial`;

            const drawData = [];
            const spacing = 5;
            let x = 0;

            for (const img of this.value.images) {
                const textWidth = ctx.measureText(img.name).width;
                drawData.push({
                    img,
                    text: img.name,
                    x,
                    width: textWidth,
                });
                x += textWidth + spacing;
            }

            x = (node.size[0] - (x - spacing)) / 2;

            for (const d of drawData) {
                ctx.fillStyle = d.img.selected ? "rgba(180, 180, 180, 1)" : "rgba(180, 180, 180, 0.5)";
                ctx.fillText(d.text, x, y);
                this.hitAreas[d.text] = {
                    bounds: [x, y, d.width, 14],
                    data: d.img,
                    onDown: this.onSelectionDown.bind(this),
                };
                x += d.width + spacing;
            }

            y += 20;
        }

        // 绘制图像对比（滑动模式）
        this.drawImage(ctx, this.selected[0], y);
        if (this.isPointerOver && this.selected[1]) {
            this.drawImage(ctx, this.selected[1], y, this.pointerOverPos[0]);
        }
    }

    // 绘制单个图像
    drawImage(ctx, image, y, cropX) {
        if (!image?.img?.naturalWidth || !image?.img?.naturalHeight) {
            return;
        }

        const [nodeWidth, nodeHeight] = this.node.size;

        // 检查是否需要重新计算（节点大小改变）
        const needsRecalc = !this.lastNodeSize ||
                           this.lastNodeSize[0] !== nodeWidth ||
                           this.lastNodeSize[1] !== nodeHeight;

        if (needsRecalc) {
            this.lastNodeSize = [nodeWidth, nodeHeight];
            this.cachedDrawData = null;
        }

        // 缓存图像布局计算
        if (!this.cachedDrawData || this.cachedDrawData.imageUrl !== image.url) {
            const imageAspect = image.img.naturalWidth / image.img.naturalHeight;
            const height = nodeHeight - y;
            const widgetAspect = nodeWidth / height;

            let targetWidth, targetHeight, offsetX = 0;

            if (imageAspect > widgetAspect) {
                targetWidth = nodeWidth;
                targetHeight = nodeWidth / imageAspect;
            } else {
                targetHeight = height;
                targetWidth = height * imageAspect;
                offsetX = (nodeWidth - targetWidth) / 2;
            }

            this.cachedDrawData = {
                imageUrl: image.url,
                targetWidth,
                targetHeight,
                offsetX,
                widthMultiplier: image.img.naturalWidth / targetWidth,
                destX: (nodeWidth - targetWidth) / 2,
                destY: y + (height - targetHeight) / 2,
            };
        }

        const {
            targetWidth,
            targetHeight,
            offsetX,
            widthMultiplier,
            destX,
            destY
        } = this.cachedDrawData;

        // 计算裁剪区域
        const sourceX = 0;
        const sourceY = 0;
        const sourceWidth = cropX != null ? (cropX - offsetX) * widthMultiplier : image.img.naturalWidth;
        const sourceHeight = image.img.naturalHeight;
        const destWidth = cropX != null ? cropX - offsetX : targetWidth;
        const destHeight = targetHeight;

        // 绘制
        ctx.save();
        ctx.beginPath();

        if (cropX) {
            ctx.rect(destX, destY, destWidth, destHeight);
            ctx.clip();
        }

        ctx.drawImage(
            image.img,
            sourceX, sourceY, sourceWidth, sourceHeight,
            destX, destY, destWidth, destHeight
        );

        // 绘制分界线
        if (cropX != null && cropX >= (nodeWidth - targetWidth) / 2 && cropX <= targetWidth + offsetX) {
            ctx.beginPath();
            ctx.moveTo(cropX, destY);
            ctx.lineTo(cropX, destY + destHeight);
            ctx.globalCompositeOperation = "difference";
            ctx.strokeStyle = "rgba(255,255,255, 1)";
            ctx.stroke();
        }

        ctx.restore();
    }

    // 计算控件大小
    computeSize(width) {
        return [width, 20];
    }

    // 序列化值
    serializeValue() {
        const v = [];
        for (const data of this.value.images) {
            const d = { ...data };
            delete d.img;
            v.push(d);
        }
        return { images: v };
    }
}

// 注册节点
app.registerExtension({
    name: "simple_image_compare",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "SimpleImageCompare") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;

            nodeType.prototype.onNodeCreated = function () {
                const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;

                this.serialize_widgets = true;
                const widget = new SimpleImageCompare(this);
                this.addCustomWidget(widget);

                // 设置节点初始大小
                this.setSize(this.computeSize());

                return r;
            };

            // 鼠标事件处理
            const onMouseEnter = nodeType.prototype.onMouseEnter;
            nodeType.prototype.onMouseEnter = function (event) {
                const r = onMouseEnter ? onMouseEnter.apply(this, arguments) : undefined;
                const widget = this.widgets?.find(w => w instanceof SimpleImageCompare);
                if (widget) {
                    widget.onMouseEnter(event);
                }
                return r;
            };

            const onMouseLeave = nodeType.prototype.onMouseLeave;
            nodeType.prototype.onMouseLeave = function (event) {
                const r = onMouseLeave ? onMouseLeave.apply(this, arguments) : undefined;
                const widget = this.widgets?.find(w => w instanceof SimpleImageCompare);
                if (widget) {
                    widget.onMouseLeave(event);
                }
                return r;
            };

            const onMouseMove = nodeType.prototype.onMouseMove;
            nodeType.prototype.onMouseMove = function (event, pos, canvas) {
                const r = onMouseMove ? onMouseMove.apply(this, arguments) : undefined;
                const widget = this.widgets?.find(w => w instanceof SimpleImageCompare);
                if (widget) {
                    widget.onMouseMove(event, pos, canvas);
                }
                return r;
            };

            // 执行完成处理
            const onExecuted = nodeType.prototype.onExecuted;
            nodeType.prototype.onExecuted = function (output) {
                const r = onExecuted ? onExecuted.apply(this, arguments) : undefined;
                const widget = this.widgets?.find(w => w instanceof SimpleImageCompare);
                if (widget && output) {
                    widget.onExecuted(output);
                }
                return r;
            };

            // 序列化处理
            const onSerialize = nodeType.prototype.onSerialize;
            nodeType.prototype.onSerialize = function (serialised) {
                const r = onSerialize ? onSerialize.apply(this, arguments) : undefined;

                for (let [index, widget] of (this.widgets || []).entries()) {
                    if (widget instanceof SimpleImageCompare) {
                        if (!serialised.widgets_values) {
                            serialised.widgets_values = [];
                        }
                        serialised.widgets_values[index] = widget.serializeValue();
                    }
                }

                return r;
            };
        }
    },
});
