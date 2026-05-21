/** Axios 传输层：将 Axios 实例适配为 @suga/request-core 的 Transport */

import type { AxiosInstance, AxiosResponse } from 'axios';
import type { NormalizedRequestConfig, Transport, TransportResponse } from '@suga/request-core';

/** 与步骤链配合时，用于把 `pipelineCorrelationId` 关联到完整 Axios 响应 */
export type AxiosResponseCaptureMap = Map<string, AxiosResponse>;

/** Axios 传输层选项 */
export interface AxiosTransportOptions {
  /** 通常由 axios.create() 得到的实例 */
  instance: unknown;
  /**
   * 若提供：当请求配置含 `pipelineCorrelationId` 且 `instance.request` 成功后，写入完整 Axios 响应， 供
   * `PipelineTransportStep` 写入 `ctx.meta`，供 `createFlatRequestFromStack` 使用。
   */
  responseCaptureByCorrelationId?: AxiosResponseCaptureMap;
}

/** 将 Axios 响应头转为 Record<string, string> */
function normalizeHeaders(headers: AxiosResponse['headers']): Record<string, string> {
  const normalized: Record<string, string> = {};

  if (headers && typeof headers === 'object') {
    for (const [key, value] of Object.entries(headers)) {
      if (value !== undefined && value !== null) {
        normalized[key] = Array.isArray(value) ? value.join(', ') : String(value);
      }
    }
  }

  return normalized;
}

function isAxiosInstance(instance: unknown): instance is AxiosInstance {
  if (!instance) {
    return false;
  }
  return (
    (typeof instance === 'object' || typeof instance === 'function') &&
    typeof (instance as { request?: unknown }).request === 'function' &&
    typeof (instance as { get?: unknown }).get === 'function'
  );
}

/** Axios 实现 Transport，供步骤链末端发起真实 HTTP */
export class AxiosTransport implements Transport {
  private readonly instance: AxiosInstance;

  private readonly responseCaptureByCorrelationId?: AxiosResponseCaptureMap;

  constructor(options: AxiosTransportOptions) {
    if (!isAxiosInstance(options.instance)) {
      throw new TypeError(
        'AxiosTransport: instance must be an AxiosInstance (created by axios.create())'
      );
    }
    this.instance = options.instance;
    this.responseCaptureByCorrelationId = options.responseCaptureByCorrelationId;
  }

  /** 取出并移除关联的 Axios 响应（由 PipelineTransportStep 在传输完成后调用） */
  takeCapturedResponse(correlationId: string): AxiosResponse | undefined {
    const map = this.responseCaptureByCorrelationId;
    if (!map) return undefined;
    const r = map.get(correlationId);
    map.delete(correlationId);
    return r;
  }

  async request<T = unknown>(config: NormalizedRequestConfig): Promise<TransportResponse<T>> {
    const extended = config as NormalizedRequestConfig & { pipelineCorrelationId?: string };
    const correlationId = extended.pipelineCorrelationId;
    const axiosConfig = { ...extended } as unknown as Parameters<AxiosInstance['request']>[0];
    delete (axiosConfig as { pipelineCorrelationId?: string }).pipelineCorrelationId;

    // 直接抛出 AxiosError（含 response.status），供 RetryStep / CircuitBreakerStep 识别 5xx
    const response = await this.instance.request<T>(axiosConfig);

    if (correlationId && this.responseCaptureByCorrelationId) {
      this.responseCaptureByCorrelationId.set(correlationId, response);
    }

    return {
      data: response.data,
      status: response.status,
      headers: normalizeHeaders(response.headers),
      config
    };
  }
}
