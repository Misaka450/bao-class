import { z } from 'zod';

// ==================== 考试相关验证模式 ====================

// 创建考试验证
export const createExamSchema = z.object({
    name: z.string()
        .min(1, '考试名称不能为空')
        .max(100, '考试名称不能超过100个字符'),
    class_id: z.coerce.number().positive('班级ID必须为正整数'),
    exam_date: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式必须为 YYYY-MM-DD'),
    description: z.string().max(500).optional(),
    courses: z.array(z.object({
        course_id: z.coerce.number().positive(),
        full_score: z.number().positive().default(100)
    })).min(1, '至少选择一个科目')
});

// 更新考试验证
export const updateExamSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    exam_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    description: z.string().max(500).optional()
});

// 考试查询参数验证
export const examQuerySchema = z.object({
    class_id: z.coerce.number().optional()
});

// 导出类型
export type CreateExamInput = z.infer<typeof createExamSchema>;
export type UpdateExamInput = z.infer<typeof updateExamSchema>;
export type ExamQuery = z.infer<typeof examQuerySchema>;
