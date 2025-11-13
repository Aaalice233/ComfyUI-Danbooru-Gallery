/**
 * 优化执行引擎 - Optimized Execution Engine
 * 基于ComfyUI原生机制的组顺序执行引擎
 *
 * ⚠️ 关键修正：
 * 1. 使用ComfyUI原生queuePrompt和graphToPrompt
 * 2. 完全基于客户端ID隔离
 * 3. 实现精确的缓存控制状态管理
 * 4. 增强错误处理和执行监控
 */

import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";
import { globalToastManager } from "../global/toast_manager.js";
import { createLogger } from "../global/logger_client.js";
import { executionLock } from "./execution-lock.js";
import { stateManager, ExecutionStatus } from "./state-manager.js";

// 创建logger实例
const logger = createLogger('execution_engine');

// Debug辅助函数（使用logger系统）
const COMPONENT_NAME = 'execution_engine';
const debugLog = (...args) => {
    if (window.shouldDebug && window.shouldDebug(COMPONENT_NAME)) {
        logger.debug(...args);
    }
};

class OptimizedExecutionEngine {
    constructor() {
        this.executionContexts = new Map(); // execution_id -> ExecutionContext
        this.cacheControlStates = new Map(); // execution_id -> cache control states
        this.cancelledExecutions = new Set(); // 记录被取消的执行ID
        this.lastExecutionInterrupted = false; // 记录最近一次执行是否被中断
        this.samplerNodeTypes = []; // 采样器节点类型列表（从配置加载）
        this.setupEventListeners();
        this.setupCancelHandler();
        this.loadSamplerNodeTypes(); // 加载采样器节点类型配置
        this.debugMode = true;

        debugLog('[OptimizedExecutionEngine] ✅ 优化执行引擎已初始化');
        debugLog('[OptimizedExecutionEngine] 🔧 基于ComfyUI原生机制');
        debugLog('[OptimizedExecutionEngine] 🎯 版本: 2.0.0');
    }

    setupCancelHandler() {
        // Hook api.interrupt方法，当用户点击取消时触发
        if (api && api.interrupt) {
            const originalInterrupt = api.interrupt.bind(api);
            api.interrupt = async () => {
                logger.info('[OptimizedExecutionEngine] 🛑 检测到用户取消操作');

                // 取消所有正在执行的组执行管理器任务
                if (this.executionContexts.size > 0) {
                    logger.info(`[OptimizedExecutionEngine] 🛑 取消所有正在执行的组 (共${this.executionContexts.size}个)`);

                    // ✅ 对所有执行进行完整清理
                    for (const executionId of this.executionContexts.keys()) {
                        // 标记为已取消
                        this.cancelledExecutions.add(executionId);
                        logger.info(`[OptimizedExecutionEngine] 🛑 标记执行为已取消: ${executionId}`);

                        // ✅ 更新状态为已取消
                        stateManager.updateState(executionId, {
                            status: ExecutionStatus.CANCELLED
                        });

                        // ✅ 释放后端权限
                        this.releaseBackendPermission(executionId).catch(err => {
                            logger.warn(`[OptimizedExecutionEngine] ⚠️ 释放后端权限失败:`, err);
                        });
                    }

                    // ✅ 强制释放执行锁
                    executionLock.forceRelease();

                    // ✅ 显示取消提示
                    if (globalToastManager) {
                        globalToastManager.showToast('执行已取消', 'info', 3000);
                    }
                }

                // 调用原始的interrupt方法
                return await originalInterrupt();
            };
            logger.info('[OptimizedExecutionEngine] ✅ 取消处理器已设置');
        }

        // 监听执行成功事件，重置中断标志
        api.addEventListener("execution_success", (event) => {
            logger.info('[OptimizedExecutionEngine] ✅ 检测到执行成功事件');
            this.lastExecutionInterrupted = false;
        });

        // 监听执行错误事件，检测InterruptProcessingException（图像过滤器取消会触发此异常）
        api.addEventListener("execution_error", (event) => {
            const { exception_type, exception_message, node_id, node_type } = event.detail || {};

            logger.info('[OptimizedExecutionEngine] 🔍 检测到执行错误事件:', {
                exception_type,
                exception_message,
                node_id,
                node_type
            });

            // 标记执行被中断
            this.lastExecutionInterrupted = true;

            // 只在组执行管理器活动时触发全局取消
            if (this.executionContexts.size === 0) {
                return;
            }

            // 检查是否是InterruptProcessingException（图像过滤器取消会抛出此异常）
            if (exception_type === 'InterruptProcessingException' ||
                exception_message?.includes('InterruptProcessingException') ||
                exception_message?.includes('interrupted')) {

                logger.info('[OptimizedExecutionEngine] 🛑 检测到InterruptProcessingException（图像过滤器取消），触发全局取消');

                // ✅ 对所有执行进行完整清理
                for (const executionId of this.executionContexts.keys()) {
                    stateManager.updateState(executionId, {
                        status: ExecutionStatus.CANCELLED,
                        errorMessage: 'InterruptProcessingException'
                    });

                    this.releaseBackendPermission(executionId).catch(err => {
                        logger.warn(`[OptimizedExecutionEngine] ⚠️ 释放后端权限失败:`, err);
                    });
                }

                executionLock.forceRelease();

                // 触发全局取消，这会中断组执行管理器
                if (api.interrupt) {
                    api.interrupt();
                }
            }
        });

        // 同时监听execution_interrupted事件（ComfyUI的标准中断事件）
        api.addEventListener("execution_interrupted", (event) => {
            logger.info('[OptimizedExecutionEngine] 🛑 检测到execution_interrupted事件');

            // 标记执行被中断
            this.lastExecutionInterrupted = true;

            // 只在组执行管理器活动时触发全局取消
            if (this.executionContexts.size === 0) {
                return;
            }

            logger.info('[OptimizedExecutionEngine] 🛑 触发全局取消');

            // ✅ 对所有执行进行完整清理
            for (const executionId of this.executionContexts.keys()) {
                stateManager.updateState(executionId, {
                    status: ExecutionStatus.CANCELLED
                });

                this.releaseBackendPermission(executionId).catch(err => {
                    logger.warn(`[OptimizedExecutionEngine] ⚠️ 释放后端权限失败:`, err);
                });
            }

            executionLock.forceRelease();

            // 确保调用interrupt以标记所有执行为已取消
            if (api.interrupt) {
                api.interrupt();
            }
        });

        logger.info('[OptimizedExecutionEngine] ✅ 图像过滤器取消监听已设置（监听execution_error和execution_interrupted）');
    }

