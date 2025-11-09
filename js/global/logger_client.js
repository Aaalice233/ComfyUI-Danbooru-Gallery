/**
 * 统一日志管理客户端 (Logger Client)
 *
 * 功能特性：
 * - 统一的日志接口（debug/info/warn/error）
 * - 批量收集日志，减少API调用频率
 * - 本地日志级别过滤
 * - 自动添加时间戳、组件名、浏览器信息
 * - 与Python后端logger系统集成
 *
 * 使用方法：
 * ```javascript
 * import { createLogger } from './global/logger_client.js';
 *
 * const logger = createLogger('MyComponent');
 * logger.debug('Debug message');
 * logger.info('Info message');
 * logger.warn('Warning message');
 * logger.error('Error message');
 * ```
 */

// 日志级别常量
const LOG_LEVELS = {
    DEBUG: 10,
    INFO: 20,
    WARNING: 30,
    ERROR: 40,
    CRITICAL: 50
};

// 日志级别名称映射
const LEVEL_NAMES = {
    10: 'DEBUG',
    20: 'INFO',
    30: 'WARNING',
    40: 'ERROR',
    50: 'CRITICAL'
};

/**
 * 全局日志管理器
 */
class LoggerClient {
    constructor() {
        // 日志缓冲区
        this.logBuffer = [];

        // 最大缓冲大小
        this.maxBufferSize = 50;

        // 批量发送间隔（毫秒）
        this.batchInterval = 500;

        // 当前日志级别（从配置或localStorage读取）
        this.currentLevel = LOG_LEVELS.INFO;

        // 批量发送定时器
        this.batchTimer = null;

        // 是否启用远程日志
        this.remoteLoggingEnabled = true;

        // 是否启用控制台输出（默认禁用，因为日志已输出到文件）
        this.consoleOutputEnabled = false;

        // 初始化
        this._init();
    }

