/** 用量追踪接口 — LLM API token 计数 + 额度追踪 + 溢出检测 */

/** LLM API 用量信息 */
export interface LLMUsageInfo {
  /** 输入 token 数 */
  readonly inputTokens: number;
  /** 输出 token 数 */
  readonly outputTokens: number;
  /** 缓存创建 token 数（prompt cache 写入） */
  readonly cacheCreationInputTokens?: number;
  /** 缓存读取 token 数（prompt cache 读取） */
  readonly cacheReadInputTokens?: number;
  /** 服务端工具使用输入 token 数 */
  readonly serverToolUseInputTokens?: number;
  /** 缓存创建 ephemeral token 数（5-min TTL 部分） */
  readonly cacheCreationEphemeralInputTokens?: number;
  /** 服务层级（如 "standard"、"priority"） */
  readonly serviceTier?: string;
  /** 推理地理位置标识（如 "us-east-1"） */
  readonly inferenceGeo?: string;
}

/** 用量追踪器接口 — 宿主注入实现 */
export interface UsageTracker {
  /** 记录一次 API 调用的用量 */
  trackUsage(usage: LLMUsageInfo): void;
  /** 获取累计用量统计 */
  getUsageSummary(): LLMUsageSummary;
  /** 检查是否达到额度限制 */
  isOverBudget(budget: TokenBudget): boolean;
}

/** 累计用量统计 */
export interface LLMUsageSummary {
  /** 总输入 token 数 */
  readonly totalInputTokens: number;
  /** 总输出 token 数 */
  readonly totalOutputTokens: number;
  /** 总缓存写入 token 数 */
  readonly totalCacheCreationTokens: number;
  /** 总缓存读取 token 数 */
  readonly totalCacheReadTokens: number;
  /** 总缓存写入 ephemeral token 数 */
  readonly totalCacheCreationEphemeralTokens: number;
  /** API 调用次数 */
  readonly apiCallCount: number;
}

/** Token 预算限制 */
export interface TokenBudget {
  /** 输入 token 上限 */
  readonly maxInputTokens?: number;
  /** 输出 token 上限 */
  readonly maxOutputTokens?: number;
  /** 总 token 上限 */
  readonly maxTotalTokens?: number;
}

/** 用量溢出检测结果 */
export interface OverageResult {
  /** 是否溢出 */
  readonly isOverage: boolean;
  /** 溢出的 token 数 */
  readonly overageTokens?: number;
  /** 溢出类型 */
  readonly overageType?: 'input' | 'output' | 'total';
  /** 建议动作 */
  readonly recommendedAction?: 'stop' | 'compact' | 'reduce_output';
}
