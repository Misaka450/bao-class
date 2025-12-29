/**
 * 模块编排器 Hook
 * 提供模块加载状态的响应式访问
 */

import { useState, useEffect, useCallback } from 'react';
import { ModuleOrchestrator, OrchestratorState, OrchestratorStatus, OrchestratorConfig } from '../utils/moduleOrchestrator';

interface UseModuleOrchestratorOptions {
  autoInitialize?: boolean;
  config?: OrchestratorConfig;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

interface UseModuleOrchestratorReturn {
  state: OrchestratorState;
  isReady: boolean;
  isLoading: boolean;
  error: Error | null;
  initialize: () => Promise<void>;
  reset: () => void;
  getDetailedStatus: () => any;
}

/**
 * 使用模块编排器的 Hook
 */
export function useModuleOrchestrator(options: UseModuleOrchestratorOptions = {}): UseModuleOrchestratorReturn {
  const {
    autoInitialize = true,
    config,
    onReady,
    onError
  } = options;

  const [orchestrator] = useState(() => ModuleOrchestrator.getInstance(config));
  const [state, setState] = useState<OrchestratorState>(orchestrator.getState());

  /**
   * 初始化应用
   */
  const initialize = useCallback(async () => {
    try {
      orchestrator.registerCoreModules();
      await orchestrator.initialize();
      
      if (orchestrator.isReady()) {
        onReady?.();
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, [orchestrator, onReady, onError]);

  /**
   * 重置编排器
   */
  const reset = useCallback(() => {
    orchestrator.reset();
  }, [orchestrator]);

  /**
   * 获取详细状态
   */
  const getDetailedStatus = useCallback(() => {
    return orchestrator.getDetailedStatus();
  }, [orchestrator]);

  // 监听状态变化
  useEffect(() => {
    const unsubscribe = orchestrator.addStateListener((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, [orchestrator]);

  // 自动初始化
  useEffect(() => {
    if (autoInitialize && state.status === OrchestratorStatus.IDLE) {
      initialize();
    }
  }, [autoInitialize, state.status, initialize]);

  return {
    state,
    isReady: orchestrator.isReady(),
    isLoading: state.status === OrchestratorStatus.INITIALIZING_REACT || 
               state.status === OrchestratorStatus.LOADING_MODULES,
    error: state.error || null,
    initialize,
    reset,
    getDetailedStatus
  };
}

/**
 * 简化版本的 Hook，只返回就绪状态
 */
export function useIsAppReady(): boolean {
  const { isReady } = useModuleOrchestrator({ autoInitialize: true });
  return isReady;
}

/**
 * 获取应用加载进度的 Hook
 */
export function useAppLoadingProgress(): {
  progress: number;
  stage: string;
  isComplete: boolean;
} {
  const { state } = useModuleOrchestrator({ autoInitialize: true });

  const getProgress = (): number => {
    switch (state.status) {
      case OrchestratorStatus.IDLE:
        return 0;
      case OrchestratorStatus.INITIALIZING_REACT:
        return 25;
      case OrchestratorStatus.LOADING_MODULES:
        return 75;
      case OrchestratorStatus.READY:
        return 100;
      case OrchestratorStatus.ERROR:
        return 0;
      default:
        return 0;
    }
  };

  const getStage = (): string => {
    switch (state.status) {
      case OrchestratorStatus.IDLE:
        return '准备中...';
      case OrchestratorStatus.INITIALIZING_REACT:
        return '初始化 React...';
      case OrchestratorStatus.LOADING_MODULES:
        return '加载应用模块...';
      case OrchestratorStatus.READY:
        return '应用就绪';
      case OrchestratorStatus.ERROR:
        return '初始化失败';
      default:
        return '未知状态';
    }
  };

  return {
    progress: getProgress(),
    stage: getStage(),
    isComplete: state.status === OrchestratorStatus.READY
  };
}