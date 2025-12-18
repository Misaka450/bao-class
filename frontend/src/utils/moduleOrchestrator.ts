/**
 * 模块加载编排器
 * 协调 React 初始化和模块加载过程
 */

import { ReactReadinessDetector } from './reactGuard';
import { ModuleLoadingController, ModuleLoadConfig } from './moduleLoader';

// 编排器状态
export enum OrchestratorStatus {
  IDLE = 'idle',
  INITIALIZING_REACT = 'initializing_react',
  LOADING_MODULES = 'loading_modules',
  READY = 'ready',
  ERROR = 'error'
}

// 编排器配置
export interface OrchestratorConfig {
  reactTimeout?: number;
  moduleTimeout?: number;
  enableLogging?: boolean;
  retryAttempts?: number;
}

// 编排器状态信息
export interface OrchestratorState {
  status: OrchestratorStatus;
  reactReady: boolean;
  modulesReady: boolean;
  error?: Error;
  startTime: number;
  reactInitTime: number;
  moduleLoadTime: number;
  totalTime: number;
}

/**
 * 模块加载编排器类
 */
export class ModuleOrchestrator {
  private static instance: ModuleOrchestrator;
  private reactDetector: ReactReadinessDetector;
  private moduleController: ModuleLoadingController;
  private config: Required<OrchestratorConfig>;
  private state: OrchestratorState;
  private listeners: Array<(state: OrchestratorState) => void> = [];

  private constructor(config: OrchestratorConfig = {}) {
    this.reactDetector = ReactReadinessDetector.getInstance();
    this.moduleController = ModuleLoadingController.getInstance();
    
    this.config = {
      reactTimeout: config.reactTimeout || 10000,
      moduleTimeout: config.moduleTimeout || 30000,
      enableLogging: config.enableLogging !== false,
      retryAttempts: config.retryAttempts || 3
    };

    this.state = {
      status: OrchestratorStatus.IDLE,
      reactReady: false,
      modulesReady: false,
      startTime: 0,
      reactInitTime: 0,
      moduleLoadTime: 0,
      totalTime: 0
    };
  }

  /**
   * 获取单例实例
   */
  public static getInstance(config?: OrchestratorConfig): ModuleOrchestrator {
    if (!ModuleOrchestrator.instance) {
      ModuleOrchestrator.instance = new ModuleOrchestrator(config);
    }
    return ModuleOrchestrator.instance;
  }

  /**
   * 注册核心模块
   */
  public registerCoreModules(): void {
    this.log('注册核心模块...');

    // 注册 React 相关模块
    this.moduleController.registerModule({
      name: 'react-core',
      dependencies: ['react', 'react-dom'],
      loader: async () => {
        // React 已经通过 script 标签加载，这里只是验证
        await this.reactDetector.waitForReact(this.config.reactTimeout);
        return { react: true };
      },
      timeout: this.config.reactTimeout
    });

    // 注册路由模块
    this.moduleController.registerModule({
      name: 'react-router',
      dependencies: ['react-core'],
      loader: async () => {
        const { BrowserRouter } = await import('react-router-dom');
        return { BrowserRouter };
      },
      timeout: this.config.moduleTimeout
    });

    // 注册状态管理模块
    this.moduleController.registerModule({
      name: 'state-management',
      dependencies: ['react-core'],
      loader: async () => {
        // 这里可以加载 Zustand 或其他状态管理库
        return { stateManagement: true };
      },
      timeout: this.config.moduleTimeout
    });

    // 注册 UI 组件模块
    this.moduleController.registerModule({
      name: 'ui-components',
      dependencies: ['react-core'],
      loader: async () => {
        // 延迟加载 Ant Design 组件
        return { uiComponents: true };
      },
      timeout: this.config.moduleTimeout
    });

    // 注册应用模块
    this.moduleController.registerModule({
      name: 'app-modules',
      dependencies: ['react-router', 'state-management', 'ui-components'],
      loader: async () => {
        // 加载应用特定的模块
        return { appModules: true };
      },
      timeout: this.config.moduleTimeout
    });

    this.log('核心模块注册完成');
  }

