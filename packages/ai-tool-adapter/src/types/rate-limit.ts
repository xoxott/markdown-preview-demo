/** Rate Limit 类型 — Anthropic API 速率限制状态 */

/** Anthropic API 速率限制状态（从 response headers 提取） */
export interface RateLimitStatus {
  /** 请求配额上限 */
  readonly requestsLimit: number;
  /** 剩余请求配额 */
  readonly requestsRemaining: number;
  /** 请求配额重置时间 */
  readonly requestsResetAt: Date | null;
  /** Token 配额上限 */
  readonly tokensLimit: number;
  /** 剩余 Token 配额 */
  readonly tokensRemaining: number;
  /** Token 配额重置时间 */
  readonly tokensResetAt: Date | null;
}

/** Rate Limit Provider — 宿主注入接口 */
export interface RateLimitProvider {
  /** 速率限制状态更新回调 */
  onRateLimitUpdate(status: RateLimitStatus): void;
  /** 获取当前速率限制状态 */
  getCurrentStatus(): RateLimitStatus | undefined;
}
