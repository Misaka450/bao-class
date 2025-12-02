import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export function useStudentProfile(studentId: number | undefined) {
    return useQuery({
        queryKey: ['student-profile', studentId],
        queryFn: () => api.stats.getStudentProfile(studentId!),
        enabled: !!studentId,
        staleTime: 5 * 60 * 1000,
    });
}
