/** TimeBasedMicroCompact — 时间间隔清除旧 tool_result */

import type { AgentMessage } from '@suga/ai-agent-loop';
import type { CompressLayer, CompressState, CompressResult } from '../types/compressor';
import type { MicroCompactConfig } from '../types/config';
import {
  DEFAULT_MICRO_COMPACT_GAP_THRESHOLD_MINUTES,
  DEFAULT_MICRO_COMPACT_KEEP_RECENT,
  DEFAULT_COMPACTABLE_TOOLS,
  TIME_CLEARED_MESSAGE
} from '../constants';
import { collectToolUseBlocks, replaceToolResultMessage } from '../utils/messageHelpers';

/** TimeBasedMicroCompact 压缩层 */
export class TimeBasedMicroCompactLayer implements CompressLayer {
  readonly name = 'TimeBasedMicroCompact';
  private readonly gapThresholdMinutes: number;
  private readonly compactableTools: readonly string[];
  private readonly keepRecent: number;

  constructor(config?: MicroCompactConfig) {
    this.gapThresholdMinutes = config?.gapThresholdMinutes ?? DEFAULT_MICRO_COMPACT_GAP_THRESHOLD_MINUTES;
    this.compactableTools = config?.compactableTools ?? DEFAULT_COMPACTABLE_TOOLS;
    this.keepRecent = config?.keepRecent ?? DEFAULT_MICRO_COMPACT_KEEP_RECENT;
  }

  async compress(messages: readonly AgentMessage[], state: CompressState): Promise<CompressResult> {
    // 时间间隔不足 → 跳过
    if (state.lastAssistantTimestamp === null) {
      return { messages, didCompress: false };
    }

    const gapMs = state.currentTime - state.lastAssistantTimestamp;
    const thresholdMs = this.gapThresholdMinutes * 60_000;
    if (gapMs < thresholdMs) {
      return { messages, didCompress: false };
    }

    // 收集可清除的 ToolUseBlock
    const toolUseBlocks = collectToolUseBlocks(messages, this.compactableTools);
    if (toolUseBlocks.length === 0) {
      return { messages, didCompress: false };
    }

    // 保留最近 keepRecent 个，其余清除
    const idsToClear = toolUseBlocks.length > this.keepRecent
      ? toolUseBlocks.slice(0, toolUseBlocks.length - this.keepRecent).map(tu => tu.id)
      : [];

    if (idsToClear.length === 0) {
      return { messages, didCompress: false };
    }

    // 替换对应的 ToolResultMessage
    let clearedCount = 0;
    const newMessages: AgentMessage[] = [];
    for (const msg of messages) {
      if (msg.role === 'tool_result' && idsToClear.includes(msg.toolUseId)) {
        newMessages.push(replaceToolResultMessage(msg, TIME_CLEARED_MESSAGE));
        clearedCount++;
      } else {
        newMessages.push(msg);
      }
    }

    return {
      messages: newMessages,
      didCompress: true,
      stats: { timeClearedToolResults: clearedCount }
    };
  }
}