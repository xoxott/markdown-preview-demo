/** Anthropic Claude API 专有类型定义 */

/** Anthropic 适配器配置 */
export interface AnthropicAdapterConfig {
  /** API 基础 URL（支持代理地址） */
  readonly baseURL: string;
  /** API 密钥 */
  readonly apiKey: string;
  /** 默认模型名称 */
  readonly model: string;
  /** API 版本（默认 "2023-06-01"） */
  readonly apiVersion?: string;
  /** 系统提示（作为顶层 system 字段） */
  readonly system?: string;
  /** 请求超时 ms（默认 60000） */
  readonly timeout?: number;
  /** 最大 token 数（默认 4096） */
  readonly maxTokens?: number;
  /** 自定义请求头（代理认证等） */
  readonly customHeaders?: Record<string, string>;
  /** 思考模式配置 */
  readonly thinking?: AnthropicThinkingConfig;
}

/** Anthropic 思考模式配置 */
export type AnthropicThinkingConfig =
  | { type: 'enabled'; budget_tokens: number }
  | { type: 'disabled' };

/** Anthropic system 内容块 — 支持 cache_control */
export interface AnthropicSystemTextBlock {
  readonly type: 'text';
  readonly text: string;
  readonly cache_control?: { readonly type: 'ephemeral' };
}

/** Anthropic system 字段类型 — string 或 TextBlockParam[] */
export type AnthropicSystemField = string | readonly AnthropicSystemTextBlock[];

/** Anthropic 消息请求体 */
export interface AnthropicRequestBody {
  /** 模型名称 */
  readonly model: string;
  /** 最大输出 token 数 */
  readonly max_tokens: number;
  /** 是否流式响应 */
  readonly stream: true;
  /** 系统提示（顶层字段 — string 或 TextBlockParam[]） */
  readonly system?: AnthropicSystemField;
  /** 消息列表 */
  readonly messages: readonly AnthropicMessage[];
  /** 工具定义列表 */
  readonly tools?: readonly AnthropicToolDef[];
  /** 思考模式配置 */
  readonly thinking?: AnthropicThinkingConfig;
}

/** Anthropic 消息格式 */
export interface AnthropicMessage {
  /** 角色 */
  readonly role: 'user' | 'assistant';
  /** 内容（字符串或内容块数组） */
  readonly content: string | readonly AnthropicContentBlock[];
}

/** Anthropic 内容块 */
export type AnthropicContentBlock =
  | AnthropicTextBlock
  | AnthropicToolUseBlock
  | AnthropicToolResultBlock;

/** 文本内容块 */
export interface AnthropicTextBlock {
  readonly type: 'text';
  readonly text: string;
}

/** 工具调用内容块 */
export interface AnthropicToolUseBlock {
  readonly type: 'tool_use';
  readonly id: string;
  readonly name: string;
  readonly input: Record<string, unknown>;
}

/** 工具结果内容块 */
export interface AnthropicToolResultBlock {
  readonly type: 'tool_result';
  readonly tool_use_id: string;
  readonly content: string;
  readonly is_error?: boolean;
}

/** Anthropic 工具定义格式 */
export interface AnthropicToolDef {
  readonly name: string;
  readonly description: string;
  readonly input_schema: Record<string, unknown>;
}

/** Anthropic SSE 事件类型 */
export type AnthropicSSEEventType =
  | 'message_start'
  | 'content_block_start'
  | 'content_block_delta'
  | 'content_block_stop'
  | 'message_delta'
  | 'message_stop'
  | 'ping'
  | 'error';

/** Anthropic message_start 事件中的 usage（完整） */
export interface AnthropicMessageStartUsage {
  readonly input_tokens: number;
  readonly output_tokens: number;
  readonly cache_creation_input_tokens?: number;
  readonly cache_read_input_tokens?: number;
  readonly cache_creation?: {
    readonly ephemeral_1h_input_tokens?: number;
    readonly ephemeral_5m_input_tokens?: number;
  };
  readonly service_tier?: string;
}

/** Anthropic message_delta 事件中的 usage（增量 output_tokens） */
export interface AnthropicMessageDeltaUsage {
  readonly output_tokens: number;
}

/** Anthropic SSE 事件数据 */
export interface AnthropicSSEEventData {
  readonly type: AnthropicSSEEventType;
  readonly index?: number;
  readonly content_block?: AnthropicContentBlock;
  readonly delta?: AnthropicContentDelta | AnthropicMessageDelta;
  readonly message?: {
    readonly id: string;
    readonly type: string;
    readonly role: string;
    readonly content: readonly AnthropicContentBlock[];
    readonly model: string;
    readonly stop_reason?: string | null;
    readonly stop_sequence?: string | null;
    readonly usage: AnthropicMessageStartUsage;
  };
  readonly stop_reason?: string;
  readonly usage?: AnthropicMessageDeltaUsage;
  readonly error?: { readonly type: string; readonly message: string };
}

/** Anthropic 内容增量 */
export type AnthropicContentDelta =
  | { readonly type: 'text_delta'; readonly text: string }
  | { readonly type: 'thinking_delta'; readonly thinking: string }
  | { readonly type: 'input_json_delta'; readonly partial_json: string };

/** Anthropic 消息增量（message_delta 事件中的 delta） */
export interface AnthropicMessageDelta {
  readonly stop_reason?: string;
  readonly stop_sequence?: string | null;
}

/** Anthropic API 错误响应 */
export interface AnthropicErrorResponse {
  readonly type: 'error';
  readonly error: {
    readonly type: string;
    readonly message: string;
  };
}

/** 默认 Anthropic API 版本 */
export const DEFAULT_ANTHROPIC_API_VERSION = '2023-06-01';

/** 默认最大输出 token 数 */
export const DEFAULT_ANTHROPIC_MAX_TOKENS = 4096;
