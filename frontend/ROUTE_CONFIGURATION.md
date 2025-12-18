# Route Configuration Implementation

## Overview

This document describes the standardized route configuration system implemented for the Ant Design Pro migration. The system provides centralized route management with authentication protection, breadcrumb generation, and page title management.

## Files Created/Modified

### New Files

1. **`src/config/routes.ts`** - Main route configuration file
   - Defines all application routes with metadata
   - Implements route access control based on user roles
   - Provides utility functions for route management
   - Supports breadcrumb generation and page title management

2. **`src/utils/route.ts`** - Route utility hooks and functions
   - `useRouteAuth()` - Hook for route authentication protection
   - `usePageTitle()` - Hook for automatic page title updates
   - `useRouteChange()` - Hook for handling route changes (scroll to top, etc.)
   - `useSafeNavigate()` - Hook for permission-aware navigation
   - `ROUTES` - Constants for common route paths
   - `generatePath()` - Type-safe path generation with parameters

3. **`src/components/RouteGuard.tsx`** - Route guard component
   - Protects routes with authentication checks
   - Displays 403 error for unauthorized access
   - Redirects to login for unauthenticated users

4. **`src/components/RouteRenderer.tsx`** - Route renderer component
   - Generates routes from configuration
   - Handles lazy loading with suspense
   - Provides 404 fallback

5. **`src/config/routes.test.ts`** - Route configuration tests
   - Tests route structure and flattening
   - Tests access control logic
   - Tests breadcrumb generation
   - Tests page title generation

6. **`src/utils/route.test.ts`** - Route utility tests
   - Tests path generation
   - Tests route constants

### Modified Files

1. **`src/components/ProLayout.tsx`**
   - Updated to use route configuration for menu generation
   - Integrated breadcrumb generation from routes
   - Added automatic page title updates
   - Filters routes based on user access

2. **`src/App.tsx`**
   - Simplified routing structure
   - Integrated RouteRenderer component
   - Added route authentication hook
   - Separated login route from main layout

3. **`src/store/authStore.ts`**
   - Added optional `avatar` field to User interface

## Route Configuration Structure

### RouteConfig Interface

```typescript
interface RouteConfig {
  path: string;                    // Route path
  name: string;                    // Display name
  icon?: React.ReactNode;          // Menu icon
  component?: React.ComponentType; // Page component
  access?: string[];               // Allowed user roles
  hideInMenu?: boolean;            // Hide from menu
  hideInBreadcrumb?: boolean;      // Hide from breadcrumb
  children?: RouteConfig[];        // Nested routes
  title?: string;                  // Page title
  description?: string;            // Page description
  layout?: boolean;                // Use layout
  headerRender?: boolean;          // Render header
  footerRender?: boolean;          // Render footer
  menuRender?: boolean;            // Render menu
  menuHeaderRender?: boolean;      // Render menu header
}
```

### Example Route Configuration

```typescript
{
  path: '/dashboard',
  name: '仪表盘',
  icon: React.createElement(DashboardOutlined),
  component: ProDashboard,
  access: ['admin', 'teacher'],
  title: '仪表盘 - 班级管理系统',
  description: '系统概览和关键指标',
}
```

## Key Features

### 1. Authentication Protection

Routes can specify which user roles have access:

```typescript
access: ['admin', 'teacher']  // Only admin and teacher can access
```

The `RouteGuard` component automatically checks permissions and redirects unauthorized users.

### 2. Breadcrumb Generation

Breadcrumbs are automatically generated based on the current route path:

```typescript
const breadcrumbs = generateBreadcrumbs('/analysis/class');
// Returns: [{ path: '/analysis/class', name: '班级成绩走势' }]
```

### 3. Page Title Management

Page titles are automatically updated when routes change:

```typescript
const title = getPageTitle('/dashboard');
// Returns: '仪表盘 - 班级管理系统'
```

### 4. Dynamic Routes

Support for dynamic route parameters:

```typescript
{
  path: '/student-profile/:id',
  name: '学生档案',
  component: StudentProfile,
}
```

### 5. Nested Routes

Support for hierarchical route structures:

```typescript
{
  path: '/teaching',
  name: '教学管理',
  children: [
    { path: '/courses', name: '课程管理' },
    { path: '/exams', name: '考试管理' },
  ],
}
```

## Utility Functions

### flattenRoutes(routes)

Flattens nested route structure into a single array.

### getRouteByPath(path)

Finds a route by its path.

### hasRouteAccess(route, userRole)

Checks if a user role has access to a route.

### filterRoutesByAccess(routes, userRole)

Filters routes based on user access permissions.

### generateBreadcrumbs(pathname)

Generates breadcrumb items for the current path.

### getPageTitle(pathname)

Gets the page title for the current route.

## Usage Examples

### Using Route Constants

```typescript
import { ROUTES } from './utils/route';

navigate(ROUTES.DASHBOARD);
```

### Safe Navigation with Permission Check

```typescript
import { useSafeNavigate } from './utils/route';

const safeNavigate = useSafeNavigate();
safeNavigate('/audit-logs'); // Only navigates if user has access
```

### Generating Paths with Parameters

```typescript
import { generatePath } from './utils/route';

const path = generatePath('/student-profile/:id', { id: '123' });
// Returns: '/student-profile/123'
```

## Testing

All route configuration and utilities are fully tested:

- Route structure validation
- Access control logic
- Breadcrumb generation
- Page title generation
- Path generation with parameters

Run tests with:

```bash
npm run test:run
```

## Requirements Validation

This implementation satisfies the following requirements from the design document:

- **Requirement 4.1**: Route configuration uses Pro template conventions
- **Requirement 4.2**: Authentication protection is enforced on all routes
- **Requirement 4.5**: Page titles and breadcrumbs are automatically updated

## Next Steps

The route configuration system is now ready for use. The next tasks in the migration plan will:

1. Continue migrating table components to ProTable
2. Migrate form components to ProForm
3. Standardize theme system
4. Implement error handling and loading states

## Notes

- All routes are lazy-loaded for better performance
- The system supports both flat and nested route structures
- Access control is role-based and easily extensible
- The configuration is type-safe with TypeScript
