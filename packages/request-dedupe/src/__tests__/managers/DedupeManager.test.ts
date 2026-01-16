/**
 * DedupeManager 测试
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { DedupeManager } from '../../managers/DedupeManager';

describe('DedupeManager', () => {
  let manager: DedupeManager;

  beforeEach(() => {
    manager = new DedupeManager();
  });

  describe('构造函数', () => {
    it('应该使用默认配置创建实例', () => {
      expect(manager).toBeInstanceOf(DedupeManager);
      expect(manager.getPendingCount()).toBe(0);
    });

    it('应该使用自定义去重时间窗口', () => {
      const customManager = new DedupeManager({
        dedupeWindow: 2000,
      });

      expect(customManager).toBeInstanceOf(DedupeManager);
    });
  });

  describe('getOrCreateRequestByKey', () => {
    it('应该创建新请求', async () => {
      let requestExecuted = false;

      const promise = manager.getOrCreateRequestByKey('test-key', async () => {
        requestExecuted = true;
        return 'result';
      });

      const result = await promise;

      expect(requestExecuted).toBe(true);
      expect(result).toBe('result');
    });

    it('应该在时间窗口内复用相同的请求', async () => {
      let requestCount = 0;

      const requestFn = async () => {
        requestCount++;
        return `result-${requestCount}`;
      };

      const promise1 = manager.getOrCreateRequestByKey('test-key', requestFn);
      const promise2 = manager.getOrCreateRequestByKey('test-key', requestFn);
      const promise3 = manager.getOrCreateRequestByKey('test-key', requestFn);

      const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);

      // 应该只执行一次
      expect(requestCount).toBe(1);
      // 所有结果应该相同
      expect(result1).toBe('result-1');
      expect(result2).toBe('result-1');
      expect(result3).toBe('result-1');
    });

    it('应该在时间窗口外创建新请求', async () => {
      const customManager = new DedupeManager({
        dedupeWindow: 100, // 100ms
      });

      let requestCount = 0;

      const requestFn = async () => {
        requestCount++;
        return `result-${requestCount}`;
      };

      // 第一次请求
      await customManager.getOrCreateRequestByKey('test-key', requestFn);

      // 等待时间窗口过期
      await new Promise(resolve => setTimeout(resolve, 150));

      // 第二次请求应该创建新的
      const result = await customManager.getOrCreateRequestByKey('test-key', requestFn);

      expect(requestCount).toBe(2);
      expect(result).toBe('result-2');
    });

    it('应该在请求失败时立即移除记录', async () => {
      let requestCount = 0;

      const requestFn = async () => {
        requestCount++;
        throw new Error('Request failed');
      };

      // 第一次请求失败
      try {
        await manager.getOrCreateRequestByKey('test-key', requestFn);
      } catch {
        // 忽略错误
      }

      expect(requestCount).toBe(1);
      expect(manager.getPendingCount()).toBe(0);

      // 第二次请求应该可以执行（因为记录已被移除）
      try {
        await manager.getOrCreateRequestByKey('test-key', requestFn);
      } catch {
        // 忽略错误
      }

      expect(requestCount).toBe(2);
    });

    it('应该处理不同的键', async () => {
      let request1Count = 0;
      let request2Count = 0;

      const requestFn1 = async () => {
        request1Count++;
        return 'result1';
      };

      const requestFn2 = async () => {
        request2Count++;
        return 'result2';
      };

      const promise1 = manager.getOrCreateRequestByKey('key1', requestFn1);
      const promise2 = manager.getOrCreateRequestByKey('key2', requestFn2);

      await Promise.all([promise1, promise2]);

      expect(request1Count).toBe(1);
      expect(request2Count).toBe(1);
    });

    it('应该在请求成功后延迟移除', async () => {
      const customManager = new DedupeManager({
        dedupeWindow: 200, // 200ms
      });

      await customManager.getOrCreateRequestByKey('test-key', async () => 'result');

      // 立即检查，应该还在
      expect(customManager.getPendingCount()).toBe(1);

      // 等待延迟移除
      await new Promise(resolve => setTimeout(resolve, 250));

      // 应该被移除
      expect(customManager.getPendingCount()).toBe(0);
    });

    it('应该清理过期的请求', async () => {
      const customManager = new DedupeManager({
        dedupeWindow: 100,
      });

      // 创建请求
      await customManager.getOrCreateRequestByKey('key1', async () => 'result1');

      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 150));

      // 创建新请求时应该清理过期请求
      await customManager.getOrCreateRequestByKey('key2', async () => 'result2');

      expect(customManager.getPendingCount()).toBe(1);
    });
  });

  describe('clear', () => {
    it('应该清除所有待处理的请求', async () => {
      const promise1 = manager.getOrCreateRequestByKey('key1', async () => 'result1');
      const promise2 = manager.getOrCreateRequestByKey('key2', async () => 'result2');

      expect(manager.getPendingCount()).toBe(2);

      manager.clear();

      expect(manager.getPendingCount()).toBe(0);

      // 等待请求完成（避免测试警告）
      await Promise.allSettled([promise1, promise2]);
    });

    it('应该清理所有定时器', async () => {
      const customManager = new DedupeManager({
        dedupeWindow: 1000,
      });

      await customManager.getOrCreateRequestByKey('test-key', async () => 'result');

      expect(customManager.getPendingCount()).toBe(1);

      customManager.clear();

      expect(customManager.getPendingCount()).toBe(0);
    });
  });

  describe('getPendingCount', () => {
    it('应该返回待处理的请求数量', async () => {
      expect(manager.getPendingCount()).toBe(0);

      const promise1 = manager.getOrCreateRequestByKey('key1', async () => 'result1');
      expect(manager.getPendingCount()).toBe(1);

      const promise2 = manager.getOrCreateRequestByKey('key2', async () => 'result2');
      expect(manager.getPendingCount()).toBe(2);

      await Promise.all([promise1, promise2]);

      // 请求完成后，延迟移除前应该还在
      expect(manager.getPendingCount()).toBe(2);
    });
  });

  describe('setDedupeWindow', () => {
    it('应该更新去重时间窗口', async () => {
      manager.setDedupeWindow(2000);

      let requestCount = 0;

      const requestFn = async () => {
        requestCount++;
        return 'result';
      };

      // 第一次请求
      await manager.getOrCreateRequestByKey('test-key', requestFn);

      // 等待 1500ms（超过原来的 1000ms，但未超过新的 2000ms）
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 应该复用请求
      await manager.getOrCreateRequestByKey('test-key', requestFn);

      expect(requestCount).toBe(1);
    });
  });
});

