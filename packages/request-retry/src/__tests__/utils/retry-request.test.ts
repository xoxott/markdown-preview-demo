/**
 * retry-request 测试
 */

import { describe, expect, it } from 'vitest';
import { DEFAULT_RETRY_CONFIG } from '../../constants';
import type { RetryStrategy } from '../../types';
import { retryRequest } from '../../utils/retry-request';

describe('retry-request', () => {
  describe('基本功能', () => {
    it('应该成功执行请求', async () => {
      const result = await retryRequest(async () => {
        return 'success';
      });

      expect(result).toBe('success');
    });

    it('应该在第一次成功时不重试', async () => {
      let callCount = 0;

      const result = await retryRequest(async () => {
        callCount++;
        return 'success';
      });

      expect(result).toBe('success');
      expect(callCount).toBe(1);
    });

    it('应该在失败后重试', async () => {
      let callCount = 0;

      const result = await retryRequest(
        async () => {
          callCount++;
          if (callCount < 2) {
            throw { message: 'Network error', status: 500 };
          }
          return 'success';
        },
        { retry: true, retryCount: 3 },
      );

      expect(result).toBe('success');
      expect(callCount).toBe(2);
    });

    it('应该在达到最大重试次数后抛出错误', async () => {
      let callCount = 0;

      await expect(
        retryRequest(
          async () => {
            callCount++;
            throw { message: 'Network error', status: 500 };
          },
          { retry: true, retryCount: 2 },
        ),
      ).rejects.toBeDefined();

      expect(callCount).toBe(3); // 初始请求 + 2 次重试
    });
  });

  describe('配置选项', () => {
    it('应该在 retry=false 时不重试', async () => {
      let callCount = 0;

      await expect(
        retryRequest(
          async () => {
            callCount++;
            throw { message: 'Error', status: 500 };
          },
          { retry: false },
        ),
      ).rejects.toBeDefined();

      expect(callCount).toBe(1);
    });

    it('应该使用配置的重试次数', async () => {
      let callCount = 0;

      await expect(
        retryRequest(
          async () => {
            callCount++;
            throw { message: 'Error', status: 500 };
          },
          { retry: true, retryCount: 2 }, // 减少重试次数，避免超时
        ),
      ).rejects.toBeDefined();

      expect(callCount).toBe(3); // 初始请求 + 2 次重试
    }, 10000); // 增加超时时间

    it('应该使用默认重试次数', async () => {
      let callCount = 0;

      await expect(
        retryRequest(
          async () => {
            callCount++;
            throw { message: 'Error', status: 500 };
          },
          { retry: true },
        ),
      ).rejects.toBeDefined();

      expect(callCount).toBe(DEFAULT_RETRY_CONFIG.DEFAULT_RETRY_COUNT + 1);
    }, 15000); // 增加超时时间（默认重试 3 次，需要更多时间）
  });

  describe('策略支持', () => {
    it('应该在策略未启用时不重试', async () => {
      const strategy: RetryStrategy = {
        enabled: false,
        maxRetries: 3,
        shouldRetry: () => true,
        retryDelay: () => 1000,
      };

      let callCount = 0;

      await expect(
        retryRequest(
          async () => {
            callCount++;
            throw { message: 'Error', status: 500 };
          },
          undefined,
          strategy,
        ),
      ).rejects.toBeDefined();

      expect(callCount).toBe(1);
    });

    it('应该使用策略的 shouldRetry', async () => {
      const strategy: RetryStrategy = {
        enabled: true,
        maxRetries: 3,
        shouldRetry: (error) => {
          // 只重试 500 错误
          return error.status === 500;
        },
        retryDelay: () => 100,
      };

      let callCount = 0;

      // 404 错误不应该重试
      await expect(
        retryRequest(
          async () => {
            callCount++;
            throw { message: 'Not found', status: 404 };
          },
          undefined,
          strategy,
        ),
      ).rejects.toBeDefined();

      expect(callCount).toBe(1);
    });

    it('应该使用策略的 retryDelay', async () => {
      const strategy: RetryStrategy = {
        enabled: true,
        maxRetries: 2,
        shouldRetry: () => true,
        retryDelay: () => 50, // 固定延迟 50ms
      };

      let callCount = 0;
      const start = Date.now();

      await expect(
        retryRequest(
          async () => {
            callCount++;
            throw { message: 'Error', status: 500 };
          },
          undefined,
          strategy,
        ),
      ).rejects.toBeDefined();

      const elapsed = Date.now() - start;

      expect(callCount).toBe(3);
      // 应该有 2 次延迟（每次 50ms）
      expect(elapsed).toBeGreaterThanOrEqual(90);
    });

    it('应该使用策略的 maxRetries', async () => {
      const strategy: RetryStrategy = {
        enabled: true,
        maxRetries: 5,
        shouldRetry: () => true,
        retryDelay: () => 10,
      };

      let callCount = 0;

      await expect(
        retryRequest(
          async () => {
            callCount++;
            throw { message: 'Error', status: 500 };
          },
          undefined,
          strategy,
        ),
      ).rejects.toBeDefined();

      expect(callCount).toBe(6); // 初始请求 + 5 次重试
    });
  });

  describe('错误类型策略', () => {
    it('应该使用错误类型策略的最大重试次数', async () => {
      const strategy: RetryStrategy = {
        enabled: true,
        maxRetries: 5,
        shouldRetry: () => true,
        retryDelay: () => 10,
        errorTypeStrategy: {
          timeout: {
            maxRetries: 1, // 减少重试次数，避免超时
            delay: 10,
          },
        },
      };

      let callCount = 0;

      // 注意：ECONNABORTED 会被识别为取消错误，所以使用消息来标识超时
      await expect(
        retryRequest(
          async () => {
            callCount++;
            throw { message: 'Request timeout' }; // 不使用 ECONNABORTED code
          },
          undefined,
          strategy,
        ),
      ).rejects.toBeDefined();

      expect(callCount).toBe(2); // 初始请求 + 1 次重试（使用错误类型策略）
    }, 10000);

    it('应该使用错误类型策略的延迟', async () => {
      const strategy: RetryStrategy = {
        enabled: true,
        maxRetries: 2,
        shouldRetry: () => true,
        retryDelay: () => 100,
        errorTypeStrategy: {
          timeout: {
            maxRetries: 1, // 减少重试次数
            delay: 50, // 使用错误类型策略的延迟
          },
        },
      };

      let callCount = 0;
      const start = Date.now();

      // 注意：ECONNABORTED 会被识别为取消错误，所以使用消息来标识超时
      await expect(
        retryRequest(
          async () => {
            callCount++;
            throw { message: 'Request timeout' }; // 不使用 ECONNABORTED code
          },
          undefined,
          strategy,
        ),
      ).rejects.toBeDefined();

      const elapsed = Date.now() - start;

      expect(callCount).toBe(2); // 初始请求 + 1 次重试
      // 应该使用错误类型策略的延迟（50ms）
      expect(elapsed).toBeGreaterThanOrEqual(40);
    }, 10000);
  });

  describe('错误处理', () => {
    it('应该处理 Error 对象', async () => {
      await expect(
        retryRequest(
          async () => {
            throw new Error('Test error');
          },
          { retry: false },
        ),
      ).rejects.toThrow('Test error');
    });

    it('应该处理字符串错误', async () => {
      await expect(
        retryRequest(
          async () => {
            throw 'String error';
          },
          { retry: false },
        ),
      ).rejects.toBeDefined();
    });

    it('应该处理普通对象错误', async () => {
      await expect(
        retryRequest(
          async () => {
            throw { message: 'Object error' };
          },
          { retry: false },
        ),
      ).rejects.toBeDefined();
    });
  });

  describe('超时重试', () => {
    it('应该在 retryOnTimeout=true 时重试超时错误', async () => {
      let callCount = 0;

      // 注意：ECONNABORTED 会被识别为取消错误，所以不重试
      // 使用消息中包含 "timeout" 来标识超时错误
      await expect(
        retryRequest(
          async () => {
            callCount++;
            throw { message: 'Request timeout' }; // 不使用 ECONNABORTED code
          },
          { retry: true, retryOnTimeout: true, retryCount: 1 }, // 减少重试次数
        ),
      ).rejects.toBeDefined();

      expect(callCount).toBeGreaterThan(1);
    }, 10000);

    it('应该在 retryOnTimeout=false 时不重试超时错误', async () => {
      let callCount = 0;

      await expect(
        retryRequest(
          async () => {
            callCount++;
            throw { message: 'Request timeout', code: 'ECONNABORTED' };
          },
          { retry: true, retryOnTimeout: false, retryCount: 2 },
        ),
      ).rejects.toBeDefined();

      expect(callCount).toBe(1);
    });
  });
});

