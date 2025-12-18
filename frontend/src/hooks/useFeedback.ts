import { useCallback } from 'react';
import { FeedbackManager, FeedbackType, NotificationConfig, ModalConfig } from '../components/Feedback';

export interface UseFeedbackOptions {
  defaultDuration?: number;
  defaultPlacement?: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
  showIcon?: boolean;
}

/**
 * 统一的反馈管理 Hook
 * 提供一致的成功、错误、警告和信息反馈
 */
export const useFeedback = (options: UseFeedbackOptions = {}) => {
  const {
    defaultDuration = 3,
    defaultPlacement = 'topRight',
    showIcon = true,
  } = options;

  // 消息反馈
  const showMessage = useCallback((
    type: FeedbackType,
    content: string,
    duration = defaultDuration
  ) => {
    FeedbackManager.showMessage({
      type,
      content,
      duration,
      showIcon,
    });
  }, [defaultDuration, showIcon]);

  // 通知反馈
  const showNotification = useCallback((
    type: FeedbackType,
    title: string,
    description?: string,
    duration = defaultDuration * 1.5
  ) => {
    FeedbackManager.showNotification({
      type,
      title,
      content: title,
      description,
      duration,
      placement: defaultPlacement,
    });
  }, [defaultDuration, defaultPlacement]);

  // 模态反馈
  const showModal = useCallback((
    type: FeedbackType,
    title: string,
    content: string,
    onOk?: () => void
  ) => {
    FeedbackManager.showModal({
      type,
      title,
      content,
      onOk,
    });
  }, []);

  // 成功反馈
  const success = {
    message: useCallback((content: string, duration?: number) => 
      showMessage('success', content, duration), [showMessage]),
    notification: useCallback((title: string, description?: string, duration?: number) => 
      showNotification('success', title, description, duration), [showNotification]),
    modal: useCallback((title: string, content: string, onOk?: () => void) => 
      showModal('success', title, content, onOk), [showModal]),
  };

  // 错误反馈
  const error = {
    message: useCallback((content: string, duration?: number) => 
      showMessage('error', content, duration), [showMessage]),
    notification: useCallback((title: string, description?: string, duration?: number) => 
      showNotification('error', title, description, duration), [showNotification]),
    modal: useCallback((title: string, content: string, onOk?: () => void) => 
      showModal('error', title, content, onOk), [showModal]),
  };

  // 警告反馈
  const warning = {
    message: useCallback((content: string, duration?: number) => 
      showMessage('warning', content, duration), [showMessage]),
    notification: useCallback((title: string, description?: string, duration?: number) => 
      showNotification('warning', title, description, duration), [showNotification]),
    modal: useCallback((title: string, content: string, onOk?: () => void) => 
      showModal('warning', title, content, onOk), [showModal]),
  };

  // 信息反馈
  const info = {
    message: useCallback((content: string, duration?: number) => 
      showMessage('info', content, duration), [showMessage]),
    notification: useCallback((title: string, description?: string, duration?: number) => 
      showNotification('info', title, description, duration), [showNotification]),
    modal: useCallback((title: string, content: string, onOk?: () => void) => 
      showModal('info', title, content, onOk), [showModal]),
  };

  // 操作反馈的便捷方法
  const handleSuccess = useCallback((
    action: string,
    useNotification = false,
    customMessage?: string
  ) => {
    const message = customMessage || `${action}成功`;
    if (useNotification) {
      showNotification('success', '操作成功', message);
    } else {
      showMessage('success', message);
    }
  }, [success]);

  const handleError = useCallback((
    action: string,
    error?: Error | string,
    useNotification = false
  ) => {
    const errorMessage = typeof error === 'string' ? error : error?.message;
    const message = errorMessage || `${action}失败`;
    
    if (useNotification) {
      showNotification('error', '操作失败', message);
    } else {
      showMessage('error', message);
    }
  }, [error]);

  // 确认操作
  const confirm = useCallback((
    title: string,
    content: string,
    onConfirm: () => void | Promise<void>,
    onCancel?: () => void
  ) => {
    FeedbackManager.showModal({
      type: 'warning',
      title,
      content,
      onOk: async () => {
        try {
          await onConfirm();
        } catch (err) {
          handleError('操作', err as Error, true);
        }
      },
      onCancel,
      okText: '确认',
      cancelText: '取消',
    });
  }, [handleError]);

  // 清理方法
  const destroy = useCallback(() => {
    FeedbackManager.destroy();
  }, []);

  return {
    showMessage,
    showNotification,
    showModal,
    success,
    error,
    warning,
    info,
    handleSuccess,
    handleError,
    confirm,
    destroy,
  };
};

export default useFeedback;