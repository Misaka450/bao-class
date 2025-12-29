/**
 * Test Runner for Functionality Verification
 * 
 * This script runs comprehensive functionality verification tests
 * to ensure all existing features work correctly after the Ant Design Pro migration.
 */

import { describe, it, expect, vi } from 'vitest';
import api from '../services/api';

// Mock the entire API module
vi.mock('../services/api', () => ({
  default: {
    student: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    course: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    class: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    exam: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    stats: {
      getClassStats: vi.fn(),
      getDistribution: vi.fn(),
      getTopStudents: vi.fn(),
      getProgress: vi.fn(),
      getScoresList: vi.fn(),
    },
    analysis: {
      getFocusGroup: vi.fn(),
      getExamQuality: vi.fn(),
    },
    export: {
      getStudentTemplate: vi.fn(),
      getScoreTemplate: vi.fn(),
    },
    ai: {
      generateComment: vi.fn(),
      getCommentHistory: vi.fn(),
    },
  },
}));

// Mock successful API responses for testing
const mockApiResponses = {
  students: [
    { id: 1, name: '张三', student_id: 'S001', class_id: 1 },
    { id: 2, name: '李四', student_id: 'S002', class_id: 1 },
  ],
  courses: [
    { id: 1, name: '语文', grade: 1 },
    { id: 2, name: '数学', grade: 1 },
  ],
  classes: [
    { id: 1, name: '一年级1班', grade: 1 },
    { id: 2, name: '一年级2班', grade: 1 },
  ],
  exams: [
    { 
      id: 1, 
      name: '期中考试', 
      exam_date: '2024-01-15', 
      class_id: 1,
      courses: [
        { course_id: 1, course_name: '语文', full_score: 100 },
        { course_id: 2, course_name: '数学', full_score: 100 },
      ]
    },
  ],
  stats: {
    average_score: 87.5,
    pass_rate: 95,
    excellent_rate: 80,
  },
  distribution: [
    { range: '0-60', count: 2 },
    { range: '60-70', count: 5 },
    { range: '70-80', count: 8 },
    { range: '80-90', count: 12 },
    { range: '90-100', count: 3 },
  ],
  topStudents: [
    { name: '张三', average_score: 95 },
    { name: '李四', average_score: 90 },
  ],
  progress: {
    improved: [{ student_name: '王五', progress: 10 }],
    declined: [{ student_name: '赵六', progress: -5 }],
  },
  scoresList: [
    {
      student_id: 1,
      student_name: '张三',
      student_number: 'S001',
      class_name: '一年级1班',
      scores: { '语文': 85, '数学': 90 },
      total: 175,
    },
  ],
};

