import { Hono } from 'hono'

type Bindings = {
    DB: D1Database
}

const exams = new Hono<{ Bindings: Bindings }>()

// Get all exams with their courses
exams.get('/', async (c) => {
    try {
        // Get all exams with class info
        const examsResult = await c.env.DB.prepare(`
            SELECT e.*, cl.name as class_name 
            FROM exams e
            LEFT JOIN classes cl ON e.class_id = cl.id
            ORDER BY e.exam_date DESC
        `).all()

        // For each exam, get its associated courses
        const examsWithCourses = await Promise.all(
            examsResult.results.map(async (exam: any) => {
                const coursesResult = await c.env.DB.prepare(`
                    SELECT ec.*, c.name as course_name
                    FROM exam_courses ec
                    JOIN courses c ON ec.course_id = c.id
                    WHERE ec.exam_id = ?
                `).bind(exam.id).all()

                return {
                    ...exam,
                    courses: coursesResult.results
                }
            })
        )

        return c.json(examsWithCourses)
    } catch (error) {
        return c.json({ error: 'Failed to fetch exams' }, 500)
    }
})

// Get single exam with courses
exams.get('/:id', async (c) => {
    const id = c.req.param('id')

    try {
        const examResult = await c.env.DB.prepare(`
            SELECT e.*, cl.name as class_name 
            FROM exams e
            LEFT JOIN classes cl ON e.class_id = cl.id
            WHERE e.id = ?
        `).bind(id).first()

        if (!examResult) {
            return c.json({ error: 'Exam not found' }, 404)
        }

        const coursesResult = await c.env.DB.prepare(`
            SELECT ec.*, c.name as course_name
            FROM exam_courses ec
            JOIN courses c ON ec.course_id = c.id
            WHERE ec.exam_id = ?
        `).bind(id).all()

        return c.json({
            ...examResult,
            courses: coursesResult.results
        })
    } catch (error) {
        return c.json({ error: 'Failed to fetch exam' }, 500)
    }
})

// Create exam with courses
exams.post('/', async (c) => {
    const { name, class_id, exam_date, description, courses } = await c.req.json()

    if (!name || !class_id || !exam_date || !courses || !Array.isArray(courses) || courses.length === 0) {
        return c.json({ error: 'Name, class_id, exam_date, and courses are required' }, 400)
    }

    try {
        // Insert exam
        const examResult = await c.env.DB.prepare(
            'INSERT INTO exams (name, class_id, exam_date, description) VALUES (?, ?, ?, ?)'
        ).bind(name, class_id, exam_date, description || null).run()

        if (!examResult.success) {
            return c.json({ error: 'Failed to create exam' }, 500)
        }

        const examId = examResult.meta.last_row_id

        // Insert exam-course relations
        for (const course of courses) {
            await c.env.DB.prepare(
                'INSERT INTO exam_courses (exam_id, course_id, full_score) VALUES (?, ?, ?)'
            ).bind(examId, course.course_id, course.full_score || 100).run()
        }

        return c.json({ message: 'Exam created', id: examId }, 201)
    } catch (error) {
        console.error('Create exam error:', error)
        return c.json({ error: 'Failed to create exam' }, 500)
    }
})

// Update exam and its courses
exams.put('/:id', async (c) => {
    const id = c.req.param('id')
    const { name, class_id, exam_date, description, courses } = await c.req.json()

    try {
        // Update exam basic info
        const updateResult = await c.env.DB.prepare(
            'UPDATE exams SET name = ?, class_id = ?, exam_date = ?, description = ? WHERE id = ?'
        ).bind(name, class_id, exam_date, description || null, id).run()

        if (!updateResult.success) {
            return c.json({ error: 'Failed to update exam' }, 500)
        }

        // If courses are provided, update them
        if (courses && Array.isArray(courses)) {
            // Delete existing course relations
            await c.env.DB.prepare('DELETE FROM exam_courses WHERE exam_id = ?').bind(id).run()

            // Insert new relations
            for (const course of courses) {
                await c.env.DB.prepare(
                    'INSERT INTO exam_courses (exam_id, course_id, full_score) VALUES (?, ?, ?)'
                ).bind(id, course.course_id, course.full_score || 100).run()
            }
        }

        return c.json({ message: 'Exam updated' })
    } catch (error) {
        console.error('Update exam error:', error)
        return c.json({ error: 'Failed to update exam' }, 500)
    }
})

// Delete exam (cascade deletes exam_courses due to ON DELETE CASCADE, but we need to manually delete scores)
exams.delete('/:id', async (c) => {
    const id = c.req.param('id')

    try {
        // First delete associated scores
        await c.env.DB.prepare('DELETE FROM scores WHERE exam_id = ?').bind(id).run()

        // Then delete the exam (exam_courses will be deleted automatically via cascade)
        const { success } = await c.env.DB.prepare('DELETE FROM exams WHERE id = ?').bind(id).run()
        return success ? c.json({ message: 'Exam deleted' }) : c.json({ error: 'Failed to delete exam' }, 500)
    } catch (error) {
        console.error('Delete exam error:', error)
        return c.json({ error: 'Failed to delete exam' }, 500)
    }
})

export default exams
