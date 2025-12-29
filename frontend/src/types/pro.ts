/**
 * Ant Design Pro specific type definitions
 */

import type { ProLayoutProps } from '@ant-design/pro-components';
import type { ProTableProps } from '@ant-design/pro-table';
import type { ProFormProps } from '@ant-design/pro-form';

// Layout Types
export interface ProLayoutConfig extends ProLayoutProps {
  title?: string;
  logo?: string | React.ReactNode;
  menuData?: MenuDataItem[];
  userInfo?: UserInfo;
}

export interface MenuDataItem {
  path: string;
  name: string;
  icon?: React.ReactNode;
  children?: MenuDataItem[];
  hideInMenu?: boolean;
  access?: string[];
  component?: string;
}

export interface UserInfo {
  id: number;
  name: string;
  username: string;
  avatar?: string;
  role: string;
  permissions: string[];
}

// Table Types
export interface ProTableConfig<T = any> extends Omit<ProTableProps<T, any>, 'request'> {
  request?: (params: TableRequestParams) => Promise<TableResponse<T>>;
}

export interface TableRequestParams {
  current: number;
  pageSize: number;
  [key: string]: any;
}

export interface TableResponse<T> {
  data: T[];
  total: number;
  success: boolean;
}

// Form Types
export interface ProFormConfig extends ProFormProps {
  onFinish?: (values: any) => Promise<void>;
  loading?: boolean;
}

// Route Types
export interface RouteItem {
  path: string;
  name: string;
  component?: React.ComponentType;
  icon?: React.ReactNode;
  access?: string[];
  hideInMenu?: boolean;
  children?: RouteItem[];
}

// Theme Types
export interface ThemeToken {
  colorPrimary: string;
  colorSuccess: string;
  colorWarning: string;
  colorError: string;
  colorInfo: string;
  borderRadius: number;
  fontSize: number;
  fontFamily: string;
}

// API Types
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  code?: number;
}

export interface PaginationParams {
  current: number;
  pageSize: number;
  total?: number;
}

// Error Types
export interface ErrorInfo {
  message: string;
  stack?: string;
  componentStack?: string;
}

export interface NotificationConfig {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  description?: string;
  duration?: number;
}