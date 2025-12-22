import { Hono } from 'hono'
import * as XLSX from 'xlsx'
import { authMiddleware, checkRole } from '../middleware/auth'
import { checkClassAccess } from '../utils/auth'
import { validateStudentsData, validateScoresData } from '../services/data-validator'
import { JWTPayload } from '../types'

type Bindings = {
    DB: D1Database
    AI: any // 暂时保留，虽然主流程用 HTTP 请求 DashScope
    DASHSCOPE_API_KEY: string
}

const importRoute = new Hono<{ Bindings: Bindings; Variables: { user: JWTPayload } }>()

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
            'Content-Disposition': `attachment; filename = "${encodeURIComponent('学生导入模板.xlsx')}"`
        }
    })
})

// Bulk import students from Excel (Optimized)
importRoute.post('/students', checkRole(['admin', 'teacher']), async (c) => {
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

        if (data.length === 0) {
            return c.json({ error: '文件内容为空' }, 400)
        }

        const user = c.get('user')
        const errors: string[] = []

        // Step 1: Preload all classes into a Map
        // If not admin, only load classes owned by this teacher
        let classesQuery = 'SELECT id, name FROM classes'
        let classesParams: any[] = []

        if (user.role !== 'admin') {
            classesQuery += ' WHERE teacher_id = ?'
            classesParams = [user.userId]
        }

        const classesResult = await c.env.DB.prepare(classesQuery).bind(...classesParams).all()
        const classMap = new Map<string, number>()
        classesResult.results.forEach((row: any) => {
            classMap.set(row.name, row.id)
        })

        // Step 2: Get current student count for ID generation
        const countResult = await c.env.DB.prepare('SELECT COUNT(*) as count FROM students').first()
        const baseCount = (countResult?.count as number) || 0

        // Step 3: Validate and prepare student data
        const validStudents: Array<{ name: string; studentId: string; classId: number; gender: string | null; rowIndex: number }> = []
        for (let i = 0; i < data.length; i++) {
            const row = data[i]
            if (!row['姓名'] || !row['班级']) continue
            const classId = classMap.get(row['班级'])
            if (!classId) {
                if (user.role !== 'admin') {
                    errors.push(`第 ${i + 2} 行: 班级 "${row['班级']}" 不存在或无权操作`)
                } else {
                    errors.push(`第 ${i + 2} 行: 班级 "${row['班级']}" 不存在`)
                }
                continue
            }
            const studentId = `S${String(baseCount + validStudents.length + 1).padStart(3, '0')} `
            const gender = row['性别'] === '男' ? 'male' : row['性别'] === '女' ? 'female' : null
            validStudents.push({ name: row['姓名'], studentId, classId, gender, rowIndex: i })
        }

        if (validStudents.length === 0) {
            return c.json({ message: '没有有效的学生数据', total: data.length, success: 0, failed: data.length, errors })
        }

        // Step 4: Batch check for duplicates
        const duplicateCheckValues = validStudents.map(s => `('${s.name.replace(/'/g, "''")}', ${s.classId})`).join(', ')
        const duplicatesResult = await c.env.DB.prepare(`
            SELECT name, class_id FROM students 
            WHERE (name, class_id) IN (${duplicateCheckValues})
        `).all()
        const duplicatesSet = new Set<string>()
        duplicatesResult.results.forEach((row: any) => {
            duplicatesSet.add(`${row.name}:${row.class_id}`)
        })

        // Filter out duplicates
        const studentsToInsert = validStudents.filter(s => {
            const key = `${s.name}:${s.classId}`
            if (duplicatesSet.has(key)) {
                const className = Array.from(classMap.entries()).find(([_, id]) => id === s.classId)?.[0] || '未知'
                errors.push(`第 ${s.rowIndex + 2} 行: 学生 "${s.name}" 在班级 "${className}" 中已存在`)
                return false
            }
            return true
        })

        let successCount = 0
        const BATCH_SIZE = 100
        for (let i = 0; i < studentsToInsert.length; i += BATCH_SIZE) {
            const batch = studentsToInsert.slice(i, i + BATCH_SIZE)
            const values = batch.map(s => `('${s.name.replace(/'/g, "''")}', '${s.studentId}', ${s.classId}, ${s.gender ? `'${s.gender}'` : 'NULL'})`).join(', ')
            const insertSQL = `INSERT INTO students (name, student_id, class_id, gender) VALUES ${values}`
            try {
                const result = await c.env.DB.prepare(insertSQL).run()
                if (result.success) successCount += batch.length
            } catch (error) {
                console.error('Batch insert failed, falling back to individual inserts:', error)
                for (const student of batch) {
                    try {
                        await c.env.DB.prepare('INSERT INTO students (name, student_id, class_id, gender) VALUES (?, ?, ?, ?)')
                            .bind(student.name, student.studentId, student.classId, student.gender).run()
                        successCount++
                    } catch (err) {
                        errors.push(`第 ${student.rowIndex + 2} 行: ${err instanceof Error ? err.message : '插入失败'}`)
                    }
                }
            }
        }

        return c.json({
            message: '导入完成',
            total: data.length,
            success: successCount,
            failed: validStudents.length - successCount + errors.length,
            errors: errors.slice(0, 10)
        })
    } catch (error) {
        console.error('Import error:', error)
        return c.json({ error: '文件解析失败' }, 500)
    }
})

