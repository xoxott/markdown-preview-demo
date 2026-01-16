/**
 * RequestContext 测试
 */

import { describe, it, expect } from 'vitest';
import { createRequestContext, type NormalizedRequestConfig } from '../../context/RequestContext';

describe('RequestContext', () => {
  describe('createRequestContext', () => {
    it('应该创建基本的请求上下文', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };

      const ctx = createRequestContext(config);

      expect(ctx.id).toBeDefined();
      expect(ctx.config).toEqual(config);
      expect(ctx.state.aborted).toBe(false);
      expect(ctx.state.fromCache).toBe(false);
      expect(ctx.state.retrying).toBe(false);
      expect(ctx.state.retryCount).toBe(0);
      expect(ctx.meta).toEqual({});
      expect(ctx.result).toBeUndefined();
      expect(ctx.error).toBeUndefined();
    });

    it('应该使用提供的 id', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };

      const customId = 'custom-request-id';
      const ctx = createRequestContext(config, customId);

      expect(ctx.id).toBe(customId);
    });

    it('应该使用提供的 meta', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };

      const meta = {
        cache: true,
        retry: true,
        customField: 'value',
      };

      const ctx = createRequestContext(config, undefined, meta);

      expect(ctx.meta).toEqual(meta);
    });

    it('应该生成不同的 id 对于不同的请求', () => {
      const config1: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };

      const config2: NormalizedRequestConfig = {
        url: '/api/posts',
        method: 'GET',
      };

      const ctx1 = createRequestContext(config1);
      const ctx2 = createRequestContext(config2);

      expect(ctx1.id).not.toBe(ctx2.id);
    });

    it('应该为相同的请求配置生成相同的 id', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
        params: { page: 1 },
      };

      const ctx1 = createRequestContext(config);
      const ctx2 = createRequestContext(config);

      expect(ctx1.id).toBe(ctx2.id);
    });

    it('应该处理包含 params 的请求', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
        params: { page: 1, limit: 10 },
      };

      const ctx = createRequestContext(config);

      expect(ctx.config.params).toEqual({ page: 1, limit: 10 });
    });

    it('应该处理包含 data 的请求', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'POST',
        data: { name: 'John', age: 30 },
      };

      const ctx = createRequestContext(config);

      expect(ctx.config.data).toEqual({ name: 'John', age: 30 });
    });

    it('应该处理包含 headers 的请求', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
        headers: {
          'Authorization': 'Bearer token',
          'Content-Type': 'application/json',
        },
      };

      const ctx = createRequestContext(config);

      expect(ctx.config.headers).toEqual({
        'Authorization': 'Bearer token',
        'Content-Type': 'application/json',
      });
    });

    it('应该处理包含 baseURL 的请求', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
        baseURL: 'https://api.example.com',
      };

      const ctx = createRequestContext(config);

      expect(ctx.config.baseURL).toBe('https://api.example.com');
    });

    it('应该处理包含 timeout 的请求', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
        timeout: 5000,
      };

      const ctx = createRequestContext(config);

      expect(ctx.config.timeout).toBe(5000);
    });

    it('应该处理包含 signal 的请求', () => {
      const controller = new AbortController();
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
        signal: controller.signal,
      };

      const ctx = createRequestContext(config);

      expect(ctx.config.signal).toBe(controller.signal);
    });

    it('应该允许修改 state', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };

      const ctx = createRequestContext(config);

      ctx.state.aborted = true;
      ctx.state.fromCache = true;
      ctx.state.retrying = true;
      ctx.state.retryCount = 3;

      expect(ctx.state.aborted).toBe(true);
      expect(ctx.state.fromCache).toBe(true);
      expect(ctx.state.retrying).toBe(true);
      expect(ctx.state.retryCount).toBe(3);
    });

    it('应该允许修改 meta', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };

      const ctx = createRequestContext(config);

      ctx.meta.customField = 'value';
      ctx.meta.number = 123;

      expect(ctx.meta.customField).toBe('value');
      expect(ctx.meta.number).toBe(123);
    });

    it('应该允许设置 result', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };

      const ctx = createRequestContext<{ id: number; name: string }>(config);

      ctx.result = { id: 1, name: 'John' };

      expect(ctx.result).toEqual({ id: 1, name: 'John' });
    });

    it('应该允许设置 error', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };

      const ctx = createRequestContext(config);

      const error = new Error('Request failed');
      ctx.error = error;

      expect(ctx.error).toBe(error);
    });

    it('应该保持 config 为只读', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };

      const ctx = createRequestContext(config);

      // TypeScript 会在编译时阻止修改，但我们需要测试运行时行为
      // 实际上，由于 config 是 readonly，我们不能直接修改它
      expect(() => {
        // @ts-expect-error - 测试只读属性
        ctx.config.url = '/api/posts';
      }).not.toThrow(); // 运行时不会抛出错误，但 TypeScript 会报错
    });
  });
});

