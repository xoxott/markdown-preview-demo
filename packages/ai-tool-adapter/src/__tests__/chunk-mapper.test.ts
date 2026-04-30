/** chunk-mapper 测试 — Anthropic SSE 事件 → LLMStreamChunk 映射 */

import { describe, expect, it } from 'vitest';
import { mapSSEEventsToChunks } from '../stream/chunk-mapper';
import type { AnthropicSSEEventData } from '../types/anthropic';

describe('mapSSEEventsToChunks', () => {
  it('纯文本流 → text_delta chunks + done', () => {
    const events: AnthropicSSEEventData[] = [
      { type: 'message_start' },
      { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
      { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Hello' } },
      { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: ' World' } },
      { type: 'content_block_stop', index: 0 },
      { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 2 } },
      { type: 'message_stop' }
    ];

    const chunks = mapSSEEventsToChunks(events);

    expect(chunks).toHaveLength(3);
    expect(chunks[0].textDelta).toBe('Hello');
    expect(chunks[1].textDelta).toBe(' World');
    expect(chunks[2].done).toBe(true);
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

  it('message_start / message_delta / ping → 不产出 chunk', () => {
    const events: AnthropicSSEEventData[] = [
      { type: 'message_start' },
      { type: 'ping' },
      { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 1 } }
    ];

    const chunks = mapSSEEventsToChunks(events);
    expect(chunks).toHaveLength(0);
  });
});
