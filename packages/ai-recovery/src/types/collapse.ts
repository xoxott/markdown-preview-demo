/** ContextCollapse 数据结构 — 增量折叠的 commit-log model */

import type { AgentMessage } from '@suga/ai-agent-loop';

/** 折叠状态 */
export type CollapseSpanStatus = 'staged' | 'committed';

/** Collapse Span — 一段折叠的消息范围 */
export interface CollapseSpan {
  /** 折叠边界唯一标识 */
  readonly boundaryUuid: string;
  /** 原始消息起始索引 */
  readonly startIndex: number;
  /** 原始消息结束索引 */
  readonly endIndex: number;
  /** LLM 生成的摘要 */
  readonly summary: string;
  /** 被归档的消息 ID 列表（用于 projectView 懒加载） */
  readonly archivedMessageIds: readonly string[];
  /** 该 span 的估算 token 数 */
  readonly estimatedTokens: number;
  /** 折叠状态：staged（90% 触发的计划）/ committed（95% 强制提交） */
  readonly status: CollapseSpanStatus;
  /** 创建时间戳 */
  readonly createdAt: number;
}

/** Drain 排空结果 */
export interface DrainResult {
  /** 被排空的 committed spans */
  readonly drained: readonly CollapseSpan[];
  /** 保留的 committed spans */
  readonly remaining: readonly CollapseSpan[];
}

/** Collapse Commit Log — 折叠提交日志 */
export interface CollapseCommitLog {
  /** 当前所有 spans（staged + committed） */
  readonly spans: readonly CollapseSpan[];
  /** 添加 staged span */
  addStagedSpan(span: CollapseSpan): void;
  /** 将所有 staged spans 标记为 committed */
  commitStagedSpans(): readonly CollapseSpan[];
  /** 排空 committed spans（按 token gap 需要释放的量） */
  drainCommittedSpans(tokenGap: number): DrainResult;
  /** 从折叠快照重建对话视图（projectView） */
  getProjectView(messages: readonly AgentMessage[]): readonly AgentMessage[];
  /** 重置所有 spans */
  reset(): void;
  /** 当前 staged spans 数量 */
  readonly stagedCount: number;
  /** 当前 committed spans 数量 */
  readonly committedCount: number;
}
