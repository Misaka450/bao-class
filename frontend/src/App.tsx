import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Classes from './pages/Classes';
import Students from './pages/Students';
import Courses from './pages/Courses';
import Exams from './pages/Exams';
import ScoreEntry from './pages/ScoreEntry';
import Import from './pages/Import';
import Analysis from './pages/Analysis';

function PrivateRoute({ children }: { children: React.ReactElement }) {
  const token = useAuthStore((state) => state.token);
  return token ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#667eea',
          borderRadius: 8,
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/*"
            element={
              <PrivateRoute>
                <Layout>
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/classes" element={<Classes />} />
                    <Route path="/students" element={<Students />} />
                    <Route path="/courses" element={<Courses />} />
                    <Route path="/exams" element={<Exams />} />
                    <Route path="/scores" element={<ScoreEntry />} />
                    <Route path="/import" element={<Import />} />
                    <Route path="/analysis" element={<Analysis />} />
                  </Routes>
                </Layout>
              </PrivateRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
