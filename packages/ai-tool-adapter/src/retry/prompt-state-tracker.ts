/** Prompt State Tracker — 两阶段 Cache Break 检测（预调用 hash 记录 + 后调用比对） */

import type { AgentMessage } from '@suga/ai-agent-loop';
import type { LLMUsageInfo } from '../types/usage';
import type {
  PromptCacheBreakResult,
  PromptStateSnapshot,
  PromptStateTrackerConfig
} from '../types/prompt-state';
import { calculateCacheHitRate } from './cache-break-detection';

/** 默认配置 */
const DEFAULT_TRACKER_CONFIG: PromptStateTrackerConfig = {
  hashPrefixLength: 4000,
  estimatedCacheTTL: 300, // 5-minute ephemeral
  minInputTokens: 100
};

/**
 * djb2 字符串 hash 算法
 *
 * 不引入 crypto npm 依赖，使用经典 djb2 算法（约 5 行实现）。 只 hash 前 N 字符匹配 Anthropic 的 cache prefix 逻辑。
 *
 * @param str 要 hash 的字符串
 * @returns 32-bit hash 值的十六进制字符串
 */
export function computePromptHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
  }
  return hash.toString(16);
}

/**
 * 生成预调用的 Prompt State 快照
 *
 * 将 system prompt + messages 前缀拼接后截取前 N 字符做 hash， 记录时间戳和估算的 token 数。
 *
 * @param systemPrompt system prompt 字符串
 * @param messages Agent 消息序列
 * @param timestamp 记录时间戳（默认 Date.now()）
 * @param config tracker 配置
 * @returns PromptStateSnapshot
 */
export function recordPromptState(
  systemPrompt: string,
  messages: readonly AgentMessage[],
  timestamp?: number,
  config?: PromptStateTrackerConfig
): PromptStateSnapshot {
  const effectiveConfig = config ?? DEFAULT_TRACKER_CONFIG;
  const prefixLength = effectiveConfig.hashPrefixLength ?? DEFAULT_TRACKER_CONFIG.hashPrefixLength!;

  // 构造 prompt 内容前缀
  const contentPrefix = buildContentPrefix(systemPrompt, messages, prefixLength);
  const contentHash = computePromptHash(contentPrefix);

  // 估算 token 数（粗略：4字符≈1token）
  const estimatedTokens = Math.ceil(contentPrefix.length / 4);

  return {
    contentHash,
    timestamp: timestamp ?? Date.now(),
    inputTokenCount: estimatedTokens,
    cachePrefixLength: contentPrefix.length
  };
}

/**
 * 两阶段 Cache Break 检测的后调用比对
 *
 * 先比对 hash（检测 prompt 是否发生变化），再结合 usage 做 cache hit rate 对比检测 spike/drop/prefix_changed，最后估算 TTL。
 *
 * @param currentUsage 当前请求的用量信息
 * @param previousSnapshot 前一次请求的预调用快照
 * @param currentSnapshot 当前请求的预调用快照
 * @param config tracker 配置
 * @returns PromptCacheBreakResult
 */
