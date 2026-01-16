/**
 * RequestClient 测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RequestClient } from '../../client/RequestClient';
import type { RequestStep } from '../../steps/RequestStep';
import type { RequestContext } from '../../context/RequestContext';
import type { NormalizedRequestConfig } from '../../context/RequestContext';
import { MockTransport } from '../mocks/MockTransport';

describe('RequestClient', () => {
  let mockTransport: MockTransport;
  let client: RequestClient;

  beforeEach(() => {
    mockTransport = new MockTransport();
    client = new RequestClient(mockTransport);
  });

  describe('构造函数', () => {
    it('应该创建客户端实例', () => {
      expect(client).toBeInstanceOf(RequestClient);
    });

    it('应该初始化默认步骤', async () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };

      mockTransport.setDefaultResponse({ success: true }, 200);

      const result = await client.request(config);

      expect(result).toEqual({ success: true });
      expect(mockTransport.getRequestHistory()).toHaveLength(1);
    });
  });

  describe('with', () => {
    it('应该链式添加步骤', () => {
      class TestStep implements RequestStep {
        async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
          await next();
        }
      }

      const newClient = client.with(new TestStep());

      expect(newClient).toBe(client);
    });

    it('应该添加步骤到执行链', async () => {
      let stepExecuted = false;

      class TestStep implements RequestStep {
        async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
          stepExecuted = true;
          await next();
        }
      }

      client.with(new TestStep());

      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };

      mockTransport.setDefaultResponse({ success: true }, 200);

      await client.request(config);

      expect(stepExecuted).toBe(true);
    });

    it('应该支持多次链式调用', async () => {
      const executionOrder: number[] = [];

      class Step1 implements RequestStep {
        async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
          executionOrder.push(1);
          await next();
        }
      }

      class Step2 implements RequestStep {
        async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
          executionOrder.push(2);
          await next();
        }
      }

      client.with(new Step1()).with(new Step2());

      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };

      mockTransport.setDefaultResponse({ success: true }, 200);

      await client.request(config);

      // 执行顺序：Step1 -> Step2 -> TransportStep
      expect(executionOrder).toContain(1);
      expect(executionOrder).toContain(2);
    });
  });

  describe('request', () => {
    it('应该执行请求', async () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };

      const responseData = { id: 1, name: 'John' };
      mockTransport.setDefaultResponse(responseData, 200);

      const result = await client.request<typeof responseData>(config);

      expect(result).toEqual(responseData);
    });

    it('应该传递 meta', async () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };

      const meta = {
        cache: true,
        retry: true,
      };

      mockTransport.setDefaultResponse({ success: true }, 200);

      const result = await client.request(config, meta);

      expect(result).toEqual({ success: true });
    });

    it('应该在未初始化时抛出错误', () => {
      const uninitializedClient = new RequestClient(mockTransport);
      // 通过反射破坏 executor
      (uninitializedClient as any).executor = null;

      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };

      expect(() => {
        uninitializedClient.request(config);
      }).toThrow('RequestClient not initialized');
    });
  });

  describe('get', () => {
    it('应该执行 GET 请求', async () => {
      const responseData = [{ id: 1, name: 'John' }];
      mockTransport.setDefaultResponse(responseData, 200);

      const result = await client.get<typeof responseData>('/api/users');

      expect(result).toEqual(responseData);
      expect(mockTransport.getRequestHistory()[0].method).toBe('GET');
      expect(mockTransport.getRequestHistory()[0].url).toBe('/api/users');
    });

    it('应该传递 params', async () => {
      mockTransport.setDefaultResponse({ success: true }, 200);

      await client.get('/api/users', { page: 1, limit: 10 });

      const request = mockTransport.getRequestHistory()[0];
      expect(request.params).toEqual({ page: 1, limit: 10 });
    });

    it('应该传递 config', async () => {
      mockTransport.setDefaultResponse({ success: true }, 200);

      await client.get('/api/users', undefined, {
        headers: { 'Authorization': 'Bearer token' },
        timeout: 5000,
      });

      const request = mockTransport.getRequestHistory()[0];
      expect(request.headers).toEqual({ 'Authorization': 'Bearer token' });
      expect(request.timeout).toBe(5000);
    });

    it('应该传递 meta', async () => {
      mockTransport.setDefaultResponse({ success: true }, 200);

      const meta = { cache: true };
      await client.get('/api/users', undefined, undefined, meta);

      // meta 被传递到上下文中，我们验证请求成功执行
      expect(mockTransport.getRequestHistory()).toHaveLength(1);
    });
  });

  describe('post', () => {
    it('应该执行 POST 请求', async () => {
      const responseData = { id: 1, name: 'John' };
      mockTransport.setDefaultResponse(responseData, 201);

      const result = await client.post<typeof responseData>('/api/users', { name: 'John' });

      expect(result).toEqual(responseData);
      expect(mockTransport.getRequestHistory()[0].method).toBe('POST');
      expect(mockTransport.getRequestHistory()[0].url).toBe('/api/users');
      expect(mockTransport.getRequestHistory()[0].data).toEqual({ name: 'John' });
    });

    it('应该传递 config 和 meta', async () => {
      mockTransport.setDefaultResponse({ success: true }, 201);

      await client.post(
        '/api/users',
        { name: 'John' },
        { headers: { 'Content-Type': 'application/json' } },
        { retry: true },
      );

      const request = mockTransport.getRequestHistory()[0];
      expect(request.method).toBe('POST');
      expect(request.data).toEqual({ name: 'John' });
      expect(request.headers).toEqual({ 'Content-Type': 'application/json' });
    });
  });

  describe('put', () => {
    it('应该执行 PUT 请求', async () => {
      const responseData = { id: 1, name: 'John Updated' };
      mockTransport.setDefaultResponse(responseData, 200);

      const result = await client.put<typeof responseData>('/api/users/1', { name: 'John Updated' });

      expect(result).toEqual(responseData);
      expect(mockTransport.getRequestHistory()[0].method).toBe('PUT');
      expect(mockTransport.getRequestHistory()[0].url).toBe('/api/users/1');
      expect(mockTransport.getRequestHistory()[0].data).toEqual({ name: 'John Updated' });
    });
  });

  describe('delete', () => {
    it('应该执行 DELETE 请求', async () => {
      mockTransport.setDefaultResponse({ success: true }, 200);

      const result = await client.delete('/api/users/1');

      expect(result).toEqual({ success: true });
      expect(mockTransport.getRequestHistory()[0].method).toBe('DELETE');
      expect(mockTransport.getRequestHistory()[0].url).toBe('/api/users/1');
    });

    it('应该传递 config 和 meta', async () => {
      mockTransport.setDefaultResponse({ success: true }, 200);

      await client.delete(
        '/api/users/1',
        { headers: { 'Authorization': 'Bearer token' } },
        { cache: false },
      );

      const request = mockTransport.getRequestHistory()[0];
      expect(request.method).toBe('DELETE');
      expect(request.headers).toEqual({ 'Authorization': 'Bearer token' });
    });
  });

  describe('patch', () => {
    it('应该执行 PATCH 请求', async () => {
      const responseData = { id: 1, name: 'John Patched' };
      mockTransport.setDefaultResponse(responseData, 200);

      const result = await client.patch<typeof responseData>('/api/users/1', { name: 'John Patched' });

      expect(result).toEqual(responseData);
      expect(mockTransport.getRequestHistory()[0].method).toBe('PATCH');
      expect(mockTransport.getRequestHistory()[0].url).toBe('/api/users/1');
      expect(mockTransport.getRequestHistory()[0].data).toEqual({ name: 'John Patched' });
    });
  });

  describe('集成测试', () => {
    it('应该支持完整的请求流程', async () => {
      const executionOrder: string[] = [];

      class LogStep implements RequestStep {
        async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
          executionOrder.push('log-start');
          await next();
          executionOrder.push('log-end');
        }
      }

      class CacheStep implements RequestStep {
        async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
          executionOrder.push('cache');
          await next();
        }
      }

      client.with(new LogStep()).with(new CacheStep());

      mockTransport.setDefaultResponse({ success: true }, 200);

      const result = await client.get('/api/users');

      expect(result).toEqual({ success: true });
      expect(executionOrder.length).toBeGreaterThan(0);
    });

    it('应该处理错误', async () => {
      const error = new Error('Network error');
      mockTransport.setShouldFail(true, error);

      await expect(client.get('/api/users')).rejects.toThrow('Network error');
    });

    it('应该支持类型安全', async () => {
      interface User {
        id: number;
        name: string;
      }

      const user: User = { id: 1, name: 'John' };
      mockTransport.setDefaultResponse(user, 200);

      const result = await client.get<User>('/api/users/1');

      expect(result.id).toBe(1);
      expect(result.name).toBe('John');
    });
  });
});

