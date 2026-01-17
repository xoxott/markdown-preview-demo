export type {
  RequestContext,
  RequestState,
  NormalizedRequestConfig,
  Transport,
  TransportResponse,
  RequestStep,
} from '@suga/request-core';
export {
  RequestClient,
  RequestExecutor,
  PrepareContextStep,
  TransportStep as CoreTransportStep,
  createRequestContext,
} from '@suga/request-core';

// 导出业务层客户端
export { ApiRequestClient } from './client/ApiRequestClient';

// 导出示例函数（推荐业务层按需组装，而不是使用固定组合）
export { createRequestClient } from './client/createRequestClient';
export { createDefaultClient } from './examples/createDefaultClient';
export { createMinimalClient } from './examples/createMinimalClient';
export { createCustomClient } from './examples/createCustomClient';
export type { CustomClientOptions } from './examples/createCustomClient';

// 重新导出各个功能包的 Step（方便使用）
export { CacheReadStep, CacheWriteStep } from '@suga/request-cache';
export { RetryStep } from '@suga/request-retry';
export { CircuitBreakerStep } from '@suga/request-circuit-breaker';
export { DedupeStep } from '@suga/request-dedupe';
export { QueueStep } from '@suga/request-queue';
export { EventStep } from '@suga/request-events';

// 导出 Axios 相关（从 request-axios 包导出）
export { AxiosTransport, TransportStep, AbortStep } from '@suga/request-axios';
export type { AxiosTransportOptions } from '@suga/request-axios';

// 导出类型
export type {
  RequestConfig,
  RequestMethod,
  RequestOptions,
  TimeoutStrategy,
} from './types';


// 导出中止相关工具（从 request-abort 包）
export { AbortControllerManager } from '@suga/request-abort';
export type {
  AbortControllerManagerOptions,
  CancelableRequestConfig,
} from '@suga/request-abort';
export {
  createErrorContext,
  createErrorContextFromError,
  enhanceErrorResponse,
  errorToJSON,
  type ErrorContext,
  type GenericErrorResponse,
} from './utils/errors/errorContext';
export {
  enhanceError,
  type EnhancedAxiosError,
} from './utils/errors/errorEnhancer';

export { RequestCacheManager } from '@suga/request-cache';
export {
  DefaultCachePolicy,
  NoCachePolicy,
  createCachePolicy,
} from '@suga/request-cache';
export type {
  CacheConfig,
  CachePolicy,
} from '@suga/request-cache';

export { DedupeManager } from '@suga/request-dedupe';
export type {
  DedupeOptions,
  DedupeStrategy,
} from '@suga/request-dedupe';

export { QueueManager, createRequestQueue } from '@suga/request-queue';
export type {
  QueueConfig,
  RequestPriority,
} from '@suga/request-queue';

export {
  calculateProgress,
  formatFileSize,
  formatSpeed,
  createProgressTracker,
} from '@suga/request-progress';

export type { StorageAdapter } from '@suga/storage';

export {
  LocalStorageAdapter,
  SessionStorageAdapter,
  MemoryStorageAdapter,
  defaultStorageAdapter,
} from '@suga/storage';

export {
  loggerManager,
  logRequestWithManager,
  logResponseWithManager,
  logErrorWithManager,
  configureLogger,
} from '@suga/request-logger';
export {
  logRequest,
  logResponse,
  logError,
} from '@suga/request-logger';
export type { LoggerOptions } from '@suga/request-logger';

export {
  eventManager,
  onRequestStart,
  onRequestSuccess,
  onRequestError,
  onRequestComplete,
  offRequestStart,
  offRequestSuccess,
  offRequestError,
  offRequestComplete,
  removeAllEventListeners,
} from '@suga/request-events';
export type {
  RequestEventType,
  RequestStartEventData,
  RequestSuccessEventData,
  RequestErrorEventData,
  RequestCompleteEventData,
} from '@suga/request-events';

export {
  performanceMonitor,
} from '@suga/request-performance';
export type {
  PerformanceMonitor,
  PerformanceMetrics,
} from '@suga/request-performance';

export {
  CircuitBreaker,
  createCircuitBreaker,
  CircuitBreakerManager,
  DefaultStateTransitionStrategy,
  DefaultErrorClassificationStrategy,
  DefaultSuccessEvaluationStrategy,
} from '@suga/request-circuit-breaker';
export type {
  CircuitBreakerOptions,
  CircuitBreakerMetrics,
  CircuitBreakerState,
  ErrorClassificationStrategy,
  StateTransitionStrategy,
  SuccessEvaluationStrategy,
} from '@suga/request-circuit-breaker';

// 导出常量
export {
  DEFAULT_TIMEOUT,
} from './constants';
// 注意：TOKEN_KEY、HttpStatus、ContentType、ERROR_MESSAGE_MAP 等业务常量已移除，应由应用层定义

/**
 * 使用示例：
 *
 * import { createRequestClient } from '@suga/request-client';
 *
 * // 创建请求客户端
 * const client = createRequestClient(undefined, {
 *   baseURL: '/api',
 *   timeout: 10000,
 * });
 *
 * // GET 请求
 * const data = await client.get<User>('/user/1');
 *
 * // POST 请求
 * const result = await client.post('/user', { name: 'John' });
 *
 * // 带配置的请求（使用 meta 传递功能配置）
 * const result = await client.request({
 *   url: '/data',
 *   method: 'GET',
 *   meta: {
 *     retry: { count: 3 },
 *     cache: { enabled: true },
 *   },
 * });
 *
 * // 中止请求（需要先获取 AbortControllerManager 实例）
 * import { AbortControllerManager } from '@suga/request-abort';
 * const abortControllerManager = new AbortControllerManager();
 * cancelTokenManager.cancel('request_id');
 *
 * 注意：
 * - Loading、错误提示、Token 刷新等业务逻辑应由应用层实现
 * - 文件上传/下载应由应用层基于 client.post/get 实现
 * - 业务响应格式处理应由应用层实现
 */

