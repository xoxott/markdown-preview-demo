/**
 * CancelTokenManager 测试
 */

import { beforeEach, describe, expect, it } from 'vitest';
import axios from 'axios';
import { CancelTokenManager } from '../../managers/CancelTokenManager';
import { DEFAULT_CANCEL_MESSAGE } from '../../constants';
import type { CancelableRequestConfig } from '../../types';

describe('CancelTokenManager', () => {
  let manager: CancelTokenManager;

  beforeEach(() => {
    manager = new CancelTokenManager();
  });

  describe('构造函数', () => {
    it('应该使用默认配置', () => {
      const defaultManager = new CancelTokenManager();
      expect(defaultManager.getPendingCount()).toBe(0);
    });

    it('应该使用自定义配置', () => {
      const customManager = new CancelTokenManager({
        autoCancelPrevious: false,
        defaultCancelMessage: '自定义取消消息',
      });
      expect(customManager.getPendingCount()).toBe(0);
    });
  });

  describe('createCancelToken', () => {
    it('应该创建取消Token', () => {
      const source = manager.createCancelToken('request-1');
      expect(source).toBeDefined();
      expect(source.token).toBeDefined();
      expect(manager.has('request-1')).toBe(true);
    });

    it('应该存储请求配置', () => {
      const config: CancelableRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      manager.createCancelToken('request-1', config);
      expect(manager.has('request-1')).toBe(true);
    });

    it('应该在 autoCancelPrevious=true 时自动取消旧请求', async () => {
      const source1 = manager.createCancelToken('request-1');
      let cancelled = false;

      const cancelPromise = source1.token.promise.catch((error) => {
        if (axios.isCancel(error)) {
          cancelled = true;
        }
        return error;
      });

      // 创建相同 requestId 的新 token，应该取消旧的
      manager.createCancelToken('request-1');

      await cancelPromise;

      expect(cancelled).toBe(true);
    }, 10000);

    it('应该在 autoCancelPrevious=false 时不自动取消旧请求', async () => {
      const noAutoManager = new CancelTokenManager({
        autoCancelPrevious: false,
      });
      const source1 = noAutoManager.createCancelToken('request-1');
      let cancelled = false;
      source1.token.promise.catch((error) => {
        if (axios.isCancel(error)) {
          cancelled = true;
        }
      });

      // 创建相同 requestId 的新 token，不应该取消旧的
      noAutoManager.createCancelToken('request-1');

      // 等待一段时间，确认没有取消
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(cancelled).toBe(false);
          // 注意：创建新 token 时，旧的会被替换，但不会被取消
          // 所以 has('request-1') 应该为 true（新 token）
          expect(noAutoManager.has('request-1')).toBe(true);
          resolve();
        }, 50);
      });
    }, 10000);
  });

  describe('cancel', () => {
    it('应该取消指定请求', async () => {
      const source = manager.createCancelToken('request-1');
      let cancelled = false;
      let cancelMessage = '';

      manager.cancel('request-1', '用户取消');

      // 直接 await promise，它会 reject
      try {
        await source.token.promise;
      } catch (error) {
        if (axios.isCancel(error)) {
          cancelled = true;
          cancelMessage = error.message ?? '';
        }
      }

      expect(cancelled).toBe(true);
      expect(cancelMessage).toBe('用户取消');
      expect(manager.has('request-1')).toBe(false);
    }, 10000);

    it('应该使用默认取消消息', async () => {
      const source = manager.createCancelToken('request-1');
      let cancelMessage = '';

      manager.cancel('request-1');

      // 直接 await promise，它会 reject
      try {
        await source.token.promise;
      } catch (error) {
        if (axios.isCancel(error)) {
          cancelMessage = error.message ?? '';
        }
      }

      expect(cancelMessage).toBe(DEFAULT_CANCEL_MESSAGE);
    }, 10000);

    it('应该在请求不存在时不抛出错误', () => {
      expect(() => {
        manager.cancel('non-existent');
      }).not.toThrow();
    });

    it('应该在取消后移除请求记录', () => {
      manager.createCancelToken('request-1');
      expect(manager.has('request-1')).toBe(true);
      manager.cancel('request-1');
      expect(manager.has('request-1')).toBe(false);
    });
  });

  describe('cancelAll', () => {
    it('应该取消所有请求', async () => {
      const source1 = manager.createCancelToken('request-1');
      const source2 = manager.createCancelToken('request-2');
      let cancelled1 = false;
      let cancelled2 = false;

      const cancelPromise1 = source1.token.promise.catch((error) => {
        if (axios.isCancel(error)) {
          cancelled1 = true;
        }
        return error;
      });
      const cancelPromise2 = source2.token.promise.catch((error) => {
        if (axios.isCancel(error)) {
          cancelled2 = true;
        }
        return error;
      });

      manager.cancelAll('批量取消');

      await Promise.allSettled([cancelPromise1, cancelPromise2]);

      expect(cancelled1).toBe(true);
      expect(cancelled2).toBe(true);
      expect(manager.getPendingCount()).toBe(0);
    }, 10000);

    it('应该使用默认取消消息', async () => {
      const source = manager.createCancelToken('request-1');
      let cancelMessage = '';

      manager.cancelAll();

      // 直接 await promise，它会 reject
      try {
        await source.token.promise;
      } catch (error) {
        if (axios.isCancel(error)) {
          cancelMessage = error.message ?? '';
        }
      }

      expect(cancelMessage).toBe(DEFAULT_CANCEL_MESSAGE);
    }, 10000);

    it('应该在无请求时不抛出错误', () => {
      expect(() => {
        manager.cancelAll();
      }).not.toThrow();
    });
  });

  describe('cancelBy', () => {
    it('应该按条件取消请求', () => {
      manager.createCancelToken('request-1', {
        url: '/api/users',
        method: 'GET',
      });
      manager.createCancelToken('request-2', {
        url: '/api/posts',
        method: 'GET',
      });
      manager.createCancelToken('request-3', {
        url: '/api/users',
        method: 'POST',
      });

      const count = manager.cancelBy((config) => config.url === '/api/users');

      expect(count).toBe(2);
      expect(manager.has('request-1')).toBe(false);
      expect(manager.has('request-2')).toBe(true);
      expect(manager.has('request-3')).toBe(false);
    });

    it('应该返回取消的请求数量', () => {
      manager.createCancelToken('request-1', {
        url: '/api/users',
        method: 'GET',
      });
      manager.createCancelToken('request-2', {
        url: '/api/posts',
        method: 'GET',
      });

      const count = manager.cancelBy((config) => config.url === '/api/users');

      expect(count).toBe(1);
    });

    it('应该在没有匹配请求时返回 0', () => {
      manager.createCancelToken('request-1', {
        url: '/api/users',
        method: 'GET',
      });

      const count = manager.cancelBy((config) => config.url === '/api/posts');

      expect(count).toBe(0);
    });

    it('应该使用自定义取消消息', async () => {
      const source = manager.createCancelToken('request-1', {
        url: '/api/users',
        method: 'GET',
      });
      let cancelMessage = '';

      manager.cancelBy((config) => config.url === '/api/users', '条件取消');

      // 直接 await promise，它会 reject
      try {
        await source.token.promise;
      } catch (error) {
        if (axios.isCancel(error)) {
          cancelMessage = error.message ?? '';
        }
      }

      expect(cancelMessage).toBe('条件取消');
    }, 10000);
  });

  describe('remove', () => {
    it('应该移除请求记录', () => {
      manager.createCancelToken('request-1');
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
    it('应该获取取消Token', () => {
      const source = manager.createCancelToken('request-1');
      const retrieved = manager.get('request-1');
      expect(retrieved).toBe(source);
    });

    it('应该在请求不存在时返回 undefined', () => {
      const retrieved = manager.get('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('has', () => {
    it('应该检查请求是否存在', () => {
      expect(manager.has('request-1')).toBe(false);
      manager.createCancelToken('request-1');
      expect(manager.has('request-1')).toBe(true);
    });
  });

  describe('getPendingCount', () => {
    it('应该返回待取消的请求数量', () => {
      expect(manager.getPendingCount()).toBe(0);
      manager.createCancelToken('request-1');
      expect(manager.getPendingCount()).toBe(1);
      manager.createCancelToken('request-2');
      expect(manager.getPendingCount()).toBe(2);
      manager.remove('request-1');
      expect(manager.getPendingCount()).toBe(1);
    });
  });

  describe('clear', () => {
    it('应该清除所有请求记录', () => {
      manager.createCancelToken('request-1');
      manager.createCancelToken('request-2');
      expect(manager.getPendingCount()).toBe(2);
      manager.clear();
      expect(manager.getPendingCount()).toBe(0);
    });

    it('应该不取消请求，只清除记录', () => {
      const source = manager.createCancelToken('request-1');
      let cancelled = false;
      source.token.promise.catch((error) => {
        if (axios.isCancel(error)) {
          cancelled = true;
        }
      });

      manager.clear();

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(cancelled).toBe(false);
          expect(manager.getPendingCount()).toBe(0);
          resolve();
        }, 10);
      });
    });
  });
});

