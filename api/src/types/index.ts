// 后端类型定义
// 从共享类型包引入基础类型
export * from '@bao-class/types';
export type { UserRole } from '@bao-class/types';

// ==================== 后端专用类型 ====================

// JWT Payload 类型
export interface JWTPayload {
  userId: number;
  username: string;
  name: string;
  role: 'admin' | 'head_teacher' | 'teacher' | 'student' | 'parent';
}

// 登录请求
export interface LoginRequest {
  username: string;
  password: string;
}

// Cloudflare Workers 环境变量
export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
  AI: Ai;
  ASSET_BUCKET?: R2Bucket;
  // Secrets
  JWT_SECRET: string;
  ENVIRONMENT?: string;
  DASHSCOPE_API_KEY?: string;
}

// ==================== 通用工具类型 ====================

// API 响应基础类型
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 分页响应类型
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// 批量操作结果
export interface BatchOperationResult {
  success: number;
  failed: number;
  errors?: Array<{ index: number; error: string }>;
}
