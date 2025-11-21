import { Hono } from 'hono'

const debug = new Hono<{ Bindings: { DB: D1Database } }>()

debug.get('/inspect', async (c) => {
    try {
        const exam1 = await c.env.DB.prepare('SELECT * FROM exams WHERE id = 1').first()
        const studentsCount = await c.env.DB.prepare('SELECT count(*) as count FROM students').first()
        const examCourses = await c.env.DB.prepare('SELECT * FROM exam_courses WHERE exam_id = 1').all()
        const scoresCount = await c.env.DB.prepare('SELECT count(*) as count FROM scores WHERE exam_id = 1').first()
        const sampleScores = await c.env.DB.prepare('SELECT * FROM scores WHERE exam_id = 1 LIMIT 5').all()

        return c.json({
            exam1,
            studentsCount,
            examCourses: examCourses.results,
            scoresCount,
            sampleScores: sampleScores.results
        })
    } catch (error) {
        return c.json({ error: String(error) }, 500)
    }
})

export default debug
