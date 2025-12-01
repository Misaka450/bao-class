import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'

type Bindings = {
    DB: D1Database
}

const stats = new Hono<{ Bindings: Bindings }>()

// Apply auth middleware to all routes
stats.use('*', authMiddleware)

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
        let query: string
        const params: (string | number)[] = [targetExamId]

        if (targetCourseId) {
            query = `
                SELECT 
                    COUNT(DISTINCT s.student_id) as total_students,
                    AVG(s.score) as average_score,
                    COUNT(DISTINCT CASE WHEN s.score >= 60 THEN s.student_id END) as pass_count,
                    COUNT(DISTINCT CASE WHEN s.score >= 90 THEN s.student_id END) as excellent_count
                FROM scores s
                WHERE s.exam_id = ? AND s.course_id = ?
            `
            params.push(targetCourseId)
        } else {
            // 全科：基于每个学生的总分计算统计数据
            query = `
                SELECT 
                    COUNT(*) as total_students,
                    AVG(total_score) as average_score,
                    SUM(CASE WHEN total_score >= 180 THEN 1 ELSE 0 END) as pass_count,
                    SUM(CASE WHEN total_score >= 270 THEN 1 ELSE 0 END) as excellent_count
                FROM (
                    SELECT student_id, SUM(score) as total_score
                    FROM scores 
                    WHERE exam_id = ?
                    GROUP BY student_id
                ) student_stats
            `
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

        const params: (string | number)[] = [classId]

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
        let query: string
        const params: (string | number)[] = [examId]
        let allRanges: string[]

        if (courseId) {
            // 单科分布 (0-100)
            query = `
                SELECT 
                    CASE 
                        WHEN score >= 90 THEN '100-90'
                        WHEN score >= 80 THEN '89-80'
                        WHEN score >= 70 THEN '79-70'
                        WHEN score >= 60 THEN '69-60'
                        ELSE '0-59'
                    END as range,
                    COUNT(*) as count
                FROM scores
                WHERE exam_id = ? AND course_id = ?
                GROUP BY range
            `
            params.push(courseId)
            allRanges = ['100-90', '89-80', '79-70', '69-60', '0-59']
        } else {
            // 全科总分分布 (假设满分300)
            // 先计算每个学生的总分，再统计分布
            query = `
                SELECT 
                    CASE 
                        WHEN total_score >= 270 THEN '300-270'
                        WHEN total_score >= 240 THEN '269-240'
                        WHEN total_score >= 210 THEN '239-210'
                        WHEN total_score >= 180 THEN '209-180'
                        ELSE '0-179'
                    END as range,
                    COUNT(*) as count
                FROM (
                    SELECT student_id, SUM(score) as total_score
                    FROM scores
                    WHERE exam_id = ?
                    GROUP BY student_id
                ) student_scores
                GROUP BY range
            `
            allRanges = ['300-270', '269-240', '239-210', '209-180', '0-179']
        }

        const result = await c.env.DB.prepare(query).bind(...params).all()

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

// Get top students for an exam
stats.get('/exam/:examId/top-students', async (c) => {
    const examId = c.req.param('examId')
    const courseId = c.req.query('courseId')
    const limit = c.req.query('limit') || '5'

    try {
        let query: string
        const params: (string | number)[] = []

        if (courseId) {
            // 单科：直接取该科分数（不使用AVG或SUM，因为有UNIQUE约束）
            query = `
                SELECT 
                    s.id,
                    s.name,
                    s.student_id,
                    sc.score as average_score
                FROM students s
                JOIN scores sc ON s.id = sc.student_id
                WHERE sc.exam_id = ? AND sc.course_id = ?
                ORDER BY sc.score DESC
                LIMIT ?
            `
            params.push(examId, courseId, Number(limit))
        } else {
            // 全科：计算所有科目的总分
            query = `
                SELECT 
                    s.id,
                    s.name,
                    s.student_id,
                    SUM(sc.score) as average_score
                FROM students s
                JOIN scores sc ON s.id = sc.student_id
                WHERE sc.exam_id = ?
                GROUP BY s.id, s.name, s.student_id
                ORDER BY average_score DESC
                LIMIT ?
            `
            params.push(examId, Number(limit))
        }

        const result = await c.env.DB.prepare(query).bind(...params).all()

        // 格式化分数为保留1位小数
        const formattedResults = result.results.map((student: any) => ({
            ...student,
            average_score: parseFloat(Number(student.average_score || 0).toFixed(1))
        }))

        return c.json(formattedResults)
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
        let query: string
        const params: (string | number)[] = []

        if (courseId) {
            // 选择科目时：直接对比单科分数（每个学生每科只有一个分数）
            query = `
                SELECT 
                    s.id as student_id,
                    s.name as student_name,
                    curr.score as current_score,
                    prev.score as previous_score,
                    curr.score - prev.score as progress
                FROM students s
                JOIN scores curr ON s.id = curr.student_id AND curr.exam_id = ? AND curr.course_id = ?
                JOIN scores prev ON s.id = prev.student_id AND prev.exam_id = ? AND prev.course_id = ?
            `
            params.push(examId, courseId, previousExam.id as number, courseId)
        } else {
            // 未选择科目时：对比总分（所有科目的总和）
            query = `
                SELECT 
                    s.id as student_id,
                    s.name as student_name,
                    SUM(curr.score) as current_score,
                    SUM(prev.score) as previous_score,
                    SUM(curr.score) - SUM(prev.score) as progress
                FROM students s
                JOIN scores curr ON s.id = curr.student_id AND curr.exam_id = ?
                JOIN scores prev ON s.id = prev.student_id AND prev.exam_id = ?
                GROUP BY s.id, s.name
                HAVING COUNT(DISTINCT curr.course_id) > 0 AND COUNT(DISTINCT prev.course_id) > 0
            `
            params.push(examId, previousExam.id as number)
        }

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

export default stats