    async loadSamplerNodeTypes() {
        /** 从后端API加载采样器节点类型配置 */
        try {
            const response = await fetch('/danbooru_gallery/get_sampler_node_types');
            const data = await response.json();

            if (data.status === 'success' && data.sampler_node_types) {
                this.samplerNodeTypes = data.sampler_node_types;
                debugLog('[OptimizedExecutionEngine] ✅ 采样器节点类型已从配置加载:', this.samplerNodeTypes);
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (error) {
            logger.warn('[OptimizedExecutionEngine] ⚠️ 从API加载采样器节点类型失败，使用默认列表:', error);
            // 使用默认列表作为后备方案
            this.samplerNodeTypes = [
                'KSampler',
                'KSamplerAdvanced',
                'PixelKSampleUpscalerProvider',
                'PixelKSampleUpscalerSharpening',
                'SamplerCustom',
                'SamplerCustomAdvanced'
            ];
        }
    }

    setupEventListeners() {
        // 监听优化执行事件
        api.addEventListener("danbooru_optimized_execution", async (event) => {
            const { execution_id, execution_plan, cache_control_signal, client_id, node_id } = event.detail;

            logger.info('[OptimizedExecutionEngine] 📡 收到执行请求:', {
                execution_id,
                groups_count: execution_plan?.groups?.length || 0,
                client_id,
                node_id
            });

            // 验证客户端隔离
            if (!this.validateClientContext(client_id, execution_id)) {
                logger.warn(`[OptimizedExecutionEngine] ⊘ 客户端隔离验证失败: ${client_id}`);
                return;
            }

            // ✅ 尝试获取执行锁
            if (!executionLock.tryAcquire(execution_id)) {
                logger.warn(`[OptimizedExecutionEngine] 🔒 执行被拒绝：另一执行正在进行`);
                if (globalToastManager) {
                    globalToastManager.showToast('执行中，请稍候', 'warning', 3000);
                }
                return;
            }

            // 创建执行上下文
            const context = this.createExecutionContext(execution_id, execution_plan, cache_control_signal, node_id);
            this.executionContexts.set(execution_id, context);

            // 更新缓存控制状态
            this.updateCacheControlStates(execution_id, cache_control_signal);

            // ✅ 创建执行状态
            const config = {
                groups: execution_plan?.groups || [],
                configHash: this.calculateConfigHash(execution_plan)
            };
            stateManager.createState(execution_id, config);

            try {
                // 开始顺序执行
                await this.executeOptimizedSequentialGroups(context);
                logger.info(`[OptimizedExecutionEngine] ✅ 执行完成: ${execution_id}`);
            } catch (error) {
                // 检查是否是用户取消
                if (this.cancelledExecutions.has(execution_id)) {
                    logger.info(`[OptimizedExecutionEngine] 🛑 执行已被用户取消: ${execution_id}`);
                } else {
                    logger.error(`[OptimizedExecutionEngine] ❌ 执行失败: ${execution_id}`, error);
                    this.handleExecutionError(execution_id, error);
                }
            } finally {
                // 清理执行上下文
                this.cleanupExecutionContext(execution_id);
            }
        });

        // 监听缓存控制更新
        document.addEventListener('cacheControlUpdate', (event) => {
            const { executionId, groupName, enabled } = event.detail;
            this.updateGroupCacheState(executionId, groupName, enabled);
        });

        logger.info('[OptimizedExecutionEngine] 📡 事件监听器已设置');
    }

    validateClientContext(client_id, execution_id) {
        /** 验证执行上下文隔离 */
        // 检查是否有重复的执行
        if (this.executionContexts.has(execution_id)) {
            logger.warn(`[OptimizedExecutionEngine] ⚠️ 重复的执行ID: ${execution_id}`);
            return false;
        }

        // ✅ 修复：严格检查client_id（通过send_sync的sid参数隔离）
        if (!client_id || client_id !== api.clientId) {
            logger.warn(`[OptimizedExecutionEngine] ⚠️ 客户端ID不匹配: received=${client_id}, current=${api.clientId}`);
            return false;
        }

        return true;
    }

    createExecutionContext(execution_id, execution_plan, cache_control_signal, node_id) {
        /** 创建执行上下文 */
        return {
            executionId: execution_id,
            executionPlan: execution_plan,
            cacheControlSignal: cache_control_signal,
            nodeId: node_id,
            clientId: cache_control_signal?.client_id || 'unknown',
            startTime: Date.now(),
            status: 'running',
            completedGroups: [],
            failedGroups: [],
            debugMode: execution_plan?.debug_mode || false,
            executionMode: execution_plan?.execution_mode || 'sequential',
            cacheControlMode: execution_plan?.cache_control_mode || 'block_until_allowed',
            executionTimeout: (execution_plan?.execution_timeout || 300) * 1000, // 转换为毫秒
            maxRetries: execution_plan?.max_retry_count || 3
        };
    }

    updateCacheControlStates(execution_id, cache_control_signal) {
        /** 更新缓存控制状态 */
        if (!cache_control_signal || !cache_control_signal.groups_state) {
            return;
        }

        const states = {};
        Object.entries(cache_control_signal.groups_state).forEach(([groupName, groupState]) => {
            states[groupName] = {
                enabled: groupState?.enabled || false,
                timestamp: groupState?.timestamp || Date.now(),
                executionCount: groupState?.execution_count || 0
            };
        });

        this.cacheControlStates.set(execution_id, states);
        logger.info(`[OptimizedExecutionEngine] 🎛️ 缓存控制状态已更新:`, states);
    }

    async executeOptimizedSequentialGroups(context) {
        /** 使用ComfyUI原生队列系统执行组 */
        logger.info(`[OptimizedExecutionEngine] 🚀 开始顺序执行组: ${context.executionId}`);
        logger.info(`[OptimizedExecutionEngine] 📋 执行模式: ${context.executionMode}`);
        logger.info(`[OptimizedExecutionEngine] 🎛️ 缓存控制: ${context.cacheControlMode}`);

        // ✅ 更新状态为运行中
        stateManager.updateState(context.executionId, { 
            status: ExecutionStatus.RUNNING 
        });

        // 重置执行状态栏显示标志
        this.executionStatusShown = false;

        const configuredGroups = context.executionPlan?.groups || [];

        // ✅ 预过滤：只保留未静音的有效组
        logger.info(`[OptimizedExecutionEngine] 📋 已配置的组: [${configuredGroups.map(g => g.group_name).join(', ')}]`);

        const activeGroups = [];
        const mutedGroups = [];
        for (const groupInfo of configuredGroups) {
            const outputNodes = this.findGroupOutputNodes(groupInfo.group_name);
            if (outputNodes.length > 0) {
                activeGroups.push(groupInfo);
            } else {
                mutedGroups.push(groupInfo.group_name);
            }
        }

        // 输出过滤结果
        if (mutedGroups.length > 0) {
            logger.info(`[OptimizedExecutionEngine] ⏭️ 已跳过 ${mutedGroups.length} 个静音组: [${mutedGroups.join(', ')}]`);
        }
        logger.info(`[OptimizedExecutionEngine] ✅ 将执行 ${activeGroups.length} 个组: [${activeGroups.map(g => g.group_name).join(', ')}]`);

        const groups = activeGroups;

        for (let i = 0; i < groups.length; i++) {
            // ✅ 检查是否被取消
            if (this.cancelledExecutions.has(context.executionId)) {
                logger.info(`[OptimizedExecutionEngine] 🛑 检测到取消信号，终止执行: ${context.executionId}`);
                throw new Error('执行已被用户取消');
            }

            const groupInfo = groups[i];

            logger.info(`[OptimizedExecutionEngine] ====================`);
            logger.info(`[OptimizedExecutionEngine] 🎯 执行组: ${groupInfo.group_name}`);
            logger.info(`[OptimizedExecutionEngine] ⏱️ 开始时间: ${new Date().toLocaleTimeString()}`);

            try {
                // 执行组
                await this.executeGroup(context, groupInfo, groups, i);

                // 标记组完成
                context.completedGroups.push(groupInfo.group_name);

                // ✅ 更新状态管理器中的进度
                stateManager.updateState(context.executionId, {
                    completedGroups: [...context.completedGroups]
                });

                const elapsedTime = Date.now() - context.startTime;
                const avgTimePerGroup = Math.round(elapsedTime / (i + 1));
                const remainingGroups = groups.length - (i + 1);
                const estimatedRemainingTime = remainingGroups * avgTimePerGroup;

                logger.info(`[OptimizedExecutionEngine] 📊 组执行统计:`);
                logger.info(`   - 已完成组: ${context.completedGroups.length}`);
                logger.info(`   - 剩余组: ${remainingGroups}`);
                logger.info(`   - 平均每组耗时: ${avgTimePerGroup}ms`);
                logger.info(`   - 预计剩余时间: ${Math.round(estimatedRemainingTime / 1000)}秒`);

            } catch (error) {
                logger.error(`[OptimizedExecutionEngine] ❌ 组执行失败: ${groupInfo.group_name}`, error);
                context.failedGroups.push({ group: groupInfo.group_name, error: error.message });

                // ✅ 更新失败组列表
                stateManager.updateState(context.executionId, {
                    failedGroups: [...context.failedGroups]
                });

                // 根据错误处理策略决定是否继续
                const pauseOnError = context.executionPlan?.pause_on_error !== false;
                if (pauseOnError) {
                    logger.info(`[OptimizedExecutionEngine] ⏸️ 错误暂停执行: ${groupInfo.group_name}`);
                    throw error;
                }
            }
        }

        logger.info(`[OptimizedExecutionEngine] 🎉 所有组执行完成: ${context.executionId}`);

        // ✅ 更新状态为已完成
        stateManager.updateState(context.executionId, { 
            status: ExecutionStatus.COMPLETED 
        });

        // ✅ 清除当前缓存组，防止后续操作使用旧的组名
        await this.setCurrentCacheGroup(null);

        // ✅ 隐藏执行状态栏
        if (globalToastManager) {
            globalToastManager.hideExecutionStatus();
        }

        const totalExecutionTime = Date.now() - context.startTime;
        logger.info(`[OptimizedExecutionEngine] ⏱️ 总执行时间: ${totalExecutionTime}ms (${Math.round(totalExecutionTime / 1000)}秒)`);
        
        // ✅ 显示完成提示
        if (globalToastManager) {
            globalToastManager.showToast(
                `执行完成 (耗时 ${Math.round(totalExecutionTime / 1000)}秒)`, 
                'success', 
                3000
            );
        }
        
        window._groupExecutorActive = false; // Reset the flag
    }

    async executeGroup(context, groupInfo, groups, currentIndex) {
        /** 执行单个组 */
        const groupName = groupInfo.group_name;
        const i = currentIndex; // 当前索引

        // ✅ 设置全局变量，记录当前执行的组名（供 hook 使用）
        window._currentExecutingGroup = groupName;

        logger.info(`[OptimizedExecutionEngine] 🎯 开始执行组: ${groupName}`);

        // ✅ 显示/更新执行状态栏（增强版）
        if (globalToastManager) {
            const progress = `${i + 1}/${groups.length}`;
            const statusMessage = `当前执行组：${groupName} (${progress})`;
            
            if (!this.executionStatusShown) {
                // 第一次执行时显示状态栏
                globalToastManager.showExecutionStatus(statusMessage);
                this.executionStatusShown = true;
            } else {
                // 后续执行更新状态栏
                globalToastManager.updateExecutionProgress(statusMessage);
            }
        }

        // ✅ 增强日志：显示组信息
        const nodeIds = groupInfo.nodes || [];
        logger.info(`[OptimizedExecutionEngine] 📋 组内节点数: ${nodeIds.length}`);
        if (nodeIds.length > 0) {
            logger.info(`[OptimizedExecutionEngine] 🔗 节点列表: [${nodeIds.join(', ')}]`);
        }

        // ✅ 设置当前缓存组，通知Python后端更新cache_manager.current_group_name
        await this.setCurrentCacheGroup(groupName);

        // 1. 更新缓存控制状态
        if (context.cacheControlMode === "block_until_allowed") {
            this.setGroupCacheControl(context.executionId, groupName, false);
        }

        // 2. 查找组内输出节点
        const outputNodes = this.findGroupOutputNodes(groupName);
        if (outputNodes.length === 0) {
            logger.warn(`[OptimizedExecutionEngine] ⚠️ 组 ${groupName} 没有输出节点`);
            return;
        }

        logger.info(`[OptimizedExecutionEngine] 📍 找到输出节点: [${outputNodes.join(', ')}]`);

        // 3. 重置中断标志，准备开始新的执行
        this.lastExecutionInterrupted = false;

        // 4. 提交到ComfyUI原生队列
        await this.submitToComfyUIQueue(outputNodes, context);

        // 5. 等待执行完成
        await this.waitForComfyUIQueueCompletion(context);

        // 6. 检查执行是否被中断（例如图像过滤器取消）
        if (this.lastExecutionInterrupted) {
            logger.info(`[OptimizedExecutionEngine] 🛑 检测到执行被中断（可能是图像过滤器取消），停止后续组执行`);
            throw new Error('执行被中断（图像过滤器取消或其他中断）');
        }

        // 7. 设置缓存控制状态
        if (context.cacheControlMode === "block_until_allowed") {
            this.setGroupCacheControl(context.executionId, groupName, true);
        }

        logger.info(`[OptimizedExecutionEngine] ✅ 组执行完成: ${groupName}`);

        // ✅ 执行内存清理（如果配置了）
        await this.performGroupCleanup(context, groupInfo, groups, currentIndex);

        // ✅ 清除全局变量
        window._currentExecutingGroup = null;
    }

    async setCurrentCacheGroup(groupName) {
        /** 设置当前缓存组（调用Python API设置cache_manager的current_group_name） */
        try {
            const response = await api.fetchApi("/danbooru_gallery/set_current_group", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ group_name: groupName })
            });

            if (!response.ok) {
                logger.warn(`[OptimizedExecutionEngine] ⚠️ 设置缓存组失败: ${groupName}`);
                return false;
            }

            const result = await response.json();
            logger.info(`[OptimizedExecutionEngine] ✅ 缓存组已设置: ${groupName}`);
            return result.success;
        } catch (error) {
            logger.error(`[OptimizedExecutionEngine] ❌ 设置缓存组异常:`, error);
            return false;
        }
    }

    setGroupCacheControl(executionId, groupName, enabled) {
        /** 设置组的缓存控制状态 */
        const states = this.cacheControlStates.get(executionId) || {};

        if (!states[groupName]) {
            states[groupName] = {
                enabled: false,
                timestamp: Date.now(),
                executionCount: 0
            };
        }

        states[groupName].enabled = enabled;
        states[groupName].timestamp = Date.now();
        states[groupName].executionCount++;

        this.cacheControlStates.set(executionId, states);

        // 触发自定义事件通知缓存节点
        const event = new CustomEvent('cacheControlUpdate', {
            detail: {
                executionId: executionId,
                groupName: groupName,
                enabled: enabled,
                timestamp: Date.now()
            }
        });

        logger.info(`[OptimizedExecutionEngine] 🎛️ 缓存控制更新: ${groupName} = ${enabled}`);
        document.dispatchEvent(event);
    }

    findGroupOutputNodes(groupName) {
        /** 查找组内的输出节点 */
        if (!app.graph || !app.graph._nodes) {
            logger.warn('[OptimizedExecutionEngine] ⚠️ 无法访问图数据');
            return [];
        }

        // 首先找到组
        const group = app.graph._groups?.find(g => g.title === groupName);
        if (!group) {
            logger.warn(`[OptimizedExecutionEngine] ⚠️ 未找到组: ${groupName}`);
            return [];
        }

        // 查找组内的所有节点
        const groupNodes = [];
        for (const node of app.graph._nodes) {
            if (!node || !node.pos) {
                continue;
            }

            // 尝试获取节点边界
            try {
                node.getBounding();
            } catch (e) {
                continue;
            }

            // 碰撞检测
            const isInGroup = this.isNodeInGroup(node, group);
            if (isInGroup) {
                groupNodes.push(node);
            }
        }

        logger.info(`[OptimizedExecutionEngine] 🔍 组 ${groupName} 内找到 ${groupNodes.length} 个节点`);

        // ✅ 新增：检查组内是否所有节点都被禁用
        if (groupNodes.length > 0) {
            const allDisabled = groupNodes.every(node =>
                node.mode === 2 || node.mode === 4  // mute(2) 或 bypass(4)
            );

            if (allDisabled) {
                logger.info(`[OptimizedExecutionEngine] ⏭️ 组 ${groupName} 的所有节点都被禁用(mute/bypass)，跳过执行`);
                return [];
            }
        }

        // 找到输出节点
        const outputNodes = groupNodes.filter(node => {
            return node.mode !== 2 && // 不是Never模式
                node.constructor?.nodeData?.output_node === true;
        });

        if (outputNodes.length > 0) {
            logger.info(`[OptimizedExecutionEngine] ✅ 找到 ${outputNodes.length} 个输出节点: [${outputNodes.map(n => `${n.id}(${n.type})`).join(', ')}]`);
        } else {
            logger.info(`[OptimizedExecutionEngine] ⚠️ 未找到输出节点`);
        }

        return outputNodes.map(node => node.id);
    }

    isNodeInGroup(node, group) {
        /** 检查节点是否在组内 - 使用LiteGraph碰撞检测 */
        if (!node || !node.pos || !group || !group._bounding) {
            return false;
        }

        // ✅ 改进：使用LiteGraph的碰撞检测，这是ComfyUI标准的组包含检测方法
        try {
            const nodeBounds = node.getBounding();
            // 使用LiteGraph提供的碰撞检测
            return LiteGraph.overlapBounding(group._bounding, nodeBounds);
        } catch (e) {
            logger.warn(`[OptimizedExecutionEngine] ⚠️ 碰撞检测异常: ${e.message}`);
            return false;
        }
    }

    async submitToComfyUIQueue(nodeIds, context) {
        /** 提交节点到ComfyUI队列 */
        try {
            // ✅ 关键修复：采用LG_GroupExecutor的方法
            // 设置_queueNodeIds，让Hook中的api.queuePrompt过滤prompt

            logger.info(`[OptimizedExecutionEngine] 🔗 设置待提交节点ID: [${nodeIds.join(', ')}]`);
            window._queueNodeIds = nodeIds;

            // 直接调用api.queuePrompt，由Hook中的过滤逻辑处理
            const fullPrompt = await app.graphToPrompt();

            logger.info(`[OptimizedExecutionEngine] 📊 完整prompt节点数: ${Object.keys(fullPrompt.output || {}).length}`);
            logger.info(`[OptimizedExecutionEngine] 📋 将由Hook过滤后提交的节点ID: [${nodeIds.join(', ')}]`);

            // 调用api.queuePrompt，Hook会自动过滤
            await api.queuePrompt(0, fullPrompt);

            logger.info(`[OptimizedExecutionEngine] ✅ 节点已提交到ComfyUI队列`);
        } catch (error) {
            logger.error('[OptimizedExecutionEngine] ❌ 提交队列失败:', error);
            throw new Error(`队列提交失败: ${error.message}`);
        }
    }

    filterPromptNodes(prompt, targetNodeIds, context) {
        /** 过滤prompt只保留目标节点及其依赖 */
        const newOutput = {};
        const requiredNodes = new Set();

        // 递归收集依赖节点
        const collectDependencies = (nodeId) => {
            if (requiredNodes.has(nodeId)) return;

            const nodeInfo = prompt.output?.[nodeId];
            if (!nodeInfo) return;

            requiredNodes.add(nodeId);

            // 收集输入依赖
            Object.values(nodeInfo.inputs || {}).forEach(inputValue => {
                if (Array.isArray(inputValue) && inputValue.length === 2) {
                    collectDependencies(inputValue[0]);
                }
            });
        };

        // 收集所有必需的节点
        targetNodeIds.forEach(nodeId => {
            collectDependencies(nodeId);
        });

        // 构建新的prompt
        requiredNodes.forEach(nodeId => {
            if (prompt.output[nodeId]) {
                newOutput[nodeId] = prompt.output[nodeId];
            }
        });

        logger.info(`[OptimizedExecutionEngine] 🔗 依赖节点收集完成: [${Array.from(requiredNodes).join(', ')}]`);

        return { ...prompt, output: newOutput };
    }

    async waitForComfyUIQueueCompletion(context) {
        /** 等待ComfyUI队列执行完成 - 改进的健壮轮询机制 */
        const startTime = Date.now();
        const maxWaitTime = 3600000; // 1小时超时
        const pollInterval = 500; // 改为500ms轮询间隔，更快响应

        logger.info('[OptimizedExecutionEngine] ⏳ 开始等待队列执行完成...');

        while (true) {
            // ✅ 检查是否被取消
            if (this.cancelledExecutions.has(context.executionId)) {
                logger.info(`[OptimizedExecutionEngine] 🛑 等待队列时检测到取消信号: ${context.executionId}`);
                throw new Error('执行已被用户取消');
            }

            const elapsed = Date.now() - startTime;

            // 检查超时
            if (elapsed > maxWaitTime) {
                logger.warn(`[OptimizedExecutionEngine] ⏰ 队列等待超时 (${Math.round(elapsed / 1000)}秒)`);
                throw new Error(`队列执行超时 (超过 ${Math.round(maxWaitTime / 1000)} 秒)`);
            }

            try {
                const response = await api.fetchApi('/queue');
                if (!response.ok) {
                    logger.warn(`[OptimizedExecutionEngine] ⚠️ 无法获取队列状态: ${response.status}`);
                    await this.delay(pollInterval);
                    continue;
                }

                const data = await response.json();
                const queueRunning = data.queue_running || [];
                const queuePending = data.queue_pending || [];

                // ✅ 改进：使用LG风格的队列判断
                const isRunning = queueRunning.length > 0;
                const isPending = queuePending.length > 0;

                // 队列完全空闲，执行完成
                if (!isRunning && !isPending) {
                    logger.info(`[OptimizedExecutionEngine] ✅ 队列执行完成 (耗时: ${Math.round(elapsed / 1000)}秒)`);
                    return;
                }

                // 定期输出进度信息
                if (elapsed % 5000 < pollInterval) { // 每5秒输出一次
                    logger.info(
                        `[OptimizedExecutionEngine] ⏳ 队列等待中 (${Math.round(elapsed / 1000)}秒): ` +
                        `运行中=${queueRunning.length}, 待执行=${queuePending.length}`
                    );
                }

            } catch (error) {
                logger.warn(`[OptimizedExecutionEngine] ⚠️ 队列状态检查异常: ${error.message}`);
                // 异常时也继续轮询，不中断
            }

            // 使用改进的延迟间隔
            await this.delay(pollInterval);
        }
    }

    delay(ms) {
        /** 延迟函数，支持取消检查 */
        return new Promise((resolve) => {
            const checkInterval = 100; // 每100ms检查一次是否取消
            let elapsed = 0;

            const intervalId = setInterval(() => {
                elapsed += checkInterval;

                // 检查所有执行上下文是否被取消
                for (const executionId of this.executionContexts.keys()) {
                    if (this.cancelledExecutions.has(executionId)) {
                        clearInterval(intervalId);
                        resolve();
                        return;
                    }
                }

                if (elapsed >= ms) {
                    clearInterval(intervalId);
                    resolve();
                }
            }, checkInterval);
        });
    }

    async performGroupCleanup(context, groupInfo, groups, currentIndex) {
        /** 执行组完成后的内存清理 */
        const cleanupConfig = groupInfo.cleanup_config;
        const groupName = groupInfo.group_name;

        // 检查是否配置了清理选项
        if (!cleanupConfig) {
            logger.error(`[内存清理] ⏭️ 组 "${groupName}" 跳过清理：未配置 cleanup_config`);
            return;
        }

        if (!cleanupConfig.clear_vram && !cleanupConfig.clear_ram && !cleanupConfig.unload_models) {
            logger.error(`[内存清理] ⏭️ 组 "${groupName}" 跳过清理：所有清理选项均已关闭`);
            return;
        }

        // 记录即将执行的清理
        const cleanupActions = [];
        if (cleanupConfig.clear_vram) cleanupActions.push('VRAM缓存');
        if (cleanupConfig.clear_ram) cleanupActions.push('RAM');
        if (cleanupConfig.unload_models) cleanupActions.push('卸载模型');
        logger.error(`[内存清理] 🚀 组 "${groupName}" 开始清理：${cleanupActions.join(' + ')}`);

        try {
            // 准备清理请求数据
            const cleanupRequest = {
                group_name: groupName,
                clear_vram: cleanupConfig.clear_vram || false,
                clear_ram: cleanupConfig.clear_ram || false,
                unload_models: false  // 默认不卸载模型
            };

            // 检查是否需要卸载模型
            if (cleanupConfig.unload_models && cleanupConfig.unload_conditions) {
                // 评估卸载模型条件
                const shouldUnloadModels = await this.evaluateUnloadConditions(
                    cleanupConfig.unload_conditions,
                    currentIndex,
                    context.executionPlan.groups,
                    context
                );

                cleanupRequest.unload_models = shouldUnloadModels;
                logger.error(`[内存清理] 🔍 卸载模型条件评估结果: ${shouldUnloadModels}`);
            } else if (cleanupConfig.unload_models && (!cleanupConfig.unload_conditions || cleanupConfig.unload_conditions.length === 0)) {
                // 没有条件，直接卸载
                cleanupRequest.unload_models = true;
                logger.error(`[内存清理] 🔍 无条件限制，直接卸载模型`);
            }

            // 调用后端清理 API
            const response = await api.fetchApi("/danbooru_gallery/group_executor/cleanup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(cleanupRequest)
            });

            if (!response.ok) {
                logger.warn(`[内存清理] ⚠️ 清理请求失败: ${response.status}`);
                return;
            }

            const result = await response.json();
            logger.error(`[内存清理] ✅ 清理完成:`, result);

            // 执行延迟（如果配置了）
            if (cleanupConfig.delay_seconds && cleanupConfig.delay_seconds > 0) {
                const delayMs = cleanupConfig.delay_seconds * 1000;
                logger.error(`[内存清理] ⏱️ 清理后延迟 ${cleanupConfig.delay_seconds} 秒...`);
                await this.delay(delayMs);
                logger.error(`[内存清理] ✅ 延迟完成`);
            }

        } catch (error) {
            logger.error(`[内存清理] ❌ 清理执行失败:`, error);
            // 清理失败不应该中断整个执行流程
        }
    }

    async evaluateUnloadConditions(conditions, currentIndex, groups, context) {
        /** 评估卸载模型条件（AND 逻辑）*/
        if (!conditions || conditions.length === 0) {
            return false;
        }

        logger.error(`[OptimizedExecutionEngine] 🔍 评估 ${conditions.length} 个卸载条件（AND 逻辑）...`);

        // 所有条件必须满足（AND 逻辑）
        for (let i = 0; i < conditions.length; i++) {
            const condition = conditions[i];
            const result = await this.evaluateSingleCondition(condition, currentIndex, groups, context);

            logger.error(`[OptimizedExecutionEngine] 🔍 条件 ${i + 1}: ${condition.type} = ${result}`);

            if (!result) {
                logger.error(`[OptimizedExecutionEngine] 🔍 条件不满足，不卸载模型`);
                return false;
            }
        }

        logger.error(`[OptimizedExecutionEngine] ✅ 所有条件满足，卸载模型`);
        return true;
    }

    async evaluateSingleCondition(condition, currentIndex, groups, context) {
        /** 评估单个条件 */
        const conditionType = condition.type;

        if (conditionType === 'has_next_sampler_group') {
            // 检查后续组是否包含采样器节点
            const expectedValue = condition.value === 'true' || condition.value === true;
            const hasNextSampler = this.hasNextSamplerGroup(currentIndex, groups);
            return hasNextSampler === expectedValue;
        } else if (conditionType === 'pcp_param') {
            // 检查参数控制面板的布尔参数值
            const nodeId = condition.node_id;
            const paramName = condition.param_name;
            const expectedValue = condition.value === 'true' || condition.value === true;

            try {
                const response = await api.fetchApi(
                    `/danbooru_gallery/pcp/get_param_value?node_id=${nodeId}&param_name=${encodeURIComponent(paramName)}`
                );

                if (!response.ok) {
                    logger.warn(`[OptimizedExecutionEngine] ⚠️ 获取参数值失败: ${nodeId}/${paramName}`);
                    return false;
                }

                const result = await response.json();
                const actualValue = result.value || false;
                return actualValue === expectedValue;
            } catch (error) {
                logger.error(`[OptimizedExecutionEngine] ❌ 获取参数值异常:`, error);
                return false;
            }
        }

        logger.warn(`[OptimizedExecutionEngine] ⚠️ 未知条件类型: ${conditionType}`);
        return false;
    }

    hasNextSamplerGroup(currentIndex, groups) {
        /** 检查后续组是否包含采样器节点 */
        // 检查当前索引之后的所有组
        for (let i = currentIndex + 1; i < groups.length; i++) {
            const group = groups[i];
            const groupName = group.group_name;

            // 查找组内的所有节点
            if (!app.graph || !app.graph._nodes) {
                continue;
            }

            const graphGroup = app.graph._groups?.find(g => g.title === groupName);
            if (!graphGroup) {
                continue;
            }

            // 检查组内是否有采样器节点
            for (const node of app.graph._nodes) {
                if (!node || !node.pos) {
                    continue;
                }

                try {
                    node.getBounding();
                } catch (e) {
                    continue;
                }

                const isInGroup = this.isNodeInGroup(node, graphGroup);
                if (!isInGroup) {
                    continue;
                }

                // 检查节点类型是否是采样器
                // 采样器节点通常包含 "Sampler" 或 "KSampler" 等关键词
                const nodeType = node.type || '';
                if (this.isSamplerNodeType(nodeType)) {
                    logger.info(`[OptimizedExecutionEngine] 🔍 找到后续采样器节点: ${nodeType} (组: ${groupName})`);
                    return true;
                }
            }
        }

        return false;
    }

    isSamplerNodeType(nodeType) {
        /** 检查节点类型是否是采样器节点（从配置动态加载） */
        return this.samplerNodeTypes.includes(nodeType);
    }

    handleExecutionError(executionId, error) {
        /** 处理执行错误 */
        logger.error(`[OptimizedExecutionEngine] 🚨 执行错误处理: ${executionId}`, error);

        // ✅ 更新状态为失败
        stateManager.updateState(executionId, {
            status: ExecutionStatus.FAILED,
            errorMessage: error.message
        });

        // ✅ 强制释放锁
        executionLock.forceRelease();

        // ✅ 释放后端权限
        this.releaseBackendPermission(executionId).catch(err => {
            logger.warn(`[OptimizedExecutionEngine] ⚠️ 释放后端权限失败:`, err);
        });

        // 发送错误状态到前端
        const errorStatus = {
            status: 'error',
            execution_id: executionId,
            error: error.message,
            timestamp: Date.now(),
            stack: error.stack
        };

        // ✅ 显示错误提示
        if (globalToastManager) {
            globalToastManager.showToast(`执行失败: ${error.message}`, 'error', 5000);
        }

        // 可以选择发送到特定的事件或UI
        logger.info('[OptimizedExecutionEngine] 📡 错误状态:', errorStatus);
    }

    cleanupExecutionContext(executionId) {
        /** 清理执行上下文 */
        this.executionContexts.delete(executionId);
        this.cacheControlStates.delete(executionId);
        this.cancelledExecutions.delete(executionId);  // 清理取消标记

        // ✅ 释放执行锁
        executionLock.release(executionId);

        // ✅ 释放后端权限
        this.releaseBackendPermission(executionId).catch(err => {
            logger.warn(`[OptimizedExecutionEngine] ⚠️ 释放后端权限失败:`, err);
        });

        // ✅ 清除状态（延迟清除，保留一段时间供查询）
        setTimeout(() => {
            stateManager.clearState(executionId);
        }, 60000); // 1分钟后清除

        // ✅ 隐藏执行状态栏
        if (globalToastManager) {
            globalToastManager.hideExecutionStatus();
        }

        logger.info(`[OptimizedExecutionEngine] 🧹 清理执行上下文: ${executionId}`);
    }

    /**
     * 释放后端执行权限
     * @param {string} executionId - 执行ID
     * @returns {Promise<boolean>} 是否成功释放
     */
    async releaseBackendPermission(executionId) {
        try {
            const response = await api.fetchApi('/danbooru_gallery/group_executor/release_permission', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ execution_id: executionId })
            });

            if (!response.ok) {
                logger.warn(`[OptimizedExecutionEngine] ⚠️ 释放后端权限失败: ${response.status}`);
                return false;
            }

            const result = await response.json();
            logger.info(`[OptimizedExecutionEngine] ✅ 后端权限已释放: ${executionId}`);
            return result.success || false;
        } catch (error) {
            logger.error(`[OptimizedExecutionEngine] ❌ 释放后端权限异常:`, error);
            return false;
        }
    }

    /**
     * 计算配置哈希
     * @param {Object} executionPlan - 执行计划
     * @returns {string} 配置哈希值
     */
    calculateConfigHash(executionPlan) {
        try {
            const configStr = JSON.stringify(executionPlan?.groups || [], null, 0);
            // 简单哈希算法（实际应使用crypto.subtle.digest）
            let hash = 0;
            for (let i = 0; i < configStr.length; i++) {
                const char = configStr.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32bit integer
            }
            return Math.abs(hash).toString(16);
        } catch (error) {
            logger.warn(`[OptimizedExecutionEngine] ⚠️ 计算配置哈希失败:`, error);
            return '';
        }
    }

    // 公共API方法，供外部调用
    getExecutionContext(executionId) {
        return this.executionContexts.get(executionId);
    }

    getCacheControlState(executionId, groupName) {
        const states = this.cacheControlStates.get(executionId);
        return states?.[groupName] || null;
    }

    isExecutionRunning(executionId) {
        return this.executionContexts.has(executionId);
    }

    getAllExecutions() {
        return Array.from(this.executionContexts.keys());
    }
}

// 创建全局实例
window.optimizedExecutionEngine = new OptimizedExecutionEngine();
window._groupExecutorActive = false; // Initialize the flag
window._groupExecutionPending = false; // Initialize the new flag

logger.info('[OptimizedExecutionEngine] 🚀 优化执行引擎已启动');
logger.info('[OptimizedExecutionEngine] 📋 全局实例: window.optimizedExecutionEngine');
logger.info('[OptimizedExecutionEngine] ✅ 基于ComfyUI原生机制的优化执行引擎就绪');