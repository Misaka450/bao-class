import { z } from 'zod';

// ==================== 班级相关验证模式 ====================

// 创建班级验证
export const createClassSchema = z.object({
    name: z.string()
        .min(1, '班级名称不能为空')
        .max(50, '班级名称不能超过50个字符'),
    grade: z.coerce.number()
        .min(1, '年级必须在1-6之间')
        .max(6, '年级必须在1-6之间'),
    teacher_id: z.coerce.number().positive().optional().nullable()
});

// 更新班级验证
export const updateClassSchema = z.object({
    name: z.string().min(1).max(50).optional(),
    grade: z.coerce.number().min(1).max(6).optional(),
    teacher_id: z.coerce.number().positive().optional().nullable()
});

// 分配科任教师验证
export const assignTeacherSchema = z.object({
    course_id: z.coerce.number().positive('科目ID必须为正整数'),
    teacher_id: z.coerce.number().positive('教师ID必须为正整数')
});

// 导出类型
export type CreateClassInput = z.infer<typeof createClassSchema>;
export type UpdateClassInput = z.infer<typeof updateClassSchema>;
export type AssignTeacherInput = z.infer<typeof assignTeacherSchema>;
