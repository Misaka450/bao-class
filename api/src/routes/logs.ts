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
        // 先确保audit_logs表存在
        await c.env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                username TEXT,
                action TEXT NOT NULL,
                entity_type TEXT,
                entity_id INTEGER,
                details TEXT,
                created_at TEXT
            )
        `).run()

        const { results } = await c.env.DB.prepare(
            'SELECT * FROM audit_logs ORDER BY id DESC LIMIT ? OFFSET ?'
        ).bind(pageSize, offset).all()

        const totalResult = await c.env.DB.prepare(
            'SELECT COUNT(*) as count FROM audit_logs'
        ).first()

        const total = totalResult ? Number(totalResult.count) : 0

        return c.json({
            data: results || [],
            total,
            page,
            pageSize
        })
    } catch (error) {
        console.error('Fetch logs error:', error)
        // 返回更详细的错误信息
        return c.json({
            error: 'Failed to fetch logs',
            message: error instanceof Error ? error.message : 'Unknown error',
            details: error
        }, 500)
    }
})

export default logs
