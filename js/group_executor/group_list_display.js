/**
 * 组列表显示组件
 * Group List Display Component
 */

export class GroupListDisplay {
    constructor(container) {
        this.container = container;
        this.groups = [];
        this.currentGroupIndex = 0;
        this.createGroupList();
    }

    createGroupList() {
        // 创建组列表容器
        const listContainer = document.createElement('div');
        listContainer.className = 'group-list-container';
        listContainer.style.cssText = `
            background: #333;
            border-radius: 4px;
            padding: 6px;
            min-height: 80px;
            max-height: 100px;
        `;

        // 标题
        const title = document.createElement('div');
        title.textContent = '执行队列';
        title.style.cssText = `
            font-size: 12px;
            font-weight: 600;
            color: #ccc;
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;

        // 进度信息
        this.progressInfo = document.createElement('span');
        this.progressInfo.textContent = '0/0';
        this.progressInfo.style.cssText = `
            font-size: 11px;
            color: #888;
            font-weight: normal;
        `;

        title.appendChild(this.progressInfo);

        // 组列表
        this.groupsList = document.createElement('div');
        this.groupsList.className = 'groups-list';
        this.groupsList.style.cssText = `
            max-height: 70px;
            overflow-y: auto;
        `;

        // 添加滚动条样式
        this.addScrollbarStyles();

        listContainer.appendChild(title);
        listContainer.appendChild(this.groupsList);

        this.container.appendChild(listContainer);
    }

    addScrollbarStyles() {
        // 添加自定义滚动条样式
        if (!document.querySelector('#group-list-scrollbar-styles')) {
            const style = document.createElement('style');
            style.id = 'group-list-scrollbar-styles';
            style.textContent = `
                .groups-list::-webkit-scrollbar {
                    width: 6px;
                }
                .groups-list::-webkit-scrollbar-track {
                    background: #444;
                    border-radius: 3px;
                }
                .groups-list::-webkit-scrollbar-thumb {
                    background: #666;
                    border-radius: 3px;
                }
                .groups-list::-webkit-scrollbar-thumb:hover {
                    background: #888;
                }
            `;
            document.head.appendChild(style);
        }
    }

    updateGroups(groups, currentGroupIndex = 0) {
        this.groups = groups || [];
        this.currentGroupIndex = Math.max(0, Math.min(currentGroupIndex, this.groups.length - 1));
        this.renderGroups();
        this.updateProgressInfo();
    }

    renderGroups() {
        this.groupsList.innerHTML = '';

        if (!this.groups || this.groups.length === 0) {
            this.renderEmptyState();
            return;
        }

        this.groups.forEach((group, index) => {
            const groupItem = this.createGroupItem(group, index);
            this.groupsList.appendChild(groupItem);
        });

        // 滚动到当前组
        this.scrollToCurrentGroup();
    }

    renderEmptyState() {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.textContent = '暂无执行组';
        emptyState.style.cssText = `
            text-align: center;
            color: #888;
            font-style: italic;
            padding: 20px;
            font-size: 12px;
        `;

        this.groupsList.appendChild(emptyState);
    }

    createGroupItem(group, index) {
        const item = document.createElement('div');
        item.className = 'group-item';
        item.style.cssText = `
            display: flex;
            align-items: center;
            padding: 6px 8px;
            margin: 2px 0;
            background: ${this.getGroupBackground(index)};
            border-radius: 4px;
            border-left: 3px solid ${this.getGroupBorderColor(index)};
            transition: all 0.2s ease;
            cursor: pointer;
        `;

        // 状态指示器
        const statusIndicator = document.createElement('div');
        statusIndicator.style.cssText = `
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: ${this.getStatusColor(index)};
            margin-right: 8px;
            flex-shrink: 0;
        `;

        // 组信息
        const groupInfo = document.createElement('div');
        groupInfo.style.cssText = `
            flex: 1;
            min-width: 0;
        `;

        // 组名
        const groupName = document.createElement('div');
        groupName.textContent = group.name || `组 ${index + 1}`;
        groupName.style.cssText = `
            font-size: 12px;
            font-weight: ${index === this.currentGroupIndex ? '600' : '400'};
            color: ${index === this.currentGroupIndex ? '#fff' : '#ccc'};
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        `;

        // 节点数量
        const nodeCount = document.createElement('div');
        const nodeCountText = this.getNodeCountText(group);
        nodeCount.textContent = nodeCountText;
        nodeCount.style.cssText = `
            font-size: 10px;
            color: #888;
            margin-top: 2px;
        `;

        groupInfo.appendChild(groupName);
        groupInfo.appendChild(nodeCount);

        // 执行状态
        const statusText = document.createElement('div');
        statusText.textContent = this.getStatusText(index);
        statusText.style.cssText = `
            font-size: 10px;
            color: ${this.getStatusColor(index)};
            font-weight: 500;
            margin-left: 8px;
        `;

        item.appendChild(statusIndicator);
        item.appendChild(groupInfo);
        item.appendChild(statusText);

        // 添加悬停效果
        item.addEventListener('mouseenter', () => {
            if (index !== this.currentGroupIndex) {
                item.style.background = '#444';
            }
        });

        item.addEventListener('mouseleave', () => {
            item.style.background = this.getGroupBackground(index);
        });

        // 点击事件
        item.addEventListener('click', () => {
            this.onGroupClick(index, group);
        });

        return item;
    }

    getGroupBackground(index) {
        if (index < this.currentGroupIndex) {
            return '#2a4a2a'; // 已完成
        } else if (index === this.currentGroupIndex) {
            return '#1a4a1a'; // 当前执行
        } else {
            return '#3a3a3a'; // 等待中
        }
    }

    getGroupBorderColor(index) {
        if (index < this.currentGroupIndex) {
            return '#4CAF50'; // 已完成
        } else if (index === this.currentGroupIndex) {
            return '#8BC34A'; // 当前执行
        } else {
            return '#666'; // 等待中
        }
    }

    getStatusColor(index) {
        if (index < this.currentGroupIndex) {
            return '#4CAF50'; // 已完成 - 绿色
        } else if (index === this.currentGroupIndex) {
            return '#8BC34A'; // 当前执行 - 亮绿色
        } else {
            return '#666'; // 等待中 - 灰色
        }
    }

    getStatusText(index) {
        if (index < this.currentGroupIndex) {
            return '已完成';
        } else if (index === this.currentGroupIndex) {
            return '执行中';
        } else {
            return '等待中';
        }
    }

    getNodeCountText(group) {
        const nodeCount = (group.nodes && Array.isArray(group.nodes)) ? group.nodes.length : 0;
        return `${nodeCount} 个节点`;
    }

    onGroupClick(index, group) {
        // 可以添加点击组的处理逻辑
        console.log(`点击了组 ${index + 1}:`, group);

        // 添加选中效果
        const allItems = this.groupsList.querySelectorAll('.group-item');
        allItems.forEach(item => {
            item.style.outline = 'none';
        });

        const clickedItem = allItems[index];
        if (clickedItem) {
            clickedItem.style.outline = '2px solid #8BC34A';
            setTimeout(() => {
                clickedItem.style.outline = 'none';
            }, 1000);
        }
    }

    updateProgressInfo() {
        const completed = this.currentGroupIndex;
        const total = this.groups.length;
        this.progressInfo.textContent = `${completed}/${total}`;
    }

    scrollToCurrentGroup() {
        const currentItems = this.groupsList.querySelectorAll('.group-item');
        const currentItem = currentItems[this.currentGroupIndex];

        if (currentItem) {
            setTimeout(() => {
                currentItem.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest'
                });
            }, 100);
        }
    }

    setCurrentGroup(index) {
        if (index >= 0 && index < this.groups.length) {
            this.currentGroupIndex = index;
            this.renderGroups();
            this.updateProgressInfo();
        }
    }

    nextGroup() {
        if (this.currentGroupIndex < this.groups.length - 1) {
            this.setCurrentGroup(this.currentGroupIndex + 1);
        }
    }

    previousGroup() {
        if (this.currentGroupIndex > 0) {
            this.setCurrentGroup(this.currentGroupIndex - 1);
        }
    }

    getGroups() {
        return [...this.groups];
    }

    getCurrentGroupIndex() {
        return this.currentGroupIndex;
    }

    getCurrentGroup() {
        return this.groups[this.currentGroupIndex] || null;
    }

    clear() {
        this.groups = [];
        this.currentGroupIndex = 0;
        this.renderGroups();
        this.updateProgressInfo();
    }

    destroy() {
        // 清理CSS
        const scrollbarStyles = document.querySelector('#group-list-scrollbar-styles');
        if (scrollbarStyles) {
            scrollbarStyles.remove();
        }

        // 清理DOM
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}