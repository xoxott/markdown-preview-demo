/** 类型定义汇总导出 */

export type {
  MessageRole,
  BaseMessage,
  UserMessage,
  UserContentPart,
  UserTextPart,
  UserImagePart,
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

export type { AgentEvent, BudgetExceededEvent } from './events';

export type {
  LLMStreamChunk,
  ToolDefinition,
  LLMProvider,
  LLMResponse,
  SystemPrompt,
  CallModelOptions
} from './provider';
export { createSystemPrompt } from './provider';

export type { ToolScheduler, InterleavedToolScheduler } from './scheduler';
export { isInterleavedScheduler } from './scheduler';
