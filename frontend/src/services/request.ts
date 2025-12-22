import { API_BASE_URL } from '../config';
import { useAuthStore } from '../store/authStore';

interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: any;
    headers?: Record<string, string>;
    skipErrorHandling?: boolean;
}

export interface RequestError extends Error {
    status?: number;
    code?: string;
    details?: any;
}

/**
 * 创建请求错误对象
 */
function createRequestError(
    message: string,
    status?: number,
    code?: string,
    details?: any
): RequestError {
    const error = new Error(message) as RequestError;
    error.status = status;
    error.code = code;
    error.details = details;
    return error;
}

/**
 * 统一的请求方法
 * 基于 Pro 模板的请求处理模式
 * 自动处理：Token、错误分类、响应解析
 */
export async function request<T = any>(
    endpoint: string,
    options: RequestOptions = {}
): Promise<T> {
    const { method = 'GET', body, headers = {}, skipErrorHandling = false } = options;

    // 获取 token（从 Zustand store）
    const token = useAuthStore.getState().token;

    // 构建请求配置
    const config: RequestInit = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
    };

    // 添加 Token
    if (token) {
        config.headers = {
            ...config.headers,
            Authorization: `Bearer ${token}`,
        };
    }

    // 添加 Body（处理 FormData）
    if (body) {
        if (body instanceof FormData) {
            // FormData 不需要设置 Content-Type，浏览器会自动设置
            delete (config.headers as any)['Content-Type'];
            config.body = body;
        } else {
            config.body = JSON.stringify(body);
        }
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

        // 处理非 2xx 响应
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || getStatusMessage(response.status);

            throw createRequestError(
                errorMessage,
                response.status,
                errorData.code,
                errorData
            );
        }

        // 解析响应
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const result = await response.json();

            // 处理后端统一响应格式 { success: boolean, data: any, message: string }
            // 或者 AI API 格式 { success: boolean, comment: string, ... }
            if (result && typeof result === 'object' && 'success' in result) {
                if (result.success) {
                    // 如果有 data 字段，返回 data；否则返回整个 result
                    return ('data' in result ? result.data : result) as T;
                } else {
                    throw createRequestError(
                        result.message || getStatusMessage(response.status),
                        response.status,
                        result.code,
                        result
                    );
                }
            }

            return result as T;
        } else {
            // 处理非 JSON 响应（如文件下载）
            return response as unknown as T;
        }
    } catch (error) {
        // 网络错误或其他异常
        if (error instanceof Error) {
            // 如果是我们创建的 RequestError，直接抛出
            if ('status' in error) {
                throw error;
            }

            // 网络连接错误
            if (error.name === 'TypeError' || error.message.includes('fetch')) {
                throw createRequestError(
                    '网络连接失败，请检查网络连接',
                    0,
                    'NETWORK_ERROR',
                    { originalError: error }
                );
            }

            // 其他错误
            throw createRequestError(
                error.message,
                undefined,
                'UNKNOWN_ERROR',
                { originalError: error }
            );
        }

        throw createRequestError('未知错误', undefined, 'UNKNOWN_ERROR');
    }
}

/**
 * 流式请求处理
 */
export async function requestStream(
    endpoint: string,
    options: RequestOptions & { onChunk: (chunk: string) => void; onThinking?: (thinking: string) => void }
): Promise<void> {
    const { method = 'POST', body, headers = {}, onChunk, onThinking } = options;
    const token = useAuthStore.getState().token;

    const config: RequestInit = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw createRequestError(errorData.message || '流式请求失败', response.status);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) throw new Error('无法读取响应流');

    let buffer = '';
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // 处理 SSE 格式数据 (data: {...})
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 最后一项可能不完整，保留到缓冲区

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || !trimmedLine.startsWith('data:')) continue;

            const dataStr = trimmedLine.replace('data:', '').trim();
            if (dataStr === '[DONE]') break;

            try {
                const parsed = JSON.parse(dataStr);
                if (parsed.thinking && onThinking) {
                    onThinking(parsed.thinking);
                } else if (parsed.content) {
                    onChunk(parsed.content);
                }
            } catch (e) {
                console.warn('解析流式数据块失败:', e);
            }
        }
    }
}

/**
 * 根据状态码获取默认错误消息
 */
function getStatusMessage(status: number): string {
    switch (status) {
        case 400:
            return '请求参数错误';
        case 401:
            return '未授权，请重新登录';
        case 403:
            return '权限不足';
        case 404:
            return '请求的资源不存在';
        case 408:
            return '请求超时';
        case 500:
            return '服务器内部错误';
        case 502:
            return '网关错误';
        case 503:
            return '服务暂时不可用';
        case 504:
            return '网关超时';
        default:
            return `请求失败 (${status})`;
    }
}

/**
 * GET 请求
 */
export function get<T = any>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return request<T>(endpoint, { method: 'GET', headers });
}

/**
 * POST 请求
 */
export function post<T = any>(
    endpoint: string,
    body?: any,
    headers?: Record<string, string>
): Promise<T> {
    return request<T>(endpoint, { method: 'POST', body, headers });
}

/**
 * PUT 请求
 */
export function put<T = any>(
    endpoint: string,
    body?: any,
    headers?: Record<string, string>
): Promise<T> {
    return request<T>(endpoint, { method: 'PUT', body, headers });
}

/**
 * DELETE 请求
 */
export function del<T = any>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return request<T>(endpoint, { method: 'DELETE', headers });
}
