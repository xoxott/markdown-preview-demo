/** PTLRetryHandler — AutoCompact 摘要请求自身 PTL 时按 group 裁剪重试 */

import type { AgentMessage } from '@suga/ai-agent-loop';
import type { PTLRetryConfig } from '../types/config';
import type { CallModelForSummary, IsPTLError, TokenEstimator } from '../types/injection';
import type { SummarySections } from '../types/messages';
import { DEFAULT_PTL_RETRY_MAX } from '../constants';
import { groupByApiRound } from '../utils/messageGrouping';

/** 默认 PTL 错误检测 — 检测包含 "Prompt is too long" 的错误 */
function defaultIsPTLError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.toLowerCase().includes('prompt is too long');
  }
  return false;
}

/**
 * PTLRetryHandler — 摘要请求自身 PTL 时的重试机制
 *
 * 当 AutoCompact 调用 LLM 生成摘要时，摘要请求本身也可能超过 context window。 此处理器按 API-round 分组裁剪 oldest messages，最多重试
 * maxPTLRetries 次。
 */
export class PTLRetryHandler {
  private readonly maxRetries: number;
  private readonly isPTLError: IsPTLError;

  constructor(config?: PTLRetryConfig, isPTLError?: IsPTLError) {
    this.maxRetries = config?.maxPTLRetries ?? DEFAULT_PTL_RETRY_MAX;
    this.isPTLError = isPTLError ?? defaultIsPTLError;
  }

  /**
   * retrySummary — 带重试的摘要生成
   *
   * @param messages 待摘要的消息
   * @param callModelForSummary LLM 摘要函数
   * @param tokenEstimator Token 估算函数
   * @param contextWindow 上下文窗口大小
   * @param summarySections 摘要段结构提示（可选）
   * @returns 摘要文本 或 null（重试全部失败）
   */
  async retrySummary(
    messages: readonly AgentMessage[],
    callModelForSummary: CallModelForSummary,
    tokenEstimator: TokenEstimator,
    contextWindow: number,
    summarySections?: SummarySections
  ): Promise<string | null> {
    let attemptMessages = messages;

    for (let retry = 0; retry <= this.maxRetries; retry++) {
      try {
        const summary = await callModelForSummary(attemptMessages, summarySections);
        return summary;
      } catch (error) {
        // 非 PTL 错误或达到重试上限 → 不重试
        if (!this.isPTLError(error) || retry >= this.maxRetries) {
          return null;
        }

        // PTL 错误 → 按 group 裁剪 oldest messages
        attemptMessages = truncateForPTLRetry(attemptMessages, tokenEstimator, contextWindow);

        // 裁剪后消息太少 → 无法摘要
        if (attemptMessages.length <= 1) {
          return null;
        }
      }
    }

    return null;
  }
}

/**
 * truncateForPTLRetry — 按 API-round 分组裁剪 oldest groups
 *
 * 从最老的 group 开始移除，直到估算 tokens < contextWindow。 保证至少保留 1 个 group（有内容可摘要）。
 */
function truncateForPTLRetry(
  messages: readonly AgentMessage[],
  tokenEstimator: TokenEstimator,
  contextWindow: number
): readonly AgentMessage[] {
  const groups = groupByApiRound(messages);

  // 从最老的 group 开始移除
  let _remainingCount = messages.length;

  for (let i = 0; i < groups.length - 1; i++) {
    // 保留最后一个 group
    const groupToRemove = groups[i];
    _remainingCount -= groupToRemove.messages.length;
    const remainingMessages = messages.slice(groupToRemove.endIndex + 1);

    if (tokenEstimator(remainingMessages) < contextWindow) {
      return remainingMessages;
    }
  }

  // 所有 group 都裁剪过了但仍超限 → 只保留最后一个 group
  return messages.slice(groups[groups.length - 1].startIndex);
}
