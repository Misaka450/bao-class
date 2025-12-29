/**
 * React 上下文验证系统
 * 提供上下文稳定性监控和验证功能
 */

import React from 'react';
import { DiagnosticLogger } from './diagnosticLogger';

// 上下文验证结果接口
export interface ContextValidationResult {
  isValid: boolean;
  contextName: string;
  errors: string[];
  warnings: string[];
  recommendations: string[];
  stability: ContextStabilityMetrics;
}

// 上下文稳定性指标
export interface ContextStabilityMetrics {
  creationTime: number;
  lastValidationTime: number;
  validationCount: number;
  errorCount: number;
  warningCount: number;
  averageValidationTime: number;
  isStable: boolean;
}

// 上下文健康状态
export interface ContextHealthStatus {
  contextName: string;
  isHealthy: boolean;
  lastCheckTime: number;
  issues: string[];
  performance: {
    renderCount: number;
    averageRenderTime: number;
    memoryUsage: number;
  };
}

// 上下文监控配置
export interface ContextMonitorConfig {
  enablePerformanceMonitoring: boolean;
  enableStabilityChecks: boolean;
  validationInterval: number;
  maxValidationHistory: number;
  performanceThresholds: {
    maxRenderTime: number;
    maxMemoryUsage: number;
    maxRenderCount: number;
  };
}

/**
 * React 上下文验证器类
 */
export class ReactContextValidator {
  private static instance: ReactContextValidator;
  private logger: DiagnosticLogger;
  private config: Required<ContextMonitorConfig>;
  private contextRegistry: Map<string, {
    context: React.Context<any>;
    metrics: ContextStabilityMetrics;
    validationHistory: ContextValidationResult[];
  }> = new Map();
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();

  private constructor(config: Partial<ContextMonitorConfig> = {}) {
    this.logger = DiagnosticLogger.getInstance();
    
    this.config = {
      enablePerformanceMonitoring: config.enablePerformanceMonitoring ?? true,
      enableStabilityChecks: config.enableStabilityChecks ?? true,
      validationInterval: config.validationInterval ?? 5000,
      maxValidationHistory: config.maxValidationHistory ?? 50,
      performanceThresholds: {
        maxRenderTime: config.performanceThresholds?.maxRenderTime ?? 16,
        maxMemoryUsage: config.performanceThresholds?.maxMemoryUsage ?? 50 * 1024 * 1024,
        maxRenderCount: config.performanceThresholds?.maxRenderCount ?? 1000,
        ...config.performanceThresholds
      }
    };

    this.logger.info('context_validator', 'React Context Validator initialized', {
      config: this.config
    });
  }

  /**
   * 获取单例实例
   */
  public static getInstance(config?: Partial<ContextMonitorConfig>): ReactContextValidator {
    if (!ReactContextValidator.instance) {
      ReactContextValidator.instance = new ReactContextValidator(config);
    }
    return ReactContextValidator.instance;
  }

  /**
   * 注册上下文进行监控
   */
  public registerContext<T>(
    contextName: string, 
    context: React.Context<T>,
    options: {
      enableMonitoring?: boolean;
      customValidation?: (value: T) => ContextValidationResult;
    } = {}
  ): void {
    this.logger.info('context_validator', `Registering context: ${contextName}`);

    const metrics: ContextStabilityMetrics = {
      creationTime: Date.now(),
      lastValidationTime: 0,
      validationCount: 0,
      errorCount: 0,
      warningCount: 0,
      averageValidationTime: 0,
      isStable: true
    };

    this.contextRegistry.set(contextName, {
      context,
      metrics,
      validationHistory: []
    });

    // 启动监控
    if (options.enableMonitoring !== false && this.config.enableStabilityChecks) {
      this.startContextMonitoring(contextName);
    }

    this.logger.info('context_validator', `Context registered successfully: ${contextName}`);
  }

