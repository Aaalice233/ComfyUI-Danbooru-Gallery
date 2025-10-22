/**
 * 优化执行系统JavaScript模块初始化
 * Optimized Execution System JavaScript Module Initialization
 *
 * 版本: 2.0.0
 * 基于ComfyUI原生机制完全重写
 */

import { api } from "/scripts/api.js";
import { app } from "/scripts/app.js";

// 导入UI增强组件
import('./ui-enhancement.js');
import('./migration-helper.js');

// 确保只初始化一次
if (!window.optimizedExecutionSystemLoaded) {
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeOptimizedExecutionSystem);
    } else {
        initializeOptimizedExecutionSystem();
    }

    function initializeOptimizedExecutionSystem() {
        console.log('[OptimizedExecutionSystem] 🚀 开始初始化优化执行系统');
        console.log('[OptimizedExecutionSystem] 🔧 版本: 2.0.0');
        console.log('[OptimizedExecutionSystem] 🎛️ 基于ComfyUI原生机制');

        // 加载UI增强模块
        try {
            import('./ui-enhancement.js');
            console.log('[OptimizedExecutionSystem] ✅ UI增强模块已加载');
        } catch (error) {
            console.warn('[OptimizedExecutionSystem] ⚠️ UI增强模块加载失败:', error);
        }

        // 延迟初始化，确保所有模块都加载完成
        setTimeout(() => {
            console.log('[OptimizedExecutionSystem] ✅ 优化执行系统初始化完成');
            console.log('[OptimizedExecutionSystem] 📋 已加载组件:');
            console.log('[OptimizedExecutionSystem]   - OptimizedExecutionEngine: 组顺序执行引擎');
            console.log('[OptimizedExecutionSystem]   - CacheControlEvents: 缓存控制事件系统');
            console.log('[OptimizedExecutionSystem]   - UIEnhancementManager: UI增强管理器');

            // 设置全局标志，防止重复初始化
            window.optimizedExecutionSystemLoaded = true;

            // 触发初始化完成事件
            const initEvent = new CustomEvent('optimizedExecutionSystemReady', {
                detail: {
                    version: '2.0.0',
                    timestamp: Date.now(),
                    components: ['OptimizedExecutionEngine', 'CacheControlEvents', 'UIEnhancementManager']
                }
            });
            document.dispatchEvent(initEvent);

            // 添加队列拦截钩子
            const originalEnqueue = app.enqueue;
            app.enqueue = function(task) {
                console.log('[OptimizedExecutionSystem] 拦截到新任务:', task);
                // 在这里可以添加对任务的预处理或后处理逻辑
                return originalEnqueue.call(this, task);
            };
            console.log('[OptimizedExecutionSystem] ✅ 队列拦截钩子已添加');

        }, 1000); // 1秒延迟确保稳定性
    }
}

// 导出配置
export const OPTIMIZED_EXECUTION_CONFIG = {
    version: '2.0.0',
    debugMode: true,
    defaultTimeout: 300000, // 5分钟默认超时
    maxRetries: 3
};

console.log('[OptimizedExecutionSystem] 📜 __init__.js 模块已加载');