/**
 * React 初始化错误边界
 * 专门处理 React 初始化过程中的错误
 */

import React, { Component, ReactNode, ErrorInfo } from 'react';

// 错误类型枚举
export enum ReactInitErrorType {
  HOOK_CONTEXT_ERROR = 'hook_context_error',
  INITIALIZATION_ERROR = 'initialization_error',
  MODULE_LOADING_ERROR = 'module_loading_error',
  RENDER_ERROR = 'render_error',
  UNKNOWN_ERROR = 'unknown_error'
}

// 错误信息接口
export interface ReactInitError {
  type: ReactInitErrorType;
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: number;
  userAgent: string;
  url: string;
  additionalInfo?: Record<string, any>;
}

// 错误边界状态
interface ErrorBoundaryState {
  hasError: boolean;
  error: ReactInitError | null;
  errorId: string | null;
  retryCount: number;
  isRecovering: boolean;
}

// 错误边界属性
interface ReactInitializationErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: ReactInitError, retry: () => void) => ReactNode;
  onError?: (error: ReactInitError, errorInfo: ErrorInfo) => void;
  maxRetries?: number;
  enableAutoRecovery?: boolean;
  recoveryDelay?: number;
}

/**
 * React 初始化错误边界组件
 */
export class ReactInitializationErrorBoundary extends Component<
  ReactInitializationErrorBoundaryProps,
  ErrorBoundaryState
