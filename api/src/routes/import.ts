import { Hono } from 'hono'
import * as XLSX from 'xlsx'
import { authMiddleware } from '../middleware/auth'

type Bindings = {
    DB: D1Database
}

const importRoute = new Hono<{ Bindings: Bindings }>()

// Apply auth middleware to all routes
importRoute.use('*', authMiddleware)

// Download student import template
importRoute.get('/template/students', async (c) => {
    // Create a sample workbook with headers
    const ws = XLSX.utils.aoa_to_sheet([
        ['姓名', '班级', '性别'],
        ['张三', '一年级1班', '男'],
        ['李四', '一年级1班', '女']
    ])

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '学生数据')

    // Add reference sheet for Classes
    try {
        const classes = await c.env.DB.prepare('SELECT name FROM classes ORDER BY name').all()
        if (classes.results && classes.results.length > 0) {
            const classNames = classes.results.map(r => [r.name])
            const wsRef = XLSX.utils.aoa_to_sheet([['可用班级'], ...classNames])
            XLSX.utils.book_append_sheet(wb, wsRef, '参考数据')
        }
    } catch (e) {
        console.error('Failed to fetch classes for template', e)
    }

    // Generate Excel file
    const excelBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })

    return new Response(excelBuffer, {
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${encodeURIComponent('学生导入模板.xlsx')}"`
        }
    })
})

// Bulk import students from Excel
importRoute.post('/students', async (c) => {
    try {
        const formData = await c.req.formData()
        const file = formData.get('file') as File

        if (!file) {
            return c.json({ error: 'No file provided' }, 400)
        }

        // Read the Excel file
        const arrayBuffer = await file.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]

        // Convert to JSON
        const data = XLSX.utils.sheet_to_json(worksheet) as Array<{
            '姓名': string
            '班级': string
            '性别'?: string
        }>

        let successCount = 0
        let errorCount = 0
        const errors: string[] = []

        // Insert each student
        for (let i = 0; i < data.length; i++) {
            const row = data[i]
            try {
                if (!row['姓名'] || !row['班级']) {
                    continue;
                }

                // Find class ID by name
                const classResult = await c.env.DB.prepare(
                    'SELECT id FROM classes WHERE name = ?'
                ).bind(row['班级']).first()

                if (!classResult) {
                    errors.push(`第 ${i + 2} 行: 班级 "${row['班级']}" 不存在`)
                    errorCount++
                    continue
                }

                const classId = classResult.id as number

                // Generate student ID (e.g., S001, S002)
                // Note: In a real concurrent environment, this might cause collisions. 
                // Better to use UUID or database sequence/autoincrement if possible, 
                // but keeping existing logic for now.
                const countResult = await c.env.DB.prepare(
                    'SELECT COUNT(*) as count FROM students'
                ).first()
                const count = (countResult?.count as number) || 0
                const studentId = `S${String(count + 1 + i).padStart(3, '0')}` // +i to avoid collision in same batch

                // Check if student with same name already exists in this class
                const existingStudent = await c.env.DB.prepare(
                    'SELECT id FROM students WHERE name = ? AND class_id = ?'
                ).bind(row['姓名'], classId).first()

                if (existingStudent) {
                    errors.push(`第 ${i + 2} 行: 学生 "${row['姓名']}" 在班级 "${row['班级']}" 中已存在`)
                    errorCount++
                    continue
                }

                await c.env.DB.prepare(
                    'INSERT INTO students (name, student_id, class_id, gender) VALUES (?, ?, ?, ?)'
                ).bind(row['姓名'], studentId, classId, (row['性别']==='男'?'male':row['性别']==='女'?'female':null)).run()
                successCount++
            } catch (error) {
                errorCount++
                errors.push(`第 ${i + 2} 行: ${error instanceof Error ? error.message : '未知错误'}`)
            }
        }

        return c.json({
            message: `导入完成`,
            total: data.length,
            success: successCount,
            failed: errorCount,
            errors: errors.slice(0, 10) // Only return first 10 errors
        })
    } catch (error) {
        console.error('Import error:', error)
        return c.json({ error: '文件解析失败' }, 500)
    }
})

// Download scores import template (Wide Format)
importRoute.get('/template/scores', async (c) => {
    const examId = c.req.query('examId')
    const classId = c.req.query('classId')

    if (!examId || !classId) {
        return c.text('请提供 examId 和 classId', 400)
    }

    try {
        // 1. Get Exam Courses
        const coursesResult = await c.env.DB.prepare(`
            SELECT c.name 
            FROM courses c
            JOIN exam_courses ec ON c.id = ec.course_id
            WHERE ec.exam_id = ?
        `).bind(examId).all()

        const courseNames = coursesResult.results.map((r: any) => r.name)

        if (courseNames.length === 0) {
            return c.text('该考试未关联任何科目', 400)
        }

        // 2. Get Class Students
        const studentsResult = await c.env.DB.prepare(`
            SELECT name, student_id 
            FROM students 
            WHERE class_id = ?
            ORDER BY student_id
        `).bind(classId).all()

        const students = studentsResult.results as Array<{ name: string, student_id: string }>

        // 3. Build Header Row
        const header = ['姓名', '学号', ...courseNames]

        // 4. Build Data Rows
        const data = students.map(s => [s.name, s.student_id])

        // 5. Create Workbook
        const ws = XLSX.utils.aoa_to_sheet([header, ...data])
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, '成绩录入')

        // Generate Excel file
        const excelBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })

        return new Response(excelBuffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${encodeURIComponent('成绩导入模板.xlsx')}"`
            }
        })

    } catch (error) {
        console.error('Template generation error:', error)
        return c.text('模板生成失败', 500)
    }
})

