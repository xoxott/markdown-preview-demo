import { describe, expect, it } from 'vitest';
import type { AgentMessage } from '@suga/ai-agent-loop';
import { estimateTokens } from '../utils/tokenEstimate';

describe('estimateTokens', () => {
  it('估算 user 消息 token 数', () => {
    const messages: AgentMessage[] = [
      { id: 'u1', role: 'user', content: 'hello world', timestamp: 0 }
    ];
    // 11 chars / 4 ≈ 3 tokens
    expect(estimateTokens(messages)).toBe(3);
  });

  it('估算混合消息 token 数', () => {
    const messages: AgentMessage[] = [
      { id: 'u1', role: 'user', content: 'hi', timestamp: 0 },
      {
        id: 'a1',
        role: 'assistant',
        content: 'hello',
        toolUses: [{ id: 'tu1', name: 'Read', input: { path: '/test' } }],
        timestamp: 0
      },
      {
        id: 'tr1',
        role: 'tool_result',
        toolUseId: 'tu1',
        toolName: 'Read',
        result: 'content',
        isSuccess: true,
        timestamp: 0
      }
    ];
    const tokens = estimateTokens(messages);
    expect(tokens).toBeGreaterThan(0);
  });
});
