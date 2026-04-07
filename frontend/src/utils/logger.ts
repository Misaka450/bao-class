/**
 * 统一日志工具
 * 根据环境自动调整日志输出级别
 * 
 * 使用示例：
 * import { logger } from '@/utils/logger';
 * 
 * logger.debug('调试信息', { data });
 * logger.info('用户登录', { userId: 123 });
 * logger.warn('API 响应缓慢', { duration: 5000 });
 * logger.error('请求失败', error);
 */

// 日志级别
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

// 日志配置
interface LoggerConfig {
  enableDebug: boolean;
  enableInfo: boolean;
  enableWarn: boolean;
  enableError: boolean;
  useJsonFormat: boolean;
}

// 根据环境获取默认配置
function getDefaultConfig(): LoggerConfig {
  const isProduction = import.meta.env.PROD;
  const isDevelopment = import.meta.env.DEV;

  if (isProduction) {
    // 生产环境：仅输出错误和警告
    return {
      enableDebug: false,
      enableInfo: false,
      enableWarn: true,
      enableError: true,
      useJsonFormat: true,
    };
  }

  if (isDevelopment) {
    // 开发环境：输出所有日志
    return {
      enableDebug: true,
      enableInfo: true,
      enableWarn: true,
      enableError: true,
      useJsonFormat: false,
    };
  }

  // 默认配置
  return {
    enableDebug: true,
    enableInfo: true,
    enableWarn: true,
    enableError: true,
    useJsonFormat: false,
  };
}

class Logger {
  private config: LoggerConfig;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = { ...getDefaultConfig(), ...config };
  }

  /**
   * 调试日志
   */
  debug(category: string, message: string, data?: unknown): void {
    if (!this.config.enableDebug) return;
    this.log(LogLevel.DEBUG, category, message, data);
  }

  /**
   * 信息日志
   */
  info(category: string, message: string, data?: unknown): void {
    if (!this.config.enableInfo) return;
    this.log(LogLevel.INFO, category, message, data);
  }

  /**
   * 警告日志
   */
  warn(category: string, message: string, data?: unknown): void {
    if (!this.config.enableWarn) return;
    this.log(LogLevel.WARN, category, message, data);
  }

  /**
   * 错误日志
   */
  error(category: string, message: string, error?: Error | unknown, data?: unknown): void {
    if (!this.config.enableError) return;
    
    if (error instanceof Error) {
      this.log(LogLevel.ERROR, category, message, {
        error: error.message,
        stack: error.stack,
        data,
      });
    } else {
      this.log(LogLevel.ERROR, category, message, { error, data });
    }
  }

  /**
   * 内部日志方法
   */
  private log(level: LogLevel, category: string, message: string, data?: unknown): void {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      level,
      category,
      message,
      ...(data && { data }),
    };

    // 生产环境使用 JSON 格式，方便日志收集
    if (this.config.useJsonFormat) {
      const output = JSON.stringify(logData);
      switch (level) {
        case LogLevel.DEBUG:
        case LogLevel.INFO:
          console.log(output);
          break;
        case LogLevel.WARN:
          console.warn(output);
          break;
        case LogLevel.ERROR:
          console.error(output);
          break;
      }
    } else {
      // 开发环境使用可读格式
      const prefix = `[${timestamp}] [${level.toUpperCase()}] [${category}]`;
      switch (level) {
        case LogLevel.DEBUG:
        case LogLevel.INFO:
          console.log(prefix, message, data || '');
          break;
        case LogLevel.WARN:
          console.warn(prefix, message, data || '');
          break;
        case LogLevel.ERROR:
          console.error(prefix, message, data || '');
          break;
      }
    }
  }

  /**
   * 更新配置
   */
  setConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// 导出单例
export const logger = new Logger();

// 便捷函数
export const logDebug = (category: string, message: string, data?: unknown) => {
  logger.debug(category, message, data);
};

export const logInfo = (category: string, message: string, data?: unknown) => {
  logger.info(category, message, data);
};

export const logWarn = (category: string, message: string, data?: unknown) => {
  logger.warn(category, message, data);
};

export const logError = (category: string, message: string, error?: Error | unknown, data?: unknown) => {
  logger.error(category, message, error, data);
};
