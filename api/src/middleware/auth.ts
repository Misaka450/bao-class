import { createMiddleware } from 'hono/factory'
import { verifyToken } from '../utils/jwt'
import { Env, JWTPayload } from '../types'

export const authMiddleware = createMiddleware<{ Bindings: Env; Variables: { user: JWTPayload } }>(async (c, next) => {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ success: false, message: 'Unauthorized' }, 401)
    }
    const token = authHeader.split(' ')[1]
    try {
        const payload = await verifyToken(token, c.env.JWT_SECRET)
        c.set('user', payload as unknown as JWTPayload)
        await next()
    } catch (e) {
        return c.json({ success: false, message: 'Invalid token' }, 401)
    }
})

export const checkRole = (roles: (string | string[])) => createMiddleware<{ Bindings: Env; Variables: { user: JWTPayload } }>(async (c, next) => {
    const user = c.get('user')
    const allowedRoles = Array.isArray(roles) ? roles : [roles]

    if (!user || !allowedRoles.includes(user.role)) {
        return c.json({ success: false, message: 'Forbidden: 权限不足' }, 403)
    }
    await next()
})

