import React from 'react';

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * 懒加载错误边界
 * 捕获动态导入失败并提供重新加载选项
 */
export class LazyLoadErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        // 检查是否是懒加载失败错误
        if (
            error.message.includes('Failed to fetch dynamically imported module') ||
            error.message.includes('Failed to fetch') ||
            error.message.includes('Loading chunk')
        ) {
            return { hasError: true, error };
        }
        // 其他错误继续抛出
        throw error;
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('LazyLoad Error:', error, errorInfo);
    }

    handleReload = () => {
        // 清除错误状态并刷新页面
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '400px',
                    padding: '40px',
                    textAlign: 'center'
                }}>
                    <div style={{
                        fontSize: '48px',
                        marginBottom: '16px'
                    }}>
                        ⚠️
                    </div>
                    <h2 style={{ marginBottom: '8px', color: '#333' }}>页面加载失败</h2>
                    <p style={{ color: '#666', marginBottom: '24px' }}>
                        可能是网络问题或页面已更新，请刷新页面重试
                    </p>
                    <button
                        onClick={this.handleReload}
                        style={{
                            padding: '10px 24px',
                            fontSize: '16px',
                            backgroundColor: '#1890ff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            transition: 'background-color 0.3s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#40a9ff';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#1890ff';
                        }}
                    >
                        刷新页面
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default LazyLoadErrorBoundary;
