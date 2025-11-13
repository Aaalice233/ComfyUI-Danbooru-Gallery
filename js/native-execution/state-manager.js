/**
 * 状态管理器 - State Manager
 * 统一管理执行状态，提供状态查询和持久化
 */

import { createLogger } from "../global/logger_client.js";

const logger = createLogger('state_manager');

/**
 * 执行状态枚举
 */
const ExecutionStatus = {
    PENDING: 'pending',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
};

/**
 * 执行状态数据结构
 */
class ExecutionState {
    constructor(executionId, config) {
        this.executionId = executionId;
        this.status = ExecutionStatus.PENDING;
        this.startTime = Date.now();
        this.endTime = null;
        this.completedGroups = [];
        this.failedGroups = [];
        this.totalGroups = config?.groups?.length || 0;
        this.configHash = config?.configHash || '';
        this.errorMessage = null;
    }
    
    /**
     * 获取执行进度（百分比）
     */
    getProgress() {
        if (this.totalGroups === 0) return 0;
        return Math.round((this.completedGroups.length / this.totalGroups) * 100);
    }
    
    /**
     * 获取执行时长（毫秒）
     */
    getDuration() {
        const endTime = this.endTime || Date.now();
        return endTime - this.startTime;
    }
    
    /**
     * 转换为普通对象
     */
    toObject() {
        return {
            executionId: this.executionId,
            status: this.status,
            startTime: this.startTime,
            endTime: this.endTime,
            completedGroups: this.completedGroups,
            failedGroups: this.failedGroups,
            totalGroups: this.totalGroups,
            configHash: this.configHash,
            errorMessage: this.errorMessage,
            progress: this.getProgress(),
            duration: this.getDuration()
        };
    }
}

/**
 * 状态管理器类
 */
class StateManager {
    constructor() {
        // 执行状态映射：executionId -> ExecutionState
        this.executionStates = new Map();
        
        // 历史记录限制
        this.historyLimit = 100;
        
        // 事件发射器
        this.eventEmitter = new EventTarget();
        
        logger.info('[StateManager] ✅ 状态管理器已初始化');
    }
    
    /**
     * 创建新状态
     * @param {string} executionId - 执行ID
     * @param {Object} config - 配置信息
     * @returns {ExecutionState} 创建的状态对象
     */
    createState(executionId, config) {
        if (this.executionStates.has(executionId)) {
            logger.warn(`[StateManager] ⚠️ 状态已存在: ${executionId}`);
            return this.executionStates.get(executionId);
        }
        
        const state = new ExecutionState(executionId, config);
        this.executionStates.set(executionId, state);
        
        // 清理旧状态
        this._cleanupOldStates();
        
        // 触发事件
        this._emitStateChange(executionId, 'created', state);
        
        logger.info(`[StateManager] 📝 创建状态: ${executionId}`);
        logger.info(`   总组数: ${state.totalGroups}`);
        
        return state;
    }
    
    /**
     * 更新状态
     * @param {string} executionId - 执行ID
     * @param {Object} updates - 更新的字段
     */
    updateState(executionId, updates) {
        const state = this.executionStates.get(executionId);
        
        if (!state) {
            logger.warn(`[StateManager] ⚠️ 状态不存在: ${executionId}`);
            return;
        }
        
        // 应用更新
        Object.assign(state, updates);
        
        // 如果状态变为终止状态，设置endTime
        if ([ExecutionStatus.COMPLETED, ExecutionStatus.FAILED, ExecutionStatus.CANCELLED].includes(state.status)) {
            if (!state.endTime) {
                state.endTime = Date.now();
            }
        }
        
        // 触发事件
        this._emitStateChange(executionId, 'updated', state);
        
        logger.debug(`[StateManager] 🔄 更新状态: ${executionId}`);
        logger.debug(`   更新字段: ${Object.keys(updates).join(', ')}`);
        
        return state;
    }
    
    /**
     * 获取状态
     * @param {string} executionId - 执行ID
     * @returns {ExecutionState|null} 状态对象或null
     */
    getState(executionId) {
        return this.executionStates.get(executionId) || null;
    }
    
    /**
     * 清除状态
     * @param {string} executionId - 执行ID
     */
    clearState(executionId) {
        const state = this.executionStates.get(executionId);
        
        if (state) {
            this.executionStates.delete(executionId);
            
            // 触发事件
            this._emitStateChange(executionId, 'deleted', state);
            
            logger.info(`[StateManager] 🗑️ 清除状态: ${executionId}`);
        }
    }
    
    /**
     * 清除所有状态
     */
    clearAllStates() {
        const count = this.executionStates.size;
        this.executionStates.clear();
        
        logger.info(`[StateManager] 🗑️ 清除所有状态（共 ${count} 条）`);
    }
    
    /**
     * 获取所有活动执行
     * @returns {ExecutionState[]} 活动执行状态列表
     */
    getActiveExecutions() {
        const activeStates = [];
        
        for (const state of this.executionStates.values()) {
            if (state.status === ExecutionStatus.RUNNING || state.status === ExecutionStatus.PENDING) {
                activeStates.push(state);
            }
        }
        
        return activeStates;
    }
    
