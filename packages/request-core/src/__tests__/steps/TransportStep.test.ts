/**
 * TransportStep 测试
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { NormalizedRequestConfig } from '../../context/RequestContext';
import { createRequestContext } from '../../context/RequestContext';
import { TransportStep } from '../../steps/TransportStep';
import type { TransportResponse } from '../../transport/Transport';
import { MockTransport } from '../mocks/MockTransport';

describe('TransportStep', () => {
  let mockTransport: MockTransport;

  beforeEach(() => {
    mockTransport = new MockTransport();
  });

  it('应该调用 Transport 执行请求', async () => {
    const step = new TransportStep(mockTransport);
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };

    const responseData = { id: 1, name: 'John' };
    mockTransport.setDefaultResponse(responseData, 200);

    const ctx = createRequestContext<typeof responseData>(config);

    const next = async (): Promise<void> => {
      // 不做任何事
    };

    await step.execute(ctx, next);

    expect(ctx.result).toEqual(responseData);
    expect(ctx.error).toBeUndefined();
    expect(mockTransport.getRequestHistory()).toHaveLength(1);
    expect(mockTransport.getRequestHistory()[0]).toEqual(config);
  });

  it('应该在请求成功时设置 result', async () => {
    const step = new TransportStep(mockTransport);
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };

    const responseData = [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }];
    mockTransport.setDefaultResponse(responseData, 200);

    const ctx = createRequestContext<typeof responseData>(config);

    const next = async (): Promise<void> => {
      // 不做任何事
    };

    await step.execute(ctx, next);

    expect(ctx.result).toEqual(responseData);
    expect(ctx.error).toBeUndefined();
  });

  it('应该在请求失败时设置 error 并抛出', async () => {
    const step = new TransportStep(mockTransport);
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };

    const error = new Error('Network error');
    mockTransport.setShouldFail(true, error);

    const ctx = createRequestContext(config);

    const next = async (): Promise<void> => {
      // 不做任何事
    };

    await expect(step.execute(ctx, next)).rejects.toThrow('Network error');
    expect(ctx.error).toBe(error);
  });

  it('应该在已取消时不执行请求', async () => {
    const step = new TransportStep(mockTransport);
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };

    const ctx = createRequestContext(config);
    ctx.state.aborted = true;

    const next = async (): Promise<void> => {
      // 不做任何事
    };

    await step.execute(ctx, next);

    // Transport 不应该被调用
    expect(mockTransport.getRequestHistory()).toHaveLength(0);
    expect(ctx.result).toBeUndefined();
  });

  it('应该传递正确的配置给 Transport', async () => {
    const step = new TransportStep(mockTransport);
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token',
      },
      data: { name: 'John' },
      baseURL: 'https://api.example.com',
      timeout: 5000,
    };

    mockTransport.setDefaultResponse({ success: true }, 201);

    const ctx = createRequestContext(config);

    const next = async (): Promise<void> => {
      // 不做任何事
    };

    await step.execute(ctx, next);

    const requestHistory = mockTransport.getRequestHistory();
    expect(requestHistory).toHaveLength(1);
    expect(requestHistory[0]).toEqual(config);
  });

  it('应该处理不同的响应状态码', async () => {
    const step = new TransportStep(mockTransport);
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };

    mockTransport.setDefaultResponse({ message: 'Created' }, 201);

    const ctx = createRequestContext(config);

    const next = async (): Promise<void> => {
      // 不做任何事
    };

    await step.execute(ctx, next);

    expect(ctx.result).toEqual({ message: 'Created' });
  });

  it('应该清除之前的错误当请求成功时', async () => {
    const step = new TransportStep(mockTransport);
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };

    const ctx = createRequestContext(config);
    ctx.error = new Error('Previous error');

    mockTransport.setDefaultResponse({ success: true }, 200);

    const next = async (): Promise<void> => {
      // 不做任何事
    };

    await step.execute(ctx, next);

    expect(ctx.result).toEqual({ success: true });
    expect(ctx.error).toBeUndefined();
  });

  it('应该处理 Transport 返回的响应对象', async () => {
    const step = new TransportStep(mockTransport);
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };

    const response: TransportResponse<{ id: number }> = {
      data: { id: 123 },
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      config,
    };

    mockTransport.setResponse('GET:/api/users', response);

    const ctx = createRequestContext<{ id: number }>(config);

    const next = async (): Promise<void> => {
      // 不做任何事
    };

    await step.execute(ctx, next);

    expect(ctx.result).toEqual({ id: 123 });
  });
});

