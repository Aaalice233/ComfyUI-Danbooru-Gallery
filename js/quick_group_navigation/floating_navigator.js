/**
 * 快速组导航器 - 悬浮球和面板UI组件
 * Quick Group Navigation - Floating Ball and Panel UI Component
 *
 * @author 哈雷酱 (大小姐工程师)
 * @version 1.0.0
 */

import { app } from "../../../scripts/app.js";
import { globalToastManager } from "../global/toast_manager.js";

/**
 * 悬浮球导航器类
 * 负责悬浮球的创建、拖拽、面板展开等UI交互
 */
export class FloatingNavigator {
    constructor(manager) {
        this.manager = manager;  // QuickGroupNavigationManager实例

        // DOM元素
        this.ballElement = null;
        this.panelElement = null;

        // 状态
        this.isExpanded = false;
        this.isDragging = false;
        this.hasDragged = false;  // 是否真的发生了拖拽（移动距离超过阈值）
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.mouseDownX = 0;  // 鼠标按下时的位置
        this.mouseDownY = 0;

        // 位置（默认右下角）
        this.position = this.loadPosition();

        // 初始化
        this.init();
    }

    /**
     * 初始化悬浮球和面板
     */
    init() {
        this.createBall();
        this.createPanel();
        this.setupEventListeners();

        // 每次进入工作流时，确保面板是折叠状态
        this.collapsePanel();

        console.log('[QGN] 悬浮球导航器初始化完成');
    }

    /**
     * 创建悬浮球DOM
     */
    createBall() {
        this.ballElement = document.createElement('div');
        this.ballElement.className = 'qgn-floating-ball';
        this.ballElement.innerHTML = '🧭';  // 指南针图标
        this.ballElement.title = '快速组导航器\n点击展开，拖拽移动';

        // 设置初始位置
        this.updateBallPosition();

        // 添加到body
        document.body.appendChild(this.ballElement);
    }

