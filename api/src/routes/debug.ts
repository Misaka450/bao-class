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

debug.get('/inspect-student/:id', async (c) => {
    const id = c.req.param('id')

    try {
        const student = await c.env.DB.prepare('SELECT * FROM students WHERE id = ?').bind(id).first()
        if (!student) return c.json({ error: 'Student not found' }, 404)

        const scores = await c.env.DB.prepare(`
            SELECT s.*, c.name as course_name, e.name as exam_name, e.id as exam_id
            FROM scores s
            JOIN courses c ON s.course_id = c.id
            JOIN exams e ON s.exam_id = e.id
            WHERE s.student_id = ?
            ORDER BY e.id, c.name
        `).bind(id).all()

        return c.json({
            student,
            scores: scores.results,
            total_scores: scores.results.length
        })
    } catch (error) {
        return c.json({ error: String(error) }, 500)
    }
})

debug.get('/check-duplicates', async (c) => {
    try {
        // 查找重复的分数记录 (同一学生、同一考试、同一课程有多条记录)
        const duplicates = await c.env.DB.prepare(`
            SELECT 
                student_id, 
                exam_id, 
                course_id,
                COUNT(*) as count
            FROM scores
            GROUP BY student_id, exam_id, course_id
            HAVING COUNT(*) > 1
        `).all()

        return c.json({
            has_duplicates: duplicates.results.length > 0,
            duplicate_count: duplicates.results.length,
            duplicates: duplicates.results
        })
    } catch (error) {
        return c.json({ error: String(error) }, 500)
    }
})

debug.get('/student-by-name/:name', async (c) => {
    const name = c.req.param('name')

    try {
        const student = await c.env.DB.prepare('SELECT * FROM students WHERE name = ?').bind(name).first()
        if (!student) return c.json({ error: 'Student not found' }, 404)

        const scores = await c.env.DB.prepare(`
            SELECT s.*, c.name as course_name, e.name as exam_name, e.id as exam_id
            FROM scores s
            JOIN courses c ON s.course_id = c.id
            JOIN exams e ON s.exam_id = e.id
            WHERE s.student_id = ?
            ORDER BY e.id, c.name
        `).bind(student.id).all()

        // 按考试分组统计
        const byExam: any = {}
        for (const score of scores.results as any[]) {
            if (!byExam[score.exam_id]) {
                byExam[score.exam_id] = {
                    exam_name: score.exam_name,
                    exam_id: score.exam_id,
                    scores: [],
                    total: 0
                }
            }
            byExam[score.exam_id].scores.push({
                course: score.course_name,
                score: score.score
            })
            byExam[score.exam_id].total += score.score
        }

        return c.json({
            student,
            by_exam: byExam,
            all_scores: scores.results
        })
    } catch (error) {
        return c.json({ error: String(error) }, 500)
    }
})

debug.get('/courses', async (c) => {
    try {
        const courses = await c.env.DB.prepare('SELECT * FROM courses ORDER BY id').all()
        return c.json(courses.results)
    } catch (error) {
        return c.json({ error: String(error) }, 500)
    }
})

debug.post('/clean-duplicate-courses', async (c) => {
    try {
        // 1. 获取所有课程
        const courses = await c.env.DB.prepare('SELECT * FROM courses ORDER BY id').all()
        const coursesData = courses.results as any[]

        // 2. 找出重复的课程名称,保留ID最小的
        const seenNames = new Map()
        const toDelete: number[] = []

        for (const course of coursesData) {
            if (seenNames.has(course.name)) {
                toDelete.push(course.id)
            } else {
                seenNames.set(course.name, course.id)
            }
        }

        // 3. 删除使用了重复课程ID的scores记录
        for (const courseId of toDelete) {
            await c.env.DB.prepare('DELETE FROM scores WHERE course_id = ?').bind(courseId).run()
            await c.env.DB.prepare('DELETE FROM exam_courses WHERE course_id = ?').bind(courseId).run()
        }

        // 4. 删除重复的课程记录
        for (const courseId of toDelete) {
            await c.env.DB.prepare('DELETE FROM courses WHERE id = ?').bind(courseId).run()
        }

        return c.json({
            message: 'Cleaned duplicate courses',
            deleted_course_ids: toDelete,
            kept_courses: Array.from(seenNames.entries())
        })
    } catch (error) {
        return c.json({ error: String(error) }, 500)
    }
})

export default debug
