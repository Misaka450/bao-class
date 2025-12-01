import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { lightTheme } from './theme';
import Layout from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuthStore } from './store/authStore';

// Optimize: lazy load all page components to reduce initial bundle size
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Classes = lazy(() => import('./pages/Classes'));
const Students = lazy(() => import('./pages/Students'));
const Courses = lazy(() => import('./pages/Courses'));
const Exams = lazy(() => import('./pages/Exams'));
const ScoresList = lazy(() => import('./pages/ScoresList'));
const Import = lazy(() => import('./pages/Import'));
const StudentProfile = lazy(() => import('./pages/StudentProfile'));
const ClassAnalysis = lazy(() => import('./pages/ClassAnalysis'));
const ManagementAlerts = lazy(() => import('./pages/ManagementAlerts'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));

function App() {
  const { token } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    // 路由变化时滚动到顶部
    window.scrollTo(0, 0);
  }, [location]);

  if (!token && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  if (token && location.pathname === '/login') {
    return <Navigate to="/" replace />;
  }

  return (
    <ErrorBoundary>
      <ConfigProvider locale={zhCN} theme={lightTheme}>
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" /></div>}>
          {token ? (
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/classes" element={<Classes />} />
                <Route path="/students" element={<Students />} />
                <Route path="/courses" element={<Courses />} />
                <Route path="/exams" element={<Exams />} />
                <Route path="/scores-list" element={<ScoresList />} />
                <Route path="/import" element={<Import />} />
                <Route path="/student-profile/:id" element={<StudentProfile />} />
                <Route path="/analysis/class" element={<ClassAnalysis />} />
                <Route path="/analysis/alerts" element={<ManagementAlerts />} />
                <Route path="/management-alerts" element={<ManagementAlerts />} />
                <Route path="/audit-logs" element={<AuditLogs />} />
              </Routes>
            </Layout>
          ) : (
            <Login />
          )}
        </Suspense>
      </ConfigProvider>
    </ErrorBoundary>
  );
}

export default App;
