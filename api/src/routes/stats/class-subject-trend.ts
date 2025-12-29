import { Hono } from 'hono'

type Bindings = {
    DB: D1Database
}

const classSubjectTrend = new Hono<{ Bindings: Bindings }>()

// Get class subject trend analysis
classSubjectTrend.get('/:classId', async (c) => {
    const classId = c.req.param('classId')
    const courseId = c.req.query('courseId')

    try {
        // Get class info
        const classInfo = await c.env.DB.prepare('SELECT name FROM classes WHERE id = ?').bind(classId).first()
        if (!classInfo) {
            return c.json({ error: 'Class not found' }, 404)
        }

        if (courseId) {
            // Get trend for a specific course
            const query = `
                SELECT 
                    e.id as exam_id,
                    e.name as exam_name,
                    e.exam_date,
                    co.name as course_name,
                    AVG(sc.score) as average_score,
                    COUNT(sc.score) as total_students,
                    SUM(CASE WHEN sc.score >= 60 THEN 1 ELSE 0 END) as pass_count
                FROM exams e
                JOIN scores sc ON e.id = sc.exam_id
                JOIN students st ON sc.student_id = st.id
                JOIN courses co ON sc.course_id = co.id
                WHERE st.class_id = ? AND e.class_id = ? AND co.id = ?
                GROUP BY e.id, e.name, e.exam_date, co.name
                ORDER BY e.exam_date ASC
                LIMIT 10
            `

            const result = await c.env.DB.prepare(query).bind(classId, classId, courseId).all()

            const trends = result.results.map((r: any) => {
                const total = Number(r.total_students)
                return {
                    exam_name: r.exam_name,
                    exam_date: r.exam_date,
                    average_score: parseFloat(Number(r.average_score).toFixed(2)),
                    pass_rate: total > 0 ? parseFloat(((Number(r.pass_count) / total) * 100).toFixed(2)) : 0
                }
            })

            return c.json({
                class_name: classInfo.name,
                subjects: [{
                    course_name: result.results[0]?.course_name || '',
                    trends
                }]
            })
        } else {
            // Get trends for all courses
            const query = `
                SELECT 
                    e.id as exam_id,
                    e.name as exam_name,
                    e.exam_date,
                    co.id as course_id,
                    co.name as course_name,
                    AVG(sc.score) as average_score,
                    COUNT(sc.score) as total_students,
                    SUM(CASE WHEN sc.score >= 60 THEN 1 ELSE 0 END) as pass_count
                FROM exams e
                JOIN scores sc ON e.id = sc.exam_id
                JOIN students st ON sc.student_id = st.id
                JOIN courses co ON sc.course_id = co.id
                WHERE st.class_id = ? AND e.class_id = ?
                GROUP BY e.id, e.name, e.exam_date, co.id, co.name
                ORDER BY co.name, e.exam_date ASC
            `

            const result = await c.env.DB.prepare(query).bind(classId, classId).all()

            // Group by course
            const subjectsMap = new Map()
            for (const row of result.results as any[]) {
                if (!subjectsMap.has(row.course_id)) {
                    subjectsMap.set(row.course_id, {
                        course_name: row.course_name,
                        trends: []
                    })
                }

                const total = Number(row.total_students)
                subjectsMap.get(row.course_id).trends.push({
                    exam_name: row.exam_name,
                    exam_date: row.exam_date,
                    average_score: parseFloat(Number(row.average_score).toFixed(2)),
                    pass_rate: total > 0 ? parseFloat(((Number(row.pass_count) / total) * 100).toFixed(2)) : 0
                })
            }

            return c.json({
                class_name: classInfo.name,
                subjects: Array.from(subjectsMap.values())
            })
        }

    } catch (error) {
        console.error('Class subject trend error:', error)
        return c.json({ error: 'Failed to fetch class subject trend', details: error instanceof Error ? error.message : String(error) }, 500)
    }
})

export default classSubjectTrend
