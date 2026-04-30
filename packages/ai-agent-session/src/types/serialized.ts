/** 序列化类型定义（Serialized Types） AgentState 序列化/反序列化格式 */

import type { AgentMessage } from '@suga/ai-agent-loop';
import type { ProviderConfig, SessionStatus } from './session';

/** 序列化的 LoopTransition（Error → string） */
export type SerializedLoopTransition =
  | { type: 'completed'; reason: string }
  | { type: 'aborted'; reason: string }
  | { type: 'model_error'; errorMessage: string; errorStack?: string }
  | { type: 'max_turns'; maxTurns: number }
  | { type: 'next_turn' };

/** 序列化的 AgentState */
export interface SerializedAgentState {
  readonly sessionId: string;
  readonly turnCount: number;
  readonly messages: readonly AgentMessage[];
  readonly transition: SerializedLoopTransition;
}

/** 序列化的完整会话 */
export interface SerializedSession {
  readonly sessionId: string;
  readonly providerConfig: ProviderConfig;
  readonly maxTurns: number;
  readonly toolTimeout: number;
  readonly status: SessionStatus;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly state: SerializedAgentState;
}
