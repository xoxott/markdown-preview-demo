/** Gemini 消息转换器 — AgentMessage[] → Gemini contents 格式 */

import type {
  AgentMessage,
  AssistantMessage,
  SystemPrompt,
  ToolResultMessage,
  UserContentPart,
  UserMessage
} from '@suga/ai-agent-loop';
import type {
  GeminiContent,
  GeminiFunctionCall,
  GeminiFunctionResponse,
  GeminiFunctionResponsePart,
  GeminiPart,
  GeminiSystemInstruction
} from '../types/gemini';

/**
 * 将 AgentMessage[] + SystemPrompt 转换为 Gemini API 的 contents 格式
 *
 * Gemini 与 Anthropic/OpenAI 的关键差异：
 *
 * 1. 角色名称：assistant → model
 * 2. 工具调用：functionCall 结构（name + args 对象），而非 tool_calls + function.arguments 字符串
 * 3. 工具结果：functionResponse（name + response 对象），而非 role: 'tool' + tool_call_id
 * 4. System prompt：systemInstruction 请求体顶层字段（而非 messages 中的 system role）
 * 5. 无 thinking 流式输出（Gemini 思考 token 在 usage 中统计但不流式可见）
 *
 * @param messages AgentMessage 数组
 * @param systemPrompt 系统提示（转换为 Gemini systemInstruction）
 * @returns Gemini contents 数组 + systemInstruction
 */
export function convertToGeminiContents(
  messages: readonly AgentMessage[],
  systemPrompt?: SystemPrompt
): { contents: readonly GeminiContent[]; systemInstruction?: GeminiSystemInstruction } {
  const contents: GeminiContent[] = [];

  for (const msg of messages) {
    switch (msg.role) {
      case 'user': {
        const userMsg = msg as UserMessage;
        contents.push({
          role: 'user',
          parts: convertUserContent(userMsg.content)
        });
        break;
      }

      case 'assistant': {
        const assistantMsg = msg as AssistantMessage;
        contents.push({
          role: 'model',
          parts: convertAssistantContent(assistantMsg)
        });
        break;
      }

      case 'tool_result': {
        const toolResultMsg = msg as ToolResultMessage;
        contents.push({
          role: 'function',
          parts: [convertToolResult(toolResultMsg)]
        });
        break;
      }

      default:
        // 未知角色忽略（Gemini 不支持其他 role）
        break;
    }
  }

  // System prompt → systemInstruction（Gemini 请求体顶层字段）
  let systemInstruction: GeminiSystemInstruction | undefined;
  if (systemPrompt) {
    const systemContent = systemPrompt.filter(s => s !== '').join('\n\n');
    if (systemContent) {
      systemInstruction = {
        parts: [{ text: systemContent }]
      };
    }
  }

  return { contents, systemInstruction };
}

/** 转换用户消息内容 → GeminiPart[] */
function convertUserContent(content: string | readonly UserContentPart[]): readonly GeminiPart[] {
  if (typeof content === 'string') {
    return [{ text: content }];
  }

  // 多模态内容数组 → Gemini parts
  const parts: GeminiPart[] = [];
  for (const part of content) {
    switch (part.type) {
      case 'text':
        parts.push({ text: part.text });
        break;
      case 'image':
        // Gemini 图片格式：inline_data 或 URL，这里简化为文本描述
        // 实际 Gemini 支持 inlineData { mimeType, data } 格式
        parts.push({ text: `[image: ${part.mediaType ?? 'unknown'}]` });
        break;

      default:
        // 未知内容类型忽略
        break;
    }
  }
  return parts;
}

/** 转换助手消息内容 → GeminiPart[] */
function convertAssistantContent(msg: AssistantMessage): readonly GeminiPart[] {
  const parts: GeminiPart[] = [];

  // 文本内容
  if (msg.content) {
    parts.push({ text: msg.content });
  }

  // 工具调用
  if (msg.toolUses && msg.toolUses.length > 0) {
    for (const tu of msg.toolUses) {
      const functionCall: GeminiFunctionCall = {
        name: tu.name,
        args: tu.input as Record<string, unknown>
      };
      parts.push({ functionCall });
    }
  }

  return parts;
}

/** 转换工具结果 → GeminiFunctionResponsePart */
function convertToolResult(msg: ToolResultMessage): GeminiFunctionResponsePart {
  const responseContent = msg.isSuccess
    ? typeof msg.result === 'string'
      ? { result: msg.result }
      : ((msg.result as Record<string, unknown>) ?? { result: '' })
    : { error: msg.error ?? 'Unknown error' };

  const response: GeminiFunctionResponse = {
    name: msg.toolName,
    response: responseContent
  };

  return { functionResponse: response };
}
