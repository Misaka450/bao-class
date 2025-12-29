// 公共类型定义 - 统一的类型系统

// ==================== 用户角色类型 ====================

export type UserRole = 'admin' | 'head_teacher' | 'teacher' | 'student' | 'parent';

// ==================== 基础实体类型 ====================

export interface User {
    id: number;
    username: string;
    role: UserRole;
    name: string;
    created_at?: string;
}

export interface Class {
    id: number;
    name: string;
    grade: number;
    teacher_id?: number | null;
    created_at?: string;
}

export interface Student {
    id: number;
    name: string;
    student_id: string;
    student_number?: string; // 别名，与 student_id 相同
    class_id: number;
    class_name?: string;
    gender?: 'male' | 'female';
    average_score?: number;
    created_at?: string;
}

export interface Course {
    id: number;
    name: string;
    grade: number;
    created_at?: string;
}

export interface ExamCourse {
    course_id: number;
    course_name: string;
    full_score?: number;
}

export interface Exam {
    id: number;
    name: string;
    exam_date: string;
    class_id: number;
    class_name?: string;
    description?: string;
    courses?: ExamCourse[];
    created_at?: string;
}

export interface Score {
    id: number;
    student_id: number;
    exam_id: number;
    course_id: number;
    score: number;
    student_name?: string;
    exam_name?: string;
    course_name?: string;
    created_at?: string;
    updated_at?: string;
}

// ==================== API 响应类型 ====================

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
}

export interface ApiError {
    success: false;
    code: string;
    message: string;
    details?: Record<string, string[]>;
}

// ==================== 统计数据类型 ====================

export interface Stats {
    total_students: number;
    average_score: number;
    pass_rate: number;
    excellent_rate: number;
}

export interface Distribution {
    range: string;
    count: number;
    [key: string]: unknown;
}

export interface TopStudent {
    id: number;
    name: string;
    student_number: string;
    average_score: number;
}

export interface ProgressItem {
    student_name: string;
    progress: number;
}

export interface ProgressData {
    improved: ProgressItem[];
    declined: ProgressItem[];
}

// ==================== 学生档案类型 ====================

export interface StudentProfileData {
    student: {
        id: number;
        name: string;
        student_id: string;
        class_name: string;
        class_id: number;
    };
    history: {
        exam_id: number;
        exam_name: string;
        exam_date: string;
        total_score: number;
        class_rank: number;
        class_avg: number;
        total_students: number;
        subjects?: {
            subject: string;
            score: number;
            class_avg: number;
            class_rank: number;
        }[];
    }[];
    radar: {
        subject: string;
        score: number;
        classAvg: number;
        zScore: number;
        fullMark: number;
    }[];
    weak_subjects: {
        subject: string;
        score: number;
        zScore: number;
        reason: string;
    }[];
    advantage_subjects?: {
        subject: string;
        score: number;
        zScore: number;
        advantage: number;
        reason: string;
    }[];
    statistics?: {
        progress_rate: number;
        rank_progress: number;
        percentile: number;
        total_exams: number;
    };
}

// ==================== 班级分析类型 ====================

export interface ClassTrendItem {
    exam_name: string;
    exam_date: string;
    average_score: number;
    pass_rate: number;
    excellent_rate: number;
}

export interface ClassTrendData {
    class_name: string;
    trends: ClassTrendItem[];
}

export interface SubjectTrendItem {
    exam_name: string;
    exam_date: string;
    average_score: number;
    pass_rate: number;
}

export interface SubjectTrendData {
    class_name: string;
    subjects: {
        course_name: string;
        trends: SubjectTrendItem[];
    }[];
}

export interface GradeComparisonClass {
    class_id: number;
    class_name: string;
    average_score: number;
    student_count: number;
    rank: number;
}

export interface GradeComparisonData {
    exam_info: {
        exam_name: string;
        exam_date: string;
    };
    classes: GradeComparisonClass[];
    current_class: {
        class_id: number;
        rank: number;
        rank_change: number;
    };
}

// ==================== 预警数据类型 ====================

export interface AlertStudent {
    id: number;
    name: string;
    type: string;
    score?: number;
    subject?: string;
    drop_amount?: number;
    score_diff?: number;
    failed_score?: number;
}

export interface FocusGroupData {
    critical: AlertStudent[];
    regressing: AlertStudent[];
    fluctuating: AlertStudent[];
    imbalanced: AlertStudent[];
}

// ==================== 成绩录入/列表类型 ====================

export interface StudentScore {
    student_id: number;
    student_name: string;
    scores: { [courseId: string]: number };
}

export interface StudentScoreItem {
    student_id: number;
    student_name: string;
    student_number: string;
    class_name: string;
    scores: { [key: string]: number };
    total: number;
}

// ==================== 审计日志类型 ====================

export interface AuditLog {
    id: number;
    user_id: number;
    username: string;
    action: string;
    entity_type?: string;
    entity_id?: number;
    details?: string;
    created_at: string;
}

// ==================== 班级统计类型 ====================

export interface ClassStatistics {
    average: number;
    highest: number;
    lowest: number;
    passRate: number;
    distribution: {
        range: string;
        count: number;
    }[];
}
