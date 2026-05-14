import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { type RequestStep, composeSteps, createRequestContext } from '@suga/request-core';
import { axiosRequestConfigToNormalized } from './normalizeAxiosConfig';
import { PIPELINE_AXIOS_RESPONSE_META } from './pipelineAxiosMeta';

/**
 * 经默认步骤链执行请求，并返回完整 `AxiosResponse`（供 `createFlatRequestFromStack` + `transformBackendResponse`）。
 *
 * 要求：`steps` 末端为 {@link PipelineTransportStep}，且 `Transport` 为带 `responseCaptureByCorrelationId` 的
 * {@link AxiosTransport}。
 */
export async function runPipelineAxiosRequest<ResponseData = unknown>(
  steps: RequestStep[],
  axiosConfig: AxiosRequestConfig
): Promise<AxiosResponse<ResponseData>> {
  const normalized = axiosRequestConfigToNormalized(axiosConfig);
  const ctx = createRequestContext<ResponseData>(normalized, undefined, {
    signal: axiosConfig.signal
  });

  await composeSteps(steps)(ctx);

  if (ctx.error) {
    throw ctx.error;
  }

  const axiosResponse = ctx.meta[PIPELINE_AXIOS_RESPONSE_META] as
    | AxiosResponse<ResponseData>
    | undefined;
  if (!axiosResponse) {
    throw new Error(
      'runPipelineAxiosRequest: missing captured Axios response. Use AxiosTransport with responseCaptureByCorrelationId and PipelineTransportStep.'
    );
  }

  return axiosResponse;
}
