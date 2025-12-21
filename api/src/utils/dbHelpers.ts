import { D1Database } from '@cloudflare/workers-types'

/**
 * 获取班级最新考试ID（带内存缓存）
 * 避免在同一请求周期内重复查询
 */
const latestExamCache = new Map<string, { id: string; timestamp: number }>()
const CACHE_TTL = 60000 // 1分钟缓存

export async function getLatestExamId(db: D1Database, classId: string): Promise<string | null> {
    const cacheKey = `latest_exam_${classId}`
    const cached = latestExamCache.get(cacheKey)

    // 检查缓存是否有效
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.id
    }

    const result = await db.prepare(`
        SELECT id FROM exams 
        WHERE class_id = ?
        ORDER BY exam_date DESC LIMIT 1
    `).bind(classId).first<{ id: string }>()

    if (result?.id) {
        latestExamCache.set(cacheKey, { id: result.id, timestamp: Date.now() })
        return result.id
    }

    return null
}

/**
 * 清除班级最新考试缓存（当有新考试添加时调用）
 */
export function clearLatestExamCache(classId?: string): void {
    if (classId) {
        latestExamCache.delete(`latest_exam_${classId}`)
    } else {
        latestExamCache.clear()
    }
}
