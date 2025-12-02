import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { AppError } from '../utils/AppError'

type Bindings = {
    DB: D1Database
    AI: Ai
}

const ai = new Hono<{ Bindings: Bindings }>()

// Apply auth middleware
ai.use('*', authMiddleware)

// Generate student comment
ai.post('/generate-comment', async (c) => {
    const { student_id, exam_ids } = await c.req.json()

    try {
        console.log('Starting AI comment generation for student_id:', student_id);
        
        // 1. Fetch student info
        const student = await c.env.DB.prepare(
            'SELECT s.*, cl.name as class_name FROM students s JOIN classes cl ON s.class_id = cl.id WHERE s.id = ?'
        ).bind(student_id).first()

        if (!student) {
            throw new AppError('Student not found', 404)
        }
        
        console.log('Found student:', student.name);

        // 2. Fetch recent exam scores
        let query = `
            SELECT 
                e.name as exam_name,
                e.exam_date,
                c.name as course_name,
                s.score,
                ec.full_score
            FROM scores s
            JOIN exams e ON s.exam_id = e.id
            JOIN courses c ON s.course_id = c.id
            JOIN exam_courses ec ON s.exam_id = ec.exam_id AND s.course_id = ec.course_id
            WHERE s.student_id = ?`;

        const params: any[] = [student_id];

        if (exam_ids && exam_ids.length > 0) {
            query += ` AND s.exam_id IN (${exam_ids.map(() => '?').join(',')})`;
            params.push(...exam_ids);
        }

        query += ` ORDER BY e.exam_date DESC`;

        const scores = await c.env.DB.prepare(query).bind(...params).all()
        console.log('Fetched scores:', scores.results?.length || 0);

        // 3. Calculate statistics
        const allScores = (scores.results || []) as any[]
        const avgScore = allScores.length > 0 ? allScores.reduce((sum, s) => sum + s.score, 0) / allScores.length : 0

        let strongSubjects = '';
        let weakSubjects = '';

        if (allScores.length > 0) {
            // Group by course to find strong/weak subjects
            const courseStats: Record<string, { total: number, count: number }> = {}
            allScores.forEach((s: any) => {
                if (!courseStats[s.course_name]) {
                    courseStats[s.course_name] = { total: 0, count: 0 }
                }
                courseStats[s.course_name].total += s.score
                courseStats[s.course_name].count++
            })

            const courseAvgs = Object.entries(courseStats).map(([name, stats]) => ({
                name,
                avg: stats.total / stats.count
            })).sort((a, b) => b.avg - a.avg)

            strongSubjects = courseAvgs.slice(0, 2).map(c => c.name).join('、')
            weakSubjects = courseAvgs.slice(-2).map(c => c.name).join('、')
        }

        // Enhanced trend analysis with more comprehensive progress/decline detection
        let trend = '稳定';
        let trendDescription = '成绩保持稳定';

        if (allScores.length >= 3) {
            // Sort scores by date to analyze chronological progression
            const sortedScores = [...allScores].sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime());

            // Calculate overall trend using linear regression slope
            const n = sortedScores.length;
            let sum_x = 0, sum_y = 0, sum_xy = 0, sum_xx = 0;

            sortedScores.forEach((score, index) => {
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

        // 4. Construct prompt with more detailed student data
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
        `).bind(student_id).all();

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

期末评语：`

        console.log('Generated prompt:', prompt);
        console.log('Prompt length:', prompt.length);

        // 5. Call AI
        try {
            console.log('Calling AI model with prompt:', prompt);
            // Add a timeout to prevent hanging
            const response = await Promise.race([
                c.env.AI.run('@cf/qwen/qwen3-30b-a3b-fp8' as any, {
                    input: prompt,
                    max_tokens: 200,
                    temperature: 0.7
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('AI调用超时')), 30000)
                )
            ]) as any;

            console.log('AI response:', JSON.stringify(response, null, 2));

            // Handle different response formats from various AI models
            let comment = '评语生成失败';

            // Try simple response format first (used by Qwen and many models)
            if (response.response && typeof response.response === 'string') {
                comment = response.response;
            }
            // Try result.response format
            else if (response.result?.response && typeof response.result.response === 'string') {
                comment = response.result.response;
            }
            // Try direct string response
            else if (typeof response === 'string') {
                comment = response;
            }
            // Try choices array format (used by OpenAI compatible models)
            else if (response.choices && Array.isArray(response.choices) && response.choices.length > 0) {
                const choice = response.choices[0];
                if (choice.message?.content) {
                    comment = choice.message.content;
                } else if (choice.text) {
                    comment = choice.text;
                }
            }
            // Try complex output array format (used by some models)
            else if (response.output && Array.isArray(response.output)) {
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
            // Try Qwen model specific format
            else if (response.data && typeof response.data === 'string') {
                comment = response.data;
            }
            // Try another Qwen format with message property
            else if (response.message && typeof response.message === 'string') {
                comment = response.message;
            }

            // Ensure comment is a string
            if (typeof comment !== 'string' || comment === '评语生成失败') {
                console.error('Failed to parse AI response. Response structure:', JSON.stringify(response, null, 2));
                throw new Error('AI 模型返回了无效的响应格式');
            }

            return c.json({
                success: true,
                comment: comment.trim(),
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
            // 如果是超时错误，返回更具体的错误信息
            if (aiError.message === 'AI调用超时') {
                throw new AppError('AI服务响应超时，请稍后重试', 500);
            }
            throw new AppError(errorMessage, 500);
        }
    } catch (error) {
        console.error('Generate comment error:', error)
        throw new AppError('Failed to generate comment', 500)
    }
})

export default ai
