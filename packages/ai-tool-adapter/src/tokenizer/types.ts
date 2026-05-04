/** Tokenizer 接口定义 — 精确 token 计数替代系数估算 */

import type { AgentMessage } from '@suga/ai-agent-loop';

/** Tokenizer 提供者接口 — 精确计算文本和消息的 token 数 */
export interface TokenizerProvider {
  /** 计算纯文本的 token 数 */
  countTokens(text: string): number;
  /** 计算消息列表的总 token 数（含角色标签开销） */
  countMessageTokens(messages: readonly AgentMessage[]): number;
  /** 获取 tokenizer 适用的模型名称 */
  readonly modelName: string;
}

/** Tokenizer 注册表 — 按模型名称查找对应的 tokenizer */
export interface TokenizerRegistry {
  /** 注册 tokenizer */
  register(modelName: string, tokenizer: TokenizerProvider): void;
  /** 查找 tokenizer（精确匹配或 fallback 到默认） */
  resolve(modelName: string): TokenizerProvider;
  /** 是否已注册指定模型的 tokenizer */
  has(modelName: string): boolean;
}
