/** 请求生命周期钩子测试 */

import { describe, expect, it, vi } from 'vitest';
import type {
  LLMRequestContext,
  LLMRequestLifecycleHook,
  LLMResponseContext
} from '../lifecycle/request-lifecycle';
import { composeLifecycleHooks } from '../lifecycle/request-lifecycle';
import type { LLMUsageInfo } from '../types/usage';

const baseRequest: LLMRequestContext = {
  requestId: 'req-1',
  model: 'claude-sonnet-4',
  messageCount: 5,
  toolCount: 3,
  startTime: Date.now()
};

const baseUsage: LLMUsageInfo = { inputTokens: 100, outputTokens: 50 };

describe('LLMRequestContext', () => {
  it('构建请求上下文', () => {
    expect(baseRequest.requestId).toBe('req-1');
    expect(baseRequest.model).toBe('claude-sonnet-4');
    expect(baseRequest.messageCount).toBe(5);
    expect(baseRequest.toolCount).toBe(3);
  });

  it('构建响应上下文 — 成功', () => {
    const response: LLMResponseContext = {
      request: baseRequest,
      endTime: Date.now() + 1000,
      durationMs: 1000,
      usage: baseUsage,
      success: true
    };
    expect(response.success).toBe(true);
    expect(response.durationMs).toBe(1000);
  });

  it('构建响应上下文 — 失败', () => {
    const response: LLMResponseContext = {
      request: baseRequest,
      endTime: Date.now() + 200,
      durationMs: 200,
      success: false,
      error: new Error('rate limited'),
      statusCode: 429
    };
    expect(response.success).toBe(false);
    expect(response.statusCode).toBe(429);
  });
});

describe('composeLifecycleHooks', () => {
  it('空列表 → 返回空钩子', () => {
    const composed = composeLifecycleHooks([]);
    expect(composed.beforeRequest).toBeUndefined();
    expect(composed.afterRequest).toBeUndefined();
  });

  it('单个钩子 → 返回原钩子', () => {
    const hook: LLMRequestLifecycleHook = { beforeRequest: vi.fn() };
    const composed = composeLifecycleHooks([hook]);
    expect(composed).toBe(hook);
  });

  it('多个钩子 → beforeRequest 按顺序执行', async () => {
    const order: string[] = [];
    const hook1: LLMRequestLifecycleHook = {
      beforeRequest: async () => {
        order.push('1');
      }
    };
    const hook2: LLMRequestLifecycleHook = {
      beforeRequest: async () => {
        order.push('2');
      }
    };
    const composed = composeLifecycleHooks([hook1, hook2]);
    await composed.beforeRequest!(baseRequest);
    expect(order).toEqual(['1', '2']);
  });

  it('多个钩子 → afterRequest 按顺序执行', async () => {
    const order: string[] = [];
    const response: LLMResponseContext = {
      request: baseRequest,
      endTime: 0,
      durationMs: 0,
      success: true
    };
    const hook1: LLMRequestLifecycleHook = {
      afterRequest: async () => {
        order.push('1');
      }
    };
    const hook2: LLMRequestLifecycleHook = {
      afterRequest: async () => {
        order.push('2');
      }
    };
    const composed = composeLifecycleHooks([hook1, hook2]);
    await composed.afterRequest!(response);
    expect(order).toEqual(['1', '2']);
  });

  it('钩子错误 → 不阻断后续', async () => {
    const order: string[] = [];
    const hook1: LLMRequestLifecycleHook = {
      beforeRequest: async () => {
        throw new Error('fail');
      }
    };
    const hook2: LLMRequestLifecycleHook = {
      beforeRequest: async () => {
        order.push('2');
      }
    };
    const composed = composeLifecycleHooks([hook1, hook2]);
    await composed.beforeRequest!(baseRequest);
    expect(order).toEqual(['2']); // hook1 错误不影响 hook2
  });

  it('onRetry → 传递所有参数', async () => {
    const onRetryFn = vi.fn();
    const hook: LLMRequestLifecycleHook = { onRetry: onRetryFn };
    const composed = composeLifecycleHooks([hook]);
    await composed.onRetry!(baseRequest, 1, new Error('rate limit'), 2000);
    expect(onRetryFn).toHaveBeenCalledWith(baseRequest, 1, expect.any(Error), 2000);
  });

  it('onError → 传递响应上下文', async () => {
    const onErrorFn = vi.fn();
    const response: LLMResponseContext = {
      request: baseRequest,
      endTime: 0,
      durationMs: 0,
      success: false,
      error: new Error('fail'),
      statusCode: 429
    };
    const hook: LLMRequestLifecycleHook = { onError: onErrorFn };
    const composed = composeLifecycleHooks([hook]);
    await composed.onError!(response);
    expect(onErrorFn).toHaveBeenCalledWith(response);
  });

  it('仅部分钩子有方法 → 正常组合', async () => {
    const order: string[] = [];
    const hook1: LLMRequestLifecycleHook = {
      beforeRequest: async () => {
        order.push('before-1');
      }
    }; // 仅 beforeRequest
    const hook2: LLMRequestLifecycleHook = {
      afterRequest: async () => {
        order.push('after-2');
      }
    }; // 仅 afterRequest
    const composed = composeLifecycleHooks([hook1, hook2]);
    await composed.beforeRequest!(baseRequest);
    expect(order).toEqual(['before-1']);
  });
});
