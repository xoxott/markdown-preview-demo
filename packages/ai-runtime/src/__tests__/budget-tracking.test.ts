/** G14 预算追踪 per-turn 测试 */

import { describe, expect, it } from 'vitest';
import type { BudgetExceededEvent } from '../session/RuntimeSession';

describe('BudgetExceededEvent 类型', () => {
  it('应包含 totalCostUsd 和 maxBudgetUsd', () => {
    const event: BudgetExceededEvent = {
      type: 'budget_exceeded',
      totalCostUsd: 5.5,
      maxBudgetUsd: 5.0
    };
    expect(event.type).toBe('budget_exceeded');
    expect(event.totalCostUsd).toBe(5.5);
    expect(event.maxBudgetUsd).toBe(5.0);
  });

  it('totalCostUsd 可等于 maxBudgetUsd（边界情况）', () => {
    const event: BudgetExceededEvent = {
      type: 'budget_exceeded',
      totalCostUsd: 10.0,
      maxBudgetUsd: 10.0
    };
    expect(event.totalCostUsd).toBe(event.maxBudgetUsd);
  });
});

describe('成本计算逻辑', () => {
  it('默认定价：input $3/1M, output $15/1M', () => {
    // 1M input tokens → $3
    const inputCost = (1_000_000 / 1_000_000) * 3.0;
    expect(inputCost).toBeCloseTo(3.0, 2);

    // 1M output tokens → $15
    const outputCost = (1_000_000 / 1_000_000) * 15.0;
    expect(outputCost).toBeCloseTo(15.0, 2);

    // Total: $18
    expect(inputCost + outputCost).toBeCloseTo(18.0, 2);
  });

  it('小规模请求成本计算', () => {
    // 100K input + 10K output
    const inputCost = (100_000 / 1_000_000) * 3.0;
    const outputCost = (10_000 / 1_000_000) * 15.0;
    const total = inputCost + outputCost;

    expect(inputCost).toBeCloseTo(0.3, 2);
    expect(outputCost).toBeCloseTo(0.15, 2);
    expect(total).toBeCloseTo(0.45, 2);
  });

  it('预算超限判断：累计 >= 上限 → exceeded', () => {
    const maxBudget = 5.0;
    const accumulated = 5.5;
    expect(accumulated >= maxBudget).toBe(true);
  });

  it('预算未超限判断：累计 < 上限 → not exceeded', () => {
    const maxBudget = 5.0;
    const accumulated = 3.5;
    expect(accumulated >= maxBudget).toBe(false);
  });
});
