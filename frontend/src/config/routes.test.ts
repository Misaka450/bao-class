import { describe, it, expect } from 'vitest';
import routes, { 
  flattenRoutes, 
  getRouteByPath, 
  hasRouteAccess, 
  filterRoutesByAccess,
  generateBreadcrumbs,
  getPageTitle 
} from './routes';

describe('Route Configuration', () => {
  it('should have valid route structure', () => {
    expect(routes).toBeDefined();
    expect(Array.isArray(routes)).toBe(true);
    expect(routes.length).toBeGreaterThan(0);
  });

  it('should flatten routes correctly', () => {
    const flattened = flattenRoutes(routes);
    expect(flattened.length).toBeGreaterThan(routes.length);
    
    // Should include nested routes
    const courseRoute = flattened.find(r => r.path === '/courses');
    expect(courseRoute).toBeDefined();
    expect(courseRoute?.name).toBe('课程管理');
  });

  it('should find route by path', () => {
    const dashboardRoute = getRouteByPath('/dashboard');
    expect(dashboardRoute).toBeDefined();
    expect(dashboardRoute?.name).toBe('仪表盘');
    
    const nonExistentRoute = getRouteByPath('/non-existent');
    expect(nonExistentRoute).toBeUndefined();
  });

  it('should check route access correctly', () => {
    const dashboardRoute = getRouteByPath('/dashboard');
    expect(dashboardRoute).toBeDefined();
    
    // Admin should have access
    expect(hasRouteAccess(dashboardRoute!, 'admin')).toBe(true);
    
    // Teacher should have access
    expect(hasRouteAccess(dashboardRoute!, 'teacher')).toBe(true);
    
    // Student should not have access
    expect(hasRouteAccess(dashboardRoute!, 'student')).toBe(false);
    
    // Route without access restrictions should allow all
    const routeWithoutAccess = { path: '/test', name: 'Test' };
    expect(hasRouteAccess(routeWithoutAccess, 'student')).toBe(true);
  });

  it('should filter routes by access', () => {
    const adminRoutes = filterRoutesByAccess(routes, 'admin');
    const teacherRoutes = filterRoutesByAccess(routes, 'teacher');
    const studentRoutes = filterRoutesByAccess(routes, 'student');
    
    // Admin should have access to all routes
    expect(adminRoutes.length).toBeGreaterThanOrEqual(teacherRoutes.length);
    
    // Student should have fewer routes
    expect(studentRoutes.length).toBeLessThan(teacherRoutes.length);
    
    // Import route should only be accessible to admin
    const allAdminRoutes = flattenRoutes(adminRoutes);
    const allTeacherRoutes = flattenRoutes(teacherRoutes);
    
    const importRoute = allAdminRoutes.find(r => r.path === '/import');
    const importRouteForTeacher = allTeacherRoutes.find(r => r.path === '/import');
    

    
    expect(importRoute).toBeDefined();
    expect(importRouteForTeacher).toBeUndefined();
  });

  it('should generate breadcrumbs correctly', () => {
    const breadcrumbs = generateBreadcrumbs('/analysis/class');
    expect(breadcrumbs.length).toBeGreaterThan(0);
    
    // Should include the current page
    const currentPage = breadcrumbs[breadcrumbs.length - 1];
    expect(currentPage.name).toBe('班级成绩走势');
  });

  it('should get page title correctly', () => {
    const dashboardTitle = getPageTitle('/dashboard');
    expect(dashboardTitle).toBe('仪表盘 - 班级管理系统');
    
    const defaultTitle = getPageTitle('/non-existent');
    expect(defaultTitle).toBe('班级管理系统');
  });

  it('should handle dynamic routes', () => {
    const studentProfileTitle = getPageTitle('/student-profile/123');
    expect(studentProfileTitle).toBe('学生档案 - 班级管理系统');
  });
});