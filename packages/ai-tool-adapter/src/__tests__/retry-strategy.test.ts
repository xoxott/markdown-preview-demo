/** LLM 重试策略测试 — classifyLLMError/calculateBackoffDelay/shouldRetryLLMCall/withLLMRetry */

import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_LLM_RETRY_CONFIG,
  calculateBackoffDelay,
  classifyLLMError,
  shouldRetryLLMCall,
  withLLMRetry
} from '../retry/retry-strategy';
import type { LLMRetryConfig } from '../retry/retry-strategy';

describe('classifyLLMError', () => {
  it('DOMException(AbortError) → timeout', () => {
    const error = new DOMException('请求被中断', 'AbortError');
    expect(classifyLLMError(error)).toBe('timeout');
  });

  it('Error with status 429 → rate_limit', () => {
    const error = Object.assign(new Error('rate limited'), { status: 429 });
    expect(classifyLLMError(error)).toBe('rate_limit');
  });

  it('Error with status 500 → server_error', () => {
    const error = Object.assign(new Error('internal error'), { status: 500 });
    expect(classifyLLMError(error)).toBe('server_error');
  });

  it('Error with status 529 → overloaded', () => {
    const error = Object.assign(new Error('overloaded'), { status: 529 });
    expect(classifyLLMError(error)).toBe('overloaded');
  });

  it('Error with status 400 → non_retryable', () => {
    const error = Object.assign(new Error('bad request'), { status: 400 });
    expect(classifyLLMError(error)).toBe('non_retryable');
  });

  it('Error with error.type=overloaded_error → overloaded', () => {
    const error = Object.assign(new Error('overloaded'), { error: { type: 'overloaded_error' } });
    expect(classifyLLMError(error)).toBe('overloaded');
  });

  it('Error message includes "rate limit" → rate_limit', () => {
    expect(classifyLLMError(new Error('Rate limit exceeded'))).toBe('rate_limit');
  });

  it('Error message includes "timeout" → timeout', () => {
    expect(classifyLLMError(new Error('Request timed out'))).toBe('timeout');
  });

  it('Error message includes "network" → network_error', () => {
    expect(classifyLLMError(new Error('Network error'))).toBe('network_error');
  });

  it('TypeError → network_error (fetch 网络错误)', () => {
    expect(classifyLLMError(new TypeError('Failed to fetch'))).toBe('network_error');
  });

  it('普通 Error 无特征 → non_retryable', () => {
    expect(classifyLLMError(new Error('unknown error'))).toBe('non_retryable');
  });

  it('null → non_retryable', () => {
    expect(classifyLLMError(null)).toBe('non_retryable');
  });

  it('字符串 → non_retryable', () => {
    expect(classifyLLMError('some error')).toBe('non_retryable');
  });
});

describe('calculateBackoffDelay', () => {
  it('attempt=0 → initialDelay', () => {
    const delay = calculateBackoffDelay(0, DEFAULT_LLM_RETRY_CONFIG);
    expect(delay).toBe(1000);
  });

  it('attempt=1 → initialDelay * multiplier', () => {
    const delay = calculateBackoffDelay(1, DEFAULT_LLM_RETRY_CONFIG);
    expect(delay).toBe(2000);
  });

  it('attempt=2 → initialDelay * multiplier^2', () => {
    const delay = calculateBackoffDelay(2, DEFAULT_LLM_RETRY_CONFIG);
    expect(delay).toBe(4000);
  });

  it('超过 maxDelay → 截断', () => {
    const delay = calculateBackoffDelay(10, DEFAULT_LLM_RETRY_CONFIG);
    expect(delay).toBe(30000);
  });

  it('自定义 multiplier=3', () => {
    const config: LLMRetryConfig = { initialDelayMs: 500, maxDelayMs: 10000, backoffMultiplier: 3 };
    expect(calculateBackoffDelay(0, config)).toBe(500);
    expect(calculateBackoffDelay(1, config)).toBe(1500);
    expect(calculateBackoffDelay(2, config)).toBe(4500);
  });
});

describe('shouldRetryLLMCall', () => {
  it('attempt=0 + rate_limit → true', () => {
    const error = Object.assign(new Error('rate limited'), { status: 429 });
    expect(shouldRetryLLMCall(error, 0, DEFAULT_LLM_RETRY_CONFIG)).toBe(true);
  });

  it('attempt=3 (maxRetries=3) → false', () => {
    const error = Object.assign(new Error('rate limited'), { status: 429 });
    expect(shouldRetryLLMCall(error, 3, DEFAULT_LLM_RETRY_CONFIG)).toBe(false);
  });

  it('non_retryable error → false', () => {
    expect(shouldRetryLLMCall(new Error('bad request'), 0, DEFAULT_LLM_RETRY_CONFIG)).toBe(false);
  });

  it('自定义 shouldRetry → 覆盖默认逻辑', () => {
    const config: LLMRetryConfig = { shouldRetry: () => true };
    expect(shouldRetryLLMCall(new Error('any error'), 10, config)).toBe(true);
  });

  it('不在 retryableErrorTypes 中 → false', () => {
    const config: LLMRetryConfig = { retryableErrorTypes: ['rate_limit'] };
    const error = new Error('timeout');
    expect(shouldRetryLLMCall(error, 0, config)).toBe(false);
  });
});

describe('withLLMRetry', () => {
  it('首次成功 → 直接返回', async () => {
    const result = await withLLMRetry(() => Promise.resolve('ok'));
    expect(result).toBe('ok');
  });

  it('首次失败+可重试+第二次成功 → 返回结果', async () => {
    let attempt = 0;
    const fn = () => {
      attempt++;
      if (attempt === 1) throw Object.assign(new Error('rate limited'), { status: 429 });
      return Promise.resolve('ok');
    };
    const onRetry = vi.fn();
    // 用短延迟配置加速测试
    const config: LLMRetryConfig = { maxRetries: 2, initialDelayMs: 10, maxDelayMs: 100 };
    const result = await withLLMRetry(fn, config, onRetry);
    expect(result).toBe('ok');
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('不可重试错误 → 直接抛出', async () => {
    const fn = () => Promise.reject(new Error('bad request'));
    const config: LLMRetryConfig = { maxRetries: 2, initialDelayMs: 10 };
    await expect(withLLMRetry(fn, config)).rejects.toThrow('bad request');
  });

  it('所有重试失败 → 抛出最后一次错误', async () => {
    const fn = () => Promise.reject(Object.assign(new Error('rate limited'), { status: 429 }));
    const config: LLMRetryConfig = { maxRetries: 2, initialDelayMs: 10, maxDelayMs: 50 };
    await expect(withLLMRetry(fn, config)).rejects.toThrow('rate limited');
  });

  it('自定义 retryDelay → 使用自定义延迟', async () => {
    const delays: number[] = [];
    const config: LLMRetryConfig = {
      maxRetries: 1,
      retryDelay: attempt => 5 // 固定 5ms
    };
    let attempt = 0;
    const fn = () => {
      attempt++;
      if (attempt === 1) throw Object.assign(new Error('rate limited'), { status: 429 });
      return Promise.resolve('ok');
    };
    const onRetry = (_a: number, _e: unknown, delay: number) => {
      delays.push(delay);
    };
    await withLLMRetry(fn, config, onRetry);
    expect(delays[0]).toBe(5);
  });
});
