/** 状态机过渡逻辑（State Machine） advanceState 推进状态到下一轮 */

import type { AgentState } from '../types/state';
import type { MutableAgentContext } from '../context/AgentContext';
import type { AgentMessage, AssistantMessage, ToolResultMessage } from '../types/messages';
import type { AgentToolUseContext } from '../context/ToolUseContext';

/** 生成唯一 ID */
function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * 推进状态到下一轮
 *
 * 构造本轮的 AssistantMessage 和 ToolResultMessage， 合并到消息历史，递增 turnCount，构造新的 AgentState。
 *
 * @param prevState 上一轮状态
 * @param ctx 当前轮的可变上下文
 * @returns 新的 AgentState
 */
export function advanceState(prevState: AgentState, ctx: MutableAgentContext): AgentState {
  // 构造本轮助手消息
  const assistantMsg: AssistantMessage = {
    id: generateId(),
    role: 'assistant',
    content: ctx.accumulatedText,
    toolUses: [...ctx.toolUses],
    timestamp: Date.now()
  };

  // 从 AgentContext 的 meta 中提取工具结果消息
  // （ExecuteToolsPhase 通过 scheduler.schedule 产出，由 AgentLoop 收集）
  const toolResultMsgs: ToolResultMessage[] = (ctx.meta.toolResults as ToolResultMessage[]) ?? [];

  // 合并消息历史
  // 如果 CompressPhase 产出了 compressedMessages，用它替换原始历史
  // 这确保后续轮次使用压缩后的消息而非原始膨胀历史
  const baseMessages: readonly AgentMessage[] =
    (ctx.meta.compressedMessages as readonly AgentMessage[] | undefined) ?? prevState.messages;

  const newMessages: AgentMessage[] = [...baseMessages, assistantMsg, ...toolResultMsgs];

  // 构造新的 AgentToolUseContext（递增 turnCount）
  const newToolUseContext: AgentToolUseContext = {
    ...prevState.toolUseContext,
    abortController: prevState.toolUseContext.abortController,
    tools: prevState.toolUseContext.tools,
    sessionId: prevState.toolUseContext.sessionId,
    agentId: prevState.toolUseContext.agentId,
    turnCount: prevState.turnCount + 1
  };

  return {
    sessionId: prevState.sessionId,
    turnCount: prevState.turnCount + 1,
    messages: newMessages,
    toolUseContext: newToolUseContext,
    transition: { type: 'next_turn' } // 默认继续，后续由 PostProcessPhase 覆盖
  };
}
