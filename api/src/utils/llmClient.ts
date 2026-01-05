import { Env } from '../types';
import { AppError } from './AppError';
import { checkAndIncrementQuota } from './aiQuota';
import { extractQuotaFromHeaders, saveModelQuota } from './modelQuota';

export interface LLMCallOptions {
    system: string;
    user: string;
    stream?: boolean;
    model?: string;
    history?: Array<{ role: string, content: string }>;
    maxRetries?: number; // 最大重试次数，默认 3
}

// 可重试的 HTTP 状态码
const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504];

/**
 * 判断错误是否可重试
 */
function isRetryableError(error: unknown, statusCode?: number): boolean {
    if (statusCode && RETRYABLE_STATUS_CODES.includes(statusCode)) {
        return true;
    }
    if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        // 网络错误、超时等
        return msg.includes('network') || msg.includes('timeout') || msg.includes('fetch');
    }
    return false;
}

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 统一的 LLM 调用工具类
 * 集中管理所有 AI 模型调用，包括额度检查、错误处理、重试机制
 */
export class LLMClient {
    private static readonly DEFAULT_MODEL = 'deepseek-ai/DeepSeek-V3.2';
    private static readonly API_URL = 'https://api-inference.modelscope.cn/v1/chat/completions';
    private static readonly DEFAULT_MAX_RETRIES = 3;
    private static readonly BASE_DELAY_MS = 1000; // 基础延迟 1 秒

    /**
     * 调用 LLM 模型（带重试机制）
     * @param env - Cloudflare 环境变量
     * @param options - 调用选项
     * @param retryCount - 当前重试次数（内部使用）
     * @returns 非流式返回字符串，流式返回 Response
     */
    static async call(env: Env, options: LLMCallOptions, retryCount: number = 0): Promise<string | Response> {
        const {
            system,
            user,
            stream = false,
            model = this.DEFAULT_MODEL,
            history = [],
            maxRetries = this.DEFAULT_MAX_RETRIES
        } = options;

        // 每次调用模型时检查并增加额度（仅首次调用）
        if (retryCount === 0) {
            await checkAndIncrementQuota(env);
        }

        const apiKey = env.DASHSCOPE_API_KEY;
        if (!apiKey) throw new AppError('DASHSCOPE_API_KEY not configured', 500);

        // 构建消息列表：system + history + user
        const messages = [
            { role: 'system', content: system },
            ...history.map(h => ({ role: h.role, content: h.content })),
            { role: 'user', content: user }
        ];

        let response: Response;
        try {
            response = await fetch(this.API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    ...(stream ? { 'Accept': 'text/event-stream' } : {})
                },
                body: JSON.stringify({
                    model,
                    messages,
                    stream
                })
            });
        } catch (error) {
            // 网络错误，尝试重试
            if (retryCount < maxRetries && isRetryableError(error)) {
                const delayMs = this.BASE_DELAY_MS * Math.pow(2, retryCount);
                console.warn(`LLM call failed (attempt ${retryCount + 1}/${maxRetries}), retrying in ${delayMs}ms...`);
                await delay(delayMs);
                return this.call(env, options, retryCount + 1);
            }
            throw error;
        }

        // 提取并保存模型额度信息（异步执行，不阻塞主流程）
        const quotaInfo = extractQuotaFromHeaders(response.headers);
        saveModelQuota(env, model, quotaInfo).catch(() => { /* 忽略保存错误 */ });

        if (!response.ok) {
            // 检查是否可重试
            if (retryCount < maxRetries && isRetryableError(null, response.status)) {
                const delayMs = this.BASE_DELAY_MS * Math.pow(2, retryCount);
                // 对于 429，尝试从响应头获取重试时间
                const retryAfter = response.headers.get('Retry-After');
                const actualDelay = retryAfter ? parseInt(retryAfter, 10) * 1000 : delayMs;
                console.warn(`LLM API returned ${response.status} (attempt ${retryCount + 1}/${maxRetries}), retrying in ${actualDelay}ms...`);
                await delay(actualDelay);
                return this.call(env, options, retryCount + 1);
            }

            const error = await response.json().catch(() => ({ message: 'unknown error' })) as any;
            throw new AppError(error.message || `AI API error: ${response.status}`, response.status);
        }

        if (stream) {
            return new Response(response.body, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive'
                }
            });
        }

        const data: any = await response.json();
        return data.choices?.[0]?.message?.content || '';
    }

    /**
     * 流式调用 LLM 模型（返回原始 body 用于进一步处理）
     */
    static async callStreamRaw(env: Env, options: Omit<LLMCallOptions, 'stream'>): Promise<ReadableStream<Uint8Array> | null> {
        const response = await this.call(env, { ...options, stream: true }) as Response;
        return response.body;
    }
}
