/** P91 测试 — Azure OpenAI + Ollama 适配器 */

import { z } from 'zod';
import { describe, expect, it, vi } from 'vitest';
import type { AgentMessage } from '@suga/ai-agent-loop';
import { buildTool } from '@suga/ai-tool-core';
import { AzureOpenAIAdapter, DEFAULT_AZURE_API_VERSION } from '../adapter/AzureOpenAIAdapter';
import {
  DEFAULT_OLLAMA_BASE_URL,
  DEFAULT_OLLAMA_TIMEOUT,
  OllamaAdapter
} from '../adapter/OllamaAdapter';

/** 辅助：创建 OpenAI-compatible 非流式响应 */
function mockOpenAICompatibleResponse(content: string): string {
  return JSON.stringify({
    id: 'chatcmpl-test',
    object: 'chat.completion',
    created: Date.now(),
    model: 'test-model',
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content },
        finish_reason: 'stop'
      }
    ],
    usage: { prompt_tokens: 50, completion_tokens: 10, total_tokens: 60 }
  });
}

/** 辅助：创建 SSE 流式响应 */
function _mockSSEStreamResponse(textChunks: string[]): string {
  const sseLines: string[] = [];
  for (const chunk of textChunks) {
    sseLines.push(
      `data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }], model: 'test' })}`
    );
  }
  sseLines.push('data: [DONE]');
  return sseLines.join('\n\n');
}

/** Mock fetch */
function _createMockFetch(responseBody: string, status = 200): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: status < 400,
    status,
    headers: new Headers(),
    text: async () => responseBody,
    json: async () => JSON.parse(responseBody),
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(responseBody));
        controller.close();
      }
    })
  }) as unknown as typeof fetch;
}

/** 创建用户消息 */
function createUserMsg(content: string): AgentMessage {
  return { id: 'u1', role: 'user', content, timestamp: Date.now() };
}

// ============================================================
// AzureOpenAIAdapter 测试
// ============================================================

describe('AzureOpenAIAdapter', () => {
  it('默认 Azure API 版本 = 2024-02-01', () => {
    expect(DEFAULT_AZURE_API_VERSION).toBe('2024-02-01');
  });

  it('URL 格式 — Azure endpoint/deployments/chat/completions', async () => {
    const adapter = new AzureOpenAIAdapter({
      endpoint: 'https://my-resource.openai.azure.com',
      apiKey: 'azure-key',
      deployment: 'gpt-4o-deployment'
    });

    const originalFetch = globalThis.fetch;
    const mockFetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: async () => mockOpenAICompatibleResponse('OK'),
      json: async () => JSON.parse(mockOpenAICompatibleResponse('OK'))
    });
    globalThis.fetch = mockFetchFn as unknown as typeof fetch;

    // BaseLLMAdapter 的 callModelOnce 默认实现消费流式输出
    // 但 Azure 的 callModelOnce 使用非流式路径
    const _result = await adapter.callModelOnce([createUserMsg('hi')]);

    // 验证 URL 格式
    const callUrl = (mockFetchFn.mock.calls[0] as unknown[])[0] as string;
    expect(callUrl).toContain('openai/deployments/gpt-4o-deployment/chat/completions');
    expect(callUrl).toContain('api-version=2024-02-01');

    globalThis.fetch = originalFetch;
  });

  it('认证 — api-key header 而非 Authorization', async () => {
    const adapter = new AzureOpenAIAdapter({
      endpoint: 'https://my-resource.openai.azure.com',
      apiKey: 'my-azure-key',
      deployment: 'gpt-4o'
    });

    const originalFetch = globalThis.fetch;
    const mockFetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: async () => mockOpenAICompatibleResponse('OK'),
      json: async () => JSON.parse(mockOpenAICompatibleResponse('OK'))
    });
    globalThis.fetch = mockFetchFn as unknown as typeof fetch;

    await adapter.callModelOnce([createUserMsg('test')]);

    const callOptions = (mockFetchFn.mock.calls[0] as unknown[])[1] as Record<string, unknown>;
    const headers = callOptions.headers as Record<string, string>;
    expect(headers['api-key']).toBe('my-azure-key');
    expect(headers.Authorization).toBeUndefined();

    globalThis.fetch = originalFetch;
  });

  it('自定义 apiVersion → URL 包含指定版本', async () => {
    const adapter = new AzureOpenAIAdapter({
      endpoint: 'https://test.openai.azure.com',
      apiKey: 'key',
      deployment: 'my-deployment',
      apiVersion: '2024-06-01'
    });

    const originalFetch = globalThis.fetch;
    const mockFetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: async () => mockOpenAICompatibleResponse('OK'),
      json: async () => JSON.parse(mockOpenAICompatibleResponse('OK'))
    });
    globalThis.fetch = mockFetchFn as unknown as typeof fetch;

    await adapter.callModelOnce([createUserMsg('test')]);

    const callUrl = (mockFetchFn.mock.calls[0] as unknown[])[0] as string;
    expect(callUrl).toContain('api-version=2024-06-01');

    globalThis.fetch = originalFetch;
  });

  it('formatToolDefinition — 与 OpenAI 格式相同', () => {
    const adapter = new AzureOpenAIAdapter({
      endpoint: 'https://test.openai.azure.com',
      apiKey: 'key',
      deployment: 'gpt-4o'
    });

    const tool = buildTool({
      name: 'test_tool',
      description: 'A test tool',
      inputSchema: z.object({ x: z.number() }),
      handler: async () => ({ result: 'ok' })
    });

    const toolDef = adapter.formatToolDefinition(tool);
    expect(toolDef.name).toBe('test_tool');
    expect(toolDef.inputSchema).toBeDefined();
  });

  it('API 错误 → 映射错误', async () => {
    const adapter = new AzureOpenAIAdapter({
      endpoint: 'https://test.openai.azure.com',
      apiKey: 'bad-key',
      deployment: 'gpt-4o'
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers(),
      text: async () =>
        JSON.stringify({ error: { message: 'Access denied', type: 'authentication_error' } })
    }) as unknown as typeof fetch;

    try {
      await adapter.callModelOnce([createUserMsg('test')]);
      expect.unreachable('Should throw');
    } catch (e) {
      expect((e as Error).message).toContain('认证失败');
    }

    globalThis.fetch = originalFetch;
  });
});

