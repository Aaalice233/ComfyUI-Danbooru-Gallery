/**
 * 组执行管理器与图像缓存系统集成
 *
 * 功能：
 * 1. 监听组执行管理器的事件，自动设置当前执行的组名
 * 2. 图像缓存节点自动使用当前组名作为缓存通道
 * 3. 如果没有组执行管理器，提示用户
 */

import { api } from "../../scripts/api.js";
import { globalToastManager } from "./global/toast_manager.js";

class GroupCacheIntegration {
    constructor() {
        this.hasGroupExecutorManager = false;

        console.log("[GroupCacheIntegration] 初始化组缓存集成系统");
        console.log("[GroupCacheIntegration] 缓存通道切换已集成到组执行管理器中");

        this.checkForGroupExecutorManager();
    }

    /**
     * 检查工作流中是否有组执行管理器节点
     */
    checkForGroupExecutorManager() {
        // 延迟检查，确保app已加载
        setTimeout(() => {
            try {
                if (window.app && window.app.graph && window.app.graph._nodes) {
                    const hasGEM = window.app.graph._nodes.some(node =>
                        node && node.type === "GroupExecutorManager"
                    );

                    if (hasGEM) {
                        this.hasGroupExecutorManager = true;
                        console.log("[GroupCacheIntegration] ✓ 检测到组执行管理器节点");
                    } else {
                        console.log("[GroupCacheIntegration] 未检测到组执行管理器节点");

                        // 检查是否有图像缓存节点
                        const hasCacheNodes = window.app.graph._nodes.some(node =>
                            node && (node.type === "ImageCacheSave" || node.type === "ImageCacheGet")
                        );

                        // 如果有缓存节点但没有组执行管理器，弹出警告
                        if (hasCacheNodes) {
                            globalToastManager.showToast(
                                "检测到图像缓存节点，但未找到组执行管理器。图像缓存节点需要配合组执行管理器使用",
                                "warning",
                                6000
                            );
                            console.warn("[GroupCacheIntegration] ⚠ 检测到缓存节点但没有组执行管理器");
                        }
                    }
                }
            } catch (error) {
                console.error("[GroupCacheIntegration] 检查组执行管理器失败:", error);
            }
        }, 1500);
    }

    /**
     * 检查是否需要提示用户使用组执行管理器
     * 由图像缓存节点调用
     */
    checkAndWarnIfNoGroupExecutor() {
        if (!this.hasGroupExecutorManager) {
            globalToastManager.showToast(
                "图像缓存节点需要配合组执行管理器使用",
                "warning",
                5000
            );
            console.warn("[GroupCacheIntegration] ⚠ 图像缓存节点需要配合组执行管理器使用");
            return false;
        }
        return true;
    }
}

// 创建全局实例
const groupCacheIntegration = new GroupCacheIntegration();

// 导出到window对象，供hook方法使用
window.groupCacheIntegration = groupCacheIntegration;

// 导出实例
export { groupCacheIntegration };
