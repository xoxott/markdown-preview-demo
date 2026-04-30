/** 消息格式转换 — AgentMessage[] → Anthropic messages 格式 */

import type {
  AgentMessage,
  AssistantMessage,
  ToolResultMessage,
  UserMessage
} from '@suga/ai-agent-loop';
import type {
  AnthropicContentBlock,
  AnthropicMessage,
  AnthropicToolResultBlock
} from '../types/anthropic';

/**
 * 将内部 AgentMessage[] 转换为 Anthropic API 的 messages 格式
 *
 * 关键转换规则：
 *
 * 1. UserMessage → user role 消息（文本内容块）
 * 2. AssistantMessage → assistant role 消息（文本 + tool_use 内容块）
 * 3. ToolResultMessage → user role 消息（tool_result 内容块） 注意：Anthropic 要求 tool_result 放在 user role 内 连续多个
 *    ToolResultMessage 合并到同一个 user 消息
 *
 * @param messages 内部消息列表
 * @returns Anthropic API 格式的消息列表
 */
export function convertToAnthropicMessages(messages: readonly AgentMessage[]): AnthropicMessage[] {
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
          content: userMsg.content
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

  return result;
}
