/**
 * React 上下文验证 Hook
 * 提供上下文验证和监控的 React Hook 接口
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { 
  ReactContextValidator, 
  ContextValidationResult, 
  ContextHealthStatus,
  ContextMonitorConfig 
} from '../utils/contextValidator';

// Hook 配置接口
export interface UseContextValidatorConfig extends Partial<ContextMonitorConfig> {
  autoValidate?: boolean;
  validationTriggers?: ('mount' | 'update' | 'unmount')[];
  onValidationResult?: (result: ContextValidationResult) => void;
  onHealthChange?: (health: ContextHealthStatus) => void;
}

// Hook 返回值接口
export interface UseContextValidatorReturn {
  validator: ReactContextValidator;
  isValidating: boolean;
  lastValidation: ContextValidationResult | null;
  health: ContextHealthStatus | null;
  stats: ReturnType<ReactContextValidator['getValidationStats']>;
  validateContext: <T>(
    contextName: string,
    contextValue?: T,
    customValidation?: (value: T) => Partial<ContextValidationResult>
  ) => ContextValidationResult;
  registerContext: <T>(
    contextName: string,
    context: React.Context<T>,
    options?: { enableMonitoring?: boolean }
  ) => void;
  ensureStability: <T>(
    contextName: string,
    contextValue: T,
    options?: {
      retryCount?: number;
      retryDelay?: number;
      onStabilityRestored?: () => void;
    }
  ) => Promise<boolean>;
  getHealth: (contextName: string) => ContextHealthStatus | null;
  getAllHealth: () => ContextHealthStatus[];
  reset: () => void;
}

/**
 * 上下文验证 Hook
 */
export function useContextValidator(config: UseContextValidatorConfig = {}): UseContextValidatorReturn {
  const [validator] = useState(() => ReactContextValidator.getInstance(config));
  const [isValidating, setIsValidating] = useState(false);
  const [lastValidation, setLastValidation] = useState<ContextValidationResult | null>(null);
  const [health, setHealth] = useState<ContextHealthStatus | null>(null);
  const [stats, setStats] = useState(() => validator.getValidationStats());
  
  const configRef = useRef(config);
  configRef.current = config;

  // 更新统计信息
  const updateStats = useCallback(() => {
    setStats(validator.getValidationStats());
  }, [validator]);

  // 验证上下文
  const validateContext = useCallback(<T>(
    contextName: string,
    contextValue?: T,
    customValidation?: (value: T) => Partial<ContextValidationResult>
  ): ContextValidationResult => {
    setIsValidating(true);
    
    try {
      const result = validator.validateContext(contextName, contextValue, customValidation);
      setLastValidation(result);
      
      // 触发回调
      if (configRef.current.onValidationResult) {
        configRef.current.onValidationResult(result);
      }
      
      // 更新健康状态
      const newHealth = validator.getContextHealth(contextName);
      if (newHealth) {
        setHealth(newHealth);
        
        // 触发健康状态变化回调
        if (configRef.current.onHealthChange) {
          configRef.current.onHealthChange(newHealth);
        }
      }
      
      updateStats();
      return result;
      
    } finally {
      setIsValidating(false);
    }
  }, [validator, updateStats]);

  // 注册上下文
  const registerContext = useCallback(<T>(
    contextName: string,
    context: React.Context<T>,
    options: { enableMonitoring?: boolean } = {}
  ) => {
    validator.registerContext(contextName, context, {
      enableMonitoring: options.enableMonitoring ?? configRef.current.autoValidate
    });
    updateStats();
  }, [validator, updateStats]);

  // 确保稳定性
  const ensureStability = useCallback(<T>(
    contextName: string,
    contextValue: T,
    options: {
      retryCount?: number;
      retryDelay?: number;
      onStabilityRestored?: () => void;
    } = {}
  ): Promise<boolean> => {
    return validator.ensureContextStability(contextName, contextValue, options);
  }, [validator]);

  // 获取健康状态
  const getHealth = useCallback((contextName: string): ContextHealthStatus | null => {
    return validator.getContextHealth(contextName);
  }, [validator]);

  // 获取所有健康状态
  const getAllHealth = useCallback((): ContextHealthStatus[] => {
    return validator.getAllContextsHealth();
  }, [validator]);

  // 重置验证器
  const reset = useCallback(() => {
    validator.reset();
    setLastValidation(null);
    setHealth(null);
    updateStats();
  }, [validator, updateStats]);

  // 定期更新统计信息
  useEffect(() => {
    const interval = setInterval(updateStats, 5000); // 每5秒更新一次
    return () => clearInterval(interval);
  }, [updateStats]);

  return {
    validator,
    isValidating,
    lastValidation,
    health,
    stats,
    validateContext,
    registerContext,
    ensureStability,
    getHealth,
    getAllHealth,
    reset
  };
}

