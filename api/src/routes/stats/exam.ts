import { Hono } from 'hono'
import { checkClassAccess } from '../../utils/auth'
import { getExamContext } from '../../utils/dbHelpers'

type Bindings = {
    DB: D1Database
}

type Variables = {
    user: any
}

const examStats = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Get score distribution for an exam
examStats.get('/:examId/distribution', async (c) => {
    const examId = c.req.param('examId')
    const courseId = c.req.query('courseId')

    try {
        const user = c.get('user')
        const examContext = await getExamContext(c.env.DB, examId)
        if (!examContext) {
            return c.json({ error: 'Exam not found' }, 404)
        }
        if (!await checkClassAccess(c.env.DB, user, examContext.class_id)) {
            return c.json({ error: 'Forbidden' }, 403)
        }

        let query: string
        const params: (string | number)[] = [examId]
        let allRanges: string[]

        if (courseId) {
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
            query = `
                SELECT 
                    CASE 
                        WHEN total_score >= ? * 0.9 THEN '优秀'
                        WHEN total_score >= ? * 0.8 THEN '良好'
                        WHEN total_score >= ? * 0.6 THEN '及格'
                        ELSE '不及格'
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
            params.length = 0
            params.push(examContext.total_full_score, examContext.total_full_score, examContext.total_full_score, examId)
            allRanges = ['优秀', '良好', '及格', '不及格']
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

// Get top students for an exam
examStats.get('/:examId/top-students', async (c) => {
    const examId = c.req.param('examId')
    const courseId = c.req.query('courseId')
    const limit = c.req.query('limit') || '5'

    try {
        const user = c.get('user')
        const examContext = await getExamContext(c.env.DB, examId)
        if (!examContext) {
            return c.json({ error: 'Exam not found' }, 404)
        }
        if (!await checkClassAccess(c.env.DB, user, examContext.class_id)) {
            return c.json({ error: 'Forbidden' }, 403)
        }

        let query: string
        const params: (string | number)[] = []

        if (courseId) {
            query = `
                SELECT 
                    s.id,
                    s.name,
                    s.student_id as student_number,
                    sc.score as average_score
                FROM students s
                JOIN scores sc ON s.id = sc.student_id
                WHERE sc.exam_id = ? AND sc.course_id = ?
                ORDER BY sc.score DESC
                LIMIT ?
            `
            params.push(examId, courseId, Number(limit))
        } else {
            query = `
                SELECT 
                    s.id,
                    s.name,
                    s.student_id as student_number,
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

// Get most improved/declined students
examStats.get('/:examId/progress', async (c) => {
    const examId = c.req.param('examId')
    const courseId = c.req.query('courseId')

    try {
        const user = c.get('user')
        const currentExam = await getExamContext(c.env.DB, examId)

        if (!currentExam) {
            return c.json({ improved: [], declined: [] })
        }

        if (!await checkClassAccess(c.env.DB, user, currentExam.class_id)) {
            return c.json({ error: 'Forbidden' }, 403)
        }

        const previousExam = await c.env.DB.prepare(`
            SELECT e.id FROM exams e
            WHERE e.class_id = ? AND e.exam_date < ?
            ORDER BY exam_date DESC LIMIT 1
        `).bind(currentExam.class_id, currentExam.exam_date).first<{ id: string }>()

        if (!previousExam) {
            return c.json({ improved: [], declined: [] })
        }

        let query: string
        const params: (string | number)[] = []

        if (courseId) {
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
            params.push(examId, courseId, previousExam.id, courseId)
        } else {
            query = `
                SELECT 
                    s.id as student_id,
                    s.name as student_name,
                    SUM(curr.score) as current_score,
                    SUM(prev.score) as previous_score,
                    (
                        SUM(curr.score) * 1.0 / NULLIF(curr_meta.total_full_score, 0) -
                        SUM(prev.score) * 1.0 / NULLIF(prev_meta.total_full_score, 0)
                    ) as progress
                FROM students s
                JOIN scores curr ON s.id = curr.student_id AND curr.exam_id = ?
                JOIN scores prev ON s.id = prev.student_id AND prev.exam_id = ?
                JOIN (
                    SELECT ? as exam_id, ? as total_full_score
                ) curr_meta ON curr_meta.exam_id = curr.exam_id
                JOIN (
                    SELECT ? as exam_id, ? as total_full_score
                ) prev_meta ON prev_meta.exam_id = prev.exam_id
                GROUP BY s.id, s.name
                HAVING COUNT(DISTINCT curr.course_id) = ? AND COUNT(DISTINCT prev.course_id) = ?
            `
            const previousExamContext = await getExamContext(c.env.DB, previousExam.id)
            if (!previousExamContext || previousExamContext.course_count !== currentExam.course_count) {
                return c.json({ improved: [], declined: [] })
            }
            params.push(
                examId,
                previousExam.id,
                currentExam.id,
                currentExam.total_full_score,
                previousExamContext.id,
                previousExamContext.total_full_score,
                currentExam.course_count,
                previousExamContext.course_count
            )
        }

        const result = await c.env.DB.prepare(query).bind(...params).all()
        const students = result.results as any[]

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

export default examStats
