/** AnthropicAdapter 集成测试 — mock fetch 全流程 */

import { z } from 'zod';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildTool } from '@suga/ai-tool-core';
import type { AgentMessage, LLMStreamChunk } from '@suga/ai-agent-loop';
import { createSystemPrompt } from '@suga/ai-agent-loop';
import { AnthropicAdapter } from '../adapter/AnthropicAdapter';
import type { AnthropicAdapterConfig } from '../types/anthropic';

/** 创建测试配置 */
function createTestConfig(): AnthropicAdapterConfig {
  return {
    baseURL: 'https://api.anthropic.com',
    apiKey: 'test-api-key',
    model: 'claude-sonnet-4-20250514'
  };
}

/** 创建 SSE 流式 Response */
function createSSEResponse(events: { type: string; data: any }[]): Response {
  const sseLines = events.map(e =>
    [`event: ${e.type}`, `data: ${JSON.stringify(e.data)}`, ''].join('\n')
  );

  const sseText = sseLines.join('\n');
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

describe('AnthropicAdapter', () => {
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

      const adapter = new AnthropicAdapter(createTestConfig());
      const result = adapter.formatToolDefinition(tool);

      expect(result.name).toBe('calc');
      expect(result.inputSchema).toBeDefined();
      expect((result.inputSchema as any).type).toBe('object');
    });
  });

  describe('callModel', () => {
    it('纯文本流式响应 → textDelta chunks + done', async () => {
      mockFetch.mockResolvedValue(
        createSSEResponse([
          { type: 'message_start', data: { type: 'message_start' } },
          {
            type: 'content_block_start',
            data: {
              type: 'content_block_start',
              index: 0,
              content_block: { type: 'text', text: '' }
            }
          },
          {
            type: 'content_block_delta',
            data: {
              type: 'content_block_delta',
              index: 0,
              delta: { type: 'text_delta', text: 'Hi' }
            }
          },
          {
            type: 'content_block_delta',
            data: {
              type: 'content_block_delta',
              index: 0,
              delta: { type: 'text_delta', text: ' there' }
            }
          },
          { type: 'content_block_stop', data: { type: 'content_block_stop', index: 0 } },
          {
            type: 'message_delta',
            data: {
              type: 'message_delta',
              delta: { stop_reason: 'end_turn' },
              usage: { output_tokens: 2 }
            }
          },
          { type: 'message_stop', data: { type: 'message_stop' } }
        ])
      );

      const adapter = new AnthropicAdapter(createTestConfig());
      const chunks = await consumeAll(adapter.callModel([createUserMsg('hi')]));

      expect(chunks.some(c => c.textDelta === 'Hi')).toBe(true);
      expect(chunks.some(c => c.textDelta === ' there')).toBe(true);
      expect(chunks.some(c => c.done === true)).toBe(true);
    });

    it('API 错误 → 抛出映射错误', async () => {
      mockFetch.mockResolvedValue(
        createErrorResponse(401, {
          type: 'error',
          error: { type: 'authentication_error', message: 'invalid key' }
        })
      );

      const adapter = new AnthropicAdapter(createTestConfig());

      try {
        await consumeAll(adapter.callModel([createUserMsg('hi')]));
        expect.unreachable('应抛出错误');
      } catch (err) {
        expect((err as Error).message).toContain('认证失败');
      }
    });

    it('应设置正确的请求头', async () => {
      mockFetch.mockResolvedValue(
        createSSEResponse([
          { type: 'message_start', data: { type: 'message_start' } },
          { type: 'message_stop', data: { type: 'message_stop' } }
        ])
      );

      const adapter = new AnthropicAdapter(createTestConfig());
      await consumeAll(adapter.callModel([createUserMsg('hi')]));

      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1].headers as Record<string, string>;
      expect(headers['x-api-key']).toBe('test-api-key');
      expect(headers['anthropic-version']).toBe('2023-06-01');
    });

    it('自定义 apiVersion → 正确设置请求头', async () => {
      const config: AnthropicAdapterConfig = {
        ...createTestConfig(),
        apiVersion: '2024-01-01'
      };

      mockFetch.mockResolvedValue(
        createSSEResponse([
          { type: 'message_start', data: { type: 'message_start' } },
          { type: 'message_stop', data: { type: 'message_stop' } }
        ])
      );

      const adapter = new AnthropicAdapter(config);
      await consumeAll(adapter.callModel([createUserMsg('hi')]));

      const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>;
      expect(headers['anthropic-version']).toBe('2024-01-01');
    });

    it('请求体应包含 stream: true', async () => {
      mockFetch.mockResolvedValue(
        createSSEResponse([
          { type: 'message_start', data: { type: 'message_start' } },
          { type: 'message_stop', data: { type: 'message_stop' } }
        ])
      );

      const adapter = new AnthropicAdapter(createTestConfig());
      await consumeAll(adapter.callModel([createUserMsg('hi')]));

      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(body.stream).toBe(true);
    });

    it('带系统提示 → 请求体包含 system 字段', async () => {
      const config: AnthropicAdapterConfig = {
        ...createTestConfig(),
        system: '你是助手'
      };

      mockFetch.mockResolvedValue(
        createSSEResponse([
          { type: 'message_start', data: { type: 'message_start' } },
          { type: 'message_stop', data: { type: 'message_stop' } }
        ])
      );

      const adapter = new AnthropicAdapter(config);
      await consumeAll(adapter.callModel([createUserMsg('hi')]));

      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(body.system).toBe('你是助手');
    });

    it('自定义 baseURL → 发送到指定 URL', async () => {
      const config: AnthropicAdapterConfig = {
        ...createTestConfig(),
        baseURL: 'https://my-proxy.local'
      };

      mockFetch.mockResolvedValue(
        createSSEResponse([
          { type: 'message_start', data: { type: 'message_start' } },
          { type: 'message_stop', data: { type: 'message_stop' } }
        ])
      );

      const adapter = new AnthropicAdapter(config);
      await consumeAll(adapter.callModel([createUserMsg('hi')]));

      const url = mockFetch.mock.calls[0][0];
      expect(url).toBe('https://my-proxy.local/v1/messages');
    });
  });

  describe('P35 systemPrompt → Anthropic API system 字段', () => {
    it('多段 systemPrompt → TextBlockParam[] (最后一段带 cache_control)', async () => {
      mockFetch.mockResolvedValue(
        createSSEResponse([
          { type: 'message_start', data: { type: 'message_start' } },
          { type: 'message_stop', data: { type: 'message_stop' } }
        ])
      );

      const prompt = createSystemPrompt(['You are a helpful assistant.', 'Memory: remember X']);
      const adapter = new AnthropicAdapter(createTestConfig());
      await consumeAll(
        adapter.callModel([createUserMsg('hi')], undefined, { systemPrompt: prompt })
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(Array.isArray(body.system)).toBe(true);
      expect(body.system.length).toBe(2);
      expect(body.system[0].type).toBe('text');
      expect(body.system[0].text).toBe('You are a helpful assistant.');
      expect(body.system[0].cache_control).toBeUndefined();
      expect(body.system[1].type).toBe('text');
      expect(body.system[1].text).toBe('Memory: remember X');
      expect(body.system[1].cache_control).toEqual({ type: 'ephemeral' });
    });

    it('单段 systemPrompt → 简化为 string', async () => {
      mockFetch.mockResolvedValue(
        createSSEResponse([
          { type: 'message_start', data: { type: 'message_start' } },
          { type: 'message_stop', data: { type: 'message_stop' } }
        ])
      );

      const prompt = createSystemPrompt(['You are a helpful assistant.']);
      const adapter = new AnthropicAdapter(createTestConfig());
      await consumeAll(
        adapter.callModel([createUserMsg('hi')], undefined, { systemPrompt: prompt })
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(typeof body.system).toBe('string');
      expect(body.system).toBe('You are a helpful assistant.');
    });

    it('不传 systemPrompt → fallback 到 anthropicConfig.system', async () => {
      const config: AnthropicAdapterConfig = {
        ...createTestConfig(),
        system: '你是助手'
      };

      mockFetch.mockResolvedValue(
        createSSEResponse([
          { type: 'message_start', data: { type: 'message_start' } },
          { type: 'message_stop', data: { type: 'message_stop' } }
        ])
      );

      const adapter = new AnthropicAdapter(config);
      await consumeAll(adapter.callModel([createUserMsg('hi')]));

      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(body.system).toBe('你是助手');
    });

    it('传 systemPrompt → 覆盖 anthropicConfig.system', async () => {
      const config: AnthropicAdapterConfig = {
        ...createTestConfig(),
        system: '你是助手'
      };

      mockFetch.mockResolvedValue(
        createSSEResponse([
          { type: 'message_start', data: { type: 'message_start' } },
          { type: 'message_stop', data: { type: 'message_stop' } }
        ])
      );

      const prompt = createSystemPrompt(['Override prompt']);
      const adapter = new AnthropicAdapter(config);
      await consumeAll(
        adapter.callModel([createUserMsg('hi')], undefined, { systemPrompt: prompt })
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(body.system).toBe('Override prompt');
      expect(body.system).not.toBe('你是助手');
    });
  });

  describe('P36 betaFeatures → anthropic-beta header', () => {
    it('betaFeatures.promptCaching=true → 包含 anthropic-beta header', async () => {
      const config: AnthropicAdapterConfig = {
        ...createTestConfig(),
        betaFeatures: { promptCaching: true }
      };

      mockFetch.mockResolvedValue(
        createSSEResponse([
          { type: 'message_start', data: { type: 'message_start' } },
          { type: 'message_stop', data: { type: 'message_stop' } }
        ])
      );

      const adapter = new AnthropicAdapter(config);
      await consumeAll(adapter.callModel([createUserMsg('hi')]));

      const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>;
      expect(headers['anthropic-beta']).toBe('prompt-caching-2024-07-31');
    });

    it('betaFeatures undefined → 不含 anthropic-beta header', async () => {
      mockFetch.mockResolvedValue(
        createSSEResponse([
          { type: 'message_start', data: { type: 'message_start' } },
          { type: 'message_stop', data: { type: 'message_stop' } }
        ])
      );

      const adapter = new AnthropicAdapter(createTestConfig());
      await consumeAll(adapter.callModel([createUserMsg('hi')]));

      const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>;
      expect(headers['anthropic-beta']).toBeUndefined();
    });

    it('betaFeatures.promptCaching=false → 不含 anthropic-beta header', async () => {
      const config: AnthropicAdapterConfig = {
        ...createTestConfig(),
        betaFeatures: { promptCaching: false }
      };

      mockFetch.mockResolvedValue(
        createSSEResponse([
          { type: 'message_start', data: { type: 'message_start' } },
          { type: 'message_stop', data: { type: 'message_stop' } }
        ])
      );

      const adapter = new AnthropicAdapter(config);
      await consumeAll(adapter.callModel([createUserMsg('hi')]));

      const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>;
      expect(headers['anthropic-beta']).toBeUndefined();
    });

    it('多 beta feature → 逗号拼接', async () => {
      const config: AnthropicAdapterConfig = {
        ...createTestConfig(),
        betaFeatures: { promptCaching: true, tokenBatching: true }
      };

      mockFetch.mockResolvedValue(
        createSSEResponse([
          { type: 'message_start', data: { type: 'message_start' } },
          { type: 'message_stop', data: { type: 'message_stop' } }
        ])
      );

      const adapter = new AnthropicAdapter(config);
      await consumeAll(adapter.callModel([createUserMsg('hi')]));

      const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>;
      expect(headers['anthropic-beta']).toContain('prompt-caching-2024-07-31');
      expect(headers['anthropic-beta']).toContain('token-batching-2025-04-01');
      expect(headers['anthropic-beta'].split(',').length).toBe(2);
    });
  });
});
