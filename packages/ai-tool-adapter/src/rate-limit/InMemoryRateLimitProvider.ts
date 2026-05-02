/** 内存 Rate Limit Provider 实现 — 测试用 */

import type { RateLimitProvider, RateLimitStatus } from '../types/rate-limit';

/**
 * InMemoryRateLimitProvider — 内存默认实现
 *
 * 存储最近一次 RateLimitStatus，宿主可监听状态变化。
 */
export class InMemoryRateLimitProvider implements RateLimitProvider {
  private currentStatus?: RateLimitStatus;
  /** 状态变化回调（宿主注入） */
  private readonly onUpdate?: (status: RateLimitStatus) => void;

  constructor(onUpdate?: (status: RateLimitStatus) => void) {
    this.onUpdate = onUpdate;
  }

  onRateLimitUpdate(status: RateLimitStatus): void {
    this.currentStatus = status;
    this.onUpdate?.(status);
  }

  getCurrentStatus(): RateLimitStatus | undefined {
    return this.currentStatus;
  }

  /** 重置（用于测试） */
  reset(): void {
    this.currentStatus = undefined;
  }
}
