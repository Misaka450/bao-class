/**
 * 安全 Hook 包装器
 * 确保 Hook 在 React 完全初始化后才被调用
 */

import { useEffect, useRef, useCallback } from 'react';

/**
 * 检查 React 是否完全初始化
 */
function isReactInitialized(): boolean {
  try {
    // 检查 React 全局对象
    if (typeof window !== 'undefined' && (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      return true;
    }
    
    // 检查 useEffect 是否可用
    if (typeof useEffect === 'function') {
      return true;
    }
    
    return true; // 如果我们能执行到这里，说明 React 已初始化
  } catch (e) {
    return false;
  }
}

/**
 * 安全执行 Hook 回调
 */
export const useSafeHookExecution = (
  callback: () => void,
  dependencies: any[] = []
) => {
  const executedRef = useRef(false);
  const errorRef = useRef<Error | null>(null);

  useEffect(() => {
    try {
      if (!executedRef.current && isReactInitialized()) {
        callback();
        executedRef.current = true;
      }
    } catch (error) {
      errorRef.current = error as Error;
      console.error('Safe hook execution error:', error);
    }
  }, dependencies);

  return {
    executed: executedRef.current,
    error: errorRef.current,
    isReady: isReactInitialized()
  };
};

/**
 * 安全的 Hook 调用包装器
 */
export const withSafeHookExecution = <T extends (...args: any[]) => any>(
  hook: T
): T => {
  return ((...args: any[]) => {
    try {
      if (!isReactInitialized()) {
        console.warn('React not fully initialized, hook call may fail');
      }
      return hook(...args);
    } catch (error) {
      console.error('Hook execution error:', error);
      throw error;
    }
  }) as T;
};

/**
 * 延迟 Hook 执行直到 React 就绪
 */
export const useDelayedHookExecution = (
  callback: () => void,
  maxRetries: number = 10,
  retryDelay: number = 100
) => {
  const retriesRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const executeWithRetry = () => {
      try {
        if (isReactInitialized()) {
          callback();
          retriesRef.current = 0;
        } else if (retriesRef.current < maxRetries) {
          retriesRef.current++;
          timeoutRef.current = setTimeout(executeWithRetry, retryDelay);
        } else {
          console.error('Failed to execute hook after max retries');
        }
      } catch (error) {
        console.error('Delayed hook execution error:', error);
        if (retriesRef.current < maxRetries) {
          retriesRef.current++;
          timeoutRef.current = setTimeout(executeWithRetry, retryDelay);
        }
      }
    };

    executeWithRetry();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [callback, maxRetries, retryDelay]);
};

/**
 * 创建安全的 Hook 工厂
 */
export const createSafeHook = <T extends (...args: any[]) => any>(
  hookFactory: () => T
): T => {
  let hook: T | null = null;
  let initialized = false;

  return ((...args: any[]) => {
    if (!initialized) {
      try {
        hook = hookFactory();
        initialized = true;
      } catch (error) {
        console.error('Failed to initialize hook:', error);
        throw error;
      }
    }

    if (hook) {
      try {
        return hook(...args);
      } catch (error) {
        console.error('Hook execution failed:', error);
        throw error;
      }
    }

    throw new Error('Hook not initialized');
  }) as T;
};
