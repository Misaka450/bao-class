import React, { useState, useCallback } from 'react';
import { Button, Space, Typography, Card } from 'antd';
import { ReloadOutlined, WifiOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

export interface NetworkErrorProps {
  error: Error;
  onRetry: () => Promise<void>;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * 网络错误处理组件
 * 提供自动重试和手动重试功能
 */
export const NetworkErrorHandler: React.FC<NetworkErrorProps> = ({
  error,
  onRetry,
  maxRetries = 3,
  retryDelay = 1000,
}) => {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [autoRetryEnabled, setAutoRetryEnabled] = useState(true);

  const handleRetry = useCallback(async () => {
    if (retryCount >= maxRetries) {
      return;
    }

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      await onRetry();
      // 重试成功，重置计数
      setRetryCount(0);
    } catch (retryError) {
      console.error('Retry failed:', retryError);
      
      // 如果还有重试次数且启用了自动重试，延迟后自动重试
      if (retryCount + 1 < maxRetries && autoRetryEnabled) {
        setTimeout(() => {
          handleRetry();
        }, retryDelay * Math.pow(2, retryCount)); // 指数退避
      }
    } finally {
      setIsRetrying(false);
    }
  }, [retryCount, maxRetries, onRetry, retryDelay, autoRetryEnabled]);

  const handleManualRetry = () => {
    setRetryCount(0);
    setAutoRetryEnabled(true);
    handleRetry();
  };

  const isMaxRetriesReached = retryCount >= maxRetries;

  return (
    <div style={{ padding: '40px 20px', textAlign: 'center' }}>
      <Card style={{ maxWidth: 500, margin: '0 auto' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <WifiOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />
          
          <div>
            <Title level={4} style={{ margin: 0 }}>
              网络连接失败
            </Title>
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              {error.message || '请检查网络连接后重试'}
            </Text>
          </div>

          {retryCount > 0 && (
            <Text type="warning">
              已重试 {retryCount}/{maxRetries} 次
            </Text>
          )}

          <Space>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              loading={isRetrying}
              disabled={isMaxRetriesReached}
              onClick={handleManualRetry}
            >
              {isRetrying ? '重试中...' : '重试'}
            </Button>
            
            {isMaxRetriesReached && (
              <Button
                onClick={() => window.location.reload()}
              >
                刷新页面
              </Button>
            )}
          </Space>

          {autoRetryEnabled && !isMaxRetriesReached && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              将自动重试，或点击上方按钮手动重试
            </Text>
          )}
        </Space>
      </Card>
    </div>
  );
};

export default NetworkErrorHandler;