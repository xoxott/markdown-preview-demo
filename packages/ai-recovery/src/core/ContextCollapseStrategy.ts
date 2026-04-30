/** ContextCollapseStrategy — 增量折叠排空恢复（当前为 stub） */

import type { AgentMessage, ContinueTransition } from '@suga/ai-agent-loop';
import type { CompressPipeline } from '@suga/ai-context';
import type { ContextCollapseConfig } from '../types/config';

/** 生成唯一 ID */
function generateId(): string {
  return `collapse_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * 增量折叠策略
 *
 * 参考 Claude Code contextCollapse:
 * - 90% threshold → 触发折叠计划
 * - 95% threshold → 强制折叠排空
 * - Commit-Log 模型 + boundary uuid 标记折叠边界
 * - projectView replay 从折叠快照重建对话视图
 * - 与 AutoCompact 互斥（折叠期间暂停自动压缩）
 *
 * 当前为 stub 实现，使用 pipeline.reactiveCompact 作为临时替代。
 * TODO: 对接 P8 的 contextCollapse 方法（当 P8 暴露 collapse API 后）
 */
export class ContextCollapseStrategy {
  private readonly drainThreshold: number;
  private readonly planThreshold: number;
  private hasFolded = false;

  constructor(config?: ContextCollapseConfig) {
    this.drainThreshold = config?.drainThreshold ?? 0.95;
    this.planThreshold = config?.planThreshold ?? 0.9;
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
   * 执行折叠排空
   *
   * 当前使用 pipeline.reactiveCompact 作为临时替代。
   * 折叠成功 → collapse_drain_retry（使用 foldedMessages + boundaryUuid）
   * 折叠失败 → 回退到 reactive_compact_retry
   */
  async collapse(
    messages: readonly AgentMessage[],
    pipeline: CompressPipeline
  ): Promise<ContinueTransition> {
    const result = await pipeline.reactiveCompact(messages);

    if (!result.didCompress) {
      // 折叠失败 → 回退到 reactive_compact_retry
      return { type: 'reactive_compact_retry', compressedMessages: result.messages };
    }

    // 折叠成功 → collapse_drain_retry
    return {
      type: 'collapse_drain_retry',
      foldedMessages: result.messages,
      boundaryUuid: generateId()
    };
  }

  /** 重置折叠状态 */
  reset(): void {
    this.hasFolded = false;
  }

  /** 是否已执行过折叠 */
  get hasCollapsed(): boolean {
    return this.hasFolded;
  }
}
