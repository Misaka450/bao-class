import { Context, Next } from 'hono';
import { Env } from '../types';

// 简单的内存存储，生产环境应该使用 KV 或其他持久化存储
const requestCounts = new Map<string, { count: number; resetTime: number }>();

/**
 * 速率限制中间件
 * @param windowMs 时间窗口（毫秒）
 * @param maxRequests 最大请求数
 */
export const rateLimiter = (windowMs: number = 15 * 60 * 1000, maxRequests: number = 100) => {
    return async (c: Context<{ Bindings: Env }>, next: Next) => {
        const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
        const now = Date.now();

        const record = requestCounts.get(ip);

        if (!record || now > record.resetTime) {
            // 新窗口或窗口已过期
            requestCounts.set(ip, {
                count: 1,
                resetTime: now + windowMs
            });
        } else {
            record.count++;

            if (record.count > maxRequests) {
                return c.json({
                    error: 'Too Many Requests',
                    message: 'Rate limit exceeded. Please try again later.',
                    retryAfter: Math.ceil((record.resetTime - now) / 1000)
                }, 429);
            }
        }

        await next();
    };
};
