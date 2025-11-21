import { createMiddleware } from 'hono/factory'

export const cacheMiddleware = (seconds: number) => {
    return createMiddleware(async (c, next) => {
        const key = c.req.url

        try {
            const cache = (caches as any).default
            const response = await cache.match(key)
            if (response) {
                return response
            }
        } catch (e) {
            // Ignore cache errors in dev
        }

        await next()

        try {
            const cache = (caches as any).default
            const res = c.res.clone()
            res.headers.set('Cache-Control', `max-age=${seconds}`)
            c.executionCtx.waitUntil(cache.put(key, res))
        } catch (e) {
            // Ignore
        }
    })
}
