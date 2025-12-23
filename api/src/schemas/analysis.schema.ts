import { z } from 'zod';

export const classIdSchema = z.object({
    classId: z.coerce.number()
});

export const examIdSchema = z.object({
    examId: z.coerce.number()
});

export const reportParamsSchema = z.object({
    classId: z.coerce.number(),
    examId: z.coerce.number()
});

export const refreshReportSchema = z.object({
    classId: z.coerce.number(),
    examId: z.coerce.number()
});

export const distributionParamsSchema = z.object({
    classId: z.coerce.number(),
    examId: z.coerce.number()
});
