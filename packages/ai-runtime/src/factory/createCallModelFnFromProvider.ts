/**
 * createCallModelFnFromProvider — 从 LLMProvider 创建分类器可用的 CallModelFn
 *
 * P37: AnthropicAdapter.callModel() 是 AsyncGenerator<LLMStreamChunk> 流式方法， LLMPermissionClassifier
 * 需要简单的"发送 prompt → 返回完整文本"函数。 此桥接函数消费流式输出，提取所有 textDelta 拼接为完整文本。
 */

import type { CallModelFn, ClassifierModelResponse } from '@suga/ai-tools';
import type { CallModelOptions, LLMProvider } from '@suga/ai-agent-loop';
import { createSystemPrompt } from '@suga/ai-agent-loop';

/**
 * 从 LLMProvider 创建 CallModelFn
 *
 * 消费流程:
 *
 * 1. 构造 AgentMessage 列表（user message 含 systemPrompt + userContent）
 * 2. 调用 provider.callModel(messages, options)
 * 3. 消费 AsyncGenerator，提取所有 textDelta 拼接为完整文本
 * 4. 收集 usage 信息（input/output tokens）
 * 5. 处理 API 错误 → unavailable 标记
 */
export function createCallModelFnFromProvider(
  provider: LLMProvider,
  defaultModel?: string
): CallModelFn {
  return async (request): Promise<ClassifierModelResponse> => {
    const messages = [
      {
        id: `classifier-${Date.now()}`,
        role: 'user' as const,
        content: request.userContent,
        timestamp: Date.now()
      }
    ];

    // 将 system prompt 包装为 branded SystemPrompt
    const systemSections = request.systemPrompt ? [request.systemPrompt] : undefined;
    const systemPrompt = systemSections ? createSystemPrompt(systemSections) : undefined;

    const options: CallModelOptions = {
      systemPrompt,
      signal: request.signal
    };

    try {
      let fullContent = '';
      let usage: { inputTokens: number; outputTokens: number } | undefined;
      const modelUsed = defaultModel ?? request.model;

      const stream = provider.callModel(messages, undefined, options);

      for await (const chunk of stream) {
        // 提取 textDelta 拼接内容
        if (chunk.textDelta) {
          fullContent += chunk.textDelta;
        }

        // 提取 usage
        if (chunk.usage) {
          usage = {
            inputTokens: chunk.usage.inputTokens ?? 0,
            outputTokens: chunk.usage.outputTokens ?? 0
          };
        }

        // done=true → 流结束
        if (chunk.done) {
          break;
        }
      }

      return {
        content: fullContent,
        model: modelUsed,
        usage
      };
    } catch (err) {
      // API 错误 → unavailable 标记
      const isContextOverflow =
        err instanceof Error &&
        (err.message.includes('prompt is too long') ||
          err.message.toLowerCase().includes('context'));

      return {
        content: '',
        model: defaultModel ?? request.model,
        unavailable: true,
        transcriptTooLong: isContextOverflow
      };
    }
  };
}
