/** ContextCollapseStrategy 测试 — 增量折叠排空恢复（commit-log model） */

import { describe, expect, it, vi } from 'vitest';
import type { AgentMessage } from '@suga/ai-agent-loop';
import type { CompressResult } from '@suga/ai-context';
import { ContextCollapseStrategy } from '../core/ContextCollapseStrategy';

/** 辅助：创建 mock CompressPipeline */
function createMockPipeline(reactiveCompactResult: CompressResult) {
  return {
    reactiveCompact: vi.fn().mockResolvedValue(reactiveCompactResult)
  } as unknown as import('@suga/ai-context').CompressPipeline;
}

/** 辅助：创建测试消息 */
function createMessages(count: number): AgentMessage[] {
  const messages: AgentMessage[] = [];
  for (let i = 0; i < count; i++) {
    messages.push({
      id: `msg_${i}`,
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i} content with enough text to be meaningful`,
      toolUses: [],
      timestamp: Date.now() + i * 1000
    });
  }
  return messages;
}

describe('ContextCollapseStrategy', () => {
  describe('shouldCollapse', () => {
    it('超过 drainThreshold 时应返回 true', () => {
      const strategy = new ContextCollapseStrategy({ drainThreshold: 0.95 });
      expect(strategy.shouldCollapse(9600, 10000)).toBe(true);
    });

    it('低于 drainThreshold 时应返回 false', () => {
      const strategy = new ContextCollapseStrategy({ drainThreshold: 0.95 });
      expect(strategy.shouldCollapse(9000, 10000)).toBe(false);
    });
  });

  describe('shouldPlanCollapse', () => {
    it('超过 planThreshold 时应返回 true', () => {
      const strategy = new ContextCollapseStrategy({ planThreshold: 0.9 });
      expect(strategy.shouldPlanCollapse(9100, 10000)).toBe(true);
    });

    it('低于 planThreshold 时应返回 false', () => {
      const strategy = new ContextCollapseStrategy({ planThreshold: 0.9 });
      expect(strategy.shouldPlanCollapse(8000, 10000)).toBe(false);
    });
  });

  describe('collapse', () => {
    it('压缩成功时应返回 collapse_drain_retry', async () => {
      const compressedMessages: AgentMessage[] = [
        { id: 'f1', role: 'user', content: '折叠后', timestamp: Date.now() }
      ];
      const pipeline = createMockPipeline({
        messages: compressedMessages,
        didCompress: true
      });
      const strategy = new ContextCollapseStrategy();

      const transition = await strategy.collapse(
        [{ id: 'u1', role: 'user', content: '原始', timestamp: Date.now() }],
        pipeline
      );

      expect(transition.type).toBe('collapse_drain_retry');
      if (transition.type === 'collapse_drain_retry') {
        expect(transition.foldedMessages).toHaveLength(1);
        expect(transition.boundaryUuid).toMatch(/^collapse_/);
      }
    });

    it('压缩失败时应回退到 reactive_compact_retry', async () => {
      const pipeline = createMockPipeline({
        messages: [],
        didCompress: false
      });
      const strategy = new ContextCollapseStrategy();

      const transition = await strategy.collapse(
        [{ id: 'u1', role: 'user', content: '原始', timestamp: Date.now() }],
        pipeline
      );

      expect(transition.type).toBe('reactive_compact_retry');
    });

    it('collapse 后 hasCollapsed 应为 true', async () => {
      const pipeline = createMockPipeline({
        messages: [{ id: 'f1', role: 'user', content: '折叠后', timestamp: Date.now() }],
        didCompress: true
      });
      const strategy = new ContextCollapseStrategy();

      expect(strategy.hasCollapsed).toBe(false);

      await strategy.collapse(
        [{ id: 'u1', role: 'user', content: '原始', timestamp: Date.now() }],
        pipeline
      );

      expect(strategy.hasCollapsed).toBe(true);
    });

    it('collapse 后 commitLog 应有 span 记录', async () => {
      const pipeline = createMockPipeline({
        messages: [{ id: 'f1', role: 'user', content: '折叠后', timestamp: Date.now() }],
        didCompress: true
      });
      const strategy = new ContextCollapseStrategy();

      await strategy.collapse(
        [{ id: 'u1', role: 'user', content: '原始', timestamp: Date.now() }],
        pipeline
      );

      expect(strategy.commitLog.spans.length).toBeGreaterThan(0);
    });
  });

  describe('drainOverflow', () => {
    it('有 committed spans 时应排空并返回 collapse_drain_retry', async () => {
      const pipeline = createMockPipeline({
        messages: [{ id: 'f1', role: 'user', content: '折叠后', timestamp: Date.now() }],
        didCompress: true
      });
      const strategy = new ContextCollapseStrategy();

      // 先创建 committed span（通过 collapse）
      await strategy.collapse(createMessages(10), pipeline);

      // drainOverflow
      const messages = createMessages(10);
      const result = strategy.drainOverflow(1000, messages);

      expect(result.transition.type).toBe('collapse_drain_retry');
      expect(result.drained.length).toBeGreaterThan(0);
    });

    it('无 committed spans 时应返回 next_turn', () => {
      const strategy = new ContextCollapseStrategy();

      const messages = createMessages(5);
      const result = strategy.drainOverflow(1000, messages);

      expect(result.transition.type).toBe('next_turn');
      expect(result.drained.length).toBe(0);
    });
  });

  describe('状态管理', () => {
    it('reset 应重置折叠状态', () => {
      const strategy = new ContextCollapseStrategy();
      strategy.reset();
      expect(strategy.hasCollapsed).toBe(false);
    });

    it('reset 后 commitLog 应清空', () => {
      const strategy = new ContextCollapseStrategy();
      strategy.reset();
      expect(strategy.commitLog.spans.length).toBe(0);
    });
  });
});
