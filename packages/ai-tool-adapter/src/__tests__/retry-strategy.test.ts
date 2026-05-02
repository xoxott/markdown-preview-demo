/** LLM 重试策略测试 — classifyLLMError/calculateBackoffDelay/shouldRetryLLMCall/withLLMRetry */

import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_LLM_RETRY_CONFIG,
  calculateBackoffDelay,
  classifyLLMError,
  extractRetryAfterMs,
  parseContextOverflowError,
  shouldRetry529,
  shouldRetryLLMCall,
  withLLMRetry
} from '../retry/retry-strategy';
import type { LLMRetryConfig } from '../retry/retry-strategy';
import type { AuthRefreshProvider, RetryContext } from '../types/retry-providers';
import { CannotRetryError } from '../types/retry-providers';

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
      retryDelay: _attempt => 5 // 固定 5ms
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

describe('shouldRetry529', () => {
  it('前台查询源 → 应重试', () => {
    expect(shouldRetry529('repl')).toBe(true);
    expect(shouldRetry529('sdk')).toBe(true);
    expect(shouldRetry529('agent')).toBe(true);
    expect(shouldRetry529('compact')).toBe(true);
    expect(shouldRetry529('hook')).toBe(true);
  });

  it('后台查询源 → 不应重试', () => {
    expect(shouldRetry529('summary')).toBe(false);
    expect(shouldRetry529('title')).toBe(false);
    expect(shouldRetry529('classifier')).toBe(false);
  });

  it('无querySource → 默认重试', () => {
    expect(shouldRetry529()).toBe(true);
  });
});

describe('extractRetryAfterMs', () => {
  it('秒数格式 → 返回毫秒数', () => {
    const error = new Error('rate limited');
    (error as any).headers = { 'retry-after': '5' };
    expect(extractRetryAfterMs(error)).toBe(5000);
  });

  it('无retry-after header → undefined', () => {
    const error = new Error('rate limited');
    (error as any).headers = {};
    expect(extractRetryAfterMs(error)).toBeUndefined();
  });

  it('无headers属性 → undefined', () => {
    const error = new Error('rate limited');
    expect(extractRetryAfterMs(error)).toBeUndefined();
  });

  it('非Error对象 → undefined', () => {
    expect(extractRetryAfterMs('not an error')).toBeUndefined();
  });
});

describe('parseContextOverflowError', () => {
  it('400 + context limit信息 → 解析成功', () => {
    const error = new Error(
      'input_tokens: 50000 and max_tokens: 4096 exceed context_limit: 200000'
    );
    (error as any).status = 400;
    const result = parseContextOverflowError(error);
    expect(result).toBeDefined();
    expect(result!.contextLimit).toBe(200000);
    expect(result!.inputTokens).toBe(50000);
    expect(result!.recommendedMaxTokens).toBeGreaterThan(0);
  });

  it('非400错误 → undefined', () => {
    const error = new Error('rate limited');
    (error as any).status = 429;
    expect(parseContextOverflowError(error)).toBeUndefined();
  });

  it('无context limit信息 → undefined', () => {
    const error = new Error('bad request');
    (error as any).status = 400;
    expect(parseContextOverflowError(error)).toBeUndefined();
  });
});

describe('withLLMRetry P32增强', () => {
  it('529后台查询 → CannotRetryError', async () => {
    const fn = () => Promise.reject(Object.assign(new Error('overloaded'), { status: 529 }));
    const config: LLMRetryConfig = { maxRetries: 3, querySource: 'summary' };

    await expect(withLLMRetry(fn, config)).rejects.toThrow(CannotRetryError);
  });

  it('529前台查询 → 正常重试', async () => {
    let attempt = 0;
    const fn = () => {
      attempt++;
      if (attempt < 3)
        return Promise.reject(Object.assign(new Error('overloaded'), { status: 529 }));
      return Promise.resolve('ok');
    };
    const config: LLMRetryConfig = { maxRetries: 5, querySource: 'repl', initialDelayMs: 5 };

    const result = await withLLMRetry(fn, config);
    expect(result).toBe('ok');
  });

  it('Retry-After header → 优先使用', async () => {
    const delays: number[] = [];
    let attempt = 0;
    const fn = () => {
      attempt++;
      if (attempt === 1) {
        const error = new Error('rate limited');
        (error as any).status = 429;
        (error as any).headers = { 'retry-after': '2' };
        throw error;
      }
      return Promise.resolve('ok');
    };
    const config: LLMRetryConfig = { maxRetries: 1, initialDelayMs: 10000 };
    const onRetry = (_a: number, _e: unknown, delay: number) => delays.push(delay);

    await withLLMRetry(fn, config, onRetry);
    expect(delays[0]).toBe(2000); // retry-after=2s=2000ms, 优先于10000ms退避
  });

  it('context overflow auto-adjust → 设置RetryContext', async () => {
    const retryContext: RetryContext = {};
    let attempt = 0;
    const fn = () => {
      attempt++;
      if (attempt === 1) {
        const error = new Error(
          'input length and max_tokens exceed context limit: input_tokens=95000, max_tokens=4096, context_limit=100000'
        );
        (error as any).status = 400;
        throw error;
      }
      return Promise.resolve('ok');
    };
    const config: LLMRetryConfig = { maxRetries: 1 };

    await withLLMRetry(fn, config, undefined, retryContext);
    expect(retryContext.maxTokensOverride).toBeDefined();
    expect(retryContext.maxTokensOverride!).toBeGreaterThan(0);
  });

  it('auth refresh (401) → 刷新成功后重试', async () => {
    let attempt = 0;
    const mockProvider: AuthRefreshProvider = {
      refreshAuth: async () => true,
      clearCredentialCache: () => {}
    };
    const fn = () => {
      attempt++;
      if (attempt === 1) {
        const error = new Error('auth failed');
        (error as any).status = 401;
        throw error;
      }
      return Promise.resolve('ok');
    };

    const result = await withLLMRetry(fn, undefined, undefined, undefined, mockProvider);
    expect(result).toBe('ok');
  });

  it('auth refresh (401) → 刷新失败后不重试', async () => {
    const mockProvider: AuthRefreshProvider = {
      refreshAuth: async () => false,
      clearCredentialCache: () => {}
    };
    const fn = () => {
      const error = new Error('auth failed');
      (error as any).status = 401;
      throw error;
    };

    await expect(withLLMRetry(fn, undefined, undefined, undefined, mockProvider)).rejects.toThrow(
      'auth failed'
    );
  });
});