// Bulk import scores from Excel (Optimized)
importRoute.post('/scores', async (c) => {
    const user = c.get('user')
    try {
        const formData = await c.req.formData()
        const file = formData.get('file') as File
        const examId = formData.get('examId') as string

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

        // Identify course columns (skip '姓名' and '学号')
        const courseIndices: { [key: string]: number } = {}
        headers.forEach((header, index) => {
            if (header !== '姓名' && header !== '学号' && header) {
                courseIndices[header] = index
            }
        })

        // ---------- Preload data ----------
        // 1. Get exam's class_id
        const examInfo = await c.env.DB.prepare('SELECT class_id FROM exams WHERE id = ?').bind(examId).first()
        if (!examInfo) {
            return c.json({ error: '考试不存在' }, 400)
        }
        const classId = examInfo.class_id as number

        // 权限检查
        if (!await checkClassAccess(c.env.DB, user, classId)) {
            return c.json({ error: 'Forbidden: No access to this class' }, 403)
        }

        // 2. Load all students of that class (id, student_id, name)
        const studentsResult = await c.env.DB.prepare(`
            SELECT id, student_id, name FROM students WHERE class_id = ?
        `).bind(classId).all()
        const studentMapById = new Map<string, any>() // key: student_id
        const studentMapByName = new Map<string, any>() // fallback by name
        studentsResult.results.forEach((s: any) => {
            studentMapById.set(s.student_id, s)
            studentMapByName.set(s.name, s)
        })

        // 3. Load valid courses for this exam
        const validCoursesResult = await c.env.DB.prepare(`
            SELECT c.name, c.id FROM courses c
            JOIN exam_courses ec ON c.id = ec.course_id
            WHERE ec.exam_id = ?
        `).bind(examId).all()
        const validCoursesMap = new Map<string, number>()
        validCoursesResult.results.forEach((r: any) => validCoursesMap.set(r.name, r.id))

        const errors: string[] = []
        let successCount = 0
        let errorCount = 0
        const rowStudentCoursePairs: Array<{ studentId: number; courseId: number; score: number }> = []
        const scoreCheckPairs: string[] = []

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i]
            const studentName = row[headers.indexOf('姓名')]
            const studentIdCell = row[headers.indexOf('学号')]
            if (!studentName) continue // skip empty rows

            // Resolve student
            let student = null as any
            if (studentIdCell && studentMapById.has(studentIdCell)) {
                student = studentMapById.get(studentIdCell)
            } else if (studentMapByName.has(studentName)) {
                student = studentMapByName.get(studentName)
            }
            if (!student) {
                errors.push(`第 ${i + 2} 行: 找不到学生 "${studentName}" (${studentIdCell || '无学号'})`)
                errorCount++
                continue
            }

            // Iterate over each course column
            for (const [courseName, colIdx] of Object.entries(courseIndices)) {
                const rawScore = row[colIdx]
                if (rawScore === undefined || rawScore === null || rawScore === '') continue
                const score = parseFloat(rawScore)
                if (isNaN(score)) {
                    errors.push(`第 ${i + 2} 行: "${courseName}" 分数无效`)
                    continue
                }
                const courseId = validCoursesMap.get(courseName)
                if (!courseId) continue // course not part of this exam
                rowStudentCoursePairs.push({ studentId: student.id, courseId, score })
                scoreCheckPairs.push(`(${student.id}, ${examId}, ${courseId})`)
            }
        }

        // Batch query existing scores
        const existingScoresSet = new Set<string>() // key: `${studentId}-${courseId}`
        if (scoreCheckPairs.length > 0) {
            const CHUNK = 500
            for (let i = 0; i < scoreCheckPairs.length; i += CHUNK) {
                const chunkPairs = scoreCheckPairs.slice(i, i + CHUNK).join(',')
                const existing = await c.env.DB.prepare(`
                    SELECT student_id, course_id FROM scores 
                    WHERE (student_id, exam_id, course_id) IN (${chunkPairs})
                `).all()
                existing.results.forEach((r: any) => {
                    existingScoresSet.add(`${r.student_id}-${r.course_id}`)
                })
            }
        }

        // Separate inserts and updates
        const inserts: string[] = []
        const updates: Array<{ studentId: number; courseId: number; score: number }> = []
        for (const rec of rowStudentCoursePairs) {
            const key = `${rec.studentId}-${rec.courseId}`
            if (existingScoresSet.has(key)) {
                updates.push(rec)
            } else {
                inserts.push(`(${rec.studentId}, ${examId}, ${rec.courseId}, ${rec.score})`)
            }
        }

        // Execute batch inserts (chunks of 100)
        const INSERT_BATCH = 100
        for (let i = 0; i < inserts.length; i += INSERT_BATCH) {
            const batchVals = inserts.slice(i, i + INSERT_BATCH).join(',')
            const insertSQL = `INSERT INTO scores (student_id, exam_id, course_id, score) VALUES ${batchVals}`
            try {
                const res = await c.env.DB.prepare(insertSQL).run()
                if (res.success) successCount += batchVals.split('),(').length
            } catch (e) {
                console.error('Batch insert scores failed:', e)
                // fallback to individual inserts
                const batchArray = inserts.slice(i, i + INSERT_BATCH)
                for (const val of batchArray) {
                    const parts = val.replace(/[()]/g, '').split(',')
                    const [sid, eid, cid, sc] = parts.map(p => p.trim())
                    try {
                        await c.env.DB.prepare('INSERT INTO scores (student_id, exam_id, course_id, score) VALUES (?, ?, ?, ?)')
                            .bind(parseInt(sid), parseInt(eid), parseInt(cid), parseFloat(sc)).run()
                        successCount++
                    } catch (err) {
                        errors.push(`插入成绩失败: ${err instanceof Error ? err.message : String(err)}`)
                    }
                }
            }
        }

        // Execute updates (one by one, D1 does not support multi-row UPDATE)
        for (const upd of updates) {
            try {
                await c.env.DB.prepare(
                    'UPDATE scores SET score = ?, updated_at = CURRENT_TIMESTAMP WHERE student_id = ? AND exam_id = ? AND course_id = ?'
                ).bind(upd.score, upd.studentId, examId, upd.courseId).run()
                successCount++
            } catch (e) {
                errors.push(`更新成绩失败: ${e instanceof Error ? e.message : String(e)}`)
            }
        }

        return c.json({
            message: '导入完成',
            total: rows.length,
            success: successCount,
            failed: errorCount,
            errors: errors.slice(0, 10)
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

// Validate students data before import (Preview)
importRoute.post('/validate/students', async (c) => {
    try {
        const body = await c.req.json()
        const data = body.data as Array<{ '姓名': string; '班级': string; '性别'?: string }>

        if (!data || data.length === 0) {
            return c.json({ error: '没有提供数据' }, 400)
        }

        const result = await validateStudentsData(data, c.env.DB)

        return c.json(result)
    } catch (error) {
        console.error('Validation error:', error)
        return c.json({ error: '数据验证失败' }, 500)
    }
})

// AI score recognition from image
importRoute.post('/ai-scores', checkRole(['admin', 'head_teacher', 'teacher']), async (c) => {
    try {
        const formData = await c.req.formData()
        const file = formData.get('file') as File

        if (!file) {
            return c.json({ error: '请上传成绩单图片' }, 400)
        }

        if (!file.type.startsWith('image/')) {
            return c.json({ error: '仅支持图片格式' }, 400)
        }

        // Detect image type and convert to base64
        const imageType = file.type
        const imageBuffer = await file.arrayBuffer()

        // Convert buffer to binary string using chunking to avoid stack overflow
        const uint8Array = new Uint8Array(imageBuffer)
        let binary = ''
        const len = uint8Array.byteLength
        const chunkSize = 8192 // Use 8KB chunks

        for (let i = 0; i < len; i += chunkSize) {
            binary += String.fromCharCode(...uint8Array.subarray(i, i + chunkSize))
        }

        const imageBase64 = btoa(binary)

        // ModelScope (DashScope) API Configuration
        const apiKey = c.env.DASHSCOPE_API_KEY
        if (!apiKey) {
            return c.json({ error: 'Server configuration error: DASHSCOPE_API_KEY is missing.' }, 500)
        }

        // System prompt for structured extraction
        const systemPrompt = `你是一个专业的成绩单识别助手。请识别上传图片中的成绩表格，并严格按照以下 JSON 格式返回结果。
不要包含任何解释、多余的文本或 Markdown 标记，只返回纯 JSON。

返回格式：
{
  "className": "识别出的班级名称（如果没识别到则返回 null）",
  "examName": "识别出的考试名称（如果没识别到则返回 null）",
  "subject": "识别出的科目名称（如果没识别到则返回 null）",
  "data": [
    {
      "name": "学生姓名",
      "score": "分数（数字或字符串，包含缺考等信息）"
    }
  ]
}

注意：
1. 姓名必须识别准确。
2. 分数必须对应准确。
3. 如果表格有多个科目，只提取最显眼的或当前上下文相关的。`

        // Call ModelScope Inference API (OpenAI Compatible)
        const response = await fetch('https://api-inference.modelscope.cn/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'Qwen/Qwen3-VL-8B-Instruct', // Use user-specified model
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: '请识别这张图片中的成绩单数据。' },
                            { type: 'image_url', image_url: { url: `data:${imageType};base64,${imageBase64}` } }
                        ]
                    }
                ]
            })
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('DashScope API Error:', errorText)
            return c.json({ error: `AI 服务请求失败: ${response.status} ${response.statusText}` }, 500)
        }

        const data: any = await response.json()
        const resultString = data.choices?.[0]?.message?.content

        if (!resultString) {
            console.error('Empty AI response:', data)
            return c.json({ error: 'AI 未返回有效数据' }, 500)
        }

        // Extract JSON from response (handling potential markdown blocks)
        try {
            const jsonMatch = resultString.match(/\{[\s\S]*\}/)
            const resultData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(resultString)
            return c.json({
                success: true,
                ...resultData
            })
        } catch (e) {
            console.error('JSON Parse Error:', resultString)
            return c.json({ error: '识别结果解析失败', raw: resultString }, 500)
        }

    } catch (error: any) {
        console.error('AI Recognition Error:', error)

        // Handle Llama license agreement error
        if (error.message && error.message.includes('agree') && error.message.includes('submit the prompt')) {
            try {
                console.log('Attempting to accept Llama model license...')
                await c.env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
                    messages: [{ role: 'user', content: 'agree' }]
                })
                return c.json({ error: '系统已自动接受 AI 模型使用协议，请重新上传照片进行识别。' }, 500)
            } catch (agreeError) {
                console.error('Failed to accept license:', agreeError)
                return c.json({ error: '自动接受模型协议失败，请联系管理员。' }, 500)
            }
        }

        return c.json({ error: `识别过程出错: ${error.message}` }, 500)
    }
})

export default importRoute
