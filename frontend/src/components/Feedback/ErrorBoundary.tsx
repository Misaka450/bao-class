import { Component, type ReactNode, type ErrorInfo } from 'react';
import { ErrorHandler } from '../ErrorHandler';
import { DiagnosticLogger } from '../../utils/diagnosticLogger';
import { ErrorRecoveryManager, RecoveryOption } from '../../utils/errorRecovery';

interface Props {
    children: ReactNode;
    fallback?: React.ComponentType<{ error: Error; errorInfo?: ErrorInfo }>;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    enableAutoRecovery?: boolean;
    maxRetries?: number;
}

interface State {
    hasError: boolean;
    error?: Error;
    errorInfo?: ErrorInfo;
    recoveryOptions?: RecoveryOption[];
    isRecovering?: boolean;
}

/**
 * 增强的错误边界组件
 * 集成诊断日志和自动错误恢复功能
 */
class ErrorBoundary extends Component<Props, State> {
    private logger: DiagnosticLogger;
    private recoveryManager: ErrorRecoveryManager;

    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };

        this.logger = DiagnosticLogger.getInstance();
        this.recoveryManager = ErrorRecoveryManager.getInstance({
            enableAutoRecovery: props.enableAutoRecovery ?? true,
            maxRetries: props.maxRetries ?? 3,
            onRecoveryStart: (strategy) => {
                this.setState({ isRecovering: true });
                this.logger.info('error_boundary', `Recovery started with strategy: ${strategy}`);
            },
            onRecoverySuccess: (strategy, attempts) => {
                this.setState({ hasError: false, isRecovering: false });
                this.logger.info('error_boundary', `Recovery successful with strategy: ${strategy}`, { attempts });
            },
            onRecoveryFailure: (strategy, error) => {
                this.setState({ isRecovering: false });
                this.logger.error('error_boundary', `Recovery failed with strategy: ${strategy}`, { error: error.message });
            }
        });
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // 记录详细的错误信息
        this.logger.error('error_boundary', 'Error caught by ErrorBoundary', {
            error: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            errorBoundary: 'ErrorBoundary'
        }, error);

        // 分析错误并获取恢复选项
        const recoveryOptions = this.recoveryManager.analyzeErrorAndProvideOptions(error, {
            componentStack: errorInfo.componentStack,
            errorBoundary: 'ErrorBoundary'
        });

        this.setState({
            error,
            errorInfo,
            recoveryOptions
        });

        // 调用自定义错误处理函数
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }

        // 尝试自动恢复
        if (this.props.enableAutoRecovery !== false) {
            const autoRecoverySuccess = await this.recoveryManager.attemptAutoRecovery(error, {
                componentStack: errorInfo.componentStack,
                errorBoundary: 'ErrorBoundary'
            });

            if (!autoRecoverySuccess) {
                this.logger.warn('error_boundary', 'Auto recovery failed or not attempted');
            }
        }
    }

    handleRetry = () => {
        this.logger.info('error_boundary', 'Manual retry initiated');
        this.recoveryManager.resetRecoveryState();
        this.setState({
            hasError: false,
            error: undefined,
            errorInfo: undefined,
            recoveryOptions: undefined,
            isRecovering: false
        });
    };

    handleRecoveryOption = async (option: RecoveryOption) => {
        this.logger.info('error_boundary', `Executing recovery option: ${option.title}`);

        try {
            const success = await this.recoveryManager.executeRecovery(option);
            if (success) {
                this.handleRetry();
            }
        } catch (error) {
            this.logger.error('error_boundary', 'Recovery option execution failed', {
                option: option.title,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    };

    render() {
        if (this.state.hasError) {
            // 如果提供了自定义 fallback 组件，使用它
            if (this.props.fallback) {
                const FallbackComponent = this.props.fallback;
                return (
                    <FallbackComponent
                        error={this.state.error!}
                        errorInfo={this.state.errorInfo}
                    />
                );
            }

            // 如果正在恢复中，显示恢复状态
            if (this.state.isRecovering) {
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
                        <h3 style={{ marginTop: '16px', color: '#333' }}>正在尝试恢复...</h3>
                        <p style={{ color: '#666' }}>系统正在自动修复错误，请稍候</p>
                        <style>{`
                            @keyframes spin {
                                0% { transform: rotate(0deg); }
                                100% { transform: rotate(360deg); }
                            }
                        `}</style>
                    </div>
                );
            }

            // 使用增强的错误处理组件
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
                    <ErrorHandler
                        error={{
                            message: '页面加载出现问题',
                            details: this.state.error?.message,
                            stack: this.state.error?.stack,
                        }}
                        onRetry={this.handleRetry}
                        showRetry={true}
                        showHome={true}
                        type="error"
                        size="large"
                    />

                    {/* 显示恢复选项 */}
                    {this.state.recoveryOptions && this.state.recoveryOptions.length > 0 && (
                        <div style={{
                            marginTop: '20px',
                            padding: '16px',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '8px',
                            border: '1px solid #e9ecef',
                            maxWidth: '500px'
                        }}>
                            <h4 style={{ margin: '0 0 12px 0', color: '#333' }}>🔧 恢复选项</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {this.state.recoveryOptions.map((option) => (
                                    <button
                                        key={option.id}
                                        onClick={() => this.handleRecoveryOption(option)}
                                        style={{
                                            padding: '8px 12px',
                                            backgroundColor: option.isRecommended ? '#1890ff' : '#f5f5f5',
                                            color: option.isRecommended ? 'white' : '#333',
                                            border: option.isRecommended ? 'none' : '1px solid #d9d9d9',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            textAlign: 'left'
                                        }}
                                    >
                                        <div style={{ fontWeight: 'bold' }}>
                                            {option.title}
                                            {option.isRecommended && ' (推荐)'}
                                        </div>
                                        <div style={{ fontSize: '12px', opacity: 0.8 }}>
                                            {option.description}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
export { ErrorBoundary };
