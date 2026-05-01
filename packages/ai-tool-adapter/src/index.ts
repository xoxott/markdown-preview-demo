/**
 * @suga/ai-tool-adapter
 * LLM Provider 适配器包 — Anthropic/OpenAI 等 SDK 的 HTTP 流式调用适配
 */

// 类型导出
export type * from './types';

// 适配器
export { BaseLLMAdapter } from './adapter/BaseLLMAdapter';
export { AnthropicAdapter } from './adapter/AnthropicAdapter';

// 转换工具
export { zodToJsonSchema } from './convert/zod-to-json-schema';
export {
  formatAnthropicToolDefinition,
  formatAnthropicApiToolDef
} from './convert/tool-definition';
export { convertToAnthropicMessages } from './convert/message-converter';

// SSE 解析
export { parseAnthropicSSEStream, parseSSEText } from './stream/sse-parser';
export { mapSSEEventsToChunks } from './stream/chunk-mapper';

// 错误映射
export { mapAnthropicError, createAbortError } from './error/error-mapper';

// 用量追踪（P18 新增）
export {
  InMemoryUsageTracker,
  detectOverage,
  emptyUsageSummary
} from './lifecycle/UsageTrackerImpl';

// 重试策略（P18 新增）
export {
  classifyLLMError,
  calculateBackoffDelay,
  shouldRetryLLMCall,
  withLLMRetry,
  DEFAULT_LLM_RETRY_CONFIG
} from './retry/retry-strategy';
export type { RetryableErrorType, LLMRetryConfig } from './retry/retry-strategy';

// Prompt Cache 断裂检测（P18 新增）
export {
  detectCacheBreak,
  calculateCacheHitRate,
  DEFAULT_CACHE_BREAK_THRESHOLD
} from './retry/cache-break-detection';
export type {
  CacheBreakResult,
  CacheBreakReason,
  CacheBreakThreshold
} from './retry/cache-break-detection';

// 请求生命周期钩子（P18 新增）
export { composeLifecycleHooks } from './lifecycle/request-lifecycle';
export type {
  LLMRequestContext,
  LLMResponseContext,
  LLMRequestLifecycleHook
} from './lifecycle/request-lifecycle';
