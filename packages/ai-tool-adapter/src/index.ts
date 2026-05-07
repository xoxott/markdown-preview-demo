/**
 * @suga/ai-tool-adapter
 * LLM Provider 适配器包 — Anthropic/OpenAI 等 SDK 的 HTTP 流式调用适配
 */

// 类型导出
export type * from './types';

// Beta 常量（P36 新增）
export { ANTHROPIC_PROMPT_CACHE_BETA, ANTHROPIC_TOKEN_BATCHING_BETA } from './types/anthropic';

// 适配器
export { BaseLLMAdapter } from './adapter/BaseLLMAdapter';
export { AnthropicAdapter } from './adapter/AnthropicAdapter';
export { OpenAIAdapter } from './adapter/OpenAIAdapter';
export { AzureOpenAIAdapter } from './adapter/AzureOpenAIAdapter';
export type { AzureOpenAIAdapterConfig } from './adapter/AzureOpenAIAdapter';
export { DEFAULT_AZURE_API_VERSION } from './adapter/AzureOpenAIAdapter';
export { OllamaAdapter } from './adapter/OllamaAdapter';
export type { OllamaAdapterConfig } from './adapter/OllamaAdapter';
export { DEFAULT_OLLAMA_BASE_URL, DEFAULT_OLLAMA_TIMEOUT } from './adapter/OllamaAdapter';
export { GeminiAdapter } from './adapter/GeminiAdapter';
export type { GeminiAdapterConfig } from './types/gemini';
export {
  DEFAULT_GEMINI_API_VERSION,
  DEFAULT_GEMINI_BASE_URL,
  DEFAULT_GEMINI_MAX_TOKENS
} from './types/gemini';

// 模型能力（P85 新增）
export {
  CLAUDE_MODEL_CAPABILITY,
  GPT_MODEL_CAPABILITY,
  OPENAI_REASONING_MODEL_CAPABILITY,
  inferModelCapability
} from './types/model-config';

// 转换工具
export { zodToJsonSchema } from './convert/zod-to-json-schema';
export {
  formatAnthropicToolDefinition,
  formatAnthropicApiToolDef
} from './convert/tool-definition';
export { convertToAnthropicMessages } from './convert/message-converter';
export type { AnthropicCacheControlConfig } from './convert/message-converter';
export { convertToOpenAIMessages } from './convert/openai-message-converter';
export { convertToGeminiContents } from './convert/gemini-message-converter';
export {
  formatOpenAIToolDefinition,
  formatOpenAIApiToolDef
} from './convert/openai-tool-definition';
export {
  formatGeminiToolDefinition,
  formatGeminiApiToolDef,
  formatGeminiToolDefs
} from './convert/gemini-tool-definition';

// SSE 解析
export { parseAnthropicSSEStream, parseSSEText } from './stream/sse-parser';
export { mapSSEEventsToChunks } from './stream/chunk-mapper';
export { parseOpenAISSEStream, parseOpenAISSEText } from './stream/openai-sse-parser';
export { mapOpenAIChunksToChunks } from './stream/openai-chunk-mapper';
export { parseGeminiSSEStream, parseGeminiSSEText } from './stream/gemini-sse-parser';

// 错误映射
export { mapAnthropicError, createAbortError } from './error/error-mapper';
export { mapOpenAIError } from './error/openai-error-mapper';
export { mapGeminiError } from './error/gemini-error-mapper';

// 用量追踪（P18 新增）
export {
  InMemoryUsageTracker,
  detectOverage,
  emptyUsageSummary
} from './lifecycle/UsageTrackerImpl';

// 成本计算（P53 新增）
export { CostCalculator, DEFAULT_PRICE_TABLE } from './lifecycle/CostCalculator';
export type { CostConfig, ModelPriceEntry, PriceTable } from './lifecycle/CostCalculator';

// 重试策略（P18 新增, P32 增强）
export {
  classifyLLMError,
  calculateBackoffDelay,
  shouldRetryLLMCall,
  withLLMRetry,
  shouldRetry529,
  extractRetryAfterMs,
  parseContextOverflowError,
  DEFAULT_LLM_RETRY_CONFIG
} from './retry/retry-strategy';
export type { RetryableErrorType, LLMRetryConfig } from './retry/retry-strategy';

// Retry Provider 类型（P32 新增）
export type { QuerySource, AuthRefreshProvider, RetryContext } from './types/retry-providers';
export {
  FOREGROUND_QUERY_SOURCES,
  CannotRetryError,
  FallbackTriggeredError,
  ContextOverflowError
} from './types/retry-providers';

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

// Rate Limit（P31 新增, P80 OpenAI扩展）
export { extractRateLimitStatus, parseResetTimestamp } from './rate-limit/extract-rate-limit';
export { extractOpenAIRateLimitStatus } from './rate-limit/extract-openai-rate-limit';
export { InMemoryRateLimitProvider } from './rate-limit/InMemoryRateLimitProvider';
export type { RateLimitStatus, RateLimitProvider } from './types/rate-limit';

// Prompt State Tracker（P31 新增，增强 cache break 检测）
export {
  computePromptHash,
  recordPromptState,
  checkPromptStateForCacheBreak,
  PromptStateTracker
} from './retry/prompt-state-tracker';
export type {
  PromptStateSnapshot,
  PromptCacheBreakResult,
  PromptStateTrackerConfig
} from './types/prompt-state';

// Session Ingress（P31 新增）
export { InMemorySessionIngress } from './session-ingress/InMemorySessionIngress';
export type {
  SessionIngressEntry,
  SessionIngressProvider,
  SessionIngressFilter,
  SessionIngressEventType
} from './types/session-ingress';

// Tokenizer（P83 新增 — 精确 token 计数）
export {
  EstimateTokenizer,
  TokenizerRegistryImpl,
  createTokenEstimatorFromTokenizer
} from './tokenizer';
export type { TokenizerProvider, TokenizerRegistry } from './tokenizer';
