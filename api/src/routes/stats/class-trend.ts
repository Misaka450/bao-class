import { Hono } from 'hono'

type Bindings = {
    DB: D1Database
}

const classTrend = new Hono<{ Bindings: Bindings }>()

// Get class trend analysis
classTrend.get('/:classId', async (c) => {
    const classId = c.req.param('classId')
    const courseId = c.req.query('courseId')

    try {
        // Get class info
        const classInfo = await c.env.DB.prepare('SELECT name FROM classes WHERE id = ?').bind(classId).first()
        if (!classInfo) {
            return c.json({ error: 'Class not found' }, 404)
        }

        // Build query for exam history
        let query = `
            SELECT 
                e.id as exam_id,
                e.name as exam_name,
                e.exam_date,
                COUNT(s.score) as total_students,
                AVG(s.score) as average_score,
                SUM(CASE WHEN s.score >= 60 THEN 1 ELSE 0 END) as pass_count,
                SUM(CASE WHEN s.score >= 90 THEN 1 ELSE 0 END) as excellent_count
            FROM exams e
            JOIN scores s ON e.id = s.exam_id
            JOIN students st ON s.student_id = st.id
        `

        const params: any[] = []

        if (courseId) {
            query += ` WHERE st.class_id = ? AND s.course_id = ?`
            params.push(classId, courseId)
        } else {
            // For total score, we need to aggregate first? 
            // Or just average of all scores? Usually "Class Average" means average of total scores or average of subject averages.
            // Existing system seems to treat "score" as single subject score.
            // If courseId is not provided, maybe we should calculate "Average Total Score" per student?
            // But "Pass Rate" for total score is different (e.g. pass >= 180).
            // Let's stick to single subject or "Average of all scores" for simplicity, 
            // OR if courseId is missing, maybe return trend for "Total Score" (sum of all subjects).

            // Let's assume if no courseId, we calculate based on Total Score per student per exam.
            query = `
                SELECT 
                    e.id as exam_id,
                    e.name as exam_name,
                    e.exam_date,
                    COUNT(DISTINCT student_totals.student_id) as total_students,
                    AVG(student_totals.total_score) as average_score,
                    SUM(CASE WHEN student_totals.total_score >= (student_totals.subject_count * 60) THEN 1 ELSE 0 END) as pass_count,
                    SUM(CASE WHEN student_totals.total_score >= (student_totals.subject_count * 90) THEN 1 ELSE 0 END) as excellent_count
                FROM exams e
                JOIN (
                    SELECT 
                        exam_id, 
                        student_id, 
                        SUM(score) as total_score,
                        COUNT(course_id) as subject_count
                    FROM scores s
                    JOIN students st ON s.student_id = st.id
                    WHERE st.class_id = ?
                    GROUP BY exam_id, student_id
                ) student_totals ON e.id = student_totals.exam_id
            `
            params.push(classId)
        }

        query += `
            GROUP BY e.id, e.name, e.exam_date
            ORDER BY e.exam_date ASC
            LIMIT 10
        `

        const history = await c.env.DB.prepare(query).bind(...params).all()

        const trends = history.results.map((h: any) => {
            const total = Number(h.total_students)
            return {
                exam_name: h.exam_name,
                exam_date: h.exam_date,
                average_score: parseFloat(Number(h.average_score).toFixed(2)),
                pass_rate: total > 0 ? parseFloat(((Number(h.pass_count) / total) * 100).toFixed(2)) : 0,
                excellent_rate: total > 0 ? parseFloat(((Number(h.excellent_count) / total) * 100).toFixed(2)) : 0
            }
        })

        return c.json({
            class_name: classInfo.name,
            trends
        })

    } catch (error) {
        console.error('Class trend error:', error)
        return c.json({ error: 'Failed to fetch class trend' }, 500)
    }
})

export default classTrend
