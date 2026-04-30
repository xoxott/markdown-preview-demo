/** Anthropic SSE 事件流解析器 — 将 SSE stream 解析为 LLMStreamChunk */

import type { LLMStreamChunk, ToolUseBlock } from '@suga/ai-agent-loop';
import type {
  AnthropicContentBlock,
  AnthropicContentDelta,
  AnthropicSSEEventData,
  AnthropicToolUseBlock
} from '../types/anthropic';
import { createAbortError } from '../error/error-mapper';

/** 类型守卫：判断 AnthropicContentBlock 是否为 tool_use */
function isToolUseBlock(block: AnthropicContentBlock): block is AnthropicToolUseBlock {
  return block.type === 'tool_use';
}

/** SSE 事件行前缀 */
const SSE_EVENT_PREFIX = 'event: ';
const SSE_DATA_PREFIX = 'data: ';

/**
 * 解析 Anthropic SSE 流式响应为 LLMStreamChunk 序列
 *
 * 处理流程：
 *
 * 1. 从 Response.body ReadableStream 逐行读取 SSE 事件
 * 2. 解析 event 和 data 行
 * 3. 累积 input_json_delta 分片 JSON
 * 4. 在 content_block_stop 时组装完整 ToolUseBlock
 * 5. yield LLMStreamChunk（text_delta, thinking_delta, toolUse, done）
 *
 * @param response HTTP Response 对象（含 body ReadableStream）
 * @param signal 外部中断信号
 * @returns AsyncGenerator<LLMStreamChunk>
 */
export async function* parseAnthropicSSEStream(
  response: Response,
  signal?: AbortSignal
): AsyncGenerator<LLMStreamChunk> {
  // 工具调用累积状态：index → { id, name, jsonBuffer }
  const toolUseAccumulator = new Map<number, { id: string; name: string; jsonBuffer: string }>();
  // 当前 content_block_start 记录：index → content_block
  const contentBlockStarts = new Map<number, { type: string; id?: string; name?: string }>();

  if (!response.body) {
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let currentEvent = '';

  try {
    while (true) {
      // 检查中断
      if (signal?.aborted) {
        throw createAbortError('Anthropic SSE 流被中断');
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

        if (trimmed.startsWith(SSE_EVENT_PREFIX)) {
          currentEvent = trimmed.slice(SSE_EVENT_PREFIX.length);
        } else if (trimmed.startsWith(SSE_DATA_PREFIX)) {
          const dataStr = trimmed.slice(SSE_DATA_PREFIX.length);

          // 忽空数据行
          if (!dataStr) continue;

          try {
            const data: AnthropicSSEEventData = JSON.parse(dataStr);
            yield* handleSSEEvent(data, currentEvent, toolUseAccumulator, contentBlockStarts);
          } catch {
            // 解析失败时跳过（可能是 SSE 心跳或格式异常）
          }
        }
        // 空 line → SSE 事件边界
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/** 处理单个 SSE 事件，产出 LLMStreamChunk */
async function* handleSSEEvent(
  data: AnthropicSSEEventData,
  _eventType: string,
  toolUseAccumulator: Map<number, { id: string; name: string; jsonBuffer: string }>,
  contentBlockStarts: Map<number, { type: string; id?: string; name?: string }>
): AsyncGenerator<LLMStreamChunk> {
  switch (data.type) {
    case 'content_block_start': {
      // 记录 content_block 类型信息
      if (data.index !== undefined && data.content_block) {
        const block = data.content_block;
        contentBlockStarts.set(data.index, {
          type: block.type,
          ...(isToolUseBlock(block) ? { id: block.id, name: block.name } : {})
        });

        // 如果是 tool_use block，初始化累积器
        if (isToolUseBlock(block)) {
          toolUseAccumulator.set(data.index, {
            id: block.id ?? '',
            name: block.name ?? '',
            jsonBuffer: ''
          });
        }
      }
      break;
    }

    case 'content_block_delta': {
      if (data.delta && data.index !== undefined && 'type' in data.delta) {
        yield* handleContentDelta(
          data.delta as AnthropicContentDelta,
          data.index,
          toolUseAccumulator
        );
      }
      break;
    }

    case 'content_block_stop': {
      if (data.index !== undefined) {
        // tool_use block 结束 → 组装完整 ToolUseBlock
        const accumulated = toolUseAccumulator.get(data.index);
        if (accumulated) {
          let parsedInput: Record<string, unknown> = {};
          try {
            if (accumulated.jsonBuffer) {
              parsedInput = JSON.parse(accumulated.jsonBuffer);
            }
          } catch {
            // JSON 解析失败时使用空对象
          }

          const toolUse: ToolUseBlock = {
            id: accumulated.id,
            name: accumulated.name,
            input: parsedInput
          };

          yield { toolUse, done: false };
          toolUseAccumulator.delete(data.index);
        }
        contentBlockStarts.delete(data.index);
      }
      break;
    }

    case 'message_stop': {
      yield { done: true };
      break;
    }

    case 'message_delta':
    case 'message_start':
    case 'ping':
    case 'error': {
      // message_start, message_delta, ping → 不产出 chunk
      // error → 由 HTTP 错误处理层捕获，此处不处理
      break;
    }

    default:
      break;
  }
}

/** 处理 content_block_delta */
async function* handleContentDelta(
  delta: AnthropicContentDelta,
  index: number,
  toolUseAccumulator: Map<number, { id: string; name: string; jsonBuffer: string }>
): AsyncGenerator<LLMStreamChunk> {
  switch (delta.type) {
    case 'text_delta': {
      yield { textDelta: delta.text, done: false };
      break;
    }

    case 'thinking_delta': {
      yield { thinkingDelta: delta.thinking, done: false };
      break;
    }

    case 'input_json_delta': {
      // 累积分片 JSON，不产出 chunk
      const accumulated = toolUseAccumulator.get(index);
      if (accumulated) {
        accumulated.jsonBuffer += delta.partial_json;
      }
      break;
    }

    default:
      break;
  }
}

/**
 * 从 SSE 文本流解析 Anthropic 事件序列
 *
 * 纯文本解析版本，用于测试场景（不依赖 ReadableStream）。
 *
 * @param sseText SSE 文本内容
 * @returns 解析后的 AnthropicSSEEventData 数组
 */
export function parseSSEText(sseText: string): AnthropicSSEEventData[] {
  const events: AnthropicSSEEventData[] = [];
  let currentData = '';

  for (const line of sseText.split('\n')) {
    const trimmed = line.trim();

    if (trimmed.startsWith(SSE_DATA_PREFIX)) {
      currentData = trimmed.slice(SSE_DATA_PREFIX.length);
    } else if (trimmed === '' && currentData) {
      try {
        events.push(JSON.parse(currentData));
      } catch {
        // 跳过解析失败
      }
      currentData = '';
    }
  }

  // 处理最后一条（可能没有空行结尾）
  if (currentData) {
    try {
      events.push(JSON.parse(currentData));
    } catch {
      // 跳过解析失败
    }
  }

  return events;
}
