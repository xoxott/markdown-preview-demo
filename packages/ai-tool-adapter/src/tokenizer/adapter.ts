/** TokenizerProvider → TokenEstimator 适配器 — 桥接两个接口 */

import type { AgentMessage } from '@suga/ai-agent-loop';
import type { TokenEstimator } from '@suga/ai-context';
import type { TokenizerProvider } from './types';

/**
 * 将 TokenizerProvider 适配为 ai-context 的 TokenEstimator 函数
 *
 * ai-context 的 CompressDependencies.tokenEstimator 是 `(messages) => number` 函数签名， 而
 * TokenizerProvider 是带 `countMessageTokens` 方法的对象接口。 此适配器让 TokenizerProvider 可以无缝注入到压缩管线。
 */
export function createTokenEstimatorFromTokenizer(tokenizer: TokenizerProvider): TokenEstimator {
  return (messages: readonly AgentMessage[]) => tokenizer.countMessageTokens(messages);
}
