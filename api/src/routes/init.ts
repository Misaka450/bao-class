import { Hono } from 'hono'

const init = new Hono<{ Bindings: { DB: D1Database } }>()

init.get('/progress-data', async (c) => {
    try {
        // 1. Check if we have any classes
        let cls = await c.env.DB.prepare('SELECT * FROM classes LIMIT 1').first<{ id: number }>()
        if (!cls) {
            // Create a class
            const res = await c.env.DB.prepare('INSERT INTO classes (name, grade) VALUES (?, ?) RETURNING id')
                .bind('三年级二班', 3)
                .first<{ id: number }>()
            if (!res) return c.json({ error: 'Failed to create class' }, 500)
            cls = res
        }

        // 2. Check if we have any students
        const studentsCount = await c.env.DB.prepare('SELECT count(*) as count FROM students WHERE class_id = ?').bind(cls.id).first<{ count: number }>()
        if (!studentsCount || studentsCount.count < 5) {
            // Create students
            for (let i = 1; i <= 10; i++) {
                await c.env.DB.prepare('INSERT INTO students (name, student_number, class_id) VALUES (?, ?, ?)')
                    .bind(`学生${i}`, `20240${i}`, cls.id)
                    .run()
            }
        }
        const students = await c.env.DB.prepare('SELECT id FROM students WHERE class_id = ?').bind(cls.id).all<{ id: number }>()

        // 3. Check if we have any courses
        let courses = await c.env.DB.prepare('SELECT * FROM courses').all<{ id: number, name: string }>()
        if (courses.results.length === 0) {
            await c.env.DB.prepare('INSERT INTO courses (name) VALUES (?)').bind('语文').run()
            await c.env.DB.prepare('INSERT INTO courses (name) VALUES (?)').bind('数学').run()
            await c.env.DB.prepare('INSERT INTO courses (name) VALUES (?)').bind('英语').run()
            courses = await c.env.DB.prepare('SELECT * FROM courses').all<{ id: number, name: string }>()
        }

        // 4. Check if we have a base exam with scores
        let baseExam = await c.env.DB.prepare(`
            SELECT e.* FROM exams e
            JOIN scores s ON e.id = s.exam_id
            WHERE e.class_id = ?
            GROUP BY e.id
            HAVING count(s.id) > 0
            ORDER BY e.exam_date DESC
            LIMIT 1
        `).bind(cls.id).first<{ id: number, exam_date: string }>()

        if (!baseExam) {
            // Create base exam
            const date = new Date()
            date.setMonth(date.getMonth() - 1)
            const dateStr = date.toISOString().split('T')[0]

            const res = await c.env.DB.prepare('INSERT INTO exams (name, exam_date, class_id) VALUES (?, ?, ?) RETURNING id')
                .bind('第一次月考', dateStr, cls.id)
                .first<{ id: number }>()
            if (!res) return c.json({ error: 'Failed to create base exam' }, 500)
            baseExam = { id: res.id, exam_date: dateStr }

            // Link courses and add scores
            for (const course of courses.results) {
                await c.env.DB.prepare('INSERT INTO exam_courses (exam_id, course_id, full_score) VALUES (?, ?, ?)')
                    .bind(baseExam.id, course.id, 100)
                    .run()

                for (const student of students.results) {
                    const score = Math.floor(Math.random() * 40) + 60 // 60-100
                    await c.env.DB.prepare('INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (?, ?, ?, ?)')
                        .bind(student.id, baseExam.id, course.id, score)
                        .run()
                }
            }
        }

        // 5. Create new exam (Progress Exam)
        const newDate = new Date()
        const newDateStr = newDate.toISOString().split('T')[0]

        const newExamRes = await c.env.DB.prepare('INSERT INTO exams (name, exam_date, class_id) VALUES (?, ?, ?) RETURNING id')
            .bind('期中考试', newDateStr, cls.id)
            .first<{ id: number }>()

        if (!newExamRes) return c.json({ error: 'Failed to create new exam' }, 500)
        const newExamId = newExamRes.id

        // 6. Link courses and add scores (with progress)
        let insertedCount = 0
        for (const course of courses.results) {
            await c.env.DB.prepare('INSERT INTO exam_courses (exam_id, course_id, full_score) VALUES (?, ?, ?)')
                .bind(newExamId, course.id, 100)
                .run()

            for (const student of students.results) {
                // Get previous score
                const prevScore = await c.env.DB.prepare('SELECT score FROM scores WHERE student_id = ? AND exam_id = ? AND course_id = ?')
                    .bind(student.id, baseExam.id, course.id)
                    .first<{ score: number }>()

                if (prevScore) {
                    const change = Math.floor(Math.random() * 31) - 15 // -15 to +15
                    let newScore = prevScore.score + change
                    newScore = Math.max(0, Math.min(100, newScore))

                    await c.env.DB.prepare('INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (?, ?, ?, ?)')
                        .bind(student.id, newExamId, course.id, newScore)
                        .run()
                    insertedCount++
                }
            }
        }

        return c.json({ message: 'Data seeded successfully', baseExamId: baseExam.id, newExamId, insertedCount })
    } catch (error) {
        console.error(error)
        return c.json({ error: String(error) }, 500)
    }
})

