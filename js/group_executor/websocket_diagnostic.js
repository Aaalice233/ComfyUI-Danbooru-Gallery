/**
 * WebSocket 诊断工具 - WebSocket Diagnostic Tool
 * 用于诊断和监控组执行管理器的WebSocket连接状态
 */

import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

class WebSocketDiagnostic {
    constructor() {
        this.diagnosticData = {
            startTime: new Date().toISOString(),
            setupCount: 0,
            lastSetupTime: null,
            listenerRegistrations: [],
            messageHistory: [],
            connectionStatus: 'unknown',
            healthCheckResults: []
        };

        this.initialize();
    }

    /**
     * 初始化诊断工具
     */
    initialize() {
        console.log(`[GEM-DIAG] ========== WebSocket 诊断工具启动 ==========`);
        console.log(`[GEM-DIAG] 启动时间:`, this.diagnosticData.startTime);
        console.log(`[GEM-DIAG] 浏览器:`, navigator.userAgent);
        console.log(`[GEM-DIAG] 页面URL:`, window.location.href);

        // 监听页面可见性变化
        document.addEventListener('visibilitychange', () => {
            this.logVisibilityChange();
        });

        // 监听页面卸载
        window.addEventListener('beforeunload', () => {
            this.logPageUnload();
        });

        // 添加全局诊断方法
        window.gemDiagnostic = this;
        console.log(`[GEM-DIAG] ✓ 诊断工具已注册到 window.gemDiagnostic`);
    }

    /**
     * 记录设置状态
     */
    logSetup(setupCount, listenerID) {
        this.diagnosticData.setupCount = setupCount;
        this.diagnosticData.lastSetupTime = new Date().toISOString();

        console.log(`[GEM-DIAG] ========== Setup 事件记录 ==========`);
        console.log(`[GEM-DIAG] Setup 计数:`, setupCount);
        console.log(`[GEM-DIAG] 监听器ID:`, listenerID);
        console.log(`[GEM-DIAG] Setup 时间:`, this.diagnosticData.lastSetupTime);

        // 检查API状态
        this.checkAPIStatus();
    }

    /**
     * 检查API状态
     */
    checkAPIStatus() {
        console.log(`[GEM-DIAG] ========== API 状态检查 ==========`);

        const status = {
            apiExists: !!api,
            apiType: typeof api,
            apiMethods: api ? Object.getOwnPropertyNames(api).filter(name => typeof api[name] === 'function') : [],
            socketExists: !!(api && api.socket),
            socketReadyState: api && api.socket ? api.socket.readyState : 'N/A',
            socketUrl: api && api.socket ? api.socket.url : 'N/A',
            hasAddEventListener: api && typeof api.addEventListener === 'function'
        };

        this.diagnosticData.connectionStatus = status.socketReadyState === 1 ? 'connected' : 'disconnected';

        console.log(`[GEM-DIAG] API 状态:`, status);

        // 尝试获取WebSocket客户端信息
        if (api && api.socket_clients) {
            console.log(`[GEM-DIAG] WebSocket 客户端数量:`, api.socket_clients.length);
        }

        return status;
    }

    /**
     * 记录监听器注册
     */
    logListenerRegistration(eventType, success, error = null) {
        const registration = {
            timestamp: new Date().toISOString(),
            eventType,
            success,
            error: error ? error.message : null
        };

        this.diagnosticData.listenerRegistrations.push(registration);

        console.log(`[GEM-DIAG] ========== 监听器注册记录 ==========`);
        console.log(`[GEM-DIAG] 事件类型:`, eventType);
        console.log(`[GEM-DIAG] 注册结果:`, success ? '成功' : '失败');
        if (error) {
            console.log(`[GEM-DIAG] 错误信息:`, error.message);
            console.log(`[GEM-DIAG] 错误堆栈:`, error.stack);
        }
    }

    /**
     * 记录消息接收
     */
    logMessageReceived(eventType, detail, listenerID) {
        const message = {
            timestamp: new Date().toISOString(),
            eventType,
            listenerID,
            detail: JSON.parse(JSON.stringify(detail)),
            messageSize: JSON.stringify(detail).length
        };

        this.diagnosticData.messageHistory.push(message);

        console.log(`[GEM-DIAG] ========== 消息接收记录 ==========`);
        console.log(`[GEM-DIAG] 事件类型:`, eventType);
        console.log(`[GEM-DIAG] 监听器ID:`, listenerID);
        console.log(`[GEM-DIAG] 接收时间:`, message.timestamp);
        console.log(`[GEM-DIAG] 消息大小:`, `${message.messageSize} 字节`);
        console.log(`[GEM-DIAG] 消息内容:`, detail);

        // 保持最近100条消息
        if (this.diagnosticData.messageHistory.length > 100) {
            this.diagnosticData.messageHistory = this.diagnosticData.messageHistory.slice(-100);
        }
    }

    /**
     * 记录健康检查
     */
    logHealthCheck(healthData) {
        const check = {
            timestamp: new Date().toISOString(),
            ...healthData
        };

        this.diagnosticData.healthCheckResults.push(check);

        // 保持最近50次检查
        if (this.diagnosticData.healthCheckResults.length > 50) {
            this.diagnosticData.healthCheckResults = this.diagnosticData.healthCheckResults.slice(-50);
        }
    }

    /**
     * 记录执行锁设置
     */
    logLockSet(lockData) {
        const lockSet = {
            timestamp: new Date().toISOString(),
            type: 'lock_set',
            ...lockData
        };

        this.diagnosticData.messageHistory.push(lockSet);
        console.log(`[GEM-DIAG] 执行锁设置记录:`, lockSet);

        // 保持最近100条消息
        if (this.diagnosticData.messageHistory.length > 100) {
            this.diagnosticData.messageHistory = this.diagnosticData.messageHistory.slice(-100);
        }
    }