export function checkPromptStateForCacheBreak(
  currentUsage: LLMUsageInfo,
  previousSnapshot: PromptStateSnapshot,
  currentSnapshot: PromptStateSnapshot,
  config?: PromptStateTrackerConfig
): PromptCacheBreakResult {
  const effectiveConfig = config ?? DEFAULT_TRACKER_CONFIG;
  const minInputTokens = effectiveConfig.minInputTokens ?? DEFAULT_TRACKER_CONFIG.minInputTokens!;
  const cacheTTL = effectiveConfig.estimatedCacheTTL ?? DEFAULT_TRACKER_CONFIG.estimatedCacheTTL!;

  // inputToken 数过低，不做检测
  if (currentUsage.inputTokens < minInputTokens) {
    return { isCacheBreak: false };
  }

  const currentHitRate = calculateCacheHitRate(currentUsage);

  // 估算 previousCacheHitRate：基于 previousSnapshot 的 token 估算
  // 如果前一次请求有缓存读取，估算 previousCacheHitRate > 0
  // 简化：previousCacheHitRate 基于 previousSnapshot.inputTokenCount 估算
  const previousCacheHitRate: number =
    previousSnapshot.inputTokenCount > 0
      ? Math.min(1, previousSnapshot.cachePrefixLength / (previousSnapshot.inputTokenCount * 4))
      : 0;

  // 阶段 1：hash 变化 → prompt 内容发生变化（最严重的断裂）
  if (previousSnapshot.contentHash !== currentSnapshot.contentHash) {
    return {
      isCacheBreak: true,
      reason: 'hash_changed',
      previousSnapshot,
      currentSnapshot,
      cacheHitRate: currentHitRate,
      previousCacheHitRate,
      recommendedAction: 'accept_and_continue'
    };
  }

  // 阶段 2：TTL 推断 — 检查是否超过估计的 cache TTL
  const elapsedSeconds = (currentSnapshot.timestamp - previousSnapshot.timestamp) / 1000;
  if (elapsedSeconds > cacheTTL) {
    // 检查 cache read 是否下降
    const cacheReadTokens = currentUsage.cacheReadInputTokens ?? 0;
    const cacheCreationTokens = currentUsage.cacheCreationInputTokens ?? 0;

    if (cacheReadTokens === 0 && cacheCreationTokens > 0) {
      return {
        isCacheBreak: true,
        reason: 'ttl_expired',
        previousSnapshot,
        currentSnapshot,
        cacheHitRate: currentHitRate,
        previousCacheHitRate,
        estimatedTTL: cacheTTL,
        recommendedAction: 'retry_with_same_prefix'
      };
    }
  }

  // 阶段 3：从有缓存到完全无缓存 → input_prefix_changed
  // 优先级高于 cache_creation_spike，因为它表示整个 prefix 失效
  const currentCacheRead = currentUsage.cacheReadInputTokens ?? 0;
  const currentCacheCreation = currentUsage.cacheCreationInputTokens ?? 0;
  if (currentCacheRead === 0 && currentCacheCreation > 0 && previousCacheHitRate > 0.3) {
    return {
      isCacheBreak: true,
      reason: 'input_prefix_changed',
      previousSnapshot,
      currentSnapshot,
      cacheHitRate: currentHitRate,
      previousCacheHitRate,
      recommendedAction: 'notify_host'
    };
  }

  // 阶段 4：cache hit rate 突降检测
  if (previousCacheHitRate > 0 && currentHitRate < previousCacheHitRate * 0.5) {
    return {
      isCacheBreak: true,
      reason: 'cache_read_drop',
      previousSnapshot,
      currentSnapshot,
      cacheHitRate: currentHitRate,
      previousCacheHitRate,
      recommendedAction: 'reduce_context'
    };
  }

  // 阶段 5：cache creation 突增检测
  const currentCacheCreationTokens = currentUsage.cacheCreationInputTokens ?? 0;
  if (currentCacheCreationTokens > 0 && previousSnapshot.inputTokenCount > 0) {
    const creationRatio = currentCacheCreationTokens / previousSnapshot.inputTokenCount;
    if (creationRatio > 0.5) {
      return {
        isCacheBreak: true,
        reason: 'cache_creation_spike',
        previousSnapshot,
        currentSnapshot,
        cacheHitRate: currentHitRate,
        previousCacheHitRate,
        recommendedAction: 'retry_with_same_prefix'
      };
    }
  }

  return {
    isCacheBreak: false,
    previousSnapshot,
    currentSnapshot,
    cacheHitRate: currentHitRate,
    previousCacheHitRate
  };
}

/**
 * Prompt State Tracker — 管理 previousSnapshot 历史
 *
 * 提供便捷 API：
 *
 * - recordBeforeRequest() → 生成当前快照并保存为 previous
 * - checkAfterResponse() → 用新快照+usage 比对
 */
export class PromptStateTracker {
  private previousSnapshot?: PromptStateSnapshot;
  private readonly config: PromptStateTrackerConfig;

  constructor(config?: PromptStateTrackerConfig) {
    this.config = config ?? DEFAULT_TRACKER_CONFIG;
  }

  /** 生成预调用快照并保存为 previous */
  recordBeforeRequest(
    systemPrompt: string,
    messages: readonly AgentMessage[],
    timestamp?: number
  ): PromptStateSnapshot {
    const snapshot = recordPromptState(systemPrompt, messages, timestamp, this.config);
    this.previousSnapshot = snapshot;
    return snapshot;
  }

  /** 用当前 usage 和新快照比对检测 cache break */
  checkAfterResponse(
    currentUsage: LLMUsageInfo,
    currentSnapshot: PromptStateSnapshot
  ): PromptCacheBreakResult {
    if (!this.previousSnapshot) {
      return { isCacheBreak: false, currentSnapshot };
    }

    const result = checkPromptStateForCacheBreak(
      currentUsage,
      this.previousSnapshot,
      currentSnapshot,
      this.config
    );

    // 更新 previous 为 current
    this.previousSnapshot = currentSnapshot;
    return result;
  }

  /** 通知 compaction 发生 — 重置 previous baseline */
  notifyCompaction(): void {
    this.previousSnapshot = undefined;
  }

  /** 通知 cache deletion 发生 — 标记预期下降 */
  notifyCacheDeletion(): void {
    if (this.previousSnapshot) {
      // 将 previous 的 inputTokenCount 设为 0 表示预期下降
      this.previousSnapshot = {
        ...this.previousSnapshot,
        inputTokenCount: 0
      };
    }
  }

  /** 获取当前 previousSnapshot（用于调试） */
  getPreviousSnapshot(): PromptStateSnapshot | undefined {
    return this.previousSnapshot;
  }

  /** 重置 tracker（用于测试） */
  reset(): void {
    this.previousSnapshot = undefined;
  }
}

/** 构造 prompt 内容前缀字符串 */
function buildContentPrefix(
  systemPrompt: string,
  messages: readonly AgentMessage[],
  maxLength: number
): string {
  let prefix = systemPrompt;

  for (const msg of messages) {
    if (prefix.length >= maxLength) break;

    // UserMessage 和 AssistantMessage 都有 content 字段
    if (msg.role === 'user' || msg.role === 'assistant') {
      prefix += msg.content;
    } else if (msg.role === 'tool_result') {
      prefix += JSON.stringify(msg.result ?? msg.error ?? '');
    }
  }

  return prefix.slice(0, maxLength);
}
