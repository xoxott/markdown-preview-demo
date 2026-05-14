import { describe, expect, it, vi } from 'vitest';
import { createAxiosRequestStack, createFlatRequestFromStack } from '../index';

describe('createAxiosRequestStack', () => {
  it('returns instance, opts, cancel helpers', () => {
    const stack = createAxiosRequestStack<{ ok: boolean }>(
      { baseURL: 'http://example.test' },
      {
        isBackendSuccess: () => true,
        transformBackendResponse: r => r.data
      }
    );

    expect(stack.instance.defaults.baseURL).toBe('http://example.test');
    expect(typeof stack.instance.request).toBe('function');
    expect(typeof stack.cancelRequest).toBe('function');
    expect(typeof stack.cancelAllRequest).toBe('function');
    expect(stack.opts.isBackendSuccess).toBeDefined();
  });
});

describe('createFlatRequestFromStack', () => {
  it('uses custom execute and transformBackendResponse', async () => {
    const stack = createAxiosRequestStack<{ code: number; data: { id: number }; message: string }>(
      {},
      {
        async onRequest(c) {
          return c;
        },
        isBackendSuccess: () => true,
        transformBackendResponse: r => r.data.data,
        onError: () => {}
      }
    );

    const execute = vi.fn().mockResolvedValue({
      data: { code: 200, data: { id: 42 }, message: 'ok' },
      status: 200,
      headers: {},
      config: { responseType: 'json' }
    });

    const flat = createFlatRequestFromStack(stack, execute);
    const res = await flat({ url: '/x', method: 'get' });

    expect(execute).toHaveBeenCalledTimes(1);
    expect(res.error).toBeNull();
    expect(res.data).toEqual({ id: 42 });
  });

  it('runs through axios adapter when execute uses stack.instance.request', async () => {
    const adapter = vi.fn(async config => ({
      data: { code: 200, data: { n: 1 }, message: 'ok' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config
    }));

    const stack = createAxiosRequestStack<{ code: number; data: { n: number }; message: string }>(
      { adapter: adapter as import('axios').AxiosAdapter },
      {
        async onRequest(c) {
          return c;
        },
        isBackendSuccess: res => res.data.code === 200,
        transformBackendResponse: r => r.data.data,
        onError: () => {}
      }
    );

    const flat = createFlatRequestFromStack(stack, c => stack.instance.request(c));
    const res = await flat({ url: '/api/a', method: 'get' });

    expect(adapter).toHaveBeenCalled();
    expect(res.data).toEqual({ n: 1 });
    expect(res.error).toBeNull();
  });
});
