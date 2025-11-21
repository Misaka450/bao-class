import { sign, verify } from 'hono/jwt'
import { JWTPayload } from '../types'

export const generateToken = async (payload: JWTPayload, secret: string) => {
    return await sign(payload as unknown as Record<string, unknown>, secret)
}

export const verifyToken = async (token: string, secret: string) => {
    return await verify(token, secret)
}
