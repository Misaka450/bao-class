import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { checkClassAccess } from '../utils/auth'
import { AppError } from '../utils/AppError'
import { Env, JWTPayload } from '../types'

const analysis = new Hono<{ Bindings: Env; Variables: { user: JWTPayload } }>()

// Apply auth middleware to all routes
analysis.use('*', authMiddleware)

// Class Focus Group Analysis
analysis.get('/class/focus/:classId', async (c) => {
    const classId = Number(c.req.param('classId'))
    const user = c.get('user')

    if (!await checkClassAccess(c.env.DB, user, classId)) {
        return c.json({ error: 'Forbidden' }, 403)
    }

    try {
        // Get latest exam for this specific class
        const latestExam = await c.env.DB.prepare(`
            SELECT e.id FROM exams e
            JOIN scores s ON e.id = s.exam_id
            JOIN students st ON s.student_id = st.id
            WHERE st.class_id = ?
            ORDER BY e.exam_date DESC LIMIT 1
        `).bind(classId).first<any>()
        const examId = latestExam?.id as number

        // 1. Critical Students (Borderline Pass/Fail or Excellent)
        // 55-62 (Danger of failing), 85-92 (Close to excellent) - 扩大范围以匹配更多学生
        // 移除30天日期限制，直接使用最新考试
        const criticalStudents = await c.env.DB.prepare(`
            SELECT DISTINCT st.id, st.name, 'critical' as type, s.score, c.name as subject
            FROM students st
            JOIN scores s ON st.id = s.student_id
            JOIN exams e ON s.exam_id = e.id
            JOIN courses c ON s.course_id = c.id
            WHERE st.class_id = ?
            AND s.exam_id = ?
            AND ((s.score BETWEEN 55 AND 62) OR (s.score BETWEEN 85 AND 92))
        `).bind(classId, examId || 0).all()

        // Check if we have enough exams for trend analysis (at least 2)
        const exams = await c.env.DB.prepare(`
            SELECT DISTINCT e.id 
            FROM exams e 
            JOIN scores s ON e.id = s.exam_id 
            JOIN students st ON s.student_id = st.id 
            WHERE st.class_id = ?
        `).bind(classId).all()

        let regressingStudents: any = { results: [] }
        let fluctuatingStudents: any = { results: [] }

        if (exams.results && exams.results.length >= 2) {
            // 2. Regressing Students (Rank dropped significantly)
            // Compare overall average score vs latest exam average score
            regressingStudents = await c.env.DB.prepare(`
                WITH StudentExamAverages AS (
                    SELECT s.student_id, st.name, s.exam_id, e.exam_date, AVG(s.score) as avg_score
                    FROM scores s
                    JOIN exams e ON s.exam_id = e.id
                    JOIN students st ON s.student_id = st.id
                    WHERE st.class_id = ?
                    GROUP BY s.student_id, s.exam_id
                ),
                StudentStats AS (
                    SELECT 
                        student_id, 
                        name,
                        AVG(avg_score) as overall_avg,
                        (
                            SELECT avg_score 
                            FROM StudentExamAverages sea2 
                            WHERE sea2.student_id = sea1.student_id 
                            ORDER BY exam_date DESC 
                            LIMIT 1
                        ) as latest_score
                    FROM StudentExamAverages sea1
                    GROUP BY student_id
                )
                SELECT student_id as id, name, 'regressing' as type, 
                (overall_avg - latest_score) as drop_amount
                FROM StudentStats
                WHERE drop_amount > 5
            `).bind(classId).all()

            // 3. Fluctuating Students (High Variance in specific subjects)
            // Difference between Max and Min score for the SAME subject across exams
            fluctuatingStudents = await c.env.DB.prepare(`
                SELECT st.id, st.name, 'fluctuating' as type, c.name as subject,
                (MAX(s.score) - MIN(s.score)) as score_diff
                FROM scores s
                JOIN students st ON s.student_id = st.id
                JOIN courses c ON s.course_id = c.id
                JOIN exams e ON s.exam_id = e.id
                WHERE st.class_id = ?
                GROUP BY s.student_id, s.course_id
                HAVING score_diff > 10
            `).bind(classId).all()
        }

        // 4. Imbalanced Students (Total Rank Top 50% BUT has failed subject)
        // Simplified: Total Score > Class Avg BUT has score < 60
        const imbalancedStudents = await c.env.DB.prepare(`
            SELECT DISTINCT st.id, st.name, 'imbalanced' as type,
            s.score as failed_score, c.name as subject
            FROM students st
            JOIN scores s ON st.id = s.student_id
            JOIN courses c ON s.course_id = c.id
            WHERE st.class_id = ?
            AND s.exam_id = ?
            AND s.score < 60
            AND st.id IN (
                SELECT student_id 
                FROM scores 
                WHERE exam_id = ?
                GROUP BY student_id 
                HAVING SUM(score) > (
                    SELECT AVG(total) FROM (
                        SELECT SUM(score) as total 
                        FROM scores 
                        WHERE exam_id = ?
                        GROUP BY student_id
                    )
                )
            )
        `).bind(classId, examId || 0, examId || 0, examId || 0).all()

        return c.json({
            critical: criticalStudents.results,
            regressing: regressingStudents.results,
            fluctuating: fluctuatingStudents.results,
            imbalanced: imbalancedStudents.results
        })
    } catch (error) {
        console.error('Focus group error:', error)
        throw new AppError('Failed to generate focus group', 500)
    }
})

