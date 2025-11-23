import { Hono } from 'hono'
import { Course } from '../db/types'
import { logAction } from '../utils/logger'
import { JWTPayload } from '../types'
import { authMiddleware } from '../middleware/auth'

type Bindings = {
    DB: D1Database
}

type Variables = {
    user: JWTPayload
}

const courses = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Apply auth middleware to all routes
courses.use('*', authMiddleware)

courses.get('/', async (c) => {
    const { results } = await c.env.DB.prepare('SELECT * FROM courses ORDER BY created_at DESC').all<Course>()
    return c.json(results)
})

courses.post('/', async (c) => {
    const { name, grade } = await c.req.json()
    if (!name || !grade) return c.json({ error: 'Name and grade are required' }, 400)

    const { success, meta } = await c.env.DB.prepare(
        'INSERT INTO courses (name, grade) VALUES (?, ?)'
    ).bind(name, grade).run()

    if (success) {
        const user = c.get('user')
        await logAction(c.env.DB, user.userId, user.username, 'CREATE_COURSE', 'course', meta.last_row_id, { name, grade })
    }

    return success ? c.json({ message: 'Course created' }, 201) : c.json({ error: 'Failed to create course' }, 500)
})

courses.put('/:id', async (c) => {
    const id = c.req.param('id')
    const { name, grade } = await c.req.json()

    const { success } = await c.env.DB.prepare(
        'UPDATE courses SET name = ?, grade = ? WHERE id = ?'
    ).bind(name, grade, id).run()

    if (success) {
        const user = c.get('user')
        await logAction(c.env.DB, user.userId, user.username, 'UPDATE_COURSE', 'course', Number(id), { name, grade })
    }

    return success ? c.json({ message: 'Course updated' }) : c.json({ error: 'Failed to update course' }, 500)
})

courses.delete('/:id', async (c) => {
    const id = c.req.param('id')
    const { success } = await c.env.DB.prepare('DELETE FROM courses WHERE id = ?').bind(id).run()

    if (success) {
        const user = c.get('user')
        await logAction(c.env.DB, user.userId, user.username, 'DELETE_COURSE', 'course', Number(id), { id })
    }

    return success ? c.json({ message: 'Course deleted' }) : c.json({ error: 'Failed to delete course' }, 500)
})

export default courses
