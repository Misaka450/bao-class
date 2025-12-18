/**
 * 上下文验证提供者组件
 * 为应用提供上下文验证和监控功能
 */

import React, { ReactNode, useEffect, useState, createContext, useContext } from 'react';
import { 
  ReactContextValidator, 
  ContextValidationResult, 
  ContextHealthStatus,
  ContextMonitorConfig 
} from '../utils/contextValidator';
import { DiagnosticLogger } from '../utils/diagnosticLogger';

// 上下文验证提供者的上下文接口
export interface ContextValidationContextValue {
  validator: ReactContextValidator;
  isInitialized: boolean;
  globalHealth: {
    totalContexts: number;
    healthyContexts: number;
    unhealthyContexts: number;
    lastUpdate: number;
  };
  registerContext: <T>(
    name: string, 
    context: React.Context<T>, 
    options?: { enableMonitoring?: boolean }
  ) => void;
  validateContext: <T>(
    name: string, 
    value?: T, 
    customValidation?: (value: T) => Partial<ContextValidationResult>
  ) => ContextValidationResult;
  getContextHealth: (name: string) => ContextHealthStatus | null;
  getAllContextsHealth: () => ContextHealthStatus[];
}

// 创建上下文验证上下文
const ContextValidationContext = createContext<ContextValidationContextValue | null>(null);

// 上下文验证提供者属性接口
export interface ContextValidationProviderProps {
  children: ReactNode;
  config?: ContextMonitorConfig;
  onValidationError?: (contextName: string, error: Error) => void;
  onHealthChange?: (contextName: string, health: ContextHealthStatus) => void;
  enableGlobalMonitoring?: boolean;
  monitoringInterval?: number;
}

/**
 * 上下文验证提供者组件
 */