    /**
     * 根据配置哈希查找执行
     * @param {string} configHash - 配置哈希
     * @returns {ExecutionState[]} 匹配的执行状态列表
     */
    findByConfigHash(configHash) {
        const matchedStates = [];
        
        for (const state of this.executionStates.values()) {
            if (state.configHash === configHash) {
                matchedStates.push(state);
            }
        }
        
        return matchedStates;
    }
    
    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        const stats = {
            total: this.executionStates.size,
            byStatus: {
                pending: 0,
                running: 0,
                completed: 0,
                failed: 0,
                cancelled: 0
            },
            activeCount: 0
        };
        
        for (const state of this.executionStates.values()) {
            stats.byStatus[state.status] = (stats.byStatus[state.status] || 0) + 1;
            
            if (state.status === ExecutionStatus.RUNNING || state.status === ExecutionStatus.PENDING) {
                stats.activeCount++;
            }
        }
        
        return stats;
    }
    
    /**
     * 监听状态变化
     * @param {Function} callback - 回调函数
     */
    onStateChange(callback) {
        this.eventEmitter.addEventListener('stateChange', (event) => {
            callback(event.detail);
        });
    }
    
    /**
     * 清理旧状态（内部方法）- 增强版
     * 按照优先级和时间窗口清理
     */
    _cleanupOldStates() {
        if (this.executionStates.size <= this.historyLimit) {
            return;
        }
        
        const now = Date.now();
        const retentionPolicies = {
            [ExecutionStatus.FAILED]: 7 * 24 * 60 * 60 * 1000,    // 7天
            [ExecutionStatus.CANCELLED]: 24 * 60 * 60 * 1000,      // 1天
            [ExecutionStatus.COMPLETED]: 60 * 60 * 1000            // 1小时
        };
        
        // 第一步：按时间窗口清理过期记录
        const expiredIds = [];
        for (const [executionId, state] of this.executionStates.entries()) {
            // 不清理活动状态
            if (state.status === ExecutionStatus.RUNNING || state.status === ExecutionStatus.PENDING) {
                continue;
            }
            
            const retentionTime = retentionPolicies[state.status] || retentionPolicies[ExecutionStatus.COMPLETED];
            const age = now - (state.endTime || state.startTime);
            
            if (age > retentionTime) {
                expiredIds.push(executionId);
            }
        }
        
        // 删除过期记录
        expiredIds.forEach(id => this.executionStates.delete(id));
        
        if (expiredIds.length > 0) {
            logger.debug(`[StateManager] 🧹 按时间窗口清理，删除 ${expiredIds.length} 条过期记录`);
        }
        
        // 第二步：如果仍超过限制，按优先级清理
        if (this.executionStates.size > this.historyLimit) {
            const completedStates = [];
            
            // 收集已完成的状态（按优先级排序）
            for (const [executionId, state] of this.executionStates.entries()) {
                if ([ExecutionStatus.COMPLETED, ExecutionStatus.FAILED, ExecutionStatus.CANCELLED].includes(state.status)) {
                    // 计算优先级分数（失败记录优先级最高）
                    let priority = 0;
                    if (state.status === ExecutionStatus.FAILED) priority = 3;
                    else if (state.status === ExecutionStatus.CANCELLED) priority = 2;
                    else priority = 1; // COMPLETED
                    
                    completedStates.push({ 
                        executionId, 
                        state, 
                        priority,
                        endTime: state.endTime || state.startTime
                    });
                }
            }
            
            // 按优先级和时间排序（优先级低的先删除，相同优先级则删除老的）
            completedStates.sort((a, b) => {
                if (a.priority !== b.priority) {
                    return a.priority - b.priority; // 优先级低的在前
                }
                return a.endTime - b.endTime; // 时间老的在前
            });
            
            // 删除最低优先级的记录，直到总数低于限制
            const toDelete = this.executionStates.size - this.historyLimit;
            
            for (let i = 0; i < Math.min(toDelete, completedStates.length); i++) {
                const { executionId } = completedStates[i];
                this.executionStates.delete(executionId);
            }
            
            logger.debug(`[StateManager] 🧹 按优先级清理，删除 ${Math.min(toDelete, completedStates.length)} 条记录`);
        }
    }
    
    /**
     * 触发状态变化事件（内部方法）
     * @param {string} executionId - 执行ID
     * @param {string} action - 动作类型
     * @param {ExecutionState} state - 状态对象
     */
    _emitStateChange(executionId, action, state) {
        const event = new CustomEvent('stateChange', {
            detail: {
                executionId,
                action,
                state: state.toObject()
            }
        });
        
        this.eventEmitter.dispatchEvent(event);
    }
}

// 创建全局单例
const stateManager = new StateManager();

export { stateManager, ExecutionStatus, ExecutionState };
