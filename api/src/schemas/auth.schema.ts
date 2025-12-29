import { z } from 'zod';

// ==================== 认证相关验证模式 ====================

// 登录请求验证
export const loginSchema = z.object({
    username: z.string()
        .min(3, '用户名至少3个字符')
        .max(50, '用户名不能超过50个字符'),
    password: z.string()
        .min(6, '密码至少6个字符')
});

// 修改密码验证
export const changePasswordSchema = z.object({
    oldPassword: z.string().min(6, '旧密码至少6个字符'),
    newPassword: z.string()
        .min(6, '新密码至少6个字符')
        .max(50, '密码不能超过50个字符')
});

// 创建用户验证
export const createUserSchema = z.object({
    username: z.string()
        .min(3, '用户名至少3个字符')
        .max(50, '用户名不能超过50个字符'),
    password: z.string()
        .min(6, '密码至少6个字符'),
    name: z.string()
        .min(1, '姓名不能为空')
        .max(50, '姓名不能超过50个字符'),
    role: z.enum(['admin', 'head_teacher', 'teacher', 'student', 'parent'])
});

// 更新用户验证
export const updateUserSchema = z.object({
    username: z.string().min(3).max(50).optional(),
    password: z.string().min(6).optional(),
    name: z.string().min(1).max(50).optional(),
    role: z.enum(['admin', 'head_teacher', 'teacher', 'student', 'parent']).optional()
});

// 导出类型
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
