/** OpenAIAdapter 集成测试 — mock fetch 全流程 */

import { z } from 'zod';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildTool } from '@suga/ai-tool-core';
import type { AgentMessage, LLMStreamChunk } from '@suga/ai-agent-loop';
import { createSystemPrompt } from '@suga/ai-agent-loop';
import { OpenAIAdapter } from '../adapter/OpenAIAdapter';
import type { OpenAIAdapterConfig } from '../types/openai';

/** 创建测试配置 */
function createTestConfig(): OpenAIAdapterConfig {
  return {
    baseURL: 'https://api.openai.com',
    apiKey: 'sk-test-key',
    model: 'gpt-4o'
  };
}

/** 创建 OpenAI SSE 流式 Response */
function createOpenAISSEResponse(dataLines: string[]): Response {
  const sseText = dataLines.join('\n');
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(sseText));
      controller.close();
    }
  });

  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' }
  });
}

/** 创建错误 Response */
function createErrorResponse(status: number, body: any): Response {
  return new Response(JSON.stringify(body), { status });
}

/** 辅助：消费所有 chunks */
async function consumeAll(gen: AsyncGenerator<LLMStreamChunk>): Promise<LLMStreamChunk[]> {
  const chunks: LLMStreamChunk[] = [];
  for await (const chunk of gen) {
    chunks.push(chunk);
  }
  return chunks;
}

/** 辅助：创建用户消息 */
function createUserMsg(content: string): AgentMessage {
  return { id: 'u1', role: 'user', content, timestamp: Date.now() };
}

