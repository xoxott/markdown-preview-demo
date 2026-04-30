/** 消息遍历与筛选辅助函数 */

import type { AgentMessage, ToolResultMessage, ToolUseBlock } from '@suga/ai-agent-loop';

/** 查找最后一条 assistant 消息的时间戳 */
export function findLastAssistantTimestamp(messages: readonly AgentMessage[]): number | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant') {
      return messages[i].timestamp;
    }
  }
  return null;
}

/** 收集指定工具名称列表的 ToolUseBlock */
export function collectToolUseBlocks(
  messages: readonly AgentMessage[],
  toolNames: readonly string[]
): ToolUseBlock[] {
  const results: ToolUseBlock[] = [];
  for (const msg of messages) {
    if (msg.role === 'assistant') {
      for (const tu of msg.toolUses) {
        if (toolNames.includes(tu.name)) {
          results.push(tu);
        }
      }
    }
  }
  return results;
}

/** 根据 toolUseId 查找对应的 ToolResultMessage */
export function findToolResultById(
  messages: readonly AgentMessage[],
  toolUseId: string
): ToolResultMessage | undefined {
  for (const msg of messages) {
    if (msg.role === 'tool_result' && msg.toolUseId === toolUseId) {
      return msg;
    }
  }
  return undefined;
}

/** 计算消息内容的字符串长度（用于预算判断） */
export function getMessageContentSize(msg: ToolResultMessage): number {
  const resultStr = typeof msg.result === 'string' ? msg.result : JSON.stringify(msg.result ?? '');
  return resultStr.length;
}

/** 创建替换后的 ToolResultMessage（不修改原对象） */
export function replaceToolResultMessage(
  msg: ToolResultMessage,
  newResult: unknown,
  newError?: string
): ToolResultMessage {
  return { ...msg, result: newResult, error: newError };
}

/** 创建携带摘要文本的 UserMessage */
export function createSummaryMessage(summaryText: string): AgentMessage {
  return {
    id: `compact_summary_${Date.now()}`,
    role: 'user',
    content: summaryText,
    timestamp: Date.now()
  };
}
