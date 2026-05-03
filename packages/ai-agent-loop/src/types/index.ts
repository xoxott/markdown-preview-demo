/** 类型定义汇总导出 */

export type {
  MessageRole,
  BaseMessage,
  UserMessage,
  ToolUseBlock,
  ToolReferenceBlock,
  AssistantMessage,
  ToolResultMessage,
  AgentMessage
} from './messages';

export type {
  AgentConfig,
  AgentState,
  TerminalTransition,
  ContinueTransition,
  LoopTransition,
  HookBlockingError
} from './state';
export { isTerminal } from './state';

export type { LoopResult } from './result';

export type { AgentEvent } from './events';

export type {
  LLMStreamChunk,
  ToolDefinition,
  LLMProvider,
  SystemPrompt,
  CallModelOptions
} from './provider';
export { createSystemPrompt } from './provider';

export type { ToolScheduler, InterleavedToolScheduler } from './scheduler';
export { isInterleavedScheduler } from './scheduler';
