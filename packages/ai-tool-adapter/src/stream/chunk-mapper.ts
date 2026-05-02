/** SSE 事件 → LLMStreamChunk 映射 — 将 AnthropicSSEEventData 序列转换为 LLMStreamChunk 流 */

import type { LLMStreamChunk } from '@suga/ai-agent-loop';
import type {
  AnthropicContentBlock,
  AnthropicContentDelta,
  AnthropicMessageStartUsage,
  AnthropicSSEEventData,
  AnthropicToolUseBlock
} from '../types/anthropic';

/** 类型守卫：判断 AnthropicContentBlock 是否为 tool_use */
function isToolUseBlock(block: AnthropicContentBlock): block is AnthropicToolUseBlock {
  return block.type === 'tool_use';
}

/** 将 Anthropic message_start usage 映射为 LLMStreamChunk.usage */
function mapStartUsage(usage: AnthropicMessageStartUsage): LLMStreamChunk['usage'] {
  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheCreationInputTokens: usage.cache_creation_input_tokens,
    cacheReadInputTokens: usage.cache_read_input_tokens,
    cacheCreationEphemeralInputTokens:
      usage.cache_creation?.ephemeral_1h_input_tokens ??
      usage.cache_creation?.ephemeral_5m_input_tokens,
    serviceTier: usage.service_tier
  };
}

/**
 * 将 Anthropic SSE 事件数据序列映射为 LLMStreamChunk 流
 *
 * 纯同步映射版本，用于测试场景（不涉及 ReadableStream）。 生产场景使用 parseAnthropicSSEStream 处理实时流。
 *
 * @param events Anthropic SSE 事件数据序列
 * @returns LLMStreamChunk 数组
 */
export function mapSSEEventsToChunks(events: readonly AnthropicSSEEventData[]): LLMStreamChunk[] {
  const chunks: LLMStreamChunk[] = [];
  // 工具调用累积：index → { id, name, jsonBuffer }
  const toolUseAccumulator = new Map<number, { id: string; name: string; jsonBuffer: string }>();
  // content_block_start 记录
  const contentBlockStarts = new Map<number, { type: string; id?: string; name?: string }>();

  for (const event of events) {
    switch (event.type) {
      case 'content_block_start': {
        if (event.index !== undefined && event.content_block) {
          const block = event.content_block;
          contentBlockStarts.set(event.index, {
            type: block.type,
            ...(isToolUseBlock(block) ? { id: block.id, name: block.name } : {})
          });

          if (isToolUseBlock(block)) {
            toolUseAccumulator.set(event.index, {
              id: block.id ?? '',
              name: block.name ?? '',
              jsonBuffer: ''
            });
          }
        }
        break;
      }

      case 'content_block_delta': {
        if (event.delta && event.index !== undefined && 'type' in event.delta) {
          mapContentDelta(
            event.delta as AnthropicContentDelta,
            event.index,
            toolUseAccumulator,
            chunks
          );
        }
        break;
      }

      case 'content_block_stop': {
        if (event.index !== undefined) {
          const accumulated = toolUseAccumulator.get(event.index);
          if (accumulated) {
            let parsedInput: Record<string, unknown> = {};
            try {
              if (accumulated.jsonBuffer) {
                parsedInput = JSON.parse(accumulated.jsonBuffer);
              }
            } catch {
              // JSON 解析失败时使用空对象
            }

            chunks.push({
              toolUse: {
                id: accumulated.id,
                name: accumulated.name,
                input: parsedInput
              },
              done: false
            });
            toolUseAccumulator.delete(event.index);
          }
          contentBlockStarts.delete(event.index);
        }
        break;
      }

      case 'message_start': {
        if (event.message && event.message.usage) {
          chunks.push({
            done: false,
            usage: mapStartUsage(event.message.usage)
          });
        }
        break;
      }

      case 'message_delta': {
        const usage = event.usage;
        const stopReason =
          event.delta && typeof event.delta === 'object' && 'stop_reason' in event.delta
            ? (event.delta as { stop_reason?: string }).stop_reason
            : undefined;
        if (usage) {
          chunks.push({
            done: false,
            usage: { inputTokens: 0, outputTokens: usage.output_tokens },
            stopReason
          });
        } else if (stopReason) {
          chunks.push({ done: false, stopReason });
        }
        break;
      }

      case 'message_stop': {
        chunks.push({ done: true });
        break;
      }

      // ping, error → 不产出 chunk
      default:
        break;
    }
  }

  return chunks;
}

/** 映射 content_block_delta */
function mapContentDelta(
  delta: AnthropicContentDelta,
  index: number,
  toolUseAccumulator: Map<number, { id: string; name: string; jsonBuffer: string }>,
  chunks: LLMStreamChunk[]
): void {
  switch (delta.type) {
    case 'text_delta':
      chunks.push({ textDelta: delta.text, done: false });
      break;

    case 'thinking_delta':
      chunks.push({ thinkingDelta: delta.thinking, done: false });
      break;

    case 'input_json_delta': {
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
