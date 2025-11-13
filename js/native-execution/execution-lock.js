/**
 * 执行锁管理器 - Execution Lock Manager
 * 前端层执行互斥控制，确保同一时刻只有一个执行在进行
 */

import { createLogger } from "../global/logger_client.js";

const logger = createLogger('execution_lock');

class ExecutionLock {
    constructor() {
        this.isLocked = false;
        this.currentExecutionId = null;
        this.lockAcquireTime = null;
        this.lockTimeout = 3600 * 1000; // 1小时超时（毫秒）
        
        // 定时检查超时
        this.timeoutCheckInterval = 30 * 1000; // 30秒检查一次
        this.startTimeoutChecker();
        
        logger.info('[ExecutionLock] ✅ 执行锁管理器已初始化');
    }
    
    /**
     * 尝试获取锁
     * @param {string} executionId - 执行ID
     * @returns {boolean} 是否成功获取锁
     */
    tryAcquire(executionId) {
        // 检查超时
        this.checkTimeout();
        
        // 如果已锁定
        if (this.isLocked) {
            // 检查是否是同一个execution_id（续传场景）
            if (this.currentExecutionId === executionId) {
                logger.debug(`[ExecutionLock] ✅ 续传执行: ${executionId}`);
                return true;
            }
            
            logger.warn('[ExecutionLock] 🔒 获取锁失败：锁已被占用');
            logger.warn(`   当前持有者: ${this.currentExecutionId}`);
            logger.warn(`   请求者: ${executionId}`);
            return false;
        }
        
        // 获取锁
        this.isLocked = true;
        this.currentExecutionId = executionId;
        this.lockAcquireTime = Date.now();
        
        logger.info(`[ExecutionLock] 🔓 获取锁成功: ${executionId}`);
        return true;
    }
    
    /**
     * 释放锁
     * @param {string} executionId - 执行ID
     */
    release(executionId) {
        if (!this.isLocked) {
            logger.warn('[ExecutionLock] ⚠️ 释放锁失败：锁未被占用');
            return;
        }
        
        if (this.currentExecutionId !== executionId) {
            logger.warn('[ExecutionLock] ⚠️ 释放锁失败：execution_id不匹配');
            logger.warn(`   当前持有者: ${this.currentExecutionId}`);
            logger.warn(`   请求释放: ${executionId}`);
            return;
        }
        
        // 释放锁
        this.isLocked = false;
        const holdTime = Date.now() - this.lockAcquireTime;
        
        logger.info(`[ExecutionLock] 🔓 释放锁成功: ${executionId}`);
        logger.info(`   持有时长: ${(holdTime / 1000).toFixed(1)}秒`);
        
        this.currentExecutionId = null;
        this.lockAcquireTime = null;
    }
    
    /**
     * 强制释放锁（用于中断场景）
     */
    forceRelease() {
        if (!this.isLocked) {
            logger.debug('[ExecutionLock] 跳过强制释放：锁未被占用');
            return;
        }
        
        const executionId = this.currentExecutionId;
        const holdTime = Date.now() - this.lockAcquireTime;
        
        this.isLocked = false;
        this.currentExecutionId = null;
        this.lockAcquireTime = null;
        
        logger.warn(`[ExecutionLock] 🛑 强制释放锁: ${executionId}`);
        logger.warn(`   持有时长: ${(holdTime / 1000).toFixed(1)}秒`);
    }
    
    /**
     * 检查锁是否超时
     * @returns {boolean} 是否发生超时
     */
    checkTimeout() {
        if (!this.isLocked || !this.lockAcquireTime) {
            return false;
        }
        
        const holdTime = Date.now() - this.lockAcquireTime;
        
        if (holdTime > this.lockTimeout) {
            logger.error(`[ExecutionLock] ⏰ 检测到锁超时: ${this.currentExecutionId}`);
            logger.error(`   持有时长: ${(holdTime / 1000).toFixed(1)}秒`);
            logger.error(`   超时阈值: ${(this.lockTimeout / 1000).toFixed(1)}秒`);
            
            // 强制释放
            this.forceRelease();
            return true;
        }
        
        return false;
    }
    
    /**
     * 启动超时检查器
     */
    startTimeoutChecker() {
        setInterval(() => {
            this.checkTimeout();
        }, this.timeoutCheckInterval);
        
        logger.debug(`[ExecutionLock] ⏰ 超时检查器已启动（间隔: ${this.timeoutCheckInterval / 1000}秒）`);
    }
    
    /**
     * 获取锁状态
     * @returns {Object} 锁状态信息
     */
    getStatus() {
        return {
            isLocked: this.isLocked,
            currentExecutionId: this.currentExecutionId,
            lockAcquireTime: this.lockAcquireTime,
            holdTime: this.lockAcquireTime ? Date.now() - this.lockAcquireTime : null
        };
    }
}

// 创建全局单例
const executionLock = new ExecutionLock();

export { executionLock };
