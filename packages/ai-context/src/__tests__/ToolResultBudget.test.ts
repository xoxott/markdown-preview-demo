import { describe, it, expect, vi } from 'vitest';
import type { AgentMessage } from '@suga/ai-agent-loop';
import type { CompressState } from '../types/compressor';
import { createContentReplacementTracker } from '../core/ContentReplacementState';
import { ToolResultBudgetLayer } from '../core/ToolResultBudget';

function createMockState(configOverrides?: Record<string, unknown>): CompressState {
  return {
    contentReplacement: createContentReplacementTracker(),
    autoCompactFailures: 0,
    lastAssistantTimestamp: null,
    currentTime: Date.now(),
    estimatedTokens: 0,
    contextWindow: 200_000,
    config: { budget: { maxResultSize: 100, previewSize: 20 }, ...configOverrides }
  };
}

function createToolResultMsg(id: string, result: unknown, size?: number): AgentMessage {
  const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
  return {
    id: `tr_${id}`,
    role: 'tool_result',
    toolUseId: id,
    toolName: 'testTool',
    result: resultStr.length > 0 ? result : undefined,
    isSuccess: true,
    timestamp: Date.now()
  };
}

describe('ToolResultBudgetLayer', () => {
  it('大结果替换为 persisted-output', async () => {
    const persistFn = vi.fn().mockResolvedValue('/tmp/output.txt');
    const layer = new ToolResultBudgetLayer(100, 20, persistFn);
    const state = createMockState();
    const largeResult = 'a'.repeat(200); // 200 chars > 100 threshold
    const messages = [createToolResultMsg('id_1', largeResult)];

    const result = await layer.compress(messages, state);
    expect(result.didCompress).toBe(true);
    expect(result.stats?.replacedToolResults).toBe(1);
    expect(persistFn).toHaveBeenCalledOnce();
    const newResult = (result.messages[0] as AgentMessage & { result: string }).result;
    expect(newResult).toContain('<persisted-output>');
    expect(newResult).toContain('/tmp/output.txt');
  });

  it('小结果保留不替换', async () => {
    const layer = new ToolResultBudgetLayer(100, 20);
    const state = createMockState();
    const smallResult = 'hello'; // 5 chars < 100 threshold
    const messages = [createToolResultMsg('id_1', smallResult)];

    const result = await layer.compress(messages, state);
    expect(result.didCompress).toBe(false);
    expect(result.messages[0]).toEqual(messages[0]);
  });

  it('mustReapply 重用缓存内容', async () => {
    const tracker = createContentReplacementTracker();
    tracker.recordReplacement('id_1', {
      originalSize: 200,
      compressionType: 'budget',
      persistedPath: '/tmp/output.txt',
      preview: 'preview text'
    });
    // 冻结后必须能重用
    tracker.freeze();

    const layer = new ToolResultBudgetLayer(100, 20);
    const state = createMockState();
    state.contentReplacement = tracker;
    const largeResult = 'a'.repeat(200);
    const messages = [createToolResultMsg('id_1', largeResult)];

    const result = await layer.compress(messages, state);
    expect(result.didCompress).toBe(true);
    const newResult = (result.messages[0] as AgentMessage & { result: string }).result;
    expect(newResult).toContain('/tmp/output.txt');
  });

  it('frozen 状态下不可替换', async () => {
    const tracker = createContentReplacementTracker();
    tracker.markSeen('id_1'); // seen 但未替换
    tracker.freeze();

    const layer = new ToolResultBudgetLayer(100, 20);
    const state = createMockState();
    state.contentReplacement = tracker;
    const largeResult = 'a'.repeat(200);
    const messages = [createToolResultMsg('id_1', largeResult)];

    const result = await layer.compress(messages, state);
    expect(result.didCompress).toBe(false);
    expect(result.messages[0]).toEqual(messages[0]);
  });
});