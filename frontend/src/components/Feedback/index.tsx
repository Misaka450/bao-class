import React from 'react';
import { message, notification, Modal } from 'antd';
import { CheckCircleOutlined, ExclamationCircleOutlined, InfoCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

export type FeedbackType = 'success' | 'error' | 'warning' | 'info';

export interface FeedbackConfig {
  type: FeedbackType;
  title?: string;
  content: string;
  duration?: number;
  showIcon?: boolean;
  placement?: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
}

export interface NotificationConfig extends FeedbackConfig {
  description?: string;
  btn?: React.ReactNode;
  key?: string;
  onClose?: () => void;
  onClick?: () => void;
}

export interface ModalConfig {
  type: FeedbackType;
  title: string;
  content: string;
  onOk?: () => void;
  onCancel?: () => void;
  okText?: string;
  cancelText?: string;
  centered?: boolean;
}

/**
 * 统一的反馈系统
 * 基于 Ant Design Pro 模板的反馈模式
 */
export class FeedbackManager {
  private static getIcon(type: FeedbackType) {
    const iconMap = {
      success: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      error: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
      warning: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
      info: <InfoCircleOutlined style={{ color: '#1890ff' }} />,
    };
    return iconMap[type];
  }

  /**
   * 显示消息提示
   */
  static showMessage(config: FeedbackConfig) {
    const { type, content, duration = 3 } = config;
    
    message[type]({
      content,
      duration,
      icon: config.showIcon ? this.getIcon(type) : undefined,
    });
  }

  /**
   * 显示通知
   */
  static showNotification(config: NotificationConfig) {
    const {
      type,
      title,
      content,
      description,
      duration = 4.5,
      placement = 'topRight',
      btn,
      key,
      onClose,
      onClick,
    } = config;

    notification[type]({
      message: title || this.getDefaultTitle(type),
      description: description || content,
      duration,
      placement,
      btn,
      key,
      onClose,
      onClick,
      icon: this.getIcon(type),
    });
  }

  /**
   * 显示模态对话框
   */
  static showModal(config: ModalConfig) {
    const {
      type,
      title,
      content,
      onOk,
      onCancel,
      okText = '确定',
      cancelText = '取消',
      centered = true,
    } = config;

    const modalConfig = {
      title,
      content,
      onOk,
      onCancel,
      okText,
      cancelText,
      centered,
      icon: this.getIcon(type),
    };

    switch (type) {
      case 'success':
        Modal.success(modalConfig);
        break;
      case 'error':
        Modal.error(modalConfig);
        break;
      case 'warning':
        Modal.warning(modalConfig);
        break;
      case 'info':
        Modal.info(modalConfig);
        break;
    }
  }

  /**
   * 获取默认标题
   */
  private static getDefaultTitle(type: FeedbackType): string {
    const titleMap = {
      success: '操作成功',
      error: '操作失败',
      warning: '操作警告',
      info: '提示信息',
    };
    return titleMap[type];
  }

  /**
   * 成功反馈的便捷方法
   */
  static success = {
    message: (content: string, duration?: number) =>
      this.showMessage({ type: 'success', content, duration }),
    
    notification: (title: string, description?: string, duration?: number) =>
      this.showNotification({ type: 'success', title, content: title, description, duration }),
    
    modal: (title: string, content: string, onOk?: () => void) =>
      this.showModal({ type: 'success', title, content, onOk }),
  };

  /**
   * 错误反馈的便捷方法
   */
  static error = {
    message: (content: string, duration?: number) =>
      this.showMessage({ type: 'error', content, duration }),
    
    notification: (title: string, description?: string, duration?: number) =>
      this.showNotification({ type: 'error', title, content: title, description, duration }),
    
    modal: (title: string, content: string, onOk?: () => void) =>
      this.showModal({ type: 'error', title, content, onOk }),
  };

  /**
   * 警告反馈的便捷方法
   */
  static warning = {
    message: (content: string, duration?: number) =>
      this.showMessage({ type: 'warning', content, duration }),
    
    notification: (title: string, description?: string, duration?: number) =>
      this.showNotification({ type: 'warning', title, content: title, description, duration }),
    
    modal: (title: string, content: string, onOk?: () => void) =>
      this.showModal({ type: 'warning', title, content, onOk }),
  };

  /**
   * 信息反馈的便捷方法
   */
  static info = {
    message: (content: string, duration?: number) =>
      this.showMessage({ type: 'info', content, duration }),
    
    notification: (title: string, description?: string, duration?: number) =>
      this.showNotification({ type: 'info', title, content: title, description, duration }),
    
    modal: (title: string, content: string, onOk?: () => void) =>
      this.showModal({ type: 'info', title, content, onOk }),
  };

  /**
   * 清除所有消息
   */
  static destroy() {
    message.destroy();
    notification.destroy();
  }

  /**
   * 清除指定的通知
   */
  static destroyNotification(key: string) {
    notification.close(key);
  }
}

export default FeedbackManager;