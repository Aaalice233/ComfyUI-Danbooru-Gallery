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

            // ✅ 关键修复：Hook app.queuePrompt() 和 api.queuePrompt()
            // 参考 ComfyUI-LG_GroupExecutor 的实现方式
            try {
                if (app && !app._originalQueuePrompt && api) {
                    console.log('[OptimizedExecutionSystem] 🔧 开始拦截队列方法...');
                    
                    // 保存原始方法
                    app._originalQueuePrompt = app.queuePrompt;
                    api._originalApiQueuePrompt = api.queuePrompt;
                    
                    // Hook app.queuePrompt() - 防止ComfyUI原生队列提交
                    app.queuePrompt = async function() {
                        if (window._groupExecutorActive) {
                            console.log('[OptimizedExecutionSystem] 🚫 已阻止ComfyUI原生队列提交（GroupExecutor控制中）');
                            return Promise.resolve();
                        }
                        console.log('[OptimizedExecutionSystem] ✅ 允许app.queuePrompt()继续执行');
                        return app._originalQueuePrompt.apply(this, arguments);
                    };
                    
                    // Hook api.queuePrompt() - 防止API直接队列提交
                    api.queuePrompt = async function(index, prompt) {
                        if (window._groupExecutorActive) {
                            console.log('[OptimizedExecutionSystem] 🚫 已阻止api.queuePrompt()（GroupExecutor控制中）');
                            return Promise.resolve();
                        }
                        console.log('[OptimizedExecutionSystem] ✅ 允许api.queuePrompt()继续执行');
                        return api._originalApiQueuePrompt.apply(this, [index, prompt]);
                    };
                    
                    console.log('[OptimizedExecutionSystem] ✅ 已成功拦截 app.queuePrompt() 和 api.queuePrompt()');
                }
            } catch (error) {
                console.warn('[OptimizedExecutionSystem] ⚠️ 拦截队列方法失败:', error);
                console.error(error.stack);
            }

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