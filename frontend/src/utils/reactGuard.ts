/**
 * React 初始化守护工具
 * 确保 React 完全初始化后再执行 React 相关代码
 */

import React from 'react';

// React 初始化状态接口
export interface ReactInitializationState {
  isInitialized: boolean;
  initializationTime: number;
  errors: string[];
  warnings: string[];
}

// React 验证结果接口
export interface ReactValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

/**
 * React 就绪检测类
 */
export class ReactReadinessDetector {
  private static instance: ReactReadinessDetector;
  private initializationState: ReactInitializationState;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {
    this.initializationState = {
      isInitialized: false,
      initializationTime: 0,
      errors: [],
      warnings: []
    };
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): ReactReadinessDetector {
    if (!ReactReadinessDetector.instance) {
      ReactReadinessDetector.instance = new ReactReadinessDetector();
    }
    return ReactReadinessDetector.instance;
  }

  /**
   * 检查 React 是否可用
   */
  public isReactAvailable(): boolean {
    try {
      // 检查 React 对象是否存在
      if (typeof React === 'undefined' || React === null) {
        return false;
      }

      // 检查关键的 React 方法是否存在
      const requiredMethods = [
        'createElement',
        'Component',
        'useState',
        'useEffect',
        'useContext'
      ];

      for (const method of requiredMethods) {
        if (typeof (React as any)[method] === 'undefined') {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('React 可用性检查失败:', error);
      return false;
    }
  }

  /**
   * 检查 React Hook 上下文是否可用
   */
  public isHookContextAvailable(): boolean {
    try {
      // 检查 React 内部状态
      // 这是一个简化的检查，实际的 React 内部状态更复杂
      if (!this.isReactAvailable()) {
        return false;
      }

      // 检查是否在浏览器环境中
      if (typeof window === 'undefined') {
        return false;
      }

      // 检查 React DevTools 钩子（如果存在）
      const reactDevTools = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
      if (reactDevTools && reactDevTools.isDisabled) {
        this.initializationState.warnings.push('React DevTools 已禁用');
      }

      return true;
    } catch (error) {
      console.error('React Hook 上下文检查失败:', error);
      return false;
    }
  }

  /**
   * 验证 React 环境
   */
  public validateReactEnvironment(): ReactValidationResult {
    const result: ReactValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      recommendations: []
    };

    try {
      // 检查 React 基本可用性
      if (!this.isReactAvailable()) {
        result.isValid = false;
        result.errors.push('React 不可用或未正确加载');
        result.recommendations.push('确保 React 已正确导入和初始化');
        return result;
      }

      // 检查 Hook 上下文
      if (!this.isHookContextAvailable()) {
        result.isValid = false;
        result.errors.push('React Hook 上下文不可用');
        result.recommendations.push('确保在 React 组件内部调用 Hook');
        return result;
      }

      // 检查浏览器兼容性
      if (typeof window !== 'undefined') {
        // 检查必要的浏览器 API
        const requiredAPIs = ['Promise', 'Object.assign', 'Array.from'];
        for (const api of requiredAPIs) {
          if (typeof (window as any)[api] === 'undefined') {
            result.warnings.push(`浏览器不支持 ${api} API`);
            result.recommendations.push('考虑添加 polyfill 支持');
          }
        }
      }

      // 检查 React 版本（如果可能）
      const reactVersion = (React as any).version;
      if (reactVersion) {
        const majorVersion = parseInt(reactVersion.split('.')[0]);
        if (majorVersion < 16) {
          result.warnings.push(`React 版本过低: ${reactVersion}`);
          result.recommendations.push('建议升级到 React 16+ 以获得更好的 Hook 支持');
        }
      }

    } catch (error) {
      result.isValid = false;
      result.errors.push(`环境验证失败: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * 等待 React 就绪
   */
  public async waitForReact(timeout: number = 5000): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkReady = () => {
        const validation = this.validateReactEnvironment();
        
        if (validation.isValid) {
          this.initializationState.isInitialized = true;
          this.initializationState.initializationTime = Date.now() - startTime;
          resolve();
          return;
        }

        // 检查超时
        if (Date.now() - startTime > timeout) {
          const error = `React 初始化超时 (${timeout}ms): ${validation.errors.join(', ')}`;
          this.initializationState.errors.push(error);
          reject(new Error(error));
          return;
        }

        // 继续等待
        setTimeout(checkReady, 10);
      };

      checkReady();
    });

    return this.initializationPromise;
  }

  /**
   * 强制初始化 React
   */
  public async initializeReact(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // 确保 React 已加载
      if (!this.isReactAvailable()) {
        throw new Error('React 未加载或不可用');
      }

      // 等待 DOM 就绪（如果在浏览器环境中）
      if (typeof document !== 'undefined' && document.readyState !== 'complete') {
        await new Promise<void>((resolve) => {
          if (document.readyState === 'complete') {
            resolve();
          } else {
            const handler = () => {
              if (document.readyState === 'complete') {
                document.removeEventListener('readystatechange', handler);
                resolve();
              }
            };
            document.addEventListener('readystatechange', handler);
          }
        });
      }

      // 验证环境
      const validation = this.validateReactEnvironment();
      if (!validation.isValid) {
        throw new Error(`React 环境验证失败: ${validation.errors.join(', ')}`);
      }

      // 标记为已初始化
      this.initializationState.isInitialized = true;
      this.initializationState.initializationTime = Date.now() - startTime;
      this.initializationState.warnings = validation.warnings;

      console.log(`React 初始化完成，耗时: ${this.initializationState.initializationTime}ms`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.initializationState.errors.push(errorMessage);
      console.error('React 初始化失败:', errorMessage);
      throw error;
    }
  }

  /**
   * 获取初始化状态
   */
  public getInitializationState(): ReactInitializationState {
    return { ...this.initializationState };
  }

  /**
   * 重置初始化状态
   */
  public reset(): void {
    this.initializationState = {
      isInitialized: false,
      initializationTime: 0,
      errors: [],
      warnings: []
    };
    this.initializationPromise = null;
  }
}

/**
 * 便捷函数：检查 React 是否就绪
 */
export function isReactReady(): boolean {
  const detector = ReactReadinessDetector.getInstance();
  return detector.isReactAvailable() && detector.isHookContextAvailable();
}

/**
 * 便捷函数：等待 React 就绪
 */
export function waitForReactReady(timeout?: number): Promise<void> {
  const detector = ReactReadinessDetector.getInstance();
  return detector.waitForReact(timeout);
}

/**
 * 便捷函数：验证 React 环境
 */
export function validateReact(): ReactValidationResult {
  const detector = ReactReadinessDetector.getInstance();
  return detector.validateReactEnvironment();
}

/**
 * 便捷函数：初始化 React
 */
export function initializeReact(): Promise<void> {
  const detector = ReactReadinessDetector.getInstance();
  return detector.initializeReact();
}