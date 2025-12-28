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
