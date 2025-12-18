/**
 * 诊断日志系统
 * 提供详细的错误诊断和日志记录功能
 */

// 日志级别枚举
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

// 日志条目接口
export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  stack?: string;
  context?: Record<string, any>;
}

// 诊断信息接口
export interface DiagnosticInfo {
  sessionId: string;
  userAgent: string;
  url: string;
  timestamp: number;
  reactVersion?: string;
  performanceMetrics?: {
    memory?: {
      used: number;
      total: number;
      limit: number;
    };
    timing?: {
      navigationStart: number;
      loadEventEnd: number;
      domContentLoaded: number;
    };
  };
  errorContext?: {
    componentStack?: string;
    errorBoundary?: string;
    retryCount?: number;
  };
}

/**
 * 诊断日志记录器类
 */
export class DiagnosticLogger {
  private static instance: DiagnosticLogger;
  private logs: LogEntry[] = [];
  private sessionId: string;
  private maxLogs: number = 1000;
  private enableConsoleOutput: boolean = true;
  private enableRemoteLogging: boolean = false;
  private remoteEndpoint?: string;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeLogger();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): DiagnosticLogger {
    if (!DiagnosticLogger.instance) {
      DiagnosticLogger.instance = new DiagnosticLogger();
    }
    return DiagnosticLogger.instance;
  }

  /**
   * 初始化日志记录器
   */
  private initializeLogger(): void {
    // 监听未捕获的错误
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.error('uncaught_error', event.error?.message || 'Unknown error', {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.error('unhandled_promise_rejection', 'Unhandled promise rejection', {
          reason: event.reason
        });
      });
    }

    this.info('diagnostic_logger', 'Diagnostic logger initialized', {
      sessionId: this.sessionId,
      timestamp: Date.now()
    });
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 配置日志记录器
   */
  public configure(options: {
    maxLogs?: number;
    enableConsoleOutput?: boolean;
    enableRemoteLogging?: boolean;
    remoteEndpoint?: string;
  }): void {
    this.maxLogs = options.maxLogs ?? this.maxLogs;
    this.enableConsoleOutput = options.enableConsoleOutput ?? this.enableConsoleOutput;
    this.enableRemoteLogging = options.enableRemoteLogging ?? this.enableRemoteLogging;
    this.remoteEndpoint = options.remoteEndpoint ?? this.remoteEndpoint;

    this.info('diagnostic_logger', 'Logger configuration updated', options);
  }

  /**
   * 记录日志
   */
  private log(level: LogLevel, category: string, message: string, data?: any, stack?: string): void {
    const entry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      level,
      category,
      message,
      data,
      stack,
      context: this.gatherContext()
    };

    // 添加到日志数组
    this.logs.push(entry);

    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // 控制台输出
    if (this.enableConsoleOutput) {
      this.outputToConsole(entry);
    }

    // 远程日志记录
    if (this.enableRemoteLogging && this.remoteEndpoint) {
      this.sendToRemote(entry);
    }
  }

  /**
   * 收集上下文信息
   */
  private gatherContext(): Record<string, any> {
    const context: Record<string, any> = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString()
    };

    try {
      // 浏览器信息
      if (typeof window !== 'undefined') {
        context.url = window.location.href;
        context.userAgent = navigator.userAgent;
        context.viewport = {
          width: window.innerWidth,
          height: window.innerHeight
        };
      }

      // React 信息
      if (typeof React !== 'undefined') {
        context.reactVersion = React.version;
      }

      // 性能信息
      if (typeof performance !== 'undefined') {
        context.performanceNow = performance.now();
        
        if (performance.memory) {
          context.memory = {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit
          };
        }

        if (performance.timing) {
          context.timing = {
            navigationStart: performance.timing.navigationStart,
            loadEventEnd: performance.timing.loadEventEnd,
            domContentLoaded: performance.timing.domContentLoadedEventEnd
          };
        }
      }

    } catch (error) {
      context.contextError = error instanceof Error ? error.message : String(error);
    }

    return context;
  }

  /**
   * 输出到控制台
   */
  private outputToConsole(entry: LogEntry): void {
    const prefix = `[${new Date(entry.timestamp).toISOString()}] [${entry.level.toUpperCase()}] [${entry.category}]`;
    const message = `${prefix} ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.data);
        break;
      case LogLevel.INFO:
        console.info(message, entry.data);
        break;
      case LogLevel.WARN:
        console.warn(message, entry.data);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(message, entry.data);
        if (entry.stack) {
          console.error('Stack trace:', entry.stack);
        }
        break;
    }
  }

  /**
   * 发送到远程服务
   */
  private async sendToRemote(entry: LogEntry): Promise<void> {
    if (!this.remoteEndpoint) return;

    try {
      await fetch(this.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...entry,
          sessionId: this.sessionId
        })
      });
    } catch (error) {
      // 避免无限循环，不记录远程日志发送错误
      console.warn('Failed to send log to remote endpoint:', error);
    }
  }

  /**
   * Debug 级别日志
   */
  public debug(category: string, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, category, message, data);
  }

  /**
   * Info 级别日志
   */
  public info(category: string, message: string, data?: any): void {
    this.log(LogLevel.INFO, category, message, data);
  }

  /**
   * Warning 级别日志
   */
  public warn(category: string, message: string, data?: any): void {
    this.log(LogLevel.WARN, category, message, data);
  }

  /**
   * Error 级别日志
   */
  public error(category: string, message: string, data?: any, error?: Error): void {
    this.log(LogLevel.ERROR, category, message, data, error?.stack);
  }

  /**
   * Fatal 级别日志
   */
  public fatal(category: string, message: string, data?: any, error?: Error): void {
    this.log(LogLevel.FATAL, category, message, data, error?.stack);
  }

  /**
   * 记录 React Hook 错误
   */
  public logReactHookError(error: Error, componentStack?: string): void {
    this.error('react_hook_error', error.message, {
      componentStack,
      errorType: 'hook_error',
      stack: error.stack
    }, error);
  }

  /**
   * 记录模块加载错误
   */
  public logModuleLoadingError(moduleName: string, error: Error): void {
    this.error('module_loading_error', `Failed to load module: ${moduleName}`, {
      moduleName,
      errorType: 'module_loading_error',
      stack: error.stack
    }, error);
  }

  /**
   * 记录初始化错误
   */
  public logInitializationError(stage: string, error: Error): void {
    this.error('initialization_error', `Initialization failed at stage: ${stage}`, {
      stage,
      errorType: 'initialization_error',
      stack: error.stack
    }, error);
  }

  /**
   * 获取所有日志
   */
  public getLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  /**
   * 获取最近的日志
   */
  public getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * 清除日志
   */
  public clearLogs(): void {
    this.logs = [];
    this.info('diagnostic_logger', 'Logs cleared');
  }

  /**
   * 导出日志
   */
  public exportLogs(): string {
    const diagnosticInfo: DiagnosticInfo = {
      sessionId: this.sessionId,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      timestamp: Date.now(),
      reactVersion: typeof React !== 'undefined' ? React.version : undefined,
      performanceMetrics: this.gatherPerformanceMetrics()
    };

    return JSON.stringify({
      diagnosticInfo,
      logs: this.logs
    }, null, 2);
  }

  /**
   * 收集性能指标
   */
  private gatherPerformanceMetrics(): DiagnosticInfo['performanceMetrics'] {
    const metrics: DiagnosticInfo['performanceMetrics'] = {};

    try {
      if (typeof performance !== 'undefined') {
        if (performance.memory) {
          metrics.memory = {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit
          };
        }

        if (performance.timing) {
          metrics.timing = {
            navigationStart: performance.timing.navigationStart,
            loadEventEnd: performance.timing.loadEventEnd,
            domContentLoaded: performance.timing.domContentLoadedEventEnd
          };
        }
      }
    } catch (error) {
      // 忽略性能指标收集错误
    }

    return metrics;
  }

  /**
   * 获取会话ID
   */
  public getSessionId(): string {
    return this.sessionId;
  }
}

/**
 * 便捷函数：获取日志记录器实例
 */
export function getLogger(): DiagnosticLogger {
  return DiagnosticLogger.getInstance();
}

/**
 * 便捷函数：记录错误
 */
export function logError(category: string, message: string, data?: any, error?: Error): void {
  const logger = DiagnosticLogger.getInstance();
  logger.error(category, message, data, error);
}

/**
 * 便捷函数：记录信息
 */
export function logInfo(category: string, message: string, data?: any): void {
  const logger = DiagnosticLogger.getInstance();
  logger.info(category, message, data);
}

/**
 * 便捷函数：记录警告
 */
export function logWarning(category: string, message: string, data?: any): void {
  const logger = DiagnosticLogger.getInstance();
  logger.warn(category, message, data);
}