// 基于原版 ResolutionMaster 简化，移除不需要的功能

import { app } from "/scripts/app.js";

class ResolutionMasterSimplifyCanvas {
    constructor(node) {
        this.node = node;

        // 初始化属性
        this.node.properties = this.node.properties || {};
        this.initializeProperties();

        // 内部状态
        this.node.intpos = { x: 0.5, y: 0.5 };
        this.node.capture = false;
        this.captureMode = null; // 'main', 'width', 'height'

        // UI 状态
        this.hoverElement = null;
        this.dropdownOpen = null;

        // 控制位置
        this.controls = {};

        // 内置 SDXL 预设 - 按分辨率从小到大排序
        this.builtInPresets = {
            '768×1024': { width: 768, height: 1024 },      // 786,432
            '640×1536': { width: 640, height: 1536 },      // 983,040
            '832×1216': { width: 832, height: 1216 },      // 1,011,712
            '896×1152': { width: 896, height: 1152 },      // 1,032,192
            '768×1344': { width: 768, height: 1344 },      // 1,032,192
            '915×1144': { width: 915, height: 1144 },      // 1,046,760
            '1254×836': { width: 1254, height: 836 },      // 1,048,344
            '1024×1024': { width: 1024, height: 1024 },    // 1,048,576
            '1024×1536': { width: 1024, height: 1536 }     // 1,572,864
        };

        // 自定义预设（从服务器加载）
        this.customPresets = {};

        // 对话框状态
        this.dialogOpen = false;

        this.setupNode();
        this.loadSettings();
    }

    initializeProperties() {
        const defaultProperties = {
            width: 1024,
            height: 1024,
            canvas_min_x: 64,
            canvas_max_x: 2048,
            canvas_step_x: 64,
            canvas_min_y: 64,
            canvas_max_y: 2048,
            canvas_step_y: 64,
            selectedPreset: '1024×1024'
        };

        Object.entries(defaultProperties).forEach(([key, defaultValue]) => {
            this.node.properties[key] = this.node.properties[key] ?? defaultValue;
        });
    }

    setupNode() {
        const node = this.node;
        const self = this;

        // 设置节点大小
        node.size = [330, 320];
        node.min_size = [330, 320];

        // 清除输出名称
        if (node.outputs) {
            node.outputs.forEach(output => {
                output.name = output.localized_name = "";
            });
        }

        // 获取 widgets
        const widthWidget = node.widgets?.find(w => w.name === 'width');
        const heightWidget = node.widgets?.find(w => w.name === 'height');

        // 初始化值
        if (widthWidget && heightWidget) {
            node.properties.width = widthWidget.value;
            node.properties.height = heightWidget.value;

            // 初始化画布位置
            node.intpos.x = (widthWidget.value - node.properties.canvas_min_x) /
                (node.properties.canvas_max_x - node.properties.canvas_min_x);
            node.intpos.y = (heightWidget.value - node.properties.canvas_min_y) /
                (node.properties.canvas_max_y - node.properties.canvas_min_y);
        }

        // 存储 widget 引用
        this.widthWidget = widthWidget;
        this.heightWidget = heightWidget;

        // 隐藏所有 widgets
        [widthWidget, heightWidget].forEach(widget => {
            if (widget) {
                widget.hidden = true;
                widget.type = "hidden";
                widget.computeSize = () => [0, -4];
            }
        });

        // 覆盖绘制方法
        node.onDrawForeground = function (ctx) {
            if (this.flags.collapsed) return;
            self.drawInterface(ctx);
        };

        // 鼠标事件处理
        node.onMouseDown = function (e, pos, canvas) {
            if (e.canvasY - this.pos[1] < 0) return false;
            return self.handleMouseDown(e, pos, canvas);
        };

        node.onMouseMove = function (e, pos, canvas) {
            if (!this.capture) {
                self.handleMouseHover(e, pos, canvas);
                return false;
            }
            return self.handleMouseMove(e, pos, canvas);
        };

        node.onMouseUp = function (e) {
            if (!this.capture) return false;
            return self.handleMouseUp(e);
        };

        // 处理节点大小调整，确保最小尺寸
        node.onResize = function (size) {
            // 强制限制最小尺寸
            if (size[0] < this.min_size[0]) {
                size[0] = this.min_size[0];
            }
            if (size[1] < this.min_size[1]) {
                size[1] = this.min_size[1];
            }
            app.graph.setDirtyCanvas(true);
        };
    }

