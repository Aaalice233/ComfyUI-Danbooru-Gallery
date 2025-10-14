/**
 * 颜色管理器 - 确保蒙版颜色唯一性
 * Color Manager - Ensure mask color uniqueness
 */

class ColorManager {
    constructor() {
        // 预定义的颜色池，包含足够多的不同颜色
        this.colorPool = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
            '#FFEAA7', '#DDA0DD', '#FF9FF3', '#54A0FF',
            '#FFA502', '#786FA6', '#FDCB6E', '#FD79A8',
            '#A29BFE', '#6C5CE7', '#00B894', '#E17055',
            '#74B9FF', '#81ECEC', '#55A3FF', '#FF7675',
            '#FDCB6E', '#E84393', '#00CEC9', '#6C5CE7',
            '#FD79A8', '#FDCB6E', '#55A3FF', '#00B894',
            '#E17055', '#74B9FF', '#81ECEC', '#A29BFE'
        ];

        // 当前已使用的颜色索引
        this.usedColors = new Set();

        // 当前分配的颜色索引
        this.currentIndex = 0;

        // 颜色分配记录 - 用于保持颜色与对象的关联
        this.colorAssignments = new Map();
    }

    /**
     * 为指定的ID分配唯一颜色
     * @param {string} id - 对象ID（如角色ID）
     * @param {boolean} forceNew - 是否强制分配新颜色
     * @returns {string} 颜色值
     */
    getColorForId(id, forceNew = false) {
        // 如果已经为这个ID分配了颜色且不强制更新，返回已分配的颜色
        if (!forceNew && this.colorAssignments.has(id)) {
            return this.colorAssignments.get(id);
        }

        const color = this.getNextUniqueColor();
        this.colorAssignments.set(id, color);
        return color;
    }

    /**
     * 获取下一个唯一颜色
     * @returns {string} 颜色值
     */
    getNextUniqueColor() {
        // 如果所有颜色都用完了，重置并生成新的颜色
        if (this.usedColors.size >= this.colorPool.length) {
            this.generateAdditionalColors();
        }

        // 找到下一个未使用的颜色
        while (this.usedColors.has(this.currentIndex)) {
            this.currentIndex = (this.currentIndex + 1) % this.colorPool.length;
        }

        const colorIndex = this.currentIndex;
        this.usedColors.add(colorIndex);
        this.currentIndex = (this.currentIndex + 1) % this.colorPool.length;

        return this.colorPool[colorIndex];
    }

    /**
     * 生成额外的颜色（当预定义颜色用完时）
     */
    generateAdditionalColors() {
        const additionalColors = [];
        const baseColors = [
            { h: 0, s: 70, l: 60 },   // 红色系
            { h: 30, s: 70, l: 60 },  // 橙色系
            { h: 60, s: 70, l: 60 },  // 黄色系
            { h: 120, s: 70, l: 60 }, // 绿色系
            { h: 180, s: 70, l: 60 }, // 青色系
            { h: 240, s: 70, l: 60 }, // 蓝色系
            { h: 300, s: 70, l: 60 }  // 紫色系
        ];

        // 为每个基础色生成变体
        baseColors.forEach(base => {
            // 生成不同亮度的变体
            for (let l = 40; l <= 80; l += 20) {
                // 生成不同饱和度的变体
                for (let s = 50; s <= 90; s += 20) {
                    const color = this.hslToHex(base.h, s, l);
                    if (!this.colorPool.includes(color)) {
                        additionalColors.push(color);
                    }
                }
            }
        });

        // 添加生成的颜色到颜色池
        this.colorPool.push(...additionalColors);
        console.log(`[ColorManager] 生成了 ${additionalColors.length} 个额外颜色，总颜色数: ${this.colorPool.length}`);
    }

    /**
     * HSL转十六进制颜色
     * @param {number} h - 色相 (0-360)
     * @param {number} s - 饱和度 (0-100)
     * @param {number} l - 亮度 (0-100)
     * @returns {string} 十六进制颜色值
     */
    hslToHex(h, s, l) {
        h = h % 360;
        s = Math.max(0, Math.min(100, s)) / 100;
        l = Math.max(0, Math.min(100, l)) / 100;

        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;

        let r, g, b;
        if (h >= 0 && h < 60) {
            [r, g, b] = [c, x, 0];
        } else if (h >= 60 && h < 120) {
            [r, g, b] = [x, c, 0];
        } else if (h >= 120 && h < 180) {
            [r, g, b] = [0, c, x];
        } else if (h >= 180 && h < 240) {
            [r, g, b] = [0, x, c];
        } else if (h >= 240 && h < 300) {
            [r, g, b] = [x, 0, c];
        } else {
            [r, g, b] = [c, 0, x];
        }

        r = Math.round((r + m) * 255);
        g = Math.round((g + m) * 255);
        b = Math.round((b + m) * 255);

        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
    }

    /**
     * 释放指定ID的颜色
     * @param {string} id - 对象ID
     */
    releaseColor(id) {
        if (this.colorAssignments.has(id)) {
            const color = this.colorAssignments.get(id);
            const colorIndex = this.colorPool.indexOf(color);
            if (colorIndex !== -1) {
                this.usedColors.delete(colorIndex);
            }
            this.colorAssignments.delete(id);
        }
    }

    /**
     * 重置颜色管理器
     */
    reset() {
        this.usedColors.clear();
        this.colorAssignments.clear();
        this.currentIndex = 0;
    }

    /**
     * 获取当前可用颜色数量
     * @returns {number} 可用颜色数量
     */
    getAvailableColorCount() {
        return this.colorPool.length - this.usedColors.size;
    }

    /**
     * 获取已使用颜色数量
     * @returns {number} 已使用颜色数量
     */
    getUsedColorCount() {
        return this.usedColors.size;
    }

    /**
     * 获取指定ID的当前颜色（如果已分配）
     * @param {string} id - 对象ID
     * @returns {string|null} 颜色值或null
     */
    getCurrentColor(id) {
        return this.colorAssignments.get(id) || null;
    }

    /**
     * 批量分配颜色给多个ID
     * @param {string[]} ids - ID数组
     * @returns {Map<string, string>} ID到颜色的映射
     */
    assignColorsToIds(ids) {
        const assignments = new Map();
        ids.forEach(id => {
            assignments.set(id, this.getColorForId(id));
        });
        return assignments;
    }

    /**
     * 获取所有颜色分配情况
     * @returns {Map<string, string>} 所有颜色分配
     */
    getAllAssignments() {
        return new Map(this.colorAssignments);
    }
}

// 创建全局单例
window.MCE_ColorManager = window.MCE_ColorManager || new ColorManager();

// 导出类和单例
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ColorManager, colorManager: window.MCE_ColorManager };
}
