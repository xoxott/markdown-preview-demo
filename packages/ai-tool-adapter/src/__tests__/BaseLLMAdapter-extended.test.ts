/** BaseLLMAdapter 扩展测试 — 宿主注入方法（UsageTracker/LifecycleHook/RetryConfig） */

import { describe, expect, it, vi } from 'vitest';
import type { LLMStreamChunk, ToolDefinition } from '@suga/ai-agent-loop';
import type { AnyBuiltTool } from '@suga/ai-tool-core';
import type { LLMRetryConfig } from '../retry/retry-strategy';
import type { LLMRequestLifecycleHook } from '../lifecycle/request-lifecycle';
import { InMemoryUsageTracker } from '../lifecycle/UsageTrackerImpl';
import { BaseLLMAdapter } from '../adapter/BaseLLMAdapter';
import type { BaseLLMAdapterConfig } from '../types/adapter';

/** 测试用具体 Adapter 子类 */
class TestAdapter extends BaseLLMAdapter {
  async *callModel(
    _messages: readonly any[],
    _tools?: readonly ToolDefinition[],
    _signal?: AbortSignal
  ): AsyncGenerator<LLMStreamChunk> {
    yield { textDelta: 'hello', done: false };
    yield { done: true };
  }

  formatToolDefinition(tool: AnyBuiltTool): ToolDefinition {
    return { name: tool.name, description: 'test', inputSchema: {} };
  }
}

const testConfig: BaseLLMAdapterConfig = {
  baseURL: 'https://api.example.com',
  apiKey: 'test-key',
  model: 'test-model'
};

describe('BaseLLMAdapter 扩展 — 宿主注入', () => {
  it('setUsageTracker → 注入追踪器', () => {
    const adapter = new TestAdapter(testConfig);
    const tracker = new InMemoryUsageTracker();
    adapter.setUsageTracker(tracker);
    // 子类可通过 getUsageTracker() 使用
    expect(adapter.getUsageTracker()).toBe(tracker);
  });

  it('setLifecycleHook → 注入钩子', () => {
    const adapter = new TestAdapter(testConfig);
    const hook: LLMRequestLifecycleHook = {
      beforeRequest: vi.fn()
    };
    adapter.setLifecycleHook(hook);
    expect(adapter.getLifecycleHook()).toBe(hook);
  });

  it('setRetryConfig → 注入重试配置', () => {
    const adapter = new TestAdapter(testConfig);
    const config: LLMRetryConfig = { maxRetries: 5, initialDelayMs: 200 };
    adapter.setRetryConfig(config);
    expect(adapter.getRetryConfig()).toBe(config);
  });

  it('未注入 → getter 返回 undefined', () => {
    const adapter = new TestAdapter(testConfig);
    expect(adapter.getUsageTracker()).toBeUndefined();
    expect(adapter.getLifecycleHook()).toBeUndefined();
    expect(adapter.getRetryConfig()).toBeUndefined();
  });

  it('替换注入 → 新值覆盖旧值', () => {
    const adapter = new TestAdapter(testConfig);
    const tracker1 = new InMemoryUsageTracker();
    const tracker2 = new InMemoryUsageTracker();
    adapter.setUsageTracker(tracker1);
    adapter.setUsageTracker(tracker2);
    expect(adapter.getUsageTracker()).toBe(tracker2);
  });

  it('callModel → 正常产出 LLMStreamChunk', async () => {
    const adapter = new TestAdapter(testConfig);
    const chunks: LLMStreamChunk[] = [];
    for await (const chunk of adapter.callModel([])) {
      chunks.push(chunk);
    }
    expect(chunks.length).toBe(2);
    expect(chunks[0].textDelta).toBe('hello');
    expect(chunks[1].done).toBe(true);
  });

  it('formatToolDefinition → 返回 ToolDefinition', () => {
    const adapter = new TestAdapter(testConfig);
    // buildTool 需要 Schema, 这里用 mock 验证注入链
    const result = adapter.formatToolDefinition({
      name: 'test-tool',
      description: 'A test tool'
    } as unknown as AnyBuiltTool);
    expect(result.name).toBe('test-tool');
  });
});
