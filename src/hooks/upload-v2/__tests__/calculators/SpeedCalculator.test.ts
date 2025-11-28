/**
 * SpeedCalculator 测试
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { SpeedCalculator } from '../../calculators/SpeedCalculator';

describe('SpeedCalculator', () => {
  let calculator: SpeedCalculator;

  beforeEach(() => {
    calculator = new SpeedCalculator();
  });

  describe('addData', () => {
    it('应该添加数据点', () => {
      calculator.addData(1024, 1000);
      expect(calculator.getSpeed()).toBeGreaterThan(0);
    });

    it('应该忽略无效数据', () => {
      calculator.addData(-1, 1000);
      calculator.addData(1024, -1);
      calculator.addData(Infinity, 1000);
      expect(calculator.getSpeed()).toBe(0);
    });
  });

  describe('getSpeed', () => {
    it('应该计算当前速度', () => {
      calculator.addData(1024, 1000);
      const speed = calculator.getSpeed();
      expect(speed).toBeGreaterThan(0);
      expect(typeof speed).toBe('number');
    });

    it('应该在没有数据时返回 0', () => {
      expect(calculator.getSpeed()).toBe(0);
    });
  });

  describe('getAverageSpeed', () => {
    it('应该计算平均速度', () => {
      calculator.addData(1024, 1000);
      calculator.addData(2048, 2000);
      const avgSpeed = calculator.getAverageSpeed();
      expect(avgSpeed).toBeGreaterThan(0);
    });

    it('应该在没有数据时返回 0', () => {
      expect(calculator.getAverageSpeed()).toBe(0);
    });
  });

  describe('reset', () => {
    it('应该重置计算器', () => {
      calculator.addData(1024, 1000);
      calculator.reset();
      expect(calculator.getSpeed()).toBe(0);
      expect(calculator.getAverageSpeed()).toBe(0);
    });
  });
});