  /**
   * 初始化应用
   */
  public async initialize(): Promise<void> {
    this.log('开始初始化应用...');
    
    this.updateState({
      status: OrchestratorStatus.INITIALIZING_REACT,
      startTime: Date.now()
    });

    try {
      // 第一步：确保 React 就绪
      await this.initializeReact();
      
      // 第二步：加载模块
      await this.loadModules();
      
      // 初始化完成
      this.updateState({
        status: OrchestratorStatus.READY,
        modulesReady: true,
        totalTime: Date.now() - this.state.startTime
      });

      this.log(`应用初始化完成，总耗时: ${this.state.totalTime}ms`);
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.updateState({
        status: OrchestratorStatus.ERROR,
        error: err,
        totalTime: Date.now() - this.state.startTime
      });
      
      this.log(`应用初始化失败: ${err.message}`);
      throw err;
    }
  }

  /**
   * 初始化 React
   */
  private async initializeReact(): Promise<void> {
    this.log('初始化 React...');
    
    const startTime = Date.now();
    
    try {
      await this.reactDetector.initializeReact();
      
      const reactInitTime = Date.now() - startTime;
      this.updateState({
        reactReady: true,
        reactInitTime
      });
      
      this.log(`React 初始化完成，耗时: ${reactInitTime}ms`);
      
    } catch (error) {
      this.log(`React 初始化失败: ${error}`);
      throw error;
    }
  }

  /**
   * 加载模块
   */
  private async loadModules(): Promise<void> {
    this.log('开始加载模块...');
    
    this.updateState({
      status: OrchestratorStatus.LOADING_MODULES
    });

    const startTime = Date.now();
    
    try {
      // 验证模块依赖
      const validation = this.moduleController.validateDependencies();
      if (!validation.isValid) {
        throw new Error(`模块依赖验证失败: ${validation.errors.join(', ')}`);
      }

      // 加载所有模块
      await this.moduleController.loadAllModules();
      
      const moduleLoadTime = Date.now() - startTime;
      this.updateState({
        moduleLoadTime
      });
      
      this.log(`模块加载完成，耗时: ${moduleLoadTime}ms`);
      
    } catch (error) {
      this.log(`模块加载失败: ${error}`);
      throw error;
    }
  }

  /**
   * 更新状态并通知监听器
   */
  private updateState(updates: Partial<OrchestratorState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  /**
   * 通知状态监听器
   */
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (error) {
        console.error('状态监听器错误:', error);
      }
    }
  }

  /**
   * 添加状态监听器
   */
  public addStateListener(listener: (state: OrchestratorState) => void): () => void {
    this.listeners.push(listener);
    
    // 返回取消监听的函数
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * 获取当前状态
   */
  public getState(): OrchestratorState {
    return { ...this.state };
  }

  /**
   * 检查是否就绪
   */
  public isReady(): boolean {
    return this.state.status === OrchestratorStatus.READY;
  }

  /**
   * 重置编排器
   */
  public reset(): void {
    this.reactDetector.reset();
    this.moduleController.reset();
    
    this.state = {
      status: OrchestratorStatus.IDLE,
      reactReady: false,
      modulesReady: false,
      startTime: 0,
      reactInitTime: 0,
      moduleLoadTime: 0,
      totalTime: 0
    };
    
    this.listeners = [];
    this.log('编排器已重置');
  }

  /**
   * 获取详细状态信息
   */
  public getDetailedStatus(): {
    orchestrator: OrchestratorState;
    react: any;
    modules: any;
  } {
    return {
      orchestrator: this.getState(),
      react: this.reactDetector.getInitializationState(),
      modules: this.moduleController.getLoadingStats()
    };
  }

  /**
   * 日志输出
   */
  private log(message: string): void {
    if (this.config.enableLogging) {
      console.log(`[ModuleOrchestrator] ${message}`);
    }
  }
}

/**
 * 便捷函数：初始化应用
 */
export async function initializeApp(config?: OrchestratorConfig): Promise<void> {
  const orchestrator = ModuleOrchestrator.getInstance(config);
  orchestrator.registerCoreModules();
  await orchestrator.initialize();
}

/**
 * 便捷函数：获取编排器实例
 */
export function getOrchestrator(): ModuleOrchestrator {
  return ModuleOrchestrator.getInstance();
}