> {
  private retryTimer: NodeJS.Timeout | null = null;

  constructor(props: ReactInitializationErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
      retryCount: 0,
      isRecovering: false
    };
  }

  /**
   * 捕获错误并更新状态
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `react_init_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const reactInitError: ReactInitError = {
      type: ReactInitializationErrorBoundary.classifyError(error),
      message: error.message,
      stack: error.stack,
      timestamp: Date.now(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    };

    return {
      hasError: true,
      error: reactInitError,
      errorId
    };
  }

  /**
   * 分类错误类型
   */
  private static classifyError(error: Error): ReactInitErrorType {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    // React Hook 相关错误
    if (message.includes('useeffect') || 
        message.includes('usestate') || 
        message.includes('usecontext') ||
        message.includes('hook') ||
        stack.includes('hook')) {
      return ReactInitErrorType.HOOK_CONTEXT_ERROR;
    }

    // 初始化相关错误
    if (message.includes('initialization') || 
        message.includes('init') ||
        message.includes('before initialization')) {
      return ReactInitErrorType.INITIALIZATION_ERROR;
    }

    // 模块加载相关错误
    if (message.includes('module') || 
        message.includes('import') ||
        message.includes('loading') ||
        stack.includes('moduleloader')) {
      return ReactInitErrorType.MODULE_LOADING_ERROR;
    }

    // 渲染相关错误
    if (message.includes('render') || 
        message.includes('component') ||
        stack.includes('render')) {
      return ReactInitErrorType.RENDER_ERROR;
    }

    return ReactInitErrorType.UNKNOWN_ERROR;
  }

  /**
   * 处理错误信息
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { onError } = this.props;
    
    if (this.state.error) {
      // 添加组件堆栈信息
      const enhancedError: ReactInitError = {
        ...this.state.error,
        componentStack: errorInfo.componentStack,
        additionalInfo: {
          errorBoundary: 'ReactInitializationErrorBoundary',
          retryCount: this.state.retryCount,
          ...this.gatherEnvironmentInfo()
        }
      };

      this.setState({ error: enhancedError });

      // 调用错误回调
      onError?.(enhancedError, errorInfo);

      // 记录错误到控制台
      this.logError(enhancedError, errorInfo);

      // 自动恢复机制
      if (this.props.enableAutoRecovery) {
        this.scheduleAutoRecovery();
      }
    }
  }

  /**
   * 收集环境信息
   */
  private gatherEnvironmentInfo(): Record<string, any> {
    const info: Record<string, any> = {};

    try {
      // 浏览器信息
      if (typeof window !== 'undefined') {
        info.windowSize = {
          width: window.innerWidth,
          height: window.innerHeight
        };
        info.url = window.location.href;
        info.referrer = document.referrer;
      }

      // React 信息
      if (typeof React !== 'undefined') {
        info.reactVersion = React.version;
      }

      // 性能信息
      if (typeof performance !== 'undefined') {
        info.performanceNow = performance.now();
        if (performance.memory) {
          info.memoryUsage = {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit
          };
        }
      }

      // 时间信息
      info.timestamp = new Date().toISOString();
      info.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    } catch (error) {
      info.gatherError = error instanceof Error ? error.message : String(error);
    }

    return info;
  }

  /**
   * 记录错误信息
   */
  private logError(error: ReactInitError, errorInfo: ErrorInfo): void {
    console.group(`🚨 React 初始化错误 [${error.type}]`);
    console.error('错误信息:', error.message);
    console.error('错误类型:', error.type);
    console.error('错误ID:', this.state.errorId);
    console.error('重试次数:', this.state.retryCount);
    
    if (error.stack) {
      console.error('错误堆栈:', error.stack);
    }
    
    if (error.componentStack) {
      console.error('组件堆栈:', error.componentStack);
    }
    
    if (error.additionalInfo) {
      console.error('附加信息:', error.additionalInfo);
    }
    
    console.groupEnd();

    // 发送错误报告（如果配置了错误报告服务）
    this.sendErrorReport(error, errorInfo);
  }

  /**
   * 发送错误报告
   */
  private sendErrorReport(error: ReactInitError, errorInfo: ErrorInfo): void {
    // 这里可以集成错误报告服务，如 Sentry、LogRocket 等
    try {
      // 示例：发送到错误报告服务
      if (typeof window !== 'undefined' && (window as any).errorReportingService) {
        (window as any).errorReportingService.captureException(error, {
          tags: {
            errorBoundary: 'ReactInitializationErrorBoundary',
            errorType: error.type
          },
          extra: {
            componentStack: errorInfo.componentStack,
            additionalInfo: error.additionalInfo
          }
        });
      }
    } catch (reportError) {
      console.warn('错误报告发送失败:', reportError);
    }
  }

  /**
   * 安排自动恢复
   */
  private scheduleAutoRecovery(): void {
    const { maxRetries = 3, recoveryDelay = 2000 } = this.props;
    
    if (this.state.retryCount < maxRetries) {
      this.setState({ isRecovering: true });
      
      this.retryTimer = setTimeout(() => {
        this.handleRetry();
      }, recoveryDelay);
    }
  }

  /**
   * 处理重试
   */
  private handleRetry = (): void => {
    const { maxRetries = 3 } = this.props;
    
    if (this.state.retryCount < maxRetries) {
      console.log(`🔄 尝试自动恢复 (${this.state.retryCount + 1}/${maxRetries})`);
      
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorId: null,
        retryCount: prevState.retryCount + 1,
        isRecovering: false
      }));
    } else {
      console.log('❌ 已达到最大重试次数，停止自动恢复');
      this.setState({ isRecovering: false });
    }
  };

  /**
   * 手动重试
   */
  private handleManualRetry = (): void => {
    console.log('🔄 手动重试恢复');
    
    this.setState({
      hasError: false,
      error: null,
      errorId: null,
      retryCount: 0,
      isRecovering: false
    });
  };

  /**
   * 清理定时器
   */
  componentWillUnmount(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
  }

  /**
   * 渲染错误界面
   */
  private renderErrorFallback(): ReactNode {
    const { fallback } = this.props;
    const { error, retryCount, isRecovering } = this.state;
    
    if (!error) return null;

    // 如果提供了自定义错误界面
    if (fallback) {
      return fallback(error, this.handleManualRetry);
    }

    // 默认错误界面
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{
          maxWidth: '600px',
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          border: '1px solid #ff4d4f'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <span style={{ fontSize: '24px', marginRight: '12px' }}>💥</span>
            <h2 style={{ margin: 0, color: '#ff4d4f' }}>React 初始化错误</h2>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <p><strong>错误类型：</strong>{this.getErrorTypeDescription(error.type)}</p>
            <p><strong>错误信息：</strong>{error.message}</p>
            <p><strong>错误ID：</strong>{this.state.errorId}</p>
            {retryCount > 0 && (
              <p><strong>重试次数：</strong>{retryCount}</p>
            )}
          </div>

          {isRecovering && (
            <div style={{
              padding: '12px',
              backgroundColor: '#e6f7ff',
              border: '1px solid #91d5ff',
              borderRadius: '4px',
              marginBottom: '16px'
            }}>
              <p style={{ margin: 0, color: '#1890ff' }}>
                🔄 正在尝试自动恢复...
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={this.handleManualRetry}
              disabled={isRecovering}
              style={{
                backgroundColor: '#1890ff',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: isRecovering ? 'not-allowed' : 'pointer',
                opacity: isRecovering ? 0.6 : 1
              }}
            >
              {isRecovering ? '恢复中...' : '重试'}
            </button>

            <button
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: '#f5f5f5',
                color: '#333',
                border: '1px solid #d9d9d9',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              刷新页面
            </button>

            <button
              onClick={() => {
                console.log('详细错误信息:', error);
                alert('详细错误信息已输出到控制台');
              }}
              style={{
                backgroundColor: 'transparent',
                color: '#666',
                border: '1px solid #d9d9d9',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              查看详情
            </button>
          </div>
        </div>
      </div>
    );
  }

  /**
   * 获取错误类型描述
   */
  private getErrorTypeDescription(type: ReactInitErrorType): string {
    switch (type) {
      case ReactInitErrorType.HOOK_CONTEXT_ERROR:
        return 'React Hook 上下文错误';
      case ReactInitErrorType.INITIALIZATION_ERROR:
        return 'React 初始化错误';
      case ReactInitErrorType.MODULE_LOADING_ERROR:
        return '模块加载错误';
      case ReactInitErrorType.RENDER_ERROR:
        return '组件渲染错误';
      case ReactInitErrorType.UNKNOWN_ERROR:
      default:
        return '未知错误';
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.renderErrorFallback();
    }

    return this.props.children;
  }
}

export default ReactInitializationErrorBoundary;