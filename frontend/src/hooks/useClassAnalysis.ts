import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export function useClassTrend(classId: number | undefined) {
    return useQuery({
        queryKey: ['class-trend', classId],
        queryFn: () => api.stats.getClassTrend(classId!),
        enabled: !!classId,
        staleTime: 5 * 60 * 1000,
    });
}

export function useClassSubjectTrend(classId: number | undefined) {
    return useQuery({
        queryKey: ['class-subject-trend', classId],
        queryFn: () => api.stats.getClassSubjectTrend(classId!),
        enabled: !!classId,
        staleTime: 5 * 60 * 1000,
    });
}

export function useGradeComparison(classId: number | undefined, examId: number | undefined) {
    return useQuery({
        queryKey: ['grade-comparison', classId, examId],
        queryFn: () => api.stats.getGradeComparison(classId!, examId!),
        enabled: !!classId && !!examId,
        staleTime: 5 * 60 * 1000,
    });
}
