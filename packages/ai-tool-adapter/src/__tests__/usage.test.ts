/** 用量追踪接口 + InMemoryUsageTracker + detectOverage 测试 */

import { describe, expect, it } from 'vitest';
import type { LLMUsageInfo, LLMUsageSummary } from '../types/usage';
import {
  InMemoryUsageTracker,
  detectOverage,
  emptyUsageSummary
} from '../lifecycle/UsageTrackerImpl';

describe('LLMUsageInfo', () => {
  it('基本用量 → inputTokens + outputTokens', () => {
    const usage: LLMUsageInfo = { inputTokens: 100, outputTokens: 50 };
    expect(usage.inputTokens).toBe(100);
    expect(usage.outputTokens).toBe(50);
  });

  it('含缓存信息 → cacheCreation + cacheRead', () => {
    const usage: LLMUsageInfo = {
      inputTokens: 1000,
      outputTokens: 200,
      cacheCreationInputTokens: 300,
      cacheReadInputTokens: 700
    };
    expect(usage.cacheCreationInputTokens).toBe(300);
    expect(usage.cacheReadInputTokens).toBe(700);
  });

  it('含服务端工具用量 → serverToolUseInputTokens', () => {
    const usage: LLMUsageInfo = {
      inputTokens: 500,
      outputTokens: 100,
      serverToolUseInputTokens: 50
    };
    expect(usage.serverToolUseInputTokens).toBe(50);
  });
});

describe('InMemoryUsageTracker', () => {
  it('初始状态 → 空统计', () => {
    const tracker = new InMemoryUsageTracker();
    const summary = tracker.getUsageSummary();
    expect(summary.totalInputTokens).toBe(0);
    expect(summary.totalOutputTokens).toBe(0);
    expect(summary.apiCallCount).toBe(0);
  });

  it('trackUsage → 累加 token 数', () => {
    const tracker = new InMemoryUsageTracker();
    tracker.trackUsage({ inputTokens: 100, outputTokens: 50 });
    tracker.trackUsage({ inputTokens: 200, outputTokens: 80 });
    const summary = tracker.getUsageSummary();
    expect(summary.totalInputTokens).toBe(300);
    expect(summary.totalOutputTokens).toBe(130);
    expect(summary.apiCallCount).toBe(2);
  });

  it('trackUsage → 累加缓存 token', () => {
    const tracker = new InMemoryUsageTracker();
    tracker.trackUsage({
      inputTokens: 1000,
      outputTokens: 200,
      cacheCreationInputTokens: 300,
      cacheReadInputTokens: 700
    });
    const summary = tracker.getUsageSummary();
    expect(summary.totalCacheCreationTokens).toBe(300);
    expect(summary.totalCacheReadTokens).toBe(700);
  });

  it('trackUsage → 缺失缓存字段视为 0', () => {
    const tracker = new InMemoryUsageTracker();
    tracker.trackUsage({ inputTokens: 100, outputTokens: 50 });
    const summary = tracker.getUsageSummary();
    expect(summary.totalCacheCreationTokens).toBe(0);
    expect(summary.totalCacheReadTokens).toBe(0);
  });

  it('isOverBudget → 输入溢出', () => {
    const tracker = new InMemoryUsageTracker();
    tracker.trackUsage({ inputTokens: 2000, outputTokens: 100 });
    expect(tracker.isOverBudget({ maxInputTokens: 1000 })).toBe(true);
  });

  it('isOverBudget → 未溢出', () => {
    const tracker = new InMemoryUsageTracker();
    tracker.trackUsage({ inputTokens: 500, outputTokens: 100 });
    expect(tracker.isOverBudget({ maxInputTokens: 1000 })).toBe(false);
  });

  it('reset → 清空追踪数据', () => {
    const tracker = new InMemoryUsageTracker();
    tracker.trackUsage({ inputTokens: 100, outputTokens: 50 });
    tracker.reset();
    const summary = tracker.getUsageSummary();
    expect(summary.totalInputTokens).toBe(0);
    expect(summary.apiCallCount).toBe(0);
  });
});

describe('detectOverage', () => {
  it('输入 token 溢出 → compact 建议', () => {
    const usage: LLMUsageSummary = {
      totalInputTokens: 2000,
      totalOutputTokens: 100,
      totalCacheCreationTokens: 0,
      totalCacheReadTokens: 0,
      apiCallCount: 1
    };
    const result = detectOverage(usage, { maxInputTokens: 1000 });
    expect(result.isOverage).toBe(true);
    expect(result.overageType).toBe('input');
    expect(result.overageTokens).toBe(1000);
    expect(result.recommendedAction).toBe('compact');
  });

  it('输出 token 溢出 → reduce_output 建议', () => {
    const usage: LLMUsageSummary = {
      totalInputTokens: 100,
      totalOutputTokens: 5000,
      totalCacheCreationTokens: 0,
      totalCacheReadTokens: 0,
      apiCallCount: 1
    };
    const result = detectOverage(usage, { maxOutputTokens: 1000 });
    expect(result.isOverage).toBe(true);
    expect(result.overageType).toBe('output');
    expect(result.overageTokens).toBe(4000);
    expect(result.recommendedAction).toBe('reduce_output');
  });

  it('总 token 溢出 → stop 建议', () => {
    const usage: LLMUsageSummary = {
      totalInputTokens: 5000,
      totalOutputTokens: 5000,
      totalCacheCreationTokens: 0,
      totalCacheReadTokens: 0,
      apiCallCount: 1
    };
    const result = detectOverage(usage, { maxTotalTokens: 8000 });
    expect(result.isOverage).toBe(true);
    expect(result.overageType).toBe('total');
    expect(result.overageTokens).toBe(2000);
    expect(result.recommendedAction).toBe('stop');
  });

  it('未溢出 → isOverage=false', () => {
    const usage: LLMUsageSummary = {
      totalInputTokens: 500,
      totalOutputTokens: 200,
      totalCacheCreationTokens: 0,
      totalCacheReadTokens: 0,
      apiCallCount: 1
    };
    const result = detectOverage(usage, { maxInputTokens: 1000, maxOutputTokens: 500 });
    expect(result.isOverage).toBe(false);
  });

  it('无预算限制 → 未溢出', () => {
    const usage: LLMUsageSummary = {
      totalInputTokens: 999999,
      totalOutputTokens: 999999,
      totalCacheCreationTokens: 0,
      totalCacheReadTokens: 0,
      apiCallCount: 1
    };
    const result = detectOverage(usage, {});
    expect(result.isOverage).toBe(false);
  });

  it('优先级：输入溢出优先于输出溢出', () => {
    const usage: LLMUsageSummary = {
      totalInputTokens: 2000,
      totalOutputTokens: 2000,
      totalCacheCreationTokens: 0,
      totalCacheReadTokens: 0,
      apiCallCount: 1
    };
    const result = detectOverage(usage, { maxInputTokens: 1000, maxOutputTokens: 1000 });
    expect(result.overageType).toBe('input'); // 输入优先检测
  });

  it('空统计 + 预算限制 → 未溢出', () => {
    const result = detectOverage(emptyUsageSummary(), { maxInputTokens: 1000 });
    expect(result.isOverage).toBe(false);
  });
});
