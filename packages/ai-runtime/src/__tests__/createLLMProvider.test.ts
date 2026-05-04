/** createLLMProvider 工厂函数测试 */

import { describe, expect, it } from 'vitest';
import { AnthropicAdapter, OpenAIAdapter } from '@suga/ai-tool-adapter';
import { createLLMProvider } from '../factory/createLLMProvider';
import type { AnthropicProviderInput, OpenAIProviderInput } from '../factory/createLLMProvider';

describe('createLLMProvider', () => {
  it('type=anthropic → AnthropicAdapter', () => {
    const input: AnthropicProviderInput = {
      type: 'anthropic',
      apiKey: 'sk-ant-xxx',
      model: 'claude-sonnet-4-20250514'
    };

    const provider = createLLMProvider(input);
    expect(provider).toBeInstanceOf(AnthropicAdapter);
  });

  it('type=openai → OpenAIAdapter', () => {
    const input: OpenAIProviderInput = {
      type: 'openai',
      apiKey: 'sk-xxx',
      model: 'gpt-4o'
    };

    const provider = createLLMProvider(input);
    expect(provider).toBeInstanceOf(OpenAIAdapter);
  });

  it('anthropic 默认 baseURL → https://api.anthropic.com', () => {
    const input: AnthropicProviderInput = {
      type: 'anthropic',
      apiKey: 'sk-ant-xxx',
      model: 'claude-sonnet-4-20250514'
    };

    const provider = createLLMProvider(input) as AnthropicAdapter;
    // AnthropicAdapter 内部 config.baseURL 应使用默认值
    expect((provider as any).config.baseURL).toBe('https://api.anthropic.com');
  });

  it('anthropic 自定义 baseURL → 传入值', () => {
    const input: AnthropicProviderInput = {
      type: 'anthropic',
      apiKey: 'sk-ant-xxx',
      model: 'claude-sonnet-4-20250514',
      baseURL: 'https://my-proxy.local'
    };

    const provider = createLLMProvider(input) as AnthropicAdapter;
    expect((provider as any).config.baseURL).toBe('https://my-proxy.local');
  });

  it('openai 默认 baseURL → https://api.openai.com/v1', () => {
    const input: OpenAIProviderInput = {
      type: 'openai',
      apiKey: 'sk-xxx',
      model: 'gpt-4o'
    };

    const provider = createLLMProvider(input) as OpenAIAdapter;
    expect((provider as any).config.baseURL).toBe('https://api.openai.com/v1');
  });

  it('openai 自定义 baseURL → 传入值', () => {
    const input: OpenAIProviderInput = {
      type: 'openai',
      apiKey: 'sk-xxx',
      model: 'gpt-4o',
      baseURL: 'https://my-proxy.local'
    };

    const provider = createLLMProvider(input) as OpenAIAdapter;
    expect((provider as any).config.baseURL).toBe('https://my-proxy.local');
  });

  it('anthropic 含 apiVersion + betaFeatures → 正确传入', () => {
    const input: AnthropicProviderInput = {
      type: 'anthropic',
      apiKey: 'sk-ant-xxx',
      model: 'claude-sonnet-4-20250514',
      apiVersion: '2024-01-01',
      betaFeatures: { promptCaching: true }
    };

    const provider = createLLMProvider(input) as AnthropicAdapter;
    expect((provider as any).anthropicConfig.apiVersion).toBe('2024-01-01');
    expect((provider as any).anthropicConfig.betaFeatures?.promptCaching).toBe(true);
  });

  it('openai 含 organization → 正确传入', () => {
    const input: OpenAIProviderInput = {
      type: 'openai',
      apiKey: 'sk-xxx',
      model: 'gpt-4o',
      organization: 'org-xxx'
    };

    const provider = createLLMProvider(input) as OpenAIAdapter;
    expect((provider as any).openaiConfig.organization).toBe('org-xxx');
  });

  it('LLMProvider 接口兼容 → 有 callModel + formatToolDefinition', () => {
    const anthropicProvider = createLLMProvider({
      type: 'anthropic',
      apiKey: 'sk-ant-xxx',
      model: 'claude-sonnet-4-20250514'
    });

    expect(typeof anthropicProvider.callModel).toBe('function');
    expect(typeof anthropicProvider.formatToolDefinition).toBe('function');

    const openaiProvider = createLLMProvider({
      type: 'openai',
      apiKey: 'sk-xxx',
      model: 'gpt-4o'
    });

    expect(typeof openaiProvider.callModel).toBe('function');
    expect(typeof openaiProvider.formatToolDefinition).toBe('function');
  });
});
