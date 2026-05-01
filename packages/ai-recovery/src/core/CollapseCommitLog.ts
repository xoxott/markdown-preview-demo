/** CollapseCommitLog — 增量折叠提交日志实现 */

import type { AgentMessage } from '@suga/ai-agent-loop';
import type {
  CollapseCommitLog,
  CollapseSpan,
  CollapseSpanStatus,
  DrainResult
} from '../types/collapse';

/**
 * 折叠提交日志
 *
 * 参考 Claude Code CommittedCollapse 的 commit-log model:
 *
 * - staged spans: 90% threshold 触发的折叠计划（尚未提交）
 * - committed spans: 95% threshold 强制提交的折叠（已确认）
 * - projectView: 从折叠快照重建对话视图
 * - drain: 排空溢出的 committed spans
 *
 * 关键设计:
 *
 * - CommittedCollapse 只持久化 boundary uuid + summary，不持久化归档消息本身
 * - projectView 首次发现 span 时从原始消息填充摘要占位符
 * - drain 优先排空最大的 committed span（释放最多 token）
 */
export class CollapseCommitLogImpl implements CollapseCommitLog {
  private _spans: CollapseSpan[] = [];

  get spans(): readonly CollapseSpan[] {
    return this._spans;
  }

  get stagedCount(): number {
    return this._spans.filter(s => s.status === 'staged').length;
  }

  get committedCount(): number {
    return this._spans.filter(s => s.status === 'committed').length;
  }

  /** 添加 staged span */
  addStagedSpan(span: CollapseSpan): void {
    // 确保 span 状态为 staged
    const stagedSpan: CollapseSpan = { ...span, status: 'staged' };
    this._spans.push(stagedSpan);
  }

  /** 将所有 staged spans 标记为 committed */
  commitStagedSpans(): readonly CollapseSpan[] {
    const committed: CollapseSpan[] = [];
    this._spans = this._spans.map(span => {
      if (span.status === 'staged') {
        const committedSpan: CollapseSpan = { ...span, status: 'committed' as CollapseSpanStatus };
        committed.push(committedSpan);
        return committedSpan;
      }
      return span;
    });
    return committed;
  }

  /** 排空 committed spans（按 token gap 需要释放的量） */
  drainCommittedSpans(tokenGap: number): DrainResult {
    const committed = this._spans.filter(s => s.status === 'committed');

    if (committed.length === 0) {
      return { drained: [], remaining: [] };
    }

    // 按 estimatedTokens 从大到小排序（优先排空最大 span）
    const sorted = [...committed].sort((a, b) => b.estimatedTokens - a.estimatedTokens);

    let accumulatedTokens = 0;
    const drainedUuids = new Set<string>();

    for (const span of sorted) {
      if (accumulatedTokens >= tokenGap) break;
      accumulatedTokens += span.estimatedTokens;
      drainedUuids.add(span.boundaryUuid);
    }

    const drained = committed.filter(s => drainedUuids.has(s.boundaryUuid));
    const remaining = committed.filter(s => !drainedUuids.has(s.boundaryUuid));

    // 移除 drained spans
    this._spans = this._spans.filter(s => !drainedUuids.has(s.boundaryUuid));

    return { drained, remaining };
  }

  /** 从折叠快照重建对话视图（projectView） */
  getProjectView(messages: readonly AgentMessage[]): readonly AgentMessage[] {
    if (this._spans.length === 0) return messages;

    // 构建索引映射：哪些消息索引被哪个 span 覆盖
    const spanCoverage = new Map<number, CollapseSpan>();
    for (const span of this._spans) {
      for (let i = span.startIndex; i <= span.endIndex; i++) {
        spanCoverage.set(i, span);
      }
    }

    // 构建视图：被覆盖的消息替换为折叠占位符
    const view: AgentMessage[] = [];
    const seenBoundaries = new Set<string>();

    for (let i = 0; i < messages.length; i++) {
      const coveringSpan = spanCoverage.get(i);

      if (coveringSpan) {
        // 同一 boundary 只输出一次占位符
        if (!seenBoundaries.has(coveringSpan.boundaryUuid)) {
          seenBoundaries.add(coveringSpan.boundaryUuid);
          view.push({
            id: `collapsed_${coveringSpan.boundaryUuid}`,
            role: 'user' as const,
            content: `<collapsed boundary="${coveringSpan.boundaryUuid}">${coveringSpan.summary}</collapsed>`,
            timestamp: coveringSpan.createdAt,
            isMeta: true
          });
        }
        // 其他被覆盖的消息跳过
      } else {
        view.push(messages[i]);
      }
    }

    return view;
  }

  /** 重置所有 spans */
  reset(): void {
    this._spans = [];
  }
}
