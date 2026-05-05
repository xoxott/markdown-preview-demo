/** P87 测试 — 非流式 callModelOnce 模式（Anthropic + OpenAI 双路径） */

import { describe, expect, it, vi } from 'vitest';
import type {
  AgentMessage,
  CallModelOptions,
  LLMStreamChunk,
  ToolDefinition
} from '@suga/ai-agent-loop';
import { createSystemPrompt } from '@suga/ai-agent-loop';
import { AnthropicAdapter } from '../adapter/AnthropicAdapter';
import { OpenAIAdapter } from '../adapter/OpenAIAdapter';
import { BaseLLMAdapter } from '../adapter/BaseLLMAdapter';

// ============================================================
// Helper: Mock fetch for non-stream response
// ============================================================

/** 创建 Anthropic 非流式 JSON 响应 */
function mockAnthropicNonStreamResponse(options: {
  content?: string;
  thinking?: string;
  toolUses?: { id: string; name: string; input: Record<string, unknown> }[];
  stopReason?: string;
  usage?: { input_tokens: number; output_tokens: number };
}): string {
  const blocks: Record<string, unknown>[] = [];
  if (options.thinking) {
    blocks.push({ type: 'thinking', thinking: options.thinking });
  }
  if (options.content) {
    blocks.push({ type: 'text', text: options.content });
  }
  for (const tu of options.toolUses ?? []) {
    blocks.push({ type: 'tool_use', id: tu.id, name: tu.name, input: tu.input });
  }

  return JSON.stringify({
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    content: blocks,
    model: 'claude-sonnet-4',
    stop_reason: options.stopReason ?? 'end_turn',
    usage: options.usage ?? { input_tokens: 100, output_tokens: 50 }
  });
}

/** 创建 OpenAI 非流式 JSON 响应 */
function mockOpenAINonStreamResponse(options: {
  content?: string | null;
  toolCalls?: { id: string; name: string; arguments: string }[];
  finishReason?: string;
  usage?: Record<string, unknown>;
}): string {
  return JSON.stringify({
    id: 'chatcmpl-test',
    object: 'chat.completion',
    created: Date.now(),
    model: 'gpt-4o',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: options.content ?? null,
          tool_calls: options.toolCalls?.map(tc => ({
            id: tc.id,
            type: 'function',
            function: { name: tc.name, arguments: tc.arguments }
          }))
        },
        finish_reason: options.finishReason ?? 'stop'
      }
    ],
    usage: options.usage ?? { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
  });
}

/** Mock fetch 函数 */
function createMockFetch(responseBody: string, status = 200): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: status < 400,
    status,
    headers: new Headers(),
    text: async () => responseBody,
    json: async () => JSON.parse(responseBody)
  }) as unknown as typeof fetch;
}

// ============================================================
// Anthropic callModelOnce 测试
// ============================================================

