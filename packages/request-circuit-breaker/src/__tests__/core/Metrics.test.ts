/**
 * Metrics 测试
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { Metrics } from '../../core/Metrics';
import { CircuitBreakerState } from '../../types';

describe('Metrics', () => {
  let metrics: Metrics;

  beforeEach(() => {
    metrics = new Metrics();
  });

  describe('recordFailure', () => {
    it('应该记录失败次数', () => {
      metrics.recordFailure(Date.now());
      const snapshot = metrics.getSnapshot();

      expect(snapshot.failures).toBe(1);
    });

    it('应该更新最后失败时间', () => {
      const timestamp = Date.now();
      metrics.recordFailure(timestamp);
      const snapshot = metrics.getSnapshot();

      expect(snapshot.lastFailureTime).toBe(timestamp);
    });

    it('应该累计失败次数', () => {
      metrics.recordFailure(Date.now());
      metrics.recordFailure(Date.now());
      metrics.recordFailure(Date.now());

      const snapshot = metrics.getSnapshot();
      expect(snapshot.failures).toBe(3);
    });
  });

  describe('recordSuccess', () => {
    it('应该记录成功次数', () => {
      metrics.recordSuccess();
      const snapshot = metrics.getSnapshot();

      expect(snapshot.successes).toBe(1);
    });

    it('应该累计成功次数', () => {
      metrics.recordSuccess();
      metrics.recordSuccess();

      const snapshot = metrics.getSnapshot();
      expect(snapshot.successes).toBe(2);
    });
  });

  describe('resetFailures', () => {
    it('应该重置失败次数', () => {
      metrics.recordFailure(Date.now());
      metrics.recordFailure(Date.now());
      metrics.resetFailures();

      const snapshot = metrics.getSnapshot();
      expect(snapshot.failures).toBe(0);
    });

    it('不应该影响成功次数', () => {
      metrics.recordSuccess();
      metrics.recordFailure(Date.now());
      metrics.resetFailures();

      const snapshot = metrics.getSnapshot();
      expect(snapshot.failures).toBe(0);
      expect(snapshot.successes).toBe(1);
    });
  });

  describe('resetSuccesses', () => {
    it('应该重置成功次数', () => {
      metrics.recordSuccess();
      metrics.recordSuccess();
      metrics.resetSuccesses();

      const snapshot = metrics.getSnapshot();
      expect(snapshot.successes).toBe(0);
    });

    it('不应该影响失败次数', () => {
      metrics.recordFailure(Date.now());
      metrics.recordSuccess();
      metrics.resetSuccesses();

      const snapshot = metrics.getSnapshot();
      expect(snapshot.successes).toBe(0);
      expect(snapshot.failures).toBe(1);
    });
  });

  describe('reset', () => {
    it('应该重置所有指标', () => {
      metrics.recordFailure(Date.now());
      metrics.recordSuccess();
      metrics.setState(CircuitBreakerState.OPEN);
      metrics.reset();

      const snapshot = metrics.getSnapshot();
      expect(snapshot.failures).toBe(0);
      expect(snapshot.successes).toBe(0);
      expect(snapshot.lastFailureTime).toBeNull();
      expect(snapshot.state).toBe(CircuitBreakerState.CLOSED);
    });
  });

  describe('setState', () => {
    it('应该设置状态', () => {
      metrics.setState(CircuitBreakerState.OPEN);
      const snapshot = metrics.getSnapshot();

      expect(snapshot.state).toBe(CircuitBreakerState.OPEN);
    });

    it('应该支持所有状态', () => {
      metrics.setState(CircuitBreakerState.CLOSED);
      expect(metrics.getSnapshot().state).toBe(CircuitBreakerState.CLOSED);

      metrics.setState(CircuitBreakerState.OPEN);
      expect(metrics.getSnapshot().state).toBe(CircuitBreakerState.OPEN);

      metrics.setState(CircuitBreakerState.HALF_OPEN);
      expect(metrics.getSnapshot().state).toBe(CircuitBreakerState.HALF_OPEN);
    });
  });

  describe('getSnapshot', () => {
    it('应该返回只读快照', () => {
      metrics.recordFailure(Date.now());
      metrics.recordSuccess();
      metrics.setState(CircuitBreakerState.OPEN);

      const snapshot = metrics.getSnapshot();
      expect(snapshot.failures).toBe(1);
      expect(snapshot.successes).toBe(1);
      expect(snapshot.state).toBe(CircuitBreakerState.OPEN);
    });

    it('应该返回独立的快照对象', () => {
      const snapshot1 = metrics.getSnapshot();
      metrics.recordFailure(Date.now());
      const snapshot2 = metrics.getSnapshot();

      expect(snapshot1.failures).toBe(0);
      expect(snapshot2.failures).toBe(1);
    });
  });

  describe('getInternalData', () => {
    it('应该返回内部数据', () => {
      metrics.recordFailure(Date.now());
      metrics.recordSuccess();
      metrics.setState(CircuitBreakerState.OPEN);

      const data = metrics.getInternalData();
      expect(data.failures).toBe(1);
      expect(data.successes).toBe(1);
      expect(data.state).toBe(CircuitBreakerState.OPEN);
    });
  });
});

