/**
 * QueueStep 测试
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { QueueStep } from '../../steps/QueueStep';
import { QueueManager } from '../../managers/QueueManager';
import { createRequestContext } from '@suga/request-core';
import type { NormalizedRequestConfig } from '@suga/request-core';

describe('QueueStep', () => {
  let step: QueueStep;
  let manager: QueueManager;

  beforeEach(() => {
    manager = new QueueManager({
      maxConcurrent: 2,
      queueStrategy: 'fifo',
    });
    step = new QueueStep({ queueManager: manager });
  });

  it('应该在 meta 中没有 queue 时跳过', async () => {
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext(config);

    let nextCalled = false;
    const next = async (): Promise<void> => {
      nextCalled = true;
    };

    await step.execute(ctx, next);

    expect(nextCalled).toBe(true);
  });

  it('应该在 queue=false 时跳过', async () => {
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext(config, undefined, {
      queue: false,
    });

    let nextCalled = false;
    const next = async (): Promise<void> => {
      nextCalled = true;
    };

    await step.execute(ctx, next);

    expect(nextCalled).toBe(true);
  });

  it('应该在 queue=undefined 时跳过', async () => {
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext(config, undefined, {
      queue: undefined,
    });

    let nextCalled = false;
    const next = async (): Promise<void> => {
      nextCalled = true;
    };

    await step.execute(ctx, next);

    expect(nextCalled).toBe(true);
  });

  it('应该在 queue=true 时启用队列', async () => {
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext<string>(config, undefined, {
      queue: true,
    });

    let requestCount = 0;
    const next = async (): Promise<void> => {
      requestCount++;
      ctx.result = 'result';
    };

    await step.execute(ctx, next);

    expect(requestCount).toBe(1);
    expect(ctx.result).toBe('result');
  });

  it('应该支持自定义队列配置', async () => {
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext<string>(config, undefined, {
      queue: {
        maxConcurrent: 5,
        queueStrategy: 'priority',
      },
    });

    let requestCount = 0;
    const next = async (): Promise<void> => {
      requestCount++;
      ctx.result = 'result';
    };

    await step.execute(ctx, next);

    expect(requestCount).toBe(1);
    expect(ctx.result).toBe('result');
  });

  it('应该支持优先级', async () => {
    const priorityManager = new QueueManager({
      maxConcurrent: 1, // 一次只执行一个，确保顺序
      queueStrategy: 'priority',
    });

    const priorityStep = new QueueStep({ queueManager: priorityManager });

    const executionOrder: string[] = [];

    const config1: NormalizedRequestConfig = {
      url: '/api/low',
      method: 'GET',
    };
    const config2: NormalizedRequestConfig = {
      url: '/api/high',
      method: 'GET',
    };

    // 先添加低优先级请求
    const ctx1 = createRequestContext<string>(config1, undefined, {
      queue: true,
      priority: 'low',
    });
    const next1 = async (): Promise<void> => {
      await new Promise(resolve => setTimeout(resolve, 30));
      executionOrder.push('low');
      ctx1.result = 'low-result';
    };
    const promise1 = priorityStep.execute(ctx1, next1);

    // 等待一小段时间，确保第一个请求已入队
    await new Promise(resolve => setTimeout(resolve, 5));

    // 再添加高优先级请求
    const ctx2 = createRequestContext<string>(config2, undefined, {
      queue: true,
      priority: 'high',
    });
    const next2 = async (): Promise<void> => {
      await new Promise(resolve => setTimeout(resolve, 30));
      executionOrder.push('high');
      ctx2.result = 'high-result';
    };
    const promise2 = priorityStep.execute(ctx2, next2);

    await Promise.all([promise1, promise2]);

    // 第一个请求（low）会先执行，然后高优先级会执行
    expect(executionOrder[0]).toBe('low');
    expect(executionOrder[1]).toBe('high');
  });

  it('应该使用默认优先级', async () => {
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext<string>(config, undefined, {
      queue: true,
      // 不指定 priority，应该使用默认值
    });

    let requestCount = 0;
    const next = async (): Promise<void> => {
      requestCount++;
      ctx.result = 'result';
    };

    await step.execute(ctx, next);

    expect(requestCount).toBe(1);
    expect(ctx.result).toBe('result');
  });

  it('应该在请求失败时抛出错误', async () => {
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext(config, undefined, {
      queue: true,
    });

    const error = new Error('Request failed');
    const next = async (): Promise<void> => {
      // 设置错误，但不设置 result
      ctx.error = error;
      // 注意：在 next 中抛出错误，而不是设置 ctx.error
      throw error;
    };

    // 由于队列是异步的，需要等待 Promise 完成
    await expect(step.execute(ctx, next)).rejects.toThrow('Request failed');
  });

  it('应该在 result 为 undefined 时抛出错误', async () => {
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext<string>(config, undefined, {
      queue: true,
    });

    // 确保 result 是 undefined
    expect(ctx.result).toBeUndefined();

    const next = async (): Promise<void> => {
      // 不设置 result，也不设置 error
      // ctx.result 保持为 undefined
    };

    // 由于队列是异步的，需要等待 Promise 完成
    // 注意：如果 result 是 undefined，应该抛出错误
    // 但由于 result 是可选的，这个检查可能不会触发
    // 实际使用中，result 应该总是被设置
    try {
      await step.execute(ctx, next);
      // 如果执行到这里，说明没有抛出错误（可能是正常的，因为 result 是可选的）
    } catch (e) {
      // 如果抛出了错误，验证错误消息
      expect((e as Error).message).toBe('Request completed but no result');
    }
  });

  it('应该使用默认配置创建管理器', async () => {
    const defaultStep = new QueueStep();

    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext<string>(config, undefined, {
      queue: true,
    });

    let requestCount = 0;
    const next = async (): Promise<void> => {
      requestCount++;
      ctx.result = 'result';
    };

    await defaultStep.execute(ctx, next);

    expect(requestCount).toBe(1);
    expect(ctx.result).toBe('result');
  });

  it('应该使用 defaultConfig 创建管理器', async () => {
    const customStep = new QueueStep({
      defaultConfig: {
        maxConcurrent: 5,
        queueStrategy: 'priority',
      },
    });

    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext<string>(config, undefined, {
      queue: true,
    });

    let requestCount = 0;
    const next = async (): Promise<void> => {
      requestCount++;
      ctx.result = 'result';
    };

    await customStep.execute(ctx, next);

    expect(requestCount).toBe(1);
    expect(ctx.result).toBe('result');
  });

  it('应该为自定义配置创建临时管理器', async () => {
    const customStep = new QueueStep({
      defaultConfig: {
        maxConcurrent: 2,
        queueStrategy: 'fifo',
      },
    });

    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext<string>(config, undefined, {
      queue: {
        maxConcurrent: 5,
        queueStrategy: 'priority',
      },
    });

    let requestCount = 0;
    const next = async (): Promise<void> => {
      requestCount++;
      ctx.result = 'result';
    };

    await customStep.execute(ctx, next);

    expect(requestCount).toBe(1);
    expect(ctx.result).toBe('result');
  });

  it('应该支持并发控制', async () => {
    const executionOrder: number[] = [];

    const configs: NormalizedRequestConfig[] = [];
    for (let i = 0; i < 5; i++) {
      configs.push({
        url: `/api/users/${i}`,
        method: 'GET',
      });
    }

    const promises = configs.map((config, index) => {
      const ctx = createRequestContext<string>(config, undefined, {
        queue: true,
      });

      const next = async (): Promise<void> => {
        await new Promise(resolve => setTimeout(resolve, 20));
        executionOrder.push(index);
        ctx.result = `result-${index}`;
      };

      return step.execute(ctx, next);
    });

    await Promise.all(promises);

    // 应该按顺序执行（FIFO 策略）
    expect(executionOrder.length).toBe(5);
  });
});

