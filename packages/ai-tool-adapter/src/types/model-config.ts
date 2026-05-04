/** 模型配置抽象 — LLM Provider 通用的推理参数 */

/** 模型参数配置 — LLM Provider 通用的推理参数 */
export interface ModelConfig {
  /** 温度（0.0-1.0，越高越随机） */
  readonly temperature?: number;
  /** 顶部 P 概率截断（0.0-1.0） */
  readonly topP?: number;
  /** 顶部 K 概率截断 */
  readonly topK?: number;
  /** 停止序列 */
  readonly stopSequences?: readonly string[];
  /** 最大输出 token 数 */
  readonly maxTokens?: number;
  /** 思考模式配置 */
  readonly thinking?: ThinkingConfig;
}

/** 思考模式配置（Anthropic extended thinking） */
export type ThinkingConfig =
  | { readonly type: 'enabled'; readonly budget_tokens: number }
  | { readonly type: 'disabled' };

/** 模型标识 — 模型名称+可选版本 */
export interface ModelIdentifier {
  /** 模型名称（如 claude-sonnet-4-20250514） */
  readonly model: string;
  /** API 版本（Anthropic 特定） */
  readonly apiVersion?: string;
}

/** 默认模型配置 */
export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  temperature: 0.0,
  maxTokens: 4096
};

/** 模型能力描述 — 不同模型的能力差异 */
export interface ModelCapability {
  /** 是否支持 extended thinking（Anthropic 特有） */
  readonly supportsThinking: boolean;
  /** 是否支持多模态图片输入 */
  readonly supportsMultimodal: boolean;
  /** 是否支持 tool_use（函数调用） */
  readonly supportsToolUse: boolean;
  /** 是否支持 streaming */
  readonly supportsStreaming: boolean;
  /** 是否支持 prompt caching */
  readonly supportsPromptCaching: boolean;
  /** 是否支持 JSON mode / structured output */
  readonly supportsStructuredOutput: boolean;
  /** 是否支持 reasoning_effort（OpenAI o1/o3 特有） */
  readonly supportsReasoningEffort: boolean;
  /** 最大 context window token 数 */
  readonly maxContextTokens: number;
  /** 最大输出 token 数 */
  readonly maxOutputTokens: number;
}

/** Anthropic Claude 系列默认能力 */
export const CLAUDE_MODEL_CAPABILITY: ModelCapability = {
  supportsThinking: true,
  supportsMultimodal: true,
  supportsToolUse: true,
  supportsStreaming: true,
  supportsPromptCaching: true,
  supportsStructuredOutput: false,
  supportsReasoningEffort: false,
  maxContextTokens: 200_000,
  maxOutputTokens: 8192
};

/** OpenAI GPT 系列默认能力 */
export const GPT_MODEL_CAPABILITY: ModelCapability = {
  supportsThinking: false,
  supportsMultimodal: true,
  supportsToolUse: true,
  supportsStreaming: true,
  supportsPromptCaching: false,
  supportsStructuredOutput: true,
  supportsReasoningEffort: false,
  maxContextTokens: 128_000,
  maxOutputTokens: 16_384
};

/** OpenAI o1/o3 系列能力 */
export const OPENAI_REASONING_MODEL_CAPABILITY: ModelCapability = {
  supportsThinking: false,
  supportsMultimodal: false,
  supportsToolUse: true,
  supportsStreaming: true,
  supportsPromptCaching: false,
  supportsStructuredOutput: true,
  supportsReasoningEffort: true,
  maxContextTokens: 200_000,
  maxOutputTokens: 100_000
};

/** 根据模型名称推断能力 */
export function inferModelCapability(modelName: string): ModelCapability {
  const lower = modelName.toLowerCase();

  // OpenAI o1/o3 系列
  if (lower.startsWith('o1') || lower.startsWith('o3')) {
    return OPENAI_REASONING_MODEL_CAPABILITY;
  }

  // OpenAI GPT 系列
  if (lower.startsWith('gpt')) {
    // GPT-4o 多模态能力更强
    if (lower.includes('4o') || lower.includes('4-turbo')) {
      return { ...GPT_MODEL_CAPABILITY, maxContextTokens: 128_000, maxOutputTokens: 16_384 };
    }
    return GPT_MODEL_CAPABILITY;
  }

  // Anthropic Claude 系列（默认）
  if (lower.startsWith('claude')) {
    // Claude 3 Opus 有更大的 context
    if (lower.includes('opus')) {
      return { ...CLAUDE_MODEL_CAPABILITY, maxContextTokens: 200_000 };
    }
    if (lower.includes('haiku')) {
      return { ...CLAUDE_MODEL_CAPABILITY, maxContextTokens: 200_000, maxOutputTokens: 4096 };
    }
    return CLAUDE_MODEL_CAPABILITY;
  }

  // 默认：最小能力集（安全 fallback）
  return {
    supportsThinking: false,
    supportsMultimodal: false,
    supportsToolUse: true,
    supportsStreaming: true,
    supportsPromptCaching: false,
    supportsStructuredOutput: false,
    supportsReasoningEffort: false,
    maxContextTokens: 32_000,
    maxOutputTokens: 4096
  };
}
