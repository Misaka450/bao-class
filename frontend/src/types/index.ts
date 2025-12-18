// Re-export types with explicit naming to avoid conflicts
export * from '@bao-class/types';

// Pro template specific types
export * from './pro';

// Local types (only export if they don't conflict with @bao-class/types)
export type { ApiResponse as LocalApiResponse } from './api';
export type { 
  Class as LocalClass,
  Course as LocalCourse,
  Exam as LocalExam,
  Score as LocalScore,
  Student as LocalStudent,
  User as LocalUser
} from './models';
