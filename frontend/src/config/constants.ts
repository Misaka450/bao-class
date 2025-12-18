/**
 * Application constants following Ant Design Pro conventions
 */

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Application Configuration
export const APP_NAME = '班级管理系统';
export const APP_LOGO = '/logo.svg';

// Layout Configuration
export const LAYOUT_TYPE = 'side' as const;
export const THEME_TYPE = 'light' as const;

// Table Configuration
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = ['10', '20', '50', '100'];

// Form Configuration
export const FORM_LAYOUT = 'horizontal' as const;

// Route Configuration
export const LOGIN_PATH = '/login';
export const HOME_PATH = '/dashboard';

// Storage Keys
export const TOKEN_KEY = 'access_token';
export const USER_KEY = 'user_info';
export const THEME_KEY = 'theme_config';