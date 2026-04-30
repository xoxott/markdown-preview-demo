/** 消息类型定义（Message Types） Agent 与 LLM 之间的消息协议 */

/** 消息角色 */
export type MessageRole = 'user' | 'assistant' | 'tool_result';

/** 基础消息接口 */
export interface BaseMessage {
  /** 消息唯一标识 */
  readonly id: string;
  /** 消息角色 */
  readonly role: MessageRole;
  /** 创建时间戳 */
  readonly timestamp: number;
}

/** 用户消息 */
export interface UserMessage extends BaseMessage {
  readonly role: 'user';
  /** 用户输入文本 */
  readonly content: string;
  /** 是否为系统注入的 meta 消息（不计入对话质量评估） */
  readonly isMeta?: boolean;
}

/** 工具调用块（Assistant 消息中的 tool_use 部分） */
export interface ToolUseBlock {
  /** 工具调用唯一标识 */
  readonly id: string;
  /** 工具名称 */
  readonly name: string;
  /** 工具输入参数 */
  readonly input: Record<string, unknown>;
}

/** 助手消息 */
export interface AssistantMessage extends BaseMessage {
  readonly role: 'assistant';
  /** 文本内容 */
  readonly content: string;
  /** 工具调用列表（可能为空） */
  readonly toolUses: readonly ToolUseBlock[];
}

/** 工具结果消息 */
export interface ToolResultMessage extends BaseMessage {
  readonly role: 'tool_result';
  /** 对应的工具调用 ID */
  readonly toolUseId: string;
  /** 工具名称 */
  readonly toolName: string;
  /** 执行结果（成功时） */
  readonly result?: unknown;
  /** 执行错误（失败时） */
  readonly error?: string;
  /** 是否执行成功 */
  readonly isSuccess: boolean;
}

/** 消息联合类型 */
export type AgentMessage = UserMessage | AssistantMessage | ToolResultMessage;
