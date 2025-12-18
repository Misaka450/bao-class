import { message, notification } from 'antd';

/**
 * Pro 模板反馈系统配置
 * 统一配置消息和通知的样式、持续时间等
 */

// 全局消息配置
message.config({
  top: 100,
  duration: 3,
  maxCount: 3,
  rtl: false,
});

// 全局通知配置
notification.config({
  placement: 'topRight',
  top: 24,
  bottom: 24,
  duration: 4.5,
  maxCount: 4,
  rtl: false,
});

/**
 * 操作反馈配置
 */
export const FEEDBACK_CONFIG = {
  // 消息持续时间
  MESSAGE_DURATION: {
    SUCCESS: 3,
    ERROR: 5,
    WARNING: 4,
    INFO: 3,
  },
  
  // 通知持续时间
  NOTIFICATION_DURATION: {
    SUCCESS: 4.5,
    ERROR: 6,
    WARNING: 5,
    INFO: 4.5,
  },
  
  // 常用操作消息模板
  MESSAGES: {
    // CRUD 操作
    CREATE_SUCCESS: '创建成功',
    CREATE_ERROR: '创建失败',
    UPDATE_SUCCESS: '更新成功',
    UPDATE_ERROR: '更新失败',
    DELETE_SUCCESS: '删除成功',
    DELETE_ERROR: '删除失败',
    SAVE_SUCCESS: '保存成功',
    SAVE_ERROR: '保存失败',
    
    // 数据操作
    LOAD_ERROR: '数据加载失败',
    SUBMIT_SUCCESS: '提交成功',
    SUBMIT_ERROR: '提交失败',
    UPLOAD_SUCCESS: '上传成功',
    UPLOAD_ERROR: '上传失败',
    DOWNLOAD_SUCCESS: '下载成功',
    DOWNLOAD_ERROR: '下载失败',
    
    // 用户操作
    LOGIN_SUCCESS: '登录成功',
    LOGIN_ERROR: '登录失败',
    LOGOUT_SUCCESS: '退出成功',
    PASSWORD_CHANGE_SUCCESS: '密码修改成功',
    PASSWORD_CHANGE_ERROR: '密码修改失败',
    
    // 权限相关
    PERMISSION_DENIED: '权限不足',
    ACCESS_DENIED: '访问被拒绝',
    
    // 网络相关
    NETWORK_ERROR: '网络连接失败',
    SERVER_ERROR: '服务器错误',
    TIMEOUT_ERROR: '请求超时',
    
    // 表单验证
    VALIDATION_ERROR: '表单验证失败',
    REQUIRED_FIELD: '请填写必填字段',
    
    // 通用
    OPERATION_SUCCESS: '操作成功',
    OPERATION_ERROR: '操作失败',
    OPERATION_CANCELLED: '操作已取消',
    CONFIRM_DELETE: '确定要删除吗？',
    CONFIRM_OPERATION: '确定要执行此操作吗？',
  },
  
  // 通知标题模板
  NOTIFICATION_TITLES: {
    SUCCESS: '操作成功',
    ERROR: '操作失败',
    WARNING: '操作警告',
    INFO: '提示信息',
    SYSTEM: '系统通知',
    UPDATE: '更新提醒',
  },
} as const;

/**
 * 获取操作反馈消息
 */
export const getFeedbackMessage = (
  operation: string,
  type: 'success' | 'error',
  customMessage?: string
): string => {
  if (customMessage) return customMessage;
  
  const suffix = type === 'success' ? '成功' : '失败';
  return `${operation}${suffix}`;
};

/**
 * 获取确认对话框配置
 */
export const getConfirmConfig = (
  action: string,
  itemName?: string
) => ({
  title: `确认${action}`,
  content: itemName ? `确定要${action} "${itemName}" 吗？` : `确定要${action}吗？`,
  okText: '确认',
  cancelText: '取消',
  okType: 'danger' as const,
});

export default FEEDBACK_CONFIG;