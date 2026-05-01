/** HttpRunner 测试 */

import { describe, expect, it } from 'vitest';
import { ToolRegistry } from '@suga/ai-tool-core';
import { HttpRunner } from '../runner/HttpRunner';
import type { EnvProvider, HttpClient, HttpPostOptions, HttpResponse } from '../types/runner';
import type { HookDefinition, HookExecutionContext } from '../types/hooks';

/** MockHttpClient — 预设 HTTP 响应 */
class MockHttpClient implements HttpClient {
  private response: HttpResponse = { statusCode: 200, body: { ok: true } };

  setResponse(response: HttpResponse): void {
    this.response = response;
  }

  async post(_url: string, _body: unknown, _options?: HttpPostOptions): Promise<HttpResponse> {
    return this.response;
  }
}

/** MockEnvProvider — 预设环境变量 */
class MockEnvProvider implements EnvProvider {
  private readonly envs = new Map<string, string>();

  setEnv(key: string, value: string): void {
    this.envs.set(key, value);
  }

  getEnv(key: string): string | undefined {
    return this.envs.get(key);
  }
}

/** 创建 HookExecutionContext */
function createContext(): HookExecutionContext {
  return {
    sessionId: 'test-session',
    abortSignal: new AbortController().signal,
    toolRegistry: new ToolRegistry(),
    meta: {}
  };
}

describe('HttpRunner', () => {
  describe('SSRF 防护', () => {
    it('私有 IP 192.168.x 应被阻断', async () => {
      const httpClient = new MockHttpClient();
      const runner = new HttpRunner(httpClient);

      const hook: HookDefinition = {
        name: 'test-ssrf',
        event: 'PreToolUse',
        type: 'http',
        url: 'http://192.168.1.1/api/check',
        matcher: '*'
      };

      const result = await runner.run(hook, {} as any, createContext());
      expect(result.outcome).toBe('blocking');
      expect(result.stopReason).toContain('SSRF');
    });

    it('私有 IP 10.x 应被阻断', async () => {
      const httpClient = new MockHttpClient();
      const runner = new HttpRunner(httpClient);

      const hook: HookDefinition = {
        name: 'test-ssrf-10',
        event: 'PreToolUse',
        type: 'http',
        url: 'http://10.0.0.1/api/check',
        matcher: '*'
      };

      const result = await runner.run(hook, {} as any, createContext());
      expect(result.outcome).toBe('blocking');
    });

    it('公网 IP 应正常执行', async () => {
      const httpClient = new MockHttpClient();
      httpClient.setResponse({ statusCode: 200, body: { ok: true } });
      const runner = new HttpRunner(httpClient);

      const hook: HookDefinition = {
        name: 'test-public',
        event: 'PreToolUse',
        type: 'http',
        url: 'https://api.example.com/check',
        matcher: '*'
      };

      const result = await runner.run(hook, {} as any, createContext());
      expect(result.outcome).toBe('success');
    });
  });

  describe('HTTP 响应映射', () => {
    it('HTTP 200 + body.ok=true → success', async () => {
      const httpClient = new MockHttpClient();
      httpClient.setResponse({ statusCode: 200, body: { ok: true } });
      const runner = new HttpRunner(httpClient);

      const hook: HookDefinition = {
        name: 'test-success',
        event: 'PreToolUse',
        type: 'http',
        url: 'https://api.example.com/check',
        matcher: '*'
      };

      const result = await runner.run(hook, {} as any, createContext());
      expect(result.outcome).toBe('success');
    });

    it('HTTP 200 + body.ok=false → blocking', async () => {
      const httpClient = new MockHttpClient();
      httpClient.setResponse({ statusCode: 200, body: { ok: false, reason: 'unsafe' } });
      const runner = new HttpRunner(httpClient);

      const hook: HookDefinition = {
        name: 'test-block',
        event: 'PreToolUse',
        type: 'http',
        url: 'https://api.example.com/check',
        matcher: '*'
      };

      const result = await runner.run(hook, {} as any, createContext());
      expect(result.outcome).toBe('blocking');
      expect(result.stopReason).toBe('unsafe');
    });

    it('HTTP 500 → non_blocking_error', async () => {
      const httpClient = new MockHttpClient();
      httpClient.setResponse({ statusCode: 500, body: null, error: 'Internal Server Error' });
      const runner = new HttpRunner(httpClient);

      const hook: HookDefinition = {
        name: 'test-error',
        event: 'PreToolUse',
        type: 'http',
        url: 'https://api.example.com/check',
        matcher: '*'
      };

      const result = await runner.run(hook, {} as any, createContext());
      expect(result.outcome).toBe('non_blocking_error');
    });
  });

  describe('Env 变量白名单插值', () => {
    it('白名单内变量应被替换', async () => {
      const httpClient = new MockHttpClient();
      httpClient.setResponse({ statusCode: 200, body: { ok: true } });
      const envProvider = new MockEnvProvider();
      envProvider.setEnv('API_KEY', 'secret123');
      const runner = new HttpRunner(httpClient, undefined, envProvider);

      const hook: HookDefinition = {
        name: 'test-env',
        event: 'PreToolUse',
        type: 'http',
        url: 'https://api.example.com/check',
        allowedEnvVars: ['API_KEY'],
        headers: { Authorization: '${env:API_KEY}' },
        matcher: '*'
      };

      const result = await runner.run(hook, {} as any, createContext());
      expect(result.outcome).toBe('success');
    });

    it('非白名单变量应替换为空字符串', async () => {
      const httpClient = new MockHttpClient();
      httpClient.setResponse({ statusCode: 200, body: { ok: true } });
      const runner = new HttpRunner(httpClient);

      const hook: HookDefinition = {
        name: 'test-env-block',
        event: 'PreToolUse',
        type: 'http',
        url: 'https://api.example.com/check',
        allowedEnvVars: ['SAFE_VAR'],
        headers: { 'X-Secret': '${env:SECRET_KEY}' },
        matcher: '*'
      };

      const result = await runner.run(hook, {} as any, createContext());
      expect(result.outcome).toBe('success');
      // SECRET_KEY 不在白名单 → headers 中被替换为空字符串
    });
  });

  describe('Header 注入防护', () => {
    it('CRLF 注入应被剥离', async () => {
      const httpClient = new MockHttpClient();
      httpClient.setResponse({ statusCode: 200, body: { ok: true } });
      const runner = new HttpRunner(httpClient);

      const hook: HookDefinition = {
        name: 'test-crlf',
        event: 'PreToolUse',
        type: 'http',
        url: 'https://api.example.com/check',
        headers: { 'X-Custom': 'value\r\nInjected: header' },
        matcher: '*'
      };

      const result = await runner.run(hook, {} as any, createContext());
      expect(result.outcome).toBe('success');
      // \r\n 被 sanitizeHeaderValue 剥离
    });
  });
});
