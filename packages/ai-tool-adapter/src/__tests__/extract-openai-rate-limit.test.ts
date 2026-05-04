/** P80 测试 — OpenAI Rate Limit header 提取 + 采样参数接入 */

import { describe, expect, it } from 'vitest';
import { extractOpenAIRateLimitStatus } from '../rate-limit/extract-openai-rate-limit';

describe('extractOpenAIRateLimitStatus', () => {
  it('无 rate limit header → undefined', () => {
    const headers = new Headers();
    expect(extractOpenAIRateLimitStatus(headers)).toBeUndefined();
  });

  it('完整 x-ratelimit-* header → RateLimitStatus', () => {
    const headers = new Headers({
      'x-ratelimit-limit-requests': '100',
      'x-ratelimit-remaining-requests': '80',
      'x-ratelimit-reset-requests': '1705312200',
      'x-ratelimit-limit-tokens': '100000',
      'x-ratelimit-remaining-tokens': '80000',
      'x-ratelimit-reset-tokens': '1705312200'
    });

    const status = extractOpenAIRateLimitStatus(headers);
    expect(status).toBeDefined();
    expect(status!.requestsLimit).toBe(100);
    expect(status!.requestsRemaining).toBe(80);
    expect(status!.tokensLimit).toBe(100000);
    expect(status!.tokensRemaining).toBe(80000);
    expect(status!.requestsResetAt).toBeInstanceOf(Date);
    expect(status!.tokensResetAt).toBeInstanceOf(Date);
  });

  it('部分 header → 缺失字段默认0', () => {
    const headers = new Headers({
      'x-ratelimit-limit-requests': '50',
      'x-ratelimit-remaining-requests': '40'
    });

    const status = extractOpenAIRateLimitStatus(headers);
    expect(status).toBeDefined();
    expect(status!.requestsLimit).toBe(50);
    expect(status!.requestsRemaining).toBe(40);
    expect(status!.tokensLimit).toBe(0);
    expect(status!.tokensRemaining).toBe(0);
    expect(status!.requestsResetAt).toBeNull();
  });

  it('Unix 秒数 reset → 正确解析', () => {
    const headers = new Headers({
      'x-ratelimit-limit-requests': '10',
      'x-ratelimit-reset-requests': '1705312200'
    });

    const status = extractOpenAIRateLimitStatus(headers);
    expect(status!.requestsResetAt).toBeInstanceOf(Date);
    expect(status!.requestsResetAt!.getTime()).toBe(1705312200 * 1000);
  });

  it('ISO 8601 reset → 正确解析', () => {
    const headers = new Headers({
      'x-ratelimit-limit-requests': '10',
      'x-ratelimit-reset-requests': '2024-01-15T10:30:00Z'
    });

    const status = extractOpenAIRateLimitStatus(headers);
    expect(status!.requestsResetAt).toBeInstanceOf(Date);
  });
});
