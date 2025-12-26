import { z } from 'zod';

// ==================== 成绩相关验证模式 ====================

// 创建成绩验证
export const createScoreSchema = z.object({
    student_id: z.coerce.number().positive('学生ID必须为正整数'),
    exam_id: z.coerce.number().positive('考试ID必须为正整数'),
    course_id: z.coerce.number().positive('科目ID必须为正整数'),
    score: z.number()
        .min(0, '成绩不能为负数')
        .max(150, '成绩不能超过150分')
});

// 更新成绩验证
export const updateScoreSchema = z.object({
    score: z.number()
        .min(0, '成绩不能为负数')
        .max(150, '成绩不能超过150分')
});

// 批量成绩验证
export const batchScoresSchema = z.object({
    exam_id: z.coerce.number().positive('考试ID必须为正整数'),
    scores: z.array(z.object({
        student_id: z.number().positive(),
        student_name: z.string().optional(),
        scores: z.record(z.string(), z.number().min(0).max(150))
    }))
});

// 成绩查询参数验证
export const scoreListQuerySchema = z.object({
    exam_id: z.coerce.number().optional(),
    student_id: z.coerce.number().optional(),
    class_id: z.coerce.number().optional(),
    course_id: z.coerce.number().optional()
});

// 导出类型  
export type CreateScoreInput = z.infer<typeof createScoreSchema>;
export type UpdateScoreInput = z.infer<typeof updateScoreSchema>;
export type BatchScoresInput = z.infer<typeof batchScoresSchema>;
export type ScoreListQuery = z.infer<typeof scoreListQuerySchema>;
