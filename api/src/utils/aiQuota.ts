import { Env } from '../types';

const DAILY_LIMIT = 500;

/**
 * 获取今日日期键
 */
function getTodayKey(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `AI_USAGE:${year}-${month}-${day}`;
}

/**
 * 获取当前 AI 用量
 */
export async function getAIUsage(env: Env): Promise<{ used: number; total: number; remaining: number }> {
    const key = getTodayKey();
    const value = await env.KV.get(key);
    const used = value ? parseInt(value, 10) : 0;
    return {
        used,
        total: DAILY_LIMIT,
        remaining: Math.max(0, DAILY_LIMIT - used)
    };
}

/**
 * 检查并增加 AI 用量
 * 如果超过限制，抛出错误
 */
export async function checkAndIncrementQuota(env: Env): Promise<void> {
    const key = getTodayKey();
    const value = await env.KV.get(key);
    const currentCount = value ? parseInt(value, 10) : 0;

    if (currentCount >= DAILY_LIMIT) {
        throw new QuotaExceededError();
    }

    // 增加计数，设置过期时间为 48 小时（确保跨日后仍能读取到前一天的数据，但最终会自动清理）
    await env.KV.put(key, String(currentCount + 1), { expirationTtl: 48 * 60 * 60 });
}

/**
 * AI 额度超限错误
 */
export class QuotaExceededError extends Error {
    public statusCode = 429;
    constructor() {
        super('今日 AI 额度已用完（500次/天），请明天再试！');
        this.name = 'QuotaExceededError';
    }
}
