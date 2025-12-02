import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 数据在5分钟内被认为是新鲜的
            gcTime: 10 * 60 * 1000, // 垃圾回收时间（原 cacheTime）
            refetchOnWindowFocus: false, // 窗口聚焦时不自动重新获取
            retry: 1, // 失败时重试1次
        },
    },
});
