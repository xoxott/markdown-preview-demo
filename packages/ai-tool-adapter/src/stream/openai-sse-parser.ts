/** OpenAI SSE 事件流解析器 — 将 OpenAI Chat Completion SSE stream 解析为 LLMStreamChunk */

import type { LLMStreamChunk, ToolUseBlock } from '@suga/ai-agent-loop';
import type { OpenAISSEEventData, OpenAIUsageInfo } from '../types/openai';
import { createAbortError } from '../error/error-mapper';

/** SSE data 行前缀 */
const SSE_DATA_PREFIX = 'data: ';

/** OpenAI SSE 流结束标记 */
const SSE_DONE_MARKER = '[DONE]';

/** 工具调用累积状态：index → { id, name, argsBuffer } */
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
    // OpenAI 无 cache_creation_input_tokens 对应字段
    cacheCreationInputTokens: undefined,
    // OpenAI reasoning tokens 不流式输出，不映射
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
 * 解析 OpenAI Chat Completion SSE 流式响应为 LLMStreamChunk 序列
 *
 * OpenAI SSE 格式与 Anthropic 完全不同：
 *
 * - 仅 `data:` 行（无 `event:` 行），每行一个完整 JSON
 * - `data: [DONE]` 标记流结束
 * - 工具调用在 `choices[0].delta.tool_calls[]` 中按 index 增量累积
 * - 用量信息需 `stream_options: { include_usage: true }` 才在最后一个 chunk 中返回
 *
 * @param response HTTP Response 对象（含 body ReadableStream）
 * @param signal 外部中断信号
 * @returns AsyncGenerator<LLMStreamChunk>
 */
export async function* parseOpenAISSEStream(
  response: Response,
  signal?: AbortSignal
): AsyncGenerator<LLMStreamChunk> {
  // 工具调用累积：index → { id, name, argsBuffer }
  const toolCallAccumulator = new Map<number, ToolCallAccumulator>();

  if (!response.body) {
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      // 检查中断
      if (signal?.aborted) {
        throw createAbortError('OpenAI SSE 流被中断');
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // 逐行解析 SSE
      const lines = buffer.split('\n');
      // 最后一行可能不完整，保留在 buffer 中
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed.startsWith(SSE_DATA_PREFIX)) continue;

        const dataStr = trimmed.slice(SSE_DATA_PREFIX.length);

        // 流结束标记
        if (dataStr === SSE_DONE_MARKER) {
          // 组装所有累积的工具调用
          yield* flushToolCalls(toolCallAccumulator);
          yield { done: true };
          return;
        }

        // 忽略空数据行
        if (!dataStr) continue;

        try {
          const data: OpenAISSEEventData = JSON.parse(dataStr);
          yield* handleOpenAIChunk(data, toolCallAccumulator);
        } catch {
          // 解析失败时跳过（可能是 SSE 心跳或格式异常）
        }
      }
    }

    // 流自然结束（未收到 [DONE]）— 组装累积的工具调用
    yield* flushToolCalls(toolCallAccumulator);
  } finally {
    reader.releaseLock();
  }
}

/** 处理单个 OpenAI SSE chunk，产出 LLMStreamChunk */
async function* handleOpenAIChunk(
  data: OpenAISSEEventData,
  toolCallAccumulator: Map<number, ToolCallAccumulator>
): AsyncGenerator<LLMStreamChunk> {
  // 用量信息（最后一个 chunk 可包含 usage）
  if (data.usage) {
    yield {
      done: false,
      usage: mapOpenAIUsage(data.usage)
    };
  }

  // 错误
  if (data.error) {
    throw new Error(`OpenAI SSE 错误: ${data.error.message} (${data.error.type})`);
  }

  // 无 choices → 无内容（可能是空 chunk）
  if (!data.choices || data.choices.length === 0) return;

  for (const choice of data.choices) {
    const delta = choice.delta;

    // finish_reason → stopReason + 组装工具调用
    if (choice.finish_reason) {
      // 如果有累积的工具调用且 finish_reason 是 tool_calls → 组装
      if (choice.finish_reason === 'tool_calls') {
        yield* flushToolCallsForChoice(choice.index, toolCallAccumulator);
      }

      yield {
        done: false,
        stopReason: mapFinishReason(choice.finish_reason)
      };
    }

    if (!delta) continue;

    // 文本增量
    if (delta.content) {
      yield { textDelta: delta.content, done: false };
    }

    // 工具调用增量
    if (delta.tool_calls) {
      for (const tc of delta.tool_calls) {
        const index = tc.index;

        // 首次出现：带 id + name
        if (tc.id || tc.function?.name) {
          const existing = toolCallAccumulator.get(index);
          if (!existing) {
            // 初始化累积器
            toolCallAccumulator.set(index, {
              id: tc.id ?? '',
              name: tc.function?.name ?? '',
              argsBuffer: tc.function?.arguments ?? ''
            });
          } else {
            // 更新 id/name（某些实现会在后续 chunk 补充）
            if (tc.id) existing.id = tc.id;
            if (tc.function?.name) existing.name = tc.function.name;
            if (tc.function?.arguments) existing.argsBuffer += tc.function.arguments;
          }
        } else if (tc.function?.arguments) {
          // 后续分片：只有 arguments
          const existing = toolCallAccumulator.get(index);
          if (existing) {
            existing.argsBuffer += tc.function.arguments;
          }
        }
      }
    }
  }
}

/** 组装指定 choice index 的工具调用 */
async function* flushToolCallsForChoice(
  _choiceIndex: number,
  toolCallAccumulator: Map<number, ToolCallAccumulator>
): AsyncGenerator<LLMStreamChunk> {
  // 组装所有累积的工具调用（OpenAI 所有工具调用属于同一个 choice）
  yield* flushToolCalls(toolCallAccumulator);
}

/** 组装所有累积的工具调用 */
async function* flushToolCalls(
  toolCallAccumulator: Map<number, ToolCallAccumulator>
): AsyncGenerator<LLMStreamChunk> {
  // 按 index 排序组装
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

    yield { toolUse, done: false };
  }

  // 清除累积器
  toolCallAccumulator.clear();
}

/**
 * 从 SSE 文本流解析 OpenAI 事件序列
 *
 * 纯文本解析版本，用于测试场景（不依赖 ReadableStream）。
 *
 * @param sseText SSE 文本内容
 * @returns 解析后的 OpenAISSEEventData 数组
 */
export function parseOpenAISSEText(sseText: string): OpenAISSEEventData[] {
  const events: OpenAISSEEventData[] = [];

  for (const line of sseText.split('\n')) {
    const trimmed = line.trim();

    if (!trimmed.startsWith(SSE_DATA_PREFIX)) continue;

    const dataStr = trimmed.slice(SSE_DATA_PREFIX.length);

    // 跳过 [DONE] 和空行
    if (dataStr === SSE_DONE_MARKER || !dataStr) continue;

    try {
      events.push(JSON.parse(dataStr));
    } catch {
      // 跳过解析失败
    }
  }

  return events;
}
