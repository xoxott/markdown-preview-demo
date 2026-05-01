/** LLM API 特定重试策略 — 可配置重试+指数退避+错误分类 */

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

/**
 * 分类 LLM API 错误类型的纯函数
 *
 * 根据错误对象的特征（HTTP 状态码、错误类型字符串、错误消息） 分类为可重试类型或不可重试类型。
 *
 * @param error 错误对象
 * @returns 错误类型分类
 */
export function classifyLLMError(error: unknown): RetryableErrorType | 'non_retryable' {
  // DOMException(AbortError) → timeout
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'timeout';
  }

  // Error with status code
  if (error instanceof Error) {
    const status = extractStatusCode(error);
    if (status !== undefined) {
      if (status === 429) return 'rate_limit';
      if (status === 500) return 'server_error';
      if (status === 529) return 'overloaded';
    }

    // 检查错误类型字符串
    const errorType = extractErrorType(error);
    if (errorType === 'overloaded_error') return 'overloaded';
    if (errorType === 'rate_limit_error') return 'rate_limit';

    // 检查错误消息关键词
    const message = error.message.toLowerCase();
    if (message.includes('rate limit') || message.includes('too many requests'))
      return 'rate_limit';
    if (message.includes('overloaded')) return 'overloaded';
    if (message.includes('timeout') || message.includes('timed out')) return 'timeout';
    if (message.includes('network') || message.includes('connection')) return 'network_error';
    if (message.includes('529')) return 'overloaded';
    if (message.includes('500')) return 'server_error';
  }

  // 网络错误（TypeError from fetch）
  if (error instanceof TypeError) {
    return 'network_error';
  }

  return 'non_retryable';
}

/**
 * 计算指数退避延迟的纯函数
 *
 * delay = min(initialDelay * backoffMultiplier^attempt, maxDelay)
 *
 * @param attempt 当前重试次数（0-based）
 * @param config 重试配置
 * @returns 延迟毫秒数
 */
export function calculateBackoffDelay(attempt: number, config: LLMRetryConfig): number {
  const initialDelay = config.initialDelayMs ?? DEFAULT_LLM_RETRY_CONFIG.initialDelayMs!;
  const maxDelay = config.maxDelayMs ?? DEFAULT_LLM_RETRY_CONFIG.maxDelayMs!;
  const multiplier = config.backoffMultiplier ?? DEFAULT_LLM_RETRY_CONFIG.backoffMultiplier!;
  const delay = initialDelay * multiplier ** attempt;
  return Math.min(delay, maxDelay);
}

/**
 * 判断是否应重试的纯函数
 *
 * 优先使用自定义 shouldRetry 函数， 否则使用默认逻辑：attempt < maxRetries && error 是可重试类型。
 *
 * @param error 错误对象
 * @param attempt 当前重试次数
 * @param config 重试配置
 * @returns 是否应重试
 */
export function shouldRetryLLMCall(
  error: unknown,
  attempt: number,
  config: LLMRetryConfig
): boolean {
  // 自定义 shouldRetry 优先
  if (config.shouldRetry) {
    return config.shouldRetry(error, attempt);
  }

  const maxRetries = config.maxRetries ?? DEFAULT_LLM_RETRY_CONFIG.maxRetries!;
  if (attempt >= maxRetries) return false;

  // 检查错误类型
  const errorType = classifyLLMError(error);
  if (errorType === 'non_retryable') return false;

  const retryableTypes =
    config.retryableErrorTypes ?? DEFAULT_LLM_RETRY_CONFIG.retryableErrorTypes!;
  return retryableTypes.includes(errorType as RetryableErrorType);
}

/**
 * 带重试的异步函数执行器
 *
 * 在 LLM API 调用失败时自动重试，支持指数退避和自定义策略。
 *
 * @param fn 要执行的异步函数
 * @param config 重试配置（可选，默认 DEFAULT_LLM_RETRY_CONFIG）
 * @param onRetry 重试回调（可选，接收 attempt/error/delayMs）
 * @returns fn 的返回值
 * @throws 当所有重试都失败时抛出最后一次的错误
 */
export async function withLLMRetry<T>(
  fn: () => Promise<T>,
  config?: LLMRetryConfig,
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void
): Promise<T> {
  const effectiveConfig = config ?? DEFAULT_LLM_RETRY_CONFIG;
  const maxRetries = effectiveConfig.maxRetries ?? DEFAULT_LLM_RETRY_CONFIG.maxRetries!;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt >= maxRetries || !shouldRetryLLMCall(error, attempt, effectiveConfig)) {
        throw error;
      }

      const delay = effectiveConfig.retryDelay
        ? effectiveConfig.retryDelay(attempt, error)
        : calculateBackoffDelay(attempt, effectiveConfig);

      if (onRetry) {
        onRetry(attempt, error, delay);
      }

      await sleep(delay);
    }
  }

  throw lastError;
}

/** 简易 sleep 函数 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** 从 Error 对象提取 HTTP 状态码 */
function extractStatusCode(error: Error): number | undefined {
  // 检查 error.status（某些 HTTP Error 有此属性）
  if ('status' in error && typeof error.status === 'number') return error.status;
  // 检查 error.response.status（axios 等格式）
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
  // 检查 error.error.type（Anthropic API 格式）
  if ('error' in error) {
    const errObj = (error as Record<string, unknown>).error;
    if (typeof errObj === 'object' && errObj !== null && 'type' in errObj) {
      return (errObj as Record<string, unknown>).type as string;
    }
  }
  return undefined;
}
