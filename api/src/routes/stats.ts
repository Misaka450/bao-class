import { Hono } from 'hono'

type Bindings = {
    DB: D1Database
}

const stats = new Hono<{ Bindings: Bindings }>()

// Get class statistics
stats.get('/class/:classId', async (c) => {
    const classId = c.req.param('classId')
    const courseId = c.req.query('courseId')
    const examId = c.req.query('examId')

    try {
        let targetExamId = examId
        let targetCourseId = courseId

        if (!targetExamId) {
            // Get latest exam for this class
            const latestExam = await c.env.DB.prepare(`
                SELECT id FROM exams 
                WHERE class_id = ?
                ORDER BY exam_date DESC LIMIT 1
            `).bind(classId).first()

            if (latestExam) {
                targetExamId = latestExam.id as string
            }
        }

        if (!targetExamId) {
            return c.json({
                total_students: 0,
                average_score: 0,
                pass_rate: "0.00",
                excellent_rate: "0.00"
            })
        }

        // Build query based on whether we're filtering by course
        let query = `
            SELECT 
                COUNT(DISTINCT s.student_id) as total_students,
                AVG(s.score) as average_score,
                SUM(CASE WHEN s.score >= 60 THEN 1 ELSE 0 END) as pass_count,
                SUM(CASE WHEN s.score >= 90 THEN 1 ELSE 0 END) as excellent_count
            FROM scores s
            WHERE s.exam_id = ?
        `

        const params: any[] = [targetExamId]

        if (targetCourseId) {
            query += ` AND s.course_id = ?`
            params.push(targetCourseId)
        }

        const stats = await c.env.DB.prepare(query).bind(...params).first()

        const totalStudents = Number(stats?.total_students || 0)
        const passRate = totalStudents > 0 ? (Number(stats?.pass_count || 0) / totalStudents * 100) : 0
        const excellentRate = totalStudents > 0 ? (Number(stats?.excellent_count || 0) / totalStudents * 100) : 0

        return c.json({
            total_students: totalStudents,
            average_score: Number(stats?.average_score || 0).toFixed(2),
            pass_rate: passRate.toFixed(2),
            excellent_rate: excellentRate.toFixed(2)
        })
    } catch (error) {
        console.error('Stats error:', error)
        return c.json({ error: 'Failed to get statistics' }, 500)
    }
})

// Get class subject analysis (for Radar chart)
stats.get('/class/:classId/subjects', async (c) => {
    const classId = c.req.param('classId')
    const examId = c.req.query('examId')

    try {
        let targetExamId = examId

        if (!targetExamId) {
            const latestExam = await c.env.DB.prepare(`
                SELECT id FROM exams 
                WHERE class_id = ?
                ORDER BY exam_date DESC LIMIT 1
            `).bind(classId).first()

            if (latestExam) {
                targetExamId = latestExam.id as string
            }
        }

        if (!targetExamId) {
            return c.json([])
        }

        const subjectStats = await c.env.DB.prepare(`
            SELECT 
                c.name as subject,
                AVG(s.score) as average,
                ec.full_score
            FROM courses c
            JOIN exam_courses ec ON ec.course_id = c.id
            JOIN scores s ON s.exam_id = ec.exam_id AND s.course_id = c.id
            WHERE ec.exam_id = ?
            GROUP BY c.id, c.name, ec.full_score
        `).bind(targetExamId).all()

        return c.json(subjectStats.results)
    } catch (error) {
        console.error('Subject stats error:', error)
        return c.json({ error: 'Failed to get subject statistics' }, 500)
    }
})

