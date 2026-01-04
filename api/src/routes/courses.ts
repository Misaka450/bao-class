import { Hono } from 'hono'
import { Course } from '../db/types'
import { logAction } from '../utils/logger'
import { JWTPayload } from '../types'
import { authMiddleware, checkRole } from '../middleware/auth'

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
    const page = Number(c.req.query('page') || '1')
    const pageSize = Number(c.req.query('pageSize') || '10')
    const name = c.req.query('name')
    const grade = c.req.query('grade')

    let query = 'FROM courses'
    const params: (string | number)[] = []
    const conditions: string[] = []

    if (name) {
        conditions.push('name LIKE ?')
        params.push(`%${name}%`)
    }
    if (grade) {
        conditions.push('grade = ?')
        params.push(Number(grade))
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ')
    }

    // Get total count
    const totalResult = await c.env.DB.prepare(`SELECT COUNT(*) as count ${query}`).bind(...params).first<{ count: number }>()
    const total = totalResult?.count || 0

    // Get paginated data
    const offset = (page - 1) * pageSize
    const results = await c.env.DB.prepare(`SELECT * ${query} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
        .bind(...params, pageSize, offset)
        .all<Course>()

    return c.json({
        data: results.results,
        total,
        success: true
    })
})

courses.post('/', checkRole('admin'), async (c) => {
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

courses.put('/:id', checkRole('admin'), async (c) => {
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

courses.delete('/:id', checkRole('admin'), async (c) => {
    const id = c.req.param('id')
    const { success } = await c.env.DB.prepare('DELETE FROM courses WHERE id = ?').bind(id).run()

    if (success) {
        const user = c.get('user')
        await logAction(c.env.DB, user.userId, user.username, 'DELETE_COURSE', 'course', Number(id), { id })
    }

    return success ? c.json({ message: 'Course deleted' }) : c.json({ error: 'Failed to delete course' }, 500)
})

export default courses
