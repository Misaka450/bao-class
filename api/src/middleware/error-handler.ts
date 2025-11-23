import { Context, Next } from 'hono';
import { Env } from '../types';

/**
 * 全局错误处理中间件
 */
export const errorHandler = (err: Error, c: Context<{ Bindings: Env }>) => {
    console.error('Error:', err);

    const isDevelopment = c.env.ENVIRONMENT !== 'production';

    return c.json({
        error: isDevelopment ? err.message : 'Internal Server Error',
        ...(isDevelopment && { stack: err.stack })
    }, 500);
};
