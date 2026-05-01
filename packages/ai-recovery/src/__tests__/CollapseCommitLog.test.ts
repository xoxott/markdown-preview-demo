/** CollapseCommitLog 测试 — 增量折叠提交日志 */

import { describe, expect, it } from 'vitest';
import type { AgentMessage } from '@suga/ai-agent-loop';
import { CollapseCommitLogImpl } from '../core/CollapseCommitLog';
import type { CollapseSpan } from '../types/collapse';

/** 辅助：创建测试 span */
function createSpan(options: {
  boundaryUuid?: string;
  startIndex?: number;
  endIndex?: number;
  summary?: string;
  estimatedTokens?: number;
  status?: 'staged' | 'committed';
}): CollapseSpan {
  return {
    boundaryUuid: options.boundaryUuid ?? `test_${Date.now()}`,
    startIndex: options.startIndex ?? 0,
    endIndex: options.endIndex ?? 5,
    summary: options.summary ?? 'Collapsed segment',
    archivedMessageIds: ['msg_0', 'msg_1', 'msg_2'],
    estimatedTokens: options.estimatedTokens ?? 1000,
    status: options.status ?? 'staged',
    createdAt: Date.now()
  };
}

/** 辅助：创建测试消息 */
function createMessages(count: number): AgentMessage[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `msg_${i}`,
    role: i % 2 === 0 ? 'user' : 'assistant',
    content: `Message ${i}`,
    toolUses: [],
    timestamp: Date.now() + i * 1000
  }));
}

describe('CollapseCommitLogImpl', () => {
  describe('addStagedSpan', () => {
    it('应添加 staged span', () => {
      const log = new CollapseCommitLogImpl();
      const span = createSpan({ boundaryUuid: 'span_1', estimatedTokens: 1000 });

      log.addStagedSpan(span);

      expect(log.spans.length).toBe(1);
      expect(log.spans[0].status).toBe('staged');
      expect(log.stagedCount).toBe(1);
      expect(log.committedCount).toBe(0);
    });

    it('应强制 status 为 staged（无论传入值）', () => {
      const log = new CollapseCommitLogImpl();
      const span = createSpan({ boundaryUuid: 'span_1', status: 'committed' });

      log.addStagedSpan(span);

      expect(log.spans[0].status).toBe('staged');
      expect(log.stagedCount).toBe(1);
    });
  });

  describe('commitStagedSpans', () => {
    it('应将 staged spans 标记为 committed', () => {
      const log = new CollapseCommitLogImpl();
      log.addStagedSpan(createSpan({ boundaryUuid: 'span_1' }));
      log.addStagedSpan(createSpan({ boundaryUuid: 'span_2' }));

      const committed = log.commitStagedSpans();

      expect(committed.length).toBe(2);
      expect(committed[0].status).toBe('committed');
      expect(committed[1].status).toBe('committed');
      expect(log.stagedCount).toBe(0);
      expect(log.committedCount).toBe(2);
    });

    it('无 staged spans 时应返回空数组', () => {
      const log = new CollapseCommitLogImpl();

      const committed = log.commitStagedSpans();

      expect(committed.length).toBe(0);
    });
  });

  describe('drainCommittedSpans', () => {
    it('应按 token gap 优先排空最大的 committed span', () => {
      const log = new CollapseCommitLogImpl();
      log.addStagedSpan(createSpan({ boundaryUuid: 'big', estimatedTokens: 5000 }));
      log.addStagedSpan(createSpan({ boundaryUuid: 'small', estimatedTokens: 1000 }));
      log.commitStagedSpans();

      const result = log.drainCommittedSpans(2000);

      // 需释放 2000 tokens → 排空 big span (5000 > 2000)
      expect(result.drained.length).toBe(1);
      expect(result.drained[0].boundaryUuid).toBe('big');
      expect(result.remaining.length).toBe(1);
    });

    it('需释放量大于单个 span 时应排空多个', () => {
      const log = new CollapseCommitLogImpl();
      log.addStagedSpan(createSpan({ boundaryUuid: 'span_1', estimatedTokens: 3000 }));
      log.addStagedSpan(createSpan({ boundaryUuid: 'span_2', estimatedTokens: 2000 }));
      log.addStagedSpan(createSpan({ boundaryUuid: 'span_3', estimatedTokens: 1000 }));
      log.commitStagedSpans();

      const result = log.drainCommittedSpans(4000);

      // 3000 + 2000 = 5000 > 4000 → 排空 span_1 和 span_2
      expect(result.drained.length).toBe(2);
      expect(result.remaining.length).toBe(1);
    });

    it('drain 后 span 应从 commitLog 移除', () => {
      const log = new CollapseCommitLogImpl();
      log.addStagedSpan(createSpan({ boundaryUuid: 'span_1', estimatedTokens: 1000 }));
      log.commitStagedSpans();

      log.drainCommittedSpans(500);

      expect(log.spans.length).toBe(0);
    });

    it('无 committed spans 时应返回空结果', () => {
      const log = new CollapseCommitLogImpl();
      log.addStagedSpan(createSpan({ boundaryUuid: 'span_1' }));

      // 有 staged 但无 committed
      const result = log.drainCommittedSpans(500);

      expect(result.drained.length).toBe(0);
      expect(result.remaining.length).toBe(0);
    });
  });

  describe('getProjectView', () => {
    it('应将 committed spans 范围替换为折叠占位符', () => {
      const log = new CollapseCommitLogImpl();
      log.addStagedSpan(
        createSpan({
          boundaryUuid: 'span_1',
          startIndex: 0,
          endIndex: 2,
          summary: 'Early conversation'
        })
      );
      log.commitStagedSpans();

      const messages = createMessages(10);
      const view = log.getProjectView(messages);

      // span 覆盖 0-2 → 替换为折叠占位符
      expect(view.length).toBeLessThan(messages.length);
      expect(view[0].content).toContain('<collapsed');
      expect(view[0].content).toContain('Early conversation');
      expect(view[0].isMeta).toBe(true);
    });

    it('无 spans 时应返回原始消息', () => {
      const log = new CollapseCommitLogImpl();
      const messages = createMessages(5);

      const view = log.getProjectView(messages);

      expect(view.length).toBe(5);
      expect(view).toEqual(messages);
    });

    it('同一 boundary 只应输出一次占位符', () => {
      const log = new CollapseCommitLogImpl();
      log.addStagedSpan(
        createSpan({
          boundaryUuid: 'span_1',
          startIndex: 0,
          endIndex: 4,
          summary: 'Big segment'
        })
      );
      log.commitStagedSpans();

      const messages = createMessages(10);
      const view = log.getProjectView(messages);

      // 整个 0-4 范围只输出 1 个占位符
      const collapsedCount = view.filter(m => m.content?.includes('<collapsed')).length;
      expect(collapsedCount).toBe(1);
    });
  });

  describe('reset', () => {
    it('应清空所有 spans', () => {
      const log = new CollapseCommitLogImpl();
      log.addStagedSpan(createSpan({ boundaryUuid: 'span_1' }));
      log.commitStagedSpans();

      log.reset();

      expect(log.spans.length).toBe(0);
      expect(log.stagedCount).toBe(0);
      expect(log.committedCount).toBe(0);
    });
  });
});
