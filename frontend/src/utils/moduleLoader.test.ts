/**
 * 模块加载控制器测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ModuleLoadingController, ModuleStatus } from './moduleLoader';

describe('ModuleLoadingController', () => {
  let controller: ModuleLoadingController;

  beforeEach(() => {
    controller = ModuleLoadingController.getInstance();
    controller.reset();
  });

  describe('模块注册', () => {
    it('应该能够注册模块', () => {
      controller.registerModule({
        name: 'test-module',
        dependencies: ['react'],
        loader: async () => ({ test: true })
      });

      const state = controller.getModuleState('test-module');
      expect(state).toBeDefined();
      expect(state?.name).toBe('test-module');
      expect(state?.status).toBe(ModuleStatus.PENDING);
      expect(state?.dependencies).toEqual(['react']);
    });

    it('应该能够注册有依赖关系的模块', () => {
      controller.registerModule({
        name: 'module-a',
        dependencies: ['react'],
        loader: async () => ({ a: true })
      });

      controller.registerModule({
        name: 'module-b',
        dependencies: ['module-a'],
        loader: async () => ({ b: true })
      });

      const order = controller.getLoadingOrder();
      const aIndex = order.indexOf('module-a');
      const bIndex = order.indexOf('module-b');
      
      // module-a 应该在 module-b 之前
      expect(aIndex).toBeLessThan(bIndex);
    });
  });

  describe('依赖验证', () => {
    it('应该验证正确的依赖关系', () => {
      controller.registerModule({
        name: 'module-a',
        dependencies: ['react'],
        loader: async () => ({ a: true })
      });

      controller.registerModule({
        name: 'module-b',
        dependencies: ['module-a'],
        loader: async () => ({ b: true })
      });

      const validation = controller.validateDependencies();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('应该检测循环依赖', () => {
      // 注册第一个模块时不会出错
      controller.registerModule({
        name: 'module-a',
        dependencies: ['module-b'],
        loader: async () => ({ a: true })
      });

      // 注册第二个模块时会检测到循环依赖
      expect(() => {
        controller.registerModule({
          name: 'module-b',
          dependencies: ['module-a'],
          loader: async () => ({ b: true })
        });
      }).toThrow('检测到循环依赖');
    });
  });

  describe('模块加载', () => {
    it('应该能够加载简单模块', async () => {
      const mockExports = { test: 'value' };
      
      controller.registerModule({
        name: 'simple-module',
        dependencies: [],
        loader: async () => mockExports
      });

      const result = await controller.loadModule('simple-module');
      expect(result).toEqual(mockExports);

      const state = controller.getModuleState('simple-module');
      expect(state?.status).toBe(ModuleStatus.LOADED);
      expect(state?.exports).toEqual(mockExports);
    });

    it('应该按正确顺序加载依赖模块', async () => {
      const loadOrder: string[] = [];

      controller.registerModule({
        name: 'module-a',
        dependencies: [],
        loader: async () => {
          loadOrder.push('module-a');
          return { a: true };
        }
      });

      controller.registerModule({
        name: 'module-b',
        dependencies: ['module-a'],
        loader: async () => {
          loadOrder.push('module-b');
          return { b: true };
        }
      });

      await controller.loadModule('module-b');
      
      expect(loadOrder).toEqual(['module-a', 'module-b']);
    });
  });

  describe('加载统计', () => {
    it('应该提供正确的加载统计信息', () => {
      controller.registerModule({
        name: 'module-1',
        dependencies: [],
        loader: async () => ({ test: 1 })
      });

      controller.registerModule({
        name: 'module-2',
        dependencies: [],
        loader: async () => ({ test: 2 })
      });

      const stats = controller.getLoadingStats();
      expect(stats.total).toBe(2);
      expect(stats.pending).toBe(2);
      expect(stats.loaded).toBe(0);
      expect(stats.loading).toBe(0);
      expect(stats.error).toBe(0);
    });
  });
});