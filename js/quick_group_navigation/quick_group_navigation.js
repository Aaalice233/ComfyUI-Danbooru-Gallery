/**
 * 快速组导航器 - 主逻辑和管理器
 * Quick Group Navigation - Main Logic and Manager
 *
 * @author 哈雷酱 (大小姐工程师)
 * @version 1.0.0
 */

import { app } from "../../../scripts/app.js";
import { FloatingNavigator } from "./floating_navigator.js";

/**
 * 加载CSS样式文件
 */
function loadStyles() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = 'extensions/ComfyUI-Danbooru-Gallery/quick_group_navigation/styles.css';
    document.head.appendChild(link);
    console.log('[QGN] 样式文件已加载');
}

// 立即加载样式
loadStyles();

/**
 * 快速组导航管理器
 * 负责快捷键管理、数据持久化、组导航逻辑
 */
class QuickGroupNavigationManager {
    constructor() {
        // 导航组数据（保存到工作流）
        this.navigationGroups = [];

        // 锁定状态（保存到工作流）
        this.locked = false;

        // 快捷键映射 (key -> groupId)
        this.shortcuts = new Map();

        // UI组件
        this.floatingNavigator = null;

        // 是否已初始化
        this.initialized = false;

        console.log('[QGN] 快速组导航管理器已创建');
    }

    /**
     * 初始化管理器
     */
    init() {
        if (this.initialized) {
            console.warn('[QGN] 管理器已初始化，跳过');
            return;
        }

        // 创建悬浮球UI
        this.floatingNavigator = new FloatingNavigator(this);

        // 设置全局快捷键监听
        this.setupGlobalShortcutListener();

        // 监听工作流变化
        this.setupWorkflowListener();

        this.initialized = true;
        console.log('[QGN] 快速组导航管理器初始化完成');
    }

    /**
     * 设置全局快捷键监听器
     */
    setupGlobalShortcutListener() {
        document.addEventListener('keydown', (e) => {
            // 排除输入框等场景
            if (this.isInputActive()) {
                return;
            }

            // 排除修饰键组合（保留给系统）
            if (e.ctrlKey || e.metaKey || e.altKey) {
                return;
            }

            const key = e.key.toUpperCase();

            // 检查是否是已注册的快捷键
            if (this.shortcuts.has(key)) {
                e.preventDefault();
                e.stopPropagation();

                const groupId = this.shortcuts.get(key);
                const group = this.navigationGroups.find(g => g.id === groupId);

                if (group) {
                    this.navigateToGroup(group.groupName);
                }
            }
        }, true);  // 使用捕获阶段，优先级更高

        console.log('[QGN] 全局快捷键监听器已设置');
    }

    /**
     * 检查是否有输入框处于激活状态
     */
    isInputActive() {
        const activeElement = document.activeElement;
        if (!activeElement) return false;

        const tagName = activeElement.tagName.toUpperCase();
        return (
            tagName === 'INPUT' ||
            tagName === 'TEXTAREA' ||
            activeElement.isContentEditable
        );
    }

    /**
     * 设置工作流监听器
     */
    setupWorkflowListener() {
        // 监听工作流加载
        const originalLoadGraphData = app.loadGraphData;
        app.loadGraphData = (...args) => {
            const result = originalLoadGraphData.apply(app, args);

            // 工作流加载后，恢复数据
            setTimeout(() => {
                this.loadFromWorkflow();
                this.floatingNavigator?.collapsePanel();  // 确保面板折叠
            }, 100);

            return result;
        };

        console.log('[QGN] 工作流监听器已设置');
    }

    /**
     * 添加导航组
     */
    addNavigationGroup(groupName) {
        // 检查是否已存在
        if (this.navigationGroups.some(g => g.groupName === groupName)) {
            console.warn('[QGN] 组已存在:', groupName);
            return false;
        }

        // 创建新组配置
        const newGroup = {
            id: this.generateId(),
            groupName: groupName,
            shortcutKey: this.suggestNextKey(),  // 自动分配数字快捷键
            order: this.navigationGroups.length
        };

        this.navigationGroups.push(newGroup);

        // 更新快捷键映射
        if (newGroup.shortcutKey) {
            this.shortcuts.set(newGroup.shortcutKey, newGroup.id);
        }

        // 保存到工作流
        this.saveToWorkflow();

        console.log('[QGN] 添加导航组:', groupName, '快捷键:', newGroup.shortcutKey);
        return true;
    }

