/**
 * 熔断步骤
 * 职责：熔断保护，默认关闭，仅适用于高频/高价值请求
 */

import type { RequestStep, RequestContext } from '@suga/request-core';
import type {
  CircuitBreakerOptions,
  CircuitBreakerBaseOptions,
} from '../types';
import { isCircuitBreakerMeta } from '../types';
import { CircuitBreakerManager } from '../managers/CircuitBreakerManager';

/**
 * 熔断步骤配置
 */
export interface CircuitBreakerStepOptions {
  /** 熔断器管理器实例 */
  circuitBreakerManager?: CircuitBreakerManager;
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
    this.circuitBreakerManager = options.circuitBreakerManager ?? new CircuitBreakerManager();
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

    const breakerKey = ctx.config.url || 'default';
    const breaker = this.circuitBreakerManager.getOrCreateBreaker<T>(breakerKey, parsedConfig);

    try {
      const result = await breaker.execute(async () => {
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
    }
  }
}

