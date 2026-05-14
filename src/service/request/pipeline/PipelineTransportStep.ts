/* eslint-disable no-param-reassign */
/* eslint-disable consistent-return */
/**
 * 管道末端传输步骤：合并 AbortSignal 后调用 Transport。 与 request-core 内置 TransportStep 行为对齐，并显式透传 ctx 上的 signal。
 * 与 {@link AxiosTransport} + `responseCaptureByCorrelationId` 配合时，将完整 `AxiosResponse` 写入
 * `ctx.meta.__axiosResponse`。
 */

import { nanoid } from '@suga/utils';
import type {
  NormalizedRequestConfig,
  RequestContext,
  RequestStep,
  Transport
} from '@suga/request-core';
import { AxiosTransport } from './AxiosTransport';
import { PIPELINE_AXIOS_RESPONSE_META } from './pipelineAxiosMeta';

export class PipelineTransportStep implements RequestStep {
  private transport: Transport;

  constructor(transport: Transport) {
    this.transport = transport;
  }

  async execute<T>(ctx: RequestContext<T>, _next: () => Promise<void>): Promise<void> {
    if (ctx.state.aborted) {
      return Promise.resolve();
    }
    const signal = (ctx.meta.signal as AbortSignal | undefined) || ctx.config.signal;

    let baseConfig: NormalizedRequestConfig = ctx.config;
    if (signal) {
      baseConfig = {
        ...ctx.config,
        signal
      };
    }

    const correlationId = nanoid();
    const config: NormalizedRequestConfig & { pipelineCorrelationId: string } = {
      ...baseConfig,
      pipelineCorrelationId: correlationId
    };

    try {
      const response = await this.transport.request<T>(config);
      ctx.result = response.data as T;
      ctx.error = undefined;

      if (this.transport instanceof AxiosTransport) {
        const ax = this.transport.takeCapturedResponse(correlationId);
        if (ax) {
          ctx.meta[PIPELINE_AXIOS_RESPONSE_META] = ax;
        }
      }
    } catch (error) {
      ctx.error = error;
      throw error;
    }
  }
}
