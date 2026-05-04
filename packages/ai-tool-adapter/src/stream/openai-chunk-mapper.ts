/** OpenAI SSE 事件 → LLMStreamChunk 映射 — 将 OpenAISSEEventData 序列转换为 LLMStreamChunk 流 */

import type { LLMStreamChunk, ToolUseBlock } from '@suga/ai-agent-loop';
import type { OpenAISSEEventData, OpenAIUsageInfo } from '../types/openai';

/** 工具调用累积状态 */
interface ToolCallAccumulator {
  id: string;
  name: string;
  argsBuffer: string;
}

/** 将 OpenAI usage 映射为 LLMStreamChunk.usage */
function mapOpenAIUsage(usage: OpenAIUsageInfo): LLMStreamChunk['usage'] {
  return {
    inputTokens: usage.prompt_tokens,
    outputTokens: usage.completion_tokens,
    cacheReadInputTokens: usage.prompt_tokens_details?.cached_tokens,
    cacheCreationInputTokens: undefined,
    serviceTier: undefined
  };
}

/** 将 OpenAI finish_reason 映射为标准 stopReason */
function mapFinishReason(finishReason: string | null | undefined): string | undefined {
  if (!finishReason) return undefined;

  switch (finishReason) {
    case 'stop':
      return 'end_turn';
    case 'length':
      return 'max_tokens';
    case 'tool_calls':
      return 'tool_use';
    case 'content_filter':
      return 'content_filter';
    default:
      return finishReason;
  }
}

/**
 * 将 OpenAI SSE 事件数据序列映射为 LLMStreamChunk 流
 *
 * 纯同步映射版本，用于测试场景（不涉及 ReadableStream）。 生产场景使用 parseOpenAISSEStream 处理实时流。
 *
 * @param events OpenAI SSE 事件数据序列
 * @returns LLMStreamChunk 数组
 */
export function mapOpenAIChunksToChunks(events: readonly OpenAISSEEventData[]): LLMStreamChunk[] {
  const chunks: LLMStreamChunk[] = [];
  const toolCallAccumulator = new Map<number, ToolCallAccumulator>();

  for (const event of events) {
    // 用量信息
    if (event.usage) {
      chunks.push({
        done: false,
        usage: mapOpenAIUsage(event.usage)
      });
    }

    // 错误 → 跳过（由 error-mapper 处理）
    if (event.error) continue;

    // 无 choices → 跳过
    if (!event.choices || event.choices.length === 0) continue;

    for (const choice of event.choices) {
      const delta = choice.delta;

      // finish_reason → 组装工具调用 + stopReason
      if (choice.finish_reason) {
        if (choice.finish_reason === 'tool_calls') {
          flushToolCalls(toolCallAccumulator, chunks);
        }

        chunks.push({
          done: false,
          stopReason: mapFinishReason(choice.finish_reason)
        });
      }

      if (!delta) continue;

      // 文本增量
      if (delta.content) {
        chunks.push({ textDelta: delta.content, done: false });
      }

      // 工具调用增量
      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const index = tc.index;

          if (tc.id || tc.function?.name) {
            const existing = toolCallAccumulator.get(index);
            if (!existing) {
              toolCallAccumulator.set(index, {
                id: tc.id ?? '',
                name: tc.function?.name ?? '',
                argsBuffer: tc.function?.arguments ?? ''
              });
            } else {
              if (tc.id) existing.id = tc.id;
              if (tc.function?.name) existing.name = tc.function.name;
              if (tc.function?.arguments) existing.argsBuffer += tc.function.arguments;
            }
          } else if (tc.function?.arguments) {
            const existing = toolCallAccumulator.get(index);
            if (existing) {
              existing.argsBuffer += tc.function.arguments;
            }
          }
        }
      }
    }
  }

  // 流结束时组装所有未 flush 的工具调用
  flushToolCalls(toolCallAccumulator, chunks);

  // 添加 done chunk
  chunks.push({ done: true });

  return chunks;
}

/** 组装所有累积的工具调用 */
function flushToolCalls(
  toolCallAccumulator: Map<number, ToolCallAccumulator>,
  chunks: LLMStreamChunk[]
): void {
  const indices = [...toolCallAccumulator.keys()].sort((a, b) => a - b);

  for (const index of indices) {
    const acc = toolCallAccumulator.get(index)!;
    let parsedInput: Record<string, unknown> = {};
    try {
      if (acc.argsBuffer) {
        parsedInput = JSON.parse(acc.argsBuffer);
      }
    } catch {
      // JSON 解析失败时使用空对象
    }

    const toolUse: ToolUseBlock = {
      id: acc.id,
      name: acc.name,
      input: parsedInput
    };

    chunks.push({ toolUse, done: false });
  }

  toolCallAccumulator.clear();
}
