/**
 * @suga/request-circuit-breaker
 * Circuit breaker pattern for @suga/request-core
 */

import { CircuitBreaker } from './core/CircuitBreaker';
import type { CircuitBreakerOptions } from './types';

// 导出熔断器核心类
export { CircuitBreaker };

/**
 * 创建熔断器实例（工厂函数）
 */
export function createCircuitBreaker<T = unknown>(
  options: CircuitBreakerOptions<T> = {},
): CircuitBreaker<T> {
  return new CircuitBreaker<T>(options);
}

// 导出熔断器管理器
export { CircuitBreakerManager } from './managers/CircuitBreakerManager';

// 导出熔断步骤
export { CircuitBreakerStep } from './steps/CircuitBreakerStep';
export type { CircuitBreakerStepOptions } from './steps/CircuitBreakerStep';

// 导出策略实现
export {
  DefaultStateTransitionStrategy,
  DefaultErrorClassificationStrategy,
  DefaultSuccessEvaluationStrategy,
} from './strategies';

// 导出类型
export type * from './types';

// 导出常量
export {
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  NETWORK_ERROR_CODES,
  NETWORK_ERROR_KEYWORDS,
} from './constants';

