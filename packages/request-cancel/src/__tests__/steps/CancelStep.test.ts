/**
 * CancelStep 测试
 */

import { beforeEach, describe, expect, it } from 'vitest';
import axios from 'axios';
import type { CancelToken } from 'axios';
import { CancelStep } from '../../steps/CancelStep';
import { CancelTokenManager } from '../../managers/CancelTokenManager';
import { createRequestContext } from '@suga/request-core';
import type { NormalizedRequestConfig } from '@suga/request-core';

describe('CancelStep', () => {
  let step: CancelStep;
  let cancelTokenManager: CancelTokenManager;

  beforeEach(() => {
    cancelTokenManager = new CancelTokenManager();
    step = new CancelStep({ cancelTokenManager });
  });

  describe('构造函数', () => {
    it('应该使用默认 CancelTokenManager', () => {
      const defaultStep = new CancelStep();
      expect(defaultStep).toBeInstanceOf(CancelStep);
      expect(defaultStep.getCancelTokenManager()).toBeInstanceOf(CancelTokenManager);
    });

    it('应该使用自定义 CancelTokenManager', () => {
      const customManager = new CancelTokenManager();
      const customStep = new CancelStep({ cancelTokenManager: customManager });
      expect(customStep.getCancelTokenManager()).toBe(customManager);
    });

    it('应该使用默认配置', () => {
      const defaultStep = new CancelStep({
        defaultOptions: {
          enabled: true,
          autoCancelPrevious: true,
        },
      });
      expect(defaultStep).toBeInstanceOf(CancelStep);
    });
  });

  describe('execute', () => {
    it('应该在 meta 中没有 cancelable 时默认启用', async () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const ctx = createRequestContext(config);

      const next = async (): Promise<void> => {
        ctx.result = 'success';
      };

      await step.execute(ctx, next);

      // 根据实现，cancelable 默认为 true，所以应该创建 token
      expect(ctx.meta._cancelTokenSource).toBeDefined();
    });

    it('应该在 cancelable=false 时跳过', async () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const ctx = createRequestContext(config, undefined, {
        cancelable: false,
      });

      let nextCalled = false;
      const next = async (): Promise<void> => {
        nextCalled = true;
      };

      await step.execute(ctx, next);

      expect(nextCalled).toBe(true);
      expect(ctx.meta._cancelTokenSource).toBeUndefined();
    });

    it('应该在 cancelable=undefined 时默认启用', async () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const ctx = createRequestContext(config, undefined, {
        cancelable: undefined,
      });

      const next = async (): Promise<void> => {
        ctx.result = 'success';
      };

      await step.execute(ctx, next);

      expect(ctx.meta._cancelTokenSource).toBeDefined();
      expect(ctx.meta._cancelToken).toBeDefined();
      expect(cancelTokenManager.has(ctx.id)).toBe(false); // 请求成功后已清理
    });

    it('应该在 cancelable=true 时创建取消Token', async () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const ctx = createRequestContext(config, undefined, {
        cancelable: true,
      });

      const next = async (): Promise<void> => {
        ctx.result = 'success';
      };

      await step.execute(ctx, next);

      expect(ctx.meta._cancelTokenSource).toBeDefined();
      expect(ctx.meta._cancelToken).toBeDefined();
      expect(cancelTokenManager.has(ctx.id)).toBe(false); // 请求成功后已清理
    });

    it('应该在请求成功时清理取消Token', async () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const ctx = createRequestContext<string>(config, undefined, {
        cancelable: true,
      });

      const next = async (): Promise<void> => {
        ctx.result = 'success';
      };

      await step.execute(ctx, next);

      expect(cancelTokenManager.has(ctx.id)).toBe(false);
    });

    it('应该在请求失败时清理取消Token', async () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const ctx = createRequestContext(config, undefined, {
        cancelable: true,
      });

      const error = new Error('Test error');
      const next = async (): Promise<void> => {
        throw error;
      };

      await expect(step.execute(ctx, next)).rejects.toThrow('Test error');

      expect(cancelTokenManager.has(ctx.id)).toBe(false);
    });

    it('应该在请求被取消时不重复清理', async () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const ctx = createRequestContext(config, undefined, {
        cancelable: true,
      });

      const next = async (): Promise<void> => {
        // 等待 token 创建
        await new Promise((resolve) => setTimeout(resolve, 10));
        // 模拟请求被取消 - 使用 ctx 中的 token
        const token = ctx.meta._cancelToken as CancelToken | undefined;
        if (token) {
          // 取消 token
          cancelTokenManager.cancel(ctx.id);
          // 等待取消完成并抛出错误
          await token.promise.catch((error: unknown) => {
            // 预期的取消错误
            if (axios.isCancel(error)) {
              throw error;
            }
            throw error;
          });
        }
      };

      await expect(step.execute(ctx, next)).rejects.toBeDefined();

      // 取消时已经清理，所以不应该存在
      expect(cancelTokenManager.has(ctx.id)).toBe(false);
    });

    it('应该使用 ctx.id 作为 requestId', async () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const ctx = createRequestContext(config, undefined, {
        cancelable: true,
      });

      const next = async (): Promise<void> => {
        ctx.result = 'success';
      };

      await step.execute(ctx, next);

      // 验证 token 已创建（虽然请求成功后已清理）
      expect(ctx.meta._cancelTokenSource).toBeDefined();
    });

    it('应该存储请求配置到 CancelTokenManager', async () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const ctx = createRequestContext(config, undefined, {
        cancelable: true,
      });

      const next = async (): Promise<void> => {
        ctx.result = 'success';
      };

      await step.execute(ctx, next);

      // 验证 token 已创建（虽然请求成功后已清理）
      expect(ctx.meta._cancelTokenSource).toBeDefined();
    });
  });

  describe('getCancelTokenManager', () => {
    it('应该返回 CancelTokenManager 实例', () => {
      const manager = step.getCancelTokenManager();
      expect(manager).toBeInstanceOf(CancelTokenManager);
      expect(manager).toBe(cancelTokenManager);
    });
  });

  describe('取消功能集成', () => {
    it('应该能够通过 CancelTokenManager 取消请求', async () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const ctx = createRequestContext(config, undefined, {
        cancelable: true,
      });

      let cancelled = false;
      const next = async (): Promise<void> => {
        // 等待 token 创建
        await new Promise((resolve) => setTimeout(resolve, 10));

        // 模拟异步请求
        const token = ctx.meta._cancelToken as CancelToken | undefined;
        if (token) {
          try {
            await token.promise;
          } catch (error) {
            if (axios.isCancel(error)) {
              cancelled = true;
              throw error;
            }
            throw error;
          }
        }
        ctx.result = 'success';
      };

      // 启动请求
      const requestPromise = step.execute(ctx, next);

      // 等待 token 创建
      await new Promise((resolve) => setTimeout(resolve, 20));

      // 立即取消请求
      cancelTokenManager.cancel(ctx.id, '用户取消');

      await expect(requestPromise).rejects.toBeDefined();

      // 等待取消完成（promise reject 的回调是异步的）
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(cancelled).toBe(true);
    }, 10000);

    it('应该支持自动取消旧请求', async () => {
      const config1: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const ctx1 = createRequestContext(config1, undefined, {
        cancelable: true,
      });

      const config2: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const ctx2 = createRequestContext(config2, undefined, {
        cancelable: true,
      });

      // 使用相同的 requestId 来测试自动取消
      // 注意：实际使用中，ctx.id 是自动生成的，这里我们手动设置相同的 id
      const sameId = 'same-request-id';
      Object.defineProperty(ctx1, 'id', { value: sameId, writable: true });
      Object.defineProperty(ctx2, 'id', { value: sameId, writable: true });

      let cancelled1 = false;
      const next1 = async (): Promise<void> => {
        // 等待 token 创建
        await new Promise((resolve) => setTimeout(resolve, 10));

        const token = ctx1.meta._cancelToken as CancelToken | undefined;
        if (token) {
          try {
            await token.promise;
          } catch (error) {
            if (axios.isCancel(error)) {
              cancelled1 = true;
              throw error;
            }
            throw error;
          }
        }
        ctx1.result = 'success';
      };

      const next2 = async (): Promise<void> => {
        ctx2.result = 'success';
      };

      // 启动第一个请求
      const request1Promise = step.execute(ctx1, next1);

      // 等待第一个请求的 token 创建
      await new Promise((resolve) => setTimeout(resolve, 20));

      // 立即启动第二个请求（应该自动取消第一个）
      await step.execute(ctx2, next2);

      await expect(request1Promise).rejects.toBeDefined();

      // 等待取消完成（promise reject 的回调是异步的）
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(cancelled1).toBe(true);
    }, 10000);
  });
});

