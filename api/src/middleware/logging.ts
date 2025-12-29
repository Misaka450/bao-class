import { Context, Next } from 'hono'
import { logger } from '../utils/logger'

/**
 * 请求日志中间件
 * 记录每个 API 请求的详细信息
 */
export const loggingMiddleware = async (c: Context, next: Next) => {
    const startTime = Date.now()
    const requestId = crypto.randomUUID()

    // 设置请求上下文
    logger.setContext({
        requestId,
        method: c.req.method,
        path: c.req.path,
        userAgent: c.req.header('user-agent')
    })

    // 记录请求开始
    logger.info('Request started', {
        query: c.req.query(),
        headers: {
            'content-type': c.req.header('content-type'),
            'authorization': c.req.header('authorization') ? '[REDACTED]' : undefined
        }
    })

    try {
        await next()

        const duration = Date.now() - startTime
        const status = c.res.status

        // 记录请求完成
        logger.info('Request completed', {
            status,
            duration: `${duration}ms`
        })

    } catch (error) {
        const duration = Date.now() - startTime

        // 记录错误
        logger.error('Request failed', {
            error: error instanceof Error ? error.message : String(error),
            duration: `${duration}ms`
        })

        throw error
    } finally {
        // 清理上下文
        logger.clearContext()
    }
}
