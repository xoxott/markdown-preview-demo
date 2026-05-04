/** chunk-mapper 测试 — Anthropic SSE 事件 → LLMStreamChunk 映射 */

import { describe, expect, it } from 'vitest';
import { mapSSEEventsToChunks } from '../stream/chunk-mapper';
import type { AnthropicSSEEventData } from '../types/anthropic';

describe('mapSSEEventsToChunks', () => {
  it('纯文本流 → text_delta chunks + usage + done', () => {
    const events: AnthropicSSEEventData[] = [
      {
        type: 'message_start',
        message: {
          id: 'msg_1',
          type: 'message',
          role: 'assistant',
          content: [],
          model: 'claude-sonnet-4-20250514',
          stop_reason: null,
          usage: { input_tokens: 100, output_tokens: 0, cache_read_input_tokens: 80 }
        }
      },
      { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
      { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Hello' } },
      { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: ' World' } },
      { type: 'content_block_stop', index: 0 },
      { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 2 } },
      { type: 'message_stop' }
    ];

    const chunks = mapSSEEventsToChunks(events);

    expect(chunks).toHaveLength(5); // message_start usage + 2 text_delta + message_delta usage + done
    expect(chunks[0].usage?.inputTokens).toBe(100);
    expect(chunks[1].textDelta).toBe('Hello');
    expect(chunks[2].textDelta).toBe(' World');
    expect(chunks[3].usage?.outputTokens).toBe(2);
    expect(chunks[3].stopReason).toBe('end_turn');
    expect(chunks[4].done).toBe(true);
  });

  it('思考模式 → thinking_delta chunks', () => {
    const events: AnthropicSSEEventData[] = [
      { type: 'message_start' },
      {
        type: 'content_block_start',
        index: 0,
        content_block: { type: 'thinking', thinking: '' } as any
      },
      {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'thinking_delta', thinking: '思考中...' }
      },
      { type: 'content_block_stop', index: 0 },
      { type: 'content_block_start', index: 1, content_block: { type: 'text', text: '' } },
      { type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: '回答' } },
      { type: 'content_block_stop', index: 1 },
      { type: 'message_stop' }
    ];

    const chunks = mapSSEEventsToChunks(events);

    expect(chunks.some(c => c.thinkingDelta === '思考中...')).toBe(true);
    expect(chunks.some(c => c.textDelta === '回答')).toBe(true);
    expect(chunks.some(c => c.done === true)).toBe(true);
  });

  it('工具调用 → 累积 JSON + 产出 toolUse', () => {
    const events: AnthropicSSEEventData[] = [
      { type: 'message_start' },
      { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
      { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: '调用' } },
      { type: 'content_block_stop', index: 0 },
      {
        type: 'content_block_start',
        index: 1,
        content_block: { type: 'tool_use', id: 'toolu_1', name: 'calc', input: {} }
      },
      {
        type: 'content_block_delta',
        index: 1,
        delta: { type: 'input_json_delta', partial_json: '{"a":' }
      },
      {
        type: 'content_block_delta',
        index: 1,
        delta: { type: 'input_json_delta', partial_json: '1,"b":2}' }
      },
      { type: 'content_block_stop', index: 1 },
      { type: 'message_stop' }
    ];

    const chunks = mapSSEEventsToChunks(events);

    expect(chunks.some(c => c.textDelta === '调用')).toBe(true);
    const toolUseChunk = chunks.find(c => c.toolUse !== undefined);
    expect(toolUseChunk).toBeDefined();
    expect(toolUseChunk!.toolUse!.id).toBe('toolu_1');
    expect(toolUseChunk!.toolUse!.name).toBe('calc');
    expect(toolUseChunk!.toolUse!.input).toEqual({ a: 1, b: 2 });
    expect(chunks.some(c => c.done === true)).toBe(true);
  });

  it('空事件列表 → 无 chunks', () => {
    const chunks = mapSSEEventsToChunks([]);
    expect(chunks).toHaveLength(0);
  });

  it('ping → 不产出 chunk', () => {
    const events: AnthropicSSEEventData[] = [{ type: 'ping' }];

    const chunks = mapSSEEventsToChunks(events);
    expect(chunks).toHaveLength(0);
  });

  it('message_start → 产出 usage chunk', () => {
    const events: AnthropicSSEEventData[] = [
      {
        type: 'message_start',
        message: {
          id: 'msg_1',
          type: 'message',
          role: 'assistant',
          content: [],
          model: 'claude-sonnet-4-20250514',
          stop_reason: null,
          usage: {
            input_tokens: 500,
            output_tokens: 0,
            cache_creation_input_tokens: 200,
            cache_read_input_tokens: 300
          }
        }
      }
    ];

    const chunks = mapSSEEventsToChunks(events);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].usage?.inputTokens).toBe(500);
    expect(chunks[0].usage?.cacheCreationInputTokens).toBe(200);
    expect(chunks[0].usage?.cacheReadInputTokens).toBe(300);
    expect(chunks[0].done).toBe(false);
  });

  it('message_delta → 产出 output_tokens + stopReason', () => {
    const events: AnthropicSSEEventData[] = [
      { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 50 } }
    ];

    const chunks = mapSSEEventsToChunks(events);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].usage?.outputTokens).toBe(50);
    expect(chunks[0].stopReason).toBe('end_turn');
    expect(chunks[0].done).toBe(false);
  });
});

