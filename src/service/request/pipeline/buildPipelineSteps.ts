import { PrepareContextStep, type RequestStep } from '@suga/request-core';
import { CacheReadStep, CacheWriteStep, RequestCacheManager } from '@suga/request-cache';
import { RetryStep } from '@suga/request-retry';
import { CircuitBreakerStep } from '@suga/request-circuit-breaker';
import { DedupeStep } from '@suga/request-dedupe';
import { QueueStep } from '@suga/request-queue';
import { AbortStep } from '@suga/request-abort';
import { EventStep, eventManager } from '@suga/request-events';
import type { AxiosTransport } from './AxiosTransport';
import { PipelineTransportStep } from './PipelineTransportStep';
import type { PipelineProfile } from './pipelineProfile';
import { resolvePipelineProfile } from './pipelineProfile';

/** 按 profile 装配步骤链；默认 `standard` 与历史 `buildDefaultPipelineSteps` 行为一致。 */
export function buildPipelineSteps(
  transport: AxiosTransport,
  profile: PipelineProfile = 'standard'
): RequestStep[] {
  const f = resolvePipelineProfile(profile);
  const steps: RequestStep[] = [new PrepareContextStep()];
  const sharedCacheManager = f.useCache ? new RequestCacheManager() : undefined;

  if (f.useCache && sharedCacheManager) {
    steps.push(
      new CacheReadStep({
        requestCacheManager: sharedCacheManager,
        enabledByDefault: true
      })
    );
  }
  if (f.useDedupe) {
    steps.push(
      new DedupeStep({
        defaultOptions: { dedupeWindow: f.dedupeWindow, strategy: 'exact' },
        enabledByDefault: true
      })
    );
  }
  if (f.useAbort) {
    steps.push(
      new AbortStep({
        defaultOptions: { enabled: true, autoAbortPrevious: true }
      })
    );
  }
  if (f.useQueue) {
    steps.push(
      new QueueStep({
        defaultConfig: {
          maxConcurrent: f.queueMaxConcurrent,
          queueStrategy: 'fifo'
        },
        enabledByDefault: true
      })
    );
  }
  if (f.useEvents) {
    steps.push(new EventStep({ eventManager }));
  }
  if (f.useRetry) {
    steps.push(new RetryStep({ defaultStrategy: f.retryStrategy, enabledByDefault: true }));
  }
  if (f.useCircuitBreaker) {
    steps.push(
      new CircuitBreakerStep({ managerOptions: f.circuitBreaker, enabledByDefault: true })
    );
  }

  // CacheWrite 须在 Transport 之前：先 next() 发请求，再在 then 中写入（Transport 不调用 next）
  if (f.useCache && sharedCacheManager) {
    steps.push(
      new CacheWriteStep({
        requestCacheManager: sharedCacheManager,
        enabledByDefault: true
      })
    );
  }

  steps.push(new PipelineTransportStep(transport));

  return steps;
}

/** @deprecated 使用 {@link buildPipelineSteps}(transport, 'standard') */
export function buildDefaultPipelineSteps(transport: AxiosTransport): RequestStep[] {
  return buildPipelineSteps(transport, 'standard');
}