  /**
   * 验证上下文
   */
  public validateContext<T>(
    contextName: string,
    contextValue?: T,
    customValidation?: (value: T) => Partial<ContextValidationResult>
  ): ContextValidationResult {
    const startTime = Date.now();
    const contextEntry = this.contextRegistry.get(contextName);

    if (!contextEntry) {
      const result: ContextValidationResult = {
        isValid: false,
        contextName,
        errors: [`Context '${contextName}' is not registered`],
        warnings: [],
        recommendations: ['Register the context before validation'],
        stability: {
          creationTime: 0,
          lastValidationTime: startTime,
          validationCount: 0,
          errorCount: 1,
          warningCount: 0,
          averageValidationTime: 0,
          isStable: false
        }
      };

      this.logger.error('context_validator', `Context not found: ${contextName}`, { contextName });
      return result;
    }

    const { context, metrics } = contextEntry;
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    try {
      // 基本上下文验证
      if (!context) {
        errors.push('Context object is null or undefined');
      } else {
        // 验证上下文是否为有效的 React Context
        if (!this.isValidReactContext(context)) {
          errors.push('Invalid React Context object');
        }

        // 验证上下文提供者
        if (!this.hasValidProvider(context)) {
          warnings.push('Context may not have a valid provider');
          recommendations.push('Ensure context is wrapped with a provider');
        }
      }

      // 验证上下文值
      if (contextValue !== undefined) {
        const valueValidation = this.validateContextValue(contextValue);
        errors.push(...valueValidation.errors);
        warnings.push(...valueValidation.warnings);
        recommendations.push(...valueValidation.recommendations);
      }

      // 自定义验证
      if (customValidation && contextValue !== undefined) {
        try {
          const customResult = customValidation(contextValue);
          if (customResult.errors) errors.push(...customResult.errors);
          if (customResult.warnings) warnings.push(...customResult.warnings);
          if (customResult.recommendations) recommendations.push(...customResult.recommendations);
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          errors.push(`Custom validation failed: ${err.message}`);
        }
      }

      // 性能验证
      if (this.config.enablePerformanceMonitoring) {
        const performanceIssues = this.validateContextPerformance(contextName);
        warnings.push(...performanceIssues.warnings);
        recommendations.push(...performanceIssues.recommendations);
      }

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      errors.push(`Validation error: ${err.message}`);
      this.logger.error('context_validator', `Context validation error: ${contextName}`, {
        contextName,
        error: err.message
      }, err);
    }

    // 更新指标
    const validationTime = Date.now() - startTime;
    metrics.validationCount++;
    metrics.lastValidationTime = Date.now();
    metrics.errorCount += errors.length;
    metrics.warningCount += warnings.length;
    metrics.averageValidationTime = 
      (metrics.averageValidationTime * (metrics.validationCount - 1) + validationTime) / metrics.validationCount;
    metrics.isStable = errors.length === 0 && metrics.errorCount < 5;

    const result: ContextValidationResult = {
      isValid: errors.length === 0,
      contextName,
      errors,
      warnings,
      recommendations,
      stability: { ...metrics }
    };

    // 保存验证历史
    contextEntry.validationHistory.push(result);
    if (contextEntry.validationHistory.length > this.config.maxValidationHistory) {
      contextEntry.validationHistory = contextEntry.validationHistory.slice(-this.config.maxValidationHistory);
    }

    // 记录验证结果
    if (errors.length > 0) {
      this.logger.error('context_validator', `Context validation failed: ${contextName}`, {
        contextName,
        errors,
        warnings,
        validationTime
      });
    } else {
      this.logger.debug('context_validator', `Context validation passed: ${contextName}`, {
        contextName,
        warnings,
        validationTime
      });
    }

    return result;
  }

  /**
   * 检查是否为有效的 React Context
   */
  private isValidReactContext(context: any): boolean {
    try {
      return (
        context &&
        typeof context === 'object' &&
        context.$$typeof === Symbol.for('react.context') &&
        typeof context.Provider === 'function' &&
        typeof context.Consumer === 'function'
      );
    } catch {
      return false;
    }
  }

