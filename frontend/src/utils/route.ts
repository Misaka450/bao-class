import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { hasRouteAccess, getRouteByPath, getPageTitle } from '../config/routes';

/**
 * Route utilities for authentication and navigation
 */

/**
 * Hook to protect routes with authentication
 */
export const useRouteAuth = () => {
  try {
    const { user, token } = useAuthStore();
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
      try {
        const currentRoute = getRouteByPath(location.pathname);
        
        // Redirect to login if not authenticated
        if (!token && location.pathname !== '/login') {
          navigate('/login', { replace: true });
          return;
        }
        
        // Redirect to dashboard if already authenticated and on login page
        if (token && location.pathname === '/login') {
          navigate('/dashboard', { replace: true });
          return;
        }
        
        // Check route access permissions
        if (currentRoute && user && !hasRouteAccess(currentRoute, user.role)) {
          // Redirect to dashboard if no access
          navigate('/dashboard', { replace: true });
          return;
        }
      } catch (error) {
        console.error('Route auth effect error:', error);
      }
    }, [location.pathname, token, user, navigate]);
  } catch (error) {
    console.error('useRouteAuth hook error:', error);
    // Silently fail - don't crash the app
  }
};

/**
 * Hook to update page title based on current route
 */
export const usePageTitle = () => {
  try {
    const location = useLocation();

    useEffect(() => {
      try {
        const title = getPageTitle(location.pathname);
        document.title = title;
      } catch (error) {
        console.error('Page title update error:', error);
      }
    }, [location.pathname]);
  } catch (error) {
    console.error('usePageTitle hook error:', error);
  }
};

/**
 * Hook to handle route changes (scroll to top, analytics, etc.)
 */
export const useRouteChange = () => {
  try {
    const location = useLocation();

    useEffect(() => {
      try {
        // Scroll to top on route change
        window.scrollTo(0, 0);
        
        // You can add analytics tracking here
        // analytics.track('page_view', { path: location.pathname });
      } catch (error) {
        console.error('Route change effect error:', error);
      }
    }, [location.pathname]);
  } catch (error) {
    console.error('useRouteChange hook error:', error);
  }
};

/**
 * Get safe navigation function that checks permissions
 */
export const useSafeNavigate = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  return (path: string, options?: { replace?: boolean }) => {
    const route = getRouteByPath(path);
    
    if (route && user && !hasRouteAccess(route, user.role)) {
      console.warn(`User ${user.role} does not have access to ${path}`);
      return;
    }
    
    navigate(path, options);
  };
};

/**
 * Constants for common routes
 */
export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  CLASSES: '/classes',
  STUDENTS: '/students',
  COURSES: '/courses',
  EXAMS: '/exams',
  SCORES_LIST: '/scores-list',
  IMPORT: '/import',
  AUDIT_LOGS: '/audit-logs',
  CLASS_ANALYSIS: '/analysis/class',
  MANAGEMENT_ALERTS: '/analysis/alerts',
} as const;

/**
 * Route parameter types for type safety
 */
export interface RouteParams {
  '/student-profile/:id': { id: string };
}

/**
 * Generate typed route path with parameters
 */
export const generatePath = <T extends keyof RouteParams>(
  path: T,
  params: RouteParams[T]
): string => {
  let result = path as string;
  
  Object.entries(params).forEach(([key, value]) => {
    result = result.replace(`:${key}`, String(value));
  });
  
  return result;
};