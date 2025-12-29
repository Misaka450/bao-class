// 前端专用类型定义
// 注意：基础类型（User, Class, Student, Course, Exam, Score）请从 '@bao-class/types' 引入

// 试卷质量分析模型
export interface ExamQuality {
    course_id: number;
    course_name: string;
    full_score: number;
    stats: {
        count: number;
        avg: number;
        max: number;
        min: number;
        std_dev: number;
        difficulty: number;
        discrimination: number;
    };
}

// 学生预警类型
export interface StudentAlert {
    id: number;
    name: string;
    type: 'critical' | 'regressing' | 'fluctuating' | 'imbalanced';
    score?: number;
    subject?: string;
    drop_amount?: number;
    score_diff?: number;
    failed_score?: number;
}

// 重点关注组结果
export interface FocusGroupResult {
    critical: StudentAlert[];
    regressing: StudentAlert[];
    fluctuating: StudentAlert[];
    imbalanced: StudentAlert[];
}
