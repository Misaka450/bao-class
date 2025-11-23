// 用户模型
export interface User {
    id: number;
    username: string;
    role: 'admin' | 'teacher' | 'student' | 'parent';
    name: string;
}

// 班级模型
export interface Class {
    id: number;
    name: string;
    grade: number;
}

// 学生模型
export interface Student {
    id: number;
    name: string;
    student_id: string;
    student_number: string;
    class_id: number;
    average_score?: number;
}

// 课程模型
export interface Course {
    id: number;
    name: string;
    grade: number;
}

// 考试模型
export interface Exam {
    id: number;
    name: string;
    class_id: number;
    exam_date: string;
    courses?: { course_id: number; course_name: string }[];
}

// 成绩模型
export interface Score {
    id: number;
    student_id: number;
    exam_id: number;
    course_id: number;
    score: number;
    student_name?: string;
    exam_name?: string;
    course_name?: string;
}
