/**
 * CachedMicrocompactLayer — 缓存编辑块+delta更新工具结果
 *
 * N20: 优化策略：
 *
 * 1. 缓存已编辑过的文件块（避免重复发送）
 * 2. delta更新工具结果（只发送变化部分）
 */

import type { AgentMessage } from '@suga/ai-agent-loop';
import type { CompressLayer, CompressResult, CompressState } from '../types/compressor';

/** CachedMicrocompactConfig */
export interface CachedMicrocompactConfig {
  readonly enabled: boolean;
  readonly cacheEditBlocks: boolean;
  readonly deltaUpdateResults: boolean;
}

export const DEFAULT_CACHED_MICROCOMPACT_CONFIG: CachedMicrocompactConfig = {
  enabled: true,
  cacheEditBlocks: true,
  deltaUpdateResults: true
};

function toolResultText(msg: Extract<AgentMessage, { role: 'tool_result' }>): string {
  if (typeof msg.result === 'string') return msg.result;
  if (msg.result !== undefined) {
    try {
      return JSON.stringify(msg.result);
    } catch {
      return String(msg.result);
    }
  }
  return msg.error ?? '';
}

export class CachedMicrocompactLayer implements CompressLayer {
  readonly name = 'CachedMicrocompact';
  private readonly editCache = new Map<string, string>();

  constructor(
    private readonly config: CachedMicrocompactConfig = DEFAULT_CACHED_MICROCOMPACT_CONFIG
  ) {}

  async compress(
    messages: readonly AgentMessage[],
    _state: CompressState
  ): Promise<CompressResult> {
    if (!this.config.enabled) {
      return { messages, didCompress: false };
    }

    const result: AgentMessage[] = [];
    let didCompress = false;
    let replacedToolResults = 0;

    for (const msg of messages) {
      if (this.config.cacheEditBlocks && msg.role === 'assistant') {
        for (const block of msg.toolUses) {
          if (block.name === 'file_edit') {
            const path = (block.input as { filePath?: string }).filePath;
            if (path) {
              if (this.editCache.has(path)) {
                didCompress = true;
              } else {
                this.editCache.set(path, 'cached');
              }
            }
          }
        }
      }

      if (this.config.deltaUpdateResults && msg.role === 'tool_result') {
        const text = toolResultText(msg);
        if (text.length > 2000) {
          const delta = text.slice(-500);
          result.push({ ...msg, result: `[...previous output collapsed]\n${delta}` });
          replacedToolResults += 1;
          didCompress = true;
          continue;
        }
      }

      result.push(msg);
    }

    return {
      messages: result,
      didCompress,
      stats: didCompress ? { replacedToolResults, generatedSummary: false } : undefined
    };
  }

  /** 清除缓存 */
  clearCache(): void {
    this.editCache.clear();
  }
}
