import { D1Database } from '@cloudflare/workers-types';

type LogContext = {
    requestId?: string
    method?: string
    path?: string
    userAgent?: string | null
    [key: string]: any
}

class Logger {
    private context: LogContext = {}

    setContext(context: LogContext) {
        this.context = { ...this.context, ...context }
    }

    clearContext() {
        this.context = {}
    }

    info(message: string, meta?: any) {
        console.log(JSON.stringify({
            level: 'info',
            message,
            timestamp: new Date().toISOString(),
            ...this.context,
            ...meta
        }))
    }

    error(message: string, meta?: any) {
        console.error(JSON.stringify({
            level: 'error',
            message,
            timestamp: new Date().toISOString(),
            ...this.context,
            ...meta
        }))
    }
}

export const logger = new Logger()

export async function logAction(
    db: D1Database,
    userId: number | null,
    username: string | null,
    action: string,
    entityType: string,
    entityId: number | null,
    details: any
) {
    try {
        await db.prepare(
            `INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, details)
             VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(
            userId,
            username,
            action,
            entityType,
            entityId,
            JSON.stringify(details)
        ).run();
    } catch (error) {
        console.error('Failed to log action:', error);
        // Don't throw error to prevent blocking the main action
    }
}
