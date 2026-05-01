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
