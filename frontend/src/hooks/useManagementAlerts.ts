import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export function useManagementAlerts(classId: string | undefined) {
    return useQuery({
        queryKey: ['management-alerts', classId],
        queryFn: () => api.analysis.getFocusGroup(classId!),
        enabled: !!classId,
        staleTime: 5 * 60 * 1000,
    });
}
