import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Spin } from 'antd';
import routes, { RouteConfig, flattenRoutes } from '../../config/routes';
import RouteGuard from '../Guards/RouteGuard';
import { SkeletonLoading } from '../Feedback/Loading/SkeletonLoading';
import { LazyLoadErrorBoundary } from '../Feedback/LazyLoadErrorBoundary';

/**
 * Render a single route with proper guards
 */
const renderRoute = (route: RouteConfig) => {
  if (!route.component) {
    return null;
  }

  const Component = route.component;

  return (
    <Route
      key={route.path}
      path={route.path}
      element={
        <RouteGuard>
          <Component />
        </RouteGuard>
      }
    />
  );
};

/**
 * Route renderer component that generates all routes from configuration
 */
const RouteRenderer: React.FC = () => {
  const allRoutes = flattenRoutes(routes);

  return (
    <LazyLoadErrorBoundary>
      <React.Suspense fallback={<SkeletonLoading type="page" />}>
        <Routes>
          {allRoutes.map(route => renderRoute(route))}
          {/* Catch-all route for 404 */}
          <Route
            path="*"
            element={
              <div style={{ textAlign: 'center', padding: '50px' }}>
                <h2>页面未找到</h2>
                <p>您访问的页面不存在</p>
              </div>
            }
          />
        </Routes>
      </React.Suspense>
    </LazyLoadErrorBoundary>
  );
};

export default RouteRenderer;