// Exam Quality Analysis
analysis.get('/exam/quality/:examId', async (c) => {
    const examId = c.req.param('examId')
    const user = c.get('user')

    try {
        // 校验对该考试所属班级的权限
        const exam = await c.env.DB.prepare('SELECT class_id FROM exams WHERE id = ?').bind(examId).first<any>()
        if (!exam) return c.json({ error: 'Exam not found' }, 404)
        if (!await checkClassAccess(c.env.DB, user, exam.class_id)) {
            return c.json({ error: 'Forbidden' }, 403)
        }

        // Get all courses for this exam
        const courses = await c.env.DB.prepare(`
            SELECT ec.course_id, c.name, ec.full_score
            FROM exam_courses ec
            JOIN courses c ON ec.course_id = c.id
            WHERE ec.exam_id = ?
        `).bind(examId).all()

        const results = []

        for (const course of (courses.results || [])) {
            // Get all scores for this course in this exam
            const scoresResult = await c.env.DB.prepare(`
                SELECT score 
                FROM scores 
                WHERE exam_id = ? AND course_id = ?
                ORDER BY score DESC
            `).bind(examId, course.course_id).all()

            const scores = (scoresResult.results || []).map((s: any) => s.score)
            const count = scores.length

            if (count === 0) continue

            // 1. Basic Stats
            const sum = scores.reduce((a, b) => a + b, 0)
            const avg = sum / count
            const max = Math.max(...scores)
            const min = Math.min(...scores)

            // 2. Standard Deviation
            const squareDiffs = scores.map(score => Math.pow(score - avg, 2))
            const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / count
            const stdDev = Math.sqrt(avgSquareDiff)

            // 3. Difficulty (P) = Avg / FullScore
            // P > 0.7 (Easy), 0.4-0.7 (Medium), < 0.4 (Hard)
            const fullScore = Number(course.full_score) || 100
            const difficulty = avg / fullScore

            // 4. Discrimination (D) = (High Group Avg - Low Group Avg) / FullScore
            // Top 27% vs Bottom 27%
            const groupSize = Math.floor(count * 0.27)
            let discrimination = 0

            if (groupSize > 0) {
                const highGroup = scores.slice(0, groupSize)
                const lowGroup = scores.slice(count - groupSize)

                const highAvg = highGroup.reduce((a, b) => a + b, 0) / groupSize
                const lowAvg = lowGroup.reduce((a, b) => a + b, 0) / groupSize

                discrimination = (highAvg - lowAvg) / fullScore
            }

            results.push({
                course_id: course.course_id,
                course_name: course.name,
                full_score: fullScore,
                stats: {
                    count,
                    avg: Number(avg.toFixed(1)),
                    max,
                    min,
                    std_dev: Number(stdDev.toFixed(1)),
                    difficulty: Number(difficulty.toFixed(2)),
                    discrimination: Number(discrimination.toFixed(2))
                }
            })
        }

        return c.json(results)
    } catch (error) {
        console.error('Exam quality analysis error:', error)
        throw new AppError('Failed to analyze exam quality', 500)
    }
})

