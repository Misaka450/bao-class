import { z } from 'zod';

export const commentStyleEnum = z.enum(['formal', 'friendly', 'concise']).default('friendly');

export const generateCommentSchema = z.object({
    student_id: z.coerce.number(),
    exam_ids: z.array(z.number()).optional(),
    force_regenerate: z.boolean().optional().default(false),
    style: commentStyleEnum.optional()
});

export type GenerateCommentInput = z.infer<typeof generateCommentSchema>;
export type CommentStyle = z.infer<typeof commentStyleEnum>;

