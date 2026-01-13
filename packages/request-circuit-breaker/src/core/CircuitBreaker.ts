/**
 * 熔断器核心类
 */

import type {
  CircuitBreakerOptions,
  CircuitBreakerMetrics,
  ErrorClassificationStrategy,
  SuccessEvaluationStrategy,
} from '../types';
import { CircuitBreakerState } from '../types';
import { DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../constants';
import {
  DefaultStateTransitionStrategy,
  DefaultErrorClassificationStrategy,
  DefaultSuccessEvaluationStrategy,
} from '../strategies';
import { Metrics } from './Metrics';
import { StateController } from './StateController';
import { ExecutionGuard } from './ExecutionGuard';

/**
 * 熔断器类
 */
export class CircuitBreaker<T = unknown> {
  private readonly metrics: Metrics;
  private readonly stateController: StateController;
  private readonly executionGuard: ExecutionGuard<T>;
  private readonly errorClassificationStrategy: ErrorClassificationStrategy;
  private readonly successEvaluationStrategy: SuccessEvaluationStrategy;
  private readonly enabled: boolean;

  constructor(options: CircuitBreakerOptions<T> = {}) {
    this.enabled = options.enabled ?? DEFAULT_CIRCUIT_BREAKER_CONFIG.DEFAULT_ENABLED;
    this.metrics = new Metrics();
    this.stateController = new StateController(
      this.metrics,
      options.stateTransitionStrategy ?? new DefaultStateTransitionStrategy(),
      options.failureThreshold ?? DEFAULT_CIRCUIT_BREAKER_CONFIG.DEFAULT_FAILURE_THRESHOLD,
      options.timeout ?? DEFAULT_CIRCUIT_BREAKER_CONFIG.DEFAULT_TIMEOUT,
      options.successThreshold ?? DEFAULT_CIRCUIT_BREAKER_CONFIG.DEFAULT_SUCCESS_THRESHOLD,
    );
    this.executionGuard = new ExecutionGuard(this.metrics, options.fallback);
    this.errorClassificationStrategy =
      options.errorClassificationStrategy ?? new DefaultErrorClassificationStrategy();
    this.successEvaluationStrategy =
      options.successEvaluationStrategy ?? new DefaultSuccessEvaluationStrategy();
  }

  /**
   * 执行请求（带熔断保护）
   */
  async execute(requestFn: () => Promise<T>): Promise<T> {
    if (!this.enabled) {
      return requestFn();
    }

    const currentTime = Date.now();
    this.stateController.advanceState(currentTime);

    const fallbackResult = await this.executionGuard.checkExecution();
    if (fallbackResult !== null) {
      return fallbackResult;
    }

    try {
      const result = await requestFn();
      this.onSuccess(result, undefined);
      return result;
    } catch (error) {
      this.onFailure(error, currentTime);
      throw error;
    }
  }

  private onSuccess(result: T, error: unknown | undefined): void {
    const isSuccess = this.successEvaluationStrategy.isSuccess(result, error);
    const snapshot = this.metrics.getSnapshot();

    if (snapshot.state === CircuitBreakerState.HALF_OPEN) {
      if (isSuccess) {
        this.metrics.recordSuccess();
        this.stateController.advanceState(Date.now());
      }
    } else if (snapshot.state === CircuitBreakerState.CLOSED) {
      if (isSuccess) {
        this.metrics.resetFailures();
      }
    }
  }

  private onFailure(error: unknown, timestamp: number): void {
    if (this.errorClassificationStrategy.shouldCountAsFailure(error)) {
      this.metrics.recordFailure(timestamp);

      const snapshot = this.metrics.getSnapshot();
      if (snapshot.state === CircuitBreakerState.HALF_OPEN) {
        this.stateController.handleFailureAfterHalfOpen();
      } else {
        this.stateController.advanceState(timestamp);
      }
    }
  }

  /**
   * 获取当前状态（只读，不会触发状态变更）
   */
  getState(): CircuitBreakerState {
    return this.metrics.getSnapshot().state;
  }

  /**
   * 获取统计信息（只读快照，不会触发状态变更）
   */
  getMetrics(): CircuitBreakerMetrics {
    return this.metrics.getSnapshot();
  }

  /**
   * 重置熔断器
   */
  reset(): void {
    this.metrics.reset();
  }

  /**
   * 手动推进状态（用于测试或外部控制）
   */
  advanceState(): CircuitBreakerState {
    return this.stateController.advanceState(Date.now());
  }
}