// Get class history (for trend line chart)
stats.get('/class/:classId/history', async (c) => {
    const classId = c.req.param('classId')
    const courseId = c.req.query('courseId')

    try {
        let query = `
            SELECT 
                e.name as exam_name,
                e.exam_date,
                AVG(s.score) as average_score
            FROM exams e
            JOIN scores s ON s.exam_id = e.id
        `

        const params: any[] = [classId]

        if (courseId) {
            query += ` JOIN exam_courses ec ON ec.exam_id = e.id AND ec.course_id = ?`
            params.push(courseId)
            query += ` WHERE e.class_id = ? AND s.course_id = ?`
            params.push(classId, courseId)
        } else {
            query += ` WHERE e.class_id = ?`
        }

        query += `
            GROUP BY e.id, e.name, e.exam_date
            ORDER BY e.exam_date ASC
            LIMIT 10
        `

        const history = await c.env.DB.prepare(query).bind(...params).all()
        return c.json(history.results)
    } catch (error) {
        console.error('Class history error:', error)
        return c.json({ error: 'Failed to get class history' }, 500)
    }
})

// Get score distribution for an exam
stats.get('/exam/:examId/distribution', async (c) => {
    const examId = c.req.param('examId')
    const courseId = c.req.query('courseId')

    try {
        let query = `
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
        `

        const params: any[] = [examId]

        if (courseId) {
            query += ` AND course_id = ?`
            params.push(courseId)
        }

        query += ` GROUP BY range ORDER BY range DESC`

        const result = await c.env.DB.prepare(query).bind(...params).all()

        const allRanges = ['90-100', '80-89', '70-79', '60-69', '0-59']
        const distribution = allRanges.map(range => ({
            range,
            count: (result.results.find((r: any) => r.range === range) as any)?.count || 0
        }))

        return c.json(distribution)
    } catch (error) {
        console.error('Distribution error:', error)
        return c.json({ error: 'Failed to get distribution' }, 500)
    }
})

// Class comparison (班级对比)
stats.get('/comparison/classes', async (c) => {
    const examId = c.req.query('examId')
    const courseId = c.req.query('courseId')

    if (!examId) {
        return c.json({ error: 'examId is required' }, 400)
    }

    try {
        let query: string
        let params: any[]

        if (courseId) {
            // 单科对比
            query = `
                SELECT 
                    cl.id,
                    cl.name,
                    AVG(s.score) as average_score,
                    CAST(SUM(CASE WHEN s.score >= 60 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) AS REAL) as pass_rate,
                    CAST(SUM(CASE WHEN s.score >= 90 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) AS REAL) as excellent_rate
                FROM classes cl
                JOIN students st ON cl.id = st.class_id
                JOIN scores s ON st.id = s.student_id
                WHERE s.exam_id = ? AND s.course_id = ?
                GROUP BY cl.id, cl.name
                ORDER BY average_score DESC
            `
            params = [examId, courseId]
        } else {
            // 总分对比(所有科目)
            query = `
                SELECT 
                    cl.id,
                    cl.name,
                    AVG(total_score) as average_score,
                    CAST(SUM(CASE WHEN total_score >= 180 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) AS REAL) as pass_rate,
                    CAST(SUM(CASE WHEN total_score >= 270 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) AS REAL) as excellent_rate
                FROM classes cl
                JOIN students st ON cl.id = st.class_id
                JOIN (
                    SELECT student_id, SUM(score) as total_score
                    FROM scores
                    WHERE exam_id = ?
                    GROUP BY student_id
                ) s ON st.id = s.student_id
                GROUP BY cl.id, cl.name
                ORDER BY average_score DESC
            `
            params = [examId]
        }

        const result = await c.env.DB.prepare(query).bind(...params).all()

        return c.json(result.results.map((r: any) => ({
            id: r.id,
            name: r.name,
            average_score: parseFloat(Number(r.average_score || 0).toFixed(2)),
            pass_rate: parseFloat(Number(r.pass_rate || 0).toFixed(2)),
            excellent_rate: parseFloat(Number(r.excellent_rate || 0).toFixed(2))
        })))
    } catch (error) {
        console.error('Class comparison error:', error)
        return c.json({ error: 'Failed to get class comparison' }, 500)
    }
})


