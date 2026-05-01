/**
 * @suga/ai-agent-session
 * Agent 会话管理层 — 生命周期封装、暂停恢复、状态序列化与持久化存储
 */

// 常量
export {
  DEFAULT_SESSION_MAX_TURNS,
  DEFAULT_SESSION_TOOL_TIMEOUT,
  DEFAULT_SESSION_ID_PREFIX
} from './constants';

// 类型导出
export type * from './types';

// 序列化
export { serializeTransition, deserializeTransition } from './serialize/transitionSerializer';
export {
  serializeAgentState,
  deserializeAgentState,
  buildSerializedSession
} from './serialize/Serializer';

// 存储
export { InMemoryStorageAdapter } from './storage/InMemoryStorageAdapter';
export { NodeFileStorageAdapter } from './storage/NodeFileStorageAdapter';

// 会话层
export { Session } from './session/Session';
export { SessionManager } from './session/SessionManager';
