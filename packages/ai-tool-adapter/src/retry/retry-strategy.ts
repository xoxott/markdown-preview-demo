/** LLM API 特定重试策略 — 可配置重试+指数退避+错误分类+生产级增强 */

import type { AuthRefreshProvider, QuerySource, RetryContext } from '../types/retry-providers';
import { CannotRetryError } from '../types/retry-providers';

/** LLM API 可重试错误类型 */
export type RetryableErrorType =
  | 'rate_limit'
  | 'overloaded'
  | 'timeout'
  | 'server_error'
  | 'network_error';

/** LLM 重试策略配置 */
export interface LLMRetryConfig {
  /** 最大重试次数（默认 3） */
  readonly maxRetries?: number;
  /** 初始延迟 ms（默认 1000） */
  readonly initialDelayMs?: number;
  /** 最大延迟 ms（默认 30000） */
  readonly maxDelayMs?: number;
  /** 退避乘数（默认 2） */
  readonly backoffMultiplier?: number;
  /** 可重试的 HTTP 状态码 */
  readonly retryableStatusCodes?: readonly number[];
  /** 可重试的错误类型 */
  readonly retryableErrorTypes?: readonly RetryableErrorType[];
  /** 判断是否应重试的自定义函数（覆盖默认逻辑） */
  readonly shouldRetry?: (error: unknown, attempt: number) => boolean;
  /** 延迟计算的自定义函数（覆盖默认指数退避） */
  readonly retryDelay?: (attempt: number, error: unknown) => number;
  /** 查询源类型 — 529 前后台分流（默认 'repl'） */
  readonly querySource?: QuerySource;
  /** 连续 529 阈值 — 达到后触发 CannotRetryError（默认 3） */
  readonly maxConsecutive529?: number;
  /** context overflow 安全缓冲 token 数（默认 1000） */
  readonly contextOverflowBuffer?: number;
  /** 最小 maxTokens（默认 3000） */
  readonly minContextTokens?: number;
}

/** 默认重试配置 */
export const DEFAULT_LLM_RETRY_CONFIG: LLMRetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1_000,
  maxDelayMs: 30_000,
  backoffMultiplier: 2,
  retryableStatusCodes: [429, 500, 529],
  retryableErrorTypes: ['rate_limit', 'overloaded', 'timeout', 'server_error', 'network_error']
};

/** 默认连续 529 阈值 */
const DEFAULT_MAX_CONSECUTIVE_529 = 3;

/** 默认 context overflow 安全缓冲 */
const DEFAULT_CONTEXT_OVERFLOW_BUFFER = 1000;

/** 默认最小 context tokens */
const DEFAULT_MIN_CONTEXT_TOKENS = 3000;

/** 分类 LLM API 错误类型的纯函数 */
export function classifyLLMError(error: unknown): RetryableErrorType | 'non_retryable' {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'timeout';
  }

  if (error instanceof Error) {
    const status = extractStatusCode(error);
    if (status !== undefined) {
      if (status === 429) return 'rate_limit';
      if (status === 500) return 'server_error';
      if (status === 529) return 'overloaded';
    }

    const errorType = extractErrorType(error);
    if (errorType === 'overloaded_error') return 'overloaded';
    if (errorType === 'rate_limit_error') return 'rate_limit';

    const message = error.message.toLowerCase();
    if (message.includes('rate limit') || message.includes('too many requests'))
      return 'rate_limit';
    if (message.includes('overloaded')) return 'overloaded';
    if (message.includes('timeout') || message.includes('timed out')) return 'timeout';
    if (message.includes('network') || message.includes('connection')) return 'network_error';
    if (message.includes('529')) return 'overloaded';
    if (message.includes('500')) return 'server_error';
  }

  if (error instanceof TypeError) {
    return 'network_error';
  }

  return 'non_retryable';
}

