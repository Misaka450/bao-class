import { useQuery } from '@tanstack/react-query';
import api from '../services/api';


interface UseScoresListParams {
    classId?: string;
    examName?: string;
    courseId?: string;
}

export function useScoresList({ classId, examName, courseId }: UseScoresListParams) {
    return useQuery({
        queryKey: ['scores-list', classId, examName, courseId],
        queryFn: () => api.stats.getScoresList({ classId, examName, courseId }),
        enabled: !!examName, // Only fetch when exam name is selected
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}