    async loadSettings() {
        try {
            const response = await fetch('/danbooru_gallery/resolution_simplify/load_settings');
            if (response.ok) {
                const data = await response.json();
                if (data.status === 'success') {
                    const settings = data.settings;
                    this.customPresets = settings.custom_presets || {};
                }
            }
        } catch (error) {
            console.error('[ResolutionMasterSimplify] 加载设置失败:', error);
        }
    }

    async saveSettings() {
        try {
            const settings = {
                custom_presets: this.customPresets
            };

            const response = await fetch('/danbooru_gallery/resolution_simplify/save_settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings })
            });

            return response.ok;
        } catch (error) {
            console.error('[ResolutionMasterSimplify] 保存设置失败:', error);
            return false;
        }
    }

    getAllPresets() {
        // 将自定义预设转换为带分辨率的显示格式
        const formattedCustomPresets = {};
        for (const [name, preset] of Object.entries(this.customPresets)) {
            formattedCustomPresets[`${name} (${preset.width}×${preset.height})`] = preset;
        }

        // 顺序：默认预设 → 自定义 → 自定义预设
        return {
            ...this.builtInPresets,
            '自定义 (Custom)': { width: this.node.properties.width, height: this.node.properties.height },
            ...formattedCustomPresets
        };
    }

    drawInterface(ctx) {
        const nodeWidth = this.node.size[0];
        let currentY = LiteGraph.NODE_TITLE_HEIGHT + 10;

        // 绘制 2D 画布
        currentY = this.drawCanvas(ctx, currentY, nodeWidth);

        // 绘制信息显示
        currentY = this.drawInfoDisplay(ctx, currentY, nodeWidth);

        // 绘制控制栏
        currentY = this.drawControlBar(ctx, currentY, nodeWidth);

        // 绘制输出引脚数字（最后绘制，显示在最上层）
        this.drawOutputValues(ctx);
    }

    drawCanvas(ctx, startY, nodeWidth) {
        // 照抄原版 draw2DCanvas 的实现
        const node = this.node;
        const props = node.properties;

        const x = 10;
        const y = startY;
        const w = nodeWidth - 20;
        const h = 200;

        const rangeX = props.canvas_max_x - props.canvas_min_x;
        const rangeY = props.canvas_max_y - props.canvas_min_y;
        const aspectRatio = rangeX / rangeY;

        let canvasW = w - 20;
        let canvasH = h - 20;

        if (aspectRatio > canvasW / canvasH) {
            canvasH = canvasW / aspectRatio;
        } else {
            canvasW = canvasH * aspectRatio;
        }

        const offsetX = x + (w - canvasW) / 2;
        const offsetY = y + (h - canvasH) / 2;

        this.controls.canvas2d = { x: offsetX, y: offsetY, w: canvasW, h: canvasH };

        // 绘制背景（深色圆角矩形）
        ctx.fillStyle = "rgba(20,20,20,0.8)";
        ctx.strokeStyle = "rgba(0,0,0,0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(offsetX - 4, offsetY - 4, canvasW + 8, canvasH + 8, 6);
        ctx.fill();
        ctx.stroke();

        // 绘制网格点（如果启用）- 照抄原版的正确计算方式
        if (props.canvas_dots !== false) {
            ctx.fillStyle = "rgba(200,200,200,0.5)";
            ctx.beginPath();
            // 根据步长计算网格间距
            let stX = canvasW * props.canvas_step_x / rangeX;
            let stY = canvasH * props.canvas_step_y / rangeY;
            // 从第一个步长位置开始绘制，避免边缘重叠
            for (let ix = stX; ix < canvasW; ix += stX) {
                for (let iy = stY; iy < canvasH; iy += stY) {
                    ctx.rect(offsetX + ix - 0.5, offsetY + iy - 0.5, 1, 1);
                }
            }
            ctx.fill();
        }

        // 绘制框架（蓝紫色选区）
        if (props.canvas_frame !== false) {
            ctx.fillStyle = "rgba(150,150,250,0.1)";
            ctx.strokeStyle = "rgba(150,150,250,0.7)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.rect(offsetX, offsetY + canvasH * (1 - node.intpos.y),
                    canvasW * node.intpos.x, canvasH * node.intpos.y);
            ctx.fill();
            ctx.stroke();
        }

        // 计算控制点位置
        const knobX = offsetX + canvasW * node.intpos.x;
        const knobY = offsetY + canvasH * (1 - node.intpos.y);

        // 边缘控制点位置
        const rightEdgeX = offsetX + canvasW * node.intpos.x;
        const rightEdgeY = offsetY + canvasH * (1 - node.intpos.y / 2);
        const topEdgeX = offsetX + canvasW * node.intpos.x / 2;
        const topEdgeY = offsetY + canvasH * (1 - node.intpos.y);

        // 定义控制点区域（用于鼠标检测）
        this.controls.canvas2dMainHandle = {
            x: knobX - 10,
            y: knobY - 10,
            w: 20,
            h: 20
        };
        this.controls.canvas2dRightHandle = {
            x: rightEdgeX - 10,
            y: rightEdgeY - 10,
            w: 20,
            h: 20
        };
        this.controls.canvas2dTopHandle = {
            x: topEdgeX - 10,
            y: topEdgeY - 10,
            w: 20,
            h: 20
        };

        // 绘制主控制点（白色）
        ctx.fillStyle = "#FFF";
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(knobX, knobY, 8, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // 绘制右侧边缘控制点（宽度控制 - 蓝色）
        const isHoveringRight = this.hoverElement === 'canvas2dRightHandle';
        ctx.fillStyle = isHoveringRight ? "#5AF" : "#89F";
        ctx.strokeStyle = isHoveringRight ? "#FFF" : "#000";
        ctx.lineWidth = isHoveringRight ? 3 : 2;
        ctx.beginPath();
        ctx.arc(rightEdgeX, rightEdgeY, isHoveringRight ? 7 : 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // 绘制顶部边缘控制点（高度控制 - 粉色）
        const isHoveringTop = this.hoverElement === 'canvas2dTopHandle';
        ctx.fillStyle = isHoveringTop ? "#FAB" : "#F89";
        ctx.strokeStyle = isHoveringTop ? "#FFF" : "#000";
        ctx.lineWidth = isHoveringTop ? 3 : 2;
        ctx.beginPath();
        ctx.arc(topEdgeX, topEdgeY, isHoveringTop ? 7 : 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        return startY + h + 10;
    }

    drawInfoDisplay(ctx, startY, nodeWidth) {
        // 简化版 - 只显示分辨率
        const width = this.node.properties.width;
        const height = this.node.properties.height;

        ctx.fillStyle = "#bbb";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`${width} × ${height}`, nodeWidth / 2, startY);

        return startY + 25;
    }

    drawButton(ctx, x, y, w, h, content, hover = false, disabled = false) {
        // 照抄原版的渐变按钮样式
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        if (disabled) {
            grad.addColorStop(0, "#4a4a4a");
            grad.addColorStop(1, "#404040");
        } else if (hover) {
            grad.addColorStop(0, "#6a6a6a");
            grad.addColorStop(1, "#606060");
        } else {
            grad.addColorStop(0, "#5a5a5a");
            grad.addColorStop(1, "#505050");
        }
        ctx.fillStyle = grad;
        ctx.strokeStyle = disabled ? "#333" : hover ? "#777" : "#222";
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 5);
        ctx.fill();
        ctx.stroke();

        if (typeof content === 'string') {
            ctx.fillStyle = disabled ? "#888" : "#ddd";
            ctx.font = "12px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(content, x + w / 2, y + h / 2 + 1);
        }
    }

    drawDropdown(ctx, x, y, w, h, text, hover = false) {
        // 照抄原版的下拉框样式
        this.drawButton(ctx, x, y, w, h, "", hover);

        ctx.fillStyle = "#ddd";
        ctx.font = "11px Arial";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";

        ctx.save();
        ctx.beginPath();
        ctx.rect(x + 5, y, w - 25, h);
        ctx.clip();
        ctx.fillText(text, x + 8, y + h / 2 + 1);
        ctx.restore();

        // 下拉箭头
        ctx.fillStyle = "#aaa";
        ctx.beginPath();
        ctx.moveTo(x + w - 18, y + h / 2 - 3);
        ctx.lineTo(x + w - 10, y + h / 2 + 3);
        ctx.lineTo(x + w - 2, y + h / 2 - 3);
        ctx.fill();
    }

    drawControlBar(ctx, startY, nodeWidth) {
        const margin = 10;
        const buttonHeight = 28;
        const gap = 8;

        let currentX = margin;

        // 预设下拉框（无语言按钮，占据更多空间）
        const saveBtnWidth = 50;
        const deleteBtnWidth = 50;
        const dropdownWidth = nodeWidth - saveBtnWidth - deleteBtnWidth - margin * 2 - gap * 2;

        this.controls.presetDropdown = { x: currentX, y: startY, w: dropdownWidth, h: buttonHeight };
        const presetText = this.node.properties.selectedPreset || '自定义 (Custom)';
        const presetHover = this.hoverElement === 'presetDropdown';
        this.drawDropdown(ctx, currentX, startY, dropdownWidth, buttonHeight, presetText, presetHover);
        currentX += dropdownWidth + gap;

        // 保存按钮（💾 图标）
        this.controls.saveBtn = { x: currentX, y: startY, w: saveBtnWidth, h: buttonHeight };
        const saveHover = this.hoverElement === 'saveBtn';
        this.drawButton(ctx, currentX, startY, saveBtnWidth, buttonHeight, "", saveHover);
        ctx.fillStyle = "#ddd";
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("💾", currentX + saveBtnWidth / 2, startY + buttonHeight / 2 + 1);
        currentX += saveBtnWidth + gap;

        // 删除按钮（🗑️ 图标）
        const canDelete = this.canDeleteCurrentPreset();
        this.controls.deleteBtn = { x: currentX, y: startY, w: deleteBtnWidth, h: buttonHeight, enabled: canDelete };
        const deleteHover = this.hoverElement === 'deleteBtn';
        this.drawButton(ctx, currentX, startY, deleteBtnWidth, buttonHeight, "", deleteHover || !canDelete, !canDelete);
        ctx.fillStyle = canDelete ? "#ddd" : "#888";
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🗑️", currentX + deleteBtnWidth / 2, startY + buttonHeight / 2 + 1);

        return startY + buttonHeight + 2;
    }

    drawOutputValues(ctx) {
        // 照抄原版 - 在节点右侧显示输出值
        const node = this.node;

        ctx.font = "bold 14px Arial";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";

        if (this.widthWidget && this.heightWidget) {
            // 计算输出引脚的 Y 位置偏移
            const y_offset_1 = 5 + (LiteGraph.NODE_SLOT_HEIGHT * 0.5);
            const y_offset_2 = 5 + (LiteGraph.NODE_SLOT_HEIGHT * 1.5);

            // 绘制宽度值（蓝色 - 对应蓝色宽度控制点）
            ctx.fillStyle = "#89F";
            ctx.fillText(this.widthWidget.value.toString(), node.size[0] - 20, y_offset_1);

            // 绘制高度值（粉色 - 对应粉色高度控制点）
            ctx.fillStyle = "#F89";
            ctx.fillText(this.heightWidget.value.toString(), node.size[0] - 20, y_offset_2);
        }
    }

    canDeleteCurrentPreset() {
        const selected = this.node.properties.selectedPreset;
        if (!selected || selected === '自定义 (Custom)' || this.builtInPresets[selected]) {
            return false;
        }

        // 从显示名称中提取原始名称（去掉 " (分辨率)" 部分）
        const match = selected.match(/^(.+) \(\d+×\d+\)$/);
        if (match) {
            const originalName = match[1];
            return this.customPresets[originalName] !== undefined;
        }

        return false;
    }

    handleMouseDown(e, pos, canvas) {
        const localY = e.canvasY - this.node.pos[1];
        const localX = e.canvasX - this.node.pos[0];

        // 检查三个控制点（优先级从高到低）
        if (this.controls.canvas2dRightHandle && this.isInRect(localX, localY, this.controls.canvas2dRightHandle)) {
            this.node.capture = true;
            this.captureMode = 'width';
            return true;
        }

        if (this.controls.canvas2dTopHandle && this.isInRect(localX, localY, this.controls.canvas2dTopHandle)) {
            this.node.capture = true;
            this.captureMode = 'height';
            return true;
        }

        if (this.controls.canvas2dMainHandle && this.isInRect(localX, localY, this.controls.canvas2dMainHandle)) {
            this.node.capture = true;
            this.captureMode = 'main';
            return true;
        }

        // 检查画布区域（作为备选）
        if (this.controls.canvas2d && this.isInRect(localX, localY, this.controls.canvas2d)) {
            this.node.capture = true;
            this.captureMode = 'main';
            return true;
        }

        // 检查按钮点击
        if (this.controls.presetDropdown && this.isInRect(localX, localY, this.controls.presetDropdown)) {
            this.showPresetDropdown(e);
            return true;
        }

        if (this.controls.saveBtn && this.isInRect(localX, localY, this.controls.saveBtn)) {
            this.showSavePresetDialog();
            return true;
        }

        if (this.controls.deleteBtn && this.controls.deleteBtn.enabled &&
            this.isInRect(localX, localY, this.controls.deleteBtn)) {
            this.deleteCurrentPreset();
            return true;
        }

        return false;
    }

    handleMouseMove(e, pos, canvas) {
        if (this.node.capture && this.controls.canvas2d) {
            const localX = e.canvasX - this.node.pos[0];
            const localY = e.canvasY - this.node.pos[1];
            // 传递 Ctrl 键状态用于吸附控制
            const ctrlKey = e.ctrlKey || false;
            this.updateCanvasPosition(localX, localY, ctrlKey);
            return true;
        }
        return false;
    }

    handleMouseUp(e) {
        this.node.capture = false;
        this.captureMode = null;
        return true;
    }

    handleMouseHover(e, pos, canvas) {
        const localY = e.canvasY - this.node.pos[1];
        const localX = e.canvasX - this.node.pos[0];

        let hovered = null;

        // 检查画布控制点
        if (this.controls.canvas2dRightHandle && this.isInRect(localX, localY, this.controls.canvas2dRightHandle)) {
            hovered = 'canvas2dRightHandle';
        } else if (this.controls.canvas2dTopHandle && this.isInRect(localX, localY, this.controls.canvas2dTopHandle)) {
            hovered = 'canvas2dTopHandle';
        } else if (this.controls.presetDropdown && this.isInRect(localX, localY, this.controls.presetDropdown)) {
            hovered = 'presetDropdown';
        } else if (this.controls.saveBtn && this.isInRect(localX, localY, this.controls.saveBtn)) {
            hovered = 'saveBtn';
        } else if (this.controls.deleteBtn && this.controls.deleteBtn.enabled &&
            this.isInRect(localX, localY, this.controls.deleteBtn)) {
            hovered = 'deleteBtn';
        }

        if (hovered !== this.hoverElement) {
            this.hoverElement = hovered;
            app.graph.setDirtyCanvas(true);
        }
    }

    updateCanvasPosition(localX, localY, ctrlKey = false) {
        if (!this.controls.canvas2d) return;

        const canvas = this.controls.canvas2d;
        const props = this.node.properties;

        // 计算相对位置（基于画布坐标系，Y 轴反转）
        let relX = (localX - canvas.x) / canvas.w;
        let relY = 1 - (localY - canvas.y) / canvas.h;

        // 限制在 0-1 范围内
        relX = Math.max(0, Math.min(1, relX));
        relY = Math.max(0, Math.min(1, relY));

        let vX = relX;
        let vY = relY;

        // 应用吸附（照抄原版逻辑）- 除非按住 Ctrl
        if (!ctrlKey) {
            const sX = props.canvas_step_x / (props.canvas_max_x - props.canvas_min_x);
            const sY = props.canvas_step_y / (props.canvas_max_y - props.canvas_min_y);

            if (this.captureMode === 'main') {
                // 主控制点：同时吸附 X 和 Y
                vX = Math.round(vX / sX) * sX;
                vY = Math.round(vY / sY) * sY;
            } else if (this.captureMode === 'width') {
                // 宽度控制：只吸附 X
                vX = Math.round(vX / sX) * sX;
                vY = this.node.intpos.y; // 保持高度不变
            } else if (this.captureMode === 'height') {
                // 高度控制：只吸附 Y
                vX = this.node.intpos.x; // 保持宽度不变
                vY = Math.round(vY / sY) * sY;
            }
        } else {
            // 按住 Ctrl：禁用吸附，精细调整
            if (this.captureMode === 'width') {
                vY = this.node.intpos.y; // 保持高度不变
            } else if (this.captureMode === 'height') {
                vX = this.node.intpos.x; // 保持宽度不变
            }
        }

        // 更新 intpos
        this.node.intpos.x = vX;
        this.node.intpos.y = vY;

        // 计算新的宽高值
        const rangeX = props.canvas_max_x - props.canvas_min_x;
        const rangeY = props.canvas_max_y - props.canvas_min_y;

        const newWidth = Math.round((props.canvas_min_x + vX * rangeX) / props.canvas_step_x) * props.canvas_step_x;
        const newHeight = Math.round((props.canvas_min_y + vY * rangeY) / props.canvas_step_y) * props.canvas_step_y;

        // 更新属性和 widgets
        props.width = newWidth;
        props.height = newHeight;

        if (this.widthWidget) this.widthWidget.value = newWidth;
        if (this.heightWidget) this.heightWidget.value = newHeight;

        // 切换到 Custom 预设
        this.node.properties.selectedPreset = '自定义 (Custom)';

        app.graph.setDirtyCanvas(true);
    }

    isInRect(x, y, rect) {
        // 支持 width/height 和 w/h 两种命名
        const width = rect.width || rect.w;
        const height = rect.height || rect.h;
        return x >= rect.x && x <= rect.x + width &&
            y >= rect.y && y <= rect.y + height;
    }

    showPresetDropdown(e) {
        const presets = this.getAllPresets();
        const options = Object.keys(presets).map(name => ({
            content: name,
            callback: () => {
                this.selectPreset(name, presets[name]);
            }
        }));

        // 传递事件对象以正确定位菜单
        new LiteGraph.ContextMenu(options, {
            event: e.originalEvent || e,
            title: '预设 (Preset)',
            node: this.node
        });
    }

    selectPreset(name, preset) {
        this.node.properties.selectedPreset = name;
        this.node.properties.width = preset.width;
        this.node.properties.height = preset.height;

        if (this.widthWidget) this.widthWidget.value = preset.width;
        if (this.heightWidget) this.heightWidget.value = preset.height;

        // 更新画布位置
        const props = this.node.properties;
        this.node.intpos.x = (preset.width - props.canvas_min_x) / (props.canvas_max_x - props.canvas_min_x);
        this.node.intpos.y = (preset.height - props.canvas_min_y) / (props.canvas_max_y - props.canvas_min_y);

        app.graph.setDirtyCanvas(true);
    }

    showSavePresetDialog() {
        if (this.dialogOpen) return;

        this.dialogOpen = true;

        // 创建对话框
        const dialog = document.createElement('div');
        dialog.className = 'resolution-simplify-dialog-overlay';
        dialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const dialogBox = document.createElement('div');
        dialogBox.style.cssText = `
            background: #2a2a2a;
            border: 2px solid #555;
            border-radius: 8px;
            padding: 20px;
            min-width: 300px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
        `;

        dialogBox.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #fff;">保存预设 (Save Preset)</h3>
            <div style="margin-bottom: 12px;">
                <label style="display: block; color: #ccc; margin-bottom: 5px;">预设名称 (Preset Name)</label>
                <input type="text" id="preset-name-input"
                       placeholder="输入预设名称"
                       style="width: 100%; padding: 8px; background: #1a1a1a; border: 1px solid #555;
                              color: #fff; border-radius: 4px; box-sizing: border-box;" />
            </div>
            <div style="margin-bottom: 12px;">
                <label style="display: block; color: #ccc; margin-bottom: 5px;">宽度 (Width)</label>
                <input type="number" id="preset-width-input" value="${this.node.properties.width}"
                       style="width: 100%; padding: 8px; background: #1a1a1a; border: 1px solid #555;
                              color: #fff; border-radius: 4px; box-sizing: border-box;" />
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display: block; color: #ccc; margin-bottom: 5px;">高度 (Height)</label>
                <input type="number" id="preset-height-input" value="${this.node.properties.height}"
                       style="width: 100%; padding: 8px; background: #1a1a1a; border: 1px solid #555;
                              color: #fff; border-radius: 4px; box-sizing: border-box;" />
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="preset-cancel-btn"
                        style="padding: 8px 16px; background: #444; color: #fff; border: none;
                               border-radius: 4px; cursor: pointer;">
                    取消 (Cancel)
                </button>
                <button id="preset-confirm-btn"
                        style="padding: 8px 16px; background: #4a9eff; color: #fff; border: none;
                               border-radius: 4px; cursor: pointer;">
                    确认 (Confirm)
                </button>
            </div>
        `;

        dialog.appendChild(dialogBox);
        document.body.appendChild(dialog);

        // 焦点到名称输入框
        setTimeout(() => {
            document.getElementById('preset-name-input').focus();
        }, 100);

        // 取消按钮
        document.getElementById('preset-cancel-btn').addEventListener('click', () => {
            document.body.removeChild(dialog);
            this.dialogOpen = false;
        });

        // 确认按钮
        document.getElementById('preset-confirm-btn').addEventListener('click', async () => {
            const name = document.getElementById('preset-name-input').value.trim();
            const width = parseInt(document.getElementById('preset-width-input').value);
            const height = parseInt(document.getElementById('preset-height-input').value);

            if (!name) {
                alert('预设名称不能为空');
                return;
            }

            if (width <= 0 || height <= 0) {
                alert('宽度和高度必须大于 0');
                return;
            }

            // 检查名称是否已存在
            if (this.builtInPresets[name] || this.customPresets[name]) {
                alert('预设名称已存在');
                return;
            }

            // 保存预设
            await this.addCustomPreset(name, width, height);

            document.body.removeChild(dialog);
            this.dialogOpen = false;
        });

        // 点击外部关闭
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                document.body.removeChild(dialog);
                this.dialogOpen = false;
            }
        });
    }

    async addCustomPreset(name, width, height) {
        try {
            const response = await fetch('/danbooru_gallery/resolution_simplify/add_preset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, width, height })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.status === 'success') {
                    this.customPresets[name] = { width, height };
                    // 设置为新添加的预设（带分辨率显示）
                    this.node.properties.selectedPreset = `${name} (${width}×${height})`;
                    app.graph.setDirtyCanvas(true);
                }
            }
        } catch (error) {
            console.error('[ResolutionMasterSimplify] 添加预设失败:', error);
        }
    }

    async deleteCurrentPreset() {
        const selectedDisplay = this.node.properties.selectedPreset;

        if (!this.canDeleteCurrentPreset()) {
            return;
        }

        // 从显示名称中提取原始名称
        const match = selectedDisplay.match(/^(.+) \(\d+×\d+\)$/);
        if (!match) return;

        const presetName = match[1];

        try {
            const response = await fetch('/danbooru_gallery/resolution_simplify/delete_preset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: presetName })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.status === 'success') {
                    delete this.customPresets[presetName];
                    this.node.properties.selectedPreset = '自定义 (Custom)';
                    app.graph.setDirtyCanvas(true);
                }
            }
        } catch (error) {
            console.error('[ResolutionMasterSimplify] 删除预设失败:', error);
        }
    }
}

// 注册节点
app.registerExtension({
    name: "Comfy.ResolutionMasterSimplify",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "ResolutionMasterSimplify") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                const result = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;

                // 创建 canvas 实例
                this.resolutionSimplifyCanvas = new ResolutionMasterSimplifyCanvas(this);

                return result;
            };
        }
    }
});

console.log("[ResolutionMasterSimplify] JS 已加载");
