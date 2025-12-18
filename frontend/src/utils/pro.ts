/**
 * Ant Design Pro utility functions
 */

import type { MenuDataItem, TableResponse, ApiResponse } from '@/types/pro';

/**
 * Transform menu data for ProLayout
 */
export const transformMenuData = (menuData: MenuDataItem[]): MenuDataItem[] => {
  return menuData.map(item => ({
    ...item,
    children: item.children ? transformMenuData(item.children) : undefined,
  }));
};

/**
 * Transform API response to ProTable format
 */
export const transformTableResponse = <T>(response: ApiResponse<{ list: T[]; total: number }>): TableResponse<T> => {
  return {
    data: response.data?.list || [],
    total: response.data?.total || 0,
    success: response.success,
  };
};

/**
 * Get user permissions from token or user info
 */
export const getUserPermissions = (): string[] => {
  // This will be implemented during authentication setup
  return [];
};

/**
 * Check if user has access to a route
 */
export const checkAccess = (access?: string[]): boolean => {
  if (!access || access.length === 0) {
    return true;
  }
  
  const userPermissions = getUserPermissions();
  return access.some(permission => userPermissions.includes(permission));
};

/**
 * Generate breadcrumb from route path
 */
export const generateBreadcrumb = (pathname: string, menuData: MenuDataItem[]): MenuDataItem[] => {
  const breadcrumb: MenuDataItem[] = [];
  
  const findPath = (items: MenuDataItem[], path: string): boolean => {
    for (const item of items) {
      if (item.path === path) {
        breadcrumb.unshift(item);
        return true;
      }
      
      if (item.children && findPath(item.children, path)) {
        breadcrumb.unshift(item);
        return true;
      }
    }
    return false;
  };
  
  findPath(menuData, pathname);
  return breadcrumb;
};

/**
 * Format error message for display
 */
export const formatErrorMessage = (error: any): string => {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  
  return '操作失败，请稍后重试';
};

/**
 * Debounce function for search inputs
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Generate unique key for React components
 */
export const generateKey = (prefix = 'key'): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};