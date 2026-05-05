/** P89: ConversationState 域更新函数 */

import type { DeepImmutable } from '../immutable';
import type { AppState, ConversationStateDomain } from './AppState';

/** 默认对话状态 */
export function getDefaultConversationState(): DeepImmutable<ConversationStateDomain> {
  return {
    messages: [],
    currentPrompt: undefined,
    turnCount: 0,
    lastModelResponse: undefined,
    sessionCreatedAt: undefined,
    sessionLastActiveAt: undefined
  };
}

/** 追加消息到对话 */
export function appendMessage(
  state: DeepImmutable<AppState>,
  message: unknown
): DeepImmutable<AppState> {
  const prev = state.conversation;
  return {
    ...state,
    conversation: {
      ...prev,
      messages: [...prev.messages, message],
      sessionLastActiveAt: Date.now()
    }
  };
}

/** 设置当前用户提示 */
export function setCurrentPrompt(
  state: DeepImmutable<AppState>,
  prompt: string | undefined
): DeepImmutable<AppState> {
  return {
    ...state,
    conversation: {
      ...state.conversation,
      currentPrompt: prompt,
      sessionLastActiveAt: Date.now()
    }
  };
}

/** 增加轮次计数 */
export function incrementTurnCount(state: DeepImmutable<AppState>): DeepImmutable<AppState> {
  return {
    ...state,
    conversation: {
      ...state.conversation,
      turnCount: state.conversation.turnCount + 1,
      sessionLastActiveAt: Date.now()
    }
  };
}

/** 设置最近模型响应 */
export function setLastModelResponse(
  state: DeepImmutable<AppState>,
  response: string | undefined
): DeepImmutable<AppState> {
  return {
    ...state,
    conversation: {
      ...state.conversation,
      lastModelResponse: response
    }
  };
}

/** 初始化会话时间戳 */
export function initSessionTimestamps(state: DeepImmutable<AppState>): DeepImmutable<AppState> {
  const now = Date.now();
  return {
    ...state,
    conversation: {
      ...state.conversation,
      sessionCreatedAt: state.conversation.sessionCreatedAt ?? now,
      sessionLastActiveAt: now
    }
  };
}

/** 重置对话状态（清空消息和轮次） */
export function resetConversation(state: DeepImmutable<AppState>): DeepImmutable<AppState> {
  return {
    ...state,
    conversation: getDefaultConversationState()
  };
}
