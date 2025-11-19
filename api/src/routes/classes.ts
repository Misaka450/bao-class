import { Hono } from 'hono'
import { Class } from '../db/types'

type Bindings = {
    DB: D1Database
}

const classes = new Hono<{ Bindings: Bindings }>()

classes.get('/', async (c) => {
    const { results } = await c.env.DB.prepare('SELECT * FROM classes ORDER BY created_at DESC').all<Class>()
    return c.json(results)
})

classes.post('/', async (c) => {
    const { name, grade, teacher_id } = await c.req.json()
    if (!name || !grade) return c.json({ error: 'Name and grade are required' }, 400)

    const { success } = await c.env.DB.prepare(
        'INSERT INTO classes (name, grade, teacher_id) VALUES (?, ?, ?)'
    ).bind(name, grade, teacher_id || null).run()

    return success ? c.json({ message: 'Class created' }, 201) : c.json({ error: 'Failed to create class' }, 500)
})

classes.put('/:id', async (c) => {
    const id = c.req.param('id')
    const { name, grade, teacher_id } = await c.req.json()

    const { success } = await c.env.DB.prepare(
        'UPDATE classes SET name = ?, grade = ?, teacher_id = ? WHERE id = ?'
    ).bind(name, grade, teacher_id || null, id).run()

    return success ? c.json({ message: 'Class updated' }) : c.json({ error: 'Failed to update class' }, 500)
})

classes.delete('/:id', async (c) => {
    const id = c.req.param('id')
    const { success } = await c.env.DB.prepare('DELETE FROM classes WHERE id = ?').bind(id).run()
    return success ? c.json({ message: 'Class deleted' }) : c.json({ error: 'Failed to delete class' }, 500)
})

export default classes
