import { Hono } from 'hono'
import * as XLSX from 'xlsx'

type Bindings = {
    DB: D1Database
}

const importRoute = new Hono<{ Bindings: Bindings }>()

// Download student import template
importRoute.get('/template/students', (c) => {
    // Create a sample workbook with headers
    const ws = XLSX.utils.aoa_to_sheet([
        ['姓名', '班级', '性别'],
        ['张三', '一年级1班', '男'],
        ['李四', '一年级1班', '女']
    ])

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '学生数据')

    // Generate Excel file
    const excelBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })

    return new Response(excelBuffer, {
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename=student_import_template.xlsx'
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
                const countResult = await c.env.DB.prepare(
                    'SELECT COUNT(*) as count FROM students'
                ).first()
                const count = (countResult?.count as number) || 0
                const studentId = `S${String(count + 1).padStart(3, '0')}`

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
                ).bind(row['姓名'], studentId, classId, row['性别'] || null).run()
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

// Download scores import template
importRoute.get('/template/scores', (c) => {
    // Create a sample workbook with headers
    const ws = XLSX.utils.aoa_to_sheet([
        ['姓名', '班级', '考试', '科目', '分数'],
        ['张三', '一年级1班', '期中考试', '语文', '85'],
        ['李四', '一年级1班', '期中考试', '语文', '92']
    ])

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '成绩数据')

    // Generate Excel file
    const excelBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })

    return new Response(excelBuffer, {
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename=scores_import_template.xlsx'
        }
    })
})

// Bulk import scores from Excel
importRoute.post('/scores', async (c) => {
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
            '考试': string
            '科目': string
            '分数': number
        }>

        let successCount = 0
        let errorCount = 0
        const errors: string[] = []

        // Insert or update each score
        for (let i = 0; i < data.length; i++) {
            const row = data[i]
            try {
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

                // Find student by name and class
                const student = await c.env.DB.prepare(
                    'SELECT id FROM students WHERE name = ? AND class_id = ?'
                ).bind(row['姓名'], classId).first()

                if (!student) {
                    errorCount++
                    errors.push(`第 ${i + 2} 行: 找不到班级 "${row['班级']}" 中的学生 "${row['姓名']}"`)
                    continue
                }

                // Find course by name
                const courseResult = await c.env.DB.prepare(
                    'SELECT id FROM courses WHERE name = ?'
                ).bind(row['科目']).first()

                if (!courseResult) {
                    errors.push(`第 ${i + 2} 行: 科目 "${row['科目']}" 不存在`)
                    errorCount++
                    continue
                }

                const courseId = courseResult.id as number

                // Find exam by name and course through exam_courses junction table
                const examResult = await c.env.DB.prepare(`
                    SELECT e.id 
                    FROM exams e
                    JOIN exam_courses ec ON e.id = ec.exam_id
                    WHERE e.name = ? AND ec.course_id = ? AND e.class_id = ?
                `).bind(row['考试'], courseId, classId).first()

                if (!examResult) {
                    errors.push(`第 ${i + 2} 行: 找不到班级 "${row['班级']}" 的 "${row['科目']}" 科目的 "${row['考试']}" 考试`)
                    errorCount++
                    continue
                }

                const examId = examResult.id as number

                // Check if score already exists
                const existing = await c.env.DB.prepare(
                    'SELECT id FROM scores WHERE student_id = ? AND exam_id = ? AND course_id = ?'
                ).bind(student.id, examId, courseId).first()

                if (existing) {
                    // Update existing score
                    await c.env.DB.prepare(
                        'UPDATE scores SET score = ?, updated_at = CURRENT_TIMESTAMP WHERE student_id = ? AND exam_id = ? AND course_id = ?'
                    ).bind(row['分数'], student.id, examId, courseId).run()
                } else {
                    // Insert new score
                    await c.env.DB.prepare(
                        'INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (?, ?, ?, ?)'
                    ).bind(student.id, examId, courseId, row['分数']).run()
                }
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

export default importRoute
