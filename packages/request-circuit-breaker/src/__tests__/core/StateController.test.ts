/**
 * StateController 测试
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { StateController } from '../../core/StateController';
import { Metrics } from '../../core/Metrics';
import { DefaultStateTransitionStrategy } from '../../strategies/state-transition';
import { CircuitBreakerState } from '../../types';

describe('StateController', () => {
  let metrics: Metrics;
  let stateController: StateController;

  beforeEach(() => {
    metrics = new Metrics();
    stateController = new StateController(
      metrics,
      new DefaultStateTransitionStrategy(),
      5, // failureThreshold
      60000, // timeout
      2, // successThreshold
    );
  });

  describe('advanceState', () => {
    it('应该从 CLOSED 转换到 OPEN 当失败次数达到阈值', () => {
      // 记录 5 次失败
      for (let i = 0; i < 5; i++) {
        metrics.recordFailure(Date.now());
      }

      const newState = stateController.advanceState(Date.now());
      expect(newState).toBe(CircuitBreakerState.OPEN);
      expect(metrics.getSnapshot().state).toBe(CircuitBreakerState.OPEN);
    });

    it('应该从 OPEN 转换到 HALF_OPEN 当超时后', () => {
      // 先开启熔断
      for (let i = 0; i < 5; i++) {
        metrics.recordFailure(Date.now());
      }
      stateController.advanceState(Date.now());

      // 等待超时
      const lastFailureTime = metrics.getSnapshot().lastFailureTime!;
      const currentTime = lastFailureTime + 60001; // 超过 60 秒

      const newState = stateController.advanceState(currentTime);
      expect(newState).toBe(CircuitBreakerState.HALF_OPEN);
      expect(metrics.getSnapshot().state).toBe(CircuitBreakerState.HALF_OPEN);
    });

    it('应该从 HALF_OPEN 转换到 CLOSED 当成功次数达到阈值', () => {
      // 先开启熔断并进入半开状态
      for (let i = 0; i < 5; i++) {
        metrics.recordFailure(Date.now());
      }
      stateController.advanceState(Date.now());

      const lastFailureTime = metrics.getSnapshot().lastFailureTime!;
      stateController.advanceState(lastFailureTime + 60001);

      // 记录 2 次成功
      metrics.recordSuccess();
      metrics.recordSuccess();

      const newState = stateController.advanceState(Date.now());
      expect(newState).toBe(CircuitBreakerState.CLOSED);
      expect(metrics.getSnapshot().state).toBe(CircuitBreakerState.CLOSED);
    });

    it('应该在 CLOSED 状态下不转换当失败次数未达到阈值', () => {
      // 记录 4 次失败（未达到阈值 5）
      for (let i = 0; i < 4; i++) {
        metrics.recordFailure(Date.now());
      }

      const newState = stateController.advanceState(Date.now());
      expect(newState).toBe(CircuitBreakerState.CLOSED);
      expect(metrics.getSnapshot().state).toBe(CircuitBreakerState.CLOSED);
    });

    it('应该在 OPEN 状态下不转换当未超时', () => {
      // 先开启熔断
      for (let i = 0; i < 5; i++) {
        metrics.recordFailure(Date.now());
      }
      stateController.advanceState(Date.now());

      // 未超时
      const lastFailureTime = metrics.getSnapshot().lastFailureTime!;
      const currentTime = lastFailureTime + 30000; // 30 秒，未超过 60 秒

      const newState = stateController.advanceState(currentTime);
      expect(newState).toBe(CircuitBreakerState.OPEN);
      expect(metrics.getSnapshot().state).toBe(CircuitBreakerState.OPEN);
    });

    it('应该在 HALF_OPEN 状态下不转换当成功次数未达到阈值', () => {
      // 先开启熔断并进入半开状态
      for (let i = 0; i < 5; i++) {
        metrics.recordFailure(Date.now());
      }
      stateController.advanceState(Date.now());

      const lastFailureTime = metrics.getSnapshot().lastFailureTime!;
      stateController.advanceState(lastFailureTime + 60001);

      // 只记录 1 次成功（未达到阈值 2）
      metrics.recordSuccess();

      const newState = stateController.advanceState(Date.now());
      expect(newState).toBe(CircuitBreakerState.HALF_OPEN);
      expect(metrics.getSnapshot().state).toBe(CircuitBreakerState.HALF_OPEN);
    });

    it('应该在进入 HALF_OPEN 时重置成功次数', () => {
      // 先开启熔断
      for (let i = 0; i < 5; i++) {
        metrics.recordFailure(Date.now());
      }
      stateController.advanceState(Date.now());

      // 记录一些成功（应该被忽略）
      metrics.recordSuccess();
      metrics.recordSuccess();

      // 进入半开状态
      const lastFailureTime = metrics.getSnapshot().lastFailureTime!;
      stateController.advanceState(lastFailureTime + 60001);

      expect(metrics.getSnapshot().successes).toBe(0);
    });

    it('应该在进入 CLOSED 时重置失败和成功次数', () => {
      // 先开启熔断并进入半开状态
      for (let i = 0; i < 5; i++) {
        metrics.recordFailure(Date.now());
      }
      stateController.advanceState(Date.now());

      const lastFailureTime = metrics.getSnapshot().lastFailureTime!;
      stateController.advanceState(lastFailureTime + 60001);

      // 记录成功
      metrics.recordSuccess();
      metrics.recordSuccess();

      stateController.advanceState(Date.now());

      const snapshot = metrics.getSnapshot();
      expect(snapshot.failures).toBe(0);
      expect(snapshot.successes).toBe(0);
    });
  });

  describe('handleFailureAfterHalfOpen', () => {
    it('应该从 HALF_OPEN 转换回 OPEN', () => {
      // 先开启熔断并进入半开状态
      for (let i = 0; i < 5; i++) {
        metrics.recordFailure(Date.now());
      }
      stateController.advanceState(Date.now());

      const lastFailureTime = metrics.getSnapshot().lastFailureTime!;
      stateController.advanceState(lastFailureTime + 60001);

      // 在半开状态下失败
      stateController.handleFailureAfterHalfOpen();

      expect(metrics.getSnapshot().state).toBe(CircuitBreakerState.OPEN);
      expect(metrics.getSnapshot().successes).toBe(0);
    });

    it('应该重置成功次数', () => {
      // 先开启熔断并进入半开状态
      for (let i = 0; i < 5; i++) {
        metrics.recordFailure(Date.now());
      }
      stateController.advanceState(Date.now());

      const lastFailureTime = metrics.getSnapshot().lastFailureTime!;
      stateController.advanceState(lastFailureTime + 60001);

      // 记录一些成功
      metrics.recordSuccess();

      // 失败后应该重置
      stateController.handleFailureAfterHalfOpen();

      expect(metrics.getSnapshot().successes).toBe(0);
    });
  });
});