/** 计算指数退避延迟的纯函数 */
export function calculateBackoffDelay(attempt: number, config: LLMRetryConfig): number {
  const initialDelay = config.initialDelayMs ?? DEFAULT_LLM_RETRY_CONFIG.initialDelayMs!;
  const maxDelay = config.maxDelayMs ?? DEFAULT_LLM_RETRY_CONFIG.maxDelayMs!;
  const multiplier = config.backoffMultiplier ?? DEFAULT_LLM_RETRY_CONFIG.backoffMultiplier!;
  const delay = initialDelay * multiplier ** attempt;
  return Math.min(delay, maxDelay);
}

/** 判断是否应重试的纯函数 */
export function shouldRetryLLMCall(
  error: unknown,
  attempt: number,
  config: LLMRetryConfig
): boolean {
  if (config.shouldRetry) {
    return config.shouldRetry(error, attempt);
  }

  const maxRetries = config.maxRetries ?? DEFAULT_LLM_RETRY_CONFIG.maxRetries!;
  if (attempt >= maxRetries) return false;

  const errorType = classifyLLMError(error);
  if (errorType === 'non_retryable') return false;

  const retryableTypes =
    config.retryableErrorTypes ?? DEFAULT_LLM_RETRY_CONFIG.retryableErrorTypes!;
  return retryableTypes.includes(errorType as RetryableErrorType);
}

/**
 * 判断 529 错误是否应重试（前台后台分流）
 *
 * 只有前台查询源才重试 529，后台查询源（summary/title/classifier） 直接抛出 CannotRetryError，防止容量级联时网关放大效应。
 */
export function shouldRetry529(querySource?: QuerySource): boolean {
  if (!querySource) return true;
  return ['repl', 'sdk', 'agent', 'compact', 'hook'].includes(querySource);
}

/**
 * 从 Error 对象提取 Retry-After header 的毫秒数
 *
 * Anthropic API 在 429 响应中可能返回 retry-after header。
 */
export function extractRetryAfterMs(error: unknown): number | undefined {
  if (!(error instanceof Error)) return undefined;

  const headers = (error as unknown as Record<string, unknown>).headers;
  if (!headers || typeof headers !== 'object') return undefined;

  const headersObj = headers as Record<string, string>;
  const retryAfter = headersObj['retry-after'];
  if (!retryAfter) return undefined;

  // 尝试解析为秒数
  const seconds = Number(retryAfter);
  if (!Number.isNaN(seconds) && seconds > 0) {
    return seconds * 1000;
  }

  // 尝试解析为 HTTP Date
  const date = new Date(retryAfter);
  if (!Number.isNaN(date.getTime())) {
    return Math.max(0, date.getTime() - Date.now());
  }

  return undefined;
}

/**
 * 解析 context overflow 错误 — 计算推荐的 maxTokens
 *
 * Anthropic API 返回 400 错误时，错误消息可能包含： "input length and max_tokens exceed context limit"
 */
export function parseContextOverflowError(error: unknown):
  | {
      inputTokens: number;
      maxTokens: number;
      contextLimit: number;
      recommendedMaxTokens: number;
    }
  | undefined {
  if (!(error instanceof Error)) return undefined;

  const status = extractStatusCode(error);
  if (status !== 400) return undefined;

  const message = error.message;

  // 尝试解析数字信息
  const contextLimitMatch = message.match(/context[_ ]?limit[: =]+(\d+)/i);
  if (!contextLimitMatch) return undefined;

  const contextLimit = Number(contextLimitMatch[1]);
  const inputTokensMatch = message.match(/input[_ ]?tokens[: =]+(\d+)/i);
  const inputTokens = inputTokensMatch ? Number(inputTokensMatch[1]) : 0;
  const maxTokensMatch = message.match(/max[_ ]?tokens[: =]+(\d+)/i);
  const maxTokens = maxTokensMatch ? Number(maxTokensMatch[1]) : 4096;

  const recommendedMaxTokens = Math.max(
    DEFAULT_MIN_CONTEXT_TOKENS,
    contextLimit - inputTokens - DEFAULT_CONTEXT_OVERFLOW_BUFFER
  );

  return { inputTokens, maxTokens, contextLimit, recommendedMaxTokens };
}

