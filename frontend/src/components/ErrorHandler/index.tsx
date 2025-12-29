import React from 'react';
import { Result, Button, Alert, Space } from 'antd';
import { ReloadOutlined, HomeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

export interface ErrorInfo {
  message: string;
  code?: string | number;
  details?: string;
  stack?: string;
}

export interface ErrorHandlerProps {
  error: ErrorInfo;
  onRetry?: () => void;
  showRetry?: boolean;
  showHome?: boolean;
  type?: 'error' | 'warning' | 'network' | 'permission';
  size?: 'small' | 'default' | 'large';
}

/**
 * 统一的错误处理组件
 * 基于 Ant Design Pro 模板的错误处理模式
 */
export const ErrorHandler: React.FC<ErrorHandlerProps> = ({
  error,
  onRetry,
  showRetry = true,
  showHome = true,
  type = 'error',
  size = 'default',
}) => {
  const navigate = useNavigate();

  const getErrorConfig = () => {
    switch (type) {
      case 'network':
        return {
          status: '500' as const,
          title: '网络连接失败',
          subTitle: error.message || '请检查网络连接后重试',
        };
      case 'permission':
        return {
          status: '403' as const,
          title: '权限不足',
          subTitle: error.message || '您没有权限访问此资源',
        };
      case 'warning':
        return {
          status: 'warning' as const,
          title: '操作警告',
          subTitle: error.message || '操作可能存在风险',
        };
      default:
        return {
          status: 'error' as const,
          title: '操作失败',
          subTitle: error.message || '系统出现错误，请稍后重试',
        };
    }
  };

  const config = getErrorConfig();

  const actions = [];
  
  if (showRetry && onRetry) {
    actions.push(
      <Button 
        type="primary" 
        icon={<ReloadOutlined />} 
        onClick={onRetry}
        key="retry"
      >
        重试
      </Button>
    );
  }

  if (showHome) {
    actions.push(
      <Button 
        icon={<HomeOutlined />} 
        onClick={() => navigate('/')}
        key="home"
      >
        返回首页
      </Button>
    );
  }

  const containerStyle = {
    padding: size === 'small' ? '20px' : size === 'large' ? '80px 20px' : '50px 20px',
    textAlign: 'center' as const,
  };

  return (
    <div style={containerStyle}>
      <Result
        status={config.status}
        title={config.title}
        subTitle={config.subTitle}
        extra={actions.length > 0 ? <Space>{actions}</Space> : undefined}
      />
      {error.details && (
        <div style={{ marginTop: 24, maxWidth: 600, margin: '24px auto 0' }}>
          <Alert
            message="错误详情"
            description={error.details}
            type="error"
            showIcon
            closable
          />
        </div>
      )}
    </div>
  );
};

export default ErrorHandler;