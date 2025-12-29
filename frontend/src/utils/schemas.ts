import { z } from 'zod';

// 用户相关
export const loginSchema = z.object({
    username: z.string().min(2, '用户名至少2个字符').max(50, '用户名最多50个字符'),
    password: z.string().min(6, '密码至少6个字符'),
});

export const userSchema = z.object({
    username: z.string().min(2).max(50),
    password: z.string().min(6),
    role: z.enum(['admin', 'teacher', 'student', 'parent']),
    name: z.string().min(2).max(50),
});

// 学生相关
export const studentSchema = z.object({
    name: z.string().min(2, '姓名至少2个字符').max(50, '姓名最多50个字符'),
    student_id: z.string().regex(/^\d+$/, '学号必须是数字'),
    class_id: z.number().positive('必须选择班级'),
    gender: z.enum(['male', 'female']).optional(),
});

// 班级相关
export const classSchema = z.object({
    name: z.string().min(2, '班级名称至少2个字符').max(50, '班级名称最多50个字符'),
    grade: z.number().int().min(1, '年级必须大于0').max(6, '年级必须小于等于6'),
});

// 课程相关
export const courseSchema = z.object({
    name: z.string().min(2, '课程名称至少2个字符').max(50, '课程名称最多50个字符'),
    grade: z.number().int().min(1).max(6),
});

// 考试相关
export const examSchema = z.object({
    name: z.string().min(2, '考试名称至少2个字符'),
    class_id: z.number().positive('必须选择班级'),
    exam_date: z.string().min(1, '必须选择日期'),
    description: z.string().optional(),
});

// 成绩相关
export const scoreSchema = z.object({
    student_id: z.number().positive(),
    exam_id: z.number().positive(),
    course_id: z.number().positive(),
    score: z.number().min(0, '分数不能小于0').max(100, '分数不能大于100'),
});

// 类型导出
export type LoginFormData = z.infer<typeof loginSchema>;
export type UserFormData = z.infer<typeof userSchema>;
export type StudentFormData = z.infer<typeof studentSchema>;
export type ClassFormData = z.infer<typeof classSchema>;
export type CourseFormData = z.infer<typeof courseSchema>;
export type ExamFormData = z.infer<typeof examSchema>;
export type ScoreFormData = z.infer<typeof scoreSchema>;