// ============================================================
// OllamaAdapter 测试
// ============================================================

describe('OllamaAdapter', () => {
  it('默认 baseURL = localhost:11434', () => {
    expect(DEFAULT_OLLAMA_BASE_URL).toBe('http://localhost:11434');
  });

  it('默认 timeout = 120s', () => {
    expect(DEFAULT_OLLAMA_TIMEOUT).toBe(120_000);
  });

  it('URL 格式 — /v1/chat/completions', async () => {
    const adapter = new OllamaAdapter({ model: 'llama3' });

    const originalFetch = globalThis.fetch;
    const mockFetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: async () => mockOpenAICompatibleResponse('Hello!'),
      json: async () => JSON.parse(mockOpenAICompatibleResponse('Hello!'))
    });
    globalThis.fetch = mockFetchFn as unknown as typeof fetch;

    await adapter.callModelOnce([createUserMsg('hi')]);

    const callUrl = (mockFetchFn.mock.calls[0] as unknown[])[0] as string;
    expect(callUrl).toBe('http://localhost:11434/v1/chat/completions');

    globalThis.fetch = originalFetch;
  });

  it('无 Authorization header（本地推理无密钥）', async () => {
    const adapter = new OllamaAdapter({ model: 'llama3' });

    const originalFetch = globalThis.fetch;
    const mockFetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: async () => mockOpenAICompatibleResponse('OK'),
      json: async () => JSON.parse(mockOpenAICompatibleResponse('OK'))
    });
    globalThis.fetch = mockFetchFn as unknown as typeof fetch;

    await adapter.callModelOnce([createUserMsg('test')]);

    const callOptions = (mockFetchFn.mock.calls[0] as unknown[])[1] as Record<string, unknown>;
    const headers = callOptions.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
    expect(headers['Content-Type']).toBe('application/json');

    globalThis.fetch = originalFetch;
  });

  it('自定义 baseURL → 发送到指定地址', async () => {
    const adapter = new OllamaAdapter({
      baseURL: 'http://192.168.1.100:11434',
      model: 'mistral'
    });

    const originalFetch = globalThis.fetch;
    const mockFetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: async () => mockOpenAICompatibleResponse('OK'),
      json: async () => JSON.parse(mockOpenAICompatibleResponse('OK'))
    });
    globalThis.fetch = mockFetchFn as unknown as typeof fetch;

    await adapter.callModelOnce([createUserMsg('test')]);

    const callUrl = (mockFetchFn.mock.calls[0] as unknown[])[0] as string;
    expect(callUrl).toBe('http://192.168.1.100:11434/v1/chat/completions');

    globalThis.fetch = originalFetch;
  });

  it('formatToolDefinition — 与 OpenAI 格式相同', () => {
    const adapter = new OllamaAdapter({ model: 'llama3' });

    const tool = buildTool({
      name: 'run_code',
      description: 'Execute code',
      inputSchema: z.object({ lang: z.string() }),
      handler: async () => ({ output: 'done' })
    });

    const toolDef = adapter.formatToolDefinition(tool);
    expect(toolDef.name).toBe('run_code');
    expect(toolDef.inputSchema).toBeDefined();
  });

  it('API 错误 → 映射错误', async () => {
    const adapter = new OllamaAdapter({ model: 'llama3' });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers(),
      text: async () =>
        JSON.stringify({ error: { message: 'model not found', type: 'not_found_error' } })
    }) as unknown as typeof fetch;

    try {
      await adapter.callModelOnce([createUserMsg('test')]);
      expect.unreachable('Should throw');
    } catch (e) {
      expect((e as Error).message).toContain('OpenAI');
    }

    globalThis.fetch = originalFetch;
  });

  it('请求体含 model 字段', async () => {
    const adapter = new OllamaAdapter({ model: 'codellama' });

    const originalFetch = globalThis.fetch;
    const mockFetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: async () => mockOpenAICompatibleResponse('OK'),
      json: async () => JSON.parse(mockOpenAICompatibleResponse('OK'))
    });
    globalThis.fetch = mockFetchFn as unknown as typeof fetch;

    await adapter.callModelOnce([createUserMsg('test')]);

    const callOptions = (mockFetchFn.mock.calls[0] as unknown[])[1] as Record<string, unknown>;
    const callBody = JSON.parse(callOptions.body as string);
    expect(callBody.model).toBe('codellama');

    globalThis.fetch = originalFetch;
  });
});
