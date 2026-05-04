/** Rate Limit Header 提取 — 从 OpenAI API response headers 提取速率限制信息 */

import type { RateLimitStatus } from '../types/rate-limit';

/** OpenAI rate limit header 名称映射（x-ratelimit-* 系列） */
const OPENAI_RATE_LIMIT_HEADERS = {
  requestsLimit: 'x-ratelimit-limit-requests',
  requestsRemaining: 'x-ratelimit-remaining-requests',
  requestsReset: 'x-ratelimit-reset-requests',
  tokensLimit: 'x-ratelimit-limit-tokens',
  tokensRemaining: 'x-ratelimit-remaining-tokens',
  tokensReset: 'x-ratelimit-reset-tokens'
} as const;

/**
 * 从 Response headers 提取 OpenAI rate limit 状态
 *
 * OpenAI API 在部分响应中返回 `x-ratelimit-*` 系列 header（非所有模型/端点都有）。 此函数与 Anthropic 版逻辑一致，但使用不同的 header 名称。
 *
 * @param headers fetch Response 的 headers 对象
 * @returns RateLimitStatus（有至少1个header时），undefined（无任何rate limit header时）
 */
export function extractOpenAIRateLimitStatus(headers: Headers): RateLimitStatus | undefined {
  const requestsLimit = parseHeaderNumber(headers, OPENAI_RATE_LIMIT_HEADERS.requestsLimit);
  const requestsRemaining = parseHeaderNumber(headers, OPENAI_RATE_LIMIT_HEADERS.requestsRemaining);
  const requestsReset = parseHeaderString(headers, OPENAI_RATE_LIMIT_HEADERS.requestsReset);
  const tokensLimit = parseHeaderNumber(headers, OPENAI_RATE_LIMIT_HEADERS.tokensLimit);
  const tokensRemaining = parseHeaderNumber(headers, OPENAI_RATE_LIMIT_HEADERS.tokensRemaining);
  const tokensReset = parseHeaderString(headers, OPENAI_RATE_LIMIT_HEADERS.tokensReset);

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
 * 解析 OpenAI reset timestamp
 *
 * OpenAI 的 reset header 值可能是：
 *
 * - Unix 秒数（如 "1705312200"）
 * - ISO 8601 格式（如 "2024-01-15T10:30:00Z"）
 *
 * @param value header 值字符串
 * @returns Date 对象，解析失败时返回 null
 */
function parseResetTimestamp(value: string): Date | null {
  // 尝试 Unix 秒数优先（OpenAI 更常见）
  const unixSeconds = Number(value);
  if (!Number.isNaN(unixSeconds) && unixSeconds > 0) {
    return new Date(unixSeconds * 1000);
  }

  // 尝试 ISO 8601 格式
  const isoDate = new Date(value);
  if (!Number.isNaN(isoDate.getTime())) {
    return isoDate;
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
