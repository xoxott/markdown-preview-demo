/**
 * 熔断步骤
 * 职责：熔断保护，默认关闭，仅适用于高频/高价值请求
 */

import type { RequestStep, RequestContext } from '@suga/request-core';
import type {
  CircuitBreakerOptions,
  CircuitBreakerBaseOptions,
} from '../types';
import { isCircuitBreakerMeta, CircuitBreakerState } from '../types';
import { CircuitBreakerManager, type CircuitBreakerManagerOptions } from '../managers/CircuitBreakerManager';

/**
 * 熔断步骤配置
 */
export interface CircuitBreakerStepOptions {
  /** 熔断器管理器实例 */
  circuitBreakerManager?: CircuitBreakerManager;
  /** 熔断器管理器选项（仅在未提供 circuitBreakerManager 时有效） */
  managerOptions?: CircuitBreakerManagerOptions;
}

/**
 * 解析熔断器配置
 */
function parseCircuitBreakerConfig<T = unknown>(
  config: boolean | CircuitBreakerBaseOptions | CircuitBreakerOptions<unknown> | CircuitBreakerOptions<T> | undefined,
): CircuitBreakerOptions<T> | undefined {
  if (config === undefined || config === false) {
    return undefined;
  }

  if (typeof config === 'boolean') {
    return { enabled: config };
  }

  if (typeof config === 'object' && config !== null) {
    return config as CircuitBreakerOptions<T>;
  }

  return undefined;
}

/**
 * 熔断步骤
 */
export class CircuitBreakerStep implements RequestStep {
  private circuitBreakerManager: CircuitBreakerManager;

  constructor(options: CircuitBreakerStepOptions = {}) {
    this.circuitBreakerManager =
      options.circuitBreakerManager ?? new CircuitBreakerManager(options.managerOptions);
  }

  async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
    if (!isCircuitBreakerMeta(ctx.meta)) {
      return next();
    }

    const circuitBreakerConfig = ctx.meta.circuitBreaker;
    const parsedConfig = parseCircuitBreakerConfig<T>(circuitBreakerConfig);

    if (!parsedConfig) {
      return next();
    }

    // 直接使用 ctx.id，避免重复计算
    const breaker = this.circuitBreakerManager.getOrCreateBreaker<T>(ctx.id, parsedConfig);

    // 获取执行前的状态和指标（用于暴露给应用层）
    const stateBeforeExecute = breaker.getState();
    const metricsBeforeExecute = breaker.getMetrics();

    // 标记是否执行了实际的请求（用于判断是否使用了 fallback）
    let requestExecuted = false;

    try {
      const result = await breaker.execute(async () => {
        // 标记已执行实际请求（如果这行代码执行了，说明没有使用 fallback）
        requestExecuted = true;

        await next();
        if (ctx.error) {
          throw ctx.error;
        }
        if (ctx.result === undefined) {
          throw new Error('Request completed but no result');
        }
        return ctx.result;
      });

      ctx.result = result;
      ctx.error = undefined;
    } catch (error) {
      ctx.error = error;
      throw error;
    } finally {
      // 统一处理：暴露熔断器状态和指标信息到 meta
      const stateAfterExecute = breaker.getState();
      const metricsAfterExecute = breaker.getMetrics();
      const usedFallback = !requestExecuted && stateBeforeExecute === CircuitBreakerState.OPEN;

      ctx.meta.circuitBreakerState = stateAfterExecute;
      ctx.meta.circuitBreakerMetrics = metricsAfterExecute;
      ctx.meta.circuitBreakerUsedFallback = usedFallback;
      ctx.meta.circuitBreakerStateBeforeExecute = stateBeforeExecute;
      ctx.meta.circuitBreakerMetricsBeforeExecute = metricsBeforeExecute;
    }
  }
}

