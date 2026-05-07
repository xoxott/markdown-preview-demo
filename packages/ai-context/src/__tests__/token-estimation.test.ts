import { describe, expect, it } from 'vitest';
import {
  estimateMessageTokens,
  estimateTokensCharRatio,
  estimateTokensClaudeSpecific
} from '../core/token-estimation';

describe('estimateTokensCharRatio', () => {
  it('estimates tokens from text length', () => {
    const result = estimateTokensCharRatio('hello world');
    expect(result.estimatedTokens).toBeGreaterThan(0);
    expect(result.strategy).toBe('char_ratio');
    expect(result.confidence).toBe('low');
  });

  it('empty string → 0 tokens', () => {
    expect(estimateTokensCharRatio('').estimatedTokens).toBe(0);
  });

  it('long text → reasonable estimate', () => {
    const longText = 'a'.repeat(4000);
    expect(estimateTokensCharRatio(longText).estimatedTokens).toBeLessThanOrEqual(1001);
  });
});

describe('estimateTokensClaudeSpecific', () => {
  it('handles English text', () => {
    const result = estimateTokensClaudeSpecific('This is English text.');
    expect(result.estimatedTokens).toBeGreaterThan(0);
    expect(result.confidence).toBe('medium');
  });

  it('handles CJK text with higher ratio', () => {
    const result = estimateTokensClaudeSpecific('中文测试内容');
    expect(result.estimatedTokens).toBeGreaterThan(3);
  });

  it('handles mixed text', () => {
    const result = estimateTokensClaudeSpecific('Hello 中文 mixed');
    expect(result.estimatedTokens).toBeGreaterThan(5);
  });

  it('empty string → overhead only', () => {
    const result = estimateTokensClaudeSpecific('');
    expect(result.estimatedTokens).toBeGreaterThan(0); // overhead
  });
});

describe('estimateMessageTokens', () => {
  it('string content', () => {
    const tokens = estimateMessageTokens({ role: 'user', content: 'hello' });
    expect(tokens).toBeGreaterThan(5); // content + overhead
  });

  it('array content with text blocks', () => {
    const tokens = estimateMessageTokens({
      role: 'assistant',
      content: [{ type: 'text', text: 'response' }]
    });
    expect(tokens).toBeGreaterThan(5);
  });

  it('includes message overhead', () => {
    const tokens1 = estimateMessageTokens({ role: 'user', content: 'hello' });
    const tokens2 = estimateMessageTokens({
      role: 'user',
      content: 'hello world extended text here'
    });
    expect(tokens2).toBeGreaterThan(tokens1);
  });
});