  /**
   * 检查上下文是否有有效的提供者
   */
  private hasValidProvider(context: React.Context<any>): boolean {
    try {
      // 这是一个简化的检查，实际实现可能需要更复杂的逻辑
      return context.Provider !== undefined;
    } catch {
      return false;
    }
  }

  /**
   * 验证上下文值
   */
  private validateContextValue(value: any): {
    errors: string[];
    warnings: string[];
    recommendations: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    try {
      // 检查值是否为 null 或 undefined
      if (value === null) {
        warnings.push('Context value is null');
        recommendations.push('Consider providing a default value');
      } else if (value === undefined) {
        warnings.push('Context value is undefined');
        recommendations.push('Ensure context provider is properly initialized');
      }

      // 检查循环引用
      try {
        JSON.stringify(value);
      } catch (error) {
        if (error instanceof Error && error.message.includes('circular')) {
          errors.push('Context value contains circular references');
          recommendations.push('Remove circular references from context value');
        }
      }

      // 检查值的大小（如果是对象）
      if (typeof value === 'object' && value !== null) {
        const stringified = JSON.stringify(value);
        if (stringified.length > 100000) { // 100KB
          warnings.push('Context value is very large');
          recommendations.push('Consider optimizing context value size');
        }
      }

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      errors.push(`Value validation error: ${err.message}`);
    }

    return { errors, warnings, recommendations };
  }

  /**
   * 验证上下文性能
   */
  private validateContextPerformance(contextName: string): {
    warnings: string[];
    recommendations: string[];
  } {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    try {
      const contextEntry = this.contextRegistry.get(contextName);
      if (!contextEntry) return { warnings, recommendations };

      const { metrics } = contextEntry;

      // 检查验证频率
      if (metrics.validationCount > this.config.performanceThresholds.maxRenderCount) {
        warnings.push('High validation frequency detected');
        recommendations.push('Consider reducing context validation frequency');
      }

      // 检查平均验证时间
      if (metrics.averageValidationTime > this.config.performanceThresholds.maxRenderTime) {
        warnings.push('Slow context validation detected');
        recommendations.push('Optimize context validation logic');
      }

      // 检查错误率
      const errorRate = metrics.errorCount / Math.max(metrics.validationCount, 1);
      if (errorRate > 0.1) { // 10% 错误率
        warnings.push('High context error rate detected');
        recommendations.push('Investigate and fix context stability issues');
      }

    } catch (error) {
      warnings.push('Performance validation failed');
    }

    return { warnings, recommendations };
  }

