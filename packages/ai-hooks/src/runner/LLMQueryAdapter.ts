/**
 * LLMQueryAdapter — 将 LLMProvider (流式 AsyncGenerator) 适配为 LLMQueryService (非流式 Promise)
 *
 * ai-hooks 的 PromptRunner 和 AgentRunner 需要非流式的 LLMQueryService，
 * 但宿主注入的是 LLMProvider（流式 callModel）。
 * 此适配器消费完整流后返回文本结果，消除类型强转导致的运行时崩溃。
 */

import type { LLMProvider, LLMStreamChunk, AgentMessage, ToolDefinition } from '@suga/ai-agent-loop';
import type { LLMQueryService, LLMQueryResult, LLMMultiTurnResult, LLMQueryOptions, LLMToolDefinition } from '../types/llmQuery';

/**
 * LLMQueryAdapter — 流式→非流式适配器
 *
 * 实现 LLMQueryService 接口:
 * - querySingle: 调用 callModel (无工具) → 消费流 → 返回完整文本
 * - queryMultiTurn: 调用 callModel (带工具) → 消费流 → 解析结构化输出
 */
export class LLMQueryAdapter implements LLMQueryService {
  private readonly provider: LLMProvider;

  constructor(provider: LLMProvider) {
    this.provider = provider;
  }

  async querySingle(prompt: string, options?: LLMQueryOptions): Promise<LLMQueryResult> {
    try {
      const messages: AgentMessage[] = [
        { id: `query_${Date.now()}`, role: 'user', content: prompt, timestamp: Date.now() }
      ];

      const stream = this.provider.callModel(messages, undefined, {
        signal: options?.signal
      });

      const fullText = await consumeStream(stream);

      return {
        text: fullText,
        success: true
      };
    } catch (err) {
      return {
        text: '',
        success: false,
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }

  async queryMultiTurn(
    prompt: string,
    tools: readonly LLMToolDefinition[],
    options?: LLMQueryOptions
  ): Promise<LLMMultiTurnResult> {
    try {
      const messages: AgentMessage[] = [
        { id: `query_multi_${Date.now()}`, role: 'user', content: prompt, timestamp: Date.now() }
      ];

      // 将 LLMToolDefinition 转为 ToolDefinition 格式
      const toolDefs: ToolDefinition[] = tools.map(t => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema
      }));

      const stream = this.provider.callModel(messages, toolDefs, {
        signal: options?.signal
      });

      const fullText = await consumeStream(stream);

      return {
        finalText: fullText,
        totalTurns: 1,
        success: true
      };
    } catch (err) {
      return {
        finalText: '',
        totalTurns: 0,
        success: false,
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }
}

/** 消费流式 AsyncGenerator → 返回完整文本 */
async function consumeStream(stream: AsyncGenerator<LLMStreamChunk>): Promise<string> {
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
}