import { Component, type ReactNode } from 'react';
import { Result, Button } from 'antd';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: any) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '50px', textAlign: 'center' }}>
                    <Result
                        status="error"
                        title="页面出错了"
                        subTitle="抱歉,页面加载出现问题。请刷新页面重试。"
                        extra={
                            <Button type="primary" onClick={() => window.location.reload()}>
                                刷新页面
                            </Button>
                        }
                    />
                </div>
            );
        }

        return this.props.children;
    }
}