  /**
   * 启动上下文监控
   */
  private startContextMonitoring(contextName: string): void {
    // 清除现有的监控
    this.stopContextMonitoring(contextName);

    const interval = setInterval(() => {
      try {
        this.validateContext(contextName);
      } catch (error) {
        this.logger.error('context_validator', `Context monitoring error: ${contextName}`, {
          contextName,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }, this.config.validationInterval);

    this.monitoringIntervals.set(contextName, interval);
    
    this.logger.debug('context_validator', `Started monitoring for context: ${contextName}`);
  }

  /**
   * 停止上下文监控
   */
  public stopContextMonitoring(contextName: string): void {
    const interval = this.monitoringIntervals.get(contextName);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(contextName);
      this.logger.debug('context_validator', `Stopped monitoring for context: ${contextName}`);
    }
  }

  /**
   * 获取上下文健康状态
   */
  public getContextHealth(contextName: string): ContextHealthStatus | null {
    const contextEntry = this.contextRegistry.get(contextName);
    if (!contextEntry) return null;

    const { metrics, validationHistory } = contextEntry;
    const recentValidations = validationHistory.slice(-10);
    const issues: string[] = [];

    // 收集最近的问题
    recentValidations.forEach(validation => {
      issues.push(...validation.errors);
      issues.push(...validation.warnings);
    });

    return {
      contextName,
      isHealthy: metrics.isStable && metrics.errorCount === 0,
      lastCheckTime: metrics.lastValidationTime,
      issues: [...new Set(issues)], // 去重
      performance: {
        renderCount: metrics.validationCount,
        averageRenderTime: metrics.averageValidationTime,
        memoryUsage: 0 // 这里可以添加实际的内存使用监控
      }
    };
  }

  /**
   * 获取所有上下文的健康状态
   */
  public getAllContextsHealth(): ContextHealthStatus[] {
    const healthStatuses: ContextHealthStatus[] = [];
    
    for (const contextName of this.contextRegistry.keys()) {
      const health = this.getContextHealth(contextName);
      if (health) {
        healthStatuses.push(health);
      }
    }

    return healthStatuses;
  }

  /**
   * 确保上下文稳定性
   */
  public ensureContextStability<T>(
    contextName: string,
    contextValue: T,
    options: {
      retryCount?: number;
      retryDelay?: number;
      onStabilityRestored?: () => void;
    } = {}
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const { retryCount = 3, retryDelay = 1000, onStabilityRestored } = options;
      let attempts = 0;

      const checkStability = () => {
        attempts++;
        const validation = this.validateContext(contextName, contextValue);

        if (validation.isValid && validation.stability.isStable) {
          this.logger.info('context_validator', `Context stability ensured: ${contextName}`, {
            contextName,
            attempts
          });
          
          if (onStabilityRestored) {
            onStabilityRestored();
          }
          
          resolve(true);
          return;
        }

        if (attempts >= retryCount) {
          this.logger.warn('context_validator', `Failed to ensure context stability: ${contextName}`, {
            contextName,
            attempts,
            errors: validation.errors
          });
          resolve(false);
          return;
        }

        // 重试
        setTimeout(checkStability, retryDelay);
      };

      checkStability();
    });
  }

  /**
   * 重置上下文验证器
   */
  public reset(): void {
    // 停止所有监控
    for (const contextName of this.monitoringIntervals.keys()) {
      this.stopContextMonitoring(contextName);
    }

    // 清除注册的上下文
    this.contextRegistry.clear();
    this.monitoringIntervals.clear();

    this.logger.info('context_validator', 'Context validator reset');
  }

  /**
   * 获取验证统计信息
   */
  public getValidationStats(): {
    totalContexts: number;
    healthyContexts: number;
    totalValidations: number;
    totalErrors: number;
    averageValidationTime: number;
  } {
    let totalValidations = 0;
    let totalErrors = 0;
    let totalValidationTime = 0;
    let healthyContexts = 0;

    for (const { metrics } of this.contextRegistry.values()) {
      totalValidations += metrics.validationCount;
      totalErrors += metrics.errorCount;
      totalValidationTime += metrics.averageValidationTime * metrics.validationCount;
      
      if (metrics.isStable && metrics.errorCount === 0) {
        healthyContexts++;
      }
    }

    return {
      totalContexts: this.contextRegistry.size,
      healthyContexts,
      totalValidations,
      totalErrors,
      averageValidationTime: totalValidations > 0 ? totalValidationTime / totalValidations : 0
    };
  }
}

/**
 * 便捷函数：获取上下文验证器实例
 */
export function getContextValidator(config?: Partial<ContextMonitorConfig>): ReactContextValidator {
  return ReactContextValidator.getInstance(config);
}

/**
 * 便捷函数：验证上下文
 */
export function validateContext<T>(
  contextName: string,
  contextValue?: T,
  customValidation?: (value: T) => Partial<ContextValidationResult>
): ContextValidationResult {
  const validator = ReactContextValidator.getInstance();
  return validator.validateContext(contextName, contextValue, customValidation);
}

/**
 * 便捷函数：确保上下文稳定性
 */
export function ensureContextStability<T>(
  contextName: string,
  contextValue: T,
  options?: {
    retryCount?: number;
    retryDelay?: number;
    onStabilityRestored?: () => void;
  }
): Promise<boolean> {
  const validator = ReactContextValidator.getInstance();
  return validator.ensureContextStability(contextName, contextValue, options);
}