    /**
     * 移除导航组
     */
    removeNavigationGroup(groupId) {
        const index = this.navigationGroups.findIndex(g => g.id === groupId);
        if (index === -1) {
            console.warn('[QGN] 组不存在:', groupId);
            return false;
        }

        const group = this.navigationGroups[index];

        // 移除快捷键映射
        if (group.shortcutKey) {
            this.shortcuts.delete(group.shortcutKey);
        }

        // 从数组中移除
        this.navigationGroups.splice(index, 1);

        // 保存到工作流
        this.saveToWorkflow();

        console.log('[QGN] 移除导航组:', group.groupName);
        return true;
    }

    /**
     * 设置快捷键
     */
    setShortcut(groupId, key) {
        const group = this.navigationGroups.find(g => g.id === groupId);
        if (!group) {
            console.warn('[QGN] 组不存在:', groupId);
            return false;
        }

        // 移除旧的快捷键映射
        if (group.shortcutKey) {
            this.shortcuts.delete(group.shortcutKey);
        }

        // 设置新的快捷键
        group.shortcutKey = key;
        this.shortcuts.set(key, groupId);

        // 保存到工作流
        this.saveToWorkflow();

        console.log('[QGN] 设置快捷键:', group.groupName, '->', key);
        return true;
    }

    /**
     * 检查快捷键冲突
     * @returns {string|null} 冲突的组名，如果没有冲突则返回null
     */
    checkShortcutConflict(key, excludeGroupId = null) {
        const conflictGroupId = this.shortcuts.get(key);
        if (!conflictGroupId || conflictGroupId === excludeGroupId) {
            return null;
        }

        const conflictGroup = this.navigationGroups.find(g => g.id === conflictGroupId);
        return conflictGroup ? conflictGroup.groupName : null;
    }

    /**
     * 建议下一个可用的快捷键（优先数字1-9）
     */
    suggestNextKey() {
        // 优先分配数字键1-9
        for (let i = 1; i <= 9; i++) {
            const key = String(i);
            if (!this.shortcuts.has(key)) {
                return key;
            }
        }

        // 数字键用完了，分配字母键
        for (let code = 65; code <= 90; code++) {  // A-Z
            const key = String.fromCharCode(code);
            if (!this.shortcuts.has(key)) {
                return key;
            }
        }

        // 都用完了，返回null（用户需要手动设置）
        return null;
    }

    /**
     * 导航到指定组
     */
    navigateToGroup(groupName) {
        // 查找组
        const group = app.graph._groups.find(g => g.title === groupName);
        if (!group) {
            console.warn('[QGN] 组不存在:', groupName);
            this.floatingNavigator?.showNotification(`组不存在: ${groupName}`, 'warning');
            return false;
        }

        const canvas = app.canvas;

        // 居中到组
        canvas.centerOnNode(group);

        // 计算合适的缩放比例
        const zoomX = canvas.canvas.width / group._size[0] - 0.02;
        const zoomY = canvas.canvas.height / group._size[1] - 0.02;

        // 选择能完整显示组的缩放级别（取zoomX和zoomY的较小值）
        const fitZoom = Math.min(zoomX, zoomY);

        // 如果fitZoom太小（小于0.1），限制最小缩放
        const targetZoom = Math.max(fitZoom, 0.1);

        // 设置缩放
        canvas.setZoom(targetZoom, [
            canvas.canvas.width / 2,
            canvas.canvas.height / 2,
        ]);

        // 刷新画布
        canvas.setDirty(true, true);

        console.log('[QGN] 跳转到组:', groupName, '缩放比例:', targetZoom.toFixed(2));
        return true;
    }

