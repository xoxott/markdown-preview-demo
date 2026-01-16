/**
 * PrepareContextStep 测试
 */

import { describe, expect, it } from 'vitest';
import type { NormalizedRequestConfig } from '../../context/RequestContext';
import { createRequestContext } from '../../context/RequestContext';
import { PrepareContextStep } from '../../steps/PrepareContextStep';

describe('PrepareContextStep', () => {
  it('应该执行并调用 next', async () => {
    const step = new PrepareContextStep();
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext(config);

    let nextCalled = false;
    const next = async (): Promise<void> => {
      nextCalled = true;
    };

    await step.execute(ctx, next);

    expect(nextCalled).toBe(true);
  });

  it('应该保持上下文不变', async () => {
    const step = new PrepareContextStep();
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext(config);

    const originalId = ctx.id;
    const originalConfig = ctx.config;
    const originalMeta = { ...ctx.meta };

    const next = async (): Promise<void> => {
      // 不做任何事
    };

    await step.execute(ctx, next);

    expect(ctx.id).toBe(originalId);
    expect(ctx.config).toBe(originalConfig);
    expect(ctx.meta).toEqual(originalMeta);
  });

  it('应该允许后续步骤修改上下文', async () => {
    const step = new PrepareContextStep();
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext(config);

    const next = async (): Promise<void> => {
      ctx.meta.modified = true;
      ctx.result = { data: 'test' };
    };

    await step.execute(ctx, next);

    expect(ctx.meta.modified).toBe(true);
    expect(ctx.result).toEqual({ data: 'test' });
  });
});

