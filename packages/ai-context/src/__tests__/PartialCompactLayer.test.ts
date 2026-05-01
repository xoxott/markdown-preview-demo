/** PartialCompactLayer 测试 — AutoCompact 熔断时的保底 fallback */

import { describe, expect, it } from 'vitest';
import type { AgentMessage } from '@suga/ai-agent-loop';
import { PartialCompactLayer } from '../core/PartialCompactLayer';
import type { CompressState } from '../types/compressor';
import { createContentReplacementTracker } from '../core/ContentReplacementState';

/** 辅助：创建测试消息（模拟多个 API rounds） */
function createMultiRoundMessages(roundCount: number): AgentMessage[] {
  const messages: AgentMessage[] = [];
  for (let r = 0; r < roundCount; r++) {
    // 每个 round: user + assistant
    messages.push({
      id: `u_${r}`,
      role: 'user',
      content: `Round ${r} user message with some meaningful content`,
      timestamp: Date.now() + r * 10000
    });
    messages.push({
      id: `a_${r}`,
      role: 'assistant',
      content: `Round ${r} assistant response with detailed information`,
      toolUses: [],
      timestamp: Date.now() + r * 10000 + 5000
    });
  }
  return messages;
}

/** 辅助：创建 CompressState */
function createState(autoCompactFailures: number): CompressState {
  return {
    contentReplacement: createContentReplacementTracker(),
    autoCompactFailures,
    lastAssistantTimestamp: Date.now(),
    currentTime: Date.now(),
    estimatedTokens: 50000,
    contextWindow: 200000,
    config: {}
  };
}

describe('PartialCompactLayer', () => {
  describe('熔断器未触发', () => {
    it('autoCompactFailures=0 时不应执行', async () => {
      const layer = new PartialCompactLayer();
      const messages = createMultiRoundMessages(5);
      const state = createState(0);

      const result = await layer.compress(messages, state);

      expect(result.didCompress).toBe(false);
      expect(result.messages).toEqual(messages);
    });
  });

  describe('熔断器触发', () => {
    it('autoCompactFailures>=1 时应裁剪 oldest groups', async () => {
      const layer = new PartialCompactLayer({ truncateRatio: 0.2 });
      const messages = createMultiRoundMessages(10); // 10 rounds = 20 messages
      const state = createState(3); // 熔断器触发

      const result = await layer.compress(messages, state);

      expect(result.didCompress).toBe(true);
      // 裁剪 2 oldest rounds (10 * 0.2 = 2)
      expect(result.messages.length).toBeLessThan(messages.length);
      // 占位符消息应在最前
      const firstMsg = result.messages[0];
      expect(firstMsg.role).toBe('user');
      if (firstMsg.role === 'user') {
        expect(firstMsg.content).toContain('[Partial compact');
        expect(firstMsg.isMeta).toBe(true);
      }
      if (result.stats) {
        expect(result.stats.partialCompactTrimmedRounds).toBe(2);
      }
    });

    it('应保留至少 1 group', async () => {
      const layer = new PartialCompactLayer({ truncateRatio: 0.9 });
      const messages = createMultiRoundMessages(2); // 2 rounds
      const state = createState(1);

      const result = await layer.compress(messages, state);

      expect(result.didCompress).toBe(true);
      // 即使 truncateRatio=0.9，仍至少保留 1 group
      if (result.stats) {
        expect(result.stats.partialCompactTrimmedRounds).toBe(1);
      }
    });

    it('maxTruncatedGroups 应限制裁剪数', async () => {
      const layer = new PartialCompactLayer({ truncateRatio: 0.5, maxTruncatedGroups: 1 });
      const messages = createMultiRoundMessages(10);
      const state = createState(2);

      const result = await layer.compress(messages, state);

      expect(result.didCompress).toBe(true);
      if (result.stats) {
        expect(result.stats.partialCompactTrimmedRounds).toBe(1);
      }
    });

    it('仅 1 group 时不应裁剪', async () => {
      const layer = new PartialCompactLayer();
      const messages = createMultiRoundMessages(1); // 1 round only
      const state = createState(5);

      const result = await layer.compress(messages, state);

      expect(result.didCompress).toBe(false);
    });
  });

  describe('enabled=false', () => {
    it('enabled=false 时不应执行', async () => {
      const layer = new PartialCompactLayer({ enabled: false });
      const messages = createMultiRoundMessages(5);
      const state = createState(5);

      const result = await layer.compress(messages, state);

      expect(result.didCompress).toBe(false);
    });
  });
});
