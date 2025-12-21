import { Hono } from 'hono'
import { getLatestExamId } from '../../utils/dbHelpers'

type Bindings = {
    DB: D1Database
}

const classStats = new Hono<{ Bindings: Bindings }>()

// Get class statistics
classStats.get('/:classId', async (c) => {
    const classId = c.req.param('classId')
    const courseId = c.req.query('courseId')
    const examId = c.req.query('examId')

    try {
        let targetExamId = examId
        let targetCourseId = courseId

        // 使用缓存的工具函数获取最新考试ID
        if (!targetExamId) {
            targetExamId = await getLatestExamId(c.env.DB, classId) || undefined
        }

        if (!targetExamId) {
            return c.json({
                total_students: 0,
                average_score: 0,
                pass_rate: 0,
                excellent_rate: 0
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
            average_score: Number(stats?.average_score || 0),
            pass_rate: passRate,
            excellent_rate: excellentRate
        })
    } catch (error) {
        console.error('Stats error:', error)
        return c.json({ error: 'Failed to get statistics' }, 500)
    }
})

// Get class subject analysis (for Radar chart)
classStats.get('/:classId/subjects', async (c) => {
    const classId = c.req.param('classId')
    const examId = c.req.query('examId')

    try {
        // 使用缓存的工具函数获取最新考试ID
        const targetExamId = examId || await getLatestExamId(c.env.DB, classId)

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
classStats.get('/:classId/history', async (c) => {
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

export default classStats
