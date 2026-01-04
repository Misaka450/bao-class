import { Hono } from 'hono'
import { Class } from '../db/types'
import { logAction } from '../utils/logger'
import { JWTPayload } from '../types'
import { authMiddleware, checkRole } from '../middleware/auth'
import { getAuthorizedClassIds, checkClassAccess } from '../utils/auth'

type Bindings = {
    DB: D1Database
}

type Variables = {
    user: JWTPayload
}

const classes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Apply auth middleware to all routes
classes.use('*', authMiddleware)

classes.get('/', async (c) => {
    const page = Number(c.req.query('page') || '1')
    const pageSize = Number(c.req.query('pageSize') || '10')
    const name = c.req.query('name')
    const grade = c.req.query('grade')

    let query = 'FROM classes'
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
    const results = await c.env.DB.prepare(`SELECT * ${query} ORDER BY grade DESC, name ASC LIMIT ? OFFSET ?`)
        .bind(...params, pageSize, offset)
        .all<Class>()

    return c.json({
        data: results.results,
        total,
        success: true
    })
})

classes.post('/', checkRole(['admin', 'teacher']), async (c) => {
    const { name, grade, teacher_id } = await c.req.json()
    if (!name || !grade) return c.json({ error: 'Name and grade are required' }, 400)

    const user = c.get('user')

    // If user is not admin, they can only create class for themselves
    const targetTeacherId = user.role === 'admin' ? (teacher_id || null) : user.userId

    const { success, meta } = await c.env.DB.prepare(
        'INSERT INTO classes (name, grade, teacher_id) VALUES (?, ?, ?)'
    ).bind(name, grade, targetTeacherId).run()

    if (success) {
        await logAction(c.env.DB, user.userId, user.username, 'CREATE_CLASS', 'class', meta.last_row_id, { name, grade })
    }

    return success ? c.json({ message: 'Class created' }, 201) : c.json({ error: 'Failed to create class' }, 500)
})

classes.put('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const user = c.get('user')

    // 只有管理员或该班班主任可以修改班级信息
    const isAuthorized = user.role === 'admin' || await (async () => {
        const cls = await c.env.DB.prepare('SELECT teacher_id FROM classes WHERE id = ?').bind(id).first()
        return cls && cls.teacher_id === user.userId
    })()

    if (!isAuthorized) return c.json({ error: 'Forbidden' }, 403)

    const { name, grade, teacher_id } = await c.req.json()

    // Non-admin cannot change the teacher_id
    const targetTeacherId = user.role === 'admin' ? (teacher_id || null) : user.userId

    const { success } = await c.env.DB.prepare(
        'UPDATE classes SET name = ?, grade = ?, teacher_id = ? WHERE id = ?'
    ).bind(name, grade, targetTeacherId, id).run()

    if (success) {
        await logAction(c.env.DB, user.userId, user.username, 'UPDATE_CLASS', 'class', id, { name, grade })
    }

    return success ? c.json({ message: 'Class updated' }) : c.json({ error: 'Failed to update class' }, 500)
})

classes.delete('/:id', checkRole(['admin', 'teacher']), async (c) => {
    const id = c.req.param('id')
    const user = c.get('user')

    // Check ownership if not admin
    if (user.role !== 'admin') {
        const cls = await c.env.DB.prepare('SELECT teacher_id FROM classes WHERE id = ?').bind(id).first<Class>()
        if (!cls || cls.teacher_id !== user.userId) {
            return c.json({ error: 'Forbidden: You can only delete your own classes' }, 403)
        }
    }

    try {
        // 1. Delete all scores for students in this class
        await c.env.DB.prepare(`
            DELETE FROM scores 
            WHERE student_id IN (SELECT id FROM students WHERE class_id = ?)
        `).bind(id).run()

        // 2. Delete all students in this class
        await c.env.DB.prepare('DELETE FROM students WHERE class_id = ?').bind(id).run()

        // 3. Delete all scores for exams in this class (cleanup any remaining scores linked to exams of this class)
        await c.env.DB.prepare(`
            DELETE FROM scores 
            WHERE exam_id IN (SELECT id FROM exams WHERE class_id = ?)
        `).bind(id).run()

        // 4. Delete all exams in this class (exam_courses cascade)
        await c.env.DB.prepare('DELETE FROM exams WHERE class_id = ?').bind(id).run()

        // 5. Finally delete the class
        const { success } = await c.env.DB.prepare('DELETE FROM classes WHERE id = ?').bind(id).run()

        if (success) {
            await logAction(c.env.DB, user.userId, user.username, 'DELETE_CLASS', 'class', Number(id), { id })
        }

        return success ? c.json({ message: 'Class deleted' }) : c.json({ error: 'Failed to delete class' }, 500)
    } catch (error) {
        console.error('Delete class error:', error)
        return c.json({ error: 'Failed to delete class' }, 500)
    }
})

