/**
 * 错误恢复机制
 * 提供自动和手动的错误恢复策略
 */

import { DiagnosticLogger, LogLevel } from './diagnosticLogger';
import { ReactReadinessDetector } from './reactGuard';
import { ModuleLoadingController } from './moduleLoader';

// 恢复策略枚举
export enum RecoveryStrategy {
  RETRY = 'retry',
  RESET = 'reset',
  RELOAD = 'reload',
  FALLBACK = 'fallback',
  MANUAL = 'manual'
}

// 恢复选项接口
export interface RecoveryOption {
  id: string;
  strategy: RecoveryStrategy;
  title: string;
  description: string;
  action: () => Promise<void> | void;
  isRecommended?: boolean;
  estimatedTime?: number; // 预估恢复时间（毫秒）
}

// 恢复状态接口
export interface RecoveryState {
  isRecovering: boolean;
  strategy: RecoveryStrategy | null;
  attempts: number;
  maxAttempts: number;
  lastAttemptTime: number;
  totalRecoveryTime: number;
}

// 错误恢复配置
export interface ErrorRecoveryConfig {
  maxRetries: number;
  retryDelay: number;
  enableAutoRecovery: boolean;
  fallbackComponent?: React.ComponentType;
  onRecoveryStart?: (strategy: RecoveryStrategy) => void;
  onRecoverySuccess?: (strategy: RecoveryStrategy, attempts: number) => void;
  onRecoveryFailure?: (strategy: RecoveryStrategy, error: Error) => void;
}

/**
 * 错误恢复管理器类
 */
export class ErrorRecoveryManager {
  private static instance: ErrorRecoveryManager;
  private logger: DiagnosticLogger;
  private reactDetector: ReactReadinessDetector;
  private moduleController: ModuleLoadingController;
  private config: Required<ErrorRecoveryConfig>;
  private state: RecoveryState;
  private recoveryTimer: NodeJS.Timeout | null = null;

  private constructor(config: Partial<ErrorRecoveryConfig> = {}) {
    this.logger = DiagnosticLogger.getInstance();
    this.reactDetector = ReactReadinessDetector.getInstance();
    this.moduleController = ModuleLoadingController.getInstance();
    
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 2000,
      enableAutoRecovery: config.enableAutoRecovery ?? true,
      fallbackComponent: config.fallbackComponent,
      onRecoveryStart: config.onRecoveryStart ?? (() => {}),
      onRecoverySuccess: config.onRecoverySuccess ?? (() => {}),
      onRecoveryFailure: config.onRecoveryFailure ?? (() => {})
    };