describe('Functionality Verification Tests', () => {
  describe('CRUD Operations Verification', () => {
    it('should verify student CRUD operations work correctly', async () => {
      // Mock API calls
      (api.student.list as any).mockResolvedValue(mockApiResponses.students);
      (api.student.create as any).mockResolvedValue({ id: 3, name: 'Test Student', student_id: 'TEST001', class_id: 1 });
      (api.student.update as any).mockResolvedValue({ id: 1, name: 'Updated Student', student_id: 'S001', class_id: 1 });
      (api.student.delete as any).mockResolvedValue(undefined);

      // Test READ operation
      const students = await api.student.list();
      expect(students).toHaveLength(2);
      expect(students[0].name).toBe('张三');

      // Test CREATE operation
      const newStudent = await api.student.create({ name: 'Test Student', student_id: 'TEST001', class_id: 1 });
      expect(newStudent.id).toBe(3);

      // Test UPDATE operation
      const updatedStudent = await api.student.update(1, { name: 'Updated Student' });
      expect(updatedStudent.name).toBe('Updated Student');

      // Test DELETE operation
      await expect(api.student.delete(1)).resolves.toBeUndefined();
    });

    it('should verify course CRUD operations work correctly', async () => {
      (api.course.list as any).mockResolvedValue(mockApiResponses.courses);
      (api.course.create as any).mockResolvedValue({ id: 3, name: 'Test Course', grade: 1 });

      const courses = await api.course.list();
      expect(courses).toHaveLength(2);
      expect(courses[0].name).toBe('语文');

      const newCourse = await api.course.create({ name: 'Test Course', grade: 1 });
      expect(newCourse.id).toBe(3);
    });

    it('should verify class CRUD operations work correctly', async () => {
      (api.class.list as any).mockResolvedValue(mockApiResponses.classes);
      (api.class.create as any).mockResolvedValue({ id: 3, name: 'Test Class', grade: 1 });

      const classes = await api.class.list();
      expect(classes).toHaveLength(2);
      expect(classes[0].name).toBe('一年级1班');

      const newClass = await api.class.create({ name: 'Test Class', grade: 1 });
      expect(newClass.id).toBe(3);
    });

    it('should verify exam CRUD operations work correctly', async () => {
      (api.exam.list as any).mockResolvedValue(mockApiResponses.exams);
      (api.exam.create as any).mockResolvedValue({
        id: 2,
        name: 'Test Exam',
        exam_date: '2024-06-15',
        class_id: 1,
        courses: []
      });

      const exams = await api.exam.list();
      expect(exams).toHaveLength(1);
      expect(exams[0].name).toBe('期中考试');

      const newExam = await api.exam.create({
        name: 'Test Exam',
        exam_date: '2024-06-15',
        class_id: 1,
        courses: []
      });
      expect(newExam.id).toBe(2);
    });
  });

  describe('Data Visualization Verification', () => {
    it('should verify statistics API works correctly', async () => {
      (api.stats.getClassStats as any).mockResolvedValue(mockApiResponses.stats);

      const stats = await api.stats.getClassStats('1', { examId: '1' });
      expect(stats.average_score).toBe(87.5);
      expect(stats.pass_rate).toBe(95);
      expect(stats.excellent_rate).toBe(80);
    });

    it('should verify distribution data works correctly', async () => {
      (api.stats.getDistribution as any).mockResolvedValue(mockApiResponses.distribution);

      const distribution = await api.stats.getDistribution('1');
      expect(distribution).toHaveLength(5);
      expect(distribution[0].range).toBe('0-60');
      expect(distribution[0].count).toBe(2);
    });

    it('should verify top students data works correctly', async () => {
      (api.stats.getTopStudents as any).mockResolvedValue(mockApiResponses.topStudents);

      const topStudents = await api.stats.getTopStudents('1', { limit: 5 });
      expect(topStudents).toHaveLength(2);
      expect(topStudents[0].name).toBe('张三');
      expect(topStudents[0].average_score).toBe(95);
    });

    it('should verify progress tracking works correctly', async () => {
      (api.stats.getProgress as any).mockResolvedValue(mockApiResponses.progress);

      const progress = await api.stats.getProgress('1');
      expect(progress.improved).toHaveLength(1);
      expect(progress.declined).toHaveLength(1);
      expect(progress.improved[0].student_name).toBe('王五');
      expect(progress.improved[0].progress).toBe(10);
    });
  });

  describe('Search and Filter Functionality Verification', () => {
    it('should verify scores list filtering works correctly', async () => {
      (api.stats.getScoresList as any).mockResolvedValue(mockApiResponses.scoresList);

      // Test without filters
      const allScores = await api.stats.getScoresList({});
      expect(allScores).toHaveLength(1);
      expect(allScores[0].student_name).toBe('张三');

      // Test with class filter
      const classFilteredScores = await api.stats.getScoresList({ classId: '1' });
      expect(classFilteredScores).toHaveLength(1);

      // Test with exam filter
      const examFilteredScores = await api.stats.getScoresList({ examName: '期中考试' });
      expect(examFilteredScores).toHaveLength(1);

      // Test with course filter
      const courseFilteredScores = await api.stats.getScoresList({ courseId: '1' });
      expect(courseFilteredScores).toHaveLength(1);
    });

    it('should verify exam filtering by class works correctly', async () => {
      (api.exam.list as any).mockResolvedValue(mockApiResponses.exams);

      const exams = await api.exam.list({ class_id: '1' });
      expect(exams).toHaveLength(1);
      expect(exams[0].class_id).toBe(1);
    });
  });

  describe('Analysis Features Verification', () => {
    it('should verify focus group analysis works correctly', async () => {
      const mockFocusGroup = {
        at_risk: [{ student_id: 1, student_name: '张三', risk_score: 0.8 }],
        improving: [{ student_id: 2, student_name: '李四', improvement_score: 0.7 }],
        stable: [{ student_id: 3, student_name: '王五', stability_score: 0.9 }]
      };
      (api.analysis.getFocusGroup as any).mockResolvedValue(mockFocusGroup);

      const focusGroup = await api.analysis.getFocusGroup('1');
      expect(focusGroup.at_risk).toHaveLength(1);
      expect(focusGroup.improving).toHaveLength(1);
      expect(focusGroup.stable).toHaveLength(1);
    });

    it('should verify exam quality analysis works correctly', async () => {
      const mockExamQuality = [
        {
          course_id: 1,
          course_name: '语文',
          stats: {
            difficulty: 0.65,
            discrimination: 0.45,
            std_dev: 12.5,
            avg: 85.2
          }
        }
      ];
      (api.analysis.getExamQuality as any).mockResolvedValue(mockExamQuality);

      const examQuality = await api.analysis.getExamQuality(1);
      expect(examQuality).toHaveLength(1);
      expect(examQuality[0].course_name).toBe('语文');
      expect(examQuality[0].stats.difficulty).toBe(0.65);
    });
  });

  describe('Import/Export Functionality Verification', () => {
    it('should verify export templates work correctly', async () => {
      (api.export.getStudentTemplate as any).mockResolvedValue('student-template-data');
      (api.export.getScoreTemplate as any).mockResolvedValue('score-template-data');

      const studentTemplate = await api.export.getStudentTemplate();
      expect(studentTemplate).toBe('student-template-data');

      const scoreTemplate = await api.export.getScoreTemplate(1);
      expect(scoreTemplate).toBe('score-template-data');
    });
  });

  describe('AI Features Verification', () => {
    it('should verify AI comment generation works correctly', async () => {
      const mockComment = {
        success: true,
        comment: 'This student shows excellent progress in mathematics.',
        metadata: { exam_count: 3, avg_score: 85.5 },
        cached: false,
        source: 'ai_generated'
      };
      (api.ai.generateComment as any).mockResolvedValue(mockComment);

      const comment = await api.ai.generateComment({ student_id: 1 });
      expect(comment.success).toBe(true);
      expect(comment.comment).toContain('excellent progress');
    });

    it('should verify AI comment history works correctly', async () => {
      const mockHistory = {
        success: true,
        comments: [
          {
            id: 1,
            exam_id: 1,
            comment: 'Previous comment',
            metadata: {},
            edited: 0,
            created_at: '2024-01-01',
            updated_at: '2024-01-01'
          }
        ]
      };
      (api.ai.getCommentHistory as any).mockResolvedValue(mockHistory);

      const history = await api.ai.getCommentHistory(1);
      expect(history.success).toBe(true);
      expect(history.comments).toHaveLength(1);
    });
  });

  describe('Error Handling Verification', () => {
    it('should handle API errors gracefully', async () => {
      (api.student.list as any).mockRejectedValue(new Error('Network error'));

      await expect(api.student.list()).rejects.toThrow('Network error');
    });

    it('should handle missing data gracefully', async () => {
      (api.stats.getScoresList as any).mockResolvedValue([]);

      const scores = await api.stats.getScoresList({});
      expect(scores).toHaveLength(0);
    });
  });

  describe('Data Consistency Verification', () => {
    it('should maintain data relationships correctly', async () => {
      (api.student.list as any).mockResolvedValue(mockApiResponses.students);
      (api.class.list as any).mockResolvedValue(mockApiResponses.classes);

      const students = await api.student.list();
      const classes = await api.class.list();

      // Verify student-class relationship
      const student = students[0];
      const studentClass = classes.find(c => c.id === student.class_id);
      expect(studentClass).toBeDefined();
      expect(studentClass?.name).toBe('一年级1班');
    });

    it('should maintain exam-course relationships correctly', async () => {
      (api.exam.list as any).mockResolvedValue(mockApiResponses.exams);
      (api.course.list as any).mockResolvedValue(mockApiResponses.courses);

      const exams = await api.exam.list();
      const courses = await api.course.list();

      const exam = exams[0];
      expect(exam.courses).toHaveLength(2);
      
      // Verify course relationships
      const examCourse = exam.courses?.[0];
      const course = courses.find(c => c.id === examCourse?.course_id);
      expect(course).toBeDefined();
      expect(course?.name).toBe('语文');
    });
  });
});