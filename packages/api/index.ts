/**
 * API模块导出入口
 */

// 导出请求实例和类
export { createRequest, Request } from './request';
export type { RequestOptions, TimeoutStrategy } from './request';

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
export { retryRequest, shouldRetry, calculateRetryDelay } from './utils/request/retry';
export type { RetryStrategy } from './utils/request/retry';
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
export {
  requestDedupeManager,
  configureRequestDedupe,
  type RequestDedupeOptions,
  type DedupeStrategy,
} from './utils/request/requestDedupe';
export {
  requestCacheManager,
  configureRequestCache,
  type RequestCacheOptions,
} from './utils/request/requestCache';
export type { CacheStrategy, CustomCacheStrategy } from './utils/cache/types';
export {
  calculateProgress,
  formatFileSize,
  formatSpeed,
  createProgressTracker,
} from './utils/features/progress';
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
export type { FeatureType } from './utils/common/env';
export {
  validateRequestOptions,
  assertRequestOptions,
  isValidUrl,
  isValidHttpMethod,
  ValidationError,
  type ValidationResult,
} from './utils/common/validators';
export {
  isRequestConfig,
  isAxiosError,
  hasErrorCode,
  assertRequestConfig,
} from './utils/common/typeGuards';
export {
  loggerManager,
  configureLogger,
  logRequest,
  logResponse,
  logError,
  type LoggerOptions,
} from './utils/features/logger';
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
  type RequestEventType,
  type RequestStartEventData,
  type RequestSuccessEventData,
  type RequestErrorEventData,
  type RequestCompleteEventData,
} from './utils/features/events';
export {
  performanceMonitor,
  type PerformanceMonitor,
  type PerformanceMetrics,
} from './utils/features/performance';
export type { Plugin, PluginManager } from './plugins/types';
export type { Middleware, MiddlewareManager } from './middleware/types';
export type { RequestAdapter, AdapterResponse } from './adapters/types';
export { AxiosAdapter } from './adapters/AxiosAdapter';
export type { QueueConfig, RequestPriority } from './utils/request/requestQueue';
export { createRequestQueue } from './utils/request/requestQueue';
export {
  createCircuitBreaker,
  circuitBreakerManager,
  CircuitBreaker,
  CircuitBreakerState,
  type CircuitBreakerOptions,
} from './utils/request/circuitBreaker';

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
 * import { createRequest, loadingManager, errorMessageManager } from '@ellwood/shared/api';
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
