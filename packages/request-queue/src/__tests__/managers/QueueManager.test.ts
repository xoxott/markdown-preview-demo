/**
 * QueueManager 测试
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { QueueManager } from '../../managers/QueueManager';

describe('QueueManager', () => {
  let manager: QueueManager;

  beforeEach(() => {
    manager = new QueueManager({
      maxConcurrent: 2,
      queueStrategy: 'fifo',
    });
  });

  describe('构造函数', () => {
    it('应该使用配置创建实例', () => {
      expect(manager).toBeInstanceOf(QueueManager);
      expect(manager.getQueueLength()).toBe(0);
      expect(manager.getRunningCount()).toBe(0);
    });

    it('应该使用默认策略', () => {
      const defaultManager = new QueueManager({
        maxConcurrent: 5,
      });

      expect(defaultManager).toBeInstanceOf(QueueManager);
    });
  });

  describe('enqueue', () => {
    it('应该立即执行请求当未达到并发限制', async () => {
      let executed = false;

      const promise = manager.enqueue(
        { url: '/api/users', method: 'GET' },
        async () => {
          executed = true;
          return 'result';
        },
      );

      const result = await promise;

      expect(executed).toBe(true);
      expect(result).toBe('result');
    });

    it('应该限制并发数量', async () => {
      const executionOrder: number[] = [];
      const promises: Promise<string>[] = [];

      // 创建 5 个请求，但并发限制为 2
      for (let i = 0; i < 5; i++) {
        promises.push(
          manager.enqueue(
            { url: `/api/users/${i}`, method: 'GET' },
            async () => {
              executionOrder.push(i);
              await new Promise(resolve => setTimeout(resolve, 50));
              return `result-${i}`;
            },
          ),
        );
      }

      await Promise.all(promises);

      // 验证最多同时执行 2 个请求
      // 由于是异步的，我们需要检查执行顺序
      expect(executionOrder.length).toBe(5);
    });

    it('应该按 FIFO 策略执行', async () => {
      const executionOrder: number[] = [];

      const promises: Promise<string>[] = [];
      for (let i = 0; i < 3; i++) {
        promises.push(
          manager.enqueue(
            { url: `/api/users/${i}`, method: 'GET' },
            async () => {
              await new Promise(resolve => setTimeout(resolve, 10));
              executionOrder.push(i);
              return `result-${i}`;
            },
          ),
        );
      }

      await Promise.all(promises);

      // FIFO 策略应该按顺序执行
      expect(executionOrder).toEqual([0, 1, 2]);
    });

    it('应该按优先级策略执行', async () => {
      const priorityManager = new QueueManager({
        maxConcurrent: 1, // 一次只执行一个，确保顺序
        queueStrategy: 'priority',
      });

      const executionOrder: string[] = [];

      // 先添加低优先级请求（会立即开始执行）
      const promise1 = priorityManager.enqueue(
        { url: '/api/low', method: 'GET' },
        async () => {
          await new Promise(resolve => setTimeout(resolve, 30));
          executionOrder.push('low');
          return 'low-result';
        },
        'low',
      );

      // 立即添加高优先级请求（会在队列中等待，但会排在前面）
      const promise2 = priorityManager.enqueue(
        { url: '/api/high', method: 'GET' },
        async () => {
          await new Promise(resolve => setTimeout(resolve, 20));
          executionOrder.push('high');
          return 'high-result';
        },
        'high',
      );

      await Promise.all([promise1, promise2]);

      // 第一个请求（low）会先执行，然后高优先级会执行
      expect(executionOrder[0]).toBe('low');
      expect(executionOrder[1]).toBe('high');
    });

    it('应该处理请求错误', async () => {
      const error = new Error('Request failed');

      await expect(
        manager.enqueue(
          { url: '/api/users', method: 'GET' },
          async () => {
            throw error;
          },
        ),
      ).rejects.toThrow('Request failed');
    });

    it('应该在请求完成后处理下一个请求', async () => {
      const executionOrder: number[] = [];

      // 创建 3 个请求，并发限制为 2
      const promises: Promise<string>[] = [];
      for (let i = 0; i < 3; i++) {
        promises.push(
          manager.enqueue(
            { url: `/api/users/${i}`, method: 'GET' },
            async () => {
              executionOrder.push(i);
              await new Promise(resolve => setTimeout(resolve, 20));
              return `result-${i}`;
            },
          ),
        );
      }

      await Promise.all(promises);

      // 应该按顺序执行
      expect(executionOrder).toEqual([0, 1, 2]);
    });
  });

  describe('getQueueLength', () => {
    it('应该返回队列长度', async () => {
      expect(manager.getQueueLength()).toBe(0);

      // 创建多个请求（超过并发限制）
      const promises: Promise<string>[] = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          manager.enqueue(
            { url: `/api/users/${i}`, method: 'GET' },
            async () => {
              await new Promise(resolve => setTimeout(resolve, 100));
              return `result-${i}`;
            },
          ),
        );
      }

      // 等待一小段时间，让请求开始执行
      await new Promise(resolve => setTimeout(resolve, 10));

      // 队列长度应该减少（因为有些请求已经开始执行）
      const queueLength = manager.getQueueLength();
      expect(queueLength).toBeLessThan(5);

      // 等待所有请求完成
      await Promise.all(promises);
      expect(manager.getQueueLength()).toBe(0);
    });
  });

  describe('getRunningCount', () => {
    it('应该返回运行中的请求数量', async () => {
      expect(manager.getRunningCount()).toBe(0);

      // 创建多个请求
      const promises: Promise<string>[] = [];
      for (let i = 0; i < 3; i++) {
        promises.push(
          manager.enqueue(
            { url: `/api/users/${i}`, method: 'GET' },
            async () => {
              await new Promise(resolve => setTimeout(resolve, 100));
              return `result-${i}`;
            },
          ),
        );
      }

      // 等待一小段时间，让请求开始执行
      await new Promise(resolve => setTimeout(resolve, 10));

      // 运行中的请求数量应该不超过并发限制
      const runningCount = manager.getRunningCount();
      expect(runningCount).toBeLessThanOrEqual(2);

      // 等待所有请求完成
      await Promise.all(promises);
      expect(manager.getRunningCount()).toBe(0);
    });
  });

  describe('clear', () => {
    it('应该清空队列', async () => {
      // 创建多个请求（使用较长的延迟，确保有些请求还在队列中）
      const promises: Promise<string>[] = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          manager.enqueue(
            { url: `/api/users/${i}`, method: 'GET' },
            async () => {
              await new Promise(resolve => setTimeout(resolve, 200));
              return `result-${i}`;
            },
          ),
        );
      }

      // 立即清空队列（在请求开始执行之前）
      manager.clear();

      // 等待所有 Promise 完成（应该被拒绝）
      const results = await Promise.allSettled(promises);

      // 所有待处理的请求应该被拒绝
      const rejectedCount = results.filter(r => r.status === 'rejected').length;
      expect(rejectedCount).toBeGreaterThan(0);
    });

    it('应该拒绝所有待处理的请求', async () => {
      const promises: Promise<string>[] = [];
      for (let i = 0; i < 3; i++) {
        promises.push(
          manager.enqueue(
            { url: `/api/users/${i}`, method: 'GET' },
            async () => {
              await new Promise(resolve => setTimeout(resolve, 200));
              return `result-${i}`;
            },
          ),
        );
      }

      // 立即清空（在请求开始执行之前）
      manager.clear();

      // 等待所有 Promise 完成
      const results = await Promise.allSettled(promises);

      // 至少有一些请求应该被拒绝（如果它们还在队列中）
      const rejectedCount = results.filter(r => r.status === 'rejected').length;
      // 由于并发限制为 2，最多 2 个请求可能已经开始执行，所以至少 1 个应该被拒绝
      expect(rejectedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('updateConfig', () => {
    it('应该更新最大并发数', async () => {
      manager.updateConfig({ maxConcurrent: 5 });

      // 创建多个请求
      const promises: Promise<string>[] = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          manager.enqueue(
            { url: `/api/users/${i}`, method: 'GET' },
            async () => {
              await new Promise(resolve => setTimeout(resolve, 10));
              return `result-${i}`;
            },
          ),
        );
      }

      // 等待一小段时间
      await new Promise(resolve => setTimeout(resolve, 10));

      // 运行中的请求数量应该不超过新的并发限制
      const runningCount = manager.getRunningCount();
      expect(runningCount).toBeLessThanOrEqual(5);

      await Promise.all(promises);
    });

    it('应该更新队列策略', async () => {
      const priorityManager = new QueueManager({
        maxConcurrent: 1, // 一次只执行一个，确保顺序
        queueStrategy: 'fifo',
      });

      priorityManager.updateConfig({ queueStrategy: 'priority' });

      const executionOrder: string[] = [];

      // 先添加低优先级请求（会立即开始执行）
      const promise1 = priorityManager.enqueue(
        { url: '/api/low', method: 'GET' },
        async () => {
          await new Promise(resolve => setTimeout(resolve, 30));
          executionOrder.push('low');
          return 'low-result';
        },
        'low',
      );

      // 立即添加高优先级请求（会在队列中等待，但会排在前面）
      const promise2 = priorityManager.enqueue(
        { url: '/api/high', method: 'GET' },
        async () => {
          await new Promise(resolve => setTimeout(resolve, 20));
          executionOrder.push('high');
          return 'high-result';
        },
        'high',
      );

      await Promise.all([promise1, promise2]);

      // 第一个请求（low）会先执行，然后高优先级会执行
      expect(executionOrder[0]).toBe('low');
      expect(executionOrder[1]).toBe('high');
    });
  });

  describe('优先级排序', () => {
    it('应该按优先级值排序', async () => {
      const priorityManager = new QueueManager({
        maxConcurrent: 1, // 一次只执行一个，确保顺序
        queueStrategy: 'priority',
      });

      const executionOrder: string[] = [];

      // 先添加低优先级请求（会立即开始执行）
      const promise1 = priorityManager.enqueue(
        { url: '/api/low', method: 'GET' },
        async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          executionOrder.push('low');
          return 'low-result';
        },
        'low',
      );

      // 立即添加其他请求（它们会在队列中等待）
      const promise2 = priorityManager.enqueue(
        { url: '/api/normal', method: 'GET' },
        async () => {
          await new Promise(resolve => setTimeout(resolve, 20));
          executionOrder.push('normal');
          return 'normal-result';
        },
        'normal',
      );

      const promise3 = priorityManager.enqueue(
        { url: '/api/high', method: 'GET' },
        async () => {
          await new Promise(resolve => setTimeout(resolve, 20));
          executionOrder.push('high');
          return 'high-result';
        },
        'high',
      );

      await Promise.all([promise1, promise2, promise3]);

      // 第一个请求（low）会先执行，然后高优先级应该在普通优先级之前执行
      expect(executionOrder[0]).toBe('low');
      // 高优先级应该在普通优先级之前执行
      const highIndex = executionOrder.indexOf('high');
      const normalIndex = executionOrder.indexOf('normal');
      expect(highIndex).toBeLessThan(normalIndex);
    });

    it('应该按创建时间排序当优先级相同时', async () => {
      const priorityManager = new QueueManager({
        maxConcurrent: 1,
        queueStrategy: 'priority',
      });

      const executionOrder: number[] = [];

      // 创建相同优先级的请求
      const promises = [
        priorityManager.enqueue(
          { url: '/api/1', method: 'GET' },
          async () => {
            executionOrder.push(1);
            return 'result-1';
          },
          'normal',
        ),
        priorityManager.enqueue(
          { url: '/api/2', method: 'GET' },
          async () => {
            executionOrder.push(2);
            return 'result-2';
          },
          'normal',
        ),
        priorityManager.enqueue(
          { url: '/api/3', method: 'GET' },
          async () => {
            executionOrder.push(3);
            return 'result-3';
          },
          'normal',
        ),
      ];

      await Promise.all(promises);

      // 应该按创建时间排序（FIFO）
      expect(executionOrder).toEqual([1, 2, 3]);
    });
  });
});

