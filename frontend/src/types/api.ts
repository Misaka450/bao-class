// API 响应类型
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// 统计数据
export interface Stats {
    total_students: number;
    average_score: number;
    pass_rate: string;
    excellent_rate: string;
}

// 分数分布
export interface Distribution {
    range: string;
    count: number;
}

// 学生进步数据
export interface ProgressItem {
    student_name: string;
    progress: number;
}

export interface ProgressData {
    improved: ProgressItem[];
    declined: ProgressItem[];
}
