import React from 'react';
import {
  DashboardOutlined,
  TeamOutlined,
  UserOutlined,
  BookOutlined,
  BulbOutlined,
  TableOutlined,
  SafetyCertificateOutlined,
  ImportOutlined,
  FileTextOutlined,
  BarChartOutlined,
  AlertOutlined,
  RobotOutlined,
} from '@ant-design/icons';

/**
 * Route configuration following Ant Design Pro conventions
 * Supports authentication protection, breadcrumbs, and page titles
 */

export interface RouteConfig {
  path: string;
  name: string;
  icon?: React.ReactNode;
  component?: React.ComponentType;
  access?: string[];
  hideInMenu?: boolean;
  hideInBreadcrumb?: boolean;
  children?: RouteConfig[];
  // Page metadata
  title?: string;
  description?: string;
  // Layout configuration
  layout?: boolean;
  headerRender?: boolean;
  footerRender?: boolean;
  menuRender?: boolean;
  menuHeaderRender?: boolean;
}

// Lazy loaded components for improved performance and stability
const ProDashboard = React.lazy(() => import('../pages/ProDashboard'));
const Classes = React.lazy(() => import('../pages/Classes'));
const Students = React.lazy(() => import('../pages/Students'));
const Courses = React.lazy(() => import('../pages/Courses'));
const Exams = React.lazy(() => import('../pages/Exams'));
const ScoresList = React.lazy(() => import('../pages/ScoresList'));
const ProScoresList = React.lazy(() => import('../pages/ProScoresList'));
const Import = React.lazy(() => import('../pages/Import'));
const StudentProfile = React.lazy(() => import('../pages/StudentProfile'));
const ClassAnalysis = React.lazy(() => import('../pages/ClassAnalysis'));
const ManagementAlerts = React.lazy(() => import('../pages/ManagementAlerts'));
const AuditLogs = React.lazy(() => import('../pages/AuditLogs'));
const Users = React.lazy(() => import('../pages/Users'));
const LessonPrep = React.lazy(() => import('../pages/LessonPrep'));
const MyLessonPlans = React.lazy(() => import('../pages/MyLessonPlans'));
const HomeworkGenerator = React.lazy(() => import('../pages/HomeworkGenerator'));
const MyHomework = React.lazy(() => import('../pages/MyHomework'));

/**
 * Main route configuration
 * Each route includes access control, breadcrumb configuration, and page metadata
 */
