import { describe, it, expect } from 'vitest';
import { generatePath, ROUTES } from './route';

describe('Route Utilities', () => {
  describe('generatePath', () => {
    it('should generate path with parameters', () => {
      const path = generatePath('/student-profile/:id', { id: '123' });
      expect(path).toBe('/student-profile/123');
    });
  });

  describe('ROUTES constants', () => {
    it('should have all expected route constants', () => {
      expect(ROUTES.LOGIN).toBe('/login');
      expect(ROUTES.DASHBOARD).toBe('/dashboard');
      expect(ROUTES.CLASSES).toBe('/classes');
      expect(ROUTES.STUDENTS).toBe('/students');
      expect(ROUTES.COURSES).toBe('/courses');
      expect(ROUTES.EXAMS).toBe('/exams');
      expect(ROUTES.SCORES_LIST).toBe('/scores-list');
      expect(ROUTES.IMPORT).toBe('/import');
      expect(ROUTES.AUDIT_LOGS).toBe('/audit-logs');
      expect(ROUTES.CLASS_ANALYSIS).toBe('/analysis/class');
      expect(ROUTES.MANAGEMENT_ALERTS).toBe('/analysis/alerts');
    });
  });
});