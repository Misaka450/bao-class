import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { checkClassAccess } from '../utils/auth'
import { AppError } from '../utils/AppError'
import { Env, JWTPayload } from '../types'

type Variables = {
    user: JWTPayload
}

const ai = new Hono<{ Bindings: Env; Variables: Variables }>()

// Apply auth middleware
ai.use('*', authMiddleware)

// Generate student comment
ai.post('/generate-comment', async (c) => {
    const { student_id, exam_ids, force_regenerate } = await c.req.json()

    // 权限校验：获取学生所属班级并检查权限
    const user = c.get('user')
    const studentInfo = await c.env.DB.prepare('SELECT class_id FROM students WHERE id = ?').bind(student_id).first<any>()
    if (!studentInfo) return c.json({ error: 'Student not found' }, 404)
    if (!await checkClassAccess(c.env.DB, user, studentInfo.class_id)) {
        return c.json({ error: 'Forbidden' }, 403)
    }

    // Add debug log
    console.log('Received request with parameters:', { student_id, exam_ids, force_regenerate });

    try {
        console.log('Starting AI comment generation for student_id:', student_id);

        // 1. Check KV cache first (unless force_regenerate is true)
        const cacheKey = `ai_comment_${student_id}`;
        if (!force_regenerate) {
            try {
                const cachedComment = await c.env.KV.get(cacheKey);
                if (cachedComment) {
                    console.log('Returning cached comment for student_id:', student_id);
                    return c.json({
                        success: true,
                        comment: cachedComment,
                        cached: true,
                        source: 'kv'
                    });
                }
            } catch (kvError) {
                console.warn('KV cache read failed:', kvError);
            }
        } else {
            console.log('Force regenerate requested for student_id:', student_id);
            // Explicitly delete the cache key to ensure fresh start
            try {
                await c.env.KV.delete(cacheKey);
                console.log('Deleted KV cache for student_id:', student_id);
            } catch (e) {
                console.warn('Failed to delete KV cache:', e);
            }
        }

        // 2. Parallel Data Fetching
        const [student, scoreResult, subjectScores, allScoresResult, examHistory] = await Promise.all([
            // Get student info
            c.env.DB.prepare(`
                SELECT s.id, s.name, c.name as class_name
                FROM students s
                JOIN classes c ON s.class_id = c.id
                WHERE s.id = ?
            `).bind(student_id).first() as Promise<any>,

            // Get student's average score
            c.env.DB.prepare(`
                SELECT 
                    AVG(s.score) as avg_score,
                    COUNT(s.score) as total_exams
                FROM scores s
                WHERE s.student_id = ?
            `).bind(student_id).first() as Promise<any>,

            // Get subject-wise performance
            c.env.DB.prepare(`
                SELECT 
                    c.name as course_name,
                    AVG(s.score) as avg_score
                FROM scores s
                JOIN courses c ON s.course_id = c.id
                WHERE s.student_id = ?
                GROUP BY c.id, c.name
                ORDER BY avg_score DESC
            `).bind(student_id).all() as Promise<any>,

            // Get all scores for trend analysis
            c.env.DB.prepare(`
                SELECT 
                    s.score,
                    e.exam_date
                FROM scores s
                JOIN exams e ON s.exam_id = e.id
                WHERE s.student_id = ?
                ORDER BY e.exam_date ASC
            `).bind(student_id).all() as Promise<any>,

            // Get detailed exam history
            c.env.DB.prepare(`
                SELECT 
                    e.id as exam_id,
                    e.name as exam_name,
                    e.exam_date,
                    c.name as subject_name,
                    s.score,
                    ec.full_score
                FROM scores s
                JOIN exams e ON s.exam_id = e.id
                JOIN courses c ON s.course_id = c.id
                JOIN exam_courses ec ON s.exam_id = ec.exam_id AND s.course_id = ec.course_id
                WHERE s.student_id = ?
                ORDER BY e.exam_date ASC, c.name ASC
            `).bind(student_id).all() as Promise<any>
        ]);

        if (!student) {
            throw new AppError('Student not found', 404)
        }

        console.log('Student info:', student);

        // Process Data
        const avgScore = scoreResult?.avg_score || 0;
        console.log('Average score:', avgScore);

        // Process Subject Scores
        let strongSubjects = '暂无';
        let weakSubjects = '暂无';

        if (subjectScores.results && subjectScores.results.length > 0) {
            const courseAvgs = subjectScores.results.map((row: any) => ({
                name: row.course_name,
                avg: row.avg_score
            })).sort((a: any, b: any) => b.avg - a.avg)

            strongSubjects = courseAvgs.slice(0, 2).map((c: any) => c.name).join('、')
            weakSubjects = courseAvgs.slice(-2).map((c: any) => c.name).join('、')
        }

        // Process Trend
        let trend = '稳定';
        let trendDescription = '成绩保持稳定';
        const allScores = allScoresResult.results || [];

        if (allScores.length >= 3) {
            const sortedScores = [...allScores].sort((a: any, b: any) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime());
            const n = sortedScores.length;
            let sum_x = 0, sum_y = 0, sum_xy = 0, sum_xx = 0;

            sortedScores.forEach((score: any, index: number) => {
                const x = index + 1;
                const y = score.score;
                sum_x += x;
                sum_y += y;
                sum_xy += x * y;
                sum_xx += x * x;
            });

            const slope = (n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x * sum_x);
            const oldestScore = sortedScores[0].score;
            const newestScore = sortedScores[sortedScores.length - 1].score;
            const scoreChange = newestScore - oldestScore;

            if (slope > 2 || scoreChange > 10) {
                trend = '显著进步';
                trendDescription = `整体呈上升趋势，最近成绩比初期提高了${scoreChange.toFixed(1)}分`;
            } else if (slope > 0.5 || scoreChange > 5) {
                trend = '进步';
                trendDescription = `稳步提升中，最近成绩比初期提高了${scoreChange.toFixed(1)}分`;
            } else if (slope < -2 || scoreChange < -10) {
                trend = '显著退步';
                trendDescription = `整体呈下降趋势，最近成绩比初期下降了${Math.abs(scoreChange).toFixed(1)}分`;
            } else if (slope < -0.5 || scoreChange < -5) {
                trend = '退步';
                trendDescription = `有所下滑，最近成绩比初期下降了${Math.abs(scoreChange).toFixed(1)}分`;
            } else {
                trend = '稳定';
                trendDescription = `成绩保持稳定，波动范围在${Math.abs(scoreChange).toFixed(1)}分以内`;
            }
        }

        // Process Exam History
        let examHistoryText = '';
        if (examHistory.results && examHistory.results.length > 0) {
            const exams: { [key: string]: any[] } = {};
            examHistory.results.forEach((row: any) => {
                if (!exams[row.exam_name]) {
                    exams[row.exam_name] = [];
                }
                exams[row.exam_name].push(row);
            });

            for (const [examName, subjects] of Object.entries(exams)) {
                examHistoryText += `\n${examName} (${subjects[0].exam_date}):`;
                subjects.forEach((subject: any) => {
                    examHistoryText += ` ${subject.subject_name} ${subject.score}/${subject.full_score}分;`;
                });
            }
        } else {
            examHistoryText = '\n暂无考试记录';
        }

        // 3. Construct Prompt
        const randomSeed = force_regenerate ? `(Random Seed: ${Math.random().toString(36).substring(7)})` : '';

        const systemPrompt = `你是一位经验丰富、富有爱心的班主任。请根据提供的学生数据，撰写一段150字左右的期末评语。
要求：
1. 语气温和、诚恳，多用鼓励性语言。
2. 客观评价学生的学习情况，既要肯定成绩和进步，也要委婉指出不足。
3. 结合具体的优势科目和薄弱科目提出建设性的建议。
4. 评语结构清晰，逻辑通顺。
5. 只返回评语内容，不要包含任何解释、标题或额外信息。
6. 以"${student.name}同学："开头。
7. 不要输出你的思考过程，直接输出最终的评语内容。
8. 严禁以"好的"、"我需要"、"首先"、"用户"等词语开头。
9. 直接输出以"${student.name}同学："开头的评语内容。
10. 不要提及具体的分数，只需概括性地描述表现。
11. 不要分析数据矛盾，直接根据提供的信息撰写评语。`;

        const userPrompt = `学生信息：
- 姓名：${student.name}
- 班级：${student.class_name}
- 平均分：${avgScore.toFixed(1)}
- 成绩趋势：${trend} (${trendDescription})
- 优势科目：${strongSubjects}
- 薄弱科目：${weakSubjects}

考试记录：${examHistoryText}

${randomSeed}
请严格按照以下格式生成评语：
${student.name}同学：[150字左右的评语内容，语气温和诚恳，多用鼓励性语言，客观评价学习情况，肯定成绩和进步，委婉指出不足，结合具体科目给出建议]`;

        console.log('System Prompt:', systemPrompt);
        console.log('User Prompt:', userPrompt);

        // 4. Call AI Model (ModelScope DeepSeek-V3.2)
        try {
            console.log('Calling AI model deepseek-ai/DeepSeek-V3.2');

            const apiKey = c.env.DASHSCOPE_API_KEY;
            if (!apiKey) {
                throw new Error('DASHSCOPE_API_KEY is missing');
            }

            let comment = '评语生成失败';

            try {
                console.log('Calling ModelScope API...');
                const startTime = Date.now();

                const response = await fetch('https://api-inference.modelscope.cn/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'deepseek-ai/DeepSeek-V3.2',
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userPrompt }
                        ],
                        // Enable thinking (DeepSeek specific)
                        enable_thinking: true
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('ModelScope API Error:', response.status, errorText);
                    throw new Error(`ModelScope API Error: ${response.status} ${response.statusText}`);
                }

                const data: any = await response.json();
                const endTime = Date.now();
                console.log(`AI response received in ${endTime - startTime}ms`);

                // Log reasoning content if available (for debugging)
                if (data.choices?.[0]?.message?.reasoning_content) {
                    console.log('Reasoning Content:', data.choices[0].message.reasoning_content);
                }

                // Extract content
                if (data.choices?.[0]?.message?.content) {
                    comment = data.choices[0].message.content;
                } else {
                    console.error('Invalid response structure:', JSON.stringify(data));
                }

                // Clean up the comment
                if (typeof comment === 'string' && comment !== '评语生成失败') {
                    comment = comment.trim();
                    // Remove any potential markdown code blocks
                    comment = comment.replace(/^```[\s\S]*?\n/, '').replace(/\n```$/, '');

                    // Check if comment starts correctly
                    if (!comment.startsWith(`${student.name}同学：`) && !comment.startsWith(`"${student.name}同学：`)) {
                        // Sometimes models wrap in quotes or miss the prefix
                        console.log('Comment prefix mismatch, attempting to fix...');
                        // If it doesn't start with the name but is a valid comment, we might want to keep it or prepend the name
                        // For now, let's just log it.
                    }
                }

            } catch (aiCallError: any) {
                console.error('AI call error:', aiCallError);
                comment = `评语生成失败: ${aiCallError.message}`;
            }

            console.log('Final Comment:', comment);

            // Ensure comment is a string and valid
            if (typeof comment !== 'string' || comment.length < 10 || comment.includes('评语生成失败')) {
                // Don't save failed comments
                return c.json({
                    success: false,
                    comment: comment,
                    cached: false
                });
            }

            // 6. Save to KV and DB
            if (comment !== '评语生成失败') {
                try {
                    console.log('Updating KV cache for student_id:', student_id);
                    await c.env.KV.put(cacheKey, comment, { expirationTtl: 3600 });

                    await c.env.DB.prepare(`
                        INSERT INTO ai_comments (student_id, comment, metadata)
                        VALUES (?, ?, ?)
                    `).bind(
                        student_id,
                        comment,
                        JSON.stringify({
                            avg_score: avgScore.toFixed(1),
                            trend,
                            strong_subjects: strongSubjects,
                            weak_subjects: weakSubjects,
                            model: 'deepseek-ai/DeepSeek-V3.2'
                        })
                    ).run();
                } catch (saveError) {
                    console.warn('Failed to save comment:', saveError);
                }
            }

            return c.json({
                success: true,
                comment: comment,
                cached: false,
                metadata: {
                    student_name: student.name,
                    avg_score: avgScore.toFixed(1),
                    trend,
                    strong_subjects: strongSubjects,
                    weak_subjects: weakSubjects
                }
            });

        } catch (aiError: any) {
            console.error('AI generation error:', aiError);
            throw new AppError(`AI调用失败: ${aiError.message || 'Unknown error'}`, 500);
        }

    } catch (error) {
        console.error('Generate comment error:', error);
        throw new AppError('Failed to generate comment', 500);
    }
})

