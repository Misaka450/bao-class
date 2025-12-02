import { get, post, put, del } from './request';
import type {
    User,
    Class,
    Student,
    Course,
    Exam,
    Score,
    Stats,
    Distribution,
    TopStudent,
    ProgressData,
    StudentProfileData,
    ClassTrendData,
    SubjectTrendData,
    GradeComparisonData,
    StudentScore,
    StudentScoreItem,
} from '../types';
import type { FocusGroupResult, ExamQuality } from '../types/models';

// ==================== 认证 API ====================

export const authApi = {
    login: (username: string, password: string) =>
        post<{ user: User; token: string }>('/api/auth/login', { username, password }),
};

// ==================== 班级 API ====================

export const classApi = {
    list: () => get<Class[]>('/api/classes'),
    getById: (id: number) => get<Class>(`/api/classes/${id}`),
    create: (data: Omit<Class, 'id'>) => post<Class>('/api/classes', data),
    update: (id: number, data: Partial<Class>) => put<Class>(`/api/classes/${id}`, data),
    delete: (id: number) => del(`/api/classes/${id}`),
};

// ==================== 学生 API ====================

export const studentApi = {
    list: () => get<Student[]>('/api/students'),
    getById: (id: number) => get<Student>(`/api/students/${id}`),
    create: (data: Omit<Student, 'id'>) => post<Student>('/api/students', data),
    update: (id: number, data: Partial<Student>) => put<Student>(`/api/students/${id}`, data),
    delete: (id: number) => del(`/api/students/${id}`),
};

// ==================== 科目 API ====================

export const courseApi = {
    list: () => get<Course[]>('/api/courses'),
    getById: (id: number) => get<Course>(`/api/courses/${id}`),
    create: (data: Omit<Course, 'id'>) => post<Course>('/api/courses', data),
    update: (id: number, data: Partial<Course>) => put<Course>(`/api/courses/${id}`, data),
    delete: (id: number) => del(`/api/courses/${id}`),
};

// ==================== 考试 API ====================

export const examApi = {
    list: (params?: { class_id?: string }) => {
        const query = params?.class_id ? `?class_id=${params.class_id}` : '';
        return get<Exam[]>(`/api/exams${query}`);
    },
    getById: (id: number) => get<Exam>(`/api/exams/${id}`),
    create: (data: any) => post<Exam>('/api/exams', data),
    update: (id: number, data: any) => put<Exam>(`/api/exams/${id}`, data),
    delete: (id: number) => del(`/api/exams/${id}`),
};

// ==================== 成绩 API ====================

export const scoreApi = {
    list: (params?: { student_id?: number; exam_id?: number }) => {
        const query = new URLSearchParams();
        if (params?.student_id) query.append('student_id', params.student_id.toString());
        if (params?.exam_id) query.append('exam_id', params.exam_id.toString());
        const queryString = query.toString() ? `?${query.toString()}` : '';
        return get<Score[]>(`/api/scores${queryString}`);
    },
    getByExam: (examId: number) => get<StudentScore[]>(`/api/scores/exam/${examId}`),
    batchUpsert: (data: { exam_id: number; scores: StudentScore[] }) =>
        post('/api/scores/batch-upsert', data),
};

// ==================== 统计 API ====================

export const statsApi = {
    // 班级统计
    getClassStats: (classId: string, params: { examId: string; courseId?: string }) => {
        const query = new URLSearchParams({ examId: params.examId });
        if (params.courseId) query.append('courseId', params.courseId);
        return get<Stats>(`/api/stats/class/${classId}?${query.toString()}`);
    },

    // 分数分布
    getDistribution: (examId: string, courseId?: string) => {
        const query = courseId ? `?courseId=${courseId}` : '';
        return get<Distribution[]>(`/api/stats/exam/${examId}/distribution${query}`);
    },

    // Top 学生
    getTopStudents: (examId: string, params: { limit?: number; courseId?: string }) => {
        const query = new URLSearchParams();
        if (params.limit) query.append('limit', params.limit.toString());
        if (params.courseId) query.append('courseId', params.courseId);
        return get<TopStudent[]>(`/api/stats/exam/${examId}/top-students?${query.toString()}`);
    },

    // 进步/退步学生
    getProgress: (examId: string, courseId?: string) => {
        const query = courseId ? `?courseId=${courseId}` : '';
        return get<ProgressData>(`/api/stats/exam/${examId}/progress${query}`);
    },

    // 学生档案
    getStudentProfile: (studentId: number) =>
        get<StudentProfileData>(`/api/stats/profile/${studentId}`),

    // 班级趋势
    getClassTrend: (classId: number) =>
        get<ClassTrendData>(`/api/stats/class-trend/${classId}`),

    // 班级科目趋势
    getClassSubjectTrend: (classId: number) =>
        get<SubjectTrendData>(`/api/stats/class-subject-trend/${classId}`),

    // 年级对比
    getGradeComparison: (classId: number, examId: number) =>
        get<GradeComparisonData>(`/api/stats/grade-comparison/${classId}/${examId}`),

    // 成绩列表
    // 成绩列表
    getScoresList: (params: { classId?: string; examId?: string; examName?: string; courseId?: string }) => {
        const query = new URLSearchParams();
        if (params.classId) query.append('classId', params.classId);
        if (params.examId) query.append('examId', params.examId);
        if (params.examName) query.append('examName', params.examName);
        if (params.courseId) query.append('courseId', params.courseId);
        return get<StudentScoreItem[]>(`/api/stats/scores-list?${query.toString()}`);
    },
};

// ==================== 分析 API ====================

export const analysisApi = {
    // 重点关注学生
    getFocusGroup: (classId: string) => get<FocusGroupResult>(`/api/analysis/class/focus/${classId}`),
    // 试卷质量分析
    getExamQuality: (examId: number) => get<ExamQuality[]>(`/api/analysis/exam/quality/${examId}`),
};

// ==================== 导入/导出 API ====================

export const importApi = {
    uploadStudents: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return post('/api/import/students', formData);
    },
    uploadScores: (data: { exam_id: number; file: File }) => {
        const formData = new FormData();
        formData.append('exam_id', data.exam_id.toString());
        formData.append('file', data.file);
        return post('/api/import/scores', formData);
    },
};

export const exportApi = {
    getStudentTemplate: () => get('/api/export/student-template'),
    getScoreTemplate: (examId: number) => get(`/api/export/score-template/${examId}`),
};

// ==================== 日志 API ====================

export const logsApi = {
    list: (params: { page?: number; limit?: number }) => {
        const query = new URLSearchParams();
        if (params.page) query.append('page', params.page.toString());
        if (params.limit) query.append('limit', params.limit.toString());
        return get<{
            logs: Array<{
                id: number;
                user_id: number;
                action: string;
                details: string;
                created_at: string;
            }>;
            total: number;
        }>(`/api/logs?${query.toString()}`);
    },
};

// ==================== AI API ====================

export const aiApi = {
    generateComment: (data: { student_id: number; exam_ids?: number[] }) =>
        post<{
            success: boolean;
            comment: string;
            metadata: any;
        }>('/api/ai/generate-comment', data),
};

// ==================== 默认导出 ====================

const api = {
    auth: authApi,
    class: classApi,
    student: studentApi,
    course: courseApi,
    exam: examApi,
    score: scoreApi,
    stats: statsApi,
    analysis: analysisApi,
    import: importApi,
    export: exportApi,
    logs: logsApi,
    ai: aiApi,
};

export default api;
