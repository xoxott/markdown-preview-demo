/**
 * 状态控制器
 */

import type { StateTransitionStrategy } from '../types';
import { CircuitBreakerState } from '../types';
import { Metrics } from './Metrics';

/**
 * 状态控制器类
 */
export class StateController {
  constructor(
    private metrics: Metrics,
    private strategy: StateTransitionStrategy,
    private failureThreshold: number,
    private timeout: number,
    private successThreshold: number,
  ) {}

  advanceState(currentTime: number): CircuitBreakerState {
    const data = this.metrics.getInternalData();
    let newState = data.state;

    if (data.state === CircuitBreakerState.OPEN) {
      if (this.strategy.shouldHalfOpen(data.lastFailureTime, this.timeout, currentTime)) {
        newState = CircuitBreakerState.HALF_OPEN;
        this.metrics.resetSuccesses();
      }
    } else if (data.state === CircuitBreakerState.HALF_OPEN) {
      if (this.strategy.shouldClose(data.successes, this.successThreshold)) {
        newState = CircuitBreakerState.CLOSED;
        this.metrics.resetFailures();
        this.metrics.resetSuccesses();
      }
    } else if (data.state === CircuitBreakerState.CLOSED) {
      if (this.strategy.shouldOpen(data.failures, this.failureThreshold)) {
        newState = CircuitBreakerState.OPEN;
      }
    }

    if (newState !== data.state) {
      this.metrics.setState(newState);
    }

    return newState;
  }

  handleFailureAfterHalfOpen(): void {
    const data = this.metrics.getInternalData();
    if (data.state === CircuitBreakerState.HALF_OPEN) {
      this.metrics.setState(CircuitBreakerState.OPEN);
      this.metrics.resetSuccesses();
    }
  }
}

