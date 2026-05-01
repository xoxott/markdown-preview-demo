import { describe, expect, it, vi } from 'vitest';
import type { AgentMessage } from '@suga/ai-agent-loop';
import type { CompressState } from '../types/compressor';
import { createContentReplacementTracker } from '../core/ContentReplacementState';
import { ReactiveCompactLayer } from '../core/ReactiveCompact';

function createMockState(): CompressState {
  return {
    contentReplacement: createContentReplacementTracker(),
    autoCompactFailures: 0,
    lastAssistantTimestamp: 0,
    currentTime: 100,
    estimatedTokens: 200_001,
    contextWindow: 200_000,
    config: {
      microCompact: { gapThresholdMinutes: 0, compactableTools: ['Read'], keepRecent: 1 },
      autoCompact: { thresholdRatio: 0.5, maxConsecutiveFailures: 3, messagesToKeep: 2 }
    }
  };
}

describe('ReactiveCompactLayer', () => {
  it('both 策略执行激进的 micro + auto compact', async () => {
    const callModel = vi.fn().mockResolvedValue('emergency summary');
    const layer = new ReactiveCompactLayer({ enabled: true, strategy: 'both' }, callModel);
    const state = createMockState();

    const messages: AgentMessage[] = [
      {
        id: 'a1',
        role: 'assistant',
        content: '',
        toolUses: [{ id: 'tu1', name: 'Read', input: {} }],
        timestamp: 0
      },
      {
        id: 'tr1',
        role: 'tool_result',
        toolUseId: 'tu1',
        toolName: 'Read',
        result: 'file content',
        isSuccess: true,
        timestamp: 0
      },
      { id: 'u1', role: 'user', content: 'question', timestamp: 0 }
    ];

    const result = await layer.compress(messages, state);
    expect(result.didCompress).toBe(true);
  });

  it('禁用时跳过', async () => {
    const layer = new ReactiveCompactLayer({ enabled: false, strategy: 'both' });
    const state = createMockState();

    const result = await layer.compress([], state);
    expect(result.didCompress).toBe(false);
  });
});
