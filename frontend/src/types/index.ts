// 前端类型定义入口文件
// 从共享类型包引入所有基础类型
export * from '@bao-class/types';

// Pro template 专用类型
export * from './pro';

// 前端专用类型（不与共享包冲突的部分）
export type { ExamQuality, FocusGroupResult, StudentAlert } from './models';
