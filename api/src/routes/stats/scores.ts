import { Hono } from 'hono'

type Bindings = {
    DB: D1Database
}

const scores = new Hono<{ Bindings: Bindings }>()

// Get scores list with filtering
scores.get('/list', async (c) => {
    const classId = c.req.query('classId')
    const examId = c.req.query('examId')
    const examName = c.req.query('examName')
    const courseId = c.req.query('courseId')

    try {
        let query = `
            SELECT 
                s.id as student_id,
                s.name as student_name,
                s.student_id as student_number,
                c.name as class_name,
                co.name as course_name,
                sc.score,
                e.id as exam_id,
                e.name as exam_name,
                totals.exam_total
            FROM students s
            LEFT JOIN classes c ON s.class_id = c.id
            LEFT JOIN scores sc ON s.id = sc.student_id
            LEFT JOIN exams e ON sc.exam_id = e.id
            LEFT JOIN courses co ON sc.course_id = co.id
            LEFT JOIN (
                SELECT student_id, exam_id, SUM(score) as exam_total
                FROM scores
                GROUP BY student_id, exam_id
            ) totals ON s.id = totals.student_id AND e.id = totals.exam_id
            WHERE 1=1
        `

        const params: (string | number)[] = []

        if (classId) {
            query += ` AND s.class_id = ?`
            params.push(classId)
        }

        if (examId) {
            query += ` AND e.id = ?`
            params.push(examId)
        } else if (examName) {
            query += ` AND e.name = ?`
            params.push(examName)
        }

        if (courseId) {
            query += ` AND co.id = ?`
            params.push(courseId)
        }

        query += ` ORDER BY s.id, co.name`

        const result = await c.env.DB.prepare(query).bind(...params).all()

        const studentsMap = new Map()

        for (const row of result.results as any[]) {
            const studentKey = row.student_id

            if (!studentsMap.has(studentKey)) {
                studentsMap.set(studentKey, {
                    student_id: row.student_id,
                    student_name: row.student_name,
                    student_number: row.student_number,
                    class_name: row.class_name,
                    scores: {},
                    total: row.exam_total || 0
                })
            }

            const student = studentsMap.get(studentKey)
            if (row.course_name && row.score !== null) {
                student.scores[row.course_name] = row.score
            }
        }

        return c.json(Array.from(studentsMap.values()))
    } catch (error) {
        console.error('Scores list error:', error)
        return c.json({ error: 'Failed to get scores list' }, 500)
    }
})

export default scores
