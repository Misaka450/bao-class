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
  JWT_SECRET: string;
  ENVIRONMENT?: string;
  DASHSCOPE_API_KEY?: string;
}
