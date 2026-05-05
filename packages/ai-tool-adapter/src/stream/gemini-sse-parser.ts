/** Gemini SSE 流解析器 — 将 Gemini streamGenerateContent SSE 流解析为 LLMStreamChunk */

import type { LLMStreamChunk, ToolUseBlock } from '@suga/ai-agent-loop';
import type {
  GeminiFunctionCall,
  GeminiStreamResponse,
  GeminiUsageMetadata
} from '../types/gemini';
import { createAbortError } from '../error/error-mapper';

/** SSE data 行前缀 */
const SSE_DATA_PREFIX = 'data: ';

/** 工具调用累积状态 */
interface FunctionCallAccumulator {
  name: string;
  argsBuffer: string;
}

/** 将 Gemini usageMetadata 映射为 LLMStreamChunk.usage */
function mapGeminiUsage(usage: GeminiUsageMetadata): LLMStreamChunk['usage'] {
  return {
    inputTokens: usage.promptTokenCount,
    outputTokens: usage.candidatesTokenCount,
    cacheReadInputTokens: usage.cachedContentTokenCount,
    cacheCreationInputTokens: undefined,
    serviceTier: undefined
  };
}

/** 将 Gemini finishReason 映射为标准 stopReason */
function mapFinishReason(finishReason: string | undefined): string | undefined {
  if (!finishReason) return undefined;

  switch (finishReason) {
    case 'STOP':
      return 'end_turn';
    case 'MAX_TOKENS':
      return 'max_tokens';
    case 'SAFETY':
      return 'content_filter';
    case 'RECITATION':
      return 'recitation';
    case 'FUNCTION_CALL':
      return 'tool_use';
    default:
      return finishReason;
  }
}

/**
 * 解析 Gemini streamGenerateContent SSE 流式响应为 LLMStreamChunk 序列
 *
 * Gemini SSE 格式与 Anthropic/OpenAI 的差异：
 *
 * - URL 参数 `?alt=sse` 启用 SSE 模式
 * - 仅 `data:` 行（与 OpenAI 类似，无 `event:` 行）
 * - 无 `[DONE]` 结束标记（流自然结束）
 * - 数据结构：`candidates[0].content.parts[]`（而非 choices[0].delta）
 * - 工具调用：`functionCall` 对象（name + args），一次性完整输出，无需分片累积
 * - 用量信息：`usageMetadata` 在最后一个 chunk 中出现
 *
 * @param response HTTP Response 对象
 * @param signal 外部中断信号
 * @returns AsyncGenerator<LLMStreamChunk>
 */
export async function* parseGeminiSSEStream(
  response: Response,
  signal?: AbortSignal
): AsyncGenerator<LLMStreamChunk> {
  // 工具调用累积（Gemini 通常一次性输出完整 functionCall，但保险起见仍做累积）
  const functionCallAccumulator = new Map<number, FunctionCallAccumulator>();

  if (!response.body) {
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      if (signal?.aborted) {
        throw createAbortError('Gemini SSE 流被中断');
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // 逐行解析 SSE
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed.startsWith(SSE_DATA_PREFIX)) continue;

        const dataStr = trimmed.slice(SSE_DATA_PREFIX.length);
        if (!dataStr) continue;

        try {
          const data: GeminiStreamResponse = JSON.parse(dataStr);
          yield* handleGeminiChunk(data, functionCallAccumulator);
        } catch {
          // 解析失败时跳过
        }
      }
    }

    // 流自然结束 — 组装累积的工具调用
    yield* flushFunctionCalls(functionCallAccumulator);
    yield { done: true };
  } finally {
    reader.releaseLock();
  }
}

/** 处理单个 Gemini SSE chunk，产出 LLMStreamChunk */
async function* handleGeminiChunk(
  data: GeminiStreamResponse,
  functionCallAccumulator: Map<number, FunctionCallAccumulator>
): AsyncGenerator<LLMStreamChunk> {
  // 用量信息
  if (data.usageMetadata) {
    yield {
      done: false,
      usage: mapGeminiUsage(data.usageMetadata)
    };
  }

  // 无 candidates → 无内容
  if (!data.candidates || data.candidates.length === 0) return;

  for (const candidate of data.candidates) {
    // finishReason → stopReason + 组装工具调用
    if (candidate.finishReason) {
      if (candidate.finishReason === 'FUNCTION_CALL') {
        yield* flushFunctionCalls(functionCallAccumulator);
      }
      yield {
        done: false,
        stopReason: mapFinishReason(candidate.finishReason)
      };
    }

    // 内容部分
    if (!candidate.content?.parts) continue;

    for (const part of candidate.content.parts) {
      // 文本部分
      if ('text' in part && part.text) {
        yield { textDelta: part.text, done: false };
      }

      // 函数调用部分 — Gemini 通常一次性完整输出
      if ('functionCall' in part && part.functionCall) {
        const fc: GeminiFunctionCall = part.functionCall;

        // 直接输出完整的 ToolUseBlock（Gemini 不做分片）
        const toolUse: ToolUseBlock = {
          id: `fc_${fc.name}_${Date.now()}`, // Gemini 无 id 字段，生成唯一标识
          name: fc.name,
          input: fc.args as Record<string, unknown>
        };
        yield { toolUse, done: false };
      }
    }
  }
}

/** 组装所有累积的函数调用（保险机制，正常情况下 Gemini 一次性输出） */
async function* flushFunctionCalls(
  functionCallAccumulator: Map<number, FunctionCallAccumulator>
): AsyncGenerator<LLMStreamChunk> {
  const indices = [...functionCallAccumulator.keys()].sort((a, b) => a - b);

  for (const index of indices) {
    const acc = functionCallAccumulator.get(index)!;
    let parsedInput: Record<string, unknown> = {};
    try {
      if (acc.argsBuffer) {
        parsedInput = JSON.parse(acc.argsBuffer);
      }
    } catch {
      // JSON 解析失败时使用空对象
    }

    const toolUse: ToolUseBlock = {
      id: `fc_${acc.name}_${Date.now()}`,
      name: acc.name,
      input: parsedInput
    };

    yield { toolUse, done: false };
  }

  functionCallAccumulator.clear();
}

/**
 * 从 SSE 文本流解析 Gemini 事件序列
 *
 * 纯文本解析版本，用于测试场景（不依赖 ReadableStream）。
 *
 * @param sseText SSE 文本内容
 * @returns 解析后的 GeminiStreamResponse 数组
 */
export function parseGeminiSSEText(sseText: string): GeminiStreamResponse[] {
  const events: GeminiStreamResponse[] = [];

  for (const line of sseText.split('\n')) {
    const trimmed = line.trim();

    if (!trimmed.startsWith(SSE_DATA_PREFIX)) continue;

    const dataStr = trimmed.slice(SSE_DATA_PREFIX.length);
    if (!dataStr) continue;

    try {
      events.push(JSON.parse(dataStr));
    } catch {
      // 跳过解析失败
    }
  }

  return events;
}
