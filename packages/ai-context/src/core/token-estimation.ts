/**
 * Token Estimation 实现 — Bedrock/Vertex token 计数
 *
 * N30: 对齐 CC services/tokenEstimation.ts ai-context 有 utils/tokenEstimate 但缺少 Bedrock/Vertex
 * 的精确计数实现。 提供多种 token 估算策略：
 *
 * 1. 简单字符比估算（1 token ≈ 4 chars）
 * 2. Claude 模型专用估算（基于 Anthropic tokenizer）
 * 3. Bedrock/Vertex 精确计数（宿主注入）
 */

// ============================================================
// 类型定义
// ============================================================

/** Token 估算策略 */
export type TokenEstimationStrategy =
  | 'char_ratio'
  | 'claude_specific'
  | 'bedrock_exact'
  | 'vertex_exact';

/** Token 估算结果 */
export interface TokenEstimationResult {
  readonly estimatedTokens: number;
  readonly strategy: TokenEstimationStrategy;
  readonly confidence: 'low' | 'medium' | 'high';
}

/** TokenEstimationConfig */
export interface TokenEstimationConfig {
  readonly defaultStrategy: TokenEstimationStrategy;
  readonly charRatio: number; // 字符/token比率（默认4）
  readonly claudeOverhead: number; // Claude消息额外开销token（默认10）
}

export const DEFAULT_TOKEN_ESTIMATION_CONFIG: TokenEstimationConfig = {
  defaultStrategy: 'char_ratio',
  charRatio: 4,
  claudeOverhead: 10
};

/** ExactTokenCountFn — 宿主注入的精确计数函数 */
export type ExactTokenCountFn = (text: string) => Promise<number>;

// ============================================================
// 估算函数
// ============================================================

/** estimateTokensCharRatio — 简单字符比估算 */
export function estimateTokensCharRatio(
  text: string,
  config?: TokenEstimationConfig
): TokenEstimationResult {
  const ratio = config?.charRatio ?? DEFAULT_TOKEN_ESTIMATION_CONFIG.charRatio;
  return {
    estimatedTokens: Math.ceil(text.length / ratio),
    strategy: 'char_ratio',
    confidence: 'low'
  };
}

/**
 * estimateTokensClaudeSpecific — Claude 模型专用估算
 *
 * Claude/Anthropic tokenizer 的特点：
 *
 * - 中文字符约1 token/2 chars
 * - 英文约1 token/4 chars
 * - 混合内容取加权平均
 * - 消息有固定 overhead
 */
export function estimateTokensClaudeSpecific(
  text: string,
  config?: TokenEstimationConfig
): TokenEstimationResult {
  const overhead = config?.claudeOverhead ?? DEFAULT_TOKEN_ESTIMATION_CONFIG.claudeOverhead;

  // 估算中文占比
  const cjkChars = text.match(/[\u4E00-\u9FFF\u3000-\u303F]/g)?.length ?? 0;
  const totalChars = text.length;

  // 中文字 token 比约 1:2, 英文约 1:4
  const cjkTokens = Math.ceil(cjkChars / 2);
  const asciiTokens = Math.ceil((totalChars - cjkChars) / 4);

  return {
    estimatedTokens: cjkTokens + asciiTokens + overhead,
    strategy: 'claude_specific',
    confidence: 'medium'
  };
}

/** estimateTokens — 综合估算（按配置策略选择） */
export async function estimateTokens(
  text: string,
  config?: TokenEstimationConfig,
  exactCountFn?: ExactTokenCountFn
): Promise<TokenEstimationResult> {
  const strategy = config?.defaultStrategy ?? DEFAULT_TOKEN_ESTIMATION_CONFIG.defaultStrategy;

  switch (strategy) {
    case 'char_ratio':
      return estimateTokensCharRatio(text, config);
    case 'claude_specific':
      return estimateTokensClaudeSpecific(text, config);
    case 'bedrock_exact':
    case 'vertex_exact':
      if (exactCountFn) {
        const exact = await exactCountFn(text);
        return { estimatedTokens: exact, strategy, confidence: 'high' };
      }
      // 无精确计数函数 → fallback to claude_specific
      return estimateTokensClaudeSpecific(text, config);
    default:
      return estimateTokensCharRatio(text, config);
  }
}

/** estimateMessageTokens — 估算完整消息的 token 数 */
export function estimateMessageTokens(
  message: { role: string; content: string | unknown[] },
  config?: TokenEstimationConfig
): number {
  let textContent = '';

  if (typeof message.content === 'string') {
    textContent = message.content;
  } else if (Array.isArray(message.content)) {
    for (const block of message.content as any[]) {
      if (typeof block.text === 'string') textContent += block.text;
      else if (typeof block.thinking === 'string') textContent += block.thinking;
      else if (typeof block.content === 'string') textContent += block.content;
      else textContent += JSON.stringify(block);
    }
  } else {
    textContent = JSON.stringify(message.content);
  }

  // 消息 overhead: role标记 + 格式化 ≈ 5 tokens
  return estimateTokensClaudeSpecific(textContent, config).estimatedTokens + 5;
}
