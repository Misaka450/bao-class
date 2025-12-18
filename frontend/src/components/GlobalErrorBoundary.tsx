/**
 * 全局错误边界
 * 捕获所有 React 错误，包括 Hook 错误
 */

import React, { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

export class GlobalErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('❌ Global error boundary caught error:', error);
    console.error('❌ Error info:', errorInfo);

    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // 记录错误到全局对象用于诊断
    if (!(window as any).__REACT_ERRORS__) {
      (window as any).__REACT_ERRORS__ = [];
    }
    (window as any).__REACT_ERRORS__.push({
      timestamp: Date.now(),
      error: error.toString(),
      errorInfo: errorInfo.componentStack,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          padding: '20px',
          fontFamily: 'Arial, sans-serif',
          backgroundColor: '#f5f5f5',
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            maxWidth: '600px',
            textAlign: 'center',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
            }}>
              <span style={{
                fontSize: '48px',
                marginRight: '16px',
              }}>⚠️</span>
              <h1 style={{
                margin: 0,
                color: '#ff4d4f',
                fontSize: '24px',
              }}>应用出错</h1>
            </div>

            <div style={{
              backgroundColor: '#fff2f0',
              border: '1px solid #ffccc7',
              borderRadius: '4px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'left',
            }}>
              <p style={{
                margin: '0 0 12px 0',
                fontWeight: 'bold',
                color: '#ff4d4f',
              }}>错误信息:</p>
              <p style={{
                margin: '0 0 12px 0',
                color: '#333',
                fontSize: '14px',
                wordBreak: 'break-all',
              }}>
                {this.state.error?.toString()}
              </p>

              {this.state.errorInfo && (
                <>
                  <p style={{
                    margin: '12px 0 8px 0',
                    fontWeight: 'bold',
                    color: '#ff4d4f',
                  }}>组件堆栈:</p>
                  <pre style={{
                    margin: 0,
                    padding: '8px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '4px',
                    fontSize: '12px',
                    overflow: 'auto',
                    maxHeight: '200px',
                    color: '#333',
                  }}>
                    {this.state.errorInfo.componentStack}
                  </pre>
                </>
              )}

              <p style={{
                margin: '12px 0 0 0',
                fontSize: '12px',
                color: '#999',
              }}>
                错误计数: {this.state.errorCount}
              </p>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}>
              <button
                onClick={this.handleReset}
                style={{
                  backgroundColor: '#1890ff',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                重试
              </button>

              <button
                onClick={() => window.location.reload()}
                style={{
                  backgroundColor: '#f5f5f5',
                  color: '#333',
                  border: '1px solid #d9d9d9',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                刷新页面
              </button>

              <button
                onClick={() => {
                  console.log('错误详情:', {
                    error: this.state.error,
                    errorInfo: this.state.errorInfo,
                    allErrors: (window as any).__REACT_ERRORS__,
                  });
                  alert('错误详情已输出到控制台');
                }}
                style={{
                  backgroundColor: 'transparent',
                  color: '#666',
                  border: '1px solid #d9d9d9',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                查看详情
              </button>
            </div>

            <p style={{
              marginTop: '20px',
              fontSize: '12px',
              color: '#999',
            }}>
              如果问题持续存在，请清除浏览器缓存并刷新页面。
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
