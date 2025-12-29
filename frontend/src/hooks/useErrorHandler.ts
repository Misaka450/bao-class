import { useCallback } from 'react';
import { message, notification } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export interface ErrorHandlerOptions {
  showMessage?: boolean;
  showNotification?: boolean;
  redirectOnAuth?: boolean;
  logError?: boolean;
}

export interface ErrorContext {
  action?: string;
  component?: string;
  userId?: number;
  timestamp?: number;
}

/**
 * 统一错误处理 Hook
 * 提供一致的错误处理逻辑和用户反馈
 */
export const useErrorHandler = () => {
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  const handleError = useCallback((
    error: Error | string,
    options: ErrorHandlerOptions = {},
    context?: ErrorContext
  ) => {
    const {
      showMessage = true,
      showNotification = false,
      redirectOnAuth = true,
      logError = true,
    } = options;

    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorObj = typeof error === 'string' ? new Error(error) : error;

    // 记录错误日志
    if (logError) {
      console.error('Error handled:', {
        error: errorObj,
        context,
        timestamp: Date.now(),
      });
    }

    // 处理认证错误
    if (errorMessage.includes('401') || errorMessage.includes('未授权') || errorMessage.includes('Unauthorized')) {
      if (redirectOnAuth) {
        message.error('登录已过期，请重新登录');
        logout();
        navigate('/login');
        return;
      }
    }

    // 处理权限错误
    if (errorMessage.includes('403') || errorMessage.includes('权限不足') || errorMessage.includes('Forbidden')) {
      if (showNotification) {
        notification.error({
          message: '权限不足',
          description: '您没有权限执行此操作',
          duration: 4.5,
        });
      } else if (showMessage) {
        message.error('权限不足');
      }
      return;
    }

    // 处理网络错误
    if (errorMessage.includes('网络') || errorMessage.includes('Network') || errorMessage.includes('fetch')) {
      if (showNotification) {
        notification.error({
          message: '网络错误',
          description: '网络连接失败，请检查网络后重试',
          duration: 4.5,
        });
      } else if (showMessage) {
        message.error('网络连接失败');
      }
      return;
    }

    // 处理服务器错误
    if (errorMessage.includes('500') || errorMessage.includes('服务器错误') || errorMessage.includes('Internal Server Error')) {
      if (showNotification) {
        notification.error({
          message: '服务器错误',
          description: '服务器暂时无法处理请求，请稍后重试',
          duration: 4.5,
        });
      } else if (showMessage) {
        message.error('服务器错误，请稍后重试');
      }
      return;
    }

    // 处理一般错误
    if (showNotification) {
      notification.error({
        message: '操作失败',
        description: errorMessage,
        duration: 4.5,
      });
    } else if (showMessage) {
      message.error(errorMessage);
    }
  }, [navigate, logout]);

  const handleAsyncError = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    options?: ErrorHandlerOptions,
    context?: ErrorContext
  ): Promise<T | null> => {
    try {
      return await asyncFn();
    } catch (error) {
      handleError(error as Error, options, context);
      return null;
    }
  }, [handleError]);

  const createErrorHandler = useCallback((
    options?: ErrorHandlerOptions,
    context?: ErrorContext
  ) => {
    return (error: Error | string) => handleError(error, options, context);
  }, [handleError]);

  return {
    handleError,
    handleAsyncError,
    createErrorHandler,
  };
};

export default useErrorHandler;