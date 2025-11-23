import { Hono } from 'hono'

type Bindings = {
    DB: D1Database
}

const logs = new Hono<{ Bindings: Bindings }>()

logs.get('/', async (c) => {
    const page = Number(c.req.query('page')) || 1
    const pageSize = Number(c.req.query('pageSize')) || 20
    const offset = (page - 1) * pageSize

    try {
        const { results } = await c.env.DB.prepare(
            'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ? OFFSET ?'
        ).bind(pageSize, offset).all()

        const totalResult = await c.env.DB.prepare(
            'SELECT COUNT(*) as count FROM audit_logs'
        ).first()

        const total = totalResult ? totalResult.count : 0

        return c.json({
            data: results,
            total,
            page,
            pageSize
        })
    } catch (error) {
        console.error('Fetch logs error:', error)
        return c.json({ error: 'Failed to fetch logs' }, 500)
    }
})

export default logs
