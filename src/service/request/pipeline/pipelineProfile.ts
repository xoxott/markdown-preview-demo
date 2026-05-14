import type { RetryStrategy } from '@suga/request-retry';

/** 步骤链装配档位：按需切换横切能力组合 */
export type PipelineProfile = 'standard' | 'minimal' | 'resilient';

export type PipelineProfileResolved = {
  useCache: boolean;
  useDedupe: boolean;
  useAbort: boolean;
  useQueue: boolean;
  useEvents: boolean;
  useRetry: boolean;
  useCircuitBreaker: boolean;
  dedupeWindow: number;
  queueMaxConcurrent: number;
  retryStrategy: RetryStrategy;
  circuitBreaker: {
    cleanupInterval: number;
    maxSize: number;
    idleTimeout: number;
  };
};

const baseRetryShouldRetry = (error: unknown) => {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { status?: number } };
    return (
      !axiosError.response ||
      (axiosError.response.status !== undefined &&
        axiosError.response.status >= 500 &&
        axiosError.response.status < 600)
    );
  }
  return false;
};

function buildRetryStrategy(maxRetries: number): RetryStrategy {
  return {
    enabled: maxRetries > 0,
    maxRetries,
    retryDelay: (attempt: number) => attempt * 1000,
    shouldRetry: baseRetryShouldRetry
  };
}

export function resolvePipelineProfile(profile: PipelineProfile): PipelineProfileResolved {
  const circuitBreaker = {
    cleanupInterval: 300000,
    maxSize: 100,
    idleTimeout: 1800000
  };

  if (profile === 'minimal') {
    return {
      useCache: false,
      useDedupe: false,
      useAbort: false,
      useQueue: false,
      useEvents: false,
      useRetry: false,
      useCircuitBreaker: false,
      dedupeWindow: 1000,
      queueMaxConcurrent: 5,
      retryStrategy: buildRetryStrategy(0),
      circuitBreaker
    };
  }

  const maxRetries = profile === 'resilient' ? 5 : 3;

  return {
    useCache: true,
    useDedupe: true,
    useAbort: true,
    useQueue: true,
    useEvents: true,
    useRetry: true,
    useCircuitBreaker: true,
    dedupeWindow: 1000,
    queueMaxConcurrent: profile === 'resilient' ? 8 : 5,
    retryStrategy: buildRetryStrategy(maxRetries),
    circuitBreaker
  };
}
