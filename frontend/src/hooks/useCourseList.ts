import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

interface UseCourseListOptions {
    enabled?: boolean;
}

export function useCourseList(options?: UseCourseListOptions) {
    return useQuery({
        queryKey: ['courses'],
        queryFn: () => api.course.list(),
        staleTime: 10 * 60 * 1000, // 课程数据不常变化，缓存10分钟
        enabled: options?.enabled !== false,
    });
}
