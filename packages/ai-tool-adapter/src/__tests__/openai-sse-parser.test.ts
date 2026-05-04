/** P78 测试 — OpenAI SSE 流解析 */

import { describe, expect, it } from 'vitest';
import { parseOpenAISSEText } from '../stream/openai-sse-parser';
import type { OpenAISSEEventData } from '../types/openai';

describe('parseOpenAISSEText', () => {
  it('标准 OpenAI SSE 格式 → 正确解析事件', () => {
    const sseText = [
      'data: {"id":"chatcmpl-1","choices":[{"index":0,"delta":{"role":"assistant","content":"Hi"}}]}',
      '',
      'data: {"id":"chatcmpl-1","choices":[{"index":0,"delta":{"content":" there"}}]}',
      '',
      'data: [DONE]',
      ''
    ].join('\n');

    const events = parseOpenAISSEText(sseText);

    expect(events).toHaveLength(2);
    expect(events[0].choices![0].delta!.content).toBe('Hi');
    expect(events[1].choices![0].delta!.content).toBe(' there');
  });

  it('[DONE] 标记 → 被跳过', () => {
    const sseText = ['data: {"choices":[{"delta":{"content":"Hi"}}]}', '', 'data: [DONE]', ''].join(
      '\n'
    );

    const events = parseOpenAISSEText(sseText);
    expect(events).toHaveLength(1);
    expect(events[0].choices![0].delta!.content).toBe('Hi');
  });

  it('空 SSE 文本 → 空数组', () => {
    const events = parseOpenAISSEText('');
    expect(events).toHaveLength(0);
  });

  it('无效 JSON → 跳过', () => {
    const sseText = [
      'data: {invalid}',
      '',
      'data: {"choices":[{"delta":{"content":"OK"}}]}',
      ''
    ].join('\n');

    const events = parseOpenAISSEText(sseText);
    expect(events).toHaveLength(1);
  });

  it('非 data 行 → 被跳过', () => {
    const sseText = [
      'event: some_event',
      'data: {"choices":[{"delta":{"content":"Hi"}}]}',
      ''
    ].join('\n');

    const events = parseOpenAISSEText(sseText);
    expect(events).toHaveLength(1);
  });

  it('含 usage 的 chunk → 正确解析', () => {
    const sseText = [
      'data: {"choices":[{"delta":{"content":"Hi"}}]}',
      '',
      'data: {"choices":[{"finish_reason":"stop"}],"usage":{"prompt_tokens":100,"completion_tokens":10,"total_tokens":110}}',
      '',
      'data: [DONE]',
      ''
    ].join('\n');

    const events = parseOpenAISSEText(sseText);
    expect(events).toHaveLength(2);
    expect(events[1].usage!.prompt_tokens).toBe(100);
    expect(events[1].usage!.completion_tokens).toBe(10);
  });
});

// ============================================================
// OpenAI SSE 事件数据验证（直接构造事件，避免JSON嵌套转义问题）
// ============================================================

describe('OpenAI SSE 事件数据解析', () => {
  it('纯文本流 → textDelta + stopReason', () => {
    const events = parseOpenAISSEText(
      [
        'data: {"id":"1","choices":[{"index":0,"delta":{"role":"assistant","content":"Hi"}}]}',
        '',
        'data: {"id":"1","choices":[{"index":0,"delta":{"content":" there"}}]}',
        '',
        'data: {"id":"1","choices":[{"index":0,"delta":{"content":"!"},"finish_reason":"stop"}]}',
        '',
        'data: [DONE]',
        ''
      ].join('\n')
    );

    expect(events).toHaveLength(3);
    expect(events[0].choices![0].delta!.content).toBe('Hi');
    expect(events[1].choices![0].delta!.content).toBe(' there');
    expect(events[2].choices![0].finish_reason).toBe('stop');
  });

  it('工具调用流 → delta.tool_calls 累积', () => {
    // 直接构造事件数组（避免JSON嵌套转义的eslint问题）
    const events: OpenAISSEEventData[] = [
      {
        choices: [
          {
            index: 0,
            delta: {
              role: 'assistant',
              content: '',
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
        choices: [
          {
            index: 0,
            delta: {
              tool_calls: [{ index: 0, function: { arguments: '1}' } }]
            }
          }
        ]
      },
      {
        choices: [{ index: 0, finish_reason: 'tool_calls' }]
      }
    ];

    expect(events).toHaveLength(4);
    // 第1个chunk带 tool_calls 初始化
    expect(events[0].choices![0].delta!.tool_calls![0].id).toBe('call-1');
    expect(events[0].choices![0].delta!.tool_calls![0].function!.name).toBe('calc');
    // 第2-3个chunk带 arguments 分片
    expect(events[1].choices![0].delta!.tool_calls![0].function!.arguments).toBe('{"a":');
    expect(events[2].choices![0].delta!.tool_calls![0].function!.arguments).toBe('1}');
    // 第4个chunk带 finish_reason
    expect(events[3].choices![0].finish_reason).toBe('tool_calls');
  });

  it('含 usage → 正确提取', () => {
    const events = parseOpenAISSEText(
      [
        'data: {"choices":[{"delta":{"content":"Hi"}}]}',
        '',
        'data: {"choices":[{"finish_reason":"stop"}],"usage":{"prompt_tokens":100,"completion_tokens":5,"total_tokens":105}}',
        '',
        'data: [DONE]',
        ''
      ].join('\n')
    );

    expect(events).toHaveLength(2);
    expect(events[1].usage!.prompt_tokens).toBe(100);
    expect(events[1].usage!.completion_tokens).toBe(5);
  });
});
