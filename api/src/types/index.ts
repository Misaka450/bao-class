// 用户角色类型
export type UserRole = 'admin' | 'teacher' | 'student' | 'parent';

// 用户类型
export interface User {
  id: number;
  username: string;
  password: string;
  role: UserRole;
  name: string;
  created_at: string;
}

// 班级类型
export interface Class {
  id: number;
  name: string;
  grade: number;
  teacher_id: number | null;
  created_at: string;
}

// 学生类型
export interface Student {
  id: number;
  name: string;
  student_id: string;
  class_id: number;
  parent_id: number | null;
  created_at: string;
}

// 课程类型
export interface Course {
  id: number;
  name: string;
  grade: number;
  created_at: string;
}

// 考试类型
export interface Exam {
  id: number;
  name: string;
  course_id: number;
  class_id: number;
  exam_date: string;
  full_score: number;
  created_at: string;
}

// 成绩类型
export interface Score {
  id: number;
  exam_id: number;
  student_id: number;
  score: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

// JWT Payload 类型
export interface JWTPayload {
  userId: number;
  username: string;
  role: UserRole;
}

// API 响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 登录请求
export interface LoginRequest {
  username: string;
  password: string;
}

// 统计数据类型
export interface ClassStatistics {
  average: number;
  highest: number;
  lowest: number;
  passRate: number;
  distribution: {
    range: string;
    count: number;
  }[];
}

// Cloudflare Workers 环境变量
export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
  AI: Ai;
  JWT_SECRET: string;
  ENVIRONMENT?: string;
}
