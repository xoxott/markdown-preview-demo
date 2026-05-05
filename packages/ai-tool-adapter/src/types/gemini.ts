/** Google Gemini API 类型定义 — generateContent/streamGenerateContent/functionCall */

/** Gemini 适配器配置 */
export interface GeminiAdapterConfig {
  /** API 密钥（通过 URL 参数 key= 传递，而非 header） */
  readonly apiKey: string;
  /** 默认模型名称（如 gemini-2.0-flash, gemini-1.5-pro） */
  readonly model: string;
  /** API 版本路径（默认 v1beta） */
  readonly apiVersion?: string;
  /** 自定义基础 URL（默认 https://generativelanguage.googleapis.com） */
  readonly baseURL?: string;
  /** 请求超时 ms（默认 60000） */
  readonly timeout?: number;
  /** 最大输出 token 数 */
  readonly maxTokens?: number;
  /** 自定义请求头 */
  readonly customHeaders?: Record<string, string>;
  /** 采样温度（0-2） */
  readonly temperature?: number;
  /** 顶部 P 采样（0-1） */
  readonly topP?: number;
  /** 顶部 K 采样 */
  readonly topK?: number;
  /** 停止序列 */
  readonly stopSequences?: readonly string[];
  /** 响应 MIME 类型 */
  readonly responseMimeType?: string;
}

/** Gemini 请求体 */
export interface GeminiRequestBody {
  /** 消息内容列表 */
  readonly contents: readonly GeminiContent[];
  /** 工具声明列表 */
  readonly tools?: readonly GeminiTool[];
  /** 系统指令 */
  readonly systemInstruction?: GeminiSystemInstruction;
  /** 生成配置 */
  readonly generationConfig?: GeminiGenerationConfig;
}

/** Gemini 系统指令 */
export interface GeminiSystemInstruction {
  readonly parts: readonly GeminiPart[];
}

/** Gemini 生成配置 */
export interface GeminiGenerationConfig {
  /** 采样温度 */
  readonly temperature?: number;
  /** 顶部 P */
  readonly topP?: number;
  /** 顶部 K */
  readonly topK?: number;
  /** 最大输出 token 数 */
  readonly maxOutputTokens?: number;
  /** 停止序列 */
  readonly stopSequences?: readonly string[];
  /** 响应 MIME 类型 */
  readonly responseMimeType?: string;
}

/** Gemini 消息内容 */
export interface GeminiContent {
  /** 角色：user 或 model（Gemini 用 model 而非 assistant） */
  readonly role: 'user' | 'model' | 'function';
  /** 内容部分列表 */
  readonly parts: readonly GeminiPart[];
}

/** Gemini 内容部分联合类型 */
export type GeminiPart = GeminiTextPart | GeminiFunctionCallPart | GeminiFunctionResponsePart;

/** Gemini 文本部分 */
export interface GeminiTextPart {
  readonly text: string;
}

/** Gemini 函数调用部分 */
export interface GeminiFunctionCallPart {
  readonly functionCall: GeminiFunctionCall;
}

/** Gemini 函数调用 */
export interface GeminiFunctionCall {
  readonly name: string;
  readonly args: Record<string, unknown>;
}

/** Gemini 函数响应部分 */
export interface GeminiFunctionResponsePart {
  readonly functionResponse: GeminiFunctionResponse;
}

/** Gemini 函数响应 */
export interface GeminiFunctionResponse {
  readonly name: string;
  readonly response: Record<string, unknown>;
}

/** Gemini 工具定义 */
export interface GeminiTool {
  /** 函数声明列表 */
  readonly functionDeclarations: readonly GeminiFunctionDeclaration[];
}

/** Gemini 函数声明 */
export interface GeminiFunctionDeclaration {
  /** 函数名称 */
  readonly name: string;
  /** 函数描述 */
  readonly description: string;
  /** 参数 JSON Schema */
  readonly parameters?: Record<string, unknown>;
}

/** Gemini SSE 流式响应 */
export interface GeminiStreamResponse {
  /** 响应候选列表 */
  readonly candidates?: readonly GeminiCandidate[];
  /** 用量元数据 */
  readonly usageMetadata?: GeminiUsageMetadata;
  /** 模型版本 */
  readonly modelVersion?: string;
}

/** Gemini 响应候选 */
export interface GeminiCandidate {
  /** 内容 */
  readonly content?: GeminiContent;
  /** 完成原因 */
  readonly finishReason?: string;
  /** 索引 */
  readonly index?: number;
  /** 安全评级 */
  readonly safetyRatings?: readonly GeminiSafetyRating[];
}

/** Gemini 安全评级 */
export interface GeminiSafetyRating {
  readonly category: string;
  readonly probability: string;
}

/** Gemini 用量元数据 */
export interface GeminiUsageMetadata {
  readonly promptTokenCount: number;
  readonly candidatesTokenCount: number;
  readonly totalTokenCount: number;
  readonly cachedContentTokenCount?: number;
}

/** Gemini 非流式响应 */
export interface GeminiNonStreamResponse {
  readonly candidates?: readonly GeminiCandidate[];
  readonly usageMetadata?: GeminiUsageMetadata;
  readonly modelVersion?: string;
}

/** Gemini API 错误响应 */
export interface GeminiErrorResponse {
  readonly error: {
    readonly code: number;
    readonly message: string;
    readonly status: string;
  };
}

/** 默认 Gemini API 版本路径 */
export const DEFAULT_GEMINI_API_VERSION = 'v1beta';

/** 默认 Gemini 基础 URL */
export const DEFAULT_GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com';

/** 默认 Gemini 最大输出 token 数 */
export const DEFAULT_GEMINI_MAX_TOKENS = 8192;
