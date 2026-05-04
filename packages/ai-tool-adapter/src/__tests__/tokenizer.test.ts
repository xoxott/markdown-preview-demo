/** P83 测试 — TokenizerProvider 接口 + EstimateTokenizer + TokenizerRegistry */

import { describe, expect, it } from 'vitest';
import type { AgentMessage } from '@suga/ai-agent-loop';
import type { TokenizerProvider } from '../tokenizer/types';
import { EstimateTokenizer } from '../tokenizer/EstimateTokenizer';
import { TokenizerRegistryImpl } from '../tokenizer/TokenizerRegistryImpl';
import { createTokenEstimatorFromTokenizer } from '../tokenizer/adapter';

/** 辅助：创建用户消息 */
function createUserMsg(content: string): AgentMessage {
  return { id: 'u1', role: 'user', content, timestamp: Date.now() };
}

/** 辅助：创建助手消息 */
function createAssistantMsg(content: string, toolUses?: any[]): AgentMessage {
  return {
    id: 'a1',
    role: 'assistant',
    content,
    toolUses: toolUses ?? [],
    timestamp: Date.now()
  };
}

/** 辅助：创建工具结果消息 */
function createToolResultMsg(toolUseId: string, result: unknown, isSuccess: boolean): AgentMessage {
  return {
    id: 'r1',
    role: 'tool_result',
    toolUseId,
    toolName: 'calc',
    result: isSuccess ? result : undefined,
    error: isSuccess ? undefined : '执行失败',
    isSuccess,
    timestamp: Date.now()
  };
}

// ============================================================
// EstimateTokenizer 测试
// ============================================================

describe('EstimateTokenizer', () => {
  const tokenizer = new EstimateTokenizer();

  it('countTokens — 纯文本估算', () => {
    const tokens = tokenizer.countTokens('hello world');
    expect(tokens).toBeGreaterThan(0);
    // 11 chars / 4 ratio ≈ 3 tokens
    expect(tokens).toBeLessThanOrEqual(5);
  });

  it('countTokens — JSON 内容估算（更密集）', () => {
    const text = '{"key": "value"}';
    const tokens = tokenizer.countTokens(text);
    expect(tokens).toBeGreaterThan(0);
    // JSON ratio 2 → 更高 token 数
    const plainTokens = tokenizer.countTokens('plain text same length');
    expect(tokens).toBeGreaterThanOrEqual(plainTokens);
  });

  it('modelName — 默认为 "default"', () => {
    expect(tokenizer.modelName).toBe('default');
  });

  it('modelName — 自定义模型名称', () => {
    const customTokenizer = new EstimateTokenizer('claude-3-opus');
    expect(customTokenizer.modelName).toBe('claude-3-opus');
  });

  it('countMessageTokens — 单条用户消息', () => {
    const messages = [createUserMsg('hello')];
    const tokens = tokenizer.countMessageTokens(messages);
    expect(tokens).toBeGreaterThan(0);
    // 包含 role overhead + content + conservative padding
    expect(tokens).toBeGreaterThanOrEqual(5);
  });

  it('countMessageTokens — 多条消息序列', () => {
    const messages = [
      createUserMsg('计算 1+2'),
      createAssistantMsg('1+2=3'),
      createToolResultMsg('c1', 3, true)
    ];
    const tokens = tokenizer.countMessageTokens(messages);
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBeGreaterThan(tokenizer.countMessageTokens([createUserMsg('hello')]));
  });

  it('countMessageTokens — 工具调用消息开销', () => {
    const plain = tokenizer.countMessageTokens([createAssistantMsg('结果')]);
    const withToolUse = tokenizer.countMessageTokens([
      createAssistantMsg('计算中', [{ id: 'c1', name: 'calc', input: { a: 1, b: 2 } }])
    ]);
    // 含 tool_use 的消息应该更高（含 toolUseOverhead: 50）
    expect(withToolUse).toBeGreaterThan(plain);
  });

  it('countMessageTokens — 多模态用户消息', () => {
    const plain = tokenizer.countMessageTokens([createUserMsg('这张图片是什么？')]);
    const multimodal = tokenizer.countMessageTokens([
      {
        id: 'u1',
        role: 'user',
        content: [
          { type: 'text', text: '这张图片是什么？' },
          { type: 'image', source: 'https://example.com/img.png', mediaType: 'image/png' }
        ],
        timestamp: Date.now()
      }
    ]);
    // 多模态含图片估算 ≈ +2000 tokens
    expect(multimodal).toBeGreaterThan(plain);
    expect(multimodal).toBeGreaterThanOrEqual(2000);
  });

  it('自定义比率配置', () => {
    const customTokenizer = new EstimateTokenizer('custom', {
      textRatio: 3,
      jsonRatio: 1.5,
      roleOverhead: 6
    });
    const tokens = customTokenizer.countTokens('hello world');
    // 11 chars / 3 ratio ≈ 4 tokens
    expect(tokens).toBe(4);
  });
});

