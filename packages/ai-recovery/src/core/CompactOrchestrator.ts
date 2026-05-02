/** CompactOrchestrator — 统一编排(micro→auto cascade) */

import type {
  AutoCompactConfig,
  CompactHostProvider,
  CompactMessage,
  CompactResult,
  MicroCompactConfig,
  SessionMemoryCompactConfig
} from '../types/compact';
import { AutoCompactStrategy } from './AutoCompactStrategy';
import { MicroCompactStrategy } from './MicroCompactStrategy';

/**
 * CompactOrchestrator — 每轮执行顺序：
 *
 * 1. microCompact(messages) — per-turn轻量
 * 2. if shouldAutoCompact(tokenCount, maxTokens): a. autoCompact(messages) — 先SM再LLM
 */
export class CompactOrchestrator {
  private readonly microCompact: MicroCompactStrategy;
  private readonly autoCompact: AutoCompactStrategy;

  constructor(config?: {
    autoCompact?: Partial<AutoCompactConfig>;
    microCompact?: Partial<MicroCompactConfig>;
    sessionMemory?: Partial<SessionMemoryCompactConfig>;
  }) {
    this.microCompact = new MicroCompactStrategy(config?.microCompact);
    this.autoCompact = new AutoCompactStrategy(config?.autoCompact);
  }

  /** 执行压缩编排 */
  async compact(
    messages: CompactMessage[],
    hostProvider: CompactHostProvider
  ): Promise<CompactResult> {
    // 1. microCompact — per-turn轻量
    const microResult = await this.microCompact.compact(messages, hostProvider);
    if (microResult.wasCompacted) {
      return microResult;
    }

    // 2. autoCompact — threshold检测
    const tokenCount = await hostProvider.getCurrentTokenCount();
    const maxTokens = hostProvider.getMaxTokens();

    if (this.autoCompact.shouldAutoCompact(tokenCount, maxTokens)) {
      const autoResult = await this.autoCompact.compact(messages, hostProvider);
      return autoResult;
    }

    return { wasCompacted: false };
  }

  /** 检查是否需要autoCompact */
  shouldAutoCompact(tokenCount: number, maxTokens: number): boolean {
    return this.autoCompact.shouldAutoCompact(tokenCount, maxTokens);
  }

  /** 重置所有状态 */
  reset(): void {
    this.microCompact.resetState();
    this.autoCompact.resetCircuitBreaker();
  }
}
