import { describe, it, expect } from 'vitest';
import type { AgentMessage } from '@suga/ai-agent-loop';
import type { CompressState } from '../types/compressor';
import { createContentReplacementTracker } from '../core/ContentReplacementState';
import { TimeBasedMicroCompactLayer } from '../core/TimeBasedMicroCompact';

function createMockState(lastTs: number | null, currentTime: number): CompressState {
  return {
    contentReplacement: createContentReplacementTracker(),
    autoCompactFailures: 0,
    lastAssistantTimestamp: lastTs,
    currentTime,
    estimatedTokens: 0,
    contextWindow: 200_000,
    config: {
      microCompact: { gapThresholdMinutes: 60, compactableTools: ['Read', 'Grep'], keepRecent: 1 }
    }
  };
}

function createAssistantMsg(toolUses: { id: string; name: string }[]): AgentMessage {
  return {
    id: 'a1',
    role: 'assistant',
    content: 'thinking',
    toolUses: toolUses.map(t => ({ id: t.id, name: t.name, input: {} })),
    timestamp: 0
  };
}

function createToolResultMsg(toolUseId: string, toolName: string, result: string): AgentMessage {
  return {
    id: `tr_${toolUseId}`,
    role: 'tool_result',
    toolUseId,
    toolName,
    result,
    isSuccess: true,
    timestamp: 0
  };
}

describe('TimeBasedMicroCompactLayer', () => {
  it('时间间隔不足跳过', async () => {
    const layer = new TimeBasedMicroCompactLayer();
    const state = createMockState(100_000, 120_000); // gap 20s < 60min
    const messages: AgentMessage[] = [createAssistantMsg([{ id: 'tu1', name: 'Read' }])];

    const result = await layer.compress(messages, state);
    expect(result.didCompress).toBe(false);
  });

  it('超过阈值清除旧 tool_result', async () => {
    const layer = new TimeBasedMicroCompactLayer({
      gapThresholdMinutes: 60,
      compactableTools: ['Read', 'Grep'],
      keepRecent: 1
    });
    const state = createMockState(0, 61 * 60_000); // gap 61min > 60min
    const messages: AgentMessage[] = [
      createAssistantMsg([
        { id: 'tu1', name: 'Read' },
        { id: 'tu2', name: 'Grep' }
      ]),
      createToolResultMsg('tu1', 'Read', 'file content'),
      createToolResultMsg('tu2', 'Grep', 'grep results')
    ];

    const result = await layer.compress(messages, state);
    expect(result.didCompress).toBe(true);
    expect(result.stats?.timeClearedToolResults).toBe(1);
  });

  it('keepRecent 保留最近 N 个', async () => {
    const layer = new TimeBasedMicroCompactLayer({
      gapThresholdMinutes: 0,
      compactableTools: ['Read'],
      keepRecent: 1
    });
    const state = createMockState(0, 100); // gap > 0min threshold
    const messages: AgentMessage[] = [
      createAssistantMsg([
        { id: 'tu1', name: 'Read' },
        { id: 'tu2', name: 'Read' }
      ]),
      createToolResultMsg('tu1', 'Read', 'old content'),
      createToolResultMsg('tu2', 'Read', 'recent content')
    ];

    const result = await layer.compress(messages, state);
    expect(result.didCompress).toBe(true);
    // tu1 清除, tu2 保留
    const tr1 = result.messages.find(m => m.role === 'tool_result' && m.toolUseId === 'tu1')!;
    expect((tr1 as AgentMessage & { result: string }).result).toBe(
      '[Old tool result content cleared]'
    );
  });

  it('compactableTools 过滤 — 不在列表中的工具不清除', async () => {
    const layer = new TimeBasedMicroCompactLayer({
      gapThresholdMinutes: 0,
      compactableTools: ['Read'],
      keepRecent: 0
    });
    const state = createMockState(0, 100);
    const messages: AgentMessage[] = [
      createAssistantMsg([
        { id: 'tu1', name: 'Read' },
        { id: 'tu2', name: 'Bash' }
      ]),
      createToolResultMsg('tu1', 'Read', 'content'),
      createToolResultMsg('tu2', 'Bash', 'bash output')
    ];

    const result = await layer.compress(messages, state);
    // Bash 不在 compactableTools 中 → 不清除
    const bashMsg = result.messages.find(m => m.role === 'tool_result' && m.toolUseId === 'tu2')!;
    expect((bashMsg as AgentMessage & { result: string }).result).toBe('bash output');
  });
});