/**
 * 带重试的异步函数执行器（生产级增强版）
 *
 * 在 LLM API 调用失败时自动重试，支持：
 *
 * - 指数退避 + Retry-After header 优先
 * - 529 前台后台分流
 * - 连续 529 计数 + CannotRetryError
 * - Context overflow auto-adjust → RetryContext.maxTokensOverride
 * - Auth refresh (401) via AuthRefreshProvider
 *
 * @param fn 要执行的异步函数
 * @param config 重试配置（可选）
 * @param onRetry 重试回调（可选）
 * @param retryContext 重试上下文（可选，传递调整参数如 maxTokensOverride）
 * @param authRefreshProvider Auth刷新Provider（可选，401时自动刷新）
 */
export async function withLLMRetry<T>(
  fn: () => Promise<T>,
  config?: LLMRetryConfig,
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void,
  retryContext?: RetryContext,
  authRefreshProvider?: AuthRefreshProvider
): Promise<T> {
  const effectiveConfig = config ?? DEFAULT_LLM_RETRY_CONFIG;
  const maxRetries = effectiveConfig.maxRetries ?? DEFAULT_LLM_RETRY_CONFIG.maxRetries!;
  const maxConsecutive529 = effectiveConfig.maxConsecutive529 ?? DEFAULT_MAX_CONSECUTIVE_529;
  const querySource = effectiveConfig.querySource ?? 'repl';
  let lastError: unknown;
  let consecutive529Count = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // 1. 529 前台后台分流
      if (classifyLLMError(error) === 'overloaded') {
        consecutive529Count++;
        if (!shouldRetry529(querySource)) {
          throw new CannotRetryError(
            '529 overloaded in background query, not retrying to prevent cascade',
            'background_529'
          );
        }
        if (consecutive529Count >= maxConsecutive529) {
          throw new CannotRetryError(
            `Consecutive 529 errors (${consecutive529Count}), giving up`,
            'consecutive_529'
          );
        }
      } else {
        consecutive529Count = 0;
      }

      // 2. Auth refresh (401)
      if (is401Error(error) && authRefreshProvider) {
        const refreshed = await authRefreshProvider.refreshAuth();
        if (refreshed) continue; // 刷新成功 → 不计入 attempt
        throw error; // 刷新失败 → 不重试
      }

      // 3. Context overflow auto-adjust
      const overflowInfo = parseContextOverflowError(error);
      if (overflowInfo && retryContext) {
        retryContext.maxTokensOverride = overflowInfo.recommendedMaxTokens;
        continue; // 不计入 attempt，下次调用使用新 maxTokens
      }

      // 4. 到达最大重试次数或不可重试 → 抛出
      if (attempt >= maxRetries || !shouldRetryLLMCall(error, attempt, effectiveConfig)) {
        throw error;
      }

      // 5. 计算延迟 — Retry-After header 优先
      const retryAfterMs = extractRetryAfterMs(error);
      const delay =
        retryAfterMs ??
        (effectiveConfig.retryDelay
          ? effectiveConfig.retryDelay(attempt, error)
          : calculateBackoffDelay(attempt, effectiveConfig));

      if (onRetry) {
        onRetry(attempt, error, delay);
      }

      await sleep(delay);
    }
  }

  throw lastError;
}

/** 判断是否是 401 认证错误 */
function is401Error(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const status = extractStatusCode(error);
  return status === 401;
}

/** 简易 sleep 函数 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

/** 从 Error 对象提取 HTTP 状态码 */
function extractStatusCode(error: Error): number | undefined {
  if ('status' in error && typeof error.status === 'number') return error.status;
  if ('response' in error) {
    const resp = (error as Record<string, unknown>).response;
    if (typeof resp === 'object' && resp !== null && 'status' in resp) {
      return (resp as Record<string, unknown>).status as number;
    }
  }
  return undefined;
}

/** 从 Error 对象提取错误类型字符串 */
function extractErrorType(error: Error): string | undefined {
  if ('error' in error) {
    const errObj = (error as Record<string, unknown>).error;
    if (typeof errObj === 'object' && errObj !== null && 'type' in errObj) {
      return (errObj as Record<string, unknown>).type as string;
    }
  }
  return undefined;
}
