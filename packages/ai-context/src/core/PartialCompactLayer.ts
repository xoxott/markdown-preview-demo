/** PartialCompactLayer — AutoCompact 熔断时的保底部分截断 */

import type { AgentMessage } from '@suga/ai-agent-loop';
import type { CompressLayer, CompressResult, CompressState } from '../types/compressor';
import type { PartialCompactConfig } from '../types/config';
import { groupByApiRound } from '../utils/messageGrouping';

/** 默认配置 */
const DEFAULT_TRUNCATE_RATIO = 0.2;
const DEFAULT_MAX_TRUNCATED_GROUPS = 3;

/**
 * PartialCompact 层 — AutoCompact 熔断器触发后的保底策略
 *
 * 当 AutoCompact 连续失败达到 maxConsecutiveFailures 时， 对话仍可能持续增长直到 BlockingLimit 拦截。
 *
 * PartialCompact 作为 fallback：
 *
 * 1. 按 API round 分组消息
 * 2. 从 oldest groups 开始按 truncateRatio 裁剪
 * 3. 被裁剪的 groups 替换为占位符消息
 * 4. 保留至少 1 group + 最近 N messages
 *
 * 这不是 LLM 摘要，而是简单的消息截断，确保对话不会无限增长。
 */
export class PartialCompactLayer implements CompressLayer {
  readonly name = 'PartialCompact';
  private readonly enabled: boolean;
  private readonly truncateRatio: number;
  private readonly maxTruncatedGroups: number;

  constructor(config?: PartialCompactConfig) {
    this.enabled = config?.enabled ?? true;
    this.truncateRatio = config?.truncateRatio ?? DEFAULT_TRUNCATE_RATIO;
    this.maxTruncatedGroups = config?.maxTruncatedGroups ?? DEFAULT_MAX_TRUNCATED_GROUPS;
  }

  async compress(messages: readonly AgentMessage[], state: CompressState): Promise<CompressResult> {
    // 未启用 → 跳过
    if (!this.enabled) {
      return { messages, didCompress: false };
    }

    // 熔断器未触发 → 不需要保底（AutoCompact 还能工作）
    if (state.autoCompactFailures < 1) {
      return { messages, didCompress: false };
    }

    // 按 API round 分组
    const groups = groupByApiRound(messages);

    // 至少保留 1 group
    if (groups.length <= 1) {
      return { messages, didCompress: false };
    }

    // 计算要裁剪的 groups 数
    const groupsToTrim = Math.min(
      Math.ceil(groups.length * this.truncateRatio),
      this.maxTruncatedGroups,
      groups.length - 1 // 至少保留 1 group
    );

    if (groupsToTrim === 0) {
      return { messages, didCompress: false };
    }

    // 从 oldest groups 开始裁剪
    const trimmedGroups = groups.slice(0, groupsToTrim);
    const keptGroups = groups.slice(groupsToTrim);

    // 生成占位符消息
    const trimmedMsgCount = trimmedGroups.reduce((sum, g) => sum + g.messages.length, 0);
    const placeholderMsg: AgentMessage = {
      id: `partial_compact_${Date.now()}`,
      role: 'user',
      content: `[Partial compact: ${groupsToTrim} rounds (${trimmedMsgCount} messages) of earlier conversation removed]`,
      timestamp: Date.now(),
      isMeta: true
    };

    // 重建消息列表: 占位符 + 保留的 groups
    const keptMessages = keptGroups.flatMap(g => g.messages);
    const resultMessages: AgentMessage[] = [placeholderMsg, ...keptMessages];

    return {
      messages: resultMessages,
      didCompress: true,
      stats: {
        partialCompactTrimmedRounds: groupsToTrim,
        partialCompactTrimmedMessages: trimmedMsgCount
      }
    };
  }
}
