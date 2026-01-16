/**
 * RequestStep 和 composeSteps 测试
 */

import { describe, expect, it } from 'vitest';
import type { NormalizedRequestConfig } from '../../context/RequestContext';
import { createRequestContext, type RequestContext } from '../../context/RequestContext';
import { composeSteps, type RequestStep } from '../../steps/RequestStep';

describe('composeSteps', () => {
  it('应该处理空步骤数组', async () => {
    const composed = composeSteps([]);
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext(config);

    await composed(ctx);

    // 应该正常完成，不抛出错误
    expect(ctx).toBeDefined();
  });

  it('应该按顺序执行步骤', async () => {
    const executionOrder: number[] = [];

    class Step1 implements RequestStep {
      async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
        executionOrder.push(1);
        await next();
        executionOrder.push(1);
      }
    }

    class Step2 implements RequestStep {
      async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
        executionOrder.push(2);
        await next();
        executionOrder.push(2);
      }
    }

    class Step3 implements RequestStep {
      async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
        executionOrder.push(3);
        await next();
        executionOrder.push(3);
      }
    }

    const composed = composeSteps([new Step1(), new Step2(), new Step3()]);
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext(config);

    await composed(ctx);

    // 执行顺序应该是：1 -> 2 -> 3 -> 3 -> 2 -> 1（洋葱模型）
    expect(executionOrder).toEqual([1, 2, 3, 3, 2, 1]);
  });

  it('应该支持步骤修改上下文', async () => {
    class ModifyStep implements RequestStep {
      async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
        ctx.meta.modified = true;
        await next();
        ctx.meta.afterNext = true;
      }
    }

    const composed = composeSteps([new ModifyStep()]);
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext(config);

    await composed(ctx);

    expect(ctx.meta.modified).toBe(true);
    expect(ctx.meta.afterNext).toBe(true);
  });

  it('应该支持步骤设置结果', async () => {
    class SetResultStep implements RequestStep {
      async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
        ctx.result = { data: 'test' } as T;
        // 不调用 next，直接返回
      }
    }

    const composed = composeSteps([new SetResultStep()]);
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext<{ data: string }>(config);

    await composed(ctx);

    expect(ctx.result).toEqual({ data: 'test' });
  });

  it('应该支持步骤设置错误', async () => {
    class SetErrorStep implements RequestStep {
      async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
        ctx.error = new Error('Test error');
        // 不调用 next，直接返回
      }
    }

    const composed = composeSteps([new SetErrorStep()]);
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext(config);

    await composed(ctx);

    expect(ctx.error).toBeInstanceOf(Error);
    expect((ctx.error as Error).message).toBe('Test error');
  });

  it('应该支持步骤抛出错误', async () => {
    class ThrowErrorStep implements RequestStep {
      async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
        throw new Error('Step error');
      }
    }

    const composed = composeSteps([new ThrowErrorStep()]);
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext(config);

    await expect(composed(ctx)).rejects.toThrow('Step error');
  });

  it('应该支持步骤捕获并处理错误', async () => {
    class ErrorHandlingStep implements RequestStep {
      async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
        try {
          await next();
        } catch (error) {
          ctx.error = error;
          // 不重新抛出，而是设置到上下文中
        }
      }
    }

    class ThrowErrorStep implements RequestStep {
      async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
        throw new Error('Inner error');
      }
    }

    const composed = composeSteps([new ErrorHandlingStep(), new ThrowErrorStep()]);
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext(config);

    await composed(ctx);

    expect(ctx.error).toBeInstanceOf(Error);
    expect((ctx.error as Error).message).toBe('Inner error');
  });

  it('应该在取消时停止执行后续步骤', async () => {
    const executionOrder: number[] = [];

    class Step1 implements RequestStep {
      async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
        executionOrder.push(1);
        ctx.state.aborted = true;
        await next();
        executionOrder.push(1);
      }
    }

    class Step2 implements RequestStep {
      async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
        executionOrder.push(2);
        await next();
        executionOrder.push(2);
      }
    }

    const composed = composeSteps([new Step1(), new Step2()]);
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext(config);

    await composed(ctx);

    // Step1 设置 aborted 后，Step2 不应该执行
    expect(executionOrder).toEqual([1, 1]);
  });

  it('应该支持异步操作', async () => {
    class AsyncStep implements RequestStep {
      async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
        await new Promise(resolve => setTimeout(resolve, 10));
        ctx.meta.asyncCompleted = true;
        await next();
      }
    }

    const composed = composeSteps([new AsyncStep()]);
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext(config);

    await composed(ctx);

    expect(ctx.meta.asyncCompleted).toBe(true);
  });

  it('应该支持多个步骤共享上下文', async () => {
    class Step1 implements RequestStep {
      async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
        ctx.meta.step1 = 'value1';
        await next();
      }
    }

    class Step2 implements RequestStep {
      async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
        ctx.meta.step2 = 'value2';
        ctx.meta.step1Value = ctx.meta.step1;
        await next();
      }
    }

    const composed = composeSteps([new Step1(), new Step2()]);
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext(config);

    await composed(ctx);

    expect(ctx.meta.step1).toBe('value1');
    expect(ctx.meta.step2).toBe('value2');
    expect(ctx.meta.step1Value).toBe('value1');
  });
});

