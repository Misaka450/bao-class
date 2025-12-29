import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export function useFocusGroup(classId: string | undefined) {
    return useQuery({
        queryKey: ['focus-group', classId],
        queryFn: () => api.analysis.getFocusGroup(classId!),
        enabled: !!classId,
        staleTime: 5 * 60 * 1000,
    });
}
