/** AutoCompactStrategy — threshold检测+SM优先+LLM fallback+熔断器 */

import type {
  AutoCompactConfig,
  CompactHostProvider,
  CompactMessage,
  CompactResult
} from '../types/compact';
import { DEFAULT_AUTO_COMPACT_CONFIG } from '../types/compact';
import { SessionMemoryCompact } from './SessionMemoryCompact';

/**
 * AutoCompactStrategy — 自动上下文压缩
 *
 * 策略级联：
 *
 * 1. 检查 threshold (tokenCount >= maxTokens * drainThreshold)
 * 2. 熔断器：连续失败3次后停止
 * 3. 先尝试 SessionMemoryCompact（无API调用）
 * 4. SM失败 → LLM摘要（调用 summarizeConversation）
 * 5. 成功 → 返回CompactResult
 * 6. 失败 → increment failures
 */
export class AutoCompactStrategy {
  private readonly config: AutoCompactConfig;
  private readonly smCompact: SessionMemoryCompact;
  private consecutiveFailures = 0;

  constructor(config?: Partial<AutoCompactConfig>) {
    this.config = { ...DEFAULT_AUTO_COMPACT_CONFIG, ...config };
    this.smCompact = new SessionMemoryCompact();
  }

  /** 检查是否需要自动压缩 */
  shouldAutoCompact(tokenCount: number, maxTokens: number): boolean {
    if (this.consecutiveFailures >= this.config.maxConsecutiveFailures) return false;
    return tokenCount >= maxTokens * this.config.drainThreshold;
  }

  /** 执行自动压缩 */
  async compact(
    messages: CompactMessage[],
    hostProvider: CompactHostProvider
  ): Promise<CompactResult> {
    const tokenCount = await hostProvider.getCurrentTokenCount();
    const maxTokens = hostProvider.getMaxTokens();

    if (!this.shouldAutoCompact(tokenCount, maxTokens)) {
      return { wasCompacted: false };
    }

    const preCompactTokenCount = tokenCount;

    // 先尝试 SessionMemoryCompact
    try {
      const smResult = await this.smCompact.compact(messages, hostProvider);
      if (smResult.wasCompacted) {
        this.consecutiveFailures = 0;
        return { ...smResult, preCompactTokenCount };
      }
    } catch {
      // SM失败，继续尝试LLM路径
    }

    // LLM摘要路径
    try {
      const summary = await hostProvider.summarizeConversation(messages);
      if (!summary) {
        this.consecutiveFailures++;
        return { wasCompacted: false, preCompactTokenCount };
      }

      this.consecutiveFailures = 0;
      return {
        wasCompacted: true,
        strategy: 'llm',
        preCompactTokenCount,
        summary
      };
    } catch {
      this.consecutiveFailures++;
      return { wasCompacted: false, preCompactTokenCount };
    }
  }

  /** 重置熔断器 */
  resetCircuitBreaker(): void {
    this.consecutiveFailures = 0;
  }

  /** 获取当前连续失败次数 */
  getConsecutiveFailures(): number {
    return this.consecutiveFailures;
  }
}