// ============================================================
// P12: tool_reference 块处理测试
// ============================================================

describe('mapSSEEventsToChunks — tool_reference (P12)', () => {
  it('tool_reference → 累积 JSON + 产出 toolReference', () => {
    const events: AnthropicSSEEventData[] = [
      { type: 'message_start' },
      { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
      { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: '搜索工具' } },
      { type: 'content_block_stop', index: 0 },
      {
        type: 'content_block_start',
        index: 1,
        content_block: {
          type: 'tool_reference',
          tool_use_id: 'toolu_ref1',
          name: 'mcp__slack__send_message',
          input: {}
        }
      },
      {
        type: 'content_block_delta',
        index: 1,
        delta: { type: 'input_json_delta', partial_json: '{"query":"' }
      },
      {
        type: 'content_block_delta',
        index: 1,
        delta: { type: 'input_json_delta', partial_json: 'slack"}' }
      },
      { type: 'content_block_stop', index: 1 },
      { type: 'message_stop' }
    ];

    const chunks = mapSSEEventsToChunks(events);

    expect(chunks.some(c => c.textDelta === '搜索工具')).toBe(true);
    const refChunk = chunks.find(c => c.toolReference !== undefined);
    expect(refChunk).toBeDefined();
    expect(refChunk!.toolReference!.toolUseId).toBe('toolu_ref1');
    expect(refChunk!.toolReference!.name).toBe('mcp__slack__send_message');
    expect(refChunk!.toolReference!.input).toEqual({ query: 'slack' });
    expect(chunks.some(c => c.done === true)).toBe(true);
  });

  it('tool_use + tool_reference 混合流 → 独立累积', () => {
    const events: AnthropicSSEEventData[] = [
      { type: 'message_start' },
      {
        type: 'content_block_start',
        index: 0,
        content_block: { type: 'tool_use', id: 'toolu_1', name: 'bash', input: {} }
      },
      {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'input_json_delta', partial_json: '{"command":"ls"}' }
      },
      { type: 'content_block_stop', index: 0 },
      {
        type: 'content_block_start',
        index: 1,
        content_block: {
          type: 'tool_reference',
          tool_use_id: 'toolu_ref1',
          name: 'mcp__db__query',
          input: {}
        }
      },
      {
        type: 'content_block_delta',
        index: 1,
        delta: { type: 'input_json_delta', partial_json: '{"sql":"SELECT 1"}' }
      },
      { type: 'content_block_stop', index: 1 },
      { type: 'message_stop' }
    ];

    const chunks = mapSSEEventsToChunks(events);

    const toolUseChunk = chunks.find(c => c.toolUse !== undefined);
    expect(toolUseChunk).toBeDefined();
    expect(toolUseChunk!.toolUse!.name).toBe('bash');
    expect(toolUseChunk!.toolUse!.input).toEqual({ command: 'ls' });

    const refChunk = chunks.find(c => c.toolReference !== undefined);
    expect(refChunk).toBeDefined();
    expect(refChunk!.toolReference!.name).toBe('mcp__db__query');
    expect(refChunk!.toolReference!.input).toEqual({ sql: 'SELECT 1' });
  });

  it('tool_reference 空 JSON → input为空对象', () => {
    const events: AnthropicSSEEventData[] = [
      {
        type: 'content_block_start',
        index: 0,
        content_block: {
          type: 'tool_reference',
          tool_use_id: 'toolu_ref1',
          name: 'search',
          input: {}
        }
      },
      { type: 'content_block_stop', index: 0 },
      { type: 'message_stop' }
    ];

    const chunks = mapSSEEventsToChunks(events);

    const refChunk = chunks.find(c => c.toolReference !== undefined);
    expect(refChunk).toBeDefined();
    expect(refChunk!.toolReference!.input).toEqual({});
  });
});
