import { useEffect } from 'react';
import ThemeProvider from './components/ThemeProvider';
import ProLayoutWrapper from './components/ProLayout';
import RouteRenderer from './components/RouteRenderer';
import { ErrorBoundary } from './components/ErrorBoundary';
import GlobalErrorBoundary from './components/GlobalErrorBoundary';
import { useAuthStore } from './store/authStore';
import { initializePerformanceOptimizations } from './utils/resourceOptimization';
import Login from './pages/Login';

function App() {
  return (
    <GlobalErrorBoundary>
      <AppContent />
    </GlobalErrorBoundary>
  );
}

function AppContent() {
  const { token } = useAuthStore();

  // Initialize performance optimizations on app start
  useEffect(() => {
    try {
      const monitor = initializePerformanceOptimizations();
      monitor.startTiming('app_initialization');
      console.log('✅ Performance monitoring started');
      
      // Clean up on unmount
      return () => {
        monitor.endTiming('app_initialization');
      };
    } catch (e) {
      console.error('Performance optimization error:', e);
    }
  }, []);

  console.log('✅ AppContent rendered, token:', token);

  // 简单的测试内容 - 不使用 Routes，直接显示
  if (!token) {
    return (
      <ErrorBoundary>
        <ThemeProvider>
          <Login />
        </ThemeProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ProLayoutWrapper>
          <RouteRenderer />
        </ProLayoutWrapper>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;