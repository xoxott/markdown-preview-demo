import { describe, expect, it } from 'vitest';
import type { AgentMessage, ToolResultMessage } from '@suga/ai-agent-loop';
import { SnipCompactLayer } from '../core/SnipCompactLayer';
import type { CompressState } from '../types/compressor';
import { TIME_CLEARED_MESSAGE } from '../constants';

/** 辅助：创建 CompressState */
function createState(): CompressState {
  return {
    contentReplacement: {
      seenIds: new Set(),
      replacements: new Map(),
      frozen: false,
      markSeen: () => {},
      recordReplacement: () => {},
      classify: () => 'fresh',
      freeze: () => {}
    } as any,
    autoCompactFailures: 0,
    lastAssistantTimestamp: null,
    currentTime: Date.now(),
    estimatedTokens: 0,
    contextWindow: 200_000,
    config: {}
  };
}

/** 辅助：创建 tool_result 消息 */
function createToolResult(toolUseId: string, content: string): ToolResultMessage {
  return {
    id: `tr_${toolUseId}`,
    role: 'tool_result',
    toolUseId,
    toolName: 'Read',
    result: content,
    isSuccess: true,
    timestamp: Date.now()
  };
}

/** 辅助：创建 assistant 消息（含 tool_use） */
function createAssistantWithToolUse(toolUseId: string, text: string): AgentMessage {
  return {
    id: `asst_${toolUseId}`,
    role: 'assistant',
    content: text,
    toolUses: [{ id: toolUseId, name: 'Read', input: { path: '/test' } }],
    timestamp: Date.now()
  };
}

/** 辅助：创建 user 消息 */
function createUserMessage(text: string): AgentMessage {
  return {
    id: `user_${Date.now()}`,
    role: 'user',
    content: text,
    timestamp: Date.now()
  };
}

describe('SnipCompactLayer', () => {
  it('消息数量 ≤ keepRecent → 不裁剪', async () => {
    const layer = new SnipCompactLayer({ keepRecent: 5 });
    const messages: AgentMessage[] = [createUserMessage('hi'), createToolResult('tu1', 'result1')];

    const result = await layer.compress(messages, createState());

    expect(result.didCompress).toBe(false);
    expect(result.messages).toEqual(messages);
  });

  it('旧 tool_result 被裁剪 → 保留最近 keepRecent 个', async () => {
    const layer = new SnipCompactLayer({ keepRecent: 1 });

    const messages: AgentMessage[] = [
      createUserMessage('request'),
      createAssistantWithToolUse('tu1', 'thinking'),
      createToolResult('tu1', 'a'.repeat(500)),
      createAssistantWithToolUse('tu2', 'thinking2'),
      createToolResult('tu2', 'b'.repeat(500))
    ];

    const result = await layer.compress(messages, createState());

    expect(result.didCompress).toBe(true);
    expect(result.stats?.snippedToolResults).toBe(1);

    // tu1 的 result 应被裁剪（保留最近1个=tu2）
    const snippedMsg = result.messages[2] as ToolResultMessage;
    expect(snippedMsg.result).toContain('[snipped]');

    // tu2 的 result 应保持原样
    const keptMsg = result.messages[4] as ToolResultMessage;
    expect(keptMsg.result).toBe('b'.repeat(500));
  });

  it('孤立 tool_result 被标记为 TIME_CLEARED', async () => {
    const layer = new SnipCompactLayer({ keepRecent: 0, removeOrphanedResults: true });

    // 创建没有对应 tool_use 的孤立 tool_result
    const messages: AgentMessage[] = [
      createUserMessage('request'),
      createToolResult('orphan_tu', 'orphan content')
    ];

    const result = await layer.compress(messages, createState());

    expect(result.didCompress).toBe(true);
    const msg = result.messages[1] as ToolResultMessage;
    expect(msg.result).toBe(TIME_CLEARED_MESSAGE);
  });

  it('小内容 tool_result（≤100字符）不被裁剪', async () => {
    const layer = new SnipCompactLayer({ keepRecent: 0 });

    const messages: AgentMessage[] = [
      createAssistantWithToolUse('tu1', 'thinking'),
      createToolResult('tu1', 'short') // 5字符，小于100阈值
    ];

    const result = await layer.compress(messages, createState());

    expect(result.didCompress).toBe(false);
  });
});
