import { Hono } from 'hono'
import { Student } from '../db/types'
import { logAction } from '../utils/logger'
import { JWTPayload, Env } from '../types'
import { authMiddleware } from '../middleware/auth'

type Variables = {
    user: JWTPayload
}

const students = new Hono<{ Bindings: Env; Variables: Variables }>()

// 所有students路由都需要认证
students.use('*', authMiddleware)

students.get('/', async (c) => {
    const classId = c.req.query('class_id')
    let query = 'SELECT * FROM students'
    const params: (string | number)[] = []

    if (classId) {
        query += ' WHERE class_id = ?'
        params.push(classId)
    }
    query += ' ORDER BY created_at DESC'

    const { results } = await c.env.DB.prepare(query).bind(...params).all<Student>()
    return c.json(results)
})

students.post('/', async (c) => {
    const { name, student_id, class_id, parent_id } = await c.req.json()
    if (!name || !student_id || !class_id) return c.json({ error: 'Name, Student ID, and Class ID are required' }, 400)

    try {
        const { success, meta } = await c.env.DB.prepare(
            'INSERT INTO students (name, student_id, class_id, parent_id) VALUES (?, ?, ?, ?)'
        ).bind(name, student_id, class_id, parent_id || null).run()

        if (success) {
            const user = c.get('user')
            await logAction(c.env.DB, user.userId, user.username, 'CREATE_STUDENT', 'student', meta.last_row_id, { name, student_id, class_id })
        }

        return success ? c.json({ message: 'Student created' }, 201) : c.json({ error: 'Failed to create student' }, 500)
    } catch (e) {
        return c.json({ error: 'Student ID already exists' }, 409)
    }
})

students.put('/:id', async (c) => {
    const id = c.req.param('id')
    const { name, student_id, class_id, parent_id } = await c.req.json()

    const { success } = await c.env.DB.prepare(
        'UPDATE students SET name = ?, student_id = ?, class_id = ?, parent_id = ? WHERE id = ?'
    ).bind(name, student_id, class_id, parent_id || null, id).run()

    if (success) {
        const user = c.get('user')
        await logAction(c.env.DB, user.userId, user.username, 'UPDATE_STUDENT', 'student', Number(id), { name, student_id, class_id })
    }

    return success ? c.json({ message: 'Student updated' }) : c.json({ error: 'Failed to update student' }, 500)
})

students.delete('/:id', async (c) => {
    const id = c.req.param('id')
    try {
        // First delete associated scores
        await c.env.DB.prepare('DELETE FROM scores WHERE student_id = ?').bind(id).run()

        // Then delete the student
        const { success } = await c.env.DB.prepare('DELETE FROM students WHERE id = ?').bind(id).run()

        if (success) {
            const user = c.get('user')
            await logAction(c.env.DB, user.userId, user.username, 'DELETE_STUDENT', 'student', Number(id), { id })
        }

        return success ? c.json({ message: 'Student deleted' }) : c.json({ error: 'Failed to delete student' }, 500)
    } catch (error) {
        console.error('Delete student error:', error)
        return c.json({ error: 'Failed to delete student' }, 500)
    }
})

export default students