// ============================================================
// TokenizerRegistryImpl 测试
// ============================================================

describe('TokenizerRegistryImpl', () => {
  const registry = new TokenizerRegistryImpl();

  it('初始状态 → resolve 返回默认估算 tokenizer', () => {
    const tokenizer = registry.resolve('any-model');
    expect(tokenizer.modelName).toBe('default');
    expect(tokenizer).toBeInstanceOf(EstimateTokenizer);
  });

  it('register + resolve → 精确匹配', () => {
    const mockTokenizer: TokenizerProvider = {
      modelName: 'gpt-4o',
      countTokens: (text: string) => text.length,
      countMessageTokens: (msgs: readonly AgentMessage[]) => msgs.length * 10
    };
    registry.register('gpt-4o', mockTokenizer);
    expect(registry.resolve('gpt-4o')).toBe(mockTokenizer);
    expect(registry.has('gpt-4o')).toBe(true);
  });

  it('前缀匹配 → gpt-4o-2024-05-13 → gpt-4o', () => {
    const gpt4oTokenizer: TokenizerProvider = {
      modelName: 'gpt-4o',
      countTokens: (text: string) => text.length,
      countMessageTokens: (msgs: readonly AgentMessage[]) => msgs.length * 10
    };
    const registry2 = new TokenizerRegistryImpl();
    registry2.register('gpt-4o', gpt4oTokenizer);
    expect(registry2.resolve('gpt-4o-2024-05-13')).toBe(gpt4oTokenizer);
  });

  it('未注册 → fallback 到默认估算', () => {
    const registry3 = new TokenizerRegistryImpl();
    expect(registry3.resolve('unknown-model')).toBeInstanceOf(EstimateTokenizer);
    expect(registry3.has('unknown-model')).toBe(false);
  });

  it('自定义 fallback tokenizer', () => {
    const customFallback: TokenizerProvider = {
      modelName: 'claude-3-opus',
      countTokens: (text: string) => Math.ceil(text.length / 3),
      countMessageTokens: (msgs: readonly AgentMessage[]) => msgs.length * 8
    };
    const registry4 = new TokenizerRegistryImpl(customFallback);
    expect(registry4.resolve('unknown-model')).toBe(customFallback);
  });

  it('精确匹配优先于前缀匹配', () => {
    const gpt4Tokenizer: TokenizerProvider = {
      modelName: 'gpt-4',
      countTokens: () => 100,
      countMessageTokens: () => 500
    };
    const gptTokenizer: TokenizerProvider = {
      modelName: 'gpt',
      countTokens: () => 200,
      countMessageTokens: () => 1000
    };
    const registry5 = new TokenizerRegistryImpl();
    registry5.register('gpt', gptTokenizer);
    registry5.register('gpt-4', gpt4Tokenizer);
    // 精确匹配 gpt-4 → gpt4Tokenizer（而非前缀 gpt）
    expect(registry5.resolve('gpt-4')).toBe(gpt4Tokenizer);
  });
});

// ============================================================
// createTokenEstimatorFromTokenizer 适配器测试
// ============================================================

describe('createTokenEstimatorFromTokenizer', () => {
  it('适配器 → 将 TokenizerProvider 转为 TokenEstimator 函数', () => {
    const tokenizer = new EstimateTokenizer('test-model');
    const estimator = createTokenEstimatorFromTokenizer(tokenizer);

    const messages = [createUserMsg('hello world')];
    const result = estimator(messages);

    // 应返回与 tokenizer.countMessageTokens 一致的值
    expect(result).toBe(tokenizer.countMessageTokens(messages));
  });

  it('适配器 → 自定义 TokenizerProvider 正确适配', () => {
    const customTokenizer: TokenizerProvider = {
      modelName: 'mock',
      countTokens: text => text.length,
      countMessageTokens: msgs => msgs.length * 42
    };
    const estimator = createTokenEstimatorFromTokenizer(customTokenizer);

    const messages = [createUserMsg('a'), createAssistantMsg('b')];
    expect(estimator(messages)).toBe(2 * 42);
  });
});
