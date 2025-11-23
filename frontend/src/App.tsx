import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Classes from './pages/Classes';
import Students from './pages/Students';
import Courses from './pages/Courses';
import Exams from './pages/Exams';
import ScoresList from './pages/ScoresList';
import Import from './pages/Import';
import StudentProfile from './pages/StudentProfile';
import ManagementAlerts from './pages/ManagementAlerts';
import AuditLogs from './pages/AuditLogs';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuthStore } from './store/authStore';

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
      <ConfigProvider locale={zhCN}>
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
              <Route path="/management-alerts" element={<ManagementAlerts />} />
              <Route path="/audit-logs" element={<AuditLogs />} />
            </Routes>
          </Layout>
        ) : (
          <Login />
        )}
      </ConfigProvider>
    </ErrorBoundary>
  );
}

export default App;
