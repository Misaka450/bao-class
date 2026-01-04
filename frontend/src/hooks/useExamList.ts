import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

interface UseExamListOptions {
    classId?: string;
    enabled?: boolean;
}

export function useExamList(options?: UseExamListOptions) {
    return useQuery({
        queryKey: ['exams', options?.classId],
        queryFn: async () => {
            const params = options?.classId ? { class_id: Number(options.classId) } : undefined;
            const response = await api.exam.list(params);
            return response.data;
        },
        staleTime: 5 * 60 * 1000,
        enabled: options?.enabled !== false,
    });
}
