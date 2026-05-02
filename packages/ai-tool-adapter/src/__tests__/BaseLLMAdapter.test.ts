/** BaseLLMAdapter 测试 — fetchWithAbort 基础设施 */

import { describe, expect, it, vi } from 'vitest';
import type { LLMStreamChunk, ToolDefinition } from '@suga/ai-agent-loop';
import type { AnyBuiltTool } from '@suga/ai-tool-core';
import { BaseLLMAdapter } from '../adapter/BaseLLMAdapter';
import type { BaseLLMAdapterConfig } from '../types/adapter';

/** 测试用具体适配器（实现抽象方法） */
class TestAdapter extends BaseLLMAdapter {
  async *callModel(
    _messages?: readonly any[],
    _tools?: readonly ToolDefinition[],
    _options?: import('@suga/ai-agent-loop').CallModelOptions
  ): AsyncGenerator<LLMStreamChunk> {
    yield { done: true };
  }

  formatToolDefinition(tool: AnyBuiltTool): ToolDefinition {
    return { name: tool.name, description: 'test', inputSchema: {} };
  }
}

/** 默认测试配置 */
function createTestConfig(): BaseLLMAdapterConfig {
  return {
    baseURL: 'https://test.api',
    apiKey: 'test-key',
    model: 'test-model'
  };
}

describe('BaseLLMAdapter', () => {
  describe('构造', () => {
    it('应正确保存配置', () => {
      const config = createTestConfig();
      const adapter = new TestAdapter(config);

      expect(adapter).toBeDefined();
    });
  });

  describe('fetchWithAbort', () => {
    it('应发送 POST 请求到指定 URL', async () => {
      const config = createTestConfig();
      const adapter = new TestAdapter(config);

      // Mock fetch
      const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
      const originalFetch = global.fetch;
      global.fetch = mockFetch as any;

      await (adapter as any).fetchWithAbort('https://test.api/v1/messages', { model: 'test' });

      expect(mockFetch).toHaveBeenCalledOnce();
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toBe('https://test.api/v1/messages');
      expect(callArgs[1].method).toBe('POST');

      global.fetch = originalFetch;
    });

    it('应包含 Content-Type 和自定义请求头', async () => {
      const config: BaseLLMAdapterConfig = {
        ...createTestConfig(),
        customHeaders: { 'X-Custom': 'value' }
      };
      const adapter = new TestAdapter(config);

      const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
      const originalFetch = global.fetch;
      global.fetch = mockFetch as any;

      await (adapter as any).fetchWithAbort('https://test.api/v1/messages', {}, undefined, {
        'x-api-key': 'key'
      });

      const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>;
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['X-Custom']).toBe('value');
      expect(headers['x-api-key']).toBe('key');

      global.fetch = originalFetch;
    });

    it('外部 signal 已中断 → 抛出 AbortError', async () => {
      const config = createTestConfig();
      const adapter = new TestAdapter(config);

      const abortController = new AbortController();
      abortController.abort();

      try {
        await (adapter as any).fetchWithAbort(
          'https://test.api/v1/messages',
          {},
          abortController.signal
        );
        expect.unreachable('应抛出 AbortError');
      } catch (err) {
        expect(err instanceof DOMException).toBe(true);
        expect((err as DOMException).name).toBe('AbortError');
      }
    });

    it('应序列化请求体为 JSON', async () => {
      const config = createTestConfig();
      const adapter = new TestAdapter(config);

      const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
      const originalFetch = global.fetch;
      global.fetch = mockFetch as any;

      const body = { model: 'claude', stream: true };
      await (adapter as any).fetchWithAbort('https://test.api/v1/messages', body);

      const callBody = mockFetch.mock.calls[0][1].body;
      expect(callBody).toBe(JSON.stringify(body));

      global.fetch = originalFetch;
    });
  });
});
