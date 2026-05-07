/**
 * PolicyLimits — 组织级策略限制服务
 *
 * N26: 从API获取组织策略限制+ETag缓存+fail-open+背景轮询
 */

/** PolicyLimits 配置 */
export interface PolicyLimitsConfig {
  readonly enabled: boolean;
  readonly pollIntervalMs: number;
  readonly failOpen: boolean;
  readonly etagCacheMs: number;
}

export const DEFAULT_POLICY_LIMITS_CONFIG: PolicyLimitsConfig = {
  enabled: true,
  pollIntervalMs: 300000,
  failOpen: true,
  etagCacheMs: 60000
};

/** 组织策略限制数据 */
export interface OrganizationPolicyLimits {
  readonly maxBudgetUsd?: number;
  readonly maxTokensPerDay?: number;
  readonly maxTokensPerSession?: number;
  readonly allowedModels?: readonly string[];
  readonly blockedTools?: readonly string[];
  readonly etag?: string;
  readonly fetchedAt: number;
}

/** FetchPolicyLimitsFn — 宿主注入的API获取函数 */
export type FetchPolicyLimitsFn = (
  etag?: string
) => Promise<{ data: OrganizationPolicyLimits | null; etag?: string }>;

/** InMemoryPolicyLimitsCache — 内存缓存 */
export class InMemoryPolicyLimitsCache {
  private cached: OrganizationPolicyLimits | null = null;
  private lastFetchTime = 0;

  constructor(private readonly cacheTtlMs: number = 60000) {}

  get(): OrganizationPolicyLimits | null {
    if (!this.cached) return null;
    if (Date.now() - this.lastFetchTime >= this.cacheTtlMs) {
      this.cached = null;
      return null;
    }
    return this.cached;
  }

  set(limits: OrganizationPolicyLimits): void {
    this.cached = limits;
    this.lastFetchTime = Date.now();
  }

  clear(): void {
    this.cached = null;
    this.lastFetchTime = 0;
  }
}

/** checkPolicyLimits — 检查当前操作是否符合组织策略 */
export function checkPolicyLimits(
  limits: OrganizationPolicyLimits | null,
  operation: {
    model?: string;
    toolName?: string;
    estimatedCostUsd?: number;
    estimatedTokens?: number;
  },
  config?: PolicyLimitsConfig
): { allowed: boolean; reason?: string } {
  const effectiveConfig = config ?? DEFAULT_POLICY_LIMITS_CONFIG;

  if (!limits) {
    return effectiveConfig.failOpen
      ? { allowed: true, reason: 'fail_open_no_limits_data' }
      : { allowed: false, reason: 'no_limits_data_available' };
  }

  if (operation.model && limits.allowedModels && !limits.allowedModels.includes(operation.model)) {
    return { allowed: false, reason: `model_not_allowed: ${operation.model}` };
  }

  if (operation.toolName && limits.blockedTools?.includes(operation.toolName)) {
    return { allowed: false, reason: `tool_blocked: ${operation.toolName}` };
  }

  if (
    limits.maxBudgetUsd &&
    operation.estimatedCostUsd &&
    operation.estimatedCostUsd > limits.maxBudgetUsd
  ) {
    return {
      allowed: false,
      reason: `budget_exceeded: ${operation.estimatedCostUsd} > ${limits.maxBudgetUsd}`
    };
  }

  return { allowed: true };
}
