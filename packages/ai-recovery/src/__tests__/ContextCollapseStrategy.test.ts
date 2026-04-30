/** ContextCollapseStrategy 测试 — 增量折叠排空恢复（stub） */

import { describe, expect, it, vi } from 'vitest';
import type { CompressResult } from '@suga/ai-context';
import { ContextCollapseStrategy } from '../core/ContextCollapseStrategy';

/** 辅助：创建 mock CompressPipeline */
function createMockPipeline(reactiveCompactResult: CompressResult) {
  return {
    reactiveCompact: vi.fn().mockResolvedValue(reactiveCompactResult)
  } as unknown as import('@suga/ai-context').CompressPipeline;
}

describe('ContextCollapseStrategy', () => {
  describe('shouldCollapse', () => {
    it('超过 drainThreshold 时应返回 true', () => {
      const strategy = new ContextCollapseStrategy({ drainThreshold: 0.95 });

      // 9600 / 10000 = 96% > 95%
      expect(strategy.shouldCollapse(9600, 10000)).toBe(true);
    });

    it('低于 drainThreshold 时应返回 false', () => {
      const strategy = new ContextCollapseStrategy({ drainThreshold: 0.95 });

      // 9000 / 10000 = 90% < 95%
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
      const compressedMessages: import('@suga/ai-agent-loop').AgentMessage[] = [
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
  });

  describe('状态管理', () => {
    it('reset 应重置折叠状态', () => {
      const strategy = new ContextCollapseStrategy();

      strategy.reset();
      expect(strategy.hasCollapsed).toBe(false);
    });
  });
});
