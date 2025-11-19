import { Hono } from 'hono'
import { Score } from '../db/types'

type Bindings = {
    DB: D1Database
}

const scores = new Hono<{ Bindings: Bindings }>()

// Get scores for a specific exam and class
scores.get('/', async (c) => {
    const examId = c.req.query('exam_id')
    const classId = c.req.query('class_id')

    if (!examId || !classId) {
        return c.json({ error: 'Exam ID and Class ID are required' }, 400)
    }

    // Get all students in the class and their scores for the exam (if any)
    const { results } = await c.env.DB.prepare(`
    SELECT s.id as student_id, s.name, s.student_id as student_code, sc.score, sc.id as score_id
    FROM students s
    LEFT JOIN scores sc ON s.id = sc.student_id AND sc.exam_id = ?
    WHERE s.class_id = ?
    ORDER BY s.student_id ASC
  `).bind(examId, classId).all()

    return c.json(results)
})

// Batch update/insert scores
scores.post('/batch', async (c) => {
    const { exam_id, scores: scoreList } = await c.req.json<{ exam_id: number, scores: { student_id: number, score: number }[] }>()

    if (!exam_id || !Array.isArray(scoreList)) {
        return c.json({ error: 'Invalid data format' }, 400)
    }

    const stmt = c.env.DB.prepare(`
    INSERT INTO scores (student_id, exam_id, score, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET score = excluded.score, updated_at = CURRENT_TIMESTAMP
  `)

    // Note: D1 doesn't support ON CONFLICT UPDATE for non-unique keys easily without a unique index on (student_id, exam_id).
    // We should ensure there is a unique constraint or handle it differently.
    // For now, let's assume we first delete old scores or use a better upsert strategy if we had a unique index.
    // Actually, let's check if we have a unique index on scores(student_id, exam_id). The schema didn't explicitly say UNIQUE.
    // Let's use a transaction to delete and insert, or check if exists.
    // Better approach for now: Check if score exists, if so update, else insert.
    // Or simpler: use `INSERT OR REPLACE` if we had a unique constraint.

    // Let's try to do it one by one for simplicity in this environment, or use batch if supported.
    // Since we don't have a unique constraint on (student_id, exam_id) in the provided schema, we need to be careful.
    // Let's first check if we should add a unique constraint. It makes sense.
    // For now, I will implement a check-and-update loop.

    const results = []
    for (const item of scoreList) {
        // Check if score exists
        const existing = await c.env.DB.prepare('SELECT id FROM scores WHERE student_id = ? AND exam_id = ?').bind(item.student_id, exam_id).first()

        if (existing) {
            await c.env.DB.prepare('UPDATE scores SET score = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(item.score, existing.id).run()
        } else {
            await c.env.DB.prepare('INSERT INTO scores (student_id, exam_id, score) VALUES (?, ?, ?)').bind(item.student_id, exam_id, item.score).run()
        }
    }

    return c.json({ message: 'Scores updated successfully' })
})

export default scores
