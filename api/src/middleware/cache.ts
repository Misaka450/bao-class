import { createMiddleware } from 'hono/factory'

export interface CacheOptions {
    /** 缓存最大存活时间（秒） */
    maxAge: number;
    /** stale-while-revalidate 时间（秒），可选 */
    staleWhileRevalidate?: number;
    /** 是否忽略请求头中的 Cache-Control */
    ignoreRequestCacheControl?: boolean;
}

/**
 * 增强型缓存中间件
 * - 支持 stale-while-revalidate 策略
 * - 尊重请求头中的 Cache-Control: no-cache
 * - 可配置缓存时间
 */
export const cacheMiddleware = (optionsOrSeconds: CacheOptions | number) => {
    const options: CacheOptions = typeof optionsOrSeconds === 'number'
        ? { maxAge: optionsOrSeconds }
        : optionsOrSeconds;

    const { maxAge, staleWhileRevalidate, ignoreRequestCacheControl = false } = options;

    return createMiddleware(async (c, next) => {
        const key = c.req.url;

        // 检查请求头是否指示跳过缓存
        if (!ignoreRequestCacheControl) {
            const requestCacheControl = c.req.header('Cache-Control');
            if (requestCacheControl?.includes('no-cache') || requestCacheControl?.includes('no-store')) {
                await next();
                return;
            }
        }

        try {
            const cache = (caches as any).default;
            const response = await cache.match(key);
            if (response) {
                return response;
            }
        } catch (e) {
            // Ignore cache errors in dev
        }

        await next();

        try {
            const cache = (caches as any).default;
            const res = c.res.clone();

            // 构建 Cache-Control 头
            let cacheControlValue = `max-age=${maxAge}`;
            if (staleWhileRevalidate) {
                cacheControlValue += `, stale-while-revalidate=${staleWhileRevalidate}`;
            }

            res.headers.set('Cache-Control', cacheControlValue);
            c.executionCtx.waitUntil(cache.put(key, res));
        } catch (e) {
            // Ignore
        }
    })
}

/**
 * Stats API 专用缓存（短 TTL）
 * 适用于频繁变动但允许短暂延迟的数据
 */
export const statsCacheMiddleware = cacheMiddleware({
    maxAge: 60,              // 1 分钟缓存
    staleWhileRevalidate: 60 // 额外 1 分钟容忍陈旧数据
});

/**
 * 静态数据缓存（长 TTL）
 * 适用于不经常变动的数据
 */
export const staticCacheMiddleware = cacheMiddleware({
    maxAge: 300,              // 5 分钟缓存
    staleWhileRevalidate: 120 // 额外 2 分钟容忍陈旧数据
});

