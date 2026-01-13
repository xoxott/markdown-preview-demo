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
  ApiResponse,
  PageResponse,
  PageData,
  ErrorResponse,
  RequestConfig,
  RequestMethod,
} from './types';

export { BusinessErrorCode } from './constants';

// 导出工具函数
export { cancelTokenManager, generateRequestId } from './utils/request/cancel';
export {
  handleHttpError,
  handleBusinessError,
  getErrorMessage,
  errorMessageManager,
  globalErrorHandlerManager,
  type ErrorMessageHandler,
  type CustomErrorHandler,
} from './utils/errors/errorHandler';
export {
  createErrorContext,
  createErrorContextFromError,
  enhanceErrorResponse,
  errorToJSON,
  type ErrorContext,
} from './utils/errors/errorContext';
export {
  enhanceError,
  createEnhancedErrorFromResponse,
  type EnhancedAxiosError,
} from './utils/errors/errorEnhancer';
// 重试相关工具已从 @suga/request-retry 导出
export {
  loadingManager,
  showLoading,
  hideLoading,
  resetLoading,
  type LoadingShowFunction,
  type LoadingHideFunction,
  type LoadingManagerOptions,
} from './utils/features/loading';
export {
  tokenRefreshManager,
  configureTokenRefresh,
  type TokenRefreshOptions,
} from './utils/storage/tokenRefresh';
// 重新导出缓存相关（从新包）
export {
  CacheManager,
  RequestCacheManager,
} from '@suga/request-cache';
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
export {
  storageManager,
  configureStorage,
  type StorageAdapter,
  LocalStorageAdapter,
  SessionStorageAdapter,
  MemoryStorageAdapter,
} from './utils/storage/storage';
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
  TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  DEFAULT_TIMEOUT,
  DEFAULT_RETRY_COUNT,
  DEFAULT_RETRY_DELAY,
  HttpStatus,
  ContentType,
  ERROR_MESSAGE_MAP,
} from './constants';

/**
 * 使用示例：
 *
 * import { createRequestClient, loadingManager, errorMessageManager } from '@suga/request-client';
 * import { MessagePlugin, LoadingPlugin } from 'tdesign-vue-next'; // 或其他 UI 库
 *
 * // 配置 Loading 处理器（应用层配置，解耦 UI 库）
 * loadingManager.setHandlers({
 *   show: () => {
 *     LoadingPlugin.fullscreen({ loading: true });
 *   },
 *   hide: () => {
 *     LoadingPlugin.fullscreen({ loading: false });
 *   },
 * });
 *
 * // 配置错误消息处理器（应用层配置，解耦 UI 库）
 * errorMessageManager.setHandler((message: string) => {
 *   MessagePlugin.error(message);
 * });
 *
 * // 创建请求实例
 * const request = createRequest(undefined, {
 *   baseURL: '/api',
 *   timeout: 10000,
 * });
 *
 * // GET请求
 * const data = await request.get<User>('/user/1');
 *
 * // POST请求
 * const result = await request.post('/user', { name: 'John' });
 *
 * // 带配置的请求
 * const result = await request.get('/data', {}, {
 *   loading: true,
 *   retry: true,
 *   retryCount: 3,
 * });
 *
 * // 文件上传
 * const result = await request.upload('/upload', file);
 *
 * // 文件下载
 * await request.download('/export', {}, 'report.xlsx');
 *
 * // 取消请求
 * request.cancel('request_id');
 */
