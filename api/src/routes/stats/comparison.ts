import { Hono } from 'hono'

type Bindings = {
    DB: D1Database
}

const comparison = new Hono<{ Bindings: Bindings }>()

// Class comparison (班级对比)
comparison.get('/classes', async (c) => {
    const examId = c.req.query('examId')
    const courseId = c.req.query('courseId')

    if (!examId) {
        return c.json({ error: 'examId is required' }, 400)
    }

    try {
        let query: string
        let params: any[]

        if (courseId) {
            // 单科对比
            query = `
                SELECT 
                    cl.id,
                    cl.name,
                    AVG(s.score) as average_score,
                    CAST(SUM(CASE WHEN s.score >= 60 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) AS REAL) as pass_rate,
                    CAST(SUM(CASE WHEN s.score >= 90 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) AS REAL) as excellent_rate
                FROM classes cl
                JOIN students st ON cl.id = st.class_id
                JOIN scores s ON st.id = s.student_id
                WHERE s.exam_id = ? AND s.course_id = ?
                GROUP BY cl.id, cl.name
                ORDER BY average_score DESC
            `
            params = [examId, courseId]
        } else {
            // 总分对比(所有科目)
            query = `
                SELECT 
                    cl.id,
                    cl.name,
                    AVG(total_score) as average_score,
                    CAST(SUM(CASE WHEN total_score >= 180 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) AS REAL) as pass_rate,
                    CAST(SUM(CASE WHEN total_score >= 270 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) AS REAL) as excellent_rate
                FROM classes cl
                JOIN students st ON cl.id = st.class_id
                JOIN (
                    SELECT student_id, SUM(score) as total_score
                    FROM scores
                    WHERE exam_id = ?
                    GROUP BY student_id
                ) s ON st.id = s.student_id
                GROUP BY cl.id, cl.name
                ORDER BY average_score DESC
            `
            params = [examId]
        }

        const result = await c.env.DB.prepare(query).bind(...params).all()

        return c.json(result.results.map((r: any) => ({
            id: r.id,
            name: r.name,
            average_score: parseFloat(Number(r.average_score || 0).toFixed(2)),
            pass_rate: parseFloat(Number(r.pass_rate || 0).toFixed(2)),
            excellent_rate: parseFloat(Number(r.excellent_rate || 0).toFixed(2))
        })))
    } catch (error) {
        console.error('Class comparison error:', error)
        return c.json({ error: 'Failed to get class comparison' }, 500)
    }
})

export default comparison
