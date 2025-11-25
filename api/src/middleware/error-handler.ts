import { Context } from 'hono';
import { Env } from '../types';
import { AppError } from '../utils/AppError';

/**
 * 全局错误处理中间件
 */
export const errorHandler = (err: Error, c: Context<{ Bindings: Env }>) => {
    console.error('Error:', err);

    const isDevelopment = c.env.ENVIRONMENT !== 'production';

    let statusCode = 500;
    let message = 'Internal Server Error';

    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
    } else if (isDevelopment) {
        message = err.message;
    }

    return c.json({
        success: false,
        message, // 前端 request.ts 优先读取 message 字段
        error: message, // 兼容旧代码可能读取 error 字段
        ...(isDevelopment && { stack: err.stack })
    }, statusCode as any);
};