// Get comment history for a student
ai.get('/comments/:studentId', async (c) => {
    const studentId = parseInt(c.req.param('studentId'));
    const user = c.get('user')

    if (isNaN(studentId)) {
        throw new AppError('Invalid student ID', 400);
    }

    // 权限校验
    const studentInfo = await c.env.DB.prepare('SELECT class_id FROM students WHERE id = ?').bind(studentId).first<any>()
    if (!studentInfo) return c.json({ error: 'Student not found' }, 404)
    if (!await checkClassAccess(c.env.DB, user, studentInfo.class_id)) {
        return c.json({ error: 'Forbidden' }, 403)
    }

    try {
        const result = await c.env.DB.prepare(`
            SELECT id, exam_id, comment, metadata, edited, created_at, updated_at
            FROM ai_comments 
            WHERE student_id = ? 
            ORDER BY created_at DESC
        `).bind(studentId).all() as any;

        return c.json({
            success: true,
            comments: result.results || []
        });
    } catch (error) {
        console.error('Get comment history error:', error);
        throw new AppError('Failed to get comment history', 500);
    }
});

// Update a comment
ai.put('/comments/:id', async (c) => {
    const id = parseInt(c.req.param('id'));
    const { comment } = await c.req.json();
    const user = c.get('user')

    // 权限校验：拿到评论对应的学生班级
    const commentInfo = await c.env.DB.prepare(`
        SELECT s.class_id 
        FROM ai_comments ac 
        JOIN students s ON ac.student_id = s.id 
        WHERE ac.id = ?
    `).bind(id).first<any>()

    if (!commentInfo) return c.json({ error: 'Comment not found' }, 404)
    if (!await checkClassAccess(c.env.DB, user, commentInfo.class_id)) {
        return c.json({ error: 'Forbidden' }, 403)
    }

    if (isNaN(id)) {
        throw new AppError('Invalid comment ID', 400);
    }

    if (!comment) {
        throw new AppError('Comment content is required', 400);
    }

    try {
        await c.env.DB.prepare(`
            UPDATE ai_comments 
            SET comment = ?, edited = 1, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).bind(comment, id).run();

        return c.json({
            success: true
        });
    } catch (error) {
        console.error('Update comment error:', error);
        throw new AppError('Failed to update comment', 500);
    }
});

// Delete a comment
ai.delete('/comments/:id', async (c) => {
    const id = parseInt(c.req.param('id'));

    if (isNaN(id)) {
        throw new AppError('Invalid comment ID', 400);
    }

    try {
        const user = c.get('user')

        // 权限校验
        const commentInfo = await c.env.DB.prepare(`
            SELECT s.class_id 
            FROM ai_comments ac 
            JOIN students s ON ac.student_id = s.id 
            WHERE ac.id = ?
        `).bind(id).first<any>()

        if (!commentInfo) return c.json({ error: 'Comment not found' }, 404)
        if (!await checkClassAccess(c.env.DB, user, commentInfo.class_id)) {
            return c.json({ error: 'Forbidden' }, 403)
        }

        await c.env.DB.prepare(`
            DELETE FROM ai_comments WHERE id = ?
        `).bind(id).run();

        return c.json({
            success: true
        });
    } catch (error) {
        console.error('Delete comment error:', error);
        throw new AppError('Failed to delete comment', 500);
    }
});

export default ai