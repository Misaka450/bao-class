/**
 * 结构化日志工具
 * 支持不同级别的日志记录（INFO、WARN、ERROR）
 */

export enum LogLevel {
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
    DEBUG = 'DEBUG'
}

interface LogContext {
    userId?: string | number
    requestId?: string
    path?: string
    method?: string
    [key: string]: any
}

class Logger {
    private context: LogContext = {}

    setContext(context: LogContext) {
        this.context = { ...this.context, ...context }
    }

    clearContext() {
        this.context = {}
    }

    private formatLog(level: LogLevel, message: string, data?: any) {
        const timestamp = new Date().toISOString()
        const logEntry = {
            timestamp,
            level,
            message,
            context: this.context,
            ...(data && { data })
        }
        return logEntry
    }

    info(message: string, data?: any) {
        const log = this.formatLog(LogLevel.INFO, message, data)
        console.log(JSON.stringify(log))
    }

    warn(message: string, data?: any) {
        const log = this.formatLog(LogLevel.WARN, message, data)
        console.warn(JSON.stringify(log))
    }

    error(message: string, error?: Error | any) {
        const log = this.formatLog(LogLevel.ERROR, message, {
            error: error instanceof Error ? {
                message: error.message,
                stack: error.stack,
                name: error.name
            } : error
        })
        console.error(JSON.stringify(log))
    }

    debug(message: string, data?: any) {
        const log = this.formatLog(LogLevel.DEBUG, message, data)
        console.debug(JSON.stringify(log))
    }
}

// 单例实例
export const logger = new Logger()

// 导出类型
export type { LogContext }
