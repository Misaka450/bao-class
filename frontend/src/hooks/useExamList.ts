import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

interface UseExamListOptions {
    classId?: string;
    enabled?: boolean;
}

export function useExamList(options?: UseExamListOptions) {
    return useQuery({
        queryKey: ['exams', options?.classId],
        queryFn: () => api.exam.list(options?.classId ? { class_id: options.classId } : undefined),
        staleTime: 5 * 60 * 1000,
        enabled: options?.enabled !== false,
    });
}
