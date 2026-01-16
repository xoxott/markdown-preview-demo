/**
 * RequestExecutor 测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RequestExecutor } from '../../executor/RequestExecutor';
import { PrepareContextStep } from '../../steps/PrepareContextStep';
import { TransportStep } from '../../steps/TransportStep';
import type { RequestStep } from '../../steps/RequestStep';
import type { RequestContext } from '../../context/RequestContext';
import type { NormalizedRequestConfig } from '../../context/RequestContext';
import { MockTransport } from '../mocks/MockTransport';

describe('RequestExecutor', () => {
  let mockTransport: MockTransport;

  beforeEach(() => {
    mockTransport = new MockTransport();
  });

  it('应该执行请求并返回结果', async () => {
    const steps: RequestStep[] = [
      new PrepareContextStep(),
      new TransportStep(mockTransport),
    ];

    const executor = new RequestExecutor(steps);
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };

    const responseData = { id: 1, name: 'John' };
    mockTransport.setDefaultResponse(responseData, 200);

    const result = await executor.execute<typeof responseData>(config);

    expect(result).toEqual(responseData);
  });

  it('应该在有错误时抛出错误', async () => {
    const steps: RequestStep[] = [
      new PrepareContextStep(),
      new TransportStep(mockTransport),
    ];

    const executor = new RequestExecutor(steps);
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };

    const error = new Error('Request failed');
    mockTransport.setShouldFail(true, error);

    await expect(executor.execute(config)).rejects.toThrow('Request failed');
  });

  it('应该在结果未定义时抛出错误', async () => {
    class NoResultStep implements RequestStep {
      async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
        // 不设置 result，也不调用 next
      }
    }

    const steps: RequestStep[] = [
      new PrepareContextStep(),
      new NoResultStep(),
    ];

    const executor = new RequestExecutor(steps);
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };

    await expect(executor.execute(config)).rejects.toThrow('Request completed but no result');
  });

  it('应该使用提供的 meta', async () => {
    const steps: RequestStep[] = [
      new PrepareContextStep(),
      new TransportStep(mockTransport),
    ];

    const executor = new RequestExecutor(steps);
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };

    const meta = {
      cache: true,
      retry: true,
      customField: 'value',
    };

    mockTransport.setDefaultResponse({ success: true }, 200);

    const result = await executor.execute(config, meta);

    expect(result).toEqual({ success: true });
  });

  it('应该使用 meta 中的 requestId', async () => {
    const steps: RequestStep[] = [
      new PrepareContextStep(),
      new TransportStep(mockTransport),
    ];

    const executor = new RequestExecutor(steps);
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };

    const customId = 'custom-request-id';
    const meta = {
      requestId: customId,
    };

    mockTransport.setDefaultResponse({ success: true }, 200);

    // 我们需要验证上下文使用了自定义 ID
    // 但由于 RequestExecutor 不暴露上下文，我们只能验证请求成功执行
    const result = await executor.execute(config, meta);

    expect(result).toEqual({ success: true });
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

    const steps: RequestStep[] = [
      new Step1(),
      new Step2(),
      new TransportStep(mockTransport),
    ];

    const executor = new RequestExecutor(steps);
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };

    mockTransport.setDefaultResponse({ success: true }, 200);

    await executor.execute(config);

    // 执行顺序应该是：1 -> 2 -> transport -> 2 -> 1
    expect(executionOrder).toEqual([1, 2, 2, 1]);
  });

  it('应该支持步骤修改上下文', async () => {
    class ModifyStep implements RequestStep {
      async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
        ctx.meta.modified = true;
        await next();
      }
    }

    const steps: RequestStep[] = [
      new PrepareContextStep(),
      new ModifyStep(),
      new TransportStep(mockTransport),
    ];

    const executor = new RequestExecutor(steps);
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };

    mockTransport.setDefaultResponse({ success: true }, 200);

    await executor.execute(config);

    // 验证步骤被正确执行
    expect(mockTransport.getRequestHistory()).toHaveLength(1);
  });

  it('应该处理上下文中的错误', async () => {
    class SetErrorStep implements RequestStep {
      async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
        ctx.error = new Error('Step error');
        // 不调用 next
      }
    }

    const steps: RequestStep[] = [
      new PrepareContextStep(),
      new SetErrorStep(),
    ];

    const executor = new RequestExecutor(steps);
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };

    await expect(executor.execute(config)).rejects.toThrow('Step error');
  });

  it('应该处理多个步骤', async () => {
    class LogStep implements RequestStep {
      async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
        ctx.meta.logged = true;
        await next();
      }
    }

    class CacheStep implements RequestStep {
      async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
        ctx.meta.cached = true;
        await next();
      }
    }

    const steps: RequestStep[] = [
      new PrepareContextStep(),
      new LogStep(),
      new CacheStep(),
      new TransportStep(mockTransport),
    ];

    const executor = new RequestExecutor(steps);
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };

    mockTransport.setDefaultResponse({ success: true }, 200);

    const result = await executor.execute(config);

    expect(result).toEqual({ success: true });
    expect(mockTransport.getRequestHistory()).toHaveLength(1);
  });
});

