/**
 * 缓存控制事件系统 - Cache Control Events System
 * 管理跨节点的缓存控制状态协调
 *
 * ⚠️ 关键修正：
 * 1. 提供全局状态管理接口
 * 2. 实现稳定的事件通知机制
 * 3. 支持时间同步和超时处理
 * 4. 增强调试和状态监控
 */

import { createLogger } from "../global/logger_client.js";

// 创建logger实例
const logger = createLogger('cache_control_events');

// Debug辅助函数
const COMPONENT_NAME = 'cache_control_events';
const debugLog = (...args) => {
    if (window.shouldDebug && window.shouldDebug(COMPONENT_NAME)) {
        logger.info(...args);
    }
};

class CacheControlEvents {
    constructor() {
        this.cacheSignals = new Map(); // executionId_groupName -> control signal
        this.stateHistory = new Map(); // executionId -> Array of state changes
        this.setupEventListeners();
        this.debugMode = true;

        debugLog('[CacheControlEvents] ✅ 缓存控制事件系统已初始化');
        debugLog('[CacheControlEvents] 🔧 版本: 2.0.0');
        debugLog('[CacheControlEvents] 🎛️ 基于ComfyUI原生机制');
    }

    setupEventListeners() {
        // 监听Python节点发送的缓存控制信号
        document.addEventListener('cache_control_signal', (event) => {
            const { executionId, controlSignal } = event.detail;
            this.updateCacheSignal(executionId, controlSignal);
        });

        // 监听执行引擎的缓存状态更新
        document.addEventListener('cacheControlUpdate', (event) => {
            const { executionId, groupName, enabled } = event.detail;
            this.updateGroupCacheState(executionId, groupName, enabled);
        });

        logger.info('[CacheControlEvents] 📡 事件监听器已设置');
    }

    updateCacheSignal(executionId, controlSignal) {
        /** 更新缓存控制信号 */
        if (!executionId) {
            logger.warn('[CacheControlEvents] ⚠️ 无效的执行ID');
            return;
        }

        // 存储控制信号
        this.cacheSignals.set(executionId, controlSignal);

        // 更新组状态
        const groupsState = controlSignal.groups_state || {};
        Object.entries(groupsState).forEach(([groupName, groupState]) => {
            this.updateGroupCacheState(executionId, groupName, groupState);
        });

        // 记录历史
        this.recordStateHistory(executionId, 'signal_updated', controlSignal);

        if (this.debugMode) {
            logger.info(`[CacheControlEvents] 📥 缓存信号更新: ${executionId}`);
            logger.info(`   - 启用状态: ${controlSignal.enabled || false}`);
            logger.info(`   - 控制模式: ${controlSignal.mode || 'unknown'}`);
            logger.info(`   - 组状态数量: ${Object.keys(groupsState).length}`);
            logger.info(`   - 时间戳: ${new Date(controlSignal.timestamp || 0).toLocaleTimeString()}`);
        }
    }

    updateGroupCacheState(executionId, groupName, enabled) {
        /** 更新组的缓存状态 */
        if (!executionId || !groupName) {
            logger.warn('[CacheControlEvents] ⚠️ 无效的参数');
            return;
        }

        const key = `${executionId}_${groupName}`;
        const previousState = this.getGroupCacheState(executionId, groupName);
        const currentState = {
            enabled: enabled,
            timestamp: Date.now(),
            changed: previousState?.enabled !== enabled,
            executionCount: (previousState?.executionCount || 0) + (enabled ? 1 : 0)
        };

        // 通过Map管理（不直接使用全局变量）
        if (!this.cacheSignals.has(executionId)) {
            this.cacheSignals.set(executionId, {
                groups_state: {}
            });
        }

        const signal = this.cacheSignals.get(executionId);
        if (!signal.groups_state) {
            signal.groups_state = {};
        }

        signal.groups_state[groupName] = {
            enabled: enabled,
            timestamp: currentState.timestamp,
            executionCount: currentState.executionCount
        };

        // 记录状态变更历史
        this.recordStateHistory(executionId, 'group_state_changed', {
            groupName,
            from: previousState?.enabled,
            to: enabled,
            timestamp: currentState.timestamp
        });

        if (this.debugMode) {
            logger.info(`[CacheControlEvents] 🎛️ 组状态更新: ${groupName} = ${enabled}`);
            if (currentState.changed) {
                logger.info(`   - 状态变更: ${previousState?.enabled} → ${enabled}`);
            }
            logger.info(`   - 执行次数: ${currentState.executionCount}`);
            logger.info(`   - 时间戳: ${new Date(currentState.timestamp).toLocaleTimeString()}`);
        }

        // 触发自定义事件通知缓存节点
        this.notifyCacheNodeState(executionId, groupName, currentState);
    }

