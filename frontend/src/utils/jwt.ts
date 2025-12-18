/**
 * Simple JWT utility functions to avoid adding 'jwt-decode' dependency
 */

export interface JWTPayload {
    userId: number;
    username: string;
    role: 'admin' | 'teacher' | 'student' | 'parent';
    exp: number;
    iat: number;
    [key: string]: any;
}

/**
 * Decode JWT token payload
 */
export function parseToken(token: string): JWTPayload | null {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            window
                .atob(base64)
                .split('')
                .map(function (c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                })
                .join('')
        );

        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error('Error parsing token:', e);
        return null;
    }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
    const payload = parseToken(token);
    if (!payload) return true;

    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
}
