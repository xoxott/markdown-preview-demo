/** 消息格式转换 — AgentMessage[] → OpenAI Chat Completion messages 格式 */

import type {
  AgentMessage,
  AssistantMessage,
  SystemPrompt,
  ToolResultMessage,
  UserMessage
} from '@suga/ai-agent-loop';
import type {
  OpenAIAssistantMessage,
  OpenAIMessage,
  OpenAISystemMessage,
  OpenAIToolMessage,
  OpenAIUserMessage
} from '../types/openai';

/**
 * 将内部 AgentMessage[] 转换为 OpenAI Chat Completion API 的 messages 格式
 *
 * 关键转换规则（与 Anthropic 不同）：
 *
 * 1. SystemPrompt → { role: 'system', content } 消息（而非 Anthropic 顶层 system 字段）
 * 2. UserMessage → { role: 'user', content } 消息
 * 3. AssistantMessage → { role: 'assistant', content, tool_calls } 消息
 * 4. ToolResultMessage → { role: 'tool', tool_call_id, content } 独立消息 注意：Anthropic 把 tool_result 放在
 *    user role 内，OpenAI 用独立 role: 'tool' 消息
 *
 * @param messages 内部消息列表
 * @param systemPrompt 系统提示（可选，转换为 system role 消息）
 * @returns OpenAI API 格式的消息列表
 */
export function convertToOpenAIMessages(
  messages: readonly AgentMessage[],
  systemPrompt?: SystemPrompt
): OpenAIMessage[] {
  const result: OpenAIMessage[] = [];

  // system prompt → system role 消息（前置）
  if (systemPrompt) {
    const systemContent = systemPrompt.filter(s => s !== '').join('\n\n');
    if (systemContent) {
      result.push({
        role: 'system',
        content: systemContent
      } satisfies OpenAISystemMessage);
    }
  }

  for (const msg of messages) {
    switch (msg.role) {
      case 'user': {
        const userMsg = msg as UserMessage;
        result.push({
          role: 'user',
          content: userMsg.content
        } satisfies OpenAIUserMessage);
        break;
      }

      case 'assistant': {
        const assistantMsg = msg as AssistantMessage;
        const openaiMsg: OpenAIAssistantMessage = {
          role: 'assistant',
          content: assistantMsg.content ?? null,
          // 工具调用 → tool_calls 数组
          tool_calls:
            assistantMsg.toolUses && assistantMsg.toolUses.length > 0
              ? assistantMsg.toolUses.map(tu => ({
                  id: tu.id,
                  type: 'function' as const,
                  function: {
                    name: tu.name,
                    arguments: JSON.stringify(tu.input)
                  }
                }))
              : undefined
        };

        result.push(openaiMsg);
        break;
      }

      case 'tool_result': {
        const toolResultMsg = msg as ToolResultMessage;
        const content = toolResultMsg.isSuccess
          ? JSON.stringify(toolResultMsg.result ?? '')
          : (toolResultMsg.error ?? 'Unknown error');

        result.push({
          role: 'tool',
          tool_call_id: toolResultMsg.toolUseId,
          content
        } satisfies OpenAIToolMessage);
        break;
      }

      default:
        break;
    }
  }

  return result;
}
