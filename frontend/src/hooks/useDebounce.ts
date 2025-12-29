import { useState, useEffect } from 'react';

/**
 * 防抖 Hook
 * 用于延迟处理频繁变化的值，如搜索输入
 * 
 * @param value - 需要防抖的值
 * @param delay - 延迟时间（毫秒），默认 300ms
 * @returns 防抖后的值
 * 
 * @example
 * const [searchText, setSearchText] = useState('');
 * const debouncedSearch = useDebounce(searchText, 500);
 * 
 * useEffect(() => {
 *   // 仅在用户停止输入 500ms 后执行搜索
 *   searchApi(debouncedSearch);
 * }, [debouncedSearch]);
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

export default useDebounce;
