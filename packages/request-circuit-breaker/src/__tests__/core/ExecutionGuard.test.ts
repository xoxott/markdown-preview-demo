/**
 * ExecutionGuard 测试
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { ExecutionGuard } from '../../core/ExecutionGuard';
import { Metrics } from '../../core/Metrics';
import { CircuitBreakerState } from '../../types';

describe('ExecutionGuard', () => {
  let metrics: Metrics;
  let executionGuard: ExecutionGuard<string>;

  beforeEach(() => {
    metrics = new Metrics();
    executionGuard = new ExecutionGuard(metrics);
  });

  describe('checkExecution', () => {
    it('应该在 CLOSED 状态下返回 null', async () => {
      const result = await executionGuard.checkExecution();
      expect(result).toBeNull();
    });

    it('应该在 HALF_OPEN 状态下返回 null', async () => {
      metrics.setState(CircuitBreakerState.HALF_OPEN);
      const result = await executionGuard.checkExecution();
      expect(result).toBeNull();
    });

    it('应该在 OPEN 状态下抛出错误当没有 fallback', async () => {
      metrics.setState(CircuitBreakerState.OPEN);

      await expect(executionGuard.checkExecution()).rejects.toThrow('熔断器已开启，请求被拒绝');
    });

    it('应该在 OPEN 状态下返回 fallback 结果', async () => {
      const fallback = () => Promise.resolve('fallback-data');
      const guardWithFallback = new ExecutionGuard(metrics, fallback);

      metrics.setState(CircuitBreakerState.OPEN);
      const result = await guardWithFallback.checkExecution();

      expect(result).toBe('fallback-data');
    });

    it('应该支持同步 fallback', async () => {
      const fallback = () => 'sync-fallback';
      const guardWithFallback = new ExecutionGuard(metrics, fallback);

      metrics.setState(CircuitBreakerState.OPEN);
      const result = await guardWithFallback.checkExecution();

      expect(result).toBe('sync-fallback');
    });

    it('应该调用 fallback 当熔断开启', async () => {
      const fallback = () => 'error-fallback';
      const guardWithFallback = new ExecutionGuard(metrics, fallback);

      metrics.setState(CircuitBreakerState.OPEN);
      // 注意：checkExecution 不传递错误，只有在 execute 中才会传递
      const result = await guardWithFallback.checkExecution();

      expect(result).toBe('error-fallback');
    });
  });
});

