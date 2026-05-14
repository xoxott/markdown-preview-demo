/**
 * 请求管道（@suga/request-core + Axios Transport）。 页面与业务 API 默认仍使用 `@/service/request` 的
 * `request`；仅在需要横切能力时引用本模块。
 */

export { AxiosTransport } from './AxiosTransport';
export type { AxiosTransportOptions, AxiosResponseCaptureMap } from './AxiosTransport';
export { PIPELINE_AXIOS_RESPONSE_META } from './pipelineAxiosMeta';
export { PipelineTransportStep } from './PipelineTransportStep';
export { axiosRequestConfigToNormalized } from './normalizeAxiosConfig';
export { runPipelineAxiosRequest } from './runPipelineAxiosRequest';
export { buildDefaultPipelineSteps, buildPipelineSteps } from './buildPipelineSteps';
export type { PipelineProfile, PipelineProfileResolved } from './pipelineProfile';
export { resolvePipelineProfile } from './pipelineProfile';
export { createPipelineClient, ensurePipelineLogger } from './createPipelineClient';
export type { CreatePipelineClientConfig } from './createPipelineClient';
