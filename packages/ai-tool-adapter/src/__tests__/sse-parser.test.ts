/** parseSSEText 测试 — SSE 文本解析 */

import { describe, expect, it } from 'vitest';
import { parseSSEText } from '../stream/sse-parser';

describe('parseSSEText', () => {
  it('标准 SSE 格式 → 正确解析事件', () => {
    const sseText = [
      'event: message_start',
      'data: {"type":"message_start"}',
      '',
      'event: content_block_delta',
      'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hi"}}',
      '',
      'event: message_stop',
      'data: {"type":"message_stop"}',
      ''
    ].join('\n');

    const events = parseSSEText(sseText);

    expect(events).toHaveLength(3);
    expect(events[0].type).toBe('message_start');
    expect(events[1].type).toBe('content_block_delta');
    expect(events[2].type).toBe('message_stop');
  });

  it('仅 data 行（无 event 前缀）→ 正确解析', () => {
    const sseText = [
      'data: {"type":"message_start"}',
      '',
      'data: {"type":"message_stop"}',
      ''
    ].join('\n');

    const events = parseSSEText(sseText);

    expect(events).toHaveLength(2);
  });

  it('空 SSE 文本 → 空数组', () => {
    const events = parseSSEText('');
    expect(events).toHaveLength(0);
  });

  it('无效 JSON → 跳过', () => {
    const sseText = ['data: {invalid}', '', 'data: {"type":"message_stop"}', ''].join('\n');

    const events = parseSSEText(sseText);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('message_stop');
  });

  it('多行数据块 → 正确解析', () => {
    const sseText = [
      'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"a"}}',
      '',
      'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"b"}}',
      '',
      'data: {"type":"message_stop"}',
      ''
    ].join('\n');

    const events = parseSSEText(sseText);
    expect(events).toHaveLength(3);
  });
});
