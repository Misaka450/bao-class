import { Env } from '../types';

/**
 * 模型额度信息接口
 */
export interface ModelQuotaInfo {
    model: string;
    userLimit: number | null;
    userRemaining: number | null;
    modelLimit: number | null;
    modelRemaining: number | null;
    updatedAt: string;
}

/**
 * 从响应头中提取额度信息
 */
export function extractQuotaFromHeaders(headers: Headers): {
    userLimit: number | null;
    userRemaining: number | null;
    modelLimit: number | null;
    modelRemaining: number | null;
} {
    const parseHeader = (name: string): number | null => {
        const value = headers.get(name);
        return value ? parseInt(value, 10) : null;
    };

    return {
        userLimit: parseHeader('modelscope-ratelimit-requests-limit'),
        userRemaining: parseHeader('modelscope-ratelimit-requests-remaining'),
        modelLimit: parseHeader('modelscope-ratelimit-model-requests-limit'),
        modelRemaining: parseHeader('modelscope-ratelimit-model-requests-remaining'),
    };
}

/**
 * 保存模型额度信息到 KV
 */
export async function saveModelQuota(
    env: Env,
    model: string,
    quota: ReturnType<typeof extractQuotaFromHeaders>
): Promise<void> {
    // 仅当有有效数据时才保存
    if (quota.modelLimit === null && quota.modelRemaining === null) {
        return;
    }

    const key = `MODEL_QUOTA:${model}`;
    const data: ModelQuotaInfo = {
        model,
        userLimit: quota.userLimit,
        userRemaining: quota.userRemaining,
        modelLimit: quota.modelLimit,
        modelRemaining: quota.modelRemaining,
        updatedAt: new Date().toISOString(),
    };

    // 保存到 KV，设置 24 小时过期
    await env.KV.put(key, JSON.stringify(data), { expirationTtl: 24 * 60 * 60 });
}

/**
 * 获取所有模型额度信息
 */
export async function getModelQuotas(env: Env): Promise<ModelQuotaInfo[]> {
    const list = await env.KV.list({ prefix: 'MODEL_QUOTA:' });
    const quotas: ModelQuotaInfo[] = [];

    for (const key of list.keys) {
        const value = await env.KV.get(key.name);
        if (value) {
            try {
                quotas.push(JSON.parse(value));
            } catch {
                // 忽略解析错误
            }
        }
    }

    // 按更新时间降序排列
    return quotas.sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
}
