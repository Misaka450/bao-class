import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { AppError } from '../utils/AppError'

type Bindings = {
    DB: D1Database
    AI: Ai
}

const analysis = new Hono<{ Bindings: Bindings }>()

// Apply auth middleware to all routes
analysis.use('*', authMiddleware)

// Class Focus Group Analysis
analysis.get('/class/focus/:classId', async (c) => {
    const classId = c.req.param('classId')

    try {
        // Get latest exam for this specific class
        const latestExam = await c.env.DB.prepare(`
            SELECT e.id FROM exams e
            JOIN scores s ON e.id = s.exam_id
            JOIN students st ON s.student_id = st.id
            WHERE st.class_id = ?
            ORDER BY e.exam_date DESC LIMIT 1
        `).bind(classId).first()
        const examId = latestExam?.id

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

    try {
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
    const classId = c.req.param('classId')
    const examId = c.req.param('examId')

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
        const examInfo = await c.env.DB.prepare('SELECT exam_name FROM exams WHERE id = ?').bind(examId).first()

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

        const prompt = `你是一位专业的资深教学分析专家。请根据以下班级考试数据，生成一份客观、深入且具有指导意义的学情诊断报告。
班级：${classInfo?.name}
考试：${examInfo?.exam_name}
各科表现：
${dataStr}

要求：
1. 语言专业、亲切，适合老师阅读。
2. 包含：【学情概览】、【优势分析】、【薄弱环节】、【教学行动建议】四个部分。
3. 总字数在 300 字左右。
4. 使用 Markdown 格式。
5. 不要包含名单，只分析整体趋势。`

        // 4. Call AI
        const response: any = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
            messages: [
                { role: 'system', content: '你是一个擅长教育数据分析的 AI 专家，请用中文作答。' },
                { role: 'user', content: prompt }
            ]
        })

        const report = response.response || response.text || "未能生成报告"

        // 5. Store in Cache
        await c.env.DB.prepare(`
            INSERT INTO ai_class_reports (class_id, exam_id, report_content)
            VALUES (?, ?, ?)
            ON CONFLICT(class_id, exam_id) DO UPDATE SET
            report_content = excluded.report_content,
            updated_at = CURRENT_TIMESTAMP
        `).bind(classId, examId, report).run()

        return c.json({ report, cached: false })
    } catch (error) {
        console.error('AI Report error:', error)
        throw new AppError('Failed to generate AI report', 500)
    }
})

// Refresh AI Diagnostic Report
analysis.post('/class/report/refresh', async (c) => {
    const { classId, examId } = await c.req.json()

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

export default analysis
