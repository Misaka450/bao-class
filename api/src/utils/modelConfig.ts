import { Env } from '../types';

/**
 * AI 功能类型
 */
export type AIFeature =
    | 'comment'      // 学生评语生成
    | 'report'       // 班级报告分析
    | 'lesson'       // 教案/作业生成
    | 'chat'         // AI 对话问答
    | 'vision';      // AI 成绩导入（视觉模型）

/**
 * 可选的文本模型列表
 */
export const TEXT_MODELS = [
    'deepseek-ai/DeepSeek-V3.2',
    'Qwen/Qwen3-235B-A22B-Instruct-2507',
    'ZhipuAI/GLM-4.7',
    'Qwen/Qwen3-Next-80B-A3B-Instruct',
    'XiaomiMiMo/MiMo-V2-Flash',
] as const;

/**
 * 可选的视觉模型列表
 */
export const VISION_MODELS = [
    'Qwen/Qwen3-VL-8B-Instruct',
    'Qwen/Qwen2-VL-72B-Instruct',
] as const;

/**
 * 默认模型配置
 */
export const DEFAULT_MODELS: Record<AIFeature, string> = {
    comment: 'deepseek-ai/DeepSeek-V3.2',
    report: 'deepseek-ai/DeepSeek-V3.2',
    lesson: 'deepseek-ai/DeepSeek-V3.2',
    chat: 'Qwen/Qwen3-235B-A22B-Instruct-2507',
    vision: 'Qwen/Qwen3-VL-8B-Instruct',
};

/**
 * 功能描述
 */
export const FEATURE_LABELS: Record<AIFeature, string> = {
    comment: '学生评语生成',
    report: '班级报告分析',
    lesson: '教案/作业生成',
    chat: 'AI 对话问答',
    vision: 'AI 成绩导入',
};

/**
 * 获取功能使用的模型
 */
export async function getModelForFeature(env: Env, feature: AIFeature): Promise<string> {
    const key = `MODEL_CONFIG:${feature}`;
    const value = await env.KV.get(key);
    return value || DEFAULT_MODELS[feature];
}

/**
 * 设置功能使用的模型
 */
export async function setModelForFeature(env: Env, feature: AIFeature, model: string): Promise<void> {
    const key = `MODEL_CONFIG:${feature}`;
    await env.KV.put(key, model);
}

/**
 * 获取所有功能的模型配置
 */
export async function getAllModelConfigs(env: Env): Promise<Record<AIFeature, string>> {
    const features: AIFeature[] = ['comment', 'report', 'lesson', 'chat', 'vision'];
    const configs: Record<string, string> = {};

    for (const feature of features) {
        configs[feature] = await getModelForFeature(env, feature);
    }

    return configs as Record<AIFeature, string>;
}

/**
 * 验证模型是否有效
 */
export function isValidModel(feature: AIFeature, model: string): boolean {
    if (feature === 'vision') {
        return (VISION_MODELS as readonly string[]).includes(model);
    }
    return (TEXT_MODELS as readonly string[]).includes(model);
}
