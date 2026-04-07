import { D1Database } from '@cloudflare/workers-types'

/**
 * 获取班级最新考试ID
 * 注意：Cloudflare Workers 是无状态的，每次请求都是独立的实例
 * 因此不使用模块级缓存，直接查询数据库
 */
export async function getLatestExamId(db: D1Database, classId: string): Promise<string | null> {
    const result = await db.prepare(`
        SELECT id FROM exams 
        WHERE class_id = ?
        ORDER BY exam_date DESC LIMIT 1
    `).bind(classId).first<{ id: string }>()

    return result?.id || null
}

/**
 * 清除班级最新考试缓存（保留接口兼容性，但实际无操作）
 * @deprecated Workers 无状态环境下缓存无效，此函数保留仅为兼容性
 */
export function clearLatestExamCache(_classId?: string): void {
    // Workers 无状态，无需清理
}

export interface ExamContext {
    id: number
    class_id: number
    name: string
    exam_date: string
    total_full_score: number
    course_count: number
}

export async function getExamContext(db: D1Database, examId: number | string): Promise<ExamContext | null> {
    const result = await db.prepare(`
        SELECT
            e.id,
            e.class_id,
            e.name,
            e.exam_date,
            COALESCE(SUM(ec.full_score), 0) as total_full_score,
            COUNT(ec.course_id) as course_count
        FROM exams e
        LEFT JOIN exam_courses ec ON ec.exam_id = e.id
        WHERE e.id = ?
        GROUP BY e.id, e.class_id, e.name, e.exam_date
    `).bind(examId).first<any>()

    if (!result) return null

    return {
        id: Number(result.id),
        class_id: Number(result.class_id),
        name: String(result.name),
        exam_date: String(result.exam_date),
        total_full_score: Number(result.total_full_score || 0),
        course_count: Number(result.course_count || 0)
    }
}

export async function getExamCourseFullScore(
    db: D1Database,
    examId: number | string,
    courseId: number | string
): Promise<number | null> {
    const result = await db.prepare(`
        SELECT full_score
        FROM exam_courses
        WHERE exam_id = ? AND course_id = ?
    `).bind(examId, courseId).first<{ full_score: number }>()

    return result ? Number(result.full_score) : null
}

export async function studentBelongsToClass(
    db: D1Database,
    studentId: number | string,
    classId: number | string
): Promise<boolean> {
    const result = await db.prepare(`
        SELECT 1
        FROM students
        WHERE id = ? AND class_id = ?
    `).bind(studentId, classId).first()

    return Boolean(result)
}
