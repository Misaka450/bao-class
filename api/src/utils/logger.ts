import { D1Database } from '@cloudflare/workers-types';

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