    /**
     * 创建导航面板DOM
     */
    createPanel() {
        this.panelElement = document.createElement('div');
        this.panelElement.className = 'qgn-panel';
        this.panelElement.style.display = 'none';

        this.panelElement.innerHTML = `
            <div class="qgn-panel-header">
                <span class="qgn-panel-title">快速组导航器</span>
                <div class="qgn-panel-controls">
                    <button class="qgn-lock-button" title="双击锁定/解锁（锁定后禁止编辑）">🔓</button>
                    <button class="qgn-close-button" title="关闭面板">×</button>
                </div>
            </div>

            <div class="qgn-search-container">
                <input type="text"
                       class="qgn-search-input"
                       placeholder="🔍 搜索组名..."
                       autocomplete="off">
            </div>

            <div class="qgn-groups-list-container">
                <div class="qgn-groups-list">
                    <!-- 组列表将在这里动态渲染 -->
                </div>
            </div>

            <div class="qgn-panel-footer">
                <button class="qgn-add-group-button">+ 添加导航组</button>
            </div>
        `;

        // 添加到body
        document.body.appendChild(this.panelElement);

        // 获取内部元素的引用（方便后续操作）
        this.lockButton = this.panelElement.querySelector('.qgn-lock-button');
        this.closeButton = this.panelElement.querySelector('.qgn-close-button');
        this.searchInput = this.panelElement.querySelector('.qgn-search-input');
        this.groupsList = this.panelElement.querySelector('.qgn-groups-list');
        this.addGroupButton = this.panelElement.querySelector('.qgn-add-group-button');
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 悬浮球点击 - 只展开面板，不关闭（避免拖拽时误触）
        this.ballElement.addEventListener('click', (e) => {
            // 如果刚刚拖拽过，不展开面板
            if (!this.hasDragged && !this.isExpanded) {
                this.expandPanel();
            }
        });

        // 悬浮球拖拽
        this.ballElement.addEventListener('mousedown', (e) => {
            this.startDrag(e);
        });

        // 关闭按钮
        this.closeButton.addEventListener('click', () => {
            this.collapsePanel();
        });

        // 锁定按钮（双击切换）
        this.lockButton.addEventListener('dblclick', () => {
            this.manager.toggleLock();
            this.updateLockButton();
        });

        // 搜索框输入（防抖）
        let searchTimeout;
        this.searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.filterGroups(e.target.value);
            }, 300);
        });

        // 添加组按钮
        this.addGroupButton.addEventListener('click', () => {
            this.showAddGroupDialog();
        });

        // 全局拖拽事件
        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.onDrag(e);
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (this.isDragging) {
                this.stopDrag(e);
            }
        });

        // 监听窗口大小变化,确保悬浮球始终在可见范围内
        window.addEventListener('resize', () => {
            const ballSize = 60;
            const maxX = window.innerWidth - ballSize;
            const maxY = window.innerHeight - ballSize;

            // 如果悬浮球超出屏幕,自动调整位置
            let needsUpdate = false;
            if (this.position.x > maxX) {
                this.position.x = maxX;
                needsUpdate = true;
            }
            if (this.position.y > maxY) {
                this.position.y = maxY;
                needsUpdate = true;
            }

            // 更新位置并保存
            if (needsUpdate) {
                this.updateBallPosition();
                this.savePosition();

                // 如果面板展开,也更新面板位置
                if (this.isExpanded) {
                    this.updatePanelPosition();
                }
            }
        });
    }

    /**
     * 开始拖拽
     */
    startDrag(e) {
        this.isDragging = true;
        this.hasDragged = false;  // 重置拖拽标志
        this.dragStartX = e.clientX - this.position.x;
        this.dragStartY = e.clientY - this.position.y;
        this.mouseDownX = e.clientX;  // 记录鼠标按下位置
        this.mouseDownY = e.clientY;

        this.ballElement.style.cursor = 'grabbing';
        e.preventDefault();
    }

    /**
     * 拖拽中
     */
    onDrag(e) {
        if (!this.isDragging) return;

        // 检测是否真的发生了拖拽（移动距离超过5px）
        const dx = e.clientX - this.mouseDownX;
        const dy = e.clientY - this.mouseDownY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 5) {
            this.hasDragged = true;  // 标记为真正的拖拽
        }

        // 计算新位置
        let newX = e.clientX - this.dragStartX;
        let newY = e.clientY - this.dragStartY;

        // 边界检测
        const ballSize = 60;
        const maxX = window.innerWidth - ballSize;
        const maxY = window.innerHeight - ballSize;

        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));

        this.position = { x: newX, y: newY };
        this.updateBallPosition();

        // 如果面板展开，更新面板位置
        if (this.isExpanded) {
            this.updatePanelPosition();
        }
    }

    /**
     * 停止拖拽
     */
    stopDrag(e) {
        if (!this.isDragging) return;

        this.isDragging = false;
        this.ballElement.style.cursor = 'move';

        // 保存位置
        this.savePosition();

        // 延迟重置hasDragged标志，确保click事件能检测到
        // （click事件在mouseup之后触发）
        setTimeout(() => {
            this.hasDragged = false;
        }, 100);
    }

    /**
     * 更新悬浮球位置
     */
    updateBallPosition() {
        this.ballElement.style.left = `${this.position.x}px`;
        this.ballElement.style.top = `${this.position.y}px`;
    }

    /**
     * 切换面板展开/收起
     */
    togglePanel() {
        if (this.isExpanded) {
            this.collapsePanel();
        } else {
            this.expandPanel();
        }
    }

    /**
     * 展开面板
     */
    expandPanel() {
        this.isExpanded = true;
        this.panelElement.style.display = 'block';
        this.updatePanelPosition();

        // 更新组列表
        this.renderGroupsList();

        // 动画效果
        requestAnimationFrame(() => {
            this.panelElement.classList.add('qgn-panel-visible');
        });
    }

    /**
     * 收起面板
     */
    collapsePanel() {
        this.isExpanded = false;
        this.panelElement.classList.remove('qgn-panel-visible');

        // 等待动画完成后隐藏
        setTimeout(() => {
            if (!this.isExpanded) {
                this.panelElement.style.display = 'none';
            }
        }, 200);

        // 清空搜索
        this.searchInput.value = '';
    }

    /**
     * 更新面板位置（相对于悬浮球）
     * 智能计算位置，确保面板不会超出屏幕边界
     */
    updatePanelPosition() {
        const ballSize = 60;
        const panelWidth = 360;
        const panelMaxHeight = 500;  // 面板最大高度（与CSS中的max-height一致）
        const gap = 10;
        const edgeMargin = 20;  // 距离屏幕边缘的最小间距

        // ========== 水平方向位置计算 ==========
        // 判断应该显示在左侧还是右侧
        const shouldShowOnLeft = (this.position.x + ballSize + gap + panelWidth) > window.innerWidth;

        let panelLeft;
        if (shouldShowOnLeft) {
            // 显示在左侧
            panelLeft = this.position.x - panelWidth - gap;
            // 确保不超出左边界
            if (panelLeft < edgeMargin) {
                panelLeft = edgeMargin;
            }
        } else {
            // 显示在右侧
            panelLeft = this.position.x + ballSize + gap;
            // 确保不超出右边界
            if (panelLeft + panelWidth > window.innerWidth - edgeMargin) {
                panelLeft = window.innerWidth - panelWidth - edgeMargin;
            }
        }

        // ========== 垂直方向位置计算 ==========
        let panelTop = this.position.y;

        // 检测面板是否会超出底部
        const wouldExceedBottom = (this.position.y + panelMaxHeight) > (window.innerHeight - edgeMargin);

        if (wouldExceedBottom) {
            // 面板会超出底部，尝试向上对齐悬浮球底部
            panelTop = this.position.y + ballSize - panelMaxHeight;

            // 确保不超出顶部
            if (panelTop < edgeMargin) {
                panelTop = edgeMargin;
            }
        }

        // 应用计算后的位置
        this.panelElement.style.left = `${panelLeft}px`;
        this.panelElement.style.top = `${panelTop}px`;
    }

    /**
     * 渲染组列表
     */
    renderGroupsList() {
        const groups = this.manager.getNavigationGroups();
        const locked = this.manager.isLocked();

        // 清空列表
        this.groupsList.innerHTML = '';

        if (groups.length === 0) {
            // 空状态提示
            const emptyState = document.createElement('div');
            emptyState.className = 'qgn-empty-state';
            emptyState.innerHTML = `
                <div class="qgn-empty-icon">📭</div>
                <div class="qgn-empty-text">还没有添加任何导航组</div>
                <div class="qgn-empty-hint">点击下方按钮添加常用的组</div>
            `;
            this.groupsList.appendChild(emptyState);
            return;
        }

        // 渲染每个组
        groups.forEach((group, index) => {
            const groupItem = this.createGroupItem(group, index, locked);
            this.groupsList.appendChild(groupItem);
        });
    }

    /**
     * 创建组条目DOM
     */
    createGroupItem(group, index, locked) {
        const item = document.createElement('div');
        item.className = 'qgn-group-item';
        item.dataset.groupId = group.id;

        // 获取组颜色
        const groupColor = this.getGroupColor(group.groupName);

        item.innerHTML = `
            <div class="qgn-group-color" style="background-color: ${groupColor}"></div>
            <div class="qgn-group-info">
                <div class="qgn-group-name">${this.escapeHtml(group.groupName)}</div>
                <div class="qgn-group-shortcut">
                    ${group.shortcutKey ? `快捷键: ${group.shortcutKey}` : '未设置快捷键'}
                </div>
            </div>
            <div class="qgn-group-actions">
                <button class="qgn-set-shortcut-button" title="设置快捷键" ${locked ? 'disabled' : ''}>⚡</button>
                <button class="qgn-navigate-button" title="导航到此组">➤</button>
                ${!locked ? '<button class="qgn-remove-group-button" title="移除">×</button>' : ''}
            </div>
        `;

        // 绑定事件
        const setShortcutButton = item.querySelector('.qgn-set-shortcut-button');
        const navigateButton = item.querySelector('.qgn-navigate-button');
        const removeButton = item.querySelector('.qgn-remove-group-button');

        setShortcutButton?.addEventListener('click', () => {
            this.showShortcutRecorder(group);
        });

        navigateButton.addEventListener('click', () => {
            this.manager.navigateToGroup(group.groupName);
        });

        removeButton?.addEventListener('click', () => {
            this.manager.removeNavigationGroup(group.id);
            this.renderGroupsList();
        });

        return item;
    }

    /**
     * 获取工作流中组的颜色
     */
    getGroupColor(groupName) {
        if (!app.graph || !app.graph._groups) return '#888';

        const group = app.graph._groups.find(g => g.title === groupName);
        if (group && group.color) {
            return group.color;
        }

        return '#888';  // 默认灰色
    }

    /**
     * 显示添加组对话框
     */
    showAddGroupDialog() {
        // 获取工作流中所有组
        const allGroups = this.getAllWorkflowGroups();
        const existingGroupNames = this.manager.getNavigationGroups().map(g => g.groupName);

        // 过滤掉已添加的组
        const availableGroups = allGroups.filter(g => !existingGroupNames.includes(g.title));

        if (availableGroups.length === 0) {
            this.showNotification('所有组都已添加到导航列表', 'info');
            return;
        }

        // 创建下拉选择对话框
        const dialog = document.createElement('div');
        dialog.className = 'qgn-dialog-overlay';
        dialog.innerHTML = `
            <div class="qgn-dialog">
                <div class="qgn-dialog-header">
                    <span class="qgn-dialog-title">选择要添加的组</span>
                    <button class="qgn-dialog-close">×</button>
                </div>
                <div class="qgn-dialog-body">
                    <input type="text"
                           class="qgn-dialog-search"
                           placeholder="搜索组名..."
                           autocomplete="off">
                    <div class="qgn-dialog-groups-list">
                        ${availableGroups.map(g => `
                            <div class="qgn-dialog-group-item" data-group-name="${this.escapeHtml(g.title)}">
                                <div class="qgn-group-color" style="background-color: ${g.color || '#888'}"></div>
                                <span>${this.escapeHtml(g.title)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // 对话框事件
        const closeDialog = () => {
            dialog.remove();
        };

        dialog.querySelector('.qgn-dialog-close').addEventListener('click', closeDialog);
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) closeDialog();
        });

        // 搜索功能
        const searchInput = dialog.querySelector('.qgn-dialog-search');
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const items = dialog.querySelectorAll('.qgn-dialog-group-item');

            items.forEach(item => {
                const groupName = item.dataset.groupName.toLowerCase();
                item.style.display = groupName.includes(searchTerm) ? 'flex' : 'none';
            });
        });

        // 选择组
        dialog.querySelectorAll('.qgn-dialog-group-item').forEach(item => {
            item.addEventListener('click', () => {
                const groupName = item.dataset.groupName;
                this.manager.addNavigationGroup(groupName);
                this.renderGroupsList();
                closeDialog();
                this.showNotification(`已添加组: ${groupName}`, 'success');
            });
        });

        // 聚焦搜索框
        searchInput.focus();
    }

    /**
     * 显示快捷键录制器
     */
    showShortcutRecorder(group) {
        const recorder = document.createElement('div');
        recorder.className = 'qgn-shortcut-recorder-overlay';
        recorder.innerHTML = `
            <div class="qgn-shortcut-recorder">
                <div class="qgn-recorder-icon">⌨️</div>
                <div class="qgn-recorder-title">设置快捷键</div>
                <div class="qgn-recorder-group">${this.escapeHtml(group.groupName)}</div>
                <div class="qgn-recorder-hint">请按下你想要的快捷键...</div>
                <div class="qgn-recorder-current">${group.shortcutKey || '未设置'}</div>
                <button class="qgn-recorder-cancel">取消</button>
            </div>
        `;

        document.body.appendChild(recorder);

        // 取消按钮
        const cancelButton = recorder.querySelector('.qgn-recorder-cancel');
        const closeRecorder = () => {
            recorder.remove();
            document.removeEventListener('keydown', keyHandler);
        };

        cancelButton.addEventListener('click', closeRecorder);
        recorder.addEventListener('click', (e) => {
            if (e.target === recorder) closeRecorder();
        });

        // 监听按键
        const keyHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();

            // 忽略Shift、Ctrl、Alt等修饰键单独按下
            if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) {
                return;
            }

            // 转换按键为大写（统一格式）
            const key = e.key.toUpperCase();

            // 检查冲突
            const conflict = this.manager.checkShortcutConflict(key, group.id);
            if (conflict) {
                this.showNotification(`快捷键 "${key}" 已被 "${conflict}" 使用`, 'warning');
                closeRecorder();
                return;
            }

            // 设置快捷键
            this.manager.setShortcut(group.id, key);
            this.renderGroupsList();
            this.showNotification(`已设置快捷键: ${key}`, 'success');
            closeRecorder();
        };

        document.addEventListener('keydown', keyHandler);
    }

    /**
     * 过滤组列表
     */
    filterGroups(searchTerm) {
        const items = this.groupsList.querySelectorAll('.qgn-group-item');
        const term = searchTerm.toLowerCase();

        items.forEach(item => {
            const groupName = item.querySelector('.qgn-group-name').textContent.toLowerCase();
            item.style.display = groupName.includes(term) ? 'flex' : 'none';
        });
    }

    /**
     * 更新锁定按钮状态
     */
    updateLockButton() {
        const locked = this.manager.isLocked();
        this.lockButton.textContent = locked ? '🔒' : '🔓';
        this.lockButton.title = locked ?
            '双击解锁（当前已锁定）' :
            '双击锁定（锁定后禁止编辑）';

        // 更新添加按钮状态
        this.addGroupButton.disabled = locked;

        // 重新渲染列表（更新编辑按钮状态）
        this.renderGroupsList();
    }

    /**
     * 获取所有工作流组
     */
    getAllWorkflowGroups() {
        if (!app.graph || !app.graph._groups) return [];
        return app.graph._groups.filter(g => g && g.title);
    }

    /**
     * 显示通知 - 使用全局 Toast 管理器
     */
    showNotification(message, type = 'info') {
        globalToastManager.showToast(message, type, 3000);
    }

    /**
     * HTML转义（防止XSS）
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 保存悬浮球位置到localStorage
     */
    savePosition() {
        try {
            localStorage.setItem('qgn_floating_ball_position', JSON.stringify(this.position));
        } catch (e) {
            console.warn('[QGN] 保存位置失败:', e);
        }
    }

    /**
     * 从localStorage加载悬浮球位置
     * 增加边界检查,确保悬浮球永远在屏幕可见范围内
     */
    loadPosition() {
        const ballSize = 60;  // 悬浮球大小
        const defaultPadding = 20;  // 默认边距

        let position = null;

        try {
            const saved = localStorage.getItem('qgn_floating_ball_position');
            if (saved) {
                position = JSON.parse(saved);
            }
        } catch (e) {
            console.warn('[QGN] 加载位置失败:', e);
        }

        // 如果没有保存的位置,使用默认位置
        if (!position) {
            position = {
                x: window.innerWidth - ballSize - defaultPadding,
                y: window.innerHeight - ballSize - 90
            };
        }

        // 边界检查和修正（关键修复:防止悬浮球跑到屏幕外）
        const maxX = window.innerWidth - ballSize;
        const maxY = window.innerHeight - ballSize;

        position.x = Math.max(0, Math.min(position.x, maxX));
        position.y = Math.max(0, Math.min(position.y, maxY));

        return position;
    }

    /**
     * 销毁（清理）
     */
    destroy() {
        this.ballElement?.remove();
        this.panelElement?.remove();
        console.log('[QGN] 悬浮球导航器已销毁');
    }
}
