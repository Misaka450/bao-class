import { Hono } from 'hono'

type Bindings = {
    DB: D1Database
}

const trend = new Hono<{ Bindings: Bindings }>()

/**
 * 学生趋势分析
 * GET /api/analysis/student/trend/:studentId
 * 返回学生的成绩趋势、排名变化和稳定性分析
 */
trend.get('/:studentId', async (c) => {
    const studentId = c.req.param('studentId')
    const limit = parseInt(c.req.query('limit') || '10', 10)

    try {
        // 获取学生信息
        const student = await c.env.DB.prepare(`
            SELECT s.*, c.name as class_name, c.id as class_id
            FROM students s
            JOIN classes c ON s.class_id = c.id
            WHERE s.id = ?
        `).bind(studentId).first()

        if (!student) {
            return c.json({ error: 'Student not found' }, 404)
        }

        // 获取学生的考试成绩历史（最近N次）
        const examHistory = await c.env.DB.prepare(`
            SELECT 
                e.id as exam_id,
                e.name as exam_name,
                e.exam_date,
                SUM(s.score) as total_score,
                COUNT(s.id) as subject_count,
                AVG(s.score) as average_score
            FROM exams e
            JOIN scores s ON e.id = s.exam_id
            WHERE s.student_id = ? AND e.class_id = ?
            GROUP BY e.id, e.name, e.exam_date
            ORDER BY e.exam_date DESC
            LIMIT ?
        `).bind(studentId, student.class_id, limit).all()

        if (!examHistory.results || examHistory.results.length === 0) {
            return c.json({
                student: {
                    id: student.id,
                    name: student.name,
                    class_name: student.class_name
                },
                exams: [],
                trend: 'insufficient_data',
                stability: 'unknown',
                variance: 0
            })
        }

        // 计算每次考试的班级排名
        const examsWithRank = []
        for (const exam of examHistory.results as any[]) {
            // 获取该考试的班级所有学生总分
            const classScores = await c.env.DB.prepare(`
                SELECT 
                    st.id,
               SUM(sc.score) as total_score
                FROM students st
                JOIN scores sc ON st.id = sc.student_id
                WHERE sc.exam_id = ? AND st.class_id = ?
                GROUP BY st.id
                ORDER BY total_score DESC
            `).bind(exam.exam_id, student.class_id).all()

            // 计算该学生的排名
            let rank = 1
            for (const classScore of classScores.results as any[]) {
                if (classScore.id === student.id) {
                    break
                }
                rank++
            }

            examsWithRank.push({
                exam_id: exam.exam_id,
                exam_name: exam.exam_name,
                exam_date: exam.exam_date,
                total_score: exam.total_score,
                average_score: parseFloat(Number(exam.average_score).toFixed(2)),
                class_rank: rank,
                total_students: classScores.results.length
            })
        }

        // 反转数组(按时间正序排列)
        examsWithRank.reverse()

        // 分析趋势(基于最近的考试成绩变化)
        let trend_direction = 'stable'
        if (examsWithRank.length >= 2) {
            const recent = examsWithRank.slice(-3) // 最近3次
            const scores = recent.map(e => e.total_score)

            // 简单线性趋势判断
            const firstHalf = scores.slice(0, Math.ceil(scores.length / 2))
            const secondHalf = scores.slice(Math.ceil(scores.length / 2))

            const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
            const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

            if (secondAvg > firstAvg + 5) {
                trend_direction = 'improving'
            } else if (secondAvg < firstAvg - 5) {
                trend_direction = 'declining'
            }
        }

        // 计算成绩稳定性(方差)
        const scores = examsWithRank.map(e => e.average_score)
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length
        const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length
        const stdDev = Math.sqrt(variance)

        // 根据标准差判断稳定性
        let stability = 'high'
        if (stdDev > 10) {
            stability = 'low'
        } else if (stdDev > 5) {
            stability = 'medium'
        }

        return c.json({
            student: {
                id: student.id,
                name: student.name,
                student_id: student.student_id,
                class_name: student.class_name
            },
            exams: examsWithRank,
            trend: trend_direction,
            stability,
            variance: parseFloat(variance.toFixed(2)),
            std_deviation: parseFloat(stdDev.toFixed(2))
        })
    } catch (error) {
        console.error('Student trend analysis error:', error)
        return c.json({
            error: 'Failed to analyze student trend',
            details: error instanceof Error ? error.message : '未知错误'
        }, 500)
    }
})

export default trend
