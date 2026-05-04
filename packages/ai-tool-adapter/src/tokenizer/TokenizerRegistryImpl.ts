/** Tokenizer 注册表实现 — 按模型名称查找对应的 tokenizer */

import type { TokenizerProvider, TokenizerRegistry } from './types';
import { EstimateTokenizer } from './EstimateTokenizer';

/** 默认估算 tokenizer */
const DEFAULT_TOKENIZER = new EstimateTokenizer('default');

/**
 * Tokenizer 注册表
 *
 * - 注册模型对应的 tokenizer（如 tiktoken for OpenAI, Anthropic tokenizer for Claude）
 * - 查找时精确匹配模型名；未注册则 fallback 到默认估算 tokenizer
 */
export class TokenizerRegistryImpl implements TokenizerRegistry {
  private readonly registry = new Map<string, TokenizerProvider>();
  private readonly fallback: TokenizerProvider;

  constructor(fallback?: TokenizerProvider) {
    this.fallback = fallback ?? DEFAULT_TOKENIZER;
  }

  register(modelName: string, tokenizer: TokenizerProvider): void {
    this.registry.set(modelName, tokenizer);
  }

  resolve(modelName: string): TokenizerProvider {
    // 精确匹配
    const exact = this.registry.get(modelName);
    if (exact) return exact;

    // 前缀匹配（如 "gpt-4o-2024-05-13" → "gpt-4o"）
    for (const [key, tokenizer] of this.registry) {
      if (modelName.startsWith(key)) return tokenizer;
    }

    // fallback 到默认估算
    return this.fallback;
  }

  has(modelName: string): boolean {
    return this.registry.has(modelName);
  }
}
