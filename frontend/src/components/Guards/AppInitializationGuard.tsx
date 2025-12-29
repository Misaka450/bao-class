/**
 * 应用初始化守护组件
 * 集成 React 初始化、模块加载控制和上下文验证
 */

import React, { ReactNode } from 'react';
import { useModuleOrchestrator, useAppLoadingProgress } from '../../hooks/useModuleOrchestrator';
import { OrchestratorStatus, OrchestratorConfig } from '../../utils/moduleOrchestrator';
import { ContextValidationProvider, ContextValidationStatus } from './ContextValidationProvider';
import { ContextMonitorConfig } from '../../utils/contextValidator';

interface AppInitializationGuardProps {
  children: ReactNode;
  config?: OrchestratorConfig;
  contextConfig?: ContextMonitorConfig;
  fallback?: ReactNode;
  onReady?: () => void;
  onError?: (error: Error) => void;
  onContextValidationError?: (contextName: string, error: Error) => void;
  showProgress?: boolean;
  enableContextValidation?: boolean;
}

/**
 * 应用初始化守护组件
 */
export const AppInitializationGuard: React.FC<AppInitializationGuardProps> = ({
  children,
  config,
  contextConfig,
  fallback,
  onReady,
  onError,
  onContextValidationError,
  showProgress = true,
  enableContextValidation = true
}) => {
  const { state, isReady, isLoading, error, initialize, reset } = useModuleOrchestrator({
    autoInitialize: true,
    config,
    onReady,
    onError
  });

  const { progress, stage } = useAppLoadingProgress();

  /**
   * 重试初始化
   */
  const retryInitialization = () => {
    reset();
    initialize();
  };

  // 如果正在加载，显示加载状态
  if (isLoading) {
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
        {/* 加载动画 */}
        <div style={{
          width: '60px',
          height: '60px',
          border: '6px solid #f3f3f3',
          borderTop: '6px solid #1890ff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />

        {/* 加载信息 */}
        <div style={{ marginTop: '24px', textAlign: 'center', maxWidth: '400px' }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#333' }}>正在初始化应用</h3>
          <p style={{ margin: '0 0 16px 0', color: '#666' }}>{stage}</p>

          {/* 进度条 */}
          {showProgress && (
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#f0f0f0',
              borderRadius: '4px',
              overflow: 'hidden',
              marginBottom: '12px'
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: '#1890ff',
                transition: 'width 0.3s ease',
                borderRadius: '4px'
              }} />
            </div>
          )}

          {/* 详细状态 */}
          <div style={{ fontSize: '12px', color: '#999' }}>
            {state.reactReady ? '✓ React 已就绪' : '○ React 初始化中...'}
            <br />
            {state.modulesReady ? '✓ 模块已加载' : '○ 模块加载中...'}
            <br />
            {enableContextValidation ? '○ 上下文验证准备中...' : ''}
          </div>
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
  if (error) {
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
          borderRadius: '8px',
          padding: '24px',
          backgroundColor: '#fff2f0',
          width: '100%'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <span style={{
              color: '#ff4d4f',
              fontSize: '24px',
              marginRight: '12px'
            }}>⚠️</span>
            <h3 style={{ margin: 0, color: '#ff4d4f' }}>应用初始化失败</h3>
          </div>

          <div>
            <p style={{ marginBottom: '16px' }}>
              <strong>错误信息：</strong>{error.message}
            </p>

            {/* 初始化状态信息 */}
            <div style={{
              backgroundColor: '#f8f8f8',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              <strong>初始化状态：</strong>
              <br />
              • React 状态: {state.reactReady ? '✓ 已就绪' : '✗ 未就绪'}
              <br />
              • 模块状态: {state.modulesReady ? '✓ 已加载' : '✗ 未加载'}
              <br />
              • 当前阶段: {stage}
              {state.totalTime > 0 && (
                <>
                  <br />
                  • 总耗时: {state.totalTime}ms
                </>
              )}
            </div>

            {/* 操作按钮 */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={retryInitialization}
                style={{
                  backgroundColor: '#1890ff',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                重试初始化
              </button>

              <button
                onClick={() => window.location.reload()}
                style={{
                  backgroundColor: '#f5f5f5',
                  color: '#333',
                  border: '1px solid #d9d9d9',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                刷新页面
              </button>

              <button
                onClick={() => {
                  console.log('详细状态:', state);
                  alert('详细状态信息已输出到控制台');
                }}
                style={{
                  backgroundColor: 'transparent',
                  color: '#666',
                  border: '1px solid #d9d9d9',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                查看详情
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 应用已就绪，渲染子组件
  if (isReady) {
    if (enableContextValidation) {
      return (
        <ContextValidationProvider
          config={contextConfig}
          onValidationError={onContextValidationError}
          enableGlobalMonitoring={true}
        >
          {children}
        </ContextValidationProvider>
      );
    }
    return <>{children}</>;
  }

  // 默认加载状态（不应该到达这里）
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh'
    }}>
      <p>应用准备中...</p>
    </div>
  );
};

export default AppInitializationGuard;