import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { AppError } from '../utils/AppError'
import { Env } from '../types'

type Bindings = {
    DB: D1Database
    AI: Ai
}

const ai = new Hono<{ Bindings: Env }>()

// Apply auth middleware
ai.use('*', authMiddleware)

// Generate student comment
ai.post('/generate-comment', async (c) => {
    const { student_id, exam_ids } = await c.req.json()

    try {
        console.log('Starting AI comment generation for student_id:', student_id);
        
        // 1. Check KV cache first
        const cacheKey = `ai_comment_${student_id}`;
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

        // 2. Get student info
        const student = await c.env.DB.prepare(`
            SELECT s.id, s.name, c.name as class_name
            FROM students s
            JOIN classes c ON s.class_id = c.id
            WHERE s.id = ?
        `).bind(student_id).first() as any;

        if (!student) {
            throw new AppError('Student not found', 404)
        }

        console.log('Student info:', student);

        // 3. Get student's average score and subject analysis
        const scoreResult = await c.env.DB.prepare(`
            SELECT 
                AVG(s.score) as avg_score,
                COUNT(s.score) as total_exams
            FROM scores s
            WHERE s.student_id = ?
        `).bind(student_id).first() as any;

        const avgScore = scoreResult?.avg_score || 0;
        console.log('Average score:', avgScore);

        // 4. Get subject-wise performance
        const subjectScores = await c.env.DB.prepare(`
            SELECT 
                c.name as course_name,
                AVG(s.score) as avg_score
            FROM scores s
            JOIN courses c ON s.course_id = c.id
            WHERE s.student_id = ?
            GROUP BY c.id, c.name
            ORDER BY avg_score DESC
        `).bind(student_id).all() as any;

        console.log('Subject scores:', subjectScores);

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

        // 5. Enhanced trend analysis
        let trend = '稳定';
        let trendDescription = '成绩保持稳定';

        // Get all scores for trend analysis
        const allScoresResult = await c.env.DB.prepare(`
            SELECT 
                s.score,
                e.exam_date
            FROM scores s
            JOIN exams e ON s.exam_id = e.id
            WHERE s.student_id = ?
            ORDER BY e.exam_date ASC
        `).bind(student_id).all() as any;

        const allScores = allScoresResult.results || [];
        console.log('All scores for trend analysis:', allScores);

        if (allScores.length >= 3) {
            // Sort scores by date to analyze chronological progression
            const sortedScores = [...allScores].sort((a: any, b: any) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime());

            // Calculate overall trend using linear regression slope
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

            // Also calculate recent vs oldest performance
            const oldestScore = sortedScores[0].score;
            const newestScore = sortedScores[sortedScores.length - 1].score;
            const scoreChange = newestScore - oldestScore;

            // Determine trend based on both slope and score change
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

        // 6. Construct prompt with more detailed student data
        // First, let's get more detailed exam history for the student
        const examHistory = await c.env.DB.prepare(`
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
        `).bind(student_id).all() as any;

        // Format the exam history for the prompt
        let examHistoryText = '';
        if (examHistory.results && examHistory.results.length > 0) {
            // Group by exam
            const exams: { [key: string]: any[] } = {};
            examHistory.results.forEach((row: any) => {
                if (!exams[row.exam_name]) {
                    exams[row.exam_name] = [];
                }
                exams[row.exam_name].push(row);
            });

            // Format each exam
            for (const [examName, subjects] of Object.entries(exams)) {
                examHistoryText += `\n${examName} (${subjects[0].exam_date}):`;
                subjects.forEach((subject: any) => {
                    examHistoryText += ` ${subject.subject_name} ${subject.score}/${subject.full_score}分;`;
                });
            }
        } else {
            examHistoryText = '\n暂无考试记录';
        }

        const prompt = `你是一位资深教师，请根据以下学生数据生成一段150字左右的期末评语。要求：客观、具体、有建设性，语言温和鼓励。只需返回评语内容，不要包含任何解释、思考过程或其他内容。评语应以学生姓名开头，直接描述学生的表现和建议。

学生信息：
- 姓名：${student.name}
- 班级：${student.class_name}
- 最近考试平均分：${avgScore.toFixed(1)}分
- 成绩趋势：${trend} (${trendDescription})
- 优势科目：${strongSubjects}
- 薄弱科目：${weakSubjects}

详细考试记录：${examHistoryText}

请生成期末评语：`;

        console.log('Generated prompt:', prompt);
        console.log('Prompt length:', prompt.length);

        // 7. Call AI with @cf/openai/gpt-oss-20b model
        try {
            console.log('Calling AI model @cf/openai/gpt-oss-20b with prompt:', prompt);
            const response = await c.env.AI.run('@cf/openai/gpt-oss-20b' as any, {
                input: prompt,
                max_tokens: 200,
                temperature: 0.7
            }) as any

            console.log('AI response:', JSON.stringify(response, null, 2));

            // Handle the complex response format from @cf/openai/gpt-oss-20b
            let comment = '评语生成失败';

            // Check if response has output array with messages
            if (response.output && Array.isArray(response.output)) {
                // Look for the message with type 'message' and role 'assistant'
                const messageOutput = response.output.find((item: any) =>
                    item.type === 'message' && item.role === 'assistant' && item.content);

                if (messageOutput && Array.isArray(messageOutput.content)) {
                    // Look for the output_text content
                    const textContent = messageOutput.content.find((content: any) =>
                        content.type === 'output_text' && content.text);

                    if (textContent && textContent.text) {
                        comment = textContent.text;
                    }
                }
            }

            // Fallback to simpler formats
            if (comment === '评语生成失败') {
                comment = response.response ||
                    response.result?.response ||
                    response.result ||
                    (typeof response === 'string' ? response : '评语生成失败') ||
                    '评语生成失败';
            }

            // Ensure comment is a string
            if (typeof comment !== 'string') {
                comment = '评语生成失败';
            }

            // 8. Save to KV cache
            if (comment !== '评语生成失败') {
                try {
                    await c.env.KV.put(cacheKey, comment, { expirationTtl: 3600 }); // Cache for 1 hour
                } catch (kvError) {
                    console.warn('KV cache save failed:', kvError);
                }
                
                // 9. Save to database for history
                try {
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
                            weak_subjects: weakSubjects
                        })
                    ).run();
                } catch (dbError) {
                    console.warn('Database save failed:', dbError);
                }
            }

            return c.json({
                success: comment !== '评语生成失败',
                comment: comment.trim(),
                cached: false,
                metadata: {
                    student_name: student.name,
                    avg_score: avgScore.toFixed(1),
                    trend,
                    strong_subjects: strongSubjects,
                    weak_subjects: weakSubjects
                }
            })
        } catch (aiError: any) {
            console.error('AI generation error:', aiError);
            console.error('AI error details:', {
                name: aiError.name,
                message: aiError.message,
                stack: aiError.stack,
                cause: aiError.cause
            });

            // Return a more detailed error message
            const errorMessage = `AI调用失败: ${aiError.message || aiError.toString()}`;
            throw new AppError(errorMessage, 500);
        }
    } catch (error) {
        console.error('Generate comment error:', error)
        throw new AppError('Failed to generate comment', 500)
    }
})

export default ai