/**
 * 特定上下文验证 Hook
 */
export function useSpecificContextValidator<T>(
  contextName: string,
  context: React.Context<T>,
  contextValue?: T,
  config: UseContextValidatorConfig & {
    customValidation?: (value: T) => Partial<ContextValidationResult>;
  } = {}
): {
  isValid: boolean;
  isValidating: boolean;
  validation: ContextValidationResult | null;
  health: ContextHealthStatus | null;
  validate: () => ContextValidationResult;
  ensureStability: () => Promise<boolean>;
} {
  const { 
    validateContext, 
    registerContext, 
    ensureStability: ensureStabilityGeneric,
    getHealth,
    isValidating 
  } = useContextValidator(config);
  
  const [validation, setValidation] = useState<ContextValidationResult | null>(null);
  const [health, setHealth] = useState<ContextHealthStatus | null>(null);

  // 注册上下文（仅在组件挂载时执行一次）
  useEffect(() => {
    registerContext(contextName, context, {
      enableMonitoring: config.autoValidate
    });
  }, [contextName, context, registerContext, config.autoValidate]);

  // 验证函数
  const validate = useCallback((): ContextValidationResult => {
    const result = validateContext(contextName, contextValue, config.customValidation);
    setValidation(result);
    
    const newHealth = getHealth(contextName);
    setHealth(newHealth);
    
    return result;
  }, [contextName, contextValue, validateContext, config.customValidation, getHealth]);

  // 确保稳定性
  const ensureStability = useCallback((): Promise<boolean> => {
    if (contextValue === undefined) {
      return Promise.resolve(false);
    }
    return ensureStabilityGeneric(contextName, contextValue);
  }, [contextName, contextValue, ensureStabilityGeneric]);

  // 自动验证
  useEffect(() => {
    if (config.autoValidate) {
      const triggers = config.validationTriggers || ['mount', 'update'];
      
      if (triggers.includes('mount') || triggers.includes('update')) {
        validate();
      }
    }
  }, [config.autoValidate, config.validationTriggers, validate, contextValue]);

  // 组件卸载时的验证
  useEffect(() => {
    return () => {
      if (config.autoValidate && config.validationTriggers?.includes('unmount')) {
        validate();
      }
    };
  }, [config.autoValidate, config.validationTriggers, validate]);

  return {
    isValid: validation?.isValid ?? false,
    isValidating,
    validation,
    health,
    validate,
    ensureStability
  };
}

/**
 * 上下文健康监控 Hook
 */
