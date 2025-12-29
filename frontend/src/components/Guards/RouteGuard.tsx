import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Result, Button } from 'antd';
import { useAuthStore } from '../../store/authStore';
import { hasRouteAccess, getRouteByPath } from '../../config/routes';

interface RouteGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Route guard component that handles authentication and authorization
 */
const RouteGuard: React.FC<RouteGuardProps> = ({ children, fallback }) => {
  const { user, token } = useAuthStore();
  const location = useLocation();

  // If not authenticated, redirect to login
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If no user data, show loading or redirect
  if (!user) {
    return fallback || <Navigate to="/login" replace />;
  }

  // Check route access permissions
  const currentRoute = getRouteByPath(location.pathname);
  if (currentRoute && !hasRouteAccess(currentRoute, user.role)) {
    return (
      <Result
        status="403"
        title="403"
        subTitle="抱歉，您没有权限访问此页面。"
        extra={
          <Button type="primary" onClick={() => window.history.back()}>
            返回上一页
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
};

export default RouteGuard;