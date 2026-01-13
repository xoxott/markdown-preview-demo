/**
 * 熔断器指标管理
 */

import type { CircuitBreakerMetrics } from '../types';
import { CircuitBreakerState } from '../types';

/**
 * 熔断器指标类
 */
export class Metrics {
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: number | null = null;
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;

  recordFailure(timestamp: number): void {
    this.failures++;
    this.lastFailureTime = timestamp;
  }

  recordSuccess(): void {
    this.successes++;
  }

  resetFailures(): void {
    this.failures = 0;
  }

  resetSuccesses(): void {
    this.successes = 0;
  }

  reset(): void {
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.state = CircuitBreakerState.CLOSED;
  }

  setState(state: CircuitBreakerState): void {
    this.state = state;
  }

  getSnapshot(): CircuitBreakerMetrics {
    return {
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      state: this.state,
    };
  }

  getInternalData(): {
    failures: number;
    successes: number;
    lastFailureTime: number | null;
    state: CircuitBreakerState;
  } {
    return {
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      state: this.state,
    };
  }
}

