/** 模型配置抽象类型测试 */

import { describe, expect, it } from 'vitest';
import type { ModelConfig, ModelIdentifier, ThinkingConfig } from '../types/model-config';
import {
  CLAUDE_MODEL_CAPABILITY,
  DEFAULT_MODEL_CONFIG,
  GPT_MODEL_CAPABILITY,
  OPENAI_REASONING_MODEL_CAPABILITY,
  inferModelCapability
} from '../types/model-config';

// ============================================================
// P85: ModelCapability + inferModelCapability 测试
// ============================================================

describe('ModelConfig', () => {
  it('默认配置 → temperature=0 + maxTokens=4096', () => {
    expect(DEFAULT_MODEL_CONFIG.temperature).toBe(0.0);
    expect(DEFAULT_MODEL_CONFIG.maxTokens).toBe(4096);
  });

  it('ModelConfig 可扩展 — 温度+topP+stopSequences', () => {
    const config: ModelConfig = {
      temperature: 0.7,
      topP: 0.9,
      stopSequences: ['\n\n'],
      maxTokens: 8192
    };
    expect(config.temperature).toBe(0.7);
    expect(config.topP).toBe(0.9);
    expect(config.stopSequences).toEqual(['\n\n']);
    expect(config.maxTokens).toBe(8192);
  });

  it('ThinkingConfig enabled → budget_tokens', () => {
    const thinking: ThinkingConfig = { type: 'enabled', budget_tokens: 10000 };
    expect(thinking.type).toBe('enabled');
    expect(thinking.budget_tokens).toBe(10000);
  });

  it('ThinkingConfig disabled → 无 budget', () => {
    const thinking: ThinkingConfig = { type: 'disabled' };
    expect(thinking.type).toBe('disabled');
  });

  it('ModelIdentifier — model + apiVersion', () => {
    const id: ModelIdentifier = {
      model: 'claude-sonnet-4-20250514',
      apiVersion: '2023-06-01'
    };
    expect(id.model).toBe('claude-sonnet-4-20250514');
    expect(id.apiVersion).toBe('2023-06-01');
  });

  it('ModelIdentifier — 仅 model', () => {
    const id: ModelIdentifier = { model: 'gpt-4o' };
    expect(id.model).toBe('gpt-4o');
    expect(id.apiVersion).toBeUndefined();
  });

  it('ModelConfig — 最小配置（仅 maxTokens）', () => {
    const config: ModelConfig = { maxTokens: 2048 };
    expect(config.maxTokens).toBe(2048);
    expect(config.temperature).toBeUndefined();
  });

  it('ModelConfig — topK 配置', () => {
    const config: ModelConfig = { topK: 40 };
    expect(config.topK).toBe(40);
  });
});

describe('ModelCapability', () => {
  it('CLAUDE_MODEL_CAPABILITY — 支持 thinking + prompt caching', () => {
    expect(CLAUDE_MODEL_CAPABILITY.supportsThinking).toBe(true);
    expect(CLAUDE_MODEL_CAPABILITY.supportsPromptCaching).toBe(true);
    expect(CLAUDE_MODEL_CAPABILITY.supportsMultimodal).toBe(true);
    expect(CLAUDE_MODEL_CAPABILITY.supportsToolUse).toBe(true);
    expect(CLAUDE_MODEL_CAPABILITY.supportsStructuredOutput).toBe(false);
    expect(CLAUDE_MODEL_CAPABILITY.maxContextTokens).toBe(200_000);
  });

  it('GPT_MODEL_CAPABILITY — 支持 structured output + 不支持 thinking', () => {
    expect(GPT_MODEL_CAPABILITY.supportsThinking).toBe(false);
    expect(GPT_MODEL_CAPABILITY.supportsStructuredOutput).toBe(true);
    expect(GPT_MODEL_CAPABILITY.supportsMultimodal).toBe(true);
    expect(GPT_MODEL_CAPABILITY.supportsPromptCaching).toBe(false);
  });

  it('OPENAI_REASONING_MODEL_CAPABILITY — 支持 reasoning_effort', () => {
    expect(OPENAI_REASONING_MODEL_CAPABILITY.supportsReasoningEffort).toBe(true);
    expect(OPENAI_REASONING_MODEL_CAPABILITY.supportsMultimodal).toBe(false);
    expect(OPENAI_REASONING_MODEL_CAPABILITY.maxOutputTokens).toBe(100_000);
  });
});

describe('inferModelCapability', () => {
  it('claude-sonnet-4 → Claude 系列能力', () => {
    const cap = inferModelCapability('claude-sonnet-4-20250514');
    expect(cap.supportsThinking).toBe(true);
    expect(cap.supportsPromptCaching).toBe(true);
    expect(cap.supportsToolUse).toBe(true);
  });

  it('claude-3-opus → Claude 系列大 context', () => {
    const cap = inferModelCapability('claude-3-opus-20240229');
    expect(cap.supportsThinking).toBe(true);
    expect(cap.maxContextTokens).toBe(200_000);
  });

  it('claude-haiku → 小 output tokens', () => {
    const cap = inferModelCapability('claude-3-haiku-20240307');
    expect(cap.supportsThinking).toBe(true);
    expect(cap.maxOutputTokens).toBe(4096);
  });

  it('gpt-4o → GPT 系列能力', () => {
    const cap = inferModelCapability('gpt-4o');
    expect(cap.supportsThinking).toBe(false);
    expect(cap.supportsStructuredOutput).toBe(true);
    expect(cap.supportsMultimodal).toBe(true);
  });

  it('gpt-4o-2024-05-13 → GPT 系列能力（前缀匹配）', () => {
    const cap = inferModelCapability('gpt-4o-2024-05-13');
    expect(cap.supportsThinking).toBe(false);
    expect(cap.supportsStructuredOutput).toBe(true);
  });

  it('o1-preview → OpenAI reasoning 能力', () => {
    const cap = inferModelCapability('o1-preview');
    expect(cap.supportsReasoningEffort).toBe(true);
    expect(cap.supportsMultimodal).toBe(false);
  });

  it('o3-mini → OpenAI reasoning 能力', () => {
    const cap = inferModelCapability('o3-mini');
    expect(cap.supportsReasoningEffort).toBe(true);
  });

  it('未知模型 → 最小能力集（安全 fallback）', () => {
    const cap = inferModelCapability('unknown-model-v1');
    expect(cap.supportsThinking).toBe(false);
    expect(cap.supportsMultimodal).toBe(false);
    expect(cap.supportsToolUse).toBe(true);
    expect(cap.maxContextTokens).toBe(32_000);
  });

  it('大小写不敏感', () => {
    const cap = inferModelCapability('CLAUDE-3-OPUS');
    expect(cap.supportsThinking).toBe(true);
    const cap2 = inferModelCapability('GPT-4O');
    expect(cap2.supportsStructuredOutput).toBe(true);
  });
});