describe('OpenAIAdapter', () => {
  let mockFetch: any;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('formatToolDefinition', () => {
    it('应返回包含 name 和 inputSchema 的 ToolDefinition', () => {
      const tool = buildTool({
        name: 'calc',
        inputSchema: z.object({ a: z.number(), b: z.number() }),
        call: async args => ({ data: args.a + args.b }),
        description: async () => '加法'
      });

      const adapter = new OpenAIAdapter(createTestConfig());
      const result = adapter.formatToolDefinition(tool);

      expect(result.name).toBe('calc');
      expect(result.inputSchema).toBeDefined();
      expect((result.inputSchema as any).type).toBe('object');
    });
  });

  describe('callModel', () => {
    it('纯文本流式响应 → textDelta chunks + done', async () => {
      mockFetch.mockResolvedValue(
        createOpenAISSEResponse([
          'data: {"id":"chatcmpl-1","choices":[{"index":0,"delta":{"role":"assistant","content":"Hi"}}]}',
          '',
          'data: {"id":"chatcmpl-1","choices":[{"index":0,"delta":{"content":" there"}}]}',
          '',
          'data: {"id":"chatcmpl-1","choices":[{"index":0,"finish_reason":"stop"}]}',
          '',
          'data: [DONE]',
          ''
        ])
      );

      const adapter = new OpenAIAdapter(createTestConfig());
      const chunks = await consumeAll(adapter.callModel([createUserMsg('hi')]));

      expect(chunks.some(c => c.textDelta === 'Hi')).toBe(true);
      expect(chunks.some(c => c.textDelta === ' there')).toBe(true);
      expect(chunks.some(c => c.done === true)).toBe(true);
    });

    it('API 错误 → 抛出映射错误', async () => {
      mockFetch.mockResolvedValue(
        createErrorResponse(401, {
          error: {
            message: 'Invalid API key',
            type: 'invalid_request_error',
            code: 'invalid_api_key'
          }
        })
      );

      const adapter = new OpenAIAdapter(createTestConfig());

      try {
        await consumeAll(adapter.callModel([createUserMsg('hi')]));
        expect.unreachable('应抛出错误');
      } catch (err) {
        expect((err as Error).message).toContain('认证失败');
      }
    });

    it('应设置正确的请求头（Authorization Bearer）', async () => {
      mockFetch.mockResolvedValue(
        createOpenAISSEResponse([
          'data: {"choices":[{"delta":{"content":"Hi"}}]}',
          '',
          'data: {"choices":[{"finish_reason":"stop"}]}',
          '',
          'data: [DONE]',
          ''
        ])
      );

      const adapter = new OpenAIAdapter(createTestConfig());
      await consumeAll(adapter.callModel([createUserMsg('hi')]));

      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1].headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer sk-test-key');
    });

    it('organization → OpenAI-Organization header', async () => {
      const config: OpenAIAdapterConfig = {
        ...createTestConfig(),
        organization: 'org-xxx'
      };

      mockFetch.mockResolvedValue(
        createOpenAISSEResponse([
          'data: {"choices":[{"delta":{"content":"Hi"}}]}',
          '',
          'data: [DONE]',
          ''
        ])
      );

      const adapter = new OpenAIAdapter(config);
      await consumeAll(adapter.callModel([createUserMsg('hi')]));

      const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>;
      expect(headers['OpenAI-Organization']).toBe('org-xxx');
    });

    it('请求体应包含 stream: true + stream_options', async () => {
      mockFetch.mockResolvedValue(
        createOpenAISSEResponse([
          'data: {"choices":[{"delta":{"content":"Hi"}}]}',
          '',
          'data: [DONE]',
          ''
        ])
      );

      const adapter = new OpenAIAdapter(createTestConfig());
      await consumeAll(adapter.callModel([createUserMsg('hi')]));

      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(body.stream).toBe(true);
      expect(body.stream_options).toEqual({ include_usage: true });
    });

    it('带系统提示 → system role 消息', async () => {
      mockFetch.mockResolvedValue(
        createOpenAISSEResponse([
          'data: {"choices":[{"delta":{"content":"Hi"}}]}',
          '',
          'data: [DONE]',
          ''
        ])
      );

      const prompt = createSystemPrompt(['You are a helpful assistant.']);
      const adapter = new OpenAIAdapter(createTestConfig());
      await consumeAll(
        adapter.callModel([createUserMsg('hi')], undefined, { systemPrompt: prompt })
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(body.messages[0].role).toBe('system');
      expect(body.messages[0].content).toBe('You are a helpful assistant.');
      expect(body.messages[1].role).toBe('user');
    });

    it('自定义 baseURL → 发送到指定 URL', async () => {
      const config: OpenAIAdapterConfig = {
        ...createTestConfig(),
        baseURL: 'https://my-proxy.local'
      };

      mockFetch.mockResolvedValue(
        createOpenAISSEResponse([
          'data: {"choices":[{"delta":{"content":"Hi"}}]}',
          '',
          'data: [DONE]',
          ''
        ])
      );

      const adapter = new OpenAIAdapter(config);
      await consumeAll(adapter.callModel([createUserMsg('hi')]));

      const url = mockFetch.mock.calls[0][0];
      expect(url).toBe('https://my-proxy.local/v1/chat/completions');
    });

    it('工具定义 → tools 字段包含 OpenAI 格式', async () => {
      mockFetch.mockResolvedValue(
        createOpenAISSEResponse([
          'data: {"choices":[{"delta":{"content":"Hi"}}]}',
          '',
          'data: [DONE]',
          ''
        ])
      );

      const adapter = new OpenAIAdapter(createTestConfig());
      const toolDef = adapter.formatToolDefinition(
        buildTool({
          name: 'calc',
          inputSchema: z.object({ a: z.number() }),
          call: async args => ({ data: args.a }),
          description: async () => '计算'
        })
      );

      await consumeAll(adapter.callModel([createUserMsg('hi')], [toolDef]));

      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(body.tools).toBeDefined();
      expect(body.tools.length).toBe(1);
      expect(body.tools[0].type).toBe('function');
      expect(body.tools[0].function.name).toBe('calc');
    });
  });

  describe('RetryContext.maxTokensOverride', () => {
    it('覆盖 max_tokens', async () => {
      mockFetch.mockResolvedValue(
        createOpenAISSEResponse([
          'data: {"choices":[{"delta":{"content":"Hi"}}]}',
          '',
          'data: [DONE]',
          ''
        ])
      );

      const adapter = new OpenAIAdapter(createTestConfig());
      adapter.setRetryContext({ maxTokensOverride: 8192 });

      await consumeAll(adapter.callModel([createUserMsg('hi')]));

      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(body.max_tokens).toBe(8192);
    });

    it('无 override → 使用配置默认值', async () => {
      const config: OpenAIAdapterConfig = {
        ...createTestConfig(),
        maxTokens: 2048
      };

      mockFetch.mockResolvedValue(
        createOpenAISSEResponse([
          'data: {"choices":[{"delta":{"content":"Hi"}}]}',
          '',
          'data: [DONE]',
          ''
        ])
      );

      const adapter = new OpenAIAdapter(config);

      await consumeAll(adapter.callModel([createUserMsg('hi')]));

      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(body.max_tokens).toBe(2048);
    });
  });
});
