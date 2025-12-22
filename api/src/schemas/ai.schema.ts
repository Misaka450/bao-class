import { z } from 'zod';

export const generateCommentSchema = z.object({
    student_id: z.number(),
    exam_ids: z.array(z.number()).optional(),
    force_regenerate: z.boolean().optional().default(false)
});

export type GenerateCommentInput = z.infer<typeof generateCommentSchema>;
