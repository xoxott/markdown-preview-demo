/** 状态机过渡逻辑（State Machine） advanceState 推进状态到下一轮 */

import type { AgentState, ContinueTransition } from '../types/state';
import type { MutableAgentContext } from '../context/AgentContext';
import type {
  AgentMessage,
  AssistantMessage,
  ToolResultMessage,
  UserMessage
} from '../types/messages';
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
 * 支持多种 Continue reason（溢出恢复路径）:
 *
 * - next_turn: 正常合并本轮消息
 * - reactive_compact_retry: 使用压缩后的消息作为基础（本轮因 413 被丢弃）
 * - max_output_tokens_escalate: 提升上限后重试，本轮 assistant 部分有效
 * - max_output_tokens_recovery: 注入 recovery meta message 后继续
 * - collapse_drain_retry: 折叠后排空溢出消息，使用 foldedMessages
 * - stop_hook_blocking: Hook 阻止错误追加到消息，继续循环
 * - token_budget_continuation: Token 预算续写，追加 nudge 消息
 *
 * @param prevState 上一轮状态
 * @param ctx 当前轮的可变上下文
 * @param transition 继续过渡类型（默认 next_turn）
 * @returns 新的 AgentState
 */
export function advanceState(
  prevState: AgentState,
  ctx: MutableAgentContext,
  transition: ContinueTransition = { type: 'next_turn' }
): AgentState {
  // 构造本轮助手消息
  const assistantMsg: AssistantMessage = {
    id: generateId(),
    role: 'assistant',
    content: ctx.accumulatedText,
    toolUses: [...ctx.toolUses],
    timestamp: Date.now()
  };

  // 从 AgentContext 的 meta 中提取工具结果消息
  const toolResultMsgs: ToolResultMessage[] = (ctx.meta.toolResults as ToolResultMessage[]) ?? [];

  // 合并消息历史
  // 如果 CompressPhase 产出了 compressedMessages，用它替换原始历史
  const baseMessages: readonly AgentMessage[] =
    (ctx.meta.compressedMessages as readonly AgentMessage[] | undefined) ?? prevState.messages;

  // 根据不同 Continue reason 构建不同的消息历史
  let newMessages: AgentMessage[];

  switch (transition.type) {
    case 'next_turn':
      // 正常下一轮：合并 base + 本轮 assistant + tool results
      newMessages = [...baseMessages, assistantMsg, ...toolResultMsgs];
      break;

    case 'reactive_compact_retry':
      // API 413 → 使用压缩后的消息作为基础，不包含本轮 assistant（本轮因 413 被丢弃）
      newMessages = [...transition.compressedMessages];
      break;

    case 'max_output_tokens_escalate':
      // 输出 token 耗尽 → 提升上限后重试，本轮 assistant 部分有效
      newMessages = [...baseMessages, assistantMsg, ...toolResultMsgs];
      break;

    case 'max_output_tokens_recovery':
      // 输出 token 耗尽 → 注入 recovery meta message 后继续
      newMessages = [...baseMessages, assistantMsg, ...toolResultMsgs, transition.recoveryMessage];
      break;

    case 'collapse_drain_retry':
      // 折叠后排空：使用折叠后的消息，丢弃溢出部分
      newMessages = [...transition.foldedMessages];
      break;

    case 'stop_hook_blocking': {
      // Hook blocking：追加 blocking error 信息到消息列表，继续循环
      const blockingMsgs: UserMessage[] = transition.blockingErrors.map(e => ({
        id: generateId(),
        role: 'user',
        content: `[Hook ${e.hookName} 阻止: ${e.message}]`,
        timestamp: Date.now()
      }));
      newMessages = [...baseMessages, assistantMsg, ...toolResultMsgs, ...blockingMsgs];
      break;
    }

    case 'token_budget_continuation':
      // Token 预算续写：追加 nudge 消息
      newMessages = [...baseMessages, assistantMsg, ...toolResultMsgs, transition.nudgeMessage];
      break;

    default:
      // 未知的 transition type — 按正常下一轮处理
      newMessages = [...baseMessages, assistantMsg, ...toolResultMsgs];
      break;
  }

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
    transition: { type: 'next_turn' } // 重置为 next_turn，下一轮正常处理
  };
}