    notifyCacheNodeState(executionId, groupName, state) {
        /** 通知缓存节点状态变更 */
        const event = new CustomEvent('cacheNodeStateUpdate', {
            detail: {
                executionId: executionId,
                groupName: groupName,
                enabled: state.enabled,
                timestamp: state.timestamp,
                executionCount: state.executionCount,
                source: 'CacheControlEvents'
            }
        });

        document.dispatchEvent(event);

        if (this.debugMode) {
            logger.info(`[CacheControlEvents] 📡 缓存节点状态通知已发送: ${groupName}`);
        }
    }

    getGroupCacheState(executionId, groupName) {
        /** 获取组的缓存状态 */
        if (!executionId || !groupName) {
            return null;
        }

        const signal = this.cacheSignals.get(executionId);
        if (!signal || !signal.groups_state) {
            return null;
        }

        return signal.groups_state[groupName] || null;
    }

    isGroupCacheEnabled(executionId, groupName) {
        /** 检查组缓存是否启用 */
        const state = this.getGroupCacheState(executionId, groupName);
        return state?.enabled || false;
    }

    waitForGroupCacheState(executionId, groupName, enabled, timeout = 30000) {
        /** 等待组缓存状态变更 */
        return new Promise((resolve, reject) => {
            if (this.isGroupCacheEnabled(executionId, groupName) === enabled) {
                resolve(true);
                return;
            }

            const startTime = Date.now();
            const checkInterval = 100; // 100ms检查一次

            const checkState = () => {
                const currentState = this.getGroupCacheState(executionId, groupName);
                if (currentState?.enabled === enabled) {
                    resolve(true);
                    return;
                }

                if (Date.now() - startTime > timeout) {
                    reject(new Error(`等待缓存状态超时: ${timeout}ms`));
                    return;
                }

                setTimeout(checkState, checkInterval);
            };

            checkState();
        });
    }

    recordStateHistory(executionId, eventType, data) {
        /** 记录状态变更历史 */
        if (!this.stateHistory.has(executionId)) {
            this.stateHistory.set(executionId, []);
        }

        const history = this.stateHistory.get(executionId);
        history.push({
            eventType,
            timestamp: Date.now(),
            data
        });

        // 保持最近100个历史记录
        if (history.length > 100) {
            this.stateHistory.set(executionId, history.slice(-100));
        }

        if (this.debugMode) {
            logger.info(`[CacheControlEvents] 📜 状态历史记录: ${executionId} - ${eventType}`);
        }
    }

    getStateHistory(executionId, eventType = null) {
        /** 获取状态历史 */
        const history = this.stateHistory.get(executionId) || [];

        if (eventType) {
            return history.filter(record => record.eventType === eventType);
        }

        return history;
    }

    clearExecutionState(executionId) {
        /** 清理执行状态 */
        this.cacheSignals.delete(executionId);
        this.stateHistory.delete(executionId);

        logger.info(`[CacheControlEvents] 🧹 清理执行状态: ${executionId}`);

        if (this.debugMode) {
            logger.info(`[CacheControlEvents] 🗑️ 缓存信号已清理`);
            logger.info(`[CacheControlEvents] 🗑️ 状态历史已清理`);
        }
    }

    getDebugInfo() {
        /** 获取调试信息 */
        return {
            activeExecutions: Array.from(this.executionContexts.keys()),
            cacheSignals: Array.from(this.cacheSignals.keys()),
            stateHistories: Array.from(this.stateHistory.keys()),
            debugMode: this.debugMode,
            version: '2.0.0'
        };
    }

    setDebugMode(enabled) {
        /** 设置调试模式 */
        this.debugMode = enabled;
        logger.info(`[CacheControlEvents] 🔧 调试模式: ${enabled ? '启用' : '禁用'}`);
    }

    // 向后兼容性方法
    getAllCacheSignals() {
        return Array.from(this.cacheSignals.entries()).map(([id, signal]) => ({
            executionId: id,
            ...signal
        }));
    }

    getAllGroupStates(executionId) {
        const signal = this.cacheSignals.get(executionId);
        return signal?.groups_state || {};
    }
}

// 创建全局实例
window.cacheControlEvents = new CacheControlEvents();

logger.info('[CacheControlEvents] 🚀 缓存控制事件系统已启动');
logger.info('[CacheControlEvents] 📋 全局实例: window.cacheControlEvents');
logger.info('[CacheControlEvents] ✅ 基于ComfyUI原生机制的缓存控制系统就绪');