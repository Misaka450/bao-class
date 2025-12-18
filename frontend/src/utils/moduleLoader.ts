/**
 * 模块加载控制器
 * 控制模块加载顺序，防止竞态条件和循环依赖
 */

// 模块状态枚举
export enum ModuleStatus {
  PENDING = 'pending',
  LOADING = 'loading',
  LOADED = 'loaded',
  ERROR = 'error'
}

// 模块状态接口
export interface ModuleState {
  name: string;
  status: ModuleStatus;
  dependencies: string[];
  loadTime: number;
  error?: Error;
  loadPromise?: Promise<any>;
  exports?: any;
}

// 模块加载配置
export interface ModuleLoadConfig {
  name: string;
  dependencies: string[];
  loader: () => Promise<any>;
  timeout?: number;
  retries?: number;
}

// 依赖图节点
interface DependencyNode {
  name: string;
  dependencies: Set<string>;
  dependents: Set<string>;
  visited: boolean;
  inStack: boolean;
}

/**
 * 模块加载控制器类
 */
export class ModuleLoadingController {
  private static instance: ModuleLoadingController;
  private modules: Map<string, ModuleState> = new Map();
  private configs: Map<string, ModuleLoadConfig> = new Map();
  private dependencyGraph: Map<string, DependencyNode> = new Map();
  private loadingOrder: string[] = [];
  private isInitialized = false;

  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): ModuleLoadingController {
    if (!ModuleLoadingController.instance) {
      ModuleLoadingController.instance = new ModuleLoadingController();
    }
    return ModuleLoadingController.instance;
  }

  /**
   * 注册模块
   */
  public registerModule(config: ModuleLoadConfig): void {
    const { name, dependencies } = config;

    // 创建模块状态
    const moduleState: ModuleState = {
      name,
      status: ModuleStatus.PENDING,
      dependencies: [...dependencies],
      loadTime: 0
    };

    this.modules.set(name, moduleState);
    this.configs.set(name, config);

    // 更新依赖图
    this.updateDependencyGraph(name, dependencies);

    console.log(`模块已注册: ${name}, 依赖: [${dependencies.join(', ')}]`);
  }

  /**
   * 更新依赖图
   */
  private updateDependencyGraph(moduleName: string, dependencies: string[]): void {
    // 创建或更新当前模块节点
    if (!this.dependencyGraph.has(moduleName)) {
      this.dependencyGraph.set(moduleName, {
        name: moduleName,
        dependencies: new Set(),
        dependents: new Set(),
        visited: false,
        inStack: false
      });
    }

    const currentNode = this.dependencyGraph.get(moduleName)!;
    currentNode.dependencies = new Set(dependencies);

    // 更新依赖模块的 dependents
    for (const dep of dependencies) {
      if (!this.dependencyGraph.has(dep)) {
        this.dependencyGraph.set(dep, {
          name: dep,
          dependencies: new Set(),
          dependents: new Set(),
          visited: false,
          inStack: false
        });
      }
      this.dependencyGraph.get(dep)!.dependents.add(moduleName);
    }

    // 重新计算加载顺序
    this.calculateLoadingOrder();
  }

  /**
   * 计算模块加载顺序（拓扑排序）
   */
  private calculateLoadingOrder(): void {
    const order: string[] = [];
    const visited = new Set<string>();
    const inStack = new Set<string>();

    // 重置访问状态
    for (const node of this.dependencyGraph.values()) {
      node.visited = false;
      node.inStack = false;
    }

    // 深度优先搜索进行拓扑排序
    const dfs = (nodeName: string): boolean => {
      if (inStack.has(nodeName)) {
        // 检测到循环依赖
        throw new Error(`检测到循环依赖: ${nodeName}`);
      }

      if (visited.has(nodeName)) {
        return true;
      }

      const node = this.dependencyGraph.get(nodeName);
      if (!node) {
        return true; // 外部依赖，跳过
      }

      visited.add(nodeName);
      inStack.add(nodeName);

      // 先访问所有依赖
      for (const dep of node.dependencies) {
        if (!dfs(dep)) {
          return false;
        }
      }

      inStack.delete(nodeName);
      order.push(nodeName);
      return true;
    };

    // 对所有模块进行拓扑排序
    for (const moduleName of this.dependencyGraph.keys()) {
      if (!visited.has(moduleName)) {
        dfs(moduleName);
      }
    }

    this.loadingOrder = order;
    console.log('模块加载顺序已计算:', this.loadingOrder);
  }

  /**
   * 验证依赖关系
   */
  public validateDependencies(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      // 尝试计算加载顺序，这会检测循环依赖
      this.calculateLoadingOrder();

      // 检查是否所有依赖都已注册
      for (const [moduleName, moduleState] of this.modules) {
        for (const dep of moduleState.dependencies) {
          if (!this.modules.has(dep) && !this.isExternalDependency(dep)) {
            errors.push(`模块 ${moduleName} 的依赖 ${dep} 未注册`);
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      return {
        isValid: false,
        errors
      };
    }
  }

  /**
   * 检查是否为外部依赖
   */
  private isExternalDependency(name: string): boolean {
    // 常见的外部依赖
    const externalDeps = [
      'react',
      'react-dom',
      'react-router-dom',
      'antd',
      '@ant-design/icons',
      '@ant-design/pro-components',
      'zustand',
      '@tanstack/react-query'
    ];
    return externalDeps.includes(name);
  }

  /**
   * 加载单个模块
   */
  public async loadModule(name: string): Promise<any> {
    const moduleState = this.modules.get(name);
    const config = this.configs.get(name);

    if (!moduleState || !config) {
      throw new Error(`模块 ${name} 未注册`);
    }

    // 如果已经加载完成，直接返回
    if (moduleState.status === ModuleStatus.LOADED) {
      return moduleState.exports;
    }

    // 如果正在加载，等待加载完成
    if (moduleState.status === ModuleStatus.LOADING && moduleState.loadPromise) {
      return moduleState.loadPromise;
    }

    // 如果之前加载失败，可以重试
    if (moduleState.status === ModuleStatus.ERROR) {
      console.warn(`重试加载失败的模块: ${name}`);
    }

    // 开始加载
    moduleState.status = ModuleStatus.LOADING;
    const startTime = Date.now();

    try {
      // 先加载所有依赖
      await this.loadDependencies(name);

      // 加载当前模块
      console.log(`开始加载模块: ${name}`);
      
      const loadPromise = this.loadWithTimeout(config.loader, config.timeout || 10000);
      moduleState.loadPromise = loadPromise;
      
      const exports = await loadPromise;
      
      // 加载成功
      moduleState.status = ModuleStatus.LOADED;
      moduleState.exports = exports;
      moduleState.loadTime = Date.now() - startTime;
      
      console.log(`模块加载成功: ${name} (${moduleState.loadTime}ms)`);
      return exports;

    } catch (error) {
      // 加载失败
      const err = error instanceof Error ? error : new Error(String(error));
      moduleState.status = ModuleStatus.ERROR;
      moduleState.error = err;
      moduleState.loadTime = Date.now() - startTime;
      
      console.error(`模块加载失败: ${name}`, err);
      throw err;
    }
  }

  /**
   * 加载模块依赖
   */
  private async loadDependencies(moduleName: string): Promise<void> {
    const moduleState = this.modules.get(moduleName);
    if (!moduleState) {
      return;
    }

    const loadPromises: Promise<any>[] = [];

    for (const dep of moduleState.dependencies) {
      if (this.modules.has(dep)) {
        // 内部依赖，需要加载
        loadPromises.push(this.loadModule(dep));
      } else if (this.isExternalDependency(dep)) {
        // 外部依赖，假设已经可用
        console.log(`外部依赖已可用: ${dep}`);
      } else {
        console.warn(`未知依赖: ${dep}`);
      }
    }

    if (loadPromises.length > 0) {
      await Promise.all(loadPromises);
    }
  }

  /**
   * 带超时的加载
   */
  private async loadWithTimeout<T>(
    loader: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`模块加载超时 (${timeout}ms)`));
      }, timeout);

      loader()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * 按顺序加载所有模块
   */
  public async loadAllModules(): Promise<void> {
    // 验证依赖关系
    const validation = this.validateDependencies();
    if (!validation.isValid) {
      throw new Error(`依赖验证失败: ${validation.errors.join(', ')}`);
    }

    console.log('开始按顺序加载所有模块...');
    
    for (const moduleName of this.loadingOrder) {
      if (this.modules.has(moduleName)) {
        await this.loadModule(moduleName);
      }
    }

    this.isInitialized = true;
    console.log('所有模块加载完成');
  }

  /**
   * 获取模块状态
   */
  public getModuleState(name: string): ModuleState | undefined {
    return this.modules.get(name);
  }

  /**
   * 获取所有模块状态
   */
  public getAllModuleStates(): ModuleState[] {
    return Array.from(this.modules.values());
  }

  /**
   * 获取加载顺序
   */
  public getLoadingOrder(): string[] {
    return [...this.loadingOrder];
  }

  /**
   * 检查是否已初始化
   */
  public isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * 重置控制器
   */
  public reset(): void {
    this.modules.clear();
    this.configs.clear();
    this.dependencyGraph.clear();
    this.loadingOrder = [];
    this.isInitialized = false;
    console.log('模块加载控制器已重置');
  }

  /**
   * 获取加载统计信息
   */
  public getLoadingStats(): {
    total: number;
    loaded: number;
    loading: number;
    pending: number;
    error: number;
    totalLoadTime: number;
  } {
    const states = this.getAllModuleStates();
    
    return {
      total: states.length,
      loaded: states.filter(s => s.status === ModuleStatus.LOADED).length,
      loading: states.filter(s => s.status === ModuleStatus.LOADING).length,
      pending: states.filter(s => s.status === ModuleStatus.PENDING).length,
      error: states.filter(s => s.status === ModuleStatus.ERROR).length,
      totalLoadTime: states.reduce((sum, s) => sum + s.loadTime, 0)
    };
  }
}

/**
 * 便捷函数：注册模块
 */
export function registerModule(config: ModuleLoadConfig): void {
  const controller = ModuleLoadingController.getInstance();
  controller.registerModule(config);
}

/**
 * 便捷函数：加载模块
 */
export function loadModule(name: string): Promise<any> {
  const controller = ModuleLoadingController.getInstance();
  return controller.loadModule(name);
}

/**
 * 便捷函数：加载所有模块
 */
export function loadAllModules(): Promise<void> {
  const controller = ModuleLoadingController.getInstance();
  return controller.loadAllModules();
}

/**
 * 便捷函数：验证依赖
 */
export function validateModuleDependencies(): { isValid: boolean; errors: string[] } {
  const controller = ModuleLoadingController.getInstance();
  return controller.validateDependencies();
}