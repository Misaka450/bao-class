import { Hono } from 'hono'
import { Student } from '../db/types'
import { logAction } from '../utils/logger'
import { JWTPayload, Env } from '../types'
import { authMiddleware } from '../middleware/auth'
import { getAuthorizedClassIds, checkClassAccess } from '../utils/auth'

type Variables = {
    user: JWTPayload
}

const students = new Hono<{ Bindings: Env; Variables: Variables }>()

// 所有students路由都需要认证
students.use('*', authMiddleware)

students.get('/', async (c) => {
    const user = c.get('user')
    const authorizedIds = await getAuthorizedClassIds(c.env.DB, user)

    if (authorizedIds !== 'ALL' && authorizedIds.length === 0) return c.json([])

    const classIdFromQuery = c.req.query('class_id')
    let query = 'SELECT * FROM students'
    const params: (string | number)[] = []

    if (authorizedIds === 'ALL') {
        if (classIdFromQuery) {
            query += ' WHERE class_id = ?'
            params.push(classIdFromQuery)
        }
    } else {
        // 过滤用户有权访问的班级
        const filterIds = classIdFromQuery
            ? authorizedIds.filter(id => id === Number(classIdFromQuery))
            : authorizedIds

        if (filterIds.length === 0) return c.json([])

        query += ` WHERE class_id IN (${filterIds.map(() => '?').join(',')})`
        params.push(...filterIds)
    }

    query += ' ORDER BY created_at DESC'

    const { results } = await c.env.DB.prepare(query).bind(...params).all<Student>()
    return c.json(results)
})

students.post('/', async (c) => {
    const user = c.get('user')
    const { name, student_id, class_id, parent_id } = await c.req.json()

    // 权限校验：只有管理员或该班班主任/老师可以添加学生
    if (!await checkClassAccess(c.env.DB, user, Number(class_id))) {
        return c.json({ error: 'Forbidden' }, 403)
    }

    if (!name || !student_id || !class_id) return c.json({ error: 'Name, Student ID, and Class ID are required' }, 400)

    try {
        const { success, meta } = await c.env.DB.prepare(
            'INSERT INTO students (name, student_id, class_id, parent_id) VALUES (?, ?, ?, ?)'
        ).bind(name, student_id, class_id, parent_id || null).run()

        if (success) {
            await logAction(c.env.DB, user.userId, user.username, 'CREATE_STUDENT', 'student', meta.last_row_id, { name, student_id, class_id })
        }

        return success ? c.json({ message: 'Student created' }, 201) : c.json({ error: 'Failed to create student' }, 500)
    } catch (e) {
        return c.json({ error: 'Student ID already exists' }, 409)
    }
})

students.put('/:id', async (c) => {
    const id = c.req.param('id')
    const user = c.get('user')
    const { name, student_id, class_id, parent_id } = await c.req.json()

    // 拿到原本的学生信息，确认原本班级是否有权限
    const originalStudent = await c.env.DB.prepare('SELECT class_id FROM students WHERE id = ?').bind(id).first<any>()
    if (!originalStudent) return c.json({ error: 'Student not found' }, 404)

    if (!await checkClassAccess(c.env.DB, user, Number(originalStudent.class_id))) {
        return c.json({ error: 'Forbidden' }, 403)
    }

    // 如果修改了班级，确认新班级是否有权限
    if (class_id && class_id !== originalStudent.class_id) {
        if (!await checkClassAccess(c.env.DB, user, Number(class_id))) {
            return c.json({ error: 'Forbidden' }, 403)
        }
    }

    const { success } = await c.env.DB.prepare(
        'UPDATE students SET name = ?, student_id = ?, class_id = ?, parent_id = ? WHERE id = ?'
    ).bind(name, student_id, class_id, parent_id || null, id).run()

    if (success) {
        await logAction(c.env.DB, user.userId, user.username, 'UPDATE_STUDENT', 'student', Number(id), { name, student_id, class_id })
    }

    return success ? c.json({ message: 'Student updated' }) : c.json({ error: 'Failed to update student' }, 500)
})

students.delete('/:id', async (c) => {
    const id = c.req.param('id')
    const user = c.get('user')

    const originalStudent = await c.env.DB.prepare('SELECT class_id FROM students WHERE id = ?').bind(id).first<any>()
    if (!originalStudent) return c.json({ error: 'Student not found' }, 404)

    // 只有管理员或该班班主任可以删除学生
    if (user.role !== 'admin') {
        const cls = await c.env.DB.prepare('SELECT teacher_id FROM classes WHERE id = ?').bind(originalStudent.class_id).first<any>()
        if (!cls || cls.teacher_id !== user.userId) {
            return c.json({ error: 'Forbidden: 只有管理员或班主任可以删除学生' }, 403)
        }
    }

    try {
        // First delete associated scores
        await c.env.DB.prepare('DELETE FROM scores WHERE student_id = ?').bind(id).run()

        // Then delete the student
        const { success } = await c.env.DB.prepare('DELETE FROM students WHERE id = ?').bind(id).run()

        if (success) {
            await logAction(c.env.DB, user.userId, user.username, 'DELETE_STUDENT', 'student', Number(id), { id })
        }

        return success ? c.json({ message: 'Student deleted' }) : c.json({ error: 'Failed to delete student' }, 500)
    } catch (error) {
        console.error('Delete student error:', error)
        return c.json({ error: 'Failed to delete student' }, 500)
    }
})

export default students
