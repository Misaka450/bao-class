import { Hono } from 'hono'
import * as XLSX from 'xlsx'
import { authMiddleware } from '../middleware/auth'

type Bindings = {
    DB: D1Database
}

const exportRoute = new Hono<{ Bindings: Bindings }>()

// Apply auth middleware to all routes
exportRoute.use('*', authMiddleware)

/**
 * 导出班级成绩单为 Excel
 * GET /api/export/class-scores/:classId?examId=xxx
 */
exportRoute.get('/class-scores/:classId', async (c) => {
    const classId = c.req.param('classId')
    const examId = c.req.query('examId')

    if (!examId) {
        return c.json({ error: 'examId is required' }, 400)
    }

    try {
        // 获取班级信息
        const classInfo = await c.env.DB.prepare(`
            SELECT name FROM classes WHERE id = ?
        `).bind(classId).first()

        if (!classInfo) {
            return c.json({ error: 'Class not found' }, 404)
        }

        // 获取考试信息
        const examInfo = await c.env.DB.prepare(`
            SELECT name, exam_date FROM exams WHERE id = ?
        `).bind(examId).first()

        if (!examInfo) {
            return c.json({ error: 'Exam not found' }, 404)
        }

        // 获取考试包含的所有课程
        const courses = await c.env.DB.prepare(`
            SELECT c.id, c.name
            FROM courses c
            JOIN exam_courses ec ON c.id = ec.course_id
            WHERE ec.exam_id = ?
            ORDER BY c.name
        `).bind(examId).all()

        if (!courses.results || courses.results.length === 0) {
            return c.json({ error: 'No courses found for this exam' }, 404)
        }

        // 获取所有学生成绩
        const students = await c.env.DB.prepare(`
            SELECT 
                s.id,
                s.student_id as student_number,
                s.name as student_name
            FROM students s
            WHERE s.class_id = ?
            ORDER BY s.student_id
        `).bind(classId).all()

        // 构建 Excel 数据
        const headers = ['学号', '姓名']
        const courseIds: number[] = []

        for (const course of courses.results as any[]) {
            headers.push(course.name)
            courseIds.push(course.id)
        }
        headers.push('总分', '平均分', '排名')

        const data: any[][] = [headers]

        // 为每个学生获取成绩
        const studentScores: Map<number, any> = new Map()

        for (const student of students.results as any[]) {
            const scores: { [key: number]: number } = {}
            let total = 0
            let count = 0

            // 获取该学生在本次考试的所有科目成绩
            const studentExamScores = await c.env.DB.prepare(`
                SELECT course_id, score
                FROM scores
                WHERE student_id = ? AND exam_id = ?
            `).bind(student.id, examId).all()

            for (const scoreRecord of studentExamScores.results as any[]) {
                scores[scoreRecord.course_id] = scoreRecord.score
                total += scoreRecord.score
                count++
            }

            studentScores.set(student.id, {
                student,
                scores,
                total,
                average: count > 0 ? total / count : 0
            })
        }

        // 计算排名（按总分降序）
        const sortedStudents = Array.from(studentScores.values())
            .sort((a, b) => b.total - a.total)

        let rank = 1
        for (const studentData of sortedStudents) {
            const row: any[] = [
                studentData.student.student_number,
                studentData.student.student_name
            ]

            // 添加各科成绩
            for (const courseId of courseIds) {
                row.push(studentData.scores[courseId] || '-')
            }

            // 添加总分、平均分、排名
            row.push(
                studentData.total,
                studentData.average.toFixed(2),
                rank++
            )

            data.push(row)
        }

        // 创建工作簿
        const ws = XLSX.utils.aoa_to_sheet(data)

        // 设置列宽
        const colWidths = [
            { wch: 12 }, // 学号
            { wch: 10 }, // 姓名
        ]
        for (let i = 0; i < courseIds.length; i++) {
            colWidths.push({ wch: 8 }) // 各科成绩
        }
        colWidths.push({ wch: 8 })  // 总分
        colWidths.push({ wch: 8 })  // 平均分
        colWidths.push({ wch: 6 })  // 排名

        ws['!cols'] = colWidths

        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, '成绩单')

        // 生成 Excel 文件
        const excelBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })

        // 生成文件名
        const filename = `${classInfo.name}_${examInfo.name}_成绩单_${examInfo.exam_date}.xlsx`

        return new Response(excelBuffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`
            }
        })
    } catch (error) {
        console.error('Export class scores error:', error)
        return c.json({
            error: 'Failed to export class scores',
            details: error instanceof Error ? error.message : '未知错误'
        }, 500)
    }
})

/**
 * 导出学生个人成绩报告为 Excel
 * GET /api/export/student-report/:studentId
 */
exportRoute.get('/student-report/:studentId', async (c) => {
    const studentId = c.req.param('studentId')

    try {
        // 获取学生信息
        const student = await c.env.DB.prepare(`
            SELECT s.*, c.name as class_name
            FROM students s
            JOIN classes c ON s.class_id = c.id
            WHERE s.id = ?
        `).bind(studentId).first()

        if (!student) {
            return c.json({ error: 'Student not found' }, 404)
        }

        // 获取学生所有考试成绩
        const scores = await c.env.DB.prepare(`
            SELECT 
                e.name as exam_name,
                e.exam_date,
                co.name as course_name,
                s.score
            FROM scores s
            JOIN exams e ON s.exam_id = e.id
            JOIN courses co ON s.course_id = co.id
            WHERE s.student_id = ?
            ORDER BY e.exam_date DESC, co.name
        `).bind(studentId).all()

        // 构建数据
        const data: any[][] = [
            [`学生姓名：${student.name}`, `学号：${student.student_id}`, `班级：${student.class_name}`],
            [],
            ['考试名称', '考试日期', '科目', '分数']
        ]

        for (const score of scores.results as any[]) {
            data.push([
                score.exam_name,
                score.exam_date,
                score.course_name,
                score.score
            ])
        }

        // 创建工作簿
        const ws = XLSX.utils.aoa_to_sheet(data)
        ws['!cols'] = [
            { wch: 20 },
            { wch: 12 },
            { wch: 10 },
            { wch: 8 }
        ]

        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, '个人成绩报告')

        // 生成 Excel 文件
        const excelBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })

        const filename = `${student.name}_成绩报告.xlsx`

        return new Response(excelBuffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`
            }
        })
    } catch (error) {
        console.error('Export student report error:', error)
        return c.json({
            error: 'Failed to export student report',
            details: error instanceof Error ? error.message : '未知错误'
        }, 500)
    }
})

export default exportRoute
