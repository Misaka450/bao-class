import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import './index.css'
import './modern-style.css'
import { queryClient } from './lib/queryClient'
import { initializeReactBootstrap, printBootstrapDiagnostics } from './utils/reactBootstrap'

// 初始化 React 启动系统
if (!initializeReactBootstrap()) {
  console.error('❌ React bootstrap initialization failed');
  document.body.innerHTML = `
    <div style="
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      font-family: Arial, sans-serif;
      background: #f5f5f5;
    ">
      <div style="
        background: white;
        padding: 40px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        max-width: 500px;
        text-align: center;
      ">
        <h1 style="color: #ff4d4f; margin-top: 0;">应用启动失败</h1>
        <p>React 启动系统初始化失败，请刷新页面重试。</p>
        <button onclick="window.location.reload()" style="
          background: #1890ff;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        ">刷新页面</button>
      </div>
    </div>
  `;
  throw new Error('React bootstrap initialization failed');
}

// 获取根元素
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('❌ Root element not found');
  throw new Error('Root element not found');
}

// 创建 React 根
let root: ReturnType<typeof ReactDOM.createRoot>;
try {
  root = ReactDOM.createRoot(rootElement);
  (window as any).__REACT_ROOT_CREATED__ = true;
  console.log('✅ React root created');
} catch (error) {
  console.error('❌ Failed to create React root:', error);
  printBootstrapDiagnostics();
  throw error;
}

// 渲染应用
try {
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </React.StrictMode>,
  );
  
  (window as any).__REACT_RENDER_COMPLETE__ = Date.now();
  console.log('✅ React application rendered successfully');
  printBootstrapDiagnostics();
} catch (error) {
  console.error('❌ Failed to render React application:', error);
  printBootstrapDiagnostics();
  
  // 显示错误界面
  document.body.innerHTML = `
    <div style="
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      font-family: Arial, sans-serif;
      background: #f5f5f5;
    ">
      <div style="
        background: white;
        padding: 40px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        max-width: 500px;
        text-align: center;
      ">
        <h1 style="color: #ff4d4f; margin-top: 0;">应用渲染失败</h1>
        <p>${(error as Error).message}</p>
        <p style="font-size: 12px; color: #999;">请检查浏览器控制台获取更多信息</p>
        <button onclick="window.location.reload()" style="
          background: #1890ff;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        ">刷新页面</button>
      </div>
    </div>
  `;
  
  throw error;
}