    /**
     * 初始化日志客户端
     */
    _init() {
        // 从localStorage读取配置
        this._loadConfig();

        // 启动批量发送定时器
        this._startBatchTimer();

        // 监听页面卸载事件，确保日志发送
        window.addEventListener('beforeunload', () => {
            this.flush();
        });

        // 监听页面可见性变化，在隐藏时刷新日志
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.flush();
            }
        });
    }

    /**
     * 从localStorage加载配置
     */
    _loadConfig() {
        try {
            const config = localStorage.getItem('danbooru_logger_config');
            if (config) {
                const parsed = JSON.parse(config);
                this.currentLevel = LOG_LEVELS[parsed.level] || LOG_LEVELS.INFO;
                this.remoteLoggingEnabled = parsed.remoteEnabled !== false;
                this.consoleOutputEnabled = parsed.consoleEnabled === true;
            }
        } catch (e) {
            console.error('[LoggerClient] 配置加载失败:', e);
        }
    }

    /**
     * 保存配置到localStorage
     */
    _saveConfig() {
        try {
            const config = {
                level: LEVEL_NAMES[this.currentLevel],
                remoteEnabled: this.remoteLoggingEnabled,
                consoleEnabled: this.consoleOutputEnabled
            };
            localStorage.setItem('danbooru_logger_config', JSON.stringify(config));
        } catch (e) {
            console.error('[LoggerClient] 配置保存失败:', e);
        }
    }

    /**
     * 启动批量发送定时器
     */
    _startBatchTimer() {
        if (this.batchTimer) {
            clearInterval(this.batchTimer);
        }

        this.batchTimer = setInterval(() => {
            if (this.logBuffer.length > 0) {
                this.flush();
            }
        }, this.batchInterval);
    }

    /**
     * 记录日志
     * @param {string} component - 组件名称
     * @param {number} level - 日志级别
     * @param {Array} args - 日志参数
     */
    log(component, level, ...args) {
        // 级别过滤
        if (level < this.currentLevel) {
            return;
        }

        // 格式化消息
        const message = args.map(arg => {
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg);
                } catch (e) {
                    return String(arg);
                }
            }
            return String(arg);
        }).join(' ');

        // 创建日志条目
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: LEVEL_NAMES[level],
            component: component,
            message: message,
            browser: this._getBrowserInfo(),
            url: window.location.href
        };

        // 输出到控制台（如果启用）
        if (this.consoleOutputEnabled) {
            this._consoleOutput(level, component, message);
        }

        // 添加到缓冲区（如果启用远程日志）
        if (this.remoteLoggingEnabled) {
            this.logBuffer.push(logEntry);

            // 如果缓冲区满了，立即发送
            if (this.logBuffer.length >= this.maxBufferSize) {
                this.flush();
            }
        }

        // ERROR级别总是立即发送（确保错误不丢失）
        if (level >= LOG_LEVELS.ERROR) {
            this.flush();
        }
    }

    /**
     * 控制台输出
     */
    _consoleOutput(level, component, message) {
        const prefix = `[${LEVEL_NAMES[level]}] [${component}]`;

        switch (level) {
            case LOG_LEVELS.DEBUG:
                console.log(`%c${prefix}`, 'color: cyan', message);
                break;
            case LOG_LEVELS.INFO:
                console.log(`%c${prefix}`, 'color: green', message);
                break;
            case LOG_LEVELS.WARNING:
                console.warn(prefix, message);
                break;
            case LOG_LEVELS.ERROR:
            case LOG_LEVELS.CRITICAL:
                console.error(prefix, message);
                break;
            default:
                console.log(prefix, message);
        }
    }

    /**
     * 获取浏览器信息
     */
    _getBrowserInfo() {
        const ua = navigator.userAgent;
        let browser = 'Unknown';

        if (ua.indexOf('Chrome') > -1) browser = 'Chrome';
        else if (ua.indexOf('Safari') > -1) browser = 'Safari';
        else if (ua.indexOf('Firefox') > -1) browser = 'Firefox';
        else if (ua.indexOf('Edge') > -1) browser = 'Edge';

        return browser;
    }

    /**
     * 立即发送所有缓冲的日志
     */
    async flush() {
        if (this.logBuffer.length === 0) {
            return;
        }

        // 取出所有缓冲的日志
        const logsToSend = this.logBuffer.splice(0, this.logBuffer.length);

        try {
            const response = await fetch('/danbooru/logs/batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    logs: logsToSend
                })
            });

            if (!response.ok) {
                // 发送失败，恢复日志到缓冲区（避免丢失）
                this.logBuffer.unshift(...logsToSend);
                console.error('[LoggerClient] 日志发送失败:', response.status);
            }
        } catch (error) {
            // 网络错误，恢复日志到缓冲区
            this.logBuffer.unshift(...logsToSend);
            console.error('[LoggerClient] 日志发送异常:', error);
        }
    }

    /**
     * 设置日志级别
     */
    setLevel(level) {
        if (typeof level === 'string') {
            this.currentLevel = LOG_LEVELS[level.toUpperCase()] || LOG_LEVELS.INFO;
        } else {
            this.currentLevel = level;
        }
        this._saveConfig();
    }

    /**
     * 启用/禁用远程日志
     */
    setRemoteLogging(enabled) {
        this.remoteLoggingEnabled = enabled;
        this._saveConfig();
    }

    /**
     * 启用/禁用控制台输出
     */
    setConsoleOutput(enabled) {
        this.consoleOutputEnabled = enabled;
        this._saveConfig();
    }
}

// 全局单例
const globalLoggerClient = new LoggerClient();

/**
 * 创建组件专用的logger
 * @param {string} componentName - 组件名称
 * @returns {Object} logger对象
 */
export function createLogger(componentName) {
    return {
        debug: (...args) => globalLoggerClient.log(componentName, LOG_LEVELS.DEBUG, ...args),
        info: (...args) => globalLoggerClient.log(componentName, LOG_LEVELS.INFO, ...args),
        warn: (...args) => globalLoggerClient.log(componentName, LOG_LEVELS.WARNING, ...args),
        warning: (...args) => globalLoggerClient.log(componentName, LOG_LEVELS.WARNING, ...args),
        error: (...args) => globalLoggerClient.log(componentName, LOG_LEVELS.ERROR, ...args),
        critical: (...args) => globalLoggerClient.log(componentName, LOG_LEVELS.CRITICAL, ...args)
    };
}

/**
 * 导出全局logger客户端（用于配置）
 */
export const loggerClient = globalLoggerClient;

/**
 * 导出日志级别常量
 */
export { LOG_LEVELS };
