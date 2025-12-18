/**
 * React 初始化守护工具测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ReactReadinessDetector, isReactReady, validateReact } from './reactGuard';

describe('ReactReadinessDetector', () => {
  let detector: ReactReadinessDetector;

  beforeEach(() => {
    detector = ReactReadinessDetector.getInstance();
    detector.reset();
  });

  describe('isReactAvailable', () => {
    it('应该检测到 React 可用', () => {
      const isAvailable = detector.isReactAvailable();
      expect(isAvailable).toBe(true);
    });
  });

  describe('isHookContextAvailable', () => {
    it('应该检测到 Hook 上下文可用', () => {
      const isAvailable = detector.isHookContextAvailable();
      expect(isAvailable).toBe(true);
    });
  });

  describe('validateReactEnvironment', () => {
    it('应该返回有效的验证结果', () => {
      const result = detector.validateReactEnvironment();
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('recommendations');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('在正常环境下应该返回有效结果', () => {
      const result = detector.validateReactEnvironment();
      expect(result.isValid).toBe(true);
    });
  });

  describe('getInitializationState', () => {
    it('应该返回初始化状态', () => {
      const state = detector.getInitializationState();
      expect(state).toHaveProperty('isInitialized');
      expect(state).toHaveProperty('initializationTime');
      expect(state).toHaveProperty('errors');
      expect(state).toHaveProperty('warnings');
    });
  });
});

describe('便捷函数', () => {
  describe('isReactReady', () => {
    it('应该返回布尔值', () => {
      const ready = isReactReady();
      expect(typeof ready).toBe('boolean');
    });
  });

  describe('validateReact', () => {
    it('应该返回验证结果', () => {
      const result = validateReact();
      expect(result).toHaveProperty('isValid');
      expect(typeof result.isValid).toBe('boolean');
    });
  });
});