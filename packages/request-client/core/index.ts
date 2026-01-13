/**
 * 核心模块导出
 */

// 从 request-core 重新导出核心类型和类
export type {
  RequestContext,
  RequestState,
  NormalizedRequestConfig,
} from '@suga/request-core';
export { createRequestContext } from '@suga/request-core';

export type { Transport, TransportResponse } from '@suga/request-core';
export type { RequestStep } from '@suga/request-core';
export { PrepareContextStep, TransportStep as CoreTransportStep } from '@suga/request-core';
export { RequestExecutor } from '@suga/request-core';
export { RequestClient } from '@suga/request-core';

// 业务层步骤
export * from './steps/TransportStep';
export * from './steps/AbortStep';

// Transport 适配器
export * from './transport/AxiosTransport';
export type * from './transport/AxiosTransport';

// Step 已拆分到各个 @suga/request-* 包，请从对应包导入

// Client
export * from './client/ApiRequestClient';
export * from './client/createRequestClient';

// Utils
export { adaptRequestConfigToCore } from './utils/configAdapter';

