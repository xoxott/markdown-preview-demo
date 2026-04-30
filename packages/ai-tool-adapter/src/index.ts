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
