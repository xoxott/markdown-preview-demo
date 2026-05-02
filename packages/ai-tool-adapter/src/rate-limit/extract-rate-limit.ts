/** Rate Limit Header 提取 — 从 Anthropic API response headers 提取速率限制信息 */

import type { RateLimitStatus } from '../types/rate-limit';

/** Anthropic unified rate limit header 名称映射 */
const RATE_LIMIT_HEADERS = {
  requestsLimit: 'anthropic-ratelimit-requests-limit',
  requestsRemaining: 'anthropic-ratelimit-requests-remaining',
  requestsReset: 'anthropic-ratelimit-requests-reset',
  tokensLimit: 'anthropic-ratelimit-tokens-limit',
  tokensRemaining: 'anthropic-ratelimit-tokens-remaining',
  tokensReset: 'anthropic-ratelimit-tokens-reset'
} as const;

/**
 * 从 Response headers 提取 Anthropic rate limit 状态
 *
 * 纯函数，从 fetch Response.headers 读取 6 个 unified rate limit headers， 解析为结构化 RateLimitStatus。
 *
 * @param headers fetch Response 的 headers 对象
 * @returns RateLimitStatus（有至少1个header时），undefined（无任何rate limit header时）
 */
export function extractRateLimitStatus(headers: Headers): RateLimitStatus | undefined {
  const requestsLimit = parseHeaderNumber(headers, RATE_LIMIT_HEADERS.requestsLimit);
  const requestsRemaining = parseHeaderNumber(headers, RATE_LIMIT_HEADERS.requestsRemaining);
  const requestsReset = parseHeaderString(headers, RATE_LIMIT_HEADERS.requestsReset);
  const tokensLimit = parseHeaderNumber(headers, RATE_LIMIT_HEADERS.tokensLimit);
  const tokensRemaining = parseHeaderNumber(headers, RATE_LIMIT_HEADERS.tokensRemaining);
  const tokensReset = parseHeaderString(headers, RATE_LIMIT_HEADERS.tokensReset);

  // 无任何 rate limit header → 返回 undefined
  if (
    requestsLimit === undefined &&
    requestsRemaining === undefined &&
    requestsReset === undefined &&
    tokensLimit === undefined &&
    tokensRemaining === undefined &&
    tokensReset === undefined
  ) {
    return undefined;
  }

  return {
    requestsLimit: requestsLimit ?? 0,
    requestsRemaining: requestsRemaining ?? 0,
    requestsResetAt: requestsReset ? parseResetTimestamp(requestsReset) : null,
    tokensLimit: tokensLimit ?? 0,
    tokensRemaining: tokensRemaining ?? 0,
    tokensResetAt: tokensReset ? parseResetTimestamp(tokensReset) : null
  };
}

/**
 * 解析 Anthropic reset timestamp
 *
 * Anthropic 的 reset header 值可能是：
 *
 * - ISO 8601 格式（如 "2024-01-15T10:30:00Z"）
 * - Unix 秒数（如 "1705312200"）
 *
 * @param value header 值字符串
 * @returns Date 对象，解析失败时返回 null
 */
export function parseResetTimestamp(value: string): Date | null {
  // 尝试 ISO 8601 格式
  const isoDate = new Date(value);
  if (!Number.isNaN(isoDate.getTime())) {
    return isoDate;
  }

  // 尝试 Unix 秒数
  const unixSeconds = Number(value);
  if (!Number.isNaN(unixSeconds) && unixSeconds > 0) {
    return new Date(unixSeconds * 1000);
  }

  return null;
}

/** 从 Headers 提取数值型 header */
function parseHeaderNumber(headers: Headers, name: string): number | undefined {
  const value = headers.get(name);
  if (value === null) return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
}

/** 从 Headers 提取字符串型 header */
function parseHeaderString(headers: Headers, name: string): string | undefined {
  const value = headers.get(name);
  return value ?? undefined;
}