const routes: RouteConfig[] = [
  {
    path: '/',
    name: '首页',
    hideInMenu: true,
    hideInBreadcrumb: true,
    component: ProDashboard,
    title: '智慧班级助手',
  },
  {
    path: '/dashboard',
    name: '仪表盘',
    icon: React.createElement(DashboardOutlined),
    component: ProDashboard,
    access: ['admin', 'head_teacher', 'teacher'],
    title: '仪表盘 - 智慧班级助手',
    description: '系统概览和关键指标',
  },
  {
    path: '/pro-dashboard',
    name: 'Pro仪表盘',
    hideInMenu: true,
    component: ProDashboard,
    access: ['admin', 'head_teacher', 'teacher'],
    title: 'Pro仪表盘 - 智慧班级助手',
  },
  // AI 智能备课 - 提前到第二位
  {
    path: '/lesson-prep',
    name: 'AI 智能助手',
    icon: React.createElement(RobotOutlined),
    access: ['admin', 'head_teacher', 'teacher'],
    children: [
      {
        path: '/lesson-prep/generate',
        name: '生成教案',
        icon: React.createElement(RobotOutlined),
        component: LessonPrep,
        access: ['admin', 'head_teacher', 'teacher'],
        title: '生成教案 - 智慧班级助手',
        description: 'AI 生成个性化教案',
      },
      {
        path: '/lesson-prep/my-plans',
        name: '我的教案',
        icon: React.createElement(FileTextOutlined),
        component: MyLessonPlans,
        access: ['admin', 'head_teacher', 'teacher'],
        title: '我的教案 - 智慧班级助手',
        description: '查看和管理已保存的教案',
      },
      {
        path: '/lesson-prep/homework',
        name: '作业生成',
        icon: React.createElement(FileTextOutlined),
        component: HomeworkGenerator,
        access: ['admin', 'head_teacher', 'teacher'],
        title: '作业生成 - 智慧班级助手',
        description: 'AI 生成分层练习题',
      },
      {
        path: '/lesson-prep/my-homework',
        name: '我的作业',
        icon: React.createElement(FileTextOutlined),
        component: MyHomework,
        access: ['admin', 'head_teacher', 'teacher'],
        title: '我的作业 - 智慧班级助手',
        description: '查看和管理已保存的作业',
      },
    ],
  },
  // 班级管理
  {
    path: '/classes',
    name: '班级管理',
    icon: React.createElement(TeamOutlined),
    component: Classes,
    access: ['admin', 'head_teacher', 'teacher'],
    title: '班级管理 - 智慧班级助手',
    description: '管理班级信息和学生分配',
  },
  // 学生管理
  {
    path: '/students',
    name: '学生管理',
    icon: React.createElement(UserOutlined),
    component: Students,
    access: ['admin', 'head_teacher', 'teacher'],
    title: '学生管理 - 智慧班级助手',
    description: '管理学生基本信息和档案',
  },
  {
    path: '/student-profile/:id',
    name: '学生档案',
    hideInMenu: true,
    component: StudentProfile,
    access: ['admin', 'head_teacher', 'teacher'],
    title: '学生档案 - 智慧班级助手',
    description: '查看学生详细信息和成绩记录',
  },
  // 教学管理
  {
    path: '/teaching',
    name: '教学管理',
    icon: React.createElement(BookOutlined),
    access: ['admin', 'head_teacher', 'teacher'],
    children: [
      {
        path: '/courses',
        name: '课程管理',
        icon: React.createElement(BookOutlined),
        component: Courses,
        access: ['admin', 'head_teacher', 'teacher'],
        title: '课程管理 - 智慧班级助手',
        description: '管理课程信息和教学计划',
      },
      {
        path: '/exams',
        name: '考试管理',
        icon: React.createElement(FileTextOutlined),
        component: Exams,
        access: ['admin', 'head_teacher', 'teacher'],
        title: '考试管理 - 智慧班级助手',
        description: '管理考试安排和成绩录入',
      },
      {
        path: '/import',
        name: '数据导入',
        icon: React.createElement(ImportOutlined),
        component: Import,
        access: ['admin', 'head_teacher', 'teacher'],
        title: '数据导入 - 智慧班级助手',
        description: '批量导入学生和成绩数据',
      },
    ],
  },
  // 成绩清单
  {
    path: '/scores-list',
    name: '成绩清单',
    icon: React.createElement(TableOutlined),
    component: ScoresList,
    access: ['admin', 'head_teacher', 'teacher'],
    title: '成绩清单 - 智慧班级助手',
    description: '查看和管理学生成绩记录',
  },
  {
    path: '/pro-scores-list',
    name: 'Pro成绩清单',
    hideInMenu: true,
    component: ProScoresList,
    access: ['admin', 'head_teacher', 'teacher'],
    title: 'Pro成绩清单 - 智慧班级助手',
  },
  // 数据分析
  {
    path: '/analysis',
    name: '数据分析',
    icon: React.createElement(BulbOutlined),
    access: ['admin', 'head_teacher', 'teacher'],
    children: [
      {
        path: '/analysis/class',
        name: '班级学情分析',
        icon: React.createElement(BarChartOutlined),
        component: ClassAnalysis,
        access: ['admin', 'head_teacher', 'teacher'],
        title: '班级学情分析 - 智慧班级助手',
        description: '分析班级成绩变化趋势',
      },
      {
        path: '/analysis/alerts',
        name: '管理预警',
        icon: React.createElement(AlertOutlined),
        component: ManagementAlerts,
        access: ['admin', 'head_teacher', 'teacher'],
        title: '管理预警 - 智慧班级助手',
        description: '查看系统预警和异常情况',
      },
    ],
  },
  {
    path: '/management-alerts',
    name: '管理预警',
    hideInMenu: true,
    component: ManagementAlerts,
    access: ['admin', 'head_teacher', 'teacher'],
    title: '管理预警 - 智慧班级助手',
  },
  // 管理员专区
  {
    path: '/audit-logs',
    name: '操作日志',
    icon: React.createElement(SafetyCertificateOutlined),
    component: AuditLogs,
    access: ['admin'],
    title: '操作日志 - 智慧班级助手',
    description: '查看系统操作记录和审计信息',
  },
  {
    path: '/users',
    name: '用户管理',
    icon: React.createElement(UserOutlined),
    component: Users,
    access: ['admin'],
    title: '用户管理 - 智慧班级助手',
    description: '维护系统登录账号和权限分配',
  },
];

