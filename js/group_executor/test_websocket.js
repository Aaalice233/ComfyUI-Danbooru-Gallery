/**
 * WebSocket 测试脚本 - WebSocket Test Script
 * 用于测试组执行管理器的WebSocket连接功能
 */

// 添加到全局作用域的测试函数
window.testGEMWebSocket = function() {
    console.log(`[GEM-TEST] ========== 开始 WebSocket 测试 ==========`);

    // 检查诊断工具
    if (!window.gemWebSocketDiagnostic) {
        console.error(`[GEM-TEST] ✗ WebSocket 诊断工具未加载`);
        return false;
    }

    // 显示诊断报告
    const report = window.gemWebSocketDiagnostic.showDiagnosticReport();

    // 测试WebSocket连接
    const connectionTest = window.gemWebSocketDiagnostic.testWebSocketConnection();

    // 检查关键组件
    const checks = {
        diagnosticTool: !!window.gemWebSocketDiagnostic,
        api: !!window.api,
        app: !!window.app,
        queueManager: !!window.queueManager,
        multiLanguageManager: !!window.globalMultiLanguageManager
    };

    console.log(`[GEM-TEST] 组件检查:`, checks);

    const allChecksPass = Object.values(checks).every(check => check === true);

    if (allChecksPass && connectionTest) {
        console.log(`[GEM-TEST] ✓ 所有测试通过，WebSocket 功能正常`);
        return true;
    } else {
        console.error(`[GEM-TEST] ✗ 部分测试失败，请检查组件状态`);
        return false;
    }
};

// 添加便捷的监控函数
window.monitorGEMWebSocket = function() {
    console.log(`[GEM-MONITOR] ========== 开始 WebSocket 监控 ==========`);

    if (!window.gemWebSocketDiagnostic) {
        console.error(`[GEM-MONITOR] ✗ WebSocket 诊断工具未加载`);
        return;
    }

    // 每5秒显示一次状态
    const monitorInterval = setInterval(() => {
        const status = window.gemWebSocketDiagnostic.checkAPIStatus();
        console.log(`[GEM-MONITOR] 状态检查:`, status);
    }, 5000);

    // 30秒后停止监控
    setTimeout(() => {
        clearInterval(monitorInterval);
        console.log(`[GEM-MONITOR] ========== WebSocket 监控结束 ==========`);
    }, 30000);

    console.log(`[GEM-MONITOR] 监控已启动，将持续30秒`);
    return monitorInterval;
};

console.log(`[GEM-TEST] ✓ WebSocket 测试脚本已加载`);
console.log(`[GEM-TEST] 使用 window.testGEMWebSocket() 运行测试`);
console.log(`[GEM-TEST] 使用 window.monitorGEMWebSocket() 开始监控`);