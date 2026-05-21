import axios, { type AxiosAdapter, AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { generateKey } from '@suga/utils';
import { describe, expect, it, vi } from 'vitest';
import {
  PrepareContextStep,
  type RequestContext,
  type RequestStep,
  composeSteps,
  createRequestContext
} from '@suga/request-core';
import { CircuitBreakerStep } from '@suga/request-circuit-breaker';
import { CacheReadStep, CacheWriteStep, RequestCacheManager } from '@suga/request-cache';
import { RetryStep } from '@suga/request-retry';
import { AxiosTransport } from '../pipeline/AxiosTransport';
import { buildPipelineSteps } from '../pipeline/buildPipelineSteps';
import { PipelineTransportStep } from '../pipeline/PipelineTransportStep';
import { axiosRequestConfigToNormalized } from '../pipeline/normalizeAxiosConfig';
import { resolvePipelineProfile } from '../pipeline/pipelineProfile';
import { runPipelineAxiosRequest } from '../pipeline/runPipelineAxiosRequest';

describe('axiosRequestConfigToNormalized', () => {
  it('maps method, url, params and headers', () => {
    const n = axiosRequestConfigToNormalized({
      url: '/users',
      method: 'post',
      params: { page: 1 },
      data: { name: 'a' },
      headers: { 'X-Test': '1' }
    });

    expect(n.method).toBe('POST');
    expect(n.url).toBe('/users');
    expect(n.params).toEqual({ page: 1 });
    expect(n.data).toEqual({ name: 'a' });
    expect(n.headers).toMatchObject({ 'X-Test': '1' });
  });
});

describe('runPipelineAxiosRequest + capture', () => {
  it('returns AxiosResponse when transport captures correlation', async () => {
    const axiosResponse = {
      data: { code: 200, data: { x: 9 }, message: 'ok' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { url: '/t', method: 'get' }
    };

    const adapter = vi.fn(async () => axiosResponse) as unknown as AxiosAdapter;

    const instance = axios.create({
      adapter
    });

    const capture = new Map();
    const transport = new AxiosTransport({
      instance,
      responseCaptureByCorrelationId: capture
    });

    const steps = [new PrepareContextStep(), new PipelineTransportStep(transport)];

    const res = await runPipelineAxiosRequest(steps, { url: '/t', method: 'get' });

    expect(adapter).toHaveBeenCalled();
    expect(res.data).toEqual(axiosResponse.data);
    expect(res.status).toBe(200);
    expect(capture.size).toBe(0);
  });
});

describe('buildPipelineSteps profiles', () => {
  const stubAdapter = vi.fn() as unknown as AxiosAdapter;

  it('minimal 仅 Prepare + Transport', () => {
    const instance = axios.create({ adapter: stubAdapter });
    const transport = new AxiosTransport({ instance });
    const steps = buildPipelineSteps(transport, 'minimal');
    expect(steps.length).toBe(2);
  });

  it('standard 包含缓存与去重等步骤', () => {
    const instance = axios.create({ adapter: stubAdapter });
    const transport = new AxiosTransport({ instance });
    const steps = buildPipelineSteps(transport, 'standard');
    expect(steps.length).toBeGreaterThan(2);
  });
});

type MockBackendPayload = { code: number; data: { hit: string }; message: string };

function testAxiosConfig(
  url: string,
  method: InternalAxiosRequestConfig['method'] = 'get'
): InternalAxiosRequestConfig {
  return { url, method, headers: {} } as InternalAxiosRequestConfig;
}

function createCapturingTransport() {
  const payload: MockBackendPayload = { code: 200, data: { hit: 'network' }, message: 'ok' };
  const adapter = vi.fn(async (config: { url?: string; method?: string }) => ({
    data: payload,
    status: 200,
    statusText: 'OK',
    headers: {},
    config
  })) as unknown as AxiosAdapter;

  const instance = axios.create({ adapter });
  const responseCaptureByCorrelationId = new Map();
  const transport = new AxiosTransport({
    instance,
    responseCaptureByCorrelationId
  });

  return { transport, adapter, payload };
}

describe('缓存步骤链顺序', () => {
  it('CacheWrite 在 Transport 前时，传输完成后应写入共享 manager', async () => {
    const sharedCacheManager = new RequestCacheManager();
    const payload: MockBackendPayload = { code: 200, data: { hit: 'network' }, message: 'ok' };
    const mockTransport: RequestStep = {
      execute: async (ctx, _next) => {
        (ctx as RequestContext<MockBackendPayload>).result = payload;
      }
    };
    const config = axiosRequestConfigToNormalized({ url: '/write-check', method: 'get' });
    const ctx = createRequestContext<MockBackendPayload>(config, undefined, {});

    await composeSteps([
      new CacheWriteStep({ requestCacheManager: sharedCacheManager, enabledByDefault: true }),
      mockTransport
    ])(ctx);

    expect(sharedCacheManager.getByKey(ctx.id)).toEqual(payload);
  });

  it('共享 RequestCacheManager 且 CacheWrite 在 Transport 前时，第二次 GET 不发起网络', async () => {
    const { transport, adapter } = createCapturingTransport();
    const sharedCacheManager = new RequestCacheManager();
    const steps = [
      new PrepareContextStep(),
      new CacheReadStep({ requestCacheManager: sharedCacheManager, enabledByDefault: true }),
      new CacheWriteStep({ requestCacheManager: sharedCacheManager, enabledByDefault: true }),
      new PipelineTransportStep(transport)
    ];
    const config = { url: '/cache-only', method: 'get' as const };

    await runPipelineAxiosRequest(steps, config);

    const cacheKey = generateKey('GET', '/cache-only', undefined, undefined);
    expect(sharedCacheManager.getByKey(cacheKey)).toEqual({
      code: 200,
      data: { hit: 'network' },
      message: 'ok'
    });

    await runPipelineAxiosRequest(steps, config);

    expect(adapter).toHaveBeenCalledTimes(1);
  });
});

describe('standard 主站管道集成', () => {
  const getConfig = () => ({
    url: '/api/list',
    method: 'get' as const,
    params: { page: 1 }
  });

  it('相同 GET 第二次命中 CacheRead，不再请求网络', async () => {
    const { transport, adapter } = createCapturingTransport();
    const steps = buildPipelineSteps(transport, 'standard');
    const config = getConfig();

    const first = await runPipelineAxiosRequest(steps, config);
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(first.data).toEqual({ code: 200, data: { hit: 'network' }, message: 'ok' });

    const second = await runPipelineAxiosRequest(steps, config);
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(second.data).toEqual({ code: 200, data: { hit: 'network' }, message: 'ok' });
  });

  it('enabledByDefault：runPipeline 未传 meta.cache 时 GET 仍会缓存', async () => {
    const { transport, adapter } = createCapturingTransport();
    const steps = buildPipelineSteps(transport, 'standard');

    await runPipelineAxiosRequest(steps, { url: '/only-signal', method: 'get' });
    await runPipelineAxiosRequest(steps, { url: '/only-signal', method: 'get' });

    expect(adapter).toHaveBeenCalledTimes(1);
  });

  it('POST 不写入缓存策略，两次请求都会走网络', async () => {
    const { transport, adapter } = createCapturingTransport();
    const steps = buildPipelineSteps(transport, 'standard');
    const config = { url: '/api/save', method: 'post' as const, data: { name: 'a' } };

    await runPipelineAxiosRequest(steps, config);
    await runPipelineAxiosRequest(steps, config);

    expect(adapter).toHaveBeenCalledTimes(2);
  });

  it('meta.cache=false 可关闭单次 GET 缓存', async () => {
    const { transport, adapter } = createCapturingTransport();
    const steps = buildPipelineSteps(transport, 'standard');
    const config = getConfig();

    await runPipelineAxiosRequest(steps, config);

    const ctx = createRequestContext(axiosRequestConfigToNormalized(config), undefined, {
      cache: false,
      signal: undefined
    });
    await composeSteps(steps)(ctx);
    expect(adapter).toHaveBeenCalledTimes(2);
  });
});

function createFailing500Transport() {
  const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
    throw new AxiosError(
      'Request failed with status code 500',
      AxiosError.ERR_BAD_RESPONSE,
      config,
      {},
      {
        data: '',
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        config
      }
    );
  });

  const instance = axios.create({ adapter: adapter as unknown as AxiosAdapter });
  const transport = new AxiosTransport({ instance });

  return { transport, adapter };
}