/**
 * Flatten routes for easier access and navigation
 */
export const flattenRoutes = (routes: RouteConfig[]): RouteConfig[] => {
  const result: RouteConfig[] = [];

  const flatten = (routeList: RouteConfig[]) => {
    routeList.forEach(route => {
      result.push(route);
      if (route.children) {
        flatten(route.children);
      }
    });
  };

  flatten(routes);
  return result;
};

/**
 * Get route by path
 */
export const getRouteByPath = (path: string): RouteConfig | undefined => {
  const allRoutes = flattenRoutes(routes);
  return allRoutes.find(route => route.path === path);
};

/**
 * Check if user has access to route
 */
export const hasRouteAccess = (route: RouteConfig, userRole?: string): boolean => {
  if (!route.access || route.access.length === 0) {
    return true;
  }

  if (!userRole) {
    return false;
  }

  return route.access.includes(userRole);
};

/**
 * Filter routes based on user access
 */
export const filterRoutesByAccess = (routes: RouteConfig[], userRole?: string): RouteConfig[] => {
  return routes.map(route => {
    // Create a copy of the route to avoid mutating the original
    const routeCopy = { ...route };

    // Filter children first
    if (routeCopy.children) {
      routeCopy.children = filterRoutesByAccess(routeCopy.children, userRole);
    }

    return routeCopy;
  }).filter(route => {
    // Check if the route itself has access
    if (!hasRouteAccess(route, userRole)) {
      return false;
    }

    // If it's a parent route with no accessible children, still include it
    // if the parent itself is accessible
    return true;
  });
};

/**
 * Generate breadcrumb items from current path
 */
export const generateBreadcrumbs = (pathname: string): Array<{ path: string; name: string }> => {
  const allRoutes = flattenRoutes(routes);
  const breadcrumbs: Array<{ path: string; name: string }> = [];

  // Handle dynamic routes like /student-profile/:id
  const matchRoute = (routePath: string, currentPath: string): boolean => {
    const routeSegments = routePath.split('/');
    const pathSegments = currentPath.split('/');

    if (routeSegments.length !== pathSegments.length) {
      return false;
    }

    return routeSegments.every((segment, index) => {
      return segment.startsWith(':') || segment === pathSegments[index];
    });
  };

  const currentRoute = allRoutes.find(route =>
    route.path === pathname || matchRoute(route.path, pathname)
  );

  if (currentRoute && !currentRoute.hideInBreadcrumb) {
    // Build breadcrumb path by traversing up the route hierarchy
    const pathSegments = pathname.split('/').filter(Boolean);
    let currentPath = '';

    pathSegments.forEach(segment => {
      currentPath += `/${segment}`;
      const route = allRoutes.find(r =>
        r.path === currentPath || matchRoute(r.path, currentPath)
      );

      if (route && !route.hideInBreadcrumb) {
        breadcrumbs.push({
          path: currentPath,
          name: route.name,
        });
      }
    });
  }

  return breadcrumbs;
};

/**
 * Get page title for current route
 */
export const getPageTitle = (pathname: string): string => {
  const route = getRouteByPath(pathname);
  if (route?.title) {
    return route.title;
  }

  // Handle dynamic routes
  const allRoutes = flattenRoutes(routes);
  const matchedRoute = allRoutes.find(route => {
    const routeSegments = route.path.split('/');
    const pathSegments = pathname.split('/');

    if (routeSegments.length !== pathSegments.length) {
      return false;
    }

    return routeSegments.every((segment, index) => {
      return segment.startsWith(':') || segment === pathSegments[index];
    });
  });

  return matchedRoute?.title || '班级管理系统';
};

export default routes;