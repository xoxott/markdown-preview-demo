import { describe, expect, it } from 'vitest';
import { InMemoryPolicyLimitsCache, checkPolicyLimits } from '../services/policy-limits';
import type { OrganizationPolicyLimits } from '../services/policy-limits';

describe('InMemoryPolicyLimitsCache', () => {
  it('empty cache → null', () => {
    const cache = new InMemoryPolicyLimitsCache();
    expect(cache.get()).toBeNull();
  });

  it('set then get', () => {
    const cache = new InMemoryPolicyLimitsCache();
    cache.set({ fetchedAt: Date.now(), maxBudgetUsd: 5 });
    const result = cache.get();
    expect(result?.maxBudgetUsd).toBe(5);
  });

  it('expired → null', () => {
    const cache = new InMemoryPolicyLimitsCache(0); // 0ms TTL = immediately expired
    cache.set({ fetchedAt: Date.now() });
    expect(cache.get()).toBeNull();
  });

  it('clear resets', () => {
    const cache = new InMemoryPolicyLimitsCache();
    cache.set({ fetchedAt: Date.now() });
    cache.clear();
    expect(cache.get()).toBeNull();
  });
});

describe('checkPolicyLimits', () => {
  it('null limits + failOpen → allowed', () => {
    const result = checkPolicyLimits(null, {});
    expect(result.allowed).toBe(true);
    expect(result.reason).toContain('fail_open');
  });

  it('null limits + failOpen=false → denied', () => {
    const result = checkPolicyLimits(
      null,
      {},
      { enabled: true, pollIntervalMs: 300000, failOpen: false, etagCacheMs: 60000 }
    );
    expect(result.allowed).toBe(false);
  });

  it('model not allowed → denied', () => {
    const limits: OrganizationPolicyLimits = {
      fetchedAt: Date.now(),
      allowedModels: ['claude-opus']
    };
    const result = checkPolicyLimits(limits, { model: 'gpt-4' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('model_not_allowed');
  });

  it('tool blocked → denied', () => {
    const limits: OrganizationPolicyLimits = { fetchedAt: Date.now(), blockedTools: ['rm_rf'] };
    const result = checkPolicyLimits(limits, { toolName: 'rm_rf' });
    expect(result.allowed).toBe(false);
  });

  it('budget exceeded → denied', () => {
    const limits: OrganizationPolicyLimits = { fetchedAt: Date.now(), maxBudgetUsd: 1 };
    const result = checkPolicyLimits(limits, { estimatedCostUsd: 5 });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('budget_exceeded');
  });

  it('all checks pass → allowed', () => {
    const limits: OrganizationPolicyLimits = {
      fetchedAt: Date.now(),
      allowedModels: ['claude-sonnet']
    };
    const result = checkPolicyLimits(limits, { model: 'claude-sonnet' });
    expect(result.allowed).toBe(true);
  });
});
