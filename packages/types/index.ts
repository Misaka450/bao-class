// 公共类型定义

// ==================== 基础实体类型 ====================

export interface User {
    id: number;
    username: string;
    role: 'admin' | 'teacher' | 'student' | 'parent';
    name: string;
}

export interface Class {
    id: number;
    name: string;
    grade?: string;
}

export interface Student {
    id: number;
    name: string;
    student_id: string;
    class_id: number;
    class_name?: string;
}

export interface Course {
    id: number;
    name: string;
    grade?: string;
}

export interface ExamCourse {
    course_id: number;
    course_name: string;
}

export interface Exam {
    id: number;
    name: string;
    exam_date: string;
    class_id: number;
    class_name?: string;
    courses?: ExamCourse[];
}

export interface Score {
    id: number;
    student_id: number;
    exam_id: number;
    course_id: number;
    score: number;
}

// ==================== 统计数据类型 ====================

export interface Stats {
    total_students: number;
    average_score: number;
    pass_rate: string;
    excellent_rate: string;
}

export interface Distribution {
    range: string;
    count: number;
    [key: string]: any;
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
    };
    latest_exam: {
        exam_name: string;
        exam_date: string;
        total_score: number;
        average_score: number;
        class_rank: number;
    } | null;
    scores_by_exam: Array<{
        exam_name: string;
        exam_date: string;
        total_score: number;
        class_rank: number;
        scores: Array<{
            course_name: string;
            score: number;
        }>;
    }>;
    trend_data: Array<{
        exam_name: string;
        total_score: number;
        class_rank: number;
    }>;
    subject_ability: Array<{
        course_name: string;
        z_score: number;
    }>;
}

// ==================== 班级分析类型 ====================

export interface ClassTrendData {
    exam_name: string;
    exam_date: string;
    avg_score: number;
    pass_rate: number;
    excellent_rate: number;
}

export interface SubjectPassRate {
    course_name: string;
    pass_rate: number;
}

export interface SubjectTrendItem {
    exam_name: string;
    [key: string]: any; // 动态科目字段
}

export interface GradeComparisonItem {
    class_name: string;
    avg_score: number;
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
    id: number;
    name: string;
    student_id: string;
    class_name: string;
    scores?: { [key: string]: number };
}
