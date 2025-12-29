import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

interface UseClassListOptions {
    enabled?: boolean;
}

export function useClassList(options?: UseClassListOptions) {
    return useQuery({
        queryKey: ['classes'],
        queryFn: () => api.class.list(),
        staleTime: 10 * 60 * 1000, // 班级数据不常变化，缓存10分钟
        enabled: options?.enabled !== false,
    });
}
