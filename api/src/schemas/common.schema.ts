import { z } from 'zod';

// ==================== 通用验证模式 ====================

// ID 参数验证
export const idParamSchema = z.object({
    id: z.coerce.number().positive('ID必须为正整数')
});

// 分页参数
export const paginationSchema = z.object({
    page: z.coerce.number().min(1).default(1),
    pageSize: z.coerce.number().min(1).max(100).default(20)
});

// 日期范围
export const dateRangeSchema = z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional()
});

// 班级 ID 参数
export const classIdParamSchema = z.object({
    classId: z.coerce.number().positive('班级ID必须为正整数')
});

// 考试 ID 参数
export const examIdParamSchema = z.object({
    examId: z.coerce.number().positive('考试ID必须为正整数')
});

// 学生 ID 参数
export const studentIdParamSchema = z.object({
    studentId: z.coerce.number().positive('学生ID必须为正整数')
});

// 通用列表查询参数
export const listQuerySchema = z.object({
    page: z.coerce.number().min(1).optional(),
    pageSize: z.coerce.number().min(1).max(100).optional(),
    search: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional()
});

// 导出类型
export type IdParam = z.infer<typeof idParamSchema>;
export type ClassIdParam = z.infer<typeof classIdParamSchema>;
export type ExamIdParam = z.infer<typeof examIdParamSchema>;
export type StudentIdParam = z.infer<typeof studentIdParamSchema>;
export type PaginationParams = z.infer<typeof paginationSchema>;
export type ListQueryParams = z.infer<typeof listQuerySchema>;
