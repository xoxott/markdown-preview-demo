import type { AxiosResponse } from 'axios';
import type { FlatRequestInstance } from '@suga/axios';
import {
  createAxiosRequestStack,
  createFlatRequest,
  createFlatRequestFromStack,
  createRequest
} from '@suga/axios';
import { getServiceBaseURL } from '@/utils/service';
import type { RequestInstanceState } from './type';
import { createDemoRequestPolicies } from './policies/demoRequestPolicies';
import { createMainRequestPolicies } from './policies/mainRequestPolicies';
import { createRefreshTokenRequestOptions } from './policies/refreshTokenPolicies';
import { SERVICE_DEFAULT_HEADERS } from './requestDefaults';
import {
  AxiosTransport,
  buildPipelineSteps,
  ensurePipelineLogger,
  runPipelineAxiosRequest
} from './pipeline';
import type { PipelineProfile } from './pipeline';

const isHttpProxy = import.meta.env.DEV && import.meta.env.VITE_HTTP_PROXY === 'Y';
const { baseURL, otherBaseURL } = getServiceBaseURL(import.meta.env, isHttpProxy);

const rawPipelineProfile = import.meta.env.VITE_HTTP_PIPELINE_PROFILE;
const MAIN_PIPELINE_PROFILE: PipelineProfile =
  rawPipelineProfile === 'minimal' ||
  rawPipelineProfile === 'resilient' ||
  rawPipelineProfile === 'standard'
    ? rawPipelineProfile
    : 'standard';

/** 刷新 token 专用的请求实例 不携带 Authorization header，避免循环问题 */
export const refreshTokenRequest = createFlatRequest<App.Service.Response, RequestInstanceState>(
  {
    baseURL,
    headers: { ...SERVICE_DEFAULT_HEADERS }
  },
  createRefreshTokenRequestOptions()
);

/** 主业务请求：共享 Axios 拦截器栈 + 可配置 profile 步骤链，对外仍为 createFlatRequest 形态 */
ensurePipelineLogger();

const mainRequestResponseCapture = new Map<string, AxiosResponse<App.Service.Response>>();

const mainRequestRef: {
  current: FlatRequestInstance<RequestInstanceState, App.Service.Response> | null;
} = { current: null };

const mainRequestStack = createAxiosRequestStack<App.Service.Response>(
  {
    baseURL,
    headers: { ...SERVICE_DEFAULT_HEADERS }
  },
  createMainRequestPolicies(() => {
    const r = mainRequestRef.current;
    if (!r) {
      throw new Error('[request] main flat client not ready');
    }
    return r;
  })
);

const mainTransport = new AxiosTransport({
  instance: mainRequestStack.instance,
  responseCaptureByCorrelationId: mainRequestResponseCapture
});

const mainPipelineSteps = buildPipelineSteps(mainTransport, MAIN_PIPELINE_PROFILE);

export const request = createFlatRequestFromStack<App.Service.Response, RequestInstanceState>(
  mainRequestStack,
  c => runPipelineAxiosRequest<App.Service.Response>(mainPipelineSteps, c)
);

mainRequestRef.current = request;

export const demoRequest = createRequest<App.Service.DemoResponse>(
  {
    baseURL: otherBaseURL.demo
  },
  createDemoRequestPolicies()
);

export {
  AxiosTransport,
  buildDefaultPipelineSteps,
  buildPipelineSteps,
  createPipelineClient,
  ensurePipelineLogger,
  PipelineTransportStep,
  resolvePipelineProfile,
  runPipelineAxiosRequest
} from './pipeline';

export type { PipelineProfile } from './pipeline';