// Get or Generate Class AI Diagnostic Report
analysis.get('/class/report/:classId/:examId', async (c) => {
    const classId = Number(c.req.param('classId'))
    const examId = c.req.param('examId')
    const user = c.get('user')

    if (!await checkClassAccess(c.env.DB, user, classId)) {
        return c.json({ error: 'Forbidden' }, 403)
    }

    try {
        // 1. Check Cache
        const cached = await c.env.DB.prepare(`
            SELECT report_content FROM ai_class_reports 
            WHERE class_id = ? AND exam_id = ?
        `).bind(classId, examId).first()

        if (cached) {
            return c.json({ report: cached.report_content, cached: true })
        }

        // 2. Aggregate Data for AI
        // Get class name
        const classInfo = await c.env.DB.prepare('SELECT name FROM classes WHERE id = ?').bind(classId).first()
        // Get exam name
        const examInfo = await c.env.DB.prepare('SELECT name FROM exams WHERE id = ?').bind(examId).first()

        // Get course stats for this class in this exam
        const stats = await c.env.DB.prepare(`
            SELECT c.name as course_name, 
                   AVG(s.score) as avg_score, 
                   MAX(s.score) as max_score, 
                   MIN(s.score) as min_score,
                   COUNT(CASE WHEN s.score >= 60 THEN 1 END) * 100.0 / COUNT(*) as pass_rate
            FROM scores s
            JOIN courses c ON s.course_id = c.id
            JOIN students st ON s.student_id = st.id
            WHERE st.class_id = ? AND s.exam_id = ?
            GROUP BY s.course_id
        `).bind(classId, examId).all()

        if (!stats.results || stats.results.length === 0) {
            return c.json({ error: 'No data available for this class and exam' }, 404)
        }

        // 3. Construct Prompt
        const dataStr = stats.results.map((r: any) =>
            `- ${r.course_name}: 平均分 ${Number(r.avg_score).toFixed(1)}, 最高 ${r.max_score}, 最低 ${r.min_score}, 及格率 ${Number(r.pass_rate).toFixed(1)}%`
        ).join('\n')

        const prompt = `你是一位经验丰富的资深教育数据分析专家。请根据以下班级考试数据，生成一份专业、深入且具有指导价值的学情诊断报告。

班级：${classInfo?.name}
考试：${examInfo?.name}

各科成绩详情：
${dataStr}

报告要求：
1. **结构完整**：必须包含以下四个部分，每部分都要充实有料：
   - 【整体学情分析】：综合评价班级整体表现，包括平均分水平、及格率分布、学科均衡度等
   - 【优势亮点】：详细分析表现突出的科目，说明优势所在及可能的原因
   - 【薄弱环节】：深入剖析存在问题的科目，指出具体短板（如分数段分布、两极分化等）
   - 【改进建议】：针对薄弱科目提出3-5条具体可行的教学改进措施

2. **内容深度**：
   - 不要只罗列数据，要深入分析数据背后的教学问题
   - 结合平均分、最高分、最低分、及格率等多维度数据进行综合判断
   - 关注分数分布的均衡性、两极分化现象
   - 改进建议要具体可操作，不要泛泛而谈

3. **语言风格**：专业严谨但易读，适合教师阅读和参考

4. **字数要求**：总字数 400-500 字，确保内容充实完整

5. **格式要求**：使用 Markdown 格式，加粗标题`

        // 4. Call AI (ModelScope DeepSeek-V3.2)
        console.log('Calling AI model deepseek-ai/DeepSeek-V3.2')

        let report = '未能生成报告';

        try {
            const apiKey = c.env.JWT_SECRET; // 这里原来写错了，应该是从环境变量拿，但 Env 接口里有 DASHSCOPE_API_KEY
            const dashScopeKey = c.env.DASHSCOPE_API_KEY;
            if (!dashScopeKey) {
                throw new Error('DASHSCOPE_API_KEY is missing');
            }

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
                        { role: 'system', content: '你是一个资深的教育数据分析专家，擅长从考试数据中挖掘深层次的教学问题，并提出切实可行的改进方案。请使用中文，提供专业、深入、有价值的分析报告。' },
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: 2000, // Increase token limit for detailed reports
                    temperature: 0.7,
                    enable_thinking: true
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`ModelScope API Error: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data: any = await response.json();
            const endTime = Date.now();
            console.log(`AI response received in ${endTime - startTime}ms`);

            // Log reasoning content if available
            if (data.choices?.[0]?.message?.reasoning_content) {
                console.log('Reasoning Content:', data.choices[0].message.reasoning_content);
            }

            // Extract content
            if (data.choices?.[0]?.message?.content) {
                report = data.choices[0].message.content;
            } else {
                console.error('Invalid response structure:', JSON.stringify(data));
            }

            // Clean up the report
            if (typeof report === 'string' && report !== '未能生成报告') {
                report = report.trim();
                console.log('Final report length:', report.length);
            }

        } catch (aiError: any) {
            console.error('AI generation error:', aiError);
            report = `未能生成报告: ${aiError.message}`;
        }

        // 5. Store in Cache
        await c.env.DB.prepare(`
            INSERT INTO ai_class_reports (class_id, exam_id, report_content)
            VALUES (?, ?, ?)
            ON CONFLICT(class_id, exam_id) DO UPDATE SET
            report_content = excluded.report_content,
            updated_at = CURRENT_TIMESTAMP
        `).bind(classId, examId, report).run()

        return c.json({ report, cached: false })
    } catch (error: any) {
        console.error('AI Report error details:', error.message, error.stack)
        throw new AppError('Failed to generate AI report', 500)
    }
})

// Refresh AI Diagnostic Report
analysis.post('/class/report/refresh', async (c) => {
    const { classId, examId } = await c.req.json()
    const user = c.get('user')

    if (!await checkClassAccess(c.env.DB, user, Number(classId))) {
        return c.json({ error: 'Forbidden' }, 403)
    }

    try {
        // Delete cache to force regenerate on next GET
        await c.env.DB.prepare(`
            DELETE FROM ai_class_reports 
            WHERE class_id = ? AND exam_id = ?
        `).bind(classId, examId).run()

        return c.json({ success: true, message: 'Cache cleared, will regenerate on next view' })
    } catch (error) {
        console.error('Refresh report error:', error)
        throw new AppError('Failed to refresh report', 500)
    }
})

// Get class score distribution for exam
analysis.get('/class/:classId/exam/:examId/distribution', async (c) => {
    const classId = parseInt(c.req.param('classId'))
    const examId = parseInt(c.req.param('examId'))

    if (!classId || !examId) {
        return c.json({ error: 'Invalid classId or examId' }, 400)
    }

    try {
        // Get all subjects for this exam
        const subjectsResult = await c.env.DB.prepare(`
            SELECT DISTINCT c.id, c.name
            FROM courses c
            JOIN exam_courses ec ON c.id = ec.course_id
            WHERE ec.exam_id = ?
            ORDER BY c.name
        `).bind(examId).all()

        if (!subjectsResult.results || subjectsResult.results.length === 0) {
            return c.json([])
        }

        const subjects = subjectsResult.results as Array<{ id: number; name: string }>

        // Get all scores for this exam and class
        const scoresResult = await c.env.DB.prepare(`
            SELECT sc.course_id, sc.score
            FROM scores sc
            JOIN students s ON sc.student_id = s.id
            WHERE sc.exam_id = ? AND s.class_id = ?
        `).bind(examId, classId).all()

        const scores = scoresResult.results as Array<{ course_id: number; score: number }>

        // Aggregate distribution
        const distribution = subjects.map(subject => {
            const subjectScores = scores.filter(s => s.course_id === subject.id).map(s => s.score)

            let fail = 0
            let pass = 0
            let good = 0
            let excellent = 0

            subjectScores.forEach(score => {
                if (score < 60) fail++
                else if (score < 75) pass++
                else if (score < 85) good++
                else excellent++
            })

            return {
                subject: subject.name,
                fail,
                pass,
                good,
                excellent
            }
        })

        return c.json(distribution)
    } catch (error) {
        console.error('Distribution error:', error)
        return c.json({ error: 'Failed to fetch distribution data' }, 500)
    }
})

export default analysis
