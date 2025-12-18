/**
 * 反馈系统使用示例
 * 展示如何在组件中使用统一的反馈系统
 */

import React from 'react';
import { Button, Space, Card } from 'antd';
import { useFeedback } from '../../hooks/useFeedback';
import { FeedbackManager } from './index';

export const FeedbackExample: React.FC = () => {
  const feedback = useFeedback();

  // 示例 1: 简单消息反馈
  const handleSimpleMessage = () => {
    feedback.success.message('操作成功！');
  };

  // 示例 2: 通知反馈
  const handleNotification = () => {
    feedback.success.notification(
      '数据保存成功',
      '您的更改已成功保存到服务器'
    );
  };

  // 示例 3: 模态反馈
  const handleModal = () => {
    feedback.success.modal(
      '提交成功',
      '您的申请已提交，我们会尽快处理'
    );
  };

  // 示例 4: 错误反馈
  const handleError = () => {
    feedback.error.notification(
      '操作失败',
      '网络连接失败，请检查网络后重试'
    );
  };

  // 示例 5: 确认操作
  const handleConfirm = () => {
    feedback.confirm(
      '确认删除',
      '删除后数据将无法恢复，确定要继续吗？',
      async () => {
        // 模拟异步操作
        await new Promise(resolve => setTimeout(resolve, 1000));
        feedback.success.message('删除成功');
      }
    );
  };

  // 示例 6: 操作反馈便捷方法
  const handleOperation = async () => {
    try {
      // 模拟异步操作
      await new Promise(resolve => setTimeout(resolve, 1000));
      feedback.handleSuccess('保存');
    } catch (error) {
      feedback.handleError('保存', error as Error);
    }
  };

  // 示例 7: 直接使用 FeedbackManager
  const handleDirectUsage = () => {
    FeedbackManager.success.message('使用 FeedbackManager 的直接调用');
  };

  return (
    <Card title="反馈系统使用示例">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap>
          <Button onClick={handleSimpleMessage}>
            简单消息
          </Button>
          <Button onClick={handleNotification}>
            通知反馈
          </Button>
          <Button onClick={handleModal}>
            模态反馈
          </Button>
          <Button onClick={handleError} danger>
            错误反馈
          </Button>
        </Space>

        <Space wrap>
          <Button onClick={handleConfirm} type="primary" danger>
            确认操作
          </Button>
          <Button onClick={handleOperation} type="primary">
            操作反馈
          </Button>
          <Button onClick={handleDirectUsage}>
            直接调用
          </Button>
        </Space>
      </Space>
    </Card>
  );
};

export default FeedbackExample;