    this.state = {
      isRecovering: false,
      strategy: null,
      attempts: 0,
      maxAttempts: this.config.maxRetries,
      lastAttemptTime: 0,
      totalRecoveryTime: 0
    };
  }

  /**
   * 获取单例实例
   */
  public static getInstance(config?: Partial<ErrorRecoveryConfig>): ErrorRecoveryManager {
    if (!ErrorRecoveryManager.instance) {
      ErrorRecoveryManager.instance = new ErrorRecoveryManager(config);
    }
    return ErrorRecoveryManager.instance;
  }

  /**
   * 分析错误并提供恢复选项
   */
  public analyzeErrorAndProvideOptions(error: Error, context?: Record<string, any>): RecoveryOption[] {
    this.logger.info('error_recovery', 'Analyzing error for recovery options', {
      error: error.message,
      context
    });

    const options: RecoveryOption[] = [];
    const errorMessage = error.message.toLowerCase();

    // React Hook 相关错误
    if (this.isReactHookError(error)) {
      options.push(
        {
          id: 'react_reset',
          strategy: RecoveryStrategy.RESET,
          title: '重置 React 环境',
          description: '重新初始化 React 环境和 Hook 上下文',
          action: () => this.resetReactEnvironment(),
          isRecommended: true,
          estimatedTime: 3000
        },
        {
          id: 'react_retry',
          strategy: RecoveryStrategy.RETRY,
          title: '重试 React 初始化',
          description: '重新尝试 React 初始化过程',
          action: () => this.retryReactInitialization(),
          estimatedTime: 2000
        }
      );
    }

    // 模块加载相关错误
    if (this.isModuleLoadingError(error)) {
      options.push(
        {
          id: 'module_reset',
          strategy: RecoveryStrategy.RESET,
          title: '重置模块加载器',
          description: '清除模块缓存并重新加载所有模块',
          action: () => this.resetModuleLoader(),
          isRecommended: true,
          estimatedTime: 5000
        },
        {
          id: 'module_retry',
          strategy: RecoveryStrategy.RETRY,
          title: '重试模块加载',
          description: '重新尝试加载失败的模块',
          action: () => this.retryModuleLoading(),
          estimatedTime: 3000
        }
      );
    }

    // 通用恢复选项
    options.push(
      {
        id: 'app_reset',
        strategy: RecoveryStrategy.RESET,
        title: '重置应用状态',
        description: '完全重置应用到初始状态',
        action: () => this.resetApplication(),
        estimatedTime: 4000
      },
      {
        id: 'page_reload',
        strategy: RecoveryStrategy.RELOAD,
        title: '刷新页面',
        description: '重新加载整个页面',
        action: () => this.reloadPage(),
        estimatedTime: 1000
      },
      {
        id: 'manual_recovery',
        strategy: RecoveryStrategy.MANUAL,
        title: '手动处理',
        description: '查看详细错误信息并手动处理',
        action: () => this.showManualRecoveryOptions(error),
        estimatedTime: 0
      }
    );

    return options;
  }

  /**
   * 判断是否为 React Hook 错误
   */
  private isReactHookError(error: Error): boolean {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';
    
    return message.includes('hook') || 
           message.includes('useeffect') || 
           message.includes('usestate') ||
           message.includes('usecontext') ||
           stack.includes('hook');
  }

  /**
   * 判断是否为模块加载错误
   */
  private isModuleLoadingError(error: Error): boolean {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';
    
    return message.includes('module') || 
           message.includes('import') || 
           message.includes('loading') ||
           stack.includes('moduleloader');
  }

  /**
   * 执行恢复策略
   */
  public async executeRecovery(option: RecoveryOption): Promise<boolean> {
    if (this.state.isRecovering) {
      this.logger.warn('error_recovery', 'Recovery already in progress');
      return false;
    }

    this.startRecovery(option.strategy);

    try {
      this.logger.info('error_recovery', `Starting recovery with strategy: ${option.strategy}`, {
        option: option.title,
        attempts: this.state.attempts + 1
      });

      await option.action();

      this.completeRecovery(true);
      this.config.onRecoverySuccess(option.strategy, this.state.attempts);
      
      return true;

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('error_recovery', `Recovery failed: ${err.message}`, {
        strategy: option.strategy,
        attempts: this.state.attempts
      }, err);

      this.completeRecovery(false);
      this.config.onRecoveryFailure(option.strategy, err);
      
      return false;
    }
  }

  /**
   * 开始恢复过程
   */
  private startRecovery(strategy: RecoveryStrategy): void {
    this.state = {
      ...this.state,
      isRecovering: true,
      strategy,
      attempts: this.state.attempts + 1,
      lastAttemptTime: Date.now()
    };

    this.config.onRecoveryStart(strategy);
  }

  /**
   * 完成恢复过程
   */
  private completeRecovery(success: boolean): void {
    const recoveryTime = Date.now() - this.state.lastAttemptTime;
    
    this.state = {
      ...this.state,
      isRecovering: false,
      strategy: null,
      totalRecoveryTime: this.state.totalRecoveryTime + recoveryTime
    };

    if (success) {
      this.logger.info('error_recovery', 'Recovery completed successfully', {
        recoveryTime,
        totalAttempts: this.state.attempts
      });
    }
  }

  /**
   * 重置 React 环境
   */
  private async resetReactEnvironment(): Promise<void> {
    this.logger.info('error_recovery', 'Resetting React environment');
    
    // 重置 React 检测器
    this.reactDetector.reset();
    
    // 重新初始化 React
    await this.reactDetector.initializeReact();
    
    this.logger.info('error_recovery', 'React environment reset completed');
  }

  /**
   * 重试 React 初始化
   */
  private async retryReactInitialization(): Promise<void> {
    this.logger.info('error_recovery', 'Retrying React initialization');
    
    await this.reactDetector.waitForReact(10000);
    
    this.logger.info('error_recovery', 'React initialization retry completed');
  }

  /**
   * 重置模块加载器
   */
  private async resetModuleLoader(): Promise<void> {
    this.logger.info('error_recovery', 'Resetting module loader');
    
    // 重置模块控制器
    this.moduleController.reset();
    
    // 重新加载所有模块
    await this.moduleController.loadAllModules();
    
    this.logger.info('error_recovery', 'Module loader reset completed');
  }

  /**
   * 重试模块加载
   */
  private async retryModuleLoading(): Promise<void> {
    this.logger.info('error_recovery', 'Retrying module loading');
    
    await this.moduleController.loadAllModules();
    
    this.logger.info('error_recovery', 'Module loading retry completed');
  }

  /**
   * 重置应用状态
   */
  private async resetApplication(): Promise<void> {
    this.logger.info('error_recovery', 'Resetting application state');
    
    // 重置所有组件
    await this.resetReactEnvironment();
    await this.resetModuleLoader();
    
    // 清除本地存储（可选）
    if (typeof localStorage !== 'undefined') {
      const keysToKeep = ['user_preferences', 'auth_token']; // 保留重要数据
      const allKeys = Object.keys(localStorage);
      
      allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      });
    }
    
    this.logger.info('error_recovery', 'Application state reset completed');
  }

  /**
   * 重新加载页面
   */
  private reloadPage(): void {
    this.logger.info('error_recovery', 'Reloading page');
    
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  /**
   * 显示手动恢复选项
   */
  private showManualRecoveryOptions(error: Error): void {
    this.logger.info('error_recovery', 'Showing manual recovery options');
    
    console.group('🔧 手动恢复选项');
    console.error('错误详情:', error);
    console.log('诊断日志:', this.logger.exportLogs());
    console.log('恢复状态:', this.state);
    console.groupEnd();
    
    // 可以在这里显示更详细的调试界面
  }

  /**
   * 自动恢复
   */
  public async attemptAutoRecovery(error: Error, context?: Record<string, any>): Promise<boolean> {
    if (!this.config.enableAutoRecovery || this.state.attempts >= this.config.maxRetries) {
      return false;
    }

    this.logger.info('error_recovery', 'Attempting auto recovery', {
      attempts: this.state.attempts,
      maxAttempts: this.config.maxRetries
    });

    const options = this.analyzeErrorAndProvideOptions(error, context);
    const recommendedOption = options.find(opt => opt.isRecommended) || options[0];

    if (recommendedOption) {
      // 延迟执行恢复
      return new Promise((resolve) => {
        this.recoveryTimer = setTimeout(async () => {
          const success = await this.executeRecovery(recommendedOption);
          resolve(success);
        }, this.config.retryDelay);
      });
    }

    return false;
  }

  /**
   * 获取恢复状态
   */
  public getRecoveryState(): RecoveryState {
    return { ...this.state };
  }

  /**
   * 重置恢复状态
   */
  public resetRecoveryState(): void {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }

    this.state = {
      isRecovering: false,
      strategy: null,
      attempts: 0,
      maxAttempts: this.config.maxRetries,
      lastAttemptTime: 0,
      totalRecoveryTime: 0
    };

    this.logger.info('error_recovery', 'Recovery state reset');
  }
}

/**
 * 便捷函数：获取错误恢复管理器
 */
export function getErrorRecoveryManager(config?: Partial<ErrorRecoveryConfig>): ErrorRecoveryManager {
  return ErrorRecoveryManager.getInstance(config);
}

/**
 * 便捷函数：分析错误并获取恢复选项
 */
export function getRecoveryOptions(error: Error, context?: Record<string, any>): RecoveryOption[] {
  const manager = ErrorRecoveryManager.getInstance();
  return manager.analyzeErrorAndProvideOptions(error, context);
}