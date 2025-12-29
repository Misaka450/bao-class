import { Hono } from 'hono'

type Bindings = {
    DB: D1Database
}

const rankings = new Hono<{ Bindings: Bindings }>()

// Get top students for an exam
rankings.get('/top/:examId', async (c) => {
    const examId = c.req.param('examId')
    const courseId = c.req.query('courseId')
    const limit = c.req.query('limit') || '5'

    try {
        let query: string
        const params: (string | number)[] = []

        if (courseId) {
            query = `
                SELECT 
                    s.id,
                    s.name,
                    s.student_id as student_number,
                    sc.score as average_score
                FROM students s
                JOIN scores sc ON s.id = sc.student_id
                WHERE sc.exam_id = ? AND sc.course_id = ?
                ORDER BY sc.score DESC
                LIMIT ?
            `
            params.push(examId, courseId, Number(limit))
        } else {
            query = `
                SELECT 
                    s.id,
                    s.name,
                    s.student_id as student_number,
                    SUM(sc.score) as average_score
                FROM students s
                JOIN scores sc ON s.id = sc.student_id
                WHERE sc.exam_id = ?
                GROUP BY s.id, s.name, s.student_id
                ORDER BY average_score DESC
                LIMIT ?
            `
            params.push(examId, Number(limit))
        }

        const result = await c.env.DB.prepare(query).bind(...params).all()

        const formattedResults = result.results.map((student: any) => ({
            ...student,
            average_score: parseFloat(Number(student.average_score || 0).toFixed(1))
        }))

        return c.json(formattedResults)
    } catch (error) {
        console.error('Top students error:', error)
        return c.json({ error: 'Failed to get top students' }, 500)
    }
})

export default rankings
