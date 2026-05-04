/** openai-message-converter 测试 — AgentMessage[] → OpenAI messages 格式转换 */

import { describe, expect, it } from 'vitest';
import type { AssistantMessage, ToolResultMessage, UserMessage } from '@suga/ai-agent-loop';
import { createSystemPrompt } from '@suga/ai-agent-loop';
import { convertToOpenAIMessages } from '../convert/openai-message-converter';

/** 辅助：创建用户消息 */
function createUserMsg(content: string): UserMessage {
  return { id: 'u1', role: 'user', content, timestamp: Date.now() };
}

/** 辅助：创建助手消息 */
function createAssistantMsg(content: string, toolUses?: any[]): AssistantMessage {
  return {
    id: 'a1',
    role: 'assistant',
    content,
    toolUses: toolUses ?? [],
    timestamp: Date.now()
  };
}

/** 辅助：创建工具结果消息 */
function createToolResultMsg(
  toolUseId: string,
  result: unknown,
  isSuccess: boolean
): ToolResultMessage {
  return {
    id: 'r1',
    role: 'tool_result',
    toolUseId,
    toolName: 'calc',
    result: isSuccess ? result : undefined,
    error: isSuccess ? undefined : '执行失败',
    isSuccess,
    timestamp: Date.now()
  };
}

describe('convertToOpenAIMessages', () => {
  it('纯用户消息 → user role + 文本内容', () => {
    const messages = [createUserMsg('hello')];
    const result = convertToOpenAIMessages(messages);

    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('user');
    expect((result[0] as any).content).toBe('hello');
  });

  it('助手消息（纯文本）→ assistant role + content', () => {
    const messages = [createAssistantMsg('你好')];
    const result = convertToOpenAIMessages(messages);

    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('assistant');
    expect((result[0] as any).content).toBe('你好');
  });

  it('助手消息（含工具调用）→ assistant role + tool_calls', () => {
    const messages = [
      createAssistantMsg('计算中', [{ id: 'c1', name: 'calc', input: { a: 1, b: 2 } }])
    ];
    const result = convertToOpenAIMessages(messages);

    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('assistant');
    const msg = result[0] as any;
    expect(msg.tool_calls).toBeDefined();
    expect(msg.tool_calls).toHaveLength(1);
    expect(msg.tool_calls[0].id).toBe('c1');
    expect(msg.tool_calls[0].function.name).toBe('calc');
    expect(msg.tool_calls[0].function.arguments).toBe(JSON.stringify({ a: 1, b: 2 }));
  });

  it('工具结果消息 → tool role + tool_call_id（不同于 Anthropic 的 user role）', () => {
    const messages = [createToolResultMsg('c1', 3, true)];
    const result = convertToOpenAIMessages(messages);

    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('tool');
    const msg = result[0] as any;
    expect(msg.tool_call_id).toBe('c1');
    expect(msg.content).toBe(JSON.stringify(3));
  });

  it('工具结果失败 → tool role + error 内容', () => {
    const messages = [createToolResultMsg('c1', undefined, false)];
    const result = convertToOpenAIMessages(messages);

    expect(result[0].role).toBe('tool');
    const msg = result[0] as any;
    expect(msg.content).toBe('执行失败');
  });

  it('连续多个工具结果 → 独立 tool 消息（不同于 Anthropic 的合并到 user）', () => {
    const messages = [createToolResultMsg('c1', 3, true), createToolResultMsg('c2', 7, true)];
    const result = convertToOpenAIMessages(messages);

    expect(result).toHaveLength(2);
    expect(result[0].role).toBe('tool');
    expect((result[0] as any).tool_call_id).toBe('c1');
    expect(result[1].role).toBe('tool');
    expect((result[1] as any).tool_call_id).toBe('c2');
  });

  it('完整对话流程 → 消息格式正确', () => {
    const messages = [
      createUserMsg('计算 1+2'),
      createAssistantMsg('计算中', [{ id: 'c1', name: 'calc', input: { a: 1, b: 2 } }]),
      createToolResultMsg('c1', 3, true),
      createAssistantMsg('1+2=3')
    ];
    const result = convertToOpenAIMessages(messages);

    expect(result).toHaveLength(4);
    expect(result[0].role).toBe('user');
    expect(result[1].role).toBe('assistant');
    expect(result[2].role).toBe('tool');
    expect(result[3].role).toBe('assistant');
  });

  it('systemPrompt → system role 消息前置', () => {
    const messages = [createUserMsg('hello')];
    const prompt = createSystemPrompt(['You are a helpful assistant.']);
    const result = convertToOpenAIMessages(messages, prompt);

    expect(result).toHaveLength(2);
    expect(result[0].role).toBe('system');
    expect((result[0] as any).content).toBe('You are a helpful assistant.');
    expect(result[1].role).toBe('user');
  });

  it('多段 systemPrompt → 拼接为单个 system 消息', () => {
    const messages = [createUserMsg('hello')];
    const prompt = createSystemPrompt(['You are an assistant.', 'Be concise.']);
    const result = convertToOpenAIMessages(messages, prompt);

    expect(result).toHaveLength(2);
    expect(result[0].role).toBe('system');
    expect((result[0] as any).content).toBe('You are an assistant.\n\nBe concise.');
  });

  it('无 systemPrompt → 无 system 消息', () => {
    const messages = [createUserMsg('hello')];
    const result = convertToOpenAIMessages(messages);

    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('user');
  });
});
