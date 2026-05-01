/** 模型配置抽象类型测试 */

import { describe, expect, it } from 'vitest';
import type { ModelConfig, ModelIdentifier, ThinkingConfig } from '../types/model-config';
import { DEFAULT_MODEL_CONFIG } from '../types/model-config';

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
