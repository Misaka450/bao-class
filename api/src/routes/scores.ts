import { Hono } from 'hono'
import { logAction } from '../utils/logger'
import { JWTPayload } from '../types'
import { authMiddleware, checkRole } from '../middleware/auth'
import { checkClassAccess, checkCourseAccess } from '../utils/auth'


type Bindings = {
    DB: D1Database
}

type Variables = {
    user: JWTPayload
}

const scores = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Apply auth middleware to all routes
scores.use('*', authMiddleware)

// Get scores for a specific exam (all courses) and class
scores.get('/', async (c) => {
    const examId = c.req.query('exam_id')
    const classId = c.req.query('class_id')
    const courseId = c.req.query('course_id')

    if (!examId || !classId) {
        return c.json({ error: 'Exam ID and Class ID are required' }, 400)
    }

    const user = c.get('user')
    if (!await checkClassAccess(c.env.DB, user, Number(classId))) {
        return c.json({ error: 'Forbidden' }, 403)
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

        const params: (string | number)[] = [classId, examId]

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

    const user = c.get('user')

    // 权限校验：首先拿到 exam 对应的 class_id
    const exam = await c.env.DB.prepare('SELECT class_id FROM exams WHERE id = ?').bind(exam_id).first<any>()
    if (!exam) return c.json({ error: 'Exam not found' }, 404)

    // 校验对该班级该科目的修改权限
    if (!await checkCourseAccess(c.env.DB, user, exam.class_id, course_id)) {
        return c.json({ error: 'Forbidden: 无法在该班级录入此科目分数' }, 403)
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
        const user = c.get('user')
        // 获取成绩详情以获取 class_id 和 course_id
        const scoreInfo = await c.env.DB.prepare(`
            SELECT s.class_id, sc.course_id 
            FROM scores sc
            JOIN students s ON sc.student_id = s.id
            WHERE sc.id = ?
        `).bind(id).first<any>()

        if (!scoreInfo) return c.json({ error: 'Score not found' }, 404)

        if (!await checkCourseAccess(c.env.DB, user, scoreInfo.class_id, scoreInfo.course_id)) {
            return c.json({ error: 'Forbidden' }, 403)
        }

        const { success } = await c.env.DB.prepare('DELETE FROM scores WHERE id = ?').bind(id).run()

        if (success) {
            await logAction(c.env.DB, user.userId, user.username, 'DELETE_SCORE', 'score', Number(id), { id })
        }

        return success ? c.json({ message: 'Score deleted' }) : c.json({ error: 'Failed to delete score' }, 500)
    } catch (error) {
        return c.json({ error: 'Failed to delete score' }, 500)
    }
})

export default scores
