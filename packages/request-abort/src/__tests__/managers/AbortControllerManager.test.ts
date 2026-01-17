/**
 * AbortControllerManager 测试
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { AbortControllerManager } from '../../managers/AbortControllerManager';
import type { AbortableRequestConfig } from '../../types';

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
        autoAbortPrevious: false,
        defaultAbortMessage: '自定义中止消息',
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
      const config: AbortableRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      manager.createAbortController('request-1', config);
      expect(manager.has('request-1')).toBe(true);
    });

    it('应该在 autoAbortPrevious=true 时自动中止旧请求', async () => {
      const controller1 = manager.createAbortController('request-1');
      let aborted = false;

      controller1.signal.addEventListener('abort', () => {
        aborted = true;
      });

      // 等待监听器注册
      await new Promise((resolve) => setTimeout(resolve, 0));

      // 创建相同 requestId 的新 controller，应该中止旧的
      manager.createAbortController('request-1');

      // 等待事件触发
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(aborted).toBe(true);
          expect(controller1.signal.aborted).toBe(true);
          resolve();
        }, 50);
      });
    }, 10000);

    it('应该在 autoAbortPrevious=false 时不自动中止旧请求', async () => {
      const noAutoManager = new AbortControllerManager({
        autoAbortPrevious: false,
      });
      const controller1 = noAutoManager.createAbortController('request-1');
      let aborted = false;

      controller1.signal.addEventListener('abort', () => {
        aborted = true;
      });

      // 创建相同 requestId 的新 controller，不应该中止旧的
      noAutoManager.createAbortController('request-1');

      // 等待一段时间，确认没有中止
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(aborted).toBe(false);
          expect(controller1.signal.aborted).toBe(false);
          // 注意：创建新 controller 时，旧的会被替换，但不会被中止
          // 所以 has('request-1') 应该为 true（新 controller）
          expect(noAutoManager.has('request-1')).toBe(true);
          resolve();
        }, 50);
      });
    }, 10000);
  });

  describe('abort', () => {
    it('应该中止指定请求', async () => {
      const controller = manager.createAbortController('request-1');
      let aborted = false;

      controller.signal.addEventListener('abort', () => {
        aborted = true;
      });

      // 等待监听器注册
      await new Promise((resolve) => setTimeout(resolve, 0));

      manager.abort('request-1', '用户中止');

      // 等待事件触发
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(aborted).toBe(true);
          expect(controller.signal.aborted).toBe(true);
          expect(manager.has('request-1')).toBe(false);
          resolve();
        }, 50);
      });
    }, 10000);

    it('应该在请求不存在时不抛出错误', () => {
      expect(() => {
        manager.abort('non-existent');
      }).not.toThrow();
    });

    it('应该在中止后移除请求记录', () => {
      manager.createAbortController('request-1');
      expect(manager.has('request-1')).toBe(true);
      manager.abort('request-1');
      expect(manager.has('request-1')).toBe(false);
    });
  });

  describe('abortAll', () => {
    it('应该中止所有请求', async () => {
      const controller1 = manager.createAbortController('request-1');
      const controller2 = manager.createAbortController('request-2');
      let aborted1 = false;
      let aborted2 = false;

      controller1.signal.addEventListener('abort', () => {
        aborted1 = true;
      });
      controller2.signal.addEventListener('abort', () => {
        aborted2 = true;
      });

      // 等待监听器注册
      await new Promise((resolve) => setTimeout(resolve, 0));

      manager.abortAll('批量中止');

      // 等待事件触发
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(aborted1).toBe(true);
          expect(aborted2).toBe(true);
          expect(controller1.signal.aborted).toBe(true);
          expect(controller2.signal.aborted).toBe(true);
          expect(manager.getPendingCount()).toBe(0);
          resolve();
        }, 50);
      });
    }, 10000);

    it('应该在无请求时不抛出错误', () => {
      expect(() => {
        manager.abortAll();
      }).not.toThrow();
    });
  });

  describe('abortBy', () => {
    it('应该按条件中止请求', async () => {
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

      let aborted1 = false;
      let aborted3 = false;

      controller1.signal.addEventListener('abort', () => {
        aborted1 = true;
      });
      controller3.signal.addEventListener('abort', () => {
        aborted3 = true;
      });

      // 等待监听器注册
      await new Promise((resolve) => setTimeout(resolve, 0));

      const count = manager.abortBy((config) => config.url === '/api/users');

      // 等待事件触发
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(count).toBe(2);
          expect(aborted1).toBe(true);
          expect(aborted3).toBe(true);
          expect(controller1.signal.aborted).toBe(true);
          expect(controller3.signal.aborted).toBe(true);
          expect(manager.has('request-1')).toBe(false);
          expect(manager.has('request-2')).toBe(true);
          expect(manager.has('request-3')).toBe(false);
          resolve();
        }, 50);
      });
    }, 10000);

    it('应该返回中止的请求数量', () => {
      manager.createAbortController('request-1', {
        url: '/api/users',
        method: 'GET',
      });
      manager.createAbortController('request-2', {
        url: '/api/posts',
        method: 'GET',
      });

      const count = manager.abortBy((config) => config.url === '/api/users');

      expect(count).toBe(1);
    });

    it('应该在没有匹配请求时返回 0', () => {
      manager.createAbortController('request-1', {
        url: '/api/users',
        method: 'GET',
      });

      const count = manager.abortBy((config) => config.url === '/api/posts');

      expect(count).toBe(0);
    });

    it('应该中止匹配的请求', async () => {
      const controller = manager.createAbortController('request-1', {
        url: '/api/users',
        method: 'GET',
      });
      let aborted = false;

      controller.signal.addEventListener('abort', () => {
        aborted = true;
      });

      manager.abortBy((config) => config.url === '/api/users', '条件中止');

      // 等待事件触发
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(aborted).toBe(true);
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
    it('应该返回待中止的请求数量', () => {
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

    it('应该不中止请求，只清除记录', async () => {
      const controller = manager.createAbortController('request-1');
      let aborted = false;

      controller.signal.addEventListener('abort', () => {
        aborted = true;
      });

      manager.clear();

      await new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(aborted).toBe(false);
          expect(controller.signal.aborted).toBe(false);
          expect(manager.getPendingCount()).toBe(0);
          resolve();
        }, 10);
      });
    });
  });
});

