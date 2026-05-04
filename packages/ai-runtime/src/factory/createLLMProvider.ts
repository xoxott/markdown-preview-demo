/** createLLMProvider — LLM Provider 工厂函数，根据配置自动创建适配器实例 */

import type { LLMProvider } from '@suga/ai-agent-loop';
import { AnthropicAdapter } from '@suga/ai-tool-adapter';
import type { AnthropicAdapterConfig } from '@suga/ai-tool-adapter';
import { OpenAIAdapter } from '@suga/ai-tool-adapter';
import type { OpenAIAdapterConfig } from '@suga/ai-tool-adapter';

/** LLM Provider 类型标识 */
export type LLMProviderType = 'anthropic' | 'openai';

/** Anthropic Provider 配置（映射到 AnthropicAdapterConfig） */
export interface AnthropicProviderInput {
  readonly type: 'anthropic';
  readonly baseURL?: string;
  readonly apiKey: string;
  readonly model: string;
  readonly apiVersion?: string;
  readonly system?: string;
  readonly timeout?: number;
  readonly maxTokens?: number;
  readonly customHeaders?: Record<string, string>;
  readonly thinking?: AnthropicAdapterConfig['thinking'];
  readonly betaFeatures?: AnthropicAdapterConfig['betaFeatures'];
}

/** OpenAI Provider 配置（映射到 OpenAIAdapterConfig） */
export interface OpenAIProviderInput {
  readonly type: 'openai';
  readonly baseURL?: string;
  readonly apiKey: string;
  readonly model: string;
  readonly organization?: string;
  readonly timeout?: number;
  readonly maxTokens?: number;
  readonly customHeaders?: Record<string, string>;
  readonly temperature?: number;
  readonly topP?: number;
  readonly frequencyPenalty?: number;
  readonly presencePenalty?: number;
}

/** LLM Provider 输入联合类型 */
export type LLMProviderInput = AnthropicProviderInput | OpenAIProviderInput;

/** 默认 Anthropic API 基础 URL */
const DEFAULT_ANTHROPIC_BASE_URL = 'https://api.anthropic.com';

/** 默认 OpenAI API 基础 URL */
const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1';

/**
 * 根据 Provider 配置创建 LLMProvider 实例
 *
 * 工厂函数根据 `type` 字段自动选择适配器：
 *
 * - `type: 'anthropic'` → AnthropicAdapter（Claude 系列）
 * - `type: 'openai'` → OpenAIAdapter（GPT/o1/o3 系列）
 *
 * 自动填充默认 baseURL：
 *
 * - Anthropic: https://api.anthropic.com
 * - OpenAI: https://api.openai.com/v1
 *
 * @param input Provider 配置
 * @returns LLMProvider 实例
 */
export function createLLMProvider(input: LLMProviderInput): LLMProvider {
  switch (input.type) {
    case 'anthropic': {
      const config: AnthropicAdapterConfig = {
        baseURL: input.baseURL ?? DEFAULT_ANTHROPIC_BASE_URL,
        apiKey: input.apiKey,
        model: input.model,
        apiVersion: input.apiVersion,
        system: input.system,
        timeout: input.timeout,
        maxTokens: input.maxTokens,
        customHeaders: input.customHeaders,
        thinking: input.thinking,
        betaFeatures: input.betaFeatures
      };
      return new AnthropicAdapter(config);
    }

    case 'openai': {
      const config: OpenAIAdapterConfig = {
        baseURL: input.baseURL ?? DEFAULT_OPENAI_BASE_URL,
        apiKey: input.apiKey,
        model: input.model,
        organization: input.organization,
        timeout: input.timeout,
        maxTokens: input.maxTokens,
        customHeaders: input.customHeaders
      };
      return new OpenAIAdapter(config);
    }

    default: {
      const exhaustive: never = input;
      throw new Error(`未知的 LLM Provider 类型: ${exhaustive}`);
    }
  }
}