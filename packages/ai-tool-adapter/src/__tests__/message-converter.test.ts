/** message-converter 测试 — AgentMessage[] → Anthropic messages 格式转换 */

import { describe, expect, it } from 'vitest';
import type { AssistantMessage, ToolResultMessage, UserMessage } from '@suga/ai-agent-loop';
import { convertToAnthropicMessages } from '../convert/message-converter';

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

describe('convertToAnthropicMessages', () => {
  it('纯用户消息 → user role + 文本内容', () => {
    const messages = [createUserMsg('hello')];
    const result = convertToAnthropicMessages(messages);

    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('user');
    expect(result[0].content).toBe('hello');
  });

  it('助手消息（纯文本）→ assistant role + text 内容块', () => {
    const messages = [createAssistantMsg('你好')];
    const result = convertToAnthropicMessages(messages);

    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('assistant');
    const content = result[0].content as any[];
    expect(content[0].type).toBe('text');
    expect(content[0].text).toBe('你好');
  });

  it('助手消息（含工具调用）→ text + tool_use 内容块', () => {
    const messages = [
      createAssistantMsg('计算中', [{ id: 'c1', name: 'calc', input: { a: 1, b: 2 } }])
    ];
    const result = convertToAnthropicMessages(messages);

    expect(result).toHaveLength(1);
    const content = result[0].content as any[];
    expect(content).toHaveLength(2);
    expect(content[0].type).toBe('text');
    expect(content[1].type).toBe('tool_use');
    expect(content[1].id).toBe('c1');
    expect(content[1].name).toBe('calc');
  });

  it('工具结果消息 → user role + tool_result 内容块', () => {
    const messages = [createToolResultMsg('c1', 3, true)];
    const result = convertToAnthropicMessages(messages);

    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('user');
    const content = result[0].content as any[];
    expect(content[0].type).toBe('tool_result');
    expect(content[0].tool_use_id).toBe('c1');
    expect(content[0].is_error).toBe(false);
  });

  it('工具结果失败 → is_error=true + error 内容', () => {
    const messages = [createToolResultMsg('c1', undefined, false)];
    const result = convertToAnthropicMessages(messages);

    const content = result[0].content as any[];
    expect(content[0].is_error).toBe(true);
    expect(content[0].content).toBe('执行失败');
  });

  it('连续多个工具结果 → 合并到同一个 user 消息', () => {
    const messages = [createToolResultMsg('c1', 3, true), createToolResultMsg('c2', 7, true)];
    const result = convertToAnthropicMessages(messages);

    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('user');
    const content = result[0].content as any[];
    expect(content).toHaveLength(2);
    expect(content[0].tool_use_id).toBe('c1');
    expect(content[1].tool_use_id).toBe('c2');
  });

  it('完整对话流程 → 消息格式正确', () => {
    const messages = [
      createUserMsg('计算 1+2'),
      createAssistantMsg('计算中', [{ id: 'c1', name: 'calc', input: { a: 1, b: 2 } }]),
      createToolResultMsg('c1', 3, true),
      createAssistantMsg('1+2=3')
    ];
    const result = convertToAnthropicMessages(messages);

    expect(result).toHaveLength(4);
    // 用户消息 → user
    expect(result[0].role).toBe('user');
    // 助手消息（含工具调用）→ assistant
    expect(result[1].role).toBe('assistant');
    // 工具结果 → user（合并）
    expect(result[2].role).toBe('user');
    // 最终助手回复 → assistant
    expect(result[3].role).toBe('assistant');
  });
});
