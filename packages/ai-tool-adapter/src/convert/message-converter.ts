/** 消息格式转换 — AgentMessage[] → Anthropic messages 格式 */

import type {
  AgentMessage,
  AssistantMessage,
  ToolResultMessage,
  UserContentPart,
  UserMessage
} from '@suga/ai-agent-loop';
import type {
  AnthropicCacheControl,
  AnthropicContentBlock,
  AnthropicImageBlock,
  AnthropicMessage,
  AnthropicToolResultBlock
} from '../types/anthropic';

/** Cache control 注入配置 */
export interface AnthropicCacheControlConfig {
  /** 在倒数第二个 user 消息的最后一个 content block 注入 ephemeral */
  readonly markSecondToLastUserMessage?: boolean;
}

/**
 * 将内部 AgentMessage[] 转换为 Anthropic API 的 messages 格式
 *
 * 关键转换规则：
 *
 * 1. UserMessage → user role 消息（文本内容块，或多模态 text+image 内容块数组）
 * 2. AssistantMessage → assistant role 消息（文本 + tool_use 内容块）
 * 3. ToolResultMessage → user role 消息（tool_result 内容块） 注意：Anthropic 要求 tool_result 放在 user role 内 连续多个
 *    ToolResultMessage 合并到同一个 user 消息
 *
 * @param messages 内部消息列表
 * @param cacheControlConfig 可选 cache_control 注入配置
 * @returns Anthropic API 格式的消息列表
 */
export function convertToAnthropicMessages(
  messages: readonly AgentMessage[],
  cacheControlConfig?: AnthropicCacheControlConfig
): AnthropicMessage[] {
  const result: AnthropicMessage[] = [];
  let pendingToolResults: AnthropicToolResultBlock[] = [];

  for (const msg of messages) {
    // 先处理积攒的 tool_result
    // 如果当前不是 ToolResultMessage 且有待处理的 tool_result，先 flush
    if (msg.role !== 'tool_result' && pendingToolResults.length > 0) {
      result.push({
        role: 'user',
        content: pendingToolResults
      });
      pendingToolResults = [];
    }

    switch (msg.role) {
      case 'user': {
        const userMsg = msg as UserMessage;
        result.push({
          role: 'user',
          content: convertUserContentToAnthropic(userMsg.content)
        });
        break;
      }

      case 'assistant': {
        const assistantMsg = msg as AssistantMessage;
        const blocks: AnthropicContentBlock[] = [];

        // 文本内容块
        if (assistantMsg.content) {
          blocks.push({ type: 'text', text: assistantMsg.content });
        }

        // tool_use 内容块
        for (const tu of assistantMsg.toolUses) {
          blocks.push({
            type: 'tool_use',
            id: tu.id,
            name: tu.name,
            input: tu.input
          });
        }

        // P12: tool_reference 内容块（可选字段）
        if (assistantMsg.toolReferences) {
          for (const ref of assistantMsg.toolReferences) {
            blocks.push({
              type: 'tool_reference',
              tool_use_id: ref.toolUseId,
              name: ref.name,
              input: ref.input
            });
          }
        }

        result.push({
          role: 'assistant',
          content: blocks.length > 0 ? blocks : ''
        });
        break;
      }

      case 'tool_result': {
        const toolResultMsg = msg as ToolResultMessage;
        const content = toolResultMsg.isSuccess
          ? JSON.stringify(toolResultMsg.result ?? '')
          : (toolResultMsg.error ?? 'Unknown error');

        pendingToolResults.push({
          type: 'tool_result',
          tool_use_id: toolResultMsg.toolUseId,
          content,
          is_error: !toolResultMsg.isSuccess
        });
        break;
      }

      default:
        break;
    }
  }

  // flush 最后积攒的 tool_result
  if (pendingToolResults.length > 0) {
    result.push({
      role: 'user',
      content: pendingToolResults
    });
  }

  // Post-process: 注入 cache_control — 在倒数第二个 user 消息的最后一个 block 上标记 ephemeral
  if (cacheControlConfig?.markSecondToLastUserMessage) {
    const ephemeralMarker: AnthropicCacheControl = { type: 'ephemeral' };
    const userMsgIndices = result.map((m, i) => (m.role === 'user' ? i : -1)).filter(i => i >= 0);

    // 需要至少 2 个 user 消息才有 "倒数第二个"
    if (userMsgIndices.length >= 2) {
      const secondToLastIdx = userMsgIndices[userMsgIndices.length - 2];
      const msg = result[secondToLastIdx];
      const content = msg.content;

      // content 是 block 数组 → 在最后一个 block 上注入 cache_control
      if (Array.isArray(content) && content.length > 0) {
        const lastBlock = content[content.length - 1];
        if (lastBlock && typeof lastBlock === 'object') {
          (lastBlock as Record<string, unknown>).cache_control = ephemeralMarker;
        }
      }
      // content 是 string → 需要转为 [text block] 再注入
      else if (typeof content === 'string') {
        result[secondToLastIdx] = {
          role: 'user',
          content: [{ type: 'text', text: content, cache_control: ephemeralMarker }]
        };
      }
    }
  }

  return result;
}

/**
 * 将 UserMessage.content 转换为 Anthropic API 的 content 格式
 *
 * - string → 直接返回字符串
 * - UserContentPart[] → 转换为 AnthropicContentBlock[]（text → text块, image → image块）
 */
function convertUserContentToAnthropic(
  content: string | readonly UserContentPart[]
): string | readonly AnthropicContentBlock[] {
  if (typeof content === 'string') {
    return content;
  }

  // 多模态内容数组 → Anthropic content blocks
  const blocks: AnthropicContentBlock[] = [];
  for (const part of content) {
    switch (part.type) {
      case 'text':
        blocks.push({ type: 'text', text: part.text });
        break;
      case 'image':
        blocks.push(convertImagePartToAnthropic(part));
        break;

      default:
        break;
    }
  }
  return blocks;
}

/**
 * 将 UserImagePart 转换为 AnthropicImageBlock
 *
 * Anthropic API 要求：
 *
 * - base64 模式：source.type='base64', source.media_type, source.data
 * - URL 模式：source.type='url', source.url
 *
 * UserImagePart.source 如果是 URL（以 http:// 或 https:// 开头），使用 url 模式 否则视为 base64 编码数据
 */
function convertImagePartToAnthropic(
  part: import('@suga/ai-agent-loop').UserImagePart
): AnthropicImageBlock {
  const isUrl = part.source.startsWith('http://') || part.source.startsWith('https://');

  return {
    type: 'image',
    source: isUrl
      ? { type: 'url', media_type: part.mediaType ?? 'image/png', url: part.source }
      : { type: 'base64', media_type: part.mediaType ?? 'image/png', data: part.source }
  };
}
