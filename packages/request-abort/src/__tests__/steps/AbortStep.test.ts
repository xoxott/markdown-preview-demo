/**
 * AbortStep 测试
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { AbortStep } from '../../steps/AbortStep';
import { AbortControllerManager } from '../../managers/AbortControllerManager';
import { createRequestContext } from '@suga/request-core';
import type { NormalizedRequestConfig } from '@suga/request-core';

describe('AbortStep', () => {
  let step: AbortStep;
  let abortControllerManager: AbortControllerManager;

  beforeEach(() => {
    abortControllerManager = new AbortControllerManager();
    step = new AbortStep({ abortControllerManager });
  });

  describe('构造函数', () => {
    it('应该使用默认 AbortControllerManager', () => {
      const defaultStep = new AbortStep();
      expect(defaultStep).toBeInstanceOf(AbortStep);
      expect(defaultStep.getAbortControllerManager()).toBeInstanceOf(AbortControllerManager);
    });

    it('应该使用自定义 AbortControllerManager', () => {
      const customManager = new AbortControllerManager();
      const customStep = new AbortStep({ abortControllerManager: customManager });
      expect(customStep.getAbortControllerManager()).toBe(customManager);
    });

    it('应该使用默认配置', () => {
      const defaultStep = new AbortStep({
        defaultOptions: {
          enabled: true,
          autoAbortPrevious: true,
        },
      });
      expect(defaultStep).toBeInstanceOf(AbortStep);
    });
  });

  describe('execute', () => {
    it('应该在 meta 中没有 abortable 时默认启用', async () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const ctx = createRequestContext(config);

      const next = async (): Promise<void> => {
        ctx.result = 'success';
      };

      await step.execute(ctx, next);

      // 根据实现，abortable 默认为 true，所以应该创建 controller
      expect(ctx.meta.signal).toBeDefined();
    });

    it('应该在 abortable=false 时跳过', async () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const ctx = createRequestContext(config, undefined, {
        abortable: false,
      });

      let nextCalled = false;
      const next = async (): Promise<void> => {
        nextCalled = true;
      };

      await step.execute(ctx, next);

      expect(nextCalled).toBe(true);
      expect(ctx.meta.signal).toBeUndefined();
    });

    it('应该在 abortable=undefined 时默认启用', async () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const ctx = createRequestContext(config, undefined, {
        abortable: undefined,
      });

      const next = async (): Promise<void> => {
        ctx.result = 'success';
      };

      await step.execute(ctx, next);

      expect(ctx.meta.signal).toBeDefined();
      expect(abortControllerManager.has(ctx.id)).toBe(false); // 请求成功后已清理
    });

    it('应该在 abortable=true 时创建 AbortController', async () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const ctx = createRequestContext(config, undefined, {
        abortable: true,
      });

      const next = async (): Promise<void> => {
        ctx.result = 'success';
      };

      await step.execute(ctx, next);

      expect(ctx.meta.signal).toBeDefined();
      expect(abortControllerManager.has(ctx.id)).toBe(false); // 请求成功后已清理
    });

    it('应该在请求成功时清理 AbortController', async () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const ctx = createRequestContext<string>(config, undefined, {
        abortable: true,
      });

      const next = async (): Promise<void> => {
        ctx.result = 'success';
      };

      await step.execute(ctx, next);

      expect(abortControllerManager.has(ctx.id)).toBe(false);
    });

    it('应该在请求失败时清理 AbortController', async () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const ctx = createRequestContext(config, undefined, {
        abortable: true,
      });

      const error = new Error('Test error');
      const next = async (): Promise<void> => {
        throw error;
      };

      await expect(step.execute(ctx, next)).rejects.toThrow('Test error');

      expect(abortControllerManager.has(ctx.id)).toBe(false);
    });

    it('应该在请求被中止时不重复清理', async () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const ctx = createRequestContext(config, undefined, {
        abortable: true,
      });

      const next = async (): Promise<void> => {
        // 等待 controller 创建
        await new Promise((resolve) => setTimeout(resolve, 10));
        // 模拟请求被中止 - 使用 ctx 中的 signal
        const signal = ctx.meta.signal as AbortSignal | undefined;
        if (signal) {
          // 中止请求
          abortControllerManager.abort(ctx.id);
          // 等待中止完成
          if (signal.aborted) {
            throw new DOMException('请求已中止', 'AbortError');
          }
          // 监听中止事件
          await new Promise<void>((resolve, reject) => {
            signal.addEventListener('abort', () => {
              reject(new DOMException('请求已中止', 'AbortError'));
            });
            // 如果已经中止，立即拒绝
            if (signal.aborted) {
              reject(new DOMException('请求已中止', 'AbortError'));
            } else {
              // 等待中止或超时
              setTimeout(() => {
                if (signal.aborted) {
                  reject(new DOMException('请求已中止', 'AbortError'));
                } else {
                  resolve();
                }
              }, 50);
            }
          });
        }
      };

      await expect(step.execute(ctx, next)).rejects.toBeDefined();

      // 中止时已经清理，所以不应该存在
      expect(abortControllerManager.has(ctx.id)).toBe(false);
    });

    it('应该使用 ctx.id 作为 requestId', async () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const ctx = createRequestContext(config, undefined, {
        abortable: true,
      });

      const next = async (): Promise<void> => {
        ctx.result = 'success';
      };

      await step.execute(ctx, next);

      // 验证 controller 已创建（虽然请求成功后已清理）
      expect(ctx.meta.signal).toBeDefined();
    });

    it('应该存储请求配置到 AbortControllerManager', async () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const ctx = createRequestContext(config, undefined, {
        abortable: true,
      });

      const next = async (): Promise<void> => {
        ctx.result = 'success';
      };

      await step.execute(ctx, next);

      // 验证 controller 已创建（虽然请求成功后已清理）
      expect(ctx.meta.signal).toBeDefined();
    });
  });

  describe('getAbortControllerManager', () => {
    it('应该返回 AbortControllerManager 实例', () => {
      const manager = step.getAbortControllerManager();
      expect(manager).toBeInstanceOf(AbortControllerManager);
      expect(manager).toBe(abortControllerManager);
    });
  });

  describe('中止功能集成', () => {
    it('应该能够通过 AbortControllerManager 中止请求', async () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const ctx = createRequestContext(config, undefined, {
        abortable: true,
      });

      let aborted = false;
      const next = async (): Promise<void> => {
        // 等待 controller 创建
        await new Promise((resolve) => setTimeout(resolve, 10));

        // 模拟异步请求
        const signal = ctx.meta.signal as AbortSignal | undefined;
        if (signal) {
          // 监听中止事件
          await new Promise<void>((resolve, reject) => {
            signal.addEventListener('abort', () => {
              aborted = true;
              reject(new DOMException('请求已中止', 'AbortError'));
            });
            // 如果已经中止，立即拒绝
            if (signal.aborted) {
              aborted = true;
              reject(new DOMException('请求已中止', 'AbortError'));
              return;
            }
            // 等待中止或超时
            setTimeout(() => {
              if (!signal.aborted) {
                resolve();
              }
            }, 100);
          });
        }
        ctx.result = 'success';
      };

      // 启动请求
      const requestPromise = step.execute(ctx, next);

      // 等待 controller 创建
      await new Promise((resolve) => setTimeout(resolve, 20));

      // 立即中止请求
      abortControllerManager.abort(ctx.id, '用户中止');

      await expect(requestPromise).rejects.toBeDefined();

      // 等待中止完成
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(aborted).toBe(true);
    }, 10000);

    it('应该支持自动中止旧请求', async () => {
      const config1: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const ctx1 = createRequestContext(config1, undefined, {
        abortable: true,
      });

      const config2: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const ctx2 = createRequestContext(config2, undefined, {
        abortable: true,
      });

      // 使用相同的 requestId 来测试自动取消
      // 注意：实际使用中，ctx.id 是自动生成的，这里我们手动设置相同的 id
      const sameId = 'same-request-id';
      Object.defineProperty(ctx1, 'id', { value: sameId, writable: true });
      Object.defineProperty(ctx2, 'id', { value: sameId, writable: true });

      let aborted1 = false;
      const next1 = async (): Promise<void> => {
        // 等待 controller 创建
        await new Promise((resolve) => setTimeout(resolve, 10));

        const signal = ctx1.meta.signal as AbortSignal | undefined;
        if (signal) {
          // 监听中止事件
          await new Promise<void>((resolve, reject) => {
            signal.addEventListener('abort', () => {
              aborted1 = true;
              reject(new DOMException('请求已中止', 'AbortError'));
            });
            // 如果已经中止，立即拒绝
            if (signal.aborted) {
              aborted1 = true;
              reject(new DOMException('请求已中止', 'AbortError'));
              return;
            }
            // 等待中止或超时
            setTimeout(() => {
              if (!signal.aborted) {
                resolve();
              }
            }, 100);
          });
        }
        ctx1.result = 'success';
      };

      const next2 = async (): Promise<void> => {
        ctx2.result = 'success';
      };

      // 启动第一个请求
      const request1Promise = step.execute(ctx1, next1);

      // 等待第一个请求的 controller 创建
      await new Promise((resolve) => setTimeout(resolve, 20));

      // 立即启动第二个请求（应该自动中止第一个）
      await step.execute(ctx2, next2);

      await expect(request1Promise).rejects.toBeDefined();

      // 等待中止完成（promise reject 的回调是异步的）
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(aborted1).toBe(true);
    }, 10000);
  });
});

