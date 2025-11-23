import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5分钟数据保持新鲜
            gcTime: 10 * 60 * 1000, // 10分钟后垃圾回收
            retry: 1, // 失败重试1次
            refetchOnWindowFocus: false, // 窗口聚焦时不自动刷新
        },
    },
});
