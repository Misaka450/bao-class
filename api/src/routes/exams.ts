import { Hono } from 'hono'
import { Exam } from '../db/types'

type Bindings = {
    DB: D1Database
}

const exams = new Hono<{ Bindings: Bindings }>()

exams.get('/', async (c) => {
    const { results } = await c.env.DB.prepare(`
    SELECT e.*, c.name as course_name, cl.name as class_name 
    FROM exams e
    LEFT JOIN courses c ON e.course_id = c.id
    LEFT JOIN classes cl ON e.class_id = cl.id
    ORDER BY e.exam_date DESC
  `).all<Exam>()
    return c.json(results)
})

exams.post('/', async (c) => {
    const { name, course_id, class_id, exam_date, full_score } = await c.req.json()
    if (!name || !course_id || !class_id || !exam_date || !full_score) {
        return c.json({ error: 'All fields are required' }, 400)
    }

    const { success } = await c.env.DB.prepare(
        'INSERT INTO exams (name, course_id, class_id, exam_date, full_score) VALUES (?, ?, ?, ?, ?)'
    ).bind(name, course_id, class_id, exam_date, full_score).run()

    return success ? c.json({ message: 'Exam created' }, 201) : c.json({ error: 'Failed to create exam' }, 500)
})

exams.put('/:id', async (c) => {
    const id = c.req.param('id')
    const { name, course_id, class_id, exam_date, full_score } = await c.req.json()

    const { success } = await c.env.DB.prepare(
        'UPDATE exams SET name = ?, course_id = ?, class_id = ?, exam_date = ?, full_score = ? WHERE id = ?'
    ).bind(name, course_id, class_id, exam_date, full_score, id).run()

    return success ? c.json({ message: 'Exam updated' }) : c.json({ error: 'Failed to update exam' }, 500)
})

exams.delete('/:id', async (c) => {
    const id = c.req.param('id')
    const { success } = await c.env.DB.prepare('DELETE FROM exams WHERE id = ?').bind(id).run()
    return success ? c.json({ message: 'Exam deleted' }) : c.json({ error: 'Failed to delete exam' }, 500)
})

export default exams
