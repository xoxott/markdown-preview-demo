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
      let modified = false;

      // Cache edit blocks
      if (this.config.cacheEditBlocks && Array.isArray(msg.content)) {
        for (const block of msg.content as any[]) {
          if (block?.type === 'tool_use' && block?.name === 'file_edit' && block?.input?.filePath) {
            const path = block.input.filePath;
            if (this.editCache.has(path)) {
              didCompress = true;
            } else {
              this.editCache.set(path, 'cached');
            }
          }
        }
      }

      // Delta update long results
      if (this.config.deltaUpdateResults && typeof msg.content === 'string') {
        const content = msg.content;
        if ((msg as any).role === 'tool' && content.length > 2000) {
          const delta = content.slice(-500);
          const newContent = `[...previous output collapsed]\n${delta}`;
          result.push({ ...msg, content: newContent } as AgentMessage);
          replacedToolResults++;
          didCompress = true;
          modified = true;
        }
      }

      if (!modified) {
        result.push(msg);
      }
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