// Bulk import scores from Excel (Wide Format)
importRoute.post('/scores', async (c) => {
    try {
        const formData = await c.req.formData()
        const file = formData.get('file') as File
        const examId = formData.get('examId')

        if (!file) {
            return c.json({ error: 'No file provided' }, 400)
        }
        if (!examId) {
            return c.json({ error: 'No examId provided' }, 400)
        }

        // Read the Excel file
        const arrayBuffer = await file.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]

        // Convert to JSON (Array of Arrays to preserve headers order)
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

        if (rawData.length < 2) {
            return c.json({ error: '文件内容为空' }, 400)
        }

        const headers = rawData[0] as string[]
        const rows = rawData.slice(1)

        // Identify Course Columns (Skip '姓名' and '学号')
        const courseIndices: { [key: string]: number } = {}
        headers.forEach((header, index) => {
            if (header !== '姓名' && header !== '学号' && header) {
                courseIndices[header] = index
            }
        })

        let successCount = 0
        let errorCount = 0
        const errors: string[] = []

        // Cache courses for this exam to validate headers
        const validCoursesResult = await c.env.DB.prepare(`
            SELECT c.name, c.id
            FROM courses c
            JOIN exam_courses ec ON c.id = ec.course_id
            WHERE ec.exam_id = ?
        `).bind(examId).all()

        const validCoursesMap = new Map(validCoursesResult.results.map((r: any) => [r.name, r.id]))

        // Iterate Rows (Students)
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i]
            const studentName = row[headers.indexOf('姓名')]
            const studentId = row[headers.indexOf('学号')]

            if (!studentName) continue // Skip empty rows

            try {
                // Find Student
                let student: any
                if (studentId) {
                    student = await c.env.DB.prepare('SELECT id FROM students WHERE student_id = ?').bind(studentId).first()
                }

                // Fallback to name search if ID not found or not provided (less reliable but useful)
                if (!student) {
                    // Warning: This might be ambiguous if multiple students have same name. 
                    // Ideally we strictly use student_id.
                    // For now, let's try to find by name, but maybe restrict to the exam's class?
                    // We don't have classId passed in POST, but we can infer from exam?
                    // Actually, let's just rely on student_id if present, else name.
                    student = await c.env.DB.prepare('SELECT id FROM students WHERE name = ?').bind(studentName).first()
                }

                if (!student) {
                    errors.push(`第 ${i + 2} 行: 找不到学生 "${studentName}" (${studentId || '无学号'})`)
                    errorCount++
                    continue
                }

                // Iterate Course Columns
                for (const [courseName, colIndex] of Object.entries(courseIndices)) {
                    const scoreValue = row[colIndex]

                    // Skip if empty or not a number
                    if (scoreValue === undefined || scoreValue === null || scoreValue === '') continue

                    const score = parseFloat(scoreValue)
                    if (isNaN(score)) {
                        errors.push(`第 ${i + 2} 行: "${courseName}" 分数无效`)
                        continue
                    }

                    const courseId = validCoursesMap.get(courseName)
                    if (!courseId) {
                        // Course in header is not part of this exam, ignore or warn?
                        // Let's ignore to be safe, or maybe user uploaded wrong template.
                        continue
                    }

                    // Upsert Score
                    const existing = await c.env.DB.prepare(
                        'SELECT id FROM scores WHERE student_id = ? AND exam_id = ? AND course_id = ?'
                    ).bind(student.id, examId, courseId).first()

                    if (existing) {
                        await c.env.DB.prepare(
                            'UPDATE scores SET score = ?, updated_at = CURRENT_TIMESTAMP WHERE student_id = ? AND exam_id = ? AND course_id = ?'
                        ).bind(score, student.id, examId, courseId).run()
                    } else {
                        await c.env.DB.prepare(
                            'INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (?, ?, ?, ?)'
                        ).bind(student.id, examId, courseId, score).run()
                    }
                    successCount++ // Count each score as a success? Or each student? 
                    // Usually "success" refers to records imported. Let's count scores.
                }

            } catch (error) {
                errorCount++
                errors.push(`第 ${i + 2} 行: ${error instanceof Error ? error.message : '未知错误'}`)
            }
        }

        return c.json({
            message: `导入完成`,
            total: rows.length, // Total students processed
            success: successCount, // Total scores saved
            failed: errorCount, // Students with errors
            errors: errors.slice(0, 10)
        })

    } catch (error) {
        console.error('Import error:', error)
        return c.json({ error: '文件解析失败' }, 500)
    }
})

export default importRoute

