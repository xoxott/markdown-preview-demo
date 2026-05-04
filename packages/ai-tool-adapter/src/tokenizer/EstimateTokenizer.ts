/** 系数估算 Tokenizer — 基于 chars/token 比率的默认 fallback 实现 */

import type { AgentMessage } from '@suga/ai-agent-loop';
import { TOKEN_ESTIMATE_COEFFICIENTS, looksLikeJson } from '../utils/tokenCoefficients';
import type { TokenizerProvider } from './types';

/**
 * 系数估算 Tokenizer
 *
 * 当没有真正的 tiktoken/Anthropic tokenizer 可用时，使用 chars/token 比率估算。 这与 ai-context 的
 * estimateTokensPrecise 逻辑一致，但封装为 TokenizerProvider 接口。
 */
export class EstimateTokenizer implements TokenizerProvider {
  readonly modelName: string;
  private readonly textRatio: number;
  private readonly jsonRatio: number;
  private readonly roleOverhead: number;

  constructor(
    modelName: string = 'default',
    options?: {
      textRatio?: number;
      jsonRatio?: number;
      roleOverhead?: number;
    }
  ) {
    this.modelName = modelName;
    this.textRatio = options?.textRatio ?? TOKEN_ESTIMATE_COEFFICIENTS.textRatio;
    this.jsonRatio = options?.jsonRatio ?? TOKEN_ESTIMATE_COEFFICIENTS.jsonRatio;
    this.roleOverhead = options?.roleOverhead ?? 4; // role 标签开销 tokens
  }

  countTokens(text: string): number {
    const ratio = looksLikeJson(text) ? this.jsonRatio : this.textRatio;
    return Math.ceil(text.length / ratio);
  }

  countMessageTokens(messages: readonly AgentMessage[]): number {
    const { conservativePadding, toolUseOverhead, imageTokenEstimate } =
      TOKEN_ESTIMATE_COEFFICIENTS;
    let totalTokens = 0;

    for (const msg of messages) {
      // 每条消息的角色标签开销
      totalTokens += this.roleOverhead;

      if (msg.role === 'user') {
        if (typeof msg.content === 'string') {
          totalTokens += this.countTokens(msg.content);
        } else {
          for (const part of msg.content) {
            if (part.type === 'text') {
              totalTokens += this.countTokens(part.text);
            } else if (part.type === 'image') {
              totalTokens += imageTokenEstimate;
            }
          }
        }
      } else if (msg.role === 'assistant') {
        totalTokens += this.countTokens(msg.content);
        for (const tu of msg.toolUses) {
          totalTokens += this.countTokens(JSON.stringify(tu.input)) + toolUseOverhead;
        }
      } else if (msg.role === 'tool_result') {
        const resultStr =
          typeof msg.result === 'string' ? msg.result : JSON.stringify(msg.result ?? '');
        totalTokens += this.countTokens(resultStr);
        totalTokens += Math.ceil((msg.error?.length ?? 0) / this.textRatio);
      }
    }

    return Math.ceil(totalTokens * conservativePadding);
  }
}
