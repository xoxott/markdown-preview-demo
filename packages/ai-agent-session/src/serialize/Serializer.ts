/** AgentState 序列化/反序列化 — 会话状态持久化核心 */

import type { AgentState } from '@suga/ai-agent-loop';
import type { SerializedAgentState, SerializedSession } from '../types/serialized';
import type { SessionConfig, SessionStatus } from '../types/session';
import { DEFAULT_SESSION_MAX_TURNS, DEFAULT_SESSION_TOOL_TIMEOUT } from '../constants';
import { deserializeTransition, serializeTransition } from './transitionSerializer';

/**
 * 序列化 AgentState 为 SerializedAgentState
 *
 * 不序列化 toolUseContext（含不可序列化的 AbortController 和 ToolRegistry）， 恢复时由 Session 重建。
 */
export function serializeAgentState(state: AgentState): SerializedAgentState {
  return {
    sessionId: state.sessionId,
    turnCount: state.turnCount,
    messages: state.messages,
    transition: serializeTransition(state.transition)
  };
}

/**
 * 反序列化 SerializedAgentState 为部分 AgentState
 *
 * 注意：返回的 AgentState 缺少 toolUseContext， 需由 Session.resume 在外部补全。
 */
export function deserializeAgentState(
  serialized: SerializedAgentState
): Omit<AgentState, 'toolUseContext'> {
  return {
    sessionId: serialized.sessionId,
    turnCount: serialized.turnCount,
    messages: serialized.messages,
    transition: deserializeTransition(serialized.transition)
  };
}

/**
 * 构建完整 SerializedSession
 *
 * @param state 当前 AgentState
 * @param config 会话配置
 * @param status 当前会话状态
 * @param createdAt 创建时间
 * @param updatedAt 更新时间
 */
export function buildSerializedSession(
  state: AgentState,
  config: SessionConfig,
  status: SessionStatus,
  createdAt: number,
  updatedAt: number
): SerializedSession {
  return {
    sessionId: state.sessionId,
    providerConfig: config.providerConfig,
    maxTurns: config.maxTurns ?? DEFAULT_SESSION_MAX_TURNS,
    toolTimeout: config.toolTimeout ?? DEFAULT_SESSION_TOOL_TIMEOUT,
    status,
    createdAt,
    updatedAt,
    state: serializeAgentState(state)
  };
}
