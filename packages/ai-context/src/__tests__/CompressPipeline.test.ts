import { describe, it, expect, vi } from 'vitest';
import type { AgentMessage } from '@suga/ai-agent-loop';
import { CompressPipeline } from '../core/CompressPipeline';

function createMessages(count: number): AgentMessage[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `u${i}`,
    role: 'user',
    content: `message ${i} ${'x'.repeat(100)}`,
    timestamp: i * 1000
  }));
}

describe('CompressPipeline', () => {
  it('管线顺序执行三层 — 无压缩时返回原消息', async () => {
    const pipeline = new CompressPipeline({
      budget: { maxResultSize: 1_000_000, previewSize: 500 },
      microCompact: { gapThresholdMinutes: 60, compactableTools: ['Read'], keepRecent: 5 },
      autoCompact: { thresholdRatio: 0.93, maxConsecutiveFailures: 3, messagesToKeep: 4 }
    });

    const messages = createMessages(5);
    const result = await pipeline.compress(messages);
    expect(result.didCompress).toBe(false);
    expect(result.messages.length).toBe(5);
  });

  it('冻结时机 — Budget 执行后冻结 ContentReplacementState', async () => {
    const pipeline = new CompressPipeline({
      budget: { maxResultSize: 1_000_000, previewSize: 500 },
      microCompact: { gapThresholdMinutes: 60, compactableTools: ['Read'], keepRecent: 5 },
      autoCompact: { thresholdRatio: 0.93, maxConsecutiveFailures: 3, messagesToKeep: 4 }
    });

    const messages = createMessages(3);
    await pipeline.compress(messages);

    const state = pipeline.getState();
    expect(state.contentReplacement.frozen).toBe(true);
  });

  it('413 紧急压缩入口', async () => {
    const callModel = vi.fn().mockResolvedValue('emergency summary');
    const pipeline = new CompressPipeline(
      {
        reactiveCompact: { enabled: true, strategy: 'both' },
        microCompact: { gapThresholdMinutes: 0, compactableTools: ['Read'], keepRecent: 0 },
        autoCompact: { thresholdRatio: 0, maxConsecutiveFailures: 3, messagesToKeep: 2 }
      },
      { callModelForSummary: callModel }
    );

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

    const result = await pipeline.reactiveCompact(messages);
    expect(result.didCompress).toBe(true);
  });
});
