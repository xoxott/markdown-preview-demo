/** messageGrouping 测试 — 按 API round 分组消息 */

import { describe, expect, it } from 'vitest';
import type { AgentMessage } from '@suga/ai-agent-loop';
import { groupByApiRound } from '../utils/messageGrouping';

const userMsg = (id: string, content: string): AgentMessage => ({
  id,
  role: 'user',
  content,
  timestamp: Date.now()
});
const assistantMsg = (id: string, content: string): AgentMessage => ({
  id,
  role: 'assistant',
  content,
  toolUses: [],
  timestamp: Date.now()
});
const toolResultMsg = (id: string, tuId: string): AgentMessage => ({
  id,
  role: 'tool_result',
  toolUseId: tuId,
  toolName: 'test',
  result: 'ok',
  isSuccess: true,
  timestamp: Date.now()
});

describe('groupByApiRound', () => {
  it('空消息列表 → 空分组', () => {
    expect(groupByApiRound([])).toHaveLength(0);
  });

  it('单 round — 1 个 user + 1 个 assistant + 1 个 tool_result', () => {
    const messages = [
      userMsg('u1', 'hello'),
      assistantMsg('a1', 'hi'),
      toolResultMsg('tr1', 'tu1')
    ];
    const groups = groupByApiRound(messages);

    expect(groups).toHaveLength(1);
    expect(groups[0].startIndex).toBe(0);
    expect(groups[0].endIndex).toBe(2);
    expect(groups[0].messages).toHaveLength(3);
  });

  it('多 round — 3 个完整 round', () => {
    const messages = [
      userMsg('u1', 'search'),
      assistantMsg('a1', 'found'),
      toolResultMsg('tr1', 'tu1'),
      userMsg('u2', 'read'),
      assistantMsg('a2', 'content'),
      toolResultMsg('tr2', 'tu2'),
      userMsg('u3', 'write'),
      assistantMsg('a3', 'done')
    ];
    const groups = groupByApiRound(messages);

    expect(groups).toHaveLength(3);
    expect(groups[0].messages).toHaveLength(3); // search round
    expect(groups[1].messages).toHaveLength(3); // read round
    expect(groups[2].messages).toHaveLength(2); // write round (no tool_result)
  });

  it('连续 user 消息 → 每个 user 开始新 round', () => {
    const messages = [
      userMsg('u1', 'task 1'),
      userMsg('u2', 'task 2'),
      assistantMsg('a1', 'result')
    ];
    const groups = groupByApiRound(messages);

    expect(groups).toHaveLength(2);
    expect(groups[0].messages).toHaveLength(1); // 只有 task 1 user
    expect(groups[1].messages).toHaveLength(2); // task 2 user + assistant
  });

  it('只有 user 消息 → 单个 group', () => {
    const messages = [userMsg('u1', 'hello')];
    const groups = groupByApiRound(messages);

    expect(groups).toHaveLength(1);
    expect(groups[0].messages).toHaveLength(1);
  });

  it('只有 assistant/tool_result 消息（无 user） → 单个 group', () => {
    const messages = [assistantMsg('a1', 'result'), toolResultMsg('tr1', 'tu1')];
    const groups = groupByApiRound(messages);

    expect(groups).toHaveLength(1);
    expect(groups[0].messages).toHaveLength(2);
  });
});
