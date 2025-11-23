import { Hono } from 'hono'
import { logAction } from '../utils/logger'
import { JWTPayload } from '../types'

type Bindings = {
    DB: D1Database
}

type Variables = {
    user: JWTPayload
}

const scores = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Get scores for a specific exam (all courses) and class
scores.get('/', async (c) => {
    const examId = c.req.query('exam_id')
    const classId = c.req.query('class_id')
    const courseId = c.req.query('course_id')

    if (!examId || !classId) {
        return c.json({ error: 'Exam ID and Class ID are required' }, 400)
    }

    try {
        let query = `
            SELECT 
                s.id as student_id, 
                s.name, 
                s.student_id as student_code,
                c.id as course_id,
                c.name as course_name,
                sc.score, 
                sc.id as score_id
            FROM students s
            CROSS JOIN exam_courses ec
            JOIN courses c ON ec.course_id = c.id
            LEFT JOIN scores sc ON s.id = sc.student_id 
                AND sc.exam_id = ec.exam_id 
                AND sc.course_id = ec.course_id
            WHERE s.class_id = ? 
                AND ec.exam_id = ?
        `

        const params: any[] = [classId, examId]

        if (courseId) {
            query += ` AND c.id = ?`
            params.push(courseId)
        }

        query += ` ORDER BY s.student_id ASC, c.name ASC`

        const { results } = await c.env.DB.prepare(query).bind(...params).all()
        return c.json(results)
    } catch (error) {
        console.error('Get scores error:', error)
        return c.json({ error: 'Failed to get scores' }, 500)
    }
})

// Batch update/insert scores
scores.post('/batch', async (c) => {
    const { exam_id, course_id, scores: scoreList } = await c.req.json<{
        exam_id: number,
        course_id: number,
        scores: { student_id: number, score: number }[]
    }>()

    if (!exam_id || !course_id || !Array.isArray(scoreList)) {
        return c.json({ error: 'exam_id, course_id, and scores array are required' }, 400)
    }

    try {
        let updatedCount = 0
        for (const item of scoreList) {
            // Check if score exists
            const existing = await c.env.DB.prepare(
                'SELECT id FROM scores WHERE student_id = ? AND exam_id = ? AND course_id = ?'
            ).bind(item.student_id, exam_id, course_id).first()

            if (existing) {
                await c.env.DB.prepare(
                    'UPDATE scores SET score = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
                ).bind(item.score, existing.id).run()
            } else {
                await c.env.DB.prepare(
                    'INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (?, ?, ?, ?)'
                ).bind(item.student_id, exam_id, course_id, item.score).run()
            }
            updatedCount++
        }

        const user = c.get('user')
        await logAction(c.env.DB, user.userId, user.username, 'BATCH_UPDATE_SCORES', 'score', null, { exam_id, course_id, count: updatedCount })

        return c.json({ message: 'Scores updated successfully' })
    } catch (error) {
        console.error('Batch update scores error:', error)
        return c.json({ error: 'Failed to update scores' }, 500)
    }
})

// Delete a score
scores.delete('/:id', async (c) => {
    const id = c.req.param('id')

    try {
        const { success } = await c.env.DB.prepare('DELETE FROM scores WHERE id = ?').bind(id).run()

        if (success) {
            const user = c.get('user')
            await logAction(c.env.DB, user.userId, user.username, 'DELETE_SCORE', 'score', Number(id), { id })
        }

        return success ? c.json({ message: 'Score deleted' }) : c.json({ error: 'Failed to delete score' }, 500)
    } catch (error) {
        return c.json({ error: 'Failed to delete score' }, 500)
    }
})

export default scores
