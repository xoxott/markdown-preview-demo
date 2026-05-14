/**
 * 基于 @suga/request-* 步骤链的请求客户端（与业务 createFlatRequestFromStack 可组合）。
 *
 * 主业务 `request` 在 `src/service/request/index.ts` 中通过共享 `AxiosInstance` + 本模块步骤链装配。
 */

import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import {
  RequestClient,
  RequestExecutor,
  type RequestStep,
  type Transport
} from '@suga/request-core';
import { onRequestError, onRequestStart, onRequestSuccess } from '@suga/request-events';
import {
  configureLogger,
  logErrorWithManager,
  logRequestWithManager,
  logResponseWithManager
} from '@suga/request-logger';
import type { AxiosResponseCaptureMap } from './AxiosTransport';
import { AxiosTransport } from './AxiosTransport';
import { buildPipelineSteps } from './buildPipelineSteps';
import type { PipelineProfile } from './pipelineProfile';

/** 自定义 RequestClient：使用完整步骤链替换默认 [Prepare, Transport] */
class PipelineRequestClient extends RequestClient {
  constructor(transport: Transport, steps: RequestStep[]) {
    super(transport);
    (this as unknown as { steps: RequestStep[] }).steps = steps;
    (this as unknown as { executor: RequestExecutor }).executor = new RequestExecutor(steps);
  }
}

let loggerConfigured = false;

/** 注册步骤链事件日志（全局一次，避免重复订阅） */
export function ensurePipelineLogger() {
  if (loggerConfigured) return;
  loggerConfigured = true;
  configureLogger({ enabled: true });
  onRequestStart(data => {
    logRequestWithManager(data.config);
  });
  onRequestSuccess(data => {
    logResponseWithManager(data.config, data.result, data.duration);
  });
  onRequestError(data => {
    logErrorWithManager(data.config, data.error, data.duration);
  });
}

export type CreatePipelineClientConfig = AxiosRequestConfig & {
  /** 传入则不再 `axios.create`，用于与 `@suga/axios` 栈共享同一实例 */
  axiosInstance?: AxiosInstance;
  /** 与 `axiosInstance` 一起用于主业务装配；写入完整 Axios 响应供 {@link runPipelineAxiosRequest} 使用。 独立演示客户端可不传。 */
  responseCaptureByCorrelationId?: AxiosResponseCaptureMap;
  /** 横切步骤组合，默认 `standard` */
  pipelineProfile?: PipelineProfile;
};

/** 创建带步骤链的 RequestClient（Axios 为传输实现）。 业务码与 Token 策略由共享的 `axiosInstance` 拦截器负责（若传入）。 */
export function createPipelineClient(config?: CreatePipelineClientConfig) {
  ensurePipelineLogger();

  const cfg = config ?? {};
  const {
    axiosInstance,
    responseCaptureByCorrelationId,
    pipelineProfile = 'standard',
    ...axiosCreateConfig
  } = cfg;

  const instance: AxiosInstance =
    axiosInstance ??
    axios.create({
      baseURL: '/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      },
      ...axiosCreateConfig
    });

  const transport = new AxiosTransport({
    instance,
    responseCaptureByCorrelationId
  });

  const steps = buildPipelineSteps(transport, pipelineProfile);

  return new PipelineRequestClient(transport, steps);
}
