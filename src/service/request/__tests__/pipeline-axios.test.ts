import axios, { type AxiosAdapter } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import { PrepareContextStep } from '@suga/request-core';
import { AxiosTransport } from '../pipeline/AxiosTransport';
import { buildPipelineSteps } from '../pipeline/buildPipelineSteps';
import { PipelineTransportStep } from '../pipeline/PipelineTransportStep';
import { axiosRequestConfigToNormalized } from '../pipeline/normalizeAxiosConfig';
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
