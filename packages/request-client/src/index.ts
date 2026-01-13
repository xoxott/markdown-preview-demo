/**
 * API模块导出入口
 */

// 旧版 API 已移除，请使用新的基于 Step 的架构

// 导出新架构（基于 Step 的请求系统）
// 从 request-core 重新导出核心类型和类
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

// 导出业务层步骤和客户端
export { TransportStep } from './core/steps/TransportStep';
export { ApiRequestClient } from './core/client/ApiRequestClient';
export { createRequestClient } from './core/client/createRequestClient';

// 重新导出各个功能包的 Step（方便使用）
export { CacheReadStep, CacheWriteStep } from '@suga/request-cache';
export { RetryStep } from '@suga/request-retry';
export { CircuitBreakerStep } from '@suga/request-circuit-breaker';
export { DedupeStep } from '@suga/request-dedupe';
export { QueueStep } from '@suga/request-queue';
export { EventStep } from '@suga/request-events';

// 导出 Axios 相关（在 api 包中实现，不独立成包）
export { AbortStep } from './core/steps/AbortStep';
export { AxiosTransport } from './core/transport/AxiosTransport';
export type { AxiosTransportOptions } from './core/transport/AxiosTransport';

// 导出类型
export type {
  RequestConfig,
  RequestMethod,
} from './types';

// 注意：ApiResponse、ErrorResponse 等业务响应类型已移除，应由应用层定义

// 导出工具函数
export { cancelTokenManager, generateRequestId } from './utils/request/cancel';
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
// 注意：Loading、错误消息处理、Token 刷新等业务逻辑已移除，应由应用层实现
// 重新导出缓存相关（从新包）
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

// 重新导出去重相关（从新包）
export { DedupeManager } from '@suga/request-dedupe';
export type {
  DedupeOptions,
  DedupeStrategy,
} from '@suga/request-dedupe';

// 重新导出队列相关（从新包）
export { QueueManager, createRequestQueue } from '@suga/request-queue';
export type {
  QueueConfig,
  RequestPriority,
} from '@suga/request-queue';
// 重新导出进度相关（从新包）
export {
  calculateProgress,
  formatFileSize,
  formatSpeed,
  createProgressTracker,
} from '@suga/request-progress';
// 重新导出存储适配器（从 @suga/storage）
export type { StorageAdapter } from '@suga/storage';
export {
  LocalStorageAdapter,
  SessionStorageAdapter,
  MemoryStorageAdapter,
  defaultStorageAdapter,
} from '@suga/storage';
export {
  environmentAdapter,
  isBrowser,
  isNode,
  isSSR,
  isDevelopment,
  isProduction,
} from './utils/common/env';
// 重新导出日志相关（从新包）
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

// 重新导出事件相关（从新包）
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

// 重新导出性能监控相关（从新包）
export {
  performanceMonitor,
} from '@suga/request-performance';
export type {
  PerformanceMonitor,
  PerformanceMetrics,
} from '@suga/request-performance';
// 重新导出熔断器相关（从新包）
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
 * // 取消请求
 * cancelTokenManager.cancel('request_id');
 *
 * 注意：
 * - Loading、错误提示、Token 刷新等业务逻辑应由应用层实现
 * - 文件上传/下载应由应用层基于 client.post/get 实现
 * - 业务响应格式处理应由应用层实现
 */

