/**
 * 状态转换策略实现
 */

import type { StateTransitionStrategy } from '../types';

/**
 * 默认状态转换策略
 * 实现标准的熔断器状态转换逻辑
 */
export class DefaultStateTransitionStrategy implements StateTransitionStrategy {
  shouldOpen(failures: number, failureThreshold: number): boolean {
    return failures >= failureThreshold;
  }

  shouldHalfOpen(lastFailureTime: number | null, timeout: number, currentTime: number): boolean {
    if (!lastFailureTime) return false;
    return currentTime - lastFailureTime >= timeout;
  }

  shouldClose(successes: number, successThreshold: number): boolean {
    return successes >= successThreshold;
  }
}