export function useContextHealthMonitor(
  contextNames: string[] = [],
  config: {
    refreshInterval?: number;
    onHealthChange?: (contextName: string, health: ContextHealthStatus) => void;
  } = {}
): {
  allHealth: ContextHealthStatus[];
  healthyCount: number;
  unhealthyCount: number;
  isMonitoring: boolean;
  refresh: () => void;
} {
  const { getAllHealth, getHealth } = useContextValidator();
  const [allHealth, setAllHealth] = useState<ContextHealthStatus[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  const configRef = useRef(config);
  configRef.current = config;

  // 刷新健康状态
  const refresh = useCallback(() => {
    setIsMonitoring(true);
    
    try {
      let healthStatuses: ContextHealthStatus[];
      
      if (contextNames.length > 0) {
        // 监控指定的上下文
        healthStatuses = contextNames
          .map(name => getHealth(name))
          .filter((health): health is ContextHealthStatus => health !== null);
      } else {
        // 监控所有上下文
        healthStatuses = getAllHealth();
      }
      
      setAllHealth(healthStatuses);
      
      // 触发健康状态变化回调
      if (configRef.current.onHealthChange) {
        healthStatuses.forEach(health => {
          configRef.current.onHealthChange?.(health.contextName, health);
        });
      }
      
    } finally {
      setIsMonitoring(false);
    }
  }, [contextNames, getHealth, getAllHealth]);

  // 定期刷新
  useEffect(() => {
    const interval = config.refreshInterval || 10000; // 默认10秒
    
    // 立即刷新一次
    refresh();
    
    // 设置定期刷新
    const timer = setInterval(refresh, interval);
    
    return () => clearInterval(timer);
  }, [refresh, config.refreshInterval]);

  // 计算健康和不健康的上下文数量
  const healthyCount = allHealth.filter(health => health.isHealthy).length;
  const unhealthyCount = allHealth.length - healthyCount;

  return {
    allHealth,
    healthyCount,
    unhealthyCount,
    isMonitoring,
    refresh
  };
}

/**
 * 上下文稳定性 Hook
 */
export function useContextStability<T>(
  contextName: string,
  context: React.Context<T>,
  contextValue: T,
  config: {
    autoEnsure?: boolean;
    retryCount?: number;
    retryDelay?: number;
    onStabilityRestored?: () => void;
    onStabilityLost?: () => void;
  } = {}
): {
  isStable: boolean;
  isEnsuring: boolean;
  lastCheck: number;
  ensureStability: () => Promise<boolean>;
} {
  const { registerContext, ensureStability: ensureStabilityGeneric, getHealth } = useContextValidator();
  const [isStable, setIsStable] = useState(true);
  const [isEnsuring, setIsEnsuring] = useState(false);
  const [lastCheck, setLastCheck] = useState(Date.now());
  
  const configRef = useRef(config);
  configRef.current = config;

  // 注册上下文
  useEffect(() => {
    registerContext(contextName, context, { enableMonitoring: true });
  }, [contextName, context, registerContext]);

  // 确保稳定性
  const ensureStability = useCallback(async (): Promise<boolean> => {
    setIsEnsuring(true);
    
    try {
      const result = await ensureStabilityGeneric(contextName, contextValue, {
        retryCount: configRef.current.retryCount,
        retryDelay: configRef.current.retryDelay,
        onStabilityRestored: configRef.current.onStabilityRestored
      });
      
      setIsStable(result);
      setLastCheck(Date.now());
      
      return result;
      
    } finally {
      setIsEnsuring(false);
    }
  }, [contextName, contextValue, ensureStabilityGeneric]);

  // 监控稳定性变化
  useEffect(() => {
    const checkStability = () => {
      const health = getHealth(contextName);
      const newIsStable = health?.isHealthy ?? true;
      
      if (newIsStable !== isStable) {
        setIsStable(newIsStable);
        setLastCheck(Date.now());
        
        if (!newIsStable && configRef.current.onStabilityLost) {
          configRef.current.onStabilityLost();
        }
      }
    };

    // 定期检查稳定性
    const interval = setInterval(checkStability, 5000);
    
    // 立即检查一次
    checkStability();
    
    return () => clearInterval(interval);
  }, [contextName, getHealth, isStable]);

  // 自动确保稳定性
  useEffect(() => {
    if (config.autoEnsure && !isStable && !isEnsuring) {
      ensureStability();
    }
  }, [config.autoEnsure, isStable, isEnsuring, ensureStability]);

  return {
    isStable,
    isEnsuring,
    lastCheck,
    ensureStability
  };
}