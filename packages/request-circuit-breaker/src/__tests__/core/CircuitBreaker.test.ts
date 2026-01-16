/**
 * CircuitBreaker 测试
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { CircuitBreaker } from '../../core/CircuitBreaker';
import { CircuitBreakerState } from '../../types';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker<string>;

  beforeEach(() => {
    breaker = new CircuitBreaker<string>();
  });

  describe('构造函数', () => {
    it('应该使用默认配置创建实例', () => {
      expect(breaker).toBeInstanceOf(CircuitBreaker);
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });

    it('应该使用自定义配置', () => {
      const customBreaker = new CircuitBreaker({
        failureThreshold: 3,
        timeout: 30000,
        successThreshold: 1,
      });

      expect(customBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });

    it('应该支持禁用熔断器', async () => {
      const disabledBreaker = new CircuitBreaker({
        enabled: false,
      });

      // 即使失败多次，也不应该开启熔断
      for (let i = 0; i < 10; i++) {
        try {
          await disabledBreaker.execute(async () => {
            throw new Error('Test error');
          });
        } catch {
          // 忽略错误
        }
      }

      expect(disabledBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });
  });

  describe('execute', () => {
    it('应该成功执行请求', async () => {
      const result = await breaker.execute(async () => {
        return 'success';
      });

      expect(result).toBe('success');
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });

    it('应该在失败时抛出错误', async () => {
      const error = new Error('Request failed');

      await expect(
        breaker.execute(async () => {
          throw error;
        }),
      ).rejects.toThrow('Request failed');
    });

    it('应该在达到失败阈值后开启熔断', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
      });

      // 记录 3 次失败
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw { response: { status: 500 } };
          });
        } catch {
          // 忽略错误
        }
      }

      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);
    });

    it('应该在熔断开启时使用 fallback', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        fallback: () => 'fallback-data',
      });

      // 开启熔断
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw { response: { status: 500 } };
          });
        } catch {
          // 忽略错误
        }
      }

      // 熔断开启后，应该返回 fallback
      const result = await breaker.execute(async () => {
        return 'should-not-execute';
      });

      expect(result).toBe('fallback-data');
    });

    it('应该在熔断开启时抛出错误当没有 fallback', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
      });

      // 开启熔断
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw { response: { status: 500 } };
          });
        } catch {
          // 忽略错误
        }
      }

      // 熔断开启后，应该抛出错误
      await expect(
        breaker.execute(async () => {
          return 'should-not-execute';
        }),
      ).rejects.toThrow('熔断器已开启，请求被拒绝');
    });

    it('应该在超时后进入半开状态', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        timeout: 100, // 100ms
      });

      // 开启熔断
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw { response: { status: 500 } };
          });
        } catch {
          // 忽略错误
        }
      }

      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);

      // 等待超时
      await new Promise(resolve => setTimeout(resolve, 150));

      // 推进状态
      breaker.advanceState();

      expect(breaker.getState()).toBe(CircuitBreakerState.HALF_OPEN);
    });

    it('应该在半开状态下成功达到阈值后关闭熔断', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        timeout: 100,
        successThreshold: 2,
      });

      // 开启熔断
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw { response: { status: 500 } };
          });
        } catch {
          // 忽略错误
        }
      }

      // 等待超时并进入半开状态
      await new Promise(resolve => setTimeout(resolve, 150));
      breaker.advanceState();

      // 在半开状态下成功 2 次
      await breaker.execute(async () => 'success1');
      await breaker.execute(async () => 'success2');

      // 推进状态
      breaker.advanceState();

      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });

    it('应该在半开状态下失败后重新开启熔断', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        timeout: 100,
      });

      // 开启熔断
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw { response: { status: 500 } };
          });
        } catch {
          // 忽略错误
        }
      }

      // 等待超时并进入半开状态
      await new Promise(resolve => setTimeout(resolve, 150));
      breaker.advanceState();

      // 在半开状态下失败
      try {
        await breaker.execute(async () => {
          throw { response: { status: 500 } };
        });
      } catch {
        // 忽略错误
      }

      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);
    });

    it('应该只统计符合条件的错误', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
      });

      // 4xx 错误不应该被统计
      try {
        await breaker.execute(async () => {
          throw { response: { status: 404 } };
        });
      } catch {
        // 忽略错误
      }

      expect(breaker.getMetrics().failures).toBe(0);

      // 5xx 错误应该被统计
      try {
        await breaker.execute(async () => {
          throw { response: { status: 500 } };
        });
      } catch {
        // 忽略错误
      }

      expect(breaker.getMetrics().failures).toBe(1);
    });

    it('应该在成功时重置失败计数（CLOSED 状态）', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 5,
      });

      // 记录一些失败
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw { response: { status: 500 } };
          });
        } catch {
          // 忽略错误
        }
      }

      expect(breaker.getMetrics().failures).toBe(3);

      // 成功一次应该重置失败计数
      await breaker.execute(async () => 'success');

      expect(breaker.getMetrics().failures).toBe(0);
    });
  });

  describe('getState', () => {
    it('应该返回当前状态', () => {
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });
  });

  describe('getMetrics', () => {
    it('应该返回指标快照', () => {
      const metrics = breaker.getMetrics();

      expect(metrics.failures).toBe(0);
      expect(metrics.successes).toBe(0);
      expect(metrics.lastFailureTime).toBeNull();
      expect(metrics.state).toBe(CircuitBreakerState.CLOSED);
    });
  });

  describe('reset', () => {
    it('应该重置所有指标', async () => {
      // 记录一些失败
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw { response: { status: 500 } };
          });
        } catch {
          // 忽略错误
        }
      }

      breaker.reset();

      const metrics = breaker.getMetrics();
      expect(metrics.failures).toBe(0);
      expect(metrics.successes).toBe(0);
      expect(metrics.lastFailureTime).toBeNull();
      expect(metrics.state).toBe(CircuitBreakerState.CLOSED);
    });
  });

  describe('advanceState', () => {
    it('应该手动推进状态', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        timeout: 100,
      });

      // 开启熔断
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw { response: { status: 500 } };
          });
        } catch {
          // 忽略错误
        }
      }

      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);

      // 等待超时
      await new Promise(resolve => setTimeout(resolve, 150));

      // 手动推进状态
      const newState = breaker.advanceState();

      expect(newState).toBe(CircuitBreakerState.HALF_OPEN);
      expect(breaker.getState()).toBe(CircuitBreakerState.HALF_OPEN);
    });
  });
});

