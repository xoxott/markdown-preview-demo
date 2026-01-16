/**
 * DefaultSuccessEvaluationStrategy 测试
 */

import { describe, expect, it } from 'vitest';
import { DefaultSuccessEvaluationStrategy } from '../../strategies/success-evaluation';

describe('DefaultSuccessEvaluationStrategy', () => {
  const strategy = new DefaultSuccessEvaluationStrategy();

  describe('isSuccess', () => {
    it('应该在有结果且无错误时返回 true', () => {
      expect(strategy.isSuccess({ id: 1 }, undefined)).toBe(true);
      expect(strategy.isSuccess('success', undefined)).toBe(true);
      expect(strategy.isSuccess(123, undefined)).toBe(true);
    });

    it('应该在无结果时返回 false', () => {
      expect(strategy.isSuccess(undefined, undefined)).toBe(false);
    });

    it('应该在有错误时返回 false', () => {
      expect(strategy.isSuccess({ id: 1 }, new Error('error'))).toBe(false);
      expect(strategy.isSuccess('success', 'error')).toBe(false);
    });

    it('应该在结果和错误都为 undefined 时返回 false', () => {
      expect(strategy.isSuccess(undefined, undefined)).toBe(false);
    });

    it('应该处理 null 结果', () => {
      expect(strategy.isSuccess(null as any, undefined)).toBe(true);
    });

    it('应该处理空字符串结果', () => {
      expect(strategy.isSuccess('', undefined)).toBe(true);
    });

    it('应该处理 0 结果', () => {
      expect(strategy.isSuccess(0, undefined)).toBe(true);
    });

    it('应该处理 false 结果', () => {
      expect(strategy.isSuccess(false, undefined)).toBe(true);
    });
  });
});

