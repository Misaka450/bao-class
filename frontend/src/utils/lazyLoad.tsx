import React, { Suspense } from 'react';
import { Spin } from 'antd';

/**
 * Enhanced lazy loading utility for route-based code splitting
 * Following Ant Design Pro template patterns
 */

interface LazyLoadOptions {
  fallback?: React.ComponentType;
  errorBoundary?: React.ComponentType<{ error: Error; retry: () => void }>;
  retryCount?: number;
  timeout?: number;
}

/**
 * Default loading component with Pro template styling
 */
const DefaultFallback: React.FC = () => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '200px',
      width: '100%',
    }}
  >
    <Spin size="large" tip="加载中..." />
  </div>
);

/**
 * Default error boundary for lazy loaded components
 */
class LazyErrorBoundary extends React.Component<
  { 
    children: React.ReactNode; 
    onRetry: () => void;
    fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy loading error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const ErrorComponent = this.props.fallback;
      if (ErrorComponent) {
        return <ErrorComponent error={this.state.error} retry={this.props.onRetry} />;
      }
      
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h3>页面加载失败</h3>
          <p>{this.state.error.message}</p>
          <button onClick={this.props.onRetry}>重试</button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Enhanced lazy loading with retry mechanism and error handling
 */
export function lazyLoad<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
): React.ComponentType {
  const {
    fallback = DefaultFallback,
    errorBoundary,
    retryCount = 3,
    timeout = 10000,
  } = options;

  // Create a lazy component with retry logic
  const LazyComponent = React.lazy(() => {
    let retries = 0;
    
    const loadWithRetry = (): Promise<{ default: T }> => {
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('组件加载超时'));
        }, timeout);

        importFunc()
          .then((module) => {
            clearTimeout(timeoutId);
            resolve(module);
          })
          .catch((error) => {
            clearTimeout(timeoutId);
            retries++;
            
            if (retries <= retryCount) {
              console.warn(`组件加载失败，正在重试 (${retries}/${retryCount})...`);
              setTimeout(() => {
                loadWithRetry().then(resolve).catch(reject);
              }, 1000 * retries); // Exponential backoff
            } else {
              reject(error);
            }
          });
      });
    };

    return loadWithRetry();
  });

  // Return wrapped component with error boundary and suspense
  return React.forwardRef<any, any>((props, ref) => {
    const [key, setKey] = React.useState(0);
    
    const handleRetry = React.useCallback(() => {
      setKey(prev => prev + 1);
    }, []);

    return (
      <LazyErrorBoundary onRetry={handleRetry} fallback={errorBoundary}>
        <Suspense fallback={React.createElement(fallback)} key={key}>
          <LazyComponent {...props} ref={ref} />
        </Suspense>
      </LazyErrorBoundary>
    );
  });
}

/**
 * Preload a lazy component for better UX
 */
export function preloadComponent<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
): Promise<{ default: T }> {
  return importFunc();
}

/**
 * Batch preload multiple components
 */
export function preloadComponents(
  importFuncs: Array<() => Promise<{ default: React.ComponentType<any> }>>
): Promise<Array<{ default: React.ComponentType<any> }>> {
  return Promise.all(importFuncs.map(func => func()));
}

/**
 * Route-based preloading on hover/focus
 */
export function useRoutePreload() {
  const preloadedRoutes = React.useRef(new Set<string>());

  const preloadRoute = React.useCallback((routePath: string, importFunc: () => Promise<any>) => {
    if (preloadedRoutes.current.has(routePath)) {
      return;
    }

    preloadedRoutes.current.add(routePath);
    importFunc().catch((error) => {
      console.warn(`Failed to preload route ${routePath}:`, error);
      preloadedRoutes.current.delete(routePath);
    });
  }, []);

  return { preloadRoute };
}

export default lazyLoad;