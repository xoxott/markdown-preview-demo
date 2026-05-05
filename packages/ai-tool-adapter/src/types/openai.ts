/** OpenAI API 类型定义 — Chat Completion/SSE/Tool Call/Usage */

/** OpenAI 适配器配置 */
export interface OpenAIAdapterConfig {
  /** API 基础 URL（支持代理地址） */
  readonly baseURL: string;
  /** API 密钥 */
  readonly apiKey: string;
  /** 默认模型名称 */
  readonly model: string;
  /** 组织 ID */
  readonly organization?: string;
  /** 请求超时 ms（默认 60000） */
  readonly timeout?: number;
  /** 最大 token 数 */
  readonly maxTokens?: number;
  /** 自定义请求头 */
  readonly customHeaders?: Record<string, string>;
  /** 采样温度（0-2，越高越随机） */
  readonly temperature?: number;
  /** 顶部 P 采样（0-1，替代 temperature 的核采样方法） */
  readonly topP?: number;
  /** 频率惩罚（-2到2，降低重复词频） */
  readonly frequencyPenalty?: number;
  /** 存在惩罚（-2到2，鼓励新话题） */
  readonly presencePenalty?: number;
  /** 推理努力程度（o1/o3系列：low/medium/high） */
  readonly reasoningEffort?: 'low' | 'medium' | 'high';
  /** 响应格式（JSON mode 或 structured output） */
  readonly responseFormat?: OpenAIResponseFormat;
}

/** OpenAI 响应格式 */
export interface OpenAIResponseFormat {
  readonly type: 'text' | 'json_object' | 'json_schema';
  readonly json_schema?: {
    readonly name: string;
    readonly strict?: boolean;
    readonly schema: Record<string, unknown>;
  };
}

/** OpenAI Chat Completion 请求体 */
export interface OpenAIRequestBody {
  /** 模型名称 */
  readonly model: string;
  /** 消息列表 */
  readonly messages: readonly OpenAIMessage[];
  /** 工具定义列表 */
  readonly tools?: readonly OpenAIToolDef[];
  /** 是否流式响应 */
  readonly stream?: boolean;
  /** 温度 */
  readonly temperature?: number;
  /** 顶部 P */
  readonly top_p?: number;
  /** 最大输出 token 数 */
  readonly max_tokens?: number;
  /** 停止序列 */
  readonly stop?: readonly string[];
  /** 流式选项（include_usage=true 才在流式响应中返回用量） */
  readonly stream_options?: OpenAIStreamOptions;
  /** 频率惩罚 */
  readonly frequency_penalty?: number;
  /** 存在惩罚 */
  readonly presence_penalty?: number;
  /** 推理努力程度（o1/o3系列） */
  readonly reasoning_effort?: 'low' | 'medium' | 'high';
  /** 响应格式 */
  readonly response_format?: OpenAIResponseFormat;
}

/** OpenAI 流式选项 */
export interface OpenAIStreamOptions {
  /** 是否在流式响应中包含用量信息 */
  readonly include_usage: boolean;
}

/** OpenAI 消息格式联合类型 */
export type OpenAIMessage =
  | OpenAISystemMessage
  | OpenAIUserMessage
  | OpenAIAssistantMessage
  | OpenAIToolMessage;

/** OpenAI 系统消息 */
export interface OpenAISystemMessage {
  readonly role: 'system';
  readonly content: string;
}

/** OpenAI 用户消息 */
export interface OpenAIUserMessage {
  readonly role: 'user';
  readonly content: string | readonly OpenAIContentPart[];
}

/** OpenAI 助手消息 */
export interface OpenAIAssistantMessage {
  readonly role: 'assistant';
  readonly content?: string | null;
  readonly tool_calls?: readonly OpenAIToolCall[];
}

/** OpenAI 工具结果消息 */
export interface OpenAIToolMessage {
  readonly role: 'tool';
  readonly tool_call_id: string;
  readonly content: string;
}

/** OpenAI 内容部分联合类型 */
export type OpenAIContentPart = OpenAITextPart | OpenAIImagePart;

/** OpenAI 文本内容部分 */
export interface OpenAITextPart {
  readonly type: 'text';
  readonly text: string;
}

/** OpenAI 图片内容部分 */
export interface OpenAIImagePart {
  readonly type: 'image_url';
  readonly image_url: { readonly url: string };
}

/** OpenAI 工具调用 */
export interface OpenAIToolCall {
  readonly id: string;
  readonly type: 'function';
  readonly function: { readonly name: string; readonly arguments: string };
}

/** OpenAI 工具定义 */
export interface OpenAIToolDef {
  readonly type: 'function';
  readonly function: {
    readonly name: string;
    readonly description: string;
    readonly parameters: Record<string, unknown>;
  };
}

/** OpenAI SSE 事件数据 */
export interface OpenAISSEEventData {
  readonly id?: string;
  readonly object?: string;
  readonly created?: number;
  readonly model?: string;
  readonly choices?: readonly OpenAIChoiceDelta[];
  readonly usage?: OpenAIUsageInfo;
  readonly error?: { readonly message: string; readonly type: string; readonly code?: string };
}

/** OpenAI SSE 选择增量 */
export interface OpenAIChoiceDelta {
  readonly index: number;
  readonly delta?: {
    readonly role?: string;
    readonly content?: string;
    readonly tool_calls?: readonly OpenAIToolCallDelta[];
  };
  readonly finish_reason?: string | null;
}

/** OpenAI 工具调用增量 */
export interface OpenAIToolCallDelta {
  readonly index: number;
  readonly id?: string;
  readonly type?: 'function';
  readonly function?: { readonly name?: string; readonly arguments?: string };
}

/** OpenAI 用量信息 */
export interface OpenAIUsageInfo {
  readonly prompt_tokens: number;
  readonly completion_tokens: number;
  readonly total_tokens: number;
  readonly prompt_tokens_details?: { readonly cached_tokens: number };
  readonly completion_tokens_details?: { readonly reasoning_tokens: number };
}

/** OpenAI API 错误响应 */
export interface OpenAIErrorResponse {
  readonly error: {
    readonly message: string;
    readonly type: string;
    readonly code?: string;
  };
}

/** 默认 OpenAI 超时 */
export const DEFAULT_OPENAI_TIMEOUT = 60_000;

/** 默认 OpenAI 最大输出 token 数 */
export const DEFAULT_OPENAI_MAX_TOKENS = 4096;

/** P87: OpenAI 非流式 Chat Completion 响应 */
export interface OpenAINonStreamResponse {
  readonly id: string;
  readonly object: 'chat.completion';
  readonly created: number;
  readonly model: string;
  readonly choices: readonly OpenAINonStreamChoice[];
  readonly usage: OpenAIUsageInfo;
}

/** OpenAI 非流式响应选择项 */
export interface OpenAINonStreamChoice {
  readonly index: number;
  readonly message: {
    readonly role: 'assistant';
    readonly content?: string | null;
    readonly tool_calls?: readonly OpenAIToolCall[];
  };
  readonly finish_reason: string | null;
}
