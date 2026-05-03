/** ContextCollapseStrategy — 增量折叠排空恢复（commit-log model） */

import type { AgentMessage, ContinueTransition } from '@suga/ai-agent-loop';
import type { CompressPipeline } from '@suga/ai-context';
import { estimateTokensPrecise, groupByApiRound } from '@suga/ai-context';
import type { ContextCollapseConfig } from '../types/config';
import type { CollapseCommitLog, CollapseSpan, DrainResult } from '../types/collapse';
import { CollapseCommitLogImpl } from './CollapseCommitLog';

/** 从AgentMessage提取文本内容 — UserMessage/AssistantMessage有content, ToolResultMessage用error/result */
function getMessageContent(msg: AgentMessage | undefined): string | undefined {
  if (!msg) return undefined;
  if (msg.role === 'user' || msg.role === 'assistant') return msg.content;
  if (msg.role === 'tool_result') return msg.error ?? String(msg.result ?? '');
  return undefined;
}

/** 生成唯一 ID */
function generateId(): string {
  return `collapse_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** 默认摘要输出预留 */
const DEFAULT_OUTPUT_RESERVE_TOKENS = 20_000;

/** 默认最大 staged spans 数 */
const DEFAULT_MAX_STAGED_SPANS = 5;

/**
 * 增量折叠策略（commit-log model）
 *
 * 参考 Claude Code contextCollapse:
 *
 * - 90% threshold → 触发折叠计划（创建 staged spans）
 * - 95% threshold → 强制折叠排空（commit staged → committed → drain）
 * - Commit-Log 模型 + boundary uuid 标记折叠边界
 * - projectView replay 从折叠快照重建对话视图
 * - recoverFromOverflow drain: 413时优先drain committed spans
 * - 与 AutoCompact 互斥（折叠期间暂停自动压缩）
 */
export class ContextCollapseStrategy {
  private readonly drainThreshold: number;
  private readonly planThreshold: number;
  // @ts-ignore — 未来折叠逻辑使用
  private readonly _outputReserveTokens: number;
  private readonly maxStagedSpans: number;
  readonly commitLog: CollapseCommitLog;

  constructor(config?: ContextCollapseConfig) {
    this.drainThreshold = config?.drainThreshold ?? 0.95;
    this.planThreshold = config?.planThreshold ?? 0.9;
    this._outputReserveTokens = config?.outputReserveTokens ?? DEFAULT_OUTPUT_RESERVE_TOKENS;
    this.maxStagedSpans = config?.maxStagedSpans ?? DEFAULT_MAX_STAGED_SPANS;
    this.commitLog = new CollapseCommitLogImpl();
  }

  /** 检查是否需要强制折叠 */
  shouldCollapse(currentTokens: number, maxTokens: number): boolean {
    return currentTokens >= maxTokens * this.drainThreshold;
  }

  /** 检查是否需要触发折叠计划 */
  shouldPlanCollapse(currentTokens: number, maxTokens: number): boolean {
    return currentTokens >= maxTokens * this.planThreshold;
  }

  /**
   * 创建 staged spans（90% threshold 触发的折叠计划）
   *
   * 按 API round 分组，从 oldest group 开始创建 staged span， 每个 span 包含一段消息范围的摘要和估算 token 数。
   */
  async planCollapse(
    messages: readonly AgentMessage[],
    currentTokens: number,
    maxTokens: number,
    pipeline: CompressPipeline
  ): Promise<readonly CollapseSpan[]> {
    // 检查是否已在阈值内
    if (!this.shouldPlanCollapse(currentTokens, maxTokens)) {
      return [];
    }

    // 已达到最大 staged spans 数
    if (this.commitLog.stagedCount >= this.maxStagedSpans) {
      return [];
    }

    // 按 API round 分组消息
    const groups = groupByApiRound(messages);

    // 找出尚未折叠的 groups
    const foldedIds = new Set<string>();
    for (const span of this.commitLog.spans) {
      for (const id of span.archivedMessageIds) {
        foldedIds.add(id);
      }
    }

    // 从 oldest group 开始，跳过已折叠的
    const newSpans: CollapseSpan[] = [];
    let tokensToFree = currentTokens - maxTokens * this.planThreshold;

    for (const group of groups) {
      // 跳过已折叠的消息
      const unfoldedMessages = group.messages.filter(m => !foldedIds.has(m.id));
      if (unfoldedMessages.length === 0) continue;

      const groupTokens = estimateTokensPrecise(unfoldedMessages);

      // 生成摘要（使用 pipeline 压缩获取）
      const boundaryUuid = generateId();
      const summaryResult = await pipeline.reactiveCompact(unfoldedMessages);

      const span: CollapseSpan = {
        boundaryUuid,
        startIndex: group.startIndex,
        endIndex: group.endIndex,
        summary: summaryResult.didCompress
          ? (getMessageContent(summaryResult.messages[0]) ?? 'Compressed conversation segment')
          : `[Segment ${group.startIndex}-${group.endIndex} collapsed]`,
        archivedMessageIds: unfoldedMessages.map(m => m.id),
        estimatedTokens: groupTokens,
        status: 'staged',
        createdAt: Date.now()
      };

      this.commitLog.addStagedSpan(span);
      newSpans.push(span);

      tokensToFree -= groupTokens;
      if (tokensToFree <= 0 || this.commitLog.stagedCount >= this.maxStagedSpans) break;
    }

    return newSpans;
  }

  /**
   * 提交 staged spans（95% threshold 强制提交）
   *
   * 将所有 staged spans 标记为 committed， 并返回 projectView 重建后的消息列表。
   */
  commitStaged(messages: readonly AgentMessage[]): ContinueTransition {
    const committed = this.commitLog.commitStagedSpans();

    if (committed.length === 0) {
      // 无 staged spans → 直接 drain（回退到 pipeline.reactiveCompact）
      // 这种情况理论上不应发生（shouldCollapse 应先触发 planCollapse）
      return { type: 'next_turn' };
    }

    // 使用 projectView 重建对话视图
    const viewMessages = this.commitLog.getProjectView(messages);
    const boundaryUuid = committed.length > 0 ? committed[0].boundaryUuid : generateId();

    return {
      type: 'collapse_drain_retry',
      foldedMessages: viewMessages as AgentMessage[],
      boundaryUuid
    };
  }

  /**
   * 执行折叠排空
   *
   * 兼容旧调用方式：直接调用 pipeline.reactiveCompact。 新方式应使用 planCollapse → commitStaged → drainOverflow。
   */
  async collapse(
    messages: readonly AgentMessage[],
    pipeline: CompressPipeline
  ): Promise<ContinueTransition> {
    // 尝试 commit-log 方式（如果有 staged spans）
    if (this.commitLog.stagedCount > 0) {
      return this.commitStaged(messages);
    }

    // fallback: 使用 pipeline.reactiveCompact 作为临时替代
    const result = await pipeline.reactiveCompact(messages);

    if (!result.didCompress) {
      return { type: 'reactive_compact_retry', compressedMessages: result.messages };
    }

    // 创建一个 span 记录此次折叠
    const boundaryUuid = generateId();
    const span: CollapseSpan = {
      boundaryUuid,
      startIndex: 0,
      endIndex: messages.length - 1,
      summary:
        (result.messages[0] as { content?: string } | undefined)?.content ??
        'Collapsed conversation',
      archivedMessageIds: messages.map(m => m.id),
      estimatedTokens: estimateTokensPrecise(messages),
      status: 'committed',
      createdAt: Date.now()
    };
    this.commitLog.addStagedSpan(span);
    this.commitLog.commitStagedSpans();

    return {
      type: 'collapse_drain_retry',
      foldedMessages: result.messages,
      boundaryUuid
    };
  }

  /**
   * 排空溢出的 committed spans
   *
   * 当 API 413 且有 committed spans 时， 按 token gap 需要释放的量排空最大的 committed spans。
   *
   * @param tokenGap 需要释放的 token 数（来自 PTL token gap 解析）
   * @returns 排空结果和 transition
   */
  drainOverflow(
    tokenGap: number,
    messages: readonly AgentMessage[]
  ): DrainResult & { transition: ContinueTransition } {
    const drainResult = this.commitLog.drainCommittedSpans(tokenGap);

    if (drainResult.drained.length === 0) {
      // 无可排空的 committed spans → 回退
      return {
        ...drainResult,
        transition: { type: 'next_turn' }
      };
    }

    // projectView 重建
    const viewMessages = this.commitLog.getProjectView(messages);
    const boundaryUuid = drainResult.drained[0]?.boundaryUuid ?? generateId();

    return {
      ...drainResult,
      transition: {
        type: 'collapse_drain_retry',
        foldedMessages: viewMessages as AgentMessage[],
        boundaryUuid
      }
    };
  }

  /** 重置折叠状态 */
  reset(): void {
    this.commitLog.reset();
  }

  /** 是否已执行过折叠 */
  get hasCollapsed(): boolean {
    return this.commitLog.spans.length > 0;
  }
}