    /**
     * 记录执行锁释放
     */
    logLockRelease(lockData) {
        const lockRelease = {
            timestamp: new Date().toISOString(),
            type: 'lock_release',
            ...lockData
        };

        this.diagnosticData.messageHistory.push(lockRelease);
        console.log(`[GEM-DIAG] 执行锁释放记录:`, lockRelease);

        // 保持最近100条消息
        if (this.diagnosticData.messageHistory.length > 100) {
            this.diagnosticData.messageHistory = this.diagnosticData.messageHistory.slice(-100);
        }
    }

    /**
     * 记录页面可见性变化
     */
    logVisibilityChange() {
        console.log(`[GEM-DIAG] ========== 页面可见性变化 ==========`);
        console.log(`[GEM-DIAG] 页面可见:`, !document.hidden);
        console.log(`[GEM-DIAG] 时间:`, new Date().toISOString());
    }

    /**
     * 记录页面卸载
     */
    logPageUnload() {
        console.log(`[GEM-DIAG] ========== 页面即将卸载 ==========`);
        console.log(`[GEM-DIAG] 总 Setup 次数:`, this.diagnosticData.setupCount);
        console.log(`[GEM-DIAG] 总消息数量:`, this.diagnosticData.messageHistory.length);
        console.log(`[GEM-DIAG] 会话持续时间:`, Date.now() - new Date(this.diagnosticData.startTime).getTime(), 'ms');
    }

    /**
     * 获取诊断报告
     */
    getDiagnosticReport() {
        const report = {
            ...this.diagnosticData,
            currentStatus: this.checkAPIStatus(),
            sessionDuration: Date.now() - new Date(this.diagnosticData.startTime).getTime(),
            summary: {
                totalSetups: this.diagnosticData.setupCount,
                totalMessages: this.diagnosticData.messageHistory.length,
                totalListeners: this.diagnosticData.listenerRegistrations.length,
                successfulRegistrations: this.diagnosticData.listenerRegistrations.filter(r => r.success).length,
                failedRegistrations: this.diagnosticData.listenerRegistrations.filter(r => !r.success).length
            }
        };

        return report;
    }

    /**
     * 显示诊断报告
     */
    showDiagnosticReport() {
        const report = this.getDiagnosticReport();

        console.log(`[GEM-DIAG] ==================== 诊断报告 ====================`);
        console.log(`[GEM-DIAG] 会话开始时间:`, report.startTime);
        console.log(`[GEM-DIAG] 会话持续时间:`, `${(report.sessionDuration / 1000).toFixed(2)} 秒`);
        console.log(`[GEM-DIAG] Setup 次数:`, report.summary.totalSetups);
        console.log(`[GEM-DIAG] 监听器注册:`, `${report.summary.successfulRegistrations}/${report.summary.totalListeners} 成功`);
        console.log(`[GEM-DIAG] 接收消息数:`, report.summary.totalMessages);
        console.log(`[GEM-DIAG] 当前连接状态:`, report.currentStatus.socketExists ? report.currentStatus.socketReadyState : '未连接');
        console.log(`[GEM-DIAG] =================================================`);

        return report;
    }

    /**
     * 测试WebSocket连接
     */
    async testWebSocketConnection() {
        console.log(`[GEM-DIAG] ========== WebSocket 连接测试 ==========`);

        if (!api) {
            console.error(`[GEM-DIAG] ✗ API 对象不存在`);
            return false;
        }

        if (!api.socket) {
            console.error(`[GEM-DIAG] ✗ WebSocket socket 不存在`);
            return false;
        }

        const socketState = api.socket.readyState;
        console.log(`[GEM-DIAG] Socket 状态:`, socketState);

        const states = {
            0: 'CONNECTING',
            1: 'OPEN',
            2: 'CLOSING',
            3: 'CLOSED'
        };

        console.log(`[GEM-DIAG] Socket 状态描述:`, states[socketState] || 'UNKNOWN');

        if (socketState === 1) {
            console.log(`[GEM-DIAG] ✓ WebSocket 连接正常`);
            return true;
        } else {
            console.warn(`[GEM-DIAG] ⚠️ WebSocket 连接异常`);
            return false;
        }
    }

    /**
     * 清除诊断数据
     */
    clearDiagnosticData() {
        this.diagnosticData = {
            startTime: new Date().toISOString(),
            setupCount: 0,
            lastSetupTime: null,
            listenerRegistrations: [],
            messageHistory: [],
            connectionStatus: 'unknown',
            healthCheckResults: []
        };
        console.log(`[GEM-DIAG] ✓ 诊断数据已清除`);
    }
}

// 创建全局诊断实例
window.gemWebSocketDiagnostic = new WebSocketDiagnostic();

// 添加便捷方法
window.showGemDiagnostic = () => window.gemWebSocketDiagnostic.showDiagnosticReport();
window.testGemWebSocket = () => window.gemWebSocketDiagnostic.testWebSocketConnection();
window.clearGemDiagnostic = () => window.gemWebSocketDiagnostic.clearDiagnosticData();

console.log(`[GEM-DIAG] ✓ WebSocket 诊断工具已加载`);
console.log(`[GEM-DIAG] 使用 window.showGemDiagnostic() 查看诊断报告`);
console.log(`[GEM-DIAG] 使用 window.testGemWebSocket() 测试WebSocket连接`);
console.log(`[GEM-DIAG] 使用 window.clearGemDiagnostic() 清除诊断数据`);