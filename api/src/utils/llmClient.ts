import { Env } from '../types';
import { AppError } from './AppError';
import { checkAndIncrementQuota } from './aiQuota';

export interface LLMCallOptions {
    system: string;
    user: string;
    stream?: boolean;
    model?: string;
}

/**
 * 统一的 LLM 调用工具类
 * 集中管理所有 AI 模型调用，包括额度检查、错误处理等
 */
export class LLMClient {
    private static readonly DEFAULT_MODEL = 'deepseek-ai/DeepSeek-V3.2';
    private static readonly API_URL = 'https://api-inference.modelscope.cn/v1/chat/completions';

    /**
     * 调用 LLM 模型
     * @param env - Cloudflare 环境变量
     * @param options - 调用选项
     * @returns 非流式返回字符串，流式返回 Response
     */
    static async call(env: Env, options: LLMCallOptions): Promise<string | Response> {
        const { system, user, stream = false, model = this.DEFAULT_MODEL } = options;

        // 每次调用模型时检查并增加额度
        await checkAndIncrementQuota(env);

        const apiKey = env.DASHSCOPE_API_KEY;
        if (!apiKey) throw new AppError('DASHSCOPE_API_KEY not configured', 500);

        const response = await fetch(this.API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                ...(stream ? { 'Accept': 'text/event-stream' } : {})
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: system },
                    { role: 'user', content: user }
                ],
                stream
            })
        });

        if (!response.ok) {
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
