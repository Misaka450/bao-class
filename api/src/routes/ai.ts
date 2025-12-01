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
        // 1. Fetch student info
        const student = await c.env.DB.prepare(
            'SELECT s.*, cl.name as class_name FROM students s JOIN classes cl ON s.class_id = cl.id WHERE s.id = ?'
        ).bind(student_id).first()

        if (!student) {
            throw new AppError('Student not found', 404)
        }

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

        // 4. Calculate Semester Rank Trend
        // Get all exams for this student's class to calculate ranks
        const classExams = await c.env.DB.prepare(`
            SELECT id, name, exam_date 
            FROM exams 
            WHERE class_id = ? 
            ORDER BY exam_date ASC
        `).bind(student.class_id).all();

        let rankTrendText = '暂无排名数据';
        let startRank = null;
        let endRank = null;

        if (classExams.results && classExams.results.length >= 2) {
            const exams = classExams.results as any[];
            const firstExamId = exams[0].id;
            const lastExamId = exams[exams.length - 1].id;

            // Get rank for first exam
            const firstExamRank = await c.env.DB.prepare(`
                SELECT rank FROM (
                    SELECT student_id, RANK() OVER (ORDER BY SUM(score) DESC) as rank
                    FROM scores
                    WHERE exam_id = ?
                    GROUP BY student_id
                ) WHERE student_id = ?
            `).bind(firstExamId, student_id).first();

            // Get rank for last exam
            const lastExamRank = await c.env.DB.prepare(`
                SELECT rank FROM (
                    SELECT student_id, RANK() OVER (ORDER BY SUM(score) DESC) as rank
                    FROM scores
                    WHERE exam_id = ?
                    GROUP BY student_id
                ) WHERE student_id = ?
            `).bind(lastExamId, student_id).first();

            if (firstExamRank && lastExamRank) {
                startRank = firstExamRank.rank;
                endRank = lastExamRank.rank;
                const rankDiff = (startRank as number) - (endRank as number);

                if (rankDiff > 0) {
                    rankTrendText = `本学期排名进步显著，从期初的第${startRank}名提升至期末的第${endRank}名，前进了${rankDiff}名。`;
                } else if (rankDiff < 0) {
                    rankTrendText = `本学期排名有所下滑，从期初的第${startRank}名滑落至期末的第${endRank}名。`;
                } else {
                    rankTrendText = `本学期排名保持稳定，始终保持在第${startRank}名左右。`;
                }
            }
        }

        // 5. Construct prompt with semester context
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

        const genderText = student.gender === 'female' ? '她' : '他';

        const prompt = `你是一位经验丰富的班主任，请根据以下学生数据为${student.name}同学撰写一段**学期总结评语**。

角色设定：
- 语气：温暖、真诚、充满鼓励，像一位关爱学生的长者。
- 风格：专业但亲切，避免官僚腔调。
- 视角：回顾整个学期的成长轨迹，而不仅仅是最近一次考试。

数据分析：
- 姓名：${student.name}
- 性别：${student.gender === 'female' ? '女' : '男'}
- 班级：${student.class_name}
- 学期排名变化：${rankTrendText}
- 最近考试平均分：${avgScore.toFixed(1)}分
- 成绩趋势：${trend} (${trendDescription})
- 优势科目：${strongSubjects}
- 薄弱科目：${weakSubjects}

详细考试记录：${examHistoryText}

参考范例（Few-Shot）：
范例1（进步学生）：
"${student.name}同学本学期表现令人欣喜！从期初的沉稳到期末的爆发，${genderText}用实际行动证明了"天道酬勤"。${strongSubjects}一直是${genderText}的强项，保持得非常出色。虽然${weakSubjects}还有提升空间，但只要保持这股韧劲，下学期定能更上一层楼。老师期待看到一个更加自信的你！"

范例2（退步学生）：
"${student.name}同学本学期经历了一些起伏，老师看在眼里，急在心里。期初${genderText}的基础很扎实，但近期似乎有些松懈，导致排名有所下滑。${strongSubjects}依然有优势，说明${genderText}的学习能力没有问题。假期建议重点攻克${weakSubjects}，调整好状态。老师相信，只要找回初心，${genderText}一定能重回巅峰！"

评语结构要求（总字数约150-200字）：
1. 开场：亲切称呼，概括**本学期整体表现**。
2. 分析：重点点评**学期排名变化**和**成绩走势**，肯定努力或指出松懈。
3. 建议：针对薄弱环节提出具体的假期或下学期学习建议。
4. 结语：表达对下学期的具体期望和鼓励。

注意：
- 必须使用"${genderText}"作为第三人称代词。
- 必须提及学期初到学期末的变化。
- 直接输出评语内容，不要包含任何无关文字。`

        // 6. Call AI
        try {
            console.log('Calling AI model with prompt:', prompt);
            const response = await c.env.AI.run('@cf/openai/gpt-oss-20b' as any, {
                input: prompt,
                max_tokens: 300,
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

            return c.json({
                success: true,
                comment: comment.trim(),
                metadata: {
                    student_name: student.name,
                    avg_score: avgScore.toFixed(1),
                    trend,
                    strong_subjects: strongSubjects,
                    weak_subjects: weakSubjects,
                    rank_trend: rankTrendText
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