// Get scores list with filtering
stats.get('/scores-list', async (c) => {
    const classId = c.req.query('classId')
    const examId = c.req.query('examId')
    const examName = c.req.query('examName') // 新增：按考试名称查询
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
                (SELECT SUM(score) FROM scores WHERE exam_id = e.id AND student_id = s.id) as exam_total
            FROM students s
            JOIN classes c ON s.class_id = c.id
            LEFT JOIN scores sc ON s.id = sc.student_id
            LEFT JOIN exams e ON sc.exam_id = e.id
            LEFT JOIN courses co ON sc.course_id = co.id
            WHERE 1=1
        `

        const params: any[] = []

        if (classId) {
            query += ` AND s.class_id = ?`
            params.push(classId)
        }

        // 优先使用 examId，如果没有则使用 examName
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

        // Transform data
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
                // Total is already set from exam_total
            }
        }

        const studentsList = Array.from(studentsMap.values())
        return c.json(studentsList)
    } catch (error) {
        console.error('Scores list error:', error)
        return c.json({ error: 'Failed to get scores list' }, 500)
    }
})

// Student radar analysis
stats.get('/student/radar/:studentId', async (c) => {
    const studentId = c.req.param('studentId')
    const examId = c.req.query('examId')

    try {
        let targetExamId = examId

        if (!targetExamId) {
            const student = await c.env.DB.prepare('SELECT class_id FROM students WHERE id = ?').bind(studentId).first()
            if (!student) {
                return c.json({ error: 'Student not found' }, 404)
            }

            const latestExam = await c.env.DB.prepare(`
                SELECT id FROM exams 
                WHERE class_id = ?
                ORDER BY exam_date DESC LIMIT 1
            `).bind(student.class_id).first()

            if (latestExam) {
                targetExamId = latestExam.id as string
            }
        }

        if (!targetExamId) {
            return c.json([])
        }

        const scores = await c.env.DB.prepare(`
            SELECT 
                c.name as subject,
                s.score,
                ec.full_score
            FROM scores s
            JOIN courses c ON s.course_id = c.id
            JOIN exam_courses ec ON ec.exam_id = s.exam_id AND ec.course_id = c.id
            WHERE s.student_id = ? AND s.exam_id = ?
        `).bind(studentId, targetExamId).all()

        return c.json(scores.results)
    } catch (error) {
        console.error('Student radar error:', error)
        return c.json({ error: 'Failed to get student radar data' }, 500)
    }
})

// Class focus group analysis
stats.get('/class/focus/:classId', async (c) => {
    const classId = c.req.param('classId')

    try {
        const latestExam = await c.env.DB.prepare(`
            SELECT id FROM exams 
            WHERE class_id = ?
            ORDER BY exam_date DESC LIMIT 1
        `).bind(classId).first()

        if (!latestExam) {
            return c.json({ critical: [], regressing: [], fluctuating: [] })
        }

        const examId = latestExam.id

        // Critical students (average < 60)
        const critical = await c.env.DB.prepare(`
            SELECT 
                s.id,
                s.name,
                AVG(sc.score) as average_score
            FROM students s
            JOIN scores sc ON s.id = sc.student_id
            WHERE s.class_id = ? AND sc.exam_id = ?
            GROUP BY s.id, s.name
            HAVING AVG(sc.score) < 60
            ORDER BY average_score ASC
            LIMIT 10
        `).bind(classId, examId).all()

        return c.json({
            critical: critical.results,
            regressing: [],
            fluctuating: []
        })
    } catch (error) {
        console.error('Focus group error:', error)
        return c.json({ error: 'Failed to get focus group data' }, 500)
    }
})

// Get top students for an exam
stats.get('/exam/:examId/top-students', async (c) => {
    const examId = c.req.param('examId')
    const courseId = c.req.query('courseId')
    const limit = c.req.query('limit') || '5'

    try {

        let query = `
            SELECT 
                s.id,
                s.name,
                s.student_id,
                AVG(sc.score) as average_score
            FROM students s
            JOIN scores sc ON s.id = sc.student_id
            WHERE sc.exam_id = ?
        `

        const params: any[] = [examId]

        if (courseId) {
            query += ` AND sc.course_id = ?`
            params.push(courseId)
        }

        query += `
            GROUP BY s.id, s.name, s.student_id
            ORDER BY average_score DESC
            LIMIT ?
        `
        params.push(Number(limit))

        const result = await c.env.DB.prepare(query).bind(...params).all()
        return c.json(result.results)
    } catch (error) {
        console.error('Top students error:', error)
        return c.json({ error: 'Failed to get top students' }, 500)
    }
})

// Get most improved/declined students (comparing with previous exam)
stats.get('/exam/:examId/progress', async (c) => {
    const examId = c.req.param('examId')
    const courseId = c.req.query('courseId')

    try {
        // Get current exam info
        const currentExam = await c.env.DB.prepare(`
            SELECT class_id, exam_date FROM exams WHERE id = ?
        `).bind(examId).first()

        if (!currentExam) {
            return c.json({ improved: [], declined: [] })
        }

        // Get previous exam for the same class
        const previousExam = await c.env.DB.prepare(`
            SELECT id FROM exams 
            WHERE class_id = ? AND exam_date < ?
            ORDER BY exam_date DESC LIMIT 1
        `).bind(currentExam.class_id, currentExam.exam_date).first()

        if (!previousExam) {
            return c.json({ improved: [], declined: [] })
        }

        // Build query to compare scores
        let query = `
            SELECT 
                s.id as student_id,
                s.name as student_name,
                AVG(curr.score) as current_score,
                AVG(prev.score) as previous_score,
                AVG(curr.score) - AVG(prev.score) as progress
            FROM students s
            JOIN scores curr ON s.id = curr.student_id AND curr.exam_id = ?
            JOIN scores prev ON s.id = prev.student_id AND prev.exam_id = ?
        `

        const params: any[] = [examId, previousExam.id]

        if (courseId) {
            query += ` WHERE curr.course_id = ? AND prev.course_id = ?`
            params.push(courseId, courseId)
        }

        query += `
            GROUP BY s.id, s.name
            HAVING COUNT(DISTINCT curr.course_id) > 0 AND COUNT(DISTINCT prev.course_id) > 0
        `

        const result = await c.env.DB.prepare(query).bind(...params).all()
        const students = result.results as any[]

        // Sort by progress (descending for improved, ascending for declined)
        const improved = students
            .filter(s => Number(s.progress) > 0)
            .sort((a, b) => Number(b.progress) - Number(a.progress))
            .slice(0, 5)

        const declined = students
            .filter(s => Number(s.progress) < 0)
            .sort((a, b) => Number(a.progress) - Number(b.progress))
            .slice(0, 5)

        return c.json({ improved, declined })
    } catch (error) {
        console.error('Progress error:', error)
        return c.json({ improved: [], declined: [] })
    }
})

// Get student score history (for trend chart)
stats.get('/student/:studentId', async (c) => {
    const studentId = c.req.param('studentId')

    try {
        const history = await c.env.DB.prepare(`
            SELECT 
                e.name as exam_name,
                e.exam_date,
                SUM(s.score) as score,
                300 as full_score
            FROM scores s
            JOIN exams e ON s.exam_id = e.id
            WHERE s.student_id = ?
            GROUP BY e.id, e.name, e.exam_date
            ORDER BY e.exam_date DESC
            LIMIT 10
        `).bind(studentId).all()

        return c.json(history.results)
    } catch (error) {
        console.error('Student history error:', error)
        return c.json({ error: 'Failed to get student history' }, 500)
    }
})

export default stats
