import { Hono } from 'hono'

type Bindings = {
    DB: D1Database
}

const progress = new Hono<{ Bindings: Bindings }>()

// Get most improved/declined students (comparing with previous exam)
progress.get('/:examId', async (c) => {
    const examId = c.req.param('examId')
    const courseId = c.req.query('courseId')

    try {
        // Get current exam info
        const currentExam = await c.env.DB.prepare(`
            SELECT class_id, exam_date FROM exams WHERE id = ?
        `).bind(examId).first<{ class_id: string, exam_date: string }>()

        if (!currentExam) {
            return c.json({ improved: [], declined: [] })
        }

        // Get previous exam for the same class
        const previousExam = await c.env.DB.prepare(`
            SELECT id FROM exams 
            WHERE class_id = ? AND exam_date < ?
            ORDER BY exam_date DESC LIMIT 1
        `).bind(currentExam.class_id, currentExam.exam_date).first<{ id: string }>()

        if (!previousExam) {
            return c.json({ improved: [], declined: [] })
        }

        // Build query to compare scores
        let query: string
        const params: (string | number)[] = []

        if (courseId) {
            query = `
                SELECT 
                    s.id as student_id,
                    s.name as student_name,
                    curr.score as current_score,
                    prev.score as previous_score,
                    curr.score - prev.score as progress
                FROM students s
                JOIN scores curr ON s.id = curr.student_id AND curr.exam_id = ? AND curr.course_id = ?
                JOIN scores prev ON s.id = prev.student_id AND prev.exam_id = ? AND prev.course_id = ?
            `
            params.push(examId, courseId, previousExam.id, courseId)
        } else {
            query = `
                SELECT 
                    s.id as student_id,
                    s.name as student_name,
                    SUM(curr.score) as current_score,
                    SUM(prev.score) as previous_score,
                    SUM(curr.score) - SUM(prev.score) as progress
                FROM students s
                JOIN scores curr ON s.id = curr.student_id AND curr.exam_id = ?
                JOIN scores prev ON s.id = prev.student_id AND prev.exam_id = ?
                GROUP BY s.id, s.name
                HAVING COUNT(DISTINCT curr.course_id) > 0 AND COUNT(DISTINCT prev.course_id) > 0
            `
            params.push(examId, previousExam.id)
        }

        const result = await c.env.DB.prepare(query).bind(...params).all()
        const students = result.results as any[]

        const improved = students
            .filter(s => Number(s.progress) > 0)
            .sort((a, b) => Number(b.progress) - Number(a.progress))
            .slice(0, 5)

        const declined = students
            .filter(s => Number(s.progress) < 0)
            .sort((a, b) => Number(a.progress) - Number(b.progress))
            .slice(0, 5)

        return c.json({ improved, declined })
    } catch (error) {
        console.error('Progress error:', error)
        return c.json({ improved: [], declined: [] })
    }
})

export default progress
