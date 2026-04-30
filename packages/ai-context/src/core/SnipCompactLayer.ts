/** SnipCompactLayer — 裁剪历史冗余消息 */

import type { AgentMessage, ToolResultMessage } from '@suga/ai-agent-loop';
import type { CompressLayer, CompressState, CompressResult, CompressStats } from '../types/compressor';
import type { SnipCompactConfig } from '../types/config';
import { DEFAULT_SNIP_KEEP_RECENT, DEFAULT_SNIP_REMOVE_ORPHANED_RESULTS, TIME_CLEARED_MESSAGE } from '../constants';
import { replaceToolResultMessage, getMessageContentSize } from '../utils/messageHelpers';

/**
 * SnipCompact 层 — 裁剪历史冗余 tool_use/tool_result 对话
 *
 * Claude Code 源码参考: snipCompact 的核心逻辑是：
 * 1. 从旧消息中移除已完成工具调用的详细结果（保留简要标记）
 * 2. 移除孤立的 tool_result（没有对应 tool_use 的结果）
 * 3. 保留最近 N 个 tool_result 不裁剪
 *
 * 与 TimeBasedMicroCompact 的区别：
 * - SnipCompact 基于"位置"裁剪（旧的 = 距离末尾远的）
 * - TimeBasedMicroCompact 基于"时间"裁剪（距上次 assistant > 60min）
 */
export class SnipCompactLayer implements CompressLayer {
  readonly name = 'SnipCompact';

  private readonly keepRecent: number;
  private readonly removeOrphanedResults: boolean;

  constructor(config?: SnipCompactConfig) {
    this.keepRecent = config?.keepRecent ?? DEFAULT_SNIP_KEEP_RECENT;
    this.removeOrphanedResults = config?.removeOrphanedResults ?? DEFAULT_SNIP_REMOVE_ORPHANED_RESULTS;
  }

  async compress(messages: readonly AgentMessage[], _state: CompressState): Promise<CompressResult> {
    if (messages.length <= this.keepRecent) {
      return { messages, didCompress: false };
    }

    // 1. 收集所有 tool_use id
    const toolUseIds = new Set<string>();
    for (const msg of messages) {
      if (msg.role === 'assistant') {
        for (const tu of msg.toolUses) {
          toolUseIds.add(tu.id);
        }
      }
    }

    // 2. 收集所有 tool_result 的位置
    const toolResultIndices: number[] = [];
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].role === 'tool_result') {
        toolResultIndices.push(i);
      }
    }

    // 3. 确定哪些 tool_result 需要裁剪（保留最近 keepRecent 个）
    const preserveFrom = toolResultIndices.length - this.keepRecent;
    let anySnipped = false;
    const newMessages: AgentMessage[] = [...messages];

    for (let ri = 0; ri < toolResultIndices.length; ri++) {
      const idx = toolResultIndices[ri];

      // 保留最近 keepRecent 个 tool_result
      if (ri >= preserveFrom) continue;

      const msg = messages[idx] as ToolResultMessage;

      // 移除孤立的 tool_result（没有对应 tool_use）
      if (this.removeOrphanedResults && !toolUseIds.has(msg.toolUseId)) {
        newMessages[idx] = {
          ...msg,
          result: TIME_CLEARED_MESSAGE,
          error: undefined
        } as ToolResultMessage;
        anySnipped = true;
        continue;
      }

      // 裁剪旧 tool_result 的内容（保留简要标记）
      const contentSize = getMessageContentSize(msg);
      if (contentSize > 100) {
        const snippet = typeof msg.result === 'string'
          ? msg.result.slice(0, 100) + '...[snipped]'
          : '[snipped]';

        newMessages[idx] = replaceToolResultMessage(msg, snippet);
        anySnipped = true;
      }
    }

    if (!anySnipped) {
      return { messages, didCompress: false };
    }

    const stats: CompressStats = {
      snippedToolResults: toolResultIndices.slice(0, preserveFrom).length
    };

    return { messages: newMessages, didCompress: true, stats };
  }
}