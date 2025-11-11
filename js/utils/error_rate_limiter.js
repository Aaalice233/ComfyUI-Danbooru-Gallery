/**
 * 错误日志频率限制工具
 * 用于防止相同错误日志刷屏，提升用户体验
 */

import { createLogger } from "../global/logger_client.js";

const logger = createLogger('error_rate_limiter');

// 错误缓存：存储错误信息和时间戳
const errorCache = new Map();

/**
 * 检查是否应该输出错误日志（带频率限制）
 *
 * @param {string} errorKey - 错误的唯一标识符
 * @param {number} intervalMs - 时间间隔（毫秒），默认30秒
 * @returns {boolean} true表示应该输出日志，false表示应该跳过
 */
function shouldLogError(errorKey, intervalMs = 30000) {
    const now = Date.now();
    const lastLogTime = errorCache.get(errorKey);

    // 如果从未记录过，或者已经超过了时间间隔，则允许输出
    if (!lastLogTime || (now - lastLogTime) >= intervalMs) {
        errorCache.set(errorKey, now);
        return true;
    }

    // 在时间间隔内，跳过此次日志输出
    return false;
}

/**
 * 带频率限制的错误日志函数
 *
 * @param {string} loggerName - 日志记录器名称
 * @param {string} errorKey - 错误的唯一标识符
 * @param {string} message - 错误消息
 * @param {Error} error - 错误对象
 * @param {number} intervalMs - 时间间隔（毫秒）
 */
function logErrorWithRateLimit(loggerName, errorKey, message, error, intervalMs = 30000) {
    if (shouldLogError(errorKey, intervalMs)) {
        // 创建专用的logger实例
        const errorLogger = createLogger(loggerName);
        errorLogger.error(message, error);

        // 输出频率限制提示
        if (intervalMs < 60000) {
            errorLogger.info(`[频率限制] 此类错误将在 ${Math.round(intervalMs/1000)} 秒内只显示一次`);
        } else {
            errorLogger.info(`[频率限制] 此类错误将在 ${Math.round(intervalMs/60000)} 分钟内只显示一次`);
        }
    }
}

/**
 * 带频率限制的警告日志函数
 *
 * @param {string} loggerName - 日志记录器名称
 * @param {string} errorKey - 错误的唯一标识符
 * @param {string} message - 警告消息
 * @param {Error} error - 错误对象
 * @param {number} intervalMs - 时间间隔（毫秒）
 */
function logWarningWithRateLimit(loggerName, errorKey, message, error, intervalMs = 30000) {
    if (shouldLogError(errorKey, intervalMs)) {
        // 创建专用的logger实例
        const warningLogger = createLogger(loggerName);
        warningLogger.warn(message, error);

        // 输出频率限制提示
        warningLogger.info(`[频率限制] 此类警告将在 ${Math.round(intervalMs/1000)} 秒内只显示一次`);
    }
}

/**
 * 生成基于错误类型的唯一标识符
 *
 * @param {string} context - 上下文（如函数名、模块名）
 * @param {string} errorType - 错误类型（如网络错误、连接错误）
 * @param {string} errorMessage - 错误消息
 * @returns {string} 唯一的错误标识符
 */
function generateErrorKey(context, errorType, errorMessage) {
    // 对错误消息进行哈希处理，避免过长的键名
    const messageHash = errorMessage.length > 50
        ? errorMessage.substring(0, 50)
        : errorMessage;

    return `${context}_${errorType}_${messageHash}`;
}

/**
 * 清理过期的错误缓存（定期调用以避免内存泄漏）
 */
function cleanupErrorCache() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24小时
    const keysToDelete = [];

    for (const [key, timestamp] of errorCache.entries()) {
        if (now - timestamp > maxAge) {
            keysToDelete.push(key);
        }
    }

    keysToDelete.forEach(key => errorCache.delete(key));

    if (keysToDelete.length > 0) {
        logger.info(`[错误频率限制] 清理了 ${keysToDelete.length} 个过期的错误缓存`);
    }
}

// 每小时清理一次错误缓存
setInterval(cleanupErrorCache, 60 * 60 * 1000);

// 导出工具函数
export {
    shouldLogError,
    logErrorWithRateLimit,
    logWarningWithRateLimit,
    generateErrorKey,
    cleanupErrorCache
};

logger.info('[错误频率限制] 模块已加载');