/** 基础 LLM 适配器配置类型 */

/** 基础 LLM 适配器配置 */
export interface BaseLLMAdapterConfig {
  /** API 基础 URL（支持代理地址） */
  readonly baseURL: string;
  /** API 密钥 */
  readonly apiKey: string;
  /** 默认模型名称 */
  readonly model: string;
  /** 请求超时 ms（默认 60000） */
  readonly timeout?: number;
  /** 自定义请求头（代理认证等） */
  readonly customHeaders?: Record<string, string>;
  /** 最大 token 数 */
  readonly maxTokens?: number;
}

/** 默认适配器配置常量 */
export const DEFAULT_ADAPTER_TIMEOUT = 60_000;
export const DEFAULT_ADAPTER_MAX_TOKENS = 4096;
