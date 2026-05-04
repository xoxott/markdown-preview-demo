/** openai-chunk-mapper 测试 — OpenAI SSE 事件 → LLMStreamChunk 映射 */

import { describe, expect, it } from 'vitest';
import { mapOpenAIChunksToChunks } from '../stream/openai-chunk-mapper';
import type { OpenAISSEEventData } from '../types/openai';

describe('mapOpenAIChunksToChunks', () => {
  it('纯文本流 → textDelta + stopReason + usage + done', () => {
    const events: OpenAISSEEventData[] = [
      {
        id: 'chatcmpl-1',
        object: 'chat.completion.chunk',
        choices: [{ index: 0, delta: { role: 'assistant', content: 'Hi' } }]
      },
      {
        id: 'chatcmpl-1',
        choices: [{ index: 0, delta: { content: ' there' } }]
      },
      {
        id: 'chatcmpl-1',
        choices: [{ index: 0, finish_reason: 'stop' }],
        usage: { prompt_tokens: 100, completion_tokens: 5, total_tokens: 105 }
      }
    ];

    const chunks = mapOpenAIChunksToChunks(events);

    // textDelta + textDelta + stopReason + usage + done
    expect(chunks.some(c => c.textDelta === 'Hi')).toBe(true);
    expect(chunks.some(c => c.textDelta === ' there')).toBe(true);
    expect(chunks.some(c => c.stopReason === 'end_turn')).toBe(true);
    expect(chunks.some(c => c.usage?.inputTokens === 100)).toBe(true);
    expect(chunks.some(c => c.usage?.outputTokens === 5)).toBe(true);
    expect(chunks.some(c => c.done === true)).toBe(true);
  });

  it('工具调用 → 累积 arguments + 产出 toolUse', () => {
    const events: OpenAISSEEventData[] = [
      {
        id: 'chatcmpl-1',
        choices: [
          {
            index: 0,
            delta: {
              role: 'assistant',
              content: undefined,
              tool_calls: [
                {
                  index: 0,
                  id: 'call-1',
                  type: 'function',
                  function: { name: 'calc', arguments: '' }
                }
              ]
            }
          }
        ]
      },
      {
        id: 'chatcmpl-1',
        choices: [
          {
            index: 0,
            delta: {
              tool_calls: [{ index: 0, function: { arguments: '{"a":' } }]
            }
          }
        ]
      },
      {
        id: 'chatcmpl-1',
        choices: [
          {
            index: 0,
            delta: {
              tool_calls: [{ index: 0, function: { arguments: '1,"b":2}' } }]
            }
          }
        ]
      },
      {
        id: 'chatcmpl-1',
        choices: [{ index: 0, finish_reason: 'tool_calls' }]
      }
    ];

    const chunks = mapOpenAIChunksToChunks(events);

    const toolUseChunk = chunks.find(c => c.toolUse !== undefined);
    expect(toolUseChunk).toBeDefined();
    expect(toolUseChunk!.toolUse!.id).toBe('call-1');
    expect(toolUseChunk!.toolUse!.name).toBe('calc');
    expect(toolUseChunk!.toolUse!.input).toEqual({ a: 1, b: 2 });
    expect(chunks.some(c => c.stopReason === 'tool_use')).toBe(true);
    expect(chunks.some(c => c.done === true)).toBe(true);
  });

  it('多个工具调用 → 独立累积', () => {
    const events: OpenAISSEEventData[] = [
      {
        choices: [
          {
            index: 0,
            delta: {
              tool_calls: [
                {
                  index: 0,
                  id: 'call-1',
                  type: 'function',
                  function: { name: 'search', arguments: '' }
                }
              ]
            }
          }
        ]
      },
      {
        choices: [
          {
            index: 0,
            delta: {
              tool_calls: [
                { index: 0, function: { arguments: '{"q":"test"}' } },
                {
                  index: 1,
                  id: 'call-2',
                  type: 'function',
                  function: { name: 'read', arguments: '' }
                }
              ]
            }
          }
        ]
      },
      {
        choices: [
          {
            index: 0,
            delta: {
              tool_calls: [{ index: 1, function: { arguments: '{"file":"a.ts"}' } }]
            }
          }
        ]
      },
      {
        choices: [{ index: 0, finish_reason: 'tool_calls' }]
      }
    ];

    const chunks = mapOpenAIChunksToChunks(events);

    const toolUseChunks = chunks.filter(c => c.toolUse !== undefined);
    expect(toolUseChunks).toHaveLength(2);
    expect(toolUseChunks[0].toolUse!.name).toBe('search');
    expect(toolUseChunks[0].toolUse!.input).toEqual({ q: 'test' });
    expect(toolUseChunks[1].toolUse!.name).toBe('read');
    expect(toolUseChunks[1].toolUse!.input).toEqual({ file: 'a.ts' });
  });

  it('空事件列表 → 只有 done', () => {
    const chunks = mapOpenAIChunksToChunks([]);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].done).toBe(true);
  });

  it('usage → 映射为 LLMStreamChunk.usage', () => {
    const events: OpenAISSEEventData[] = [
      {
        choices: [{ index: 0, finish_reason: 'stop' }],
        usage: {
          prompt_tokens: 500,
          completion_tokens: 100,
          total_tokens: 600,
          prompt_tokens_details: { cached_tokens: 300 }
        }
      }
    ];

    const chunks = mapOpenAIChunksToChunks(events);
    const usageChunk = chunks.find(c => c.usage !== undefined);
    expect(usageChunk).toBeDefined();
    expect(usageChunk!.usage!.inputTokens).toBe(500);
    expect(usageChunk!.usage!.outputTokens).toBe(100);
    expect(usageChunk!.usage!.cacheReadInputTokens).toBe(300);
  });

  it('finish_reason 映射 → end_turn/max_tokens/tool_use', () => {
    const events1: OpenAISSEEventData[] = [{ choices: [{ index: 0, finish_reason: 'stop' }] }];
    const events2: OpenAISSEEventData[] = [{ choices: [{ index: 0, finish_reason: 'length' }] }];
    const events3: OpenAISSEEventData[] = [
      { choices: [{ index: 0, finish_reason: 'tool_calls' }] }
    ];

    const chunks1 = mapOpenAIChunksToChunks(events1);
    expect(chunks1.some(c => c.stopReason === 'end_turn')).toBe(true);

    const chunks2 = mapOpenAIChunksToChunks(events2);
    expect(chunks2.some(c => c.stopReason === 'max_tokens')).toBe(true);

    const chunks3 = mapOpenAIChunksToChunks(events3);
    expect(chunks3.some(c => c.stopReason === 'tool_use')).toBe(true);
  });

  it('JSON 解析失败 → input 为空对象', () => {
    const events: OpenAISSEEventData[] = [
      {
        choices: [
          {
            index: 0,
            delta: {
              tool_calls: [
                {
                  index: 0,
                  id: 'call-1',
                  type: 'function',
                  function: { name: 'bad', arguments: '{invalid' }
                }
              ]
            }
          }
        ]
      },
      {
        choices: [{ index: 0, finish_reason: 'tool_calls' }]
      }
    ];

    const chunks = mapOpenAIChunksToChunks(events);
    const toolUseChunk = chunks.find(c => c.toolUse !== undefined);
    expect(toolUseChunk).toBeDefined();
    expect(toolUseChunk!.toolUse!.input).toEqual({});
  });
});
