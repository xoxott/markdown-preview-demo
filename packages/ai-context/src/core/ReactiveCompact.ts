/** ReactiveCompact — API 413 后紧急压缩 */

import type { AgentMessage } from '@suga/ai-agent-loop';
import type { CompressLayer, CompressResult, CompressState } from '../types/compressor';
import type { ReactiveCompactConfig } from '../types/config';
import type { CallModelForSummary } from '../types/injection';
import { DEFAULT_REACTIVE_STRATEGY } from '../constants';
import { TimeBasedMicroCompactLayer } from './TimeBasedMicroCompact';
import { AutoCompactLayer } from './AutoCompact';

/** ReactiveCompact 压缩层 — 仅在 API 413 后手动触发 */
export class ReactiveCompactLayer implements CompressLayer {
  readonly name = 'ReactiveCompact';
  private readonly enabled: boolean;
  private readonly strategy: 'micro_compact' | 'auto_compact' | 'both';
  private readonly callModelForSummary?: CallModelForSummary;

  constructor(config?: ReactiveCompactConfig, callModelForSummary?: CallModelForSummary) {
    this.enabled = config?.enabled ?? true;
    this.strategy = config?.strategy ?? DEFAULT_REACTIVE_STRATEGY;
    this.callModelForSummary = callModelForSummary;
  }

  async compress(messages: readonly AgentMessage[], state: CompressState): Promise<CompressResult> {
    if (!this.enabled) {
      return { messages, didCompress: false };
    }

    let currentMessages = messages;
    let anyCompressed = false;

    if (this.strategy === 'micro_compact' || this.strategy === 'both') {
      // 激进时间清除: keepRecent=0, gapThreshold=0（立即清除所有旧结果）
      const microLayer = new TimeBasedMicroCompactLayer({
        gapThresholdMinutes: 0,
        compactableTools: state.config.microCompact?.compactableTools ?? [
          'Read',
          'Shell',
          'Grep',
          'Glob',
          'WebSearch',
          'WebFetch',
          'Edit',
          'Write'
        ],
        keepRecent: 0
      });
      const result = await microLayer.compress(currentMessages, state);
      if (result.didCompress) {
        currentMessages = result.messages;
        anyCompressed = true;
      }
    }

    if (this.strategy === 'auto_compact' || this.strategy === 'both') {
      // 激进摘要压缩: messagesToKeep=2
      const autoLayer = new AutoCompactLayer(
        {
          thresholdRatio: 0,
          maxConsecutiveFailures: state.config.autoCompact?.maxConsecutiveFailures ?? 3,
          messagesToKeep: 2
        },
        this.callModelForSummary
      );
      // 修改 state 以确保触发
      const reactiveState = { ...state, estimatedTokens: state.contextWindow + 1 };
      const result = await autoLayer.compress(currentMessages, reactiveState);
      if (result.didCompress) {
        currentMessages = result.messages;
        anyCompressed = true;
      }
    }

    return { messages: currentMessages, didCompress: anyCompressed };
  }
}