describe('AnthropicAdapter.callModelOnce', () => {
  it('纯文本响应 → LLMResponse', async () => {
    const mockBody = mockAnthropicNonStreamResponse({ content: 'Hello!' });
    const adapter = new AnthropicAdapter({
      baseURL: 'https://api.anthropic.com',
      apiKey: 'test-key',
      model: 'claude-sonnet-4'
    });

    // Mock global fetch
    const originalFetch = globalThis.fetch;
    globalThis.fetch = createMockFetch(mockBody);

    const messages: AgentMessage[] = [
      { id: 'u1', role: 'user', content: 'hi', timestamp: Date.now() }
    ];
    const result = await adapter.callModelOnce(messages);

    expect(result.content).toBe('Hello!');
    expect(result.stopReason).toBe('end_turn');
    expect(result.usage?.inputTokens).toBe(100);
    expect(result.usage?.outputTokens).toBe(50);
    expect(result.toolUses).toBeUndefined();
    expect(result.thinking).toBeUndefined();

    globalThis.fetch = originalFetch;
  });

  it('thinking + 文本 → LLMResponse 含 thinking', async () => {
    const mockBody = mockAnthropicNonStreamResponse({
      thinking: '分析用户意图...',
      content: '这是一个好的问题',
      stopReason: 'end_turn'
    });
    const adapter = new AnthropicAdapter({
      baseURL: 'https://api.anthropic.com',
      apiKey: 'test-key',
      model: 'claude-sonnet-4',
      thinking: { type: 'enabled', budget_tokens: 10000 }
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = createMockFetch(mockBody);

    const result = await adapter.callModelOnce([
      { id: 'u1', role: 'user', content: '分析一下', timestamp: Date.now() }
    ]);

    expect(result.thinking).toBe('分析用户意图...');
    expect(result.content).toBe('这是一个好的问题');

    globalThis.fetch = originalFetch;
  });

  it('tool_use 响应 → LLMResponse 含 toolUses', async () => {
    const mockBody = mockAnthropicNonStreamResponse({
      content: '正在搜索工具',
      toolUses: [{ id: 'tu1', name: 'tool-search', input: { query: 'bash' } }],
      stopReason: 'tool_use'
    });
    const adapter = new AnthropicAdapter({
      baseURL: 'https://api.anthropic.com',
      apiKey: 'test-key',
      model: 'claude-sonnet-4'
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = createMockFetch(mockBody);

    const result = await adapter.callModelOnce([
      { id: 'u1', role: 'user', content: '执行命令', timestamp: Date.now() }
    ]);

    expect(result.toolUses).toHaveLength(1);
    expect(result.toolUses![0].name).toBe('tool-search');
    expect(result.toolUses![0].id).toBe('tu1');
    expect(result.stopReason).toBe('tool_use');

    globalThis.fetch = originalFetch;
  });

  it('systemPrompt → system role 消息', async () => {
    const mockBody = mockAnthropicNonStreamResponse({ content: 'OK' });
    const adapter = new AnthropicAdapter({
      baseURL: 'https://api.anthropic.com',
      apiKey: 'test-key',
      model: 'claude-sonnet-4'
    });

    const originalFetch = globalThis.fetch;
    const mockFetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: async () => mockBody,
      json: async () => JSON.parse(mockBody)
    });
    globalThis.fetch = mockFetchFn as unknown as typeof fetch;

    const systemPrompt = createSystemPrompt(['You are helpful']);
    const result = await adapter.callModelOnce(
      [{ id: 'u1', role: 'user', content: 'test', timestamp: Date.now() }],
      undefined,
      { systemPrompt }
    );

    expect(result.content).toBe('OK');

    // 验证请求体中有 system 字段
    const callOptions = (mockFetchFn.mock.calls[0] as unknown[])[1] as Record<string, unknown>;
    const callBody = JSON.parse(callOptions.body as string);
    expect(callBody.system).toBeDefined();
    expect(callBody.stream).toBe(false);

    globalThis.fetch = originalFetch;
  });

  it('API 错误 → 映射错误', async () => {
    const adapter = new AnthropicAdapter({
      baseURL: 'https://api.anthropic.com',
      apiKey: 'bad-key',
      model: 'claude-sonnet-4'
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers(),
      text: async () =>
        JSON.stringify({
          type: 'error',
          error: { type: 'authentication_error', message: 'invalid api key' }
        })
    }) as unknown as typeof fetch;

    try {
      await adapter.callModelOnce([
        { id: 'u1', role: 'user', content: 'test', timestamp: Date.now() }
      ]);
      expect.unreachable('Should throw');
    } catch (e) {
      expect((e as Error).message).toContain('认证失败');
    }

    globalThis.fetch = originalFetch;
  });

  it('stream:false 请求体验证', async () => {
    const mockBody = mockAnthropicNonStreamResponse({ content: 'OK' });
    const adapter = new AnthropicAdapter({
      baseURL: 'https://api.anthropic.com',
      apiKey: 'test-key',
      model: 'claude-sonnet-4'
    });

    const originalFetch = globalThis.fetch;
    const mockFetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: async () => mockBody,
      json: async () => JSON.parse(mockBody)
    });
    globalThis.fetch = mockFetchFn as unknown as typeof fetch;

    await adapter.callModelOnce([
      { id: 'u1', role: 'user', content: 'test', timestamp: Date.now() }
    ]);

    const callOptions = (mockFetchFn.mock.calls[0] as unknown[])[1] as Record<string, unknown>;
    const callBody = JSON.parse(callOptions.body as string);
    expect(callBody.stream).toBe(false);
    expect(callBody.model).toBe('claude-sonnet-4');
    expect(callBody.max_tokens).toBe(4096);

    globalThis.fetch = originalFetch;
  });
});

// ============================================================
// OpenAI callModelOnce 测试
// ============================================================

