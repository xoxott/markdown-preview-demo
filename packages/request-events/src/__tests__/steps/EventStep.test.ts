/**
 * EventStep 测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventStep } from '../../steps/EventStep';
import { EventManager } from '../../managers/EventManager';
import { createRequestContext } from '@suga/request-core';
import type { NormalizedRequestConfig } from '@suga/request-core';

describe('EventStep', () => {
  let step: EventStep;
  let eventManager: EventManager;

  beforeEach(() => {
    eventManager = new EventManager();
    step = new EventStep({ eventManager });
  });

  it('应该使用默认事件管理器', () => {
    const defaultStep = new EventStep();
    expect(defaultStep).toBeInstanceOf(EventStep);
  });

  it('应该使用自定义事件管理器', () => {
    const customManager = new EventManager();
    const customStep = new EventStep({ eventManager: customManager });
    expect(customStep).toBeInstanceOf(EventStep);
  });

  describe('请求开始事件', () => {
    it('应该在请求开始时触发 request:start 事件', async () => {
      let startEventData: unknown = null;
      eventManager.on('request:start', (data) => {
        startEventData = data;
      });

      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const ctx = createRequestContext<string>(config);

      const next = async (): Promise<void> => {
        ctx.result = 'success';
      };

      await step.execute(ctx, next);

      expect(startEventData).toBeDefined();
      expect(startEventData).toHaveProperty('config');
      expect(startEventData).toHaveProperty('timestamp');
      if (startEventData && typeof startEventData === 'object' && 'config' in startEventData) {
        expect((startEventData as { config: NormalizedRequestConfig }).config.url).toBe('/api/users');
      }
    });
  });

  describe('请求成功事件', () => {
    it('应该在请求成功时触发 request:success 事件', async () => {
      let successEventData: unknown = null;
      eventManager.on('request:success', (data) => {
        successEventData = data;
      });

      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const ctx = createRequestContext<string>(config);

      const next = async (): Promise<void> => {
        ctx.result = 'success';
      };

      await step.execute(ctx, next);

      expect(successEventData).toBeDefined();
      expect(successEventData).toHaveProperty('config');
      expect(successEventData).toHaveProperty('result');
      expect(successEventData).toHaveProperty('timestamp');
      expect(successEventData).toHaveProperty('duration');
      if (
        successEventData &&
        typeof successEventData === 'object' &&
        'result' in successEventData
      ) {
        expect((successEventData as { result: string }).result).toBe('success');
      }
    });

    it('应该计算请求持续时间', async () => {
      let duration = 0;
      eventManager.on('request:success', (data) => {
        duration = data.duration;
      });

      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const ctx = createRequestContext<string>(config);

      const next = async (): Promise<void> => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        ctx.result = 'success';
      };

      await step.execute(ctx, next);

      expect(duration).toBeGreaterThanOrEqual(40);
      expect(duration).toBeLessThan(200);
    });

    it('应该在 result 为 undefined 时不触发成功事件', async () => {
      let successCalled = false;
      eventManager.on('request:success', () => {
        successCalled = true;
      });

      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const ctx = createRequestContext(config);

      const next = async (): Promise<void> => {
        // 不设置 result
      };

      await step.execute(ctx, next);

      expect(successCalled).toBe(false);
    });
  });

  describe('请求错误事件', () => {
    it('应该在请求错误时触发 request:error 事件（通过 ctx.error）', async () => {
      let errorEventData: unknown = null;
      eventManager.on('request:error', (data) => {
        errorEventData = data;
      });

      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const ctx = createRequestContext(config);

      const error = new Error('Test error');
      const next = async (): Promise<void> => {
        ctx.error = error;
      };

      await step.execute(ctx, next);

      expect(errorEventData).toBeDefined();
      expect(errorEventData).toHaveProperty('config');
      expect(errorEventData).toHaveProperty('error');
      expect(errorEventData).toHaveProperty('timestamp');
      expect(errorEventData).toHaveProperty('duration');
      if (
        errorEventData &&
        typeof errorEventData === 'object' &&
        'error' in errorEventData
      ) {
        expect((errorEventData as { error: Error }).error).toBe(error);
      }
    });

    it('应该在请求抛出错误时触发 request:error 事件', async () => {
      let errorEventData: unknown = null;
      eventManager.on('request:error', (data) => {
        errorEventData = data;
      });

      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const ctx = createRequestContext(config);

      const error = new Error('Test error');
      const next = async (): Promise<void> => {
        throw error;
      };

      await expect(step.execute(ctx, next)).rejects.toThrow('Test error');

      expect(errorEventData).toBeDefined();
      expect(errorEventData).toHaveProperty('config');
      expect(errorEventData).toHaveProperty('error');
      expect(errorEventData).toHaveProperty('timestamp');
      expect(errorEventData).toHaveProperty('duration');
      if (
        errorEventData &&
        typeof errorEventData === 'object' &&
        'error' in errorEventData
      ) {
        expect((errorEventData as { error: Error }).error).toBe(error);
      }
    });

    it('应该计算错误请求的持续时间', async () => {
      let duration = 0;
      eventManager.on('request:error', (data) => {
        duration = data.duration;
      });

      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const ctx = createRequestContext(config);

      const next = async (): Promise<void> => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        ctx.error = new Error('Test error');
      };

      await step.execute(ctx, next);

      expect(duration).toBeGreaterThanOrEqual(40);
      expect(duration).toBeLessThan(200);
    });
  });

  describe('请求完成事件', () => {
    it('应该在请求成功时触发 request:complete 事件（success=true）', async () => {
      let completeEventData: unknown = null;
      eventManager.on('request:complete', (data) => {
        completeEventData = data;
      });

      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const ctx = createRequestContext<string>(config);

      const next = async (): Promise<void> => {
        ctx.result = 'success';
      };

      await step.execute(ctx, next);

      expect(completeEventData).toBeDefined();
      expect(completeEventData).toHaveProperty('config');
      expect(completeEventData).toHaveProperty('timestamp');
      expect(completeEventData).toHaveProperty('duration');
      expect(completeEventData).toHaveProperty('success');
      if (
        completeEventData &&
        typeof completeEventData === 'object' &&
        'success' in completeEventData
      ) {
        expect((completeEventData as { success: boolean }).success).toBe(true);
      }
    });

    it('应该在请求错误时触发 request:complete 事件（success=false）', async () => {
      let completeEventData: unknown = null;
      eventManager.on('request:complete', (data) => {
        completeEventData = data;
      });

      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const ctx = createRequestContext(config);

      const next = async (): Promise<void> => {
        ctx.error = new Error('Test error');
      };

      await step.execute(ctx, next);

      expect(completeEventData).toBeDefined();
      expect(completeEventData).toHaveProperty('config');
      expect(completeEventData).toHaveProperty('timestamp');
      expect(completeEventData).toHaveProperty('duration');
      expect(completeEventData).toHaveProperty('success');
      if (
        completeEventData &&
        typeof completeEventData === 'object' &&
        'success' in completeEventData
      ) {
        expect((completeEventData as { success: boolean }).success).toBe(false);
      }
    });

    it('应该在请求抛出错误时触发 request:complete 事件（success=false）', async () => {
      let completeEventData: unknown = null;
      eventManager.on('request:complete', (data) => {
        completeEventData = data;
      });

      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const ctx = createRequestContext(config);

      const next = async (): Promise<void> => {
        throw new Error('Test error');
      };

      await expect(step.execute(ctx, next)).rejects.toThrow('Test error');

      expect(completeEventData).toBeDefined();
      expect(completeEventData).toHaveProperty('config');
      expect(completeEventData).toHaveProperty('timestamp');
      expect(completeEventData).toHaveProperty('duration');
      expect(completeEventData).toHaveProperty('success');
      if (
        completeEventData &&
        typeof completeEventData === 'object' &&
        'success' in completeEventData
      ) {
        expect((completeEventData as { success: boolean }).success).toBe(false);
      }
    });
  });

  describe('事件触发顺序', () => {
    it('应该在成功请求时按正确顺序触发事件', async () => {
      const eventOrder: string[] = [];

      eventManager.on('request:start', () => {
        eventOrder.push('start');
      });
      eventManager.on('request:success', () => {
        eventOrder.push('success');
      });
      eventManager.on('request:complete', () => {
        eventOrder.push('complete');
      });

      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const ctx = createRequestContext<string>(config);

      const next = async (): Promise<void> => {
        ctx.result = 'success';
      };

      await step.execute(ctx, next);

      expect(eventOrder).toEqual(['start', 'success', 'complete']);
    });

    it('应该在错误请求时按正确顺序触发事件', async () => {
      const eventOrder: string[] = [];

      eventManager.on('request:start', () => {
        eventOrder.push('start');
      });
      eventManager.on('request:error', () => {
        eventOrder.push('error');
      });
      eventManager.on('request:complete', () => {
        eventOrder.push('complete');
      });

      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const ctx = createRequestContext(config);

      const next = async (): Promise<void> => {
        ctx.error = new Error('Test error');
      };

      await step.execute(ctx, next);

      expect(eventOrder).toEqual(['start', 'error', 'complete']);
    });

    it('应该在抛出错误时按正确顺序触发事件', async () => {
      const eventOrder: string[] = [];

      eventManager.on('request:start', () => {
        eventOrder.push('start');
      });
      eventManager.on('request:error', () => {
        eventOrder.push('error');
      });
      eventManager.on('request:complete', () => {
        eventOrder.push('complete');
      });

      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const ctx = createRequestContext(config);

      const next = async (): Promise<void> => {
        throw new Error('Test error');
      };

      await expect(step.execute(ctx, next)).rejects.toThrow('Test error');

      expect(eventOrder).toEqual(['start', 'error', 'complete']);
    });
  });

  describe('多个请求', () => {
    it('应该为每个请求独立触发事件', async () => {
      let eventCount = 0;
      eventManager.on('request:start', () => {
        eventCount++;
      });

      const config1: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const ctx1 = createRequestContext<string>(config1);

      const config2: NormalizedRequestConfig = {
        url: '/api/posts',
        method: 'GET',
      };
      const ctx2 = createRequestContext<string>(config2);

      const next1 = async (): Promise<void> => {
        ctx1.result = 'users';
      };
      const next2 = async (): Promise<void> => {
        ctx2.result = 'posts';
      };

      await step.execute(ctx1, next1);
      await step.execute(ctx2, next2);

      expect(eventCount).toBe(2);
    });
  });
});

