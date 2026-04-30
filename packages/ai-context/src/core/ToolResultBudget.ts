/** ToolResultBudget — 大结果替换为文件引用+预览 */

import type { AgentMessage } from '@suga/ai-agent-loop';
import type {
  CompressLayer,
  CompressState,
  CompressResult,
  CompressStats
} from '../types/compressor';
import type { CompressedToolResultContent } from '../types/messages';
import type { PersistToolResult } from '../types/injection';
import {
  DEFAULT_BUDGET_MAX_RESULT_SIZE,
  DEFAULT_BUDGET_PREVIEW_SIZE,
  PERSISTED_OUTPUT_TEMPLATE
} from '../constants';
import { getMessageContentSize, replaceToolResultMessage } from '../utils/messageHelpers';

/** 构建 <persisted-output> 替换文本 */
function buildPersistedOutput(
  originalSize: number,
  persistedPath: string,
  preview: string
): string {
  return `<persisted-output>\n${PERSISTED_OUTPUT_TEMPLATE.header} (${Math.round(originalSize / 1000)}KB).\n${PERSISTED_OUTPUT_TEMPLATE.savedPrefix} ${persistedPath}\n${PERSISTED_OUTPUT_TEMPLATE.previewPrefix}:\n${preview}\n</persisted-output>`;
}

/** ToolResultBudget 压缩层 */
export class ToolResultBudgetLayer implements CompressLayer {
  readonly name = 'ToolResultBudget';
  private readonly maxResultSize: number;
  private readonly previewSize: number;
  private readonly persistToolResult?: PersistToolResult;

  constructor(
    maxResultSize = DEFAULT_BUDGET_MAX_RESULT_SIZE,
    previewSize = DEFAULT_BUDGET_PREVIEW_SIZE,
    persistToolResult?: PersistToolResult
  ) {
    this.maxResultSize = maxResultSize;
    this.previewSize = previewSize;
    this.persistToolResult = persistToolResult;
  }

  async compress(messages: readonly AgentMessage[], state: CompressState): Promise<CompressResult> {
    const tracker = state.contentReplacement;
    const budgetConfig = state.config.budget;
    const maxSize = budgetConfig?.maxResultSize ?? this.maxResultSize;
    const prevSize = budgetConfig?.previewSize ?? this.previewSize;

    let replacedCount = 0;
    const newMessages: AgentMessage[] = [];

    for (const msg of messages) {
      if (msg.role !== 'tool_result') {
        newMessages.push(msg);
        continue;
      }

      const classification = tracker.classify(msg.toolUseId);

      if (classification === 'mustReapply') {
        // 已替换 → 重用缓存版本
        const cached = tracker.replacements.get(msg.toolUseId)!;
        const replacement = cached.persistedPath
          ? buildPersistedOutput(cached.originalSize, cached.persistedPath, cached.preview ?? '')
          : (cached.preview ?? '');
        newMessages.push(replaceToolResultMessage(msg, replacement));
        replacedCount++;
      } else if (classification === 'frozen') {
        // 不可替换
        newMessages.push(msg);
      } else {
        // fresh → 判断大小
        const size = getMessageContentSize(msg);
        if (size > maxSize) {
          // 大结果 → 替换
          const preview = (
            typeof msg.result === 'string' ? msg.result : JSON.stringify(msg.result ?? '')
          ).slice(0, prevSize);
          let persistedPath = '';
          if (this.persistToolResult) {
            persistedPath = await this.persistToolResult(msg.toolUseId, msg.result);
          }
          const replacement = buildPersistedOutput(size, persistedPath, preview);
          const compressedContent: CompressedToolResultContent = {
            originalSize: size,
            compressionType: 'budget',
            persistedPath,
            preview
          };
          tracker.recordReplacement(msg.toolUseId, compressedContent);
          newMessages.push(replaceToolResultMessage(msg, replacement));
          replacedCount++;
        } else {
          // 小结果 → 标记 seen 但不替换
          tracker.markSeen(msg.toolUseId);
          newMessages.push(msg);
        }
      }
    }

    const didCompress = replacedCount > 0;
    const stats: CompressStats | undefined = didCompress
      ? { replacedToolResults: replacedCount }
      : undefined;

    return { messages: newMessages, didCompress, stats };
  }
}
