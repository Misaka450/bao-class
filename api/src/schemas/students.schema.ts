import { z } from 'zod';

// ==================== 学生相关验证模式 ====================

// 创建学生验证
export const createStudentSchema = z.object({
    name: z.string()
        .min(1, '姓名不能为空')
        .max(50, '姓名不能超过50个字符'),
    student_id: z.string()
        .min(1, '学号不能为空')
        .max(20, '学号不能超过20个字符'),
    class_id: z.coerce.number().positive('班级ID必须为正整数'),
    gender: z.enum(['male', 'female']).optional()
});

// 更新学生验证
export const updateStudentSchema = z.object({
    name: z.string().min(1).max(50).optional(),
    student_id: z.string().min(1).max(20).optional(),
    class_id: z.coerce.number().positive().optional(),
    gender: z.enum(['male', 'female']).optional()
});

// 学生查询参数验证
export const studentQuerySchema = z.object({
    class_id: z.coerce.number().optional(),
    search: z.string().optional()
});

// 导出类型
export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type StudentQuery = z.infer<typeof studentQuerySchema>;
