/**
 * 错误恢复系统测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ErrorRecoveryManager, RecoveryStrategy } from './errorRecovery';

describe('ErrorRecoveryManager', () => {
  let manager: ErrorRecoveryManager;

  beforeEach(() => {
    // 重置单例实例
    (ErrorRecoveryManager as any).instance = undefined;
    manager = ErrorRecoveryManager.getInstance();
  });

  describe('错误分析', () => {
    it('应该识别 React Hook 错误', () => {
      const hookError = new Error('Cannot read properties of null (reading \'useEffect\')');
      const options = manager.analyzeErrorAndProvideOptions(hookError);
      
      expect(options.length).toBeGreaterThan(0);
      expect(options.some(opt => opt.strategy === RecoveryStrategy.RESET)).toBe(true);
      expect(options.some(opt => opt.title.includes('React'))).toBe(true);
    });

    it('应该识别模块加载错误', () => {
      const moduleError = new Error('Failed to load module: test-module');
      const options = manager.analyzeErrorAndProvideOptions(moduleError);
      
      expect(options.length).toBeGreaterThan(0);
      expect(options.some(opt => opt.title.includes('模块'))).toBe(true);
    });

    it('应该提供通用恢复选项', () => {
      const genericError = new Error('Something went wrong');
      const options = manager.analyzeErrorAndProvideOptions(genericError);
      
      expect(options.length).toBeGreaterThan(0);
      expect(options.some(opt => opt.strategy === RecoveryStrategy.RELOAD)).toBe(true);
      expect(options.some(opt => opt.strategy === RecoveryStrategy.MANUAL)).toBe(true);
    });
  });

  describe('恢复状态管理', () => {
    it('应该正确跟踪恢复状态', () => {
      const initialState = manager.getRecoveryState();
      
      expect(initialState.isRecovering).toBe(false);
      expect(initialState.attempts).toBe(0);
      expect(initialState.strategy).toBeNull();
    });

    it('应该能够重置恢复状态', () => {
      // 模拟一些恢复尝试
      const error = new Error('Test error');
      const options = manager.analyzeErrorAndProvideOptions(error);
      
      manager.resetRecoveryState();
      
      const state = manager.getRecoveryState();
      expect(state.attempts).toBe(0);
      expect(state.isRecovering).toBe(false);
    });
  });

  describe('恢复选项执行', () => {
    it('应该能够执行恢复选项', async () => {
      let executed = false;
      
      const mockOption = {
        id: 'test_option',
        strategy: RecoveryStrategy.RETRY,
        title: '测试恢复',
        description: '测试恢复选项',
        action: () => {
          executed = true;
          return Promise.resolve();
        }
      };

      const result = await manager.executeRecovery(mockOption);
      
      expect(result).toBe(true);
      expect(executed).toBe(true);
    });

    it('应该处理恢复失败', async () => {
      const mockOption = {
        id: 'failing_option',
        strategy: RecoveryStrategy.RETRY,
        title: '失败的恢复',
        description: '会失败的恢复选项',
        action: () => {
          throw new Error('Recovery failed');
        }
      };

      const result = await manager.executeRecovery(mockOption);
      
      expect(result).toBe(false);
    });
  });
});