/** 仅重试 + 熔断 + 传输，避免标准链上的 setInterval 与假定时器冲突 */
function buildResilienceTestSteps(transport: AxiosTransport) {
  const profile = resolvePipelineProfile('standard');
  return [
    new PrepareContextStep(),
    new RetryStep({ defaultStrategy: profile.retryStrategy, enabledByDefault: true }),
    new CircuitBreakerStep({
      managerOptions: { cleanupInterval: 0 },
      enabledByDefault: true
    }),
    new PipelineTransportStep(transport)
  ];
}

describe('standard 管道：5xx 重试与熔断', () => {
  it('baseRetryShouldRetry 对 AxiosError 500 返回 true', () => {
    const { retryStrategy } = resolvePipelineProfile('standard');
    const config = testAxiosConfig('/api/admin/announcements', 'get');
    const error = new AxiosError(
      'Request failed with status code 500',
      AxiosError.ERR_BAD_RESPONSE,
      config,
      {},
      {
        data: '',
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        config
      }
    );

    expect(retryStrategy.shouldRetry(error, 0)).toBe(true);
  });

  it('RetryStep 对 AxiosError 500 会重试 maxRetries 次', async () => {
    const { retryStrategy } = resolvePipelineProfile('standard');
    const step = new RetryStep({ defaultStrategy: retryStrategy, enabledByDefault: true });
    const axiosConfig = testAxiosConfig('/api/admin/announcements', 'get');
    const error = new AxiosError(
      'Request failed with status code 500',
      AxiosError.ERR_BAD_RESPONSE,
      axiosConfig,
      {},
      {
        data: '',
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        config: axiosConfig
      }
    );
    const ctx = createRequestContext(
      { url: '/api/admin/announcements', method: 'GET' },
      undefined,
      {}
    );
    let attempts = 0;
    const next = async (): Promise<void> => {
      attempts += 1;
      throw error;
    };

    await expect(step.execute(ctx, next)).rejects.toBeInstanceOf(AxiosError);
    expect(attempts).toBe(4);
  }, 15_000);

  it('HTTP 500 时保留 AxiosError 并触发管道重试（1 + maxRetries 次网络）', async () => {
    const { transport, adapter } = createFailing500Transport();
    const steps = buildResilienceTestSteps(transport);
    const config = { url: '/api/admin/announcements', method: 'get' as const, params: { page: 1 } };

    await expect(runPipelineAxiosRequest(steps, config)).rejects.toBeInstanceOf(AxiosError);

    expect(adapter).toHaveBeenCalledTimes(4);
  }, 15_000);

  it('同一接口连续失败后熔断 OPEN，后续请求不再打网络', async () => {
    const { transport, adapter } = createFailing500Transport();
    const steps = buildResilienceTestSteps(transport);
    const config = { url: '/api/admin/announcements', method: 'get' as const, params: { page: 1 } };

    await expect(runPipelineAxiosRequest(steps, config)).rejects.toThrow();
    await expect(runPipelineAxiosRequest(steps, config)).rejects.toThrow();

    expect(adapter).toHaveBeenCalledTimes(5);

    adapter.mockClear();
    await expect(runPipelineAxiosRequest(steps, config)).rejects.toThrow(/熔断器已开启/);
    expect(adapter).not.toHaveBeenCalled();
  }, 20_000);
});
