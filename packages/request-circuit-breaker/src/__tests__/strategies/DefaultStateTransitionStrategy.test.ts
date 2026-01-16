/**
 * DefaultStateTransitionStrategy 测试
 */

import { describe, expect, it } from 'vitest';
import { DefaultStateTransitionStrategy } from '../../strategies/state-transition';

describe('DefaultStateTransitionStrategy', () => {
  const strategy = new DefaultStateTransitionStrategy();

  describe('shouldOpen', () => {
    it('应该在失败次数达到阈值时返回 true', () => {
      expect(strategy.shouldOpen(5, 5)).toBe(true);
      expect(strategy.shouldOpen(6, 5)).toBe(true);
    });

    it('应该在失败次数未达到阈值时返回 false', () => {
      expect(strategy.shouldOpen(4, 5)).toBe(false);
      expect(strategy.shouldOpen(0, 5)).toBe(false);
    });
  });

  describe('shouldHalfOpen', () => {
    it('应该在超时后返回 true', () => {
      const lastFailureTime = Date.now() - 60001; // 60 秒前
      const currentTime = Date.now();
      const timeout = 60000; // 60 秒

      expect(strategy.shouldHalfOpen(lastFailureTime, timeout, currentTime)).toBe(true);
    });

    it('应该在未超时时返回 false', () => {
      const lastFailureTime = Date.now() - 30000; // 30 秒前
      const currentTime = Date.now();
      const timeout = 60000; // 60 秒

      expect(strategy.shouldHalfOpen(lastFailureTime, timeout, currentTime)).toBe(false);
    });

    it('应该在 lastFailureTime 为 null 时返回 false', () => {
      const currentTime = Date.now();
      const timeout = 60000;

      expect(strategy.shouldHalfOpen(null, timeout, currentTime)).toBe(false);
    });

    it('应该精确匹配超时时间', () => {
      const lastFailureTime = Date.now() - 60000; // 刚好 60 秒前
      const currentTime = Date.now();
      const timeout = 60000;

      expect(strategy.shouldHalfOpen(lastFailureTime, timeout, currentTime)).toBe(true);
    });
  });

  describe('shouldClose', () => {
    it('应该在成功次数达到阈值时返回 true', () => {
      expect(strategy.shouldClose(2, 2)).toBe(true);
      expect(strategy.shouldClose(3, 2)).toBe(true);
    });

    it('应该在成功次数未达到阈值时返回 false', () => {
      expect(strategy.shouldClose(1, 2)).toBe(false);
      expect(strategy.shouldClose(0, 2)).toBe(false);
    });
  });
});

