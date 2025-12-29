/**
 * React 就绪状态 Hook
 * 提供 React 初始化状态的响应式访问
 */

import { useState, useEffect, useCallback } from 'react';
import { ReactReadinessDetector, ReactInitializationState, ReactValidationResult } from '../utils/reactGuard';

interface UseReactReadyOptions {
  autoInitialize?: boolean;
  timeout?: number;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

interface UseReactReadyReturn {
  isReady: boolean;
  isLoading: boolean;
  error: Error | null;
  initializationState: ReactInitializationState;
  validationResult: ReactValidationResult | null;
  initialize: () => Promise<void>;
  reset: () => void;
  validate: () => ReactValidationResult;
}

/**
 * 使用 React 就绪状态的 Hook
 */
export function useReactReady(options: UseReactReadyOptions = {}): UseReactReadyReturn {
  const {
    autoInitialize = true,
    timeout = 5000,
    onReady,
    onError
  } = options;

  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [validationResult, setValidationResult] = useState<ReactValidationResult | null>(null);

  const detector = ReactReadinessDetector.getInstance();

  /**
   * 初始化 React
   */
  const initialize = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 等待 React 就绪
      await detector.waitForReact(timeout);
      
      // 验证环境
      const validation = detector.validateReactEnvironment();
      setValidationResult(validation);
      
      if (validation.isValid) {
        setIsReady(true);
        onReady?.();
      } else {
        throw new Error(`React 环境验证失败: ${validation.errors.join(', ')}`);
      }
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [timeout, onReady, onError]);

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    setIsReady(false);
    setIsLoading(false);
    setError(null);
    setValidationResult(null);
    detector.reset();
  }, []);

  /**
   * 验证 React 环境
   */
  const validate = useCallback(() => {
    const result = detector.validateReactEnvironment();
    setValidationResult(result);
    return result;
  }, []);

  // 自动初始化
  useEffect(() => {
    if (autoInitialize && !isReady && !isLoading && !error) {
      initialize();
    }
  }, [autoInitialize, isReady, isLoading, error, initialize]);

  return {
    isReady,
    isLoading,
    error,
    initializationState: detector.getInitializationState(),
    validationResult,
    initialize,
    reset,
    validate
  };
}

/**
 * 简化版本的 Hook，只返回就绪状态
 */
export function useIsReactReady(): boolean {
  const { isReady } = useReactReady({ autoInitialize: true });
  return isReady;
}

/**
 * 等待 React 就绪的 Hook
 */
export function useWaitForReact(timeout?: number): {
  isReady: boolean;
  error: Error | null;
} {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const detector = ReactReadinessDetector.getInstance();
    
    detector.waitForReact(timeout)
      .then(() => setIsReady(true))
      .catch(setError);
  }, [timeout]);

  return { isReady, error };
}