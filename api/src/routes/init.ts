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
                await c.env.DB.prepare('INSERT INTO students (name, student_id, class_id) VALUES (?, ?, ?)')
                    .bind(`学生${i}`, `20240${i}`, cls.id)
                    .run()
            }
        }
        const students = await c.env.DB.prepare('SELECT id FROM students WHERE class_id = ?').bind(cls.id).all<{ id: number }>()

        // 3. Check if we have any courses
        let courses = await c.env.DB.prepare('SELECT * FROM courses').all<{ id: number, name: string }>()
        if (courses.results.length === 0) {
            await c.env.DB.prepare('INSERT INTO courses (name, grade) VALUES (?, ?)').bind('语文', 1).run()
            await c.env.DB.prepare('INSERT INTO courses (name, grade) VALUES (?, ?)').bind('数学', 1).run()
            await c.env.DB.prepare('INSERT INTO courses (name, grade) VALUES (?, ?)').bind('英语', 1).run()
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
            await c.env.DB.prepare('INSERT INTO courses (name, grade) VALUES (?, ?)').bind('语文', 1).run()
            await c.env.DB.prepare('INSERT INTO courses (name, grade) VALUES (?, ?)').bind('数学', 1).run()
            await c.env.DB.prepare('INSERT INTO courses (name, grade) VALUES (?, ?)').bind('英语', 1).run()
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

init.get('/seed-grade3-class1', async (c) => {
    try {
        // 学生配置 - 包含姓名、性别、学号、类型
        type StudentType = 'excellent' | 'progressive' | 'regressive' | 'biased' | 'struggling'

        const studentConfigs: Array<{
            name: string
            gender: 'male' | 'female'
            studentId: string
            type: StudentType
        }> = [
                { name: '张明', gender: 'male', studentId: '202401', type: 'excellent' },
                { name: '李华', gender: 'female', studentId: '202402', type: 'excellent' },
                { name: '王芳', gender: 'female', studentId: '202403', type: 'excellent' },
                { name: '刘强', gender: 'male', studentId: '202404', type: 'progressive' },
                { name: '陈静', gender: 'female', studentId: '202405', type: 'progressive' },
                { name: '赵磊', gender: 'male', studentId: '202406', type: 'regressive' },
                { name: '孙丽', gender: 'female', studentId: '202407', type: 'regressive' },
                { name: '周杰', gender: 'male', studentId: '202408', type: 'biased' },
                { name: '吴梅', gender: 'female', studentId: '202409', type: 'biased' },
                { name: '郑伟', gender: 'male', studentId: '202410', type: 'struggling' }
            ]

        // 成绩生成函数
        const generateScore = (
            studentType: StudentType,
            courseName: string,
            examIndex: number,
            totalExams: number
        ): number => {
            let baseScore: number
            let variance: number
            let trend = 0

            // 根据学生类型设置基础分数
            switch (studentType) {
                case 'excellent':
                    baseScore = 90
                    variance = 5
                    break
                case 'progressive':
                    baseScore = 70
                    variance = 8
                    trend = (examIndex / Math.max(totalExams - 1, 1)) * 15 // 逐步提高
                    break
                case 'regressive':
                    baseScore = 75
                    variance = 8
                    trend = -(examIndex / Math.max(totalExams - 1, 1)) * 12 // 逐步下降
                    break
                case 'biased':
                    // 数学特别好，其他科目一般
                    baseScore = courseName === '数学' ? 88 : 65
                    variance = 6
                    break
                case 'struggling':
                    baseScore = 55
                    variance = 10
                    break
            }

            const randomVariance = Math.random() * variance * 2 - variance
            let score = baseScore + trend + randomVariance
            return Math.max(0, Math.min(100, Math.round(score)))
        }

        // 1. 创建三年级一班
        let class1 = await c.env.DB.prepare('SELECT * FROM classes WHERE name = ? AND grade = ?')
            .bind('三年级一班', 3)
            .first<{ id: number }>()

        if (!class1) {
            const res = await c.env.DB.prepare('INSERT INTO classes (name, grade) VALUES (?, ?) RETURNING id')
                .bind('三年级一班', 3)
                .first<{ id: number }>()
            if (!res) return c.json({ error: 'Failed to create class' }, 500)
            class1 = res
        }

        // 2. 删除现有数据（按正确顺序：先考试再学生）
        // 删除考试会通过 CASCADE 自动删除相关成绩
        await c.env.DB.prepare('DELETE FROM exams WHERE class_id = ?').bind(class1.id).run()
        await c.env.DB.prepare('DELETE FROM students WHERE class_id = ?').bind(class1.id).run()

        // 3. 创建学生（含真实姓名和性别）
        const createdStudents: Array<{ id: number, type: StudentType }> = []
        for (const config of studentConfigs) {
            const result = await c.env.DB.prepare(
                'INSERT INTO students (name, student_id, gender, class_id) VALUES (?, ?, ?, ?) RETURNING id'
            )
                .bind(config.name, config.studentId, config.gender, class1.id)
                .first<{ id: number }>()

            if (result) {
                createdStudents.push({ id: result.id, type: config.type })
            }
        }

        // 4. 获取三年级二班
        const class2 = await c.env.DB.prepare('SELECT * FROM classes WHERE name = ? AND grade = ?')
            .bind('三年级二班', 3)
            .first<{ id: number }>()

        if (!class2) {
            return c.json({ error: 'Class 三年级二班 not found. Please run /init/progress-data first.' }, 404)
        }

        // 5. 获取三年级二班的所有考试（按日期排序）
        const class2Exams = await c.env.DB.prepare('SELECT * FROM exams WHERE class_id = ? ORDER BY exam_date ASC')
            .bind(class2.id)
            .all<{ id: number, name: string, exam_date: string }>()

        if (class2Exams.results.length === 0) {
            return c.json({ error: 'No exams found for 三年级二班. Please run /init/progress-data first.' }, 404)
        }


        // 6. 获取所有课程
        const courses = await c.env.DB.prepare('SELECT * FROM courses')
            .all<{ id: number, name: string }>()

        if (courses.results.length === 0) {
            return c.json({ error: 'No courses found. Please run /init/progress-data first.' }, 404)
        }

        let totalExamsCreated = 0
        let totalScoresCreated = 0
        const totalExams = class2Exams.results.length

        // 7. 为三年级一班创建相同的考试
        for (let examIndex = 0; examIndex < class2Exams.results.length; examIndex++) {
            const exam = class2Exams.results[examIndex]

            // 检查是否已存在相同名称和日期的考试
            let existingExam = await c.env.DB.prepare(
                'SELECT id FROM exams WHERE name = ? AND exam_date = ? AND class_id = ?'
            )
                .bind(exam.name, exam.exam_date, class1.id)
                .first<{ id: number }>()

            let targetExamId: number

            if (existingExam) {
                // 使用已存在的考试
                targetExamId = existingExam.id
                console.log(`Using existing exam ${exam.name} (ID: ${targetExamId})`)
            } else {
                // 创建新考试
                const newExamRes = await c.env.DB.prepare('INSERT INTO exams (name, exam_date, class_id) VALUES (?, ?, ?) RETURNING id')
                    .bind(exam.name, exam.exam_date, class1.id)
                    .first<{ id: number }>()

                if (!newExamRes) continue
                targetExamId = newExamRes.id
                totalExamsCreated++
            }

            // 8. 获取原考试的科目关联
            const examCourses = await c.env.DB.prepare('SELECT course_id, full_score FROM exam_courses WHERE exam_id = ?')
                .bind(exam.id)
                .all<{ course_id: number, full_score: number }>()

            // 9. 为新考试添加科目关联和成绩
            for (const examCourse of examCourses.results) {
                // 检查考试-科目关联是否已存在
                const existingEC = await c.env.DB.prepare(
                    'SELECT id FROM exam_courses WHERE exam_id = ? AND course_id = ?'
                )
                    .bind(targetExamId, examCourse.course_id)
                    .first()

                if (!existingEC) {
                    // 添加考试-科目关联
                    await c.env.DB.prepare('INSERT INTO exam_courses (exam_id, course_id, full_score) VALUES (?, ?, ?)')
                        .bind(targetExamId, examCourse.course_id, examCourse.full_score)
                        .run()
                }

                // 获取课程名称
                const course = courses.results.find(c => c.id === examCourse.course_id)
                const courseName = course?.name || ''

                // 为每个学生添加成绩（根据学生类型生成）
                for (const student of createdStudents) {
                    // 检查成绩是否已存在
                    const existingScore = await c.env.DB.prepare(
                        'SELECT id FROM scores WHERE student_id = ? AND exam_id = ? AND course_id = ?'
                    )
                        .bind(student.id, targetExamId, examCourse.course_id)
                        .first()

                    if (!existingScore) {
                        const score = generateScore(student.type, courseName, examIndex, totalExams)

                        await c.env.DB.prepare('INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (?, ?, ?, ?)')
                            .bind(student.id, targetExamId, examCourse.course_id, score)
                            .run()
                        totalScoresCreated++
                    }
                }
            }
        }

        return c.json({
            message: '三年级一班数据添加成功',
            classId: class1.id,
            studentsCount: createdStudents.length,
            examsCreated: totalExamsCreated,
            scoresCreated: totalScoresCreated
        })
    } catch (error) {
        console.error('Seed grade 3 class 1 error:', error)
        return c.json({ error: String(error) }, 500)
    }
})

export default init

