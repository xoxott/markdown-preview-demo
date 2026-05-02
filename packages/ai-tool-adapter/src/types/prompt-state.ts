/** Prompt State 类型 — 两阶段 Cache Break 检测的预调用/后调用快照 */

/** Prompt State 快照 — 预调用记录 */
export interface PromptStateSnapshot {
  /** Prompt 内容 hash（system + messages 前缀） */
  readonly contentHash: string;
  /** 记录时间戳 */
  readonly timestamp: number;
  /** 预调用的 inputTokens 估算 */
  readonly inputTokenCount: number;
  /** Cache-friendly 前缀长度（字符数） */
  readonly cachePrefixLength: number;
}

/** 增强版 Cache Break 检测结果 */
export interface PromptCacheBreakResult {
  /** 是否检测到缓存断裂 */
  readonly isCacheBreak: boolean;
  /** 断裂原因 */
  readonly reason?:
    | 'hash_changed'
    | 'ttl_expired'
    | 'cache_creation_spike'
    | 'cache_read_drop'
    | 'input_prefix_changed';
  /** 前一次 Prompt State 快照 */
  readonly previousSnapshot?: PromptStateSnapshot;
  /** 当前 Prompt State 快照 */
  readonly currentSnapshot?: PromptStateSnapshot;
  /** 缓存命中率（当前请求） */
  readonly cacheHitRate?: number;
  /** 前一次请求的缓存命中率 */
  readonly previousCacheHitRate?: number;
  /** 推断的 Cache TTL（秒） */
  readonly estimatedTTL?: number;
  /** 建议动作 */
  readonly recommendedAction?:
    | 'retry_with_same_prefix'
    | 'accept_and_continue'
    | 'reduce_context'
    | 'notify_host';
}

/** 两阶段检测配置 */
export interface PromptStateTrackerConfig {
  /** hash 前缀截取长度（默认 4000 字符） */
  readonly hashPrefixLength?: number;
  /** Cache TTL 估算（秒，默认 300 = 5分钟 ephemeral） */
  readonly estimatedCacheTTL?: number;
  /** 低于此 inputTokenCount 不做检测（默认 100） */
  readonly minInputTokens?: number;
}