init.get('/seed-all-exams', async (c) => {
    try {
        // 1. Get all exams
        const exams = await c.env.DB.prepare('SELECT * FROM exams').all<{ id: number, class_id: number, name: string }>()

        // 2. Get all courses
        let courses = await c.env.DB.prepare('SELECT * FROM courses').all<{ id: number, name: string }>()
        if (courses.results.length === 0) {
            // Create default courses if none exist
            await c.env.DB.prepare('INSERT INTO courses (name) VALUES (?)').bind('语文').run()
            await c.env.DB.prepare('INSERT INTO courses (name) VALUES (?)').bind('数学').run()
            await c.env.DB.prepare('INSERT INTO courses (name) VALUES (?)').bind('英语').run()
            courses = await c.env.DB.prepare('SELECT * FROM courses').all<{ id: number, name: string }>()
        }

        let totalInserted = 0
        const logs: string[] = []

        for (const exam of exams.results) {
            // Get students in this exam's class
            const students = await c.env.DB.prepare('SELECT id FROM students WHERE class_id = ?').bind(exam.class_id).all<{ id: number }>()

            if (students.results.length === 0) {
                logs.push(`Exam ${exam.name} (ID: ${exam.id}) skipped: No students in class ${exam.class_id}`)
                continue
            }

            // Ensure exam_courses exist
            for (const course of courses.results) {
                const examCourse = await c.env.DB.prepare('SELECT * FROM exam_courses WHERE exam_id = ? AND course_id = ?')
                    .bind(exam.id, course.id)
                    .first()

                if (!examCourse) {
                    await c.env.DB.prepare('INSERT INTO exam_courses (exam_id, course_id, full_score) VALUES (?, ?, ?)')
                        .bind(exam.id, course.id, 100)
                        .run()
                }

                // Check and add scores for each student
                for (const student of students.results) {
                    const existingScore = await c.env.DB.prepare('SELECT id FROM scores WHERE exam_id = ? AND course_id = ? AND student_id = ?')
                        .bind(exam.id, course.id, student.id)
                        .first()

                    if (!existingScore) {
                        // Generate a realistic score
                        // Base score around 75, with deviation
                        const baseScore = 75
                        const variance = Math.floor(Math.random() * 30) - 15 // -15 to +15
                        let score = baseScore + variance

                        // Add some randomness for "excellent" or "failing" students
                        const rand = Math.random()
                        if (rand > 0.9) score += 15 // Excellent
                        if (rand < 0.1) score -= 20 // Failing

                        score = Math.max(0, Math.min(100, score))

                        await c.env.DB.prepare('INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (?, ?, ?, ?)')
                            .bind(student.id, exam.id, course.id, score)
                            .run()
                        totalInserted++
                    }
                }
            }
            logs.push(`Exam ${exam.name} (ID: ${exam.id}) processed.`)
        }

        return c.json({ message: 'All exams seeded successfully', totalInserted, logs })
    } catch (error) {
        console.error('Seed all exams error:', error)
        return c.json({ error: String(error) }, 500)
    }
})

export default init
