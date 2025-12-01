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
        const scores = await c.env.DB.prepare(`
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
            WHERE s.student_id = ? 
            ${exam_ids && exam_ids.length > 0 ? 'AND s.exam_id IN (' + exam_ids.map(() => '?').join(',') + ')' : ''}
            ORDER BY e.exam_date DESC
        `).bind(student_id, ...(exam_ids || [])).all()

        // 3. Calculate statistics
        const allScores = (scores.results || []) as any[]
        const avgScore = allScores.reduce((sum, s) => sum + s.score, 0) / allScores.length

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

        const strongSubjects = courseAvgs.slice(0, 2).map(c => c.name).join('、')
        const weakSubjects = courseAvgs.slice(-2).map(c => c.name).join('、')

        // Determine trend (simple: compare first half vs second half)
        const mid = Math.floor(allScores.length / 2)
        const recentAvg = allScores.slice(0, mid).reduce((sum, s) => sum + s.score, 0) / mid
        const olderAvg = allScores.slice(mid).reduce((sum, s) => sum + s.score, 0) / (allScores.length - mid)
        const trend = recentAvg > olderAvg + 5 ? '进步' : recentAvg < olderAvg - 5 ? '退步' : '稳定'

        // 4. Construct prompt
        const prompt = `你是一位资深教师，请根据以下学生数据生成一段100字左右的期末评语。
要求：客观、具体、有建设性，语言温和鼓励。

学生信息：
- 姓名：${student.name}
- 班级：${student.class_name}
- 最近考试平均分：${avgScore.toFixed(1)}分
- 成绩趋势：${trend}
- 优势科目：${strongSubjects}
- 薄弱科目：${weakSubjects}

请生成评语（只返回评语内容，不要包含其他说明）：`

        // 5. Call AI
        const response = await c.env.AI.run('@cf/qwen/qwen1.5-14b-chat-awq', {
            messages: [
                { role: 'system', content: '你是一位经验丰富的小学教师，擅长撰写学生评语。' },
                { role: 'user', content: prompt }
            ],
            max_tokens: 200,
            temperature: 0.7
        }) as any

        const comment = response.response || response.result?.response || '评语生成失败'

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
    } catch (error) {
        console.error('Generate comment error:', error)
        throw new AppError('Failed to generate comment', 500)
    }
})

export default ai
