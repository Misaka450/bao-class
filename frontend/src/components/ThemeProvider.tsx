import React from 'react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { lightTheme } from '../config/theme';

interface ThemeProviderProps {
  children: React.ReactNode;
  theme?: 'light' | 'dark';
}

/**
 * Theme Provider Component
 * Provides consistent theme configuration across the entire application
 * Following Ant Design Pro conventions
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  theme = 'light' 
}) => {
  // For now, we only support light theme
  // Dark theme can be added later when needed
  const currentTheme = lightTheme;

  return (
    <ConfigProvider 
      locale={zhCN} 
      theme={currentTheme}
      // Configure component defaults
      componentSize="middle"
      // Configure form validation behavior
      form={{
        validateMessages: {
          required: '${label}是必填项',
          types: {
            email: '${label}不是有效的邮箱格式',
            number: '${label}不是有效的数字',
          },
          number: {
            range: '${label}必须在${min}和${max}之间',
          },
        },
      }}
      // Configure wave effect
      wave={{
        disabled: false,
      }}
    >
      {children}
    </ConfigProvider>
  );
};

export default ThemeProvider;