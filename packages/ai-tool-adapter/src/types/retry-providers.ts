/** Retry Provider 类型 — 宿主注入接口 */

/** 查询源类型 — 用于 529 前后台分流 */
export type QuerySource =
  | 'repl'
  | 'sdk'
  | 'agent'
  | 'compact'
  | 'hook'
  | 'summary'
  | 'title'
  | 'classifier';

/** 前台查询源 — 529 只重试前台查询 */
export const FOREGROUND_QUERY_SOURCES: readonly QuerySource[] = [
  'repl',
  'sdk',
  'agent',
  'compact',
  'hook'
];

/** Auth 刷新 Provider — 401 时自动刷新 */
export interface AuthRefreshProvider {
  /** 刷新 OAuth/API Key，返回是否成功 */
  refreshAuth(): Promise<boolean>;
  /** 清除缓存的 credential */
  clearCredentialCache(): void;
}

/** 不可重试错误 — 529 后台查询 / context overflow 无法调整 */
export class CannotRetryError extends Error {
  readonly reason: string;
  constructor(message: string, reason: string) {
    super(message);
    this.name = 'CannotRetryError';
    this.reason = reason;
  }
}

/** 模型降级触发 — 连续 529 */
export class FallbackTriggeredError extends Error {
  readonly fallbackModel?: string;
  readonly consecutive529Count: number;
  constructor(message: string, consecutive529Count: number, fallbackModel?: string) {
    super(message);
    this.name = 'FallbackTriggeredError';
    this.consecutive529Count = consecutive529Count;
    this.fallbackModel = fallbackModel;
  }
}

/** 上下文溢出错误 — 包含推荐的 maxTokens */
export class ContextOverflowError extends Error {
  readonly recommendedMaxTokens: number;
  readonly inputTokens: number;
  readonly originalMaxTokens: number;
  readonly contextLimit: number;
  constructor(
    message: string,
    inputTokens: number,
    originalMaxTokens: number,
    contextLimit: number,
    recommendedMaxTokens: number
  ) {
    super(message);
    this.name = 'ContextOverflowError';
    this.inputTokens = inputTokens;
    this.originalMaxTokens = originalMaxTokens;
    this.contextLimit = contextLimit;
    this.recommendedMaxTokens = recommendedMaxTokens;
  }
}

/** 重试上下文 — 传递给下次调用的调整参数 */
export interface RetryContext {
  /** context overflow 时计算的推荐 maxTokens */
  maxTokensOverride?: number;
  /** auth refresh 后的新 API key */
  refreshedApiKey?: string;
}
