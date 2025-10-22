/**
 * 执行状态显示组件
 * Execution Status Display Component
 */

export class ExecutionStatusDisplay {
    constructor(container) {
        this.container = container;
        this.currentStatus = 'idle';
        this.statusHistory = [];
        this.createStatusIndicator();
    }

    createStatusIndicator() {
        // 创建状态指示器
        const statusIndicator = document.createElement('div');
        statusIndicator.className = 'execution-status-indicator';
        statusIndicator.style.cssText = `
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 4px 8px;
            background: #333;
            border-radius: 4px;
            margin-bottom: 6px;
            flex-shrink: 0;
        `;

        // 状态灯
        this.statusLight = document.createElement('div');
        this.statusLight.style.cssText = `
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #666;
            transition: background-color 0.3s ease;
        `;

        // 状态文本
        this.statusText = document.createElement('span');
        this.statusText.textContent = '空闲';
        this.statusText.style.cssText = `
            font-size: 12px;
            font-weight: 500;
            color: #ccc;
        `;

        // 进度条
        this.progressBar = document.createElement('div');
        this.progressBar.style.cssText = `
            flex: 1;
            height: 4px;
            background: #444;
            border-radius: 2px;
            overflow: hidden;
            margin-left: auto;
        `;

        this.progressFill = document.createElement('div');
        this.progressFill.style.cssText = `
            height: 100%;
            background: #4CAF50;
            width: 0%;
            transition: width 0.3s ease;
        `;

        this.progressBar.appendChild(this.progressFill);

        statusIndicator.appendChild(this.statusLight);
        statusIndicator.appendChild(this.statusText);
        statusIndicator.appendChild(this.progressBar);

        this.container.appendChild(statusIndicator);
        this.statusIndicator = statusIndicator;
    }

    updateStatus(status, data = {}) {
        if (this.currentStatus === status) return;

        this.currentStatus = status;
        this.addStatusToHistory(status, data);
        this.renderStatus(status, data);
    }

    renderStatus(status, data) {
        const statusConfig = {
            'idle': {
                color: '#666',
                text: '空闲',
                progress: 0
            },
            'waiting': {
                color: '#FF9800',
                text: '等待中',
                progress: 0
            },
            'executing': {
                color: '#4CAF50',
                text: '执行中',
                progress: data.progress || 50
            },
            'completed': {
                color: '#2196F3',
                text: '已完成',
                progress: 100
            },
            'error': {
                color: '#F44336',
                text: '执行错误',
                progress: data.progress || 0
            },
            'paused': {
                color: '#9C27B0',
                text: '已暂停',
                progress: data.progress || 0
            }
        };

        const config = statusConfig[status] || statusConfig['idle'];

        // 更新状态灯
        this.statusLight.style.background = config.color;

        // 更新状态文本
        this.statusText.textContent = config.text;
        this.statusText.style.color = config.color;

        // 更新进度条
        this.progressFill.style.background = config.color;
        this.progressFill.style.width = `${config.progress}%`;

        // 添加状态动画效果
        this.addStatusAnimation(status);
    }

    addStatusAnimation(status) {
        // 移除之前的动画类
        this.statusIndicator.className = this.statusIndicator.className.replace(/status-\w+/g, '');

        // 添加新的动画类
        const animationClass = `status-${status}`;
        this.statusIndicator.classList.add(animationClass);

        // 根据状态添加特殊效果
        switch (status) {
            case 'executing':
                this.addPulseEffect();
                break;
            case 'error':
                this.addShakeEffect();
                break;
            case 'completed':
                this.addSuccessEffect();
                break;
        }
    }

    addPulseEffect() {
        // 添加脉冲动画
        this.statusLight.style.animation = 'pulse 1.5s infinite';

        // 添加CSS动画
        if (!document.querySelector('#pulse-animation')) {
            const style = document.createElement('style');
            style.id = 'pulse-animation';
            style.textContent = `
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    addShakeEffect() {
        // 添加震动动画
        this.statusIndicator.style.animation = 'shake 0.5s';

        // 添加CSS动画
        if (!document.querySelector('#shake-animation')) {
            const style = document.createElement('style');
            style.id = 'shake-animation';
            style.textContent = `
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-2px); }
                    75% { transform: translateX(2px); }
                }
            `;
            document.head.appendChild(style);
        }

        // 动画结束后清除
        setTimeout(() => {
            this.statusIndicator.style.animation = '';
        }, 500);
    }

    addSuccessEffect() {
        // 添加成功动画
        this.statusLight.style.animation = 'success-pulse 0.6s';

        // 添加CSS动画
        if (!document.querySelector('#success-pulse-animation')) {
            const style = document.createElement('style');
            style.id = 'success-pulse-animation';
            style.textContent = `
                @keyframes success-pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.2); }
                    100% { transform: scale(1); }
                }
            `;
            document.head.appendChild(style);
        }

        // 动画结束后清除
        setTimeout(() => {
            this.statusLight.style.animation = '';
        }, 600);
    }

    addStatusToHistory(status, data) {
        const historyItem = {
            status,
            timestamp: Date.now(),
            data: { ...data }
        };

        this.statusHistory.push(historyItem);

        // 保持历史记录不超过10条
        if (this.statusHistory.length > 10) {
            this.statusHistory.shift();
        }
    }

    getLatestStatus() {
        return this.statusHistory.length > 0
            ? this.statusHistory[this.statusHistory.length - 1]
            : { status: 'idle', timestamp: Date.now(), data: {} };
    }

    getStatusHistory() {
        return [...this.statusHistory];
    }

    clearHistory() {
        this.statusHistory = [];
        this.updateStatus('idle');
    }

    setProgress(percentage) {
        percentage = Math.max(0, Math.min(100, percentage));
        this.progressFill.style.width = `${percentage}%`;

        if (this.currentStatus === 'executing') {
            this.progressFill.style.background = '#4CAF50';
        }
    }

    setStatusText(text) {
        this.statusText.textContent = text;
    }

    destroy() {
        // 清理动画CSS
        const animations = ['pulse-animation', 'shake-animation', 'success-pulse-animation'];
        animations.forEach(id => {
            const element = document.querySelector(`#${id}`);
            if (element) {
                element.remove();
            }
        });

        // 清理DOM
        if (this.statusIndicator && this.statusIndicator.parentNode) {
            this.statusIndicator.parentNode.removeChild(this.statusIndicator);
        }
    }
}

// 导出状态类型
export const EXECUTION_STATUS = {
    IDLE: 'idle',
    WAITING: 'waiting',
    EXECUTING: 'executing',
    COMPLETED: 'completed',
    ERROR: 'error',
    PAUSED: 'paused'
};