/**
 * AbortControllerManager 测试
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { AbortControllerManager } from '../../managers/AbortControllerManager';
import type { CancelableRequestConfig } from '../../types';

describe('AbortControllerManager', () => {
  let manager: AbortControllerManager;

  beforeEach(() => {
    manager = new AbortControllerManager();
  });

  describe('构造函数', () => {
    it('应该使用默认配置', () => {
      const defaultManager = new AbortControllerManager();
      expect(defaultManager.getPendingCount()).toBe(0);
    });

    it('应该使用自定义配置', () => {
      const customManager = new AbortControllerManager({
        autoCancelPrevious: false,
        defaultCancelMessage: '自定义取消消息',
      });
      expect(customManager.getPendingCount()).toBe(0);
    });

  });

  describe('createAbortController', () => {
    it('应该创建 AbortController', () => {
      const controller = manager.createAbortController('request-1');
      expect(controller).toBeDefined();
      expect(controller.signal).toBeDefined();
      expect(controller.signal.aborted).toBe(false);
      expect(manager.has('request-1')).toBe(true);
    });

    it('应该存储请求配置', () => {
      const config: CancelableRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      manager.createAbortController('request-1', config);
      expect(manager.has('request-1')).toBe(true);
    });

    it('应该在 autoCancelPrevious=true 时自动取消旧请求', async () => {
      const controller1 = manager.createAbortController('request-1');
      let cancelled = false;

      controller1.signal.addEventListener('abort', () => {
        cancelled = true;
      });

      // 等待监听器注册
      await new Promise((resolve) => setTimeout(resolve, 0));

      // 创建相同 requestId 的新 controller，应该取消旧的
      manager.createAbortController('request-1');

      // 等待事件触发
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(cancelled).toBe(true);
          expect(controller1.signal.aborted).toBe(true);
          resolve();
        }, 50);
      });
    }, 10000);

    it('应该在 autoCancelPrevious=false 时不自动取消旧请求', async () => {
      const noAutoManager = new AbortControllerManager({
        autoCancelPrevious: false,
      });
      const controller1 = noAutoManager.createAbortController('request-1');
      let cancelled = false;

      controller1.signal.addEventListener('abort', () => {
        cancelled = true;
      });

      // 创建相同 requestId 的新 controller，不应该取消旧的
      noAutoManager.createAbortController('request-1');

      // 等待一段时间，确认没有取消
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(cancelled).toBe(false);
          expect(controller1.signal.aborted).toBe(false);
          // 注意：创建新 controller 时，旧的会被替换，但不会被取消
          // 所以 has('request-1') 应该为 true（新 controller）
          expect(noAutoManager.has('request-1')).toBe(true);
          resolve();
        }, 50);
      });
    }, 10000);
  });

  describe('cancel', () => {
    it('应该取消指定请求', async () => {
      const controller = manager.createAbortController('request-1');
      let cancelled = false;

      controller.signal.addEventListener('abort', () => {
        cancelled = true;
      });

      // 等待监听器注册
      await new Promise((resolve) => setTimeout(resolve, 0));

      manager.cancel('request-1', '用户取消');

      // 等待事件触发
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(cancelled).toBe(true);
          expect(controller.signal.aborted).toBe(true);
          expect(manager.has('request-1')).toBe(false);
          resolve();
        }, 50);
      });
    }, 10000);

    it('应该在请求不存在时不抛出错误', () => {
      expect(() => {
        manager.cancel('non-existent');
      }).not.toThrow();
    });

    it('应该在取消后移除请求记录', () => {
      manager.createAbortController('request-1');
      expect(manager.has('request-1')).toBe(true);
      manager.cancel('request-1');
      expect(manager.has('request-1')).toBe(false);
    });
  });

  describe('cancelAll', () => {
    it('应该取消所有请求', async () => {
      const controller1 = manager.createAbortController('request-1');
      const controller2 = manager.createAbortController('request-2');
      let cancelled1 = false;
      let cancelled2 = false;

      controller1.signal.addEventListener('abort', () => {
        cancelled1 = true;
      });
      controller2.signal.addEventListener('abort', () => {
        cancelled2 = true;
      });

      // 等待监听器注册
      await new Promise((resolve) => setTimeout(resolve, 0));

      manager.cancelAll('批量取消');

      // 等待事件触发
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(cancelled1).toBe(true);
          expect(cancelled2).toBe(true);
          expect(controller1.signal.aborted).toBe(true);
          expect(controller2.signal.aborted).toBe(true);
          expect(manager.getPendingCount()).toBe(0);
          resolve();
        }, 50);
      });
    }, 10000);

    it('应该在无请求时不抛出错误', () => {
      expect(() => {
        manager.cancelAll();
      }).not.toThrow();
    });
  });

  describe('cancelBy', () => {
    it('应该按条件取消请求', async () => {
      const controller1 = manager.createAbortController('request-1', {
        url: '/api/users',
        method: 'GET',
      });
      manager.createAbortController('request-2', {
        url: '/api/posts',
        method: 'GET',
      });
      const controller3 = manager.createAbortController('request-3', {
        url: '/api/users',
        method: 'POST',
      });

      let cancelled1 = false;
      let cancelled3 = false;

      controller1.signal.addEventListener('abort', () => {
        cancelled1 = true;
      });
      controller3.signal.addEventListener('abort', () => {
        cancelled3 = true;
      });

      // 等待监听器注册
      await new Promise((resolve) => setTimeout(resolve, 0));

      const count = manager.cancelBy((config) => config.url === '/api/users');

      // 等待事件触发
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(count).toBe(2);
          expect(cancelled1).toBe(true);
          expect(cancelled3).toBe(true);
          expect(controller1.signal.aborted).toBe(true);
          expect(controller3.signal.aborted).toBe(true);
          expect(manager.has('request-1')).toBe(false);
          expect(manager.has('request-2')).toBe(true);
          expect(manager.has('request-3')).toBe(false);
          resolve();
        }, 50);
      });
    }, 10000);

    it('应该返回取消的请求数量', () => {
      manager.createAbortController('request-1', {
        url: '/api/users',
        method: 'GET',
      });
      manager.createAbortController('request-2', {
        url: '/api/posts',
        method: 'GET',
      });

      const count = manager.cancelBy((config) => config.url === '/api/users');

      expect(count).toBe(1);
    });

    it('应该在没有匹配请求时返回 0', () => {
      manager.createAbortController('request-1', {
        url: '/api/users',
        method: 'GET',
      });

      const count = manager.cancelBy((config) => config.url === '/api/posts');

      expect(count).toBe(0);
    });

    it('应该取消匹配的请求', async () => {
      const controller = manager.createAbortController('request-1', {
        url: '/api/users',
        method: 'GET',
      });
      let cancelled = false;

      controller.signal.addEventListener('abort', () => {
        cancelled = true;
      });

      manager.cancelBy((config) => config.url === '/api/users', '条件取消');

      // 等待事件触发
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(cancelled).toBe(true);
          expect(controller.signal.aborted).toBe(true);
          resolve();
        }, 10);
      });
    }, 10000);
  });

  describe('remove', () => {
    it('应该移除请求记录', () => {
      manager.createAbortController('request-1');
      expect(manager.has('request-1')).toBe(true);
      manager.remove('request-1');
      expect(manager.has('request-1')).toBe(false);
    });

    it('应该在请求不存在时不抛出错误', () => {
      expect(() => {
        manager.remove('non-existent');
      }).not.toThrow();
    });
  });

  describe('get', () => {
    it('应该获取 AbortController', () => {
      const controller = manager.createAbortController('request-1');
      const retrieved = manager.get('request-1');
      expect(retrieved).toBe(controller);
    });

    it('应该在请求不存在时返回 undefined', () => {
      const retrieved = manager.get('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('has', () => {
    it('应该检查请求是否存在', () => {
      expect(manager.has('request-1')).toBe(false);
      manager.createAbortController('request-1');
      expect(manager.has('request-1')).toBe(true);
    });
  });

  describe('getPendingCount', () => {
    it('应该返回待取消的请求数量', () => {
      expect(manager.getPendingCount()).toBe(0);
      manager.createAbortController('request-1');
      expect(manager.getPendingCount()).toBe(1);
      manager.createAbortController('request-2');
      expect(manager.getPendingCount()).toBe(2);
      manager.remove('request-1');
      expect(manager.getPendingCount()).toBe(1);
    });
  });

  describe('clear', () => {
    it('应该清除所有请求记录', () => {
      manager.createAbortController('request-1');
      manager.createAbortController('request-2');
      expect(manager.getPendingCount()).toBe(2);
      manager.clear();
      expect(manager.getPendingCount()).toBe(0);
    });

    it('应该不取消请求，只清除记录', async () => {
      const controller = manager.createAbortController('request-1');
      let cancelled = false;

      controller.signal.addEventListener('abort', () => {
        cancelled = true;
      });

      manager.clear();

      await new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(cancelled).toBe(false);
          expect(controller.signal.aborted).toBe(false);
          expect(manager.getPendingCount()).toBe(0);
          resolve();
        }, 10);
      });
    });
  });
});