export const ContextValidationProvider: React.FC<ContextValidationProviderProps> = ({
  children,
  config,
  onValidationError,
  onHealthChange,
  enableGlobalMonitoring = true,
  monitoringInterval = 10000
}) => {
  const [validator] = useState(() => ReactContextValidator.getInstance(config));
  const [logger] = useState(() => DiagnosticLogger.getInstance());
  const [isInitialized, setIsInitialized] = useState(false);
  const [globalHealth, setGlobalHealth] = useState({
    totalContexts: 0,
    healthyContexts: 0,
    unhealthyContexts: 0,
    lastUpdate: Date.now()
  });

  // 注册上下文
  const registerContext = React.useCallback(
    <T,>(
      name: string,
      context: React.Context<T>,
      options: { enableMonitoring?: boolean } = {}
    ) => {
    try {
      validator.registerContext(name, context, {
        enableMonitoring: options.enableMonitoring ?? enableGlobalMonitoring
      });
      
      logger.info('context_validation_provider', `Context registered: ${name}`, {
        contextName: name,
        enableMonitoring: options.enableMonitoring ?? enableGlobalMonitoring
      });
      
      // 更新全局健康状态
      updateGlobalHealth();
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('context_validation_provider', `Failed to register context: ${name}`, {
        contextName: name,
        error: err.message
      }, err);
      
      if (onValidationError) {
        onValidationError(name, err);
      }
    }
    },
    [validator, logger, enableGlobalMonitoring, onValidationError]
  );

  // 验证上下文
  const validateContext = React.useCallback(
    <T,>(
      name: string,
      value?: T,
      customValidation?: (value: T) => Partial<ContextValidationResult>
    ): ContextValidationResult => {
    try {
      const result = validator.validateContext(name, value, customValidation);
      
      // 如果验证失败，记录错误
      if (!result.isValid && result.errors.length > 0) {
        logger.warn('context_validation_provider', `Context validation failed: ${name}`, {
          contextName: name,
          errors: result.errors,
          warnings: result.warnings
        });
        
        if (onValidationError) {
          const error = new Error(`Context validation failed: ${result.errors.join(', ')}`);
          onValidationError(name, error);
        }
      }
      
      return result;
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('context_validation_provider', `Context validation error: ${name}`, {
        contextName: name,
        error: err.message
      }, err);
      
      if (onValidationError) {
        onValidationError(name, err);
      }
      
      // 返回失败的验证结果
      return {
        isValid: false,
        contextName: name,
        errors: [err.message],
        warnings: [],
        recommendations: ['Check context configuration and try again'],
        stability: {
          creationTime: 0,
          lastValidationTime: Date.now(),
          validationCount: 0,
          errorCount: 1,
          warningCount: 0,
          averageValidationTime: 0,
          isStable: false
        }
      };
    }
    },
    [validator, logger, onValidationError]
  );

  // 获取上下文健康状态
  const getContextHealth = React.useCallback((name: string): ContextHealthStatus | null => {
    try {
      return validator.getContextHealth(name);
    } catch (error) {
      logger.error('context_validation_provider', `Failed to get context health: ${name}`, {
        contextName: name,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }, [validator, logger]);

  // 获取所有上下文健康状态
  const getAllContextsHealth = React.useCallback((): ContextHealthStatus[] => {
    try {
      return validator.getAllContextsHealth();
    } catch (error) {
      logger.error('context_validation_provider', 'Failed to get all contexts health', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }, [validator, logger]);

  // 更新全局健康状态
  const updateGlobalHealth = React.useCallback(() => {
    try {
      const allHealth = getAllContextsHealth();
      const healthyContexts = allHealth.filter(health => health.isHealthy).length;
      
      const newGlobalHealth = {
        totalContexts: allHealth.length,
        healthyContexts,
        unhealthyContexts: allHealth.length - healthyContexts,
        lastUpdate: Date.now()
      };
      
      setGlobalHealth(newGlobalHealth);
      
      // 触发健康状态变化回调
      if (onHealthChange) {
        allHealth.forEach(health => {
          onHealthChange(health.contextName, health);
        });
      }
      
    } catch (error) {
      logger.error('context_validation_provider', 'Failed to update global health', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }, [getAllContextsHealth, onHealthChange, logger]);

  // 初始化
  useEffect(() => {
    logger.info('context_validation_provider', 'Context validation provider initializing', {
      config,
      enableGlobalMonitoring,
      monitoringInterval
    });

    // 注册一些常见的 React 上下文进行监控
    try {
      // 这里可以注册应用中常用的上下文
      // 例如：主题上下文、认证上下文等
      
      setIsInitialized(true);
      updateGlobalHealth();
      
      logger.info('context_validation_provider', 'Context validation provider initialized successfully');
      
    } catch (error) {
      logger.error('context_validation_provider', 'Failed to initialize context validation provider', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }, [config, enableGlobalMonitoring, monitoringInterval, logger, updateGlobalHealth]);

  // 全局监控
  useEffect(() => {
    if (!enableGlobalMonitoring || !isInitialized) return;

    const interval = setInterval(() => {
      updateGlobalHealth();
    }, monitoringInterval);

    return () => clearInterval(interval);
  }, [enableGlobalMonitoring, isInitialized, monitoringInterval, updateGlobalHealth]);

  // 创建上下文值
  const contextValue: ContextValidationContextValue = {
    validator,
    isInitialized,
    globalHealth,
    registerContext,
    validateContext,
    getContextHealth,
    getAllContextsHealth
  };

  return (
    <ContextValidationContext.Provider value={contextValue}>
      {children}
    </ContextValidationContext.Provider>
  );
};

/**
 * 使用上下文验证上下文的 Hook
 */
export function useContextValidation(): ContextValidationContextValue {
  const context = useContext(ContextValidationContext);
  
  if (!context) {
    throw new Error('useContextValidation must be used within a ContextValidationProvider');
  }
  
  return context;
}

/**
 * 上下文验证状态显示组件
 */
export interface ContextValidationStatusProps {
  showDetails?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const ContextValidationStatus: React.FC<ContextValidationStatusProps> = ({
  showDetails = false,
  className,
  style
}) => {
  const { globalHealth, getAllContextsHealth, isInitialized } = useContextValidation();
  const [allHealth, setAllHealth] = useState<ContextHealthStatus[]>([]);

  // 更新详细健康状态
  useEffect(() => {
    if (showDetails) {
      const health = getAllContextsHealth();
      setAllHealth(health);
    }
  }, [showDetails, getAllContextsHealth, globalHealth.lastUpdate]);

  if (!isInitialized) {
    return (
      <div className={className} style={style}>
        <span style={{ color: '#999' }}>上下文验证系统初始化中...</span>
      </div>
    );
  }

  const { totalContexts, healthyContexts, unhealthyContexts } = globalHealth;
  const healthPercentage = totalContexts > 0 ? (healthyContexts / totalContexts) * 100 : 100;

  return (
    <div className={className} style={style}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* 健康状态指示器 */}
        <div style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: unhealthyContexts === 0 ? '#52c41a' : unhealthyContexts < totalContexts / 2 ? '#faad14' : '#ff4d4f'
        }} />
        
        {/* 状态文本 */}
        <span style={{ fontSize: '14px' }}>
          上下文健康度: {healthyContexts}/{totalContexts} ({healthPercentage.toFixed(1)}%)
        </span>
        
        {/* 详细信息 */}
        {showDetails && totalContexts > 0 && (
          <div style={{ marginLeft: '12px', fontSize: '12px', color: '#666' }}>
            {unhealthyContexts > 0 && (
              <span style={{ color: '#ff4d4f' }}>
                {unhealthyContexts} 个上下文存在问题
              </span>
            )}
          </div>
        )}
      </div>
      
      {/* 详细健康状态列表 */}
      {showDetails && allHealth.length > 0 && (
        <div style={{ marginTop: '8px', fontSize: '12px' }}>
          {allHealth.map(health => (
            <div key={health.contextName} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '4px 0',
              borderBottom: '1px solid #f0f0f0'
            }}>
              <span>{health.contextName}</span>
              <span style={{
                color: health.isHealthy ? '#52c41a' : '#ff4d4f',
                fontWeight: 'bold'
              }}>
                {health.isHealthy ? '✓' : '✗'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContextValidationProvider;