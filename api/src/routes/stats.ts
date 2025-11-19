import { Hono } from 'hono'

type Bindings = {
    DB: D1Database
}

const stats = new Hono<{ Bindings: Bindings }>()

// Get class statistics
stats.get('/class/:classId', async (c) => {
    const classId = c.req.param('classId')

    try {
        // Get latest exam for this class
        const latestExam = await c.env.DB.prepare(`
      SELECT id FROM exams WHERE class_id = ? ORDER BY exam_date DESC LIMIT 1
    `).bind(classId).first()

        if (!latestExam) {
            return c.json({ error: 'No exams found for this class' }, 404)
        }

        // Calculate statistics  
        const stats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_students,
        AVG(score) as average_score,
        MAX(score) as highest_score,
        MIN(score) as lowest_score,
        SUM(CASE WHEN score >= 60 THEN 1 ELSE 0 END) as pass_count,
        SUM(CASE WHEN score >= 90 THEN 1 ELSE 0 END) as excellent_count
      FROM scores 
      WHERE exam_id = ?
    `).bind(latestExam.id).first()

        const passRate = stats ? (Number(stats.pass_count) / Number(stats.total_students) * 100) : 0
        const excellentRate = stats ? (Number(stats.excellent_count) / Number(stats.total_students) * 100) : 0

        return c.json({
            ...stats,
            pass_rate: passRate.toFixed(2),
            excellent_rate: excellentRate.toFixed(2)
        })
    } catch (error) {
        console.error('Stats error:', error)
        return c.json({ error: 'Failed to get statistics' }, 500)
    }
})

// Get student statistics (historical trend)
stats.get('/student/:studentId', async (c) => {
    const studentId = c.req.param('studentId')

    try {
        const scores = await c.env.DB.prepare(`
      SELECT e.name as exam_name, e.exam_date, s.score, e.full_score
      FROM scores s
      JOIN exams e ON s.exam_id = e.id
      WHERE s.student_id = ?
      ORDER BY e.exam_date DESC
      LIMIT 10
    `).bind(studentId).all()

        return c.json(scores.results)
    } catch (error) {
        console.error('Student stats error:', error)
        return c.json({ error: 'Failed to get student statistics' }, 500)
    }
})

// Get exam score distribution
stats.get('/exam/:examId/distribution', async (c) => {
    const examId = c.req.param('examId')

    try {
        const distribution = await c.env.DB.prepare(`
      SELECT 
        CASE 
          WHEN score >= 90 THEN '90-100'
          WHEN score >= 80 THEN '80-89'
          WHEN score >= 70 THEN '70-79'
          WHEN score >= 60 THEN '60-69'
          ELSE '0-59'
        END as range,
        COUNT(*) as count
      FROM scores
      WHERE exam_id = ?
      GROUP BY range
      ORDER BY range DESC
    `).bind(examId).all()

        return c.json(distribution.results)
    } catch (error) {
        console.error('Distribution error:', error)
        return c.json({ error: 'Failed to get distribution' }, 500)
    }
})

// Get class comparison for an exam
stats.get('/comparison/classes', async (c) => {
    const examId = c.req.query('examId')

    if (!examId) {
        return c.json({ error: 'Exam ID is required' }, 400)
    }

    try {
        const comparison = await c.env.DB.prepare(`
      SELECT 
        c.id,
        c.name,
        COUNT(s.id) as student_count,
        AVG(s.score) as average_score,
        SUM(CASE WHEN s.score >= 60 THEN 1 ELSE 0 END) * 100.0 / COUNT(s.id) as pass_rate,
        SUM(CASE WHEN s.score >= 90 THEN 1 ELSE 0 END) * 100.0 / COUNT(s.id) as excellent_rate
      FROM classes c
      JOIN students st ON c.id = st.class_id
      JOIN scores s ON st.id = s.student_id
      WHERE s.exam_id = ?
      GROUP BY c.id, c.name
    `).bind(examId).all()

        return c.json(comparison.results)
    } catch (error) {
        console.error('Comparison error:', error)
        return c.json({ error: 'Failed to get comparison' }, 500)
    }
})

export default stats
