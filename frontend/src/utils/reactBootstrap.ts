/**
 * React 启动引导系统
 * 确保 React 和所有依赖库都正确初始化
 */

/**
 * 验证 React 环境
 */
export function validateReactEnvironment(): boolean {
  try {
    // 检查全局对象
    if (typeof window === 'undefined') {
      console.error('❌ Window object not available');
      return false;
    }

    // 检查 document
    if (typeof document === 'undefined') {
      console.error('❌ Document object not available');
      return false;
    }

    // 检查 localStorage
    if (typeof localStorage === 'undefined') {
      console.error('❌ LocalStorage not available');
      return false;
    }

    console.log('✅ React environment validation passed');
    return true;
  } catch (error) {
    console.error('❌ React environment validation failed:', error);
    return false;
  }
}

/**
 * 初始化全局错误处理
 */
export function initializeGlobalErrorHandling(): void {
  try {
    // 处理未捕获的错误
    window.addEventListener('error', (event) => {
      console.error('❌ Uncaught error:', event.error);
      // 防止应用崩溃
      event.preventDefault();
    });

    // 处理未处理的 Promise 拒绝
    window.addEventListener('unhandledrejection', (event) => {
      console.error('❌ Unhandled promise rejection:', event.reason);
      // 防止应用崩溃
      event.preventDefault();
    });

    console.log('✅ Global error handling initialized');
  } catch (error) {
    console.error('❌ Failed to initialize global error handling:', error);
  }
}

/**
 * 初始化 React 启动
 */
export function initializeReactBootstrap(): boolean {
  try {
    // 1. 验证环境
    if (!validateReactEnvironment()) {
      throw new Error('React environment validation failed');
    }

    // 2. 初始化全局错误处理
    initializeGlobalErrorHandling();

    // 3. 标记启动时间
    (window as any).__REACT_BOOTSTRAP_START__ = Date.now();

    console.log('✅ React bootstrap initialization complete');
    return true;
  } catch (error) {
    console.error('❌ React bootstrap initialization failed:', error);
    return false;
  }
}

/**
 * 安全地执行函数
 */
export function safeExecute<T>(
  fn: () => T,
  fallback?: T,
  errorMessage?: string
): T | undefined {
  try {
    return fn();
  } catch (error) {
    if (errorMessage) {
      console.error(`❌ ${errorMessage}:`, error);
    } else {
      console.error('❌ Safe execute error:', error);
    }
    return fallback;
  }
}

/**
 * 延迟执行函数
 */
export function delayedExecute(
  fn: () => void,
  delay: number = 0,
  maxRetries: number = 10
): void {
  let retries = 0;

  const execute = () => {
    try {
      fn();
      retries = 0;
    } catch (error) {
      if (retries < maxRetries) {
        retries++;
        setTimeout(execute, delay);
      } else {
        console.error('❌ Delayed execute failed after max retries:', error);
      }
    }
  };

  if (delay > 0) {
    setTimeout(execute, delay);
  } else {
    execute();
  }
}

/**
 * 检查 React 是否可用
 */
export function isReactAvailable(): boolean {
  try {
    // 检查 React 全局变量
    if (typeof (window as any).React !== 'undefined') {
      return true;
    }

    // 检查 React 是否已加载
    if (typeof (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined') {
      return true;
    }

    return false;
  } catch (error) {
    return false;
  }
}

/**
 * 等待 React 可用
 */
export async function waitForReact(
  timeout: number = 10000,
  checkInterval: number = 100
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (isReactAvailable()) {
      console.log('✅ React is available');
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }

  console.error('❌ React not available after timeout');
  return false;
}

/**
 * 获取启动诊断信息
 */
export function getBootstrapDiagnostics(): Record<string, any> {
  return {
    startTime: (window as any).__REACT_BOOTSTRAP_START__,
    currentTime: Date.now(),
    reactAvailable: isReactAvailable(),
    windowAvailable: typeof window !== 'undefined',
    documentAvailable: typeof document !== 'undefined',
    localStorageAvailable: typeof localStorage !== 'undefined',
    userAgent: navigator.userAgent,
    url: window.location.href,
  };
}

/**
 * 打印启动诊断信息
 */
export function printBootstrapDiagnostics(): void {
  const diagnostics = getBootstrapDiagnostics();
  console.log('📊 Bootstrap Diagnostics:', diagnostics);
}
