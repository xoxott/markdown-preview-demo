/**
 * API 使用示例索引
 *
 * 本目录包含各种使用场景的示例代码：
 *
 * - basic-usage.ts: 基础使用示例（CRUD 操作）
 * - advanced-features.ts: 高级功能示例（重试、缓存、去重、取消等）
 * - file-operations.ts: 文件操作示例（上传、下载）
 * - token-management.ts: Token 管理示例（登录、刷新、登出）
 * - error-handling.ts: 错误处理示例（全局处理、自定义处理）
 * - middleware-and-plugins.ts: 中间件和插件示例（扩展功能）
 * - real-world-scenarios.ts: 真实场景示例（实际项目中的常见场景）
 */

// 导出所有示例（避免重复导出）
export * from './basic-usage';
export {
  fetchDataWithRetry,
  fetchDataWithCustomRetry,
  fetchCachedData,
  fetchFreshData,
  fetchDataWithDedupe,
  fetchDataWithoutDedupe,
  fetchCancellableData,
  cancelRequest,
  fetchDataWithoutLoading,
  fetchDataWithoutErrorToast,
  fetchDataWithCustomErrorHandler as fetchDataWithCustomErrorHandlerAdvanced,
  fetchHighPriorityData,
  fetchDataWithCircuitBreaker,
  fetchDataWithCustomTimeout,
} from './advanced-features';
export * from './file-operations';
export * from './token-management';
export {
  setupGlobalErrorHandler,
  setupErrorLogging,
  fetchDataWithCustomErrorHandler,
  fetchDataSkipErrorHandler,
  handleBusinessError,
  handleNetworkError,
  handleTimeoutError,
  fetchDataWithRetry as fetchDataWithRetryError,
  handleErrorByType,
  errorHandlingExample,
  errorCollector,
  setupErrorCollection,
  reportAllErrors,
  getErrorStatistics,
  capturePromiseError,
  setupGlobalErrorCapture,
} from './error-handling';
export * from './middleware-and-plugins';
export * from './real-world-scenarios';
