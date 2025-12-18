import { useState, useCallback, useRef, useEffect } from 'react';

export interface LoadingState {
  loading: boolean;
  error: Error | null;
  data: any;
}

export interface UseLoadingOptions {
  initialLoading?: boolean;
  minLoadingTime?: number; // 最小加载时间，避免闪烁
  onError?: (error: Error) => void;
  onSuccess?: (data: any) => void;
}

/**
 * 统一的加载状态管理 Hook
 * 提供一致的加载状态处理和用户体验优化
 */
export const useLoading = (options: UseLoadingOptions = {}) => {
  const {
    initialLoading = false,
    minLoadingTime = 300,
    onError,
    onSuccess,
  } = options;

  const [state, setState] = useState<LoadingState>({
    loading: initialLoading,
    error: null,
    data: null,
  });

  const loadingStartTime = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setLoading = useCallback((loading: boolean) => {
    if (loading) {
      loadingStartTime.current = Date.now();
      setState(prev => ({ ...prev, loading: true, error: null }));
    } else {
      const elapsed = loadingStartTime.current ? Date.now() - loadingStartTime.current : 0;
      const remainingTime = Math.max(0, minLoadingTime - elapsed);

      if (remainingTime > 0) {
        timeoutRef.current = setTimeout(() => {
          setState(prev => ({ ...prev, loading: false }));
        }, remainingTime);
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
    }
  }, [minLoadingTime]);

  const setError = useCallback((error: Error | null) => {
    setState(prev => ({ ...prev, error, loading: false }));
    if (error && onError) {
      onError(error);
    }
  }, [onError]);

  const setData = useCallback((data: any) => {
    setState(prev => ({ ...prev, data, loading: false, error: null }));
    if (onSuccess) {
      onSuccess(data);
    }
  }, [onSuccess]);

  const reset = useCallback(() => {
    setState({ loading: false, error: null, data: null });
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const executeAsync = useCallback(async <T>(
    asyncFn: () => Promise<T>
  ): Promise<T | null> => {
    try {
      setLoading(true);
      const result = await asyncFn();
      setData(result);
      return result;
    } catch (error) {
      setError(error as Error);
      return null;
    }
  }, [setLoading, setData, setError]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    setLoading,
    setError,
    setData,
    reset,
    executeAsync,
  };
};

/**
 * 简化版本的加载状态 Hook
 * 只管理 loading 状态，适用于简单场景
 */
export const useSimpleLoading = (initialLoading = false) => {
  const [loading, setLoading] = useState(initialLoading);

  const withLoading = useCallback(async <T>(
    asyncFn: () => Promise<T>
  ): Promise<T | null> => {
    try {
      setLoading(true);
      const result = await asyncFn();
      return result;
    } catch (error) {
      console.error('Loading error:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    setLoading,
    withLoading,
  };
};

export default useLoading;