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
        ['姓名', '学号', '班级ID'],
        ['张三', 'S001', '1'],
        ['李四', 'S002', '1']
    ])

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '学生数据')

    // Generate Excel file
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

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
            '学号': string
            '班级ID': number
        }>

        let successCount = 0
        let errorCount = 0
        const errors: string[] = []

        // Insert each student
        for (let i = 0; i < data.length; i++) {
            const row = data[i]
            try {
                await c.env.DB.prepare(
                    'INSERT INTO students (name, student_id, class_id) VALUES (?, ?, ?)'
                ).bind(row['姓名'], row['学号'], row['班级ID']).run()
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
        ['学号', '考试ID', '分数'],
        ['S001', '1', '85'],
        ['S002', '1', '92']
    ])

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '成绩数据')

    // Generate Excel file
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

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
            '学号': string
            '考试ID': number
            '分数': number
        }>

        let successCount = 0
        let errorCount = 0
        const errors: string[] = []

        // Insert or update each score
        for (let i = 0; i < data.length; i++) {
            const row = data[i]
            try {
                // First, get student ID from student_id
                const student = await c.env.DB.prepare(
                    'SELECT id FROM students WHERE student_id = ?'
                ).bind(row['学号']).first()

                if (!student) {
                    errorCount++
                    errors.push(`第 ${i + 2} 行: 找不到学号 ${row['学号']} 的学生`)
                    continue
                }

                // Check if score already exists
                const existing = await c.env.DB.prepare(
                    'SELECT id FROM scores WHERE student_id = ? AND exam_id = ?'
                ).bind(student.id, row['考试ID']).first()

                if (existing) {
                    // Update existing score
                    await c.env.DB.prepare(
                        'UPDATE scores SET score = ? WHERE student_id = ? AND exam_id = ?'
                    ).bind(row['分数'], student.id, row['考试ID']).run()
                } else {
                    // Insert new score
                    await c.env.DB.prepare(
                        'INSERT INTO scores (student_id, exam_id, score) VALUES (?, ?, ?)'
                    ).bind(student.id, row['考试ID'], row['分数']).run()
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