describe('OpenAIAdapter.callModelOnce', () => {
  it('纯文本响应 → LLMResponse', async () => {
    const mockBody = mockOpenAINonStreamResponse({ content: 'Hi there!' });
    const adapter = new OpenAIAdapter({
      baseURL: 'https://api.openai.com',
      apiKey: 'test-key',
      model: 'gpt-4o'
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = createMockFetch(mockBody);

    const result = await adapter.callModelOnce([
      { id: 'u1', role: 'user', content: 'hello', timestamp: Date.now() }
    ]);

    expect(result.content).toBe('Hi there!');
    expect(result.stopReason).toBe('stop');
    expect(result.usage?.inputTokens).toBe(100);
    expect(result.usage?.outputTokens).toBe(50);
    expect(result.toolUses).toBeUndefined();

    globalThis.fetch = originalFetch;
  });

  it('tool_calls 响应 → LLMResponse 含 toolUses', async () => {
    const mockBody = mockOpenAINonStreamResponse({
      content: null,
      toolCalls: [
        { id: 'call_1', name: 'get_weather', arguments: JSON.stringify({ city: 'Tokyo' }) }
      ],
      finishReason: 'tool_calls'
    });
    const adapter = new OpenAIAdapter({
      baseURL: 'https://api.openai.com',
      apiKey: 'test-key',
      model: 'gpt-4o'
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = createMockFetch(mockBody);

    const result = await adapter.callModelOnce([
      { id: 'u1', role: 'user', content: 'Tokyo weather', timestamp: Date.now() }
    ]);

    expect(result.content).toBe('');
    expect(result.toolUses).toHaveLength(1);
    expect(result.toolUses![0].name).toBe('get_weather');
    expect(result.toolUses![0].input).toEqual({ city: 'Tokyo' });
    expect(result.stopReason).toBe('tool_calls');

    globalThis.fetch = originalFetch;
  });

  it('cached_tokens → cacheReadInputTokens', async () => {
    const mockBody = mockOpenAINonStreamResponse({
      content: 'OK',
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
        cached_tokens: 80
      }
    });
    // 需要包含 prompt_tokens_details
    const parsed = JSON.parse(mockBody);
    parsed.usage.prompt_tokens_details = { cached_tokens: 80 };
    const body = JSON.stringify(parsed);

    const adapter = new OpenAIAdapter({
      baseURL: 'https://api.openai.com',
      apiKey: 'test-key',
      model: 'gpt-4o'
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = createMockFetch(body);

    const result = await adapter.callModelOnce([
      { id: 'u1', role: 'user', content: 'test', timestamp: Date.now() }
    ]);

    expect(result.usage?.cacheReadInputTokens).toBe(80);

    globalThis.fetch = originalFetch;
  });

  it('systemPrompt → system role 消息', async () => {
    const mockBody = mockOpenAINonStreamResponse({ content: 'OK' });
    const adapter = new OpenAIAdapter({
      baseURL: 'https://api.openai.com',
      apiKey: 'test-key',
      model: 'gpt-4o'
    });

    const originalFetch = globalThis.fetch;
    const mockFetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: async () => mockBody,
      json: async () => JSON.parse(mockBody)
    });
    globalThis.fetch = mockFetchFn as unknown as typeof fetch;

    const systemPrompt = createSystemPrompt(['You are helpful']);
    const result = await adapter.callModelOnce(
      [{ id: 'u1', role: 'user', content: 'test', timestamp: Date.now() }],
      undefined,
      { systemPrompt }
    );

    expect(result.content).toBe('OK');

    // 验证请求体中有 system role 消息且 stream:false
    const callOptions = (mockFetchFn.mock.calls[0] as unknown[])[1] as Record<string, unknown>;
    const callBody = JSON.parse(callOptions.body as string);
    expect(callBody.messages[0].role).toBe('system');
    expect(callBody.stream).toBe(false);

    globalThis.fetch = originalFetch;
  });

  it('API 错误 → 映射错误', async () => {
    const adapter = new OpenAIAdapter({
      baseURL: 'https://api.openai.com',
      apiKey: 'bad-key',
      model: 'gpt-4o'
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers(),
      text: async () =>
        JSON.stringify({ error: { message: 'rate limit', type: 'rate_limit_error' } })
    }) as unknown as typeof fetch;

    try {
      await adapter.callModelOnce([
        { id: 'u1', role: 'user', content: 'test', timestamp: Date.now() }
      ]);
      expect.unreachable('Should throw');
    } catch (e) {
      expect((e as Error).message).toContain('频率限制');
    }

    globalThis.fetch = originalFetch;
  });
});

// ============================================================
// BaseLLMAdapter.callModelOnce 默认实现测试
// ============================================================

describe('BaseLLMAdapter.callModelOnce 默认实现', () => {
  it('消费流式输出 → 组装 LLMResponse', async () => {
    // 使用一个简化测试类
    class TestAdapter extends BaseLLMAdapter {
      formatToolDefinition(tool: import('@suga/ai-tool-core').AnyBuiltTool): ToolDefinition {
        return { name: tool.name, description: 'mock', inputSchema: {} };
      }

      async *callModel(
        _messages: readonly AgentMessage[],
        _tools?: readonly ToolDefinition[],
        _options?: CallModelOptions
      ): AsyncGenerator<LLMStreamChunk> {
        yield { textDelta: 'Hel', done: false };
        yield { textDelta: 'lo!', done: false };
        yield {
          usage: { inputTokens: 100, outputTokens: 3 },
          stopReason: 'end_turn',
          done: true
        };
      }
    }

    const adapter = new TestAdapter({
      baseURL: 'https://test',
      apiKey: 'test',
      model: 'test'
    });

    const result = await adapter.callModelOnce([
      { id: 'u1', role: 'user', content: 'hi', timestamp: Date.now() }
    ]);

    expect(result.content).toBe('Hello!');
    expect(result.usage?.inputTokens).toBe(100);
    expect(result.stopReason).toBe('end_turn');
  });
});