// --- Subject Teacher Management ---

// Get subject teachers for a class
classes.get('/:id/teachers', async (c) => {
    const id = c.req.param('id')
    const user = c.get('user')

    // Auth check: Admin, Head Teacher, or the teacher themselves (though they might not need to see others)
    // For simplicity, allow anyone with class access (including subject teachers) to see the list?
    // Let's stick to Admin and Head Teacher for management purposes, but maybe Subject Teachers want to see colleagues.
    // Safe default: Check class access.
    if (!await checkClassAccess(c.env.DB, user, Number(id))) {
        return c.json({ error: 'Forbidden' }, 403)
    }

    try {
        const results = await c.env.DB.prepare(`
            SELECT cct.id, cct.course_id, c.name as course_name, cct.teacher_id, u.name as teacher_name
            FROM class_course_teachers cct
            JOIN courses c ON cct.course_id = c.id
            JOIN users u ON cct.teacher_id = u.id
            WHERE cct.class_id = ?
        `).bind(id).all()
        return c.json(results.results)
    } catch (error) {
        return c.json({ error: 'Failed to fetch subject teachers' }, 500)
    }
})

// Assign a subject teacher
classes.post('/:id/teachers', async (c) => {
    const id = Number(c.req.param('id'))
    const { course_id, teacher_id } = await c.req.json()
    const user = c.get('user')

    // Only Admin or Head Teacher of this class can assign subject teachers
    const isHeadTeacher = await c.env.DB.prepare('SELECT 1 FROM classes WHERE id = ? AND teacher_id = ?').bind(id, user.userId).first()
    if (user.role !== 'admin' && !isHeadTeacher) {
        return c.json({ error: 'Forbidden: Only Admin or Head Teacher can assign teachers' }, 403)
    }

    if (!course_id || !teacher_id) {
        return c.json({ error: 'course_id and teacher_id are required' }, 400)
    }

    try {
        await c.env.DB.prepare(
            'INSERT INTO class_course_teachers (class_id, course_id, teacher_id) VALUES (?, ?, ?)'
        ).bind(id, course_id, teacher_id).run()

        await logAction(c.env.DB, user.userId, user.username, 'ASSIGN_TEACHER', 'class', id, { course_id, teacher_id })

        return c.json({ message: 'Teacher assigned successfully' }, 201)
    } catch (error: any) {
        if (error.message && error.message.includes('UNIQUE constraint failed')) {
            return c.json({ error: 'Teacher already assigned to this course' }, 409)
        }
        return c.json({ error: 'Failed to assign teacher' }, 500)
    }
})

// Remove a subject teacher
classes.delete('/:id/teachers/:teacherId/course/:courseId', async (c) => {
    const classId = Number(c.req.param('id'))
    const teacherId = Number(c.req.param('teacherId'))
    const courseId = Number(c.req.param('courseId'))
    const user = c.get('user')

    // Only Admin or Head Teacher
    const isHeadTeacher = await c.env.DB.prepare('SELECT 1 FROM classes WHERE id = ? AND teacher_id = ?').bind(classId, user.userId).first()
    if (user.role !== 'admin' && !isHeadTeacher) {
        return c.json({ error: 'Forbidden' }, 403)
    }

    try {
        const { success } = await c.env.DB.prepare(
            'DELETE FROM class_course_teachers WHERE class_id = ? AND teacher_id = ? AND course_id = ?'
        ).bind(classId, teacherId, courseId).run()

        if (success) {
            await logAction(c.env.DB, user.userId, user.username, 'REMOVE_TEACHER', 'class', classId, { teacherId, courseId })
        }

        return success ? c.json({ message: 'Teacher removed' }) : c.json({ error: 'Failed to remove teacher' }, 404)
    } catch (error) {
        return c.json({ error: 'Failed to remove teacher' }, 500)
    }
})

export default classes
