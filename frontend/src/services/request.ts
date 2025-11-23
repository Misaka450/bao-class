import { message } from 'antd';
import { API_BASE_URL } from '../config';
import { useAuthStore } from '../store/authStore';

interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: any;
    headers?: Record<string, string>;
}

/**
 * 统一的请求方法
 * 自动处理：Token、错误提示、响应解析
 */
export async function request<T = any>(
    endpoint: string,
    options: RequestOptions = {}
): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;

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

    // 添加 Body
    if (body) {
        config.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

        // 处理非 2xx 响应
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || `请求失败 (${response.status})`;
            message.error(errorMessage);
            throw new Error(errorMessage);
        }

        // 解析 JSON
        const data = await response.json();
        return data as T;
    } catch (error) {
        // 网络错误或其他异常
        if (error instanceof Error) {
            if (!error.message.includes('请求失败')) {
                message.error('网络请求失败，请检查网络连接');
            }
            throw error;
        }
        throw new Error('未知错误');
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