    /**
     * 切换锁定状态
     */
    toggleLock() {
        this.locked = !this.locked;

        // 保存到工作流
        this.saveToWorkflow();

        console.log('[QGN] 锁定状态:', this.locked);
    }

    /**
     * 获取导航组列表
     */
    getNavigationGroups() {
        return [...this.navigationGroups];
    }

    /**
     * 是否已锁定
     */
    isLocked() {
        return this.locked;
    }

    /**
     * 生成唯一ID
     */
    generateId() {
        return `qgn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 保存数据到工作流
     */
    saveToWorkflow() {
        // 通过触发图的序列化来保存数据
        // 数据会在 onSerialize 钩子中被保存
        if (app.graph) {
            app.graph.change();
        }
    }

    /**
     * 从工作流加载数据
     */
    loadFromWorkflow() {
        // 尝试从图的 extra 数据中加载
        if (app.graph && app.graph.extra) {
            const extra = app.graph.extra;

            if (extra.qgn_navigation_groups && Array.isArray(extra.qgn_navigation_groups)) {
                this.navigationGroups = extra.qgn_navigation_groups;

                // 重建快捷键映射
                this.shortcuts.clear();
                this.navigationGroups.forEach(group => {
                    if (group.shortcutKey) {
                        this.shortcuts.set(group.shortcutKey, group.id);
                    }
                });

                console.log('[QGN] 从工作流恢复导航组:', this.navigationGroups.length, '个');
            }

            if (extra.qgn_locked !== undefined) {
                this.locked = extra.qgn_locked;
                console.log('[QGN] 从工作流恢复锁定状态:', this.locked);
            }
        }

        // 更新UI
        if (this.floatingNavigator) {
            this.floatingNavigator.updateLockButton();
            if (this.floatingNavigator.isExpanded) {
                this.floatingNavigator.renderGroupsList();
            }
        }
    }

    /**
     * 销毁管理器
     */
    destroy() {
        this.floatingNavigator?.destroy();
        this.navigationGroups = [];
        this.shortcuts.clear();
        this.initialized = false;
        console.log('[QGN] 快速组导航管理器已销毁');
    }
}

// 全局单例
let globalManager = null;

/**
 * 注册扩展到ComfyUI
 */
app.registerExtension({
    name: "danbooru.QuickGroupNavigation",

    async setup() {
        console.log('[QGN] 扩展开始设置...');

        // 创建全局管理器
        globalManager = new QuickGroupNavigationManager();
        globalManager.init();

        // 钩入图的序列化/反序列化
        const originalSerialize = app.graph.serialize;
        app.graph.serialize = function () {
            const data = originalSerialize.call(this);

            // 保存导航数据到 extra
            if (!data.extra) {
                data.extra = {};
            }

            data.extra.qgn_navigation_groups = globalManager.navigationGroups;
            data.extra.qgn_locked = globalManager.locked;

            return data;
        };

        const originalConfigure = app.graph.configure;
        app.graph.configure = function (data) {
            const result = originalConfigure.call(this, data);

            // 从 extra 恢复导航数据
            if (data.extra) {
                if (data.extra.qgn_navigation_groups) {
                    globalManager.navigationGroups = data.extra.qgn_navigation_groups;

                    // 重建快捷键映射
                    globalManager.shortcuts.clear();
                    globalManager.navigationGroups.forEach(group => {
                        if (group.shortcutKey) {
                            globalManager.shortcuts.set(group.shortcutKey, group.id);
                        }
                    });
                }

                if (data.extra.qgn_locked !== undefined) {
                    globalManager.locked = data.extra.qgn_locked;
                }
            }

            // 更新UI
            if (globalManager.floatingNavigator) {
                globalManager.floatingNavigator.updateLockButton();
                globalManager.floatingNavigator.collapsePanel();  // 确保折叠
            }

            return result;
        };

        console.log('[QGN] 扩展设置完成');
    },

    async loadedGraphNode(node, app) {
        // 节点加载时的处理（如果需要）
    },
});

// 导出管理器（供调试使用）
export { globalManager };
