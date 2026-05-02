/** @suga/ai-tool-adapter — Rate Limit 提取 + Provider 测试 */

import { describe, expect, it } from 'vitest';
import { extractRateLimitStatus, parseResetTimestamp } from '../rate-limit/extract-rate-limit';
import { InMemoryRateLimitProvider } from '../rate-limit/InMemoryRateLimitProvider';
import type { RateLimitStatus } from '../types/rate-limit';

/** 创建 mock Headers 对象 */
function createMockHeaders(entries: Record<string, string>): Headers {
  return new Headers(entries);
}

describe('extractRateLimitStatus', () => {
  it('提取完整rate limit headers → 返回完整RateLimitStatus', () => {
    const headers = createMockHeaders({
      'anthropic-ratelimit-requests-limit': '1000',
      'anthropic-ratelimit-requests-remaining': '999',
      'anthropic-ratelimit-requests-reset': '2024-01-15T10:30:00Z',
      'anthropic-ratelimit-tokens-limit': '100000',
      'anthropic-ratelimit-tokens-remaining': '99000',
      'anthropic-ratelimit-tokens-reset': '1705312200'
    });

    const result = extractRateLimitStatus(headers);
    expect(result).toBeDefined();
    expect(result!.requestsLimit).toBe(1000);
    expect(result!.requestsRemaining).toBe(999);
    expect(result!.requestsResetAt).toBeInstanceOf(Date);
    expect(result!.tokensLimit).toBe(100000);
    expect(result!.tokensRemaining).toBe(99000);
    expect(result!.tokensResetAt).toBeInstanceOf(Date);
  });

  it('只提取requests headers → tokens字段为0', () => {
    const headers = createMockHeaders({
      'anthropic-ratelimit-requests-limit': '1000',
      'anthropic-ratelimit-requests-remaining': '500'
    });

    const result = extractRateLimitStatus(headers);
    expect(result).toBeDefined();
    expect(result!.requestsLimit).toBe(1000);
    expect(result!.requestsRemaining).toBe(500);
    expect(result!.requestsResetAt).toBeNull();
    expect(result!.tokensLimit).toBe(0);
    expect(result!.tokensRemaining).toBe(0);
    expect(result!.tokensResetAt).toBeNull();
  });

  it('只提取tokens headers → requests字段为0', () => {
    const headers = createMockHeaders({
      'anthropic-ratelimit-tokens-limit': '50000',
      'anthropic-ratelimit-tokens-remaining': '40000',
      'anthropic-ratelimit-tokens-reset': '2024-01-15T12:00:00Z'
    });

    const result = extractRateLimitStatus(headers);
    expect(result).toBeDefined();
    expect(result!.requestsLimit).toBe(0);
    expect(result!.tokensLimit).toBe(50000);
    expect(result!.tokensRemaining).toBe(40000);
    expect(result!.tokensResetAt).toBeInstanceOf(Date);
  });

  it('无任何rate limit headers → 返回undefined', () => {
    const headers = createMockHeaders({});
    const result = extractRateLimitStatus(headers);
    expect(result).toBeUndefined();
  });

  it('非数值header → 对应字段为0', () => {
    const headers = createMockHeaders({
      'anthropic-ratelimit-requests-limit': 'not-a-number',
      'anthropic-ratelimit-requests-remaining': '100'
    });

    const result = extractRateLimitStatus(headers);
    expect(result).toBeDefined();
    expect(result!.requestsLimit).toBe(0); // NaN → 0
    expect(result!.requestsRemaining).toBe(100);
  });

  it('无效reset timestamp → resetsAt为null', () => {
    const headers = createMockHeaders({
      'anthropic-ratelimit-requests-limit': '1000',
      'anthropic-ratelimit-requests-reset': 'invalid-date'
    });

    const result = extractRateLimitStatus(headers);
    expect(result).toBeDefined();
    expect(result!.requestsResetAt).toBeNull();
  });
});

describe('parseResetTimestamp', () => {
  it('ISO 8601格式 → 返回Date', () => {
    const result = parseResetTimestamp('2024-01-15T10:30:00Z');
    expect(result).toBeInstanceOf(Date);
    expect(result!.getTime()).toBe(new Date('2024-01-15T10:30:00Z').getTime());
  });

  it('Unix秒数格式 → 返回Date', () => {
    const result = parseResetTimestamp('1705312200');
    expect(result).toBeInstanceOf(Date);
    expect(result!.getTime()).toBe(1705312200 * 1000);
  });

  it('无效字符串 → 返回null', () => {
    expect(parseResetTimestamp('not-a-date')).toBeNull();
  });

  it('空字符串 → 返回null', () => {
    expect(parseResetTimestamp('')).toBeNull();
  });
});

describe('InMemoryRateLimitProvider', () => {
  it('onRateLimitUpdate → 存储状态', () => {
    const provider = new InMemoryRateLimitProvider();
    const status: RateLimitStatus = {
      requestsLimit: 1000,
      requestsRemaining: 999,
      requestsResetAt: null,
      tokensLimit: 100000,
      tokensRemaining: 99000,
      tokensResetAt: null
    };

    provider.onRateLimitUpdate(status);
    expect(provider.getCurrentStatus()).toEqual(status);
  });

  it('getCurrentStatus(未更新) → undefined', () => {
    const provider = new InMemoryRateLimitProvider();
    expect(provider.getCurrentStatus()).toBeUndefined();
  });

  it('onRateLimitUpdate → 触发回调', () => {
    const received: RateLimitStatus[] = [];
    const provider = new InMemoryRateLimitProvider(status => received.push(status));
    const status: RateLimitStatus = {
      requestsLimit: 1000,
      requestsRemaining: 500,
      requestsResetAt: null,
      tokensLimit: 100000,
      tokensRemaining: 50000,
      tokensResetAt: null
    };

    provider.onRateLimitUpdate(status);
    expect(received).toHaveLength(1);
    expect(received[0]).toEqual(status);
  });

  it('多次更新 → 只保留最新状态', () => {
    const provider = new InMemoryRateLimitProvider();
    provider.onRateLimitUpdate({
      requestsLimit: 1000,
      requestsRemaining: 999,
      requestsResetAt: null,
      tokensLimit: 100000,
      tokensRemaining: 99000,
      tokensResetAt: null
    });
    provider.onRateLimitUpdate({
      requestsLimit: 1000,
      requestsRemaining: 500,
      requestsResetAt: null,
      tokensLimit: 100000,
      tokensRemaining: 50000,
      tokensResetAt: null
    });

    expect(provider.getCurrentStatus()!.requestsRemaining).toBe(500);
  });

  it('reset → 清除状态', () => {
    const provider = new InMemoryRateLimitProvider();
    provider.onRateLimitUpdate({
      requestsLimit: 1000,
      requestsRemaining: 999,
      requestsResetAt: null,
      tokensLimit: 100000,
      tokensRemaining: 99000,
      tokensResetAt: null
    });
    provider.reset();
    expect(provider.getCurrentStatus()).toBeUndefined();
  });
});
