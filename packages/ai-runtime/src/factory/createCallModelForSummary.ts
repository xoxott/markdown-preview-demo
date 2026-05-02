/** createCallModelForSummary — LLMProvider → CallModelForSummary 桥接工具 */

import type { LLMProvider } from '@suga/ai-agent-loop';
import type { CallModelForSummary } from '@suga/ai-context';

/**
 * 从 LLMProvider 创建 CallModelForSummary 函数
 *
 * CompressPipeline 的 AutoCompact 层需要 callModelForSummary 来生成摘要， RecoveryPhase 的
 * ReactiveCompactRecovery 也依赖 CompressPipeline 的 reactiveCompact。
 *
 * 此桥接函数将 LLMProvider.callModel() (AsyncGenerator) 转换为 CallModelForSummary (Promise<string>) 格式：
 *
 * - 调用 provider.callModel() 不传工具
 * - 收集全部 textDelta
 * - 返回完整文本响应
 */
export function createCallModelForSummary(provider: LLMProvider): CallModelForSummary {
  return async (messages, _sections?) => {
    const stream = provider.callModel(messages);
    let fullText = '';

    for await (const chunk of stream) {
      if (chunk.textDelta) {
        fullText += chunk.textDelta;
      }
      if (chunk.done) {
        break;
      }
    }

    return fullText;
  };
}
