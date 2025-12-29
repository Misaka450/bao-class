export interface User {
    id: number;
    username: string;
    password: string;
    role: 'admin' | 'teacher' | 'student' | 'parent';
    name: string;
    created_at: string;
}

export interface Class {
    id: number;
    name: string;
    grade: number;
    teacher_id: number | null;
    created_at: string;
}

export interface Student {
    id: number;
    name: string;
    student_id: string;
    class_id: number;
    parent_id: number | null;
    created_at: string;
}

export interface Course {
    id: number;
    name: string;
    grade: number;
    created_at: string;
}

export interface Exam {
    id: number;
    name: string;
    course_id: number;
    class_id: number;
    exam_date: string;
    full_score: number;
    created_at: string;
}

export interface Score {
    id: number;
    student_id: number;
    exam_id: number;
    score: number;
    created_at: string;
    updated_at: string;
}
