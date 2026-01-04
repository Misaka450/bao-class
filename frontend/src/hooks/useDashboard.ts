import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export function useClasses() {
    return useQuery({
        queryKey: ['classes'],
        queryFn: async () => {
            const response = await api.class.list();
            return response.data;
        },
    });
}

export function useExams(classId: string) {
    return useQuery({
        queryKey: ['exams', classId],
        queryFn: async () => {
            const response = await api.exam.list({ class_id: Number(classId) });
            // 过滤只属于当前班级的考试，并提取 data 数组
            return (response.data || []).filter((e) => e.class_id.toString() === classId);
        },
        enabled: !!classId,
    });
}

export function useDashboardData(classId: string, examId: string, courseId?: string) {
    const isEnabled = !!classId && !!examId;

    const distributionQuery = useQuery({
        queryKey: ['distribution', examId, courseId],
        queryFn: () => api.stats.getDistribution(examId, courseId),
        enabled: isEnabled,
    });

    const statsQuery = useQuery({
        queryKey: ['stats', classId, examId, courseId],
        queryFn: () => api.stats.getClassStats(classId, { examId, courseId }),
        enabled: isEnabled,
    });

    const topStudentsQuery = useQuery({
        queryKey: ['topStudents', examId, courseId],
        queryFn: () => api.stats.getTopStudents(examId, { limit: 5, courseId }),
        enabled: isEnabled,
    });

    const progressQuery = useQuery({
        queryKey: ['progress', examId, courseId],
        queryFn: () => api.stats.getProgress(examId, courseId),
        enabled: isEnabled,
    });

    return {
        distribution: distributionQuery.data || [],
        stats: statsQuery.data,
        topStudents: topStudentsQuery.data || [],
        progress: progressQuery.data || { improved: [], declined: [] },
        isLoading: distributionQuery.isLoading || statsQuery.isLoading || topStudentsQuery.isLoading || progressQuery.isLoading,
        isError: distributionQuery.isError || statsQuery.isError || topStudentsQuery.isError || progressQuery.isError,
    };
}
