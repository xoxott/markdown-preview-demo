import { describe, it, expect, vi } from 'vitest';
import type { MutableAgentContext } from '@suga/ai-agent-loop';
import type { AgentEvent } from '@suga/ai-agent-loop';
import { CompressPipeline } from '../core/CompressPipeline';
import { CompressPhase } from '../integration/CompressPhase';

function createMockContext(): MutableAgentContext & { _messages: any[] } {
  const messages: any[] = [];
  return {
    state: {
      sessionId: 'test',
      get messages() { return messages as any; },
      status: 'running',
      turnCount: 0,
      error: null,
      transition: null,
      toolUseContext: {} as any
    } as any,
    meta: {},
    error: null,
    updateState: vi.fn(),
    setError: vi.fn(),
    _messages: messages
  } as any;
}

async function* emptyGenerator(): AsyncGenerator<AgentEvent> {
  // 不产出任何事件
}

describe('CompressPhase', () => {
  it('压缩后写入 meta.compressedMessages', async () => {
    const callModel = vi.fn().mockResolvedValue('summary text');
    const pipeline = new CompressPipeline(
      {
        budget: { maxResultSize: 10, previewSize: 5 },
        microCompact: { gapThresholdMinutes: 60, compactableTools: ['Read'], keepRecent: 5 },
        autoCompact: { thresholdRatio: 0, maxConsecutiveFailures: 3, messagesToKeep: 1 }
      },
      { callModelForSummary: callModel, persistToolResult: vi.fn().mockResolvedValue('/tmp/file') }
    );

    const ctx = createMockContext();
    ctx._messages.push(
      { id: 'tr1', role: 'tool_result', toolUseId: 'tu1', toolName: 'test', result: 'a'.repeat(200), isSuccess: true, timestamp: 0 }
    );

    const phase = new CompressPhase(pipeline);
    const nextFn = () => emptyGenerator();

    const gen = phase.execute(ctx, nextFn);
    for await (const _ of gen) { /* consume */ }

    expect(ctx.meta.compressedMessages).toBeDefined();
    expect(ctx.meta.compressStats).toBeDefined();
    expect(ctx.meta.preProcessed).toBe(true);
  });

  it('未压缩时只标记 preProcessed', async () => {
    const pipeline = new CompressPipeline({
      budget: { maxResultSize: 1_000_000, previewSize: 500 },
      microCompact: { gapThresholdMinutes: 60, compactableTools: ['Read'], keepRecent: 5 },
      autoCompact: { thresholdRatio: 0.93, maxConsecutiveFailures: 3, messagesToKeep: 4 }
    });

    const ctx = createMockContext();
    ctx._messages.push(
      { id: 'u1', role: 'user', content: 'hello', timestamp: 0 }
    );

    const phase = new CompressPhase(pipeline);
    const nextFn = () => emptyGenerator();

    const gen = phase.execute(ctx, nextFn);
    for await (const _ of gen) { /* consume */ }

    expect(ctx.meta.preProcessed).toBe(true);
    expect(ctx.meta.compressedMessages).toBeUndefined();
  });
});