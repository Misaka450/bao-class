/**
 * React 初始化守护组件
 * 确保 React 完全初始化后再渲染子组件
 */

import React, { useState, useEffect, ReactNode } from 'react';
import { ReactReadinessDetector, ReactValidationResult } from '../../utils/reactGuard';

interface ReactInitializationGuardProps {
  children: ReactNode;
  timeout?: number;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
  onInitialized?: () => void;
}

interface GuardState {
  isReady: boolean;
  isLoading: boolean;
  error: Error | null;
  validationResult: ReactValidationResult | null;
  retryCount: number;
}

/**
 * React 初始化守护组件
 */
export const ReactInitializationGuard: React.FC<ReactInitializationGuardProps> = ({
  children,
  timeout = 10000,
  fallback,
  onError,
  onInitialized
}) => {
  const [state, setState] = useState<GuardState>({
    isReady: false,
    isLoading: true,
    error: null,
    validationResult: null,
    retryCount: 0
  });

  const detector = ReactReadinessDetector.getInstance();

  /**
   * 初始化 React
   */
  const initializeReact = async () => {
    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null
      }));

      // 等待 React 就绪
      await detector.waitForReact(timeout);

      // 验证环境
      const validation = detector.validateReactEnvironment();

      if (validation.isValid) {
        setState(prev => ({
          ...prev,
          isReady: true,
          isLoading: false,
          validationResult: validation
        }));

        onInitialized?.();

        // 输出警告信息（如果有）
        if (validation.warnings.length > 0) {
          console.warn('React 初始化警告:', validation.warnings);
        }
      } else {
        throw new Error(`React 环境验证失败: ${validation.errors.join(', ')}`);
      }

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err,
        validationResult: detector.validateReactEnvironment()
      }));

      onError?.(err);
      console.error('React 初始化失败:', err);
    }
  };

  /**
   * 重试初始化
   */
  const retryInitialization = () => {
    setState(prev => ({
      ...prev,
      retryCount: prev.retryCount + 1
    }));

    // 重置检测器状态
    detector.reset();

    // 重新初始化
    initializeReact();
  };

  // 组件挂载时开始初始化
  useEffect(() => {
    initializeReact();
  }, [state.retryCount]);

  // 如果正在加载，显示加载状态
  if (state.isLoading) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        padding: '20px',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #1890ff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>正在初始化应用...</h3>
          <p style={{ margin: 0, color: '#666' }}>请稍候，系统正在准备 React 环境</p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // 如果有错误，显示错误信息和重试选项
  if (state.error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        padding: '20px',
        maxWidth: '600px',
        margin: '0 auto',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{
          border: '1px solid #ff4d4f',
          borderRadius: '6px',
          padding: '16px',
          backgroundColor: '#fff2f0',
          width: '100%'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <span style={{
              color: '#ff4d4f',
              fontSize: '16px',
              marginRight: '8px'
            }}>⚠️</span>
            <h3 style={{ margin: 0, color: '#ff4d4f' }}>应用初始化失败</h3>
          </div>

          <div>
            <p><strong>错误信息：</strong>{state.error.message}</p>

            {state.validationResult && (
              <>
                {state.validationResult.errors.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <strong>详细错误：</strong>
                    <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                      {state.validationResult.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {state.validationResult.recommendations.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <strong>建议解决方案：</strong>
                    <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                      {state.validationResult.recommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            <div style={{ marginTop: '16px' }}>
              <button
                onClick={retryInitialization}
                style={{
                  backgroundColor: '#1890ff',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  marginRight: '8px',
                  cursor: 'pointer'
                }}
              >
                重试 ({state.retryCount > 0 ? `第 ${state.retryCount + 1} 次` : '首次'})
              </button>

              <button
                onClick={() => window.location.reload()}
                style={{
                  backgroundColor: '#f5f5f5',
                  color: '#333',
                  border: '1px solid #d9d9d9',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                刷新页面
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // React 已就绪，渲染子组件
  return <>{children}</>;
};

export default ReactInitializationGuard;