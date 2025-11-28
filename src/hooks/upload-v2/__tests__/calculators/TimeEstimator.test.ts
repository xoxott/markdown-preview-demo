/**
 * TimeEstimator 测试
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { TimeEstimator } from '../../calculators/TimeEstimator';

describe('TimeEstimator', () => {
  let estimator: TimeEstimator;

  beforeEach(() => {
    estimator = new TimeEstimator();
  });

  describe('update', () => {
    it('应该计算剩余时间', () => {
      const time = estimator.update(1024 * 1024, 100); // 1MB 剩余，100 KB/s
      expect(time).toBeGreaterThan(0);
      expect(typeof time).toBe('number');
    });

    it('应该处理零剩余大小', () => {
      const time = estimator.update(0, 100);
      expect(time).toBe(0);
    });

    it('应该处理零速度', () => {
      const time1 = estimator.update(1024 * 1024, 100);
      const time2 = estimator.update(1024 * 1024, 0);
      expect(time2).toBeGreaterThanOrEqual(0);
    });

    it('应该处理无效输入', () => {
      expect(estimator.update(-1, 100)).toBe(0);
      expect(estimator.update(1024, Infinity)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getTrend', () => {
    it('应该返回时间变化趋势', () => {
      estimator.update(1024 * 1024, 100);
      estimator.update(512 * 1024, 100);
      const trend = estimator.getTrend();
      expect(['increasing', 'stable', 'decreasing']).toContain(trend);
    });

    it('应该在数据不足时返回 stable', () => {
      expect(estimator.getTrend()).toBe('stable');
    });
  });

  describe('reset', () => {
    it('应该重置估算器', () => {
      estimator.update(1024 * 1024, 100);
      estimator.reset();
      expect(estimator.getTrend()).toBe('stable');
    });
  });
});

